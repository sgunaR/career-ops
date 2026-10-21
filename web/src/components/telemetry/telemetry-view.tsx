"use client";

import { useCallback, useEffect, useState } from "react";
import { Info, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Telemetry, ToolSummary } from "@/lib/telemetry/aggregate";

// ── Series (fixed order — color follows the cost component, never its rank) ──

type SeriesKey = "input" | "output" | "cacheRead" | "cacheWrite" | "webSearch" | "premium" | "reported";
const SERIES: { key: SeriesKey; label: string; color: string; hint: string }[] = [
  { key: "input", label: "Input", color: "var(--viz-input)", hint: "New, uncached prompt tokens" },
  { key: "output", label: "Output", color: "var(--viz-output)", hint: "Tokens the model wrote (incl. thinking)" },
  { key: "cacheRead", label: "Cache read", color: "var(--viz-cache-read)", hint: "Conversation context re-read from cache each turn" },
  { key: "cacheWrite", label: "Cache write", color: "var(--viz-cache-write)", hint: "Context written to cache (5-min 1.25×, 1-hour 2× input price)" },
  { key: "webSearch", label: "Web search", color: "var(--viz-web)", hint: "Server web searches ($0.01 each)" },
  { key: "premium", label: "Premium requests", color: "var(--viz-premium)", hint: "GitHub Copilot premium requests at the $0.04 overage rate" },
  { key: "reported", label: "Tool-reported", color: "var(--viz-reported)", hint: "Cost a tool recorded itself (e.g. OpenCode, imports)" },
];

type Range = "7" | "30" | "90" | "all";
const RANGES: { id: Range; label: string }[] = [
  { id: "7", label: "7 days" },
  { id: "30", label: "30 days" },
  { id: "90", label: "90 days" },
  { id: "all", label: "All time" },
];

const BASIS_LABEL: Record<ToolSummary["costBasis"], string> = {
  "api-list-price": "API-equivalent (list price)",
  "premium-requests": "Premium requests × $0.04",
  "tool-reported": "Tool's own figure",
  none: "No local cost data",
};

// ── Formatting ───────────────────────────────────────────────────────────────

function usd(n: number): string {
  if (n === 0) return "$0";
  if (Math.abs(n) < 0.01) return "<$0.01";
  if (Math.abs(n) < 10) return `$${n.toFixed(2)}`;
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
function usdExact(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function tokens(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return `${n}`;
}
function pct(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "—";
}
function shortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function dateOf(t: number): string {
  return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function dateRange(a: number, b: number): string {
  return dateOf(a) === dateOf(b) ? dateOf(a) : `${dateOf(a)} – ${dateOf(b)}`;
}
function prettyModel(m: string): string {
  if (!m.startsWith("claude-")) return m;
  return m
    .replace(/^claude-/, "")
    .replace(/-(\d+)-(\d+)$/, " $1.$2")
    .replace(/-(\d+)$/, " $1")
    .replace(/^./, (c) => c.toUpperCase());
}
function tokenSum(t: Telemetry["totals"]["tokens"]): number {
  return t.input + t.output + t.cacheRead + t.cacheWrite5m + t.cacheWrite1h;
}

/** 4-ish clean y ticks: steps of 1 / 2 / 2.5 / 5 × 10^n. */
function niceTicks(max: number): number[] {
  if (max <= 0) return [0];
  const rough = max / 4;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((s) => s * mag).find((s) => s >= rough) ?? mag * 10;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(v);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

// ── Local prefs (per-viewer conveniences only) ───────────────────────────────

const PREFS_KEY = "career-ops:telemetry";
type Prefs = { range?: Range; tool?: string; planUsd?: string };
function readPrefs(): Prefs {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") as Prefs;
  } catch {
    return {};
  }
}
function writePrefs(p: Prefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...readPrefs(), ...p }));
  } catch {
    /* storage unavailable — prefs are optional */
  }
}

// ── View ─────────────────────────────────────────────────────────────────────

export function TelemetryView() {
  const [range, setRange] = useState<Range>("30");
  const [tool, setTool] = useState<string>("all");
  const [data, setData] = useState<Telemetry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const p = readPrefs();
    if (p.range) setRange(p.range);
    if (p.tool) setTool(p.tool);
    setReady(true);
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/telemetry?${new URLSearchParams({ days: range, tool })}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: Telemetry) => setData(d))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [range, tool]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  const t = data?.totals;
  const tokTotal = t ? tokenSum(t.tokens) : 0;
  // Filter chips: every tool with something to show in this range, plus the current pick.
  const chips = (data?.tools ?? []).filter((x) => x.requests > 0 || x.tool === tool);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="font-display text-2xl tracking-tight text-landing">Token &amp; cost telemetry</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted">
        AI usage from <span className="text-foreground">career-ops sessions only</span>, across every supported tool
        (Claude Code, Copilot CLI, Codex, OpenCode, Cursor…). Sessions from other projects on this machine are never read.
        Dollar figures are estimates for planning — on a subscription you aren&apos;t billed per token.
      </p>

      {/* Filters — one row above everything they control */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div role="radiogroup" aria-label="Time range" className="inline-flex rounded-full border border-border bg-surface p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={range === r.id}
              onClick={() => {
                setRange(r.id);
                writePrefs({ range: r.id });
              }}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs transition-colors",
                range === r.id ? "bg-foreground text-background" : "text-muted hover:text-foreground",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
        {chips.length > 1 && (
          <div role="radiogroup" aria-label="Tool" className="flex flex-wrap gap-1.5">
            {[{ tool: "all", label: "All tools" }, ...chips].map((c) => (
              <button
                key={c.tool}
                type="button"
                role="radio"
                aria-checked={tool === c.tool}
                onClick={() => {
                  setTool(c.tool);
                  writePrefs({ tool: c.tool });
                }}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs transition-colors",
                  tool === c.tool
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted hover:border-brand/40 hover:text-foreground",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
        {/* aria-disabled, not `disabled`: browsers (Firefox especially) restore a form
            control's last disabled state on reload before React hydrates, which made the
            server HTML and the live DOM disagree. ARIA state isn't restored. */}
        <button
          type="button"
          onClick={() => {
            if (!loading) load();
          }}
          aria-disabled={loading}
          className="ml-auto inline-flex items-center gap-1.5 text-xs text-faint hover:text-muted aria-disabled:cursor-default aria-disabled:opacity-60"
        >
          <RefreshCw className={cn("size-3", loading && "animate-spin")} /> Refresh
        </button>
      </div>

      {error && (
        <p className="mt-6 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted">
          Couldn&apos;t load telemetry ({error}).
        </p>
      )}
      {!data && loading && (
        <p className="mt-8 flex items-center gap-2 text-sm text-muted">
          <Loader2 className="size-4 animate-spin" /> Reading career-ops usage logs…
        </p>
      )}

      {data && t && (
        <div className={cn("transition-opacity", loading && "opacity-60")}>
          {/* Headline tiles */}
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Tile label="Estimated cost" value={usdExact(t.cost.total)} sub={rangeLabel(data)} emphasis />
            <Tile
              label="Tokens processed"
              value={tokens(tokTotal)}
              sub={tokTotal ? `${pct(t.tokens.cacheRead, tokTotal)} served from cache` : "—"}
            />
            <Tile
              label="Requests"
              value={t.requests.toLocaleString()}
              sub={`${t.sessions} session${t.sessions === 1 ? "" : "s"} · ${data.estimate.activeDays} active day${data.estimate.activeDays === 1 ? "" : "s"}`}
            />
            <Tile
              label="Projected 30 days"
              value={usdExact(data.estimate.projected30d)}
              sub={`at ${usd(data.estimate.perCalendarDay)}/day${data.estimate.since ? ` since ${shortDate(data.estimate.since)}` : ""}`}
            />
          </div>

          {t.unpricedModels.length > 0 && (
            <Note>
              {tokens(t.unpricedTokens)} tokens from {t.unpricedModels.join(", ")} have no verified price on file, so
              they&apos;re counted in tokens but not in cost. Add a rate in <code>config/model-pricing.json</code> to include them.
            </Note>
          )}

          <ToolCards data={data} />

          {t.requests === 0 ? (
            <p className="mt-10 text-sm text-muted">No usage logged for this selection.</p>
          ) : (
            <>
              <CostBreakdown data={data} />
              <DailyChart data={data} />
              <ModelTable data={data} />
              <SessionTable data={data} />
              <Estimator data={data} />
            </>
          )}
          <PriceTable data={data} />
          <ImportHelp />
        </div>
      )}
    </div>
  );
}

function rangeLabel(d: Telemetry): string {
  return d.range.days === null ? "all logged history" : `last ${d.range.days} days`;
}

// ── Pieces ───────────────────────────────────────────────────────────────────

function Tile({ label, value, sub, emphasis }: { label: string; value: string; sub?: string; emphasis?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/50 p-4">
      <div className="text-xs text-faint">{label}</div>
      <div className={cn("mt-1 font-semibold", emphasis ? "text-3xl" : "text-2xl")}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  );
}

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">{title}</h2>
        {aside}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 flex gap-2 rounded-lg border border-border bg-surface/50 px-3 py-2 text-xs text-muted">
      <Info className="mt-0.5 size-3.5 shrink-0 text-faint" />
      <span>{children}</span>
    </p>
  );
}

function Swatch({ color }: { color: string }) {
  return <span aria-hidden className="inline-block size-2.5 shrink-0 rounded-[3px]" style={{ background: color }} />;
}

/** Only the series that carry cost in the current view — a legend never lists an absent color. */
function activeSeries(data: Telemetry) {
  return SERIES.filter((s) => data.totals.cost[s.key] > 0);
}

function Legend({ data }: { data: Telemetry }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
      {activeSeries(data).map((s) => (
        <span key={s.key} className="inline-flex items-center gap-1.5" title={s.hint}>
          <Swatch color={s.color} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

const STATUS_TEXT: Record<ToolSummary["status"], string> = {
  ok: "Tracked",
  "no-local-usage": "No local token data",
  "not-installed": "Not installed",
};

/** One card per tool: what was found for career-ops, and how its cost is derived. */
function ToolCards({ data }: { data: Telemetry }) {
  const [showAll, setShowAll] = useState(false);
  const visible = data.tools.filter((x) => showAll || x.status !== "not-installed");
  const hidden = data.tools.length - data.tools.filter((x) => x.status !== "not-installed").length;
  return (
    <Section
      title="By tool"
      aside={
        hidden > 0 ? (
          <button type="button" onClick={() => setShowAll((v) => !v)} className="text-xs text-faint hover:text-muted">
            {showAll ? "Hide tools not installed" : `Show ${hidden} not installed`}
          </button>
        ) : undefined
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((x) => {
          const tok = tokenSum(x.tokens);
          return (
            <div key={x.tool} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-foreground">{x.label}</span>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px]",
                    x.status === "ok" ? "border-border text-muted" : "border-dashed border-border text-faint",
                  )}
                >
                  {STATUS_TEXT[x.status]}
                </span>
              </div>
              {x.requests > 0 ? (
                <>
                  <div className="mt-2 text-2xl font-semibold tabular-nums">{usdExact(x.cost.total)}</div>
                  <div className="text-[11px] text-faint">{BASIS_LABEL[x.costBasis]}</div>
                  <div className="mt-2 text-xs text-muted">
                    {x.sessions} session{x.sessions === 1 ? "" : "s"} · {x.requests.toLocaleString()} requests · {tokens(tok)} tokens
                    {x.premiumRequests > 0 && ` · ${+x.premiumRequests.toFixed(2)} premium requests`}
                  </div>
                </>
              ) : x.activity && x.activity.sessions > 0 ? (
                <>
                  <div className="mt-2 text-2xl font-semibold tabular-nums">{x.activity.sessions} chats</div>
                  <div className="text-[11px] text-faint">
                    {x.activity.turns.toLocaleString()} of your messages
                    {x.activity.first && x.activity.last ? ` · ${dateRange(x.activity.first, x.activity.last)}` : ""}
                  </div>
                </>
              ) : (
                <div className="mt-2 text-sm text-faint">No career-ops usage in this range.</div>
              )}
              <p className="mt-2 text-[11px] leading-relaxed text-faint">{x.note}</p>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/** One 100% bar of where the money went, plus a legend that carries every value. */
function CostBreakdown({ data }: { data: Telemetry }) {
  const c = data.totals.cost;
  const tk = data.totals.tokens;
  const detail: Record<SeriesKey, string> = {
    input: `${tokens(tk.input)} tokens`,
    output: `${tokens(tk.output)} tokens`,
    cacheRead: `${tokens(tk.cacheRead)} tokens`,
    cacheWrite: `${tokens(tk.cacheWrite5m + tk.cacheWrite1h)} tokens`,
    webSearch: `${tk.webSearch} searches`,
    premium: `${+data.totals.premiumRequests.toFixed(2)} premium requests`,
    reported: "recorded by the tool",
  };
  const parts = activeSeries(data);
  if (c.total <= 0) {
    return (
      <Section title="Where the cost comes from">
        <p className="text-sm text-muted">No priced usage in this selection — see the token counts above.</p>
      </Section>
    );
  }
  const cacheShare = c.cacheRead / c.total;
  return (
    <Section title="Where the cost comes from">
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex h-6 w-full gap-[2px] overflow-hidden rounded-[4px]" role="img" aria-label="Cost share by component">
          {parts.map((p) => (
            <div
              key={p.key}
              className="h-full"
              style={{ width: `${(c[p.key] / c.total) * 100}%`, background: p.color, minWidth: 2 }}
              title={`${p.label}: ${usdExact(c[p.key])} (${pct(c[p.key], c.total)})`}
            />
          ))}
        </div>
        <div className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
          {parts.map((s) => (
            <div key={s.key} className="flex items-start gap-2 text-sm" title={s.hint}>
              <span className="mt-1.5">
                <Swatch color={s.color} />
              </span>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold tabular-nums">{usdExact(c[s.key])}</span>
                  <span className="text-xs text-faint tabular-nums">{pct(c[s.key], c.total)}</span>
                </div>
                <div className="text-xs text-muted">
                  {s.label} · {detail[s.key]}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {cacheShare >= 0.5 && (
        <Note>
          Cache reads are {pct(c.cacheRead, c.total)} of spend. Each turn re-reads the whole conversation so far from
          cache — cheap per token, but a long session re-reads a large context hundreds of times. Starting a fresh session
          for a new task (or compacting a long one) is the biggest lever on this number.
        </Note>
      )}
    </Section>
  );
}

/** Daily cost, stacked by component. The column is the hover target; a table carries every value. */
function DailyChart({ data }: { data: Telemetry }) {
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const days = data.byDay;
  const series = activeSeries(data);
  const max = Math.max(0, ...days.map((d) => d.cost.total));
  if (max <= 0) return null;
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1] || 1;
  const labelEvery = Math.max(1, Math.ceil(days.length / 8));
  const H = 200;

  return (
    <Section
      title="Daily cost"
      aside={
        <button type="button" onClick={() => setAsTable((v) => !v)} className="text-xs text-faint hover:text-muted">
          {asTable ? "Show chart" : "Show as table"}
        </button>
      }
    >
      <div className="rounded-xl border border-border bg-surface p-4">
        <Legend data={data} />
        {asTable ? (
          <div className="mt-4 max-h-80 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-surface text-xs text-muted">
                <tr>
                  <th className="py-1.5 pr-3 font-medium">Date</th>
                  {series.map((s) => (
                    <th key={s.key} className="py-1.5 pr-3 text-right font-medium">
                      {s.label}
                    </th>
                  ))}
                  <th className="py-1.5 pr-3 text-right font-medium">Total</th>
                  <th className="py-1.5 text-right font-medium">Requests</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {days.map((d) => (
                  <tr key={d.date} className="border-t border-border/60">
                    <td className="py-1.5 pr-3 text-muted">{shortDate(d.date)}</td>
                    {series.map((s) => (
                      <td key={s.key} className="py-1.5 pr-3 text-right">
                        {d.cost[s.key] ? usdExact(d.cost[s.key]) : "—"}
                      </td>
                    ))}
                    <td className="py-1.5 pr-3 text-right font-medium">{usdExact(d.cost.total)}</td>
                    <td className="py-1.5 text-right text-muted">{d.requests}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-7 flex gap-2">
            {/* y axis */}
            <div className="relative w-12 shrink-0 text-right text-[10px] text-faint tabular-nums" style={{ height: H }}>
              {ticks.map((v) => (
                <span key={v} className="absolute right-0 -translate-y-1/2" style={{ bottom: `${(v / top) * 100}%` }}>
                  {usd(v)}
                </span>
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <div className="relative" style={{ height: H }} onMouseLeave={() => setHover(null)}>
                {ticks.map((v) => (
                  <div
                    key={v}
                    aria-hidden
                    className="absolute inset-x-0 border-t border-border"
                    style={{ bottom: `${(v / top) * 100}%` }}
                  />
                ))}
                <div className="absolute inset-0 flex items-end">
                  {days.map((d, i) => {
                    const h = (d.cost.total / top) * 100;
                    const segs = series.map((s) => ({ ...s, v: d.cost[s.key] })).filter((s) => s.v > 0);
                    return (
                      <div
                        key={d.date}
                        tabIndex={0}
                        aria-label={`${shortDate(d.date)}: ${usdExact(d.cost.total)}, ${d.requests} requests`}
                        onMouseEnter={() => setHover(i)}
                        onFocus={() => setHover(i)}
                        onBlur={() => setHover(null)}
                        className="relative flex h-full flex-1 cursor-default items-end justify-center px-[1px] outline-none focus-visible:bg-surface-hover"
                      >
                        <div
                          className={cn(
                            "flex w-full max-w-6 flex-col-reverse gap-[2px] overflow-hidden rounded-t-[4px]",
                            hover !== null && hover !== i && "opacity-60",
                          )}
                          style={{ height: `${h}%` }}
                        >
                          {segs.map((s) => (
                            <div key={s.key} style={{ height: `${(s.v / d.cost.total) * 100}%`, background: s.color }} />
                          ))}
                        </div>
                        {hover === i && <DayTooltip day={d} series={series} index={i} count={days.length} />}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="mt-1.5 flex text-[10px] text-faint">
                {days.map((d, i) => (
                  <div key={d.date} className="flex-1 overflow-visible whitespace-nowrap text-center">
                    {i % labelEvery === 0 || i === days.length - 1 ? shortDate(d.date) : ""}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}

function DayTooltip({
  day,
  series,
  index,
  count,
}: {
  day: Telemetry["byDay"][number];
  series: typeof SERIES;
  index: number;
  count: number;
}) {
  const side = index < count / 3 ? "left-0" : index > (count * 2) / 3 ? "right-0" : "left-1/2 -translate-x-1/2";
  return (
    <div
      role="tooltip"
      className={cn(
        "pointer-events-none absolute bottom-full z-10 mb-2 w-56 rounded-lg border border-border bg-surface p-3 text-xs shadow-lg",
        side,
      )}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold tabular-nums">{usdExact(day.cost.total)}</span>
        <span className="text-faint">{shortDate(day.date)}</span>
      </div>
      <div className="mt-2 space-y-1">
        {series.map((s) => (
          <div key={s.key} className="flex items-center gap-2">
            <span aria-hidden className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="font-medium tabular-nums">{usdExact(day.cost[s.key])}</span>
            <span className="ml-auto text-muted">{s.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 border-t border-border pt-1.5 text-muted">
        {day.requests} request{day.requests === 1 ? "" : "s"}
      </div>
    </div>
  );
}

function ModelTable({ data }: { data: Telemetry }) {
  const total = data.totals.cost.total;
  return (
    <Section title="By model">
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-surface/60 text-xs text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Model</th>
              <th className="px-3 py-2 font-medium">Tool</th>
              <th className="px-3 py-2 text-right font-medium">Requests</th>
              <th className="px-3 py-2 text-right font-medium">Input</th>
              <th className="px-3 py-2 text-right font-medium">Output</th>
              <th className="px-3 py-2 text-right font-medium">Cache read</th>
              <th className="px-3 py-2 text-right font-medium">Cache write</th>
              <th className="px-3 py-2 text-right font-medium">Cost</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {data.byModel.map((m) => (
              <tr key={`${m.tool}|${m.model}`} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2 text-foreground">{prettyModel(m.model)}</td>
                <td className="px-3 py-2 text-xs text-muted">{m.toolLabel}</td>
                <td className="px-3 py-2 text-right text-muted">{m.requests.toLocaleString()}</td>
                <td className="px-3 py-2 text-right text-muted">{tokens(m.tokens.input)}</td>
                <td className="px-3 py-2 text-right text-muted">{tokens(m.tokens.output)}</td>
                <td className="px-3 py-2 text-right text-muted">{tokens(m.tokens.cacheRead)}</td>
                <td className="px-3 py-2 text-right text-muted">{tokens(m.tokens.cacheWrite5m + m.tokens.cacheWrite1h)}</td>
                <td className="px-3 py-2 text-right">
                  {m.priced ? (
                    <>
                      <span className="font-medium">{usdExact(m.cost.total)}</span>
                      {total > 0 && <span className="ml-1.5 text-xs text-faint">{pct(m.cost.total, total)}</span>}
                    </>
                  ) : (
                    <span className="text-faint">no price</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function SessionTable({ data }: { data: Telemetry }) {
  const [showAll, setShowAll] = useState(false);
  const rows = showAll ? data.sessions : data.sessions.slice(0, 10);
  const anyTally = data.sessions.some((s) => s.reportedCostUSD !== null && s.tool === "claude-code");
  return (
    <Section title="By session">
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-surface/60 text-xs text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Session</th>
              <th className="px-3 py-2 font-medium">Tool</th>
              <th className="px-3 py-2 font-medium">Dates</th>
              <th className="px-3 py-2 text-right font-medium">Requests</th>
              <th className="px-3 py-2 font-medium">Models</th>
              <th className="px-3 py-2 text-right font-medium">Cost</th>
              {anyTally && <th className="px-3 py-2 text-right font-medium">Claude Code tally</th>}
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {rows.map((s) => (
              <tr key={`${s.tool}|${s.sessionId}`} className="border-b border-border/60 last:border-0">
                <td className="max-w-[220px] truncate px-3 py-2 text-foreground" title={s.sessionId}>
                  {s.title}
                </td>
                <td className="px-3 py-2 text-xs text-muted">{s.toolLabel}</td>
                <td className="whitespace-nowrap px-3 py-2 text-muted">{dateRange(s.first, s.last)}</td>
                <td className="px-3 py-2 text-right text-muted">{s.requests.toLocaleString()}</td>
                <td className="px-3 py-2 text-xs text-muted">{s.models.map(prettyModel).join(", ")}</td>
                <td className="px-3 py-2 text-right">
                  <span className="font-medium">{usdExact(s.cost.total)}</span>
                  {s.subagentCost > 0 && (
                    <div className="text-[11px] text-faint">incl. {usdExact(s.subagentCost)} subagents</div>
                  )}
                </td>
                {anyTally && (
                  <td className="px-3 py-2 text-right text-muted">
                    {s.tool === "claude-code" && s.reportedCostUSD !== null ? usdExact(s.reportedCostUSD) : "—"}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.sessions.length > 10 && (
        <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-2 text-xs text-faint hover:text-muted">
          {showAll ? "Show top 10" : `Show all ${data.sessions.length} sessions`}
        </button>
      )}
      {anyTally && (
        <Note>
          For Claude Code, <span className="text-foreground">Cost</span> is computed from every API response in the logs
          (de-duplicated; one response spans several log lines). <span className="text-foreground">Claude Code tally</span>{" "}
          is the running total Claude Code saves itself — written only occasionally and per app launch, so it can lag an
          active session, and it also counts internal calls the log doesn&apos;t record. Expect the two to differ.
        </Note>
      )}
    </Section>
  );
}

function Estimator({ data }: { data: Telemetry }) {
  const est = data.estimate;
  const actual = data.totals.cost.total;
  const observed = Math.max(1, Math.round((est.activeDays / Math.max(1, est.calendarDays)) * 30));
  const [daysPerMonth, setDaysPerMonth] = useState(observed);
  const [model, setModel] = useState<string>("current");
  const [plan, setPlan] = useState<string>("");

  useEffect(() => {
    setDaysPerMonth(observed);
  }, [observed]);
  useEffect(() => {
    setPlan(readPrefs().planUsd ?? "");
  }, []);

  // Per active day: current mix, or every token repriced on one model.
  const perDay =
    model === "current"
      ? est.perActiveDay
      : (data.whatIf.find((w) => w.model === model)?.cost ?? 0) / Math.max(1, est.activeDays);
  const monthly = perDay * daysPerMonth;
  const planNum = Number(plan);

  return (
    <Section title="Estimate your costs">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-muted">
              Active days per month
              <input
                type="number"
                min={1}
                max={31}
                value={daysPerMonth}
                onChange={(e) => setDaysPerMonth(Math.min(31, Math.max(1, Number(e.target.value) || 1)))}
                className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
              <span className="mt-1 block text-[11px] text-faint">
                You were active {est.activeDays} of {est.calendarDays} days
              </span>
            </label>
            <label className="text-xs text-muted">
              Model
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="current">Your current mix</option>
                {data.whatIf.map((w) => (
                  <option key={w.model} value={w.model}>
                    Everything on {prettyModel(w.model)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-4 border-t border-border pt-4">
            <div className="text-xs text-faint">Estimated monthly</div>
            <div className="mt-1 text-3xl font-semibold tabular-nums">{usdExact(monthly)}</div>
            <div className="mt-1 text-xs text-muted">
              {usd(perDay)} per active day × {daysPerMonth} days
            </div>
          </div>
          <label className="mt-4 block text-xs text-muted">
            Your plan price ($/month, optional — compare against a subscription)
            <input
              inputMode="decimal"
              value={plan}
              placeholder="e.g. 100"
              onChange={(e) => {
                setPlan(e.target.value);
                writePrefs({ planUsd: e.target.value });
              }}
              className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
          {planNum > 0 && (
            <p className="mt-2 text-xs text-muted">
              That usage would cost <span className="font-medium text-foreground">{(monthly / planNum).toFixed(1)}×</span>{" "}
              your plan price at pay-as-you-go rates.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-xs text-faint">Every token in this view, repriced on one Claude model</div>
          <table className="mt-3 w-full text-sm">
            <tbody className="tabular-nums">
              <tr className="border-b border-border/60">
                <td className="py-2 text-foreground">Your current mix</td>
                <td className="py-2 text-right font-medium">{usdExact(actual)}</td>
                <td className="w-16 py-2 text-right text-xs text-faint">—</td>
              </tr>
              {data.whatIf.map((w) => (
                <tr key={w.model} className="border-b border-border/60 last:border-0">
                  <td className="py-2 text-muted">{prettyModel(w.model)}</td>
                  <td className="py-2 text-right">{usdExact(w.cost)}</td>
                  <td className="py-2 text-right text-xs text-faint">
                    {actual > 0 ? `${w.cost >= actual ? "+" : ""}${Math.round(((w.cost - actual) / actual) * 100)}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[11px] text-faint">
            A close estimate, not a quote: tools and model families count tokens slightly differently, and a different
            model may take more or fewer turns to finish the same work.
          </p>
        </div>
      </div>
    </Section>
  );
}

function PriceTable({ data }: { data: Telemetry }) {
  const inUse = new Set(data.byModel.map((m) => m.model));
  const rows = Object.entries(data.pricing.prices)
    .filter(([m]) => inUse.has(m) || data.whatIf.some((w) => w.model === m))
    .sort((a, b) => b[1].input - a[1].input);
  return (
    <Section title="Prices used (USD per million tokens)">
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-border bg-surface/60 text-xs text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Model</th>
              <th className="px-3 py-2 text-right font-medium">Input</th>
              <th className="px-3 py-2 text-right font-medium">Output</th>
              <th className="px-3 py-2 text-right font-medium">Cache read</th>
              <th className="px-3 py-2 text-right font-medium">Cache write 5m</th>
              <th className="px-3 py-2 text-right font-medium">Cache write 1h</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {rows.map(([m, p]) => (
              <tr key={m} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2 text-foreground">
                  {prettyModel(m)}
                  {inUse.has(m) && <span className="ml-2 text-[11px] text-faint">in use</span>}
                  {data.pricing.overridesApplied.includes(m) && <span className="ml-2 text-[11px] text-faint">override</span>}
                </td>
                <td className="px-3 py-2 text-right text-muted">${p.input}</td>
                <td className="px-3 py-2 text-right text-muted">${p.output}</td>
                <td className="px-3 py-2 text-right text-muted">${p.cacheRead}</td>
                <td className="px-3 py-2 text-right text-muted">${+(p.input * 1.25).toFixed(4)}</td>
                <td className="px-3 py-2 text-right text-muted">${+(p.input * 2).toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Note>
        Anthropic API list prices as of {data.pricing.asOf}; web search $0.01 per search; GitHub Copilot premium
        requests ${data.pricing.premiumRequestUSD.toFixed(2)} each (the published overage rate — requests inside your
        plan&apos;s allowance are already paid for). Other vendors&apos; models (OpenAI, DeepSeek…) aren&apos;t bundled
        because their rates couldn&apos;t be verified here: add them to <code>config/model-pricing.json</code> as{" "}
        <code>{'{"model-id": {"input": 0, "output": 0, "cacheRead": 0}}'}</code>, replacing the zeros with that
        vendor&apos;s published USD-per-million rates (the model id as shown in the table above).
        {data.pricing.overridesError && ` That file couldn't be read: ${data.pricing.overridesError}.`}
      </Note>
    </Section>
  );
}

function ImportHelp() {
  return (
    <Section title="Adding another tool">
      <details className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">
        <summary className="cursor-pointer text-foreground">
          Using an IDE that doesn&apos;t keep usage on this machine? Import it.
        </summary>
        <div className="mt-3 space-y-2 text-xs leading-relaxed">
          <p>
            Put a <code>.csv</code> or <code>.jsonl</code> file in <code>data/telemetry/imports/</code> with your{" "}
            <span className="text-foreground">career-ops</span> usage only (e.g. rows copied from that tool&apos;s usage
            dashboard for the times you worked on career-ops). It shows up here as its own tool after a refresh.
          </p>
          <pre className="overflow-x-auto rounded-md border border-border bg-background p-3 text-[11px] text-foreground">
            {`date,tool,model,input,output,cache_read,cache_write,cost,requests
2026-09-30,Cursor,claude-sonnet-5,12000,3400,250000,8000,0.42,6`}
          </pre>
          <p>
            Only <code>date</code> and <code>tool</code> are required. With a <code>cost</code> column that figure is used
            as-is; without it, cost is computed from the token columns when the model has a price on file.
          </p>
          <p>
            Tools that already log locally and are read automatically: Claude Code, GitHub Copilot CLI, OpenAI Codex CLI and
            OpenCode (tokens + cost), Cursor (chat activity only).
          </p>
        </div>
      </details>
    </Section>
  );
}
