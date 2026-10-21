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

| In the repo (use as setup / examples) | Keep local / do not commit |
|--------------------------------------|----------------------------|
| `portals.yml` — boards & filters (shared) | `local/` — CV template, india-scan runtime |
| `modes/_profile.md` — role archetypes (shared) | `data/`, `output/`, `reports/`, `jds/`, `tmp/` |
| `modes/_custom.md` — team workflow (shared) | `.env`, scan history, generated PDFs |
| `cv.md` + `config/profile.yml` — **Guna’s example; rewrite with your facts** | |
| Providers, `/local` web UI, india-scan **templates** | |

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

## 3. Configure your profile + CV (use Guna’s files as the example)

The repo ships **working examples** from Guna’s setup:

| File | What it is |
|------|------------|
| [`config/profile.yml`](config/profile.yml) | Example profile (contact, roles, YOE, narrative, comp) |
| [`cv.md`](cv.md) | Example CV layout (headline, dual Full-Stack + SAP sections, skills, experience) |
| [`modes/_profile.md`](modes/_profile.md) | Shared targeting (keep unless the team changes archetypes) |

**Do not leave his name/email/experience.** Keep the **same structure**; put **your** facts in every field.

### 3a. `config/profile.yml` — what to change

Open `config/profile.yml` and walk the blocks below. Guna’s values are the pattern; yours go in the same places.

**1. Contact (`candidate:`)**

```yaml
# EXAMPLE (Guna) — replace with yours
candidate:
  full_name: "Guna Sekhar"
  email: "hi@sguna.dev"
  phone: "6309665267"
  location: "Hyderabad, Telangana, India"
  linkedin: "linkedin.com/in/sgunaar"
  portfolio_url: "https://sguna.dev"
  github: "https://github.com/sgunaR"
```

Change: `full_name`, `email`, `phone`, `location`, `linkedin`, `portfolio_url`, `github`.

**2. Target roles + YOE (`target_roles:`)**

```yaml
# EXAMPLE (Guna) — same shape; your titles + years
target_roles:
  primary:
    - "SAP Consultant (SAP BTP & CPI)"
    - "Full Stack Engineer (Applied AI + DevOps)"
  years_experience: 2.5
  archetypes:
    - name: "SAP Consultant (SAP BTP & CPI)"
      level: "Mid"
      fit: "primary"
    - name: "Full Stack Engineer (Applied AI + DevOps)"
      level: "Mid"
      fit: "primary"
```

Change: role names if yours differ, `years_experience`, archetype `level` / `fit`.  
If you keep the same two archetypes as the team, you can leave titles as-is and only fix YOE/level.

**3. Story (`narrative:`)**

```yaml
# EXAMPLE (Guna) — rewrite in your voice; keep one headline + exit_story + superpowers
narrative:
  headline: "Full Stack + Applied AI  ·  SAP BTP & CPI Consultant"
  exit_story: "Software engineer with ~2.5 years in Full-Stack + Applied AI …"
  superpowers:
    - "Full-stack delivery with Node.js, React, and Next.js"
    - "…"
  proof_points:
    - name: "SAP BTP Integration Delivery"
      hero_metric: "Designed and delivered 20+ iFlows …"
```

Change: `headline`, `exit_story`, every `superpowers` bullet, every `proof_points` metric — only claims that are true for **you**.

**4. Comp + location (`compensation:` / `location:`)**

```yaml
# EXAMPLE (Guna)
compensation:
  target_range: "900000-1300000"
  currency: "INR"
  minimum: "900000"
location:
  country: "India"
  city: "Hyderabad"
  timezone: "IST"
```

Set your own range, currency, city, timezone.

**Quick AI prompt (in this repo):**

> Using `config/profile.yml` as the example structure (Guna’s), rewrite it with my details: [paste LinkedIn / bullets]. Keep the same YAML keys. Do not invent metrics.

### 3b. `cv.md` — what to change

Open `cv.md`. Keep the **sections and shape**; swap content for yours.

**Structure to mirror (Guna’s example):**

1. `# Your Name`  
2. One-line headline (e.g. role mix)  
3. `## Contact` — email, phone, LinkedIn, portfolio, GitHub, location  
4. `## Summary` — ~2–4 sentences, honest YOE  
5. `## Core Competencies` — labeled groups (his example: Full-Stack + Applied AI, then SAP BTP & CPI)  
6. `## Skills` — Cloud / Testing / etc. as short lists  
7. `## Experience` — `### Company — Location`, then `**Title**`, dates, bullets (verb-led; only real work)  
8. `## Education` / `## Languages`

**EXAMPLE shape from Guna’s CV (do not copy facts):**

```markdown
# Guna Sekhar

**Full Stack + Applied AI  ·  SAP BTP & CPI Consultant**

## Contact
- Email: hi@sguna.dev
- …

## Summary
Software engineer with ~2.5 years of experience shipping full-stack …

## Core Competencies
### Full-Stack + Applied AI & Deployment
- …
### SAP BTP & CPI
- …

## Experience
### Proclink — Hyderabad, India
**Software Developer**
May 2024 - Present
- …
```

Your version: same headings; **your** employers, titles, dates, bullets, skills.  
If you only do Full-Stack (no SAP), keep one competency/skills block — still use the same markdown conventions so PDF generation works.

**Quick AI prompt:**

> Using `cv.md` as the layout example (Guna’s), rewrite the entire file with my experience from [paste]. Keep section names. Keywords reformulate only — never invent employers or metrics.

### 3c. Verify

```bash
node doctor.mjs --json
# Want: "onboardingNeeded": false
```

Optional extras (brief / voice only — not required for scanning):

```bash
node doctor.mjs --json --init-templates
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

`local/` and `data/` stay on your machine (gitignored). Tracked files like `cv.md` / `profile.yml` update when you `git pull` — if you customized them locally, resolve conflicts carefully or stash first.

---

## 9. What to commit vs not

**OK to commit (team):** `portals.yml`, modes, providers, docs.  
**Example profile/CV:** already in the repo as Guna’s reference — only push changes to them if the team wants a new shared example.

**Do not commit:** `.env`, `local/`, `data/`, `output/`, `reports/`, `jds/`, `tmp/`, PDFs, scan history.

After you personalize `cv.md` / `profile.yml` for yourself, prefer keeping those edits local (or on a private branch) so you don’t overwrite the shared example for everyone.

---

## 10. Stuck?

| Symptom | Fix |
|---------|-----|
| `onboardingNeeded: true` | Finish editing `cv.md` + `config/profile.yml` (see §3); re-run `node doctor.mjs --json` |
| No `local/india-scan` | `node templates/india-scan/bootstrap.mjs` |
| India board empty / blocked | Run `--login <board>` once; see `templates/india-scan/README.md` |
| `/local` is **404** | Pull latest `feature/sguna-customizations` (routes live under `web/src/app/local/` and must be tracked). Restart `cd web && npm run dev`. You do **not** need root `local/` for the dashboard pages. |
| Playwright errors | `npx playwright install chromium` |

More detail: [`docs/portal-expansion-plan.md`](docs/portal-expansion-plan.md) · [`docs/portal-expansion-reference.md`](docs/portal-expansion-reference.md) · [`templates/india-scan/README.md`](templates/india-scan/README.md)
