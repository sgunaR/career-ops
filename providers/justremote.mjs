// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

// JustRemote provider — public SSR page embeds window.__PRELOADED_STATE__
// with jobsState.entity.all. No auth API. Wire with provider: justremote.

import { BROWSER_LIKE_USER_AGENT } from './_http.mjs';

const LIST_URL = 'https://justremote.co/remote-developer-jobs';
const TRUSTED_HOST = 'justremote.co';
const ORIGIN = 'https://justremote.co';

/** @param {string} url */
function assertJustremoteUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`justremote: invalid URL: ${url}`);
  }
  if (parsed.protocol !== 'https:') throw new Error(`justremote: URL must use HTTPS: ${url}`);
  if (parsed.hostname !== TRUSTED_HOST && parsed.hostname !== `www.${TRUSTED_HOST}`) {
    throw new Error(`justremote: untrusted hostname "${parsed.hostname}" — must be ${TRUSTED_HOST}`);
  }
  return url;
}

/**
 * @param {string} href
 * @returns {string}
 */
function toAbsoluteJobUrl(href) {
  if (!href || typeof href !== 'string') return '';
  const cleaned = href.trim().replace(/\\u002F/g, '/');
  try {
    const abs = cleaned.startsWith('http') ? new URL(cleaned) : new URL(cleaned.replace(/^\//, ''), `${ORIGIN}/`);
    if (abs.protocol !== 'https:') return '';
    const host = abs.hostname.toLowerCase();
    if (host !== TRUSTED_HOST && host !== `www.${TRUSTED_HOST}`) return '';
    return abs.href;
  } catch {
    return '';
  }
}

/**
 * Parse JustRemote HTML (or a pre-extracted state object). Exported for tests.
 * @param {string|object} htmlOrState
 * @param {string} [defaultCompany]
 * @returns {Array<{title: string, url: string, company: string, location: string}>}
 */
export function parseJustremotePage(htmlOrState, defaultCompany = 'JustRemote') {
  /** @type {any} */
  let state = htmlOrState;
  if (typeof htmlOrState === 'string') {
    const m = htmlOrState.match(/window\.__PRELOADED_STATE__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/);
    if (!m) return [];
    try {
      state = JSON.parse(m[1]);
    } catch {
      return [];
    }
  }
  const rows = state?.jobsState?.entity?.all;
  if (!Array.isArray(rows)) return [];

  const fallback =
    typeof defaultCompany === 'string' && defaultCompany.trim() ? defaultCompany.trim() : 'JustRemote';
  /** @type {Array<{title: string, url: string, company: string, location: string}>} */
  const out = [];
  const seen = new Set();

  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    if (row.is_active === false) continue;
    const title = typeof row.title === 'string' ? row.title.trim() : '';
    if (!title) continue;
    const url = toAbsoluteJobUrl(typeof row.href === 'string' ? row.href : '');
    if (!url || seen.has(url)) continue;
    seen.add(url);

    const company =
      typeof row.company_name === 'string' && row.company_name.trim()
        ? row.company_name.trim()
        : fallback;

    const parts = [];
    if (typeof row.remote_type === 'string' && row.remote_type.trim()) parts.push(row.remote_type.trim());
    if (typeof row.job_country === 'string' && row.job_country.trim()) parts.push(row.job_country.trim());
    if (Array.isArray(row.location_restrictions) && row.location_restrictions.length) {
      parts.push(row.location_restrictions.filter((x) => typeof x === 'string').join(', '));
    }
    // Always mark remote so location_filter.allow with "Remote" keeps hits.
    if (!parts.some((p) => /remote/i.test(p))) parts.unshift('Remote');

    out.push({
      title,
      url,
      company,
      location: parts.filter(Boolean).join(' · ') || 'Remote',
    });
  }
  return out;
}

/** @type {Provider} */
export default {
  id: 'justremote',

  detect(entry) {
    return entry?.provider === 'justremote' ? { url: LIST_URL } : null;
  },

  /**
   * @param {{ name?: string }} entry
   * @param {{ fetchText: (url: string, opts?: object) => Promise<string> }} ctx
   */
  async fetch(entry, ctx) {
    const listUrl = assertJustremoteUrl(LIST_URL);
    const html = await ctx.fetchText(listUrl, {
      redirect: 'error',
      headers: {
        'user-agent': BROWSER_LIKE_USER_AGENT,
        accept: 'text/html,application/xhtml+xml',
      },
    });
    return parseJustremotePage(html, entry?.name || 'JustRemote');
  },
};
