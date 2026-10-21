import fs from "node:fs";
import path from "node:path";
import { careerOpsRoot } from "@/lib/career-ops";

export type CompanyKind = "product" | "services" | "startup" | "mixed" | "unknown";
export type SapRole = "sap_partner_si" | "unknown";
export type Confidence = "high" | "medium" | "low";

export type CompanyRow = {
  company_key: string;
  display_name: string;
  company_kind: CompanyKind | string;
  sap_role: SapRole | string;
  confidence: Confidence | string;
  sources: string;
  first_seen: string;
  last_seen: string;
  sample_titles: string;
  notes: string;
};

export type CompaniesDirectory = {
  path: string;
  exists: boolean;
  total: number;
  byKind: Record<string, number>;
  bySap: Record<string, number>;
  companies: CompanyRow[];
};

const KIND_ORDER = ["product", "services", "startup", "mixed", "unknown"];
const SAP_ORDER = ["sap_partner_si", "unknown"];

export function companiesTsvPath(): string {
  return path.join(careerOpsRoot(), "data", "companies.tsv");
}

export function readCompaniesDirectory(): CompaniesDirectory {
  const file = companiesTsvPath();
  const out: CompaniesDirectory = {
    path: file,
    exists: false,
    total: 0,
    byKind: {},
    bySap: {},
    companies: [],
  };
  if (!fs.existsSync(file)) return out;

  out.exists = true;
  const text = fs.readFileSync(file, "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.startsWith("#") || line.startsWith("company_key\t")) continue;
    const c = line.split("\t");
    if (c.length < 4 || !c[0]) continue;
    const row: CompanyRow = {
      company_key: c[0] || "",
      display_name: c[1] || c[0] || "",
      company_kind: c[2] || "unknown",
      sap_role: c[3] || "unknown",
      confidence: c[4] || "low",
      sources: c[5] || "",
      first_seen: c[6] || "",
      last_seen: c[7] || "",
      sample_titles: c[8] || "",
      notes: c[9] || "",
    };
    out.companies.push(row);
    out.byKind[row.company_kind] = (out.byKind[row.company_kind] || 0) + 1;
    out.bySap[row.sap_role] = (out.bySap[row.sap_role] || 0) + 1;
  }

  out.companies.sort((a, b) => a.display_name.localeCompare(b.display_name));
  out.total = out.companies.length;
  return out;
}

export function kindOrder(): string[] {
  return KIND_ORDER;
}

export function sapOrder(): string[] {
  return SAP_ORDER;
}
