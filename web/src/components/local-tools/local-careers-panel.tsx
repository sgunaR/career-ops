"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, CheckCircle2, RefreshCw, ShieldAlert } from "lucide-react";
import { LocalToolLog, LocalToolsLoading, useLocalToolRunner } from "@/components/local-tools/local-tool-runner";

export function LocalCareersPanel() {
  const { status, busy, label, logs, result, refresh, start } = useLocalToolRunner();
  const [companies, setCompanies] = useState("SAP");
  const [maxPages, setMaxPages] = useState(1);
  const [dryRun, setDryRun] = useState(false);

  if (!status) return <LocalToolsLoading />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1">
          {status.scanCareer ? <CheckCircle2 className="size-3 text-brand" /> : <ShieldAlert className="size-3" />}
          scan-career
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1">
          {status.scanCompanies ? <CheckCircle2 className="size-3 text-brand" /> : <ShieldAlert className="size-3" />}
          scan-companies
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
          <Building2 className="size-4 text-brand" />
          <h2 className="text-sm font-semibold text-foreground">Career pages & portals</h2>
        </div>
        <p className="mt-1 text-xs text-muted">
          Prefer <span className="font-medium text-foreground">Scan career page</span> for SAP (longer timeout).
          Multi-company and Scan all use <code>portals.yml</code> / <code>scan.mjs</code>.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="min-w-[200px] flex-1 text-xs text-muted">
            Companies (comma-separated)
            <input
              value={companies}
              onChange={(e) => setCompanies(e.target.value)}
              placeholder="SAP,Himalayas"
              className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
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
              className="mt-1 block w-20 rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 pb-2 text-xs text-muted">
            <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
            dry-run
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !status.scanCareer}
            onClick={() =>
              void start("scan-career", {
                companies: companies
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .slice(0, 1),
                maxPages,
                dryRun,
              })
            }
            className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground disabled:opacity-50"
          >
            Scan career page
          </button>
          <button
            type="button"
            disabled={busy || !status.scanCompanies}
            onClick={() =>
              void start("scan-companies", {
                companies: companies
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
                dryRun,
              })
            }
            className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-50"
          >
            Scan companies
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void start("scan-all", { dryRun })}
            className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-50"
          >
            Scan all portals
          </button>
          <Link href="/explore" className="rounded-full border border-border px-4 py-2 text-sm hover:border-brand/40">
            Open Explore (ATS)
          </Link>
          <Link href="/pipeline" className="rounded-full border border-border px-4 py-2 text-sm hover:border-brand/40">
            Open Pipeline
          </Link>
        </div>
      </section>

      <LocalToolLog busy={busy} label={label} result={result} logs={logs} />
    </div>
  );
}
