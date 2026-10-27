#!/usr/bin/env node
// Fill local/cv-template.smallcaps.tex from a JSON payload.
// User-owned: lives in local/ (gitignored), so git pull / update-system never touch it.
//
//   node local/build-cv-smallcaps.mjs <payload.json> <out.tex>
//   node generate-latex.mjs <out.tex> <out.pdf> --compile-only
//
// Payload: { name, phone, location, email, linkedin, github, portfolio: {url, display},
//            summary,
//            competencies: [string]                                   (optional)
//            experience: [{company, location, role, dates, bullets[]}]
//            projects: [{name, url, employer, tech, description}]     (optional)
//            education: [{institution, location, degree, dates}]
//            skills: [{category, items}] }
// Section order: Professional Summary, Core Competencies, Work Experience, Projects, Education, Skills.
// Text is LaTeX-escaped here; wrap a span in **...** in a bullet, description or summary to bold it.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { escapeLatex, sanitizeUrl } from '../lib/latex-escape.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = resolve(HERE, 'cv-template.smallcaps.tex');
const BOLD_RE = /\*\*([^*]+?)\*\*/g;

const text = (s) => escapeLatex(s);
const rich = (s) => escapeLatex(s).replace(BOLD_RE, (_, inner) => `\\textbf{${inner}}`);
const req = (cond, msg, errors) => { if (!cond) errors.push(msg); };
const filled = (v) => typeof v === 'string' && v.trim() !== '';

function validate(p) {
  const errors = [];
  req(filled(p?.name), 'name is required', errors);
  req(filled(p?.phone), 'phone is required', errors);
  req(filled(p?.location), 'location is required', errors);
  for (const k of ['email', 'linkedin', 'github', 'portfolio']) {
    req(filled(p?.[k]?.url), `${k}.url is required`, errors);
  }
  req(filled(p?.summary), 'summary is required', errors);
  if (p?.competencies !== undefined) {
    req(Array.isArray(p.competencies) && p.competencies.every(filled), 'competencies must be a list of non-blank strings', errors);
  }
  req(Array.isArray(p?.education) && p.education.length > 0, 'education[] is required', errors);
  req(Array.isArray(p?.skills) && p.skills.length > 0, 'skills[] is required', errors);
  req(Array.isArray(p?.experience) && p.experience.length > 0, 'experience[] is required', errors);
  (p?.education ?? []).forEach((e, i) => {
    req(filled(e?.institution) && filled(e?.degree), `education[${i}] needs institution + degree`, errors);
  });
  (p?.skills ?? []).forEach((s, i) => {
    req(filled(s?.category) && filled(s?.items), `skills[${i}] needs category + items`, errors);
  });
  (p?.experience ?? []).forEach((e, i) => {
    req(filled(e?.company) && filled(e?.role), `experience[${i}] needs company + role`, errors);
    req(Array.isArray(e?.bullets) && e.bullets.length > 0 && e.bullets.every(filled), `experience[${i}] needs non-blank bullets[]`, errors);
  });
  (p?.projects ?? []).forEach((x, i) => {
    req(filled(x?.name) && filled(x?.description), `projects[${i}] needs name + description`, errors);
  });
  return errors;
}

const link = (o) => ({ url: sanitizeUrl(o.url), display: text(o.display || o.url) });

function buildCompetencies(list) {
  if (!Array.isArray(list) || list.length === 0) return '';
  const items = list.map(text).join(' \\textbar\\ ');
  return `%-----------COMPETENCIES-----------\n\\section{Core Competencies}\n\\small{${items}}\n\\vspace{1pt}\n\n`;
}

function buildProjects(list) {
  if (!Array.isArray(list) || list.length === 0) return '';
  const blocks = list.map((x) => {
    const url = x.url ? sanitizeUrl(x.url) : '';
    const name = url ? `\\href{${url}}{${text(x.name)}}` : text(x.name);
    return `    \\Needspace{5\\baselineskip}\n    \\resumeSubheading\n      {${name}}{${text(x.employer)}}\n      {${text(x.tech)}}{}\n      \\resumeItemListStart\n        \\resumeItem{${rich(x.description)}}\n      \\resumeItemListEnd`;
  });
  return `%-----------PROJECTS-----------\n\\Needspace{13\\baselineskip}\n\\section{Projects}\n  \\resumeSubHeadingListStart\n${blocks.join('\n\n')}\n  \\resumeSubHeadingListEnd\n\n`;
}

function buildEducation(list) {
  return list
    .map((e) => `    \\resumeSubheading\n      {${text(e.institution)}}{${text(e.location)}}\n      {${text(e.degree)}}{${text(e.dates)}}`)
    .join('\n\n');
}

function buildSkills(list) {
  return list
    .map((s) => `${text(s.category)}: & ${text(Array.isArray(s.items) ? s.items.join(', ') : s.items)}`)
    .join(' \\\\[1pt]\n') + ' \\\\';
}

function buildExperience(list) {
  return list
    .map((e) => {
      const bullets = e.bullets.map((b) => `        \\resumeItem{${rich(b)}}`).join('\n');
      return `    \\resumeSubheading\n      {${text(e.company)}}{${text(e.location)}}\n      {${text(e.role)}}{${text(e.dates)}}\n      \\resumeItemListStart\n${bullets}\n      \\resumeItemListEnd`;
    })
    .join('\n\n');
}

async function main() {
  const [inputPath, outputPath] = process.argv.slice(2);
  if (!inputPath || !outputPath) {
    console.error('Usage: node local/build-cv-smallcaps.mjs <payload.json> <out.tex>');
    process.exit(1);
  }

  const payload = JSON.parse(await readFile(resolve(inputPath), 'utf-8'));
  const errors = validate(payload);
  if (errors.length) {
    console.error('Invalid CV payload:\n  - ' + errors.join('\n  - '));
    process.exit(1);
  }

  const email = link(payload.email);
  const linkedin = link(payload.linkedin);
  const github = link(payload.github);
  const portfolio = link(payload.portfolio);

  const substitutions = {
    NAME: text(payload.name),
    PHONE: text(payload.phone),
    LOCATION: text(payload.location),
    EMAIL_URL: email.url,
    EMAIL_DISPLAY: email.display,
    LINKEDIN_URL: linkedin.url,
    LINKEDIN_DISPLAY: linkedin.display,
    GITHUB_URL: github.url,
    GITHUB_DISPLAY: github.display,
    PORTFOLIO_URL: portfolio.url,
    PORTFOLIO_DISPLAY: portfolio.display,
    SUMMARY: rich(payload.summary),
    COMPETENCIES_SECTION: buildCompetencies(payload.competencies),
    PROJECTS_SECTION: buildProjects(payload.projects),
    EDUCATION: buildEducation(payload.education),
    SKILLS: buildSkills(payload.skills),
    EXPERIENCE: buildExperience(payload.experience),
  };

  let out = await readFile(TEMPLATE, 'utf-8');
  // Replacer function, not a string: escaped text can contain `$'` which a string
  // replacement would treat as "the rest of the template".
  for (const [key, value] of Object.entries(substitutions)) {
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), () => value);
  }
  const unresolved = out.match(/\{\{[A-Z_]+\}\}/g);
  if (unresolved) {
    console.error(`Unresolved placeholders: ${[...new Set(unresolved)].join(', ')}`);
    process.exit(1);
  }

  const absOut = resolve(outputPath);
  await mkdir(dirname(absOut), { recursive: true });
  await writeFile(absOut, out, 'utf-8');
  console.log(JSON.stringify({
    file: absOut,
    experienceEntries: payload.experience.length,
    bullets: payload.experience.reduce((n, e) => n + e.bullets.length, 0),
    projects: (payload.projects ?? []).length,
    valid: true,
  }, null, 2));
}

main().catch((err) => { console.error(err.message); process.exit(1); });
