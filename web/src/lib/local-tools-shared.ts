/** Shared constants for Local Discover — safe for client components (no node:). */

export const INDIA_BOARDS = [
  "naukri",
  "linkedin",
  "instahyre",
  "cutshort",
  "foundit",
  "hirist",
  "indeed-india",
  "peerlist",
  "wellfound",
] as const;

export type IndiaBoard = (typeof INDIA_BOARDS)[number];

export type LocalToolAction =
  | "india-scan"
  | "india-health"
  | "india-login"
  | "scan-all"
  | "scan-companies"
  | "scan-career"
  | "scan-yc"
  | "scan-seeds"
  | "company-funded"
  | "harvest-companies"
  | "reset-inbox"
  | "reset-evaluations"
  | "clean-liveness"
  | "bootstrap-india";

export type LocalToolsStatus = {
  available: boolean;
  root: string;
  indiaScan: boolean;
  indiaConfig: boolean;
  scanCompanies: boolean;
  scanCareer: boolean;
  scanAtsFull: boolean;
  companyFunded: boolean;
  harvestCompanies: boolean;
  resetInbox: boolean;
  resetEvaluations: boolean;
  cleanLiveness: boolean;
  bootstrap: boolean;
  boards: readonly string[];
};
