import { readFileSync, existsSync, copyFileSync } from 'node:fs';
import * as yaml from 'js-yaml';
import { CONFIG_PATH, CONFIG_EXAMPLE_PATH, CAREER_OPS_ROOT } from './paths.mjs';

export function loadIndiaScanConfig() {
  if (!existsSync(CONFIG_PATH)) {
    if (existsSync(CONFIG_EXAMPLE_PATH)) {
      copyFileSync(CONFIG_EXAMPLE_PATH, CONFIG_PATH);
      console.log(`Created ${CONFIG_PATH} from config.example.yml`);
    } else {
      throw new Error('Missing config — copy config.example.yml to config.yml in local/india-scan/');
    }
  }
  const raw = yaml.load(readFileSync(CONFIG_PATH, 'utf8')) || {};
  return {
    boards: raw.boards ?? ['naukri', 'linkedin'],
    keywords: raw.keywords ?? [['backend engineer']],
    max_pages: Number(raw.max_pages) > 0 ? Number(raw.max_pages) : 2,
    fetch_full_details: Boolean(raw.fetch_full_details),
    headless: Boolean(raw.headless),
    // LinkedIn: one place or a list. "India" is exact; any other text (a city, "Singapore",
    // "European Union") is searched as typed. There is no "worldwide" — name the places.
    linkedin_locations: [].concat(raw.linkedin_locations ?? raw.linkedin_location ?? 'India').map(String),
    linkedin_location: raw.linkedin_location ?? 'India',
    linkedin_remote_only: Boolean(raw.linkedin_remote_only),
    linkedin_days: Number(raw.linkedin_days) > 0 ? Number(raw.linkedin_days) : 1,
    // Blank / "India" = all of India for every board below; a city narrows it.
    naukri_location: raw.naukri_location ?? '',
    foundit_city: raw.foundit_city ?? 'India',
    hirist_location: raw.hirist_location ?? '',
    indeed_location: raw.indeed_location ?? 'India',
    instahyre_location: raw.instahyre_location ?? '',
    cutshort_location: raw.cutshort_location ?? '',
    wellfound_location: raw.wellfound_location ?? 'india',
    peerlist_india_only: raw.peerlist_india_only !== false,
    request_delay_ms: Number(raw.request_delay_ms) >= 0 ? Number(raw.request_delay_ms) : 2500,
    max_new_offers: Number(raw.max_new_offers) > 0 ? Number(raw.max_new_offers) : 40,
  };
}

export function loadPortalsFilters() {
  const portalsPath = `${CAREER_OPS_ROOT}/portals.yml`;
  if (!existsSync(portalsPath)) {
    return { titleFilter: {}, locationFilter: {}, maxPostingAgeDays: 0, priorityPostingAgeHours: 0 };
  }
  const cfg = yaml.load(readFileSync(portalsPath, 'utf8')) || {};
  return {
    titleFilter: cfg.title_filter ?? {},
    locationFilter: cfg.location_filter ?? {},
    // max_posting_age_hours (hard cutoff) wins over the legacy max_posting_age_days
    // when set — same rounding rule as scan.mjs's resolveMaxAgeDays, duplicated
    // here because this loader is synchronous and scan.mjs is only reachable via
    // a dynamic import (see pipeline.mjs's getScan()). Rounded to the nearest
    // whole day (min 1) so buildPostingAgeFilter's "non-integer = disabled"
    // contract is never tripped by an hour value that isn't a multiple of 24.
    maxPostingAgeDays: (() => {
      const hours = Number(cfg.max_posting_age_hours);
      if (Number.isFinite(hours) && hours > 0) return Math.max(1, Math.round(hours / 24));
      return cfg.max_posting_age_days ?? 0;
    })(),
    // Freshest-first ordering, not a cutoff (see scan.mjs buildPostingAgePriority).
    priorityPostingAgeHours: cfg.priority_posting_age_hours ?? 0,
  };
}
