"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const DAY_OPTIONS = [30, 90, 180] as const;

type Category = { id: string; label: string };

type Repo = {
  rank: number;
  score: number;
  name: string;
  url: string;
  description: string;
  language: string;
  stars: number;
  issues: number;
  pushed: string;
  why: string;
};

type Result = {
  ok?: boolean;
  error?: string;
  since?: string;
  label?: string;
  githubQuery?: string;
  categories?: Category[];
  repos?: Repo[];
};

type Filters = {
  query?: string;
  category?: string;
  days?: number;
  minStars?: string;
  maxStars?: string;
  minForks?: string;
  language?: string;
  license?: string;
  owner?: string;
};

const LANGUAGES = ["Python", "TypeScript", "JavaScript", "Go", "Rust", "Java", "Ruby", "C", "C++", "C#", "PHP", "Kotlin", "Swift", "Shell"];
const LICENSES = [
  { id: "mit", label: "MIT" },
  { id: "apache-2.0", label: "Apache 2.0" },
  { id: "gpl-3.0", label: "GPL 3.0" },
  { id: "bsd-3-clause", label: "BSD 3-Clause" },
  { id: "mpl-2.0", label: "MPL 2.0" },
  { id: "agpl-3.0", label: "AGPL 3.0" },
  { id: "unlicense", label: "Unlicense" },
];

const fieldClass = "mt-1 block rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-brand/50";

const FALLBACK_CATEGORIES: Category[] = [
  { id: "security", label: "Security" },
  { id: "webdev", label: "Web development" },
  { id: "web3", label: "Web3" },
  { id: "frontend", label: "Frontend" },
  { id: "backend", label: "Backend" },
  { id: "agents", label: "AI agents" },
  { id: "ml", label: "Machine learning" },
  { id: "devtools", label: "Developer tools" },
  { id: "devops", label: "DevOps" },
  { id: "databases", label: "Databases" },
  { id: "api", label: "APIs" },
  { id: "cli", label: "CLI" },
  { id: "testing", label: "Testing" },
  { id: "observability", label: "Observability" },
  { id: "cloud", label: "Cloud" },
  { id: "privacy", label: "Privacy" },
  { id: "auth", label: "Authentication" },
  { id: "mobile", label: "Mobile" },
  { id: "data", label: "Data engineering" },
  { id: "design", label: "Design systems" },
  { id: "docs", label: "Documentation" },
  { id: "networking", label: "Networking" },
  { id: "compilers", label: "Compilers" },
  { id: "games", label: "Game development" },
  { id: "fintech", label: "Fintech" },
  { id: "productivity", label: "Productivity" },
  { id: "python", label: "Python" },
  { id: "typescript", label: "TypeScript" },
  { id: "fastapi", label: "FastAPI" },
  { id: "nextjs", label: "Next.js" },
  { id: "react", label: "React" },
  { id: "rust", label: "Rust" },
  { id: "go", label: "Go" },
  { id: "kubernetes", label: "Kubernetes" },
  { id: "containers", label: "Containers" },
  { id: "blockchain", label: "Blockchain" },
  { id: "cryptography", label: "Cryptography" },
  { id: "opensource", label: "YC-tagged" },
];

export function OpenSourceView() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("webdev");
  const [categories, setCategories] = useState<Category[]>(FALLBACK_CATEGORIES);
  const [days, setDays] = useState<(typeof DAY_OPTIONS)[number]>(90);
  const [minStars, setMinStars] = useState("20");
  const [maxStars, setMaxStars] = useState("8000");
  const [minForks, setMinForks] = useState("");
  const [language, setLanguage] = useState("");
  const [license, setLicense] = useState("");
  const [owner, setOwner] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);

  async function search(next?: Filters) {
    const body = {
      query: next?.query ?? query,
      category: next?.category ?? category,
      days: next?.days ?? days,
      minStars: next?.minStars ?? minStars,
      maxStars: next?.maxStars ?? maxStars,
      minForks: next?.minForks ?? minForks,
      language: next?.language ?? language,
      license: next?.license ?? license,
      owner: next?.owner ?? owner,
    };
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      q: body.query,
      category: body.category,
      days: String(body.days),
      minStars: body.minStars || "0",
      maxStars: body.maxStars || "50000",
      minForks: body.minForks || "0",
      language: body.language,
      license: body.license,
      owner: body.owner,
    });
    try {
      const res = await fetch(`/api/open-source?${params}`, { signal: controller.signal });
      const data = (await res.json()) as Result;
      if (request.current !== controller) return;
      if (data.categories?.length) setCategories(data.categories);
      if (!res.ok || data.ok === false) {
        setResult(null);
        setError(data.error || "Search failed.");
      } else {
        setResult(data);
      }
    } catch {
      if (request.current !== controller) return;
      setResult(null);
      setError("The dashboard could not reach the search.");
    } finally {
      if (request.current === controller) setLoading(false);
    }
  }

  useEffect(() => {
    setMounted(true);
    void search();
    // First visit loads the default category. Later searches are explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pickCategory(id: string) {
    setCategory(id);
    void search({ category: id });
  }

  const repos = result?.repos || [];
  const label = categories.find((item) => item.id === category)?.label || result?.label || "This category";
  const busy = mounted && loading;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="font-display text-2xl tracking-tight text-landing">Open source</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted">
        The filters are the repository fields from GitHub advanced search: topic, language, owner, stars, forks, last push, and license.
        GitHub returns up to 100 matches. We then drop tutorials and rank what is left for a first contribution: a recent push, open issues you can take, and a project that is known but still approachable.
        Run a repo and read one issue before you comment.
      </p>

      <form
        className="mt-6 space-y-4 rounded-xl border border-border bg-surface/40 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          void search();
        }}
      >
        <label className="block text-xs text-muted">
          Keywords
          <div className="mt-1 flex gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="postgres, mcp, rust"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
            />
            <Button type="submit" disabled={busy ? true : undefined}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              Search
            </Button>
          </div>
        </label>

        <fieldset>
          <legend className="text-xs text-muted">Topic</legend>
          <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Category">
            {categories.map((item) => {
              const on = category === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => pickCategory(item.id)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm",
                    on ? "border-brand bg-brand-soft text-brand-text" : "border-border text-muted hover:text-foreground",
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="flex flex-wrap items-end gap-4">
          <fieldset>
            <legend className="text-xs text-muted">Pushed within</legend>
            <div className="mt-2 flex gap-2">
              {DAY_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={days === option}
                  onClick={() => setDays(option)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm",
                    days === option ? "border-brand bg-brand-soft text-brand-text" : "border-border text-muted",
                  )}
                >
                  {option} days
                </button>
              ))}
            </div>
          </fieldset>
          <label className="text-xs text-muted">
            Stars at least
            <input type="number" min={0} max={50000} value={minStars} onChange={(event) => setMinStars(event.target.value)} className={`${fieldClass} w-28`} />
          </label>
          <label className="text-xs text-muted">
            Stars at most
            <input type="number" min={0} max={50000} value={maxStars} onChange={(event) => setMaxStars(event.target.value)} className={`${fieldClass} w-28`} />
          </label>
          <label className="text-xs text-muted">
            Forks at least
            <input type="number" min={0} max={100000} value={minForks} onChange={(event) => setMinForks(event.target.value)} placeholder="any" className={`${fieldClass} w-28`} />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs text-muted">
            Written in this language
            <select value={language} onChange={(event) => setLanguage(event.target.value)} className={`${fieldClass} w-full`}>
              <option value="">Any language</option>
              {LANGUAGES.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted">
            With this license
            <select value={license} onChange={(event) => setLicense(event.target.value)} className={`${fieldClass} w-full`}>
              <option value="">Any license</option>
              {LICENSES.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted">
            From this owner
            <input value={owner} onChange={(event) => setOwner(event.target.value)} placeholder="vercel" className={`${fieldClass} w-full`} />
          </label>
        </div>
      </form>

      {error && <p className="mt-4 text-sm text-brand-text">{error}</p>}

      <p className="mt-6 text-sm text-muted">
        {busy ? `Searching ${label}…` : result ? `${repos.length} ranked in ${result.label || label}${result.since ? `, pushed since ${result.since}` : ""}.` : "Results show up here after the search."}
      </p>
      {result?.githubQuery && (
        <p className="mt-1 break-all font-mono text-xs text-faint">{result.githubQuery}</p>
      )}

      <div className="mt-3 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-border bg-surface/60 text-xs text-muted">
            <tr>
              <th className="px-3 py-2 text-right font-medium">Rank</th>
              <th className="px-3 py-2 text-right font-medium">Score</th>
              <th className="px-3 py-2 font-medium">Repo</th>
              <th className="px-3 py-2 font-medium">Why</th>
              <th className="px-3 py-2 font-medium">Language</th>
              <th className="px-3 py-2 font-medium">Pushed</th>
              <th className="px-3 py-2 text-right font-medium">Issues</th>
              <th className="px-3 py-2 text-right font-medium">Stars</th>
            </tr>
          </thead>
          <tbody>
            {!busy && result && repos.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-muted">
                  No repositories matched these filters.
                </td>
              </tr>
            )}
            {repos.map((repo) => (
              <tr key={repo.name} className="border-b border-border last:border-0 align-top">
                <td className="px-3 py-3 text-right tabular-nums text-muted">{repo.rank}</td>
                <td className="px-3 py-3 text-right tabular-nums font-medium">{repo.score}</td>
                <td className="px-3 py-3">
                  <a href={repo.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-foreground hover:text-brand-text">
                    {repo.name}
                    <ExternalLink className="size-3" />
                  </a>
                  {repo.description && <p className="mt-1 max-w-sm text-xs text-muted">{repo.description}</p>}
                </td>
                <td className="px-3 py-3 max-w-[16rem] text-xs text-muted">{repo.why}</td>
                <td className="px-3 py-3 text-muted">{repo.language || "—"}</td>
                <td className="px-3 py-3 text-muted">{repo.pushed}</td>
                <td className="px-3 py-3 text-right tabular-nums">{repo.issues}</td>
                <td className="px-3 py-3 text-right tabular-nums">{repo.stars.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
