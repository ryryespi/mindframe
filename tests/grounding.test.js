// Run: node tests/grounding.test.js   (no dependencies)
const assert = require("node:assert/strict");
const G = require("../js/grounding.js");

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

// ---------- Update rule: G_next = clamp01(G + eta*r*(1 + H - M)/2) ----------
test("worked example: G .5, M .65, H .8, r +1 -> .615", () => near(G.updateG(0.5, 0.65, 0.8, 1), 0.615));
test("default eta is 0.2", () => assert.equal(G.ETA, 0.2));
test("r = 0 leaves G unchanged", () => near(G.updateG(0.4, 0.9, 0.1, 0), 0.4));
test("r = -1 example: G .5, M .2, H .8 -> .34", () => near(G.updateG(0.5, 0.2, 0.8, -1), 0.34));
test("edge case: M 1, H 0 gives a zero-size step", () => near(G.updateG(0.5, 1, 0, 1), 0.5));
test("direction always follows r across a grid of G, M, H", () => {
  const vals = [0, 0.05, 0.25, 0.5, 0.75, 0.95, 1];
  for (const g of vals) for (const m of vals) for (const h of vals) {
    const up = G.updateG(g, m, h, 1), down = G.updateG(g, m, h, -1), same = G.updateG(g, m, h, 0);
    assert.ok(up >= g, `r=+1 lowered G: g=${g} m=${m} h=${h}`);
    assert.ok(down <= g, `r=-1 raised G: g=${g} m=${m} h=${h}`);
    near(same, g);
    if (m < 1 || h > 0) {
      if (g < 1) assert.ok(up > g, `r=+1 did not raise G: g=${g} m=${m} h=${h}`);
      if (g > 0) assert.ok(down < g, `r=-1 did not lower G: g=${g} m=${m} h=${h}`);
    }
  }
});
test("r = +1 with the mirage gripping harder still raises G", () => near(G.updateG(0.5, 0.8, 0.3, 1), 0.55));
test("r = -1 with the mirage gripping harder still lowers G", () => near(G.updateG(0.5, 0.8, 0.3, -1), 0.45));
test("custom eta", () => near(G.updateG(0.5, 0, 1, 1, 0.5), 1));
test("clamps at 1", () => assert.equal(G.updateG(0.95, 0, 1, 1), 1));
test("clamps at 0", () => assert.equal(G.updateG(0.05, 0, 1, -1), 0));
test("bad inputs are clamped, never NaN", () => {
  near(G.updateG(NaN, 0, 1, 1), 0.2);
  near(G.updateG(2, -1, 5, 1), 1);
});
test("repeated real choices move G up and stay in range", () => {
  let g = 0.3;
  for (let i = 0; i < 50; i++) g = G.updateG(g, 0.6, 0.9, 1);
  assert.equal(g, 1);
});

// ---------- Crisis gating ----------
const crisisLines = ["I want to end it all", "I want to die", "thinking about suicide", "I might hurt myself", "I am cursed and want to kill myself"];
crisisLines.forEach(line => test(`crisis gate: "${line}" returns only {crisis:true}`, () => {
  const r = G.read(line);
  assert.deepEqual(r, { crisis: true });
  assert.equal(G.isCrisis(line), true);
}));
test("ordinary heavy thought is not a crisis", () => assert.equal(G.read("I am cursed").crisis, false));

// ---------- How the guide reads a thought ----------
test("curse language -> hidden-meaning story, prayer offered", () => {
  const r = G.read("I'm cursed and nothing will ever change");
  assert.equal(r.patterns[0], "meaning");
  assert.ok(r.patterns.includes("allOrNothing"));
  assert.ok(r.actions[0].startsWith("Pray"));
  assert.ok(r.reframes.length >= 2 && r.reframes.length <= 3);
  assert.ok(r.suggestedM >= 0.6);
});
test("'cousin' or 'designer' does not count as a sign/sin", () => {
  assert.deepEqual(G.read("My cousin is a designer").patterns, []);
});
test("mind reading gets a mind-reading question", () => {
  assert.match(G.read("They probably think I am a loser").question, /actually say or do/);
});
test("fortune telling picks the prediction question", () => {
  assert.match(G.read("I will never get better").question, /predicting/);
});
test("absolute word becomes a 'big word' reframe", () => {
  assert.match(G.read("No one cares").reframes[0], /^"No one" is a big word/);
});
test("plain thought: low M, generic question, 2 reframes", () => {
  const r = G.read("work was fine today");
  assert.equal(r.suggestedM, 0.3);
  assert.equal(r.reframes.length, 2);
});
test("suggested M stays within 0.2..0.9", () => {
  const r = G.read("I'm cursed, doomed, punished, everyone always hates me, I'll never win, it's a disaster");
  assert.ok(r.suggestedM <= 0.9 && r.suggestedM >= 0.2);
});

// ---------- History, 7-day trend, low streak ----------
const day = n => new Date(2026, 9, 10 + n, 9).getTime();
test("currentG starts at 0.5 and follows the log", () => {
  assert.equal(G.currentG({}), 0.5);
  assert.equal(G.currentG(G.record({}, { G: 0.7 }, day(0))), 0.7);
});
test("daily keeps the last G of each day", () => {
  let s = G.record({}, { G: 0.4 }, day(0));
  s = G.record(s, { G: 0.6 }, day(0) + 3600e3);
  assert.deepEqual(G.daily(s), [{ day: "2026-10-10", G: 0.6 }]);
});
test("last7 returns 7 days with nulls for gaps", () => {
  const s = G.record({}, { G: 0.4 }, day(5));
  const w = G.last7(s, day(6));
  assert.equal(w.length, 7);
  assert.equal(w[5].G, 0.4);
  assert.equal(w[6].G, null);
});
test("3 consecutive low days -> check-in note", () => {
  let s = {};
  [0.2, 0.25, 0.1].forEach((g, i) => { s = G.record(s, { G: g }, day(i)); });
  assert.equal(G.lowStreak(s), 3);
  assert.equal(G.needsCheckIn(s), true);
});
test("a gap day breaks the streak", () => {
  let s = {};
  s = G.record(s, { G: 0.2 }, day(0));
  s = G.record(s, { G: 0.2 }, day(2));
  s = G.record(s, { G: 0.2 }, day(3));
  assert.equal(G.lowStreak(s), 2);
  assert.equal(G.needsCheckIn(s), false);
});
test("a recovered latest day clears the note", () => {
  let s = {};
  [0.2, 0.2, 0.2, 0.5].forEach((g, i) => { s = G.record(s, { G: g }, day(i)); });
  assert.equal(G.needsCheckIn(s), false);
});

console.log(`\n${passed} passed${process.exitCode ? ", some failed" : ""}`);
