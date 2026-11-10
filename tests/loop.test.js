// Run: node tests/loop.test.js
// Grandiose loop: detect the fight, offer grace, and stop for the safety door.
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

function stroke(points) { return { points: points }; }

const fight = "I will prove everyone is incompetent. This is sabotage. I am not stopping until they admit they were wrong. I will tear down what they built.";
const hot = [
  stroke([{ x: 0, y: 0, t: 0 }, { x: 60, y: 60, t: 20 }, { x: 120, y: 120, t: 40 }]),
  stroke([{ x: 0, y: 120, t: 0 }, { x: 60, y: 60, t: 20 }, { x: 120, y: 0, t: 40 }])
];
const energetic = [
  stroke([{ x: 0, y: 0, t: 0 }, { x: 90, y: 0, t: 20 }]),
  stroke([{ x: 0, y: 80, t: 0 }, { x: 90, y: 80, t: 20 }])
];

test("the fight loop triggers, and a calm energetic drawing does not", () => {
  const reading = G.assess({ text: fight, strokes: hot, threat: 0.9, now: 1000 });
  assert.equal(reading.trigger, true);
  assert.equal(reading.safety, false);
  assert.ok(reading.A >= G.PARAMS.AHigh);
  assert.ok(reading.S >= G.PARAMS.SHigh);
  assert.ok(reading.f >= G.PARAMS.fHigh);
  assert.ok(reading.P <= G.PARAMS.PLow);
  assert.equal(reading.mobilized, true);
  const calm = G.assess({ text: "I am drawing quickly because this idea feels alive", strokes: energetic, threat: 0.2, now: 1000 });
  assert.equal(calm.trigger, false);
  assert.equal(calm.ordinary, true);
  assert.equal(calm.mobilized, false);
  const wordsOnly = G.assess({ text: fight, strokes: [], threat: 0, now: 1000 });
  assert.equal(wordsOnly.strongText, true);
  assert.equal(wordsOnly.trigger, true);
});

test("the sequence advances from the weight, to rest, to Enough", () => {
  const reading = G.assess({ text: fight, strokes: hot, threat: 0.9, now: 1000 });
  let state = G.begin(reading, "open");
  assert.equal(state.turn, 1);
  assert.match(state.lines[0], /immense weight to carry/);
  state = G.advance(state, { text: fight + " They are still incompetent." });
  assert.equal(state.turn, 2);
  assert.equal(state.lines.length, 2);
  assert.match(state.lines[1], /set the ledger down/);
  assert.doesNotMatch(state.lines.join(" "), /dead-end loop/);
  state = G.advance(state, { text: "If I stop fighting, they win" });
  assert.equal(state.turn, 3);
  assert.equal(state.simplify, true);
  assert.match(state.lines[0], /already safe here/);
  state = G.advance(state, { text: "I am so tired" });
  assert.equal(state.turn, 4);
  assert.equal(state.enough, true);
  assert.match(state.lines[0], /Enough state/);
  const back = G.advance(state, { text: "", choice: "keep" });
  assert.equal(back.steppedBack, true);
  assert.equal(back.aside, "That's okay. I'm here if you want me.");
  assert.equal(back.enough, false);
});

test("Listening mode keeps only the first turn and the pause", () => {
  const reading = G.assess({ text: fight, strokes: hot, threat: 0.9, now: 1000 });
  const state = G.begin(reading, "listen");
  assert.equal(state.turn, 1);
  assert.equal(state.invite, false);
  assert.match(state.lines.join(" "), /Pause here/);
  assert.doesNotMatch(state.lines.join(" "), /Want to let them rest|set the ledger down/);
  const stayed = G.advance(state, { text: fight, mode: "listen" });
  assert.equal(stayed.turn, 1);
  assert.equal(stayed.invite, false);
});

test("the safety door replaces the script", () => {
  const reading = G.assess({ text: "I want to die. There is no point.", strokes: hot, threat: 0.2, now: 1000 });
  assert.equal(reading.safety, true);
  assert.equal(reading.trigger, false);
  const state = G.begin(reading, "open");
  assert.equal(state.safety, true);
  assert.match(state.safetyLine, /call or text 988/);
  assert.match(state.safetyLine, /911/);
  assert.match(state.trusted, /trust/);
  assert.equal(state.lines.length, 0);
  const mid = G.begin(G.assess({ text: fight, strokes: hot, now: 1000 }), "open");
  const stopped = G.advance(mid, { text: "I will hurt them and make them pay" });
  assert.equal(stopped.safety, true);
  assert.doesNotMatch(stopped.safetyLine, /incompetent|sabotage/);
});

test("simplifying the canvas is reversible and does not delete the work", () => {
  const layers = [{ vis: 0, dots: [{ x: 1 }] }, { vis: 1, dots: [{ x: 2 }] }];
  const before = JSON.stringify(layers);
  const view = G.simplify(layers);
  assert.equal(JSON.stringify(layers), before);
  assert.equal(view.deleted, false);
  assert.equal(view.simplified, true);
  assert.equal(view.focus, 0);
  assert.deepEqual(view.before, [0, 1]);
  const back = G.restore(view);
  assert.equal(back.simplified, false);
  assert.equal(back.deleted, false);
  assert.deepEqual(back.before, [0, 1]);
  const shell = fs.readFileSync(path.join(__dirname, "../ariel/shell.js"), "utf8");
  const suite = fs.readFileSync(path.join(__dirname, "../ariel/suite/index.html"), "utf8");
  const docs = fs.readFileSync(path.join(__dirname, "../ariel/DOCS.md"), "utf8");
  assert.match(shell, /ariel-simplify/);
  assert.match(shell, /drawGraceLine/);
  assert.doesNotMatch(shell.split("ariel-simplify")[1].slice(0, 180), /splice|layers\.pop|delete /);
  assert.match(suite, /id="grace-rest"/);
  assert.match(suite, /id="grace-keep"/);
  assert.match(suite, /One clean line/);
  assert.match(docs, /Why this works/);
  assert.match(docs, /conceptual, not validated science/);
});

console.log(`\n${passed} passed`);
