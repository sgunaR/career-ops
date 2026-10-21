/**
 * Parse the relative "posted X ago" text every India board shows on its cards
 * ("5 days ago", "Posted 1 day ago", "3d ago", "1 month ago", "Just now",
 * "Today") into an epoch-ms postedAt, so the shared posting-age filter
 * (portals.yml max_posting_age_hours / priority_posting_age_hours) can act on
 * India boards the same way it acts on the outside-India feeds.
 *
 * Deliberately approximate — a card only ever gives whole units, never a
 * timestamp — so "1 month ago" and "9 months ago" both fall well outside any
 * realistic freshness window and just need to sort as "old", not be exact.
 *
 * @param {string} text
 * @param {number} [now]
 * @returns {number|undefined} epoch ms, or undefined if the text didn't match.
 */
export function parseRelativeAge(text, now = Date.now()) {
  const t = String(text || '').trim().toLowerCase();
  if (!t) return undefined;
  if (/^(just now|today|just posted)$/.test(t)) return now;
  const m = t.match(/(\d+)\s*(min|minute|h|hour|d|day|w|week|mo|month|y|year)s?\s*(ago)?/);
  if (!m) return undefined;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return undefined;
  const unitMs = {
    min: 60_000, minute: 60_000,
    h: 3_600_000, hour: 3_600_000,
    d: 86_400_000, day: 86_400_000,
    w: 7 * 86_400_000, week: 7 * 86_400_000,
    mo: 30 * 86_400_000, month: 30 * 86_400_000,
    y: 365 * 86_400_000, year: 365 * 86_400_000,
  }[m[2]];
  return unitMs ? now - n * unitMs : undefined;
}
