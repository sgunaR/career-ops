"use client";

import { CheckCircle2, Loader2, Radar, RefreshCw, ShieldAlert } from "lucide-react";
import type { LocalToolsStatus } from "@/lib/local-tools-shared";
import { LocalBoardHealth } from "@/components/local-tools/local-board-health";
import { CopyLine, LocalSection, Pill } from "@/components/local-tools/local-ui";
import { LocalToolLog, LocalToolsLoading, useLocalToolRunner } from "@/components/local-tools/local-tool-runner";

type Tool = { label: string; what: string; ok: (s: LocalToolsStatus) => boolean };

const TOOLS: Tool[] = [
  { label: "India scanner", what: "Naukri, LinkedIn, Peerlist… (step 3)", ok: (s) => s.indiaScan },
  { label: "Career-page scanner", what: "One employer's careers site (step 2C)", ok: (s) => s.scanCareer },
  { label: "Multi-company scanner", what: "Speedrun, Top Startups, HN, several companies (step 2A / 2C)", ok: (s) => s.scanCompanies },
  { label: "Startup seed scanner", what: "YC and a16z companies (step 2A)", ok: (s) => s.scanAtsFull },
  { label: "Funded-companies review", what: "Recently funded companies list (step 2A)", ok: (s) => s.companyFunded },
  { label: "Company directory", what: "Employer list built from your scans", ok: (s) => s.harvestCompanies },
  { label: "Reset tools", what: "Clean-slate resets (step 13)", ok: (s) => s.resetInbox && s.resetEvaluations },
];

const INSTALL: { note: string; cmd: string }[] = [
  { note: "Dependencies", cmd: "npm install" },
  { note: "Browser for PDFs and the India scrapers", cmd: "npx playwright install chromium" },
  { note: "Check profile, CV and portals exist (want onboardingNeeded: false)", cmd: "node doctor.mjs --json" },
  { note: "Create the India scanner in local/ (safe to re-run)", cmd: "node templates/india-scan/bootstrap.mjs" },
  { note: "This web app", cmd: "cd web && npm ci && npm run dev" },
  { note: "LaTeX engine for the CV (first compile downloads packages, ~4 min, once)", cmd: "scoop install tectonic" },
];

export function LocalSetupPanel() {
  const { status, busy, label, logs, result, refresh, start } = useLocalToolRunner();

  if (!status) return <LocalToolsLoading />;

  return (
    <div className="space-y-6">
      <LocalSection n="1a" title="Are the tools installed?" hint="Read from your local/ folder">
        <ul className="divide-y divide-border rounded-lg border border-border">
          {TOOLS.map((t) => {
            const ok = t.ok(status);
            return (
              <li key={t.label} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                {ok ? (
                  <CheckCircle2 className="size-4 shrink-0 text-brand" />
                ) : (
                  <ShieldAlert className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                )}
                <span className="font-medium text-foreground">{t.label}</span>
                <span className="text-xs text-muted">{t.what}</span>
                <span className="ml-auto">{ok ? <Pill tone="brand">ready</Pill> : <Pill tone="warn">missing</Pill>}</span>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {!status.indiaScan && status.bootstrap && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void start("bootstrap-india")}
              className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground disabled:opacity-50"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Radar className="size-4" />}
              Set up the India scanner
            </button>
          )}
          <button type="button" onClick={refresh} className="inline-flex items-center gap-1 text-xs text-faint hover:text-muted">
            <RefreshCw className="size-3" /> re-check
          </button>
        </div>
      </LocalSection>

      <LocalSection n="1b" title="Install from scratch" hint="Once per machine — run in the repo folder">
        <ul className="space-y-2.5">
          {INSTALL.map((i) => (
            <li key={i.cmd}>
              <p className="mb-1 text-xs text-muted">{i.note}</p>
              <CopyLine text={i.cmd} />
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-faint">
          Your own files (<code>cv.md</code>, <code>config/profile.yml</code>, <code>portals.yml</code>, <code>modes/_*.md</code>) are
          never overwritten by updates.
        </p>
      </LocalSection>

      <LocalSection n="1c" title="Log in to the India boards and check health" hint="Green = ready · amber = log in again">
        <p className="mb-3 text-xs text-muted">
          Naukri, LinkedIn, Instahyre, foundit, Indeed, Peerlist and Wellfound need a one-time login. <strong>Login</strong> opens a
          browser: sign in, then press Enter in the terminal that started this app.
        </p>
        {status.indiaScan ? (
          <LocalBoardHealth lane="india" busy={busy} onLoginBoard={(b) => void start("india-login", { board: b })} />
        ) : (
          <p className="text-xs text-muted">Set up the India scanner first (1a).</p>
        )}
      </LocalSection>

      <LocalSection id="maintenance" n={13} title="Maintenance" hint="Health, resets, updates">
        <p className="text-xs text-muted">Health checks from a terminal:</p>
        <div className="mt-2 space-y-1.5">
          <CopyLine text="node verify-portals.mjs" />
          <CopyLine text="node local/india-scan/health.mjs" />
          <CopyLine text="node verify-pipeline.mjs" />
        </div>
        <p className="mt-4 text-xs text-muted">
          After a system update: <code>node update-system.mjs check</code>. If the /local pages disappear after a messy pull:{" "}
          <code>node local/restore-dashboard-local.mjs</code>.
        </p>

        <div className="mt-5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-4 text-amber-600 dark:text-amber-400" />
            <h3 className="text-sm font-semibold text-foreground">Resets (destructive)</h3>
          </div>
          <p className="mt-1 text-xs text-muted">
            Each asks for confirmation and backs up first. Prefer parking jobs in Pipeline over wiping history.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !status.resetInbox}
              onClick={() => {
                if (window.confirm("Clear the Pending list in pipeline.md only?")) {
                  void start("reset-inbox", { confirm: true, pipelineOnly: true });
                }
              }}
              className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-50"
            >
              Clear Pending list only
            </button>
            <button
              type="button"
              disabled={busy || !status.resetInbox}
              onClick={() => {
                if (window.confirm("Full discovery reset (pipeline + scan history)? Backups are created first.")) {
                  void start("reset-inbox", { confirm: true });
                }
              }}
              className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-50"
            >
              Reset discovery inbox + history
            </button>
            <button
              type="button"
              disabled={busy || !status.resetEvaluations}
              onClick={() => {
                if (window.confirm("Wipe reports and the applications tracker? The discovery inbox is kept.")) {
                  void start("reset-evaluations", { confirm: true });
                }
              }}
              className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-50"
            >
              Reset evaluations (reports + tracker)
            </button>
            <button
              type="button"
              disabled={busy || !status.cleanLiveness}
              onClick={() => {
                if (window.confirm("Delete the throw-away batch/liveness-*.txt files?")) {
                  void start("clean-liveness", { confirm: true });
                }
              }}
              className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-50"
            >
              Clean liveness temp files
            </button>
          </div>
        </div>
      </LocalSection>

      <LocalToolLog busy={busy} label={label} result={result} logs={logs} />
    </div>
  );
}
