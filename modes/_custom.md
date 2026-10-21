# Custom Instructions -- career-ops

<!-- ============================================================
     THIS FILE IS YOURS. It will NEVER be auto-updated.
     Procedural rules only — no factual claims about experience.
     ============================================================ -->

## House Rules

- Prefer Cursor Agent on this repo for evaluations (Cursor Pro + Auto). Do not route the main workflow through OpenCode/OpenRouter unless I ask.
- **Pipeline waves:** process Pending in waves of **~20** URLs at a time (context + cost stay sane). When a wave finishes, **immediately start the next wave** until Pending is empty — do not stop after one wave unless I say stop. I may still trim the inbox by hand before a run.
- **Single CV (2026-10-20):** always use **`cv.md`** for Full-Stack, Software Engineer, Backend, AI Engineer, SAP BTP, SAP CPI Consultant, and hybrids. Never pick `cv-full-stack.md` or `cv-sap-btp-cpi.md` for new PDFs or board uploads (those files are retired). Tailor by reordering/rephrasing from `cv.md` only — lead with SAP bullets for SAP titles, Full-Stack/AI bullets for software/AI titles. Never "Track A/B" labels.
- **Board + LinkedIn uploads:** Hirist / Instahyre / Naukri / LinkedIn → same `cv.md` (or PDF built from it).
- Experience band: **~2.5 years** — prefer Mid / Software Engineer; skip Staff / Principal / Manager / Architect unless I override.
- Below 4.0/5: recommend against applying unless I give a specific reason.
- SAP-only discovery experiment is **ended** — use the broad title_filter + india-scan keywords again.
- **No-CLI-login fallback for bulk pipeline processing (2026-09-27):** I don't run `claude login`, so `batch/batch-runner.sh` (which spawns standalone `claude -p` processes) is not available to me. When I ask to process a large chunk of the inbox and want it faster than one-at-a-time chat, use the **Agent tool to dispatch several subagents in parallel, inside this same session** — no separate CLI auth needed since they run under the same login. Each subagent evaluates its own offer(s) using WebFetch instead of the shared Playwright browser (subagents can't safely share one browser pane — see `modes/pipeline.md`'s concurrency rule), and marks its report header `**Verification:** unconfirmed (parallel subagent, no browser)` — the same honest exception `AGENTS.md` already defines for headless batch workers. Before dispatching, still run the cheap title/YOE pre-screen (archetype fit, hard DQ from `modes/_brief.md`) to avoid burning subagents on obvious mismatches. To trigger this in a fresh chat: **"Process the pipeline inbox using parallel subagents (no CLI login available)."**

## Custom Workflows

### LaTeX CV house style (overrides `modes/pdf.md` render, `modes/latex.md` steps 11-13, and the dashboard Generate PDF button)

Every CV PDF uses the small-caps Overleaf-style template (`local/cv-template.smallcaps.tex` — Kunika Malhotra style). That includes `/career-ops pdf`, auto-pipeline step 3, evaluation keepers (≥4.0), bulk regen, and the web app's Generate PDF button. Do NOT use `build-cv-html.mjs`, `generate-pdf.mjs`, `build-cv-latex.mjs`, `templates/cv-template.tex` / `templates/cv-template.html`, or `tmp/regen-cv-4plus-html.mjs` (deprecated HTML/sb2nov path). Bulk regen: `node tmp/regen-cv-4plus-smallcaps.mjs`. The template is user-owned, in gitignored `local/`, so `git pull` and `update-system` never touch it:

1. Base CV is always **`cv.md`** (all archetypes). Also read `config/profile.yml` + `modes/_profile.md` — never invent skills or metrics. Do not use `cv-full-stack.md` / `cv-sap-btp-cpi.md`.
2. Tailor the summary and the competency line to the JD (reformulate, never fabricate). **Re-read `cv.md` at the start of every generation** (it changes; a payload built from an old read misses new metrics and contact details). Include the quantified "Result:" figures that `cv.md` states, and only those. **Do not shorten the CV to one page.** Copy every experience bullet from `cv.md` for every employer. You may reorder bullets so the JD-relevant ones come first (SAP-first for SAP titles; Full-Stack/AI-first for software/AI titles), and you may reword a bullet so it uses the JD's phrase when that phrase names the same thing `cv.md` already states. You may not drop a bullet, merge several bullets into one, or cut a Result figure to save space. The skills block keeps every category and item from `cv.md`. Three pages are acceptable. Do not shrink fonts.
3. Write a JSON payload (schema in the header of `local/build-cv-smallcaps.mjs`: name, phone, location, email/linkedin/github/portfolio `{url, display}`, summary, optional `competencies[]`, `experience` `[{company, location, role, dates, bullets}]`, optional `projects` `[{name, url, employer, tech, description}]`, education, skills `[{category, items}]`; use `--` in dates; `**bold**` is supported in bullets/summary/project descriptions). Sections render as: Professional Summary, Core Competencies, Work Experience, Projects, Education, Skills. **`experience` must include every employer and every bullet from `cv.md` (2026-10-17: collapsing each role to a handful of bullets, and dropping skill rows, was the bug. 2026-09-27: dropping an employer was a separate bug).** If a draft would exceed 3 pages, stop and ask which bullets to cut. Do not decide that yourself.
4. Extract 15-20 JD keywords (literal phrases) and write the JD to `jds/{slug}.md`. For each phrase that `cv.md` already supports, the phrase must appear verbatim in the summary, the Core Competencies line, or a bullet. Bold the first occurrence with `**phrase**`. A phrase `cv.md` does not support stays off the CV and is listed as a gap. `--keywords` only measures coverage after the PDF exists. It does not insert words. Then run: `node local/make-cv.mjs <payload.json> --company {slug} --jd jds/{slug}.md --keywords "phrase1,phrase2,..." --max-pages 3 --report {NNN}` (pass the evaluation report number whenever the role is tracked — required for the web Pipeline page). It runs, in order: build .tex -> **fact gate** (`verify-cv-facts.mjs`, hard stop before rendering) -> compile PDF -> `jd-skill-gap.mjs` -> **ATS check + keyword coverage** on the real PDF (`local/pdf-ats-check.py`; `verify-ats.mjs` only reads HTML) -> page limit (`--max-pages N`, default 3; exit 1 if exceeded) -> **`register-pdf.mjs --mark`** (writes `data/pdf-index.tsv` + flips tracker PDF ❌→✅ so the dashboard shows **View tailored CV** instead of Generate).
5. Report from its JSON: PDF path, pages, ATS structural score, keyword coverage % and the missing keywords, fact-gate result, whether the header has a phone number, and `webIndex: ok`. Missing keywords that `cv.md` does not back are real gaps: list them, never add them. A `LOW CONFIDENCE` skill-gap result is NOT a pass: read the JD yourself and say the automated check found nothing. If you built a PDF without `--report`, run `node register-pdf.mjs {NNN} {pdf-path} --mark` before telling me the CV is ready for the web UI.
6. **After every evaluation that produces a report** (pipeline / oferta / web Evaluate): `node merge-tracker.mjs` so the Pipeline page lists the new row. When a CV is also produced for that report, the `--report` / `register-pdf --mark` step above is mandatory — files in `output/` alone do not update the UI.
7. If the fact gate fails, fix the payload (remove the invented metric or add evidence to `cv.md`), never bypass it. Keep skill category labels to ~18 characters or fewer (the label column is 1.3in; longer ones wrap and collide with the values).

Engine: `tectonic` (installed via scoop). Its first compile downloads packages (~4 min); later compiles take ~2s. If `tectonic` is not on PATH in a shell, add `~/scoop/shims`.

### CV format

Use the small-caps LaTeX CV only. Do not generate the screen HTML format. Keep the full `cv.md` experience. Pass `--max-pages 3`.

Content rules that still apply inside the LaTeX CV: open each bullet with a verb already used in `cv.md`, keep the Result figures `cv.md` states, drop personal pronouns (including "them"), and do not repeat the same tool in every bullet. Do not add a graduation year. Do not add a skill the JD names unless `cv.md` already states it.

### Ordered daily wave (fast path)

Canonical playbook: `docs/portal-expansion-plan.md` (numbered steps 1–14: setup → discover → run → shortlist → evaluate → CV → apply → contacts → cover letter → track). Board-by-board detail and regression lanes: `docs/portal-expansion-reference.md`. The web app mirrors the same steps under `/local`; after changing a `/local` page run `node local/restore-dashboard-local.mjs --sync`.

```text
1. India boards (₹0)     → one board first, not --all
2. Career pages + remote (₹0) → npm run scan  (or --company for careers-only)
3. Shortlist (optional) → data/pipeline.md — then pipeline waves of ~20 until empty
4. /career-ops pipeline  → fit vs profile (paid)
5. Keepers               → pdf → apply (stop before Submit) → email/contacto → set-status Applied
```

### india-scan (Phase 3b — low / zero LLM cost)

Indian boards use **local Playwright scripts** in `local/india-scan/` (gitignored — safe on `git pull`).

Implemented: naukri, linkedin, instahyre, cutshort, foundit, hirist, indeed-india, peerlist, wellfound. Deferred: apna.

```bash
node templates/india-scan/bootstrap.mjs   # once / after template updates
npm run verify:india                      # health canary (like verify-portals)
node local/reset-scan-inbox.mjs --yes     # optional: wipe discovery inbox/history (keeps reports)
node local/reset-evaluations.mjs --yes    # optional: wipe reports + tracker (keeps discovery)
# Multi-company (never edit scan.mjs): node local/scan-companies.mjs SAP,Himalayas
node local/india-scan/run.mjs --login naukri
node local/india-scan/run.mjs --login linkedin

# Daily: India first, then full remote + SAP
node local/india-scan/run.mjs --board naukri --max-pages 1
# Optional: node local/india-scan/run.mjs --board peerlist --max-pages 1
# Optional: node local/india-scan/run.mjs --board wellfound --max-pages 1
npm run scan

# Review data/pipeline.md  |  web UI: cd web && npm run dev
# /career-ops pipeline     # shortlisted URLs only (paid)
```

1. India boards — **one board**, **list**, or **all**, with `--max-pages N`.
2. `npm run scan` for remote aggregators + tracked career pages (or `--company` for careers-only).
3. Shortlist in `data/pipeline.md`.
4. `/career-ops pipeline` only for picks (paid step).
5. Keepers → pdf → apply assist → email/contacto → `set-status Applied`.

Filters: Full Stack / Backend / AI / SAP BTP–CPI via `portals.yml` + india-scan keywords. YOE/skills still need `/career-ops pipeline`.

### company-careers

When I paste a new company careers URL:

1. Detect ATS (Workday / Greenhouse / Ashby / Lever / SuccessFactors / other).
2. If supported → add to `tracked_companies` in `portals.yml` with the right `provider` / `api`.
3. If not → offer local parser or agent-only handling.
4. Validate with `node validate-portals.mjs --file portals.yml`.
5. Prefer `node scan.mjs --company <Name>` to verify without a full remote sweep.
6. **Do not add companies to `tracked_companies` unless I ask** — default monitored set is remote boards + SAP + India (india-scan).

## Output Preferences

- After scans: lead with new-offer count, then top matches by title fit (Full Stack / Backend / AI / SAP BTP–CPI), then known flaky sources (EchoJobs 403, Remote.co 403, Muse timeouts, Hubstaff freelance noise, Peerlist/Wellfound need login).
- Reports: score + one-line verdict first; keep YOE framing at ~2.5 years.

## Off-Limits

- Never auto-submit an application.
- Never put personalization into `modes/_shared.md` or other system-layer files.
- Never fabricate CV claims; keywords reformulate only from `cv.md` / profile / article-digest.
