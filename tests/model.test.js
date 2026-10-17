// Run: node tests/model.test.js   (no dependencies)
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const M = require("../js/model.js");

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}
const I = n => M.NAMES.indexOf(n);
const live = text => {
  const s = M.defaultState();
  const r = M.fromText(text);
  if (r.crisis) return { crisis: true };
  const state = { ...s, e: M.combine(s.e, r.w) };
  return { state, m: M.metrics(state, { notes: r.notes, read: r.read }) };
};
const S1 = "I'm so angry and jealous of my brother, I feel far from God and lazy";
const S2 = "I'm ashamed and so alone, nobody cares";
const CRISIS = ["I want to end it all", "I want to die", "I might hurt myself"];

// ---------- the nine movers ----------
test("nine movers in three groups", () => {
  assert.deepEqual(M.NAMES, ["fear", "sadness", "anger", "shame", "calm", "connection", "hope", "rumination", "avoidance"]);
  assert.deepEqual(M.HARD, ["fear", "sadness", "anger", "shame"]);
  assert.deepEqual(M.GROUND, ["calm", "connection", "hope"]);
  assert.deepEqual(M.PROCESS, ["rumination", "avoidance"]);
  assert.equal(M.label("avoidance"), "avoidance/fusion");
  assert.equal(M.label("fear"), "fear/anxiety");
  assert.equal(M.VERSION, 2);
});

// ---------- lexicon ----------
test("lexicon: each word family reaches its mover", () => {
  const cases = [
    ["I'm terrified and anxious", "fear"], ["I feel so sad and empty", "sadness"], ["I'm furious with him", "anger"],
    ["I'm ashamed of myself", "shame"], ["I feel guilty", "shame"], ["I keep replaying it over and over", "rumination"],
    ["I keep putting it off and avoiding it", "avoidance"], ["I'm jealous of her", "anger"],
  ];
  cases.forEach(([t, n]) => assert.ok(live(t).state.e[I(n)] >= 0.1, `${t} -> ${n}`));
});
test("lexicon: loneliness lowers connection, calm words raise calm, hopeless lowers hope", () => {
  assert.ok(live("I'm so alone, nobody cares").state.e[I("connection")] < 0.3);
  assert.ok(live("I feel calm and settled").state.e[I("calm")] > 0.6);
  assert.ok(live("It's hopeless").state.e[I("hope")] < 0.4);
});
test("lexicon: negation keeps a word from firing", () => {
  assert.ok(live("I'm not angry").state.e[I("anger")] < 0.1);
});
test("lexicon: neutral text moves nothing; empty text is empty", () => {
  const r = M.fromText("");
  assert.equal(r.empty, true);
  assert.deepEqual(M.combine(M.defaultState().e, r.w), M.defaultState().e);
  assert.equal(M.shown(live("I had toast for breakfast").state).length, 0);
});

// ---------- mapping (old concepts -> nine movers) ----------
test("mapping: loneliness -> low connection, guilt -> shame, joy -> hope/calm", () => {
  const v = M.mapOld({ loneliness: 0.8, guilt: 0.6, joy: 0.9 });
  assert.ok(v[I("connection")] <= 0.1);
  assert.equal(v[I("shame")], 0.6);
  assert.ok(v[I("hope")] >= 0.7 && v[I("calm")] >= 0.45);
});
test("mapping: ego g -> rumination; pride -> rumination + anger", () => {
  assert.ok(M.mapOld({}, { g: 0.65, target: 0.3 })[I("rumination")] > 0.4);
  assert.equal(M.mapOld({}, { g: 0.3, target: 0.3 })[I("rumination")], 0);
  const p = M.mapOld({}, { t: { pride: 1 } });
  assert.ok(p[I("rumination")] > 0 && p[I("anger")] > 0);
});
test("mapping: wrath -> anger, envy -> anger + shame, sloth -> sadness + avoidance, desolation -> sadness + low hope", () => {
  assert.ok(M.mapOld({}, { t: { wrath: 1 } })[I("anger")] >= 0.5);
  const e = M.mapOld({}, { t: { envy: 1 } });
  assert.ok(e[I("anger")] > 0 && e[I("shame")] > 0);
  const s = M.mapOld({}, { t: { sloth: 1 } });
  assert.ok(s[I("sadness")] > 0 && s[I("avoidance")] > 0);
  const d = M.mapOld({}, { desolation: 1 });
  assert.ok(d[I("sadness")] > 0 && d[I("hope")] < 0.5);
});
test("mapping: the old words in text land on the nine movers (envy, lazy, far from God)", () => {
  const { state } = live(S1);
  assert.ok(state.e[I("anger")] > 0.5, "angry + jealous -> anger");
  assert.ok(state.e[I("sadness")] > 0.3, "far from God (desolation) -> sadness");
  assert.ok(state.e[I("hope")] < 0.5, "desolation -> lower hope");
  assert.ok(state.e[I("avoidance")] > 0.2, "lazy (sloth) -> avoidance");
});

// ---------- dynamics ----------
test("dynamics: every step stays inside [0,1] from random starts", () => {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const W = M.weights();
  for (let k = 0; k < 200; k++) {
    let e = M.NAMES.map(() => rnd());
    for (let t = 0; t < 30; t++) {
      e = M.step(e, W, M.FIXED.dt, M.defaultVars().d);
      e.forEach(x => assert.ok(x >= 0 && x <= 1 && Number.isFinite(x)));
    }
  }
});
test("dynamics: grounding at the neutral 0.5 does not press on anything; at rest nothing moves", () => {
  const e = M.defaultState().e;
  assert.deepEqual(M.step(e, M.weights(), M.FIXED.dt, 0.3), e);
});
test("λ: null when nothing is active; equals ρ − d on the active block", () => {
  assert.equal(M.lambda(M.defaultState().e, M.weights(), 0.3), null);
  const e = M.defaultState().e.slice();
  e[I("sadness")] = 0.7; e[I("rumination")] = 0.7;
  const lam = M.lambda(e, M.weights(), 0.3);
  assert.ok(Math.abs(lam - (0.4 - 0.3)) < 1e-3, `sadness<->rumination 0.4/0.4 gives ρ = 0.4, λ = 0.1 (got ${lam})`);
  assert.ok(M.lambda(e, M.weights(), 0.6) < 0, "more decay settles");
});
test("ideal step reduces distance to home and never passes it", () => {
  [S1, S2, "I'm terrified it will all go wrong", "I keep replaying what I said"].forEach(t => {
    const { state, m } = live(t);
    assert.ok(m.ideal.dNext < m.ideal.d, t);
    m.ideal.next.forEach((x, i) => {
      const lo = Math.min(state.e[i], state.home[i]) - 1e-9, hi = Math.max(state.e[i], state.home[i]) + 1e-9;
      assert.ok(x >= lo && x <= hi, `${M.NAMES[i]} stays between e and h`);
    });
  });
});
test("ideal step stays small when the mix is unstable (λ > 0)", () => {
  const s = M.defaultState();
  s.e[I("sadness")] = 0.8; s.e[I("rumination")] = 0.8;
  const m = M.metrics(s);
  assert.ok(m.lambda > 0);
  assert.ok(m.ideal.a <= M.FIXED.aCap + 1e-9);
});
test("hidden: a mover that is quiet now can be shown rising", () => {
  const { m } = live(S2);
  assert.ok(m.hidden.length >= 1 && m.hidden[0].to > m.hidden[0].from);
});
test("recovery: finite estimate, reached, and accepting steps shrinks it", () => {
  const { state } = live(S1);
  const r = M.recovery(state);
  assert.equal(r.reached, true);
  assert.ok(r.steps > 0 && r.steps < M.MAX_SIM);
  let s = state;
  for (let k = 0; k < 3; k++) s = M.acceptStep(s, Date.parse("2026-10-17T09:00:00") + k * 1000);
  assert.ok(M.recovery(s).steps < r.steps);
  assert.equal(s.cps.length, 3);
  assert.equal(s.cps[2].label, "step-3");
  const home = { ...M.defaultState(), e: M.defaultState().home.slice() };
  assert.equal(M.recovery(home).steps, 0, "home is already reached");
});
test("variables: validated and kept in range; Reset defaults are the spec", () => {
  const v = M.validateVars({ aBase: 9, aMax: 0.01, b: -1, d: "x" });
  assert.equal(v.vars.aBase, 0.5);
  assert.ok(v.vars.aMax >= v.vars.aBase / 2);
  assert.equal(v.vars.b, 0);
  assert.equal(v.vars.d, 0.3);
  assert.ok(v.notes.length >= 3);
  assert.deepEqual(M.defaultVars(), { aBase: 0.2, aMax: 0.25, b: 0.1, d: 0.3 });
  assert.equal(M.MAIN_PAIRS.length, 7);
});

// ---------- the card ----------
test("card: movers, reading, reframe + test, skill, step, recovery", () => {
  [S1, S2].forEach(t => {
    const { state, m } = live(t);
    const c = M.card(state, m);
    assert.ok(c.movers.length >= 2);
    ["reading", "reframe", "test", "skill", "step", "recovery"].forEach(k => assert.ok(c[k] && c[k].length > 5, k));
    assert.ok(c.test.endsWith("?"));
    assert.match(c.step, /^e′ = e \+ [\d.]+·\(h − e\) \+ [\d.]+·s\(e\): d [\d.]+ → [\d.]+$/);
  });
  assert.match(M.card(live(S2).state, live(S2).m).reframe, /^"Nobody"/);
});
test("faith changes wording only, never the numbers", () => {
  [S1, S2, "I'm terrified", "I keep replaying it"].forEach(t => {
    const { state, m } = live(t);
    const off = M.lines(state, m), on = M.lines(state, m, { faith: true });
    assert.deepEqual(on.slice(0, off.length), off, "same lines with faith off");
    assert.equal(on.length, off.length + 1, "one extra faith line");
    assert.equal(M.serialize(state), M.serialize(state), "code unaffected");
  });
  const word = t => { const { state, m } = live(t); return M.card(state, m, { faith: true }).faith; };
  assert.match(word("I'm furious"), /patience/i);
  assert.match(word("I'm ashamed of myself"), /mercy/i);
  assert.match(word("I'm terrified"), /trust/i);
  assert.match(word("I feel so sad"), /hope/i);
  assert.match(word("I keep replaying it over and over"), /humility|let go/i);
});
test("story: guided by the ideal step, uses the stabilizer's creature, and finishes", () => {
  const a = live(S1), b = live(S2);
  const sa = M.story(a.state, a.m, { seed: 1 }), sb = M.story(b.state, b.m, { seed: 1 });
  assert.equal(sb.guide, "Tidelyn", "connection stabilizer -> Tidelyn");
  assert.ok(sa.text.includes("moved from") && sa.to < sa.from);
  assert.ok(/God|pray|Lord/i.test(M.story(a.state, a.m, { seed: 1, faith: true }).text));
  const home = { ...M.defaultState(), e: M.defaultState().home.slice() };
  assert.equal(M.story(home, M.metrics(home)), null, "nothing to tell at home");
});

// ---------- code language ----------
test("mf 2 exact round trip (state, weights, vars, days, checkpoints, ideal)", () => {
  let s = live(S1).state;
  s = M.setWeight(s, "calm", "fear", -0.7);
  s = { ...s, vars: { ...s.vars, aBase: 0.3 } };
  s = M.addCheckpoint(s, "start", Date.parse("2026-10-15T08:30:00"));
  s = M.acceptStep(s, Date.parse("2026-10-16T08:30:00"));
  s = M.refreshIdeal(s);
  const code = M.serialize(s);
  assert.match(code, /^mf 2\n/);
  const p = M.parse(code);
  assert.equal(p.ok, true);
  assert.equal(M.serialize(p.state), code);
  assert.deepEqual(p.state.e, s.e);
  assert.deepEqual(p.state.cps, s.cps);
  assert.deepEqual(p.state.days, s.days);
});
test("mf 2 code holds no user text", () => {
  const s = M.addCheckpoint(live(S1).state, "start", Date.parse("2026-10-15T08:30:00"));
  const code = M.serialize(s).toLowerCase();
  ["brother", "jealous", "god", "lazy", "angry"].forEach(w => assert.ok(!code.includes(w), w));
});
test("mf 1 import (best effort via the mapping)", () => {
  const old = [
    "mf 1",
    "home joy=0.60 hope=0.80 calm=0.80 connection=0.80",
    "e fear=0.20 sadness=0.60 guilt=0.50 loneliness=0.70",
    "ego g=0.65 target=0.30",
    "steps 8",
    "vars framework=default",
    "tendency wrath=0.60 sloth=0.40",
    "ignatian -0.45 c=0.00 d=0.50",
    "day 2026-10-10 fear=0.20 sadness=0.60 guilt=0.50 loneliness=0.70 g=0.65",
    "cp 1 2026-10-10T09:00 label=start fear=0.20 sadness=0.60 guilt=0.50 loneliness=0.70 g=0.65 lambda=0.15",
  ].join("\n");
  const p = M.parse(old);
  assert.equal(p.ok, true);
  assert.equal(p.from, 1);
  const e = p.state.e;
  assert.equal(e[I("shame")], 0.5, "guilt -> shame");
  assert.ok(e[I("connection")] <= 0.25, "loneliness -> low connection");
  assert.ok(e[I("rumination")] > 0.4, "ego g -> rumination");
  assert.ok(e[I("anger")] >= 0.3, "wrath -> anger");
  assert.ok(e[I("avoidance")] > 0, "sloth -> avoidance");
  assert.ok(e[I("sadness")] > 0.6, "desolation adds to sadness");
  assert.equal(p.state.cps.length, 1);
  assert.equal(p.state.days.length, 1);
  assert.ok(p.notes.length >= 2);
  assert.match(M.serialize(p.state), /^mf 2\n/, "saved back as mf 2");
});
test("friendly errors for bad code", () => {
  assert.equal(M.parse("").ok, false);
  assert.match(M.parse("hello").errors[0].msg, /mf 2/);
  assert.match(M.parse("mf 9").errors[0].msg, /versions 1 and 2/);
  const bad = M.parse("mf 2\ne fear=2");
  assert.equal(bad.ok, false);
});

// ---------- crisis gating ----------
for (const line of CRISIS) {
  test(`crisis: "${line}" computes nothing`, () => {
    assert.deepEqual(M.fromText(line), { crisis: true });
    assert.deepEqual(M.fromText(`${S1}. ${line}`), { crisis: true });
  });
}
test("crisis: a crisis label inside code is refused", () => {
  const p = M.parse("mf 2\ncp 1 2026-10-10T09:00 label=want-to-die");
  assert.equal(p.crisis, true);
  assert.equal(p.ok, false);
});

// ---------- one page ----------
test("single page: index has no tools links; tools.html only redirects; the service worker is v11", () => {
  const root = path.join(__dirname, "..");
  const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const tools = fs.readFileSync(path.join(root, "tools.html"), "utf8");
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  assert.ok(!/href="tools\.html/.test(index));
  assert.ok(/history\.replaceState/.test(index), "old ?view/?chip links are stripped");
  assert.ok(/location\.replace\("\.\/"\)/.test(tools) && /http-equiv="refresh"/.test(tools));
  assert.ok(!/<textarea|<script src/.test(tools), "tools.html is only a redirect");
  assert.match(sw, /mindframe-shell-v11/);
  const scripts = [...index.matchAll(/<script src="([^"]+)"/g)].map(x => x[1]);
  assert.deepEqual(scripts, ["js/analyzer.js", "js/grounding.js", "js/stories.js", "js/games.js", "js/model.js", "js/ui.js"]);
  scripts.forEach(s => assert.ok(sw.includes(`./${s}`), `${s} cached`));
  ["presets", "Compare", "Optimize", "Check-in", "Spot the mirage", "Rebuild"].forEach(w => assert.ok(!index.includes(w), `no ${w}`));
});

console.log(`\n${passed} passed`);
