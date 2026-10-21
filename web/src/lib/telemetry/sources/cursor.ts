import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { careerOpsRoots } from "@/lib/telemetry/scope";
import type { SourceReader, SourceResult } from "@/lib/telemetry/types";

// Cursor keeps agent chats per project under ~/.cursor/projects/<folder>/
// agent-transcripts/<chat>/<chat>.jsonl (subagents in a subagents/ folder).
// Those lines hold only { role, message } — no timestamps, model or token
// counts (verified against local data); Cursor meters usage on its servers.
// So this reader reports career-ops ACTIVITY only (chats, your turns, dates
// from file times), never tokens or cost. Scope: only the folder whose name is
// the career-ops path is opened.

export const TOOL = "cursor";

/** Cursor folds the path to lowercase-insensitive runs of "-": c:\Users\Me\x → c-Users-Me-x. */
function slug(p: string): string {
  return p.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

function projectsDir(): string {
  return path.join(os.homedir(), ".cursor", "projects");
}

export const cursorSource: SourceReader = {
  tool: TOOL,
  label: "Cursor",
  read(): SourceResult {
    const meta = {
      tool: TOOL,
      label: "Cursor",
      costBasis: "none" as const,
      records: [],
      sessions: [],
    };
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(projectsDir(), { withFileTypes: true });
    } catch {
      return { ...meta, status: "not-installed", note: "No ~/.cursor/projects folder on this machine." };
    }
    const wanted = new Set(careerOpsRoots().map((r) => slug(path.resolve(r))));
    const folder = entries.find((e) => e.isDirectory() && wanted.has(slug(e.name)));
    const note =
      "Cursor doesn't store token counts locally — they live in your cursor.com usage dashboard, which isn't split by project. Shown here: career-ops chat activity only.";
    if (!folder) {
      return { ...meta, status: "no-local-usage", note, activity: { sessions: 0, turns: 0, first: null, last: null } };
    }

    const transcripts = path.join(projectsDir(), folder.name, "agent-transcripts");
    let chats = 0;
    let turns = 0;
    let first: number | null = null;
    let last: number | null = null;
    const items: { first: number; last: number; turns: number }[] = [];
    let dirs: fs.Dirent[] = [];
    try {
      dirs = fs.readdirSync(transcripts, { withFileTypes: true });
    } catch {
      /* no chats yet */
    }
    for (const d of dirs) {
      if (!d.isDirectory()) continue;
      const main = path.join(transcripts, d.name, `${d.name}.jsonl`);
      let st: fs.Stats;
      try {
        st = fs.statSync(main);
      } catch {
        continue;
      }
      chats += 1;
      const born = st.birthtimeMs || st.mtimeMs;
      first = first === null ? born : Math.min(first, born);
      last = last === null ? st.mtimeMs : Math.max(last, st.mtimeMs);
      let chatTurns = 0;
      try {
        for (const line of fs.readFileSync(main, "utf8").split("\n")) {
          if (line.startsWith('{"role":"user"')) chatTurns += 1;
        }
      } catch {
        /* unreadable chat — counted as a chat, no turns */
      }
      turns += chatTurns;
      items.push({ first: born, last: st.mtimeMs, turns: chatTurns });
    }
    return {
      ...meta,
      status: "no-local-usage",
      note,
      activity: { sessions: chats, turns, first, last },
      activityItems: items,
    };
  },
};
