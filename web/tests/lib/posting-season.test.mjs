import assert from "node:assert/strict";
import test from "node:test";
import { analyzePostings, parseScanHistory, roleFamily } from "../../src/lib/posting-season.mjs";

const header = "url\tfirst_seen\tportal\ttitle\tcompany\tstatus\tlocation\tfingerprint\tposted_at\ttrust_score\ttrust_flags\tnormalized_company";

test("fresh employer dates drive the calendar and stale ads stay out", () => {
  const text = [
    header,
    "https://a.test/1\t2026-08-02\tnaukri\tSAP CPI Developer\tAcme\tnew\tHyd\t\t2026-08-01\t\t\t",
    "https://a.test/1\t2026-08-02\tnaukri\tSAP CPI Developer\tAcme\tnew\tHyd\t\t2026-08-01\t\t\t",
    "https://a.test/2\t2026-09-10\tnaukri\tSAP BTP Engineer\tAcme\tnew\tHyd\t\t2026-09-09\t\t\t",
    "https://a.test/3\t2026-09-12\tlinkedin\tFull Stack Engineer\tBeta\tnew\tHyd\t\t2024-01-01\t\t\t",
    "https://a.test/4\t2026-10-05\tfoundit\tAI Engineer\tGamma\tnew\tHyd\t\t2026-10-04\t\t\t",
    "https://a.test/5\t2026-10-06\tfoundit\tBackend Engineer\tGamma\tnew\tHyd\t\t\t\t\t",
  ].join("\n");
  const report = analyzePostings(parseScanHistory(text), { now: "2026-10-17" });
  assert.equal(report.coverage.rows, 5);
  assert.equal(report.coverage.freshPosted, 3);
  assert.equal(report.coverage.stalePosted, 1);
  assert.equal(report.coverage.missingPosted, 1);
  assert.deepEqual(report.months.map((row) => [row.label, row.count]), [["2026-08", 1], ["2026-09", 1], ["2026-10", 1]]);
  assert.equal(report.outlook.currentProjected, Math.round(1 / 17 * 31));
  assert.equal(report.outlook.nextMonth, "2026-11");
  assert.equal(report.outlook.threeMonthAverage, 1);
  assert.equal(report.outlook.nextMonthExpected, Math.round(report.outlook.nextFourWeeksEach * 4.3));
});

test("board and role filters apply before the forecast", () => {
  const rows = parseScanHistory([
    header,
    "https://a.test/1\t2026-09-02\tnaukri\tSAP CPI Developer\tAcme\tnew\tHyd\t\t2026-09-01\t\t\t",
    "https://a.test/2\t2026-09-03\tnaukri\tAI Engineer\tAcme\tnew\tHyd\t\t2026-09-02\t\t\t",
    "https://a.test/3\t2026-09-04\tfoundit\tSAP CPI Developer\tBeta\tnew\tHyd\t\t2026-09-03\t\t\t",
  ].join("\n"));
  const report = analyzePostings(rows, { now: "2026-10-17", board: "naukri", role: "SAP BTP & CPI" });
  assert.equal(report.coverage.freshPosted, 1);
  assert.equal(roleFamily("Senior SAP Integration Suite Consultant"), "SAP BTP & CPI");
  assert.equal(roleFamily("Platform Engineer"), "DevOps");
});

test("a drop across the last eight weeks reads as falling", () => {
  const lines = [header];
  const mondays = ["2026-06-01", "2026-06-08", "2026-06-15", "2026-06-22", "2026-06-29", "2026-07-06", "2026-07-13", "2026-07-20"];
  mondays.forEach((day, index) => {
    const count = index < 4 ? 8 : 1;
    for (let n = 0; n < count; n += 1) {
      lines.push(`https://a.test/${day}-${n}\t${day}\tnaukri\tAI Engineer\tAcme\tnew\tHyd\t\t${day}\t\t\t`);
    }
  });
  const report = analyzePostings(parseScanHistory(lines.join("\n")), { now: "2026-08-01" });
  assert.equal(report.outlook.weekDirection, "falling");
});
