"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Terminal } from "lucide-react";
import type { LocalToolAction, LocalToolsStatus } from "@/lib/local-tools-shared";

export type LogLine = { stream: "stdout" | "stderr"; line: string };

/** CLI id from the web Config page (career-ops:config → cliId). */
export function configuredCliId(): string | null {
  try {
    const id = JSON.parse(localStorage.getItem("career-ops:config") || "{}").cliId;
    return typeof id === "string" && id.trim() ? id.trim().toLowerCase() : null;
  } catch {
    return null;
  }
}

export async function runLocalToolAction(
  body: Record<string, unknown>,
  onLog: (l: LogLine) => void,
  onLabel: (s: string) => void,
): Promise<{ ok: boolean; message: string }> {
  const res = await fetch("/api/local-tools/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { ok: false, message: (err as { error?: string }).error || res.statusText };
  }
  const reader = res.body?.getReader();
  if (!reader) return { ok: false, message: "No response stream" };
  const dec = new TextDecoder();
  let buf = "";
  let code: number | null = 1;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split("\n");
    buf = parts.pop() ?? "";
    for (const line of parts) {
      if (!line.trim()) continue;
      try {
        const ev = JSON.parse(line) as {
          kind: string;
          label?: string;
          stream?: "stdout" | "stderr";
          line?: string;
          code?: number | null;
          message?: string;
        };
        if (ev.kind === "start" && ev.label) onLabel(ev.label);
        if (ev.kind === "log" && ev.line && ev.stream) onLog({ stream: ev.stream, line: ev.line });
        if (ev.kind === "error") return { ok: false, message: ev.message || "run failed" };
        if (ev.kind === "done") code = ev.code ?? null;
      } catch {
        /* skip */
      }
    }
  }
  return code === 0
    ? { ok: true, message: "Finished successfully" }
    : { ok: false, message: `Exited with code ${code}` };
}

export function useLocalToolRunner() {
  const [status, setStatus] = useState<LocalToolsStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState("");
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [result, setResult] = useState<string | null>(null);

  const refresh = useCallback(() => {
    fetch("/api/local-tools/status")
      .then((r) => r.json())
      .then((d: LocalToolsStatus) => setStatus(d))
      .catch(() => setStatus(null));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const start = useCallback(
    async (action: LocalToolAction, extra: Record<string, unknown> = {}, opts: { append?: boolean } = {}) => {
      setBusy(true);
      // append: a follow-up run (e.g. refreshing the company directory after a scan)
      // must not erase the output of the run the user actually asked for.
      setLogs(opts.append ? (prev) => [...prev, { stream: "stdout", line: `── ${action} ──` }] : []);
      setResult(null);
      setLabel(action);
      const out = await runLocalToolAction(
        { action, ...extra },
        (l) => setLogs((prev) => [...prev.slice(-400), l]),
        setLabel,
      );
      setResult(out.message);
      setBusy(false);
      refresh();
      return out;
    },
    [refresh],
  );

  return { status, busy, label, logs, result, refresh, start };
}

export function LocalToolLog({
  busy,
  label,
  result,
  logs,
}: {
  busy: boolean;
  label: string;
  result: string | null;
  logs: LogLine[];
}) {
  return (
    <section className="rounded-xl border border-border bg-background/60 p-4">
      <div className="flex items-center gap-2 text-xs text-muted">
        <Terminal className="size-3.5" />
        <span className="font-mono">{busy ? `Running: ${label}…` : label || "Ready"}</span>
        {result && <span className="ml-auto text-faint">{result}</span>}
      </div>
      <pre className="mt-3 max-h-72 overflow-auto font-mono text-[11px] leading-relaxed text-muted">
        {logs.length === 0 ? (
          <span className="text-faint">Output streams here. After a scan, open Pipeline — rows land automatically.</span>
        ) : (
          logs.map((l, i) => (
            <div key={i} className={l.stream === "stderr" ? "text-amber-600/90 dark:text-amber-400/90" : undefined}>
              {l.line}
            </div>
          ))
        )}
      </pre>
    </section>
  );
}

export function LocalToolsLoading() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted">
      <Loader2 className="size-4 animate-spin" /> Checking local tools…
    </div>
  );
}
