/**
 * JSON twin of cv-envelope.mjs for the small-caps LaTeX house style.
 * The agent emits a payload; the backend fills local/cv-template.smallcaps.tex.
 */
export const JSON_OPEN_MARK = "<<cv-json>>";
export const JSON_CLOSE_MARK = "<</cv-json>>";

const OPENER = /^<<cv-json>>[ \t]*$/gm;
const CLOSER = /^<<\/cv-json>>[ \t]*$/m;
const CLOSER_ALL = /^<<\/cv-json>>[ \t]*$/gm;

export const CV_JSON_ENVELOPE_INSTRUCTION =
  `Do NOT save or edit any file — the platform persists your output for you. Output ONLY the finished JSON envelope: the very first output line must contain only \`${JSON_OPEN_MARK}\`, and nothing else on that line. Do not add an introduction, explanation, or Markdown code fence before or around the envelope. Then one JSON object for local/build-cv-smallcaps.mjs, then a final line containing only \`${JSON_CLOSE_MARK}\`. Each marker appears exactly once. The object needs name, phone, location, email, linkedin, github, portfolio (each link is {url, display}), summary, experience (every employer from cv.md, and every bullet from cv.md — do not drop or merge bullets to fit a page), education, and skills (every category and item from cv.md). Put each JD phrase that cv.md already supports into the summary, the competencies line, or a bullet. competencies and projects are optional. Use -- in dates. **bold** is allowed in summary, bullets, and project descriptions. Never invent a skill or a number.`;

function couldBecomeMarker(line) {
  return (
    JSON_OPEN_MARK.startsWith(line) || JSON_CLOSE_MARK.startsWith(line) ||
    line.startsWith(JSON_OPEN_MARK) || line.startsWith(JSON_CLOSE_MARK)
  );
}

function completeMarker(re, s) {
  for (const m of s.matchAll(re)) {
    const after = m.index + m[0].length;
    if (s[after] === "\n") return { start: m.index, end: after + 1 };
  }
  return null;
}

export function parseCvJsonEnvelope(text) {
  const raw = String(text ?? "");
  if (!raw.trim()) return { ok: false, error: "No agent output to read a CV payload from." };
  const openers = [...raw.matchAll(OPENER)];
  if (openers.length === 0) {
    return { ok: false, error: "The agent emitted no <<cv-json>> envelope, so there is no CV to render." };
  }
  if (openers.length > 1) {
    return { ok: false, error: `Found ${openers.length} <<cv-json>> envelopes; refusing to guess which is the real CV.` };
  }
  const start = openers[0].index + openers[0][0].length;
  const rest = raw.slice(start).replace(/^\r?\n/, "");
  const closer = rest.match(CLOSER);
  if (!closer || closer.index === undefined) {
    return { ok: false, error: "The <<cv-json>> envelope was never closed — the CV output is incomplete." };
  }
  const body = rest.slice(0, closer.index).trim();
  if (!body) return { ok: false, error: "The <<cv-json>> envelope was empty — no CV was tailored." };
  let payload;
  try {
    payload = JSON.parse(body);
  } catch (err) {
    return { ok: false, error: `The CV payload is not valid JSON: ${err.message}` };
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, error: "The CV payload must be a JSON object." };
  }
  if (!payload.name || !Array.isArray(payload.experience) || payload.experience.length === 0) {
    return { ok: false, error: "The CV payload is missing name or experience." };
  }
  return { ok: true, payload, warnings: [] };
}

export function createCvJsonEnvelopeFilter() {
  let raw = "";
  let pending = "";
  let carry = "";
  let inBody = false;

  return {
    push(chunk) {
      const text = String(chunk ?? "");
      raw += text;
      const withCarry = carry + text;
      carry = withCarry.endsWith("\r") ? "\r" : "";
      pending += (carry ? withCarry.slice(0, -1) : withCarry).replace(/\r\n/g, "\n");
      let display = "";
      for (;;) {
        if (!inBody) {
          const opener = completeMarker(OPENER, pending);
          if (opener) {
            display += pending.slice(0, opener.start);
            pending = pending.slice(opener.end);
            inBody = true;
            continue;
          }
          const tailStart = pending.lastIndexOf("\n") + 1;
          const cut = couldBecomeMarker(pending.slice(tailStart)) ? tailStart : pending.length;
          display += pending.slice(0, cut);
          pending = pending.slice(cut);
          return display;
        }
        const closer = completeMarker(CLOSER_ALL, pending);
        if (closer) {
          pending = pending.slice(closer.end);
          inBody = false;
          continue;
        }
        const tailStart = pending.lastIndexOf("\n") + 1;
        pending = pending.slice(tailStart);
        return display;
      }
    },
    flush() {
      const held = inBody ? "" : pending + carry;
      pending = "";
      carry = "";
      return held;
    },
    result() {
      return parseCvJsonEnvelope(raw);
    },
  };
}
