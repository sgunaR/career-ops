import fs from "node:fs";
import path from "node:path";
import { careerOpsRoot } from "@/lib/career-ops";
import {
  INDIA_BOARDS,
  type LocalToolAction,
  type LocalToolsStatus,
} from "@/lib/local-tools-shared";

export type { LocalToolAction, LocalToolsStatus } from "@/lib/local-tools-shared";
export { INDIA_BOARDS } from "@/lib/local-tools-shared";

/**
 * Pull-safe bridge to machine-local scripts under gitignored `local/`.
 * Upstream Explore stays reverse-ATS-only; this surfaces India-scan + wrappers
 * without patching scan.mjs. Prefer NEW files here so git pull rarely conflicts.
 */

function exists(rel: string): boolean {
  try {
    return fs.existsSync(path.join(careerOpsRoot(), rel));
  } catch {
    return false;
  }
}

export function getLocalToolsStatus(): LocalToolsStatus {
  const indiaScan = exists("local/india-scan/run.mjs");
  return {
    available:
      indiaScan ||
      exists("local/scan-companies.mjs") ||
      exists("local/scan-career.mjs") ||
      exists("scan-ats-full.mjs") ||
      exists("local/harvest-companies.mjs") ||
      exists("templates/india-scan/bootstrap.mjs"),
    root: careerOpsRoot(),
    indiaScan,
    indiaConfig: exists("local/india-scan/config.yml"),
    scanCompanies: exists("local/scan-companies.mjs"),
    scanCareer: exists("local/scan-career.mjs"),
    scanAtsFull: exists("scan-ats-full.mjs"),
    companyFunded: exists("company-funded.mjs"),
    harvestCompanies: exists("local/harvest-companies.mjs"),
    resetInbox: exists("local/reset-scan-inbox.mjs"),
    resetEvaluations: exists("local/reset-evaluations.mjs"),
    cleanLiveness: exists("local/clean-liveness-temps.mjs"),
    bootstrap: exists("templates/india-scan/bootstrap.mjs"),
    boards: INDIA_BOARDS,
  };
}

export type RunRequest = {
  action: LocalToolAction;
  board?: string;
  boards?: string[];
  companies?: string[];
  maxPages?: number;
  dryRun?: boolean;
  /** harvest-companies: skip sightings, only AI-classify existing unknowns */
  aiOnly?: boolean;
  /** harvest-companies: Config-page / CAREER_OPS_CLI id (claude, cursor, opencode, …) */
  cli?: string;
  /** Required for destructive resets */
  confirm?: boolean;
  pipelineOnly?: boolean;
};

function assertBoard(name: string): string {
  const b = name.trim().toLowerCase();
  if (!(INDIA_BOARDS as readonly string[]).includes(b)) {
    throw new Error(`Unknown India board: ${name}`);
  }
  return b;
}

function sanitizeCompany(name: string): string {
  const s = name.trim();
  if (!s || s.length > 80 || /[\r\n\0]/.test(s) || s.startsWith("-")) {
    throw new Error(`Invalid company name: ${JSON.stringify(name)}`);
  }
  return s;
}

/**
 * Build an allowlisted `node <script> …` argv (script path absolute).
 * Never accepts free-form shell input.
 */
export function buildLocalToolCommand(req: RunRequest): { script: string; args: string[]; label: string } {
  const root = careerOpsRoot();
  const status = getLocalToolsStatus();
  const maxPages =
    typeof req.maxPages === "number" && Number.isInteger(req.maxPages) && req.maxPages >= 1 && req.maxPages <= 20
      ? req.maxPages
      : 1;

  switch (req.action) {
    case "bootstrap-india": {
      if (!status.bootstrap) throw new Error("templates/india-scan/bootstrap.mjs not found");
      return {
        script: path.join(root, "templates/india-scan/bootstrap.mjs"),
        args: [],
        label: "Bootstrap india-scan → local/",
      };
    }
    case "india-health": {
      if (!status.indiaScan) throw new Error("local/india-scan not installed — run Bootstrap first");
      const script = path.join(root, "local/india-scan/run.mjs");
      const args = ["--health"];
      if (req.board) args.push("--board", assertBoard(req.board));
      return { script, args, label: "India scan health" };
    }
    case "india-login": {
      if (!status.indiaScan) throw new Error("local/india-scan not installed — run Bootstrap first");
      if (!req.board) throw new Error("india-login requires board");
      return {
        script: path.join(root, "local/india-scan/run.mjs"),
        args: ["--login", assertBoard(req.board)],
        label: `India login: ${req.board}`,
      };
    }
    case "india-scan": {
      if (!status.indiaScan) throw new Error("local/india-scan not installed — run Bootstrap first");
      const script = path.join(root, "local/india-scan/run.mjs");
      const args: string[] = ["--max-pages", String(maxPages)];
      if (req.dryRun) args.push("--dry-run");
      const list = (req.boards?.length ? req.boards : req.board ? [req.board] : []).map(assertBoard);
      if (list.length === 1) args.push("--board", list[0]);
      else if (list.length > 1) args.push("--boards", list.join(","));
      else args.push("--board", "naukri");
      return {
        script,
        args,
        label: `India scan: ${list.length ? list.join(",") : "naukri"}`,
      };
    }
    case "scan-all": {
      const script = path.join(root, "scan.mjs");
      if (!fs.existsSync(script)) throw new Error("scan.mjs missing");
      const args = req.dryRun ? ["--dry-run"] : [];
      return { script, args, label: "npm-equivalent scan (all portals.yml)" };
    }
    case "scan-companies": {
      if (!status.scanCompanies) throw new Error("local/scan-companies.mjs missing");
      const companies = (req.companies ?? []).map(sanitizeCompany);
      if (!companies.length) throw new Error("scan-companies needs at least one company");
      const args = [companies.join(",")];
      if (req.dryRun) args.push("--dry-run");
      return {
        script: path.join(root, "local/scan-companies.mjs"),
        args,
        label: `Scan companies: ${companies.join(", ")}`,
      };
    }
    case "scan-career": {
      if (!status.scanCareer) throw new Error("local/scan-career.mjs missing");
      const company = sanitizeCompany((req.companies?.[0] || req.board || "SAP").toString());
      const args = ["--company", company, "--max-pages", String(maxPages)];
      if (req.dryRun) args.push("--dry-run");
      return {
        script: path.join(root, "local/scan-career.mjs"),
        args,
        label: `Career page scan: ${company}`,
      };
    }
    case "scan-yc": {
      if (!status.scanAtsFull) throw new Error("scan-ats-full.mjs missing");
      const args = ["--seeds", "yc", "--since", "7"];
      if (req.dryRun) args.push("--dry-run");
      return {
        script: path.join(root, "scan-ats-full.mjs"),
        args,
        label: "Startup dir: YC portfolio → ATS (7d)",
      };
    }
    case "scan-seeds": {
      if (!status.scanAtsFull) throw new Error("scan-ats-full.mjs missing");
      const args = ["--seeds", "yc,a16z", "--since", "7"];
      if (req.dryRun) args.push("--dry-run");
      return {
        script: path.join(root, "scan-ats-full.mjs"),
        args,
        label: "Startup dir: YC + a16z portfolios → ATS (7d)",
      };
    }
    case "company-funded": {
      if (!status.companyFunded) throw new Error("company-funded.mjs missing");
      const args = ["--limit", "25", "--months", "6"];
      if (req.dryRun) args.push("--dry-run");
      return {
        script: path.join(root, "company-funded.mjs"),
        args,
        label: "Startup dir: recently funded companies (review list)",
      };
    }
    case "harvest-companies": {
      if (!status.harvestCompanies) throw new Error("local/harvest-companies.mjs missing");
      const args = [];
      if (req.dryRun) args.push("--dry-run");
      if (req.aiOnly) args.push("--ai-only");
      const cli = typeof req.cli === "string" ? req.cli.trim().toLowerCase() : "";
      if (cli && !/^[a-z0-9_-]{1,32}$/.test(cli)) {
        throw new Error(`Invalid cli id: ${JSON.stringify(req.cli)}`);
      }
      if (cli) args.push("--cli", cli);
      const cliLabel = cli || process.env.CAREER_OPS_CLI || "configured CLI";
      return {
        script: path.join(root, "local/harvest-companies.mjs"),
        args,
        label: req.aiOnly
          ? `Classify unknowns with AI (${cliLabel})`
          : `Refresh company directory (heuristics + AI via ${cliLabel})`,
      };
    }
    case "reset-inbox": {
      if (!status.resetInbox) throw new Error("local/reset-scan-inbox.mjs missing");
      if (!req.confirm) throw new Error("reset-inbox requires confirm: true");
      const args = ["--yes"];
      if (req.pipelineOnly) args.push("--pipeline-only");
      return {
        script: path.join(root, "local/reset-scan-inbox.mjs"),
        args,
        label: req.pipelineOnly ? "Reset pipeline Pending only" : "Reset discovery inbox",
      };
    }
    case "reset-evaluations": {
      if (!status.resetEvaluations) throw new Error("local/reset-evaluations.mjs missing");
      if (!req.confirm) throw new Error("reset-evaluations requires confirm: true");
      return {
        script: path.join(root, "local/reset-evaluations.mjs"),
        args: ["--yes"],
        label: "Reset evaluations (reports + tracker)",
      };
    }
    case "clean-liveness": {
      if (!status.cleanLiveness) throw new Error("local/clean-liveness-temps.mjs missing");
      if (!req.confirm) throw new Error("clean-liveness requires confirm: true");
      return {
        script: path.join(root, "local/clean-liveness-temps.mjs"),
        args: ["--yes"],
        label: "Clean liveness temp files",
      };
    }
    default:
      throw new Error(`Unknown action: ${(req as RunRequest).action}`);
  }
}
