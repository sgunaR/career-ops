import { BaseScraper } from '../scraper-base.mjs';
import { sleep, jitteredDelay } from '../browser.mjs';

/**
 * Instahyre — often Cloudflare-gated; works best after --login instahyre (persistent session).
 * The search page ignores `?q=` (it just lists all 13,000 jobs). What its own search box
 * produces is `?skills=<text>&search=true&offset=<n>[&location=<city>]`, so we use that.
 * Cities offered by the site: Bangalore, Gurgaon, Hyderabad, Work From Home (blank = all India).
 */
class InstahyreScraper extends BaseScraper {
  name = 'instahyre';
  baseUrl = 'https://www.instahyre.com';

  /** @param {{ location?: string }} [opts] */
  constructor(opts = {}) {
    super();
    this.location = String(opts.location || '').trim();
  }

  getJobListSelector() {
    return [
      'a[href*="/job-"]',
      '.opportunity-card',
      '.job-card',
      '[class*="OpportunityCard"]',
      '[class*="job-listing"]',
      '.search-result',
    ].join(', ');
  }

  buildSearchUrl(keywords, pageNum) {
    const q = new URLSearchParams({
      skills: keywords.join(' '),
      search: 'true',
      job_type: '0',
      company_size: '0',
      isLandingPage: 'true',
      offset: String((pageNum - 1) * 20),
    });
    if (this.location) q.set('location', this.location);
    return `${this.baseUrl}/search-jobs?${q}`;
  }

  async isLoggedIn(page) {
    const sels = [
      'a[href*="/candidate/"]',
      'a[href*="opportunities"]',
      '[class*="user-menu"]',
      '[class*="UserMenu"]',
      'img.avatar',
    ];
    for (const sel of sels) {
      if (await page.$(sel)) return true;
    }
    return false;
  }

  /** Job cards on the current page: real title / company / location, not the whole card text. */
  async readCards(page) {
    return page.evaluate(() => {
      const out = [];
      const seen = new Set();
      for (const link of document.querySelectorAll('a[href*="/job-"]')) {
        const href = link.href.split('?')[0];
        if (seen.has(href)) continue;
        seen.add(href);
        const card = link.closest('.container') || link.parentElement;
        const txt = (sel) => card.querySelector(sel)?.innerText.replace(/\s+/g, ' ').trim() || '';
        const company = txt('.employer-company-name');
        let title = txt('h2.company-name') || txt('.employer-job-name');
        if (company && title.startsWith(`${company} - `)) title = title.slice(company.length + 3);
        if (!title) continue;
        out.push({
          url: href,
          title,
          company,
          location: txt('.employer-locations').replace(/^Job available in\s*/i, ''),
        });
      }
      return out;
    });
  }

  async scrapeSearch(page, options) {
    const jobs = [];
    const errors = [];
    const seen = new Set();

    try {
      const searchUrl = this.buildSearchUrl(options.keywords, 1);
      console.log(`[${this.name}] ${searchUrl}`);
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await sleep(3500);

      const title = (await page.title()) || '';
      if (/just a moment|cloudflare|attention required|access denied/i.test(title)) {
        errors.push('Instahyre blocked (Cloudflare) — run --login instahyre in headed mode, then retry');
        return { jobs, errors };
      }

      // `offset=` in the URL is ignored on load: further pages come from the "Next »" button.
      for (let pageNum = 1; pageNum <= options.maxPages; pageNum++) {
        try {
          await page.waitForSelector('a[href*="/job-"]', { timeout: 15_000 });
        } catch {
          console.log(`[${this.name}] no listings on page ${pageNum}`);
          break;
        }
        const cards = await this.readCards(page);
        console.log(`[${this.name}] page ${pageNum}: ${cards.length} cards`);
        for (const c of cards) {
          if (seen.has(c.url)) continue;
          seen.add(c.url);
          jobs.push({ source: this.name, ...c });
        }
        if (pageNum === options.maxPages) break;

        const firstBefore = cards[0]?.url;
        // The pager is a plain <li ng-click="nextPage()">, hidden (class "hidden") on the last page.
        const next = page.locator('li[ng-click="nextPage()"]:not(.hidden)').first();
        if (!(await next.count())) break;
        await next.scrollIntoViewIfNeeded().catch(() => {});
        await next.click().catch(() => {});
        try {
          await page.waitForFunction(
            (prev) => document.querySelector('a[href*="/job-"]')?.href.split('?')[0] !== prev,
            firstBefore,
            { timeout: 12_000 },
          );
        } catch {
          break; // last page (Next did nothing)
        }
        const delay = jitteredDelay(options.requestDelayMs ?? 2500);
        if (delay) await sleep(delay);
      }
    } catch (err) {
      errors.push(err.message);
    }

    return { jobs, errors };
  }

  async parseJobCard() {
    return {};
  }
}

export function createInstahyreScraper(config = {}) {
  return new InstahyreScraper({ location: config.instahyre_location });
}

export const instahyreScraper = createInstahyreScraper();
