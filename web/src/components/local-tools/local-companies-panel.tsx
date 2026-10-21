"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Loader2, RefreshCw, Tags } from "lucide-react";
import {
  LocalToolLog,
  LocalToolsLoading,
  configuredCliId,
  useLocalToolRunner,
} from "@/components/local-tools/local-tool-runner";

type CompanyRow = {
  company_key: string;
  display_name: string;
  company_kind: string;
  sap_role: string;
  confidence: string;
  sources: string;
  first_seen: string;
  last_seen: string;
  sample_titles: string;
  notes: string;
};

type DirectoryPayload = {
  exists: boolean;
  total: number;
  byKind: Record<string, number>;
  bySap: Record<string, number>;
  companies: CompanyRow[];
};

/** Landscape: product · services · startup · mixed · unknown. Exclude literal "none". */
const KIND_ORDER = ["product", "services", "startup", "mixed", "unknown"];
const SAP_ORDER = ["sap_partner_si", "unknown"];

const SAP_LABEL: Record<string, string> = {
  sap_partner_si: "SAP partner / SI",
  unknown: "Not SAP partner",
};

type SegMode = "kind" | "sap";

export function LocalCompaniesPanel() {
  const { status, busy, label, logs, result, start } = useLocalToolRunner();
  const [data, setData] = useState<DirectoryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [seg, setSeg] = useState<SegMode>("kind");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [sapFilter, setSapFilter] = useState<string>("all");
  const [q, setQ] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/local-tools/companies")
      .then((r) => r.json())
      .then((d: DirectoryPayload) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const rows = data?.companies ?? [];
    const needle = q.trim().toLowerCase();
    const kindOk = new Set(KIND_ORDER);
    return rows.filter((r) => {
      // Drop literal "none" only — keep unknown.
      if (r.company_kind === "none" || r.sap_role === "none") return false;
      if (!kindOk.has(r.company_kind)) return false;
      if (kindFilter !== "all" && r.company_kind !== kindFilter) return false;
      if (sapFilter !== "all" && r.sap_role !== sapFilter) return false;
      if (!needle) return true;
      return (
        r.display_name.toLowerCase().includes(needle) ||
        r.sample_titles.toLowerCase().includes(needle) ||
        r.sources.toLowerCase().includes(needle)
      );
    });
  }, [data, kindFilter, sapFilter, q]);

  const groups = useMemo(() => {
    const map = new Map<string, CompanyRow[]>();
    const order = seg === "kind" ? KIND_ORDER : SAP_ORDER;
    const allowed = new Set(order);
    const keyOf = (r: CompanyRow) => (seg === "kind" ? r.company_kind : r.sap_role);
    for (const r of filtered) {
      const k = keyOf(r);
      if (!k || k === "none" || !allowed.has(k)) continue;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    return order.filter((k) => map.has(k)).map((k) => ({ key: k, rows: map.get(k)! }));
  }, [filtered, seg]);

  if (!status) return <LocalToolsLoading />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1">
          <Tags className="size-3 text-brand" />
          {data?.exists ? `${data.total} companies` : "no directory yet"}
        </span>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1 text-faint hover:text-muted"
          disabled={loading}
        >
          <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} /> reload
        </button>
        <Link href="/local" className="ml-auto text-faint hover:text-muted">
          ← Guide
        </Link>
      </div>

      <section className="rounded-xl border border-border bg-surface/40 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Building2 className="size-4 text-brand" />
          <h2 className="text-sm font-semibold text-foreground">Company directory</h2>
        </div>
        <p className="mt-1 text-xs text-muted">
          Segregated by company kind or SAP role. Refresh re-harvests from scans, then runs AI on
          unknowns using the CLI from Config / <code className="font-mono text-[11px]">CAREER_OPS_CLI</code>
          (not a hardcoded probe list), and caches results in the registry.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !status.harvestCompanies}
            onClick={async () => {
              const cli = configuredCliId();
              await start("harvest-companies", cli ? { cli } : {});
              load();
            }}
            className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground disabled:opacity-50"
          >
            {busy ? <Loader2 className="inline size-4 animate-spin" /> : null} Refresh directory
          </button>
          <button
            type="button"
            disabled={busy || !status.harvestCompanies}
            onClick={async () => {
              const cli = configuredCliId();
              await start("harvest-companies", { aiOnly: true, ...(cli ? { cli } : {}) });
              load();
            }}
            className="rounded-full border border-border px-4 py-2 text-sm text-muted hover:border-brand/40 disabled:opacity-50"
            title="Re-run AI classification on companies still marked unknown (uses your configured CLI)"
          >
            Classify unknowns with AI
          </button>
        </div>

        {data?.exists && (
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {KIND_ORDER.filter((k) => (data.byKind[k] ?? 0) > 0).map((k) => (
              <button
                key={`k-${k}`}
                type="button"
                onClick={() => {
                  setSeg("kind");
                  setKindFilter(k);
                  setSapFilter("all");
                }}
                className={
                  kindFilter === k && seg === "kind"
                    ? "rounded-full bg-brand px-2.5 py-1 text-brand-foreground"
                    : "rounded-full border border-border px-2.5 py-1 text-muted hover:border-brand/40"
                }
              >
                {k} · {data.byKind[k]}
              </button>
            ))}
            {SAP_ORDER.filter((k) => (data.bySap[k] ?? 0) > 0).map((k) => (
              <button
                key={`s-${k}`}
                type="button"
                onClick={() => {
                  setSeg("sap");
                  setSapFilter(k);
                  setKindFilter("all");
                }}
                className={
                  sapFilter === k && seg === "sap"
                    ? "rounded-full bg-brand px-2.5 py-1 text-brand-foreground"
                    : "rounded-full border border-border px-2.5 py-1 text-muted hover:border-brand/40"
                }
              >
                {SAP_LABEL[k] || k} · {data.bySap[k]}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-surface/40 p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-muted">
            Segregate by
            <select
              value={seg}
              onChange={(e) => setSeg(e.target.value as SegMode)}
              className="mt-1 block rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="kind">company_kind</option>
              <option value="sap">sap_role</option>
            </select>
          </label>
          <label className="text-xs text-muted">
            Kind
            <select
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value)}
              className="mt-1 block rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="all">all</option>
              {KIND_ORDER.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted">
            SAP role
            <select
              value={sapFilter}
              onChange={(e) => setSapFilter(e.target.value)}
              className="mt-1 block rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="all">all</option>
              {SAP_ORDER.map((k) => (
                <option key={k} value={k}>
                  {SAP_LABEL[k] || k}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-[160px] flex-1 text-xs text-muted">
            Search
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="name, title, source…"
              className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setKindFilter("all");
              setSapFilter("all");
              setQ("");
            }}
            className="rounded-full border border-border px-3 py-2 text-xs text-muted"
          >
            Clear filters
          </button>
        </div>

        {!data?.exists && !loading && (
          <p className="mt-4 text-sm text-muted">
            No <code>data/companies.tsv</code> yet. Click{" "}
            <span className="font-medium text-foreground">Refresh directory</span> after you have scan results.
          </p>
        )}

        {loading && (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </p>
        )}

        {!loading && data?.exists && (
          <div className="mt-5 space-y-6">
            <p className="text-xs text-faint">
              Showing {filtered.length} of {data.total}
            </p>
            {groups.map(({ key, rows }) => (
              <div key={key}>
                <h3 className="mb-2 text-sm font-semibold text-foreground">
                  {seg === "sap" ? SAP_LABEL[key] || key : key}{" "}
                  <span className="font-normal text-faint">({rows.length})</span>
                </h3>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="border-b border-border bg-background/60 text-xs text-muted">
                      <tr>
                        <th className="px-3 py-2 font-medium">Company</th>
                        <th className="px-3 py-2 font-medium">Kind</th>
                        <th className="px-3 py-2 font-medium">SAP</th>
                        <th className="px-3 py-2 font-medium">Conf</th>
                        <th className="px-3 py-2 font-medium">Sources</th>
                        <th className="px-3 py-2 font-medium">Sample titles</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.company_key} className="border-b border-border/60 last:border-0">
                          <td className="px-3 py-2 text-foreground">{r.display_name}</td>
                          <td className="px-3 py-2 text-muted">{r.company_kind}</td>
                          <td className="px-3 py-2 text-muted">{SAP_LABEL[r.sap_role] || r.sap_role}</td>
                          <td className="px-3 py-2 text-faint">{r.confidence}</td>
                          <td className="px-3 py-2 font-mono text-[11px] text-faint">{r.sources}</td>
                          <td className="max-w-[220px] truncate px-3 py-2 text-xs text-muted" title={r.sample_titles}>
                            {r.sample_titles.replace(/\|/g, " · ")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            {groups.length === 0 && <p className="text-sm text-muted">No companies match these filters.</p>}
          </div>
        )}
      </section>

      <LocalToolLog busy={busy} label={label} result={result} logs={logs} />
    </div>
  );
}
