import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { CAREER_OPS_ROOT } from './paths.mjs';
import { loadPortalsFilters } from './config.mjs';

const scanModuleUrl = pathToFileURL(join(CAREER_OPS_ROOT, 'scan.mjs')).href;

/** @type {typeof import('../../../scan.mjs') | null} */
let scanMod = null;

async function getScan() {
  if (!scanMod) scanMod = await import(scanModuleUrl);
  return scanMod;
}

export async function buildFiltersFromPortals() {
  const { titleFilter, locationFilter, maxPostingAgeDays, priorityPostingAgeHours } = loadPortalsFilters();
  const scan = await getScan();
  return {
    title: scan.buildTitleFilter(titleFilter),
    location: scan.buildLocationFilter(locationFilter),
    // Hard cutoff (max_posting_age_hours in portals.yml, e.g. 24h). Undated
    // offers always pass, same convention as scan.mjs.
    age: scan.buildPostingAgeFilter(maxPostingAgeDays),
    // Freshest-first ordering, not a cutoff (priority_posting_age_hours).
    isPriority: scan.buildPostingAgePriority(priorityPostingAgeHours),
  };
}

export async function filterJob(job, filters) {
  if (!filters.title(job.title)) return 'title';
  if (!filters.location(job.location || '', job.url || '', job.title || '')) return 'location';
  if (filters.age && !filters.age(job.postedAt)) return 'age';
  return null;
}

/** Freshest-and-priority-first, same rule scan.mjs applies outside India. */
export async function sortByFreshness(offers, filters) {
  const scan = await getScan();
  return scan.sortByFreshness(offers, filters.isPriority ?? (() => false));
}

export async function normalizeUrlKey(url) {
  const scan = await getScan();
  return scan.normalizeUrlForDedup(url);
}

/**
 * Cross-board identity for the same role re-listed on Naukri + LinkedIn + Indeed, etc.
 * Returns '' when company or title is missing so we never collapse unknown cards.
 */
export async function companyRoleKey(offer) {
  const company = String(offer?.company || '').trim();
  const title = String(offer?.title || '').trim();
  if (!company || !title || /^(unknown|india-scan|naukri|linkedin|foundit|hirist|cutshort|instahyre|indeed-india|peerlist|wellfound)$/i.test(company)) {
    return '';
  }
  const scan = await getScan();
  return scan.companyRoleDedupKey(company, title);
}

/**
 * Append offers so the web dashboard sees them:
 * - data/pipeline.md  → Inbox / Pipeline page
 * - data/scan-history.tsv → What's New / freshness
 *
 * Uses the same writers as npm run scan (scan.mjs).
 */
export async function appendOffers(offers, { dryRun = false } = {}) {
  if (offers.length === 0) return;
  const scan = await getScan();
  const date = new Date().toISOString().slice(0, 10);
  if (dryRun) {
    for (const o of offers) {
      console.log(`  + [dry-run] ${o.company} | ${o.title} | ${o.url}`);
    }
    return;
  }
  await scan.appendToPipeline(offers);
  scan.appendToScanHistory(offers, date, 'added');
}

/**
 * Record one run row in data/scan-runs.tsv so `node stats.mjs` trends include india-scan.
 * (Web dashboard does not render this file; CLI stats does.)
 */
export async function recordScanRun(counters, { dryRun = false } = {}) {
  if (dryRun) return;
  const scan = await getScan();
  scan.appendScanRunSummary({
    timestamp: new Date().toISOString(),
    status: 'completed',
    companies: 0,
    boards: counters.boards ?? 0,
    found: counters.found ?? 0,
    filteredTitle: counters.filteredTitle ?? 0,
    filteredTier: 0,
    filteredLocation: counters.filteredLocation ?? 0,
    filteredPostingAge: counters.filteredAge ?? 0,
    filteredSalary: 0,
    filteredContent: 0,
    filteredCooldown: 0,
    dupes: counters.dupes ?? 0,
    newAdded: counters.newAdded ?? 0,
    errors: counters.errors ?? 0,
    filteredBlacklist: 0,
    filteredVisa: 0,
    filteredPostedDate: 0,
    filteredCountryEligibility: 0,
  });
}

export async function loadSeenUrlSet() {
  const scan = await getScan();
  const { seen } = scan.loadSeenUrls({});
  return seen;
}
