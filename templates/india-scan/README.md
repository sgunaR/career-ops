# India board scanner (local / zero-LLM)

**Full ordered playbook (Remote / India / career pages / pipeline):** `docs/portal-expansion-plan.md` §0.

**Pull-safe:** all runtime code lives in `local/india-scan/` (gitignored). Upstream `git pull` on career-ops will not touch it.

Tracked seed templates live here in `templates/india-scan/`. Re-copy after template updates:

```bash
node templates/india-scan/bootstrap.mjs
```

(Preserves your existing `local/india-scan/config.yml`.)

## First-time setup

```bash
# From career-ops repo root
node templates/india-scan/bootstrap.mjs
npm install   # playwright already in career-ops package.json
npx playwright install chromium
```

## Login once (persistent session)

```bash
node local/india-scan/run.mjs --login naukri
node local/india-scan/run.mjs --login linkedin
node local/india-scan/run.mjs --login instahyre
node local/india-scan/run.mjs --login foundit
node local/india-scan/run.mjs --login indeed-india
node local/india-scan/run.mjs --login peerlist
node local/india-scan/run.mjs --login wellfound
```

1. Browser opens → log in manually  
2. Press **Enter** in the terminal  
3. Session saves → process **exits** (fixed: no hanging stdin)

Browser profile: `local/india-scan/.browser-data/` (gitignored).

Instahyre, Foundit, Indeed, Peerlist, and Wellfound often need a saved login (Cloudflare / Akamai / DataDome). Cutshort and Hirist are usually scrapable without login.

## Health check (selector canary)

```bash
node local/india-scan/health.mjs
node local/india-scan/health.mjs --board cutshort
node local/india-scan/health.mjs --board peerlist
node local/india-scan/run.mjs --health --board wellfound
```

Exit code 1 = at least one board returned 0 job cards.

## Run discovery (zero LLM cost)

Like job-hunt-ai’s “pages to scrape” — use `--max-pages` (default from `config.yml`).

### One board at a time

```bash
node local/india-scan/run.mjs --board naukri --max-pages 3
node local/india-scan/run.mjs --board peerlist --max-pages 1
node local/india-scan/run.mjs --board wellfound --max-pages 1
node local/india-scan/run.mjs --board foundit --max-pages 2 --dry-run
```

### All implemented boards

```bash
node local/india-scan/run.mjs --all --max-pages 2
```

### Explicit list

```bash
node local/india-scan/run.mjs --boards naukri,hirist,indeed-india --max-pages 2
```

### Help

```bash
node local/india-scan/run.mjs --help
```

Writes matching URLs to `data/pipeline.md` and `data/scan-history.tsv` (dashboard) using the same helpers as `scan.mjs`.

### Filters (all boards)

Every board uses the same metadata from `portals.yml` **after** scrape:

- `title_filter` — positive/negative title keywords  
- `location_filter` — Remote / India metros / etc. (your current allow list keeps **both** remote and city roles)

Also: URL dedup vs `scan-history.tsv`, and same-run company+role dedup across boards (Naukri and LinkedIn listing the same opening count as one).

Posting age uses `portals.yml` `max_posting_age_hours` (hard cutoff, currently 24h) after scrape. Boards that expose a freshness facet also request the last day on the search URL itself:

| Board | Board-native last-day filter |
|---|---|
| Naukri | `jobAge=1` |
| LinkedIn | `f_TPR=r86400` (`linkedin_days: 1`) |
| Hirist | `posting=3` |
| Cutshort | `hiringActivityOnJob=1-days` |
| Foundit | `jobFreshness=1` |
| Indeed | `fromage=1` |
| Instahyre / Wellfound / Peerlist | no day facet on the site — age text on the card + `max_posting_age_hours` |

Not applied yet by india-scan (only by `npm run scan`): `salary_filter`.

**Remote-only tip:** tighten `location_filter.allow` to `Remote` / `Anywhere` / `Worldwide`. LinkedIn can also set `linkedin_remote_only: true` in `config.yml` (search facet). Foundit/Hirist/Indeed still *search* a city from config, then location_filter drops non-matches.

Details: `docs/portal-expansion-plan.md` §3 (Remote boards status + Metadata filters on Indian boards).

## Config

Edit `local/india-scan/config.yml` (created from `config.example.yml` on first run).

- `max_pages` — default page count when `--max-pages` is omitted  
- `boards` — used only when you omit `--board` / `--boards` / `--all`
- Where to search (all default to **all of India**; a city narrows it): `linkedin_locations` (a list; any text is searched as typed, there is no "worldwide"), `naukri_location`, `foundit_city`, `hirist_location`, `indeed_location`, `instahyre_location`, `cutshort_location`, `wellfound_location`
- `linkedin_remote_only` / `linkedin_days` — remote-only facet; days back (default `1` = past 24 hours)
- `peerlist_india_only` — Peerlist cannot filter by place, so keep only India / worldwide-remote rows

## How each board is searched

Each board is searched the way the site itself does it, checked against the live pages (a URL the site ignores gives you an unfiltered list, not your search):

| Board | Search |
|---|---|
| Naukri | `/<role>-jobs[-in-<city>]` |
| LinkedIn | public listing endpoint `/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords&geoId=102713980` (the logged-in page replaced our location with the member's home area and hides its cards) |
| Instahyre | `/search-jobs?skills=<kw>&search=true[&location=<city>]`, further pages by clicking "Next »" |
| Cutshort | `/search-jobs?free_text=<kw>[ jobs in <city>]` (10 results per query) |
| foundit | `/search/<role>-jobs[-in-<city>]?query&locations=india` |
| Hirist | `/c/<category>-jobs`, or `/<category>-jobs-in-<city>` |
| Indeed India | `/jobs?q&l=India` |
| Peerlist | `/jobs/role/<role-slug>` (worldwide list, filtered to India here) |
| Wellfound | `/role/l/<role-slug>/india` (or `/role/r/<role-slug>` for remote) |

Browser: real **Chrome** (falls back to Edge, then the bundled Chromium). Akamai refuses the bundled Chromium outright (foundit "Access Denied" even on its home page). Force one with `INDIA_SCAN_BROWSER=chromium|chrome|msedge`.

The new-offer cap (`max_new_offers`) is shared round-robin across boards, so the first boards cannot use it all up.

## Implemented boards

- naukri
- linkedin
- instahyre
- cutshort
- foundit
- hirist
- indeed-india
- peerlist *(Cloudflare — login recommended; not in default `config.yml` boards list)*
- wellfound *(DataDome — login recommended; not in default `config.yml` boards list)*

## Planned (not built)

- apna (intentionally deferred)

Adapted from sibling repo `job-hunt-ai` (Naukri/LinkedIn Playwright scrapers) plus Hirist/Foundit/Indeed patterns.

## Daily workflow

See **`docs/portal-expansion-plan.md` §7** for the full install → login → remote → India → UI → pipeline path.

1. `npm run scan` — remote + ATS (zero LLM)
2. India boards:
   - `node local/india-scan/run.mjs --board naukri --max-pages 3`
   - `node local/india-scan/run.mjs --board peerlist --max-pages 1` *(login if Cloudflare)*
   - `node local/india-scan/run.mjs --board wellfound --max-pages 1` *(login if DataDome)*
   - `node local/india-scan/run.mjs --all --max-pages 2`
3. Shortlist `data/pipeline.md` (optional: web dashboard `cd web && npm run dev`)
4. `/career-ops pipeline` (paid evaluation step)

Also recorded: `data/scan-runs.tsv` (via `node stats.mjs --summary`).

Each offer is tagged `note: india:<board>` so you can spot India-scan rows in the inbox.
