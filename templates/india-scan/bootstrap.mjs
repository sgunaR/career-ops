#!/usr/bin/env node
/**
 * Copy india-scan into local/india-scan/ (gitignored — safe from git pull).
 * Preserves an existing local/india-scan/config.yml.
 *
 *   node templates/india-scan/bootstrap.mjs
 */
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEMPLATE_DIR = dirname(fileURLToPath(import.meta.url));
const CAREER_OPS_ROOT = join(TEMPLATE_DIR, '..', '..');
const DEST = join(CAREER_OPS_ROOT, 'local', 'india-scan');

function copyDir(src, dst) {
  mkdirSync(dst, { recursive: true });
  for (const name of readdirSync(src)) {
    if (name === 'bootstrap.mjs') continue;
    const from = join(src, name);
    const to = join(dst, name);
    if (statSync(from).isDirectory()) {
      copyDir(from, to);
      continue;
    }
    if (name === 'config.yml' && existsSync(to)) {
      console.log(`skip (keep existing): ${to}`);
      continue;
    }
    cpSync(from, to);
  }
}

copyDir(TEMPLATE_DIR, DEST);
console.log(`\nIndia scan ready at: ${DEST}`);
console.log('Next:');
console.log('  node local/india-scan/run.mjs --health');
console.log('  node local/india-scan/run.mjs --login naukri   # first-time login');
console.log('  node local/india-scan/run.mjs --dry-run');
