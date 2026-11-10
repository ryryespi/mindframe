// Run: node tests/void.test.js
// Out of the Void: words from marks, a gate that is not a grade, a story at the end.
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const V = require("../ariel/suite/void.js");
const Story = require("../ariel/suite/story.js");

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}

function circle() {
  return { kind: "circle", color: "#2dd4bf", t: 1, points: [{ x: 20, y: 20 }, { x: 70, y: 20 }] };
}
function line(i) {
  return { kind: "line", color: "#cbd5e1", t: i, points: [{ x: i * 24, y: 8 }, { x: i * 24 + 36, y: 90 }] };
}

test("the gate is the void-state width, and the words are not a grade", () => {
  assert.equal(V.width({ P: 1, A: 0 }), 1);
  assert.ok(Math.abs(V.width({ P: 1, A: 1 }) - 0.4) < 1e-9);
  assert.equal(V.width({ P: 0, A: 1 }), 0);
  assert.equal(V.gateWord(V.width(V.blank())), "The gate is narrow.");
  assert.doesNotMatch(V.gateWord(0.2) + V.gateWord(0.9), /score|grade|points/i);
  const file = fs.readFileSync(path.join(__dirname, "../ariel/suite/void.js"), "utf8");
  assert.match(file, /Ryan designed this/);
  assert.match(file, /===== PARAMS =====/);
  assert.match(file, /===== EQUATIONS =====/);
  assert.match(file, /1 − kA · A/);
});

test("the same circle always reveals the same gift, and a line can reveal a skill or a barrier", () => {
  const a = V.reveal(circle());
  const b = V.reveal(circle());
  assert.equal(a.kind, "affirmation");
  assert.equal(a.word, b.word);
  assert.equal(a.seed, Story.seedOf([circle()]));
  assert.ok(V.PARAMS.affirmations.indexOf(a.word) >= 0);
  let barrier = null;
  for (let i = 0; i < 40 && !barrier; i++) {
    const token = V.reveal(line(i + 3));
    if (token.kind === "barrier") barrier = token;
  }
  assert.ok(barrier, "a line sometimes names a barrier");
  assert.ok(barrier.choices.length >= 2 && barrier.choices.length <= 3);
  const best = V.PARAMS.counters[barrier.word][0];
  assert.ok(barrier.choices.indexOf(best) >= 0);
  assert.notEqual(V.reveal(line(2)).seed, a.seed);
});

test("every choice helps, the mapped skill helps more, and gifts raise confidence", () => {
  let state = V.blank();
  const before = state.P;
  const gift = V.reveal(circle());
  state = V.take(state, gift).state;
  assert.ok(state.P > before);
  assert.equal(state.bag.length, 1);
  let barrier = null;
  let mark = null;
  for (let i = 0; i < 40 && !barrier; i++) {
    mark = line(i + 9);
    const token = V.reveal(mark);
    if (token.kind === "barrier") barrier = token;
  }
  state = V.take(state, barrier).state;
  assert.equal(state.pending.word, barrier.word);
  assert.equal(state.bag.length, 1);
  const soft = V.choose(state, "Pros and Cons").state;
  const again = V.take(V.blank(), gift).state;
  const held = V.take(again, barrier).state;
  const best = V.PARAMS.counters[barrier.word][0];
  const strong = V.choose(held, best).state;
  assert.ok(soft.P > state.P - 0.02);
  assert.ok(strong.P > soft.P);
  assert.ok(strong.A < held.A);
  assert.equal(strong.bag[strong.bag.length - 1].kind, "skill");
});

test("enough words open the gate, memories flood, and Listening only offers rest", () => {
  let state = V.blank();
  const affirm = { seed: 1, kind: "affirmation", word: "grace" };
  const skill = { seed: 2, kind: "skill", word: "STOP" };
  [11, 12, 13].forEach(seed => { state = V.take(state, { seed: seed, kind: "affirmation", word: "enough" }).state; });
  state = V.take(state, { seed: 3, kind: "affirmation", word: "belonging" }).state;
  state = V.take(state, skill).state;
  state = V.take(state, { seed: 4, kind: "affirmation", word: "rest" }).state;
  assert.equal(state.bag.length >= V.PARAMS.need, true);
  assert.equal(state.open, true);
  assert.match(V.sentence(state), /You're out\. Nothing more to prove\./);
  const face = V.present(state, "open");
  assert.equal(face.offers[0], "Tell me a story from your words");
  assert.ok(face.offers.indexOf("Rest here") >= 0);
  assert.ok(face.offers.indexOf("Keep this") >= 0);
  const quiet = V.present(state, "listen");
  assert.deepEqual(quiet.offers, ["Rest here"]);
  assert.match(quiet.lines.join(" "), /Pause here/);
  const empty = V.flood([]);
  assert.equal(empty[0], V.PARAMS.starters[0]);
  const story = Story.tell(V.bagMarks(state), { tone: "gentle" });
  assert.equal(story.show, true);
  assert.equal(Story.tell(V.bagMarks(state), { tone: "gentle" }).text, story.text);
  let run = V.blank();
  for (let n = 0; n < V.PARAMS.heavyBarriers; n++) {
    run = V.take(run, { seed: 50 + n, kind: "barrier", word: "withdraw", choices: ["Opposite Action", "STOP"] }).state;
  }
  assert.equal(run.heavy, true);
  assert.equal(V.present(run, "open").heavyLine, "This seems heavy. Want to pause or talk to someone?");
  const suite = fs.readFileSync(path.join(__dirname, "../ariel/suite/index.html"), "utf8");
  assert.match(suite, /Out of the Void/);
  assert.match(suite, /id="free-draw"/);
  assert.match(suite, /id="void-how"/);
  assert.match(suite, /id="story-tell"/);
  assert.match(suite, /call or text <strong>988<\/strong>/);
});

console.log(`\n${passed} passed`);
