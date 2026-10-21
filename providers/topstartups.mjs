// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

// Top Startups (topstartups.io) — funded-startup job board.
// Public SSR HTML with jquery-infinite pages (?page=N). No official free JSON API.
// Default filter: Remote + software roles. Apply URLs point at company ATS (Greenhouse/…).
//
// Wire: provider: topstartups  (optional careers_url https://topstartups.io/…)

import { BROWSER_LIKE_USER_AGENT } from './_http.mjs';

const ORIGIN = 'https://topstartups.io';
const TRUSTED_HOST = 'topstartups.io';
const LIST_PATH = '/jobs/';
const DEFAULT_LOCATION = 'Remote';
const DEFAULT_ROLE = 'Software Engineer';
const DEFAULT_MAX_PAGES = 3;

/** @param {string} url */
function assertTopstartupsUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`topstartups: invalid URL: ${url}`);
  }
  if (parsed.protocol !== 'https:') throw new Error(`topstartups: URL must use HTTPS: ${url}`);
  if (parsed.hostname !== TRUSTED_HOST && parsed.hostname !== `www.${TRUSTED_HOST}`) {
    throw new Error(`topstartups: untrusted hostname "${parsed.hostname}" — must be ${TRUSTED_HOST}`);
  }
  return url;
}

/**
 * Apply / ATS links are off-host (Greenhouse, Ashby, company careers).
 * Accept https only; reject javascript:/data:/etc.
 * @param {string} href
 * @returns {string}
 */
function cleanApplyUrl(href) {
  if (!href || typeof href !== 'string') return '';
  const cleaned = href.trim().replace(/^["']|["']$/g, '');
  try {
    const abs = cleaned.startsWith('http') ? new URL(cleaned) : new URL(cleaned, ORIGIN);
    if (abs.protocol !== 'https:') return '';
    return abs.href;
  } catch {
    return '';
  }
}

/** @param {unknown} entry */
function resolveMaxPages(entry) {
  const n = entry && typeof entry === 'object' ? /** @type {{ max_pages?: unknown }} */ (entry).max_pages : undefined;
  if (typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 20) return n;
  return DEFAULT_MAX_PAGES;
}

/** @param {unknown} entry */
function resolveLocation(entry) {
  if (entry && typeof entry === 'object') {
    const loc = /** @type {{ job_location?: unknown }} */ (entry).job_location;
    if (typeof loc === 'string' && loc.trim()) return loc.trim();
  }
  return DEFAULT_LOCATION;
}

/**
 * @param {unknown} entry
 * @returns {string[]}
 */
function resolveRoles(entry) {
  if (!entry || typeof entry !== 'object') return [DEFAULT_ROLE];
  const e = /** @type {{ role?: unknown, roles?: unknown, keywords?: unknown }} */ (entry);
  if (typeof e.role === 'string' && e.role.trim()) return [e.role.trim()];
  if (Array.isArray(e.roles)) {
    const roles = e.roles.filter((r) => typeof r === 'string' && r.trim()).map((r) => String(r).trim());
    if (roles.length) return roles;
  }
  if (Array.isArray(e.keywords)) {
    const roles = e.keywords.filter((r) => typeof r === 'string' && r.trim()).map((r) => String(r).trim());
    if (roles.length) return roles;
  }
  return [DEFAULT_ROLE];
}

/**
 * Rough postedAt from "Posted: 3 days ago" / "1 day ago" / "today".
 * @param {string} text
 * @param {number} [nowMs]
 * @returns {number|undefined}
 */
export function parseRelativePostedAt(text, nowMs = Date.now()) {
  if (!text || typeof text !== 'string') return undefined;
  const s = text.trim().toLowerCase();
  if (/^(just now|today|a moment)/.test(s)) return nowMs;
  const m = s.match(/^(\d+)\s+(minute|hour|day|week|month)s?\s+ago/);
  if (!m) return undefined;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 0) return undefined;
  const unit = m[2];
  const mult =
    unit === 'minute'
      ? 60_000
      : unit === 'hour'
        ? 3_600_000
        : unit === 'day'
          ? 86_400_000
          : unit === 'week'
            ? 7 * 86_400_000
            : 30 * 86_400_000;
  return nowMs - n * mult;
}

function decodeBasicEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/**
 * Parse one Top Startups jobs HTML page into normalized jobs.
 * Exported for unit tests.
 * @param {string} html
 * @param {string} [fallbackCompany]
 * @returns {Array<{title: string, url: string, company: string, location: string, postedAt?: number}>}
 */
export function parseTopstartupsPage(html, fallbackCompany = 'Top Startups') {
  if (!html || typeof html !== 'string') return [];
  const blocks = html.split(/class="col-12 infinite-item"/i).slice(1);
  /** @type {Array<{title: string, url: string, company: string, location: string, postedAt?: number}>} */
  const out = [];
  const seen = new Set();
  const fallback =
    typeof fallbackCompany === 'string' && fallbackCompany.trim() ? fallbackCompany.trim() : 'Top Startups';

  for (const block of blocks) {
    const company = decodeBasicEntities(
      block.match(/id="startup-website-link"><h7[^>]*>([^<]+)<\/h7>/i)?.[1]?.trim() || fallback,
    );

    let title = decodeBasicEntities(
      block
        .match(/id="job-title">([\s\S]*?)<\/h5>/i)?.[1]
        ?.replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim() || '',
    );
    title = title.replace(/\s*New\s*$/i, '').trim();
    if (!title) continue;

    const applyRaw =
      block.match(/id="apply-button"[^>]*\bhref\s*=\s*([^\s>]+)/i)?.[1] ||
      block.match(/id="job-title"[\s\S]*?\bhref\s*=\s*["']?\s*([^\s"'>]+)/i)?.[1] ||
      '';
    const url = cleanApplyUrl(applyRaw);
    if (!url || seen.has(url)) continue;
    seen.add(url);

    let location =
      block.match(/fa-map-marker-alt"><\/i>\s*([^<]+)/i)?.[1]?.trim() ||
      block
        .match(/fa-map-marker-alt"><\/i>\s*([\s\S]*?)<\/h7>/i)?.[1]
        ?.replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim() ||
      '';
    if (location && !/remote/i.test(location)) location = `${location}, Remote`;
    if (!location) location = 'Remote';

    const postedText = block.match(/Posted:\s*([^<\n]+)/i)?.[1]?.trim() || '';
    /** @type {{ title: string, url: string, company: string, location: string, postedAt?: number }} */
    const job = { title, url, company, location };
    const postedAt = parseRelativePostedAt(postedText);
    if (postedAt !== undefined) job.postedAt = postedAt;
    out.push(job);
  }
  return out;
}

/**
 * @param {string} jobLocation
 * @param {string} role
 * @param {number} page 1-based
 */
function buildListUrl(jobLocation, role, page) {
  const u = new URL(LIST_PATH, ORIGIN);
  u.searchParams.set('job_location', jobLocation);
  if (role) u.searchParams.set('role', role);
  if (page > 1) u.searchParams.set('page', String(page));
  return assertTopstartupsUrl(u.href);
}

/** @type {Provider} */
export default {
  id: 'topstartups',

  detect(entry) {
    if (entry?.provider === 'topstartups') {
      return { url: `${ORIGIN}${LIST_PATH}?job_location=${encodeURIComponent(DEFAULT_LOCATION)}` };
    }
    for (const candidate of [entry?.careers_url, entry?.api]) {
      if (typeof candidate !== 'string' || !candidate) continue;
      try {
        const parsed = new URL(candidate);
        if (
          parsed.protocol === 'https:' &&
          (parsed.hostname === TRUSTED_HOST || parsed.hostname === `www.${TRUSTED_HOST}`)
        ) {
          return { url: candidate };
        }
      } catch {
        // not a URL
      }
    }
    return null;
  },

  /**
   * @param {{ name?: string, max_pages?: number, job_location?: string, role?: string, roles?: string[], keywords?: string[] }} entry
   * @param {{ fetchText: (url: string, opts?: object) => Promise<string> }} ctx
   */
  async fetch(entry, ctx) {
    const maxPages = resolveMaxPages(entry);
    const jobLocation = resolveLocation(entry);
    const roles = resolveRoles(entry);
    const fallbackCompany = entry?.name;
    /** @type {Array<{title: string, url: string, company: string, location: string, postedAt?: number}>} */
    const out = [];
    const seen = new Set();

    for (const role of roles) {
      for (let page = 1; page <= maxPages; page++) {
        const listUrl = buildListUrl(jobLocation, role, page);
        const html = await ctx.fetchText(listUrl, {
          redirect: 'error',
          headers: { 'User-Agent': BROWSER_LIKE_USER_AGENT, Accept: 'text/html' },
        });
        const batch = parseTopstartupsPage(html, fallbackCompany);
        if (batch.length === 0) break;
        let added = 0;
        for (const job of batch) {
          if (seen.has(job.url)) continue;
          seen.add(job.url);
          out.push(job);
          added += 1;
        }
        // Short / empty page → stop this role.
        if (added === 0 || batch.length < 8) break;
      }
    }
    return out;
  },
};
