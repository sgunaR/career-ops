import { LocalPageShell } from "@/components/local-tools/local-page-shell";
import { LocalGuidePanel } from "@/components/local-tools/local-guide-panel";

export const dynamic = "force-dynamic";

/**
 * Job-search guide: the whole flow in order (setup → discover → run → evaluate → CV →
 * apply → contacts → cover letter → track). Scripts live under gitignored `local/`;
 * this never patches scan.mjs.
 */
export default function LocalGuidePage() {
  return (
    <LocalPageShell
      title="Job-search guide"
      description="One flow, start to finish: set up, find jobs outside and inside India, run it, then evaluate, tailor your CV, apply, reach out and follow up."
    >
      <LocalGuidePanel />
    </LocalPageShell>
  );
}
