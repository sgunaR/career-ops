"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import type { LocalToolAction, LocalToolsStatus } from "@/lib/local-tools-shared";
import { LocalBoardHealth } from "@/components/local-tools/local-board-health";
import { CopyLine, LocalSection, Pill } from "@/components/local-tools/local-ui";
import {
  LocalToolLog,
  LocalToolsLoading,
  configuredCliId,
  useLocalToolRunner,
} from "@/components/local-tools/local-tool-runner";

type Item = {
  key: string;
  title: string;
  desc: string;
  writes: boolean;
  ready: (s: LocalToolsStatus) => boolean;
  action: LocalToolAction;
  extra?: Record<string, unknown>;
  /** review-only lists are always run as a dry-run and never touch the pipeline */
  alwaysDryRun?: boolean;
  cli: string;
  label?: string;
};

const STARTUPS: Item[] = [
  {
    key: "yc",
    title: "Y Combinator companies",
    desc: "Takes YC's company list, finds each company's own job board (Greenhouse, Ashby, Lever) and keeps roles that match your filters. Slow: run weekly.",
    writes: true,
    ready: (s) => s.scanAtsFull,
    action: "scan-yc",
    cli: "npm run scan:yc",
  },
  {
    key: "seeds",
    title: "YC + a16z companies",
    desc: "The same, adding Andreessen Horowitz's portfolio companies. Slower: weekly at most.",
    writes: true,
    ready: (s) => s.scanAtsFull,
    action: "scan-seeds",
    cli: "npm run scan:seeds",
  },
  {
    key: "speedrun",
    title: "a16z Speedrun job board",
    desc: "A ready-made job board of Speedrun startups. Fast.",
    writes: true,
    ready: (s) => s.scanCompanies,
    action: "scan-companies",
    extra: { companies: ["a16z Speedrun Talent"] },
    cli: 'node local/scan-companies.mjs "a16z Speedrun Talent"',
  },
  {
    key: "topstartups",
    title: "Top Startups (remote)",
    desc: "A ready-made board of remote roles at funded startups. Fast.",
    writes: true,
    ready: (s) => s.scanCompanies,
    action: "scan-companies",
    extra: { companies: ["Top Startups"] },
    cli: 'node local/scan-companies.mjs "Top Startups"',
  },
  {
    key: "hn",
    title: 'Hacker News "Who is hiring"',
    desc: "This month's hiring thread: high-signal startup posts. It's one thread per month, so an empty result early in the month is normal.",
    writes: true,
    ready: (s) => s.scanCompanies,
    action: "scan-companies",
    extra: { companies: ["Hacker News Who is Hiring"] },
    cli: 'node local/scan-companies.mjs "Hacker News Who is Hiring"',
  },
  {
    key: "funded",
    title: "Recently funded companies",
    desc: "A research list of newly funded companies. Nothing is added to your pipeline. Pick a company you like, then add its careers page under 2C below.",
    writes: false,
    ready: (s) => s.companyFunded,
    action: "company-funded",
    alwaysDryRun: true,
    cli: "npm run company:funded -- --dry-run --limit 25",
    label: "Show list",
  },
];

export function LocalOutsideIndiaPanel() {
  const { status, busy, label, logs, result, start } = useLocalToolRunner();
  const [dryRun, setDryRun] = useState(false);
  const [company, setCompany] = useState("SAP");
  const [several, setSeveral] = useState("EY, Advance Auto Parts");
  const [maxPages, setMaxPages] = useState(1);

  if (!status) return <LocalToolsLoading />;

  // Run a scan; on success refresh the company directory (kept out of the way of the scan's own log).
  const scan = async (action: LocalToolAction, extra: Record<string, unknown> = {}) => {
    const out = await start(action, { ...extra, dryRun });
    if (out?.ok && !dryRun && status.harvestCompanies) {
      const cli = configuredCliId();
      await start("harvest-companies", cli ? { cli } : {}, { append: true });
    }
  };

  const runItem = (it: Item) =>
    it.alwaysDryRun ? void start(it.action, { ...it.extra, dryRun: true }) : void scan(it.action, it.extra);

  const csv = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

  const runBtn = (enabled: boolean, onClick: () => void, text: string, primary = true) => (
    <button
      type="button"
      disabled={busy || !enabled}
      onClick={onClick}
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

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { href: "#startups", k: "2A", t: "Startups", d: "Lists of startup companies, and startup job boards. Weekly." },
          { href: "#remote-boards", k: "2B", t: "Remote job boards", d: "Ready-made boards for remote work worldwide. Every few days." },
          { href: "#career-pages", k: "2C", t: "Company career pages", d: "One employer's own careers site. When you want that employer." },
        ].map((c) => (
          <a key={c.k} href={c.href} className="rounded-xl border border-border bg-surface/40 p-4 transition hover:border-brand/40">
            <p className="text-xs font-semibold text-brand">{c.k}</p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">{c.t}</p>
            <p className="mt-1 text-xs text-muted">{c.d}</p>
          </a>
        ))}
      </div>

      <LocalBoardHealth lane="outside" busy={busy} />

      <label className="flex items-start gap-2 rounded-lg border border-border bg-surface/40 px-3 py-2.5 text-xs text-muted">
        <input type="checkbox" className="mt-0.5" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
        <span>
          <strong className="text-foreground">Dry-run</strong>: fetch and filter, but write nothing to your pipeline. Good for a first
          test. &quot;0 new&quot; after a successful run means your filters dropped everything, not that the board is broken.
        </span>
      </label>

      <LocalSection id="startups" n="2A" title="Startups" hint="Weekly · free">
        <ul className="space-y-4">
          {STARTUPS.map((it) => (
            <li key={it.key} className="border-b border-border pb-4 last:border-b-0 last:pb-0">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-medium text-foreground">{it.title}</h3>
                    {it.writes ? <Pill tone="brand">adds to pipeline</Pill> : <Pill>review only</Pill>}
                  </div>
                  <p className="mt-1 text-xs text-muted">{it.desc}</p>
                </div>
                {runBtn(it.ready(status), () => runItem(it), it.label ?? (dryRun ? "Test (dry-run)" : "Run"), it.writes)}
              </div>
              <details className="mt-2 text-xs text-faint">
                <summary className="cursor-pointer select-none hover:text-muted">Command line</summary>
                <CopyLine text={it.cli} className="mt-1.5" />
              </details>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-faint">
          Not scanned (no jobs feed): First Round, Dealroom, Crunchbase. Use them to find a company, then add its careers page below.
        </p>
      </LocalSection>

      <LocalSection id="remote-boards" n="2B" title="Remote job boards" hint="Every few days · free">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-medium text-foreground">All remote job boards</h3>
              <Pill tone="brand">adds to pipeline</Pill>
            </div>
            <p className="mt-1 text-xs text-muted">
              Himalayas, RemoteOK, Remotive, We Work Remotely, Working Nomads, NoDesk, Jobicy, EchoJobs, Jobspresso, The Muse,
              4 Day Week and JustRemote, plus the startup boards and any enabled career pages from <code>portals.yml</code>.
            </p>
          </div>
          {runBtn(true, () => void scan("scan-all"), dryRun ? "Test (dry-run)" : "Scan all remote boards")}
        </div>
        <details className="mt-2 text-xs text-faint">
          <summary className="cursor-pointer select-none hover:text-muted">Command line</summary>
          <div className="mt-1.5 space-y-1.5">
            <CopyLine text="npm run scan" />
            <CopyLine text="node scan.mjs --dry-run" />
            <CopyLine text="node scan.mjs --since 2" />
          </div>
        </details>
        <p className="mt-3 text-xs text-faint">
          Peerlist and Wellfound are startup / remote-leaning but run through the India runner: see{" "}
          <Link href="/local/india" className="text-muted underline-offset-2 hover:underline">step 3</Link>. Off on purpose (not broken):
          FlexJobs, Turing, TrulyRemote, SimplyHired, Remote.co, Hubstaff Talent.
        </p>
      </LocalSection>

      <LocalSection id="career-pages" n="2C" title="Company career pages" hint="One employer at a time · free">
        <p className="text-xs text-muted">
          For an employer you specifically want (SAP, EY and Advance Auto Parts are set up). Not your daily volume path. SAP is slow
          from India, so it uses a longer timeout. To add a new company, see the guide (step 2C).
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="min-w-[180px] flex-1 text-xs text-muted">
            Company
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="SAP"
              className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
          <label className="text-xs text-muted">
            Max pages
            <input
              type="number"
              min={1}
              max={20}
              value={maxPages}
              onChange={(e) => setMaxPages(Number(e.target.value) || 1)}
              className="mt-1 block w-20 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
          {runBtn(status.scanCareer, () => void scan("scan-career", { companies: csv(company).slice(0, 1), maxPages }), dryRun ? "Test (dry-run)" : "Scan this company")}
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="min-w-[180px] flex-1 text-xs text-muted">
            Several companies (comma-separated)
            <input
              value={several}
              onChange={(e) => setSeveral(e.target.value)}
              placeholder="EY, Advance Auto Parts"
              className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
          {runBtn(status.scanCompanies, () => void scan("scan-companies", { companies: csv(several) }), "Scan these", false)}
        </div>
        <details className="mt-3 text-xs text-faint">
          <summary className="cursor-pointer select-none hover:text-muted">Command line</summary>
          <div className="mt-1.5 space-y-1.5">
            <CopyLine text="node local/scan-career.mjs --company SAP" />
            <CopyLine text='node local/scan-companies.mjs EY,"Advance Auto Parts"' />
          </div>
        </details>
      </LocalSection>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
        <Link href="/pipeline" className="inline-flex items-center gap-1 font-medium text-brand hover:underline">
          See what landed in Pipeline <ArrowRight className="size-3" />
        </Link>
        <span className="text-faint">·</span>
        <Link href="/local/companies" className="hover:text-foreground">Company directory</Link>
      </div>

      <LocalToolLog busy={busy} label={label} result={result} logs={logs} />
    </div>
  );
}
