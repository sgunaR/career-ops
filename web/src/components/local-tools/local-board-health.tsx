"use client";

import { useState } from "react";
import { Loader2, LogIn, Radar } from "lucide-react";
import { CompanyLogo } from "@/components/company-logo";
import { cn } from "@/lib/cn";

type BoardStatus =
  | "live"
  | "empty"
  | "broken"
  | "skipped"
  | "login"
  | "challenge"
  | "planned"
  | "warn"
  | "off"
  | "unchecked"
  | "unknown";

type BoardRow = {
  name: string;
  status: BoardStatus;
  detail: string;
  lane: "india" | "outside";
};

type Group = {
  id: string;
  label: string;
  hint: string;
  boards: BoardRow[];
};

type HealthResult = {
  available: boolean;
  lane: "india" | "outside";
  indiaAvailable: boolean;
  portalsAvailable: boolean;
  portalsConfigured: boolean;
  groups: Group[];
};

const TONE: Record<BoardStatus, { dot: string; label: string; chip: string }> = {
  live: { dot: "bg-emerald-500", label: "live", chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  empty: { dot: "bg-amber-500", label: "live · empty", chip: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  broken: { dot: "bg-red-500", label: "broken", chip: "bg-red-500/15 text-red-700 dark:text-red-400" },
  skipped: { dot: "bg-zinc-400", label: "skipped", chip: "bg-surface-hover text-muted" },
  login: { dot: "bg-amber-500", label: "login needed", chip: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  challenge: { dot: "bg-amber-500", label: "bot wall", chip: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  planned: { dot: "bg-zinc-400", label: "planned", chip: "bg-surface-hover text-muted" },
  warn: { dot: "bg-amber-500", label: "needs a look", chip: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  off: { dot: "bg-zinc-400", label: "off", chip: "bg-surface-hover text-muted" },
  unchecked: { dot: "bg-zinc-400", label: "not probed", chip: "bg-surface-hover text-muted" },
  unknown: { dot: "bg-zinc-400", label: "unknown", chip: "bg-surface-hover text-muted" },
};

const ORDER: Record<string, number> = {
  broken: 0,
  challenge: 1,
  login: 2,
  empty: 3,
  warn: 3,
  live: 4,
  unchecked: 5,
  planned: 6,
  skipped: 7,
  unknown: 9,
};

// What each lane checks, said once so the page never mixes the two.
const COPY = {
  india: {
    title: "Indian job boards: health",
    loading: "Probing the Indian boards with a browser… about a minute",
    intro: (
      <>
        Opens each Indian board in a browser and checks it still returns jobs. Uses{" "}
        <code className="text-muted">local/india-scan/health.mjs</code>. Amber means log in again.
      </>
    ),
    unavailable: "india-scan is not installed. Set it up in step 1 first.",
  },
  outside: {
    title: "Job board health",
    loading: "Fetching every source and checking its data… about 30 seconds",
    intro: (
      <>
        Fetches every board, startup source and career page outside India the same way a scan does, then checks the{" "}
        <em>data</em>: dates, duplicates, missing locations, region-locking. &quot;Needs a look&quot; says what to fix.
        &quot;Off&quot; means switched off on purpose in <code className="text-muted">portals.yml</code>; &quot;not probed&quot; is a company list
        with no live feed. Uses <code className="text-muted">local/audit-outside.mjs</code>.
      </>
    ),
    unavailable: "local/audit-outside.mjs or portals.yml is missing, or the audit crashed. Run it in a terminal to see why.",
  },
} as const;

export function LocalBoardHealth({
  lane,
  onLoginBoard,
  busy,
}: {
  /** Which boards to check. Each page passes its own so it only ever sees its own lane. */
  lane: "india" | "outside";
  /** Trigger headed login for an India board (India lane only). */
  onLoginBoard?: (board: string) => void;
  busy?: boolean;
}) {
  const [res, setRes] = useState<HealthResult | null>(null);
  const [loading, setLoading] = useState(false);
  const copy = COPY[lane];

  function check() {
    setLoading(true);
    fetch(`/api/local-tools/health?lane=${lane}`)
      .then((r) => r.json())
      .then((d: HealthResult) => setRes(d))
      .catch(() =>
        setRes({
          available: false,
          lane,
          indiaAvailable: false,
          portalsAvailable: false,
          portalsConfigured: false,
          groups: [],
        }),
      )
      .finally(() => setLoading(false));
  }

  // "Not probed" and "planned" rows are context, not results, so they stay out of the counts.
  const counted = (res?.groups.flatMap((g) => g.boards) ?? []).filter(
    (b) => b.status !== "unchecked" && b.status !== "planned" && b.status !== "skipped" && b.status !== "off",
  );
  const liveN = counted.filter((b) => b.status === "live" || b.status === "empty").length;
  const brokenN = counted.filter((b) => b.status === "broken").length;
  const loginN = counted.filter((b) => b.status === "login" || b.status === "challenge").length;
  const warnN = counted.filter((b) => b.status === "warn").length;

  return (
    <section className="rounded-xl border border-border bg-surface/40 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Radar className="size-4 text-brand" />
          <h2 className="text-sm font-semibold text-foreground">{copy.title}</h2>
        </div>
        <button
          type="button"
          onClick={check}
          disabled={loading || busy}
          className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-200 disabled:opacity-50 max-sm:min-h-[44px]"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Radar className="size-4" />}
          Check health
        </button>
        {loading && <span className="text-xs text-faint">{copy.loading}</span>}
      </div>
      <p className="mt-2 text-xs text-muted">{copy.intro}</p>

      {res && !res.available && (
        <p className="mt-4 rounded-xl border border-dashed border-border bg-background/60 p-4 text-sm text-muted">
          {copy.unavailable}
        </p>
      )}

      {res?.available && (
        <div className="mt-4 space-y-5">
          <p className="text-sm text-muted">
            <span className="tabular-nums text-emerald-600 dark:text-emerald-400">{liveN}</span> live ·{" "}
            <span className="tabular-nums text-red-600 dark:text-red-400">{brokenN}</span> broken
            {loginN > 0 && (
              <>
                {" "}
                · <span className="tabular-nums text-amber-600 dark:text-amber-400">{loginN}</span> login / bot wall
              </>
            )}
            {warnN > 0 && (
              <>
                {" "}
                · <span className="tabular-nums text-amber-600 dark:text-amber-400">{warnN}</span> need a look
              </>
            )}{" "}
            · <span className="tabular-nums">{counted.length}</span> checked
          </p>

          {res.groups.map((group) => {
            if (!group.boards.length && !loading) {
              return (
                <div key={group.id}>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-faint">{group.label}</h3>
                  <p className="mt-2 text-xs text-faint">
                    {group.hint}: nothing came back. The check may have crashed; run it in a terminal to see why.
                  </p>
                </div>
              );
            }
            const sorted = [...group.boards].sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9));
            return (
              <div key={group.id}>
                <div className="mb-2 flex items-baseline gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-faint">{group.label}</h3>
                  <span className="text-[10px] text-faint">{group.hint}</span>
                </div>
                <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-background/40">
                  {sorted.map((b) => {
                    const t = TONE[b.status] ?? TONE.unknown;
                    const needsLogin = b.lane === "india" && (b.status === "login" || b.status === "challenge" || b.status === "broken");
                    return (
                      <li key={`${group.id}:${b.name}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
                        <CompanyLogo name={b.name} size={20} />
                        <span className={cn("size-1.5 shrink-0 rounded-full", t.dot)} />
                        <span className="shrink-0 text-sm font-medium">{b.name}</span>
                        <span className="min-w-0 flex-1 truncate font-mono text-xs text-faint" title={b.detail}>
                          {b.detail}
                        </span>
                        <div className="ml-auto flex shrink-0 items-center gap-2">
                          {needsLogin && onLoginBoard && (
                            <button
                              type="button"
                              disabled={busy || loading}
                              onClick={() => onLoginBoard(b.name)}
                              title={`Open headed login for ${b.name}`}
                              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted transition-colors hover:border-brand/40 hover:text-brand"
                            >
                              <LogIn className="size-3" /> Login
                            </button>
                          )}
                          <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", t.chip)}>
                            {t.label}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
