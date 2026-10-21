"use client";

import Link from "next/link";
import { CheckCircle2, Radar, RefreshCw, ShieldAlert } from "lucide-react";
import { LocalToolLog, LocalToolsLoading, useLocalToolRunner } from "@/components/local-tools/local-tool-runner";

export function LocalStartupsPanel() {
  const { status, busy, label, logs, result, refresh, start } = useLocalToolRunner();

  if (!status) return <LocalToolsLoading />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1">
          {status.scanAtsFull ? <CheckCircle2 className="size-3 text-brand" /> : <ShieldAlert className="size-3" />}
          YC / a16z seeds
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1">
          {status.scanCompanies ? <CheckCircle2 className="size-3 text-brand" /> : <ShieldAlert className="size-3" />}
          boards
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1">
          {status.companyFunded ? <CheckCircle2 className="size-3 text-brand" /> : <ShieldAlert className="size-3" />}
          funded review
        </span>
        <button type="button" onClick={refresh} className="inline-flex items-center gap-1 text-faint hover:text-muted">
          <RefreshCw className="size-3" /> refresh
        </button>
        <Link href="/local" className="ml-auto text-faint hover:text-muted">
          ← Overview
        </Link>
      </div>

      <section className="rounded-xl border border-border bg-surface/40 p-5">
        <div className="flex items-center gap-2">
          <Radar className="size-4 text-brand" />
          <h2 className="text-sm font-semibold text-foreground">Startup directory</h2>
          <span className="text-xs text-faint">Weekly / on-demand</span>
        </div>
        <p className="mt-1 text-xs text-muted">
          Seeds probe portfolio ATS. Speedrun / Top Startups / HN are also in <code>portals.yml</code> (Scan all
          portals). Funded list is review-only — no auto pipeline write. Docs: §3.6.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !status.scanAtsFull}
            onClick={() => void start("scan-yc")}
            className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground disabled:opacity-50"
          >
            Scan YC seeds
          </button>
          <button
            type="button"
            disabled={busy || !status.scanAtsFull}
            onClick={() => void start("scan-seeds")}
            className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-50"
          >
            Scan YC + a16z seeds
          </button>
          <button
            type="button"
            disabled={busy || !status.scanCompanies}
            onClick={() => void start("scan-companies", { companies: ["a16z Speedrun Talent"] })}
            className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-50"
          >
            Speedrun Talent
          </button>
          <button
            type="button"
            disabled={busy || !status.scanCompanies}
            onClick={() => void start("scan-companies", { companies: ["Top Startups"] })}
            className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-50"
          >
            Top Startups
          </button>
          <button
            type="button"
            disabled={busy || !status.scanCompanies}
            onClick={() => void start("scan-companies", { companies: ["Hacker News Who is Hiring"] })}
            className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-50"
          >
            HN Who is Hiring
          </button>
          <button
            type="button"
            disabled={busy || !status.companyFunded}
            onClick={() => void start("company-funded", { dryRun: true })}
            className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-50"
          >
            Funded companies (dry-run)
          </button>
          <button
            type="button"
            disabled={busy || !status.scanAtsFull}
            onClick={() => void start("scan-yc", { dryRun: true })}
            className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-50"
          >
            YC dry-run
          </button>
        </div>
      </section>

      <LocalToolLog busy={busy} label={label} result={result} logs={logs} />
    </div>
  );
}
