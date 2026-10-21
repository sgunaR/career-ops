import { BaseScraper } from '../scraper-base.mjs';
import { sleep, jitteredDelay } from '../browser.mjs';
import { parseRelativeAge } from '../dates.mjs';

function slug(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Foundit (Monster India) — Akamai-protected; needs persistent headed/login profile.
 * URL: /search/{role}-jobs-in-{city}?start=&limit=20&query=
 */
class FounditScraper extends BaseScraper {
  name = 'foundit';
  baseUrl = 'https://www.foundit.in';

  /** @param {{ cityPath?: string, cityQuery?: string }} [opts] */
  constructor(opts = {}) {
    super();
    // No city = all of India (the default): /search/<role>-jobs?locations=india
    this.cityPath = opts.cityPath ?? '';
    this.cityQuery = opts.cityQuery ?? 'india';
  }

  getJobListSelector() {
    return "a[href*='/job/'], h2.jobCardTitle, [class*='jobCard']";
  }

  buildSearchUrl(keywords, pageNum) {
    const role = keywords.join(' ');
    const roleSlug = slug(role) || 'software-engineer';
    const start = (pageNum - 1) * 20 + 1;
    const qs = [
      `start=${start}`,
      'limit=20',
      `query=${encodeURIComponent(role)}`,
      `${this.cityPath ? 'location' : 'locations'}=${encodeURIComponent(this.cityQuery)}`,
      'queryDerived=true',
      // jobFreshness=1 = Foundit's "last 1 day" freshness filter.
      'jobFreshness=1',
    ].join('&');
    const inCity = this.cityPath ? `-in-${this.cityPath}` : '';
    return `${this.baseUrl}/search/${roleSlug}-jobs${inCity}?${qs}`;
  }

  async isLoggedIn(page) {
    const sels = ['[class*="userProfile"]', 'a[href*="/seeker/"]', '[data-testid*="profile"]'];
    for (const sel of sels) {
      if (await page.$(sel)) return true;
    }
    return false;
  }

  async scrapeSearch(page, options) {
    const jobs = [];
    const errors = [];
    const seen = new Set();

    // Light warmup helps Akamai treat the session as organic
    try {
      await page.goto(this.baseUrl + '/', { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await sleep(2000);
    } catch {
      /* ignore */
    }

    for (let pageNum = 1; pageNum <= options.maxPages; pageNum++) {
      try {
        const searchUrl = this.buildSearchUrl(options.keywords, pageNum);
        console.log(`[${this.name}] page ${pageNum}: ${searchUrl}`);
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
        await sleep(3500);

        const title = await page.title();
        if (/access denied/i.test(title || '')) {
          errors.push('Foundit Access Denied — try --login foundit or headed mode');
          break;
        }

        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
        await sleep(1200);

        const cards = await page.evaluate(() => {
          const out = [];
          const seenHref = new Set();
          for (const lnk of document.querySelectorAll("a[href*='/job/']")) {
            const href = lnk.getAttribute('href') || '';
            if (!href || seenHref.has(href)) continue;
            let n = lnk;
            let card = null;
            for (let i = 0; i < 10; i++) {
              if (!n) break;
              if (n.tagName === 'DIV' && /rounded-2xl|jobCard|job-card/i.test(n.className || '')) {
                card = n;
                break;
              }
              n = n.parentElement;
            }
            if (!card) card = lnk.closest('div, article, li') || lnk;
            seenHref.add(href);
            const text = (sel) => {
              const e = card.querySelector(sel);
              return e ? (e.innerText || '').trim() : '';
            };
            out.push({
              href,
              title: text('h2.jobCardTitle') || text('h2') || (lnk.innerText || '').trim(),
              company: text('span.jobCardCompany') || text("[class*='jobCardCompany']") || text("[class*='Company']"),
              location: text("[class*='jobCardLocation']") || text("[class*='Location']"),
              salary: text("[class*='Salary']") || text("[class*='salary']"),
              postedAtText: (card.innerText.match(/posted\s+[a-z0-9 ]*?ago|just now|\btoday\b/i) || [])[0],
            });
          }
          return out;
        });

        console.log(`[${this.name}] ${cards.length} cards`);
        if (!cards.length) break;

        for (const cd of cards) {
          if (!cd.title || !cd.href) continue;
          let url = cd.href.startsWith('http') ? cd.href : `${this.baseUrl}${cd.href}`;
          url = url.split('?')[0];
          if (seen.has(url)) continue;
          seen.add(url);
          jobs.push({
            source: this.name,
            url,
            title: cd.title,
            company: cd.company || undefined,
            location: cd.location || undefined,
            salary: cd.salary || undefined,
            postedAt: parseRelativeAge(cd.postedAtText),
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

export function createFounditScraper(config = {}) {
  const city = String(config.foundit_city || 'India').trim().toLowerCase();
  const map = {
    india: { cityPath: '', cityQuery: 'india' },
    all: { cityPath: '', cityQuery: 'india' },
    hyderabad: { cityPath: 'hyderabad', cityQuery: 'hyderabad' },
    bangalore: { cityPath: 'bengaluru-bangalore', cityQuery: 'bengaluru / bangalore' },
    bengaluru: { cityPath: 'bengaluru-bangalore', cityQuery: 'bengaluru / bangalore' },
    pune: { cityPath: 'pune', cityQuery: 'pune' },
    mumbai: { cityPath: 'mumbai', cityQuery: 'mumbai' },
    chennai: { cityPath: 'chennai', cityQuery: 'chennai' },
    delhi: { cityPath: 'delhi-ncr', cityQuery: 'delhi ncr' },
    noida: { cityPath: 'noida', cityQuery: 'noida' },
    gurgaon: { cityPath: 'gurugram', cityQuery: 'gurugram' },
    gurugram: { cityPath: 'gurugram', cityQuery: 'gurugram' },
  };
  return new FounditScraper(map[city] || map.india);
}

export const founditScraper = createFounditScraper();
