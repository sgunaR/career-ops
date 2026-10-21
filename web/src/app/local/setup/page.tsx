import { LocalPageShell } from "@/components/local-tools/local-page-shell";
import { LocalSetupPanel } from "@/components/local-tools/local-setup-panel";

export const dynamic = "force-dynamic";

export default function LocalSetupPage() {
  return (
    <LocalPageShell
      eyebrow="Step 1 of 13"
      title="Initial setup"
      description="Do this once: check the tools, install what's missing, log in to the India boards. Maintenance and resets are at the bottom."
    >
      <LocalSetupPanel />
    </LocalPageShell>
  );
}
