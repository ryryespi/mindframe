// Run: node tests/onepage.test.js   (no dependencies)
// The whole model on one page (core/master.js header, README): recompute
//   (1) e  = clip01(e₋ ⊕ n(text) + X(1 − S)·w)
//   (2) e' = clip01(e + a(e)(h − e) + b·s(e))
//   (3) P  = P_d(e)(1 − γC)(1 − δG), lever = argmax ΔP_i, step = practice(lever)
// from those lines alone (only the word reader n(text), the conflict finder and λ
// are borrowed) and check that master() gives exactly the same numbers.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const M = require("./mf.js");
const K = require("../js/core/kai.js");
const PR = require("../js/features/practices.js");

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}
const { read } = require("./resolve.js");
const r2 = x => Math.round(x * 100) / 100;
const clip = x => Math.min(1, Math.max(0, x));
const GROUND = ["calm", "connection", "hope"];
const isG = n => GROUND.includes(n);
const TEXTS = [
  "My coworkers criticized me in front of everyone, I want to snap back but I know they're stressed",
  "Everyone judged me and I feel small",
  "My boss yelled at me and called me useless. I took a deep breath. I hear you, I see it differently.",
  "I'm so angry and jealous of my brother, I feel far from God and lazy",
  "I keep replaying what I said and I feel sick with worry",
  "I feel calm and close to my friends",
  "",
];

/** Line (1): ⊕ then the Kai term, from the documented formulas. */
function line1(text, state, session = {}) {
  const words = M.fromText(text);
  const N = M.NAMES;
  const plus = state.e.map((b, i) => (isG(N[i]) ? r2(clip(b + words.w.pos[N[i]] * (1 - b) - words.w.neg[N[i]] * b)) : r2(1 - (1 - b) * (1 - words.w.e[i]))));
  const data = words.data || {};
  const G = Math.max(data.grand ? data.grand.g : 0, data.small ? data.small.u : 0);
  const c = data.kai || { kX: 0, X: 0, kA: 0, kF: 0, kE: 0, kR: 0, kUrge: 0, attack: 0 };
  const cue = k => r2(1 - Math.exp(-0.7 * k)), cap = x => Math.min(0.95, Math.max(0, x)), sv = v => (session[v] ? 0.5 : 0);
  const A = r2(cap((1 - G) * (1 - (1 - cue(c.kA)) * (1 - sv("A")))));
  const F = r2(cap(1 - (1 - cue(c.kF)) * (1 - sv("F")) * (1 - (data.kaiPickF || 0))));
  const E = r2(cap(1 - (1 - cue(c.kE)) * (1 - sv("E"))));
  const R = r2(cap((1 - c.attack) * (1 - (1 - cue(c.kR)) * (1 - sv("R")))));
  const S = r2(1 - (1 - A) * (1 - F) * (1 - E) * (1 - R));
  const X = r2(Math.max(c.X, data.kaiPickX || 0));
  const w = { anger: 0.8, shame: 0.6, fear: 0.4 };
  const e = X > 0 ? plus.map((x, j) => r2(clip(x + r2(X * (1 - S) * (w[N[j]] || 0))))) : plus;
  return { e, X, S, A, F, E, R, words };
}
/** Line (2): the step, from the documented a(e), b and s(e). */
function line2(e, state, lam) {
  const h = state.home, V = state.vars, Wm = M.weights(state.w), N = M.NAMES;
  const d = Math.sqrt(e.reduce((s, x, i) => s + (x - h[i]) ** 2, 0));
  const unstable = lam !== null && lam > 0;
  let a = Math.min(V.aMax, V.aBase + V.k * d);
  if (unstable) a = Math.min(a, M.FIXED.aCap);
  const b = unstable ? M.FIXED.bU : V.b;
  const s = N.map((n, j) => (isG(n) || e[j] <= h[j] ? 0 : e[j] * N.reduce((acc, g, i) => acc + (isG(g) ? Math.min(0, Wm[i][j]) * h[i] : 0), 0)));
  return e.map((x, j) => r2(clip(x + a * (h[j] - x) + b * s[j])));
}

test("(1) the reading: e = clip01(e₋ ⊕ n(text) + X(1 − S)·w) equals master's e (to the cent), with and without the Kai term", () => {
  const st = M.defaultState();
  let withX = 0;
  TEXTS.forEach(t => {
    const one = line1(t, st), m = M.master(t, st);
    assert.deepEqual(m.e, one.e, t);
    if (one.X > 0) { withX += 1; assert.equal(m.kai.X, one.X); assert.equal(m.kai.S, one.S); }
  });
  assert.equal(withX, 3, "three texts carry outside hurt");
  // With session virtues (F and E practised) the shield is larger, so the push is smaller.
  const t = TEXTS[1], s = { ...st, session: { F: 1, E: 1 } };
  assert.deepEqual(M.master(t, s).e, line1(t, st, { F: 1, E: 1 }).e);
});
test("(2) the step: e' = clip01(e + a(e)(h − e) + b·s(e)) equals master's next", () => {
  const st = M.defaultState();
  TEXTS.forEach(t => {
    const m = M.master(t, st);
    assert.deepEqual(m.next, line2(m.e, st, m.lambda), t);
  });
  // A non-default state: changed home, vars and a session.
  const s2 = { ...M.defaultState(), session: { A: 1 } };
  s2.e = s2.home.map((x, i) => (isG(M.NAMES[i]) ? 0.3 : 0.4));
  const m2 = M.master(TEXTS[0], s2);
  assert.deepEqual(m2.e, line1(TEXTS[0], s2, { A: 1 }).e);
  assert.deepEqual(m2.next, line2(m2.e, s2, m2.lambda));
});
test("(3) peace and the step: P = P_d(1 − γC)(1 − δG); lever = argmax ΔP; step = practice(lever)", () => {
  const st = M.defaultState(), V = st.vars, h = st.home;
  TEXTS.filter(Boolean).forEach(t => {
    const m = M.master(t, st), data = M.fromText(t).data || {};
    const G = Math.max(data.grand ? data.grand.g : 0, data.small ? data.small.u : 0);
    const d = Math.sqrt(m.e.reduce((s, x, i) => s + (x - h[i]) ** 2, 0));
    const C = (m.conflicts || []).reduce((x, c) => Math.max(x, c.c), 0);
    const P = (1 / (1 + (d / V.d0) ** 2)) * (1 - V.gamma * C) * (1 - V.delta * G);
    assert.equal(m.peace.P, r2(P), t);
    // ΔP_i for e_i moved 0.05 toward h_i (conflicts recomputed at the moved point).
    const rawAt = e => { const dd = Math.sqrt(e.reduce((s, x, i) => s + (x - h[i]) ** 2, 0)); const CC = M.conflicts(e, data.clashes || []).reduce((x, c) => Math.max(x, c.c), 0); return (1 / (1 + (dd / V.d0) ** 2)) * (1 - V.gamma * CC) * (1 - V.delta * G); };
    const base = rawAt(m.e);
    const gains = m.e.map((x, i) => { const gap = h[i] - x; if (Math.abs(gap) < 1e-9) return 0; const e2 = m.e.slice(); e2[i] = x + Math.sign(gap) * Math.min(0.05, Math.abs(gap)); return rawAt(e2) - base; });
    let best = -1; gains.forEach((x, i) => { if (x > 1e-9 && (best < 0 || x > gains[best] + 1e-12)) best = i; });
    assert.equal(m.peace.lever.name, best < 0 ? null : M.NAMES[best], t);
    assert.deepEqual(m.practice, PR.pick(m), "step = practice(lever)");
  });
});
test("the documented form is the same in master.js, Ada's panel and the README", () => {
  const src = read("js/core/master.js"), rd = read("README.md");
  assert.match(src, /\(1\) e  = clip01\( e₋ ⊕ n\(text\) \+ X·\(1 − S\)·w \)/);
  assert.match(src, /\(2\) e' = clip01\( e \+ a\(e\)·\(h − e\) \+ b·s\(e\) \)/);
  assert.match(src, /\(3\) P  = P_d\(e\)·\(1 − γ·C\)·\(1 − δ·G\);  lever = argmax_i ΔP_i;  step = practice\(lever\)/);
  assert.equal(M.ONE_PAGE.length, 4);
  assert.match(M.mathLines(M.defaultState(), M.master(TEXTS[0], M.defaultState())).slice(0, 4).join("\n"), /^\(1\) e = clip01[\s\S]*\(4\) words = compose/);
  assert.match(rd, /## The whole model on one page/);
  assert.match(rd, /\(1\) e  = clip01\(e₋ ⊕ n\(text\) \+ X·\(1 − S\)·w\)/);
  assert.match(rd, /\(2\) e' = clip01\(e \+ a\(e\)·\(h − e\) \+ b·s\(e\)\)/);
});
test("no behavior change without outside hurt: X = 0 leaves e exactly e₋ ⊕ n(text); the fixed point and P = 1 at home are unchanged", () => {
  const st = M.defaultState();
  ["I'm angry", "I keep replaying it", "I feel sad and exhausted and I keep avoiding everyone", "I criticized him and I feel bad"].forEach(t => {
    const m = M.master(t, st);
    assert.ok(!m.kai || m.kai.X === 0, t);
    assert.deepEqual(m.e, M.combine(st.e, M.fromText(t).w), t);
  });
  const m = M.master(TEXTS[0], st);
  assert.ok(m.peace.solve.converged);
  m.peace.solve.eStar.forEach((x, i) => assert.ok(Math.abs(x - st.home[i]) <= 0.03, "e* = h (within rounding)"));
});
test("determinism: the same text, state and session always give the same reading", () => {
  const st = { ...M.defaultState(), session: { F: 1 } };
  TEXTS.forEach(t => {
    const a = JSON.stringify(M.master(t, st, { now: 0 })), b = JSON.stringify(M.master(t, st, { now: 0 }));
    assert.equal(a, b, t);
  });
  assert.ok(!/Math\.random|Date\.now/.test(K.shield.toString() + K.cues.toString() + K.story.toString()));
});

console.log(`\n${passed} passed`);
