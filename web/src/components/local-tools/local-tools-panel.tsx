"use client";

import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  Loader2,
  MapPin,
  Radar,
  RefreshCw,
  ShieldAlert,
  Tags,
} from "lucide-react";
import {
  LocalToolLog,
  LocalToolsLoading,
  configuredCliId,
  useLocalToolRunner,
} from "@/components/local-tools/local-tool-runner";

const LANES = [
  {
    href: "/local/india",
    title: "India boards",
    blurb: "Naukri, LinkedIn, Peerlist, Cutshort, Hirist, Instahyre…",
    icon: MapPin,
  },
  {
    href: "/local/careers",
    title: "Career pages",
    blurb: "SAP / portals.yml companies · scan-all remotes",
    icon: Building2,
  },
  {
    href: "/local/startups",
    title: "Startups",
    blurb: "YC · a16z · Speedrun · Top Startups · HN · funded",
    icon: Radar,
  },
  {
    href: "/local/companies",
    title: "Companies",
    blurb: "Segregated product / services / startup · SAP roles",
    icon: Tags,
  },
] as const;

/** Overview hub: lane links + ability to run every local action from one place. */
export function LocalHubPanel() {
  const { status, busy, label, logs, result, refresh, start } = useLocalToolRunner();

  const startThenHarvest = async (action: Parameters<typeof start>[0], extra: Record<string, unknown> = {}) => {
    const out = await start(action, extra);
    if (out?.ok && action !== "harvest-companies") {
      const cli = configuredCliId();
      await start("harvest-companies", cli ? { cli } : {});
    }
  };

  if (!status) return <LocalToolsLoading />;

  if (!status.available) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-surface/40 p-5 text-sm text-muted">
          <p className="font-medium text-foreground">No local discovery tools yet</p>
          <p className="mt-2">
            Bootstrap the India scanner (writes under gitignored <code className="text-muted">local/</code>):
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
              Run bootstrap from dashboard
            </button>
          )}
        </div>
        <LocalToolLog busy={busy} label={label} result={result} logs={logs} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1">
          {status.indiaScan ? <CheckCircle2 className="size-3 text-brand" /> : <ShieldAlert className="size-3" />}
          india
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1">
          {status.scanCareer || status.scanCompanies ? (
            <CheckCircle2 className="size-3 text-brand" />
          ) : (
            <ShieldAlert className="size-3" />
          )}
          careers
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1">
          {status.scanAtsFull ? <CheckCircle2 className="size-3 text-brand" /> : <ShieldAlert className="size-3" />}
          startups
        </span>
        <button type="button" onClick={refresh} className="inline-flex items-center gap-1 text-faint hover:text-muted">
          <RefreshCw className="size-3" /> refresh
        </button>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {LANES.map(({ href, title, blurb, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="rounded-xl border border-border bg-surface/40 p-4 transition hover:border-brand/40"
          >
            <div className="flex items-center gap-2">
              <Icon className="size-4 text-brand" />
              <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            </div>
            <p className="mt-1.5 text-xs text-muted">{blurb}</p>
            <p className="mt-3 text-xs text-brand">Open →</p>
          </Link>
        ))}
      </section>

      <section className="rounded-xl border border-border bg-surface/40 p-5">
        <h2 className="text-sm font-semibold text-foreground">Run everything (quick)</h2>
        <p className="mt-1 text-xs text-muted">
          Same actions as the lane pages — use Overview when you want one console for the whole local wave.
          Open a lane for board pickers / health / options.
        </p>

        <p className="mt-4 text-[11px] font-medium uppercase tracking-wide text-faint">India</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !status.indiaScan}
            onClick={() => void startThenHarvest("india-scan", { board: "naukri", maxPages: 1 })}
            className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground disabled:opacity-50"
          >
            Scan Naukri
          </button>
          <button
            type="button"
            disabled={busy || !status.indiaScan}
            onClick={() => void startThenHarvest("india-scan", { board: "linkedin", maxPages: 1 })}
            className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-50"
          >
            Scan LinkedIn
          </button>
          <button
            type="button"
            disabled={busy || !status.indiaScan}
            onClick={() =>
              void startThenHarvest("india-scan", {
                boards: ["peerlist", "cutshort", "hirist", "instahyre"],
                maxPages: 1,
              })
            }
            className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-50"
          >
            Scan Peerlist+Cutshort+Hirist+Instahyre
          </button>
          <Link href="/local/india" className="rounded-full border border-border px-4 py-2 text-sm hover:border-brand/40">
            More boards…
          </Link>
        </div>

        <p className="mt-4 text-[11px] font-medium uppercase tracking-wide text-faint">Careers / remotes</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !status.scanCareer}
            onClick={() => void startThenHarvest("scan-career", { companies: ["SAP"] })}
            className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground disabled:opacity-50"
          >
            Scan SAP career
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void startThenHarvest("scan-all")}
            className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-50"
          >
            Scan all portals
          </button>
          <Link href="/local/careers" className="rounded-full border border-border px-4 py-2 text-sm hover:border-brand/40">
            Career options…
          </Link>
        </div>

        <p className="mt-4 text-[11px] font-medium uppercase tracking-wide text-faint">Startups</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !status.scanAtsFull}
            onClick={() => void startThenHarvest("scan-yc")}
            className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground disabled:opacity-50"
          >
            YC seeds
          </button>
          <button
            type="button"
            disabled={busy || !status.scanAtsFull}
            onClick={() => void startThenHarvest("scan-seeds")}
            className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-50"
          >
            YC + a16z seeds
          </button>
          <button
            type="button"
            disabled={busy || !status.scanCompanies}
            onClick={() => void startThenHarvest("scan-companies", { companies: ["Top Startups"] })}
            className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-50"
          >
            Top Startups
          </button>
          <button
            type="button"
            disabled={busy || !status.scanCompanies}
            onClick={() => void startThenHarvest("scan-companies", { companies: ["a16z Speedrun Talent"] })}
            className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-50"
          >
            Speedrun
          </button>
          <button
            type="button"
            disabled={busy || !status.scanCompanies}
            onClick={() => void startThenHarvest("scan-companies", { companies: ["Hacker News Who is Hiring"] })}
            className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-50"
          >
            HN
          </button>
          <button
            type="button"
            disabled={busy || !status.companyFunded}
            onClick={() => void start("company-funded", { dryRun: true })}
            className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-50"
          >
            Funded (dry-run)
          </button>
          <Link href="/local/startups" className="rounded-full border border-border px-4 py-2 text-sm hover:border-brand/40">
            Startup options…
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/pipeline" className="rounded-full border border-border px-4 py-2 text-sm hover:border-brand/40">
            Open Pipeline
          </Link>
          <Link href="/explore" className="rounded-full border border-border px-4 py-2 text-sm hover:border-brand/40">
            Open Explore
          </Link>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface/40 p-5">
        <h2 className="text-sm font-semibold text-foreground">Company directory</h2>
        <p className="mt-1 text-xs text-muted">
          Upserts <code>data/companies.tsv</code> from pipeline + scan-history with product / services / startup and SAP
          role tags (registry + heuristics). Use later to target employers on purpose.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !status.harvestCompanies}
            onClick={() => {
              const cli = configuredCliId();
              void start("harvest-companies", cli ? { cli } : {});
            }}
            className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground disabled:opacity-50"
          >
            Refresh company directory
          </button>
          <button
            type="button"
            disabled={busy || !status.harvestCompanies}
            onClick={() => {
              const cli = configuredCliId();
              void start("harvest-companies", { dryRun: true, ...(cli ? { cli } : {}) });
            }}
            className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-50"
          >
            Dry-run harvest
          </button>
          <Link href="/local/companies" className="rounded-full border border-border px-4 py-2 text-sm hover:border-brand/40">
            View segregated list →
          </Link>
        </div>
        <p className="mt-3 text-[11px] text-faint font-mono">
          node local/companies.mjs --summary · --kind services · --sap sap_partner_si · --export names
        </p>
      </section>

      <section className="rounded-xl border border-border bg-surface/40 p-5">
        <div className="flex items-center gap-2">
          <ShieldAlert className="size-4 text-brand" />
          <h2 className="text-sm font-semibold text-foreground">Hygiene (destructive)</h2>
        </div>
        <p className="mt-1 text-xs text-muted">Requires confirmation. Prefer parking in Pipeline over wiping history.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !status.resetInbox}
            onClick={() => {
              if (window.confirm("Clear Pending only in pipeline.md?")) {
                void start("reset-inbox", { confirm: true, pipelineOnly: true });
              }
            }}
            className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-50"
          >
            Clear Pending only
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
            Full inbox reset
          </button>
          <button
            type="button"
            disabled={busy || !status.resetEvaluations}
            onClick={() => {
              if (window.confirm("Wipe reports + applications tracker? Discovery inbox is kept.")) {
                void start("reset-evaluations", { confirm: true });
              }
            }}
            className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-50"
          >
            Reset evaluations
          </button>
          <button
            type="button"
            disabled={busy || !status.cleanLiveness}
            onClick={() => {
              if (window.confirm("Delete batch/liveness-*.txt temps?")) {
                void start("clean-liveness", { confirm: true });
              }
            }}
            className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-50"
          >
            Clean liveness temps
          </button>
        </div>
      </section>

      <LocalToolLog busy={busy} label={label} result={result} logs={logs} />
    </div>
  );
}

/** @deprecated Prefer LocalHubPanel — kept so old imports keep working. */
export { LocalHubPanel as LocalToolsPanel };
