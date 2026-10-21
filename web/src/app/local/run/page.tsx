import { LocalPageShell } from "@/components/local-tools/local-page-shell";
import { LocalRunPanel } from "@/components/local-tools/local-run-panel";

export const dynamic = "force-dynamic";

export default function LocalRunPage() {
  return (
    <LocalPageShell
      eyebrow="Steps 4–5 of 13"
      title="Run it"
      description="The same flow two ways: from the command line (the daily wave, one click each), or from chat (prompts to paste)."
    >
      <LocalRunPanel />
    </LocalPageShell>
  );
}
