import type { TokenCounts } from "@/lib/telemetry/pricing";

// The normalized shape every source reader (one per AI tool) produces. Adding a
// new IDE/CLI means writing one reader in lib/telemetry/sources/ that returns a
// SourceResult and registering it in sources/index.ts — the page, API and cost
// math need no changes.

export type ToolId = string; // e.g. "claude-code", "copilot-cli", "codex", "manual"

export type UsageRecord = TokenCounts & {
  tool: ToolId;
  /** Unique within the tool — used to de-duplicate. */
  key: string;
  ts: number;
  sessionId: string;
  subagent: boolean;
  /** Normalized model id (date suffixes stripped, dots → dashes). */
  model: string;
  /** Reasoning/thinking tokens when the tool reports them separately (already inside `output` unless noted). */
  reasoning?: number;
  /** The tool's own cost figure for this record, when it reports one (e.g. an imported invoice row). */
  reportedCostUSD?: number;
  /** GitHub Copilot's billing unit. */
  premiumRequests?: number;
  /**
   * API requests this record stands for. Per-request sources leave it unset (= 1);
   * tools that only keep per-session totals put the session's request count here.
   */
  requestCount?: number;
};

/**
 * How a tool's dollar figure is derived — shown next to every cost so figures
 * from different bases are never mistaken for one another.
 */
export type CostBasis =
  | "api-list-price" // tokens × Anthropic/other list prices (API-equivalent)
  | "premium-requests" // GitHub Copilot premium requests × the published overage rate
  | "tool-reported" // the tool's own recorded cost
  | "none"; // tokens only — no verified price

export type SessionInfo = {
  tool: ToolId;
  sessionId: string;
  title: string | null;
  /** The tool's own saved cost tally for the session, when it keeps one. */
  reportedCostUSD: number | null;
};

export type SourceStatus =
  | "ok" // read successfully (may still have zero career-ops records)
  | "not-installed" // the tool's data folder isn't on this machine
  | "no-local-usage"; // installed, but it doesn't store token usage locally

export type SourceResult = {
  tool: ToolId;
  label: string;
  status: SourceStatus;
  costBasis: CostBasis;
  /** How this tool's data is read / caveats, shown on the page. */
  note: string;
  records: UsageRecord[];
  sessions: SessionInfo[];
  /** Activity for tools that log conversations but no token counts (e.g. Cursor). */
  activity?: { sessions: number; turns: number; first: number | null; last: number | null };
  /** Per-conversation activity, so the aggregator can apply the selected date range. */
  activityItems?: { first: number; last: number; turns: number }[];
};

export type SourceReader = {
  tool: ToolId;
  label: string;
  /** One result per tool; the import reader returns one per imported tool name. */
  read: () => SourceResult | SourceResult[];
};
