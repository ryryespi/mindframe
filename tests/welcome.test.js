// Run: node tests/welcome.test.js
// Six gifts: receive first, never graded, scripture only when faith-aware.
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const W = require("../ariel/suite/welcome.js");

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}

test("first open is the welcome, and a local flag keeps it from returning", () => {
  assert.equal(W.shouldOpen(null), true);
  assert.equal(W.shouldOpen(""), true);
  assert.equal(W.shouldOpen("1"), false);
  const open = W.view(W.start({}));
  assert.equal(open.lines[0], "You're here. Before you do anything, there are some things that are already yours to receive.");
  assert.equal(open.graded, false);
});

test("the six gifts come one at a time, and scripture waits for faith-aware", () => {
  let state = W.next(W.start({ faith: false }));
  const lines = [];
  while (W.view(state).kind === "gift") {
    const card = W.view(state);
    lines.push(card.lines[0]);
    assert.equal(card.scripture, null);
    assert.equal(card.graded, false);
    state = W.next(state);
  }
  assert.deepEqual(lines, W.PARAMS.gifts.map(gift => gift.line));
  assert.match(lines[0], /loved and enough/);
  assert.match(lines[5], /Something new is always possible/);
  const faith = W.view(W.next(W.start({ faith: true })));
  assert.equal(faith.scripture.ref, "Ephesians 2:8");
  assert.match(faith.scripture.verse, /by grace you have been saved/);
  const end = W.view(state);
  assert.equal(end.end, true);
  assert.match(end.lines[0], /We love because we were first loved/);
  assert.equal(end.lines.length, 1);
  const faithEnd = W.view({ index: 6, faith: true, listening: false });
  assert.equal(faithEnd.lines[1], "1 John 4:19");
});

test("Next stores nothing, and I receive this may keep a tiny record", () => {
  const state = W.next(W.start({}));
  const stepped = W.next(state);
  assert.equal(W.view(stepped).id, "belonging");
  const got = W.receive(state);
  assert.equal(got.entry.text, "Received: grace");
  assert.equal(got.entry.type, "gift");
  assert.equal(got.entry.key, "gift:grace");
  assert.equal(W.view(got.state).id, "belonging");
  const opening = W.receive(W.start({}));
  assert.equal(opening.entry, null);
});

test("Listening mode is one line and the pause, without scripture", () => {
  const open = W.view(W.start({ faith: true, mode: "listen" }));
  assert.match(open.lines[1], /Pause here/);
  const gift = W.view(W.next(W.start({ faith: true, mode: "listen" })));
  assert.equal(gift.scripture, null);
  assert.match(gift.lines[1], /Pause here/);
  const file = fs.readFileSync(path.join(__dirname, "../ariel/suite/welcome.js"), "utf8");
  const suite = fs.readFileSync(path.join(__dirname, "../ariel/suite/index.html"), "utf8");
  assert.match(file, /Ryan designed this welcome/);
  assert.match(file, /===== PARAMS =====/);
  assert.match(file, /===== EQUATIONS =====/);
  assert.match(suite, /id="gifts-open"/);
  assert.match(suite, /Six gifts/);
  assert.match(suite, /id="welcome-skip"/);
  assert.match(suite, /I receive this/);
  assert.match(suite, /Look around/);
  assert.match(suite, /Rest here/);
  assert.match(suite, /call or text <strong>988<\/strong>/);
});

console.log(`\n${passed} passed`);
