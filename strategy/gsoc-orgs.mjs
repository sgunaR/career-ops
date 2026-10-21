#!/usr/bin/env node
// GSoC org explorer for the /gsoc dashboard page.
// Fetches https://api.gsocorganizations.dev/organizations.json (2016–2026),
// caches locally, and returns year trends + category filters + a 2027
// enrollment heuristic. Project bodies are dropped — only num_projects stays.
//
//   node strategy/gsoc-orgs.mjs --json
//   node strategy/gsoc-orgs.mjs --json --category Security --year 2026 --q rust
//   node strategy/gsoc-orgs.mjs --json --edge          # first-timer: likely return + less competition
//   node strategy/gsoc-orgs.mjs --json --refresh

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const API_URL = 'https://api.gsocorganizations.dev/organizations.json';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FORECAST_YEAR = 2027;
const SOURCE_YEARS = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
const LATEST_YEAR = 2026;

/** Topic/tech facets layered on top of official GSoC categories. */
export const TOPIC_FACETS = [
  { id: 'web3', label: 'Web3', match: /\b(web3|blockchain|ethereum|solidity|crypto|bitcoin|defi)\b/i },
  { id: 'ml', label: 'Machine learning', match: /\b(machine learning|deep learning|neural|llm|nlp|computer vision)\b/i },
  { id: 'cloud', label: 'Cloud (topics)', match: /\b(cloud|kubernetes|aws|azure|gcp|openstack)\b/i },
];

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = join(__dirname, '.gsoc-cache.json');

/** Household-name orgs — high applicant volume; excluded from first-timer edge. */
const WELL_KNOWN_NAME_RE =
  /\b(apache|mozilla|cncf|kubernetes|python software foundation|django software|wikimedia|red hat|redhat|intel|ibm|google|microsoft|meta|facebook|llvm|freebsd|debian|ubuntu|gnome|kde|cern|blender|videolan|numfocus|opencv|tensorflow|pytorch|eclipse foundation|linux foundation|openstack|ceph|qemu|xen|gcc|rust foundation|nodejs|node\.js|golang|jenkins|docker|hashicorp|elastic|elastic(?:search)?|postgresql|mysql|mariadb|mongodb|redis|nginx|apache software)\b/i;

export function parseGsocArgs(argv) {
  const out = {
    json: false,
    refresh: false,
    edge: false,
    category: '',
    facet: '',
    year: 0,
    q: '',
    likelihood: '',
    limit: 200,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') out.json = true;
    else if (a === '--refresh') out.refresh = true;
    else if (a === '--edge') out.edge = true;
    else if (a === '--category') out.category = String(argv[++i] || '').trim();
    else if (a === '--facet') out.facet = String(argv[++i] || '').trim().toLowerCase();
    else if (a === '--year') out.year = Number(argv[++i]) || 0;
    else if (a === '--q') out.q = String(argv[++i] || '').trim().slice(0, 80);
    else if (a === '--likelihood') out.likelihood = String(argv[++i] || '').trim().toLowerCase();
    else if (a === '--limit') out.limit = Math.min(500, Math.max(1, Number(argv[++i]) || 200));
  }
  return out;
}

function yearKeys(years) {
  if (!years || typeof years !== 'object' || Array.isArray(years)) return [];
  return Object.keys(years)
    .map((y) => Number(y))
    .filter((y) => Number.isFinite(y))
    .sort((a, b) => a - b);
}

function numProjects(yearEntry) {
  if (!yearEntry || typeof yearEntry !== 'object') return 0;
  const n = Number(yearEntry.num_projects);
  return Number.isFinite(n) ? n : Array.isArray(yearEntry.projects) ? yearEntry.projects.length : 0;
}

function normalizeOrg(raw) {
  const yearsObj = raw.years && typeof raw.years === 'object' && !Array.isArray(raw.years) ? raw.years : {};
  const years = yearKeys(yearsObj);
  const projectsByYear = {};
  let totalProjects = 0;
  for (const y of years) {
    const n = numProjects(yearsObj[String(y)]);
    projectsByYear[y] = n;
    totalProjects += n;
  }
  const topics = Array.isArray(raw.topics) ? raw.topics.map(String) : [];
  const technologies = Array.isArray(raw.technologies) ? raw.technologies.map(String) : [];
  return {
    name: String(raw.name || '').trim(),
    url: String(raw.url || '').trim(),
    description: String(raw.description || '').replace(/\s+/g, ' ').trim().slice(0, 280),
    category: String(raw.category || 'Other').trim() || 'Other',
    imageUrl: String(raw.image_url || '').trim(),
    topics,
    technologies,
    years,
    projectsByYear,
    totalProjects,
    yearCount: years.length,
    latestYear: years.length ? years[years.length - 1] : 0,
    firstYear: years.length ? years[0] : 0,
  };
}

function haystack(org) {
  return [org.name, org.description, org.category, ...org.topics, ...org.technologies].join(' ');
}

function matchesFacet(org, facetId) {
  const facet = TOPIC_FACETS.find((f) => f.id === facetId);
  if (!facet) return true;
  return facet.match.test(haystack(org));
}

/** Consecutive years ending at LATEST_YEAR (or 0 if not in latest). */
export function streakEndingAt(years, endYear = LATEST_YEAR) {
  const set = new Set(years);
  if (!set.has(endYear)) return 0;
  let streak = 0;
  for (let y = endYear; set.has(y); y--) streak++;
  return streak;
}

/**
 * Heuristic likelihood an org returns for FORECAST_YEAR.
 * Not a prediction guarantee — streak + recency + project trend only.
 */
export function forecast2027(org) {
  const years = org.years;
  const inLatest = years.includes(LATEST_YEAR);
  const streak = streakEndingAt(years, LATEST_YEAR);
  const recent = years.filter((y) => y >= LATEST_YEAR - 2).length; // 2024–2026
  const prior = years.filter((y) => y < LATEST_YEAR - 2).length;

  let score = 0;
  const reasons = [];

  if (inLatest) {
    score += 40;
    reasons.push(`in ${LATEST_YEAR}`);
  } else if (years.includes(LATEST_YEAR - 1)) {
    score += 15;
    reasons.push(`missed ${LATEST_YEAR} after ${LATEST_YEAR - 1}`);
  } else {
    reasons.push(`not in ${LATEST_YEAR}`);
  }

  if (streak >= 5) {
    score += 30;
    reasons.push(`${streak}-year streak`);
  } else if (streak >= 3) {
    score += 22;
    reasons.push(`${streak}-year streak`);
  } else if (streak === 2) {
    score += 12;
    reasons.push('2-year streak');
  } else if (streak === 1) {
    score += 6;
    reasons.push('first/return year');
  }

  if (recent >= 3) {
    score += 15;
    reasons.push('all of last 3 years');
  } else if (recent === 2) {
    score += 8;
    reasons.push('2 of last 3 years');
  }

  const pLatest = org.projectsByYear[LATEST_YEAR] || 0;
  const pPrev = org.projectsByYear[LATEST_YEAR - 1] || 0;
  if (inLatest && pLatest > 0) {
    if (pPrev > 0 && pLatest > pPrev) {
      score += 10;
      reasons.push('project count up');
    } else if (pPrev > 0 && pLatest >= pPrev) {
      score += 6;
      reasons.push('project count steady');
    } else if (pLatest >= 5) {
      score += 8;
      reasons.push(`${pLatest} projects in ${LATEST_YEAR}`);
    } else if (pLatest >= 2) {
      score += 4;
      reasons.push(`${pLatest} projects in ${LATEST_YEAR}`);
    }
  }

  if (org.yearCount >= 8) {
    score += 5;
    reasons.push('long-time org');
  } else if (prior === 0 && inLatest) {
    score -= 5;
    reasons.push('new in recent window');
  }

  score = Math.max(0, Math.min(100, score));
  let likelihood = 'low';
  if (score >= 70) likelihood = 'high';
  else if (score >= 40) likelihood = 'medium';

  return { score, likelihood, reasons, streak };
}

/**
 * First-timer edge: decent chance of returning to GSoC, but smaller / less famous
 * so applicant pools are usually thinner. Pure heuristic — no LLM needed.
 *
 * Sweet spot: medium–high likelihood, recent participation, few slots, not a
 * household name, not a 10-year veteran everyone already targets.
 */
export function computeEdge(org, forecast) {
  const reasons = [];
  const pLatest = org.projectsByYear[LATEST_YEAR] || 0;
  const inLatest = org.years.includes(LATEST_YEAR);
  const wellKnown = WELL_KNOWN_NAME_RE.test(org.name);

  if (wellKnown) {
    return {
      edgeScore: 0,
      isEdge: false,
      reasons: ['well-known brand — high competition'],
    };
  }
  if (forecast.likelihood === 'low') {
    return {
      edgeScore: 0,
      isEdge: false,
      reasons: ['low return likelihood'],
    };
  }
  if (!inLatest && forecast.streak === 0) {
    return {
      edgeScore: 0,
      isEdge: false,
      reasons: [`not in ${LATEST_YEAR} and no return streak`],
    };
  }

  // Competition proxies: many years + many slots ≈ famous / crowded.
  if (org.yearCount >= 8) {
    return {
      edgeScore: 0,
      isEdge: false,
      reasons: [`${org.yearCount} years — long-time / well-known to applicants`],
    };
  }
  if (pLatest >= 8) {
    return {
      edgeScore: 0,
      isEdge: false,
      reasons: [`${pLatest} projects in ${LATEST_YEAR} — large cohort`],
    };
  }
  if (org.totalProjects > 35) {
    return {
      edgeScore: 0,
      isEdge: false,
      reasons: [`${org.totalProjects} career projects — high visibility`],
    };
  }

  let edgeScore = Math.round(forecast.score * 0.55);
  reasons.push(`${forecast.likelihood} return chance (${forecast.score})`);

  // Prefer 2–5 years: proven enough to return, not a celebrity org.
  if (org.yearCount >= 2 && org.yearCount <= 5) {
    edgeScore += 22;
    reasons.push(`${org.yearCount} years — quieter than veterans`);
  } else if (org.yearCount === 1 && inLatest) {
    edgeScore += 12;
    reasons.push('newer org — less applicant history');
  } else if (org.yearCount === 6 || org.yearCount === 7) {
    edgeScore += 8;
    reasons.push(`${org.yearCount} years — mid visibility`);
  }

  // Smaller slot counts → fewer accepted students → often fewer applicants.
  if (inLatest && pLatest >= 1 && pLatest <= 3) {
    edgeScore += 20;
    reasons.push(`${pLatest} slot${pLatest === 1 ? '' : 's'} in ${LATEST_YEAR}`);
  } else if (inLatest && pLatest >= 4 && pLatest <= 5) {
    edgeScore += 10;
    reasons.push(`${pLatest} slots in ${LATEST_YEAR}`);
  } else if (!inLatest) {
    edgeScore += 4;
    reasons.push(`missed ${LATEST_YEAR} — riskier but less crowded if they return`);
  }

  if (org.totalProjects > 0 && org.totalProjects <= 12) {
    edgeScore += 12;
    reasons.push('small historical project footprint');
  } else if (org.totalProjects <= 25) {
    edgeScore += 6;
    reasons.push('moderate project footprint');
  }

  if (forecast.streak >= 2 && forecast.streak <= 4) {
    edgeScore += 10;
    reasons.push(`${forecast.streak}-year streak without mega-fame`);
  }

  edgeScore = Math.max(0, Math.min(100, edgeScore));
  // Need both return signal and low-competition signal.
  const isEdge = edgeScore >= 48 && (forecast.likelihood === 'high' || forecast.likelihood === 'medium');

  return { edgeScore, isEdge, reasons };
}

function buildYearSeries(orgs) {
  const byYear = {};
  for (const y of SOURCE_YEARS) {
    byYear[y] = { year: y, orgCount: 0, projectCount: 0, returning: 0, newcomers: 0 };
  }
  for (const org of orgs) {
    const set = new Set(org.years);
    for (const y of org.years) {
      if (!byYear[y]) continue;
      byYear[y].orgCount += 1;
      byYear[y].projectCount += org.projectsByYear[y] || 0;
      if (set.has(y - 1)) byYear[y].returning += 1;
      else byYear[y].newcomers += 1;
    }
  }
  return SOURCE_YEARS.map((y) => byYear[y]);
}

function categoryCounts(orgs, year = 0) {
  const counts = new Map();
  for (const org of orgs) {
    if (year && !org.years.includes(year)) continue;
    counts.set(org.category, (counts.get(org.category) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([id, count]) => ({ id, label: id, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

async function loadRawOrgs({ refresh = false, fetchImpl = fetch } = {}) {
  if (!refresh && existsSync(CACHE_PATH)) {
    try {
      const cached = JSON.parse(readFileSync(CACHE_PATH, 'utf8'));
      if (cached?.fetchedAt && Date.now() - Date.parse(cached.fetchedAt) < CACHE_TTL_MS && Array.isArray(cached.organizations)) {
        return { organizations: cached.organizations, fetchedAt: cached.fetchedAt, fromCache: true };
      }
    } catch {
      // fall through to network
    }
  }

  const res = await fetchImpl(API_URL, {
    headers: { Accept: 'application/json', 'User-Agent': 'career-ops-gsoc' },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    throw new Error(`GSoC organizations API ${res.status}`);
  }
  const data = await res.json();
  const list = Array.isArray(data) ? data : data.organizations;
  if (!Array.isArray(list)) throw new Error('Unexpected GSoC API payload');

  const fetchedAt = new Date().toISOString();
  try {
    mkdirSync(__dirname, { recursive: true });
    writeFileSync(CACHE_PATH, JSON.stringify({ fetchedAt, organizations: list }));
  } catch {
    // cache is best-effort
  }
  return { organizations: list, fetchedAt, fromCache: false };
}

export async function buildGsocReport(options = {}, deps = {}) {
  const opts = {
    category: '',
    facet: '',
    year: 0,
    q: '',
    likelihood: '',
    edge: false,
    limit: 200,
    refresh: false,
    ...options,
  };
  const { organizations: raw, fetchedAt, fromCache } = await loadRawOrgs({
    refresh: opts.refresh,
    fetchImpl: deps.fetchImpl || fetch,
  });

  const all = raw.map(normalizeOrg).filter((o) => o.name);
  const yearSeries = buildYearSeries(all);
  const categories = categoryCounts(all, opts.year || 0);
  const facets = TOPIC_FACETS.map((f) => ({
    id: f.id,
    label: f.label,
    count: all.filter((o) => matchesFacet(o, f.id) && (!opts.year || o.years.includes(opts.year))).length,
  }));

  let filtered = all;
  if (opts.category) {
    const want = opts.category.toLowerCase();
    filtered = filtered.filter((o) => o.category.toLowerCase() === want);
  }
  if (opts.facet) {
    filtered = filtered.filter((o) => matchesFacet(o, opts.facet));
  }
  if (opts.year) {
    filtered = filtered.filter((o) => o.years.includes(opts.year));
  }
  if (opts.q) {
    const re = new RegExp(opts.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filtered = filtered.filter((o) => re.test(haystack(o)));
  }

  const withForecast = filtered.map((org) => {
    const forecast = forecast2027(org);
    const edge = computeEdge(org, forecast);
    return {
      name: org.name,
      url: org.url,
      description: org.description,
      category: org.category,
      imageUrl: org.imageUrl,
      topics: org.topics.slice(0, 8),
      technologies: org.technologies.slice(0, 10),
      years: org.years,
      yearCount: org.yearCount,
      totalProjects: org.totalProjects,
      projectsLatest: org.projectsByYear[LATEST_YEAR] || 0,
      latestYear: org.latestYear,
      forecastScore: forecast.score,
      likelihood: forecast.likelihood,
      forecastReasons: forecast.reasons,
      streak: forecast.streak,
      edgeScore: edge.edgeScore,
      isEdge: edge.isEdge,
      edgeReasons: edge.reasons,
    };
  });

  if (opts.likelihood) {
    withForecast.splice(
      0,
      withForecast.length,
      ...withForecast.filter((o) => o.likelihood === opts.likelihood),
    );
  }

  // Count edge candidates on the current (pre-edge) filter set so the UI can
  // show "N first-timer edge orgs" even when the edge toggle is off.
  const edgeCount = withForecast.filter((o) => o.isEdge).length;

  if (opts.edge) {
    withForecast.splice(
      0,
      withForecast.length,
      ...withForecast.filter((o) => o.isEdge),
    );
  }

  if (opts.edge) {
    withForecast.sort(
      (a, b) =>
        b.edgeScore - a.edgeScore ||
        b.forecastScore - a.forecastScore ||
        a.totalProjects - b.totalProjects ||
        a.name.localeCompare(b.name),
    );
  } else {
    withForecast.sort(
      (a, b) =>
        b.forecastScore - a.forecastScore ||
        b.yearCount - a.yearCount ||
        b.totalProjects - a.totalProjects ||
        a.name.localeCompare(b.name),
    );
  }

  const limited = withForecast.slice(0, opts.limit);
  const likelihoodCounts = { high: 0, medium: 0, low: 0 };
  for (const o of withForecast) likelihoodCounts[o.likelihood] += 1;

  const returningLatest = yearSeries.find((r) => r.year === LATEST_YEAR);

  return {
    ok: true,
    generated: new Date().toISOString().slice(0, 10),
    fetchedAt,
    fromCache,
    source: API_URL,
    forecastYear: FORECAST_YEAR,
    latestYear: LATEST_YEAR,
    years: SOURCE_YEARS,
    edgeMode: Boolean(opts.edge),
    categories,
    facets,
    yearSeries,
    summary: {
      totalOrgs: all.length,
      matched: withForecast.length,
      shown: limited.length,
      edgeCount,
      orgsInLatest: returningLatest?.orgCount || 0,
      projectsInLatest: returningLatest?.projectCount || 0,
      likelihoodCounts,
    },
    disclaimer:
      `Likelihood for ${FORECAST_YEAR} is a heuristic from past participation (streak, recency, project trend) — not an official GSoC announcement.`,
    edgeDisclaimer:
      'First-timer edge = likely to return + smaller/less famous (few slots, fewer years, not a household name). Still contribute early — no filter replaces a real PR.',
    organizations: limited,
  };
}

async function main() {
  const options = parseGsocArgs(process.argv.slice(2));
  const result = await buildGsocReport(options);
  if (options.json) {
    console.log(JSON.stringify(result));
    return;
  }
  console.log(`GSoC orgs: ${result.summary.totalOrgs} total, ${result.summary.matched} matched`);
  console.log(`Years: ${result.yearSeries.map((r) => `${r.year}:${r.orgCount}`).join(' ')}`);
  const label = options.edge ? 'Top first-timer edge' : `Top likely for ${result.forecastYear}`;
  console.log(`\n${label}:`);
  for (const org of result.organizations.slice(0, 15)) {
    const edgeBit = options.edge ? ` edge=${org.edgeScore}` : '';
    console.log(
      `  [${org.likelihood}/${org.forecastScore}${edgeBit}] ${org.name} — ${org.category} (${org.yearCount} yrs, ${org.projectsLatest} slots)`,
    );
  }
  console.error(`\n${result.disclaimer}`);
  if (options.edge) console.error(result.edgeDisclaimer);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}
