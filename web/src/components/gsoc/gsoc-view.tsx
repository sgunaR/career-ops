"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Loader2, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type Category = { id: string; label: string; count: number };
type Facet = { id: string; label: string; count: number };
type YearRow = {
  year: number;
  orgCount: number;
  projectCount: number;
  returning: number;
  newcomers: number;
};

type Org = {
  name: string;
  url: string;
  description: string;
  category: string;
  topics: string[];
  technologies: string[];
  years: number[];
  yearCount: number;
  totalProjects: number;
  projectsLatest: number;
  latestYear: number;
  forecastScore: number;
  likelihood: "high" | "medium" | "low";
  forecastReasons: string[];
  streak: number;
  edgeScore: number;
  isEdge: boolean;
  edgeReasons: string[];
};

type Result = {
  ok?: boolean;
  error?: string;
  fetchedAt?: string;
  fromCache?: boolean;
  forecastYear?: number;
  latestYear?: number;
  years?: number[];
  edgeMode?: boolean;
  categories?: Category[];
  facets?: Facet[];
  yearSeries?: YearRow[];
  summary?: {
    totalOrgs: number;
    matched: number;
    shown: number;
    edgeCount?: number;
    orgsInLatest: number;
    projectsInLatest: number;
    likelihoodCounts: { high: number; medium: number; low: number };
  };
  disclaimer?: string;
  edgeDisclaimer?: string;
  organizations?: Org[];
};

type Filters = {
  query?: string;
  category?: string;
  facet?: string;
  year?: number;
  likelihood?: string;
  edge?: boolean;
};

const LIKELIHOOD_OPTIONS = [
  { id: "", label: "Any likelihood" },
  { id: "high", label: "High" },
  { id: "medium", label: "Medium" },
  { id: "low", label: "Low" },
] as const;

const fieldClass =
  "mt-1 block rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-brand/50";

function likelihoodClass(level: Org["likelihood"]) {
  if (level === "high") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (level === "medium") return "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200";
  return "border-border bg-muted/20 text-muted";
}

function BarChart({
  title,
  subtitle,
  rows,
  valueKey,
}: {
  title: string;
  subtitle?: string;
  rows: YearRow[];
  valueKey: "orgCount" | "projectCount" | "returning" | "newcomers";
}) {
  const max = Math.max(1, ...rows.map((r) => r[valueKey]));
  return (
    <section className="rounded-xl border border-border bg-surface/40 p-4">
      <h2 className="font-display text-base text-landing">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      <div className="mt-4 space-y-2">
        {rows.map((row) => {
          const value = row[valueKey];
          const pct = Math.round((value / max) * 100);
          return (
            <div key={`${valueKey}-${row.year}`} className="grid grid-cols-[3rem_1fr_2.5rem] items-center gap-2 text-sm">
              <span className="tabular-nums text-muted">{row.year}</span>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted/30">
                <div
                  className="h-full rounded-full bg-brand/80 transition-[width] duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-right tabular-nums text-foreground">{value}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function GsocView() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [facet, setFacet] = useState("");
  const [year, setYear] = useState(0);
  const [likelihood, setLikelihood] = useState("");
  const [edge, setEdge] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);

  async function load(next?: Filters & { refresh?: boolean }) {
    const body = {
      query: next?.query ?? query,
      category: next?.category ?? category,
      facet: next?.facet ?? facet,
      year: next?.year ?? year,
      likelihood: next?.likelihood ?? likelihood,
      edge: next?.edge ?? edge,
      refresh: next?.refresh ?? false,
    };
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (body.query) params.set("q", body.query);
    if (body.category) params.set("category", body.category);
    if (body.facet) params.set("facet", body.facet);
    if (body.year) params.set("year", String(body.year));
    if (body.likelihood) params.set("likelihood", body.likelihood);
    if (body.edge) params.set("edge", "1");
    if (body.refresh) params.set("refresh", "1");
    try {
      const res = await fetch(`/api/gsoc?${params}`, { signal: controller.signal });
      const data = (await res.json()) as Result;
      if (request.current !== controller) return;
      if (!res.ok || data.ok === false) {
        setResult(null);
        setError(data.error || "Could not load GSoC organizations.");
      } else {
        setResult(data);
      }
    } catch {
      if (request.current !== controller) return;
      setResult(null);
      setError("The dashboard could not reach the GSoC explorer.");
    } finally {
      if (request.current === controller) setLoading(false);
    }
  }

  useEffect(() => {
    setMounted(true);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const orgs = result?.organizations || [];
  const series = result?.yearSeries || [];
  const categories = result?.categories || [];
  const facets = result?.facets || [];
  const years = result?.years || [];
  const busy = mounted && loading;
  const forecastYear = result?.forecastYear || 2027;
  const counts = result?.summary?.likelihoodCounts;

  const topHigh = useMemo(
    () => orgs.filter((o) => o.likelihood === "high").slice(0, 12),
    [orgs],
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl tracking-tight text-landing">GSoC organizations</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted">
            Past Google Summer of Code mentoring organizations (2016–{result?.latestYear || 2026}), filterable by
            official category and topic facets. Use this to pick an org to contribute to before {forecastYear}
            applications open. Data from the community GSoC Organizations API.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={busy ? true : undefined}
          onClick={() => void load({ refresh: true })}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Refresh data
        </Button>
      </div>

      <form
        className="mt-6 space-y-4 rounded-xl border border-border bg-surface/40 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          void load();
        }}
      >
        <label className="block text-xs text-muted">
          Search name, topics, or technologies
          <div className="mt-1 flex gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="rust, security, kubernetes…"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
            />
            <Button type="submit" disabled={busy ? true : undefined}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              Filter
            </Button>
          </div>
        </label>

        <div className="flex flex-wrap items-end gap-4">
          <label className="text-xs text-muted">
            Year participated
            <select
              value={year || ""}
              onChange={(event) => {
                const next = Number(event.target.value) || 0;
                setYear(next);
                void load({ year: next });
              }}
              className={`${fieldClass} w-36`}
            >
              <option value="">All years</option>
              {[...years].reverse().map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted">
            {forecastYear} likelihood
            <select
              value={likelihood}
              onChange={(event) => {
                const next = event.target.value;
                setLikelihood(next);
                void load({ likelihood: next });
              }}
              className={`${fieldClass} w-40`}
            >
              {LIKELIHOOD_OPTIONS.map((opt) => (
                <option key={opt.id || "any"} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <div className="text-xs text-muted">
            First-timer strategy
            <button
              type="button"
              aria-pressed={edge}
              onClick={() => {
                const next = !edge;
                setEdge(next);
                void load({ edge: next });
              }}
              className={cn(
                "mt-1 block rounded-md border px-3 py-1.5 text-sm",
                edge ? "border-brand bg-brand-soft text-brand-text" : "border-border text-muted hover:text-foreground",
              )}
            >
              First-timer edge{typeof result?.summary?.edgeCount === "number" ? ` (${result.summary.edgeCount})` : ""}
            </button>
          </div>
        </div>
        {edge && (
          <p className="text-xs text-muted">
            {result?.edgeDisclaimer ||
              "Likely to return + less crowded (few slots, fewer years, not a household name). Still send a real PR early."}
          </p>
        )}

        <fieldset>
          <legend className="text-xs text-muted">Official category</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setCategory("");
                void load({ category: "" });
              }}
              className={cn(
                "rounded-full border px-3 py-1 text-sm",
                !category ? "border-brand bg-brand-soft text-brand-text" : "border-border text-muted hover:text-foreground",
              )}
            >
              All
            </button>
            {categories.map((item) => {
              const on = category === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setCategory(item.id);
                    void load({ category: item.id });
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm",
                    on ? "border-brand bg-brand-soft text-brand-text" : "border-border text-muted hover:text-foreground",
                  )}
                >
                  {item.label}
                  <span className="ml-1 tabular-nums text-faint">{item.count}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-xs text-muted">Topic facet</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setFacet("");
                void load({ facet: "" });
              }}
              className={cn(
                "rounded-full border px-3 py-1 text-sm",
                !facet ? "border-brand bg-brand-soft text-brand-text" : "border-border text-muted hover:text-foreground",
              )}
            >
              Any topic
            </button>
            {facets.map((item) => {
              const on = facet === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setFacet(item.id);
                    void load({ facet: item.id });
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm",
                    on ? "border-brand bg-brand-soft text-brand-text" : "border-border text-muted hover:text-foreground",
                  )}
                >
                  {item.label}
                  <span className="ml-1 tabular-nums text-faint">{item.count}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      </form>

      {error && <p className="mt-4 text-sm text-brand-text">{error}</p>}

      {result?.summary && (
        <p className="mt-6 text-sm text-muted">
          {busy
            ? "Loading organizations…"
            : `${result.summary.matched} matched · ${result.summary.shown} shown · ${result.summary.orgsInLatest} orgs in ${result.latestYear}${
                result.fromCache ? " · cached" : ""
              }`}
          {counts && (
            <span className="text-faint">
              {" "}
              · {forecastYear} heuristic: {counts.high} high / {counts.medium} medium / {counts.low} low
            </span>
          )}
          {typeof result.summary.edgeCount === "number" && !edge && (
            <span className="text-faint"> · {result.summary.edgeCount} first-timer edge</span>
          )}
        </p>
      )}

      {series.length > 0 && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <BarChart
            title="Organizations per year"
            subtitle="How many mentoring orgs joined each program year"
            rows={series}
            valueKey="orgCount"
          />
          <BarChart
            title="Projects per year"
            subtitle="Accepted student projects across all orgs"
            rows={series}
            valueKey="projectCount"
          />
          <BarChart
            title="Returning orgs"
            subtitle="Participated in the previous year too"
            rows={series}
            valueKey="returning"
          />
          <BarChart
            title="Newcomer orgs"
            subtitle="First year (or return after a gap)"
            rows={series}
            valueKey="newcomers"
          />
        </div>
      )}

      <section className="mt-10">
        <h2 className="font-display text-lg text-landing">{forecastYear} enrollment forecast</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          {result?.disclaimer ||
            `Heuristic from streak, recent years, and project trend — not an official ${forecastYear} list.`}
        </p>
        {topHigh.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topHigh.map((org) => (
              <article key={org.name} className="rounded-xl border border-border bg-surface/40 p-4">
                <div className="flex items-start justify-between gap-2">
                  <a
                    href={org.url || undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-foreground hover:text-brand-text"
                  >
                    {org.name}
                    {org.url && <ExternalLink className="size-3 shrink-0" />}
                  </a>
                  <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-xs capitalize", likelihoodClass(org.likelihood))}>
                    {org.likelihood} · {org.forecastScore}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">{org.category}</p>
                <p className="mt-2 text-xs text-faint">{org.forecastReasons.join(" · ")}</p>
              </article>
            ))}
          </div>
        ) : (
          !busy && (
            <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted">
              No high-likelihood orgs match the current filters. Clear filters or pick Medium.
            </p>
          )
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg text-landing">Organizations</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-border bg-surface/60 text-xs text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Organization</th>
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 text-right font-medium">Years</th>
                <th className="px-3 py-2 font-medium">Participated</th>
                <th className="px-3 py-2 text-right font-medium">Projects</th>
                <th className="px-3 py-2 font-medium">{forecastYear}</th>
                <th className="px-3 py-2 text-right font-medium">Edge</th>
                <th className="px-3 py-2 font-medium">Tech</th>
              </tr>
            </thead>
            <tbody>
              {!busy && result && orgs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-muted">
                    No organizations matched these filters.
                  </td>
                </tr>
              )}
              {orgs.map((org) => (
                <tr key={org.name} className="border-b border-border last:border-0 align-top">
                  <td className="px-3 py-3">
                    <a
                      href={org.url || undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-foreground hover:text-brand-text"
                    >
                      {org.name}
                      {org.url && <ExternalLink className="size-3" />}
                    </a>
                    {org.description && <p className="mt-1 max-w-sm text-xs text-muted">{org.description}</p>}
                  </td>
                  <td className="px-3 py-3 text-muted">{org.category}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{org.yearCount}</td>
                  <td className="px-3 py-3 max-w-[12rem] text-xs text-muted">{org.years.join(", ")}</td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {org.totalProjects}
                    {org.projectsLatest > 0 && (
                      <span className="block text-xs text-faint">{org.projectsLatest} in {result?.latestYear}</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className={cn("inline-block rounded-full border px-2 py-0.5 text-xs capitalize", likelihoodClass(org.likelihood))}>
                      {org.likelihood} · {org.forecastScore}
                    </span>
                    <p className="mt-1 max-w-[14rem] text-xs text-faint">{org.forecastReasons.slice(0, 3).join(" · ")}</p>
                  </td>
                  <td className="px-3 py-3 text-right">
                    {org.isEdge ? (
                      <>
                        <span className="tabular-nums font-medium text-brand-text">{org.edgeScore}</span>
                        <p className="mt-1 max-w-[12rem] text-left text-xs text-faint">{(org.edgeReasons || []).slice(0, 2).join(" · ")}</p>
                      </>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 max-w-[14rem] text-xs text-muted">
                    {(org.technologies.length ? org.technologies : org.topics).slice(0, 6).join(", ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
