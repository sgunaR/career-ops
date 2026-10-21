import {
  COPILOT_PREMIUM_REQUEST_USD,
  WHAT_IF_MODELS,
  costOf,
  loadPricing,
  type TokenCounts,
} from "@/lib/telemetry/pricing";
import { careerOpsRoots } from "@/lib/telemetry/scope";
import { SOURCES } from "@/lib/telemetry/sources";
import type { CostBasis, SourceResult, SourceStatus, UsageRecord } from "@/lib/telemetry/types";

// Combines every source reader into one career-ops telemetry view. Each record
// is priced on its tool's basis — never mixed silently:
//   tool-reported   → the tool's own $ figure (e.g. OpenCode)
//   premium-requests→ Copilot premium requests × the published overage rate
//   api-list-price  → tokens × list price (API-equivalent); unpriced if no verified rate

export type Tokens = TokenCounts & { reasoning: number };
export type CostParts = {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  webSearch: number;
  premium: number;
  reported: number;
  total: number;
};
export type Bucket = { tokens: Tokens; cost: CostParts; requests: number; premiumRequests: number };

const zeroTokens = (): Tokens => ({ input: 0, output: 0, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0, webSearch: 0, reasoning: 0 });
const zeroCost = (): CostParts => ({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0, webSearch: 0, premium: 0, reported: 0, total: 0 });
const bucket = (): Bucket => ({ tokens: zeroTokens(), cost: zeroCost(), requests: 0, premiumRequests: 0 });

function add(b: Bucket, r: UsageRecord, c: CostParts): void {
  b.tokens.input += r.input;
  b.tokens.output += r.output;
  b.tokens.cacheRead += r.cacheRead;
  b.tokens.cacheWrite5m += r.cacheWrite5m;
  b.tokens.cacheWrite1h += r.cacheWrite1h;
  b.tokens.webSearch += r.webSearch;
  b.tokens.reasoning += r.reasoning ?? 0;
  for (const k of Object.keys(c) as (keyof CostParts)[]) b.cost[k] += c[k];
  b.requests += r.requestCount ?? 1;
  b.premiumRequests += r.premiumRequests ?? 0;
}

function dayKey(ms: number): string {
  const d = new Date(ms); // server = the user's machine → their local day
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export type ToolSummary = Bucket & {
  tool: string;
  label: string;
  status: SourceStatus;
  costBasis: CostBasis;
  note: string;
  sessions: number;
  activity?: SourceResult["activity"];
};

export type Telemetry = {
  generatedAt: number;
  scopeRoots: string[];
  tool: string; // "all" or a tool id
  range: { days: number | null; from: number | null; to: number };
  pricing: ReturnType<typeof loadPricing> & { premiumRequestUSD: number };
  tools: ToolSummary[];
  totals: Bucket & { sessions: number; unpricedModels: string[]; unpricedTokens: number };
  byModel: (Bucket & { tool: string; toolLabel: string; model: string; priced: boolean; costBasis: CostBasis })[];
  byDay: (Bucket & { date: string })[];
  sessions: (Bucket & {
    tool: string;
    toolLabel: string;
    sessionId: string;
    title: string;
    first: number;
    last: number;
    models: string[];
    subagentCost: number;
    reportedCostUSD: number | null;
  })[];
  estimate: {
    since: string | null;
    calendarDays: number;
    activeDays: number;
    perActiveDay: number;
    perCalendarDay: number;
    perSession: number;
    perRequest: number;
    projected30d: number;
  };
  /** Every token in range (all tools) repriced on each current Claude model. */
  whatIf: { model: string; cost: number }[];
};

export function buildTelemetry({ tool, days }: { tool: string; days: number | null }): Telemetry {
  const pricing = loadPricing();
  const now = Date.now();
  const from = days ? startOfDay(now) - (days - 1) * 86_400_000 : null;
  const inRange = (r: UsageRecord) => from === null || r.ts >= from;

  const results: SourceResult[] = SOURCES.flatMap((s) => {
    try {
      const out = s.read();
      return Array.isArray(out) ? out : [out];
    } catch (err) {
      return [
        {
          tool: s.tool,
          label: s.label,
          status: "no-local-usage" as const,
          costBasis: "none" as const,
          note: `Couldn't be read (${err instanceof Error ? err.message : "unknown error"}).`,
          records: [],
          sessions: [],
        },
      ];
    }
  });
  const byId = new Map(results.map((r) => [r.tool, r]));

  const priceRecord = (r: UsageRecord, basis: CostBasis): CostParts | null => {
    const c = zeroCost();
    if (r.reportedCostUSD !== undefined) {
      c.reported = r.reportedCostUSD;
    } else if (basis === "premium-requests") {
      c.premium = (r.premiumRequests ?? 0) * COPILOT_PREMIUM_REQUEST_USD;
    } else {
      const api = costOf(r, pricing.prices[r.model]);
      if (!api) return null; // unpriced
      c.input = api.input;
      c.output = api.output;
      c.cacheRead = api.cacheRead;
      c.cacheWrite = api.cacheWrite;
      c.webSearch = api.webSearch;
    }
    c.total = c.input + c.output + c.cacheRead + c.cacheWrite + c.webSearch + c.premium + c.reported;
    return c;
  };

  // Per-tool summaries (always every tool, so the filter chips show counts).
  const tools: ToolSummary[] = results.map((res) => {
    const b = bucket();
    const sids = new Set<string>();
    for (const r of res.records) {
      if (!inRange(r)) continue;
      add(b, r, priceRecord(r, res.costBasis) ?? zeroCost());
      sids.add(r.sessionId);
    }
    // Activity-only tools: count conversations active inside the selected range.
    let activity = res.activity;
    if (res.activityItems) {
      const hits = res.activityItems.filter((a) => from === null || a.last >= from);
      activity = {
        sessions: hits.length,
        turns: hits.reduce((n, a) => n + a.turns, 0),
        first: hits.length ? Math.min(...hits.map((a) => a.first)) : null,
        last: hits.length ? Math.max(...hits.map((a) => a.last)) : null,
      };
    }
    return {
      ...b,
      tool: res.tool,
      label: res.label,
      status: res.status,
      costBasis: res.costBasis,
      note: res.note,
      sessions: sids.size,
      activity,
    };
  });

  const selected = results.filter((r) => tool === "all" || r.tool === tool);
  const records = selected
    .flatMap((res) => res.records.map((r) => ({ r, res })))
    .filter(({ r }) => inRange(r))
    .sort((a, b) => a.r.ts - b.r.ts);

  const totals = bucket();
  const unpriced = new Set<string>();
  let unpricedTokens = 0;
  const byModel = new Map<string, Bucket & { tool: string; model: string }>();
  const byDay = new Map<string, Bucket>();
  const bySession = new Map<
    string,
    Bucket & { tool: string; sessionId: string; first: number; last: number; models: Set<string>; subagentCost: number }
  >();

  for (const { r, res } of records) {
    const priced = priceRecord(r, res.costBasis);
    if (!priced) {
      unpriced.add(r.model);
      unpricedTokens += r.input + r.output + r.cacheRead + r.cacheWrite5m + r.cacheWrite1h;
    }
    const c = priced ?? zeroCost();
    add(totals, r, c);

    const mk = `${r.tool}|${r.model}`;
    if (!byModel.has(mk)) byModel.set(mk, { ...bucket(), tool: r.tool, model: r.model });
    add(byModel.get(mk)!, r, c);

    const dk = dayKey(r.ts);
    if (!byDay.has(dk)) byDay.set(dk, bucket());
    add(byDay.get(dk)!, r, c);

    const sk = `${r.tool}|${r.sessionId}`;
    let s = bySession.get(sk);
    if (!s) {
      s = { ...bucket(), tool: r.tool, sessionId: r.sessionId, first: r.ts, last: r.ts, models: new Set(), subagentCost: 0 };
      bySession.set(sk, s);
    }
    add(s, r, c);
    s.first = Math.min(s.first, r.ts);
    s.last = Math.max(s.last, r.ts);
    s.models.add(r.model);
    if (r.subagent) s.subagentCost += c.total;
  }

  // Continuous day axis, zero-filled.
  const firstDay = from ?? (records.length ? startOfDay(records[0].r.ts) : startOfDay(now));
  const dayRows: Telemetry["byDay"] = [];
  for (let t = firstDay; t <= now && dayRows.length <= 400; t += 86_400_000) {
    const k = dayKey(t);
    dayRows.push({ date: k, ...(byDay.get(k) ?? bucket()) });
  }

  const sessionMeta = new Map<string, { title: string | null; reported: number | null }>();
  for (const res of selected) {
    for (const s of res.sessions) {
      sessionMeta.set(`${res.tool}|${s.sessionId}`, { title: s.title, reported: s.reportedCostUSD });
    }
  }
  const labelOf = (t: string) => byId.get(t)?.label ?? t;

  const sessions: Telemetry["sessions"] = [...bySession.entries()]
    .map(([k, s]) => ({
      ...s,
      toolLabel: labelOf(s.tool),
      title: sessionMeta.get(k)?.title || `Session ${s.sessionId.slice(0, 8)}`,
      models: [...s.models].sort(),
      reportedCostUSD: sessionMeta.get(k)?.reported ?? null,
    }))
    .sort((a, b) => b.cost.total - a.cost.total || b.requests - a.requests);

  // Rate basis: days from the first logged request in the window to today —
  // days before any logging aren't evidence of $0 usage.
  const firstActiveIdx = dayRows.findIndex((d) => d.requests > 0);
  const calendarDays = firstActiveIdx === -1 ? 1 : dayRows.length - firstActiveIdx;
  const activeDays = dayRows.filter((d) => d.requests > 0).length;
  const total = totals.cost.total;

  return {
    generatedAt: now,
    scopeRoots: careerOpsRoots(),
    tool,
    range: { days, from, to: now },
    pricing: { ...pricing, premiumRequestUSD: COPILOT_PREMIUM_REQUEST_USD },
    tools,
    totals: { ...totals, sessions: sessions.length, unpricedModels: [...unpriced].sort(), unpricedTokens },
    byModel: [...byModel.values()]
      .map((m) => ({
        ...m,
        toolLabel: labelOf(m.tool),
        priced: !unpriced.has(m.model) || m.cost.total > 0,
        costBasis: byId.get(m.tool)?.costBasis ?? "none",
      }))
      .sort((a, b) => b.cost.total - a.cost.total || b.requests - a.requests),
    byDay: dayRows,
    sessions,
    estimate: {
      since: firstActiveIdx === -1 ? null : dayRows[firstActiveIdx].date,
      calendarDays,
      activeDays,
      perActiveDay: activeDays ? total / activeDays : 0,
      perCalendarDay: total / calendarDays,
      perSession: sessions.length ? total / sessions.length : 0,
      perRequest: totals.requests ? total / totals.requests : 0,
      projected30d: (total / calendarDays) * 30,
    },
    whatIf: WHAT_IF_MODELS.map((model) => ({
      model,
      cost: costOf(totals.tokens, pricing.prices[model])?.total ?? 0,
    })),
  };
}
