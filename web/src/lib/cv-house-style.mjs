/**
 * The user's LaTeX house style lives in gitignored local/. When those files
 * are present, dashboard PDF runs fill that template instead of the HTML one.
 */
import fs from "node:fs";
import path from "node:path";

export function detectCvHouseStyle(root) {
  const builder = path.join(root, "local", "build-cv-smallcaps.mjs");
  const template = path.join(root, "local", "cv-template.smallcaps.tex");
  if (fs.existsSync(builder) && fs.existsSync(template)) return "smallcaps";
  return "html";
}
