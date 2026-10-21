import { BaseScraper } from '../scraper-base.mjs';
import { jitteredDelay, sleep } from '../browser.mjs';

/**
 * LinkedIn. The logged-in /jobs/search page is now a React app with obfuscated class names and
 * no job links in the result list, and it silently replaces a `location=` text with the
 * member's own home area (a Hyderabad member got "Greater Hyderabad Area" whatever we asked).
 * So this reads LinkedIn's public listing endpoint instead (the same one the logged-out job
 * pages use): plain HTML cards with the real job link, location and posted date, and a
 * `geoId` that is honoured exactly. The browser session is still used, so a login/bot wall
 * shows up the same way it does for every other board.
 */

// LinkedIn geoIds (verified). Any other place (a city, "Singapore", "European Union") uses the
// free-text `location=` parameter, which the listing endpoint honours too. There is no
// "worldwide" search: LinkedIn turns it back into the member's own country, so name the
// places you want in `linkedin_locations` instead.
const GEO = { india: '102713980' };

// A "page" of the scan config is 30 jobs; LinkedIn hands out 10 per request.
const REQUESTS_PER_PAGE = 3;

const norm = (s) => String(s || '').trim().toLowerCase();

export class LinkedInScraper extends BaseScraper {
  name = 'linkedin';
  baseUrl = 'https://www.linkedin.com';

  /** @param {{ locations?: string[], remoteOnly?: boolean, days?: number }} [opts] */
  constructor(opts = {}) {
    super();
    this.locations = opts.locations?.length ? opts.locations : ['India'];
    this.remoteOnly = Boolean(opts.remoteOnly);
    // Default 1 day → f_TPR=r86400 ("Past 24 hours" on LinkedIn's Date Posted filter).
    this.days = Number(opts.days) > 0 ? Number(opts.days) : 1;
  }

  getJobListSelector() {
    return '.base-search-card';
  }

  /** One request = 10 cards. */
  guestUrl(keywords, location, pageNum) {
    const key = norm(location);
    const geo = GEO[key];
    const q = new URLSearchParams({ keywords: keywords.join(' '), start: String((pageNum - 1) * 10), sortBy: 'DD' });
    if (geo) q.set('geoId', geo);
    else q.set('location', location);
    q.set('f_TPR', `r${this.days * 86400}`);
    if (this.remoteOnly) q.set('f_WT', '2');
    return `${this.baseUrl}/jobs-guest/jobs/api/seeMoreJobPostings/search?${q}`;
  }

  buildSearchUrl(keywords, pageNum) {
    return this.guestUrl(keywords, this.locations[0], pageNum);
  }

  async isLoggedIn(page) {
    // The listing endpoint works logged out; report the member state for the health panel only.
    try {
      return await page.evaluate(() => Boolean(document.cookie.includes('li_at') || document.querySelector('.global-nav__me')));
    } catch {
      return false;
    }
  }

  async scrapeSearch(page, options) {
    const jobs = [];
    const errors = [];
    const seen = new Set();

    for (const location of this.locations) {
      for (let pageNum = 1; pageNum <= options.maxPages * REQUESTS_PER_PAGE; pageNum++) {
        try {
          const url = this.guestUrl(options.keywords, location, pageNum);
          console.log(`[${this.name}] ${location} page ${pageNum}: ${url}`);
          const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
          if (res && res.status() === 429) {
            errors.push(`LinkedIn rate-limited (429) for "${location}" — try again later`);
            break;
          }
          await sleep(1200);

          const cards = await page.evaluate(() =>
            [...document.querySelectorAll('.base-search-card')].map((c) => ({
              title: c.querySelector('.base-search-card__title')?.textContent?.trim(),
              company: c.querySelector('.base-search-card__subtitle')?.textContent?.trim(),
              location: c.querySelector('.job-search-card__location')?.textContent?.trim(),
              url: c.querySelector('a.base-card__full-link')?.href?.split('?')[0],
              // Date-only (no time-of-day), e.g. "2026-09-26" — exact, unlike the "X ago" text.
              postedAtIso: c.querySelector('time')?.getAttribute('datetime'),
            })),
          );
          console.log(`[${this.name}] ${cards.length} cards`);
          if (cards.length < 10) break; // last page of results

          for (const c of cards) {
            if (!c.url || !c.title || seen.has(c.url)) continue;
            seen.add(c.url);
            const postedAt = c.postedAtIso ? Date.parse(c.postedAtIso) : NaN;
            jobs.push({ source: this.name, url: c.url, title: c.title, company: c.company, location: c.location, postedAt: Number.isFinite(postedAt) ? postedAt : undefined });
          }
        } catch (err) {
          errors.push(`${location} page ${pageNum}: ${err.message}`);
          break;
        }
        const delay = jitteredDelay(options.requestDelayMs ?? 2500);
        if (delay) await sleep(delay);
      }
    }

    return { jobs, errors };
  }

  // Cards are read in bulk by scrapeSearch; kept for the base-class contract.
  async parseJobCard() {
    return {};
  }
}

export function createLinkedInScraper(config) {
  const raw = config.linkedin_locations ?? config.linkedin_location ?? 'India';
  const locations = (Array.isArray(raw) ? raw : [raw]).map((x) => String(x).trim()).filter(Boolean);
  return new LinkedInScraper({
    locations,
    remoteOnly: config.linkedin_remote_only,
    days: config.linkedin_days,
  });
}
