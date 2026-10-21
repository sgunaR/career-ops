import { LocalPageShell } from "@/components/local-tools/local-page-shell";
import { LocalIndiaPanel } from "@/components/local-tools/local-india-panel";

export const dynamic = "force-dynamic";

export default function LocalIndiaPage() {
  return (
    <LocalPageShell
      eyebrow="Step 3 of 13"
      title="Discover in India"
      description="Naukri, LinkedIn, Peerlist, Cutshort, Hirist, Instahyre, foundit, Indeed India and Wellfound. Free browser scrapers, no AI."
    >
      <LocalIndiaPanel />
    </LocalPageShell>
  );
}
