import { createNaukriScraper } from './scrapers/naukri.mjs';
import { createLinkedInScraper } from './scrapers/linkedin.mjs';
import { createInstahyreScraper } from './scrapers/instahyre.mjs';
import { createCutshortScraper } from './scrapers/cutshort.mjs';
import { createFounditScraper } from './scrapers/foundit.mjs';
import { createHiristScraper } from './scrapers/hirist.mjs';
import { createIndeedIndiaScraper } from './scrapers/indeed-india.mjs';
import { createPeerlistScraper } from './scrapers/peerlist.mjs';
import { createWellfoundScraper } from './scrapers/wellfound.mjs';

/** @typedef {import('./scraper-base.mjs').BaseScraper} BaseScraper */

export const IMPLEMENTED_BOARDS = [
  'naukri',
  'linkedin',
  'instahyre',
  'cutshort',
  'foundit',
  'hirist',
  'indeed-india',
  'peerlist',
  'wellfound',
];

/** Intentionally deferred (user request / product fit). */
export const PLANNED_BOARDS = ['apna'];

/**
 * @param {string} name
 * @param {ReturnType<import('./config.mjs').loadIndiaScanConfig>} config
 * @returns {BaseScraper | null}
 */
export function getScraper(name, config) {
  if (name === 'naukri') return createNaukriScraper(config);
  if (name === 'linkedin') return createLinkedInScraper(config);
  if (name === 'instahyre') return createInstahyreScraper(config);
  if (name === 'cutshort') return createCutshortScraper(config);
  if (name === 'foundit') return createFounditScraper(config);
  if (name === 'hirist') return createHiristScraper(config);
  if (name === 'indeed-india') return createIndeedIndiaScraper(config);
  if (name === 'peerlist') return createPeerlistScraper(config);
  if (name === 'wellfound') return createWellfoundScraper(config);
  return null;
}
