import path from "node:path";
import { careerOpsRoot } from "@/lib/career-ops";

// Telemetry is scoped to career-ops ONLY. Every source reader keeps a usage
// record only when the session's working directory is the career-ops checkout
// (or a folder inside it). Sessions from any other project on this machine are
// skipped after reading their working directory, and nothing else from them is
// read, kept, or returned.

let cached: string[] | null = null;

/** The code checkout (web runs from <core>/web) plus the data root if it lives elsewhere. */
export function careerOpsRoots(): string[] {
  if (cached) return cached;
  const code = path.resolve(process.cwd(), "..");
  const roots = [code];
  try {
    const data = path.resolve(careerOpsRoot());
    if (norm(data) !== norm(code)) roots.push(data);
  } catch {
    /* data root unresolvable — the code checkout alone is still correct */
  }
  cached = roots;
  return roots;
}

function norm(p: string): string {
  const r = path.resolve(p);
  // Windows paths are case-insensitive; compare case-folded there only.
  return process.platform === "win32" ? r.toLowerCase() : r;
}

/** True when `dir` is a career-ops root or any folder inside one. */
export function inCareerOps(dir: string | null | undefined): boolean {
  if (!dir || typeof dir !== "string") return false;
  const d = norm(dir);
  return careerOpsRoots().some((root) => {
    const r = norm(root);
    return d === r || d.startsWith(r + path.sep);
  });
}
