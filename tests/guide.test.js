// Run: node tests/guide.test.js
// Plain tabs: listen, learn, rest, reality check, and the Enough state.
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const G = require("../ariel/suite/guide.js");
const R = require("../ariel/suite/record.js");
const B = require("../ariel/suite/bridge.js");

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}

test("the gate sets a tone and does not become a score", () => {
  assert.equal(G.tone(0.9), "listen");
  assert.equal(G.tone(0.6), "listen");
  assert.equal(G.tone(0.35), "gentle");
  assert.equal(G.tone(0.1), "expansive");
  assert.equal(G.toneLine("listen"), "Listening.");
  assert.equal(G.toneLine("expansive"), "There is room.");
  assert.equal(B.PARAMS.v0, 0.35);
});

test("Discover reflects the user's words and names a core, with no judgment", () => {
  const quiet = G.reflect("   ", "listen");
  assert.match(quiet.lines[0], /reflect what you put here/);
  const heard = G.reflect("I keep returning to patience when the work feels empty.", "listen");
  assert.match(heard.lines[0], /I hear:/);
  assert.match(heard.lines[0], /patience/);
  assert.equal(heard.core, "patience");
  assert.match(heard.lines[1], /The core of this: patience/);
  assert.equal(heard.lines.length, 2, "a high gate keeps the reply short");
  const wide = G.reflect("I keep returning to patience when the work feels empty.", "expansive");
  assert.ok(wide.lines.length > heard.lines.length);
  assert.doesNotMatch(wide.lines.join(" "), /score|streak|great job|you should|you failed/i);
});

test("Learn offers two to four fundamentals and at most one kindred mind", () => {
  const pack = G.learn("I want to study the fundamentals of knowledge");
  assert.ok(pack.concepts.length >= 2 && pack.concepts.length <= 4);
  assert.equal(pack.mind.name, "Socrates");
  assert.match(pack.note, /Not an exercise and not a test/);
  const own = G.learn("xylophone zebra");
  assert.equal(own.mind, null);
  assert.ok(own.concepts.length >= 2 && own.concepts.length <= 4);
  assert.match(own.note, /don't have a kindred mind/);
  const empty = G.learn("  ");
  assert.equal(empty.concepts.length, 0);
  assert.equal(empty.mind, null);
});

test("Rest offers a pause and the forgiveness line when threat is high, and quotes the dream", () => {
  const high = G.restOffer(0.9, "to learn quietly", "the work is heavy");
  assert.equal(high.high, true);
  assert.equal(high.tone, "listen");
  assert.match(high.pause, /Pause here/);
  assert.equal(high.forgiveness, "You can let yourself off the hook for this.");
  assert.equal(high.forgiveness, G.FORGIVENESS);
  assert.match(high.drive, /to learn quietly/);
  const calm = G.restOffer(0.1, "", "");
  assert.equal(calm.high, false);
  assert.match(calm.pause, /even if the hour is quiet/);
  assert.match(calm.drive, /yours to name/);
});

test("the reality check names what is true and where the dream can hold, without shaming", () => {
  const card = G.reality("I have to be the best and prove myself", "to learn quietly");
  assert.equal(card.flagged, true);
  assert.match(card.heard, /ideal/);
  assert.match(card.trueNow, /What is true/);
  assert.match(card.dreamHolds, /to learn quietly/);
  assert.match(card.dreamHolds, /does not have to prove you/);
  assert.match(card.invite, /accept both/);
  assert.doesNotMatch(JSON.stringify(card), /you are vain|shame on|pathetic|stupid|worthless/i);
  const plain = G.reality("I am learning to draw", "to learn quietly");
  assert.equal(plain.flagged, false);
  assert.match(plain.trueNow, /words you actually wrote/);
  assert.match(plain.dreamHolds, /to learn quietly/);
});

test("Enough is a closing line and a record entry, written once", () => {
  const pack = G.enough("patience");
  assert.equal(pack.text, "You've learned what you needed here. Nothing more to prove.");
  assert.equal(pack.entry.type, "enough");
  assert.equal(pack.entry.note, "Settled: patience");
  let rec = R.add(R.blank(), pack.entry, "2026-11-10T12:00:00.000Z");
  rec = R.add(rec, pack.entry, "2026-11-10T12:05:00.000Z");
  assert.equal(rec.entries.length, 1);
  assert.equal(R.counts(rec).ideas, 1);
  assert.equal(rec.entries[0].text, G.ENOUGH);
});

test("the suite keeps five plain tabs, hides the gate behind Advanced, and leaves the engine in place", () => {
  const suite = fs.readFileSync(path.join(__dirname, "../ariel/suite/index.html"), "utf8");
  const shell = fs.readFileSync(path.join(__dirname, "../ariel/shell.js"), "utf8");
  const bridge = fs.readFileSync(path.join(__dirname, "../ariel/suite/bridge.js"), "utf8");
  ["discover", "create", "learn", "rest", "record"].forEach(id => {
    assert.match(suite, new RegExp('data-tab="' + id + '"'));
  });
  assert.match(suite, /id="advanced"/);
  assert.match(suite, /id="more-tools"/);
  assert.match(suite, /You can let yourself off the hook for this\./);
  assert.match(suite, /Reality check/);
  assert.match(suite, /This is enough/);
  assert.match(suite, /call or text <strong>988<\/strong>/);
  assert.match(suite, /911/);
  assert.match(suite, /data-tab="gate"/);
  assert.match(suite, /id="slider-v"/);
  assert.match(suite, /advanced-tab hidden/);
  assert.match(suite, /No exercises and no tests/);
  assert.doesNotMatch(suite, /streak|great job|you broke/i);
  assert.match(shell, /ariel-tools/);
  assert.match(shell, /embed:not\(\.more-tools\)/);
  assert.match(bridge, /===== PARAMS =====/);
  assert.match(bridge, /===== EQUATIONS =====/);
});

console.log(`\n${passed} passed`);
