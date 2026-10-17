// Run: node tests/ego.test.js   (no dependencies)
// Ego release, daily vectors and the baseline.
const assert = require("node:assert/strict");
const W = require("../js/workspace.js");
const E = require("../js/emotions.js");

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}
const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const EGO = "It's not my fault, they always blame me and I'm better than all of them but I hate myself";
const day = (y, m, d, h = 12) => new Date(y, m - 1, d, h, 0).getTime();
const vec = o => W.fromObj(o);
const withEG = (e, g) => { const s = W.defaultState(); return { ...s, e, ego: { ...s.ego, g } }; };
const live = text => { const s = W.defaultState(), t = W.fromText(text); return { s: { ...s, e: W.combine(s.e, t.e), ego: { ...s.ego, g: W.combine1(s.ego.g, t.ego.g) } }, t }; };

// ---------- Ego scoring ----------
test("ego markers: defending, comparing, proving, self-attack, replaying", () => {
  const k = t => Object.keys(W.egoScore(t).markers);
  assert.deepEqual(k("It's not my fault, they always do this"), ["defensiveness"]);
  assert.deepEqual(k("She is smarter than me and everyone else"), ["comparison"]);
  assert.deepEqual(k("I hate myself, it's my fault"), ["selfAttack"]);
  assert.ok(k("I'm better than all of them").includes("pride"));
  assert.deepEqual(k("Why me? I keep thinking about it"), ["rumination"]);
});
test("'not my fault' is defending, not self-attack", () => {
  const m = W.egoScore("it's not my fault").markers;
  assert.equal(m.selfAttack, undefined);
  assert.equal(m.defensiveness, 1);
});
test("each kind counts at most twice; g = 1 − exp(−raw) stays below 1", () => {
  const a = W.egoScore("they always, they always, they always, they always").g;
  const b = W.egoScore("they always, they always").g;
  near(a, b, 0.02);
  assert.ok(a < 1);
});
test("self-focus: I/me/my in hard sentences adds a little, capped at 0.3", () => {
  const r = W.egoScore("I am so sad, my my my me me I I");
  assert.ok(r.focus > 0 && r.focus <= 0.3);
  assert.equal(W.egoScore("The weather is nice and I like tea").focus, 0);
});
test("neutral text has no ego grip; the test sentence has a lot", () => {
  assert.equal(W.egoScore("the bus comes at noon").g, 0);
  const r = W.egoScore(EGO);
  assert.ok(r.g > 0.9);
  assert.deepEqual(Object.keys(r.markers).sort(), ["comparison", "defensiveness", "pride", "selfAttack"]);
});

// ---------- Release ----------
test("release: g' = g − r(g − g*), never past g*", () => {
  const id = W.ideal(vec({ sadness: 0.4 }), { g: 0.8, target: 0.3 });
  assert.ok(id.lambda <= 0);
  near(id.gNext, Math.round((0.8 - 0.25 * 0.5) * 100) / 100);
  for (let g = 0.31; g <= 1; g += 0.07) {
    const x = W.ideal(vec({}), { g, target: 0.3 });
    assert.ok(x.gNext >= 0.3 && x.gNext < g + 1e-9, `${g} → ${x.gNext}`);
  }
});
test("low self-respect: g below g* rises toward g*, never past it", () => {
  const x = W.ideal(vec({ shame: 0.5 }), { g: 0.05, target: 0.3 });
  assert.ok(x.gNext > 0.05 && x.gNext <= 0.3);
  let s = withEG(vec({ shame: 0.5 }), 0.05);
  for (let k = 0; k < 60; k++) s = W.acceptStep(s, day(2026, 10, 17));
  assert.ok(Math.abs(s.ego.g - 0.3) < 1e-9);
});
test("release is smaller when the mix is unstable", () => {
  const stable = W.ideal(vec({ sadness: 0.6 }), { g: 0.9, target: 0.3 });
  const unstable = W.ideal(vec({ shame: 0.8, loneliness: 0.9 }), { g: 0.9, target: 0.3 });
  assert.ok(unstable.lambda > 0 && stable.lambda <= 0);
  assert.ok(unstable.r < stable.r);
  assert.ok(unstable.r <= W.SPEC.rCap.def);
});
test("release nudges shame and anger down, connection and calm up, never past home", () => {
  const e = vec({ shame: 0.6, anger: 0.6, calm: 0.2, connection: 0.2 });
  const free = W.ideal(e, { g: 0.3, target: 0.3 }), rel = W.ideal(e, { g: 0.9, target: 0.3 });
  const i = n => E.NAMES.indexOf(n);
  assert.ok(rel.next[i("shame")] < free.next[i("shame")]);
  assert.ok(rel.next[i("anger")] < free.next[i("anger")]);
  assert.ok(rel.next[i("connection")] > free.next[i("connection")]);
  assert.ok(rel.next[i("calm")] > free.next[i("calm")]);
  const h = W.defaultState().home;
  rel.next.forEach((y, j) => assert.ok((e[j] - h[j]) * (y - h[j]) >= 0, E.NAMES[j]));
});
test("live lines for the ego sentence: release line, markers, structure", () => {
  const { s, t } = live(EGO);
  const L = W.lines(s, W.metrics(s, t.notes, t.ego.markers));
  assert.ok(L.includes("ego g = 0.97 → 0.88 (release toward g* = 0.30: keep self-respect, let go of defending)"), L.join("\n"));
  assert.ok(L.includes("ego markers: defending 3, comparing 1, self-attack 1, proving 1"));
  assert.ok(L.includes("structure: defending → toward humble confidence"));
  assert.ok(L.some(l => /^work on: ego grip ↓ \(gap 0\.67\)/.test(l)));
});
test("structure: humble confidence when g ≈ g* with calm and connection high", () => {
  const s = withEG(vec({ calm: 0.7, connection: 0.7 }), 0.3);
  assert.ok(W.lines(s, W.metrics(s)).includes("structure: humble confidence (g near g*, calm and connection high)"));
  const low = withEG(vec({ shame: 0.5 }), 0.05);
  assert.ok(W.lines(low, W.metrics(low)).includes("structure: low self-respect → toward humble confidence"));
});

// ---------- Days and baseline ----------
test("baseline EMA: B1 = D1, Bt = (1 − β)B + βD", () => {
  const days = [{ day: "2026-10-15", e: vec({ shame: 1 }), g: 1 }, { day: "2026-10-16", e: vec({}), g: 0 }, { day: "2026-10-17", e: vec({}), g: 0 }];
  const ser = W.baselineSeries(days, 0.2);
  const sh = E.NAMES.indexOf("shame");
  near(ser[0].B[sh], 1); near(ser[1].B[sh], 0.8); near(ser[2].B[sh], 0.64); near(ser[2].B[10], 0.64);
});
test("one day vector per day: the last saved state of that day", () => {
  let s = withEG(vec({ fear: 0.8 }), 0.5);
  s = W.addCheckpoint(s, "a", day(2026, 10, 16, 9));
  s = { ...s, e: vec({ fear: 0.6 }) };
  s = W.addCheckpoint(s, "b", day(2026, 10, 16, 20));
  s = W.acceptStep(s, day(2026, 10, 17, 9));
  assert.deepEqual(s.days.map(d => d.day), ["2026-10-16", "2026-10-17"]);
  assert.deepEqual(s.days[0].e, vec({ fear: 0.6 }));
  assert.equal(s.days[1].g, s.ego.g);
});
test("daily direction: toward home ↑, away ↓, no change ↔", () => {
  const base = W.defaultState();
  const mk = (a, b) => ({ ...base, days: [{ day: "2026-10-16", e: a, g: 0.3 }, { day: "2026-10-17", e: b, g: 0.3 }] });
  const dir = s => W.dailyView(s)[1].dir;
  assert.equal(dir(mk(vec({ shame: 0.8 }), vec({ shame: 0.4, calm: 0.3 }))), "up");
  assert.equal(dir(mk(vec({ shame: 0.4 }), vec({ shame: 0.8 }))), "down");
  assert.equal(dir(mk(vec({ shame: 0.4 }), vec({ shame: 0.4 }))), "side");
  const v = W.dailyView(mk(vec({ shame: 0.8 }), vec({ shame: 0.4, calm: 0.3 })))[1];
  assert.ok(v.cos > 0.15);
});
test("7-day view: only the last 7 calendar days, gentle words", () => {
  let s = W.defaultState();
  const days = [];
  for (let d = 1; d <= 10; d++) days.push({ day: `2026-10-${String(7 + d).padStart(2, "0")}`, e: vec({ sadness: 1 - d * 0.08 }), g: 0.3 });
  s = W.withBaseline({ ...s, days });
  const now = day(2026, 10, 17);
  const L = W.weekLines(s, now);
  assert.equal(L.length, 7);
  assert.match(L[0], /^10-11  ‖B − h‖ = \d\.\d\d  ↑ toward home$/);
  assert.equal(W.todayWords(s, now), "Today points toward home.");
  assert.equal(W.todayWords(W.defaultState(), now), "Save a checkpoint or accept a step to record today.");
});
test("the baseline drifts toward home as daily steps are accepted", () => {
  const { s: s0 } = live("I'm ashamed and so alone, nobody cares and I'm angry at myself");
  let s = s0, prev = Infinity;
  for (let d = 1; d <= 10; d++) {
    s = W.acceptStep(s, day(2026, 10, d));
    const dB = W.metrics(s).baseline.dB;
    assert.ok(dB < prev, `day ${d}`);
    prev = dB;
  }
});
test("step sizing uses the baseline's distance once days exist", () => {
  const far = W.withBaseline({ ...withEG(vec({ calm: 0.6 }), 0.3), days: [{ day: "2026-10-17", e: vec({ shame: 1, fear: 1, sadness: 1 }), g: 1 }] });
  const none = withEG(vec({ calm: 0.6 }), 0.3);
  assert.ok(W.metrics(far).ideal.a > W.metrics(none).ideal.a);
});

// ---------- Code ----------
test("round trip with ego, baseline, and days", () => {
  let { s } = live(EGO);
  s = W.addCheckpoint(s, "start", day(2026, 10, 16, 9));
  s = W.acceptStep(s, day(2026, 10, 17, 9));
  const code = W.serialize(s);
  assert.match(code, /\nego g=0\.\d\d target=0\.30\n/);
  assert.match(code, /\nbaseline beta=0\.20 .* g=0\.\d\d\n/);
  assert.match(code, /\nday 2026-10-16 .* g=0\.97\nday 2026-10-17 .* g=0\.\d\d\n/);
  const p = W.parse(code);
  assert.ok(p.ok, JSON.stringify(p.errors));
  assert.deepEqual(p.state, s);
  assert.equal(W.serialize(p.state), code);
});
test("older mf 1 codes still import: ego starts at g*, no days", () => {
  const old = "mf 1\nhome joy=0.60 hope=0.80 calm=0.80 connection=0.80\ne anger=0.68 shame=0.80 loneliness=0.94\nsteps 8\ncp 1 2026-10-17T13:58 label=start anger=0.68 shame=0.80 loneliness=0.94 lambda=0.27\nideal a=0.12 b=0.15\neq e' = e + 0.12*(h - e) + 0.15*s(e)\n";
  const p = W.parse(old);
  assert.ok(p.ok, JSON.stringify(p.errors));
  assert.equal(p.state.ego.g, 0.3);
  assert.equal(p.state.cps[0].g, 0.3);
  assert.deepEqual(p.state.days, []);
  assert.equal(p.state.ideal.r, 0.25);
  assert.equal(p.state.framework, "default");
});
test("ego/day/baseline errors name the line", () => {
  [["mf 1\nego g=1.5", /Line 2: g must be between 0 and 1/], ["mf 1\nego target=0.9", /Line 2: target must be from 0\.1 to 0\.6/],
    ["mf 1\nday 2026-10-17 g=0.3\nday 2026-10-16 g=0.3", /Line 3: days should go forward/], ["mf 1\nbaseline beta=0", /Line 2: beta must be from 0\.05 to 1/],
    ["mf 1\nday yesterday", /Line 2: a day looks like/]].forEach(([c, re]) => {
    const p = W.parse(c);
    assert.ok(!p.ok && p.errors.some(e => re.test(e.msg)), c + " | " + (p.errors || []).map(e => e.msg).join(";"));
  });
});

// ---------- Story and safety ----------
test("ego story when the ego grip is the biggest gap: let go of defending, keep self-respect", () => {
  const { s, t } = live(EGO);
  const m = W.metrics(s, t.notes, t.ego.markers);
  assert.ok(m.ideal.egoTop);
  const st = W.story(s, m, { seed: 1 });
  assert.equal(st.arc, "ego");
  assert.equal(st.guide, "Pell");
  assert.match(st.text, /ego grip sat at 0\.97/);
  assert.match(st.text, /defending/);
  assert.match(st.text, /self-respect/);
  assert.match(st.text, /grip moved from 0\.97 to 0\.88/);
  assert.ok(!/blame me|better than all|hate myself/.test(st.text), "does not repeat the words");
  assert.ok(!/pray|grace/i.test(st.text), "no faith line unless asked");
  assert.match(W.story(s, m, { seed: 1, faith: true }).text, /grace|prayed/);
});
test("low self-respect story raises g and stays humble", () => {
  const s = withEG(vec({}), 0.05);
  const st = W.story(s, W.metrics(s), { seed: 2 });
  assert.equal(st.arc, "ego");
  assert.match(st.text, /below the line of healthy self-respect/);
  assert.ok(st.gNext > 0.05);
});
test("crisis gating: no ego score or vector for crisis words", () => {
  assert.deepEqual(W.fromText("It's not my fault and I want to kill myself"), { crisis: true });
});
test("deterministic ego lines and story", () => {
  const a = live(EGO), b = live(EGO);
  assert.deepEqual(W.lines(a.s, W.metrics(a.s, a.t.notes, a.t.ego.markers)), W.lines(b.s, W.metrics(b.s, b.t.notes, b.t.ego.markers)));
  assert.equal(W.story(a.s, W.metrics(a.s, a.t.notes, a.t.ego.markers), { seed: 4 }).text, W.story(b.s, W.metrics(b.s, b.t.notes, b.t.ego.markers), { seed: 4 }).text);
});

console.log(`\n${passed} passed${process.exitCode ? ", some failed" : ""}`);
