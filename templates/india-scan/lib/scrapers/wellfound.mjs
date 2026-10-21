import { BaseScraper } from '../scraper-base.mjs';
import { sleep } from '../browser.mjs';
import { parseRelativeAge } from '../dates.mjs';

/**
 * Wellfound (AngelList Talent) — DataDome / login-walled.
 * Search URL, as its own search box builds it: /role/l/<role-slug>/<place>?page=<n>
 *   e.g. /role/l/full-stack-engineer/india  (the old /locations/remote form is a 404)
 * <place> is a slug: india | hyderabad | bengaluru | ...  (blank = india). "remote" uses
 * /role/r/<role-slug>. A role slug that does not exist silently turns into a generic
 * "India jobs" page, so unknown keywords are mapped onto one of the known roles below.
 */
class WellfoundScraper extends BaseScraper {
  name = 'wellfound';
  baseUrl = 'https://wellfound.com';

  /** @param {{ location?: string }} [opts] */
  constructor(opts = {}) {
    super();
    this.place = String(opts.location || 'india').trim().toLowerCase().replace(/\s+/g, '-');
  }

  getJobListSelector() {
    return 'a[href*="/jobs/"]';
  }

  /** Free-text keywords → a role slug Wellfound really has. */
  roleSlug(keywords) {
    const q = keywords.join(' ').toLowerCase();
    if (/full.?stack/.test(q)) return 'full-stack-engineer';
    if (/devops|sre|site reliability|cloud/.test(q)) return 'devops-engineer';
    if (/machine learning|\bml\b|llm|data scien/.test(q)) return 'machine-learning-engineer';
    if (/\bai\b|artificial/.test(q)) return 'ai-engineer';
    if (/backend|back-end/.test(q)) return 'backend-engineer';
    if (/frontend|front-end/.test(q)) return 'frontend-engineer';
    return 'software-engineer'; // includes SAP / CPI / BTP terms, which have no role page
  }

  buildSearchUrl(keywords, pageNum) {
    const role = this.roleSlug(keywords);
    const path = this.place === 'remote' ? `/role/r/${role}` : `/role/l/${role}/${this.place}`;
    return `${this.baseUrl}${path}${pageNum > 1 ? `?page=${pageNum}` : ''}`;
  }

  getLoginUrl() {
    return `${this.baseUrl}/login`;
  }

  async isLoggedIn(page) {
    const sels = ['a[href*="/profile"]', 'img[alt*="avatar" i]', '[data-test*="UserMenu"]', 'a[href*="/settings"]'];
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
        await sleep(4000);

        const title = await page.title();
        if (/403|access denied|just a moment|datadome/i.test(title)) {
          errors.push(`Wellfound blocked (${title}) — run --login wellfound in the headed browser`);
          break;
        }
        if (/404|not found/i.test(title)) {
          errors.push(`Wellfound has no page at ${searchUrl}`);
          break;
        }

        try {
          await page.waitForSelector(this.getJobListSelector(), { timeout: 15_000 });
        } catch {
          console.log(`[${this.name}] no listings on page ${pageNum}`);
          break;
        }

        // One card per startup; it holds that startup's job rows.
        const cards = await page.evaluate(() => {
          const out = [];
          for (const a of document.querySelectorAll('a[href*="/jobs/"]')) {
            const href = a.getAttribute('href') || '';
            if (!/^\/jobs\/\d+/.test(href)) continue;
            const title = (a.innerText || '').replace(/\s+/g, ' ').trim();
            if (!title) continue;
            const startup = a.closest('div[class*="rounded"][class*="border"]');
            const row = a.closest('div[class*="rounded"][class*="border"] div') || a.parentElement;
            let rowText = '';
            for (let n = a, i = 0; n && i < 6; n = n.parentElement, i++) {
              if (startup && n === startup) break;
              if (/\b(ago|Apply|Save)\b/.test(n.innerText || '')) { rowText = n.innerText; break; }
            }
            const company = (startup?.innerText || '').split('\n').map((l) => l.trim()).find(Boolean) || '';
            const loc = rowText.split('\n').map((l) => l.trim()).find((l) => /(In office|Remote|Hybrid)/i.test(l)) || '';
            const postedAtText = (rowText.match(/\d+\s*(day|month|week|hour)s?\s*ago/i) || [])[0];
            out.push({ href, title, company, location: loc.replace(/^(In office|Hybrid)\s*•\s*/i, ''), postedAtText });
          }
          return out;
        });

        console.log(`[${this.name}] ${cards.length} job rows`);
        let added = 0;
        for (const c of cards) {
          const url = `${this.baseUrl}${c.href.split('?')[0]}`;
          if (seen.has(url)) continue;
          seen.add(url);
          jobs.push({ source: this.name, url, title: c.title.slice(0, 180), company: c.company || undefined, location: c.location || undefined, postedAt: parseRelativeAge(c.postedAtText) });
          added += 1;
        }
        if (added === 0) break;
        await sleep(2000);
      } catch (err) {
        errors.push(`page ${pageNum}: ${err.message}`);
        break;
      }
    }

    return { jobs, errors };
  }
}

export function createWellfoundScraper(config = {}) {
  return new WellfoundScraper({ location: config.wellfound_location });
}

export const wellfoundScraper = createWellfoundScraper();
