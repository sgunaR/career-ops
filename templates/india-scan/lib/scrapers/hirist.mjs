import { BaseScraper } from '../scraper-base.mjs';
import { sleep, jitteredDelay } from '../browser.mjs';
import { parseRelativeAge } from '../dates.mjs';

/** Map free-text keywords → Hirist category slug. */
function categoryFromKeywords(keywords) {
  const blob = keywords.join(' ').toLowerCase();
  if (/\b(sap|oracle|btp|cpi)\b/.test(blob)) return 'platform-engineering-sap-oracle-jobs';
  if (/\b(devops|sre|platform eng)\b/.test(blob)) return 'devops-sre-jobs';
  if (/\b(frontend|react|angular|vue)\b/.test(blob)) return 'frontend-development-jobs';
  if (/\b(full.?stack)\b/.test(blob)) return 'full-stack-jobs';
  if (/\b(mobile|android|ios|flutter)\b/.test(blob)) return 'mobile-applications-jobs';
  if (/\b(data|analytics|bi|ml|ai engineer)\b/.test(blob)) return 'emerging-technologies-jobs';
  if (/\b(qa|quality|test)\b/.test(blob)) return 'quality-assurance-jobs';
  if (/\b(security|cyber)\b/.test(blob)) return 'cybersecurity-jobs';
  return 'backend-development-jobs';
}

/**
 * Hirist.tech — category listing pages with data-testid cards + JSON-LD ItemList.
 */
class HiristScraper extends BaseScraper {
  name = 'hirist';
  baseUrl = 'https://www.hirist.tech';

  /** @param {{ location?: string }} [opts] */
  constructor(opts = {}) {
    super();
    // blank / "India" / "all" = every city. A city name switches to Hirist's own city page.
    const loc = String(opts.location || '').trim();
    this.location = /^(india|all|any)?$/i.test(loc) ? '' : loc;
  }

  getJobListSelector() {
    return "div[data-testid^='job-list-'], a[href*='/j/'], a[href*='hirist.tech']";
  }

  buildSearchUrl(keywords, pageNum) {
    const cat = categoryFromKeywords(keywords);
    const page = pageNum > 1 ? `&page=${pageNum}` : '';
    // `loc=<city name>` is ignored by the site (its filter uses numeric ids), so a city is
    // requested through the city page it links to: /<category>-in-<city>  (the /c/ prefix is
    // only for the all-India category page).
    if (this.location) {
      const city = this.location.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      // posting=3 is Hirist's own "recent" freshness facet (jobfeed / search UI).
      return `${this.baseUrl}/${cat}-in-${city}?minexp=0&maxexp=30&posting=3${page}`;
    }
    return `${this.baseUrl}/c/${cat}?ref=topnavigation&minexp=0&maxexp=30&posting=3${page}`;
  }

  async isLoggedIn(page) {
    const sels = ['a[href*="/profile"]', '[class*="avatar"]', 'button:has-text("Logout")'];
    for (const sel of sels) {
      try {
        if (await page.$(sel)) return true;
      } catch {
        /* ignore */
      }
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
        await sleep(2500);
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
        await sleep(1000);

        const batch = await page.evaluate(() => {
          const byId = {};
          const ordered = [];
          for (const block of document.querySelectorAll('script[type="application/ld+json"]')) {
            try {
              const data = JSON.parse(block.textContent || '');
              if (data?.['@type'] !== 'ItemList') continue;
              for (const item of (data.itemListElement || []).sort((a, b) => (a.position || 0) - (b.position || 0))) {
                const url = item.url || item.item?.url;
                if (!url) continue;
                ordered.push(url);
                const m = String(url).match(/-(\d+)\/?$/);
                if (m) byId[m[1]] = url;
              }
            } catch {
              /* ignore */
            }
          }

          const out = [];
          const cards = document.querySelectorAll("div[data-testid^='job-list-']");
          cards.forEach((card, idx) => {
            const title = card.querySelector("[data-testid='job_title']")?.textContent?.trim();
            if (!title) return;
            const location = card.querySelector("[data-testid='job_location']")?.textContent?.trim();
            const salary = card.querySelector("[data-testid='job_salary']")?.textContent?.trim();
            const company =
              card.querySelector("[data-testid='job_company'], [data-testid='company_name']")?.textContent?.trim() ||
              card.querySelector('img[itemid]')?.getAttribute('alt') ||
              undefined;
            const logo = card.querySelector('img[itemid]');
            const jid = logo?.getAttribute('itemid');
            let url = (jid && byId[jid]) || ordered[idx] || '';
            const linkEl = card.querySelector('a[href]');
            if (!url && linkEl?.href) url = linkEl.href;
            if (!url) return;
            const postedAtText = (card.innerText.match(/posted\s+[a-z0-9 ]*?ago|just now|\btoday\b/i) || [])[0];
            out.push({ title, company, location, salary, url, postedAtText });
          });

          // Fallback: any job links if cards empty
          if (!out.length) {
            for (const a of document.querySelectorAll('a[href*="/j/"], a[href*="hirist.tech/j"]')) {
              const href = a.href || '';
              const title = a.textContent?.trim();
              if (title && href) out.push({ title, url: href.split('?')[0] });
            }
          }
          return out;
        });

        console.log(`[${this.name}] ${batch.length} cards`);
        if (!batch.length) break;

        for (const j of batch) {
          let url = j.url.startsWith('http') ? j.url : `${this.baseUrl}${j.url}`;
          url = url.split('?')[0];
          if (seen.has(url) || !j.title) continue;
          seen.add(url);
          jobs.push({
            source: this.name,
            url,
            title: j.title,
            company: j.company,
            location: j.location,
            salary: j.salary,
            postedAt: parseRelativeAge(j.postedAtText),
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

export function createHiristScraper(config = {}) {
  return new HiristScraper({ location: config.hirist_location });
}

export const hiristScraper = createHiristScraper();
