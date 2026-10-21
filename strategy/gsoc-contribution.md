# GSoC contribution track

Use this alongside `open-source-contribution.md` when targeting Google Summer of Code.

## Dashboard

Open `/gsoc` in the web app (nav: **GSoC**). It lists mentoring organizations from 2016–2026, with:

- Official GSoC categories (Security, Web, Infrastructure and cloud, …)
- Topic facets (Web3, Machine learning, Cloud topics)
- Year filters and search over name / topics / technologies
- Trend charts (orgs, projects, returning vs newcomers per year)
- A **2027 likelihood** heuristic (streak + recency + project trend) — not an official list
- **First-timer edge** — orgs likely to return but less crowded (few slots, fewer years, not a household name). Good for a first contribution before applications open.

## CLI

```bash
node strategy/gsoc-orgs.mjs --json
node strategy/gsoc-orgs.mjs --json --category Security --year 2026
node strategy/gsoc-orgs.mjs --json --facet web3 --likelihood high
node strategy/gsoc-orgs.mjs --json --edge              # first-timer edge shortlist
node strategy/gsoc-orgs.mjs --json --refresh   # bypass 24h cache
```

Data source: [api.gsocorganizations.dev](https://api.gsocorganizations.dev/) (scraped archive of the official GSoC program). Cache: `strategy/.gsoc-cache.json` (gitignored).

## How to use it for GSoC 2027

1. Filter to categories you care about (e.g. Security, Web).
2. Prefer **high** likelihood orgs that also appear in the latest program year — start contributing there now.
3. Read the org’s ideas list / contributing docs; make a small PR before applications open.
4. Re-check `/gsoc` after official 2027 org announcements and drop the heuristic.
