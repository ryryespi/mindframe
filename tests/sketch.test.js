// Run: node tests/sketch.test.js
// A sketch kept with its thought and its words. No generation.
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const S = require("../ariel/suite/sketch.js");
const Rec = require("../ariel/suite/record.js");

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}

test("a saved sketch keeps the thought, the date, and the bag of words", () => {
  assert.deepEqual(S.fit(2000, 1000), { width: 512, height: 256 });
  assert.deepEqual(S.fit(400, 300), { width: 400, height: 300 });
  const entry = S.card({
    id: "s1",
    thought: "The line felt quiet",
    words: ["grace", "rest"],
    at: "2026-11-10T19:00:00.000Z",
    thumb: "data:image/png;base64,abc"
  });
  assert.equal(entry.type, "sketch");
  assert.equal(entry.text, "The line felt quiet");
  assert.equal(entry.note, "The line felt quiet");
  assert.deepEqual(entry.words, ["grace", "rest"]);
  assert.equal(entry.imageId, "s1");
  const blank = S.card({ id: "s2", words: ["kept"], at: "2026-11-10T19:01:00.000Z" });
  assert.equal(blank.text, "Saved a sketch");
  assert.equal(blank.note, "");
  let rec = Rec.add(Rec.blank(), entry, entry.at);
  const edited = S.editThought(rec.entries[0], "A softer thought");
  rec = Rec.edit(rec, "s1", edited);
  assert.equal(rec.entries[0].text, "A softer thought");
  assert.equal(rec.entries[0].note, "A softer thought");
  assert.deepEqual(rec.entries[0].words, ["grace", "rest"]);
  assert.equal(rec.entries[0].thumb, entry.thumb);
});

test("a heavy thought gets one kind reframe, and a calm one does not", () => {
  const frames = S.frames([
    { id: "a", type: "sketch", text: "I feel alone", note: "I feel alone", words: ["enough"], at: "2026-11-10T19:00:00.000Z" },
    { id: "b", type: "sketch", text: "The light was soft", note: "The light was soft", words: [], at: "2026-11-10T19:02:00.000Z" }
  ]);
  assert.equal(frames.length, 2);
  assert.equal(frames[0].reframe, S.PARAMS.reframe);
  assert.equal(frames[1].reframe, "");
  assert.equal(S.PARAMS.generativeArt, null);
  const art = S.artCards(frames.map(frame => ({ id: frame.id, type: "sketch", text: frame.title, note: frame.thought })));
  assert.equal(art[0].kind, "sketch");
  assert.equal(art[0].own, true);
  assert.equal(S.artCards([])[0].text, S.PARAMS.empty);
});

test("the page can save a sketch, filter them, and show them as art", () => {
  const suite = fs.readFileSync(path.join(__dirname, "../ariel/suite/index.html"), "utf8");
  const file = fs.readFileSync(path.join(__dirname, "../ariel/suite/sketch.js"), "utf8");
  assert.match(suite, /id="save-sketch"/);
  assert.match(suite, /Save sketch/);
  assert.match(suite, /id="make-gallery"/);
  assert.match(suite, /Make a gallery/);
  assert.match(suite, /id="reel-art"/);
  assert.match(suite, /Show me my art/);
  assert.match(suite, /indexedDB\.open\("ariel-sketches"/);
  assert.match(file, /Ryan designed this/);
  assert.match(file, /===== PARAMS =====/);
  assert.match(file, /===== EQUATIONS =====/);
  assert.match(file, /TODO Ryan: future generative positive art/);
  assert.equal(Rec.TYPES.sketch, "Sketches");
});

console.log(`\n${passed} passed`);
