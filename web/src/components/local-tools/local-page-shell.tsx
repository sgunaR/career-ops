import type { ReactNode } from "react";
import { MapPinned } from "lucide-react";
import { LocalSubnav } from "@/components/local-tools/local-subnav";
import { LocalPager } from "@/components/local-tools/local-pager";

export function LocalPageShell({
  title,
  description,
  eyebrow,
  children,
}: {
  title: string;
  description: string;
  /** e.g. "Step 1 of 13" — shown above the title. */
  eyebrow?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-6 pb-24 pt-8">
      {eyebrow && <p className="mb-1 text-xs font-medium uppercase tracking-wide text-brand">{eyebrow}</p>}
      <div className="flex items-center gap-3">
        <MapPinned className="size-6 text-brand" />
        <h1 className="font-display text-2xl tracking-tight text-landing">{title}</h1>
      </div>
      <p className="mt-1.5 max-w-xl text-sm text-muted">{description}</p>
      <div className="mt-5">
        <LocalSubnav />
      </div>
      {children}
      <LocalPager />
    </div>
  );
}
