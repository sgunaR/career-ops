import { jitteredDelay, sleep } from './browser.mjs';
import { parseRelativeAge } from './dates.mjs';

/**
 * Minimal scraper base — adapted from job-hunt-ai BaseScraper (search mode only).
 */
export class BaseScraper {
  /** @type {string} */
  name;
  /** @type {string} */
  baseUrl;

  /** @returns {string} */
  getJobListSelector() {
    throw new Error('not implemented');
  }

  /** @param {string[]} _keywords @param {number} _pageNum @returns {string} */
  buildSearchUrl(_keywords, _pageNum) {
    throw new Error('not implemented');
  }

  /** @param {import('playwright').Page} _page @param {number} _index */
  async parseJobCard(_page, _index) {
    throw new Error('not implemented');
  }

  /** @param {import('playwright').Page} page */
  async isLoggedIn(page) {
    return false;
  }

  /**
   * @param {import('playwright').Page} page
   * @param {{ keywords: string[], maxPages: number, requestDelayMs?: number }} options
   */
  async scrapeSearch(page, options) {
    /** @type {Array<{ source: string, url: string, title: string, company?: string, location?: string, salary?: string }>} */
    const jobs = [];
    const errors = [];

    for (let pageNum = 1; pageNum <= options.maxPages; pageNum++) {
      try {
        const searchUrl = this.buildSearchUrl(options.keywords, pageNum);
        console.log(`[${this.name}] page ${pageNum}: ${searchUrl}`);
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
        await sleep(2000);

        try {
          await page.waitForSelector(this.getJobListSelector(), { timeout: 15_000 });
        } catch {
          console.log(`[${this.name}] no listings on page ${pageNum}`);
          break;
        }

        const cards = await page.$$(this.getJobListSelector());
        console.log(`[${this.name}] ${cards.length} cards`);

        for (let i = 0; i < cards.length; i++) {
          try {
            const jobData = await this.parseJobCard(page, i);
            if (jobData.url && jobData.title) {
              jobs.push({
                source: this.name,
                url: jobData.url.startsWith('http') ? jobData.url : `${this.baseUrl}${jobData.url}`,
                title: jobData.title,
                company: jobData.company,
                location: jobData.location,
                salary: jobData.salary,
                // A scraper may hand back an already-resolved postedAt (epoch ms), or the raw
                // "5 days ago" text off the card, converted here so every BaseScraper subclass
                // gets it for free.
                postedAt: typeof jobData.postedAt === 'number' ? jobData.postedAt : parseRelativeAge(jobData.postedAtText),
              });
            }
          } catch (err) {
            errors.push(`card ${i + 1}: ${err.message}`);
          }
        }

        const delay = jitteredDelay(options.requestDelayMs ?? 2500);
        if (delay) await sleep(delay);
      } catch (err) {
        errors.push(`page ${pageNum}: ${err.message}`);
        break;
      }
    }

    return { jobs, errors };
  }

  /**
   * Health check: can we see at least one job card on page 1?
   * @param {import('playwright').Page} page
   * @param {string[]} keywords
   */
  async healthCheck(page, keywords) {
    const url = this.buildSearchUrl(keywords, 1);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await sleep(2500);
    const cards = await page.$$(this.getJobListSelector());
    const loggedIn = await this.isLoggedIn(page);
    return {
      url,
      cardCount: cards.length,
      loggedIn,
      ok: cards.length > 0,
    };
  }
}
