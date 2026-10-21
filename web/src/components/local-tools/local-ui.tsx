"use client";

import { useState, type ReactNode } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/** A copyable line. `prefix` is "$" for shell commands and "›" for chat prompts. */
export function CopyLine({
  text,
  prefix = "$",
  className,
}: {
  text: string;
  prefix?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard blocked (insecure context / permission) — nothing to do
    }
  }

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border border-border bg-background/70 py-1 pl-3 pr-1 font-mono text-xs text-muted",
        className,
      )}
    >
      <code className="min-w-0 flex-1 whitespace-pre-wrap break-words py-1.5">
        <span className="select-none text-faint">{prefix}</span> {text}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy to clipboard"}
        title={copied ? "Copied" : "Copy"}
        className="shrink-0 rounded-md p-1.5 text-faint transition hover:bg-surface hover:text-foreground"
      >
        {copied ? <CheckIcon className="size-3.5 text-brand" /> : <CopyIcon className="size-3.5" />}
      </button>
    </div>
  );
}

/** A titled card that can be deep-linked with #id. `n` shows a step badge. */
export function LocalSection({
  id,
  n,
  title,
  hint,
  children,
}: {
  id?: string;
  n?: string | number;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-xl border border-border bg-surface/40 p-5">
      <div className="flex flex-wrap items-center gap-2">
        {n !== undefined && (
          <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-brand/15 px-1.5 py-0.5 text-xs font-semibold text-brand">
            {n}
          </span>
        )}
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {hint && <span className="text-xs text-faint">{hint}</span>}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** Small pill: writes to pipeline vs review only, ready vs missing, etc. */
export function Pill({ tone = "muted", children }: { tone?: "brand" | "muted" | "warn"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        tone === "brand" && "border-brand/30 bg-brand/10 text-brand",
        tone === "muted" && "border-border text-muted",
        tone === "warn" && "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
      )}
    >
      {children}
    </span>
  );
}
