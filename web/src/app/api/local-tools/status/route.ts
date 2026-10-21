import { getLocalToolsStatus } from "@/lib/local-tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Probe gitignored local/ tools — safe to call from the dashboard shell. */
export async function GET() {
  return Response.json(getLocalToolsStatus());
}
