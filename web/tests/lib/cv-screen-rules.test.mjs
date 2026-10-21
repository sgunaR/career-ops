import assert from "node:assert/strict";
import test from "node:test";
import { emphasizeMetrics, prepareScreenPayload, screenText } from "../../../lib/cv-screen-rules.mjs";

test("screen text drops pronouns and doubled words without adding a claim", () => {
  const cleaned = screenText("Built Node,js services and and orchestrated them with Kubernetes.");
  assert.equal(cleaned.text, "Built Node.js services and orchestrated with Kubernetes.");
  assert.equal(emphasizeMetrics("Shipped 20+ flows at 99.2% uptime and 90%+ accuracy in 2026."), "Shipped <strong>20+</strong> flows at <strong>99.2%</strong> uptime and <strong>90%+</strong> accuracy in 2026.");
});

test("a long role keeps numbered bullets and every employer", () => {
  const { payload, notes } = prepareScreenPayload({
    summary: "I build SAP integrations.",
    experience: [
      { company: "Proclink", bullets: ["Built APIs", "Enabled 20+ iFlows", "Designed 250+ tests", "Owned the pipeline", "Wrote notes", "Set up CI"] },
      { company: "eSource", bullets: ["Engineered a server"] },
    ],
  }, { caps: [3, 3] });
  assert.equal(payload.summary, "Build SAP integrations.");
  assert.deepEqual(payload.experience.map((job) => job.company), ["Proclink", "eSource"]);
  assert.deepEqual(payload.experience[0].bullets, ["Built APIs", "Enabled 20+ iFlows", "Designed 250+ tests"]);
  assert.ok(notes.some((note) => note.includes("kept 3 of 6")));
});
