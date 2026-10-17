// Run: node tests/psi.test.js   (no dependencies)
const assert = require("node:assert/strict");
const P = require("../js/psi.js");

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}
const near = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) < e, `${a} != ${b}`);

// ---------- Terms ----------
test("terms map each answer to 0..1 as in the paper", () => {
  const t = P.terms({ suds: 3, belong: 4, skills: "most", avoid: 2, believe: 40 });
  near(t.C, 0.7); near(t.S, 0.75); near(t.M, 0.67); near(t.R, 1 / 6); near(t.B, 0.4);
});
test("skills levels None/Some/Most/All = 0, .33, .67, 1", () => {
  assert.deepEqual(P.SKILL_LEVELS, { none: 0, some: 0.33, most: 0.67, all: 1 });
});
test("out-of-range answers are clamped", () => {
  const t = P.terms({ suds: 15, belong: 0, skills: 2, avoid: 9, believe: -5 });
  assert.deepEqual(t, { C: 0, S: 0, M: 1, R: 1, B: 0 });
});

// ---------- Ψ and score with research weights ----------
test("default weights are the research values", () => {
  assert.deepEqual({ ...P.DEFAULT_WEIGHTS }, { C: 0.18, S: 0.14, M: 0.12, R: 0.26, B: 0.31 });
});
test("Ψ = .18C + .14S + .12M − .26R − .31B", () => {
  const t = { C: 0.7, S: 0.75, M: 0.67, R: 1 / 6, B: 0.4 };
  near(P.psi(t), 0.18 * 0.7 + 0.14 * 0.75 + 0.12 * 0.67 - 0.26 / 6 - 0.31 * 0.4);
});
test("default score equals the paper's 100(Ψ+0.57)/1.01", () => {
  const t = P.terms({ suds: 3, belong: 4, skills: "most", avoid: 2, believe: 40 });
  assert.equal(P.score(t), Math.round((100 * (P.psi(t) + 0.57)) / 1.01));
  const b = P.bounds();
  near(b.min, -0.57); near(b.max, 0.44);
});
test("best day scores 100, worst day scores 0", () => {
  assert.equal(P.score({ C: 1, S: 1, M: 1, R: 0, B: 0 }), 100);
  assert.equal(P.score({ C: 0, S: 0, M: 0, R: 1, B: 1 }), 0);
});

// ---------- Custom weights ----------
test("custom weights change Ψ and normalization", () => {
  const w = { C: 0.5, S: 0, M: 0, R: 0.5, B: 0 };
  const t = { C: 0.8, S: 0.1, M: 0.1, R: 0.2, B: 0.9 };
  near(P.psi(t, w), 0.5 * 0.8 - 0.5 * 0.2);
  assert.equal(P.score(t, w), Math.round((100 * (0.3 + 0.5)) / 1.0));
});
test("score stays within 0..100 for random weights and answers", () => {
  let seed = 7;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 2000; i++) {
    const w = { C: r() * 0.5, S: r() * 0.5, M: r() * 0.5, R: r() * 0.5, B: r() * 0.5 };
    const t = { C: r(), S: r(), M: r(), R: r(), B: r() };
    const s = P.score(t, w);
    assert.ok(Number.isInteger(s) && s >= 0 && s <= 100, String(s));
  }
});
test("signs are fixed: a negative weight is used as its size", () => {
  const t = { C: 0.5, S: 0.5, M: 0.5, R: 0.8, B: 0.8 };
  near(P.psi(t, { C: -0.18, S: 0.14, M: 0.12, R: -0.26, B: -0.31 }), P.psi(t));
  // More avoidance or more believing the thought never raises the score.
  const w = { C: 0.2, S: 0.2, M: 0.2, R: 0.3, B: 0.3 };
  assert.ok(P.score({ ...t, R: 0.9 }, w) <= P.score({ ...t, R: 0.1 }, w));
  assert.ok(P.score({ ...t, B: 0.9 }, w) <= P.score({ ...t, B: 0.1 }, w));
  assert.ok(P.score({ ...t, C: 0.9 }, w) >= P.score({ ...t, C: 0.1 }, w));
});
test("all-zero weights give a neutral 50, missing weights fall back", () => {
  assert.equal(P.score({ C: 1, S: 1, M: 1, R: 0, B: 0 }, { C: 0, S: 0, M: 0, R: 0, B: 0 }), 50);
  assert.deepEqual(P.weights({ C: 0.3 }), { C: 0.3, S: 0.14, M: 0.12, R: 0.26, B: 0.31 });
});

// ---------- Next skill ----------
const mid = { C: 0.9, S: 0.9, M: 0.9, R: 0.1, B: 0.1 };
test("low C -> paced breathing (TIPP), Mistfawn", () => {
  const s = P.nextSkill({ ...mid, C: 0.2 });
  assert.equal(s.term, "C"); assert.match(s.name, /TIPP/); assert.equal(s.creature, "Mistfawn");
});
test("low S -> reach out", () => assert.equal(P.nextSkill({ ...mid, S: 0.1 }).name, "Reach out"));
test("low M -> one planned skill", () => assert.equal(P.nextSkill({ ...mid, M: 0 }).term, "M"));
test("high R -> Opposite Action", () => assert.equal(P.nextSkill({ ...mid, R: 0.9 }).name, "Opposite Action"));
test("high B -> Check the Facts, Lumowl", () => {
  const s = P.nextSkill({ ...mid, B: 0.95 });
  assert.equal(s.name, "Check the Facts"); assert.equal(s.creature, "Lumowl");
});
test("weakest is relative to its own best value, not its weight", () => {
  // C at 0.4 (goodness .4) vs B at 0.5 (goodness .5): C is weaker even though B weighs more.
  assert.equal(P.nextSkill({ C: 0.4, S: 1, M: 1, R: 0, B: 0.5 }).term, "C");
});
test("ties go to the heavier weight; zero-weight terms are skipped", () => {
  assert.equal(P.nextSkill({ C: 0.5, S: 1, M: 1, R: 0, B: 0.5 }).term, "B");
  assert.equal(P.nextSkill({ C: 0.5, S: 1, M: 1, R: 0, B: 0.5 }, { B: 0 }).term, "C");
});
test("a steady day gets 'keep going'", () => assert.equal(P.nextSkill(mid).term, null));

// ---------- History ----------
const at = (d, h = 9) => new Date(2026, 9, d, h).getTime();
test("one entry per day, last one wins, numbers only", () => {
  let s = P.record({}, { suds: 8, belong: 2, skills: "none", avoid: 6, believe: 80, skill: "C" }, at(10, 8));
  s = P.record(s, { suds: 3, belong: 4, skills: "most", avoid: 2, believe: 30, skill: "B" }, at(10, 20));
  s = P.record(s, { suds: 5, belong: 3, skills: "some", avoid: 4, believe: 50 }, at(11));
  assert.equal(s.log.length, 2);
  assert.equal(s.log[0].suds, 3);
  assert.equal(s.log[0].skill, "B");
  s.log.forEach(e => Object.entries(e).forEach(([k, v]) => assert.ok(["day", "skills", "skill"].includes(k) || typeof v === "number", k)));
});
test("low score streak: 3 consecutive days under 30", () => {
  const days = [{ day: "2026-10-10", value: 25 }, { day: "2026-10-11", value: 20 }, { day: "2026-10-12", value: 29 }];
  assert.equal(P.lowStreak(days), 3);
  assert.equal(P.lowStreak([...days, { day: "2026-10-13", value: 40 }]), 0);
  assert.equal(P.lowStreak([days[0], days[2]]), 1);
});

// ---------- Weekly reflection ----------
const now = at(17, 12);
const checkins = [11, 12, 13, 14, 15, 16, 17].map((d, i) => ({ day: `2026-10-${d}`, score: 40 + i * 5, skill: i < 4 ? "B" : "C" }));
const ground = [
  { day: "2026-10-12", G: 0.4, patterns: ["meaning", "allOrNothing"] },
  { day: "2026-10-14", G: 0.6, patterns: ["allOrNothing"] },
  { day: "2026-10-03", G: 0.1, patterns: ["labeling", "labeling", "labeling"] }, // outside the week
];
const labels = { meaning: "Hidden-meaning story", allOrNothing: "Absolute words", labeling: "A harsh label" };
test("weekly summary: averages, top pattern name, top skill name, last 7 days only", () => {
  const s = P.weeklySummary({ checkins, ground, now, labels });
  assert.equal(s.avgScore, 55);
  assert.equal(s.avgG, 50);
  assert.equal(s.pattern, "Absolute words");
  assert.equal(s.skill, "Check the Facts");
  assert.equal(s.days, 7);
});
test("weekly summary with no data returns nulls", () => {
  assert.deepEqual(P.weeklySummary({ now }), { avgScore: null, avgG: null, pattern: null, skill: null, days: 0 });
});
test("weekly due: needs 7+ data days, then every 7 days", () => {
  assert.equal(P.weeklyDue({ checkins: checkins.slice(0, 6), now }), false);
  assert.equal(P.weeklyDue({ checkins, now }), true);
  assert.equal(P.weeklyDue({ checkins, now, lastWeekly: "2026-10-13" }), false);
  assert.equal(P.weeklyDue({ checkins, now, lastWeekly: "2026-10-10" }), true);
  // Ground days count toward the 7 too.
  assert.equal(P.weeklyDue({ checkins: checkins.slice(0, 5), ground, now }), false); // 6 distinct days
  assert.equal(P.weeklyDue({ checkins: checkins.slice(0, 6), ground, now }), true); // 7 distinct days
});

console.log(`\n${passed} passed${process.exitCode ? ", some failed" : ""}`);
