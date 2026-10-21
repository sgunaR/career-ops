# Collaborator setup (sgunaR/career-ops fork)

You are cloning a **customized career-ops fork**, not a blank install.  
Shared with you already: **job boards** (`portals.yml`), **targeting** (`modes/_profile.md`), and **house rules** (`modes/_custom.md`).  
You still need **your own profile + CV** and a one-time **local toolkit** bootstrap.

**Use this branch:** `feature/sguna-customizations`

```bash
git clone https://github.com/sgunaR/career-ops.git
cd career-ops
git checkout feature/sguna-customizations
```

---

## What is shared vs yours alone

| Shared (already in the repo) | Yours only (never commit) |
|------------------------------|---------------------------|
| `portals.yml` — boards & filters | `config/profile.yml` — name, email, salary |
| `modes/_profile.md` — role archetypes | `cv.md` — your résumé |
| `modes/_custom.md` — team workflow | `local/` — CV template, india-scan runtime, scrapers |
| Providers, `/local` web UI, india-scan **templates** | `data/`, `output/`, `reports/`, `jds/`, `tmp/` — scans & PDFs |

---

## 1. Prerequisites

- **Node.js** `^22.13` or `>=23.4` (`node -v`)
- An AI coding CLI you will use with career-ops (Cursor, Claude Code, Codex, etc.)
- Optional: `tectonic` if you use the LaTeX / small-caps CV path (see house rules in `modes/_custom.md`)

---

## 2. Install dependencies

From the **repo root**:

```bash
npm install
cd web && npm install && cd ..
npx playwright install chromium
```

---

## 3. Create your personal profile + CV

```bash
# Profile (required)
cp config/profile.example.yml config/profile.yml
# Edit config/profile.yml — your name, email, location, target roles, salary, etc.

# CV (required) — create cv.md in the repo root
# Paste your résumé in markdown, or ask the AI in this repo:
#   "Set up my CV from this text / LinkedIn"
```

Optional templates (if missing):

```bash
node doctor.mjs --json --init-templates
# Then edit modes/_brief.md / voice-dna.md if you want; leave team _profile/_custom alone unless you mean to change shared targeting.
```

Check that onboarding is happy:

```bash
node doctor.mjs --json
# Want: "onboardingNeeded": false
# "missing" should be empty. Fix anything listed under missing / unpersonalized.
```

---

## 4. Bootstrap `local/` (gitignored — each machine does this once)

`local/` is **ignored on purpose** so upstream updates never overwrite your toolkit.  
Shareable seeds live in `templates/india-scan/`.

```bash
node templates/india-scan/bootstrap.mjs
```

That creates `local/india-scan/` on your machine.  
After later template updates on this branch, run the same command again (it keeps your `local/india-scan/config.yml`).

**India board logins** (once per machine, for Naukri / LinkedIn / etc.):

```bash
node local/india-scan/run.mjs --login naukri
node local/india-scan/run.mjs --login linkedin
# …other boards as needed — see templates/india-scan/README.md
```

Browser opens → log in → press Enter in the terminal.

---

## 5. Run the dashboard

```bash
cd web && npm run dev
```

Open http://localhost:3000  

Useful pages:

- `/local/setup` — checklist  
- `/local/india` — India boards  
- `/local/outside-india` — remote / startups / career pages  
- `/local/companies` — company directory (product / services / startup / SAP)  
- `/pipeline` — shortlisted URLs  

Full playbook: [`docs/portal-expansion-plan.md`](docs/portal-expansion-plan.md)

---

## 6. First useful commands

```bash
# Health
node doctor.mjs --json
npm run verify:india          # if script exists after bootstrap

# India scan (one board first)
node local/india-scan/run.mjs --board naukri --max-pages 1

# Remote / ATS boards from portals.yml
npm run scan

# Review shortlist
# edit data/pipeline.md  →  then in chat: process the pipeline
```

In Cursor / Claude, open this repo and ask things like:

- “Run career-ops doctor”  
- “Process the pipeline inbox”  
- “Evaluate this JD: \<url\>”  

---

## 7. Daily workflow (short)

1. Scan (India and/or `npm run scan`)  
2. Shortlist into `data/pipeline.md`  
3. Evaluate keepers (pipeline / chat)  
4. Generate CV from **your** `cv.md` (do not invent skills)  
5. Apply yourself — **never auto-submit**  

Team rule of thumb: prefer roles scoring **≥ 4.0/5**; experience band is documented in `modes/_profile.md` (~2.5 YOE framing on this fork — change `_profile` only if the team agrees).

---

## 8. Updating when this fork or upstream moves

**Pull our feature branch:**

```bash
git checkout feature/sguna-customizations
git pull origin feature/sguna-customizations
node templates/india-scan/bootstrap.mjs   # if india-scan templates changed
```

**Optionally merge upstream career-ops `main` (maintainer usually does this):**

```bash
git fetch upstream          # remote: https://github.com/santifer/career-ops.git
git merge upstream/main
# fix conflicts if any, then push to origin
```

Your `cv.md`, `config/profile.yml`, `local/`, and `data/` stay local and are not overwritten by git.

---

## 9. Do not commit

- `cv.md`, `config/profile.yml`, `.env`  
- `local/`, `data/`, `output/`, `reports/`, `jds/`, `tmp/`  
- PDFs, scan history, application tracker contents  

If `git status` shows those, leave them unstaged. Shared setup changes (`portals.yml`, modes, providers) go through a PR on `feature/sguna-customizations`.

---

## 10. Stuck?

| Symptom | Fix |
|---------|-----|
| `onboardingNeeded: true` | Add `cv.md` + `config/profile.yml`; re-run `node doctor.mjs --json` |
| No `local/india-scan` | `node templates/india-scan/bootstrap.mjs` |
| India board empty / blocked | Run `--login <board>` once; see `templates/india-scan/README.md` |
| `/local` pages missing after pull | Ask for `node local/restore-dashboard-local.mjs` (needs `local/` toolkit) or re-check you are on `feature/sguna-customizations` |
| Playwright errors | `npx playwright install chromium` |

More detail: [`docs/portal-expansion-plan.md`](docs/portal-expansion-plan.md) · [`docs/portal-expansion-reference.md`](docs/portal-expansion-reference.md) · [`templates/india-scan/README.md`](templates/india-scan/README.md)
