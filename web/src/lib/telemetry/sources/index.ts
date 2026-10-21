import type { SourceReader } from "@/lib/telemetry/types";
import { antigravitySource } from "@/lib/telemetry/sources/antigravity";
import { claudeCodeSource } from "@/lib/telemetry/sources/claude-code";
import { codexSource } from "@/lib/telemetry/sources/codex";
import { copilotCliSource } from "@/lib/telemetry/sources/copilot-cli";
import { cursorSource } from "@/lib/telemetry/sources/cursor";
import { importsSource } from "@/lib/telemetry/sources/imports";
import { opencodeSource } from "@/lib/telemetry/sources/opencode";

// Every AI tool the Telemetry page knows about, in display order. To support a
// new IDE/CLI: write a reader in this folder that returns a SourceResult (only
// career-ops sessions — use inCareerOps() from ../scope), then add it here.
// Tools with no local usage logs can still be covered via data/telemetry/imports/.
export const SOURCES: SourceReader[] = [
  claudeCodeSource,
  copilotCliSource,
  codexSource,
  opencodeSource,
  cursorSource,
  antigravitySource,
  importsSource,
];
