# Open-source contribution

A second track beside `strategy/linkedin-proof-outreach.md`. That file is for a founder who has named a problem. This file is for joining a codebase that already exists, shipping a small fix, and keeping the proof public.

The point is a merged pull request on a project a serious team maintains. A starred tutorial repo and a drive-by typo do not count. Nothing is claimed as “I built this project” unless `cv.md` already says that. A merged PR is a contribution. Say it that way.

## Skills to filter on

Use two lists. A repo has to match the first list on day one. The second list is allowed only as one new thing inside a repo that already matches the first.

Already on `cv.md`, so these are fair filters:

- Languages: Python, JavaScript
- Apps: FastAPI, Node.js, React, Next.js
- Agents: LangGraph, CrewAI, tool calling, MCP-style services
- Data and delivery: PostgreSQL, Redis, Kafka, Docker, Kubernetes, Terraform, GitHub Actions, Pytest, Playwright
- SAP, only when the repo is actually Integration Suite, CPI, Cloud Foundry, or Kyma. Most startup repos will not be this. Do not force SAP onto a web framework.

Grow on purpose, one at a time. Edit this list when the goal changes. Starting set, because job posts keep asking and the base skill is already there:

| Skill to add | Why this one | Where it is allowed |
| --- | --- | --- |
| TypeScript | JavaScript is already in daily use. A lot of the active product repos are TypeScript. | A React or Next.js repo whose tests you can run. Not a first PR that is only a type migration. |
| One agent API you have not shipped | LangGraph and CrewAI are already on the CV. A new one belongs in a repo that already does agents. | After the first merged Python or FastAPI PR, not before. |

Do not add Java, Go, Django, .NET, SAP CAP, or UI5 as the growth target until one of those is a real choice. They are gaps, not the next week of work.

## Where to look

Use the sites as finders. The decision still happens on the GitHub (or GitLab) repo.

| Source | Use it for | Leave it when |
| --- | --- | --- |
| [opensourceprojects.dev](https://www.opensourceprojects.dev/) | A short list of projects people are actually talking about. | The page is a gallery and the repo underneath is quiet. |
| [ossium.in](https://ossium.in/) | Trending repos, open issues, bounties, GSoC orgs, and its YC-backed open-source companies section. Language and topic filters are the main cut. | A bounty that needs a skill from outside both lists above. |
| GitHub search | The check the directories cannot do: last push, `good first issue`, `help wanted`, tests, a CONTRIBUTING file. | The only signal is a star count. |
| A funding announcement plus the company’s public org | “Recently funded” only counts if the company has a public repo you can build. YC-backed listings on Ossium are the fastest version of this. | The company raised money and the code is closed. |

Run one category at a time from the dashboard Open source page, or from the checkout. Each search returns up to 100 repositories and ranks them for a first contribution:

```bash
node strategy/find-repos.mjs --write
```

That refreshes `strategy/repo-candidates.md` from GitHub: Python/FastAPI, Next.js, agents, and YC-tagged repos pushed in the last 30 days. Set `GITHUB_TOKEN` if the search rate limit hits. The table is a shortlist. Running the project still decides.

Search strings that match the current lists:

- `language:Python topic:fastapi pushed:>2026-09-01`
- `language:JavaScript topic:nextjs good-first-issues:>1 pushed:>2026-09-01`
- `language:Python topic:llm OR topic:agents pushed:>2026-09-01`

Swap in `language:TypeScript` only when TypeScript is the skill you are growing that month.

A funded startup is a better target than a famous framework when both are active. The startup’s issue is closer to product work. The framework’s issue is often a docs nit or a design argument you cannot finish in a week.

## Pick one repo

Keep a repo only if all of these are true:

- The last commit on the default branch is inside 30 days.
- You can run the tests, or the app, from the README in under an hour.
- There is at least one open issue you understand without a maintainer call.
- The stack is in the “already on cv.md” list, plus at most one row from the growth table.
- A human maintains it: issues get replies, or a release happened this quarter.
- You would mention the project in a conversation without explaining a joke.

Drop it when the issue is “update the year in the license,” the repo is a course homework, or the only recent commits are dependency bots.

Write three candidates before cloning the one you will touch. Columns:

| Repo | Last push | Funded or YC? | Stack match | Issue you could take | Why not the others |
| --- | --- | --- | --- | --- | --- |

One active repo at a time. A second clone is notes, not a second promise.

## The first contribution

Week 1 is reading, not a feature.

1. Run the project. Note the command that worked.
2. Read CONTRIBUTING and the last five merged PRs. Copy their shape: title, test, size.
3. Comment on one issue with what you would change and which file. Wait one day. If the maintainer says it is taken, pick another issue in the same repo. Do not open a surprise PR.
4. The PR fixes that issue, includes a test or a clear manual check, and stays small enough to review in one sitting.
5. Answer review comments. Do not open a second PR while the first is waiting.

A good first PR is a bug, a missing test, a broken example, or a small API gap. It is not a rewrite and not a new framework inside their framework.

SAP lane, separate and smaller: [SAP-samples](https://github.com/SAP-samples) and the Integration Suite repos are the place for CPI or BTP work. Treat them with the same rules. A sample that has not been touched in a year is not a target.

## Four weeks

Week 1. Filter Ossium and opensourceprojects.dev down to three repos. Run one. Comment on one issue.

Week 2. Open the PR. Follow it until it is merged or the maintainer closes it with a reason you understand.

Week 3. Only if the first PR merged: take a second issue in the same repo, and let one growth skill appear in it. If the first PR is still open, stay on the review. Do not start a new org.

Week 4. Write a five-line note: repo, issue, what changed, link to the merged PR. That note can go into a conversation or a CV bullet only after the PR is merged, and only as a contribution.

Hours: about 5–8 a week. This track loses to a paid work week and to the three-company outreach track when both want the same evening. Finish the open PR before starting a founder demo.

## What to record

Keep a short log in this folder only when a PR is opened. One file per repo is enough later. Until then, the candidate table above is the record.

Say: “Contributed X to <repo>.” Do not say you founded it, maintain it, or that the project’s users are your users.

## Skip

- A repo you cannot build.
- An issue that needs a skill you marked as off-limits.
- Ten open PRs across ten orgs.
- A bounty you cannot finish in the stated time.
- Adding the project to `cv.md` before the PR is merged.
