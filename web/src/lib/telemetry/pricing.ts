import fs from "node:fs";
import path from "node:path";
import { careerOpsRoot } from "@/lib/career-ops";

// Anthropic first-party API list prices, USD per million tokens.
// Source: Anthropic model table as of PRICING_AS_OF. Cache writes are derived
// from the input price (1.25x for the 5-minute TTL, 2x for the 1-hour TTL);
// cache reads are listed per model because they are not a uniform multiple
// (0.1x on most models, $0.20 flat on Opus 5.5, $0.25 on Fable/Mythos 5.1).
//
// Models Claude Code may log that are NOT listed here (older 4.x ids) are
// reported as "unpriced" rather than guessed — add them, or correct any rate,
// in config/model-pricing.json (see loadPricing below).
export const PRICING_AS_OF = "2026-09-25";

export const WEB_SEARCH_USD_PER_REQUEST = 0.01; // $10 per 1,000 searches

// GitHub Copilot bills premium requests, not tokens: requests beyond the plan's
// allowance are "$0.04/request" (docs.github.com, Copilot requests billing page,
// checked 2026-09-29). Requests inside the allowance are covered by the plan, so
// this is an overage-equivalent figure, like the API-equivalent token prices.
export const COPILOT_PREMIUM_REQUEST_USD = 0.04;

export type ModelPrice = { input: number; output: number; cacheRead: number };

const DEFAULT_PRICES: Record<string, ModelPrice> = {
  "claude-fable-5-1": { input: 10, output: 50, cacheRead: 0.25 },
  "claude-mythos-5-1": { input: 10, output: 50, cacheRead: 0.25 },
  "claude-fable-5": { input: 10, output: 50, cacheRead: 1 },
  "claude-mythos-5": { input: 10, output: 50, cacheRead: 1 },
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2 },
  "claude-opus-5": { input: 5, output: 25, cacheRead: 0.5 },
  "claude-opus-4-8": { input: 5, output: 25, cacheRead: 0.5 },
  "claude-opus-4-7": { input: 5, output: 25, cacheRead: 0.5 },
  "claude-opus-4-6": { input: 5, output: 25, cacheRead: 0.5 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2 },
  "claude-sonnet-5": { input: 2, output: 10, cacheRead: 0.2 },
  "claude-sonnet-4-6": { input: 3, output: 15, cacheRead: 0.3 },
  "claude-haiku-4-5": { input: 1, output: 5, cacheRead: 0.1 },
};

// Current models offered in the "what if these tokens ran on…" comparison.
export const WHAT_IF_MODELS = [
  "claude-fable-5-1",
  "claude-opus-5-5",
  "claude-sonnet-5-5",
  "claude-haiku-4-5",
] as const;

/**
 * One id per model across tools: strip a trailing date snapshot and dotted
 * versions (`claude-haiku-4-5-20251001`, Copilot's `claude-haiku-4.5` → `claude-haiku-4-5`).
 */
export function normalizeModel(model: string): string {
  return model
    .trim()
    .toLowerCase()
    .replace(/-\d{8}$/, "")
    .replace(/(\d)\.(\d)/g, "$1-$2");
}

export function pricingOverridesPath(): string {
  return path.join(careerOpsRoot(), "config", "model-pricing.json");
}

export type PricingTable = {
  asOf: string;
  prices: Record<string, ModelPrice>;
  overridesPath: string;
  overridesApplied: string[];
  overridesError: string | null;
};

function isPrice(v: unknown): v is ModelPrice {
  if (!v || typeof v !== "object") return false;
  const p = v as Record<string, unknown>;
  return ["input", "output", "cacheRead"].every((k) => typeof p[k] === "number" && (p[k] as number) >= 0);
}

/**
 * Defaults merged with the optional user override file
 * `config/model-pricing.json`: `{ "claude-opus-4-5": { "input": 5, "output": 25, "cacheRead": 0.5 } }`.
 * A malformed file is reported, never fatal.
 */
export function loadPricing(): PricingTable {
  const overridesPath = pricingOverridesPath();
  const prices: Record<string, ModelPrice> = { ...DEFAULT_PRICES };
  const overridesApplied: string[] = [];
  let overridesError: string | null = null;
  if (fs.existsSync(overridesPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(overridesPath, "utf8")) as Record<string, unknown>;
      for (const [model, price] of Object.entries(raw)) {
        if (isPrice(price)) {
          prices[normalizeModel(model)] = price;
          overridesApplied.push(normalizeModel(model));
        }
      }
    } catch (err) {
      overridesError = err instanceof Error ? err.message : "unreadable";
    }
  }
  return { asOf: PRICING_AS_OF, prices, overridesPath, overridesApplied, overridesError };
}

export type TokenCounts = {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite5m: number;
  cacheWrite1h: number;
  webSearch: number;
};

export type CostBreakdown = {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  webSearch: number;
  total: number;
};

/** USD for one bundle of tokens on one model; null when the model is unpriced. */
export function costOf(t: TokenCounts, price: ModelPrice | undefined): CostBreakdown | null {
  if (!price) return null;
  const m = 1_000_000;
  const input = (t.input * price.input) / m;
  const output = (t.output * price.output) / m;
  const cacheRead = (t.cacheRead * price.cacheRead) / m;
  const cacheWrite = (t.cacheWrite5m * price.input * 1.25 + t.cacheWrite1h * price.input * 2) / m;
  const webSearch = t.webSearch * WEB_SEARCH_USD_PER_REQUEST;
  return { input, output, cacheRead, cacheWrite, webSearch, total: input + output + cacheRead + cacheWrite + webSearch };
}
