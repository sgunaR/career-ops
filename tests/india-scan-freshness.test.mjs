import assert from 'node:assert/strict';
import test from 'node:test';
import { createNaukriScraper } from '../templates/india-scan/lib/scrapers/naukri.mjs';
import { createLinkedInScraper } from '../templates/india-scan/lib/scrapers/linkedin.mjs';
import { createHiristScraper } from '../templates/india-scan/lib/scrapers/hirist.mjs';
import { createIndeedIndiaScraper } from '../templates/india-scan/lib/scrapers/indeed-india.mjs';
import { createFounditScraper } from '../templates/india-scan/lib/scrapers/foundit.mjs';
import { createCutshortScraper } from '../templates/india-scan/lib/scrapers/cutshort.mjs';

test('India boards request a one-day freshness facet when the site has one', () => {
  const naukri = createNaukriScraper({});
  assert.match(naukri.buildSearchUrl(['ai engineer'], 1), /jobAge=1/);

  const linkedin = createLinkedInScraper({ linkedin_days: 1, linkedin_locations: ['India'] });
  assert.match(linkedin.guestUrl(['full stack developer'], 'India', 1), /f_TPR=r86400/);

  const hirist = createHiristScraper({});
  assert.match(hirist.buildSearchUrl(['full stack'], 1), /posting=3/);

  const indeed = createIndeedIndiaScraper({ indeed_location: 'India' });
  assert.match(indeed.buildSearchUrl(['full stack developer'], 1), /fromage=1/);

  const foundit = createFounditScraper({});
  assert.match(foundit.buildSearchUrl(['full stack developer'], 1), /jobFreshness=1/);

  const cutshort = createCutshortScraper({});
  assert.match(cutshort.buildSearchUrl(['backend'], 1), /hiringActivityOnJob=1-days/);
});
