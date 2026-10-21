import { NextRequest, NextResponse } from "next/server";
import { buildTelemetry } from "@/lib/telemetry/aggregate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_DAYS = new Set([7, 30, 90]);

/**
 * GET /api/telemetry?days=<7|30|90|all>&tool=<all|tool id>
 * career-ops-only token + cost telemetry across every supported AI tool.
 * Read-only; no request parameter can widen the scope beyond the career-ops
 * folder (see lib/telemetry/scope.ts).
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const daysRaw = q.get("days") || "30";
  const n = Number(daysRaw);
  const days = daysRaw === "all" ? null : ALLOWED_DAYS.has(n) ? n : 30;
  // `tool` only filters within the already-scoped records; unknown ids just yield nothing.
  const tool = (q.get("tool") || "all").slice(0, 80);
  return NextResponse.json(buildTelemetry({ tool, days }));
}
