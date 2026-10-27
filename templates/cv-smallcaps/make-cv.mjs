#!/usr/bin/env node
// One command for the LaTeX CV house style. Mirrors the checks `pdf` mode runs
// by default (fact gate before render, skill-gap, page limit, keyword coverage)
// and adds the ATS check that pdf mode only offers as optional.
//
//   node local/make-cv.mjs <payload.json> --company <slug> --keywords "SAP BTP,Node.js,..." \
//     [--jd jds/<slug>.md] [--max-pages 2] [--report NNN]
//
// Order: build .tex -> fact gate (hard stop) -> compile PDF -> skill-gap ->
// ATS + keyword coverage -> page limit (hard max 2 by default) -> optional register-pdf --mark.
// Seed lives in templates/cv-smallcaps/; bootstrap copies into gitignored local/.

import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (name, dflt) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : dflt; };
const payloadPath = args.find((a) => !a.startsWith('--') && a.endsWith('.json'));
const company = flag('company');
const keywords = flag('keywords', '');
const jd = flag('jd');
const reportNum = flag('report');
const maxPages = Number(flag('max-pages', '2'));

if (!payloadPath || !company) {
  console.error('Usage: node local/make-cv.mjs <payload.json> --company <slug> [--keywords "a,b,c"] [--jd jds/x.md] [--max-pages 2] [--report NNN]');
  process.exit(1);
}
if (!existsSync(resolve(ROOT, 'local', 'build-cv-smallcaps.mjs')) || !existsSync(resolve(ROOT, 'local', 'cv-template.smallcaps.tex'))) {
  console.error('Missing local/ smallcaps toolkit. Run once: node templates/cv-smallcaps/bootstrap.mjs');
  process.exit(1);
}
if (!keywords) console.error('Warning: no --keywords given; keyword coverage will not be reported.');

const env = { ...process.env, PATH: `${process.env.PATH}${process.platform === 'win32' ? ';' : ':'}${join(homedir(), 'scoop', 'shims')}` };
const run = (cmd, argv, timeout = 600_000) => spawnSync(cmd, argv, { cwd: ROOT, env, encoding: 'utf-8', timeout });

const payload = JSON.parse(readFileSync(resolve(payloadPath), 'utf-8'));
const candidate = String(payload.name || 'candidate').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const date = new Date().toISOString().slice(0, 10);
const base = `output/cv-${candidate}-${company}-${date}`;
const report = { tex: `${base}.tex`, pdf: `${base}.pdf` };
// cv.md is the source of truth: a payload written before its last edit is stale (missed metrics, old contact details).
const cvPath = resolve(ROOT, 'cv.md');
if (existsSync(cvPath) && statSync(cvPath).mtimeMs > statSync(resolve(payloadPath)).mtimeMs) {
  report.warning = 'STALE PAYLOAD: cv.md was edited after this payload was written. Re-read cv.md and rebuild the payload before trusting this CV.';
  console.error(report.warning);
}
const fail = (stage, detail) => { console.log(JSON.stringify({ ...report, failedAt: stage, detail }, null, 2)); process.exit(1); };

// 1. build
let r = run('node', ['local/build-cv-smallcaps.mjs', payloadPath, report.tex]);
if (r.status !== 0) fail('build', r.stderr.trim());

// 2. fact gate: hard stop before rendering, same as pdf mode step 19
r = run('node', ['verify-cv-facts.mjs', report.tex]);
report.factGate = r.status === 0 ? 'passed' : 'FAILED';
if (r.status !== 0) fail('fact-gate', r.stdout.trim() || r.stderr.trim());

// 3. compile (first run downloads tectonic packages, ~4 min; later runs ~2s)
r = run('node', ['generate-latex.mjs', report.tex, report.pdf, '--compile-only']);
let compiled;
try { compiled = JSON.parse(r.stdout); } catch { fail('compile', (r.stdout + r.stderr).trim()); }
if (!compiled.compiled) fail('compile', compiled.compileError || compiled.issues);

// 4. skill-gap (informational; a LOW CONFIDENCE result is not a pass)
if (jd && existsSync(resolve(ROOT, jd))) {
  r = run('node', ['jd-skill-gap.mjs', jd, '--summary']);
  report.skillGap = r.stdout.trim().split('\n').filter(Boolean).slice(0, 12);
}

// 5. ATS + keyword coverage on the real PDF
const atsArgs = ['local/pdf-ats-check.py', report.pdf];
if (keywords) atsArgs.push('--keywords', keywords);
r = run('python', atsArgs);
try {
  const ats = JSON.parse(r.stdout);
  report.pages = ats.pages;
  report.atsStructuralScore = ats.structural_score;
  report.atsFailedChecks = ats.failed.map((c) => c.check);
  report.phoneInHeader = ats.phone_in_header;
  report.keywordCoverage = ats.keyword_coverage ?? null;
} catch { report.ats = `ATS check did not run: ${(r.stderr || r.stdout).trim().slice(-200)}`; }

// 6. page limit (house rule: hard max 2)
report.pageLimitOk = report.pages === undefined ? null : report.pages <= maxPages;
if (report.pageLimitOk === false) {
  report.warning = `PDF is ${report.pages} pages, limit ${maxPages}: trim lower-priority bullets (keep every employer).`;
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
}

// 7. optional tracker/web index registration
if (reportNum) {
  r = run('node', ['register-pdf.mjs', String(reportNum), report.pdf, '--mark', '--json']);
  report.webIndex = r.status === 0 ? 'ok' : `FAILED: ${(r.stdout + r.stderr).trim().slice(-200)}`;
  if (r.status !== 0) fail('register-pdf', report.webIndex);
}

console.log(JSON.stringify(report, null, 2));
process.exit(0);
