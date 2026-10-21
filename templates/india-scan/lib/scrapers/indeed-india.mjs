import { BaseScraper } from '../scraper-base.mjs';
import { sleep, jitteredDelay } from '../browser.mjs';

/**
 * Indeed India (in.indeed.com) — may show security checks; persistent session helps.
 */
class IndeedIndiaScraper extends BaseScraper {
  name = 'indeed-india';
  baseUrl = 'https://in.indeed.com';

  /** @param {{ location?: string }} [opts] */
  constructor(opts = {}) {
    super();
    this.location = opts.location || 'Hyderabad, Telangana';
  }

  getJobListSelector() {
    return 'div.job_seen_beacon, div[data-jk], li[data-empn], a.jcs-JobTitle';
  }

  buildSearchUrl(keywords, pageNum) {
    const q = encodeURIComponent(keywords.join(' '));
    const l = encodeURIComponent(this.location);
    const start = (pageNum - 1) * 10;
    // fromage=1 = Indeed "Date posted: last 24 hours".
    return `${this.baseUrl}/jobs?q=${q}&l=${l}&fromage=1&radius=100&sort=date&start=${start}`;
  }

  async isLoggedIn(page) {
    const sels = ['#AccountMenu', 'a[href*="/account"]', '[data-gnav-element-name="AccountMenu"]'];
    for (const sel of sels) {
      if (await page.$(sel)) return true;
    }
    return false;
  }

  async scrapeSearch(page, options) {
    const jobs = [];
    const errors = [];
    const seen = new Set();

    for (let pageNum = 1; pageNum <= options.maxPages; pageNum++) {
      try {
        const searchUrl = this.buildSearchUrl(options.keywords, pageNum);
        console.log(`[${this.name}] page ${pageNum}: ${searchUrl}`);
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
        await sleep(3000);

        const title = (await page.title()) || '';
        const blocked = /just a moment|security check|cloudflare|blocked/i.test(title);
        if (blocked) {
          errors.push('Indeed security check — try --login indeed-india in headed mode, then retry');
          break;
        }

        try {
          await page.waitForSelector(this.getJobListSelector(), { timeout: 15_000 });
        } catch {
          console.log(`[${this.name}] no listings on page ${pageNum}`);
          break;
        }

        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
        await sleep(1000);

        const batch = await page.evaluate(() => {
          const out = [];
          let cards = Array.from(document.querySelectorAll('div.job_seen_beacon'));
          if (!cards.length) cards = Array.from(document.querySelectorAll('div[data-jk]'));
          if (!cards.length) cards = Array.from(document.querySelectorAll('li[data-empn]'));

          for (const card of cards) {
            const titleLink =
              card.querySelector('h2.jobTitle a') ||
              card.querySelector('a.jcs-JobTitle') ||
              card.querySelector('a[data-jk]');
            if (!titleLink) continue;
            const titleSpan = titleLink.querySelector('span[title]') || titleLink.querySelector('span');
            const title = (titleSpan?.textContent || titleLink.textContent || '').trim();
            if (!title) continue;

            let jk = titleLink.getAttribute('data-jk') || card.getAttribute('data-jk');
            let href = (titleLink.getAttribute('href') || '').trim();
            if (!href) continue;
            if (!href.startsWith('http')) href = 'https://in.indeed.com' + href;
            let url = href.split('&')[0].split('?')[0];
            if (jk) url = `https://in.indeed.com/viewjob?jk=${jk}`;

            const company =
              card.querySelector("[data-testid='company-name']")?.textContent?.trim() ||
              card.querySelector('span.companyName')?.textContent?.trim();
            const location =
              card.querySelector("[data-testid='text-location']")?.textContent?.trim() ||
              card.querySelector('div.companyLocation')?.textContent?.trim();
            const salary =
              card.querySelector('.salary-snippet-container')?.textContent?.trim() ||
              card.querySelector('[class*="salary"]')?.textContent?.trim();

            out.push({ title, company, location, salary, url });
          }
          return out;
        });

        console.log(`[${this.name}] ${batch.length} cards`);
        if (!batch.length) break;

        for (const j of batch) {
          if (!j.url || !j.title || seen.has(j.url)) continue;
          seen.add(j.url);
          jobs.push({
            source: this.name,
            url: j.url,
            title: j.title,
            company: j.company,
            location: j.location,
            salary: j.salary,
          });
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

  async parseJobCard() {
    return {};
  }
}

export function createIndeedIndiaScraper(config = {}) {
  const city = config.indeed_location || 'Hyderabad, Telangana';
  return new IndeedIndiaScraper({ location: city });
}

export const indeedIndiaScraper = createIndeedIndiaScraper();
