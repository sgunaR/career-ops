// Content rules taken from an Enhancv / Naukri screen of a generated CV.
// They rewrite wording only. They never add a metric, skill, or employer.

const PRONOUN = /\b(I|me|my|mine|myself|we|our|ours|us|them|their|theirs)\b/gi;
const ACTION = /^(Built|Designed|Delivered|Led|Implemented|Configured|Enabled|Engineered|Owned|Set|Applied|Containerized|Provisioned|Strengthened|Integrated|Developed|Created|Reduced|Improved|Automated|Deployed|Tested|Wrote|Shipped|Consolidated|Translated|Administered|Performed|Supported|Mentored|Classified|Queried|Used)\b/;

export function screenText(value) {
  const notes = [];
  let text = String(value || "");
  const doubled = text.match(/\b([A-Za-z]+)\s+\1\b/gi) || [];
  if (doubled.length) notes.push(`collapsed repeated word: ${doubled.join(", ")}`);
  text = text.replace(/\b([A-Za-z]+)\s+\1\b/gi, "$1");
  text = text.replace(/([A-Za-z]),js\b/g, (_, name) => {
    notes.push(`fixed ${name},js`);
    return `${name}.js`;
  });
  if (PRONOUN.test(text)) notes.push("removed personal pronouns");
  PRONOUN.lastIndex = 0;
  text = text.replace(PRONOUN, "");
  text = text.replace(/\s{2,}/g, " ").replace(/\s+([,.;:])/g, "$1").replace(/\(\s+/g, "(").replace(/\s+\)/g, ")").trim();
  text = text.replace(/^[a-z]/, (letter) => letter.toUpperCase());
  return { text, notes };
}

export function bulletIssues(bullet) {
  const issues = [];
  if (!ACTION.test(bullet)) issues.push("does not open with an action verb");
  if (!/\d/.test(bullet)) issues.push("no number");
  return issues;
}

function rankBullet(bullet) {
  return (/\d/.test(bullet) ? 2 : 0) + (ACTION.test(bullet) ? 1 : 0);
}

/**
 * Keep every employer. Prefer numbered bullets when a role has more than `cap`.
 * @param {object} payload
 * @param {{ caps?: number[] }} [options]
 */
export function prepareScreenPayload(payload, options = {}) {
  const caps = options.caps || [4, 3, 3, 2];
  const notes = [];
  const summary = screenText(payload.summary || "");
  notes.push(...summary.notes.map((note) => `summary: ${note}`));
  const experience = (payload.experience || []).map((job, index) => {
    const cap = caps[Math.min(index, caps.length - 1)];
    const bullets = (job.bullets || []).map((bullet) => {
      const cleaned = screenText(bullet);
      notes.push(...cleaned.notes.map((note) => `${job.company}: ${note}`));
      return cleaned.text;
    }).filter(Boolean);
    const ranked = bullets
      .map((text, order) => ({ text, order, rank: rankBullet(text) }))
      .sort((a, b) => b.rank - a.rank || a.order - b.order);
    const kept = ranked.slice(0, cap).sort((a, b) => a.order - b.order).map((item) => item.text);
    if (bullets.length > kept.length) notes.push(`${job.company}: kept ${kept.length} of ${bullets.length} bullets, numbered ones first`);
    for (const bullet of kept) {
      for (const issue of bulletIssues(bullet)) notes.push(`${job.company}: ${issue}`);
    }
    return { ...job, bullets: kept };
  });
  return {
    payload: { ...payload, summary: summary.text, experience },
    notes,
  };
}

export function emphasizeMetrics(text) {
  return String(text || "").replace(/\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?%\+?|\d+\+)/g, "<strong>$1</strong>");
}
