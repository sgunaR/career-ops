import fs from "node:fs";
import path from "node:path";
import { careerOpsRoot } from "@/lib/career-ops";
import { normalizeModel } from "@/lib/telemetry/pricing";
import type { SessionInfo, SourceReader, SourceResult, UsageRecord } from "@/lib/telemetry/types";

// Manual imports — for any tool that doesn't keep usage on this machine (Cursor,
// Antigravity, a future IDE…). Drop .csv or .jsonl files into
// data/telemetry/imports/ (user layer, never auto-updated). YOU choose what goes
// in, so put only career-ops usage there — these rows are trusted as-is.
//
// Columns / keys (case-insensitive; aliases in parentheses; only date + tool required):
//   date (timestamp, time)   ISO date or date-time
//   tool                     e.g. "Cursor" — each tool gets its own row on the page
//   model
//   input (input_tokens)     uncached input tokens
//   output (output_tokens)
//   cache_read (cache_read_tokens)
//   cache_write (cache_write_tokens)
//   cost (cost_usd)          the tool's own $ figure — used as-is when present
//   requests                 number of API requests the row stands for (default 1)
//   session (session_id)     optional grouping key

export const IMPORTS_TOOL_PREFIX = "import:";

export function importsDir(): string {
  return path.join(careerOpsRoot(), "data", "telemetry", "imports");
}

const ALIASES: Record<string, string[]> = {
  date: ["date", "timestamp", "time"],
  tool: ["tool"],
  model: ["model"],
  input: ["input", "input_tokens"],
  output: ["output", "output_tokens"],
  cache_read: ["cache_read", "cache_read_tokens"],
  cache_write: ["cache_write", "cache_write_tokens"],
  cost: ["cost", "cost_usd"],
  requests: ["requests"],
  session: ["session", "session_id"],
};

function pick(row: Record<string, string>, key: string): string | undefined {
  for (const a of ALIASES[key]) {
    const v = row[a];
    if (v !== undefined && v !== "") return v;
  }
  return undefined;
}

/** Minimal RFC-4180 CSV line split (quoted fields, doubled quotes). */
function splitCsv(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function rowsOf(file: string): Record<string, string>[] {
  let text: string;
  try {
    text = fs.readFileSync(file, "utf8").replace(/^﻿/, "");
  } catch {
    return [];
  }
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (file.toLowerCase().endsWith(".jsonl")) {
    const rows: Record<string, string>[] = [];
    for (const l of lines) {
      try {
        const o = JSON.parse(l) as Record<string, unknown>;
        rows.push(Object.fromEntries(Object.entries(o).map(([k, v]) => [k.toLowerCase(), String(v ?? "")])));
      } catch {
        /* skip malformed line */
      }
    }
    return rows;
  }
  if (lines.length < 2) return [];
  const header = splitCsv(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map((l) => {
    const cells = splitCsv(l);
    return Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ""]));
  });
}

const n = (v: string | undefined) => {
  const x = Number(String(v ?? "").replace(/[$,]/g, ""));
  return Number.isFinite(x) && x > 0 ? x : 0;
};

export const importsSource: SourceReader = {
  tool: "import",
  label: "Imported usage",
  read(): SourceResult[] {
    const dir = importsDir();
    let files: string[] = [];
    try {
      files = fs
        .readdirSync(dir)
        .filter((f) => /\.(csv|jsonl)$/i.test(f))
        .map((f) => path.join(dir, f));
    } catch {
      return []; // no imports folder — nothing to show
    }
    const byTool = new Map<string, { label: string; records: UsageRecord[]; sessions: Set<string>; anyCost: boolean }>();
    for (const file of files) {
      rowsOf(file).forEach((row, i) => {
        const ts = Date.parse(pick(row, "date") ?? "");
        const toolName = (pick(row, "tool") ?? "").trim();
        if (Number.isNaN(ts) || !toolName) return;
        const id = `${IMPORTS_TOOL_PREFIX}${toolName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
        let g = byTool.get(id);
        if (!g) byTool.set(id, (g = { label: `${toolName} (imported)`, records: [], sessions: new Set(), anyCost: false }));
        const costRaw = pick(row, "cost");
        const sessionId = pick(row, "session") ?? `${path.basename(file)}#${new Date(ts).toISOString().slice(0, 10)}`;
        g.sessions.add(sessionId);
        if (costRaw !== undefined) g.anyCost = true;
        g.records.push({
          tool: id,
          key: `${path.basename(file)}|${i}`,
          ts,
          sessionId,
          subagent: false,
          model: normalizeModel(pick(row, "model") ?? "unknown"),
          input: n(pick(row, "input")),
          output: n(pick(row, "output")),
          cacheRead: n(pick(row, "cache_read")),
          cacheWrite5m: n(pick(row, "cache_write")),
          cacheWrite1h: 0,
          webSearch: 0,
          reportedCostUSD: costRaw !== undefined ? n(costRaw) : undefined,
          requestCount: n(pick(row, "requests")) || 1,
        });
      });
    }
    return [...byTool.entries()].map(([tool, g]) => ({
      tool,
      label: g.label,
      status: "ok" as const,
      costBasis: g.anyCost ? ("tool-reported" as const) : ("api-list-price" as const),
      note: "From files in data/telemetry/imports/ — trusted as career-ops usage.",
      records: g.records,
      sessions: [...g.sessions].map(
        (sessionId): SessionInfo => ({
          tool,
          sessionId,
          // Default ids are "<file>#<date>" → "<file> · <date>"; an explicit session column shows as-is.
          title: sessionId.replace("#", " · "),
          reportedCostUSD: null,
        }),
      ),
    }));
  },
};
