import { LocalPageShell } from "@/components/local-tools/local-page-shell";
import { LocalOutsideIndiaPanel } from "@/components/local-tools/local-outside-india-panel";

export const dynamic = "force-dynamic";

export default function LocalOutsideIndiaPage() {
  return (
    <LocalPageShell
      eyebrow="Step 2 of 13"
      title="Discover outside India"
      description="Three different things, kept separate: startups, remote job boards, and single company career pages. Everything lands in Pipeline."
    >
      <LocalOutsideIndiaPanel />
    </LocalPageShell>
  );
}
