import { spawn } from "node:child_process";
import { NextRequest } from "next/server";
import { careerOpsRoot } from "@/lib/career-ops";
import { buildLocalToolCommand, type LocalToolAction, type RunRequest } from "@/lib/local-tools";

export const runtime = "nodejs";
export const maxDuration = 600;
export const dynamic = "force-dynamic";

type NdjsonEvent =
  | { kind: "start"; label: string; script: string; args: string[] }
  | { kind: "log"; stream: "stdout" | "stderr"; line: string }
  | { kind: "done"; code: number | null }
  | { kind: "error"; message: string };

const ACTIONS = new Set<LocalToolAction>([
  "india-scan",
  "india-health",
  "india-login",
  "scan-all",
  "scan-companies",
  "scan-career",
  "scan-yc",
  "scan-seeds",
  "company-funded",
  "harvest-companies",
  "reset-inbox",
  "reset-evaluations",
  "clean-liveness",
  "bootstrap-india",
]);

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Expected JSON body" }, { status: 400 });
  }

  const action = body.action;
  if (typeof action !== "string" || !ACTIONS.has(action as LocalToolAction)) {
    return Response.json({ error: "Invalid or missing action" }, { status: 400 });
  }

  const runReq: RunRequest = {
    action: action as LocalToolAction,
    board: typeof body.board === "string" ? body.board : undefined,
    boards: Array.isArray(body.boards) ? body.boards.filter((x): x is string => typeof x === "string") : undefined,
    companies: Array.isArray(body.companies)
      ? body.companies.filter((x): x is string => typeof x === "string")
      : typeof body.companies === "string"
        ? body.companies.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined,
    maxPages: typeof body.maxPages === "number" ? body.maxPages : undefined,
    dryRun: body.dryRun === true,
    aiOnly: body.aiOnly === true,
    cli: typeof body.cli === "string" ? body.cli : undefined,
    confirm: body.confirm === true,
    pipelineOnly: body.pipelineOnly === true,
  };

  let cmd: ReturnType<typeof buildLocalToolCommand>;
  try {
    cmd = buildLocalToolCommand(runReq);
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Bad request" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (obj: NdjsonEvent) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
        } catch {
          /* closed */
        }
      };

      send({ kind: "start", label: cmd.label, script: cmd.script, args: cmd.args });

      const env = { ...process.env };
      // Honor the web Config CLI for harvest AI (same CAREER_OPS_CLI contract as doctor).
      if (typeof runReq.cli === "string" && runReq.cli.trim()) {
        env.CAREER_OPS_CLI = runReq.cli.trim().toLowerCase();
      }
      const child = spawn(process.execPath, [cmd.script, ...cmd.args], {
        cwd: careerOpsRoot(),
        env,
        stdio: ["ignore", "pipe", "pipe"],
      });

      const pipe = (streamName: "stdout" | "stderr", buf: Buffer) => {
        const text = buf.toString("utf8");
        for (const line of text.split(/\r?\n/)) {
          if (line.length) send({ kind: "log", stream: streamName, line });
        }
      };

      child.stdout?.on("data", (buf: Buffer) => pipe("stdout", buf));
      child.stderr?.on("data", (buf: Buffer) => pipe("stderr", buf));
      child.on("error", (e) => {
        send({ kind: "error", message: e.message });
        controller.close();
      });
      child.on("close", (code) => {
        send({ kind: "done", code });
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
