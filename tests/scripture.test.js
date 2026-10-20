// Run: node tests/scripture.test.js   (no dependencies)
// push24: Loosen the grip (features/grip.js), Past to future (features/past.js),
// Scripture for this moment and Verses together (features/scripture.js), the
// parable of peace and Continue your story (features/parable.js): text
// integrity against the WEB source lines, theme mapping, determinism,
// Another verse, faith gating, crisis suppression, the synthesis, the stages'
// equations, the parable and the picks.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const M = require("./mf.js");
const S = global.MF.Scripture, G = global.MF.Grip, P = global.MF.Past, PB = global.MF.Parable;

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}
const read = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const I = n => M.NAMES.indexOf(n);
const KAI = "My coworkers criticized me in front of everyone, I want to snap back but I know they're stressed";
const LOOP = "I keep replaying what I did over and over, I should have been kinder, I feel so ashamed";
const FEAR = "I am so anxious about tomorrow and I'm scared it will go wrong";
const reading = t => M.master(t, M.defaultState());
const SOURCE = Object.fromEntries(read("tests/fixtures/scripture-web.txt").trim().split("\n").map(l => { const [b, cv, ...r] = l.split(" "); return [`${b} ${cv}`, r.join(" ")]; }));

test("text integrity: 90 WEB verses, each exactly its source line, unique, with a reference", () => {
  assert.equal(S.TRANSLATION, "WEB");
  assert.equal(S.VERSES.length, 90);
  assert.ok(S.VERSES.length >= 60 && S.VERSES.length <= 90);
  assert.equal(new Set(S.VERSES.map(v => v.code)).size, 90, "no duplicates");
  S.VERSES.forEach(v => {
    assert.equal(v.text, SOURCE[v.code], `${v.code} is exact`);
    assert.match(v.ref, /^[1-3]? ?[A-Z][a-z]+ \d+:\d+$/);
    assert.ok(S.THEMES[v.theme], `${v.code} has a known theme`);
  });
  Object.keys(S.THEMES).forEach(t => assert.ok(S.VERSES.filter(v => v.theme === t).length >= 4, `${t} has verses`));
  const sc = read("js/features/scripture.js");
  assert.match(sc, /eng-web_vpl\.txt/);
  assert.ok(!/fetch\(|XMLHttpRequest/.test(sc + read("js/features/grip.js") + read("js/features/past.js") + read("js/features/parable.js")), "no network");
});

test("theme mapping: movers, the lever, and the Kai virtues", () => {
  const base = { ...reading("ok"), peace: null, kai: null };
  ["fear", "sadness", "anger", "shame", "rumination", "avoidance"].forEach(n => {
    const e = M.fromObj({ [n]: 0.8 });
    assert.equal(S.theme({ ...base, e, next: e }), n);
  });
  assert.equal(S.theme({ ...base, e: M.fromObj({}), next: M.fromObj({}) }), "calm", "settled → calm");
  assert.equal(S.theme({ ...base, peace: { P: 0.3, lever: { name: "connection" } } }), "connection", "the lever wins over the dominant mover");
  const kai = (lever, I0) => S.theme({ ...base, kai: { X: 0.7, S: 0.5, I: I0, lever } });
  assert.equal(kai("F", 0.05), "patience");
  assert.equal(kai("R", 0.05), "gentleness");
  assert.equal(kai("E", 0.05), "connection");
  assert.equal(kai("A", 0.05), "shame");
  assert.equal(kai("R", 0.4), "selfcontrol", "a strong urge → self-control");
  assert.equal(S.theme(reading(KAI)), "shame", "the sample: weakest is self-awareness (worth)");
  assert.equal(S.theme(reading(FEAR)), "fear");
});

test("determinism: the same numbers and words give the same verse; Another verse always moves; varied across readings", () => {
  const a = reading(FEAR), b = reading(FEAR), o = { faith: true, text: FEAR };
  assert.equal(S.seed(a, o), S.seed(b, o));
  assert.deepEqual(S.pick(a, o), S.pick(b, o));
  let prev = S.pick(a, o).verse.code;
  for (let c = 1; c < 12; c++) { const v = S.pick(a, { ...o, offset: c }).verse.code; assert.notEqual(v, prev, `Another verse #${c} gives a new verse`); prev = v; }
  const T = ["I feel sad", "I feel very sad and lonely", "I am angry", "I am furious and hurt", FEAR, KAI, LOOP];
  assert.equal(new Set(T.map(t => S.seed(reading(t), { text: t }))).size, 7, "different numbers → different seeds");
  assert.notEqual(S.seed(a, { text: "one" }), S.seed(a, { text: "two" }), "the words are mixed in");
  assert.equal(S.hash("abc"), 440920331, "FNV-1a 32-bit");
});

test("cornerstone: a documented constant from \"Ephesians 2:20\", mixed in first; no entropy, anchors reproducibility", () => {
  assert.equal(S.CORNERSTONE, S.hash("Ephesians 2:20"));
  const m = reading(FEAR), n = S.numbers(m), t = S.textHash(FEAR);
  assert.equal(S.seed(m, { text: FEAR, offset: 3 }), S.mix(S.CORNERSTONE, n, t, 3), "seed = mix(cornerstone, numbers, text, counter)");
  assert.notEqual(S.mix(S.CORNERSTONE, n, t, 0), S.mix(n, S.CORNERSTONE, t, 0), "order matters: the cornerstone comes first");
  // No entropy: over many inputs, seeds with the constant are distinct exactly when the inputs are (a bijection in practice).
  const inputs = Array.from({ length: 2000 }, (_, i) => [i * 2654435761 >>> 0, i % 97, i % 5]);
  const withC = new Set(inputs.map(([x, y, z]) => S.mix(S.CORNERSTONE, x, y, z))), without = new Set(inputs.map(([x, y, z]) => S.mix(0, x, y, z)));
  assert.equal(withC.size, without.size, "the constant neither adds nor removes distinct outcomes");
  // Spread: indices into a list of 8 are close to uniform (chi-square, 7 df, well under 24.3 at p = .001).
  const bins = new Array(8).fill(0); inputs.forEach(([x, y, z]) => bins[S.mix(S.CORNERSTONE, x, y, z) % 8]++);
  const chi = bins.reduce((a, o) => a + (o - 250) ** 2 / 250, 0);
  assert.ok(chi < 24.3, `chi-square ${chi.toFixed(1)}`);
  S.CORNER_VERSES.forEach(v => assert.equal(v.text, SOURCE[v.code], `${v.code} exact`));
  const sc = read("js/features/scripture.js");
  assert.match(sc, /adds no entropy/); assert.match(sc, /FNV-1a\("Ephesians 2:20"\)/);
});

test("cornerstone scene: counter shows the seed counter, seeds glow and settle, reduced motion and dark mode", () => {
  const html = read("index.html"), css = read("style.css"), sc = read("js/features/scripture.js");
  assert.match(html, /id="cs-scene"[^>]*role="img"/);
  assert.match(html, /class="cs-ledge"/); assert.match(html, /class="cs-stone"/);
  assert.equal((html.match(/class="cs-seed /g) || []).length, 5);
  assert.match(html, /seed counter <span id="cs-count">0<\/span>/);
  assert.match(sc, /\$\("cs-count"\)\.textContent = String\(offset\)/);
  assert.match(sc, /classList\.add\("composing"\)/);
  assert.match(css, /\.cs-scene\.composing \.cs-seed \{ animation: cs-glow/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.cs-seed, \.cs-scene\.composing \.cs-seed \{ animation: none !important; \} \}/);
  assert.ok(/\.cs-water \{ fill: var\(--sky1\)/.test(css) && /\.cs-seed \{ fill: var\(--warm\)/.test(css), "colors from the theme variables, so dark mode follows");
});

test("faith gating and crisis: nothing before Update, faith off, or in a crisis", () => {
  const m = reading(FEAR);
  assert.equal(S.pick(m, { faith: false }), null);
  assert.equal(S.together(m, { faith: false }), null);
  assert.equal(S.pick(null, { faith: true }), null);
  const c = reading("I want to kill myself");
  assert.equal(c.crisis, true);
  assert.equal(S.pick(c, { faith: true }), null);
  assert.equal(S.together(c, { faith: true }), null);
  assert.equal(S.pick(m, { faith: true, crisis: true }), null);
  assert.equal(G.detect(c, "I want to kill myself"), null);
  assert.equal(P.detect(c, "I want to kill myself"), null);
  assert.deepEqual(PB.parable(c, { faith: true }), []);
  assert.equal(PB.more(c, { faith: true }), null);
  const app = read("js/features/scripture.js");
  assert.match(app, /app\.inCrisis\(\) \? null : app\.m\(\)/);
  assert.match(app, /app\.onCrisis\(render\)/);
});

test("Verses together: two or three distinct themes, exact verses, feeling named first, no instant fix, a daily habit", () => {
  [FEAR, KAI, LOOP, "I feel sad and alone"].forEach(t => {
    const m = reading(t), g = G.detect(m, t, M.defaultState()), p = P.detect(m, t);
    const tog = S.together(m, { faith: true, grip: g, past: p });
    assert.ok(tog.verses.length >= 2 && tog.verses.length <= 3);
    assert.equal(new Set(tog.themes).size, tog.themes.length);
    tog.verses.forEach(v => assert.equal(v.text, SOURCE[v.code]));
    assert.match(tog.lines[0], /^(You are carrying .* and that makes sense|Things feel fairly settled)/, "name and validate first");
    assert.match(tog.lines[1], /share one thread/);
    assert.match(tog.lines.join(" "), /Your inner peace is .* toward steady|keeps it near steady/);
    assert.match(tog.lines.join(" "), /not all at once/);
    assert.ok(!/instantly|right away|cure|fix everything|guarantee/i.test(tog.lines.join(" ")), "no instant-fix promises");
    assert.match(tog.lines[tog.lines.length - 1], /^A small daily habit: /);
    tog.lines.forEach(l => assert.ok(!S.VERSES.some(v => l.includes(v.text)), "verse text is shown separately, not inside the synthesis"));
    assert.deepEqual(S.together(m, { faith: true, grip: g, past: p }), tog, "deterministic");
  });
  const m = reading(FEAR);
  assert.equal(S.together(m, { faith: true }).themes[0], "fear");
  assert.ok(S.together(m, { faith: true }).themes.includes("hope"), "P below steady → hope");
});

test("Loosen the grip: fear, loops across days, gentle vice cues with negation; loosening, never removal", () => {
  const f = reading(FEAR), gf = G.detect(f, FEAR, M.defaultState());
  assert.equal(gf.show, true); assert.equal(gf.top, "fear"); assert.equal(gf.tool, "defuse");
  const l = reading(LOOP), gl = G.detect(l, LOOP, M.defaultState());
  assert.equal(gl.top, "loop"); assert.equal(gl.tool, "window", "a loop cue → a worry window");
  const days = { days: Array.from({ length: 4 }, (_, i) => ({ day: `2026-10-1${i}`, e: M.fromObj({ rumination: 0.7 }) })) };
  const r = "I keep thinking about it", mr = reading(r);
  assert.ok(G.detect(mr, r, days).pull.loop > G.detect(mr, r, M.defaultState()).pull.loop, "repetition across days raises the loop pull");
  const v = "I am so jealous of her and I resent my brother", gv = G.detect(reading(v), v, M.defaultState());
  assert.deepEqual(gv.vices.sort(), ["envy", "resentment"]); assert.equal(gv.tool, "surf");
  assert.deepEqual(G.detect(reading("I'm not jealous at all"), "I'm not jealous at all", M.defaultState()).vices, [], "negation");
  [gf, gl, gv].forEach(g => {
    ["fear", "loop", "vice"].forEach(k => assert.ok(g.after[k] <= g.pull[k]));
    assert.ok(g.L > 0 && g.L < 1);
    const text = G.lines(g, reading(FEAR), { faith: false }).join(" ");
    assert.match(text, /loosen/); assert.match(text, /not to get rid of them/);
    assert.ok(!/\b(remove|eliminate|erase|stop thinking)\b/i.test(text.replace(/not to get rid of them/, "")), "never claims to remove thoughts");
    assert.ok(!/sinful|shameful|disgusting|bad person/i.test(text), "no shaming");
  });
  assert.equal(G.detect(reading("I feel calm and happy today"), "I feel calm and happy today", M.defaultState()).show, false);
  assert.match(G.lines(gl, l, { faith: true }).join(" "), /2 Corinthians 10:5; Philippians 4:8/);
  assert.ok(!/Corinthians/.test(G.lines(gl, l, { faith: false }).join(" ")), "faith off: no scripture");
  G.faithVerses().forEach(x => assert.equal(x.text, SOURCE[x.code]));
});

test("Past to future: technique by the numbers, past terms ease and hope grows, faith passages exact", () => {
  const l = reading(LOOP), p = P.detect(l, LOOP);
  assert.equal(p.show, true);
  assert.ok(["self", "loop"].includes(p.tech));
  assert.ok(p.after.shame <= p.before.shame && p.after.rumination <= p.before.rumination && p.after.hope >= p.before.hope);
  const o = "I can't stop thinking about what they did to me years ago, I resent them", po = P.detect(reading(o), o);
  assert.equal(po.show, true);
  assert.equal(po.tech, reading(o).forgive.path === "other" && po.score.other > po.score.self && po.score.other > po.score.loop ? "other" : po.tech);
  assert.equal(P.detect(reading("I feel calm today"), "I feel calm today").show, false);
  assert.equal(P.detect(reading("I don't regret it"), "I don't regret it").k, 0, "negation");
  const lowHope = { ...l, e: M.fromObj({ shame: 0.8, hope: 0.2 }), forgive: { path: "self" } };
  assert.equal(P.detect(lowHope, "I regret it").future, "bps");
  assert.equal(P.detect(lowHope, "I regret it").tech, "self");
  const text = P.lines(p, { faith: true }).join(" ");
  assert.match(text, /Philippians 3:13–14; Isaiah 43:18–19; Lamentations 3:22–23; Colossians 3:13/);
  assert.match(text, /doesn't have to lead it/);
  P.faithPassages().forEach(x => x.codes.forEach(c => assert.ok(x.text.includes(SOURCE[c]))));
  assert.ok(!/Philippians/.test(P.lines(p, { faith: false }).join(" ")));
  assert.equal(S.together(l, { faith: true, past: p, grip: G.detect(l, LOOP, M.defaultState()) }).themes.includes("renewal"), true, "past feeds the verse themes");
});

test("parable: five to eight sentences, companion and step, past to future, ends at rest; faith off has no scripture", () => {
  [FEAR, KAI, LOOP].forEach(t => [true, false].forEach(faith => {
    const m = reading(t), g = G.detect(m, t, M.defaultState()), p = P.detect(m, t);
    const tog = S.together(m, { faith, grip: g, past: p });
    const s = PB.parable(m, { faith, grip: g, past: p, together: tog, friend: "Willow" });
    assert.ok(s.length >= 5 && s.length <= 8, `${s.length} sentences`);
    assert.match(s[0], faith ? /^Seeds rested in still water above a stone counter set on the cornerstone, the way Christ is called the chief cornerstone \(1 Peter 2:6\).*\(Psalm 1:3\)\. Once, a traveler/ : /^Seeds rested in still water above a stone counter set on a strong cornerstone, waiting for their season\. Once, a traveler/);
    const n = s.join(" ").split(/(?<=[.!?])\s+(?=[A-Z])/).length;
    assert.ok(n >= 5 && n <= 8, `${n} real sentences`);
    assert.match(s.join(" "), /Willow/);
    assert.match(s[s.length - 1], /rest/);
    if (p.show) assert.match(s.join(" "), /crossroads/);
    if (faith) assert.match(s.join(" "), /\d+:\d+/); else assert.ok(!/\d+:\d+|Scripture|God/.test(s.join(" ")), "faith off: no scripture");
    assert.deepEqual(PB.parable(m, { faith, grip: g, past: p, together: tog, friend: "Willow" }), s);
  }));
});

test("Continue your story: two films and two or three songs, seeded, a prompt each, no worship with faith off", () => {
  assert.ok(PB.SONGS.length >= 40 && PB.SONGS.length <= 50);
  assert.equal(new Set(PB.SONGS.map(s => s.t + "|" + s.a)).size, PB.SONGS.length);
  PB.SONGS.forEach(s => { assert.ok(s.t && s.a && s.themes.length); s.themes.forEach(t => assert.ok(S.THEMES[t], t)); });
  assert.ok(PB.SONGS.some(s => s.worship) && PB.SONGS.some(s => !s.worship));
  [FEAR, KAI, LOOP].forEach(t => [true, false].forEach(faith => {
    const m = reading(t), tog = S.together(m, { faith });
    const x = PB.more(m, { faith, together: tog });
    assert.equal(x.films.length, 2);
    assert.ok(x.songs.length >= 2 && x.songs.length <= 3);
    x.films.forEach(f => assert.ok(global.MF.Movies.FILMS.some(g => g.t === f.title)));
    if (!faith) assert.ok(x.songs.every(s => !s.worship));
    x.songs.concat(x.films).forEach(s => assert.ok(s.line.length > 20));
    assert.deepEqual(PB.more(m, { faith, together: tog }), x, "seeded");
  }));
  assert.ok(!/lyrics:/i.test(read("js/features/parable.js")));
});

test("page and docs: the tile, Another verse, the companion's verse, scripts, sw v27, README", () => {
  const html = read("index.html"), sw = read("sw.js"), r = read("README.md");
  assert.match(html, /id="t-scripture"/); assert.match(html, /id="scripture-next"[^>]*>Another verse</); assert.match(html, /id="pet-verse"/);
  ["scripture", "grip", "past", "parable"].forEach(f => { assert.match(html, new RegExp(`js/features/${f}\\.js`)); assert.ok(sw.includes(`./js/features/${f}.js`)); });
  assert.match(sw, /mindframe-shell-v27/);
  assert.match(r, /## For this moment: grip, past to future, Scripture, a parable, and more/);
  [/Wegner, D\. M\./, /Masuda, A\./, /McGowan, S\. K\./, /Borkovec, T\. D\./, /Hayes, S\. C\./, /King, L\. A\. \(2001\)/, /Peters, M\. L\./, /Hofmann, S\. G\./, /Hershfield, H\. E\./].forEach(re => assert.match(r, re));
});

console.log(`\n${passed} passed`);
