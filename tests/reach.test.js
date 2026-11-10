// Run: node tests/reach.test.js
// Reach out, one step at a time, and the reel of what was kept.
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Rch = require("../ariel/suite/reach.js");

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}

test("reach out validates, then refuses unsafe contact", () => {
  let state = Rch.start("open");
  assert.match(state.lines[0], /Pulling away can feel safer/);
  state = Rch.screen(state, "continue");
  assert.equal(state.step, "safety");
  assert.match(state.lines[0], /safe to contact/);
  const blocked = Rch.screen(state, "not-safe");
  assert.equal(blocked.blocked, true);
  assert.deepEqual(blocked.starters, []);
  assert.match(blocked.lines.join(" "), /someone safe instead/);
  assert.match(blocked.lines.join(" "), /988/);
  assert.match(blocked.lines.join(" "), /911/);
  const space = Rch.screen(state, "space");
  assert.equal(space.blocked, true);
  assert.deepEqual(space.starters, []);
});

test("a safe path shows two readings, one tip, and a message the person sends", () => {
  let state = Rch.screen(Rch.screen(Rch.start("open"), "continue"), "safe");
  assert.equal(state.step, "readings");
  assert.match(state.lines.join(" "), /They hate me/);
  assert.match(state.lines.join(" "), /not the only reading/);
  assert.deepEqual(state.scripture, []);
  state = Rch.screen(state, "faith-on");
  assert.equal(state.scripture.length, 3);
  assert.match(state.scripture.map(v => v.ref).join(" "), /Romans 12:18/);
  assert.match(state.scripture.map(v => v.line).join(" "), /as far as it depends on you/);
  state = Rch.screen(state, "continue");
  assert.equal(state.step, "tip");
  assert.equal(state.lines.length, 1);
  const next = Rch.screen(state, "next-tip");
  assert.notEqual(next.lines[0], state.lines[0]);
  state = Rch.screen(state, "continue");
  assert.equal(state.step, "message");
  assert.equal(state.sends, false);
  assert.equal(Rch.starterFor(0), "Just checking in, hope you're okay.");
  assert.equal(Rch.starterFor(1), "I've been thinking about you. I miss us.");
  assert.equal(Rch.starterFor(2), "I'm sorry for my part. No pressure to reply.");
  state = Rch.screen(state, "no-reply");
  assert.match(state.lines.join(" "), /fought for connection/);
  assert.match(state.lines.join(" "), /Silence isn't always a verdict/);
  const entry = Rch.courageEntry("I've been thinking about you.", "2026-11-10T18:00:00.000Z");
  assert.equal(entry.type, "courage");
  assert.equal(Rch.courageEntry("  "), null);
});

test("Listening mode keeps a single line and skips the extra invitations", () => {
  const state = Rch.start("listen");
  assert.equal(state.lines.length, 2);
  assert.match(state.lines[1], /Pause here/);
  const safe = Rch.screen(Rch.screen(state, "continue"), "safe");
  assert.equal(safe.scripture.length, 0);
  assert.equal(safe.lines.length, 3);
  const note = Rch.screen(safe, "continue");
  assert.equal(note.lines.length, 2);
});

test("the reel shows saved items once, and starters only when nothing is saved", () => {
  const items = Rch.memories(
    [{ type: "story", text: "Kept a story", note: "A baker rested.", at: "2026-11-10T12:00:00.000Z" }, { type: "courage", text: "Reached toward someone", note: "I wrote first." }],
    [{ text: "A stranger held the door." }]
  );
  assert.equal(items.length, 3);
  const shown = Rch.reel(items, { seen: false, asked: false, mode: "open" });
  assert.equal(shown.show, true);
  assert.equal(shown.cards[0].own, true);
  assert.equal(Rch.reel(items, { seen: true, asked: false }).show, false);
  assert.equal(Rch.reel(items, { seen: true, asked: true }).show, true);
  const empty = Rch.reel([], { seen: false, asked: true, mode: "open" });
  assert.equal(empty.cards[0].own, false);
  assert.equal(empty.cards[0].text, Rch.PARAMS.madeTogether[0]);
  const last = Rch.reelCard(empty, empty.cards.length - 1);
  assert.match(last.card.text, /thankful/);
  assert.match(last.card.text, /fortress of being right/);
  const listen = Rch.reel([], { seen: false, asked: true, mode: "listen" });
  assert.doesNotMatch(listen.cards[listen.cards.length - 1].text, /fortress of being right/);
  const harm = Rch.reel(items, { text: "I want to die", asked: true });
  assert.equal(harm.safety, true);
  assert.match(harm.line, /988/);
  const suite = fs.readFileSync(path.join(__dirname, "../ariel/suite/index.html"), "utf8");
  const file = fs.readFileSync(path.join(__dirname, "../ariel/suite/reach.js"), "utf8");
  assert.match(suite, /id="reach-open"/);
  assert.match(suite, /id="reel-open"/);
  assert.match(suite, /id="spiral-reach"/);
  assert.match(suite, /id="reel-not"/);
  assert.match(file, /Ryan designed these paths/);
  assert.match(file, /===== PARAMS =====/);
  assert.match(file, /===== EQUATIONS =====/);
  assert.match(file, /Reis, H\. T\., & Shaver/);
  assert.match(file, /Gottman/);
  assert.match(file, /Rusbult/);
});

console.log(`\n${passed} passed`);
