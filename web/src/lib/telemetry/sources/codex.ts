import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { normalizeModel } from "@/lib/telemetry/pricing";
import { inCareerOps } from "@/lib/telemetry/scope";
import type { SessionInfo, SourceReader, SourceResult, UsageRecord } from "@/lib/telemetry/types";

// OpenAI Codex CLI writes one rollout file per session under
// ~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl. Scope: only the FIRST line is
// read (`session_meta.payload.cwd`); the rest of the file is read only when that
// folder is career-ops.
//
// Usage format, from codex-rs/protocol (TokenCountEvent / TokenUsageInfo /
// TokenUsage): `event_msg` lines with payload.type "token_count" carry
// info.total_token_usage = { input_tokens, cached_input_tokens,
// cache_write_input_tokens, output_tokens, reasoning_output_tokens,
// total_tokens }, cumulative for the session. Cached input is a SUBSET of
// input_tokens (Codex's own non_cached_input() is input − cached). Per-turn
// usage is taken as the delta between consecutive cumulative totals, so repeated
// events never double-count. The model comes from the latest `turn_context`.

export const TOOL = "codex";

type TokenUsage = {
  input_tokens?: number;
  cached_input_tokens?: number;
  cache_write_input_tokens?: number;
  output_tokens?: number;
  reasoning_output_tokens?: number;
};

type Parsed = { mtimeMs: number; size: number; inScope: boolean; records: UsageRecord[]; sessionId: string };
const cache = new Map<string, Parsed>();

function base(): string {
  return path.join(os.homedir(), ".codex", "sessions");
}

function* walk(dir: string): Generator<string> {
  let es: fs.Dirent[];
  try {
    es = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of es) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.isFile() && e.name.endsWith(".jsonl")) yield p;
  }
}

/** First line only — session_meta can carry the full base instructions, so read in chunks. */
function readFirstLine(file: string, maxBytes = 8 * 1024 * 1024): string | null {
  let fd: number;
  try {
    fd = fs.openSync(file, "r");
  } catch {
    return null;
  }
  try {
    const chunk = Buffer.alloc(64 * 1024);
    const parts: Buffer[] = [];
    let total = 0;
    while (total < maxBytes) {
      const n = fs.readSync(fd, chunk, 0, chunk.length, total);
      if (n <= 0) break;
      const nl = chunk.subarray(0, n).indexOf(10);
      if (nl !== -1) {
        parts.push(Buffer.from(chunk.subarray(0, nl)));
        return Buffer.concat(parts).toString("utf8");
      }
      parts.push(Buffer.from(chunk.subarray(0, n)));
      total += n;
    }
    return Buffer.concat(parts).toString("utf8");
  } finally {
    fs.closeSync(fd);
  }
}

function parseFile(file: string): Parsed | null {
  let st: fs.Stats;
  try {
    st = fs.statSync(file);
  } catch {
    return null;
  }
  const hit = cache.get(file);
  if (hit && hit.mtimeMs === st.mtimeMs && hit.size === st.size) return hit;

  const first = readFirstLine(file);
  let cwd: string | null = null;
  let sessionId = path.basename(file, ".jsonl");
  try {
    const meta = JSON.parse(first ?? "") as { type?: string; payload?: { cwd?: string; id?: string; session_id?: string } };
    if (meta.type === "session_meta") {
      cwd = meta.payload?.cwd ?? null;
      sessionId = meta.payload?.session_id || meta.payload?.id || sessionId;
    }
  } catch {
    /* unreadable first line → treated as out of scope */
  }
  if (!inCareerOps(cwd)) {
    const out = { mtimeMs: st.mtimeMs, size: st.size, inScope: false, records: [], sessionId };
    cache.set(file, out);
    return out;
  }

  const records: UsageRecord[] = [];
  let model = "unknown";
  let prev: Required<TokenUsage> = {
    input_tokens: 0,
    cached_input_tokens: 0,
    cache_write_input_tokens: 0,
    output_tokens: 0,
    reasoning_output_tokens: 0,
  };
  let n = 0;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (!line.includes('"turn_context"') && !line.includes('"token_count"')) continue;
    let j: { type?: string; timestamp?: string; payload?: { type?: string; model?: string; info?: { total_token_usage?: TokenUsage } | null } };
    try {
      j = JSON.parse(line);
    } catch {
      continue;
    }
    if (j.type === "turn_context" && j.payload?.model) {
      model = j.payload.model;
      continue;
    }
    const tot = j.payload?.type === "token_count" ? j.payload.info?.total_token_usage : undefined;
    if (!tot) continue;
    const cur = {
      input_tokens: tot.input_tokens || 0,
      cached_input_tokens: tot.cached_input_tokens || 0,
      cache_write_input_tokens: tot.cache_write_input_tokens || 0,
      output_tokens: tot.output_tokens || 0,
      reasoning_output_tokens: tot.reasoning_output_tokens || 0,
    };
    const d = {
      input: cur.input_tokens - prev.input_tokens,
      cached: cur.cached_input_tokens - prev.cached_input_tokens,
      write: cur.cache_write_input_tokens - prev.cache_write_input_tokens,
      output: cur.output_tokens - prev.output_tokens,
      reasoning: cur.reasoning_output_tokens - prev.reasoning_output_tokens,
    };
    prev = cur;
    if (d.input <= 0 && d.output <= 0) continue; // repeated snapshot, nothing new
    const ts = j.timestamp ? Date.parse(j.timestamp) : NaN;
    if (Number.isNaN(ts)) continue;
    n += 1;
    records.push({
      tool: TOOL,
      key: `${sessionId}|${n}`,
      ts,
      sessionId,
      subagent: false,
      model: normalizeModel(model),
      input: Math.max(0, d.input - d.cached),
      output: Math.max(0, d.output),
      cacheRead: Math.max(0, d.cached),
      cacheWrite5m: Math.max(0, d.write), // as reported; 0 on OpenAI models
      cacheWrite1h: 0,
      webSearch: 0,
      reasoning: Math.max(0, d.reasoning),
    });
  }
  const out = { mtimeMs: st.mtimeMs, size: st.size, inScope: true, records, sessionId };
  cache.set(file, out);
  return out;
}

export const codexSource: SourceReader = {
  tool: TOOL,
  label: "OpenAI Codex CLI",
  read(): SourceResult {
    const meta = {
      tool: TOOL,
      label: "OpenAI Codex CLI",
      costBasis: "api-list-price" as const,
      note: "Per-turn usage from session rollout files. OpenAI model rates aren't bundled — add them in config/model-pricing.json to see $.",
    };
    if (!fs.existsSync(base())) {
      return { ...meta, status: "not-installed", note: "No ~/.codex/sessions folder on this machine.", records: [], sessions: [] };
    }
    const records: UsageRecord[] = [];
    const ids = new Set<string>();
    for (const file of walk(base())) {
      const p = parseFile(file);
      if (!p || !p.inScope || p.records.length === 0) continue;
      records.push(...p.records);
      ids.add(p.sessionId);
    }
    const sessions: SessionInfo[] = [...ids].map((sessionId) => ({ tool: TOOL, sessionId, title: null, reportedCostUSD: null }));
    return { ...meta, status: "ok", records, sessions };
  },
};
