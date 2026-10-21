import { BaseScraper } from '../scraper-base.mjs';
import { sleep } from '../browser.mjs';
import { parseRelativeAge } from '../dates.mjs';

/**
 * Peerlist. The old /jobs?keywords=… URL ignores the keywords (it lists every job worldwide,
 * San Francisco first). Its job pages are per role:  /jobs/role/<role-slug>
 * There is no location filter on those pages, so the rows are filtered here: by default only
 * India / worldwide-remote roles are kept (peerlist_india_only: false keeps everything).
 * More rows load as the page is scrolled; one "page" of the scan config = one scroll.
 */
const ROLES = [
  [/full.?stack/, 'full-stack-engineer'],
  [/front.?end/, 'frontend-engineer'],
  [/back.?end/, 'backend-engineer'],
  [/devops|sre|site reliab|cloud|platform/, 'devops'],
  [/machine learning|\bml\b|llm|data scien/, 'machine-learning-engineer'],
  [/\bai\b|artificial/, 'ai-engineer'],
  [/data eng/, 'data-engineer'],
  [/architect/, 'software-architect'],
  [/qa|test/, 'qa-engineer'],
];

const INDIA_OK = /india|anywhere|worldwide|global|apac|asia|remote$|^remote\b(?!\s*\()/i;

class PeerlistScraper extends BaseScraper {
  name = 'peerlist';
  baseUrl = 'https://peerlist.io';

  /** @param {{ indiaOnly?: boolean }} [opts] */
  constructor(opts = {}) {
    super();
    this.indiaOnly = opts.indiaOnly !== false;
  }

  getJobListSelector() {
    return 'a[href*="/company/"][href*="/careers/"]';
  }

  roleSlug(keywords) {
    const q = keywords.join(' ').toLowerCase();
    for (const [re, slug] of ROLES) if (re.test(q)) return slug;
    return 'software-engineer'; // includes SAP / CPI / BTP terms, which have no role page
  }

  buildSearchUrl(keywords) {
    return `${this.baseUrl}/jobs/role/${this.roleSlug(keywords)}`;
  }

  getLoginUrl() {
    return `${this.baseUrl}/login`;
  }

  async isLoggedIn(page) {
    const sels = ['a[href*="/@"]', 'img[alt*="avatar" i]', 'button[aria-label*="profile" i]'];
    for (const sel of sels) {
      if (await page.$(sel)) return true;
    }
    return false;
  }

  async readRows(page) {
    return page.evaluate(() => {
      const out = [];
      const seen = new Set();
      for (const a of document.querySelectorAll('a[href*="/company/"][href*="/careers/"]')) {
        const href = (a.getAttribute('href') || '').split('?')[0];
        if (!href || seen.has(href)) continue;
        seen.add(href);
        const lines = (a.innerText || '').split('\n').map((l) => l.trim()).filter(Boolean);
        const head = lines[0] || '';
        const at = head.lastIndexOf(' at ');
        const title = at > 0 ? head.slice(0, at) : head;
        const company = at > 0 ? head.slice(at + 4) : '';
        // "Remote (India) • 0-2 years" / "In-Office (Bengaluru, India) • 5+ years"
        const meta = (lines.find((l) => /(remote|in-office|hybrid)/i.test(l)) || '').split('•')[0].trim();
        // A short "3d ago" / "11d ago" line sits between the title and the location line.
        const postedAtText = lines.find((l) => /^\d+\s*(d|h|w|mo)\s*ago$/i.test(l));
        if (title) out.push({ href, title, company, location: meta.replace(/^(In-Office|Hybrid)\s*/i, ''), postedAtText });
      }
      return out;
    });
  }

  async scrapeSearch(page, options) {
    const jobs = [];
    const errors = [];
    const seen = new Set();

    try {
      const searchUrl = this.buildSearchUrl(options.keywords);
      console.log(`[${this.name}] ${searchUrl}`);
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await sleep(3000);

      const title = await page.title();
      if (/just a moment/i.test(title)) {
        console.log(`[${this.name}] Cloudflare challenge — complete in headed browser / re-login`);
        await sleep(8000);
      }
      try {
        await page.waitForSelector(this.getJobListSelector(), { timeout: 15_000 });
      } catch {
        console.log(`[${this.name}] no listings`);
        return { jobs, errors };
      }

      // Scroll to load more rows: (pages) extra screens on top of the first.
      let rows = await this.readRows(page);
      for (let i = 0; i < options.maxPages; i++) {
        const before = rows.length;
        await page.evaluate(() => {
          for (const el of document.querySelectorAll('*')) {
            if (el.scrollHeight > el.clientHeight + 200 && getComputedStyle(el).overflowY.match(/auto|scroll/)) el.scrollTo(0, el.scrollHeight);
          }
          window.scrollTo(0, document.body.scrollHeight);
        });
        await sleep(2500);
        rows = await this.readRows(page);
        if (rows.length <= before) break;
      }

      let dropped = 0;
      for (const r of rows) {
        if (this.indiaOnly && r.location && !INDIA_OK.test(r.location)) {
          dropped++;
          continue;
        }
        const url = `${this.baseUrl}${r.href}`;
        if (seen.has(url)) continue;
        seen.add(url);
        jobs.push({ source: this.name, url, title: r.title, company: r.company || undefined, location: r.location || 'Remote', postedAt: parseRelativeAge(r.postedAtText) });
      }
      console.log(`[${this.name}] ${rows.length} rows, ${dropped} outside India dropped`);
    } catch (err) {
      errors.push(err.message);
    }
    return { jobs, errors };
  }

  async parseJobCard() {
    return {};
  }
}

export function createPeerlistScraper(config = {}) {
  return new PeerlistScraper({ indiaOnly: config.peerlist_india_only });
}

export const peerlistScraper = createPeerlistScraper();
