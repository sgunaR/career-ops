import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { normalizeModel } from "@/lib/telemetry/pricing";
import { careerOpsRoots, inCareerOps } from "@/lib/telemetry/scope";
import type { SessionInfo, SourceReader, SourceResult, UsageRecord } from "@/lib/telemetry/types";

// Claude Code keeps one transcript folder per working directory under
// ~/.claude/projects/, named after the path with every non-alphanumeric char
// turned into "-". Only the folders for the career-ops checkout (and folders
// inside it, e.g. web/) are opened, and each logged line's own `cwd` is checked
// again before it counts — no other project's transcripts are ever read.
//
// Format facts the parser relies on (verified against real transcripts):
//  1. One API response is written across SEVERAL lines (one per content block),
//     each repeating the same `message.usage`; summing lines over-counts ~2x, so
//     rows are de-duplicated on `message.id` + `requestId` (streaming partials
//     carry a lower output count — the final one is kept).
//  2. `cost-state` lines hold Claude Code's own running `totalCostUSD` per app
//     launch (`startTime`). It also counts internal side-calls the transcript
//     never logs (e.g. the Haiku call behind WebFetch), so it is shown as a
//     cross-check, never summed in.

export const TOOL = "claude-code";

type SessionMeta = { title: string | null; costByStart: Map<number, number> };
type FileParse = { mtimeMs: number; size: number; records: UsageRecord[]; meta: Map<string, SessionMeta> };
const fileCache = new Map<string, FileParse>();

function projectsDir(): string {
  return path.join(os.homedir(), ".claude", "projects");
}

function encodeProjectPath(p: string): string {
  return p.replace(/[^A-Za-z0-9]/g, "-");
}

/** Transcript folders that can belong to career-ops: the checkout's own folder or a subfolder's. */
function careerOpsProjectDirs(): { dir: string; exact: boolean }[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(projectsDir(), { withFileTypes: true });
  } catch {
    return [];
  }
  const encoded = careerOpsRoots().map((r) => encodeProjectPath(path.resolve(r)).toLowerCase());
  const out: { dir: string; exact: boolean }[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const name = e.name.toLowerCase();
    const exact = encoded.includes(name);
    // The name encoding is lossy (a sibling "career-ops-v2" repo would also
    // prefix-match), so prefix matches are only candidates; the per-line cwd
    // check in parseFile() is what actually decides.
    if (exact || encoded.some((enc) => name.startsWith(`${enc}-`))) {
      out.push({ dir: path.join(projectsDir(), e.name), exact });
    }
  }
  return out;
}

function* walkJsonl(dir: string): Generator<string> {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walkJsonl(p);
    else if (e.isFile() && e.name.endsWith(".jsonl")) yield p;
  }
}

type RawLine = {
  type?: string;
  cwd?: string;
  sessionId?: string;
  timestamp?: string;
  requestId?: string;
  message?: {
    id?: string;
    model?: string;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_read_input_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_creation?: { ephemeral_5m_input_tokens?: number; ephemeral_1h_input_tokens?: number } | null;
      server_tool_use?: { web_search_requests?: number } | null;
    };
  };
  customTitle?: string;
  startTime?: number;
  totalCostUSD?: number;
};

function parseFile(file: string, exactFolder: boolean): FileParse | null {
  let st: fs.Stats;
  try {
    st = fs.statSync(file);
  } catch {
    return null;
  }
  const hit = fileCache.get(file);
  if (hit && hit.mtimeMs === st.mtimeMs && hit.size === st.size) return hit;

  let text: string;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
  const subagent = file.includes(`${path.sep}subagents${path.sep}`);
  const byKey = new Map<string, UsageRecord>();
  const meta = new Map<string, SessionMeta>();
  const metaFor = (sid: string) => {
    let m = meta.get(sid);
    if (!m) meta.set(sid, (m = { title: null, costByStart: new Map() }));
    return m;
  };

  for (const line of text.split("\n")) {
    if (!line.includes('"usage"') && !line.includes('"cost-state"') && !line.includes('"custom-title"')) continue;
    let j: RawLine;
    try {
      j = JSON.parse(line);
    } catch {
      continue;
    }
    const sid = j.sessionId || path.basename(file, ".jsonl");

    if (j.type === "cost-state" && typeof j.totalCostUSD === "number") {
      const m = metaFor(sid);
      const start = typeof j.startTime === "number" ? j.startTime : 0;
      m.costByStart.set(start, Math.max(m.costByStart.get(start) ?? 0, j.totalCostUSD));
      continue;
    }
    if (j.type === "custom-title" && j.customTitle) {
      metaFor(sid).title = j.customTitle;
      continue;
    }

    const u = j.message?.usage;
    const id = j.message?.id;
    const model = j.message?.model;
    if (!u || !id || !model || model === "<synthetic>") continue;
    // Scope: the line's own working directory decides. A line without one only
    // counts when it sits in the checkout's exact transcript folder.
    if (j.cwd ? !inCareerOps(j.cwd) : !exactFolder) continue;
    const ts = j.timestamp ? Date.parse(j.timestamp) : NaN;
    if (Number.isNaN(ts)) continue;

    const cw = u.cache_creation_input_tokens || 0;
    const cw1h = Math.min(cw, u.cache_creation?.ephemeral_1h_input_tokens || 0);
    const rec: UsageRecord = {
      tool: TOOL,
      key: `${id}|${j.requestId ?? ""}`,
      ts,
      sessionId: sid,
      subagent,
      model: normalizeModel(model),
      input: u.input_tokens || 0,
      output: u.output_tokens || 0,
      cacheRead: u.cache_read_input_tokens || 0,
      cacheWrite1h: cw1h,
      cacheWrite5m: cw - cw1h, // no TTL split logged → priced as the 5-minute write
      webSearch: u.server_tool_use?.web_search_requests || 0,
    };
    const prev = byKey.get(rec.key);
    if (!prev || rec.output >= prev.output) byKey.set(rec.key, rec);
  }

  const parsed: FileParse = { mtimeMs: st.mtimeMs, size: st.size, records: [...byKey.values()], meta };
  fileCache.set(file, parsed);
  return parsed;
}

function collect(): { records: UsageRecord[]; meta: Map<string, SessionMeta> } {
  const records = new Map<string, UsageRecord>();
  const meta = new Map<string, SessionMeta>();
  for (const { dir, exact } of careerOpsProjectDirs()) {
    for (const file of walkJsonl(dir)) {
      const p = parseFile(file, exact);
      if (!p) continue;
      for (const r of p.records) {
        const prev = records.get(r.key);
        if (!prev || r.output >= prev.output) records.set(r.key, r);
      }
      for (const [sid, m] of p.meta) {
        const into = meta.get(sid) ?? { title: null, costByStart: new Map<number, number>() };
        if (m.title) into.title = m.title;
        for (const [start, cost] of m.costByStart) {
          into.costByStart.set(start, Math.max(into.costByStart.get(start) ?? 0, cost));
        }
        meta.set(sid, into);
      }
    }
  }
  return { records: [...records.values()], meta };
}

export const claudeCodeSource: SourceReader = {
  tool: TOOL,
  label: "Claude Code",
  read(): SourceResult {
    const base = { tool: TOOL, label: "Claude Code", costBasis: "api-list-price" as const };
    if (!fs.existsSync(projectsDir())) {
      return { ...base, status: "not-installed", note: "No ~/.claude/projects folder on this machine.", records: [], sessions: [] };
    }
    const { records, meta } = collect();
    const inScope = new Set(records.map((r) => r.sessionId));
    const sessions: SessionInfo[] = [...inScope].map((sid) => {
      const m = meta.get(sid);
      let reported: number | null = null;
      if (m && m.costByStart.size) {
        reported = 0;
        for (const v of m.costByStart.values()) reported += v;
      }
      return { tool: TOOL, sessionId: sid, title: m?.title ?? null, reportedCostUSD: reported };
    });
    return {
      ...base,
      status: "ok",
      note: "Per-request usage from local session transcripts (subagents included), de-duplicated per API response.",
      records,
      sessions,
    };
  },
};

/**
 * Rolling-window token totals for the sidebar usage meter — career-ops sessions
 * only. Counts input + output + cache writes (cache reads excluded).
 */
export function usageWindows(): {
  window5h: { tokens: number; messages: number };
  window7d: { tokens: number; messages: number };
  computedAt: number;
} {
  const now = Date.now();
  const w5 = now - 5 * 3_600_000;
  const w7 = now - 7 * 86_400_000;
  const out = { window5h: { tokens: 0, messages: 0 }, window7d: { tokens: 0, messages: 0 }, computedAt: now };
  const seen = new Set<string>();
  for (const { dir, exact } of careerOpsProjectDirs()) {
    for (const file of walkJsonl(dir)) {
      let st: fs.Stats;
      try {
        st = fs.statSync(file);
      } catch {
        continue;
      }
      if (st.mtimeMs < w7 - 3_600_000) continue;
      const parsed = parseFile(file, exact);
      if (!parsed) continue;
      for (const r of parsed.records) {
        if (r.ts < w7 || seen.has(r.key)) continue;
        seen.add(r.key);
        const tok = r.input + r.output + r.cacheWrite5m + r.cacheWrite1h;
        out.window7d.tokens += tok;
        out.window7d.messages += 1;
        if (r.ts >= w5) {
          out.window5h.tokens += tok;
          out.window5h.messages += 1;
        }
      }
    }
  }
  return out;
}
