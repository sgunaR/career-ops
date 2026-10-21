// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

// Hubstaff Talent provider — public search HTML at talent.hubstaff.com.
// Marketplace-heavy (freelance); title_filter still gates. Wire: hubstaff-talent.

import { BROWSER_LIKE_USER_AGENT } from './_http.mjs';

const SEARCH_BASE = 'https://talent.hubstaff.com/search/jobs';
const TRUSTED_HOST = 'talent.hubstaff.com';
const ORIGIN = 'https://talent.hubstaff.com';

const DEFAULT_KEYWORDS = [
  'software engineer',
  'full stack',
  'backend',
  'ai engineer',
  'sap',
];

/** @param {string} url */
function assertHubstaffUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`hubstaff-talent: invalid URL: ${url}`);
  }
  if (parsed.protocol !== 'https:') {
    throw new Error(`hubstaff-talent: URL must use HTTPS: ${url}`);
  }
  if (parsed.hostname !== TRUSTED_HOST) {
    throw new Error(
      `hubstaff-talent: untrusted hostname "${parsed.hostname}" — must be ${TRUSTED_HOST}`,
    );
  }
  return url;
}

/**
 * @param {string} slug
 * @returns {string}
 */
export function titleFromHubstaffSlug(slug) {
  const s = String(slug || '')
    .replace(/^\/?jobs\//, '')
    .replace(/\/$/, '');
  if (!s) return '';
  return s
    .split('-')
    .filter(Boolean)
    .map((w) => (w.length <= 2 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

/**
 * Parse Hubstaff Talent search HTML for /jobs/{slug} cards.
 * @param {string} html
 * @param {string} [defaultCompany]
 * @returns {Array<{title: string, url: string, company: string, location: string}>}
 */
export function parseHubstaffTalentHtml(html, defaultCompany = 'Hubstaff Talent') {
  if (typeof html !== 'string') return [];
  const fallback =
    typeof defaultCompany === 'string' && defaultCompany.trim()
      ? defaultCompany.trim()
      : 'Hubstaff Talent';

  /** @type {Map<string, {title: string, url: string, company: string, location: string}>} */
  const byUrl = new Map();

  // Prefer anchor text when present.
  const anchorRe =
    /href="(\/jobs\/[a-z0-9][a-z0-9\-]{5,})"([^>]*)>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = anchorRe.exec(html))) {
    const path = m[1];
    if (path === '/jobs/new') continue;
    const url = `${ORIGIN}${path}`;
    const inner = m[3]
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
    const title = inner || titleFromHubstaffSlug(path);
    if (!title) continue;
    if (!byUrl.has(url)) {
      byUrl.set(url, { title, url, company: fallback, location: 'Remote' });
    }
  }

  // Fallback: bare hrefs without useful anchor text.
  const hrefRe = /href="(\/jobs\/[a-z0-9][a-z0-9\-]{5,})"/gi;
  while ((m = hrefRe.exec(html))) {
    const path = m[1];
    if (path === '/jobs/new') continue;
    const url = `${ORIGIN}${path}`;
    if (byUrl.has(url)) continue;
    const title = titleFromHubstaffSlug(path);
    if (!title) continue;
    byUrl.set(url, { title, url, company: fallback, location: 'Remote' });
  }

  return [...byUrl.values()];
}

/** @type {Provider} */
export default {
  id: 'hubstaff-talent',

  detect(entry) {
    return entry?.provider === 'hubstaff-talent' ? { url: SEARCH_BASE } : null;
  },

  /**
   * @param {{ name?: string, keywords?: string[] }} entry
   * @param {{ fetchText: (url: string, opts?: object) => Promise<string> }} ctx
   */
  async fetch(entry, ctx) {
    const keywords =
      Array.isArray(entry?.keywords) && entry.keywords.length
        ? entry.keywords.map(String)
        : DEFAULT_KEYWORDS;

    /** @type {Map<string, {title: string, url: string, company: string, location: string}>} */
    const byUrl = new Map();
    /** @type {Error | null} */
    let lastErr = null;

    for (const kw of keywords) {
      const u = new URL(SEARCH_BASE);
      u.searchParams.set('search[keywords]', kw);
      u.searchParams.set('search[type]', 'all');
      const url = assertHubstaffUrl(u.href);
      try {
        const html = await ctx.fetchText(url, {
          redirect: 'follow',
          headers: {
            'user-agent': BROWSER_LIKE_USER_AGENT,
            accept: 'text/html,application/xhtml+xml',
          },
        });
        for (const job of parseHubstaffTalentHtml(html, entry?.name || 'Hubstaff Talent')) {
          byUrl.set(job.url, job);
        }
      } catch (err) {
        lastErr = err instanceof Error ? err : new Error(String(err));
      }
    }

    const jobs = [...byUrl.values()];
    if (jobs.length === 0 && lastErr) throw lastErr;
    return jobs;
  },
};
