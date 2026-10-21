#!/usr/bin/env node
// Zero-token posting calendar. Reads data/scan-history.tsv. No model calls.
//
//   node posting-season.mjs
//   node posting-season.mjs --board naukri --role "SAP BTP & CPI" --summary

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzePostings, parseScanHistory } from "./web/src/lib/posting-season.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const flag = (name) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : "";
};
const text = readFileSync(resolve(root, "data/scan-history.tsv"), "utf8");
const report = analyzePostings(parseScanHistory(text), {
  board: flag("board"),
  role: flag("role"),
});

if (args.includes("--summary")) {
  const { outlook, coverage } = report;
  console.log(`Fresh employer-dated postings: ${coverage.freshPosted} (${coverage.stalePosted} stale dates left out)`);
  console.log(`This month ${outlook.currentMonth}: ${outlook.currentCount} so far, pace ${outlook.currentProjected} (${outlook.monthDirection})`);
  console.log(`Last 4 weeks vs the 4 before: ${outlook.weekDirection}`);
  console.log(`Next month ${outlook.nextMonth} if recent weeks hold: about ${outlook.nextMonthExpected} (three-month average ${outlook.threeMonthAverage})`);
  console.log(outlook.note);
  console.log("Boards:");
  for (const row of report.boards.slice(0, 8)) console.log(`  ${row.count}\t${row.label}`);
  console.log("Roles:");
  for (const row of report.roles) console.log(`  ${row.count}\t${row.label}`);
} else {
  console.log(JSON.stringify(report, null, 2));
}
