// Run: node tests/checkin.test.js
// Rest check-in: one question at a time, never graded, notes only when kept.
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const G = require("../ariel/suite/grace.js");

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}

const Q = G.PARAMS.questions;

test("the five questions are Ryan's, in order, and nothing is graded", () => {
  assert.equal(Q.length, 5);
  assert.match(Q[0], /lazy right now/);
  assert.match(Q[1], /actually in an emergency/);
  assert.match(Q[2], /ledger/);
  assert.match(Q[3], /sheer friction/);
  assert.match(Q[4], /calm clarity/);
  const state = G.startCheckIn({ text: "hello", idleMs: 0, mode: "open" });
  assert.equal(state.question, Q[0]);
  assert.equal(state.graded, false);
  assert.equal(state.prompt, true);
  const guide = fs.readFileSync(path.join(__dirname, "../ariel/suite/grace.js"), "utf8");
  assert.match(guide, /Ryan's words/);
});

test("a recent fight loop leads with the ledger and the friction", () => {
  const state = G.startCheckIn({ loopRecent: true, text: "I feel lazy and can't start", idleMs: 0, mode: "open" });
  assert.deepEqual(state.order.slice(0, 2), [2, 3]);
  assert.equal(state.question, Q[2]);
  const next = G.nextQuestion(state);
  assert.equal(next.question, Q[3]);
  assert.equal(next.graded, false);
  assert.ok(!next.answer);
});

test("freeze language or a long quiet leads with the first question", () => {
  const words = G.startCheckIn({ text: "I feel lazy and can't start. I'm stuck.", idleMs: 0, mode: "open" });
  assert.equal(words.frozen, true);
  assert.equal(words.question, Q[0]);
  const quiet = G.startCheckIn({ text: "", idleMs: G.PARAMS.idleMs, mode: "open" });
  assert.equal(quiet.frozen, true);
  assert.equal(quiet.question, Q[0]);
  const busy = G.startCheckIn({ text: "drawing a line", idleMs: 1000, mode: "open" });
  assert.equal(busy.frozen, false);
  assert.equal(busy.question, Q[0]);
});

test("next walks one question at a time, and This is me shows the affirmations", () => {
  let state = G.startCheckIn({ text: "", idleMs: 0, mode: "open" });
  const seen = [state.question];
  while (!state.done) {
    state = G.nextQuestion(state);
    if (state.question) seen.push(state.question);
  }
  assert.deepEqual(seen, Q);
  assert.equal(state.done, true);
  assert.deepEqual(state.affirmations, G.PARAMS.affirmations);
  assert.match(state.affirmations[0], /not lazy/);
  assert.match(state.affirmations[1], /not transactions/);
  const mid = G.resonate(G.startCheckIn({ mode: "open" }));
  assert.deepEqual(mid.affirmations, G.PARAMS.affirmations);
  assert.equal(mid.graded, false);
  const empty = G.checkInNote("   ");
  assert.equal(empty, null);
  const kept = G.checkInNote("The ledger was about being enough.");
  assert.equal(kept.type, "note");
  assert.equal(kept.note, "The ledger was about being enough.");
  assert.doesNotMatch(kept.note, /Am I actually lazy/);
});

test("Listening mode asks one question and does not prompt an affirmation", () => {
  const state = G.startCheckIn({ text: "", idleMs: 0, mode: "listen" });
  assert.equal(state.prompt, false);
  assert.equal(state.listening, true);
  assert.equal(state.question, Q[0]);
  const resonated = G.resonate(state);
  assert.deepEqual(resonated.affirmations, []);
  let done = state;
  while (!done.done) done = G.nextQuestion(done);
  assert.deepEqual(done.affirmations, []);
  assert.equal(G.PARAMS.trap.belief.indexOf("If I can just win this argument") >= 0, true);
  assert.equal(G.PARAMS.trap.reply, "That peace can't be won. It's already given. Nothing more to prove.");
  const suite = fs.readFileSync(path.join(__dirname, "../ariel/suite/index.html"), "utf8");
  assert.match(suite, /CHECK IN/);
  assert.match(suite, /NAME THE TRAP/);
  assert.match(suite, /id="checkin-next"/);
  assert.match(suite, /id="checkin-me"/);
  assert.match(suite, /Nothing is saved until you keep it/);
});

console.log(`\n${passed} passed`);
