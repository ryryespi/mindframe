// Run: node tests/peace.test.js   (no dependencies)
// Inner peace P (core/peace.js), the solve for e* and n* (core/master.js),
// the lever, the word bands, Hazel's trend, and the comfort prompt summary.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const M = require("./mf.js");
const P = require("../js/core/peace.js");
const R = require("../js/core/reality.js");
const C = require("../js/features/writer/comfort.js");

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}
const I = n => M.NAMES.indexOf(n);
const DIGIT = /[0-9]/;
const S1 = "I'm so angry and jealous of my brother, I feel far from God and lazy";
const GRAND = "Only I can fix this and nothing can stop me. I want to rest but I keep going over it.";
// A small seeded generator for random states (deterministic tests).
function rand(seed) { let x = seed >>> 0; return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; }; }
function randomState(r) {
  const s = M.defaultState();
  s.e = s.e.map(() => Math.round(r() * 100) / 100);
  return s;
}

test("P is in [0, 1] for random states, conflicts and g", () => {
  const r = rand(7);
  for (let k = 0; k < 300; k++) {
    const s = randomState(r), g = Math.round(r() * 100) / 100;
    const sc = P.score(s.e, s.home, s.vars, R.conflicts(s.e, r() < 0.3 ? ["wantBut"] : []), g);
    assert.ok(sc.P >= 0 && sc.P <= 1 && sc.raw >= 0 && sc.raw <= 1, JSON.stringify(sc));
  }
});
test("P is 1 at home and lower everywhere else", () => {
  const s = M.defaultState();
  assert.equal(P.score(s.home, s.home, s.vars, R.conflicts(s.home, []), 0).P, 1);
  const r = rand(11);
  for (let k = 0; k < 300; k++) {
    const x = randomState(r);
    if (M.distance(x.e, x.home) < 1e-9) continue;
    assert.ok(P.score(x.e, x.home, x.vars, R.conflicts(x.e, []), 0).raw < 1);
  }
  // Each factor lowers P: distance, the strongest conflict, grandiosity.
  const e = s.home.slice(); e[I("fear")] = 0.4;
  const base = P.score(e, s.home, s.vars, [], 0).raw;
  assert.ok(P.score(e, s.home, s.vars, [{ c: 0.7 }], 0).raw < base);
  assert.ok(P.score(e, s.home, s.vars, [], 0.6).raw < base);
  assert.equal(P.score(e, s.home, s.vars, [{ c: 0.5 }], 0).Pc, Math.round((1 - 0.3 * 0.5) * 100) / 100);
});
test("P formula: P_d = 1/(1 + (d/d0)²), and P_d = 0.8 at d = 0.3 with the defaults", () => {
  const s = M.defaultState(), e = s.home.slice();
  e[I("anger")] = 0.3;
  const sc = P.score(e, s.home, s.vars, [], 0);
  assert.equal(sc.Pd, 0.8);
  const m = M.master(S1, s);
  assert.equal(m.peace.P, Math.round(1 / (1 + (M.distance(m.e, s.home) / 0.6) ** 2) * 100) / 100);
});
test("convergence: the exact master map is a contraction to h for the defaults (and other settings)", () => {
  // Exact map (no rounding), written out from master's formula.
  const step = (st, e) => {
    const h = st.home, W = M.weights(st.w), V = st.vars;
    const d = M.distance(e, h), lam = M._parts.lambda(e, W, V.d);
    let a = Math.min(V.aMax, V.aBase + V.k * d);
    if (lam !== null && lam > 0) a = Math.min(a, M.FIXED.aCap);
    const b = lam !== null && lam > 0 ? M.FIXED.bU : V.b;
    const s = M._parts.sVec(e, h, W);
    return { next: e.map((x, j) => Math.min(1, Math.max(0, x + a * (h[j] - x) + b * s[j]))), a };
  };
  const r = rand(3);
  const settings = [M.defaultState(), { ...M.defaultState(), vars: { ...M.defaultVars(), aBase: 0.05, aMax: 0.05, b: 0.5 } }, M.setWeight(M.defaultState(), "calm", "fear", -1)];
  settings.forEach(st0 => {
    for (let k = 0; k < 60; k++) {
      let e = randomState(r).e;
      for (let t = 0; t < 400; t++) {
        const d0 = M.distance(e, st0.home), { next, a } = step(st0, e);
        const d1 = M.distance(next, st0.home);
        assert.ok(d1 <= (1 - a) * d0 + 1e-12, `contraction: ${d1} <= (1 - ${a})·${d0}`);
        assert.ok(a >= 0.05 - 1e-12);
        e = next;
      }
      assert.ok(M.distance(e, st0.home) < 1e-6, "converges to h");
    }
  });
});
test("convergence: the app's rounded iteration reaches a fixed point e* next to h, with P(e*) near 1", () => {
  const r = rand(5);
  for (let k = 0; k < 80; k++) {
    const st = randomState(r), m = M.master("", st);
    const sv = m.peace.solve;
    assert.equal(sv.converged, true);
    const again = M.master("", { ...st, e: sv.eStar }, { sim: false });
    assert.deepEqual(again.next, sv.eStar, "e* is a fixed point of the master map");
    const aLo = Math.min(st.vars.aBase, st.vars.aMax, M.FIXED.aCap);
    sv.eStar.forEach((x, j) => assert.ok(Math.abs(x - st.home[j]) <= 0.005 / aLo + 0.011, `|e*_j − h_j| small: ${x} vs ${st.home[j]}`));
    assert.ok(sv.PStar >= 0.95, `P(e*) = ${sv.PStar}`);
  }
});
test("n* matches a direct simulation of the master steps", () => {
  const texts = [S1, GRAND, "I'm ashamed and so alone, nobody cares", "I feel calm and close to my friends", "", "I keep replaying what I said"];
  texts.forEach(t => {
    const st = M.defaultState(), m = M.master(t, st);
    let n = m.peace.P >= P.P_STAR ? 0 : null, cur = { ...st, e: m.e };
    for (let k = 1; n === null && k <= M.MAX_SIM; k++) {
      cur = { ...cur, e: M.master("", cur, { sim: false }).next };
      if (M.master("", cur, { sim: false }).peace.P >= P.P_STAR) n = k;
    }
    assert.equal(m.peace.solve.n, n, t);
  });
  const home = { ...M.defaultState(), e: M.defaultState().home.slice() };
  assert.equal(M.master("", home).peace.solve.n, 0, "already at peace");
});
test("the lever matches a brute-force finite difference and drives the step", () => {
  [S1, GRAND, "I'm ashamed and so alone, nobody cares", "I'm terrified it will all go wrong", ""].forEach(t => {
    const st = M.defaultState(), m = M.master(t, st), h = st.home;
    const clashes = R.textConflicts(t), g = m.grand.g;
    const base = P.score(m.e, h, st.vars, R.conflicts(m.e, clashes), g).raw;
    let best = null, bestGain = 0;
    M.NAMES.forEach((n, i) => {
      const gap = h[i] - m.e[i];
      if (!gap) return;
      const e2 = m.e.slice(); e2[i] += Math.sign(gap) * Math.min(0.05, Math.abs(gap));
      const gain = P.score(e2, h, st.vars, R.conflicts(e2, clashes), g).raw - base;
      if (gain > bestGain + 1e-12) { bestGain = gain; best = n; }
    });
    assert.equal(m.peace.lever.name, best, t);
    const step = M.stepLine(m);
    assert.ok(step.includes(`can ${M.EASE[best][0]}`), step);
    // The gradient points the same way: moving the lever toward home raises P.
    const gi = m.peace.grad[I(best)], toward = Math.sign(h[I(best)] - m.e[I(best)]);
    assert.ok(gi * toward > 0, `gradient sign for ${best}`);
  });
  const home = { ...M.defaultState(), e: M.defaultState().home.slice() };
  assert.equal(M.master("", home).peace.lever.name, null);
});
test("word bands: a little < 0.4 ≤ growing < 0.6 ≤ close < 0.8 ≤ steady", () => {
  assert.equal(P.band(0), "a little"); assert.equal(P.band(0.39), "a little");
  assert.equal(P.band(0.4), "growing"); assert.equal(P.band(0.59), "growing");
  assert.equal(P.band(0.6), "close"); assert.equal(P.band(0.79), "close");
  assert.equal(P.band(0.8), "steady"); assert.equal(P.band(1), "steady");
});
test("card: inner peace and the path in words only, with the pull and grand thought's share", () => {
  const st = M.defaultState();
  const a = M.card(st, M.master(S1, st));
  assert.match(a.peace[0], /^Inner peace: a little(, for now\.|, and it can grow\.)$/);
  assert.equal(a.peace[1], "Path to peace: about five gentle steps; the biggest help right now is easing the anger.");
  const g = M.card(st, M.master(GRAND, st));
  assert.ok(g.peace.some(x => /^The hidden pull takes (some|a little) of your peace/.test(x)));
  assert.ok(g.peace.some(x => /^The grand thought takes (some|a little) too; seeing it at its true size/.test(x)));
  const calm = M.card(st, M.master("", { ...st, e: st.home.slice() }));
  assert.equal(calm.peace[0], "Inner peace: steady.");
  assert.match(calm.peace[1], /^Path to peace: you're there right now/);
  [a, g, calm].forEach(c => c.peace.forEach(x => assert.ok(!DIGIT.test(x), x)));
  assert.equal(M.lines(st, M.master(S1, st))[1], a.peace[0], "peace follows the room line");
});
test("faith: the peace verse appears only when on, and nothing else changes", () => {
  const st = M.defaultState(), m = M.master(S1, st);
  const off = M.card(st, m), on = M.card(st, m, { faith: true });
  assert.equal(off.peaceFaith, null);
  assert.match(on.peaceFaith, /peace of God, which surpasses all understanding/);
  assert.match(on.peaceFaith, /Philippians/);
  assert.deepEqual(on.peace, off.peace);
  assert.ok(!DIGIT.test(on.peaceFaith));
});
test("crisis: no peace score, only { crisis: true }", () => {
  ["I want to end it all", "I'm at peace now, I want to die"].forEach(t => assert.deepEqual(M.master(t, M.defaultState()), { crisis: true }));
  assert.deepEqual(M.peaceLines({ crisis: true }), []);
});
test("determinism: same state, same P, lever, n*, e* and words", () => {
  const st = M.defaultState();
  const a = M.master(GRAND, st, { now: 0 }), b = M.master(GRAND, st, { now: 0 });
  assert.deepEqual(a.peace, b.peace);
  assert.deepEqual(M.lines(st, a, { seed: 2 }), M.lines(st, b, { seed: 2 }));
});
test("variables: d0, γ, δ are adjustable, validated, and change P", () => {
  const v = M.validateVars({ d0: 9, gamma: -1, delta: 0.45 }).vars;
  assert.equal(v.d0, 2); assert.equal(v.gamma, 0); assert.equal(v.delta, 0.45);
  const st = M.defaultState(), wide = { ...st, vars: { ...st.vars, d0: 1.2 } };
  assert.ok(M.master(S1, wide).peace.P > M.master(S1, st).peace.P);
  const code = M.serialize({ ...st, vars: { ...st.vars, gamma: 0.5 } });
  assert.match(code, /vars gamma=0\.50/);
  assert.equal(M.parse(code).state.vars.gamma, 0.5);
});
test("Hazel: the peace trend across saved days, in words", () => {
  let st = M.defaultState();
  const day = d => Date.parse(`2026-10-${d}T09:00:00`);
  const s1 = { ...st, e: M.master(S1, st).e };
  st = M.addCheckpoint(s1, "start", day(14));
  st = M.addCheckpoint({ ...st, e: M.master("", st, { sim: false }).next }, "x", day(15));
  st = M.addCheckpoint({ ...st, e: st.home.slice() }, "y", day(16));
  const t = M.peaceTrend(st, day(16));
  assert.equal(t.length, 3);
  assert.ok(t[2].P > t[0].P);
  const line = M.peaceLine(st, day(16));
  assert.match(line, /^Inner peace across your saved days: from a little to steady, rising\.$/);
  assert.ok(!DIGIT.test(line));
  assert.equal(M.peaceLine(M.defaultState(), day(16)), null);
});
test("comfort prompt: includes the peace summary, still no raw text", () => {
  const st = M.defaultState(), m = M.master(GRAND, st);
  const p = C.buildPrompt(st, m, { raw: GRAND });
  assert.match(p, /Inner peace P: 0\.\d\d \((a little|growing|close|steady)\); steps until P >= 0\.80: \d+; biggest lever: easing avoidance/);
  assert.match(p, /- Inner peace: /);
  assert.match(p, /- Path to peace: /);
  assert.ok(!p.includes("Only I can fix this") && !/nothing can stop me/i.test(p));
});
test("README and code: citations, the proof sketch, and the model note", () => {
  const r = fs.readFileSync(path.join(__dirname, "../README.md"), "utf8");
  const src = fs.readFileSync(path.join(__dirname, "../js/core/peace.js"), "utf8") + fs.readFileSync(path.join(__dirname, "../js/core/master.js"), "utf8");
  [r, src].forEach(t => [/Desbordes/, /Kabat-Zinn/, /Lee, Lin,/, /Gross/, /contraction/].forEach(re => assert.match(t, re)));
  assert.match(r, /model, not validated science/i);
});

console.log(`\n${passed} passed`);
