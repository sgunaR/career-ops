import { NextResponse } from "next/server";
import { usageWindows } from "@/lib/telemetry/sources/claude-code";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Claude Code token totals in the rolling 5h and 7d windows — career-ops
// sessions only (the user's choice: nothing from other projects is read), so it
// shows career-ops' share of the account's rate-limit windows, not the whole
// account. De-duplicated per API response; the shared reader lives in
// lib/telemetry/sources/claude-code.ts and also backs /telemetry. Cached 60s.

type Usage = ReturnType<typeof usageWindows>;
let cache: { at: number; data: Usage } | null = null;

export async function GET() {
  if (cache && Date.now() - cache.at < 60_000) return NextResponse.json(cache.data);
  const data = usageWindows();
  cache = { at: Date.now(), data };
  return NextResponse.json(data);
}
