// Run: node tests/grace.test.js   (no dependencies)
// Grace the Dove: forgiveness cues, the word hook, the master pass (F_self,
// F_other, the path, ΔP_F, the Grace recommendation), the words on the card,
// the guided paths, faith wording, crisis, and the comfort prompt.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const M = require("./mf.js");
const F = require("../js/features/forgiveness.js");
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
const SELF = "It was my fault, I messed up and I let her down. I can't forgive myself";
const OTHER = "I can't forgive him, he betrayed me and I resent him so much";
const { read } = require("./resolve.js");

test("cues: self-blame and resentment, counted per pattern, c = 1 − e^(−0.7k)", () => {
  const s = F.cues(SELF), o = F.cues(OTHER);
  assert.equal(s.self, 4); assert.equal(s.other, 0);
  assert.equal(s.cSelf, Math.round((1 - Math.exp(-0.7 * 4)) * 100) / 100);
  assert.equal(o.other, 4); assert.equal(o.self, 0);
  assert.equal(F.cues("I regret it").cSelf, 0.5);
  assert.deepEqual(F.cues(""), { self: 0, other: 0, cSelf: 0, cOther: 0 });
});
test("cues: negation-aware, like the Four Horsemen", () => {
  assert.equal(F.cues("It's not my fault").self, 0);
  assert.equal(F.cues("I don't resent her at all").other, 0);
  assert.equal(F.cues("I never said I regret it, but now I regret it").self, 1);
});
test("crisis: no forgiveness reading, only { crisis: true }", () => {
  assert.deepEqual(F.cues("I can't forgive myself, I want to die"), { self: 0, other: 0, cSelf: 0, cOther: 0 });
  assert.deepEqual(M.master("I can't forgive myself, I want to end it all", M.defaultState()), { crisis: true });
});
test("word hook: nudges only existing movers (no new movers or variables)", () => {
  const h = F.hook(OTHER);
  [...Object.keys(h.add), ...Object.keys(h.neg)].forEach(n => assert.ok(M.NAMES.includes(n), n));
  assert.deepEqual(h.add, { anger: 0.3, rumination: 0.2 });
  assert.deepEqual(h.neg, { connection: 0.2 });
  assert.deepEqual(F.hook(SELF).add, { shame: 0.2, rumination: 0.2 });
  assert.equal(F.hook("A quiet walk"), null);
  assert.equal(M.NAMES.length, 9);
  assert.deepEqual(Object.keys(M.defaultVars()).sort(), ["aBase", "aMax", "b", "d", "d0", "delta", "gamma", "k"]);
});
test("master pass: F_self = e_shame·(0.4 + 0.6·c_self), F_other = e_anger·(0.4 + 0.6·c_other)", () => {
  [SELF, OTHER, "I'm ashamed and so alone", "I'm furious at the traffic"].forEach(t => {
    const m = M.master(t, M.defaultState()), f = m.forgive;
    assert.equal(f.Fself, Math.round(m.e[I("shame")] * (0.4 + 0.6 * f.cSelf) * 100) / 100, t);
    assert.equal(f.Fother, Math.round(m.e[I("anger")] * (0.4 + 0.6 * f.cOther) * 100) / 100, t);
    const top = Math.max(f.Fself, f.Fother);
    assert.equal(f.path, top >= F.THETA ? (f.Fself >= f.Fother ? "self" : "other") : null, t);
  });
  assert.equal(M.master(SELF, M.defaultState()).forgive.path, "self");
  assert.equal(M.master(OTHER, M.defaultState()).forgive.path, "other");
  assert.equal(M.master("I'm furious at the traffic", M.defaultState()).forgive.path, null);
});
test("master pass: strong shame alone (no cue) needs e_shame ≥ 0.875", () => {
  const s = M.defaultState();
  s.e[I("shame")] = 0.86; assert.equal(M.master("", s).forgive.path, null);
  s.e[I("shame")] = 0.9; assert.equal(M.master("", s).forgive.path, "self");
});
test("master pass: ΔP_F matches P(released e) − P(e), and the pass never moves e, next or P", () => {
  const st = M.defaultState(), m = M.master(OTHER, st);
  const clashes = R.textConflicts(OTHER), g = m.grand.g;
  const P0 = P.score(m.e, st.home, st.vars, R.conflicts(m.e, clashes), g).raw;
  ["self", "other"].forEach(p => {
    const e2 = F.released(m.e, st.home, p);
    const want = Math.round((P.score(e2, st.home, st.vars, R.conflicts(e2, clashes), g).raw - P0) * 10000) / 10000;
    assert.equal(m.forgive.dP[p], want);
    assert.ok(m.forgive.dP[p] >= 0, "moving toward home never lowers P here");
  });
  const copy = JSON.parse(JSON.stringify({ e: m.e, next: m.next, P: m.peace.P }));
  F.pass(m, { data: {}, h: st.home, V: st.vars, clashes: [] });
  assert.deepEqual({ e: m.e, next: m.next, P: m.peace.P }, copy);
  // released() moves toward home and never overshoots it.
  const e = st.home.slice(); e[I("anger")] = 0.04;
  assert.equal(F.released(e, st.home, "other")[I("anger")], 0);
});
test("Grace recommendation: a path is suggested AND the peace lever is one of its movers", () => {
  [SELF, OTHER, "I'm ashamed and so alone", "I'm furious at the traffic", "I keep replaying it, my fault"].forEach(t => {
    const m = M.master(t, M.defaultState()), f = m.forgive, lv = m.peace.lever.name;
    assert.equal(f.grace, !!(f.path && F.PATH_MOVERS[f.path].includes(lv)), t);
  });
  const m = M.master(SELF, M.defaultState());
  assert.equal(m.forgive.grace, true);
  assert.equal(M.card(M.defaultState(), m).peace.at(-1), "Forgive & breathe can help here: forgiving yourself is a gentle way to ease the shame.");
  const quiet = M.master("I'm furious at the traffic", M.defaultState());
  assert.ok(!M.card(M.defaultState(), quiet).peace.some(x => /Forgive & breathe|Grace/.test(x)));
});
test("card: the forgiveness tile in words only, with the safety line for others", () => {
  const st = M.defaultState();
  const s = M.card(st, M.master(SELF, st)).forgive, o = M.card(st, M.master(OTHER, st)).forgive;
  assert.match(s[0], /^Forgiving yourself: there's (a heavy weight|some weight) of self-blame here\. You can own your part and still be kind to yourself\.$/);
  assert.match(o[0], /^Forgiving someone: there's (a deep hurt|a hurt) here that still stings\./);
  assert.equal(o[1], "Forgiving is not excusing what happened, making up, or staying anywhere unsafe.");
  [...s, ...o].forEach(x => assert.ok(!DIGIT.test(x), x));
  assert.deepEqual(M.card(st, M.master("I'm furious at the traffic", st)).forgive, []);
  const lines = M.lines(st, M.master(OTHER, st));
  assert.ok(lines.includes(F.SAFE), "the copy text has the safety line too");
});
test("faith: forgiveness verses only with Include faith on", () => {
  const st = M.defaultState();
  const s = M.master(SELF, st), o = M.master(OTHER, st);
  assert.ok(!M.card(st, s).forgive.some(x => /Lord|God/.test(x)));
  assert.match(M.card(st, s, { faith: true }).forgive.at(-1), /Forgive us our debts, as we also forgive our debtors \(from the Lord's Prayer\)/);
  assert.match(M.card(st, o, { faith: true }).forgive.at(-1), /forgive one another, as the Lord forgave you \(from Colossians\)/);
  assert.match(F.PATHS.other.faith, /Father, forgive them.*\(from Luke\)/);
  assert.match(F.PATHS.self.faith, /Lord's Prayer/);
});
test("guided paths: the four Rs and REACH, each step with a short prompt and an optional box", () => {
  assert.deepEqual(F.PATHS.self.steps.map(s => s.k), ["Responsibility", "Remorse", "Restoration", "Renewal"]);
  assert.deepEqual(F.PATHS.other.steps.map(s => s.k), ["Recall", "Empathize", "Altruistic gift", "Commit", "Hold on"]);
  [...F.PATHS.self.steps, ...F.PATHS.other.steps].forEach(s => { assert.ok(s.say.length < 260, s.k); assert.ok(s.box.length > 3); });
  assert.match(F.PATHS.self.steps[3].say, /mindfulness.*common humanity.*self-kindness/);
  assert.ok(F.PATHS.other.intro.includes(F.SAFE));
  assert.match(F.PATHS.other.intro, /reach out for help first/);
  assert.match(F.PATHS.self.source, /Cornish & Wade \(2015\).*Neff \(2003\)/);
  assert.match(F.PATHS.other.source, /Worthington.*Wade, Hoyt, Kidwell & Worthington \(2014\).*Enright & Fitzgibbons \(2015\)/);
});
test("privacy: Grace's notes are never stored unless saved to the journal; crisis in a note shows 988/911", () => {
  const src = read("js/features/forgiveness.js");
  assert.ok(!/localStorage\.setItem/.test(src), "no direct storage");
  assert.match(src, /path-save[\s\S]*journalAdd\(localStorage/);
  assert.match(src, /G\.isCrisis\(box\.value\)\) \{ box\.value = ""; app\.crisis\(true\)/);
  assert.match(src, /app\.onCrisis\(clear\)/);
});
test("comfort prompt: forgiveness scores, path, practice and the safety note; never the raw text", () => {
  const st = M.defaultState(), m = M.master(OTHER, st);
  const p = C.buildPrompt(st, m, { raw: OTHER });
  assert.match(p, /Forgiveness: self F=0\.\d\d, others F=0\.\d\d \(threshold 0\.35\); suggested path: forgiving someone/);
  assert.match(p, /Practice for the one step: Pause and breathe$/m);
  assert.match(p, /- Forgiving someone: /);
  assert.match(p, /forgiving is not excusing what happened, reconciling, or staying anywhere unsafe/);
  assert.ok(!/betrayed me|resent him/.test(p));
  const q = C.buildPrompt(st, M.master("I'm furious at the traffic", st), {});
  assert.match(q, /suggested path: none/);
  assert.ok(!/reconciling/.test(q));
});
test("determinism: same text, same forgiveness reading and words", () => {
  const st = M.defaultState();
  assert.deepEqual(M.master(SELF, st, { now: 0 }).forgive, M.master(SELF, st, { now: 0 }).forgive);
  assert.deepEqual(M.lines(st, M.master(OTHER, st, { now: 0 }), { faith: true }), M.lines(st, M.master(OTHER, st, { now: 0 }), { faith: true }));
});
test("page: Forgive & breathe (was Grace) is one of the companion's six actions, a view with three tabs", () => {
  const index = read("index.html"), pet = read("js/features/companion.js");
  assert.match(pet, /\{ view: "grace", title: "Forgive & breathe", sub: "Forgiveness paths, patience and the breathing circle", ico: "i-dove" \}/);
  assert.match(index, /<div id="p-grace" class="view hidden" role="group" aria-labelledby="v-grace-title">\s*<h3 class="view-title" id="v-grace-title" tabindex="-1">Forgive &amp; breathe<\/h3>/);
  ["tab-self", "tab-other", "tab-practice"].forEach(id => assert.ok(index.includes(`id="${id}"`), id));
  assert.match(index, /role="tablist"/);
  assert.ok(!/Grace/.test(index.replace(/<!--[\s\S]*?-->/g, "")), "no helper names left on the page");
});

test("README: Forgive & breathe, the equations, the practices, the safety line, and verified citations", () => {
  const r = read("README.md");
  [/## Forgive & breathe: forgiveness, patience and mindfulness/, /F_self  = e_shame · \(0\.4 \+ 0\.6·c_self\)/, /θ_F = 0\.35/, /Forgiving is not excusing what happened, making up, or staying anywhere unsafe\./,
    /Cornish, M\. A\., & Wade, N\. G\. \(2015\)/, /Worthington, E\. L\., Jr\. \(2006\)/, /Enright, R\. D\., & Fitzgibbons/, /Neff, K\. D\. \(2003\)/, /McCullough, M\. E\., Bono/, /Lieberman, M\. D\./, /Bowen, S\., & Marlatt/, /Schnitker, S\. A\. \(2012\)/, /Segal, Z\. V\./, /offline cache \(v28\)/, /## Your companion/, /prefers-reduced-motion/].forEach(re => assert.match(r, re));
});

console.log(`\n${passed} passed`);
