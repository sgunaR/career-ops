# Smallcaps LaTeX CV toolkit (seed)

Tracked seed for the house-style CV. Runtime copies live in gitignored `local/` so `git pull` / `update-system` never overwrite a machine's tailored payloads.

## One-time bootstrap (every clone)

```bash
node templates/cv-smallcaps/bootstrap.mjs
```

That installs into `local/`:

| File | Role |
|------|------|
| `cv-template.smallcaps.tex` | Kunika Malhotra–style small-caps template |
| `build-cv-smallcaps.mjs` | JSON payload → `.tex` |
| `make-cv.mjs` | build → fact gate → compile → ATS → **max 2 pages** → optional `--report` |
| `pdf-ats-check.py` | ATS + keyword coverage on the real PDF (`pip install pymupdf`) |
| `cv-payload-*.example.json` | Starting payloads (skipped if you already have local copies) |

Requires: `tectonic` on PATH, Python 3 + `pymupdf`.

## Generate

```bash
node local/make-cv.mjs local/cv-payload-fullstack.example.json \
  --company example --keywords "Node.js,Python" --max-pages 2 --report 1
```

Hard page limit defaults to **2**. Exit 1 if the PDF is longer — trim lower-priority bullets; keep every employer from `cv.md`.
