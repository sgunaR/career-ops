"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, MapPin, Radar, RefreshCw, ShieldAlert } from "lucide-react";
import { INDIA_BOARDS } from "@/lib/local-tools-shared";
import { LocalBoardHealth } from "@/components/local-tools/local-board-health";
import { LocalToolLog, LocalToolsLoading, useLocalToolRunner } from "@/components/local-tools/local-tool-runner";
import { CopyLine } from "@/components/local-tools/local-ui";

export function LocalIndiaPanel() {
  const { status, busy, label, logs, result, refresh, start } = useLocalToolRunner();
  const [board, setBoard] = useState("naukri");
  const [maxPages, setMaxPages] = useState(1);
  const [dryRun, setDryRun] = useState(false);

  if (!status) return <LocalToolsLoading />;

  if (!status.available) {
    return (
      <div className="rounded-xl border border-border bg-surface/40 p-5 text-sm text-muted">
        <p className="font-medium text-foreground">India scanner not installed</p>
        <p className="mt-2">
          Bootstrap writes under gitignored <code className="text-muted">local/</code>:
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-background/80 p-3 font-mono text-xs">
          node templates/india-scan/bootstrap.mjs
        </pre>
        {status.bootstrap && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void start("bootstrap-india")}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Radar className="size-4" />}
            Run bootstrap
          </button>
        )}
        <LocalToolLog busy={busy} label={label} result={result} logs={logs} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1">
          {status.indiaScan ? <CheckCircle2 className="size-3 text-brand" /> : <ShieldAlert className="size-3" />}
          india-scan {status.indiaScan ? "ready" : "missing"}
        </span>
        <button type="button" onClick={refresh} className="inline-flex items-center gap-1 text-faint hover:text-muted">
          <RefreshCw className="size-3" /> refresh
        </button>
        <Link href="/local" className="ml-auto text-faint hover:text-muted">
          ← Guide
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-surface/40 p-4 text-xs text-muted">
        <p>
          <strong className="text-foreground">How to use:</strong> scan <strong>one or two boards a day</strong> as your daily habit —
          use <strong>All boards</strong> below for a periodic full sweep (weekly is plenty; every board hits the same site more
          often than a daily single-board scan would). Test with <em>dry-run</em> first. If a board shows amber below, click{" "}
          <strong>Login</strong> for it. Results land in{" "}
          <Link href="/pipeline" className="text-brand hover:underline">Pipeline</Link>; the same title and location filters from{" "}
          <code>portals.yml</code> apply to every board.
        </p>
      </div>

      <LocalBoardHealth
        lane="india"
        busy={busy}
        onLoginBoard={(b) => {
          setBoard(b);
          void start("india-login", { board: b });
        }}
      />

      <section className="rounded-xl border border-border bg-surface/40 p-5">
        <div className="flex items-center gap-2">
          <MapPin className="size-4 text-brand" />
          <h2 className="text-sm font-semibold text-foreground">India boards</h2>
          <span className="text-xs text-faint">Playwright · zero LLM · pipeline.md</span>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-xs text-muted">
            Board
            <select
              value={board}
              onChange={(e) => setBoard(e.target.value)}
              className="mt-1 block rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              {INDIA_BOARDS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted">
            Max pages
            <input
              type="number"
              min={1}
              max={10}
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
            disabled={busy || !status.indiaScan}
            onClick={() => void start("india-scan", { board, maxPages, dryRun })}
            className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground disabled:opacity-50"
          >
            Scan {board}
          </button>
          <button
            type="button"
            disabled={busy || !status.indiaScan}
            onClick={() => void start("india-scan", { boards: [...INDIA_BOARDS], maxPages, dryRun })}
            className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-50"
            title="All 9 boards — weekly sweep, not a daily habit"
          >
            All boards
          </button>
          <button
            type="button"
            disabled={busy || !status.indiaScan}
            onClick={() => void start("india-login", { board })}
            className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-50"
          >
            Login {board}
          </button>
          <button
            type="button"
            disabled={busy || !status.indiaScan}
            onClick={() => void start("india-health", { board })}
            className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-50"
          >
            Health
          </button>
          {!status.indiaScan && status.bootstrap && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void start("bootstrap-india")}
              className="rounded-full border border-border px-4 py-2 text-sm"
            >
              Bootstrap india-scan
            </button>
          )}
        </div>
        <div className="mt-3 space-y-1.5">
          <CopyLine text={`node local/india-scan/run.mjs --board ${board} --max-pages ${maxPages}`} />
          <div>
            <p className="mb-1 text-xs text-faint">All 9 boards at once (weekly sweep, not a daily habit):</p>
            <CopyLine text={`node local/india-scan/run.mjs --all --max-pages ${maxPages}`} />
          </div>
        </div>
      </section>

      <LocalToolLog busy={busy} label={label} result={result} logs={logs} />
    </div>
  );
}
