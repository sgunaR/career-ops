"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOCAL_TABS } from "@/lib/local-workflow";
import { cn } from "@/lib/cn";

export function LocalSubnav() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex flex-wrap gap-2" aria-label="Job-search steps">
      {LOCAL_TABS.map((tab) => {
        const { href, label, steps } = tab;
        const active = "exact" in tab && tab.exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition",
              active
                ? "bg-brand font-medium text-brand-foreground"
                : "border border-border text-muted hover:border-brand/40 hover:text-foreground",
            )}
          >
            {steps && (
              <span className={cn("text-[11px] font-semibold tabular-nums", active ? "opacity-80" : "text-faint")}>
                {steps}
              </span>
            )}
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
