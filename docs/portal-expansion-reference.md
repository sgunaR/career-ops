# Portal Expansion — Reference (detail archive)

> **You probably want [`portal-expansion-plan.md`](portal-expansion-plan.md) instead.** That is the ordered, step-by-step playbook (setup → discover → run → evaluate → CV → apply → contacts → cover letter → track). This file is the **unchanged detail archive** it was split from: portal-by-portal tables, architecture, the tightening recipe, the regression lanes and the run log. Open it when you need the *why* or a specific board's URL/date facets.

**Facts that supersede this archive** (it was written before these changes):

| Topic | Now |
|---|---|
| Target archetypes | **3**, one CV each: SAP Consultant (BTP & CPI) · Full Stack Engineer (Applied AI) · DevOps / Cloud Delivery. Backend and AI Engineer are folded into Full Stack. See `modes/_profile.md`. |
| Contact details | `hi@sguna.dev` · `https://sguna.dev` (not `sekharguna.com`). |
| SAP-only discovery experiment (§3 “Active experiment”) | **Ended** — broad `title_filter` + india-scan keywords are back (`modes/_custom.md`). |
| CV generation | LaTeX house style through `node local/make-cv.mjs` (fact gate + ATS + keyword coverage + page limit). See playbook step 8. |
| `npm run verify:india` | **Does not exist.** Use `node local/india-scan/health.mjs`. |
| Web `/local` routes | Reorganised into numbered steps (`/local/setup`, `/local/outside-india`, `/local/india`, `/local/run`, `/local/apply`, `/local/companies`). `/local/startups` and `/local/careers` redirect to `/local/outside-india`. |

**Where each old section went in the playbook**

| Old § | Topic | Playbook step |
|---|---|---|
| 0.4, 7.1–7.4 | Install, bootstrap, logins, health | 1 Setup |
| 3.6, remote boards table, 5.3 | Startup directory, remote boards | 2 Outside India |
| 5.2 | Career pages | 2 Outside India (2C) |
| 3 (India), 5.1, 6, 7.6 | Indian boards | 3 India |
| 0.5, 7.11, 7.13 | Daily wave, cheat-sheet | 4 Run from the command line |
| 0.3 | All modes | 5 Run from chat |
| 7.8, 7.9 | See results, shortlist | 6 Shortlist |
| 4, 7.9 | Evaluate | 7 Evaluate |
| 0.6, 7.10 | CV | 8 CV |
| 4, 7.10 | Apply, outreach | 9 Apply · 10 Contacts · 11 Cover letter |
| 7.5, 7.5b, 7.5c, 7.12 | Resets, adding a company | 13 Maintenance |
| 11 | Regression lanes | 14 Troubleshooting (summary) — full lanes stay here |

---

## 0. Start here — ordered commands (fast path)

### 0.1 Three discovery modes (₹0 LLM) — then one evaluation mode (paid)

| # | Mode | What it finds | Command | Speed tip |
|---|---|---|---|---|
| **A** | **Remote boards** | Himalayas, RemoteOK, Remotive, NoDesk, WWR, Working Nomads, Jobicy, EchoJobs, Jobspresso, The Muse, 4 Day Week, … | `npm run scan` | Same command also hits career pages below |
| **B** | **Career pages** | Company careers sites (SAP SuccessFactors, Advance Auto Parts Phenom, …) | `node local/scan-career.mjs --company <Name>` | Detect ATS → set `provider:` in portals.yml; one scanner, many plugins |
| **C** | **Indian + Peerlist/Wellfound** | Naukri, LinkedIn, Instahyre, Cutshort, foundit, Hirist, Indeed India, **Peerlist**, **Wellfound** | `node local/india-scan/run.mjs --board <name> …` | Prefer **one board** (`--board naukri` or `--board peerlist`) over `--all` |
| **D** | **Pipeline (fit vs profile)** | Opens each shortlisted JD → score A–G → report + tracker | In Cursor: `/career-ops pipeline` | Cap ≤15 Pending URLs; **no auto-apply** |

There is **no** AI suitability step between A/B/C and D — only title/location filters at scan time, then **you shortlist**, then **pipeline**.

### 0.2 Recommended wave order

Career pages are a **side lane** (targeted employers only) — not the daily volume path. Full rationale: **§5.2**.

```text
ONCE:  bootstrap + logins + playwright chromium
DAILY WAVE (priority order):
  1. India boards     → node local/india-scan/run.mjs --board naukri --max-pages 1
                       (also: linkedin, peerlist, cutshort, hirist, instahyre, …)
  2. Remote boards    → npm run scan
                       (includes Speedrun Talent + HN if enabled in portals.yml)
  3. Career pages     → node local/scan-career.mjs --company SAP   # side lane
  4. Startup dir (weekly) → npm run scan:yc  |  npm run scan:seeds  |  node local/scan-companies.mjs "Top Startups"  |  npm run company:funded -- --dry-run
  5. Shortlist        → edit data/pipeline.md  (≤15 Pending)
  6. Evaluate         → /career-ops pipeline
   7. Keepers          → CLI PDF → apply (stop before Submit) → email/contacto → set-status Applied
```

Full platform ranking (Perplexity → our verdict): **§3.5**. Startup directory architecture: **§3.6**.

**Wave hygiene:** Prefer parking/shortlisting over wiping history. To empty Pending only: `node local/reset-scan-inbox.mjs --yes --pipeline-only`. Full rediscovery wipe: `node local/reset-scan-inbox.mjs --yes` (backs up first). To wipe **reports + tracker** (pipeline batch redo): `node local/reset-evaluations.mjs --yes`.

### Pull-safe customization rule (CRITICAL)

**Never edit upstream tracked files for personal workflow** (`scan.mjs`, `.gitignore`, `package.json`, `providers/*`). Those collide on `git pull` / `node update-system.mjs apply`.

| Need | Put it here (gitignored `local/`) |
|---|---|
| Multi-company scan | `node local/scan-companies.mjs SAP,Himalayas` |
| Career pages (SAP, long timeout) | `node local/scan-career.mjs` |
| Reset discovery inbox | `node local/reset-scan-inbox.mjs --yes` |
| Reset reports + tracker | `node local/reset-evaluations.mjs --yes` |
| Clean liveness temp URL lists | `node local/clean-liveness-temps.mjs --yes` |
| India boards | `local/india-scan/` (already pull-safe) |
| Extra ignore patterns | `.git/info/exclude` (machine-local, not committed) |

**Web dashboard:** Results already appear in Pipeline / Today via `pipeline.md` + `scan-history.tsv`. Local discover lives at **`/local`** with focused lanes:

| Route | Purpose |
|---|---|
| `/local` | Overview — run any India / careers / startups action + hygiene + harvest |
| `/local/india` | India boards, health, login |
| `/local/careers` | SAP career pages, multi-company, scan-all portals |
| `/local/startups` | YC / a16z seeds, Speedrun, Top Startups, HN, funded review |
| `/local/companies` | Company directory UI — segregated by `company_kind` / `sap_role` (see §3.7) |


Thin allowlisted spawner over `local/*` scripts — does **not** patch `scan.mjs`. Conflict surface on `git pull` is tiny: `web/src/lib/nav-items.ts` (+ optional Today CTA). Re-add `{ href: "/local", label: "Local", … }` if a pull removes the nav line; the `/local*` pages and `/api/local-tools/*` are additive new files.

**Board health on Local:** `/local/india` has a Portals-style **Check board health** control. It runs `local/india-scan/health.mjs` (India / Peerlist / Wellfound) and `verify-portals.mjs` (enabled remotes + career pages) and lists live / broken / login-needed with a Login affordance for India bot walls.
**SAP is `enabled: false`** so it does not appear as a false “broken” on that check — probe/scan SAP with `node local/scan-career.mjs --company SAP` (or `/local/careers`), not bare `node scan.mjs --company SAP` (10s abort).

### 0.3 All career-ops modes (when to use)

| You want… | Mode / command |
|---|---|
| Paste one JD/URL → full eval + report + tracker | auto-pipeline (paste URL) or `/career-ops oferta` |
| Process Pending inbox | `/career-ops pipeline` |
| Fast first-pass filter before full eval | `/career-ops triage` |
| Compare several offers | `/career-ops ofertas` |
| Discovery remote + all career pages | `npm run scan` |
| Discovery career pages only (fast) | `node local/scan-career.mjs --company SAP` *(not bare `scan.mjs` — SAP is `enabled: false`)* |
| Discovery several career pages (pull-safe) | `node local/scan-companies.mjs EY,"Advance Auto Parts"` |
| Discovery India boards | `node local/india-scan/run.mjs --board naukri --max-pages 1` |
| Discovery Peerlist | `node local/india-scan/run.mjs --board peerlist --max-pages 1` *(login first if Cloudflare)* |
| Discovery Wellfound | `node local/india-scan/run.mjs --board wellfound --max-pages 1` *(login first if DataDome)* |
| Startup dir — YC seeds | `npm run scan:yc` · `node scan-ats-full.mjs --seeds yc --since 7` |
| Startup dir — YC+a16z | `npm run scan:seeds` |
| Startup dir — Top Startups | `node local/scan-companies.mjs "Top Startups"` |
| Startup dir — Speedrun / HN | `node local/scan-companies.mjs "a16z Speedrun Talent"` · `"Hacker News Who is Hiring"` |
| Startup dir — funded review | `npm run company:funded -- --dry-run --limit 25` |
| Company directory harvest | `node local/harvest-companies.mjs` |
| Company directory query | `node local/companies.mjs --summary` · `--kind services` · `--export names` |
| Company directory (dashboard) | http://localhost:3000/local/companies |
| Agent WebSearch discovery (backup only) | `/career-ops scan` / discover — prefer zero-token scanners first |
| Tailored CV PDF | CLI PDF command below (recommended); `/career-ops pdf` (+ optional `--hm-audit`) |
| LaTeX / Overleaf CV | `/career-ops latex` · hand-tuned `.tex`: `latex-tex` |
| Cover letter | `/career-ops cover` |
| Application email draft | `/career-ops email` *(never sends)* |
| Form-fill assist | `/career-ops apply` *(stop before Submit)* |
| Recruiter/HM LinkedIn draft | `/career-ops contacto` |
| Company deep research | `/career-ops deep` |
| Interview prep / plan / practice / debrief | `/career-ops interview-prep`, `interview/plan`, `interview/practice`, `interview/debrief` |
| Red-flag company check | `/career-ops interview-redflag` |
| Offer/contract walkthrough | `/career-ops offer-prep` |
| Tracker status | `/career-ops tracker` · `node set-status.mjs …` |
| Record outcome / archive | `/career-ops outcome` |
| Follow-ups | `/career-ops followup` |
| Classify recruiter replies | `/career-ops reply-watch` |
| Skill gaps from reports | `/career-ops upskill` |
| Rejection / targeting patterns | `/career-ops patterns` |
| Adjacent job titles from CV | `/career-ops titles` |
| Add project/role to CV (confirm first) | `/career-ops add` · `/career-ops expand` |
| Course / portfolio project eval | `/career-ops training` · `/career-ops project` |
| Batch many URLs (CLI workers) | `/career-ops batch` + `batch/batch-runner.sh` |
| Agent inbox (queue for next session) | `/career-ops agent-inbox` |
| System update | `/career-ops update` · `node update-system.mjs check` |
| Reset inbox / scan history | `node local/reset-scan-inbox.mjs --yes` |
| Reset evaluations (reports + tracker) | `node local/reset-evaluations.mjs --yes` |
| Clean liveness temp lists only | `node local/clean-liveness-temps.mjs --yes` |
| Validate portals | `node validate-portals.mjs --file portals.yml` |
| Health remote boards | `npm run verify:portals` |
| Health India boards | `npm run verify:india` |
| Dashboard (web — `web/`) | `cd web && npm ci && npm run dev` → http://localhost:3000 |
| Dashboard Local discover | http://localhost:3000/local · `/local/india` · `/local/careers` · `/local/startups` · `/local/companies` |
| Dashboard TUI (optional Go) | `npm run serve:dashboard` |

### 0.6 Generate one tailored CV PDF from the CLI

The web dashboard is optional. For a single evaluated application, resolve the
report number first, then run the native PDF mode from the repository root. This
path performs the tailoring, HTML build, fact check, Chromium render, and
report-to-PDF indexing without the web envelope transport:

```bash
# Find the report number from the company/role before running the worker.
node find.mjs "BDO India"

# Replace 035 with the report number you want to generate.
copilot -p "Run career-ops pdf mode for report 035. Generate the tailored HTML and PDF using the native CLI workflow. Do not use the web app or submit applications." --allow-all-tools --allow-all-paths --allow-all-urls --silent
```

Use the report number from `reports/{NNN}-*.md`, not an ambiguous tracker row
number. The command writes the tailored files under `output/` and records the
link in `data/pdf-index.tsv`. It never submits an application.

If the tailoring step already produced HTML and only rendering needs to be
retried, bypass the AI worker entirely:

```bash
npm run pdf -- output/cv-guna-sekhar-bdo-india.html output/cv-guna-sekhar-bdo-india-2026-09-14.pdf --format=a4 --report=035 --allow-reorder
```

Replace the HTML/PDF paths and report number for the target application. Use
`--format=letter` for US/Canada roles; use `--format=a4` elsewhere. The PDF
renderer runs the fact gate unless `--skip-fact-check` is explicitly required.

### 0.4 One-time setup (do once)

```bash
npm install
npx playwright install chromium
node doctor.mjs --json
node templates/india-scan/bootstrap.mjs
node local/india-scan/run.mjs --login naukri
node local/india-scan/run.mjs --login linkedin
# optional gated boards:
node local/india-scan/run.mjs --login instahyre
node local/india-scan/run.mjs --login foundit
node local/india-scan/run.mjs --login indeed-india
node local/india-scan/run.mjs --login peerlist
node local/india-scan/run.mjs --login wellfound
```

### 0.5 Copy-paste daily

```bash
# Discovery — India first
node local/india-scan/run.mjs --board naukri --max-pages 1

# Optional: Peerlist / Wellfound (startup + remote-leaning; same india-scan runner)
# node local/india-scan/run.mjs --login peerlist   # once if Cloudflare
# node local/india-scan/run.mjs --board peerlist --max-pages 1
# node local/india-scan/run.mjs --login wellfound  # once if DataDome
# node local/india-scan/run.mjs --board wellfound --max-pages 1

# Discovery — remote aggregators + career pages
npm run scan

# Then in Cursor Agent:
#   1) Shortlist data/pipeline.md to ≤15
#   2) /career-ops pipeline
```

---

## 1. Lifecycle Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│  LAYER A — METADATA (profile.yml + portals.yml + cv.md)        │
│  roles · Mid bias · comp · location · notice · title_filter    │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                │                               │
     HAVE JD + URL                    NO JD / NO URL
                │                               │
                ▼                               ▼
┌──────────────────────────┐     ┌──────────────────────────────┐
│  auto-pipeline / oferta   │     │  DISCOVERY (₹0)               │
│  = fitness evaluation    │     │  A Remote   npm run scan      │
│                          │     │  B Career   (same scan)       │
│  Score A–G + report      │     │  C India    local/india-scan  │
│  Fit? ──no──► Discard    │     │  → shortlist pipeline.md      │
│   │ yes                  │     └──────────────┬───────────────┘
│   ▼                      │                    │
│  pdf → apply assist      │                    ▼
│  email / contacto        │         /career-ops pipeline  (paid)
│  set-status Applied      │         (= same fitness evaluation)
└──────────────────────────┘
```

**Hard rule:** never auto-submit. Draft/fill only — you click Submit/Send/Apply.

**Targeting:** Full Stack · Backend · AI Engineering · SAP BTP Developer/Consultant · SAP CPI Consultant · **~2.3 YOE**.

---

## 2. Layer A — Metadata (source of truth + focus)

Yes — personal targeting comes primarily from **`config/profile.yml`**. Discovery scanners then enforce a subset of that intent via **`portals.yml`** (and india-scan keywords). Evaluation / CV / outreach use profile + `cv.md` + `modes/_profile.md`.

### 2.1 What we are focusing on (north star)

| Focus | Value | Source |
|---|---|---|
| Candidate | Guna Sekhar · Hyderabad, Telangana, India · IST | `profile.yml` → `candidate` / `location` |
| Primary roles | Full Stack · Backend SE · AI Engineer · SAP BTP Developer/Consultant · SAP CPI Consultant | `profile.yml` → `target_roles.primary` |
| Experience | **~2.3 years** | `profile.yml` → `target_roles.years_experience` · `cv.md` Summary |
| Archetypes (scoring) | Full Stack · Backend SE · AI Engineer · SAP BTP Developer · SAP BTP Consultant · SAP CPI Consultant (all Mid, primary) | `profile.yml` → `target_roles.archetypes` |
| Headline | Full Stack · Backend · AI Engineering · SAP BTP & CPI | `profile.yml` → `narrative.headline` |
| Positioning | Full-stack/backend engineer (~2.3 YOE) who bridges AI systems and SAP BTP / CPI | `profile.yml` → `narrative.exit_story` + `modes/_profile.md` |
| Level bias | **Mid** — skip Staff / Principal / Manager / Architect / Intern unless overridden | `profile.yml` archetypes + `modes/_custom.md` + `portals.yml` `title_filter.negative` |
| Comp | **₹122,400–150,000 INR** (walk-away **₹122,400**) | `profile.yml` → `compensation` |
| Location / work style | Hyderabad base; open to **remote, hybrid, or on-site** based on fit | `profile.yml` → `location` + `compensation.location_flexibility` |
| Notice period | **60 days** | `profile.yml` → `cover_letter.notice_period_days` |
| Domain (cover letters) | backend software engineering, AI integration, and SAP BTP / CPI enterprise integration | `profile.yml` → `cover_letter.primary_domain` |
| Output language | English (`en`) | `profile.yml` → `language.output` |
| Spend tier (evals) | `standard` | `profile.yml` → `spend_tier` |
| Apply score gate | Below **4.0/5** → recommend against applying | `modes/_custom.md` |
| Batch size | Cap ~15 listings per evaluation batch | `modes/_custom.md` |
| CV truth | `cv.md` (canonical) | project root |
| Portfolio | https://sekharguna.com | `profile.yml` → `candidate.portfolio_url` |

**Out of scope by default:** Frontend-only, Full Stack-only, Architect, Manager, Staff, Principal, Intern/Fresher, ABAP-heavy SAP tracks unrelated to BTP/CPI, DevRel / PM / mobile / PHP / .NET / Java-heavy titles (see `title_filter.negative`).

### 2.2 Full metadata map — `profile.yml` fields we use

| Block in `config/profile.yml` | Current values (summary) | Used by |
|---|---|---|
| `candidate.*` | name, email, phone, Hyderabad, LinkedIn, portfolio, GitHub | PDF / email / contacto / cover / apply drafts |
| `target_roles.primary` | Backend SE, AI Engineer, SAP BTP, SAP CPI | Evaluation framing; india-scan keyword inspiration |
| `target_roles.archetypes` | Mid · primary/secondary fits above | Score fit / archetype detection |
| `narrative.headline` | Backend + AI + SAP BTP headline | Summaries / PDF / outreach |
| `narrative.exit_story` | Backend → AI → SAP landscape bridge | Reports, STAR framing |
| `narrative.superpowers` | FastAPI/Node, MCP↔SAP, CPI, OAuth/API security, CI/CD | Proof emphasis in evals |
| `narrative.proof_points` | 20+ iFlows · 250+ tests · ~70% CF cost cut · FastAPI MCP→iFlow | Reports / interview / PDF (never fabricate beyond these + `cv.md`) |
| `compensation.*` | 122400–150000 INR · min 122400 · flexible location | Negotiation / offer scoring context |
| `location.*` | India · Hyderabad · IST | Forms, remote scoring policy |
| `language.output` | `en` | All human-facing prose |
| `spend_tier` | `standard` | Which model tier evaluates offers |
| `cover_letter.notice_period_days` | `60` | Cover letter / apply when JD asks start date |
| `cover_letter.primary_domain` | backend + AI + SAP BTP/CPI | Domain-gap notes in cover flow |
| `contact_preferences` | prefer email | email / contacto CTAs |
| `cv.output_format` | `html` | PDF path default |

Related user-layer files (not inside `profile.yml` but part of the same metadata layer):

| File | Role |
|---|---|
| `cv.md` | Canonical experience / skills — evaluation + PDF source of truth |
| `modes/_profile.md` | Archetype framing, adaptive emphasis, location scoring policy |
| `modes/_custom.md` | Procedural house rules (Cursor, batch cap, 4.0 gate, india-scan SOP) |
| `article-digest.md` | Optional extra proof points (if present) |

### 2.3 Discovery filters — `portals.yml` (enforces focus at scan time)

These are the machine gates that `npm run scan` and `local/india-scan` share for title/location:

| Gate | Current setting | File |
|---|---|---|
| `title_filter.positive` | Full Stack · Backend · Software Engineer · AI / GenAI / LLM · SAP BTP / CPI / Integration | `portals.yml` |
| `title_filter.negative` | Junior, Intern, Frontend-only, Manager, Architect, Principal, Head, DevRel, PM, mobile, PHP, .NET, Java, classic SAP modules, … | `portals.yml` |
| `location_filter.allow` | Remote, Anywhere, Worldwide, India, Hyderabad, Bangalore/Bengaluru, Pune, Chennai, Gurgaon/Gurugram, Noida, Delhi, Mumbai | `portals.yml` |
| `max_posting_age_hours` | **24** (hard cutoff; shared by `npm run scan` and india-scan) | `portals.yml` |
| `priority_posting_age_hours` | **24** (sort only; same window as the cutoff) | `portals.yml` |
| `max_posting_age_days` | 45 (legacy; ignored while hours key is set) | `portals.yml` |
| `salary_filter` | **Not set** (comp lives in profile for evaluation/negotiation, not hard scan drop) | — |
| India search keywords | full stack · backend · software engineer · ai engineer · sap btp developer/consultant · sap cpi consultant | `local/india-scan/config.yml` |
| India city facets | default all-India; LinkedIn `linkedin_days: 1`; `linkedin_remote_only: false` | `local/india-scan/config.yml` |

**How profile vs portals split work:**

```text
profile.yml  →  who you are + what you want (roles, comp, narrative, notice, level)
portals.yml  →  what discovery is allowed to keep (title + location + 24h age)
india-scan   →  which boards/keywords/cities to query (+ board-native 1-day URL facets), then portals gates
evaluation   →  reads profile + cv + _profile to score shortlisted JDs
```

### 2.4 Company-type preference (to formalize)

Intended filter buckets (not yet hard-coded in `profile.yml`):

- **Product companies** — preferred for Backend / AI engineering depth
- **Startups** — acceptable when role is Mid Backend / AI and stack matches
- **Service / consulting** — acceptable especially for SAP BTP / CPI delivery roles (e.g. Deloitte SA, SAP partners)

Until written into `profile.yml` / `_profile.md` as explicit prefs, evaluation uses role/stack fit only.

### 2.5 Preference cheat-sheet (edit here)

| Preference | Current value / intent | Where it lives |
|---|---|---|
| Notice period | **60 days** | `config/profile.yml` → `cover_letter.notice_period_days` |
| Salary | **₹122,400–150,000 INR** (min 122,400) | `config/profile.yml` → `compensation` |
| Home base | Hyderabad, India (IST) | `config/profile.yml` → `candidate.location` / `location` |
| Discovery locations | Hyderabad + India metros + Remote | `portals.yml` → `location_filter` |
| Work style | Open to remote / hybrid / on-site based on fit | `config/profile.yml` → `compensation.location_flexibility` |
| Target roles | Backend SE, AI Engineer, SAP BTP / CPI | `config/profile.yml` → `target_roles`; `modes/_profile.md` |
| Level bias | **Mid** | archetypes + `modes/_custom.md` + `title_filter.negative` |
| CV | Present | `cv.md` |
| Procedural rules | Cursor Pro, batch caps, india-scan | `modes/_custom.md` |
| Company type | **Not fully formalized yet** | add under `profile.yml` / `_profile.md` |
| Freshness | **24 hours** | `portals.yml` → `max_posting_age_hours` (+ India board-native 1-day URL facets) |

---

## 3. Layer B — What we search for, and which portals

### Jobs in scope

Aligned with `profile.yml` `target_roles`:

- Backend Software Engineer / Backend Developer
- Software Engineer (backend-leaning; Mid)
- AI Engineer (backend + AI integration, MCP, GenAI, FastAPI)
- SAP BTP Consultant / Developer
- SAP CPI / Integration Suite / Integration Consultant

Out of scope by default: Frontend-only, Full Stack-only, Architect, Manager, Staff, Principal, Intern/Fresher, ABAP-heavy SAP tracks unrelated to BTP/CPI.

### CV

- Canonical: `cv.md`
- Optional variants may exist locally (`cv.software-ai.md`, `cv.sap-btp.md`) — keep `cv.md` as evaluation source of truth unless you explicitly switch

### Portal buckets

| Bucket | Focus boards | Status in career-ops |
|---|---|---|
| **Remote (foreign + remote-first)** | See **Remote boards status** table below | Most live via `npm run scan` |
| **Remote / ATS WebSearch assist** | Ashby, Greenhouse, Lever, Workable, YC, ai-jobs.net | Queries enabled in `portals.yml` `search_queries` (agent path) |
| **Indian + Peerlist/Wellfound** | Naukri, LinkedIn India, Instahyre, Cutshort, Hirist, foundit, Indeed India, Peerlist, Wellfound, Apna | **All except Apna live** via `local/india-scan/` (dashboard-tracked); Apna deferred — see §5–§6 |
| **Direct career pages** | SAP + optional EY / Advance Auto Parts (add employers on request) | SuccessFactors / Phenom via `local/scan-career.mjs` — **side lane**, see **§5.2** |

### Remote boards status

Three-way split for remote / remote-first aggregators (Layer A filters still apply after fetch):

| Implemented (live in `npm run scan`) | Also via `india-scan` (Playwright) | Off on purpose (not a scan bug) |
|---|---|---|
| Himalayas | **Peerlist** — `node local/india-scan/run.mjs --board peerlist --max-pages 1` (+ `--login peerlist`; Cloudflare) | FlexJobs *(paywall)* |
| 4 Day Week | **Wellfound** — `node local/india-scan/run.mjs --board wellfound --max-pages 1` (+ `--login wellfound`; DataDome) | Turing *(contractor marketplace, not FT board)* |
| RemoteOK | | TrulyRemote / Flexa *(tiny overlap with boards above)* |
| Remotive | | SimplyHired India *(noise; India boards cover this)* |
| NoDesk | | |
| We Work Remotely | | |
| Working Nomads | | |
| Jobicy | | |
| EchoJobs | | |
| Jobspresso | | |
| The Muse | | |
| **JustRemote** | | |
| **a16z Speedrun Talent** *(startup dir)* | | |
| **Top Startups** *(startup dir — remote funded)* | | |
| **Hacker News Who’s Hiring** *(startup dir)* | | |
| Remote.co *(left off — WAF)* | | |
| Hubstaff Talent *(left off — freelance)* | | |

**Remote scan E2E (working):** `npm run scan` / `node scan.mjs --company Himalayas` fetches → Layer A filters → writes `data/pipeline.md` + `scan-history.tsv`. Health on 2026-08-08: **16 live, 0 unresolved** (SAP was already off this path). **0 keepers is a filter outcome, not a broken board.**

`/career-ops pipeline` is a **later** step (evaluate shortlisted JDs). It is not part of remote-board health. A large inbox full of Senior/US or Naukri-login URLs is a shortlist/login issue, not “remotes failed.”

#### Remote boards — search / next-page / freshness

What the scanner actually hits. **Browse** is the human listing when the scanner uses an API/RSS dump. `?page=` only when that board paginates.

**Freshness (last 24 hours by default):** most remote boards dump a full feed; career-ops then drops old rows **after fetch** if the provider sent `postedAt`. Jobs with **no date always pass**.

| Want | How |
|---|---|
| Last **24 hours** (default) | `portals.yml` → `max_posting_age_hours: 24` |
| Last **2** days this run | `node scan.mjs --since 2` (AND with the standing hours cap; the **newest** bound wins) |
| Last **7** days | `node scan.mjs --since 7` |
| Since a calendar date | `node scan.mjs --posted-after 2026-08-17` |
| Default standing cap | `portals.yml` → `max_posting_age_hours: 24` |

Examples use *full-stack engineer* (or the board’s default role).

| Board | Fetch | Search / listing (page 1) | Next page | Freshness / last N days |
|---|---|---|---|---|
| Himalayas | JSON API (full dump, no paging) | Scanner: `https://himalayas.app/jobs/api?limit=50` · Browse: [himalayas.app/jobs/full-stack-engineer](https://himalayas.app/jobs/full-stack-engineer) | Browse only: […/full-stack-engineer?page=2](https://himalayas.app/jobs/full-stack-engineer?page=2) | **After fetch** (`max_posting_age_hours: 24` / `--since N`). API `pubDate` present. Browse URL has **no** date query in the scanner. |
| 4 Day Week | JSON API, 25/page (newest-first) | `https://4dayweek.io/api/jobs?page=1` | `https://4dayweek.io/api/jobs?page=2` | **After fetch**. No `?days=` on the API. `--since 2` keeps recent pages only. |
| RemoteOK | JSON API (full dump) | `https://remoteok.com/api` | — (single dump) | **After fetch** (`epoch` date on jobs). `--since 2`. |
| Remotive | JSON API (full dump) | `https://remotive.com/api/remote-jobs` | — (single dump) | **After fetch**. `--since 2`. |
| NoDesk | RSS (full dump) | `https://nodesk.co/remote-jobs/index.xml` | — | **After fetch** if RSS `pubDate` parses. `--since 2`. |
| We Work Remotely | RSS (full dump) | `https://weworkremotely.com/remote-jobs.rss` | — | **After fetch** (RSS date). `--since 2`. |
| Working Nomads | JSON API (full dump) | `https://www.workingnomads.com/api/exposed_jobs/` | — | **After fetch**. `--since 2`. |
| Jobicy | JSON API (capped dump) | `https://jobicy.com/api/v2/remote-jobs?count=50` | — (`count=` cap, not pages) | **After fetch**. `--since 2`. |
| EchoJobs | JSON API | `https://echojobs.io/api/jobs?per_page=100&page=1` | `https://echojobs.io/api/jobs?per_page=100&page=2` | **After fetch**. `--since 2`. |
| Jobspresso | RSS (full dump) | `https://jobspresso.co/?feed=job_feed` | — | **After fetch** (RSS date). `--since 2`. |
| The Muse | JSON API (0-based pages) | `https://www.themuse.com/api/public/jobs?page=0` | `https://www.themuse.com/api/public/jobs?page=1` | **After fetch**. API has no `fromage`. `--since 2`. |
| JustRemote | SSR HTML (one listing) | `https://justremote.co/remote-developer-jobs` | — (no `?page=` in provider) | **After fetch** only if a date is parsed; otherwise undated rows **keep**. No `?days=` in URL. |
| a16z Speedrun Talent | JSON API | `https://speedrun-talent-network.com/api/v1/jobs?page=0&source=career-ops` | `…/jobs?page=1&source=career-ops` | **After fetch**. `--since 2`. |
| Top Startups | SSR HTML | `https://topstartups.io/jobs/?job_location=Remote&role=Software%20Engineer` | `…&page=2` | **After fetch** (“Posted: N days ago” → `postedAt`). No date query on listing. `--since 2`. |
| Hacker News Who’s Hiring | Algolia → thread | Threads: `https://hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring&hitsPerPage=5` · Thread: `https://news.ycombinator.com/item?id={id}` | — (monthly thread) | Thread is the current month’s post, not a last-N-days job filter. `--since` still applies to parsed comment dates when present. |
| Remote.co *(left off)* | Category HTML | `https://remote.co/remote-jobs/developer/` | — | Off on purpose (WAF), not a remote-scan failure. |
| Hubstaff Talent *(left off)* | Search HTML | `https://talent.hubstaff.com/search/jobs?search%5Bkeywords%5D=full+stack&search%5Btype%5D=all` | — | Off on purpose (freelance). |

Providers that already exist in career-ops but are **not** in your `tracked_companies` yet (optional enable, not “build from scratch”): Landing.jobs, Get on Board, Arbeitnow, LaraJobs, CryptocurrencyJobs.

**Indian boards (Playwright, zero/low LLM cost) — all via `local/india-scan/`.** Keywords come from `local/india-scan/config.yml` (example: `full stack engineer`). Default location is all India; a city in config narrows Foundit/Hirist/Indeed/etc.

**Freshness on India (two layers):**

1. **Board-native URL facet** (last day) when the site exposes one — see table.
2. **After fetch:** `portals.yml` → `max_posting_age_hours: 24` on any card that carried a parseable date. Undated cards keep. Same company+role across boards is deduped in the same run (`companyRoleDedupKey`), in addition to URL dedup vs `scan-history.tsv`.

There is no `--since` CLI on `run.mjs`; change the standing hours key or the board URL param (e.g. LinkedIn `linkedin_days`) instead.

| Board | Status | Search URL (page 1) | Next page | Freshness / last day |
|---|---|---|---|---|
| Naukri | live | `https://www.naukri.com/full-stack-engineer-jobs?jobAge=1` | `…-jobs-2?jobAge=1` (then `-3`, …) | **In URL:** `jobAge=1` (Freshness “1 day”). Card text still parsed for the 24h post-filter. |
| LinkedIn India | live — guest listing endpoint | `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=full+stack+engineer&start=0&sortBy=DD&geoId=102713980&f_TPR=r86400` | `start=10` (10 per request; 3 requests ≈ one config page) | **In URL:** `f_TPR=r86400` (“Past 24 hours”). `linkedin_days: 1` in `config.yml`. Remote-only adds `f_WT=2`. |
| Instahyre | live — login; Cloudflare | `https://www.instahyre.com/search-jobs?skills=full+stack+engineer&search=true` | `offset=20` / Next | **No day facet** on the site. Undated cards keep; rely on title/location + other boards. |
| Cutshort | live | `https://cutshort.io/search-jobs?free_text=full%20stack%20engineer&hiringActivityOnJob=1-days` | (site returns ~10; no pager in scraper) | **In URL:** `hiringActivityOnJob=1-days`. |
| foundit | live — login; Akamai | `https://www.foundit.in/search/full-stack-engineer-jobs?start=1&limit=20&query=full+stack+engineer&locations=india&queryDerived=true&jobFreshness=1` | `start=21` (then 41, …) | **In URL:** `jobFreshness=1`. |
| Hirist | live | `https://www.hirist.tech/c/full-stack-jobs?ref=topnavigation&minexp=0&maxexp=30&posting=3` (SAP → `/c/platform-engineering-sap-oracle-jobs`; backend → `/c/backend-development-jobs`) | `&page=2` | **In URL:** `posting=3` (Hirist recent facet). |
| Indeed India | live — login; bot checks | `https://in.indeed.com/jobs?q=full+stack+engineer&l=India&fromage=1&radius=100&sort=date&start=0` | `&start=10` (10 per page) | **In URL:** `fromage=1` (“last 24 hours”) + `sort=date`. |
| Peerlist | live — login; Cloudflare | `https://peerlist.io/jobs/role/full-stack-engineer` | scroll / more rows | **No day facet.** “Nd ago” text parsed when present → 24h post-filter. |
| Wellfound | live — login; DataDome | `https://wellfound.com/role/l/full-stack-engineer/india` (backend → `/role/l/backend-engineer/india`) | `?page=2` | **No day facet.** “N days ago” text parsed when present → 24h post-filter. |
| Apna | deferred | — | — | — |

Not in default `config.yml` `boards:` list historically — Peerlist / Wellfound are in this checkout’s `boards:`; still runnable with `--board peerlist` / `--board wellfound`.

Rows land on the **web dashboard** (Pipeline + What's New) the same way as `npm run scan`.

**Direct career pages (live):**

- SAP (`jobs.sap.com`, SuccessFactors) — **§5.2** (side lane; **`enabled: false`** on main scan; use `local/scan-career.mjs`)
- EY (`careers.ey.com/ey/`, SuccessFactors) — **§5.2** (optional; high noise)
- Advance Auto Parts (`jobs.advanceautoparts.com`, Phenom IT) — **§5.2** (optional)
- Add more only when you name an employer; use `local/scan-career.mjs` after wiring `provider:`

### 3.5 Discovery priority map (Perplexity hierarchy → our verdict)

External ranking adapted for **Guna · Hyderabad · Full Stack / Backend / AI / SAP BTP·CPI · Mid · India+Remote**.  
Rule: **implement / run what compounds discovery**; skip paywalls, freelance marketplaces, and research-only databases as daily scanners.

#### Priority lanes (what to run)

| Pri | Lane | Platforms | How |
|---|---|---|---|
| **1 Essential** | India Playwright | LinkedIn, Naukri | `local/india-scan --board linkedin\|naukri` |
| **1 Primary** | India Playwright | Peerlist, Cutshort, Hirist, Instahyre (+ Wellfound) | same runner; in `config.yml` `boards:` |
| **2 Primary** | Remote HTTP | Himalayas, Remotive, RemoteOK, Working Nomads, NoDesk, JustRemote, … | `npm run scan` |
| **3 Side** | Career pages | SAP (+ optional EY / AAP) | `local/scan-career.mjs` — **§5.2** |
| **4 Weekly** | Startup directory | YC/a16z seeds, Speedrun Talent, HN, **Top Startups**, company-funded | see **§3.6** |
| **— Skip / research** | Waste or DB-only | Turing, Flexa, FlexJobs, Dealroom, Crunchbase, First Round (no jobs API), Apna, … | table below |

#### Full Perplexity list → career-ops action

| Rank | Platform | Perplexity | Our verdict | Status in this checkout |
|---|---|---|---|---|
| 1 | LinkedIn | Essential | **Keep — essential** | india-scan ✅ |
| 2 | Naukri | Essential | **Keep — essential** | india-scan ✅ |
| 3 | Peerlist | Primary | **Keep — primary** | india-scan ✅ (now in default `boards:`) |
| 4 | Cutshort | Primary | **Keep — primary** | india-scan ✅ |
| 5 | Hirist | Primary | **Keep — primary** | india-scan ✅ |
| 6 | Instahyre | Primary | **Keep — primary** | india-scan ✅ |
| 7 | Himalayas | Primary | **Keep — primary** | `npm run scan` ✅ |
| 8 | Remotive | Primary | **Keep — primary** | ✅ |
| 9 | Remote OK | Primary | **Keep — primary** | ✅ |
| 10 | YC Jobs | Primary | **Startup dir** — seeds, not WAAS scrape | `npm run scan:yc` ✅ |
| 11 | Turing | Primary | **Skip** — contractor marketplace | waste |
| 12 | Flexa | High | **Skip** — overlap / thin | waste |
| 13 | Remote.co | High | **Left off on purpose** — WAF; not a remote-scan defect | provider `enabled: false` |
| 14 | Working Nomads | High | **Keep** | ✅ |
| 15 | NoDesk | High | **Keep** | ✅ |
| 16 | Welcome to the Jungle | Good (EU) | **Optional later** — EU-heavy; provider `wttj` unwired | not enabled |
| 17 | Indeed India | Secondary | **Keep selective** | india-scan ✅ |
| 18 | First Round Companies | Research | **Research only** — no public jobs aggregate API (talent portal / Ashby for FR itself) | manual browser |
| 19 | 4 Day Week | Niche | **Keep niche** | ✅ |
| 20 | Jobspresso | Secondary | **Keep** | ✅ |
| 21 | TrulyRemote | Secondary | **Skip** | waste |
| 22 | JustRemote | Secondary | **Keep** | ✅ |
| 23 | Speedrun Companies | Research | **Startup dir** — live board | `a16z-speedrun-talent` ✅ enabled |
| 24 | Top Startups | Research | **Startup dir / weekly** — real remote job board (was mis-labeled listicle) | `topstartups` ✅ enabled |
| 25 | RemoteWeek | Secondary | **Skip** — missing / low signal | — |
| 26 | Foundit | Selective | **Keep selective** | india-scan ✅ |
| 27 | Dealroom | Research only | **Research only** — company DB, not a job feed | — |
| 28 | Crunchbase | Research only | **Research only** — funding DB (funded lane uses TC/HN, not CB scrape) | — |
| 29 | Jobs24x | Low-medium | **Skip** | — |
| 30 | Remote100K | Low | **Skip** | — |
| 31 | Hubstaff Talent | Freelance | **Off** unless freelancing | disabled |
| 32 | SimplyHired India | Low | **Skip** | waste |
| 33 | FlexJobs | Optional | **Skip** — paywall | waste |
| 34 | Apna | Lowest | **Deferred** | planned only |

Also keep (ours, not in Perplexity top list): **Wellfound** (india-scan), **We Work Remotely**, **Jobicy**, **The Muse**, **Hacker News Who’s Hiring**, career pages **SAP**.

### 3.6 Startup directory lane (YC / a16z / Speedrun / funded)

These are **not** the same as Naukri-style boards. They discover **companies** (or portfolio feeds), then jobs:

```text
┌──────────────────────────────────────────────────────────┐
│  STARTUP DIRECTORY (weekly / on-demand)                  │
├──────────────────────────────────────────────────────────┤
│  A. VC portfolio seeds                                   │
│     npm run scan:yc          → YC companies → ATS probe  │
│     npm run scan:seeds       → YC + a16z portfolios      │
│     (seeds/vc-portfolios.mjs → scan-ats-full.mjs)        │
│                                                          │
│  B. Portfolio / funded job boards (HTTP providers)       │
│     a16z Speedrun Talent     → portals.yml enabled       │
│     Top Startups (remote)    → portals.yml enabled       │
│     HN Who is Hiring         → portals.yml enabled       │
│     Getro / Consider         → optional EU VC boards     │
│                                                          │
│  C. Recently funded (review list — no auto-apply)        │
│     npm run company:funded   → TechCrunch/HN/… shortlist │
│     Then: add careers_url OR Explore / scan --company    │
│                                                          │
│  D. Research-only directories (manual browser)              │
│     First Round Talent · Dealroom · Crunchbase           │
│     Speedrun “companies” page (use Talent board instead) │
│     → pick companies → paste careers URL → career page   │
└──────────────────────────────────────────────────────────┘
                              │
                              ▼
              same pipeline.md → shortlist → /career-ops pipeline
```

#### Similar “startup directory” sites — what we wire vs research

| Site | Kind | Wire? | Why |
|---|---|---|---|
| **Top Startups** ([topstartups.io/jobs](https://topstartups.io/jobs/?job_location=Remote)) | Remote/funded **job board** (SSR HTML) | **Yes** — `provider: topstartups` | Real apply links to Greenhouse/Ashby/…; Remote filter; weekly lane |
| **a16z Speedrun Talent** | Portfolio **job API** | **Yes** — already enabled | Structured feed |
| **HN Who’s Hiring** | Monthly thread | **Yes** — `hackernews` | High-signal startups |
| **YC Work at a Startup / portfolio** | Company seeds → ATS | **Yes** — `npm run scan:yc` / `scan:seeds` | Seed probe, not a WAAS HTML scrape |
| **First Round Talent / Companies** | Recruiter/talent portal + company list | **No scraper** | No public jobs aggregate; browse manually → careers URL / Explore |
| **Dealroom** | Startup **database** | **No** | Research / investor intel only |
| **Crunchbase** | Funding **database** | **No** | Research; funded shortlist uses `company:funded` (TC/PR/HN), not CB |
| **Top Startups company index** (`/`) | Startup listicle / profiles | **No** (jobs path only) | Use `/jobs/?job_location=Remote` |
| **Speedrun companies directory** | Portfolio marketing | **No** | Prefer Speedrun Talent job board |

| Tool | Command | Writes pipeline? |
|---|---|---|
| YC portfolio → ATS | `npm run scan:yc` · `node scan-ats-full.mjs --seeds yc --since 7` | Yes (matches) |
| YC + a16z seeds | `npm run scan:seeds` | Yes |
| Speedrun Talent board | `node local/scan-companies.mjs "a16z Speedrun Talent"` · Local → Speedrun button | Yes |
| Top Startups (remote) | `node local/scan-companies.mjs "Top Startups"` · Local → Top Startups button | Yes |
| HN Who’s Hiring | `node local/scan-companies.mjs "Hacker News Who is Hiring"` · included in `npm run scan` | Yes |
| Funded companies review | `npm run company:funded -- --dry-run --limit 25` | **No** — review JSON/report only |
| Getro / Consider VC boards | copy from `templates/portals.example.yml` when you want EU portfolios | Yes if enabled |

**Dashboard:** `/local` (run-everything) · `/local/startups` (focused lane).

**Do not** treat Dealroom/Crunchbase/First Round as scrapers — use them for company research, then wire a careers URL if you want ongoing coverage.

### 3.7 Company directory (future targeting)

Discovery already fills `pipeline.md` / `scan-history.tsv`. The **company directory** is a durable employer list you can query later when you want to apply at those firms on purpose — CLI **and** dashboard.

```text
scan / india-scan / startups
        │
        ▼
data/scan-history.tsv + data/pipeline.md
        │
        ▼  node local/harvest-companies.mjs
           (or /local → Refresh company directory)
local/company-registry.yml  ──►  data/companies.tsv
        │
        ├──► CLI:  node local/companies.mjs --summary | --kind | --sap | --export names
        └──► UI:   /local/companies  (segregated tables + filters)
   later: target careers / shortlist by kind
```

**Taxonomy (exact labels):**

| Field | Values |
|---|---|
| `company_kind` | `product` · `services` · `startup` · `mixed` · `unknown` |
| `sap_role` | `sap_partner_si` · `unknown` (only partners are flagged; everyone else is `unknown`) |
| `confidence` | `high` (registry) · `medium` (heuristic) · `low` |

**Rules:** registry in [`local/company-registry.yml`](../local/company-registry.yml) for known SI / SAP / products. Heuristics for services markers and startup-leaning sources. **Never** auto-set `sap_customer` without JD or manual edit.

**TSV columns** (`data/companies.tsv`, user layer, created on first harvest):

```text
company_key  display_name  company_kind  sap_role  confidence  sources  first_seen  last_seen  sample_titles  notes
```

#### Dashboard UI (`/local/companies`)

| Control | What it does |
|---|---|
| **Kind chips** (`product · N`, `services · N`, …) | Filter + segregate by `company_kind` |
| **SAP chips** (`sap_partner_si · N`, …) | Filter + segregate by `sap_role` |
| **Segregate by** dropdown | Group tables by kind **or** SAP role |
| Kind / SAP / Search filters | Narrow the list further |
| **Refresh directory** | Runs `local/harvest-companies.mjs`, then reloads the table |
| Grouped tables | Company · Kind · SAP · Conf · Sources · Sample titles |

Also linked from **`/local` Overview** → Company directory → **View segregated list →**. Local subnav tab: **Companies**.

API (read-only): `GET /api/local-tools/companies` → JSON from `data/companies.tsv`.

Implementation files (pull-safe / additive):

| Path | Role |
|---|---|
| `web/src/app/local/companies/page.tsx` | Page shell |
| `web/src/components/local-tools/local-companies-panel.tsx` | Segregated UI |
| `web/src/lib/companies-directory.ts` | TSV → JSON |
| `web/src/app/api/local-tools/companies/route.ts` | Read API |
| `local/harvest-companies.mjs` · `local/companies.mjs` | Harvest + CLI |
| `local/company-registry.yml` | Curated labels |

#### CLI commands

```bash
node local/harvest-companies.mjs              # upsert from scans
node local/companies.mjs --summary
node local/companies.mjs --kind services
node local/companies.mjs --sap sap_partner_si
node local/companies.mjs --export names --kind product
```

**Dashboard quick path:** `cd web && npm run dev` → http://localhost:3000/local/companies

**Later:** upgrade rows from `/career-ops pipeline` JD evidence (e.g. confirm `sap_customer`).

### Metadata filters on Indian boards (yes — all of them)

`local/india-scan/` runs the **same** Layer A gates from `portals.yml` on **every** implemented board (naukri, linkedin, instahyre, cutshort, foundit, hirist, indeed-india, peerlist, wellfound):

| Gate | Applied? | Source |
|---|---|---|
| `title_filter` | **Yes** | `portals.yml` via `scan.buildTitleFilter` |
| `location_filter` | **Yes** | `portals.yml` via `scan.buildLocationFilter` (location text, URL hint, remote-in-title fallback) |
| Dedup vs `scan-history.tsv` | **Yes** | same URL normalizer as `npm run scan` |
| Cross-board company+role dedup | **Yes** | same-run `companyRoleDedupKey` (Naukri + LinkedIn same opening → one row) |
| `max_posting_age_hours` | **Yes** (24h hard cutoff) | `portals.yml` via `scan.buildPostingAgeFilter` |
| Board-native 1-day URL facets | **Yes** where the site has one | Naukri / LinkedIn / Hirist / Cutshort / Foundit / Indeed |
| `salary_filter` | **No** (not wired in india-scan yet) | only `npm run scan` today |

**Important nuances (remote vs city):**

1. Your current `location_filter.allow` includes **both** `Remote` **and** India metros (Hyderabad, Bangalore, …). So india-scan will keep on-site Hyderabad roles *and* remote roles — that matches “India + Remote”, not “remote-only”.
2. To keep **remote-only**, tighten `location_filter.allow` to markers like `Remote` / `Anywhere` / `Worldwide` (and drop city names). Titles that clearly say Remote can still pass via `titleSignalsRemote`.
3. Missing location on a card **still passes** (same “don’t penalize missing data” rule as `scan.mjs`). Some India boards scrape thin cards → more empties → more pass-throughs.
4. **Search URL facets** are separate from post-filters: Foundit / Hirist / Indeed still *query* a city from `config.yml` (`foundit_city`, `hirist_location`, `indeed_location`). LinkedIn alone has a scrape-time remote facet (`linkedin_remote_only: true` → `f_WT=2`). Post-filter then drops what doesn’t match `location_filter`.

So: metadata filtering **is applied to all Indian boards equally** after scrape; it is **not** a per-board remote toggle except LinkedIn’s `linkedin_remote_only`.

### Tightening India discovery (filter as much as possible — ₹0)

Goal: shrink what lands in `data/pipeline.md` **before** `/career-ops pipeline`, without spending LLM tokens. Same idea for remote (`npm run scan`): cheap filters first; AI only on a shortlist.

**What india-scan does today (no AI):** search cards (board-native 1-day facets where available) → `title_filter` + `location_filter` + `max_posting_age_hours` + URL/company+role dedup → inbox. It does **not** open each JD for YOE / skills / employment type. That detail needs `/career-ops pipeline` (or an optional future cheap AI pre-match, off by default).

#### Levers you can tighten now

| Lever | Where | Effect |
|---|---|---|
| Fewer / sharper keywords | `local/india-scan/config.yml` → `keywords` | **Biggest win.** Drop broad `software engineer`; keep `backend engineer`, `ai engineer`, `sap btp`, `sap cpi` |
| Fewer pages | `--max-pages 1` or `max_pages: 1` | Less noise per keyword |
| Lower inbox cap | `max_new_offers: 10–15` | Hard ceiling on new URLs per run |
| Tighter title positives | `portals.yml` → `title_filter.positive` | Drop bare `Software Engineer` / `Software Developer` / lone `CPI` so only Backend / AI / SAP BTP–CPI-ish titles pass |
| More title negatives | `portals.yml` → `title_filter.negative` | Add e.g. `Lead`, `Team Lead`, `Fresher`, `Associate`, `Instructor`, `Laravel`, `Contract` as needed |
| Narrower locations | `portals.yml` → `location_filter.allow` | e.g. `Hyderabad` + `Remote` (+ maybe Bangalore) instead of all metros |
| LinkedIn remote facet | `linkedin_remote_only: true` | LinkedIn search-only; other boards still city-search then post-filter |
| City search facets | `foundit_city` / `hirist_location` / `indeed_location` | Keep Hyderabad-focused queries |
| Fewer boards per day | `boards:` list or `--board naukri` | Don’t run all 7 every day |

Example from a LinkedIn run: ~70 parsed cards → **52** dropped by title → **7** new inbox rows. Filters already work; leftovers still need human/AI judgment.

#### Hard ceiling without AI (card scrape cannot do)

- Years of experience demanded  
- Full skill / stack requirements from the JD body  
- Remote vs on-site when the card is vague or location is empty  
- Mid vs Senior when the title only says “Software Engineer”  

Empty location **still passes** (“don’t penalize missing data”), so location tightening is imperfect.

#### Recommended “as tight as free gets” recipe (to apply next)

Working checklist — edit these files when we tighten for real:

1. **Keywords** (`local/india-scan/config.yml`): remove `software engineer`; keep backend / ai / sap btp / sap cpi  
2. **Title positives** (`portals.yml`): remove bare `Software Engineer` and `Software Developer` (keep Backend / AI / SAP\* / Integration\*)  
3. **Location allow** (`portals.yml`): prefer `Remote` + `Hyderabad` (add Bangalore only if you want that metro too; drop pan-India metro list if too noisy)  
4. **Volume:** `max_pages: 1`, `max_new_offers: 15`  
5. **Cadence:** run 1–2 boards at a time for daily use; reserve `--all` for occasional sweeps  
6. **Then:** shortlist `data/pipeline.md` → `/career-ops pipeline` for YOE / skills / fit / legitimacy  

#### Active experiment — SAP BTP / CPI only (2026-08)

Discovery is temporarily narrowed to:

- SAP BTP Consultant  
- SAP BTP Developer  
- SAP CPI Consultant  

| File | What changed |
|---|---|
| `local/india-scan/config.yml` | Keywords = **sap btp consultant**, **sap btp developer**, **sap cpi consultant** (all run each scan); `max_new_offers: 500` so the first title cannot stop the rest; default `max_pages: 1` (override with `--max-pages`) |
| `portals.yml` → `title_filter.positive` | Only SAP BTP / CPI / Integration Suite (Backend + AI positives parked) |
| `portals.yml` → `title_filter.negative` | Extra: Fresher, Instructor, Team Lead, Lead, SAP MM/FI/SD/PP/WM, Basis, SuccessFactors, Fiori |
| `config/profile.yml` | **Unchanged** — career north star still includes Backend / AI; this is discovery-only |

This also affects `npm run scan` (remote + direct): non-SAP titles will be dropped while the experiment is on.

**Try it (clean slate recommended):**

```bash
node local/reset-scan-inbox.mjs --yes
node local/india-scan/run.mjs --board linkedin --max-pages 1 --dry-run
node local/india-scan/run.mjs --board naukri --max-pages 1
# or: node local/india-scan/run.mjs --all --max-pages 1
```

To end the experiment: restore Backend/AI positives in `portals.yml` and broaden `local/india-scan/config.yml` keywords again.

```text
india-scan / npm run scan   →  cheap inbox (titles + location + caps)
        ↓
tighten keywords / title / location / max_pages / max_new_offers
        ↓
you shortlist pipeline.md   →  cut remaining title noise
        ↓
/career-ops pipeline        →  YOE, skills, remote detail, score (paid)
```

**Same for remote boards:** `npm run scan` also does **not** AI-read each JD; tighten `title_filter` / `location_filter` / disable noisy providers in `tracked_companies`, then pipeline the shortlist.

#### Optional later (still not default)

- Opt-in cheap AI pre-match (job-hunt-ai `/api/match` style) — score cards, keep ≥ threshold — **off by default** so discovery stays ₹0  
- Reject empty-location cards (stricter; may drop good posts with thin scrapers)

### Where portal config lives

| Change this | Edit this file |
|---|---|
| Title keywords / exclusions | `portals.yml` → `title_filter` |
| Allowed locations (incl. remote-only) | `portals.yml` → `location_filter` |
| Posting age (24h hard cutoff, both scanners) | `portals.yml` → `max_posting_age_hours` |
| Enable/disable remote providers | `portals.yml` → `tracked_companies` |
| India WebSearch queries (legacy agent path) | `portals.yml` → `search_queries` |
| India scrape city facets (Foundit/Hirist/Indeed) | `local/india-scan/config.yml` |
| LinkedIn remote-only / days-back facet | `local/india-scan/config.yml` → `linkedin_remote_only`, `linkedin_days` |
| Add a company careers URL | `portals.yml` → `tracked_companies` (+ `provider` / `api`) |
| Validate config | `node validate-portals.mjs --file portals.yml` |
| Operating rules for India / company add | `modes/_custom.md` |
| This playbook | `docs/portal-expansion-plan.md` ← **this file** |


---

## 4. Path A — You already have JD + URL

**Mode:** `/career-ops pipeline` or paste URL → `auto-pipeline` / `oferta`

### Steps

1. **Ingest URL / JD**
   - Prefer Playwright (or `browser-extract.mjs` if `scan.extractor: cli`) for SPA pages
   - Fall back to WebFetch only when needed; mark verification carefully

2. **Evaluate the offer**
   - Blocks A–F + legitimacy (Block G)
   - Uses CV + profile + archetypes + location/comp context
   - Writes report under `reports/`
   - Tracker row via TSV → `merge-tracker.mjs` (do not hand-edit new rows into `applications.md`)

3. **Decision gate**
   - Score **&lt; 4.0/5** → recommend against applying (override only with a specific reason)
   - Score **≥ 4.0/5** (or your chosen threshold) → proceed

4. **ATS-friendly CV check**
   - Generate / tailor PDF via `/career-ops pdf` (Playwright HTML→PDF)
   - If not ATS-friendly: fix section order, Unicode, keywords from JD (reformulate, never fabricate), regenerate
   - Optional HM audit: `pdf --hm-audit`

5. **Apply**
   - **Manual (default):** you upload/submit on the site
   - **Assisted:** `/career-ops apply` can draft form answers — **stop before Submit**
   - Never mass auto-apply

6. **Outreach**
   - `/career-ops email` — formal application email (draft only)
   - `/career-ops contacto` — recruiter / HM / peer LinkedIn-style short message (draft only)

7. **Track**
   - Status via `node set-status.mjs … Applied`
   - Follow-ups via follow-up modes / `data/follow-ups.md`

---

## 5. Path B — No JD / no URL yet → Discovery

Three discovery lanes (₹0). Under the SAP experiment, run in this **speed order:** India → career pages (`--company`) → full remote only if needed.

### 5.1 Indian boards — Playwright zero-cost scan (all boards except Apna)

**Primary path (built):**

```bash
node templates/india-scan/bootstrap.mjs   # once
node local/india-scan/run.mjs --login naukri
node local/india-scan/run.mjs --login linkedin
# Optional: Peerlist / Wellfound (Cloudflare / DataDome)
node local/india-scan/run.mjs --login peerlist
node local/india-scan/run.mjs --login wellfound
node local/india-scan/health.mjs
node local/india-scan/run.mjs --board naukri --max-pages 1
node local/india-scan/run.mjs --board peerlist --max-pages 1
```

- Writes through `scan.mjs` helpers → `data/pipeline.md`, `data/scan-history.tsv`, `data/scan-runs.tsv`
- Web dashboard shows them in **Pipeline inbox** and **What's New**
- Filters reuse `portals.yml` title/location rules
- Runtime under `local/india-scan/` is **gitignored** (safe on `git pull`)

**Still true:**

- `search_queries` for India boards remain as **backup only** (agent WebSearch costs LLM — not default)
- Apna scraper is **deferred** (not in `IMPLEMENTED_BOARDS`)
- Prefer scripts over `/career-ops scan` agent WebSearch for India discovery

Details: §6 and Phase 3b checklist.

### 5.2 Direct career pages — functionality, architecture & recommendation

**Career pages** = one employer's own careers site (ATS-backed), not a job aggregator and not an India Playwright board.

#### Verdict — does it work?

**Yes.** Career pages work without scanner errors when configured correctly. Proven live (2026-08-08):

| Company | ATS | Fetch | Keepers (after your filters) |
|---|---|---|---|
| SAP | SuccessFactors | ✅ 500 raw / 2 Bangalore Integration Suite | 2 written |
| Advance Auto Parts | Phenom (IT category) | ✅ 6 IT roles | 0 (Directors/Managers + Raleigh US) |
| EY | SuccessFactors (`/ey/` path) | ✅ 200 raw (8 tile pages) | 0 (Kochi/Warsaw near-misses on location) |

“0 new offers” is usually a **filter outcome**, not a broken scan. Adding another company works if you detect ATS → set `provider:` in `portals.yml` → run `local/scan-career.mjs`.

**Do not leave career pages entirely** — and **do not make them the main discovery path**. They are a **side lane** for employers you specifically want (see Recommendation below).

#### Recommendation — side lane (keep, de-prioritize)

| Priority | Lane | Why |
|---|---|---|
| **1** | India (`local/india-scan`) | Best density for Hyderabad / your titles |
| **2** | Remote aggregators (`npm run scan`) | Broad remote coverage, zero LLM |
| **3** | Career pages (`local/scan-career.mjs`) | Only for employers you care about (SAP yes; Big4/consulting optional) |

**Practical rule:** add a career page only when you specifically want that employer. Don’t bulk-add Big4 / consulting boards hoping for volume — you’ll fetch hundreds and keep almost none.

**Optional later (not required):** broaden `location_filter.allow` with more India cities (Kochi, Trivandrum, …) or markers like `, IN` so SF tiles that say only `Kochi` (no “India”) still pass. Only if you want more India metro coverage.

#### Three discovery lanes (career pages = lane B)

| Lane | What it is | How you run it | Example |
|---|---|---|---|
| **A — Remote boards** | Multi-employer aggregators | `npm run scan` | Himalayas, RemoteOK, Remotive… |
| **B — Career pages** | One employer's careers site | `node local/scan-career.mjs --company <Name>` | SAP, EY, Advance Auto Parts |
| **C — India boards** | Playwright scrapers | `local/india-scan` | Naukri, Peerlist… |

#### Architecture

Career sites do **not** share one HTML scrape. Each ATS has its own API. We use **one entry point + many provider plugins**:

```text
┌─────────────────────────────────────────────────────────────────┐
│  portals.yml  (user layer)                                      │
│  tracked_companies: name, careers_url, provider, ATS knobs      │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  local/scan-career.mjs   (pull-safe; preferred for career pages)│
│  • 30s HTTP timeout (upstream scan.mjs defaults to 10s)         │
│  • SF tile-page soft cap (--max-pages)                          │
│  • same title/location/age/blacklist/dedup as scan.mjs          │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  providers/_registry.mjs                                        │
│  resolveProvider(entry) → successfactors | phenom | greenhouse… │
└───────────────────────────────┬─────────────────────────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
     successfactors.mjs   phenom.mjs      greenhouse / ashby /
     (SAP, EY, …)         (AAP, …)        lever / workday / …
              │                 │                 │
              └─────────────────┼─────────────────┘
                                ▼
              title_filter → location_filter → age → blacklist → dedup
                                │
                                ▼
              data/pipeline.md + scan-history.tsv + scan-runs.tsv
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
           /local           /pipeline         /portals
         (run scan)         (triage)          (health)
                                │
                                ▼
                     /career-ops pipeline (paid eval)
```

**Design rules:**

1. **One entry point** — `local/scan-career.mjs` (registry + long timeout + shared writers).
2. **Provider plugins stay upstream** — never fork ATS logic into `local/` unless India-only / personal.
3. **Per-company YAML only in `portals.yml`** — `provider:` + optional blocks (`phenom:`, `max_pages`, `api:` path prefix).
4. **Provider-specific caps stay thin** — SF tile soft-stop; Phenom honors `max_pages`.
5. **Unsupported ATS** — find an existing provider, enable one, or last-resort `local_parser` / Playwright.

Also: upstream `npm run scan` / `node scan.mjs --company X` hit the same providers but use the **10s** HTTP timeout — prefer the local wrapper for slow boards.

#### What “works” means vs what still depends on other factors

| “Works” | Still depends on |
|---|---|
| Fetch completes without abort/crash | **ATS already supported** in `providers/*.mjs` |
| Rows can reach Pipeline | **Correct YAML knobs** (EY `/ey/` path; AAP `phenom.selectedFields.category: [IT]`) |
| Same filters as remotes | **Timeouts / page depth** — SF needs `scan-career` + `--max-pages` |
| Dashboard sees results via shared files | **Your filters** — Mid titles, India/Remote allow-list (Kochi alone ≠ “India”) |
| | **Board noise** — EY ~7k jobs are mostly Manager/Analyst/tax; few mid Full Stack / BTP keepers |

#### Tradeoffs

| Keep as side lane ✅ | Leave / de-emphasize bulk ❌ |
|---|---|
| Zero LLM when provider exists | Wrong primary source for daily volume |
| Target SAP (or any named employer) precisely | Big consulting boards → high fetch, low keepers |
| Multi-ATS via registry (SF + Phenom proven) | Unsupported ATS needs new provider work |
| Pull-safe (`local/scan-career.mjs`) | Upstream 10s timeout flakes on SF from India |
| Same Pipeline / evaluate path as India + remote | Location strings from tiles can be city-only (filter miss) |

#### Config shape (`portals.yml` → `tracked_companies`)

```yaml
- name: SAP
  careers_url: https://jobs.sap.com/
  provider: successfactors
  api: https://jobs.sap.com
  # Side lane only — leave enabled: false so /portals + npm run scan
  # do not false-flag SAP as "broken" (upstream 10s abort from India).
  # Scan with: node local/scan-career.mjs --company SAP
  enabled: false

- name: EY
  careers_url: https://careers.ey.com/ey/
  provider: successfactors
  api: https://careers.ey.com/ey
  enabled: true

- name: Advance Auto Parts
  careers_url: https://jobs.advanceautoparts.com/us/en/
  provider: phenom
  max_pages: 2
  phenom:
    lang: en_us
    country: us
    urlPrefix: us/en
    selectedFields:
      category: ["IT"]
  enabled: true
```

#### Lifecycle (career pages)

```text
1. CONFIGURE     portals.yml → company + careers_url + provider (+ ATS knobs)
2. HEALTH        remotes: /portals or node verify-portals.mjs
                 SAP: use local/scan-career.mjs --dry-run (not /portals — SAP is enabled: false)
3. DISCOVER ₹0   node local/scan-career.mjs --company <Name> [--dry-run]
4. WRITE         pipeline.md + scan-history.tsv + scan-runs.tsv
5. SEE IN UI     /local · /local/careers · /local/companies · /pipeline · Today
6. SHORTLIST     ≤15 Pending
7. EVALUATE      /career-ops pipeline (paid)
8. APPLY ASSIST  pdf / apply / email — you Submit
9. TRACK         set-status Applied → follow-ups → outcome
```

#### Day-to-day commands

```bash
# RECOMMENDED — multi-ATS, long timeout (pull-safe)
# Works even when SAP has enabled: false in portals.yml
node local/scan-career.mjs --company SAP
node local/scan-career.mjs --company EY --max-pages 8
node local/scan-career.mjs --company "Advance Auto Parts" --dry-run

# Upstream (may abort on slow SF — 10s HTTP timeout; SAP is disabled from this path)
# node scan.mjs --company SAP

# Several companies (pull-safe wrapper; still 10s timeout per call — skip SAP here)
node local/scan-companies.mjs EY,"Advance Auto Parts"

# Remotes + enabled career pages (EY / AAP). SAP is NOT included (enabled: false).
npm run scan

# Health — remotes / enabled companies only (SAP omitted on purpose)
node verify-portals.mjs
```

**SAP / SuccessFactors timeout note:** `providers/_http.mjs` defaults to **10s**. From India, tile pages often take **8–15s+** → `This operation was aborted`. On `/portals` that shows as **broken** with a glued label like `SASAPsuccessfactors (network error)` — the `careers_url` (`https://jobs.sap.com/`) is fine; it is a timeout, not a dead link. **Fix:** keep SAP `enabled: false` in `portals.yml` and scan only via **`local/scan-career.mjs`** (30s; still finds SAP when you pass `--company SAP`). Do not raise timeout in tracked `_http.mjs` (fights `git pull`). Do not “repair” the careers URL for this symptom.

**SF pagination note:** Newest-first globally (Walldorf / intern / EU-heavy). India Labs roles often need `--max-pages 16+`. Expect few keepers vs hundreds of raw tiles.

#### Dashboard map

| Page | Role for career pages |
|---|---|
| **Local** (`/local`) | Hub — run any local wave |
| **Local India** (`/local/india`) | India boards + health/login |
| **Local Careers** (`/local/careers`) | Career pages / scan-all |
| **Local Startups** (`/local/startups`) | YC / Speedrun / Top Startups / HN |
| **Local Companies** (`/local/companies`) | Segregated company directory (kind + SAP role) — §3.7 |
| **Portals** | Health of **enabled** `careers_url` entries (SAP excluded — use `/local/careers`) |
| **Pipeline** | Inbox after scan |
| **Explore** | Reverse-ATS hunt — **not** this lane |
| **Today** | Fresh matches + follow-ups |

#### Adding another career page

```text
1. Paste careers URL
2. Detect ATS (Workday / Greenhouse / Ashby / Lever / SuccessFactors / Phenom / …)
3. portals.yml → provider + careers_url (+ phenom: / api: path / max_pages as needed)
4. node validate-portals.mjs --file portals.yml
5. node local/scan-career.mjs --company <Name> --dry-run
6. node local/scan-career.mjs --company <Name>
7. Note under Direct career pages below
```

Also §7.12 · SOP: `modes/_custom.md` → `company-careers`.

#### ATS family cheat-sheet

| ATS family | career-ops provider | Config knobs |
|---|---|---|
| SuccessFactors RMK/CSB | `successfactors` | `api:` brand path / `sfVariant: csb` |
| Phenom People | `phenom` | `phenom.lang/country/urlPrefix/selectedFields` |
| Greenhouse / Ashby / Lever | matching id | slug in `careers_url` / `api:` |
| Workday | `workday` | tenant URL |
| … | `providers/*.mjs` | see each file header |

**Direct career pages currently tracked:**

- SAP — `successfactors` (`jobs.sap.com`) — **`enabled: false`** (side lane only; use `local/scan-career.mjs`)
- EY — `successfactors` (`careers.ey.com/ey/`) — enabled on `npm run scan` / `/portals`
- Advance Auto Parts — `phenom` (IT category; [jobs.advanceautoparts.com/us/en/c/it-jobs](https://jobs.advanceautoparts.com/us/en/c/it-jobs)) — enabled

### 5.3 Remote portals — DONE (full sweep)

```bash
npm run scan
# or: node scan.mjs
```

- Uses built-in providers (zero LLM tokens) for Himalayas, RemoteOK, Remotive, etc. **plus enabled** career pages (EY / AAP — **not** SAP while `enabled: false`)
- Applies `title_filter`, `location_filter`, `max_posting_age_hours` (24)
- Appends new URLs to `data/pipeline.md` + history in `data/scan-history.tsv`

Optional stricter liveness:

```bash
node scan.mjs --verify
```

Under SAP-only `title_filter`, remote aggregators usually return **0 new** — prefer §5.2 `--company` during the experiment.

---

## 6. Indian boards — zero / very-low cost approach

### Goal

Discover Naukri, LinkedIn, Instahyre, Cutshort, foundit, Hirist jobs **without paying for agent WebSearch**, then only spend evaluation tokens on a shortlist.

### Cost model

| Step | Mechanism | LLM cost |
|---|---|---|
| Login session | Persistent Chromium profile (you log in once) | **₹0** |
| Search + list scrape | Playwright scripts | **₹0** |
| Metadata pre-filter (title, location, age, salary keywords, mid-level) | Local JS/Python rules | **₹0** |
| Dedup vs `scan-history.tsv` | Local (same normalizer as `scan.mjs`) | **₹0** |
| Write survivors to pipeline + history + run log | Same writers as `npm run scan` | **₹0** |
| Appear on web dashboard | Automatic (reads those files) | **₹0** |
| Evaluate shortlist | `/career-ops pipeline` only for chosen URLs | **Paid only here** (Cursor usage) |

Avoid as primary India discovery:

- Broad `/career-ops scan` agent WebSearch loops
- AI matching every scraped card (job-hunt-ai’s Claude/Cursor match step is optional and costs money — **skip for discovery**)

### Reference implementation: `job-hunt-ai`

Path:

`C:\Users\Gunasekhar.Ch\Guna\ownit\socials\SearchJob\job-hunt-ai`

What it already shows (useful logic):

| Piece | Location | Useful for us |
|---|---|---|
| Persistent Playwright context | `server/scraper/utils/browser.ts` | Login cookies survive; headed Chromium; anti-automation flags |
| Base scraper contract | `server/scraper/sites/base.ts` | search URL builder, card parse, optional detail fetch, pagination |
| Naukri scraper | `server/scraper/sites/naukri.ts` | public search + login detection + recommended jobs |
| LinkedIn scraper | `server/scraper/sites/linkedin.ts` | India + remote facet search; recommendations |
| Scrape runner | `server/scraper/index.ts` | multi-source orchestration + DB insert |

What it does **not** include (gaps we must fill for career-ops):

| Gap | Needed for our lifecycle |
|---|---|
| Output to `data/pipeline.md` + `scan-history.tsv` + `scan-runs.tsv` | **Done** — via `scan.mjs` helpers |
| Web dashboard visibility | **Done** — Pipeline inbox + What's New (no extra register step) |
| Legitimacy / evaluation handoff | Reports + tracker contract (unchanged) |
| Apply ethics gate | Draft/assist only; no silent submit |
| SAP BTP / CPI keyword packs | Wired via `portals.yml` title_filter + india-scan keywords |
| Service vs product vs startup tagging | **Done** — `data/companies.tsv` + `/local/companies` UI (see §3.7) |
| Instahyre / Cutshort / foundit / Hirist / Indeed / Peerlist / Wellfound scrapers | **Done** — Apna still deferred |

Philosophy alignment (keep):

- job-hunt-ai: **manual apply, no auto-submit** — same as career-ops
- Local-first browser session for login-gated boards

### Architecture (as built — pull-safe)

```text
templates/india-scan/          ← tracked seed (safe to pull)
        │  bootstrap.mjs
        ▼
local/india-scan/              ← gitignored working copy
  .browser-data/               ← login once, reuse session
  config.yml
  run.mjs / health.mjs
  lib/scrapers/{naukri,linkedin,instahyre,cutshort,foundit,hirist,indeed-india,peerlist,wellfound}.mjs
        │
        │  Playwright headed/persistent
        │  keywords from local config
        │  title/location filters from portals.yml
        │  dedup via scan.mjs normalizeUrlForDedup
        ▼
scan.mjs writers (canonical)
  appendToPipeline      → data/pipeline.md
  appendToScanHistory   → data/scan-history.tsv  (portal = naukri|linkedin)
  appendScanRunSummary  → data/scan-runs.tsv
        │
        ├──► Web dashboard: Pipeline inbox + What's New
        ├──► node stats.mjs: run trends
        ▼
YOU shortlist (note: india:naukri | india:linkedin)
        │
        ▼
/career-ops pipeline   ← only paid step
```

### Dashboard tracking

No separate plugin. India-scan uses the **same files** the **`web/` dashboard** already reads:

| Dashboard / CLI surface | File | india-scan write |
|---|---|---|
| **Web UI** (`web/` → Pipeline / Inbox) | `data/pipeline.md` | `appendToPipeline` |
| **Web UI** What's New / fresh matches | `data/scan-history.tsv` | `appendToScanHistory` (`source` = board name) |
| **Web UI** Company directory (`/local/companies`) | `data/companies.tsv` | via `local/harvest-companies.mjs` (after scans) |
| **CLI** scan trends | `data/scan-runs.tsv` | `appendScanRunSummary` |
| Spot India rows in inbox | pipeline `note:` field | `note: india:naukri` (or linkedin, hirist, …) |

Open `data/pipeline.md` in the editor to shortlist, or use the **web dashboard** (`cd web && npm run dev` → http://localhost:3000). Optional Go TUI: `npm run serve:dashboard`. ATS facet chips in some UIs only label Greenhouse/Lever/Ashby/Workday hosts; Naukri/LinkedIn/etc. still appear in the inbox — they may show without an ATS chip (cosmetic only).

### Conditions / guardrails for India Playwright scan

1. **Discovery only** — scrape titles/URLs (+ optional snippet); do not evaluate every hit with an LLM
2. **Respect metadata** — drop roles outside title/location/level filters before pipeline
3. **Cap volume** — e.g. max N pages per board per run; max M new URLs written to pipeline
4. **Throttle** — jittered delays; no concurrent multi-tab hammering of the same board
5. **Login** — persistent profile under `local/india-scan/.browser-data/` (gitignored)
6. **Human review** — shortlist before pipeline; never auto-apply Easy Apply at scale
7. **ToS / risk** — personal use, moderate frequency; prefer search listing over aggressive detail crawling
8. **Health canary** — `node local/india-scan/health.mjs` before full runs when selectors may have broken
9. **Fallback** — if a board breaks selectors, fail soft and continue other boards; do not burn agent WebSearch by default

### Per-board status

| Board | job-hunt-ai | career-ops india-scan |
|---|---|---|
| Naukri | ✅ scraper | **Live** (`lib/scrapers/naukri.mjs`) |
| LinkedIn | ✅ scraper | **Live** (`lib/scrapers/linkedin.mjs`) |
| Instahyre | ❌ | **Live** (`lib/scrapers/instahyre.mjs`) |
| Cutshort | ❌ | **Live** (`lib/scrapers/cutshort.mjs`) |
| foundit | ❌ | **Live** (`lib/scrapers/foundit.mjs`) |
| Hirist | ❌ | **Live** (`lib/scrapers/hirist.mjs`) |
| Indeed India | ❌ | **Live** (`lib/scrapers/indeed-india.mjs`) |
| Peerlist | ❌ | **Live** (`lib/scrapers/peerlist.mjs`) — Cloudflare; `--login peerlist` |
| Wellfound | ❌ | **Live** (`lib/scrapers/wellfound.mjs`) — DataDome; `--login wellfound` |
| Apna | ❌ | Deferred |

### Optional later (not required for zero-cost discovery)

- Cheap AI match batch (only if you want job-hunt-ai-style scoring) — keep off by default
- `scan_method: local_parser` wrappers so `npm run scan` can call India scrapers as plugins
- Apify / paid scrapers — out of scope while zero-cost is the goal
- Extend web ATS facet chips for naukri.com / linkedin.com (cosmetic; system-layer change)

---

## 7. Full operating runbook (detail — same order as §0)

Canonical fast path is **§0**. This section expands each step. All discovery is **₹0 LLM**; only pipeline / oferta spends Cursor tokens.

```text
INSTALL → LOGIN (India) → INDIA SCAN → CAREER PAGES (--company)
         → [optional full npm run scan] → SHORTLIST → pipeline → apply
```

**SAP experiment speed rule:** India board(s) first → career pages via `--company` → skip full remote until Backend/AI titles are restored.

### 7.1 One-time installation

From the career-ops repo root (`…/SearchJob/career-ops`):

```bash
# 1) Dependencies (Node 18+)
npm install

# 2) Chromium for PDF + India Playwright scrapers
npx playwright install chromium

# 3) Sanity check (should show onboardingNeeded: false once profile/cv exist)
node doctor.mjs --json

# 4) Web dashboard (primary UI — Next.js in web/)
cd web
npm ci
npm run dev
# → http://localhost:3000  (Pipeline inbox, What's New, tracker, …)

# 5) Optional: Go terminal dashboard (TUI)
#    (install Go from https://go.dev if missing)
# npm run serve:dashboard
```

Confirm user-layer files exist (already set up for you):

| File | Purpose |
|---|---|
| `cv.md` | Canonical CV |
| `config/profile.yml` | Roles, comp, location, narrative |
| `portals.yml` | Title/location filters + remote/direct providers |
| `modes/_profile.md` / `modes/_custom.md` | Framing + house rules |
| `data/applications.md` | Tracker |
| `data/pipeline.md` | Pending URL inbox |

### 7.2 Install / refresh India scanner (pull-safe)

Runtime lives under **`local/india-scan/`** (gitignored). Seed templates are tracked under `templates/india-scan/`.

```bash
# First time OR after template updates (preserves local config.yml)
node templates/india-scan/bootstrap.mjs
```

Edit search prefs in `local/india-scan/config.yml` (boards, keywords, cities, `max_pages`, `linkedin_remote_only`). Filters for title/location still come from **`portals.yml`**.

### 7.3 Login to Indian boards (individual, once each)

Login opens a headed Chromium with a **persistent profile** at `local/india-scan/.browser-data/`. Log in manually → press **Enter** in the terminal → session saves → process exits.

```bash
# Recommended (gated / bot-checked boards)
node local/india-scan/run.mjs --login naukri
node local/india-scan/run.mjs --login linkedin
node local/india-scan/run.mjs --login instahyre
node local/india-scan/run.mjs --login foundit
node local/india-scan/run.mjs --login indeed-india
node local/india-scan/run.mjs --login peerlist
node local/india-scan/run.mjs --login wellfound

# Optional (often work without login)
node local/india-scan/run.mjs --login cutshort
node local/india-scan/run.mjs --login hirist
```

| Board | Login needed? | Why |
|---|---|---|
| naukri | Strongly yes | Better results / less block |
| linkedin | Strongly yes | Search often login-walled |
| instahyre | Strongly yes | Cloudflare |
| foundit | Strongly yes | Akamai |
| indeed-india | Strongly yes | Security checks |
| peerlist | Strongly yes | Cloudflare |
| wellfound | Strongly yes | DataDome |
| cutshort | Optional | Usually public |
| hirist | Optional | Usually public |
| apna | N/A | Scraper deferred |

Help / list of boards:

```bash
node local/india-scan/run.mjs --help
```

### 7.4 Health check (selector canary)

Same role as `npm run verify:portals`, but for Playwright India boards (incl. Peerlist / Wellfound).

```bash
# All implemented boards (exit 0 by default — report only; like verify-portals)
npm run verify:india
# same as: node local/india-scan/health.mjs

# One board
node local/india-scan/health.mjs --board cutshort
node local/india-scan/health.mjs --board peerlist
node local/india-scan/run.mjs --health --board wellfound

# Fail CI-style if any board is not live
npm run verify:india -- --strict
```

🟡 = login / bot wall (re-login that board). ❌ = selectors broken or network error. Exit code **1** only with `--strict`.

### 7.5 Reset discovery inbox (clean slate)

Use this before a **fresh rediscovery** where you want old URLs to be eligible again. Clearing `scan-history.tsv` removes dedup memory — the same job URL can reappear in the inbox on the next scan.

**Does not delete reports or tracker rows** — for that see **§7.5b**.

**Script:** `local/reset-scan-inbox.mjs` (gitignored — pull-safe)

```bash
# Preview (no writes)
node local/reset-scan-inbox.mjs --dry-run

# Reset inbox + history + run counters (backs up under data/backups/ first)
node local/reset-scan-inbox.mjs --yes

# Only empty the pending URL list (keep dedup history)
node local/reset-scan-inbox.mjs --yes --pipeline-only

# Only wipe dedup history (URLs can be rediscovered)
node local/reset-scan-inbox.mjs --yes --history-only

# Also clear portal-health.tsv
node local/reset-scan-inbox.mjs --yes --also-portal-health

# Disposable liveness URL lists only (batch/liveness-*.txt)
node local/reset-scan-inbox.mjs --yes --liveness-temps-only
# same thing:
node local/clean-liveness-temps.mjs --yes
```

| Resets | Leaves alone |
|---|---|
| `data/pipeline.md` → empty Pending/Processed skeleton | `data/applications.md` (tracker) |
| `data/scan-history.tsv` → header only | `reports/` |
| `data/scan-runs.tsv` → header only | `data/follow-ups.md`, `cv.md`, `profile.yml`, `portals.yml` |
| `batch/liveness-*.txt` (full reset / `--liveness-temps-only`) | — throwaway URL lists for `check-liveness.mjs --file` |

Backups of pipeline/history/runs land in `data/backups/scan-inbox-<timestamp>/` (under gitignored `data/`). Use `--no-backup` only if you are sure. Liveness temps are deleted (not backed up).

### 7.5c Liveness temp files (`batch/liveness-*.txt`)

During `/career-ops pipeline`, a liveness sweep may write **disposable** one-URL-per-line files, e.g.:

- `batch/liveness-pending.txt` — Pending URLs for `node check-liveness.mjs --file …`
- `batch/liveness-shortlist.txt` — earlier shortlist sweep
- `batch/liveness-batch1.txt` — ad-hoc batches

They are **not** the inbox (`data/pipeline.md`), not scan history, not reports. Safe to delete anytime:

```bash
node local/clean-liveness-temps.mjs --dry-run
node local/clean-liveness-temps.mjs --yes
```

A full `node local/reset-scan-inbox.mjs --yes` also deletes these temps by default.

### 7.5b Reset evaluations (reports + tracker)

Use this when a `/career-ops pipeline` batch is done and you want to **start evaluations from #001 again** (delete `reports/001-….md` etc. and empty the tracker). Discovery history is left alone so you do not re-scrape the same boards unless you also run §7.5.

**Script:** `local/reset-evaluations.mjs` (gitignored — pull-safe)

```bash
# Preview
node local/reset-evaluations.mjs --dry-run

# Wipe reports + applications.md (backs up under data/backups/evaluations-<timestamp>/)
node local/reset-evaluations.mjs --yes

# Also clear pending/merged tracker TSVs and generated PDFs under output/
node local/reset-evaluations.mjs --yes --also-tracker-additions --also-output

# Only one side
node local/reset-evaluations.mjs --yes --reports-only
node local/reset-evaluations.mjs --yes --tracker-only
```

| Resets (default) | Leaves alone |
|---|---|
| `reports/{###}-*.md` (+ `*-RESERVED.md`) | `data/pipeline.md`, `scan-history.tsv`, `scan-runs.tsv` |
| `data/applications.md` → empty table | `cv.md`, `profile.yml`, `portals.yml`, `interview-prep/` |

**Full fresh start** (discovery + evaluations):

```bash
node local/reset-scan-inbox.mjs --yes
node local/reset-evaluations.mjs --yes --also-tracker-additions
# then: india-scan / npm run scan → shortlist → /career-ops pipeline
```

**Suggested order for rediscovery only (keep prior evals):**

```bash
# Prefer parking over wipe when continuing a wave.
# Full wipe only when starting a fresh rediscovery:
node local/reset-scan-inbox.mjs --yes
node local/india-scan/run.mjs --board naukri --max-pages 1
node local/scan-career.mjs --company SAP
# Review data/pipeline.md → /career-ops pipeline
```

### 7.6 Run Indian job boards (zero LLM) — do this first in daily waves

```bash
# Dry run (no writes) — good first test
node local/india-scan/run.mjs --board naukri --max-pages 1 --dry-run

# Fastest: one high-signal board
node local/india-scan/run.mjs --board naukri --max-pages 1

# Optional second board (don't start with --all while iterating)
node local/india-scan/run.mjs --board cutshort --max-pages 1
node local/india-scan/run.mjs --board hirist --max-pages 1

# Peerlist / Wellfound (startup + remote-leaning; login if health shows 🟡)
node local/india-scan/run.mjs --board peerlist --max-pages 1
node local/india-scan/run.mjs --board wellfound --max-pages 1

# Several boards
node local/india-scan/run.mjs --boards naukri,hirist,cutshort --max-pages 1
node local/india-scan/run.mjs --boards peerlist,wellfound --max-pages 1

# All implemented boards (slower — includes peerlist/wellfound; use when you have time)
node local/india-scan/run.mjs --all --max-pages 1

# Use boards list from config.yml (omit --board / --all)
# Default config lists India metros boards only — add peerlist/wellfound there if desired
node local/india-scan/run.mjs --max-pages 1
```

`--max-pages` = pages **per keyword** in `config.yml` (same idea as job-hunt-ai “Pages to scrape”).

Each new row is tagged `note: india:<board>` in the pipeline inbox (e.g. `note: india:peerlist`).

### 7.7 Run career pages and/or remote boards (zero LLM)

Full career-pages functionality + lifecycle: **§5.2**.

**Mode B — career pages only (fast, preferred under SAP experiment):**

```bash
node local/scan-career.mjs
# or: node local/scan-career.mjs --company SAP --max-pages 8
# upstream (may abort on 10s timeout):
# node scan.mjs --company SAP
```

Targets substring-match on `tracked_companies` names (today: **SAP**, even when `enabled: false`). The local wrapper uses a 30s HTTP timeout and caps tile pages so the run finishes reliably from India.

**Mode A + B — full remote aggregators + enabled tracked companies:**

```bash
npm run scan
# same as: node scan.mjs
# Note: SAP is enabled: false → not included; run Mode B separately for SAP.

node validate-portals.mjs --file portals.yml   # optional
```

Applies `title_filter`, `location_filter`, `max_posting_age_hours` (24). Writes:

- `data/pipeline.md` — new URLs
- `data/scan-history.tsv` — dedup / freshness
- `data/scan-runs.tsv` — run counters (`node stats.mjs --summary`)

Under the SAP-only title filter, most remote aggregators return **0 new** — still spend minutes hitting every feed. Prefer `--company` until you restore Backend/AI positives.

### 7.8 See results in the UI

Three surfaces (same files underneath — no separate database):

**A) Web dashboard (primary — lives in `web/`)**

Local-first Next.js app over `data/pipeline.md`, `data/applications.md`, `reports/`, etc.

```bash
cd web
npm ci          # once
npm run dev     # → http://localhost:3000
```

Use it for Pipeline / inbox triage, What's New, tracker, analytics, CV, config. Details: `web/README.md`.

**B) Inbox files (always available — open in Cursor / VS Code)**

| File | What you see |
|---|---|
| `data/pipeline.md` | Pending URLs to evaluate (remote + India + direct) |
| `data/scan-history.tsv` | Everything already scanned (dedup source) |
| `data/scan-runs.tsv` | Per-run counters |
| `data/applications.md` | Tracker after evaluations |

**C) Terminal dashboard TUI (optional — requires Go)**

```bash
npm run serve:dashboard
```

Alternate CLI UI for tracker/reports; not required if you use `web/`.

Also useful:

```bash
node stats.mjs --summary
```

### 7.9 Shortlist, then run pipeline mode (paid evaluation)

1. Open `data/pipeline.md`.
2. Keep only URLs you care about (delete or move aside the rest — quality over quantity; batch cap ~15 in `_custom.md`).
3. In Cursor Agent / Claude Code / Codex, run pipeline mode:

```text
/career-ops pipeline
```

Or ask:

```text
Run career-ops pipeline mode for data/pipeline.md
```

Codex:

```bash
codex exec "Run career-ops pipeline mode for data/pipeline.md."
```

What pipeline does per URL:

- Verify / extract JD (Playwright preferred)
- Score Blocks A–F + legitimacy (Block G) using `cv.md` + `profile.yml` + `_profile.md`
- Write `reports/{###}-….md`
- Tracker row via TSV → `merge-tracker.mjs`
- Auto-PDF only if score ≥ threshold (default 3.0 unless you set `auto_pdf_score_threshold` in profile)

**Gate:** below **4.0/5** → recommend against applying unless you override.

Single JD (no inbox):

```text
Paste URL → auto-pipeline / oferta
```

### 7.10 After a keeper (apply path)

```text
1. /career-ops pdf          # tailored ATS CV if needed
2. /career-ops apply        # draft form answers — STOP before Submit
3. /career-ops email        # formal email draft (never sends)
4. /career-ops contacto     # short LinkedIn-style outreach draft
5. node set-status.mjs <report#|company> Applied [--note "…"]
6. Follow-up cadence via follow-up modes / data/follow-ups.md
```

### 7.11 Recommended cadence (every few days)

```text
1. node local/india-scan/run.mjs --board naukri --max-pages 1
2. (optional) second India board — cutshort / hirist / linkedin
3. node local/scan-career.mjs --company SAP
4. (optional) npm run scan — remotes + enabled career pages (not SAP)
5. Open data/pipeline.md or web dashboard (`cd web && npm run dev`)
6. Shortlist ≤ ~15 URLs
7. /career-ops pipeline
8. Keepers → pdf → apply assist → email/contacto
9. set-status Applied + follow-ups
```

### 7.12 Adding a new company careers page

```text
1. Paste careers URL
2. Detect ATS (Workday / Greenhouse / Ashby / Lever / SuccessFactors / …)
3. Add to portals.yml tracked_companies with provider/api
4. node validate-portals.mjs --file portals.yml
5. npm run scan   # or dry-run path if available
6. Note it under Direct career pages in this doc
```

### 7.13 Quick command cheat-sheet

| Goal | Command |
|---|---|
| Install deps | `npm install` + `npx playwright install chromium` |
| Bootstrap India scanner | `node templates/india-scan/bootstrap.mjs` |
| Login one board | `node local/india-scan/run.mjs --login <board>` |
| Health (remotes / enabled career pages) | `npm run verify:portals` · `node verify-portals.mjs` *(SAP omitted — `enabled: false`)* |
| Health / scan SAP | `node local/scan-career.mjs --company SAP --dry-run` |
| Health (India / Peerlist / Wellfound) | `npm run verify:india` · `node local/india-scan/health.mjs` |
| Health one India board | `node local/india-scan/health.mjs --board naukri` |
| Health Peerlist / Wellfound | `node local/india-scan/health.mjs --board peerlist` · `--board wellfound` |
| **Reset inbox / scan history** | `node local/reset-scan-inbox.mjs --dry-run` then `--yes` |
| **Reset evaluations (reports + tracker)** | `node local/reset-evaluations.mjs --dry-run` then `--yes` |
| Clean liveness temp URL lists | `node local/clean-liveness-temps.mjs --yes` |
| Full fresh start (discovery + evals) | `node local/reset-scan-inbox.mjs --yes` then `node local/reset-evaluations.mjs --yes --also-tracker-additions` |
| Career pages only (fast) | `node local/scan-career.mjs` *(prefer over plain `--company SAP`)* |
| Career pages (upstream) | `node scan.mjs --company SAP` *(disabled path — SAP `enabled: false`; will not run until re-enabled; prefer local wrapper)* |
| Several companies (pull-safe wrapper) | `node local/scan-companies.mjs SAP,Himalayas` |
| Remote + all tracked | `npm run scan` |
| India one board | `node local/india-scan/run.mjs --board naukri --max-pages 1` |
| Peerlist scan | `node local/india-scan/run.mjs --board peerlist --max-pages 1` |
| Wellfound scan | `node local/india-scan/run.mjs --board wellfound --max-pages 1` |
| Login Peerlist / Wellfound | `node local/india-scan/run.mjs --login peerlist` · `--login wellfound` |
| India all boards | `node local/india-scan/run.mjs --all --max-pages 1` |
| India dry-run | `… --dry-run` |
| Help | `node local/india-scan/run.mjs --help` |
| Dashboard (web — `web/`) | `cd web && npm run dev` → http://localhost:3000 |
| Dashboard TUI (optional Go) | `npm run serve:dashboard` |
| Stats | `node stats.mjs --summary` |
| Evaluate inbox | `/career-ops pipeline` |
| Status update | `node set-status.mjs <#> Applied` |

---

## 8. Implementation phases (status + next)

| Phase | Scope | Status |
|---|---|---|
| **Phase 0 — Metadata** | notice, salary, location, roles, CV, mid-level bias, company directory | **Done** (§3.7 `data/companies.tsv`) |
| **Phase 1 — Remote providers** | Enable Himalayas, RemoteOK, Remotive, etc. + filters | **Done** |
| **Phase 2 — Direct career pages** | Side lane: SAP + optional EY / AAP; `local/scan-career.mjs` multi-ATS | **Done** — see §5.2 |
| **Phase 3a — India queries** | WebSearch queries in `portals.yml` | **Done** (keep as backup only) |
| **Phase 3b — India Playwright zero-cost scan** | `local/india-scan/` + health check; all boards except Apna | **Done** (Apna deferred) |
| **Phase 4 — Apply assist polish** | ATS check checklist + apply/email/contacto SOP in `_custom.md` | **Partial** (modes exist; SOP can deepen) |

### Phase 3b implementation checklist

**Status: boards live (except Apna).** Day-to-day: **§0**. Detail: **§7**.

Short version (SAP experiment order):

```bash
node templates/india-scan/bootstrap.mjs
node local/india-scan/run.mjs --login naukri
node local/india-scan/run.mjs --login linkedin
node local/india-scan/run.mjs --board naukri --max-pages 1
node local/scan-career.mjs --company SAP
# Review data/pipeline.md → /career-ops pipeline
```

**Dashboard tracking (no extra register step):** india-scan writes through `scan.mjs` helpers into `data/pipeline.md`, `data/scan-history.tsv`, and `data/scan-runs.tsv`. Primary UI: **`web/`** Next.js dashboard (`cd web && npm run dev`). Optional Go TUI: `npm run serve:dashboard`. CLI counters: `node stats.mjs`.

**Where code + data live (no pull conflicts on runtime):**

| Path | Tracked? | Purpose |
|---|---|---|
| `local/india-scan/` | No (gitignored) | Working copy + `config.yml` + `.browser-data/` session |
| `templates/india-scan/` | Yes | Seed templates; re-bootstrap after template updates |
| `portals.yml` | User layer | Title/location filters reused by india-scan |
| `data/pipeline.md` | User data | Pending URL inbox (shortlist here) |
| `data/scan-history.tsv` | User data | Dedup + freshness |
| `data/scan-runs.tsv` | User data | `node stats.mjs` run trends |
| `data/applications.md` | User data | Tracker (after pipeline); shown in `web/` dashboard |


**Deferred:** Apna scraper only.

---

## 9. Validation & known dry-run results (Phase 1–2)

- `node validate-portals.mjs --file portals.yml` → clean after Phase 2 wiring
- SAP dry-run → relevant Integration Suite / Bangalore hits
- Deloitte South Asia dry-run → SAP CPI / Backend / GenAI India hits
- Amazon India dry-run → Hyderabad / Bengaluru SWE hits
- Advance Auto Parts → ~2000 retail Workday roles, **0** title matches → left `enabled: false`

---

## 10. Bottom line

| Question | Answer |
|---|---|
| Is metadata ready? | **Yes** — full map in §2 from `profile.yml`; discovery gates in `portals.yml`; company directory in §3.7 |
| Are remote portals covered? | **Yes — scan E2E works** — fetch → filters → pipeline. See Remote boards status. 0 keepers = filter, not broken. `/career-ops pipeline` is evaluate-after-shortlist, not board health |
| Are direct career pages covered? | **Yes (side lane)** — SAP / EY / AAP proven; add employers on request via `local/scan-career.mjs` (§5.2) |
| Are Indian boards covered zero-cost? | **Yes** for Naukri, LinkedIn, Instahyre, Cutshort, foundit, Hirist, Indeed India, Peerlist, Wellfound; Apna deferred |
| Do india-scan boards use `portals.yml` metadata filters? | **Yes** — `title_filter` + `location_filter` + `max_posting_age_hours` (24) on every board; salary still not wired |
| How far can we tighten India discovery without AI? | **A lot** — keywords, title +/-, location, max_pages, max_new_offers, fewer boards; see §3 “Tightening India discovery”. YOE/skills still need pipeline |
| Does india-scan show in the UI? | **Yes** — `data/pipeline.md` + scan-history; primary UI is **`web/`** (`cd web && npm run dev`); optional Go TUI `npm run serve:dashboard`; stats via `node stats.mjs` |
| Company directory in UI? | **Yes** — `/local/companies` segregated by kind / SAP role (§3.7) |
| Full install → pipeline path? | **§0** (commands) then **§7** (detail) |
| Will `git pull` conflict with india-scan? | **No** for runtime (`local/` gitignored); re-bootstrap if templates update |
| Should `/career-ops scan` agent WebSearch be primary for India? | **No** — too costly; keep as last-resort backup |
| What do we build next? | Finish SAP experiment pipeline; restore Backend/AI discovery or keep SAP; optional Apna; Phase 4 |
| Where do we evaluate & apply? | shortlist `pipeline.md` → `/career-ops pipeline` → score gate → ATS PDF → manual/assisted apply → email/contacto |
| Fastest daily discovery? | India one board → `npm run scan` (remotes + enabled career pages; **not** SAP) → `/local/careers` for SAP → shortlist → pipeline |
| How do we regression-test? | **§11** — start→end checklist; fix failures one lane at a time |

This document is the source of truth for the job-search lifecycle. **Start at §0.** Detail: **§7**. India templates: `templates/india-scan/README.md`. **When something breaks:** **§11**.

---

## 11. Testing strategy (start → end, fix one lane at a time)

Use this when a scan returns 0 keepers, a board 403s, Local buttons fail, or company tags look wrong. Prefer **`--dry-run`** first so you do not flood `pipeline.md`. Record pass/fail in the **Run log** table at the bottom of this section.

### 11.0 Principles

1. **One lane at a time** — do not debug India + Speedrun + SAP in the same run.
2. **Dry-run → live** — dry-run proves fetch + filters; live proves writers.
3. **Health before scrape** when a board needs login / WAF.
4. **Evidence** — copy the last 20 log lines + exit code into the Run log.
5. **Do not invent** — if classification is wrong, edit `local/company-registry.yml` and re-harvest; do not hand-edit random TSV cells unless correcting a known alias.

### 11.1 Preconditions (once per machine / after pull)

| # | Check | Command / action | Pass if |
|---|---|---|---|
| P1 | Node + doctor | `node doctor.mjs --json` | `onboardingNeeded: false` |
| P2 | Playwright Chromium | `npx playwright install chromium` | no error |
| P3 | India bootstrap | `node templates/india-scan/bootstrap.mjs` | `local/india-scan/run.mjs` exists |
| P4 | portals.yml valid | `node validate-portals.mjs --file portals.yml` | exit 0 |
| P5 | Dashboard up | `cd web && npm run dev` → http://localhost:3000 | `/local` loads |
| P6 | Local restore (if pull wiped UI) | `node local/restore-dashboard-local.mjs` | `/local*` routes present |

### 11.2 Lane A — India boards (`local/india-scan`)

Configured boards: naukri, linkedin, peerlist, cutshort, hirist, instahyre, foundit, indeed-india, wellfound (Apna deferred).

| # | Test | Command | Pass if | Common failures → fix |
|---|---|---|---|---|
| A0 | Health all | `node local/india-scan/health.mjs` | report prints; note 🟡 login boards | Cloudflare/DataDome → A1 |
| A1 | Login (as needed) | `node local/india-scan/run.mjs --login naukri` (then linkedin, peerlist, wellfound) | session under `.browser-data/` | Headed browser closed too early → re-login |
| A2 | Naukri dry-run | `node local/india-scan/run.mjs --board naukri --max-pages 1 --dry-run` | jobs found or clear filter zeros | 0 cards → login/selectors; all filtered → loosen `title_filter` temporarily to diagnose |
| A3 | LinkedIn dry-run | `… --board linkedin --max-pages 1 --dry-run` | same | auth wall → A1 |
| A4 | Primary pack dry-run | `… --boards peerlist,cutshort,hirist,instahyre --max-pages 1 --dry-run` | each board reports | Peerlist CF → login; Instahyre empty → keyword/city |
| A5 | Selective dry-run | `… --board foundit --max-pages 1 --dry-run` · `indeed-india` · `wellfound` | same | city facet mismatch in `config.yml` |
| A6 | Live (one board) | drop `--dry-run` on Naukri only | new lines in `pipeline.md` + `scan-history.tsv` + `scan-runs.tsv` | writers fail → check `CAREER_OPS_PIPELINE` env |
| A7 | UI | `/local/india` → Scan / Login / Health | stream logs; Pipeline updates after live | API 400 → board name not in allowlist |

### 11.3 Lane B — Remote HTTP boards (`npm run scan` / portals.yml)

**Status: working.** Fetch → title/location/age filters → pipeline. 0 keepers after a successful fetch is a **filter** result.

Enabled examples: Himalayas, RemoteOK, Remotive, NoDesk, WWR, Working Nomads, Jobicy, Jobspresso, The Muse, 4 Day Week, JustRemote, EchoJobs (+ startup boards in §11.5). Remote.co / Hubstaff are **off on purpose**.

| # | Test | Command | Pass if | Common failures → fix |
|---|---|---|---|---|
| B0 | Validate | `node validate-portals.mjs --file portals.yml` | exit 0 | fix YAML / unknown provider |
| B1 | Single remote dry-run | `node scan.mjs --company Himalayas --dry-run` | jobs fetched; filter summary printed | retry once on a blip; isolate with `--company` |
| B2 | Spot-check remotes | dry-run `--company` for Remotive, RemoteOK, JustRemote, NoDesk | each completes with sane filter counts (0 keepers OK) | isolate that provider with `--company` |
| B3 | Full remotes dry-run | `node scan.mjs --dry-run` | completes; writes nothing | isolate with `--company` (SAP is not on this path) |
| B4 | Live sample | `node scan.mjs --company Remotive` (no dry-run) | pipeline/history grow **or** 0 new because already seen | expected if you already scanned |
| B5 | UI | `/local/careers` → Scan all portals (prefer dry-run) | NDJSON logs | spawn path missing → restore mirror |

### 11.4 Lane C — Career pages (`local/scan-career.mjs`)

Configured: **SAP** (SuccessFactors, **`enabled: false`** — side lane via `local/scan-career.mjs` only), **EY** (SuccessFactors), **Advance Auto Parts** (Phenom).

| # | Test | Command | Pass if | Common failures → fix |
|---|---|---|---|---|
| C1 | SAP dry-run | `node local/scan-career.mjs --company SAP --dry-run` | tiles fetched; India/remote keepers possible | 10s abort on bare `scan.mjs` → use local wrapper; /portals “broken” with network abort → leave `enabled: false`, do not change `careers_url`; SF empty → raise `--max-pages` |
| C2 | EY dry-run | `node local/scan-career.mjs --company EY --dry-run` | fetch OK (0 keepers OK if filters drop Kochi-only etc.) | wrong SF path → check `careers_url` / `api` |
| C3 | AAP dry-run | `node local/scan-career.mjs --company "Advance Auto Parts" --dry-run` | Phenom fetch OK | 0 keepers expected if retail titles miss filter |
| C4 | SAP live | drop `--dry-run` | keepers in pipeline with career note | timeout → `--timeout-ms 45000` |
| C5 | UI | `/local/careers` → company `SAP` → Scan career page | logs show SuccessFactors | status.scanCareer false → missing `local/scan-career.mjs` |

### 11.5 Lane D — Startup directory

| # | Test | Command | Pass if | Common failures → fix |
|---|---|---|---|---|
| D1 | Speedrun dry-run | `node local/scan-companies.mjs "a16z Speedrun Talent" --dry-run` | jobs; title/location filter summary | truncated max_pages warning OK; raise `max_pages` or tighten `q:` |
| D2 | Top Startups dry-run | `node local/scan-companies.mjs "Top Startups" --dry-run` | ≥1 remote keepers after filters | HTML parse 0 → site markup change → fix `providers/topstartups.mjs` |
| D3 | HN dry-run | `node local/scan-companies.mjs "Hacker News Who is Hiring" --dry-run` | thread found or empty month OK | Algolia fail → retry later |
| D4 | YC seeds dry-run | `node scan-ats-full.mjs --seeds yc --since 7 --dry-run` | seed load + ATS probe progress | long run — do not abort early; network flakes → resume flags if available |
| D5 | YC+a16z seeds | `npm run scan:seeds -- --dry-run` (or equivalent argv) | same | slow — weekly only |
| D6 | Funded review | `npm run company:funded -- --dry-run --limit 10` | review list printed; **no** pipeline write | noisy PR sources OK |
| D7 | UI | `/local/startups` buttons | each action streams | harvest may follow from Overview only |

### 11.6 Lane E — Company directory (§3.7)

| # | Test | Command / action | Pass if | Common failures → fix |
|---|---|---|---|---|
| E1 | Harvest | `node local/harvest-companies.mjs` | writes `data/companies.tsv`; counts by kind/sap | 0 sightings → empty history/pipeline; wrong ROOT → delete bogus `local/data/` |
| E2 | Summary | `node local/companies.mjs --summary` | totals match TSV | missing file → E1 |
| E3 | Segregate SI | `node local/companies.mjs --sap sap_partner_si` | Accenture, Infosys, TCS, … | wrong kind → edit registry aliases + E1 |
| E4 | Export | `node local/companies.mjs --export names --kind product` | plain names | — |
| E5 | Unit (Top Startups provider) | `node tests/providers/topstartups.test.mjs` | all ✅ | — |
| E6 | UI | `/local/companies` | chips + grouped tables; Refresh directory | API empty → E1; `harvestCompanies` false → script missing |
| E7 | API | open `/api/local-tools/companies` | JSON `total` > 0 after harvest | 500 → check path `data/companies.tsv` |

### 11.7 Lane F — Dashboard Local shell

| # | Test | Action | Pass if | Common failures → fix |
|---|---|---|---|---|
| F1 | Subnav | Overview · India · Careers · Startups · Companies | all routes 200 | pull wiped files → `node local/restore-dashboard-local.mjs` |
| F2 | Overview quick + harvest | run Naukri or Scan SAP from Overview | after success, harvest runs | busy stuck → refresh page |
| F3 | Status chips | `/api/local-tools/status` | `indiaScan`, `scanCareer`, `harvestCompanies` true when files exist | wrong `careerOpsRoot` |
| F4 | Pipeline link | Open Pipeline after live scan | new Pending rows | cache — hard refresh |

### 11.8 Lane G — Evaluate shortlist (paid / after scan — not remote health)

Remote **scan** E2E ends at B4 (inbox rows). This lane is **fit scoring** on URLs you already kept. A noisy inbox (Senior US, Naukri login wall) is a shortlist problem, not a remote-board failure.

| # | Test | Action | Pass if |
|---|---|---|---|
| G1 | Shortlist | Edit `data/pipeline.md` → ≤15 Pending keepers | file saved |
| G2 | Evaluate | `/career-ops pipeline` in Cursor | reports + tracker TSV merge |
| G3 | Gate | Score &lt; 4.0 → do not apply unless override | ethics rule held |
| G4 | Apply assist | pdf / apply / email — **stop before Submit** | drafts only |

### 11.9 Suggested order for a full regression (≈ 30–90 min)

```text
P1–P6  preconditions
A0 → A1 → A2 (Naukri dry) → A6 (Naukri live once)
B0 → B1 (Himalayas) → B2 (2–3 remotes) → skip full B3 unless weekly
C1 → C4 (SAP)
D1 → D2 → D6 (skip D4/D5 unless weekly)
E1 → E2 → E6
F1 → F4
G1 only if you will evaluate today
```

### 11.10 Run log (fill in when testing)

| Date | Lane / # | Result (pass/fail) | Notes / fix |
|---|---|---|---|
| 2026-08-08 | P1 doctor | **pass** | onboardingNeeded false; Playwright MCP warning only (CLI config) |
| 2026-08-08 | P4 validate-portals | **pass** | 0 errors, 0 warnings |
| 2026-08-08 | P3/local scripts | **pass** | india-scan, scan-career, harvest, topstartups provider present |
| 2026-08-08 | A0 india health | **fail** | Playwright Chromium missing under sandbox cache path — run `npx playwright install chromium` on host, then re-run A0–A2 |
| 2026-08-08 | B remotes health | **pass** | `verify-portals`: 16 live, 0 unresolved — remote scan E2E OK (SAP not on this path) |
| 2026-08-08 | B1 Himalayas dry | **pass** | 20 found → 1 keeper (Curotec) |
| 2026-08-08 | B2 Remotive dry | **pass** | 23 found → 0 keepers (filters) — fetch OK |
| 2026-08-08 | B2 JustRemote dry | **pass** | 6 keepers (Dave, AssemblyAI, Smartsheet, …) |
| 2026-08-08 | C1 SAP dry | **pass** | 400 raw / 17 tile pages in ~140s; 0 keepers this run (376 title + 23 location) — fetch OK; tighten/diagnose titles if India SAP roles expected |
| 2026-08-08 | C2 EY dry | **pass** | 400 raw; **2 keepers** (SAP BTP BPA Noida, Sr Engineer Bengaluru) |
| 2026-08-08 | C3 AAP dry | **pass** | 6 raw → 0 keepers (expected retail/IT miss) |
| 2026-08-08 | D1 Speedrun dry | **pass** | 150 → 5 keepers (Greenlight, Earnin, Hilbert, Clutch, Protege) |
| 2026-08-08 | D2 Top Startups dry | **pass** | many keepers after filters (Coinbase, Affirm, GitLab, Reddit, …) |
| 2026-08-08 | D6 funded dry | **pass** | review list (Bybit/Omilia/Hadrian/…) — no pipeline write |
| 2026-08-08 | E1–E2 harvest/summary | **pass** | 73 companies; services 17 / product 12 / startup 7; sap_partner_si 11 / sap_vendor 1 |
| 2026-08-08 | E5 topstartups unit | **pass** | 8/8 ✅ |
| 2026-08-08 | F UI files | **pass** | `/local/companies` page + API route files present (smoke in browser separately) |
| | | | |

### 11.11 Enabled `portals.yml` checklist (this checkout)

Track dry-run status here when isolating providers:

| Entry | Provider | Dry-run OK? | Notes |
|---|---|---|---|
| Himalayas | himalayas | **pass** (2026-08-08) | 1 keeper |
| 4 Day Week | 4dayweek | | |
| RemoteOK | remoteok | | |
| Remotive | remotive | **pass** | fetch OK; 0 keepers this run |
| NoDesk | nodesk | | |
| We Work Remotely | weworkremotely | | |
| Working Nomads | workingnomads | | |
| Jobicy | jobicy | | |
| Jobspresso | jobspresso | | |
| The Muse | themuse | | |
| JustRemote | justremote | **pass** | 6 keepers |
| a16z Speedrun Talent | a16z-speedrun-talent | **pass** | 5 keepers |
| Hacker News Who is Hiring | hackernews | | |
| Top Startups | topstartups | **pass** | many keepers |
| SAP | successfactors | **pass** via `local/scan-career` | **`enabled: false`** — careers URL OK; upstream 10s abort looked like /portals “broken” (`SASAPsuccessfactors (network error)`). Scan with `node local/scan-career.mjs --company SAP` only |
| Advance Auto Parts | phenom | **pass** (fetch) | 0 keepers expected |
| EY | successfactors | **pass** | 2 keepers |

Disabled on purpose (do not “fix” as broken): **SAP** (SF timeout side lane — URL fine), Remote.co, Hubstaff Talent.
