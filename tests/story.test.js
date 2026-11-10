// Run: node tests/story.test.js
// Story seed: same drawing, same story. Novelty, and the rest guard.
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const S = require("../ariel/suite/story.js");
const R = require("../ariel/suite/record.js");

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}

function line(x1, y1, x2, y2, color) {
  return { color: color || "#7a9cc6", t: 1, points: [{ x: x1, y: y1 }, { x: x2, y: y2 }] };
}

test("the same drawing always hashes and tells the same story", () => {
  const drawing = [line(10, 20, 80, 90), line(40, 10, 40, 120, "#c79a7a")];
  const again = [line(10, 20, 80, 90), line(40, 10, 40, 120, "#c79a7a")];
  assert.equal(S.seedOf(drawing), S.seedOf(again));
  const a = S.tell(drawing, { tone: "gentle" });
  const b = S.tell(again, { tone: "expansive" });
  assert.equal(a.show, true);
  assert.equal(a.seed, b.seed);
  assert.equal(a.text, b.text);
  assert.equal(a.nudged, 0);
  assert.ok(a.sentences.length >= 5 && a.sentences.length <= 8);
  assert.equal(S.mulberry32(a.seed)(), S.mulberry32(a.seed)());
  assert.notEqual(S.mulberry32(1)(), S.mulberry32(2)());
});

test("a tiny wobble stays the same story, and a different drawing does not", () => {
  const drawing = [line(100, 40, 180, 40)];
  const wobble = [{ color: "#7a9cc6", t: 1, points: [{ x: 101, y: 40 }, { x: 180, y: 40 }] }];
  const other = [line(300, 200, 20, 240, "#e8c76a")];
  assert.equal(S.seedOf(drawing), S.seedOf(wobble));
  assert.equal(S.tell(drawing).text, S.tell(wobble).text);
  assert.notEqual(S.seedOf(drawing), S.seedOf(other));
  assert.notEqual(S.tell(drawing).text, S.tell(other).text);
});

test("a story is a short wonder, not a contest", () => {
  const told = S.tell([line(12, 12, 64, 90)], { tone: "gentle" });
  assert.match(told.text, /question/i);
  assert.match(told.text, /noticed/i);
  assert.match(told.text, /showed it to/i);
  assert.doesNotMatch(told.text, /\b(win|won|prove|proved|score|grade|tower|prize)\b/i);
  told.sentences.forEach(s => assert.match(s, /[.!?]$/));
});

test("high overlap nudges the seed toward a fresher telling", () => {
  const drawing = [line(8, 8, 96, 24), line(8, 40, 96, 70, "#5b6472")];
  const first = S.tell(drawing, { previous: [] });
  assert.equal(first.nudged, 0);
  const second = S.tell(drawing, { previous: [{ elements: first.elements }] });
  assert.ok(second.nudged > 0, "the seed steps forward");
  assert.ok(second.differ >= 3);
  assert.notEqual(second.text, first.text);
  assert.equal(S.tell(drawing, { previous: [{ elements: first.elements }] }).text, second.text);
});

test("more than five stories in ten minutes offers rest and does not block", () => {
  const now = 1_000_000;
  const quiet = [];
  for (let i = 0; i < 5; i++) quiet.push(now - i * 1000);
  assert.equal(S.guard(quiet, now).offer, false);
  quiet.push(now - 500);
  const busy = S.guard(quiet, now);
  assert.equal(busy.offer, true);
  assert.equal(busy.blocked, false);
  assert.equal(busy.line, "That's a lot of stories. Want to rest with this one for a moment?");
  const old = [now - 11 * 60 * 1000, now - 12 * 60 * 1000];
  assert.equal(S.guard(old, now).offer, false);
});

test("Listening hides the story, and Keep stores the tale with its picture", () => {
  const drawing = [line(16, 16, 80, 48)];
  const hidden = S.tell(drawing, { tone: "listen" });
  assert.equal(hidden.show, false);
  assert.match(hidden.presence, /Pause here/);
  assert.equal(hidden.forgiveness, "You can let yourself off the hook for this.");
  assert.equal(hidden.text, "");
  const told = S.tell(drawing, { tone: "gentle" });
  const entry = S.keepEntry(told, "2026-11-10T16:00:00.000Z");
  assert.equal(entry.type, "story");
  assert.equal(entry.text, "Kept a story from the canvas");
  assert.equal(entry.note, told.text);
  assert.match(entry.thumb, /^data:image\/svg\+xml/);
  let rec = R.add(R.blank(), entry, entry.at);
  rec = R.add(rec, entry, entry.at);
  assert.equal(rec.entries.length, 1, "the same drawing's story is kept once");
  const store = { box: {}, getItem(k) { return this.box[k] || null; }, setItem(k, v) { this.box[k] = v; } };
  R.save(store, rec);
  const loaded = R.load(store);
  assert.equal(loaded.entries[0].note, told.text);
  assert.match(loaded.entries[0].thumb, /^data:image\/svg\+xml/);
  assert.equal(S.keepEntry(hidden), null);
});

test("the suite offers the story under the canvas and keeps the gate equations", () => {
  const suite = fs.readFileSync(path.join(__dirname, "../ariel/suite/index.html"), "utf8");
  const story = fs.readFileSync(path.join(__dirname, "../ariel/suite/story.js"), "utf8");
  const shell = fs.readFileSync(path.join(__dirname, "../ariel/shell.js"), "utf8");
  const bridge = fs.readFileSync(path.join(__dirname, "../ariel/suite/bridge.js"), "utf8");
  assert.match(suite, /id="story-tell"/);
  assert.match(suite, /Tell me a story/);
  assert.match(suite, /That's a lot of stories\. Want to rest with this one for a moment\?/);
  assert.match(suite, /id="story-rest"/);
  assert.match(suite, /id="story-more"/);
  assert.match(suite, /id="story-keep"/);
  assert.match(suite, /id="story-meta"/);
  assert.match(story, /===== PARAMS =====/);
  assert.match(story, /===== EQUATIONS =====/);
  assert.match(shell, /marks: storyMarks\(\)/);
  assert.match(bridge, /===== PARAMS =====/);
  assert.match(bridge, /===== EQUATIONS =====/);
});

console.log(`\n${passed} passed`);
