import { BaseScraper } from '../scraper-base.mjs';
import { sleep } from '../browser.mjs';

/**
 * Cutshort. The site's own search box goes to
 *   /search-jobs?free_text=<what you typed>       e.g. "full stack developer jobs in Pune"
 * (server-rendered, top 10 results per query, no paging). The old /jobs?search=… URL is only
 * a directory of job categories and never shows search results. Blank cutshort_location =
 * all of India; a city is added to the query the way the site's own example does
 * ("Android jobs in Pune").
 */
class CutshortScraper extends BaseScraper {
  name = 'cutshort';
  baseUrl = 'https://cutshort.io';

  /** @param {{ location?: string }} [opts] */
  constructor(opts = {}) {
    super();
    this.location = String(opts.location || '').trim();
  }

  getJobListSelector() {
    return 'a[href*="/job/"]';
  }

  buildSearchUrl(keywords) {
    let text = keywords.join(' ');
    if (this.location && !/^(india|all)$/i.test(this.location)) text += ` jobs in ${this.location}`;
    // hiringActivityOnJob=1-days matches Cutshort's "1 day" hiring-activity filter.
    return `${this.baseUrl}/search-jobs?free_text=${encodeURIComponent(text)}&hiringActivityOnJob=1-days`;
  }

  async isLoggedIn(page) {
    const sels = ['a[href*="/profile"]', '[class*="Avatar"]', 'button[aria-label*="profile" i]'];
    for (const sel of sels) {
      if (await page.$(sel)) return true;
    }
    return false;
  }

  async scrapeSearch(page, options) {
    const jobs = [];
    const errors = [];
    try {
      const searchUrl = this.buildSearchUrl(options.keywords);
      console.log(`[${this.name}] ${searchUrl}`);
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      try {
        await page.waitForSelector(this.getJobListSelector(), { timeout: 20_000 });
      } catch {
        console.log(`[${this.name}] no listings`);
        return { jobs, errors };
      }
      await sleep(1500);

      const cards = await page.evaluate(() => {
        const out = [];
        const seen = new Set();
        for (const a of document.querySelectorAll('a[href*="/job/"]')) {
          const url = a.href.split('?')[0];
          if (seen.has(url)) continue;
          seen.add(url);
          let card = a;
          for (let i = 0; i < 8 && card.parentElement; i++) {
            card = card.parentElement;
            if ((card.innerText || '').includes('Apply now')) break;
          }
          // The place / work mode sits just outside that header block: widen while the parent
          // still holds only this one job.
          while (card.parentElement && card.parentElement.querySelectorAll('a[href*="/job/"]').length && new Set([...card.parentElement.querySelectorAll('a[href*="/job/"]')].map((x) => x.href.split('?')[0])).size === 1) {
            card = card.parentElement;
          }
          const title = a.innerText.replace(/\s+/g, ' ').trim();
          const anchors = [...card.querySelectorAll('a')].map((x) => x.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean);
          const company = anchors.find((t) => t !== title) || '';
          // The line right after "Apply now" is the work mode / place ("Remote only", "Mumbai").
          const lines = (card.innerText || '').split('\n').map((l) => l.trim()).filter(Boolean);
          const at = lines.findIndex((l) => /^apply now$/i.test(l));
          const next = at >= 0 ? lines[at + 1] || '' : '';
          const location = /yrs|lpa|₹|\d/.test(next) ? '' : next;
          if (title) out.push({ url, title, company, location });
        }
        return out;
      });

      console.log(`[${this.name}] ${cards.length} cards`);
      for (const c of cards) jobs.push({ source: this.name, ...c });
    } catch (err) {
      errors.push(err.message);
    }
    return { jobs, errors };
  }

  async parseJobCard() {
    return {};
  }
}

export function createCutshortScraper(config = {}) {
  return new CutshortScraper({ location: config.cutshort_location });
}

export const cutshortScraper = createCutshortScraper();
