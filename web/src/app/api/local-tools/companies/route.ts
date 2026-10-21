import { readCompaniesDirectory } from "@/lib/companies-directory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Read-only company directory (data/companies.tsv). */
export async function GET() {
  return Response.json(readCompaniesDirectory());
}
