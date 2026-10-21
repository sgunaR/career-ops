/**
 * pdf-index-manifest.mjs — shared writers for data/pdf-index.tsv.
 *
 * Kept free of Playwright so the web smallcaps path and local/make-cv.mjs can
 * register a tailored PDF without importing generate-pdf.mjs. Row-merge rules
 * match generate-pdf.mjs (one row per report number + kind).
 */

import { existsSync, mkdirSync, readFileSync } from 'fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'path';
import { withPipelineLock } from '../pipeline-lock.mjs';
import {
  resolvePdfIndexPath,
  resolveTrackerPath,
  resolveWorkspaceRootFor,
  writeFileAtomic,
} from '../tracker-utils.mjs';

const MANIFEST_HEADER =
  '# report\tpdf\thtml\tformat\tdate\tkind - written by generate-pdf.mjs, do not edit';

/**
 * Merge one generated-PDF row into the manifest's existing data lines.
 *
 * @param {string[]} existingLines - Current manifest lines, comments included.
 * @param {{reportNum: string, pdf: string, html: string, format: string, date: string, kind?: 'cv'|'cover'}} row
 * @returns {string[]} Data lines to write, the incoming row last.
 */
export function applyManifestRow(existingLines, row) {
  const normKey = (s) => (s || '').trim().replace(/^0+(?=\d)/, '');
  const incomingKind = row.kind === 'cover' ? 'cover' : 'cv';

  const kept = existingLines.filter((line) => {
    if (!line.trim() || line.startsWith('#')) return false;
    const fields = line.split('\t');
    if (fields[1] === row.pdf) return false;
    if (!row.reportNum || normKey(fields[0]) !== normKey(row.reportNum)) return true;
    const existingKind = (fields[5] || '').trim();
    return incomingKind === 'cover'
      ? existingKind !== 'cover'
      : existingKind === 'cover';
  });

  kept.push([row.reportNum || '', row.pdf, row.html, row.format, row.date, incomingKind].join('\t'));
  return kept;
}

function toWorkspaceRel(pathValue, rootDir) {
  if (!pathValue) return '';
  const abs = isAbsolute(pathValue) ? pathValue : resolve(rootDir, pathValue);
  const rel = relative(rootDir, abs);
  if (rel === '' || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) return '';
  return rel.split(sep).join('/');
}

/**
 * Record a PDF in data/pdf-index.tsv under one lock (same shape generate-pdf uses).
 *
 * @param {{
 *   reportNum: string|number,
 *   pdfPath: string,
 *   htmlPath?: string,
 *   format?: string,
 *   kind?: 'cv'|'cover',
 *   root: string,
 *   date?: string,
 * }} opts
 * @returns {Promise<string>} Workspace-relative PDF path written to the manifest.
 */
export async function registerPdfIndexEntry(opts) {
  const {
    reportNum,
    pdfPath,
    htmlPath = '',
    format = 'a4',
    kind = 'cv',
    root,
    date = new Date().toISOString().slice(0, 10),
  } = opts;
  if (!root) throw new TypeError('registerPdfIndexEntry: opts.root is required');
  if (!pdfPath) throw new TypeError('registerPdfIndexEntry: opts.pdfPath is required');

  const trackerPath = resolveTrackerPath(root);
  const manifestPath = resolvePdfIndexPath(trackerPath);
  const workspaceRoot = resolveWorkspaceRootFor(root);
  const relPDF = toWorkspaceRel(pdfPath, workspaceRoot);
  if (!relPDF) throw new Error(`PDF path is outside the workspace: ${pdfPath}`);
  const relHTML = toWorkspaceRel(htmlPath, workspaceRoot);
  const report = reportNum == null || reportNum === '' ? '' : String(reportNum).replace(/^0+(?=\d)/, '');

  mkdirSync(dirname(manifestPath), { recursive: true });
  return withPipelineLock(manifestPath, () => {
    const existing = existsSync(manifestPath)
      ? readFileSync(manifestPath, 'utf-8').split('\n')
      : [];
    const lines = applyManifestRow(existing, {
      reportNum: report,
      pdf: relPDF,
      html: relHTML,
      format,
      date,
      kind: kind === 'cover' ? 'cover' : 'cv',
    });
    writeFileAtomic(manifestPath, `${MANIFEST_HEADER}\n${lines.join('\n')}\n`);
    return relPDF;
  });
}
