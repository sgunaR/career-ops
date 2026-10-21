#!/usr/bin/env node
/**
 * register-pdf.mjs — index a tailored PDF for the web UI + optionally mark tracker ✅.
 *
 * The dashboard flips "Generate tailored CV" → "View tailored CV" only when
 * data/pdf-index.tsv has a row for the report (and/or the tracker PDF cell is ✅).
 * HTML renders go through generate-pdf.mjs --report; LaTeX / local/make-cv.mjs
 * need this CLI so the same linkage lands.
 *
 * Usage:
 *   node register-pdf.mjs <report#> <pdf-path> [--html <path>] [--format a4|letter] [--kind cv|cover] [--mark]
 *   node register-pdf.mjs <report#> <pdf-path> --mark --json
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { getCareerOpsRoot } from './path-resolver.mjs';
import { registerPdfIndexEntry } from './lib/pdf-index-manifest.mjs';
import { isMainModule } from './lib/is-main-module.mjs';

const USAGE = `Usage: node register-pdf.mjs <report#> <pdf-path> [--html <path>] [--format a4|letter] [--kind cv|cover] [--mark] [--json]`;

function parseArgs(argv) {
  const positional = [];
  const flags = { html: '', format: 'a4', kind: 'cv', mark: false, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--mark') flags.mark = true;
    else if (a === '--json') flags.json = true;
    else if (a === '--html') flags.html = argv[++i] ?? '';
    else if (a.startsWith('--html=')) flags.html = a.slice('--html='.length);
    else if (a === '--format') flags.format = argv[++i] ?? 'a4';
    else if (a.startsWith('--format=')) flags.format = a.slice('--format='.length);
    else if (a === '--kind') flags.kind = argv[++i] ?? 'cv';
    else if (a.startsWith('--kind=')) flags.kind = a.slice('--kind='.length);
    else if (a.startsWith('--')) throw new Error(`Unknown flag: ${a}`);
    else positional.push(a);
  }
  if (positional.length !== 2) throw new Error(USAGE);
  const [reportNum, pdfPath] = positional;
  if (!/^\d+$/.test(String(reportNum).trim())) {
    throw new Error(`Invalid report#: ${reportNum}`);
  }
  if (flags.kind !== 'cv' && flags.kind !== 'cover') {
    throw new Error(`Invalid --kind ${flags.kind}`);
  }
  return { reportNum: String(reportNum).trim(), pdfPath, ...flags };
}

export async function registerPdf(opts) {
  const root = getCareerOpsRoot();
  const pdfAbs = resolve(root, opts.pdfPath);
  if (!existsSync(pdfAbs)) throw new Error(`PDF not found: ${pdfAbs}`);
  const htmlAbs = opts.html ? resolve(root, opts.html) : '';
  const rel = await registerPdfIndexEntry({
    reportNum: opts.reportNum,
    pdfPath: pdfAbs,
    htmlPath: htmlAbs && existsSync(htmlAbs) ? htmlAbs : '',
    format: opts.format || 'a4',
    kind: opts.kind || 'cv',
    root,
  });

  let marked = null;
  if (opts.mark) {
    const script = resolve(root, 'mark-pdf-ready.mjs');
    const r = spawnSync(process.execPath, [script, opts.reportNum, '--json'], {
      cwd: root,
      encoding: 'utf-8',
    });
    let data = null;
    try { data = JSON.parse(r.stdout || '{}'); } catch { /* ignore */ }
    marked = { ok: r.status === 0, data, stderr: (r.stderr || '').trim() };
    if (!marked.ok) {
      throw new Error(marked.data?.error || marked.stderr || `mark-pdf-ready.mjs exited ${r.status}`);
    }
  }

  return { ok: true, reportNum: opts.reportNum, pdf: rel, marked };
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err.message || USAGE);
    process.exit(1);
  }

  try {
    const result = await registerPdf(opts);
    if (opts.json) console.log(JSON.stringify(result));
    else {
      console.log(`🔗 Manifest: data/pdf-index.tsv updated (report ${result.reportNum} → ${result.pdf})`);
      if (opts.mark) console.log(`✅ Tracker PDF column marked ready for report ${result.reportNum}`);
    }
  } catch (err) {
    if (opts?.json) console.log(JSON.stringify({ ok: false, error: err.message }));
    else console.error(`❌ ${err.message}`);
    process.exit(1);
  }
}

if (isMainModule(import.meta.url)) {
  main();
}
