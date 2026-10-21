import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { careerOpsRoot } from "@/lib/career-ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanCategory(value: string): string {
  return value.replace(/[^\w &+./#-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 64);
}

function cleanQuery(value: string): string {
  return value.replace(/[^\w .+#/_-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

function cleanFacet(value: string): string {
  return value.replace(/[^a-z0-9-]/gi, "").toLowerCase().slice(0, 32);
}

/**
 * GET /api/gsoc?category=Security&year=2026&facet=web3&q=rust&likelihood=high&edge=1
 * Spawns strategy/gsoc-orgs.mjs --json (orchestrate the core; do not reimplement).
 */
export async function GET(req: NextRequest) {
  const root = careerOpsRoot();
  const script = path.join(root, "strategy", "gsoc-orgs.mjs");
  if (!fs.existsSync(script)) {
    return Response.json(
      { ok: false, error: "The GSoC explorer is not in this checkout.", organizations: [] },
      { status: 404 },
    );
  }

  const q = req.nextUrl.searchParams;
  const args = [script, "--json"];
  const category = cleanCategory(q.get("category") || "");
  if (category) args.push("--category", category);
  const facet = cleanFacet(q.get("facet") || "");
  if (facet) args.push("--facet", facet);
  const year = Number(q.get("year") || "0");
  if (Number.isInteger(year) && year >= 2016 && year <= 2026) {
    args.push("--year", String(year));
  }
  const text = cleanQuery(q.get("q") || "");
  if (text) args.push("--q", text);
  const likelihood = cleanFacet(q.get("likelihood") || "");
  if (likelihood === "high" || likelihood === "medium" || likelihood === "low") {
    args.push("--likelihood", likelihood);
  }
  if (q.get("edge") === "1" || q.get("edge") === "true") args.push("--edge");
  if (q.get("refresh") === "1") args.push("--refresh");
  const limit = Number(q.get("limit") || "200");
  if (Number.isFinite(limit)) args.push("--limit", String(Math.min(500, Math.max(1, limit))));

  const { stdout, stderr, code } = await new Promise<{
    stdout: string;
    stderr: string;
    code: number | null;
  }>((resolve) => {
    execFile(
      process.execPath,
      args,
      { cwd: root, timeout: 90_000, maxBuffer: 16 << 20 },
      (err, out, errOut) => {
        resolve({
          stdout: out || "",
          stderr: errOut || err?.message || "",
          code: err && "code" in err ? (err.code as number | null) : 0,
        });
      },
    );
  });

  try {
    const start = stdout.indexOf("{");
    if (start < 0 || code) throw new Error(stderr.trim() || "GSoC lookup returned no result.");
    const data = JSON.parse(stdout.slice(start));
    return Response.json({ ok: true, ...data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "GSoC lookup failed.";
    return Response.json({ ok: false, error: message.slice(0, 240), organizations: [] }, { status: 502 });
  }
}
