import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { normalizeModel } from "@/lib/telemetry/pricing";
import { inCareerOps } from "@/lib/telemetry/scope";
import type { SessionInfo, SourceReader, SourceResult, UsageRecord } from "@/lib/telemetry/types";

// GitHub Copilot CLI keeps one folder per session under ~/.copilot/session-state/.
// Scope: each session's small workspace.yaml is read for its `cwd` only; the
// session's events.jsonl is opened ONLY when that folder is career-ops.
//
// Usage comes from the `session.shutdown` event (verified against local data):
// data.modelMetrics[model] = {
//   requests: { count, cost },             // cost = premium requests (Copilot's billing unit)
//   usage: { inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens, reasoningTokens },
//   tokenDetails: { input: { tokenCount }, … } // uncached input
// }
// `usage.inputTokens` INCLUDES cache reads + writes (18 + 282,008 + 73,547 =
// 355,573 on a real session), so uncached input comes from tokenDetails.input,
// falling back to the subtraction. A session that exits without a shutdown
// event (crash, still running) has no totals yet and isn't counted.

export const TOOL = "copilot-cli";

type Metric = {
  requests?: { count?: number; cost?: number };
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
    reasoningTokens?: number;
  };
  tokenDetails?: { input?: { tokenCount?: number } };
};

type Parsed = { mtimeMs: number; records: UsageRecord[]; title: string | null };
const cache = new Map<string, Parsed>();

function base(): string {
  return path.join(os.homedir(), ".copilot", "session-state");
}

function yamlField(text: string, key: string): string | null {
  const m = text.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  if (!m) return null;
  return m[1].trim().replace(/^["']|["']$/g, "");
}

function parseSession(dir: string, sessionId: string, title: string | null): Parsed | null {
  const file = path.join(dir, "events.jsonl");
  let st: fs.Stats;
  try {
    st = fs.statSync(file);
  } catch {
    return null;
  }
  const hit = cache.get(file);
  // The cache keeps the prompt fallback; a workspace summary (read fresh) wins.
  if (hit && hit.mtimeMs === st.mtimeMs) return { ...hit, title: title || hit.title };

  const records: UsageRecord[] = [];
  let text = "";
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
  let n = 0;
  let firstPrompt: string | null = null;
  for (const line of text.split("\n")) {
    const isPrompt = !firstPrompt && line.includes('"user.message"');
    if (!isPrompt && !line.includes('"session.shutdown"')) continue;
    let j: { type?: string; timestamp?: string; data?: { modelMetrics?: Record<string, Metric>; content?: string } };
    try {
      j = JSON.parse(line);
    } catch {
      continue;
    }
    if (isPrompt && j.type === "user.message" && typeof j.data?.content === "string") {
      // Title fallback for sessions Copilot never summarized: the prompt's first line.
      firstPrompt = j.data.content.split("\n").find((l) => l.trim())?.trim().slice(0, 80) ?? null;
      continue;
    }
    if (j.type !== "session.shutdown") continue;
    const ts = j.timestamp ? Date.parse(j.timestamp) : NaN;
    if (Number.isNaN(ts)) continue;
    n += 1;
    for (const [model, m] of Object.entries(j.data?.modelMetrics ?? {})) {
      const u = m.usage ?? {};
      const cacheRead = u.cacheReadTokens || 0;
      const cacheWrite = u.cacheWriteTokens || 0;
      const uncached = m.tokenDetails?.input?.tokenCount ?? Math.max(0, (u.inputTokens || 0) - cacheRead - cacheWrite);
      records.push({
        tool: TOOL,
        key: `${sessionId}|${n}|${model}`,
        ts,
        sessionId,
        subagent: false,
        model: normalizeModel(model),
        input: uncached,
        output: u.outputTokens || 0,
        cacheRead,
        cacheWrite5m: cacheWrite, // Copilot doesn't log a cache TTL
        cacheWrite1h: 0,
        webSearch: 0,
        reasoning: u.reasoningTokens || 0,
        premiumRequests: m.requests?.cost || 0,
        requestCount: m.requests?.count || 0,
      });
    }
  }
  const parsed = { mtimeMs: st.mtimeMs, records, title: title || firstPrompt };
  cache.set(file, { ...parsed, title: firstPrompt });
  return parsed;
}

export const copilotCliSource: SourceReader = {
  tool: TOOL,
  label: "GitHub Copilot CLI",
  read(): SourceResult {
    const meta = {
      tool: TOOL,
      label: "GitHub Copilot CLI",
      costBasis: "premium-requests" as const,
      note: "Per-session totals from each session's shutdown event. Billed in premium requests; $ shown at the published $0.04 overage rate.",
    };
    let dirs: fs.Dirent[];
    try {
      dirs = fs.readdirSync(base(), { withFileTypes: true });
    } catch {
      return { ...meta, status: "not-installed", note: "No ~/.copilot/session-state folder on this machine.", records: [], sessions: [] };
    }
    const records: UsageRecord[] = [];
    const sessions: SessionInfo[] = [];
    for (const d of dirs) {
      if (!d.isDirectory()) continue;
      const dir = path.join(base(), d.name);
      let ws = "";
      try {
        ws = fs.readFileSync(path.join(dir, "workspace.yaml"), "utf8");
      } catch {
        continue;
      }
      if (!inCareerOps(yamlField(ws, "cwd"))) continue; // not career-ops → nothing else is read
      const p = parseSession(dir, d.name, yamlField(ws, "summary"));
      if (!p || p.records.length === 0) continue;
      records.push(...p.records);
      sessions.push({ tool: TOOL, sessionId: d.name, title: p.title, reportedCostUSD: null });
    }
    return { ...meta, status: "ok", records, sessions };
  },
};
