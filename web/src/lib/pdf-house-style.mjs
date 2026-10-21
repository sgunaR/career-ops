/**
 * Render a small-caps LaTeX CV from the JSON payload the pdf worker emitted.
 * Same honesty rule as pdf-render.mjs: the tracker is marked only after compile succeeds.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { cleanupPdfScratch, markTrackerReady } from "./pdf-render.mjs";

function runChild(spawnFn, command, args, options) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawnFn(command, args, options);
    } catch (err) {
      resolve({ ok: false, stdout: "", stderr: err.message });
      return;
    }
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => { stdout += d.toString(); });
    child.stderr?.on("data", (d) => { stderr += d.toString(); });
    child.on("close", (code) => resolve({ ok: code === 0, stdout, stderr: stderr.trim() }));
    child.on("error", (err) => resolve({ ok: false, stdout, stderr: err.message }));
  });
}

export function writeCvJson({ pdfPaths, payload }) {
  const jsonPath = pdfPaths.html.replace(/\.html$/i, ".json");
  try {
    fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), "utf8");
    return { ok: true, jsonPath };
  } catch (err) {
    return { ok: false, error: `Could not save the tailored CV payload to ${err.path ?? jsonPath}: ${err.message}` };
  }
}

/**
 * @param {{spawnFn: Function, execPath: string, root: string, pdfPaths: {html: string, finalPdf: string, reportNum: string}, reportNum: string}} args
 */
export async function renderSmallcapsAndMark({ spawnFn, execPath, root, pdfPaths, reportNum }) {
  const warnings = [];
  const jsonPath = pdfPaths.html.replace(/\.html$/i, ".json");
  const texPath = pdfPaths.html.replace(/\.html$/i, ".tex");
  const env = {
    ...process.env,
    PATH: `${process.env.PATH}${path.delimiter}${path.join(os.homedir(), "scoop", "shims")}`,
  };
  const opts = { cwd: root, env };
  const cvPath = path.join(root, "cv.md");
  if (fs.existsSync(cvPath) && fs.existsSync(jsonPath)) {
    let payload;
    try { payload = JSON.parse(fs.readFileSync(jsonPath, "utf8")); }
    catch (err) { return { kind: "render-failed", error: `CV payload is not valid JSON: ${err.message}` }; }
    // Loaded at runtime. A static import of repo-root lib/ fails: Turbopack's root is web/.
    const { cvCompletenessIssues } = await import(pathToFileURL(path.join(root, "lib", "cv-completeness.mjs")).href);
    const issues = cvCompletenessIssues(fs.readFileSync(cvPath, "utf8"), payload);
    if (issues.length) {
      return { kind: "render-failed", error: issues.slice(0, 8).join(" ") };
    }
  }

  const built = await runChild(spawnFn, execPath, [
    path.join(root, "local", "build-cv-smallcaps.mjs"),
    jsonPath,
    texPath,
  ], opts);
  if (!built.ok) {
    cleanupPdfScratch(path.dirname(pdfPaths.html), `cv-web-${reportNum}.`);
    return { kind: "render-failed", error: (built.stderr || built.stdout || "Could not build the LaTeX CV.").slice(0, 500) };
  }

  const compiled = await runChild(spawnFn, execPath, [
    path.join(root, "generate-latex.mjs"),
    texPath,
    pdfPaths.finalPdf,
    "--compile-only",
  ], opts);
  if (!compiled.ok) {
    cleanupPdfScratch(path.dirname(pdfPaths.html), `cv-web-${reportNum}.`);
    return { kind: "render-failed", error: (compiled.stderr || compiled.stdout || "LaTeX compile failed.").slice(0, 500) };
  }

  try {
    fs.copyFileSync(texPath, pdfPaths.finalPdf.replace(/\.pdf$/i, ".tex"));
  } catch (err) {
    warnings.push(`PDF rendered, but its .tex was not kept beside it: ${err.message}`);
  }

  for (const line of compiled.stderr.split("\n")) {
    const text = line.trim();
    if (text) warnings.push(text);
  }

  cleanupPdfScratch(path.dirname(pdfPaths.html), `cv-web-${reportNum}.`);

  // Index before mark: the web UI serves /api/cv-pdf from data/pdf-index.tsv.
  // generate-pdf.mjs --report does this for HTML CVs; LaTeX must register too
  // or the button stays on "Generate" / View opens the wrong fallback PDF.
  try {
    const { registerPdfIndexEntry } = await import(
      pathToFileURL(path.join(root, "lib", "pdf-index-manifest.mjs")).href
    );
    await registerPdfIndexEntry({
      reportNum,
      pdfPath: pdfPaths.finalPdf,
      htmlPath: fs.existsSync(texPath) ? texPath : "",
      format: "a4",
      kind: "cv",
      root,
    });
  } catch (err) {
    warnings.push(
      `PDF rendered, but data/pdf-index.tsv was not updated: ${err.message}. Run \`node register-pdf.mjs ${reportNum} ${path.relative(root, pdfPaths.finalPdf)} --mark\`.`,
    );
  }

  const mark = await markTrackerReady({ spawnFn, execPath, root, reportNum });
  if (!mark.ok) {
    warnings.push(
      mark.data?.error
        ? `PDF rendered, but the tracker wasn't updated: ${mark.data.error}`
        : `PDF rendered, but the tracker's PDF column wasn't updated automatically — run \`node mark-pdf-ready.mjs ${reportNum}\` manually.`,
    );
  }
  return { kind: "rendered", warnings };
}
