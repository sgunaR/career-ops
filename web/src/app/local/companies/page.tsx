import { LocalPageShell } from "@/components/local-tools/local-page-shell";
import { LocalCompaniesPanel } from "@/components/local-tools/local-companies-panel";

export const dynamic = "force-dynamic";

export default function LocalCompaniesPage() {
  return (
    <LocalPageShell
      eyebrow="Optional"
      title="Company directory"
      description="Every employer your scans have seen, tagged product, services or startup and by SAP role, so you can target employers on purpose."
    >
      <LocalCompaniesPanel />
    </LocalPageShell>
  );
}
