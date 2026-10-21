import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { careerOpsRoot } from "@/lib/career-ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function arg(value: string): string {
  return value.replace(/[^\w .+#/_-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

function token(value: string): string {
  return value.replace(/[^A-Za-z0-9.+#_-]/g, "").slice(0, 39);
}

/**
 * GET /api/open-source?category=security&days=90&minStars=20&q=
 * One GitHub category. Up to 100 repos, ranked for a first contribution.
 */
export async function GET(req: NextRequest) {
  const root = careerOpsRoot();
  const script = path.join(root, "strategy", "find-repos.mjs");
  if (!fs.existsSync(script)) {
    return Response.json({ ok: false, error: "The repo finder is not in this checkout.", repos: [] }, { status: 404 });
  }

  const q = req.nextUrl.searchParams;
  const days = Number(q.get("days") || "90");
  const minStars = Number(q.get("minStars") || "20");
  const maxStars = Number(q.get("maxStars") || "50000");
  const minForks = Number(q.get("minForks") || "0");
  const category = (q.get("category") || "webdev").toLowerCase();
  if (!/^[a-z0-9-]{1,32}$/.test(category)) {
    return Response.json({ ok: false, error: "Unknown category.", repos: [] }, { status: 400 });
  }
  const args = [
    script,
    "--json",
    "--category",
    category,
    "--days",
    String(Number.isInteger(days) ? days : 90),
    "--min-stars",
    String(Number.isFinite(minStars) ? minStars : 20),
    "--max-stars",
    String(Number.isFinite(maxStars) ? maxStars : 50000),
    "--min-forks",
    String(Number.isFinite(minForks) ? minForks : 0),
  ];
  const text = arg(q.get("q") || "");
  if (text) args.push("--q", text);
  const language = token(q.get("language") || "");
  if (language) args.push("--language", language);
  const license = token(q.get("license") || "");
  if (license) args.push("--license", license);
  const owner = token(q.get("owner") || "");
  if (owner) args.push("--owner", owner);

  const { stdout, stderr, code } = await new Promise<{ stdout: string; stderr: string; code: number | null }>((resolve) => {
    execFile(process.execPath, args, { cwd: root, timeout: 40_000, maxBuffer: 4 << 20 }, (err, out, errOut) => {
      resolve({ stdout: out || "", stderr: errOut || err?.message || "", code: err && "code" in err ? (err.code as number | null) : 0 });
    });
  });

  try {
    const start = stdout.indexOf("{");
    if (start < 0 || code) throw new Error(stderr.trim() || "GitHub search returned no result.");
    const data = JSON.parse(stdout.slice(start));
    return Response.json({ ok: true, ...data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed.";
    return Response.json({ ok: false, error: message.slice(0, 240), repos: [] }, { status: 502 });
  }
}
