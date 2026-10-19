// Run: node tests/model.test.js   (no dependencies)
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const M = require("./mf.js");

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}
const I = n => M.NAMES.indexOf(n);
// Everything goes through the master function.
const live = (text, base = M.defaultState()) => {
  const m = M.master(text, base);
  if (m.crisis) return { crisis: true };
  return { state: { ...base, e: m.e }, m, base };
};
const DIGIT = /[0-9]/;
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
  assert.equal(M.VERSION, 4);
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
  assert.equal(M.shown(live("I had toast for breakfast").state.e).length, 0);
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
test("dynamics (the left-alone projection inside master): every step stays inside [0,1]", () => {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const W = M.weights();
  for (let k = 0; k < 200; k++) {
    let e = M.NAMES.map(() => rnd());
    for (let t = 0; t < 30; t++) {
      e = M._parts.step(e, W, M.FIXED.dt, M.defaultVars().d);
      e.forEach(x => assert.ok(x >= 0 && x <= 1 && Number.isFinite(x)));
    }
  }
});
test("dynamics: grounding at the neutral 0.5 does not press on anything; at rest nothing moves", () => {
  const e = M.defaultState().e;
  assert.deepEqual(M._parts.step(e, M.weights(), M.FIXED.dt, 0.3), e);
});
test("λ: null when nothing is active; equals ρ − d on the active block", () => {
  const L = M._parts.lambda;
  assert.equal(L(M.defaultState().e, M.weights(), 0.3), null);
  const e = M.defaultState().e.slice();
  e[I("sadness")] = 0.7; e[I("rumination")] = 0.7;
  const lam = L(e, M.weights(), 0.3);
  assert.ok(Math.abs(lam - (0.4 - 0.3)) < 1e-3, `sadness<->rumination 0.4/0.4 gives ρ = 0.4, λ = 0.1 (got ${lam})`);
  assert.ok(L(e, M.weights(), 0.6) < 0, "more decay settles");
});

// ---------- the master function ----------
// step = act(clip01(e + a(e)(h − e) + b s(e))), a(e) = min(a_max, a0 + k‖e − h‖), capped at a_cap when λ > 0.
function formula(state, text) {
  const e = M.combine(state.e, M.fromText(text).w);
  const h = state.home, W = M.weights(state.w), V = state.vars;
  const dist = Math.hypot(...e.map((x, i) => x - h[i]));
  const lam = M._parts.lambda(e, W, V.d);
  let a = Math.min(V.aMax, V.aBase + V.k * dist);
  if (lam !== null && lam > 0) a = Math.min(a, M.FIXED.aCap);
  const b = lam !== null && lam > 0 ? M.FIXED.bU : V.b;
  const s = M.NAMES.map((n, j) => (M.GROUND.includes(n) || e[j] <= h[j] ? 0 : e[j] * M.GROUND.reduce((acc, g) => acc + Math.min(0, W[I(g)][j]) * h[I(g)], 0)));
  const next = e.map((x, j) => Math.round(Math.min(1, Math.max(0, x + a * (h[j] - x) + b * s[j])) * 100) / 100);
  return { e, a, b, s, next, d: dist };
}
test("master: equals the formula for many thoughts and states", () => {
  const unstable = M.defaultState();
  unstable.e[I("sadness")] = 0.8; unstable.e[I("rumination")] = 0.8;
  const tuned = { ...M.setWeight(M.defaultState(), "calm", "fear", -0.8), vars: { ...M.defaultVars(), aBase: 0.35, aMax: 0.4, b: 0.3 } };
  const texts = [S1, S2, "", "I'm terrified it will all go wrong", "I keep replaying what I said", "I feel calm and close to my friends"];
  [M.defaultState(), unstable, tuned].forEach(st => texts.forEach(t => {
    const m = M.master(t, st), f = formula(st, t);
    assert.deepEqual(m.e, f.e);
    assert.equal(m.a, f.a);
    assert.equal(m.b, f.b);
    assert.deepEqual(m.s, f.s);
    assert.deepEqual(m.next, f.next);
    assert.equal(m.d, Math.round(f.d * 100) / 100);
    assert.equal(m.action, M.SKILL[m.mover] || m.action, "act() turns the step into the mover's action");
  }));
});
test("master: a(e) grows with distance and is capped at a_cap when λ > 0", () => {
  const near = M.master("I'm a bit worried", M.defaultState()), far = M.master(S1, M.defaultState());
  assert.ok(far.a >= near.a);
  assert.ok(far.a <= M.defaultVars().aMax);
  const s = M.defaultState();
  s.e[I("sadness")] = 0.8; s.e[I("rumination")] = 0.8;
  const m = M.master("", s);
  assert.ok(m.lambda > 0 && m.unstable);
  assert.ok(m.a <= M.FIXED.aCap + 1e-12);
  assert.equal(m.b, M.FIXED.bU);
});
test("master: the step reduces distance to home and stays in [0,1]", () => {
  [S1, S2, "I'm terrified it will all go wrong", "I keep replaying what I said"].forEach(t => {
    const { m } = live(t);
    assert.ok(m.dNext < m.d, t);
    m.next.forEach(x => assert.ok(x >= 0 && x <= 1));
  });
});
test("master: baseline is B_t = 0.8·B_{t−1} + 0.2·e_t", () => {
  const s = { ...M.defaultState(), days: [{ day: "2026-10-10", e: M.defaultState().e.map(() => 0.2) }, { day: "2026-10-11", e: M.defaultState().e.map(() => 0.4) }] };
  const m = M.master(S2, s, { now: Date.parse("2026-10-17T10:00:00") });
  const Bprev = s.days[0].e.map((x, i) => 0.8 * x + 0.2 * s.days[1].e[i]);
  assert.deepEqual(m.B, Bprev.map((x, i) => Math.round((0.8 * x + 0.2 * m.e[i]) * 100) / 100));
  assert.ok(m.baseline.dPrev !== null);
});
test("master: crisis text returns only { crisis: true }", () => {
  ["I want to end it all", "I want to die", `${S1}. I might hurt myself`].forEach(t => assert.deepEqual(M.master(t, M.defaultState()), { crisis: true }));
});
test("routing: every feature calls master (live, story, game, checkpoint, accept, recovery, baseline, import, restore)", () => {
  const count = fn => { const before = M.calls.master; fn(); return M.calls.master - before; };
  const { state, m } = live(S1);
  assert.ok(count(() => M.master(S1, M.defaultState(), { sim: false })) === 1, "live output: one master call");
  assert.ok(count(() => M.master(S1, M.defaultState())) >= 1, "live output with recovery");
  assert.ok(count(() => M.story(state, M.master("", state), { seed: 1 })) >= 1, "story");
  assert.deepEqual(M.story(state, m, { seed: 1 }).next, m.next, "the story is driven by the master step");
  assert.ok(count(() => M.game(state, M.master("", state), { seed: 1 })) >= 1, "path game");
  assert.ok(count(() => M.addCheckpoint(state, "start", Date.parse("2026-10-16T09:00:00"))) >= 1, "checkpoint");
  assert.ok(count(() => M.acceptStep(state, Date.parse("2026-10-16T09:00:00"))) >= 1, "accept step");
  const r = count(() => M.recovery(state));
  assert.ok(r >= m.recovery.steps, "recovery repeats the master step");
  assert.ok(count(() => assert.equal(M.master("", { ...state, days: [{ day: "2026-10-10", e: state.e }] }, { sim: false }).baseline.days, 1)) >= 1, "baseline");
  const code = M.serialize(M.addCheckpoint(state, "start", Date.parse("2026-10-16T09:00:00")));
  assert.ok(count(() => M.refreshIdeal(M.parse(code).state)) >= 1, "import restore");
  assert.ok(count(() => M.restore(M.parse(code).state, 1)) >= 1, "checkpoint restore");
  assert.ok(count(() => M.parse("mf 1\ne sadness=0.60")) >= 1, "mf 1 import");
});
test("routing: accept step lands exactly on master's next; recovery counts master steps", () => {
  const { state } = live(S2);
  const m = M.master("", state);
  const after = M.acceptStep(state, Date.parse("2026-10-16T09:00:00"));
  assert.deepEqual(after.e, m.next);
  let cur = state, n = 0;
  while (M.distance(cur.e, cur.home) >= M.FIXED.eps && n < 200) { cur = { ...cur, e: M.master("", cur, { sim: false }).next }; n++; }
  assert.equal(M.recovery(state).steps, n);
});
test("routing: no other code path steps e (the old ideal/simulate are gone)", () => {
  ["ideal", "simulate", "step", "lambda", "hidden"].forEach(k => assert.equal(M[k], undefined, k));
  const read = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
  const outside = ["js/app.js", "js/features/historian.js", "js/features/writer/writer.js", "js/features/writer/comfort.js", "js/features/analyzer.js", "js/features/scribe.js", "js/features/scientist.js", "js/features/relationship.js", "js/features/forgiveness.js", "js/features/practices.js"];
  outside.forEach(f => assert.ok(!/\bcombine\(|\bfromText\([^)]*\)\.w|_parts/.test(read(f)), `${f} does not compute steps itself`));
  assert.ok(/\bmaster\(\$\("input"\)\.value/.test(read("js/app.js")), "the app calls the master function on Update");
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
  assert.deepEqual(M.defaultVars(), { aBase: 0.2, k: 0.05, aMax: 0.25, b: 0.1, d: 0.3, d0: 0.6, gamma: 0.3, delta: 0.3 });
  assert.equal(M.MAIN_PAIRS.length, 7);
});

// ---------- the words-first card ----------
test("band words: < 0.3 a little, 0.3–0.6 quite, > 0.6 strongly; the band picks the degree word", () => {
  assert.equal(M.band(0.1), "a little");
  assert.equal(M.band(0.29), "a little");
  assert.equal(M.band(0.3), "quite");
  assert.equal(M.band(0.6), "quite");
  assert.equal(M.band(0.61), "strongly");
  const s = M.defaultState();
  s.e[I("anger")] = 0.86; s.e[I("sadness")] = 0.45; s.e[I("fear")] = 0.15;
  assert.match(M.feelingLine(M.master("", s)), /^You may be feeling (strongly|deeply) angry, (quite|fairly) sad, and (a little|slightly) anxious\.$/);
  const low = M.defaultState(); low.e[I("connection")] = 0.04;
  assert.match(M.feelingLine(M.master("", low)), /^You may be feeling (strongly|deeply) alone\.$/);
  assert.match(M.feelingLine(M.master("", M.defaultState())), /Nothing strong/);
});
test("feelings list at most three, strongest first", () => {
  const s = M.defaultState();
  ["fear", "sadness", "anger", "shame", "rumination"].forEach((n, k) => { s.e[I(n)] = 0.3 + 0.1 * k; });
  const f = M.felt(M.master("", s).e);
  assert.deepEqual(f.map(x => x.n), ["rumination", "shame", "anger"]);
});
test("link sentences: verb from the sign and strength of W, softener from the stabilizer", () => {
  const { state, m } = live(S2);
  const c = M.connectLines(state, m);
  assert.match(c[0], /^When the shame is (strong|loud), it (wears down|drains|dims|chips away at|can dim|can wear on) your connection; connection (softens|eases|can soften|takes the edge off|can ease a little) it\.$/);
  assert.ok(c.includes("These feelings tend to ease on their own."));
  assert.ok(c.some(x => /^If this stays unspoken, sadness may (creep in|slip in|grow|rise)\.$/.test(x)));
  const a = live(S1);
  assert.match(M.connectLines(a.state, a.m)[0], /^When the anger is (strong|loud), it (fuels|feeds|stirs up|adds to|nudges up|can add a little to) the replaying; slowing down .+ it\.$/);
  const u = M.defaultState();
  u.e[I("sadness")] = 0.8; u.e[I("rumination")] = 0.8;
  assert.ok(M.connectLines(u, M.master("", u)).some(x => /^These feelings are (building on|feeding) each other right now, so go gently\.$/.test(x)));
  const low = M.defaultState(); low.e[I("connection")] = 0.1;
  assert.match(M.connectLines(low, M.master("", low))[0], /^When you feel alone, .+ grow more easily; reaching toward one person .+ it\.$/);
  // The verb follows the coupling strength: a strong link and a weak link use different verb sets.
  assert.equal(M.strength(0.6), "strong"); assert.equal(M.strength(-0.35), "mid"); assert.equal(M.strength(0.1), "weak");
  const strong = M.setWeight(M.defaultState(), "anger", "rumination", 0.9), weak = M.setWeight(M.defaultState(), "anger", "rumination", 0.1);
  [strong, weak].forEach(x => { x.e[I("anger")] = 0.8; });
  const vs = M.connectLines(strong, M.master("", strong))[0], vw = M.connectLines(weak, M.master("", weak))[0];
  assert.ok(M.LINK_VERB.up.strong.some(v => vs.includes(` ${v} the replaying`)), vs);
  assert.ok(!M.LINK_VERB.up.strong.some(v => vw.includes(` ${v} the replaying`)), vw);
});
test("composer: same state and seed give the same words; different numbers give different words", () => {
  const { state, m } = live(S1);
  assert.deepEqual(M.lines(state, m, { seed: 1 }), M.lines(state, m, { seed: 1 }));
  assert.deepEqual(M.card(state, m, { seed: 4, faith: true }), M.card(state, m, { seed: 4, faith: true }));
  const texts = [S1, S2, "I'm terrified it will all go wrong", "I keep replaying what I said", "I feel calm and close to my friends", "I hope it goes well but I'm scared"];
  const cards = texts.map(t => { const r = live(t); return M.lines(r.state, r.m, { seed: 1 }).join("\n"); });
  assert.equal(new Set(cards).size, texts.length, "every reading reads differently");
  // Only the numbers change: the same mover at two intensities gets different words.
  const s1 = M.defaultState(), s2 = M.defaultState();
  s1.e = s1.home.slice(); s2.e = s2.home.slice();
  s1.e[I("anger")] = 0.2; s2.e[I("anger")] = 0.72; // strongly, below the cold-water reset (\u2265 0.75 with low peace)
  const c1 = M.card(s1, M.master("", s1)), c2 = M.card(s2, M.master("", s2));
  assert.notEqual(c1.feeling, c2.feeling);
  assert.notEqual(c1.step, c2.step, "the dose follows d");
  assert.notDeepEqual(c1.affirmations, c2.affirmations, "the stance follows the band");
  assert.match(c1.step, /two minutes/);
  assert.match(c2.step, /five minutes|ten minutes/);
});
test("composer: the step is the mover's technique sized by d, and why from the step's gain", () => {
  ["anger", "shame", "fear", "sadness", "rumination", "avoidance"].forEach(n => {
    const s = M.defaultState(); s.e[I(n)] = 0.7;
    const m = M.master("", s);
    assert.equal(m.mover, n);
    const st = M.stepLine(m);
    assert.ok(st.includes(`can ${M.EASE[n][0]}`), st);
    assert.ok(!DIGIT.test(st));
  });
});
test("affirmations: composed from the reading, deterministic by seed, first person, no promises", () => {
  ["anger", "shame", "fear", "sadness", "rumination", "avoidance", "calm", "connection", "hope"].forEach(n => {
    const s = M.defaultState();
    if (M.GROUND.includes(n)) s.e[I(n)] = 0.1; else s.e[I(n)] = 0.7;
    const m = M.master("", s);
    assert.equal(m.mover, n, `${n} moves most toward home`);
    for (let seed = 1; seed <= 10; seed++) {
      const a1 = M.affirmations(m, { seed }), a2 = M.affirmations(m, { seed });
      assert.deepEqual(a1, a2, "same seed, same affirmations");
      assert.ok(a1.length >= 2 && a1.length <= 3);
      assert.ok(a1[0].includes(M.ACT[n]), `the first one carries ${n}'s action: ${a1[0]}`);
      assert.ok(a1[1].includes(m.positives[0].word), "the second names the top positive emotion");
      a1.forEach(x => {
        assert.ok(/^(I|Even|Part|There|This|Some|Fear|Sadness|Anger|Shame|The|Avoiding|Restlessness|Loneliness|Discouragement)\b/.test(x), `first person / grounded: ${x}`);
        assert.ok(!/\b(everything will be|always be fine|never feel|just be happy|perfect|good vibes)\b/i.test(x), x);
        assert.ok(!DIGIT.test(x));
      });
    }
    const seen = new Set();
    for (let seed = 1; seed <= 20; seed++) seen.add(M.affirmations(m, { seed }).join("|"));
    assert.ok(seen.size > 1, "seeds vary the choice");
  });
});
test("faith adds exactly one affirmation and changes nothing else", () => {
  [S1, S2, "I'm terrified", "I keep replaying it"].forEach(t => {
    const { state, m } = live(t);
    const off = M.card(state, m, { seed: 3 }), on = M.card(state, m, { seed: 3, faith: true });
    assert.equal(on.affirmations.length, off.affirmations.length + 1);
    assert.deepEqual(on.affirmations.slice(0, -1), off.affirmations);
    assert.match(on.affirmations[on.affirmations.length - 1], /God/);
    ["room", "feeling", "connect", "conflict", "reality", "step", "progress"].forEach(k => assert.deepEqual(on[k], off[k]));
  });
});
test("default output has no digits (cards for many thoughts, faith on and off)", () => {
  const texts = [S1, S2, "", "I'm terrified it will all go wrong", "I keep replaying what I said", "I feel calm", "It's hopeless", "I'm furious at my boss", "I keep putting it off"];
  texts.forEach(t => [false, true].forEach(faith => {
    const { state, m } = live(t);
    const text = M.lines(state, m, { faith, seed: 2 }).join("\n");
    assert.ok(!DIGIT.test(text), `digits in: ${text}`);
  }));
  const s = { ...live(S1).state, days: [{ day: "2026-10-10", e: M.defaultState().e }] };
  assert.ok(!DIGIT.test(M.lines(s, M.master("", s)).join(" ")));
  assert.ok(M.weekLines(s, Date.parse("2026-10-12T10:00:00")).every(l => !DIGIT.test(l)));
});
test("progress in words from the baseline and recovery", () => {
  const { state, m } = live(S1);
  assert.match(M.progressLine(m), /first check-in/);
  const better = { ...state, days: [{ day: "2026-10-10", e: state.e }] };
  const m2 = M.master("", { ...better, e: M.master("", better).next }, { now: Date.parse("2026-10-17T10:00:00") });
  assert.match(M.progressLine(m2), /closer to steady than your recent days/);
});
test("Show the math: numbers and the master equation are there when asked", () => {
  const { state, m } = live(S1);
  const L = M.mathLines(state, m).join("\n");
  assert.match(L, /step = act\(clip01\(e \+ a\(e\)·\(h − e\) \+ b·s\(e\)\)\)/);
  assert.match(L, /a\(e\) = min\(a_max, a0 \+ k‖e − h‖\) = min\(0\.25, 0\.20 \+ 0\.05·1\.36\) = 0\.25/);
  assert.match(L, /d = ‖e − h‖ = 1\.36 → /);
  assert.match(L, /λ = /);
  assert.match(L, /B = 0\.8·B₋₁ \+ 0\.2·e/);
  assert.match(L, /recovery: ~\d+ steps/);
});
test("story: driven by the master step, words not numbers, ends with an affirmation and a question", () => {
  const a = live(S1), b = live(S2);
  const sa = M.story(a.state, a.m, { seed: 1 }), sb = M.story(b.state, b.m, { seed: 1 });
  assert.equal(sb.guide, "Tidelyn", "connection stabilizer -> Tidelyn");
  assert.equal(sa.guide, "Mistfawn");
  assert.ok(sa.to < sa.from);
  assert.match(sa.text, /The anger loosened its grip/);
  assert.match(sb.text, /The shame grew (a little )?quieter/);
  for (let seed = 1; seed <= 20; seed++) for (const faith of [false, true]) [a, b].forEach(x => {
    const st = M.story(x.state, x.m, { seed, faith });
    assert.ok(!DIGIT.test(st.text), st.text);
    assert.ok(!/on the map|sat at|moved from/i.test(st.text));
    const sent = st.text.split(/(?<=[.!?”])\s+/);
    assert.ok(sent[sent.length - 1].endsWith("?"));
    assert.ok(sent[sent.length - 2].includes(`“${st.affirmation}”`), "affirmation just before the question");
  });
  assert.ok(/God|pray|Lord/i.test(M.story(a.state, a.m, { seed: 1, faith: true }).text));
  const home = { ...M.defaultState(), e: M.defaultState().home.slice() };
  assert.equal(M.story(home, M.master("", home)), null, "nothing to tell at home");
});
test("path game: scene one follows the mover and it ends with an affirmation plus the question", () => {
  const { state, m } = live(S1);
  const g = M.game(state, m, { seed: 1 });
  assert.equal(g.opening, "anger");
  const n = g.ending.length;
  assert.ok(g.ending[n - 1].endsWith("?"));
  assert.equal(g.ending[n - 2], `“${M.affirmations(m, { seed: 1 })[0]}”`);
  assert.ok(!DIGIT.test(g.ending.join(" ") + g.scenes.map(sc => sc.text).join(" ")));
  assert.deepEqual(M.game(state, { crisis: true }), { crisis: true });
});

// ---------- code language ----------
test("mf 3 exact round trip (state, weights, vars, days, checkpoints, ideal), and mf 2 still reads", () => {
  let s = live(S1).state;
  s = M.setWeight(s, "calm", "fear", -0.7);
  s = { ...s, vars: { ...s.vars, aBase: 0.3 } };
  s = M.addCheckpoint(s, "start", Date.parse("2026-10-15T08:30:00"));
  s = M.acceptStep(s, Date.parse("2026-10-16T08:30:00"));
  s = M.refreshIdeal(s);
  const code = M.serialize(s);
  assert.match(code, /^mf 4\n/);
  const p = M.parse(code);
  assert.equal(p.ok, true);
  assert.equal(M.serialize(p.state), code);
  assert.deepEqual(p.state.e, s.e);
  assert.deepEqual(p.state.cps, s.cps);
  assert.deepEqual(p.state.days, s.days);
  const p2 = M.parse(code.replace(/^mf 4/, "mf 2"));
  assert.equal(p2.ok, true);
  assert.equal(p2.from, 2);
  assert.deepEqual(p2.state.e, s.e);
});
test("mf 3 code holds no user text", () => {
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
  assert.match(M.serialize(p.state), /^mf 4\n/, "saved back as mf 4");
});
test("friendly errors for bad code", () => {
  assert.equal(M.parse("").ok, false);
  assert.match(M.parse("hello").errors[0].msg, /mf 4/);
  assert.match(M.parse("mf 9").errors[0].msg, /versions 1, 2, 3 and 4/);
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
test("single page: index has no tools links; tools.html only redirects; the service worker is v23", () => {
  const root = path.join(__dirname, "..");
  const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const tools = fs.readFileSync(path.join(root, "tools.html"), "utf8");
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  assert.ok(!/href="tools\.html/.test(index));
  assert.ok(/history\.replaceState/.test(index), "old ?view/?chip links are stripped");
  assert.ok(/location\.replace\("\.\/"\)/.test(tools) && /http-equiv="refresh"/.test(tools));
  assert.ok(!/<textarea|<script src/.test(tools), "tools.html is only a redirect");
  assert.match(sw, /mindframe-shell-v23/);
  const scripts = [...index.matchAll(/<script src="([^"]+)"/g)].map(x => x[1]);
  assert.deepEqual(scripts, ["js/core/signals.js", "js/core/grounding.js", "js/core/movers.js", "js/core/reality.js", "js/core/peace.js", "js/core/kai.js", "js/core/master.js", "js/core/words.js",
    "js/features/relationship.js", "js/features/forgiveness.js", "js/features/practices.js", "js/features/freeing.js", "js/features/picker.js", "js/features/writer/stories.js", "js/features/writer/games.js", "js/features/historian.js",
    "js/features/writer/writer.js", "js/features/writer/comfort.js", "js/features/analyzer.js", "js/features/scribe.js", "js/features/scientist.js", "js/features/companion.js", "js/features/movies.js", "js/app.js"]);
  scripts.forEach(s => assert.ok(sw.includes(`./${s}`), `${s} cached`));
  ["presets", "Compare", "Optimize", "Check-in", "Spot the mirage", "Rebuild"].forEach(w => assert.ok(!index.includes(w), `no ${w}`));
});

console.log(`\n${passed} passed`);
