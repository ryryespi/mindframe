// Run: node tests/topology.test.js   (no dependencies)
// push27: the layered topology and the anchor (core/topology.js), time and
// resistance, the moving anchor chain, the Expression governor (core/governor.js),
// the story scenes (features/scenes.js) in sync with the parable beats, and About me.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const M = require("./mf.js");
const T = require("../js/core/topology.js");
const G = require("../js/core/governor.js");
const SC = require("../js/features/scenes.js");
const AB = require("../js/features/about.js");
const PB = global.MF.Parable;
const { read } = require("./resolve.js");

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}
const st = M.defaultState(), h = st.home;
const dist = (x, y) => Math.sqrt(x.reduce((s, v, i) => s + (v - y[i]) ** 2, 0));

test("inventory: 102 variables on six layers, each named in its file", () => {
  assert.deepEqual(T.counts(), { 1: 25, 2: 14, 3: 12, 4: 19, 5: 23, 6: 9 });
  assert.equal(T.VARS.length, 102);
  T.VARS.forEach(v => assert.ok(fs.existsSync(path.join(__dirname, "../js", v.file)), v.file));
  assert.match(T.LAYERS[6], /wording only/);
});

test("anchor of the master step: h is the unique fixed point; V = ‖e − h‖ falls by q = 0.88; basin = the cube", () => {
  assert.equal(T.q(st.vars), 0.88);
  const rnd = M.rng(11);
  for (let i = 0; i < 300; i++) {
    const e = M.NAMES.map(() => Math.round(rnd() * 100) / 100);
    const Te = T.T(e, st);
    assert.ok(dist(Te, h) <= T.q(st.vars) * dist(e, h) + 1e-12, "Lyapunov decrease");
    assert.deepEqual(M.masterState(e, st, { sim: false }).next, Te.map(x => Math.round(x * 100) / 100), "T equals master's step (rounded)");
  }
  assert.deepEqual(T.T(h, st), h, "h is fixed");
  const a = T.anchorOf(M.NAMES.map(() => 1), st);
  assert.ok(dist(a.e, h) <= 0.06 && a.steps < 40, "the rounded iteration lands next to h");
  const L = T.lipschitz(st, 3000);
  assert.ok(L.toward <= 0.88 + 1e-9, "toward-h ratio ≤ q");
  assert.ok(L.L > 1, "honest: not a Banach contraction in the strict pairwise sense (a jumps at λ > 0)");
});

test("anchor layer coordinates: L1 = h, P = 1, C = G = 0, no pulls, no past focus, hope 0.8", () => {
  const m = M.masterState(h, st, { sim: false });
  assert.deepEqual(T.sections(m, "", st), { 1: h, 2: [0], 3: [1, 0, 0], 4: [0, 0, 0, 0], 5: [0, 0.8] });
});

test("time: τ table cites Verduyn & Lavrijsen (sadness longest, shame and fear shortest); k(dt) < 1; 90-second claim omitted", () => {
  assert.ok(T.TAU.sadness.hi >= 120 && T.TAU.shame.lo <= 0.5 && T.TAU.fear.hi <= 3);
  ["fear", "sadness", "anger", "shame"].forEach(n => assert.match(T.TAU[n].src, /Verduyn & Lavrijsen, 2015/));
  ["calm", "connection", "hope"].forEach(n => assert.match(T.TAU[n].src, /design choice/));
  const e = [0.6, 0.6, 0.2, 0.2, 0.3, 0.3, 0.3, 0.7, 0.2];
  [0.1, 1, 24].forEach(dt => [0, 0.5, 0.9].forEach(rho => assert.ok(T.kdt(dt, e, rho) < 1)));
  assert.ok(T.tauEff("sadness", e, 0.5) > T.tauEff("sadness", e, 0), "resistance lengthens τ");
  assert.ok(T.tauEff("fear", e, 0) > T.tauEff("fear", e.map((x, i) => (i === 7 ? 0 : x)), 0), "rumination lengthens τ");
  const f = T.flow(e, h, 2, 0.3); assert.ok(dist(f, h) < dist(e, h));
  const tt = T.timeTo(e, h, 0.3); assert.ok(tt.lo < tt.typ && tt.typ < tt.hi && tt.slow === "sadness");
  assert.match(T.OMITTED, /not peer-reviewed/);
});

test("resistance: suppression raises ρ, willingness lowers it, ρ ≤ 0.9, inertia from saved days", () => {
  const e = M.master("I keep replaying it", st).e;
  const base = T.resistance(e, "I feel low", []).rho, push = T.resistance(e, "I need to stop thinking about it and push it away", []).rho, will = T.resistance(e, "I'm willing to let it be and make room for it", []).rho;
  assert.ok(push > base && will < base);
  assert.ok(T.resistance(M.NAMES.map(() => 1), "stop thinking push it away get rid of it nothing will change", Array.from({ length: 10 }, (_, i) => ({ e: [i / 9, i / 9, 0, 0] }))).rho <= 0.9);
  assert.ok(T.inertia(Array.from({ length: 8 }, (_, i) => ({ e: [i / 7, i / 7, i / 7, i / 7] }))) > 0.4);
  assert.equal(T.inertia([{ e: [1, 1, 1, 1] }]), 0);
  const cb = T.chainBound(0.9, 0.12); assert.ok(cb.qRho < 1 && cb.qA <= 0.79 + 1e-9 && cb.radius <= 0.23);
});

test("moving anchor: dwell with hysteresis, collapse to a new stone, geometric approach to the desired mix", () => {
  const d = [0, 0, 0, 0, 0.9, 0.6, 0.7, 0, 0], t0 = Date.UTC(2026, 9, 20);
  let p = T.advance(null, { e: h, d, rho: 0, t: t0 }, h);
  assert.equal(p.stones.length, 1);
  // near A_0 but not long enough: no collapse
  p = T.advance(p, { e: p.A, d, rho: 0, t: t0 + 1000 }, h); assert.equal(p.stones.length, 1); assert.ok(p.since != null);
  // a wobble inside ε_out keeps the dwell (hysteresis); outside ε_out breaks it
  const wob = p.A.map((x, i) => (i === 4 ? x - 0.2 : x));
  assert.ok(T.advance(p, { e: wob, d, rho: 0, t: t0 + 2000 }, h).since != null);
  assert.equal(T.advance(p, { e: p.A.map((x, i) => (i === 0 ? x + 0.5 : x)), d, rho: 0, t: t0 + 2000 }, h).since, null);
  // dwell long enough → new stone; repeated, the anchor approaches d geometrically
  let e = p.A, t = t0;
  const gaps = [dist(p.A, d)];
  for (let k = 0; k < 40; k++) { t += 3 * 3.6e6; p = T.advance(p, { e, d, rho: 0, t }, h); p = T.advance(p, { e: p.A, d, rho: 0, t: t + 3.6e6 * 2 }, h); e = p.A; gaps.push(dist(p.A, d)); }
  assert.ok(p.stones.length >= 3 && p.stones.length <= 30);
  assert.ok(gaps[gaps.length - 1] < 0.08 && gaps[gaps.length - 1] < gaps[0] && gaps[2] < gaps[1] && gaps[1] < gaps[0], "geometric approach until it settles (MOVE_MIN)");
  assert.ok(p.settled, "a settled anchor stops adding stones");
  p.stones.forEach(s => s.A.forEach(x => assert.ok(x >= 0 && x <= 1)));
});

test("anchor view: words first (no digits), the math behind, patience and willingness lines, faith wording exact", () => {
  const txt = "I keep replaying it and I just want to push it away. I feel so sad.";
  const m = M.master(txt, st), v = T.view(m, txt, st, null, { faith: true });
  v.words.filter(w => !/Hebrews 6:19/.test(w)).forEach(w => assert.ok(!/\d/.test(w), w));
  assert.ok(v.words.some(w => /Sadness can take days|Replaying keeps feelings/.test(w)));
  assert.ok(v.words.some(w => /not a promise/.test(w)));
  assert.ok(v.words.some(w => /I'm willing to feel this for one breath/.test(w)));
  assert.ok(v.words.some(w => w.includes("This hope we have as an anchor of the soul, a hope both sure and steadfast and entering into that which is within the veil")));
  assert.ok(v.math.some(l => /k\(1 h\)/.test(l)) && v.math.some(l => /ρ = /.test(l)));
  assert.equal(T.view({ crisis: true }, "", st, null), null);
  assert.match(T.svg(v), /^<svg[^>]*role="img"/);
  const rv = T.review([{ A: [0, 0, 0, 0, 0.8, 0.6, 0.7, 0, 0] }, { A: [0, 0, 0, 0, 0.7, 0.9, 0.8, 0, 0] }]);
  assert.equal(rv.length, 3); assert.match(T.reviewSvg(rv), /<svg[^>]*>.*<text/);
});

test("governor: bounded PI with leak and anti-windup; graded output; doctor line after 3 days; never in a crisis", () => {
  const rnd = M.rng(5);
  let I = 0, I2 = 0.9;
  for (let k = 0; k < 200; k++) {
    const s = { C: rnd(), U: rnd(), Y: rnd(), Mn: rnd(), G: 0 };
    const a = G.control(s, I), b = G.control(s, I2);
    assert.ok(a.u >= 0 && a.u <= 1 && a.I >= -1 && a.I <= 1);
    if (!(a.u >= 1 || b.u >= 1)) assert.ok(Math.abs(a.I - b.I) <= 0.8 * Math.abs(I - I2) + 1e-12, "leak contracts the controller state");
    I = a.I; I2 = b.I;
  }
  assert.ok(G.limit(1) < G.limit(0), "the limit tightens with conflict");
  const T0 = "my mind is racing and I didn't sleep, so many ideas", m = M.master(T0, st);
  let mem = null, out; const t = Date.UTC(2026, 9, 19, 20);
  const grades = [];
  for (let d = 0; d < 4; d++) { out = G.govern(T0, m, mem, t + d * 864e5); mem = out.mem; grades.push(out.c.grade.id); }
  assert.deepEqual(grades, ["pause", "pause", "pause", "ground"]);
  assert.equal(out.doctor, true); assert.ok(out.words.includes(G.DOCTOR)); assert.match(G.DOCTOR, /not a diagnosis/);
  const calm = G.govern("I had a calm walk today and talked with a friend", M.master("I had a calm walk today and talked with a friend", st), null, t);
  assert.equal(calm.c.grade.id, "write");
  assert.equal(G.govern("", { crisis: true }, null, t), null);
  [...calm.words, ...out.words].forEach(w => assert.ok(!/\d/.test(w)));
});

test("scenes: 13 original SVG scenes, consistent characters, calm variant, motif; grounding picks by signal", () => {
  assert.equal(Object.keys(SC.SCENES).length, 13);
  Object.keys(SC.SCENES).forEach(id => { const s = SC.svg(id, { stage: 2 }); assert.match(s, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/); assert.ok(!/href=|https?:\/\/(?!www\.w3\.org)/.test(s), "nothing external"); });
  assert.notEqual(SC.svg("still", { calm: true }), SC.svg("still"));
  assert.ok(SC.svg("road", { stage: 4 }).includes("scale(1.18)"), "the fawn grows with the companion");
  const mk = (s, id = "write") => ({ s: { C: 0, U: 0, Y: 0, Mn: 0, G: 0, ...s }, c: { grade: { id } } });
  assert.equal(SC.grounding(mk({ Mn: 0.7 }), {}).id, "table");
  assert.equal(SC.grounding(mk({ G: 0.5 }), {}).id, "table");
  assert.equal(SC.grounding(mk({ Y: 0.5 }), {}).id, "horizon");
  assert.equal(SC.grounding(mk({ U: 0.6 }), {}).id, "hands");
  assert.equal(SC.grounding(mk({}, "ground"), {}).id, "stones");
  assert.equal(SC.grounding(mk({}), {}), null, "keep writing: no picture needed");
  assert.match(read("style.css"), /prefers-reduced-motion: reduce\) \{ \.sc-ripple, \.sc-breath \{ animation: none/);
});

test("parable beats and scenes stay in sync; the shared-table beat joins when activation is high; at most 8", () => {
  const m = M.master("I feel so sad and I keep replaying what I said", st);
  const b = PB.beats(m, {});
  assert.deepEqual(PB.parable(m, {}), b.map(x => x.text));
  b.forEach(x => assert.ok(SC.SCENES[SC.BEAT_SCENE[x.id]], x.id));
  assert.equal(b[0].id, "open"); assert.equal(b[b.length - 1].id, "evening");
  const gov = { s: { Mn: 0.6, G: 0 }, c: { grade: { id: "pause" } } };
  const b2 = PB.beats(m, { gov, grip: { show: true, top: "loop" }, past: { show: true, tech: "loop", future: "future" } });
  assert.ok(b2.some(x => x.id === "share") && b2.length <= 8 && b2[b2.length - 1].id === "evening");
  assert.match(b2.find(x => x.id === "share").text, /shared bread with her neighbors/);
});

test("About me: sample hobbies=coding,music field=software; local .mf line round-trips; personalizes words only", () => {
  const about = AB.normalize({ hobbies: ["coding", "music"], tags: ["Chess"], field: "software" });
  assert.equal(AB.line(about), "about hobbies=coding,music tags=chess field=software");
  assert.match(AB.step(about), /Rubber-duck your feeling/);
  assert.match(AB.kind(about), /Help someone with one small question/);
  assert.equal(AB.motif(about), "lantern");
  assert.match(AB.flowWords(about), /solving one small problem or playing or listening closely/);
  assert.deepEqual(AB.extras(about), { songs: 1, films: 0 });
  const s = { ...M.defaultState(), about };
  const code = M.serialize(s); assert.match(code, /\nabout hobbies=coding,music tags=chess field=software\n/);
  const back = M.parse(code); assert.ok(back.ok); assert.deepEqual(back.state.about, about);
  assert.ok(!/\nabout /.test(M.serialize(M.defaultState())), "no line when not set");
  const m = M.master("I feel stuck", st);
  assert.deepEqual(M.master("I feel stuck", s).e, m.e, "numbers unchanged");
  const bend = PB.beats(m, { about }).find(x => x.id === "bend");
  assert.match(bend.text, /step through code, one line at a time/);
  assert.equal(PB.more(m, { about }).songs.length, PB.more(m, {}).songs.length + 1);
  assert.ok(SC.svg("still", { motif: "lantern" }).includes("sc-motif"));
  assert.equal(SC.grounding({ s: { Mn: 0.7, G: 0, C: 0, U: 0, Y: 0 }, c: { grade: { id: "pause" } } }, m, about).prompt, AB.kind(about));
  ["js/features/about.js"].forEach(f => assert.ok(!/fetch\(|XMLHttpRequest|sendBeacon/.test(read(f))));
});

test("page: Anchor and About me rows and views, scripts in order, sw v28 caches the new files", () => {
  const html = read("index.html"), sw = read("sw.js");
  ["pet-anchor", "p-anchor", "an-words", "an-svg", "an-path", "an-math", "an-math-box", "an-tau", "gv", "gv-words", "gv-math", "an-review", "an-story", "an-save", "pet-about", "p-about", "ab-hobbies", "ab-field", "ab-save"].forEach(id => assert.match(html, new RegExp(`id="${id}"`), id));
  assert.match(html, /nothing quantum/);
  ["./js/core/topology.js", "./js/core/governor.js", "./js/features/scenes.js", "./js/features/about.js"].forEach(f => assert.ok(sw.includes(f), f));
  assert.match(sw, /mindframe-shell-v28/);
  ["js/core/topology.js", "js/core/governor.js", "js/features/scenes.js"].forEach(f => assert.ok(!/fetch\(|XMLHttpRequest|sendBeacon/.test(read(f)), f));
});

console.log(`\n${passed} passed`);
