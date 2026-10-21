"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, RefreshCw, ShieldAlert } from "lucide-react";
import { PHASES, STEPS } from "@/lib/local-workflow";
import { CopyLine } from "@/components/local-tools/local-ui";
import { LocalToolsLoading, useLocalToolRunner } from "@/components/local-tools/local-tool-runner";

/** The landing page: the whole flow in order, with a way into every step. */
export function LocalGuidePanel() {
  const { status, refresh } = useLocalToolRunner();

  if (!status) return <LocalToolsLoading />;

  const chips: { label: string; ok: boolean }[] = [
    { label: "India scanner", ok: status.indiaScan },
    { label: "Career pages", ok: status.scanCareer },
    { label: "Startups", ok: status.scanAtsFull },
    { label: "Company directory", ok: status.harvestCompanies },
  ];

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-border bg-surface/40 p-5">
        <p className="text-sm text-foreground">Follow the steps from top to bottom.</p>
        <p className="mt-1 text-xs text-muted">
          Each step opens a page with buttons for the web app, plus copy-ready commands for the command line and for
          chat (Claude Code, Cursor, or the Assistant). Finding jobs is free; the AI steps start at Evaluate.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
          {chips.map((c) => (
            <span key={c.label} className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1">
              {c.ok ? <CheckCircle2 className="size-3 text-brand" /> : <ShieldAlert className="size-3" />}
              {c.label}
            </span>
          ))}
          <button type="button" onClick={refresh} className="inline-flex items-center gap-1 text-faint hover:text-muted">
            <RefreshCw className="size-3" /> refresh
          </button>
          {!status.indiaScan && (
            <Link href="/local/setup" className="ml-auto text-brand hover:underline">
              Some tools are missing — start with step 1 →
            </Link>
          )}
        </div>
      </div>

      {PHASES.map((phase) => {
        const steps = STEPS.filter((s) => s.phase === phase.id);
        return (
          <section key={phase.id} aria-labelledby={`phase-${phase.id}`}>
            <div className="mb-3 flex items-baseline gap-2">
              <h2 id={`phase-${phase.id}`} className="text-xs font-semibold uppercase tracking-wide text-foreground">
                {phase.title}
              </h2>
              <span className="text-xs text-faint">{phase.hint}</span>
            </div>
            <ol className="space-y-3">
              {steps.map((s) => (
                <li key={s.n} className="rounded-xl border border-border bg-surface/40 p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-brand/15 text-xs font-semibold text-brand">
                      {s.n}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h3 className="text-sm font-semibold text-foreground">{s.title}</h3>
                        <Link
                          href={s.href}
                          className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                        >
                          Open <ArrowRight className="size-3" />
                        </Link>
                      </div>
                      <p className="mt-1 text-xs text-muted">{s.blurb}</p>
                      {(s.cli || s.chat) && (
                        <div className="mt-2.5 space-y-1.5">
                          {s.cli && <CopyLine text={s.cli} />}
                          {s.cliAlt && (
                            <div>
                              <p className="mb-1 text-xs text-faint">{s.cliAlt.label}:</p>
                              <CopyLine text={s.cliAlt.command} />
                            </div>
                          )}
                          {s.chat && <CopyLine text={s.chat} prefix="›" />}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        );
      })}

      <p className="text-xs text-faint">
        Optional: the <Link href="/local/companies" className="text-muted underline-offset-2 hover:underline">company
        directory</Link> lists every employer your scans have seen so you can target them on purpose. The written
        version of this guide is <code className="text-muted">docs/portal-expansion-plan.md</code>.
      </p>
    </div>
  );
}
