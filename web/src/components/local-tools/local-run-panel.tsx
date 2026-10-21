"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { INDIA_BOARDS, type LocalToolAction } from "@/lib/local-tools-shared";
import { CopyLine, LocalSection } from "@/components/local-tools/local-ui";
import {
  LocalToolLog,
  LocalToolsLoading,
  configuredCliId,
  useLocalToolRunner,
} from "@/components/local-tools/local-tool-runner";

const WAVE_TEXT = [
  "# 1. India first",
  "node local/india-scan/run.mjs --board naukri --max-pages 1",
  "node local/india-scan/run.mjs --board linkedin --max-pages 1   # optional second board",
  "# node local/india-scan/run.mjs --all --max-pages 1            # all 9 boards — weekly sweep, not a daily habit",
  "",
  "# 2. Remote boards (every few days)",
  "npm run scan",
  "",
  "# 3. A specific employer (only if you want it)",
  "node local/scan-career.mjs --company SAP",
  "",
  "# 4. Startups (weekly)",
  "npm run scan:yc",
  'node local/scan-companies.mjs "Top Startups"',
  "",
  "# 5. See what landed, then shortlist in Pipeline",
  "node stats.mjs --summary",
].join("\n");

const CHAT: { want: string; say: string }[] = [
  { want: "Turn my Pending list into scored reports", say: "/career-ops pipeline" },
  { want: "Evaluate one job", say: "Paste the JD or URL, or: /career-ops oferta" },
  { want: "Quick first-pass filter before a full evaluation", say: "/career-ops triage" },
  { want: "Compare several offers", say: "/career-ops ofertas" },
  { want: "Make my CV for a report", say: "Generate the LaTeX CV for report 38" },
  { want: "Fill in an application form", say: "/career-ops apply" },
  { want: "Find who to contact at a company", say: "/career-ops contacto" },
  { want: "Cover letter", say: "/career-ops cover" },
  { want: "Application email", say: "/career-ops email" },
  { want: "Research a company", say: "/career-ops deep" },
  { want: "Prepare for an interview", say: "/career-ops interview-prep" },
  { want: "Update a status", say: "Mark #38 as Applied" },
  { want: "What follow-ups are due", say: "/career-ops followup" },
  { want: "Discover jobs when the scanners aren't enough (uses tokens, backup only)", say: "/career-ops scan" },
];

export function LocalRunPanel() {
  const { status, busy, label, logs, result, start } = useLocalToolRunner();
  const [dryRun, setDryRun] = useState(false);

  if (!status) return <LocalToolsLoading />;

  const scan = async (action: LocalToolAction, extra: Record<string, unknown> = {}) => {
    const out = await start(action, { ...extra, dryRun });
    if (out?.ok && !dryRun && status.harvestCompanies) {
      const cli = configuredCliId();
      await start("harvest-companies", cli ? { cli } : {}, { append: true });
    }
  };

  const btn = (enabled: boolean, text: string, run: () => void, primary = false) => (
    <button
      type="button"
      disabled={busy || !enabled}
      onClick={run}
      className={
        primary
          ? "inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground disabled:opacity-50"
          : "inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm disabled:opacity-50"
      }
    >
      {busy && <Loader2 className="size-3.5 animate-spin" />}
      {text}
    </button>
  );

  const rows: { n: number; title: string; when: string; buttons: ReactNode; cli: string; cliAlt?: { label: string; command: string } }[] = [
    {
      n: 1,
      title: "India boards",
      when: "Every day: best density for your titles",
      buttons: (
        <>
          {btn(status.indiaScan, "Naukri", () => void scan("india-scan", { board: "naukri", maxPages: 1 }), true)}
          {btn(status.indiaScan, "LinkedIn", () => void scan("india-scan", { board: "linkedin", maxPages: 1 }))}
          {btn(status.indiaScan, "All 9 boards", () => void scan("india-scan", { boards: [...INDIA_BOARDS], maxPages: 1 }))}
          <Link href="/local/india" className="rounded-full border border-border px-4 py-2 text-sm hover:border-brand/40">
            More boards…
          </Link>
        </>
      ),
      cli: "node local/india-scan/run.mjs --board naukri --max-pages 1",
      cliAlt: { label: "All 9 boards at once (weekly sweep, not a daily habit)", command: "node local/india-scan/run.mjs --all --max-pages 1" },
    },
    {
      n: 2,
      title: "Remote job boards",
      when: "Every few days",
      buttons: btn(true, "Scan all remote boards", () => void scan("scan-all"), true),
      cli: "npm run scan",
    },
    {
      n: 3,
      title: "A specific employer",
      when: "Only if you want that company",
      buttons: (
        <>
          {btn(status.scanCareer, "SAP career page", () => void scan("scan-career", { companies: ["SAP"], maxPages: 1 }), true)}
          <Link href="/local/outside-india#career-pages" className="rounded-full border border-border px-4 py-2 text-sm hover:border-brand/40">
            Other companies…
          </Link>
        </>
      ),
      cli: "node local/scan-career.mjs --company SAP",
    },
    {
      n: 4,
      title: "Startups",
      when: "Weekly",
      buttons: (
        <>
          {btn(status.scanAtsFull, "YC companies", () => void scan("scan-yc"), true)}
          {btn(status.scanCompanies, "Top Startups", () => void scan("scan-companies", { companies: ["Top Startups"] }))}
          <Link href="/local/outside-india#startups" className="rounded-full border border-border px-4 py-2 text-sm hover:border-brand/40">
            More startup sources…
          </Link>
        </>
      ),
      cli: "npm run scan:yc",
    },
  ];

  return (
    <div className="space-y-6">
      <LocalSection id="cli" n={4} title="From the command line" hint="The daily wave, in priority order">
        <label className="flex items-start gap-2 text-xs text-muted">
          <input type="checkbox" className="mt-0.5" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
          <span>
            <strong className="text-foreground">Dry-run</strong>: fetch and filter, write nothing. Applies to the buttons below.
          </span>
        </label>

        <ol className="mt-4 space-y-4">
          {rows.map((r) => (
            <li key={r.n} className="border-b border-border pb-4 last:border-b-0 last:pb-0">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-xs font-semibold text-brand">{r.n}</span>
                <h3 className="text-sm font-medium text-foreground">{r.title}</h3>
                <span className="text-xs text-faint">{r.when}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">{r.buttons}</div>
              <CopyLine text={r.cli} className="mt-2" />
              {r.cliAlt && (
                <div className="mt-1.5">
                  <p className="mb-1 text-xs text-faint">{r.cliAlt.label}:</p>
                  <CopyLine text={r.cliAlt.command} />
                </div>
              )}
            </li>
          ))}
          <li>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-xs font-semibold text-brand">5</span>
              <h3 className="text-sm font-medium text-foreground">See what landed</h3>
              <span className="text-xs text-faint">Then shortlist</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href="/pipeline"
                className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground"
              >
                Open Pipeline <ArrowRight className="size-3.5" />
              </Link>
            </div>
            <CopyLine text="node stats.mjs --summary" className="mt-2" />
          </li>
        </ol>

        <p className="mb-1.5 mt-5 text-xs font-medium text-foreground">The whole wave, to paste into a terminal</p>
        <CopyLine text={WAVE_TEXT} prefix="" />
      </LocalSection>

      <LocalSection id="chat" n={5} title="From chat" hint="Claude Code, Cursor, Codex, or the Assistant in this app">
        <p className="text-xs text-muted">
          Open a chat in this repo and paste one of these. Slash commands run career-ops modes; you can also just describe the
          task in your own words. The Assistant in this web app can do the same from the pages you're already on.
        </p>
        <ul className="mt-4 space-y-3">
          {CHAT.map((c) => (
            <li key={c.say}>
              <p className="mb-1 text-xs text-muted">{c.want}</p>
              <CopyLine text={c.say} prefix="›" />
            </li>
          ))}
        </ul>
        <p className="mb-1.5 mt-5 text-xs font-medium text-foreground">One-shot, without an open session</p>
        <div className="space-y-1.5">
          <CopyLine text='claude -p "Run career-ops pipeline mode for data/pipeline.md"' />
          <CopyLine text='codex exec "Run career-ops pipeline mode for data/pipeline.md."' />
        </div>
        <p className="mt-4 text-xs text-faint">
          The steps after this (evaluate, CV, apply, contacts, cover letter, tracking) are on the{" "}
          <Link href="/local/apply" className="text-muted underline-offset-2 hover:underline">Apply page</Link>.
        </p>
      </LocalSection>

      <LocalToolLog busy={busy} label={label} result={result} logs={logs} />
    </div>
  );
}
