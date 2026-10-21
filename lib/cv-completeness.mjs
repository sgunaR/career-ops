// Guards tailored CV payloads against the two cuts that shrink a résumé:
// dropping experience bullets, and leaving out a JD phrase cv.md already states.
// Rewording a bullet is allowed. A lower bullet count is not.

const STOP = new Set(['and', 'the', 'for', 'with', 'from', 'via', 'using', 'across', 'both', 'not']);

function section(md, title) {
  const re = new RegExp(`^##\\s+${title}\\s*$`, 'im');
  const m = String(md).match(re);
  if (!m) return '';
  const rest = md.slice(m.index + m[0].length);
  const next = rest.search(/^##\s+/m);
  return next === -1 ? rest : rest.slice(0, next);
}

function norm(s) {
  return String(s ?? '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function splitTop(line) {
  const out = [];
  let buf = '';
  let depth = 0;
  for (const ch of line) {
    if (ch === '(') depth += 1;
    else if (ch === ')' && depth > 0) depth -= 1;
    if (ch === ',' && depth === 0) {
      if (buf.trim()) out.push(buf.trim());
      buf = '';
    } else buf += ch;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

function tokens(item) {
  const inner = [];
  const head = item.replace(/\(([^)]*)\)/g, (_, p) => { inner.push(p); return ' '; });
  return [...splitTop(head), ...inner.flatMap(splitTop)]
    .flatMap((part) => part.split(/\s*(?:\/|&|,)\s*/))
    .map((t) => t.trim())
    .filter((t) => t.length > 2 && !STOP.has(norm(t)));
}

export function experienceFromCv(md) {
  return section(md, 'Experience')
    .split(/^###\s+/m)
    .slice(1)
    .map((block) => {
      const [head, ...rest] = block.split('\n');
      const bullets = rest.filter((line) => /^\s*[-*]\s+\S/.test(line));
      return { company: head.trim(), bullets: bullets.length };
    })
    .filter((row) => row.company && row.bullets > 0);
}

export function skillTokensFromCv(md) {
  const skills = section(md, 'Skills');
  const found = [];
  for (const block of skills.split(/^###\s+/m).slice(1)) {
    const lines = block.split('\n').slice(1).filter((line) => line.trim() && !line.startsWith('#'));
    for (const item of splitTop(lines.join(' '))) found.push(...tokens(item));
  }
  return [...new Set(found)];
}

function payloadText(payload) {
  const bits = [payload?.summary];
  for (const row of payload?.competencies ?? []) bits.push(row);
  for (const job of payload?.experience ?? []) {
    bits.push(job?.company, ...(job?.bullets ?? []));
  }
  for (const row of payload?.skills ?? []) bits.push(row?.category, row?.items);
  return norm(bits.filter(Boolean).join('\n'));
}

function employerMatch(sourceName, payloadJobs) {
  const want = norm(sourceName);
  return payloadJobs.find((job) => {
    const got = norm(job?.company);
    return got === want || (want.length > 3 && (got.includes(want) || want.includes(got)));
  });
}

export function cvCompletenessIssues(cvMarkdown, payload, keywords = '') {
  const issues = [];
  const jobs = Array.isArray(payload?.experience) ? payload.experience : [];
  const text = payloadText(payload);
  for (const row of experienceFromCv(cvMarkdown)) {
    const job = employerMatch(row.company, jobs);
    if (!job) {
      issues.push(`Missing employer ${row.company} (${row.bullets} bullets in cv.md).`);
      continue;
    }
    const count = Array.isArray(job.bullets) ? job.bullets.length : 0;
    if (count < row.bullets) {
      issues.push(`${row.company} has ${count} bullets; cv.md has ${row.bullets}. Keep every bullet.`);
    }
  }
  for (const token of skillTokensFromCv(cvMarkdown)) {
    if (!text.includes(norm(token))) issues.push(`Skill from cv.md is missing: ${token}.`);
  }
  const phrases = String(keywords).split(',').map((k) => k.trim()).filter(Boolean);
  const source = norm(cvMarkdown);
  for (const phrase of phrases) {
    const key = norm(phrase);
    if (!key || !source.includes(key)) continue;
    if (!text.includes(key)) issues.push(`JD phrase already in cv.md is missing from this CV: ${phrase}.`);
  }
  return issues;
}
