import { redirect } from "next/navigation";

// Startups + career pages were merged into one page (step 2). Old links keep working.
export default function LocalCareersRedirect() {
  redirect("/local/outside-india#career-pages");
}
