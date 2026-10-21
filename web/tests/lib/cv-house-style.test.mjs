import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { detectCvHouseStyle } from "../../src/lib/cv-house-style.mjs";
import { parseCvJsonEnvelope } from "../../src/lib/cv-json-envelope.mjs";
import { buildPrompt } from "../../src/lib/run-prompts.mjs";
import { renderSmallcapsAndMark } from "../../src/lib/pdf-house-style.mjs";

test("detectCvHouseStyle is smallcaps only when both local files exist", () => {
  const root = mkdtempSync(path.join(tmpdir(), "house-"));
  assert.equal(detectCvHouseStyle(root), "html");
  mkdirSync(path.join(root, "local"));
  writeFileSync(path.join(root, "local", "build-cv-smallcaps.mjs"), "");
  assert.equal(detectCvHouseStyle(root), "html");
  writeFileSync(path.join(root, "local", "cv-template.smallcaps.tex"), "");
  assert.equal(detectCvHouseStyle(root), "smallcaps");
});

test("parseCvJsonEnvelope reads one payload and refuses two", () => {
  const one = parseCvJsonEnvelope('note\n<<cv-json>>\n{"name":"A","experience":[{"company":"B"}]}\n<</cv-json>>\n');
  assert.equal(one.ok, true);
  assert.equal(one.payload.name, "A");
  const two = parseCvJsonEnvelope("<<cv-json>>\n{}\n<</cv-json>>\n<<cv-json>>\n{}\n<</cv-json>>\n");
  assert.equal(two.ok, false);
});

test("smallcaps pdf prompt asks for the JSON house style, not the HTML template", () => {
  const prompt = buildPrompt({
    kind: "pdf",
    input: "018",
    memory: "",
    today: "2026-10-17",
    houseStyle: "smallcaps",
  });
  assert.match(prompt, /<<cv-json>>/);
  assert.match(prompt, /local\/cv-template\.smallcaps\.tex/);
  assert.match(prompt, /Do NOT save or edit any file/i);
  assert.doesNotMatch(prompt, /<<cv-html/);
  assert.equal(prompt.match(/VERDICT:/g).length, 1);
});

test("renderSmallcapsAndMark builds the tex then compiles it", async () => {
  const calls = [];
  const spawnFn = (command, args) => {
    calls.push(args.map(String));
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    queueMicrotask(() => child.emit("close", 0));
    return child;
  };
  const dir = mkdtempSync(path.join(tmpdir(), "render-"));
  const result = await renderSmallcapsAndMark({
    spawnFn,
    execPath: "node",
    root: "/repo",
    reportNum: "018",
    pdfPaths: {
      html: path.join(dir, "cv-web-018.html"),
      finalPdf: path.join(dir, "out.pdf"),
      reportNum: "018",
    },
  });
  assert.equal(result.kind, "rendered");
  assert.match(calls[0][0], /build-cv-smallcaps\.mjs$/);
  assert.equal(calls[0][1], path.join(dir, "cv-web-018.json"));
  assert.equal(calls[0][2], path.join(dir, "cv-web-018.tex"));
  assert.match(calls[1][0], /generate-latex\.mjs$/);
  assert.deepEqual(calls[1].slice(1), [path.join(dir, "cv-web-018.tex"), path.join(dir, "out.pdf"), "--compile-only"]);
});
