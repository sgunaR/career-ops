import { BaseScraper } from '../scraper-base.mjs';

class NaukriScraper extends BaseScraper {
  name = 'naukri';
  baseUrl = 'https://www.naukri.com';

  getJobListSelector() {
    return '.srp-jobtuple-wrapper, .jobTuple, article.jobTuple';
  }

  /** @param {{ location?: string }} [opts] */
  constructor(opts = {}) {
    super();
    const loc = String(opts.location || '').trim();
    // blank / "India" = all India; a city uses Naukri's own /<role>-jobs-in-<city> page
    this.city = /^(india|all|any)?$/i.test(loc) ? '' : loc.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  buildSearchUrl(keywords, pageNum) {
    const query = keywords.join('-').toLowerCase().replace(/\s+/g, '-');
    const base = `${this.baseUrl}/${query}-jobs${this.city ? `-in-${this.city}` : ''}`;
    // jobAge=1 = Freshness "1 day" on Naukri's own search UI.
    const path = pageNum === 1 ? base : `${base}-${pageNum}`;
    return `${path}?jobAge=1`;
  }

  async isLoggedIn(page) {
    const sels = ['.nI-gNb-drawer__icon', '.user-prof-icon', '.nI-gNb-sb__user', '.view-profile-wrapper', '.nI-gNb-sb__user-name'];
    for (const sel of sels) {
      if (await page.$(sel)) return true;
    }
    return false;
  }

  async parseJobCard(page, index) {
    return page.evaluate((idx) => {
      const cards = document.querySelectorAll('.srp-jobtuple-wrapper, .jobTuple, article.jobTuple');
      const card = cards[idx];
      if (!card) return {};

      const pickText = (selectors) => {
        for (const sel of selectors) {
          const el = card.querySelector(sel);
          const t = el?.textContent?.trim();
          if (t) return t;
        }
        return undefined;
      };
      const pickHref = (selectors) => {
        for (const sel of selectors) {
          const el = card.querySelector(sel);
          if (el?.href) return el.href;
        }
        return undefined;
      };

      return {
        title: pickText(['.title', 'a.title', '.jobTupleHeader a', 'h2 a', '.info .title']),
        company: pickText(['.comp-name', '.companyInfo .subTitle', 'a.subTitle', '.company-name']),
        location: pickText(['.loc-wrap .locWdth', '.loc', '.location', '.ni-job-tuple-icon-srp-location + span']),
        salary: pickText(['.sal-wrap span', '.salary', '.sal']),
        url: pickHref(['a.title', '.title a', 'h2 a', 'a[href*="/job-listings"]', 'a[href*="-jobs-"]']),
        postedAtText: pickText(['.job-post-day']),
      };
    }, index);
  }
}

export function createNaukriScraper(config = {}) {
  return new NaukriScraper({ location: config.naukri_location });
}

export const naukriScraper = createNaukriScraper();
