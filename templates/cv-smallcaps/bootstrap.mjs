#!/usr/bin/env node
/**
 * Copy the smallcaps LaTeX CV toolkit into local/ (gitignored — safe from git pull).
 * Overwrites the shared runner/template files so clones stay in sync with the seed.
 * Preserves existing local/cv-payload-*.json (machine-specific tailored payloads).
 *
 *   node templates/cv-smallcaps/bootstrap.mjs
 */
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEMPLATE_DIR = dirname(fileURLToPath(import.meta.url));
const CAREER_OPS_ROOT = join(TEMPLATE_DIR, '..', '..');
const DEST = join(CAREER_OPS_ROOT, 'local');

const KEEP_IF_EXISTS = new Set([
  'cv-payload-fullstack.example.json',
  'cv-payload-sap.example.json',
]);

mkdirSync(DEST, { recursive: true });

for (const name of readdirSync(TEMPLATE_DIR)) {
  if (name === 'bootstrap.mjs' || name === 'README.md') continue;
  const from = join(TEMPLATE_DIR, name);
  if (statSync(from).isDirectory()) continue;
  const to = join(DEST, name);
  if (KEEP_IF_EXISTS.has(name) && existsSync(to)) {
    console.log(`skip (keep existing): ${to}`);
    continue;
  }
  cpSync(from, to);
  console.log(`copied: ${name}`);
}

console.log(`\nSmallcaps CV toolkit ready at: ${DEST}`);
console.log('Next:');
console.log('  # Need tectonic on PATH (scoop install tectonic) + pip install pymupdf');
console.log('  node local/make-cv.mjs local/cv-payload-fullstack.example.json --company example --max-pages 2');
