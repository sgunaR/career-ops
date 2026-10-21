#!/usr/bin/env node
// ATS screen CV. One column, A4, real text, no icons.
// Header and skill chips follow the Enhancv sample; the body stays in reading
// order so a parser sees summary, skills, then experience.
//
//   node build-cv-screen.mjs <payload.json> <output.html>
//
// Content rules live in lib/cv-screen-rules.mjs. They do not add facts.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { emphasizeMetrics, prepareScreenPayload } from "./lib/cv-screen-rules.mjs";

const [payloadPath, outputPath] = process.argv.slice(2);
if (!payloadPath || !outputPath) {
  console.error("Usage: node build-cv-screen.mjs <payload.json> <output.html>");
  process.exit(1);
}

const raw = JSON.parse(readFileSync(resolve(payloadPath), "utf8"));
const { payload, notes } = prepareScreenPayload(raw);

const esc = (value) => String(value || "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const rich = (value) => emphasizeMetrics(esc(value));

const contact = [
  payload.phone,
  payload.email?.display,
  payload.linkedin?.display,
  payload.portfolio?.display,
  payload.github?.display,
  payload.location,
].filter(Boolean);

const skillGroups = (payload.skills || []).map((group) => `
    <p class="skill"><span>${esc(group.category)}</span> ${esc((group.items || []).join(" · "))}</p>`).join("");

const jobs = (payload.experience || []).map((job) => `
    <article>
      <h3>${esc(job.role)} <span>${esc(job.company)}</span></h3>
      <p class="meta">${esc(job.dates)} · ${esc(job.location)}</p>
      <ul>${(job.bullets || []).map((bullet) => `<li>${rich(bullet)}</li>`).join("")}</ul>
    </article>`).join("");

const education = (payload.education || []).map((item) => `
    <p><strong>${esc(item.school || item.institution || "")}</strong> — ${esc(item.credential || item.degree || "")} · ${esc(item.dates || "")}</p>`).join("");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(payload.name)} — ${esc(payload.headline || "Software Developer")}</title>
<style>
  @page { size: A4; margin: 12mm 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #1c1917; font-family: Calibri, Carlito, "Segoe UI", sans-serif; font-size: 10.5pt; line-height: 1.35; }
  h1 { margin: 0; font-size: 22pt; letter-spacing: 0.04em; font-weight: 800; }
  h2 { margin: 14px 0 6px; font-size: 11pt; letter-spacing: 0.08em; text-transform: uppercase; border-bottom: 1.5px solid #111; }
  h3 { margin: 8px 0 0; font-size: 11pt; }
  h3 span { font-weight: 650; }
  .title { margin: 1px 0 6px; color: #1d4ed8; font-size: 12pt; font-weight: 700; }
  .contact { margin: 0 0 8px; color: #444; font-size: 9.5pt; }
  p { margin: 0 0 6px; }
  ul { margin: 2px 0 8px; padding-left: 16px; }
  li { margin: 0 0 2px; }
  .meta { color: #57534e; font-size: 9.5pt; }
  .skill span { display: inline-block; min-width: 7.2em; font-weight: 700; color: #1d4ed8; }
  strong { font-weight: 750; }
</style>
</head>
<body>
  <h1>${esc(String(payload.name || "").toUpperCase())}</h1>
  <p class="title">${esc(payload.headline || "Software Developer")}</p>
  <p class="contact">${contact.map(esc).join("  ·  ")}</p>
  <h2>Summary</h2>
  <p>${rich(payload.summary)}</p>
  <h2>Skills</h2>
  ${skillGroups || `<p>${esc((payload.competencies || []).join(" · "))}</p>`}
  <h2>Experience</h2>
  ${jobs}
  ${education ? `<h2>Education</h2>${education}` : ""}
</body>
</html>
`;

writeFileSync(resolve(outputPath), html);
console.log(JSON.stringify({ html: outputPath, notes }, null, 2));
