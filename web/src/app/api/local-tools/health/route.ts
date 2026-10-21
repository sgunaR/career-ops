import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { careerOpsRoot } from "@/lib/career-ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** India Playwright canaries (~1 min) or the outside-India audit (~30 s). */
export const maxDuration = 600;

type BoardStatus =
  | "live"
  | "empty"
  | "broken"
  | "warn"
  | "skipped"
  | "login"
  | "challenge"
  | "planned"
  | "off"
  | "unchecked"
  | "unknown";

type BoardRow = {
  name: string;
  status: BoardStatus;
  detail: string;
  lane: "india" | "outside";
};

type Group = { id: string; label: string; hint: string; boards: BoardRow[] };

// Shape written by local/audit-outside.mjs --stdout-json (only the fields used here).
type AuditResult = {
  name: string;
  provider: string | null;
  transport: string | null;
  error?: string;
  raw?: number;
  funnel?: { raw: number; keepers: number };
  flags: string[];
  notes?: string[];
};
type AuditPayload = { results: AuditResult[]; off: { name: string; notes: string }[] };

// Grouping is by entry name: several entries share the provider "local-parser".
const STARTUP_NAMES = new Set(["a16z speedrun talent", "top startups", "hacker news who is hiring"]);
const CAREER_NAMES = new Set(["sap", "ey", "advance auto parts"]);

function runNode(script: string, args: string[], timeoutMs: number): Promise<string> {
  const root = careerOpsRoot();
  return new Promise((resolve) => {
    execFile(
      "node",
      [script, ...args],
      { cwd: root, timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024 },
      (_e, out) => resolve(out || ""),
    );
  });
}

function parseIndiaStdout(stdout: string): BoardRow[] {
  const rows: BoardRow[] = [];
  for (const line of stdout.split("\n")) {
    // ✅ naukri — naukri (20 cards, logged in)
    // 🟡 indeed-india — auth / bot challenge
    // ❌ linkedin — 0 cards (selectors or empty)
    // ⏳ apna — not implemented yet
    const m = line.match(/^\s*(✅|🟡|❌|⏳|⏭)\s+(\S+)\s+—\s+(.*)$/);
    if (!m) continue;
    const icon = m[1];
    const detail = m[3].trim();
    let status: BoardStatus = "unknown";
    if (icon === "✅") status = "live";
    else if (icon === "❌") status = "broken";
    else if (icon === "⏳") status = "planned";
    else if (icon === "⏭") status = "skipped";
    else if (icon === "🟡") {
      const d = detail.toLowerCase();
      if (d.includes("login")) status = "login";
      else if (d.includes("challenge") || d.includes("bot") || d.includes("auth")) status = "challenge";
      else status = "empty";
    }
    rows.push({ name: m[2].trim(), status, detail, lane: "india" });
  }
  return rows;
}

/** One audit result → one health row: broken / empty / needs-a-look / live. */
function auditRow(r: AuditResult): BoardRow {
  const transport = r.transport ? `${r.transport}: ` : "";
  if (r.error) {
    return { name: r.name, status: "broken", detail: `${transport}${r.error}`, lane: "outside" };
  }
  if (r.raw === 0) {
    return { name: r.name, status: "empty", detail: `${transport}returned 0 jobs`, lane: "outside" };
  }
  const summary = `${r.raw ?? 0} jobs read, ${r.funnel?.keepers ?? 0} match your filters`;
  if (r.flags.length > 0) {
    const more = r.flags.length > 1 ? ` (+${r.flags.length - 1} more)` : "";
    return { name: r.name, status: "warn", detail: `${r.flags[0]}${more}. ${summary}`, lane: "outside" };
  }
  const note = r.notes?.length ? `. Note: ${r.notes[0]}` : "";
  return { name: r.name, status: "live", detail: `${transport}${summary}${note}`, lane: "outside" };
}

const NOT_PROBED = (name: string, detail: string): BoardRow => ({ name, status: "unchecked", detail, lane: "outside" });

/**
 * Board health, one lane at a time so a page only ever shows its own boards:
 *   ?lane=india   → local/india-scan/health.mjs (Playwright canaries)
 *   ?lane=outside → local/audit-outside.mjs: fetches every source through the real provider
 *                   or local parser and checks the DATA (dates, duplicates, region-locking,
 *                   funnel), grouped into Startups / Remote job boards / Career pages
 */
export async function GET(req: NextRequest) {
  const lane = req.nextUrl.searchParams.get("lane") === "outside" ? "outside" : "india";
  const root = careerOpsRoot();

  if (lane === "india") {
    const indiaHealth = path.join(root, "local", "india-scan", "health.mjs");
    const indiaAvailable = fs.existsSync(indiaHealth);
    const boards = indiaAvailable ? parseIndiaStdout(await runNode(indiaHealth, [], 240_000)) : [];
    return Response.json({
      available: indiaAvailable,
      lane,
      indiaAvailable,
      portalsAvailable: false,
      portalsConfigured: false,
      groups: [
        {
          id: "india",
          label: "Indian job boards",
          hint: "Playwright canaries (local/india-scan/health.mjs)",
          boards,
        },
      ] satisfies Group[],
    });
  }

  const audit = path.join(root, "local", "audit-outside.mjs");
  const portalsAvailable = fs.existsSync(audit);
  const portalsConfigured = fs.existsSync(path.join(root, "portals.yml"));
  if (!portalsAvailable || !portalsConfigured) {
    return Response.json({ available: false, lane, indiaAvailable: false, portalsAvailable, portalsConfigured, groups: [] });
  }

  let payload: AuditPayload | null = null;
  try {
    payload = JSON.parse(await runNode(audit, ["--stdout-json"], 240_000)) as AuditPayload;
  } catch {
    payload = null; // the audit crashed: the panel says so instead of showing an empty list
  }

  const startups: BoardRow[] = [];
  const remote: BoardRow[] = [];
  const careers: BoardRow[] = [];
  const place = (row: BoardRow) => {
    const key = row.name.toLowerCase();
    (STARTUP_NAMES.has(key) ? startups : CAREER_NAMES.has(key) ? careers : remote).push(row);
  };
  for (const r of payload?.results ?? []) place(auditRow(r));
  for (const o of payload?.off ?? []) {
    place({ name: o.name, status: "off", detail: o.notes || "switched off in portals.yml", lane: "outside" });
  }

  // Lists with no live feed: shown so nothing looks "missing", but honestly not probed.
  startups.push(
    NOT_PROBED("Y Combinator companies", "a company list, not a job feed; test it with a dry-run in 2A"),
    NOT_PROBED("YC + a16z companies", "a company list, not a job feed; test it with a dry-run in 2A"),
    NOT_PROBED("Recently funded companies", "a review list; nothing to probe"),
  );

  return Response.json({
    available: payload !== null,
    lane,
    indiaAvailable: false,
    portalsAvailable,
    portalsConfigured,
    groups: [
      { id: "startups", label: "Startups", hint: "boards + company lists", boards: startups },
      { id: "remote", label: "Remote job boards", hint: "data checks: dates, duplicates, region-locking", boards: remote },
      { id: "careers", label: "Company career pages", hint: "SAP audited even though it is off in portals.yml", boards: careers },
    ] satisfies Group[],
  });
}
