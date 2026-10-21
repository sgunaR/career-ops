// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

// Remote.co provider — Next.js pages embed __NEXT_DATA__ with job cards.
// Site is occasionally Cloudflare/WAF gated (403). Wire with provider: remoteco.

import { BROWSER_LIKE_USER_AGENT } from './_http.mjs';

const CATEGORY_URLS = [
  'https://remote.co/remote-jobs/developer/',
  'https://remote.co/remote-jobs/programming/',
  'https://remote.co/remote-jobs/software-development/',
];
const TRUSTED_HOST = 'remote.co';
const ORIGIN = 'https://remote.co';

/** @param {string} url */
function assertRemotecoUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`remoteco: invalid URL: ${url}`);
  }
  if (parsed.protocol !== 'https:') throw new Error(`remoteco: URL must use HTTPS: ${url}`);
  if (parsed.hostname !== TRUSTED_HOST && parsed.hostname !== `www.${TRUSTED_HOST}`) {
    throw new Error(`remoteco: untrusted hostname "${parsed.hostname}" — must be ${TRUSTED_HOST}`);
  }
  return url;
}

/**
 * @param {string} raw
 * @returns {string}
 */
function cleanRemotecoUrl(raw) {
  if (!raw || typeof raw !== 'string') return '';
  try {
    const abs = raw.startsWith('http') ? new URL(raw) : new URL(raw.replace(/^\//, ''), `${ORIGIN}/`);
    if (abs.protocol !== 'https:') return '';
    const host = abs.hostname.toLowerCase();
    if (host !== TRUSTED_HOST && host !== `www.${TRUSTED_HOST}`) return '';
    return abs.href;
  } catch {
    return '';
  }
}

/**
 * Walk __NEXT_DATA__ / pageProps for job-like objects.
 * @param {any} root
 * @param {string} defaultCompany
 * @returns {Array<{title: string, url: string, company: string, location: string}>}
 */
export function parseRemotecoNextData(root, defaultCompany = 'Remote.co') {
  const fallback =
    typeof defaultCompany === 'string' && defaultCompany.trim() ? defaultCompany.trim() : 'Remote.co';
  /** @type {Array<{title: string, url: string, company: string, location: string}>} */
  const out = [];
  const seen = new Set();

  /** @param {any} node */
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }

    const title =
      (typeof node.title === 'string' && node.title.trim()) ||
      (typeof node.jobTitle === 'string' && node.jobTitle.trim()) ||
      (typeof node.job_title === 'string' && node.job_title.trim()) ||
      '';

    let url =
      cleanRemotecoUrl(node.url) ||
      cleanRemotecoUrl(node.jobUrl) ||
      cleanRemotecoUrl(node.job_url) ||
      cleanRemotecoUrl(node.seoUrl) ||
      cleanRemotecoUrl(node.canonicalUrl) ||
      '';

    const id = node.jobId || node.job_id || node.id;
    const slug = typeof node.slug === 'string' ? node.slug.trim() : '';
    if (!url && id != null && String(id).match(/^\d+$/)) {
      url = slug
        ? cleanRemotecoUrl(`/job/${id}/${slug}/`)
        : cleanRemotecoUrl(`/job/${id}/`);
    }

    if (title && url && !seen.has(url)) {
      // Prefer objects that look like job cards (avoid nav/filter noise).
      const companyRaw =
        node.companyName ||
        node.company_name ||
        node.company ||
        node.employerName ||
        (typeof node.company === 'object' ? node.company?.name : '');
      const company =
        typeof companyRaw === 'string' && companyRaw.trim() ? companyRaw.trim() : fallback;
      const locationRaw =
        node.location ||
        node.jobLocation ||
        node.remoteWorkLevel ||
        node.workLevel ||
        'Remote';
      const location =
        typeof locationRaw === 'string' && locationRaw.trim()
          ? locationRaw.trim()
          : 'Remote';
      // Require a company-ish field OR a /job/ URL so facet blobs don't leak in.
      if (/\/job\//i.test(url) || company !== fallback || node.companyName || node.company_name) {
        seen.add(url);
        out.push({
          title,
          url,
          company,
          location: /remote/i.test(location) ? location : `Remote · ${location}`,
        });
      }
    }

    for (const v of Object.values(node)) walk(v);
  };

  walk(root);
  return out;
}

/**
 * @param {string} html
 * @param {string} [defaultCompany]
 */
export function parseRemotecoHtml(html, defaultCompany = 'Remote.co') {
  if (typeof html !== 'string') return [];
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) return [];
  try {
    const data = JSON.parse(m[1]);
    return parseRemotecoNextData(data?.props?.pageProps ?? data, defaultCompany);
  } catch {
    return [];
  }
}

/** @type {Provider} */
export default {
  id: 'remoteco',

  detect(entry) {
    return entry?.provider === 'remoteco' ? { url: CATEGORY_URLS[0] } : null;
  },

  /**
   * @param {{ name?: string, category_urls?: string[] }} entry
   * @param {{ fetchText: (url: string, opts?: object) => Promise<string> }} ctx
   */
  async fetch(entry, ctx) {
    const urls = Array.isArray(entry?.category_urls) && entry.category_urls.length
      ? entry.category_urls
      : CATEGORY_URLS;

    /** @type {Array<{title: string, url: string, company: string, location: string}>} */
    const all = [];
    const seen = new Set();
    /** @type {Error | null} */
    let lastErr = null;

    for (const rawUrl of urls) {
      const url = assertRemotecoUrl(String(rawUrl));
      try {
        const html = await ctx.fetchText(url, {
          redirect: 'error',
          headers: {
            'user-agent': BROWSER_LIKE_USER_AGENT,
            accept: 'text/html,application/xhtml+xml',
          },
        });
        for (const job of parseRemotecoHtml(html, entry?.name || 'Remote.co')) {
          if (seen.has(job.url)) continue;
          seen.add(job.url);
          all.push(job);
        }
      } catch (err) {
        lastErr = err instanceof Error ? err : new Error(String(err));
      }
    }

    if (all.length === 0 && lastErr) throw lastErr;
    return all;
  },
};
