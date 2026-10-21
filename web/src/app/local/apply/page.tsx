import { LocalPageShell } from "@/components/local-tools/local-page-shell";
import { LocalApplyPanel } from "@/components/local-tools/local-apply-panel";

export const dynamic = "force-dynamic";

export default function LocalApplyPage() {
  return (
    <LocalPageShell
      eyebrow="Steps 6–12 of 13"
      title="Choose, tailor and apply"
      description="Shortlist, evaluate, generate the CV, apply, reach out, write the cover letter, and track. Where each lives in the app, plus what to say in chat."
    >
      <LocalApplyPanel />
    </LocalPageShell>
  );
}
