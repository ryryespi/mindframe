// Run: node tests/companion.test.js   (no dependencies)
// Your companion (features/companion.js): growth only from caring actions,
// never shrinking on hard readings, the daily caps, a gentle welcome back
// with no streaks, crisis awards nothing, the mood mapping and its line,
// name cleaning and persistence, the five stages in the SVG, the mf 4 pet
// line round trip with mf 1-3 still importing, and the page wiring.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const M = require("./mf.js");
const C = require("../js/features/companion.js");

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}
const read = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const DAY = 24 * 3600 * 1000;
const T0 = new Date(2026, 9, 18, 9, 0).getTime();
const DIGIT = /[0-9]/;
/** A tiny localStorage stand-in. */
const mem = () => { const o = {}; return { getItem: k => (k in o ? o[k] : null), setItem: (k, v) => { o[k] = String(v); }, removeItem: k => { delete o[k]; }, o }; };
const HARD = ["I feel worthless and so ashamed, it's all my fault", "I'm terrified and alone and nobody cares", "I'm furious and I hate everything", "I keep replaying it over and over and avoiding everyone"];

test("growth: only the five caring actions add points; unknown kinds (and readings) add nothing", () => {
  let r = C.fresh();
  ["update", "step", "journal", "practice", "day"].forEach(k => { const a = C.award(r, k, T0); assert.ok(a.gained > 0, k); r = a.rec; });
  assert.equal(r.points, 1 + 2 + 2 + 2 + 3);
  ["sad", "hard", "reading", "peace", ""].forEach(k => assert.equal(C.award(r, k, T0).gained, 0, k));
  assert.deepEqual(Object.keys(C.RULES).sort(), ["day", "journal", "practice", "step", "update"]);
  // award never mutates its input
  const before = JSON.stringify(r); C.award(r, "update", T0 + DAY); assert.equal(JSON.stringify(r), before);
});

test("growth: never shrinks on hard readings; mood changes, the stage and points do not", () => {
  const st = M.defaultState();
  let r = C.fresh(), last = 0;
  for (let d = 0; d < 6; d++) {
    for (const t of HARD) {
      const m = M.master(t, st);
      assert.ok(!m.crisis, t);
      const before = C.stageOf(r.points).i;
      r = C.award(r, "update", T0 + d * DAY).rec;
      assert.ok(r.points >= last, "never fewer points"); last = r.points;
      assert.ok(C.stageOf(r.points).i >= before, "never a smaller stage");
      const md = C.mood(m);
      assert.ok(["rest", "near", "breathe", "tuck", "watch", "peek"].includes(md.pose), md.pose);
    }
  }
  // The same points give the same stage whatever the reading: mood only takes the reading, stageOf only points.
  assert.equal(C.stageOf.length, 1);
  assert.equal(C.mood.length, 1);
});

test("daily caps: Updates count three times a day, steps / journal / practice twice, a new day once", () => {
  let r = C.fresh();
  const gains = k => { const g = []; for (let i = 0; i < 6; i++) { const a = C.award(r, k, T0 + i * 1000); g.push(a.gained); r = a.rec; } return g; };
  assert.deepEqual(gains("update"), [1, 1, 1, 0, 0, 0]);
  assert.deepEqual(gains("step"), [2, 2, 0, 0, 0, 0]);
  assert.deepEqual(gains("journal"), [2, 2, 0, 0, 0, 0]);
  assert.deepEqual(gains("practice"), [2, 2, 0, 0, 0, 0]);
  assert.deepEqual(gains("day"), [3, 0, 0, 0, 0, 0]);
  assert.equal(r.points, 3 + 4 + 4 + 4 + 3);
  // The caps reset the next calendar day.
  assert.equal(C.award(r, "update", T0 + DAY).gained, 1);
  // Most a day can add: 18 points, so no burst of taps races ahead.
  assert.equal(Object.values(C.RULES).reduce((s, x) => s + x.pts * x.cap, 0), 18);
});

test("welcome back: a return after any gap is gentle; days only count up, no streak to lose", () => {
  let a = C.award(C.fresh(), "day", T0);
  assert.equal(a.welcome, false, "the first day is not a return");
  assert.equal(a.rec.days, 1);
  a = C.award(a.rec, "day", T0 + 30 * DAY);
  assert.equal(a.welcome, true); assert.equal(a.gained, 3); assert.equal(a.rec.days, 2);
  assert.equal(C.award(a.rec, "day", T0 + 30 * DAY + 3600e3).gained, 0, "once a day");
  const w = C.line(null, { welcome: true });
  assert.equal(w, "Welcome back. I'm glad you're here.");
  const src = read("js/features/companion.js");
  assert.ok(!/streak|missed|lost|you were gone|disappoint/i.test(src.replace(/\/\/.*$/gm, "")), "no streak shaming anywhere in the code's words");
});

test("crisis awards nothing, for every kind", () => {
  const r = C.fresh();
  Object.keys(C.RULES).forEach(k => { const a = C.award(r, k, T0, { crisis: true }); assert.equal(a.gained, 0, k); assert.equal(a.rec.points, 0); });
  assert.equal(M.master("I want to end it all", M.defaultState()).crisis, true);
  assert.deepEqual(C.mood({ crisis: true }), { pose: "here", aura: null, band: null, mover: null });
  assert.equal(C.line({ crisis: true }), "I'm here, keeping you company.");
  // In the page: update() returns before app.care on crisis, and care passes inCrisis.
  const app = read("js/app.js"), src = read("js/features/companion.js");
  const upd = app.slice(app.indexOf("function update(opts)"), app.indexOf("function renderCard()"));
  assert.ok(upd.indexOf('if (out.crisis) { crisis(true); return false; }') < upd.indexOf('app.care("update")'));
  assert.match(src, /award\(rec, kind, Date\.now\(\), \{ crisis: app\.inCrisis\(\) \}\)/);
});

test("stages: five, by points (newborn 0, little 8, young 25, grown 55, wise 100), with progress toward the next", () => {
  assert.deepEqual(C.STAGES.map(s => [s.id, s.at]), [["newborn", 0], ["little", 8], ["young", 25], ["grown", 55], ["wise", 100]]);
  assert.equal(C.stageOf(0).name, "Newborn"); assert.equal(C.stageOf(7).name, "Newborn"); assert.equal(C.stageOf(8).name, "Little");
  assert.equal(C.stageOf(54).name, "Young"); assert.equal(C.stageOf(55).name, "Grown"); assert.equal(C.stageOf(500).name, "Wise");
  assert.equal(C.stageOf(4).frac, 0.5); assert.equal(C.stageOf(100).frac, 1); assert.equal(C.stageOf(100).next, null);
  const svgs = [0, 1, 2, 3, 4].map(i => C.svg(i, "here", { uid: "t" + i }));
  assert.equal(new Set(svgs).size, 5, "five different drawings");
  svgs.forEach((s, i) => { assert.match(s, new RegExp(`class="pet-svg pose-here stage-${C.STAGES[i].id}"`)); assert.ok(!/href=|<image|<script|on[a-z]+=/i.test(s), "self-contained, no scripts"); });
  assert.match(svgs[0], /leaf|ellipse cx="60" cy="106" rx="40"/, "the newborn rests in a leaf nest");
  assert.match(svgs[4], /fill="#f3d98a"/, "the wise fawn has a little star");
});

test("mood: strongest hard mover sets the pose; calm or hope glows; the aura follows the peace band", () => {
  const st = M.defaultState();
  const cases = [["I am so sad and lonely", "rest", "sadness"], ["I am scared", "near", "fear"], ["I am furious", "breathe", "anger"], ["It is all my fault, I am ashamed", "tuck", "shame"],
    ["I keep replaying it", "watch", "rumination"], ["I keep avoiding it", "peek", "avoidance"], ["I feel calm, hopeful and close to friends", "glow", null]];
  cases.forEach(([t, pose, mover]) => {
    const md = C.mood(M.master(t, st));
    assert.equal(md.pose, pose, t); assert.equal(md.mover, mover, t);
    assert.ok(Object.values(C.AURA).includes(md.aura), t);
  });
  assert.equal(C.mood(null).pose, "here");
  // A tie-free max: the pose follows whichever hard mover is larger.
  const e = M.NAMES.map(() => 0); e[M.NAMES.indexOf("fear")] = 0.5; e[M.NAMES.indexOf("sadness")] = 0.7;
  assert.equal(C.mood({ e, peace: { P: 0.3 } }).pose, "rest");
  assert.equal(C.mood({ e, peace: { P: 0.3 } }).aura, C.AURA["a little"]);
  assert.equal(C.mood({ e: M.NAMES.map(() => 0.1), peace: { P: 0.9 } }).aura, C.AURA.steady);
  // Always kind: every pose draws a smile, and no frown.
  ["rest", "near", "breathe", "tuck", "watch", "peek", "glow", "here"].forEach(p => [0, 2, 4].forEach(i => {
    const s = C.svg(i, p, { uid: "k" });
    assert.ok(s.includes('q3 2.6 6 0" fill="none" stroke="#4a3329"'), `${p} smiles`);
    assert.ok(!/q3 -2\.6/.test(s), `${p} never frowns`);
  }));
});

test("line: first person, composed from the numbers (pose + lever), words only, kind", () => {
  const st = M.defaultState();
  const m = M.master("I am furious", st);
  assert.equal(C.line(m), "I'm here with you, breathing slowly. Let's ease the anger together.");
  const lines = HARD.concat(["I feel calm, hopeful and close to friends", "okay", "I am so sad and lonely"]).map(t => C.line(M.master(t, st)));
  lines.forEach(l => { assert.match(l, /^I'm |^It's |^I feel /); assert.ok(!DIGIT.test(l), l); assert.ok(!/should|must|failed|bad|wrong/i.test(l), l); assert.match(l, /together\.$/); });
  assert.ok(new Set(lines).size >= 4, "different readings, different lines");
  assert.equal(C.line(m, { seed: 1 }), C.line(m, { seed: 1 }), "deterministic");
  assert.match(C.line(m, { welcome: true }), /^Welcome back\. /);
});

test("name: cleaned (letters, spaces, apostrophes, hyphens; at most twenty), default Willow, persisted locally", () => {
  assert.equal(C.DEFAULT_NAME, "Willow");
  assert.equal(C.cleanName("  Little   Bean  "), "Little Bean");
  assert.equal(C.cleanName("<b>Pip</b>!!"), "bPipb");
  assert.equal(C.cleanName(""), "Willow");
  assert.equal(C.cleanName("123"), "Willow");
  assert.equal(C.cleanName("Zoë-Ann O'Neil"), "Zoë-Ann O'Neil");
  assert.equal(C.cleanName("x".repeat(40)).length, 20);
  const s = mem();
  assert.deepEqual(C.load(s), C.fresh(), "a fresh fawn when nothing is stored");
  C.save(s, { ...C.fresh(), name: "Pip", asked: true, points: 12 });
  const back = C.load(s);
  assert.equal(back.name, "Pip"); assert.equal(back.asked, true); assert.equal(back.points, 12);
  assert.ok(C.KEY in s.o && C.KEY === "mindframe-companion");
  s.setItem(C.KEY, "{broken"); assert.deepEqual(C.load(s), C.fresh());
  s.setItem(C.KEY, JSON.stringify({ points: -5, name: 7 })); assert.equal(C.load(s).points, 0);
});

test("mf 4: the pet line round-trips; mf 3, mf 2 and mf 1 still import (and leave the companion alone)", () => {
  const st = { ...M.defaultState(), pet: { name: "Little Bean", points: 42, days: 5 } };
  const code = M.serialize(st);
  assert.match(code, /^mf 4\n/);
  assert.match(code, /\npet points=42 days=5 name=Little%20Bean\n$/);
  const p = M.parse(code);
  assert.equal(p.ok, true); assert.equal(p.from, 4);
  assert.deepEqual(p.state.pet, { points: 42, days: 5, name: "Little Bean" });
  assert.equal(M.serialize(p.state), code);
  const three = code.replace(/^mf 4/, "mf 3").replace(/pet [^\n]*\n/, "");
  const p3 = M.parse(three);
  assert.equal(p3.ok, true); assert.equal(p3.from, 3); assert.equal(p3.state.pet, null);
  assert.equal(M.parse(three.replace(/^mf 3/, "mf 2").replace(/(pick|extra|mix|free) [^\n]*\n/g, "")).ok, true);
  const one = M.parse("mf 1\nhome joy=0.60 hope=0.80 calm=0.80 connection=0.80\ne sadness=0.60 guilt=0.50\n");
  assert.equal(one.ok, true); assert.equal(one.state.pet, null);
  assert.match(M.serialize(one.state), /^mf 4\n/);
  assert.ok(!/\npet /.test(M.serialize(one.state)), "no pet line until there is a companion");
  // Bad pet values are friendly errors; crisis wording in the name is refused.
  assert.equal(M.parse("mf 4\npet points=-3").ok, false);
  assert.equal(M.parse("mf 4\npet hello").ok, false);
  assert.equal(M.parse("mf 4\npet points=3 days=1 name=" + encodeURIComponent("I want to die")).crisis, true);
  assert.equal(M.parse("mf 4\npet points=3 days=1 name=%3Cscript%3E").state.pet.name, "script");
  // Restore: the code's numbers come back; a restored companion is already named.
  const r = C.restore(C.fresh(), p.state.pet);
  assert.equal(r.points, 42); assert.equal(r.days, 5); assert.equal(r.name, "Little Bean"); assert.equal(r.asked, true);
  assert.deepEqual(C.snapshot(r), { name: "Little Bean", points: 42, days: 5 });
});

test("comfort prompt: the story can feature the companion by name and stage, still never the typed text", () => {
  const st = M.defaultState(), raw = "I'm so angry at my brother for taking the car again";
  const m = M.master(raw, st);
  const pr = M.buildPrompt(st, m, { raw, pet: { name: "Willow", stage: "Young", animal: "fawn" } });
  assert.match(pr, /Companion: please make the friendly animal my companion, a little fawn named Willow \(young stage\), gentle and kind\./);
  assert.ok(!/taking the car|my brother/.test(pr));
  assert.ok(!/Companion:/.test(M.buildPrompt(st, m, { raw })), "no companion line without one");
  assert.equal(M.buildPrompt(st, M.master("I want to end it all", st), { pet: { name: "Willow", stage: "Young" } }), null);
});

test("page: one companion, six actions → six views; card buttons renamed; caring actions wired", () => {
  const index = read("index.html"), app = read("js/app.js");
  assert.deepEqual(C.ACTIONS.map(a => [a.view, a.title]), [["writer", "Write a story"], ["historian", "My days"], ["analyzer", "Look closer"], ["scribe", "Save & share code"], ["scientist", "Show the math"], ["grace", "Forgive & breathe"]]);
  C.ACTIONS.forEach(a => { assert.ok(index.includes(`<div id="p-${a.view}" class="view hidden"`), a.view); assert.ok(index.includes(`id="${a.ico}"`), a.ico); });
  assert.match(index, />Try it together</); assert.match(index, />Forgive myself</); assert.match(index, />Open the forgiveness guide</);
  assert.match(app, /Try it together: \$\{c\.practice\.name\}/);
  assert.ok(!/with Grace|Grace's guide/.test(index + app));
  assert.match(index, /<div id="name-box" class="name-box hidden">/);
  assert.match(index, /placeholder="Willow"/);
  // Caring actions: Update, Try it / self-compassion break / Accept step, journal saves, practices finished.
  assert.match(app, /if \(!opts \|\| opts\.care !== false\) app\.care\("update"\)/);
  // A restored code or checkpoint is not a new check-in, and Accept step already counted as a step.
  assert.match(read("js/features/scribe.js"), /app\.update\(\{ care: false \}\)/);
  assert.match(read("js/features/historian.js"), /app\.update\(\{ care: false \}\)/);
  assert.match(read("js/features/writer/writer.js"), /hide\(\);\s*app\.update\(\{ care: false \}\)/);
  assert.match(app, /\$\("step-try"\)\.addEventListener\("click", \(\) => \{ app\.care\("step"\);/);
  assert.match(read("js/features/freeing.js"), /\$\("free-try"\)\.addEventListener\("click", \(\) => \{ app\.care\("step"\);/);
  assert.match(read("js/features/writer/writer.js"), /app\.care\("step"\);\s*app\.state = MF\.Historian\.acceptStep/);
  assert.match(read("js/features/writer/writer.js"), /app\.care\("journal"\)/);
  assert.match(read("js/features/forgiveness.js"), /app\.care\("journal"\)/);
  assert.match(read("js/features/forgiveness.js"), /if \(at\[p\] === PATHS\[p\]\.steps\.length - 1\) app\.care\("practice"\)/);
  assert.match(read("js/features/practices.js"), /stop\("Done\. Notice how you feel now\."\); app\.care\("practice"\);/);
  // Reduced motion: no idle animation.
  assert.match(read("style.css"), /@media \(prefers-reduced-motion: reduce\) \{ \.pet-breath, \.pet-leaf \{ animation: none !important; \}/);
});

console.log(`\n${passed} passed`);
