// Run: node tests/practices.test.js   (no dependencies)
// Patience and mindfulness practices: the library, the pick rule for the One
// step, the waiting/impatience hook, the breathing-circle schedule, and the
// UI refresh rules (dark mode, reduced motion, offline, tap targets).
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const M = require("./mf.js");
const PR = require("../js/features/practices.js");

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}
const I = n => M.NAMES.indexOf(n);
const DIGIT = /[0-9]/;
const read = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const DOSES = [{ min: "two", times: "three" }, { min: "five", times: "four" }, { min: "ten", times: "five" }];

test("library: ten practices, five mindfulness + one self-compassion, four patience, each with steps and a source", () => {
  assert.equal(PR.ORDER.length, 10);
  assert.deepEqual(PR.ORDER.filter(id => PR.LIBRARY[id].kind === "mindfulness"), ["stop", "space", "senses", "body", "label", "kindness"]);
  assert.deepEqual(PR.ORDER.filter(id => PR.LIBRARY[id].kind === "patience"), ["pause", "waiting", "surf", "gratitude"]);
  PR.ORDER.forEach(id => {
    const p = PR.LIBRARY[id];
    assert.ok(p.name && p.source && p.steps.length >= 3, id);
    DOSES.forEach(x => assert.ok(!DIGIT.test(p.say(x)), `${id}: words only`));
  });
  assert.equal(PR.LIBRARY.space.steps.length, 3, "the breathing space has three steps");
  assert.deepEqual(PR.LIBRARY.stop.steps.map(s => s[0]), ["S", "T", "O", "P"]);
});
test("sources: the cited work is named in code and in the library", () => {
  const src = read("js/features/practices.js").replace(/\n\/\/\s*/g, " ");
  [/Segal, Williams & Teasdale \(2013\)/, /Lieberman et al\. \(2007\)/, /Bowen & Marlatt \(2009\)/, /Schnitker \(2012\)/, /Gross \(1998\)/, /Stahl & Goldstein \(2010\)/, /Zaccaro et al\. \(2018\)/, /Emmons & McCullough \(2003\)/, /no single primary source/].forEach(re => assert.match(src, re));
  assert.match(PR.LIBRARY.label.source, /Lieberman et al\., 2007/);
  assert.match(PR.LIBRARY.surf.source, /Bowen & Marlatt, 2009/);
  assert.match(PR.LIBRARY.waiting.source, /Schnitker, 2012/);
});
test("pick rule: the numbers choose the practice", () => {
  const e0 = M.defaultState().home.slice();
  const m = (lever, set = {}, d = 0.4, wait = 0) => { const e = e0.slice(); Object.entries(set).forEach(([n, v]) => { e[I(n)] = v; }); return { e, d, wait, peace: { lever: { name: lever } } }; };
  const id = x => (PR.pick(x) || { id: null }).id;
  assert.equal(id(m("rumination", { rumination: 0.7, fear: 0.5 })), "label");
  assert.equal(id(m("rumination", { rumination: 0.7 })), "stop");
  assert.equal(id(m("anger", { anger: 0.7 })), "pause");
  assert.equal(id(m("anger", { anger: 0.7 }, 0.4, 0.5)), "waiting");
  assert.equal(id(m("fear", { fear: 0.7 })), "space");
  assert.equal(id(m("fear", { fear: 0.7 }, 0.4, 0.5)), "waiting");
  assert.equal(id(m("avoidance", { avoidance: 0.7 })), "surf");
  assert.equal(id(m("shame", { shame: 0.7 })), "kindness");
  assert.equal(id(m("sadness", { sadness: 0.7 })), "gratitude");
  assert.equal(id(m("sadness", { sadness: 0.7, hope: 0.2 })), null);
  assert.equal(id(m("calm", { calm: 0.2 }, 0.6)), "senses");
  assert.equal(id(m("calm", { calm: 0.4 }, 0.3)), "body");
  assert.equal(id(m("calm", { calm: 0.4 }, 0.3, 0.5)), "waiting");
  assert.equal(id(m("hope", { hope: 0.3 })), "gratitude");
  assert.equal(id(m("connection", { connection: 0.3 })), null);
  assert.equal(PR.pick({ crisis: true }), null);
});
test("one step: the practice, sized by d, and why, words only", () => {
  ["anger", "fear", "rumination", "avoidance", "shame"].forEach(n => {
    const s = M.defaultState(); s.e[I(n)] = 0.7;
    const m = M.master("", s), c = M.card(s, m);
    const lever = m.peace.lever.name;
    assert.ok(m.practice && m.practice.mover === lever, n);
    assert.ok(c.step.startsWith(PR.LIBRARY[m.practice.id].say({ min: "two", times: "three" }).split(":")[0]), c.step);
    assert.ok(c.step.includes(`can ${M.EASE[lever][0]}`), c.step);
    assert.ok(!DIGIT.test(c.step));
    assert.deepEqual(c.practice, { id: m.practice.id, name: PR.LIBRARY[m.practice.id].name });
  });
  const st = M.defaultState();
  assert.match(M.card(st, M.master("I keep putting off my taxes, I just avoid it", st)).step, /^Urge surfing: /);
  assert.match(M.card(st, M.master("I keep replaying what I said and I feel sick with worry", st)).step, /^Name it to tame it: /);
  assert.match(M.card(st, M.master("I'm so angry", st)).step, /^Pause: step away for/);
});
test("patience hook: waiting/impatience cues nudge anger and calm only; c_wait reaches master", () => {
  assert.equal(PR.waitCues("Why is this taking forever, I'm so impatient"), 3);
  assert.equal(PR.waitCues("I'm not impatient"), 0);
  const h = PR.hook("still waiting, so slow");
  assert.deepEqual(h.add, { anger: 0.2 }); assert.deepEqual(h.neg, { calm: 0.2 });
  assert.equal(h.data.wait, PR.cueStrength(2));
  const m = M.master("Why is this taking forever, I'm so impatient", M.defaultState());
  assert.equal(m.wait, PR.cueStrength(3));
  assert.equal(m.practice.id, "waiting");
  assert.match(M.card(M.defaultState(), m).step, /^Reframe the wait: /);
  assert.equal(M.master("A calm morning", M.defaultState()).wait, 0);
});
test("breathing circle: in four, out six (longer exhale), rounds from the dose", () => {
  const s = PR.schedule(PR.BREATH.exhale, 3);
  assert.deepEqual(s.map(x => x.phase), ["in", "out", "in", "out", "in", "out"]);
  assert.ok(s.every(x => (x.phase === "in" ? x.ms === 4000 : x.ms === 6000)));
  assert.equal(s.reduce((a, x) => a + x.ms, 0), 30000, "six breaths a minute");
  assert.equal(PR.schedule().length, 10);
  assert.deepEqual(PR.schedule({ inhale: 4, hold: 2, exhale: 6 }, 1).map(x => x.phase), ["in", "hold", "out"]);
  assert.deepEqual(PR.ROUNDS, { three: 3, four: 4, five: 5 });
});
test("faith: patience and mindfulness verses exist and show only with Include faith on", () => {
  assert.match(PR.FAITH.patience, /Love is patient.*\(from 1 Corinthians\)/);
  assert.match(PR.FAITH.mindfulness, /Be still, and know that I am God \(from the Psalms\)/);
  assert.match(read("js/features/practices.js"), /classList\.toggle\("hidden", !app\.faith\(\)\)/);
  const st = M.defaultState(), m = M.master("I'm so angry", st);
  assert.equal(M.card(st, m).step, M.card(st, m, { faith: true }).step, "the step is the same with faith on");
});
test("UI: scene follows the peace band, dark mode, reduced motion, offline, labels and tap targets", () => {
  const css = read("style.css"), index = read("index.html"), app = read("js/app.js");
  ["a-little", "growing", "close", "steady"].forEach(b => assert.match(css, new RegExp(`body\\[data-peace="${b}"\\]`)));
  assert.match(app, /document\.body\.dataset\.peace = MF\.Peace\.band\(reading\.peace\.P\)\.replace\(" ", "-"\)/);
  assert.match(app, /delete document\.body\.dataset\.peace;\s*crises\.forEach/);
  assert.match(css, /@media \(prefers-color-scheme: dark\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.breath-circle[^{]*\{[^}]*transform: scale\(0\.85\) !important/);
  assert.match(index, /<meta name="color-scheme" content="light dark" \/>/);
  assert.ok(!/(src|href)="https?:/.test(index), "no external assets in the page");
  assert.ok(!/url\(\s*["']?https?:|@import|@font-face/.test(css), "no external fonts or images");
  assert.match(index, /id="breath-phase" class="breath-phase" aria-live="polite"/);
  assert.match(css, /\.friend \{[^}]*min-height: 9\.6rem/);
  assert.match(css, /\.chip \{[^}]*min-height: 2\.75rem/);
  assert.match(css, /\.tabs \[role="tab"\] \{[^}]*min-height: 2\.9rem/);
  const order = [...index.matchAll(/<div class="tile[^"]*" id="(t-[a-z]+)"/g)].map(x => x[1]);
  assert.deepEqual(order, ["t-room", "t-peace", "t-feel", "t-connect", "t-conflict", "t-reality", "t-forgive", "t-pattern", "t-affirm", "t-step"]);
  assert.ok(!/sound|Audio\(|AudioContext/.test(read("js/features/practices.js").replace(/No sound[^\n]*/g, "")), "no sound");
});
test("contrast: muted text stays readable on cards in both themes (WCAG AA 4.5:1)", () => {
  const css = read("style.css");
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const L = h => { const [r, g, b] = hex(h); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const vars = block => Object.fromEntries([...block.matchAll(/--([a-z0-9-]+): (#[0-9a-f]{6})/g)].map(m => [m[1], m[2]]));
  const light = vars(css.split("@media (prefers-color-scheme: dark)")[0].split("}")[0]);
  const dark = vars(css.split("@media (prefers-color-scheme: dark)")[1].split("}")[0]);
  [light, dark].forEach(v => ["card", "tile", "tile-peace", "tile-soft", "tile-forgive", "tile-step", "bg"].forEach(bg => {
    assert.ok(ratio(v.muted, v[bg]) >= 4.5, `muted on ${bg}: ${ratio(v.muted, v[bg]).toFixed(2)}`);
    assert.ok(ratio(v.ink, v[bg]) >= 7, `ink on ${bg}`);
  }));
  [light, dark].forEach(v => assert.ok(ratio(v["on-accent"], v.accent) >= 4.5, "Update button text"));
});

console.log(`\n${passed} passed`);
