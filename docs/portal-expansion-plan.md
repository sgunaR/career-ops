# Job Search Playbook — from scratch to applied

Guna Sekhar's end-to-end flow in `career-ops`. **Do the steps in order.** Every step says what it is, then how to do it from the **command line**, from **chat** (Claude Code / Cursor / Codex in this repo) and in the **web app** (`/local`).

> Detail archive (board-by-board tables, architecture, regression lanes): [`portal-expansion-reference.md`](portal-expansion-reference.md). You should not need it for day-to-day use.
> Last verified: 2026-09-26.

## The map

| # | Step | Web page | Command line | Chat |
|---|------|----------|--------------|------|
| 1 | [Initial setup](#1-initial-setup-from-scratch) | `/local/setup` | `node doctor.mjs` … | "Run career-ops doctor" |
| 2 | [Discover outside India](#2-discover-outside-india) | `/local/outside-india` | `npm run scan` … | `/career-ops scan` *(backup)* |
| 2A | ↳ Startups | `/local/outside-india#startups` | `npm run scan:yc` … | |
| 2B | ↳ Remote job boards | `/local/outside-india#remote-boards` | `npm run scan` | |
| 2C | ↳ Company career pages | `/local/outside-india#career-pages` | `node local/scan-career.mjs --company SAP` | |
| 3 | [Discover in India](#3-discover-in-india) | `/local/india` | `node local/india-scan/run.mjs --board naukri …` | |
| 4 | [Run from the command line](#4-run-from-the-command-line) | `/local/run#cli` | daily wave (copy-paste) | |
| 5 | [Run from chat](#5-run-from-chat) | `/local/run#chat` | | prompts for every step |
| 6 | [Shortlist](#6-shortlist) | `/local/apply#shortlist` → `/pipeline` | edit `data/pipeline.md` | "Shortlist my pipeline" |
| 7 | [Evaluate JDs](#7-evaluate-jds) | `/local/apply#evaluate` | | `/career-ops pipeline` |
| 8 | [Generate the CV](#8-generate-the-cv) | `/local/apply#cv` | `node local/make-cv.mjs …` | "Generate the LaTeX CV for report N" |
| 9 | [Apply](#9-apply) | `/local/apply#apply` → `/apply` | | `/career-ops apply` |
| 10 | [Contacts at the company](#10-contacts-at-the-company) | `/local/apply#contacts` | `node linkedin-join.mjs --company X` | `/career-ops contacto` |
| 11 | [Cover letter & email](#11-cover-letter--application-email) | `/local/apply#cover` | | `/career-ops cover` · `/career-ops email` |
| 12 | [Track & follow up](#12-track--follow-up) | `/local/apply#track` → `/followups` | `node set-status.mjs …` | `/career-ops followup` |
| 13 | [Maintenance](#13-maintenance) | `/local/setup#maintenance` | resets, health, updates | |
| 14 | [Troubleshooting](#14-troubleshooting) | | | |

**Which sources use an API and which are scraped?** See [Sources at a glance](#sources-at-a-glance-api-or-scraping): outside India nothing needs a browser; every Indian board does.

Optional, any time after step 2: **Company directory** (`/local/companies`, `node local/companies.mjs --summary`) lists every employer your scans have seen, tagged product / services / startup and SAP role, so you can target employers on purpose.

## 0. Ground rules (read once)

1. **Discovery is free, evaluation is paid.** Steps 2–4 use no LLM. Only steps 7+ spend model tokens.
2. **Never auto-submit.** Everything drafts; you click Submit.
3. **Below 4.0/5, don't apply** unless you have a specific reason.
4. **`cv.md` is the source of truth** for every claim. Nothing is invented. Re-read it before generating a CV; it changes.
5. **Pull-safe:** your tooling lives in gitignored `local/` and user files. Never edit `scan.mjs`, `package.json` or `providers/*` for personal workflow, or `git pull` will conflict.
6. **Two CVs, one per archetype:** SAP Consultant (BTP & CPI) → `cv-sap-btp-cpi.md` · Full Stack Engineer (Applied AI + DevOps) → `cv-full-stack.md` (DevOps folded in — see below).

---

## Sources at a glance: API or scraping?

**Rule of thumb: outside India nothing opens a browser; every Indian board does.** Outside-India sources publish an API, an RSS feed, or a plain web page that we fetch and parse over HTTP. The Indian boards have no public API, sit behind logins and bot protection, so they are read through a real Chromium browser (Playwright) with a saved login.

Snapshot from **2026-09-27**, after the fixes below (`node local/audit-outside.mjs` and `node local/india-scan/health.mjs`). These sites change often, so treat the "Found" column as a dated check-up, not a guarantee. "Keepers" = jobs that survived title, location and the then-configured age filter (today the standing cutoff is **24 hours** — see Freshness window below).

### Outside India (no browser, no login)

| Group | Source | How it fetches | Found on 2026-09-27 |
|---|---|---|---|
| **Startups** | a16z Speedrun Talent | JSON API | Fixed: query is now a single term. 250 read, 3 keepers |
| | Hacker News "Who is hiring" | Algolia JSON API + thread HTML (`local/parsers/hackernews-fixed.mjs`) | Fixed: every posting has its own URL and a real location. 256 read, 17 keepers |
| | Top Startups | HTML page over HTTP | 92 jobs, dated. 5 keepers; region-locked ones are now filtered out |
| | YC companies | YC JSON API (company list) → each company's public Greenhouse / Ashby / Lever API | **Low yield by nature.** A 40-company probe of YC companies flagged as hiring found a public board for only 7 (17%); most YC startups use a different ATS or none. Not a bug; treat it as a bonus source |
| | YC + a16z companies | Same, plus the a16z portfolio HTML page | Same |
| | Recently funded (review only) | TechCrunch / Hacker News over HTTP | Works; a few garbled company names ("Instinct has") come from upstream's headline parser. Review by eye |
| **Remote job boards** | Himalayas | JSON API, paged (`local/parsers/himalayas-paged.mjs`) | Fixed: reads the newest 600 jobs (was 20). 4 keepers. **Its job-*listing* pages are a different story: they're behind Cloudflare** ("Just a moment... Performing security verification") even though the API is wide open — the mandatory Playwright liveness check will hit that wall on a Himalayas URL. Not a bug, not bypassable; see AGENTS.md § Offer Verification — treat it as unconfirmed, not closed, and proceed on the scan feed's own data |
| | 4 Day Week | JSON API (3 pages) | Fine (0 keepers for your filters) |
| | RemoteOK | JSON API (`local/parsers/dated-feeds.mjs`) | Fixed: keeps the posting date, so old jobs are dropped. 7 keepers |
| | Remotive | JSON API (`dated-feeds.mjs`) | Fixed: dates kept. 2 keepers (feed only holds 18 jobs) |
| | Working Nomads | JSON API (`dated-feeds.mjs`) | Fixed: dates kept. 2 keepers |
| | Jobicy | JSON API | Fine (0 keepers) |
| | We Work Remotely | RSS | **Best for India:** 9 keepers, all "Anywhere in the World" |
| | JustRemote | HTML page over HTTP | Works. The site publishes no dates, so the age filter can't apply (undated cards always pass). 0 keepers after region filtering |
| | *The Muse* (off) | JSON API | Off on purpose: slow (134 s), mostly stale, near-zero coverage |
| | *NoDesk, Jobspresso* (off) | RSS | Off on purpose: 10 items each, mostly stale, no locations |
| | *EchoJobs* (off) | JSON API | Off in `portals.yml` |
| | *Remote.co* (off) | HTML | Off on purpose: bot protection |
| | *Hubstaff Talent* (off) | HTML | Off on purpose: freelance |
| **Company career pages** | SAP | SuccessFactors HTML tiles over HTTP | **HTTP 403** (Cloudflare bot protection). Not fixable from a script and we don't bypass it. Browse jobs.sap.com directly |
| | EY | SuccessFactors HTML tiles over HTTP | Off in `portals.yml` (10 s scan limit is too short); scan it with `node local/scan-career.mjs --company EY` |
| | *Advance Auto Parts* (off) | Phenom JSON (POST) | Off: retail, never matches your roles |

The "region-locked" rule (`location_filter.block` in `portals.yml`) rejects "United States | Remote", "Remote (EU)", "US only" and similar, unless the location also says India, Worldwide, Anywhere, APAC or Global.

The only place a browser appears outside India is the YC/a16z scanner's opt-in `--liveness` flag, which is off by default and not used by the web app.


### India (real browser, saved login)

All of these use Playwright with a persistent profile in `local/india-scan/.browser-data/`, in real **Chrome** (falls back to Edge, then bundled Chromium): it opens the URL the board's own search box would produce, waits for the job cards to render, and reads them. Log in once (step 1); a wall or a re-login need shows up as amber in **Check health**.

**Fixed on 2026-09-27 — every board was reachable, but three were searching wrong, not actually searching, or getting blocked:**

| Board | What was wrong | Fix |
|---|---|---|
| LinkedIn | The logged-in `/jobs/search` page silently replaced the configured location with the member's own home area (a Hyderabad member got "Greater Hyderabad Area" no matter what `location:` said), and its React markup has no job links to read | Reads LinkedIn's public listing endpoint instead (`/jobs-guest/.../search?geoId=…`), which honours the location exactly and gives a real link, company and posting date per job |
| Instahyre | `?q=` on the search page is ignored — it just lists all ~13,000 jobs regardless of the keyword | Uses the parameters the site's own search box produces (`?skills=&search=true[&location=]`), with paging by clicking "Next »" (the `offset=` in the URL does nothing) |
| foundit | Every request came back **HTTP 403 Access Denied**, even the home page | Akamai was rejecting Playwright's *bundled* Chromium outright; real Chrome with the same profile passes |
| Cutshort | `/jobs?search=` is a category directory page, not search results — it never actually searched | Uses `/search-jobs?free_text=…`, the URL the site's own search box redirects to |
| Wellfound | `/role/l/<role>/locations/remote` 404s (that URL form doesn't exist); DataDome also blocked the bundled Chromium the same way it blocked foundit | Uses the working URL form (`/role/l/<role>/india`, or `/role/r/<role>` for remote) plus real Chrome |
| Hirist, Naukri, foundit, Indeed | City was hard-coded to Hyderabad only | All default to **all of India**; a city in `config.yml` narrows one board without touching the rest |

A `node local/india-scan/run.mjs --all --max-pages 1 --dry-run` after the fixes: 9/9 boards live, 1,443 cards read, 150 keepers (the configured cap), shared **evenly round-robin across all nine boards** — 15–17 each — instead of the first board scraped using up the whole allowance.

| Board | How it searches now | Login / bot wall | Health on 2026-09-27 |
|---|---|---|---|
| Naukri | `/<role>-jobs[-in-<city>]` | Login recommended | Live (20 cards) |
| LinkedIn | Public listing endpoint, `geoId`-exact | No login needed for this endpoint | Live (30 cards / location) |
| Instahyre | `/search-jobs?skills=…`, "Next »" paging | Login; Cloudflare | Live (60 cards / 3 pages) |
| Cutshort | `/search-jobs?free_text=…` (10 results/query, no paging) | Public | Live (10 cards) |
| foundit | `/search/<role>-jobs?locations=india` | Login; Akamai (needed real Chrome) | Live (40 cards / 2 pages) |
| Hirist | `/c/<category>-jobs` or `/<category>-jobs-in-<city>` | Public | Live (20+ cards) |
| Indeed India | `/jobs?q&l=India` | Login; bot challenge (occasional) | Live (32 cards) |
| Peerlist | `/jobs/role/<role-slug>`, filtered to India/remote here (the site has no location filter) | Login; Cloudflare | Live (14 India-relevant of 50 rows) |
| Wellfound | `/role/l/<role-slug>/india` (or `/role/r/<role-slug>` for remote) | Login; DataDome (needed real Chrome) | Live (52 cards / 2 pages) |
| Apna | not built | n/a | Deferred |

foundit and Indeed India can still hit an occasional bot wall — that's the site reacting to traffic, not a config problem; re-run or re-login if it happens. Force a specific browser with `INDIA_SCAN_BROWSER=chrome|msedge|chromium` in `config.yml`'s environment if Chrome isn't installed.

### What was fixed on 2026-09-27, and what is left

| Finding | Fix | Where |
|---|---|---|
| Speedrun returned 0 | Single-term query | `portals.yml` |
| Hacker News: 34 postings shared one URL, 33 dropped; wrong locations | New local parser gives each posting its comment permalink and picks the real location field | `local/parsers/hackernews-fixed.mjs` |
| Himalayas read 20 of ~96,000 | Local parser pages through the newest 600 | `local/parsers/himalayas-paged.mjs` |
| RemoteOK / Remotive / Working Nomads dropped the posting date | Local parser keeps it | `local/parsers/dated-feeds.mjs` |
| "United States \| Remote" counted as open to you | Region block list | `portals.yml` `location_filter` |
| The Muse, NoDesk, Jobspresso, Advance Auto Parts: slow or near-useless | Switched off, with the reason in `notes:` | `portals.yml` |
| EY failed at the 10 s scan limit | Switched off; use `scan-career.mjs` | `portals.yml` |
| Web health panel was not showing the real state | Now runs the same audit as the CLI | `/api/local-tools/health` |
| YC seed scan: 59 of 60 companies had no board | **Not a bug.** Most YC startups have no public Greenhouse/Ashby/Lever board at a guessable address (17% even among those hiring). Left as-is; it is a bonus source | n/a |

Still open, and outside our control:

- **SAP:** Cloudflare returns 403 to scripts. Browse jobs.sap.com directly.
- **JustRemote:** publishes no dates.
- **Funded list:** a few garbled company names come from upstream's parser.
- **India:** foundit and Indeed India hit bot walls intermittently; a fresh login usually clears it (`node local/india-scan/run.mjs --login <board>`). LinkedIn no longer needs a login for its listing endpoint (fixed 2026-09-27, see the India table above).

The local parsers use `scan_method: local_parser` in `portals.yml`, live in the gitignored `local/` folder, and are therefore untouched by `git pull` (no edits to upstream `providers/`).

**Re-check any time:** `node local/audit-outside.mjs` (outside India) and `node local/india-scan/health.mjs` (India). Both are read-only.

### Freshness window: 24h hard cutoff (both scanners)

`portals.yml` sets one shared window for outside India (`scan.mjs`) and India (`local/india-scan`):

```yaml
max_posting_age_hours: 24       # hard cutoff — nothing older survives, in either scanner
priority_posting_age_hours: 24  # same window — every kept row is already "priority"
```

`max_posting_age_hours` replaces the old day-based window everywhere. `max_posting_age_days` still exists underneath for anything that hasn't moved to hours, but is ignored while the hours key is set. Undated cards still pass (same "don't penalize missing data" rule as location).

**India also asks each board for the last day in the search URL** when the site exposes a freshness facet (researched against the live UIs, 2026-10-20):

| Board | Board-native last-day filter | Card date (post-filter backup) |
|---|---|---|
| Naukri | `?jobAge=1` | `.job-post-day` ("5 days ago") |
| LinkedIn | `f_TPR=r86400` (`linkedin_days: 1` in `config.yml`) | `<time datetime="…">` on the guest listing endpoint |
| Hirist | `posting=3` | "Posted N days ago" card text |
| Cutshort | `hiringActivityOnJob=1-days` | no date on the list — undated rows keep |
| Foundit | `jobFreshness=1` | "Posted N days ago" card text |
| Indeed India | `fromage=1` | no per-card date; the URL facet is the request window |
| Instahyre | none on the site | no date on the list — undated rows keep |
| Wellfound | none on the site | "N days ago" card text when present |
| Peerlist | none on the site | "3d ago" line when present |

**Cross-board duplicates:** the same company+role on Naukri and LinkedIn (different URLs) is dropped in the same India-scan run via `companyRoleDedupKey`, in addition to URL dedup against `scan-history.tsv`.

**Outside India** has no per-board date query on most aggregators — they dump a feed and `max_posting_age_hours: 24` drops older rows after fetch. Override a single noisy source with `posting_age_filter: false` or `posting_age_hours: N` on that `tracked_companies` / `job_boards` entry (Hacker News monthly thread and a16z Speedrun Talent still use those overrides).

### When a global 24h window is the wrong fit for a source

The global window is right for a genuine rolling feed (Himalayas, RemoteOK, Naukri, …): a listing really does get less relevant as it ages, and "0 keepers today" for a low-volume feed is an honest, expected result. Two sources needed a different rule instead of the global one, set per-entry in `portals.yml`:

| Source | Why 24h is the wrong fit | Override |
|---|---|---|
| **a16z Speedrun Talent** | Checked directly against the API: page 1 mixes 2020, 2024 and 2026 postings, and a `sort=recent` parameter has no effect — the feed **isn't sorted by date at all**. We only ever fetch 5 of ~50 pages, so a tight cutoff wouldn't reject *old* postings, it would reject an arbitrary sample that has no relationship to what's actually new. Raising `max_pages` wouldn't fix that either — more of an unsorted mix isn't more recent. | `posting_age_filter: false` — every posting passes regardless of age; title/location filtering still applies. |
| **Hacker News "Who is hiring"** | The thread is monthly, not a rolling feed. `postedAt` here is really "when this comment was added to the thread", not "when the role opened" — a listing from day 2 of the thread is exactly as valid to apply to on day 27 as one from yesterday. The global 24h window would drop a perfectly live thread almost entirely. | `posting_age_hours: 720` (30 days) — spans one thread's life and rolls off naturally once next month's thread supersedes it. |

Any entry in `portals.yml` (`tracked_companies` or `job_boards`) can take either field: `posting_age_filter: false` exempts it from the cutoff entirely, `posting_age_hours: N` gives it its own window instead of the global one. Priority sorting (`priority_posting_age_hours`) is never overridden this way — an old posting from an exempted source still won't jump the queue as "fresh", it just isn't dropped.

The audit (`node local/audit-outside.mjs`) prints the priority-window count per source and only calls something "stale?" when nothing has posted in 14 days — a tight 24h window naturally shows 0 for a low-cadence source most days, which isn't the same thing as broken.

---

## 1. Initial setup (from scratch)

Do once per machine. From the repo root:

```bash
npm install
npx playwright install chromium          # PDF + India scrapers
node doctor.mjs --json                   # want: "onboardingNeeded": false
node templates/india-scan/bootstrap.mjs  # creates local/india-scan (gitignored)
cd web && npm ci && npm run dev          # web app → http://localhost:3000
```

**LaTeX engine (for the CV in step 8):**

```bash
scoop install tectonic     # first compile downloads packages (~4 min); later ones take ~2 s
```

**Log in to the India boards** (opens a browser once; log in, press Enter in the terminal):

```bash
node local/india-scan/run.mjs --login naukri
node local/india-scan/run.mjs --login linkedin
# gated boards, do these too:
node local/india-scan/run.mjs --login instahyre
node local/india-scan/run.mjs --login foundit
node local/india-scan/run.mjs --login indeed-india
node local/india-scan/run.mjs --login peerlist
node local/india-scan/run.mjs --login wellfound
# optional (usually public): cutshort, hirist
```

**Files that must exist** (they are yours; never overwritten by updates): `cv.md`, `config/profile.yml`, `modes/_profile.md`, `modes/_custom.md`, `portals.yml`, `data/applications.md`, `data/pipeline.md`.

**Check everything is healthy:**

```bash
node validate-portals.mjs --file portals.yml   # portals.yml is valid
node verify-portals.mjs                        # remote boards + enabled career pages answer
node local/india-scan/health.mjs               # India boards (🟡 = log in again, ❌ = broken)
```

**Web:** `/local/setup` shows the same checks as chips, has **Set up the India scanner**, **Check board health** and per-board **Login** buttons.

---

## 2. Discover outside India

Three different things live here. They are separate because they work differently:

| | What it is | Finds | Writes to pipeline? | How often |
|---|---|---|---|---|
| **2A Startups** | Lists of *startup companies* (YC, a16z) and startup job boards | Jobs at funded startups | Yes, except "Funded companies" | Weekly |
| **2B Remote job boards** | Ready-made job boards for remote work worldwide | Remote jobs | Yes | Every few days |
| **2C Company career pages** | One employer's own careers site | That employer's jobs | Yes | When you want that employer |

Everything is filtered by `portals.yml` (`title_filter`, `location_filter`, `max_posting_age_hours: 24`), de-duplicated against `data/scan-history.tsv`, and appended to `data/pipeline.md`. **"0 new" after a successful fetch means your filters dropped everything, not that the board is broken.**

### 2A. Startups

| What you want | Command | Web card | Notes |
|---|---|---|---|
| Jobs at **Y Combinator** companies | `npm run scan:yc` | Y Combinator companies | Takes YC's company list, finds each company's job board (Greenhouse / Ashby / Lever) and keeps matches. Slow. |
| YC **and** a16z companies | `npm run scan:seeds` | YC + a16z companies | Same, wider. Weekly at most. |
| **a16z Speedrun** job board | `node local/scan-companies.mjs "a16z Speedrun Talent"` | a16z Speedrun job board | Ready-made board. |
| **Top Startups** (remote) | `node local/scan-companies.mjs "Top Startups"` | Top Startups (remote) | Ready-made remote board. |
| **Hacker News "Who is hiring"** | `node local/scan-companies.mjs "Hacker News Who is Hiring"` | Hacker News "Who is hiring" | Current month's thread. |
| **Recently funded** companies | `npm run company:funded -- --dry-run --limit 25` | Recently funded (review only) | **Does not write to the pipeline.** A list to research; pick a company, then use 2C. |

Research-only sites (**First Round, Dealroom, Crunchbase**) have no jobs feed and are not scanned. Use them to find a company, then paste its careers URL into 2C.

### 2B. Remote job boards

One command covers all of them (Himalayas, RemoteOK, Remotive, NoDesk, We Work Remotely, Working Nomads, Jobicy, EchoJobs, Jobspresso, The Muse, 4 Day Week, JustRemote, plus the startup boards and enabled career pages from `portals.yml`):

```bash
npm run scan                      # everything enabled
node scan.mjs --company Himalayas # one board
node scan.mjs --dry-run           # fetch + filter, write nothing (safe first test)
node scan.mjs --since 2           # only postings from the last 2 days
```

Off on purpose, not broken: FlexJobs (paywall), Turing, TrulyRemote, SimplyHired, Remote.co (WAF), Hubstaff Talent (freelance).

**Web:** `/local/outside-india#remote-boards` → **Scan all remote boards** (tick *dry-run* first).

### 2C. Company career pages

For an employer you specifically want (SAP, EY, Advance Auto Parts are set up). Not the daily volume path.

```bash
node local/scan-career.mjs --company SAP
node local/scan-career.mjs --company EY --max-pages 8
node local/scan-career.mjs --company "Advance Auto Parts" --dry-run
node local/scan-companies.mjs EY,"Advance Auto Parts"   # several at once
```

Use `local/scan-career.mjs`, not bare `scan.mjs --company SAP`: SAP's site is slow from India and `scan.mjs` aborts at 10 s (SAP is `enabled: false` in `portals.yml` for that reason; the URL is fine).

**Add a new company:** (1) paste its careers URL, (2) work out its ATS (Workday / Greenhouse / Ashby / Lever / SuccessFactors / Phenom), (3) add it to `tracked_companies` in `portals.yml` with `careers_url` and `provider`, (4) `node validate-portals.mjs --file portals.yml`, (5) `node local/scan-career.mjs --company "<Name>" --dry-run`, then run it for real.

**Web:** `/local/outside-india#career-pages` → type a company name → **Scan this company**.

**Health for all of step 2:** the **Job board health** panel at the top of `/local/outside-india` checks startups, remote boards and career pages in three groups (about 1–2 minutes). It runs the same audit as `node local/audit-outside.mjs` (data checks: dates, duplicates, region-locking), includes SAP even though it is off in `portals.yml`, and lists the YC / a16z / funded company lists as "not probed" (they have no live feed).

---

## 3. Discover in India

Playwright scrapers, zero LLM, run from `local/india-scan/`. Boards: **naukri, linkedin, instahyre, cutshort, foundit, hirist, indeed-india, peerlist, wellfound** (Apna deferred). Peerlist and Wellfound are startup / remote-leaning but run through this same India runner.

```bash
node local/india-scan/run.mjs --board naukri --max-pages 1 --dry-run   # test first, writes nothing
node local/india-scan/run.mjs --board naukri --max-pages 1             # one board (best daily habit)
node local/india-scan/run.mjs --boards naukri,hirist,cutshort --max-pages 1
node local/india-scan/run.mjs --all --max-pages 1                      # everything; slow, occasional
node local/india-scan/run.mjs --help
```

- Prefer **one or two boards** a day, not `--all`.
- Each new row is tagged `note: india:<board>` in the pipeline.
- The same `title_filter` and `location_filter` from `portals.yml` apply to every board. Age and salary filters do **not** apply here.
- Search keywords, cities and page caps live in `local/india-scan/config.yml`. To shrink noise, tighten the keywords first; that is the biggest lever.
- If a board is 🟡 in health, log in to it again (step 1).

**Web:** `/local/india` → pick a board → **Scan**. **Check health** on that page checks the Indian boards only (about a minute) and puts a **Login** button on any that need one.

---

## 4. Run from the command line

The daily wave, in priority order. Copy-paste it.

```bash
# 1. India first (best density for your titles)
node local/india-scan/run.mjs --board naukri --max-pages 1
node local/india-scan/run.mjs --board linkedin --max-pages 1   # optional second board

# 2. Remote boards (every few days)
npm run scan

# 3. Career pages (only if you want a specific employer)
node local/scan-career.mjs --company SAP

# 4. Startups (weekly)
npm run scan:yc
node local/scan-companies.mjs "Top Startups"

# 5. See what landed
node stats.mjs --summary
# then open data/pipeline.md (or /pipeline) and go to step 6
```

**Web:** `/local/run#cli` has these as buttons plus a copy-paste block.

---

## 5. Run from chat

"Chat" = an AI agent session in this repo (Claude Code, Cursor Agent or Codex), or the **Assistant** panel in the web app. Slash commands are `/career-ops <mode>`; you can also just describe the task.

| I want to | Say |
|---|---|
| Find jobs when the scanners are not enough (uses tokens, backup only) | `/career-ops scan` |
| Turn my pending list into scored reports | `/career-ops pipeline` |
| Evaluate one JD or URL | paste the URL, or `/career-ops oferta` |
| Fast first-pass filter before a full evaluation | `/career-ops triage` |
| Compare several offers | `/career-ops ofertas` |
| Make my CV for report 38 | "Generate the LaTeX CV for report 38 using my house style" |
| Fill an application form | `/career-ops apply` |
| Find who to contact | `/career-ops contacto` |
| Cover letter | `/career-ops cover` |
| Application email | `/career-ops email` |
| Research a company | `/career-ops deep` |
| Prepare for an interview | `/career-ops interview-prep` |
| Update a status | "Mark #38 as Applied" |
| Follow-ups due | `/career-ops followup` |

Headless (one-shot, no interactive session): `claude -p "..."` · `codex exec "..."` · `copilot -p "..."`.

**Web:** `/local/run#chat` lists these as copy-buttons.

---

## 6. Shortlist

The pipeline inbox (`data/pipeline.md`) is everything the scanners kept. Cut it down **before** you spend tokens.

1. Open `data/pipeline.md` or the web **Pipeline** page.
2. Keep **at most ~15** Pending URLs that fit: right title, 2–4 years, location you accept.
3. Drop or park the rest; prefer parking over wiping history.
4. Optionally check the postings are still open: `node check-liveness.mjs <url>`. Naukri often blocks headless checks (redirect or "Access Denied"): open it yourself in a normal browser; don't try to bypass it.

Empty only the Pending list: `node local/reset-scan-inbox.mjs --yes --pipeline-only`.

**Web:** `/pipeline` (inbox tab); `/local/apply#shortlist` links there.

---

## 7. Evaluate JDs

This is the first paid step. It reads the JD, scores it A–G against `cv.md` + `profile.yml` + your archetypes, writes `reports/NNN-company-date.md`, and adds a tracker row.

```text
/career-ops pipeline           # everything Pending (cap ~15)
<paste a JD or URL>            # one JD (auto-pipeline)
```

Then merge the tracker rows: `node merge-tracker.mjs` (never hand-edit new rows into `applications.md`).

- **Gate:** score **below 4.0/5** → the report recommends against applying.
- **Trust rule:** the report's *tailoring* and *draft answer* blocks (E and H) are model-written. They can contain numbers that are not in your `cv.md` (this has happened: "99.2% uptime" first appeared in one). Check any figure against `cv.md` before using it anywhere.
- Report number ≠ tracker `#`. Find it with `node find.mjs "Company"`.

**Web:** in the `/pipeline` inbox use **Score** on a row (or score a selection), or paste a URL into **Quick evaluate** on Today. The finished report opens at `/pipeline/<id>`.

---

## 8. Generate the CV

**Two base CVs, picked by the JD title** (2026-09-27 — see modes/_profile.md → "Which CV for which JD title"):

| JD title says... | Base CV |
|---|---|
| SAP anywhere (SAP Consultant, SAP Developer, SAP BTP Developer, SAP CPI/Integration Consultant, ...) | `cv-sap-btp-cpi.md` |
| Software Engineer / Full Stack Engineer / Developer / Backend Engineer / AI Engineer, no SAP mention | `cv-full-stack.md` (DevOps is folded into this one — there is no third CV) |
| Genuinely asks for both | Ask which to lead with — don't guess |

**Re-read `cv.md` first**, since it changes.

### LaTeX house style (your Overleaf template): chat or CLI

Your standing rule lives in `modes/_custom.md`. In chat, say: *"Generate the LaTeX CV for report 38."* The agent will:

1. Read the report and the JD; write the JD to `jds/<slug>.md`.
2. Pick the base CV by the table above.
3. Tailor summary, competencies, bullets and skills from `cv.md` only (reword, never invent) — **every employer and every bullet from `cv.md` goes into the payload, and every skill row stays.** Place JD phrases that `cv.md` already supports in the summary, competencies, or a bullet. Do not drop bullets to fit a page.
4. Write a JSON payload (schema in the header of `local/build-cv-smallcaps.mjs`). Two real, working starting points exist — copy one rather than writing from scratch: `local/cv-payload-sap.example.json` and `local/cv-payload-fullstack.example.json` (both gitignored, both pass the fact gate as-is).
5. Run the whole chain with one command:

```bash
node local/make-cv.mjs local/cv-payload-sap.example.json --company accenture-india --jd jds/accenture-india.md --max-pages 3 \
  --keywords "SAP BTP,Node.js,FastAPI,RAG,..."
```

That builds the `.tex` → **fact gate** (stops if a claim isn't in `cv.md`) → compiles the PDF → skill-gap check → **ATS check + keyword coverage** on the real PDF → page limit. Output: `output/cv-guna-sekhar-<company>-<date>.tex` and `.pdf` (upload the `.tex` to Overleaf if you like).

Read the result: ATS structural score, pages, keyword coverage %, and the **missing keywords**. Missing keywords `cv.md` doesn't back are real gaps; list them, never add them. To close a gap honestly, add the true fact to `cv.md` and regenerate.

### Several at once (bulk)

There is no single bulk-generate command — each CV is tailored to its own JD, and that tailoring is the point of this pipeline, not overhead to skip.

- **In chat:** name several report numbers in one message — *"Generate LaTeX CVs for reports 30, 35 and 38."* One message from you, still one tailored payload and one fact-gate run per report.
- **From the CLI:** build one payload per application first (copy an example above per application), then loop:

```bash
for slug in acme-co other-co third-co; do
  node local/make-cv.mjs "local/cv-payload-$slug.json" --company "$slug" --jd "jds/$slug.md"
done
```

If you find yourself wanting truly untailored, one-shot bulk PDFs (e.g. every report scoring ≥4.0 with no PDF yet, using each report's already-drafted CV section rather than a hand-built payload), that's a real gap in the tooling today — say so and it's worth building a small script for, rather than working around it by hand.

### HTML PDF (the older path)

```bash
node find.mjs "BDO India"        # get the report number
copilot -p "Run career-ops pdf mode for report 035 ..." --allow-all-tools --silent
npm run pdf -- output/cv-x.html output/cv-x.pdf --format=a4 --report=035   # re-render only
```

`--format=a4` outside the US/Canada, `letter` inside. This path also runs the fact gate.

**Web:** `/pipeline/<id>` has a **Generate PDF** button. It uses the **HTML** template, **not** the LaTeX house style; for the house style use chat or the CLI above. `/cv` edits `cv.md`.

---

## 9. Apply

Assisted, never automatic.

1. Confirm the posting is still open and the report score is ≥ 4.0.
2. Have the tailored CV PDF ready.
3. `/career-ops apply` drafts the form answers from `cv.md` + `profile.yml`. **Review every answer.** It stops before Submit; you click it.
4. Then mark it applied (step 12).

**Web:** `/pipeline/<id>` → **Apply** opens the form proxy; `/apply` lists sessions.

---

## 10. Contacts at the company

Find a person to message alongside the application.

```text
/career-ops contacto      # finds the hiring manager / recruiter / peers by web search and drafts a LinkedIn message
```

- Drafts fit LinkedIn's connection-note limit (200 characters free, 300 Premium). Draft only; you send it.
- Warm intros first: `node linkedin-join.mjs --company "<Company>"` checks your LinkedIn `Connections.csv` export for people you already know there (offline, read-only).
- Saved contacts: `data/contacts.tsv`; export with `node contacts.mjs --vcf`.

**Web:** chat only (no page). `/local/apply#contacts` shows the prompt to copy.

---

## 11. Cover letter & application email

```text
/career-ops cover     # tailored cover letter, written to output/
/career-ops email     # formal application email: subject, body, attachment checklist; never sends
```

Your notice period (60 days) comes from `profile.yml`; you confirm it before it appears in a letter.

**Web:** chat generates them; `/pipeline/<id>` shows **View cover** once one exists for that application.

---

## 12. Track & follow up

```bash
node set-status.mjs 38 Applied --note "applied via LinkedIn"   # the only safe way to change a row
node followup-cadence.mjs                                       # what is due
node stats.mjs --summary                                        # funnel and scan trends
```

Statuses: `Evaluated` → `Applied` → `Responded` → `Interview` → `Offer` → `Hired` (or `Rejected` / `Discarded` / `SKIP`).

In chat: `/career-ops followup` · `/career-ops reply-watch` (classify recruiter replies; paste one with `node paste-reply.mjs`) · `/career-ops outcome` · `/career-ops interview-prep` · `/career-ops patterns` (why things get rejected).

**Web:** `/followups` (what is due), `/analytics`, and the status dropdown on each row.

---

## 13. Maintenance

**Health (any time):**

```bash
node verify-portals.mjs            # remote boards + enabled career pages
node local/india-scan/health.mjs   # India boards
node verify-pipeline.mjs           # tracker / reports integrity
```

**Deep audit of everything outside India** (answers "is it returning *correct, relevant, fresh* jobs?", not just "does it respond"): 

```bash
node local/audit-outside.mjs --skip "The Muse,EY,SAP"   # ~1 min
node local/audit-outside.mjs                             # everything, ~4 min
node local/audit-outside.mjs --only "Top Startups"       # one source
```

For each source it prints the transport (API / RSS / HTML: none use a browser), the funnel (raw → title → location → keepers), data quality (dates, duplicates, missing locations, bad URLs) and flags what to fix, including listings that are region-locked (e.g. "United States | Remote"). Read-only: nothing is written to your pipeline.

**Resets** (each backs up first; run with `--dry-run` to preview):

| To reset | Command |
|---|---|
| Just the Pending list | `node local/reset-scan-inbox.mjs --yes --pipeline-only` |
| Whole discovery inbox + scan history | `node local/reset-scan-inbox.mjs --yes` |
| Reports + tracker (evaluations) | `node local/reset-evaluations.mjs --yes` |
| Throw-away liveness lists | `node local/clean-liveness-temps.mjs --yes` |

**After `git pull` / system update:** `node update-system.mjs check`. Your `local/`, `cv.md`, `profile.yml`, `portals.yml`, `data/` and `modes/_*.md` are never touched. If the web `/local` pages disappear after a messy pull: `node local/restore-dashboard-local.mjs`. Re-run `node templates/india-scan/bootstrap.mjs` after upstream template updates (it keeps your `config.yml`).

**Web:** `/local/setup#maintenance` has the health checks and the destructive resets (each asks for confirmation).

---

## 14. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| A scan finished with **0 new** | Filters dropped everything (or all were already seen) | Try `--dry-run` and read the filter summary; loosen `title_filter` / `location_filter` only to diagnose |
| A scan's "Filtered (age)" number is high, or a whole board contributes 0 | `max_posting_age_hours: 24` is a hard cutoff — normal for a source that doesn't post every day | Check `newest` in `node local/audit-outside.mjs` or the India dry-run output; only worry if it's stale for 14+ days |
| Naukri: **Access Denied** or redirect to a search page | Bot protection; the posting may also be closed | Open it in a normal browser. Do not try to bypass it |
| An India board shows 🟡 | Login or bot wall | `node local/india-scan/run.mjs --login <board>` |
| foundit or Wellfound gets **403 / Access Denied / DataDome** | Playwright's bundled Chromium is fingerprinted and blocked by these two sites' bot protection | Should not happen any more (real Chrome is used by default); force it explicitly with `INDIA_SCAN_BROWSER=chrome` if needed |
| LinkedIn results are all near you regardless of `linkedin_locations` | Old bug: the logged-in search page overrode the location with your own area | Fixed 2026-09-27 (reads the public listing endpoint instead); update `local/india-scan` from `templates/india-scan` if you still see this |
| Instahyre / Cutshort return the same handful of jobs regardless of keyword | Old bug: their search URLs were ignored by the site | Fixed 2026-09-27 (uses the URL forms the sites' own search boxes produce) |
| SAP shows "broken" or aborts | 10 s timeout on bare `scan.mjs` | Use `node local/scan-career.mjs --company SAP` |
| SAP shows **HTTP 403** | SAP's site is refusing this machine's requests (Cloudflare) | Browse jobs.sap.com directly. Not a config problem |
| A `local/` script crashes with `js-yaml ... does not provide an export named 'default'` | js-yaml 5 removed the default export | Use `import * as yaml from 'js-yaml'` (fixed in `local/` and `templates/india-scan` on 2026-09-26) |
| A health panel comes back empty | The health script crashed | Run it in a terminal (`node local/india-scan/health.mjs`) and read the error |
| Outside-India health shows a source **warn/broken** | The audit found a real data problem (no dates, duplicates, 0 jobs, 403) | `node local/audit-outside.mjs --only "<name>"` and read the `**` lines |
| A local parser fails or reports "not found" | `portals.yml` `parser.script` must be inside the repo and the first arg | Check the path (`local/parsers/<name>.mjs`); run it directly with `node` to see the error |
| `make-cv` says **fact gate FAILED** | A claim isn't in `cv.md` | Remove it from the payload, or add the true fact to `cv.md`. Never bypass |
| `make-cv` says **STALE PAYLOAD** | `cv.md` changed after the payload was written | Re-read `cv.md`, rebuild the payload |
| PDF over the page limit | Too much content | Trim JD-irrelevant bullets; pass `--max-pages 2` for the full-section CV |
| `tectonic` not found | Not on PATH in this shell | Add `~/scoop/shims` to PATH |
| First LaTeX compile seems to hang | Downloading packages (once) | Wait ~4 minutes; later compiles take ~2 s |
| ATS check complains about a heading | Non-standard section name | Use: Professional Summary, Work Experience, Education, Skills |
| `/local` missing from the web app | A pull overwrote it | `node local/restore-dashboard-local.mjs` |
| `npm run verify:india` not found | It doesn't exist | `node local/india-scan/health.mjs` |

Full regression lanes and the run log: [`portal-expansion-reference.md` §11](portal-expansion-reference.md#11-testing-strategy-start--end-fix-one-lane-at-a-time).

---

## Where things live

| What | File |
|---|---|
| Who you are, targeting, comp, notice period | `config/profile.yml`, `modes/_profile.md` |
| House rules (CV style, batch cap, 4.0 gate) | `modes/_custom.md` |
| Canonical CV | `cv.md` (variants: `cv-sap-btp-cpi.md`, `cv-full-stack.md` — DevOps folded into the latter 2026-09-27) |
| What discovery is allowed to keep | `portals.yml` (`title_filter`, `location_filter`, `max_posting_age_hours` / `priority_posting_age_hours`, `tracked_companies`) |
| India search keywords / cities | `local/india-scan/config.yml` |
| Inbox / history / tracker | `data/pipeline.md`, `data/scan-history.tsv`, `data/applications.md` |
| Evaluations / CVs | `reports/`, `output/` |
| Your tooling (gitignored, pull-safe) | `local/` |
