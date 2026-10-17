// Run: node tests/catholic.test.js   (no dependencies)
// Catholic factors: virtues, tendencies, Ignatian index, couplings, practice, code.
const assert = require("node:assert/strict");
const W = require("../js/workspace.js");
const C = require("../js/catholic.js");

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}
const TARGET = "I'm so angry and jealous of my brother, I feel far from God and lazy";
const HARSH = /sinful|condemn|damn|hell\b|punish|wicked|evil|disgust|shameful|(?<!not a )bad person|you must|you should|mortal sin|deserve/i;
const vec = o => W.fromObj(o);
const catholic = () => W.applyFramework(W.defaultState(), W.findFramework(W.defaultState(), "catholic"));
const live = (text, s = catholic()) => {
  const t = W.fromText(text);
  const r = W.applyWords({ e: s.e, g: s.ego.g, cath: s.cath }, t, s.vars);
  const st = { ...s, e: r.e, ego: { ...s.ego, g: r.g }, cath: r.cath };
  return { s: st, t, m: W.metrics(st, t.notes, t.ego.markers) };
};
const eo = s => Object.fromEntries(W.NAMES.map((n, i) => [n, s.e[i]]));

// ---------- Lists and lexicon ----------
test("factor lists: 3 theological, 4 cardinal, 7 tendencies each with a contrary virtue, 7 gifts, 12 fruits", () => {
  assert.deepEqual(C.THEOLOGICAL, ["faith", "hope", "charity"]);
  assert.deepEqual(C.CARDINAL, ["prudence", "justice", "fortitude", "temperance"]);
  assert.deepEqual(C.PAIRS.map(p => p.join("/")), ["pride/humility", "greed/generosity", "lust/chastity", "envy/kindness", "gluttony/temperance", "wrath/patience", "sloth/diligence"]);
  assert.equal(C.VIRTUES.length, 13);
  assert.equal(C.GIFTS.length, 7);
  assert.equal(C.FRUITS.length, 12);
});

test("lexicon: tendencies from words, intensifiers count more, negation does not count", () => {
  const s = C.score(TARGET);
  assert.equal(s.t.wrath, 0.59); // "so angry": 1.5 hits
  assert.equal(s.t.envy, 0.45);
  assert.equal(s.t.sloth, 0.45);
  assert.equal(s.t.pride, 0);
  assert.equal(C.score("I'm angry").t.wrath, 0.45);
  assert.equal(C.score("I'm not angry and not jealous").t.wrath, 0);
  assert.equal(C.score("I wasn't lazy today").t.sloth, 0);
  assert.ok(C.score("I binged and drank too much").t.gluttony > 0.6);
  assert.ok(C.score("I'm better than all of them").t.pride > 0);
});

test("lexicon: virtues from words; contrary tendencies and negative words lower them", () => {
  const f = s => C.combine(C.defaultFactors(), C.score(s));
  assert.ok(f("I was patient and took a deep breath").v.patience > 0.7);
  assert.ok(f("I prayed the rosary and went to Mass").v.faith > 0.7);
  assert.ok(f("I helped my neighbor and forgave him").v.charity > 0.7);
  assert.ok(f("I was wrong, my mistake").v.humility > 0.7);
  assert.equal(f(TARGET).v.patience, 0.21);
  assert.equal(f(TARGET).v.kindness, 0.28);
  assert.equal(f(TARGET).v.diligence, 0.28);
  assert.ok(f("I feel hopeless").v.hope < 0.5);
  assert.equal(f("nothing in particular").v.faith, 0.5);
});

test("factors combine: tendencies 1 − (1 − base)(1 − words), always in [0, 1]", () => {
  const base = C.defaultFactors();
  base.t.wrath = 0.5;
  const f = C.combine(base, C.score("I'm angry"));
  assert.equal(f.t.wrath, Math.round((1 - 0.5 * 0.55) * 100) / 100);
  const big = C.combine(C.defaultFactors(), C.score("angry angry angry furious rage revenge so so angry"));
  assert.ok(big.t.wrath <= 1 && big.v.patience >= 0);
});

// ---------- Ignatian ----------
test("Ignatian index: bounded in [−1, 1], sign follows consolation vs desolation", () => {
  const f = C.defaultFactors();
  const home = { joy: 0.6, hope: 0.8, calm: 0.8, connection: 0.8 };
  assert.ok(C.ignatian(home, f).I > 0.2);
  assert.equal(C.ignatian(home, f).state, "consolation");
  const dark = C.ignatian({ sadness: 0.9, loneliness: 0.8, fear: 0.6 }, f);
  assert.ok(dark.I < -0.2 && dark.state === "desolation");
  assert.equal(C.ignatian({}, f).I, 0);
  assert.equal(C.ignatian({}, f).state, "quiet");
  const extremes = [C.ignatian({ joy: 1, hope: 1, calm: 1, connection: 1 }, { ...f, c: 1, v: { ...f.v, faith: 1, hope: 1, charity: 1 } }),
    C.ignatian({ sadness: 1, fear: 1, loneliness: 1, anger: 1 }, { ...f, d: 1 })];
  assert.equal(extremes[0].I, 1);
  assert.equal(extremes[1].I, -1);
  const words = C.combine(f, C.score("I feel far from God"));
  assert.ok(C.ignatian({}, words).I < 0);
  assert.ok(C.ignatian({}, C.combine(f, C.score("I felt close to God and at peace"))).I > 0);
});

test("Ignatian guidance paraphrases SE 318, 321 and 323", () => {
  assert.match(C.IGNATIAN_TEXT.desolation, /make no new changes now \(SE 318\)/);
  assert.match(C.IGNATIAN_TEXT.desolation, /consolation will return \(SE 321\)/);
  assert.match(C.IGNATIAN_TEXT.consolation, /SE 323/);
});

// ---------- Couplings ----------
test("couplings off by default: cv = 0 leaves e, g and the step unchanged", () => {
  const s = W.defaultState();
  assert.equal(s.vars.cv, 0);
  const t = W.fromText(TARGET);
  const r = W.applyWords({ e: s.e, g: s.ego.g, cath: s.cath }, t, s.vars);
  assert.deepEqual(r.e, W.combine(s.e, t.e));
  assert.equal(r.g, W.combine1(s.ego.g, t.ego.g));
  const st = { ...s, e: r.e, cath: r.cath };
  const m = W.metrics(st);
  assert.equal(m.ideal.cv, 0);
  assert.equal(m.ideal.pull, null);
  assert.deepEqual(m.ideal.next, W.ideal(r.e, { vars: s.vars, g: s.ego.g }).next);
});

test("tendencies amplify the hard feelings they feed: wrath and envy ↑ anger, envy ↑ shame, sloth ↑ sadness, pride ↑ g", () => {
  const s = catholic();
  const t = (txt) => W.applyWords({ e: s.e, g: s.ego.g, cath: s.cath }, W.fromText(txt), s.vars);
  const plain = W.fromText(TARGET);
  const amp = t(TARGET);
  const i = n => W.NAMES.indexOf(n);
  assert.ok(amp.e[i("anger")] > plain.e[i("anger")]);
  assert.ok(amp.e[i("shame")] > 0 && amp.e[i("sadness")] > 0);
  const proud = "I'm better than all of them";
  assert.ok(t(proud).g > W.combine1(s.ego.g, W.fromText(proud).ego.g));
  assert.ok(t("I'm so greedy").e[i("fear")] > 0);
});

test("virtues pull their emotions toward home: patience ↓ anger, charity ↑ connection ↓ loneliness, hope ↓ sadness, fortitude ↓ fear, temperance ↑ calm, faith ↑ hope", () => {
  const e = vec({ anger: 0.8, loneliness: 0.6, sadness: 0.6, fear: 0.6 });
  const run = v => {
    const s = catholic(), f = C.defaultFactors();
    Object.assign(f.v, v);
    return W.ideal(e, { home: s.home, vars: s.vars, g: 0.3, target: 0.3, cath: f }).next;
  };
  const lo = run({ patience: 0, charity: 0, hope: 0, fortitude: 0, temperance: 0, faith: 0 });
  const hi = run({ patience: 1, charity: 1, hope: 1, fortitude: 1, temperance: 1, faith: 1 });
  const i = n => W.NAMES.indexOf(n);
  assert.ok(hi[i("anger")] < lo[i("anger")]);
  assert.ok(hi[i("loneliness")] < lo[i("loneliness")]);
  assert.ok(hi[i("connection")] > lo[i("connection")]);
  assert.ok(hi[i("sadness")] < lo[i("sadness")]);
  assert.ok(hi[i("fear")] < lo[i("fear")]);
  assert.ok(hi[i("calm")] > lo[i("calm")]);
  assert.ok(hi[i("hope")] > lo[i("hope")]);
  const s = catholic();
  hi.forEach((y, j) => assert.ok(e[j] > s.home[j] ? y >= s.home[j] : y <= s.home[j], "never past home"));
});

test("humility speeds the ego release toward g*, never past it", () => {
  const s = catholic(), f = C.defaultFactors();
  const g = h => W.ideal(vec({ anger: 0.3 }), { home: s.home, vars: s.vars, g: 0.9, target: 0.25, cath: { ...f, v: { ...f.v, humility: h } } }).gNext;
  assert.ok(g(1) < g(0));
  assert.ok(g(1) >= 0.25);
});

test("virtue step: the contrary virtue of the strongest tendency grows toward v_h, the tendency fades", () => {
  const { m } = live(TARGET);
  const p = m.ideal.pull;
  assert.equal(p.tendency, "wrath");
  assert.equal(p.virtue, "patience");
  assert.ok(p.vNext > p.v && p.vNext <= 0.7);
  assert.ok(p.tNext < p.t && p.tNext >= 0);
  const after = W.acceptStep(live(TARGET).s, new Date(2026, 9, 17, 15).getTime());
  assert.equal(after.cath.v.patience, p.vNext);
  assert.equal(after.cath.t.wrath, p.tNext);
});

test("unstable mix: the virtue pull is damped like the step", () => {
  const s = catholic();
  const e = vec({ shame: 0.8, loneliness: 0.94, anger: 0.68 });
  const id = W.ideal(e, { home: s.home, vars: s.vars, g: 0.3, target: 0.25, cath: C.defaultFactors() });
  assert.ok(id.unstable);
  assert.ok(id.cv < s.vars.cv);
});

// ---------- Preset and compare ----------
test("Catholic preset: in the list and in Compare, cv > 0, values within range", () => {
  const f = W.presetFramework("catholic");
  assert.ok(f.vars.cv > 0);
  assert.ok(W.VAR_KEYS.every(k => f.vars[k] >= W.SPEC[k].min && f.vars[k] <= W.SPEC[k].max));
  const rows = W.compare(live(TARGET, W.defaultState()).s);
  assert.ok(rows.some(r => r.name === "catholic" && r.reached));
  const cat = rows.find(r => r.name === "catholic"), faith = rows.find(r => r.name === "faith");
  assert.ok(cat.steps <= faith.steps, "the virtue pull does not slow recovery against Faith & grace here");
});

// ---------- Practice ----------
test("practice: strongest tendency → its contrary virtue; desolation → examen; heavy shame → mercy; else weakest virtue", () => {
  const f = C.defaultFactors();
  const P = (patch, e = {}, ig = null) => C.practice({ ...f, ...patch, v: { ...f.v, ...(patch.v || {}) }, t: { ...f.t, ...(patch.t || {}) } }, e, ig);
  assert.equal(P({ t: { wrath: 0.6 } }).key, "patience");
  assert.equal(P({ t: { pride: 0.5 } }).key, "humility");
  assert.match(P({ t: { pride: 0.5 } }).do, /Litany of Humility/);
  assert.equal(P({ t: { envy: 0.5 } }).key, "kindness");
  assert.equal(P({ t: { sloth: 0.5 } }).key, "diligence");
  assert.equal(P({}, {}, { state: "desolation" }).key, "examen");
  assert.match(P({}, {}, { state: "desolation" }).do, /don't change big decisions now/);
  const mercy = P({}, { shame: 0.6 });
  assert.equal(mercy.key, "mercy");
  assert.match(mercy.do, /Confession is there whenever you feel ready, never as pressure/);
  assert.equal(P({ v: { charity: 0.3 } }).key, "charity");
  assert.equal(P({}).key, "gratitude");
});

test("gentle wording: no condemnation or pressure in any practice, line, prayer, or story", () => {
  const all = [];
  Object.values(C.PRACTICE).forEach(p => all.push(p.do, p.act));
  Object.values(C.OPEN).flat().forEach(x => all.push(x));
  all.push(...C.NOT_VERDICT, ...C.DESOLATION_WORDS, ...Object.values(C.PRAYER), ...Object.values(C.QUESTION), ...Object.values(C.IGNATIAN_TEXT), C.MERCY_LINE);
  ["I'm so angry", "I'm jealous of her", "I'm lazy", "I binged again", "porn again", "I'm greedy", "I'm better than all of them", "I feel far from God", "I'm ashamed and guilty"].forEach(txt => {
    const { s, m } = live(txt);
    all.push(...W.lines(s, m), W.idealWords(m));
    for (let seed = 1; seed <= 3; seed++) { const st = W.story(s, m, { seed }); if (st) all.push(st.text); }
  });
  all.forEach(x => assert.ok(!HARSH.test(x), x));
});

test("lines: shown with the Catholic framework or Include faith, not otherwise", () => {
  const d = live(TARGET, W.defaultState());
  assert.ok(!W.lines(d.s, d.m).some(l => /^(theological|virtue|Ignatian)/.test(l)));
  const withFaith = W.lines(d.s, d.m, { faith: true });
  assert.ok(withFaith.some(l => l === "virtue: patience 0.21 \u2194 wrath 0.59 \u2192 pull patience"));
  assert.ok(withFaith.some(l => /^Ignatian: desolation \u2212\d\.\d\d \u2192 make no new changes now/.test(l)));
  assert.ok(!withFaith.some(l => l.includes("V(e)")));
  const c = live(TARGET);
  const L = W.lines(c.s, c.m);
  assert.ok(L.some(l => /^theological: faith 0\.50, hope 0\.50, charity 0\.50$/.test(l)));
  assert.ok(L.some(l => /\+ 0\.15\u00B7V\(e\)/.test(l)));
  assert.ok(L.some(l => /^practice \(optional\): patience \u2192 /.test(l)));
  const sh = live("I'm so ashamed and guilty");
  assert.ok(W.lines(sh.s, sh.m).some(l => /^(mercy: |practice \(optional\): mercy)/.test(l)));
});

// ---------- Story ----------
test("Catholic story: a virtue is the turning point, one prayer line, deterministic by seed", () => {
  const { s, m } = live(TARGET);
  const a = W.story(s, m, { seed: 1 }), b = W.story(s, m, { seed: 1 });
  assert.equal(a.arc, "catholic");
  assert.equal(a.focus, "patience");
  assert.match(a.text, /So they chose patience/);
  assert.equal((a.text.match(/pray/gi) || []).length, 1);
  assert.equal(a.text, b.text);
  const d = live("I feel far from God, prayer feels dry");
  const st = W.story(d.s, d.m, { seed: 2 });
  assert.equal(st.focus, "examen");
  assert.match(st.text, /examen/);
  const g = live("I'm so ashamed and guilty");
  const ms = W.story(g.s, g.m, { seed: 1 });
  assert.equal(ms.focus, "mercy");
  assert.match(ms.text, /No rush, no pressure/);
});

// ---------- Code ----------
test("code: virtue, tendency and ignatian lines round-trip exactly; still no words", () => {
  const { s } = live(TARGET);
  const code = W.serialize(W.refreshIdeal(s));
  assert.match(code, /\nvirtue kindness=0\.28 patience=0\.21 diligence=0\.28\n/);
  assert.match(code, /\ntendency envy=0\.45 wrath=0\.59 sloth=0\.45\n/);
  assert.match(code, /\nignatian -0\.\d\d c=0\.00 d=0\.59\n/);
  assert.match(code, /\nideal a=0\.\d\d b=0\.\d\d r=0\.\d\d cv=0\.15\n/);
  assert.ok(!/angry|jealous|brother|god|lazy/i.test(code));
  const p = W.parse(code);
  assert.ok(p.ok, JSON.stringify(p.errors));
  assert.equal(W.serialize(p.state), code);
  assert.deepEqual(p.state.cath, s.cath);
});

test("code: old codes import with default factors; bad factor lines give friendly errors", () => {
  const old = "mf 1\nhome joy=0.60 hope=0.80 calm=0.80 connection=0.80\ne shame=0.50\nsteps 8\nideal a=0.10 b=0.15\n";
  const p = W.parse(old);
  assert.ok(p.ok);
  assert.deepEqual(p.state.cath, C.defaultFactors());
  assert.ok(!W.serialize(p.state).includes("virtue"));
  const bad = W.parse("mf 1\nvirtue meekness=0.5\ntendency wrath=2\nignatian 3 c=0\n");
  assert.equal(bad.ok, false);
  assert.equal(bad.errors.length, 3);
});

// ---------- Crisis ----------
test("crisis gating: crisis words give only { crisis: true }, no factors computed", () => {
  const r = W.fromText("I feel far from God and I want to die");
  assert.deepEqual(r, { crisis: true });
  assert.equal(W.parse("mf 1\nvars framework=kill-myself cv=0.15\n").crisis, true);
});

console.log(`\n${passed} passed${process.exitCode ? ", some failed" : ""}`);
