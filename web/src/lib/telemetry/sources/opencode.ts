import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { normalizeModel } from "@/lib/telemetry/pricing";
import { inCareerOps } from "@/lib/telemetry/scope";
import type { SessionInfo, SourceReader, SourceResult, UsageRecord } from "@/lib/telemetry/types";

// OpenCode stores sessions in ~/.local/share/opencode/opencode.db (SQLite). The
// `session` table carries per-session totals (verified against local data):
// directory, title, model (JSON {id, providerID}), cost (OpenCode's own figure),
// tokens_input, tokens_output, tokens_reasoning, tokens_cache_read,
// tokens_cache_write, time_created/time_updated (epoch ms). Input excludes cache
// (a real session shows cache_read > input). Scope: only `id` + `directory` are
// selected for every row; the rest is fetched for career-ops rows only.
//
// Opened read-only through Node's built-in SQLite (node:sqlite, Node 22.5+),
// loaded with process.getBuiltinModule so the web bundler never has to resolve
// it — and so an older Node degrades to "unavailable" instead of crashing.

export const TOOL = "opencode";

type Row = Record<string, unknown>;
type Db = { prepare(sql: string): { all(...params: unknown[]): Row[] }; close(): void };

function dbPath(): string {
  return path.join(os.homedir(), ".local", "share", "opencode", "opencode.db");
}

function openDb(file: string): Db | null {
  try {
    const getBuiltin = (process as unknown as { getBuiltinModule?: (id: string) => unknown }).getBuiltinModule;
    const sqlite = getBuiltin?.("node:sqlite") as
      | { DatabaseSync: new (p: string, o: { readOnly: boolean }) => Db }
      | undefined;
    if (!sqlite) return null;
    return new sqlite.DatabaseSync(file, { readOnly: true });
  } catch {
    return null;
  }
}

const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "bigint" ? Number(v) : Number(v) || 0);

export const opencodeSource: SourceReader = {
  tool: TOOL,
  label: "OpenCode",
  read(): SourceResult {
    const meta = {
      tool: TOOL,
      label: "OpenCode",
      costBasis: "tool-reported" as const,
      note: "Per-session totals from OpenCode's local database; cost is OpenCode's own recorded figure ($0 on free models).",
    };
    if (!fs.existsSync(dbPath())) {
      return { ...meta, status: "not-installed", note: "No OpenCode database on this machine.", records: [], sessions: [] };
    }
    const db = openDb(dbPath());
    if (!db) {
      return {
        ...meta,
        status: "no-local-usage",
        note: "OpenCode's database needs Node's built-in SQLite (Node 22.5+) to read.",
        records: [],
        sessions: [],
      };
    }
    try {
      const ids = db
        .prepare("select id, directory from session")
        .all()
        .filter((r) => inCareerOps(String(r.directory ?? "")))
        .map((r) => String(r.id));
      if (ids.length === 0) return { ...meta, status: "ok", records: [], sessions: [] };

      const rows = db
        .prepare(
          `select id, title, model, cost, tokens_input, tokens_output, tokens_reasoning,
                  tokens_cache_read, tokens_cache_write, time_updated
             from session where id in (${ids.map(() => "?").join(",")})`,
        )
        .all(...ids);

      // Assistant replies per session ≈ API requests (best effort; 1 if unreadable).
      const replies = new Map<string, number>();
      try {
        for (const r of db
          .prepare(
            `select session_id, count(*) n from message
              where session_id in (${ids.map(() => "?").join(",")})
                and json_extract(data, '$.role') = 'assistant'
              group by session_id`,
          )
          .all(...ids)) {
          replies.set(String(r.session_id), num(r.n));
        }
      } catch {
        /* JSON1 unavailable — fall back to 1 per session */
      }

      const records: UsageRecord[] = [];
      const sessions: SessionInfo[] = [];
      for (const r of rows) {
        const input = num(r.tokens_input);
        const output = num(r.tokens_output);
        const cacheRead = num(r.tokens_cache_read);
        const cacheWrite = num(r.tokens_cache_write);
        if (input + output + cacheRead + cacheWrite === 0) continue; // opened, never used
        let model = "unknown";
        try {
          const m = JSON.parse(String(r.model ?? "{}")) as { id?: string };
          if (m.id) model = m.id;
        } catch {
          /* keep "unknown" */
        }
        const sid = String(r.id);
        records.push({
          tool: TOOL,
          key: sid,
          ts: num(r.time_updated),
          sessionId: sid,
          subagent: false,
          model: normalizeModel(model),
          input,
          output,
          cacheRead,
          cacheWrite5m: cacheWrite,
          cacheWrite1h: 0,
          webSearch: 0,
          reasoning: num(r.tokens_reasoning),
          reportedCostUSD: num(r.cost),
          requestCount: replies.get(sid) || 1,
        });
        sessions.push({ tool: TOOL, sessionId: sid, title: r.title ? String(r.title) : null, reportedCostUSD: num(r.cost) });
      }
      return { ...meta, status: "ok", records, sessions };
    } catch (err) {
      return {
        ...meta,
        status: "no-local-usage",
        note: `OpenCode's database couldn't be read (${err instanceof Error ? err.message : "unknown error"}).`,
        records: [],
        sessions: [],
      };
    } finally {
      db.close();
    }
  },
};
