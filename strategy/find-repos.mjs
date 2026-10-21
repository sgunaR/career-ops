#!/usr/bin/env node
// Find active GitHub repos for strategy/open-source-contribution.md.
// One category per search. GitHub returns at most 100 repositories per page;
// this asks for that page (and a second if filters drop too many), then ranks
// them for a first contribution. Set GITHUB_TOKEN for a higher rate limit.
//
//   node strategy/find-repos.mjs --json --category security
//   node strategy/find-repos.mjs --write --category webdev --days 90

import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const CATEGORIES = [
  { id: 'security', label: 'Security', q: 'topic:security' },
  { id: 'webdev', label: 'Web development', q: 'topic:web' },
  { id: 'web3', label: 'Web3', q: 'topic:web3' },
  { id: 'frontend', label: 'Frontend', q: 'topic:frontend' },
  { id: 'backend', label: 'Backend', q: 'topic:backend' },
  { id: 'agents', label: 'AI agents', q: 'topic:llm' },
  { id: 'ml', label: 'Machine learning', q: 'topic:machine-learning' },
  { id: 'devtools', label: 'Developer tools', q: 'topic:developer-tools' },
  { id: 'devops', label: 'DevOps', q: 'topic:devops' },
  { id: 'databases', label: 'Databases', q: 'topic:database' },
  { id: 'api', label: 'APIs', q: 'topic:api' },
  { id: 'cli', label: 'CLI', q: 'topic:cli' },
  { id: 'testing', label: 'Testing', q: 'topic:testing' },
  { id: 'observability', label: 'Observability', q: 'topic:observability' },
  { id: 'cloud', label: 'Cloud', q: 'topic:cloud' },
  { id: 'privacy', label: 'Privacy', q: 'topic:privacy' },
  { id: 'auth', label: 'Authentication', q: 'topic:authentication' },
  { id: 'mobile', label: 'Mobile', q: 'topic:mobile' },
  { id: 'data', label: 'Data engineering', q: 'topic:data-engineering' },
  { id: 'design', label: 'Design systems', q: 'topic:design-system' },
  { id: 'docs', label: 'Documentation', q: 'topic:documentation' },
  { id: 'networking', label: 'Networking', q: 'topic:networking' },
  { id: 'compilers', label: 'Compilers', q: 'topic:compiler' },
  { id: 'games', label: 'Game development', q: 'topic:gamedev' },
  { id: 'fintech', label: 'Fintech', q: 'topic:fintech' },
  { id: 'productivity', label: 'Productivity', q: 'topic:productivity' },
  { id: 'python', label: 'Python', q: 'language:Python' },
  { id: 'typescript', label: 'TypeScript', q: 'language:TypeScript' },
  { id: 'fastapi', label: 'FastAPI', q: 'fastapi in:name,description' },
  { id: 'nextjs', label: 'Next.js', q: 'nextjs in:name,description' },
  { id: 'react', label: 'React', q: 'topic:react' },
  { id: 'rust', label: 'Rust', q: 'language:Rust' },
  { id: 'go', label: 'Go', q: 'language:Go' },
  { id: 'kubernetes', label: 'Kubernetes', q: 'topic:kubernetes' },
  { id: 'containers', label: 'Containers', q: 'topic:docker' },
  { id: 'blockchain', label: 'Blockchain', q: 'topic:blockchain' },
  { id: 'cryptography', label: 'Cryptography', q: 'topic:cryptography' },
  { id: 'opensource', label: 'YC-tagged', q: '(topic:ycombinator OR topic:yc)' },
];

const DROP = ['awesome-', 'roadmap', 'interview', 'course', 'tutorial', 'boilerplate', 'cheatsheet', 'starter', 'template', 'clone'];
const DAY_MS = 86_400_000;
const PAGE_SIZE = 100;
const MAX_PAGES = 2;

export function cutoffDay(days, now = new Date()) {
  const cut = new Date(now);
  cut.setUTCDate(cut.getUTCDate() - days);
  return cut.toISOString().slice(0, 10);
}

export function cleanQuery(raw) {
  return String(raw || '')
    .replace(/[^A-Za-z0-9 .+#_/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

export const LANGUAGES = ['Python', 'TypeScript', 'JavaScript', 'Go', 'Rust', 'Java', 'Ruby', 'C', 'C++', 'C#', 'PHP', 'Kotlin', 'Swift', 'Shell'];
export const LICENSES = ['mit', 'apache-2.0', 'gpl-3.0', 'bsd-3-clause', 'mpl-2.0', 'agpl-3.0', 'unlicense'];

export function categoryById(id) {
  return CATEGORIES.find((category) => category.id === id) || null;
}

function cleanToken(raw) {
  return String(raw || '').replace(/[^A-Za-z0-9.+#_-]/g, '').slice(0, 39);
}

function bounded(value, fallback, max) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > max) return fallback;
  return Math.floor(n);
}

export function parseFinderArgs(argv) {
  let category = 'webdev';
  let days = 90;
  let minStars = 20;
  let maxStars = 50000;
  let minForks = 0;
  let language = '';
  let license = '';
  let owner = '';
  let q = '';
  let write = false;
  let json = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--write') write = true;
    else if (arg === '--json') json = true;
    else if (arg === '--days') days = Number(argv[++i]);
    else if (arg === '--min-stars') minStars = Number(argv[++i]);
    else if (arg === '--max-stars') maxStars = Number(argv[++i]);
    else if (arg === '--min-forks') minForks = Number(argv[++i]);
    else if (arg === '--category') category = argv[++i] || category;
    else if (arg === '--language') language = argv[++i] || '';
    else if (arg === '--license') license = argv[++i] || '';
    else if (arg === '--owner') owner = argv[++i] || '';
    else if (arg === '--q') q = argv[++i] || '';
  }
  if (!Number.isInteger(days) || days < 1 || days > 365) days = 90;
  minStars = bounded(minStars, 20, 50000);
  maxStars = bounded(maxStars, 50000, 50000);
  if (maxStars < minStars) [minStars, maxStars] = [maxStars, minStars];
  minForks = bounded(minForks, 0, 100000);
  if (!categoryById(category)) category = 'webdev';
  if (!LANGUAGES.includes(language)) language = '';
  if (!LICENSES.includes(license)) license = '';
  return {
    category,
    days,
    minStars,
    maxStars,
    minForks,
    language,
    license,
    owner: cleanToken(owner),
    q: cleanQuery(q),
    write,
    json,
  };
}

/** GitHub advanced-search qualifiers. Ranking happens after this query returns. */
export function buildAdvancedQuery({ category, days, minStars, maxStars = 50000, minForks = 0, language = '', license = '', owner = '', q, now = new Date() }) {
  const picked = categoryById(category) || categoryById('webdev');
  const since = cutoffDay(days, now);
  const parts = [picked.q];
  if (LANGUAGES.includes(language)) parts.push(`language:${language}`);
  if (LICENSES.includes(license)) parts.push(`license:${license}`);
  const who = cleanToken(owner);
  if (who) parts.push(`user:${who}`);
  const extra = cleanQuery(q);
  if (extra) parts.push(extra);
  parts.push(`pushed:>${since}`, `stars:${minStars}..${maxStars}`);
  if (minForks > 0) parts.push(`forks:>=${minForks}`);
  parts.push('fork:false', 'archived:false');
  return { category: picked.id, label: picked.label, q: parts.join(' ') };
}

export function buildCategoryQuery(options) {
  return buildAdvancedQuery(options);
}

function daysSince(iso, now) {
  return Math.round((now - new Date(iso)) / DAY_MS);
}

export function keepRepo(repo, { now = new Date(), days = 90 } = {}) {
  if (!repo || repo.archived || repo.disabled || repo.fork) return false;
  const blob = `${repo.full_name || ''} ${repo.description || ''}`.toLowerCase();
  if (DROP.some((word) => blob.includes(word))) return false;
  if (!repo.pushed_at || daysSince(repo.pushed_at, now) > days) return false;
  if ((repo.open_issues_count || 0) < 1) return false;
  if (repo.open_issues_count > 400 && repo.stargazers_count < 500) return false;
  return true;
}

/** 0–100. Recent work, a takeable issue list, an approachable star count, a license. */
export function contributionScore(repo, now = new Date()) {
  const days = daysSince(repo.pushed_at, now);
  const recency = days <= 7 ? 35 : days <= 30 ? 28 : days <= 90 ? 18 : 8;
  const issues = repo.open_issues_count || 0;
  let room = 4;
  if (issues >= 5 && issues <= 80) room = 30;
  else if (issues >= 81 && issues <= 200) room = 24;
  else if (issues >= 1 && issues < 5) room = 16;
  else if (issues <= 400) room = 12;
  const stars = repo.stargazers_count || 0;
  let known = Math.round(Math.min(20, Math.log10(Math.max(stars, 1)) * 7));
  if (stars >= 100 && stars <= 8000) known += 5;
  known = Math.min(25, known);
  const licenseName = repo.license?.spdx_id || repo.license?.key || '';
  const license = licenseName ? 10 : 0;
  const why = [];
  if (days <= 7) why.push('pushed this week');
  else if (days <= 30) why.push('pushed this month');
  else why.push(`pushed ${days}d ago`);
  if (issues >= 5 && issues <= 80) why.push('issues you can pick up');
  else if (issues > 200) why.push('large issue list');
  else why.push(`${issues} open issues`);
  if (stars >= 100 && stars <= 8000) why.push('known and still approachable');
  else if (stars > 8000) why.push('very established');
  if (licenseName) why.push(licenseName);
  return { score: recency + room + known + license, why: why.join(' · ') };
}

export async function findRepos(options, { fetchImpl = fetch, token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '', now = new Date() } = {}) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'career-ops-oss-finder',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const query = buildAdvancedQuery({ ...options, now });
  const kept = [];
  const seen = new Set();
  for (let page = 1; page <= MAX_PAGES && kept.length < PAGE_SIZE; page++) {
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query.q)}&sort=stars&order=desc&per_page=${PAGE_SIZE}&page=${page}`;
    const res = await fetchImpl(url, { headers, signal: AbortSignal.timeout(15_000) });
    if (!res.ok) {
      const body = await res.text();
      const error = new Error(`GitHub search ${res.status}: ${body.slice(0, 180)}`);
      error.status = res.status;
      throw error;
    }
    const data = await res.json();
    const items = data.items || [];
    for (const repo of items) {
      if (seen.has(repo.full_name) || !keepRepo(repo, { now, days: options.days })) continue;
      seen.add(repo.full_name);
      const ranked = contributionScore(repo, now);
      kept.push({
        name: repo.full_name,
        url: repo.html_url,
        description: (repo.description || '').replace(/\s+/g, ' ').slice(0, 180),
        language: repo.language || '',
        stars: repo.stargazers_count,
        issues: repo.open_issues_count,
        pushed: String(repo.pushed_at || '').slice(0, 10),
        days: daysSince(repo.pushed_at, now),
        license: repo.license?.spdx_id || repo.license?.key || '',
        score: ranked.score,
        why: ranked.why,
      });
    }
    if (items.length < PAGE_SIZE) break;
  }
  kept.sort((a, b) => b.score - a.score || b.stars - a.stars);
  const repos = kept.slice(0, PAGE_SIZE).map((row, index) => ({ ...row, rank: index + 1 }));
  return {
    generated: now.toISOString().slice(0, 10),
    since: cutoffDay(options.days, now),
    category: query.category,
    label: query.label,
    githubQuery: query.q,
    categories: CATEGORIES.map(({ id, label }) => ({ id, label })),
    repos,
  };
}

function markdown(result) {
  const lines = [
    `# Repo candidates`,
    ``,
    `Generated ${result.generated} by \`node strategy/find-repos.mjs --write --category ${result.category}\`.`,
    `${result.label}. Pushed since ${result.since}. Ranked for a first contribution.`,
    `Confirm a repo by running it and reading one issue before you comment.`,
    ``,
    `| Rank | Score | Repo | Why | Language | Pushed | Open issues | Stars |`,
    `| ---: | ---: | --- | --- | --- | --- | ---: | ---: |`,
    ...result.repos.map((row) => `| ${row.rank} | ${row.score} | [${row.name}](${row.url}) | ${row.why} | ${row.language} | ${row.pushed} | ${row.issues} | ${row.stars} |`),
    ``,
  ];
  return lines.join('\n');
}

async function main() {
  const options = parseFinderArgs(process.argv.slice(2));
  const result = await findRepos(options);
  if (options.json) {
    console.log(JSON.stringify(result));
    return;
  }
  const text = markdown(result);
  if (options.write) writeFileSync(new URL('./repo-candidates.md', import.meta.url), text);
  console.log(text);
  console.error(`\n${result.repos.length} repos`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
