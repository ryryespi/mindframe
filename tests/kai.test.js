// Run: node tests/kai.test.js   (no dependencies)
// The Kai shield (core/kai.js): outside hurt X (to me, not by me), the four
// virtues A, F, E, R and the shield S, the push X(1 − S)·w inside master,
// impulsive reaction I, the card lines, the Kai-style story (faith on/off),
// Ada's lines, the picker chips, crisis, privacy and determinism.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const M = require("./mf.js");
const K = require("../js/core/kai.js");

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}
const I = n => M.NAMES.indexOf(n);
const DIGIT = /[0-9]/;
const { read } = require("./resolve.js");
const SAMPLE = "My coworkers criticized me in front of everyone, I want to snap back but I know they're stressed";
const X = t => (K.cues(t) || { X: 0 }).X;

test("X detection: criticism or judgment received (to me) counts; you doing it (by me) does not", () => {
  ["they criticized me", "everyone judged me", "he called me lazy", "My boss yelled at me", "she rolled her eyes at me", "they mocked me", "I was criticized at work",
   "he said I always mess up", "they told me I'm useless", "she gave me the silent treatment", "a storm of criticism", "everyone thinks I'm stupid"].forEach(t => assert.ok(X(t) > 0, t));
  ["I criticized him", "you always ignore me", "you're so lazy", "I rolled my eyes", "I judged her too quickly", "I mocked them", "a calm morning"].forEach(t => assert.equal(X(t), 0, t));
  assert.ok(K.cues("you always ignore me").byMe.includes("criticism"), "the Four Horsemen in your own words are by-me");
  assert.deepEqual(K.cues("she rolled her eyes at me").byMe, [], "contempt aimed AT you is not by-me");
  assert.equal(X("they didn't criticize me"), 0);
  assert.equal(X("they never criticized me"), 0, "negation-aware");
  assert.equal(X("nobody judged me, but I worried"), 0);
  assert.equal(K.cues(SAMPLE).kX, 2, "criticized me + in front of everyone");
  assert.equal(X(SAMPLE), K.cue(2));
  assert.equal(X("in front of everyone"), 0, "an audience alone is not a hurt");
});
test("virtue cues are negation-aware and keep to their meaning", () => {
  const c = t => K.cues(t);
  assert.equal(c("I feel hurt, and I know my worth").kA, 2);
  assert.equal(c("I don't feel hurt").kA, 0);
  assert.equal(c("I want to snap back but I took a deep breath").kF, 3, "restraint after an urge, a breath, a deep breath");
  assert.equal(c("I didn't argue").kF, 1, "a restraint phrase carries its own not");
  assert.equal(c("I couldn't stay calm").kF, 0);
  assert.equal(c("I know they're stressed").kE, 1);
  assert.equal(c("they aren't stressed at all").kE, 0);
  assert.equal(c("I hear you. I see it differently, and I'm going to step away now.").kR, 3);
  assert.equal(c("I don't see it differently").kR, 0);
  assert.equal(c("I want to snap back").kUrge, 2);
  assert.ok(c("I yelled at him").attack > 0, "your own attack lowers the respect guard");
});
test("shield math: every virtue in [0, 0.95], S = 1 − Π(1 − V) in [0, 1), push bounded by X·w, I = X(1 − S)u", () => {
  const e0 = M.defaultState().e;
  const texts = [SAMPLE, "everyone judged me", "I feel hurt and I know my worth and I'm still enough and I notice it and I'm aware. I took a deep breath, stayed calm, held back, let it go, didn't argue. They must be stressed, they're tired, in their shoes. I hear you, I see it differently, I'll step away, I need a break, respectfully. They criticized me."];
  texts.forEach(t => {
    const k = K.shield(e0, { kai: K.cues(t) }, { A: 1, F: 1, E: 1, R: 1 }, 0);
    ["A", "F", "E", "R"].forEach(v => assert.ok(k[v] >= 0 && k[v] <= K.V_MAX, `${v} bounded`));
    assert.ok(k.S >= 0 && k.S <= K.S_MAX && K.S_MAX < 1);
    assert.equal(k.S, Math.min(K.S_MAX, Math.round((1 - (1 - k.A) * (1 - k.F) * (1 - k.E) * (1 - k.R)) * 100) / 100));
    M.NAMES.forEach((n, j) => assert.ok(k.push[j] >= 0 && k.push[j] <= k.X * (K.W[n] || 0) + 1e-9, n));
    assert.ok(k.I >= 0 && k.I <= k.X);
  });
  const none = K.shield(e0, {}, {}, 0);
  assert.deepEqual([none.X, none.S, none.I, none.push.every(x => x === 0)], [0, 0, 0, true]);
  // True size dims self-awareness: A = (1 − G)·(...)
  const c = { kai: K.cues("I know my worth. They judged me.") };
  assert.ok(K.shield(e0, c, {}, 0.6).A < K.shield(e0, c, {}, 0).A);
});
test("I falls as S rises (the same pressure, more virtues); it flickers and fails when the shield is strong", () => {
  const e0 = M.defaultState().e;
  const steps = ["They criticized me.", "They criticized me. I know my worth.", "They criticized me. I know my worth. I took a deep breath.", "They criticized me. I know my worth. I took a deep breath. They must be stressed.", "They criticized me. I know my worth. I took a deep breath. They must be stressed. I hear you, I see it differently."];
  const ks = steps.map(t => K.shield(e0, { kai: K.cues(t) }, {}, 0));
  for (let i = 1; i < ks.length; i++) {
    assert.ok(ks[i].S > ks[i - 1].S, `S rises at ${i}`);
    assert.ok(ks[i].I <= ks[i - 1].I && (ks[i - 1].I === 0 || ks[i].I < ks[i - 1].I), `I falls at ${i}`);
    assert.ok(ks[i].load < ks[i - 1].load || ks[i].load === 0.01, `X(1 \u2212 S) falls at ${i}`);
    assert.equal(ks[i].X, ks[0].X, "the same pressure");
  }
  assert.ok(ks[ks.length - 1].I < K.FLICKER);
  assert.match(K.impulseLine(ks[ks.length - 1]), /flickers and fails/);
  assert.doesNotMatch(K.impulseLine(ks[0]), /flickers and fails/);
  // Session practice (finishing the pause) raises F by the documented ½ term.
  const k0 = K.shield(e0, { kai: K.cues("They criticized me.") }, {}, 0), k1 = K.shield(e0, { kai: K.cues("They criticized me.") }, { F: 1 }, 0);
  assert.equal(k0.F, 0); assert.equal(k1.F, 0.5); assert.ok(k1.I < k0.I);
  assert.equal(K.PRACTICE_VIRTUE.pause, "F"); assert.equal(K.PRACTICE_VIRTUE.label, "A");
});
test("inside master: the push raises anger, shame and fear only, by X(1 − S)·w; no new movers", () => {
  const st = M.defaultState();
  const m = M.master("Everyone judged me", st), base = M.combine(st.e, M.fromText("Everyone judged me").w);
  assert.equal(m.e.length, 9);
  M.NAMES.forEach((n, j) => {
    const want = Math.round(Math.min(1, base[j] + m.kai.push[j]) * 100) / 100;
    assert.equal(m.e[j], want, n);
    if (!["anger", "shame", "fear"].includes(n)) assert.equal(m.e[j], base[j], `${n} untouched`);
  });
  assert.ok(m.e[I("anger")] > base[I("anger")]);
  assert.match(m.notes.join(), /outside criticism or judgment/);
  // A stronger shield pushes less.
  const m2 = M.master("Everyone judged me. I know my worth, I took a deep breath, they must be stressed, I see it differently.", st);
  assert.ok(m2.kai.S > m.kai.S && m2.kai.push[I("anger")] < m.kai.push[I("anger")]);
});
test("crisis is unchanged: crisis wording returns only {crisis: true}, with or without criticism", () => {
  assert.deepEqual(M.master("They criticized me and I want to kill myself", M.defaultState()), { crisis: true });
  assert.deepEqual(M.master("I want to end it all", M.defaultState()), { crisis: true });
  assert.equal(K.story({ crisis: true }), null);
  assert.deepEqual(K.cardLines({ crisis: true }), []);
});
test("card: words only, only when X is present; steadiness bands, the impulse line, the weakest virtue as the lever with its step", () => {
  const st = M.defaultState(), m = M.master(SAMPLE, st), c = M.card(st, m);
  assert.equal(c.kai.length, 3);
  assert.equal(c.kai[0], "Your steadiness: self-awareness just starting, forbearance growing, empathy growing, respect guard just starting.");
  assert.match(c.kai[1], /^The urge to react /);
  assert.match(c.kai[2], /^The weakest part of the shield is self-awareness; it can grow\. Self-awareness: name it to yourself/);
  c.kai.forEach(l => assert.ok(!DIGIT.test(l), l));
  assert.deepEqual(c.insight, { id: "kai", score: m.kai.X }, "the steadiness tile is the insight when outside hurt is present");
  assert.ok(M.lines(st, m).join("\n").includes(c.kai[0]), "Copy carries it");
  assert.deepEqual(M.card(st, M.master("I'm angry", st)).kai, [], "no tile without outside hurt");
  const r = M.card(st, M.master("They judged me. I know my worth, I took a deep breath, they must be stressed.", st));
  assert.match(r.kai[2], /^The weakest part of the shield is the respect guard; it can grow\. Respect guard: say, \u201CI hear you\. I see it differently, and I'm going to step away now\.\u201D$/);
  const f = M.card(st, m, { faith: true }).kai;
  assert.match(f[0], /patience \(forbearance\) growing, kindness \(empathy\) growing, gentleness \(the respect guard\) just starting/);
  assert.match(f[1], /^Self-control: the urge to react/);
  assert.match(f[3], /fruits of the Spirit.*rest in Christ.*Same numbers, faith words\./);
  f.forEach(l => assert.ok(!DIGIT.test(l), l));
});
test("the Kai story: the traveler, your companion as his friend, the virtue lines from your levels (weakest growing); faith adds Christ-centered lines", () => {
  const st = M.defaultState(), m = M.master(SAMPLE, st);
  const off = M.story(st, m, { friend: "Willow" }), on = M.story(st, m, { friend: "Willow", faith: true });
  assert.equal(off.kind, "kai");
  assert.match(off.text, /^Kai faced a storm of words in the village square\. Willow, his small friend, stayed close beside him\./);
  assert.match(off.text, /first small sentence of self-awareness/, "self-awareness just starting");
  assert.match(off.text, /The urge to argue tugged at him; forbearance let one slow breath go first\./, "forbearance growing");
  assert.match(off.text, /His self-awareness was the part still growing/);
  assert.match(off.text, /Kai stood unmoved, a calm center of peace in the storm\./);
  assert.ok(!/Jesus|Spirit|Father/.test(off.text), "no faith wording with faith off");
  assert.match(on.text, /Jesus before his accusers, who answered nothing, like a sheep that is silent before its shearers \(from Matthew and Isaiah\); when he was cursed, he didn't curse back \(from First Peter\), and he prayed, \u201CFather, forgive them\u201D \(from Luke\)\. Patience, kindness, gentleness and self-control are fruits of the Spirit \(from Galatians\)\./);
  const strong = M.master("They criticized me. I know my worth, I'm still enough. I took a deep breath and stayed calm. They must be stressed, they're tired. I hear you, I see it differently.", st);
  const s = M.story(st, strong, {});
  assert.match(s.text, /His respect guard shone like a shield, blocking the barbs of judgment without harming anyone\./);
  assert.match(s.text, /Impulsive reaction flickered and failed, unable to break his balance\./);
  assert.match(M.story(st, m, { traveler: "Ana" }).text, /^Ana faced a storm/);
  assert.notEqual(M.story(st, M.master("I'm angry", st), {}).kind, "kai", "the usual creature story without outside hurt");
  assert.equal(JSON.stringify(M.story(st, m, { friend: "Willow", faith: true })), JSON.stringify(on), "deterministic");
});
test("verified verse wording (World English Bible) in the faith lines; no quote is invented", () => {
  const src = read("js/core/kai.js");
  assert.match(src, /who answered nothing, like a sheep that is silent before its shearers \(from Matthew and Isaiah\)/); // Matt 27:12 "he answered nothing"; Isa 53:7
  assert.match(src, /when he was cursed, he didn't curse back \(from First Peter\)/); // 1 Pet 2:23
  assert.match(src, /\u201CFather, forgive them\u201D \(from Luke\)/); // Luke 23:34
  const rd = read("README.md");
  [/Isaiah 53:7/, /Matthew 27:12[–-]14/, /Luke 23:34/, /1 Peter 2:23/, /Galatians 5:22[–-]23/, /Matthew 11:28[–-]30/, /Philippians 4:7/, /World English Bible/].forEach(r => assert.match(rd, r));
});
test("Ada's panel shows X, the four virtues, S, the push, I and the lever; with faith the home h is rest and peace in Christ (words only)", () => {
  const st = M.defaultState(), m = M.master(SAMPLE, st);
  const L = M.mathLines(st, m).join("\n");
  assert.match(L, /Kai shield \(outside pressure\): X = 0\.75 \(k = 2 to-me cues; by me: none\)/);
  assert.match(L, /S = 1 \u2212 \(1 \u2212 A\)\(1 \u2212 F\)\(1 \u2212 E\)\(1 \u2212 R\) = 0\.75/);
  assert.match(L, /I = X\(1 \u2212 S\)\u00B7u = /);
  assert.match(L, /lever = weakest virtue: self-awareness/);
  assert.match(L, /the Kai term X\(1 \u2212 S\)\u00B7w only enters the reading/);
  assert.ok(!/rest and peace in Christ/.test(L));
  assert.match(M.mathLines(st, m, { faith: true }).join("\n"), /h \(home\), with faith on: rest and peace in Christ \(Matthew 11:28\u201330; Philippians 4:7\)\. Wording only; the numbers are the same\./);
  assert.equal(M.master(SAMPLE, st).next.join(), m.next.join(), "faith never changes the numbers");
});
test("picker chips: 'criticized or judged' sets X; 'holding back from reacting' raises F; no text needed", () => {
  const p = M.masterPick({ levels: { angry: "off" }, extras: ["judged"] }, M.defaultState());
  assert.equal(p.kai.X, K.PICK_X);
  assert.ok(p.e[I("anger")] > 0);
  const q = M.masterPick({ extras: ["judged", "holdback"] }, M.defaultState());
  assert.equal(q.kai.F, K.PICK_F);
  assert.ok(q.kai.S > p.kai.S && q.kai.I < p.kai.I);
  assert.equal(M.masterPick({}, M.defaultState()).kai, null);
});
test("privacy: the shield and the session are never stored in the .mf code; the comfort prompt gets numbers only", () => {
  const st = { ...M.defaultState(), session: { F: 1 } };
  const m = M.master(SAMPLE, st);
  const code = M.serialize({ ...st, e: m.e });
  assert.ok(!/kai|session|criticized|coworkers/i.test(code));
  const C = require("../js/features/writer/comfort.js");
  const p = C.buildPrompt(st, m, { raw: SAMPLE });
  assert.ok(p.includes(`Steadiness under outside criticism (Kai shield): pressure X=0.75, shield S=${m.kai.S.toFixed(2)}`), "numbers only");
  assert.ok(!/coworkers|snap back/.test(p), "never the raw text");
  assert.match(read("js/app.js"), /let session = \{\};/);
  assert.match(read("js/app.js"), /session = \{\};\n/, "Start over clears the session");
});
test("determinism: cues, shield, card and story are pure functions of the input", () => {
  const st = M.defaultState();
  const a = new Set(Array.from({ length: 20 }, () => JSON.stringify([K.cues(SAMPLE), M.master(SAMPLE, st, { now: 0 }).kai, M.lines(st, M.master(SAMPLE, st, { now: 0 }), { seed: 1, faith: true }), M.story(st, M.master(SAMPLE, st, { now: 0 }), { faith: true, friend: "Willow" }).text])));
  assert.equal(a.size, 1);
});

console.log(`\n${passed} passed`);
