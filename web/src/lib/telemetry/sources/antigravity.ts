import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { SourceReader, SourceResult } from "@/lib/telemetry/types";

// Google Antigravity (CLI + IDE) keeps conversations under ~/.gemini/antigravity-*
// as binary protobuf (.pb) files with no readable token counts (verified: no
// JSON usage records locally). Reported as installed-without-local-usage so the
// page is honest about the gap; nothing inside those folders is read.

export const TOOL = "antigravity";

export const antigravitySource: SourceReader = {
  tool: TOOL,
  label: "Google Antigravity",
  read(): SourceResult {
    const installed = ["antigravity-cli", "antigravity-ide"].some((d) =>
      fs.existsSync(path.join(os.homedir(), ".gemini", d)),
    );
    return {
      tool: TOOL,
      label: "Google Antigravity",
      costBasis: "none",
      status: installed ? "no-local-usage" : "not-installed",
      note: installed
        ? "Antigravity stores conversations in a binary format with no readable token counts. Add its usage via an import file if you need it here."
        : "Not installed on this machine.",
      records: [],
      sessions: [],
    };
  },
};
