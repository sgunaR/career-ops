"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { LOCAL_PATH } from "@/lib/local-workflow";

/** Previous / next along the linear path: Guide → Setup → Outside India → India → Run → Apply. */
export function LocalPager() {
  const pathname = usePathname();
  const i = LOCAL_PATH.findIndex((t) =>
    "exact" in t && t.exact ? pathname === t.href : pathname === t.href || pathname.startsWith(`${t.href}/`),
  );

  // Companies (optional side page) is off the path: offer a way back to the guide.
  if (i < 0) {
    return (
      <div className="mt-8 flex">
        <Link href="/local" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to the guide
        </Link>
      </div>
    );
  }

  const prev = i > 0 ? LOCAL_PATH[i - 1] : null;
  const next = i < LOCAL_PATH.length - 1 ? LOCAL_PATH[i + 1] : null;

  return (
    <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-4 text-sm">
      {prev ? (
        <Link href={prev.href} className="inline-flex items-center gap-1.5 text-muted hover:text-foreground">
          <ArrowLeft className="size-4" /> {prev.label}
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link
          href={next.href}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 font-medium text-brand-foreground"
        >
          Next: {next.label} <ArrowRight className="size-4" />
        </Link>
      )}
    </div>
  );
}
