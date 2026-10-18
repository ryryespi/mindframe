// Run: node tests/freeing.test.js   (no dependencies)
// The feelings picker (one master path for text and picked states), the
// freeing mix (P never falls, shame never rises, master's step direction,
// one band per step), false humility vs. true humility (negation-aware),
// the words, the mf 3 export round trip, and crisis safety.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const M = require("./mf.js");
const FR = require("../js/features/freeing.js");
const R = require("../js/core/reality.js");
const P = require("../js/core/peace.js");
const C = require("../js/features/writer/comfort.js");

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}
const I = n => M.NAMES.indexOf(n);
const DIGIT = /[0-9]/;
const NOW = Date.parse("2026-10-18T12:00:00");
const read = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
/** The numeric parts of a reading that must match between two paths. */
const nums = m => JSON.stringify({ e: m.e, next: m.next, a: m.a, b: m.b, s: m.s, d: m.d, lambda: m.lambda, mover: m.mover, conflicts: m.conflicts, positives: m.positives, peace: m.peace, recovery: m.recovery, forgive: m.forgive, freeing: m.freeing, small: m.small, grand: m.grand, practice: m.practice });
const SPEC = { levels: { shame: "strongly" }, extras: ["blame", "putdown"] };

// ---------- 1. The picker's levels ----------
test("picker: four levels at the band midpoints, plain words, grounding chips start at quite", () => {
  assert.deepEqual(M.LEVELS, { off: 0, "a little": 0.15, quite: 0.45, strongly: 0.8 });
  assert.deepEqual(M.LEVEL_ORDER.map(M.nextLevel), ["a little", "quite", "strongly", "off"]);
  assert.deepEqual(M.PICK_ORDER.map(n => M.PICK_WORD[n]), ["afraid", "sad", "angry", "ashamed", "calm", "connected", "hopeful", "replaying thoughts", "avoiding"]);
  assert.deepEqual(M.pickVector({}), [0, 0, 0, 0, 0.45, 0.45, 0.45, 0, 0]);
  // Each midpoint reads back as its own band word.
  M.LEVEL_ORDER.forEach(l => assert.equal(M.levelOf(M.LEVELS[l]), l));
  const v = M.pickVector({ fear: "a little", anger: "strongly", calm: "off" });
  assert.deepEqual(M.vectorLevels(v), { fear: "a little", sadness: "off", anger: "strongly", shame: "off", calm: "off", connection: "quite", hope: "quite", rumination: "off", avoidance: "off" });
});
test("picker extras: 'blaming myself' and 'putting myself down' are nudges onto existing movers (no new movers)", () => {
  assert.deepEqual(M.EXTRAS.map(c => c.id).sort(), ["blame", "putdown"]);
  const p = M.fromPick(SPEC);
  assert.equal(p.e.length, 9);
  assert.deepEqual(p.extras, ["blame", "putdown"]);
  assert.ok(p.e[I("shame")] > 0.8, "shame nudged above the strongly midpoint");
  assert.ok(p.e[I("rumination")] > 0, "self-blame nudges replaying");
  assert.ok(p.e[I("hope")] < 0.45, "the put-down dims hope");
  assert.deepEqual(p.data.forgive, { cSelf: 0.5, cOther: 0 });
  assert.equal(p.data.small.u, 0.5);
  assert.equal(p.crisis, false);
  // Without extras the picked vector is exactly the midpoints.
  assert.deepEqual(M.fromPick({ levels: { shame: "strongly" } }).e, M.pickVector({ shame: "strongly" }));
});

// ---------- 2. One master path ----------
test("text path: master(text) is masterState(combine(state.e, words), …) — one shared path", () => {
  const st = M.defaultState();
  ["I'm ashamed and so alone, nobody cares", "It was my fault, I can't forgive myself", "everyone is better than me", "", "I feel calm and hopeful"].forEach(t => {
    const w = M.fromText(t);
    const a = M.master(t, st, { now: NOW });
    const b = M.masterState(M.combine(st.e, w.w), st, { now: NOW }, w);
    assert.equal(nums(a), nums(b), t);
  });
});
test("picker path equals the text path for the same state", () => {
  const st = M.defaultState();
  // Same vector, no extras: picking it is the same reading as stepping from it with no text.
  [{ levels: { shame: "strongly", rumination: "quite" } }, { levels: { fear: "a little", anger: "strongly", calm: "off" } }, {}].forEach(pick => {
    const a = M.masterPick(pick, st, { now: NOW });
    const b = M.master("", { ...st, e: M.pickVector(pick.levels) }, { now: NOW });
    assert.equal(nums(a), nums(b), JSON.stringify(pick));
  });
  // With extras: the same as the state entry with the chips' data.
  const p = M.fromPick(SPEC);
  assert.equal(nums(M.masterPick(SPEC, st, { now: NOW })), nums(M.masterState(p.e, st, { now: NOW }, { data: p.data })));
  // And a text reading, re-entered as a vector with its data, gives the same numbers.
  const t = "It was my fault and I'm worthless";
  const m = M.master(t, st, { now: NOW });
  assert.equal(nums(M.masterState(m.e, st, { now: NOW }, { data: M.fromText(t).data })), nums(m));
});

// ---------- 3. The freeing mix ----------
test("freeing mix for ashamed strongly + blaming myself + putting myself down: ease shame and replaying, grow calm, connection and hope", () => {
  const m = M.masterPick(SPEC, M.defaultState());
  const f = m.freeing;
  assert.ok(f.ease.includes("shame") && f.ease.includes("rumination"), f.ease.join());
  assert.deepEqual(f.grow, ["calm", "connection", "hope"]);
  assert.ok(f.P1 > f.P0 && f.target[I("shame")] < m.e[I("shame")]);
  assert.ok(P.band(f.P1) !== P.band(f.P0), "the peace band rises");
  assert.equal(f.show, true);
  assert.equal(f.selfBlame, true);
  assert.equal(M.line(m.e, f.target, m.pick.extras),
    "Now: ashamed strongly, replaying a little, calm quite, connected quite, hopeful quite, blaming myself, putting myself down \u2192 Freeing mix: ashamed off, replaying off, calm strongly, connected strongly, hopeful strongly");
});
test("freeing mix (many states): P never falls, shame never rises, J rises, one band per mover per step, ≤ K movers, toward home in master's step direction", () => {
  const rnd = M.rng(18);
  const st = M.defaultState();
  let checked = 0;
  for (let k = 0; k < 160; k++) {
    const levels = Object.fromEntries(M.PICK_ORDER.map(n => [n, M.LEVEL_ORDER[Math.floor(rnd() * 4)]]));
    const extras = ["blame", "putdown"].filter(() => rnd() < 0.5);
    const m = M.masterPick({ levels, extras }, st);
    const f = m.freeing;
    assert.ok(f.P1 >= f.P0 - 1e-9, `P ${f.P0} -> ${f.P1}`);
    assert.ok(f.target[I("shame")] <= m.e[I("shame")] + 1e-9, "shame never rises");
    assert.ok(f.J1 >= f.J0 - 1e-9);
    let cur = m.e.slice(), Pcur = f.P0;
    f.steps.forEach(stp => {
      assert.ok(stp.moves.length >= 1 && stp.moves.length <= FR.K);
      assert.ok(stp.P >= Pcur - 1e-4, "P rises step by step");
      // master's own next step from this point
      const next = M.master("", { ...st, e: cur }, { sim: false }).next;
      stp.moves.forEach(mv => {
        const j = I(mv.name), h = m.h[j];
        assert.equal(mv.from, cur[j]);
        assert.ok((mv.to - mv.from) * (h - mv.from) > 0, `${mv.name} moves toward home`);
        assert.ok(Math.abs(mv.to - h) <= Math.abs(mv.from - h) + 1e-9, "never past home");
        assert.ok((next[j] - cur[j]) * (mv.to - mv.from) >= 0, `${mv.name} agrees with master's step`);
        assert.ok(Math.abs(FR.bandIndex(mv.to) - FR.bandIndex(mv.from)) <= 1, `${mv.name} one band`);
        cur[j] = mv.to;
      });
      Pcur = stp.P;
      checked += 1;
    });
    assert.deepEqual(cur, f.target);
    assert.ok(f.steps.length <= FR.T);
  }
  assert.ok(checked > 100, `steps checked ${checked}`);
});
test("freeing mix: each step is the exact optimum (independent brute force over every one-band move set)", () => {
  const st = M.defaultState();
  [SPEC, { levels: { sadness: "strongly", rumination: "quite", hope: "a little" }, extras: ["putdown"] }, { levels: { anger: "quite", shame: "quite" }, extras: ["blame"] }].forEach(pick => {
    const m = M.masterPick(pick, st);
    const f = m.freeing, h = m.h, V = st.vars;
    const Pf = e => P.score(e, h, V, R.conflicts(e, []), m.tsize).raw;
    const J = e => Pf(e) - FR.MU * FR.load(e, h, f.cSelf, f.u);
    // every subset of up to three movable movers (independent enumeration by bitmask)
    let best = -Infinity;
    for (let mask = 1; mask < 512; mask++) {
      const bits = M.NAMES.map((n, j) => (mask >> j) & 1);
      if (bits.reduce((a, b) => a + b, 0) > FR.K) continue;
      const e2 = m.e.slice();
      let okMove = true;
      bits.forEach((b, j) => { if (!b) return; const to = M.r2(FR.oneBand(m.e[j], h[j])); if (to === m.e[j]) okMove = false; e2[j] = to; });
      if (!okMove || Pf(e2) < Pf(m.e) - 1e-12 || e2[I("shame")] > m.e[I("shame")]) continue;
      best = Math.max(best, J(e2));
    }
    assert.ok(Math.abs(f.steps[0].J - Math.round(best * 10000) / 10000) < 1e-4, `${f.steps[0].J} vs ${best}`);
  });
});
test("freeing mix at home: nothing to move, no tile", () => {
  const st = M.defaultState();
  const m = M.masterState(st.home, st, {});
  assert.equal(m.freeing.steps.length, 0);
  assert.deepEqual(m.freeing.target, st.home);
  assert.equal(m.freeing.show, false);
  assert.equal(M.cardLines(m), null);
});

// ---------- 4. False humility vs. true humility ----------
test("false humility: self-deprecation and disqualifying the positive are found, by kind", () => {
  const cases = [["I'm worthless", "worthless"], ["I am nothing", "worthless"], ["I'm useless at everything", "worthless"], ["I don't deserve love", "undeserving"], ["who am I to ask for help", "undeserving"],
    ["I'm not good enough", "undeserving"], ["it was just luck", "disqualify"], ["I only got lucky", "disqualify"], ["anyone could have done it", "disqualify"], ["they're just being nice", "disqualify"],
    ["everyone is better than me", "compare"], ["I'm worse than everyone", "compare"]];
  cases.forEach(([t, kind]) => { const s = R.smallness(t); assert.equal(s.u, 0.5, t); assert.deepEqual(s.kinds, [kind], t); });
  assert.equal(R.smallness("I'm worthless, it was just luck").u, 0.75, "two cues");
});
test("false humility is negation-aware and not fooled by look-alikes", () => {
  ["I don't think I'm worthless", "I'm not worthless", "it wasn't just luck", "I don't feel like everyone is better than me", "It's not that I don't deserve it", "I'm nothing like him", "I don't deserve this treatment", "", "I did well today"].forEach(t => assert.equal(R.smallness(t).u, 0, t));
});
test("false humility: crisis wording gives nothing; it nudges shame up and hope down; P uses the true size max(g, u)", () => {
  assert.equal(R.smallness("I'm worthless and I want to die").u, 0);
  assert.deepEqual(M.fromText("I'm worthless and I want to die"), { crisis: true });
  const st = M.defaultState();
  const h = R.hook("who am I to ask");
  assert.deepEqual(h.add, { shame: 0.2 });
  assert.deepEqual(h.neg, { hope: 0.2 });
  const m = M.master("everyone is better than me", st);
  assert.equal(m.small.u, 0.5);
  assert.equal(m.tsize, 0.5);
  assert.equal(m.peace.Pg, M.r2(1 - st.vars.delta * 0.5));
  assert.equal(M.master("I'm so sad", st).tsize, 0, "no put-down, no change to P");
});
test("words: the true-size reality check (not bigger, not smaller) and true humility, words only", () => {
  const st = M.defaultState();
  const m = M.master("everyone is better than me and it was just luck", st);
  const r = M.realityLines(m);
  assert.match(r[0], /^Reality check: part of this thought sounds very sure that what went well was only luck, and that everyone is better than you\. That is smaller than true\.$/);
  assert.match(r[1], /^Not bigger, not smaller: /);
  const c = M.card(st, m);
  assert.ok(c.freeing.lines.includes("True humility sees you at your real size: not worse than others, not better; worthy of kindness and still learning."));
  assert.match(c.peace.join(" "), /Putting yourself down takes .* too; seeing yourself at your true size makes room for peace\./);
  const pk = M.masterPick({ levels: { shame: "quite" }, extras: ["putdown"] }, st);
  assert.match(M.realityLines(pk)[0], /you marked putting yourself down/);
});
test("words: the freeing tile is words only, faith wording only with faith on, and routes self-blame to Grace", () => {
  const st = M.defaultState();
  const thoughts = ["It was my fault, I'm worthless", "I'm ashamed and so alone", "who am I to try", "I feel calm"];
  thoughts.forEach(t => [false, true].forEach(faith => {
    const lines = M.lines(st, M.master(t, st), { faith, seed: 2 }).join("\n");
    assert.ok(!DIGIT.test(lines), `${t}: ${lines}`);
  }));
  const m = M.masterPick(SPEC, st);
  const off = M.cardLines(m), on = M.cardLines(m, { faith: true });
  assert.match(off.lines[0], /^Your freeing mix: ease the shame and the replaying; grow calm, connection, and hope\.$/);
  assert.ok(!off.lines.some(x => /Romans|Teresa|God/.test(x)));
  assert.ok(on.lines.includes(FR.FAITH));
  assert.match(FR.FAITH, /sober judgment \(from Romans\)/);
  assert.match(FR.FAITH, /to walk in truth \(Teresa of \u00C1vila\)/);
  assert.match(FR.FAITH, /we love because he first loved us \(from First John\)/);
  assert.equal(off.grace, true, "Forgive myself button");
  assert.match(off.step, /self-compassion break/i);
  // Self-blame without enough shame for the forgiveness tile: the Grace line is in the freeing tile.
  const low = M.masterPick({ levels: { shame: "a little" }, extras: ["blame"] }, st);
  if (low.freeing.show && !(low.forgive && low.forgive.path === "self")) assert.ok(M.cardLines(low).lines.includes(FR.GRACE));
  assert.equal(M.cardLines(M.masterPick({ levels: { shame: "quite" } }, st)).grace, false);
});

// ---------- 5. Export (mf 3) ----------
test("export: mf 3 round trip with pick, extra and mix; the readable free line is rebuilt and ignored on read", () => {
  const st0 = M.defaultState();
  const m = M.masterPick(SPEC, st0);
  const st = M.refreshIdeal({ ...st0, e: m.e, pick: { e: m.pick.base, extras: m.pick.extras }, mix: m.freeing.target });
  const code = M.serialize(st);
  assert.match(code, /^mf 3\n/);
  assert.match(code, /\npick shame=0\.80 calm=0\.45 connection=0\.45 hope=0\.45\n/);
  assert.match(code, /\nextra blame putdown\n/);
  assert.match(code, /\nmix calm=0\.80 connection=0\.80 hope=0\.80\n/);
  assert.match(code, /\nfree Now: ashamed strongly, .* \u2192 Freeing mix: ashamed off, .*\n$/);
  const p = M.parse(code);
  assert.equal(p.ok, true);
  assert.equal(p.from, 3);
  assert.deepEqual(p.state.pick, st.pick);
  assert.deepEqual(p.state.mix, st.mix);
  assert.equal(M.serialize(p.state), code);
  // A tampered free line changes nothing (it is rebuilt from the numbers).
  assert.equal(M.serialize(M.parse(code.replace(/free Now:[^\n]*/, "free anything at all")).state), code);
  assert.ok(!/[A-Z]/.test(code.split("\nfree ")[0].replace(/^mf 3/, "")), "numbers and labels only before the readable line");
});
test("export: mf 2 and mf 1 still import; unknown extra chips are a friendly error", () => {
  const two = "mf 2\nhome calm=0.80 connection=0.80 hope=0.80\ne shame=0.60 calm=0.50 connection=0.50 hope=0.50\n";
  const p = M.parse(two);
  assert.equal(p.ok, true);
  assert.equal(p.from, 2);
  assert.equal(p.state.pick, null);
  assert.equal(p.state.mix, null);
  assert.equal(p.state.e[I("shame")], 0.6);
  assert.match(M.serialize(p.state), /^mf 3\n/);
  assert.equal(M.parse("mf 1\ne fear=0.20 guilt=0.50").ok, true);
  const bad = M.parse("mf 3\nextra blame shout");
  assert.equal(bad.ok, false);
  assert.match(bad.errors[0].msg, /\u201Cshout\u201D isn't an extra chip/);
});
test("export line: the compact readable form", () => {
  const now = M.pickVector({ shame: "strongly", rumination: "quite" });
  const target = M.pickVector({ shame: "a little", calm: "strongly", connection: "strongly", hope: "strongly" });
  assert.equal(M.line(now, target), "Now: ashamed strongly, replaying quite, calm quite, connected quite, hopeful quite \u2192 Freeing mix: ashamed a little, replaying off, calm strongly, connected strongly, hopeful strongly");
  assert.equal(M.line(M.pickVector({}), M.pickVector({})), "Now: at rest \u2192 Freeing mix: at rest");
});
test("comfort prompt: the freeing mix and the put-down signal, never the raw text", () => {
  const st = M.defaultState();
  const raw = "everyone is better than me and it was just luck, my fault";
  const p = C.buildPrompt(st, M.master(raw, st), { raw });
  assert.match(p, /Freeing mix \(inner peace \d\.\d\d -> \d\.\d\d, shame only goes down\): Now: /);
  assert.match(p, /Putting yourself down \(false humility\) signal: 0\.75 \(disqualify, compare\)/);
  assert.match(p, /True humility sees you at your real size/);
  assert.ok(!p.includes("better than me") && !p.includes("just luck"), "no raw text");
  const q = C.buildPrompt(st, M.masterPick(SPEC, st), {});
  assert.match(q, /chosen in the feelings picker/);
});

// ---------- 6. Crisis, determinism, files ----------
test("crisis: text crisis is unchanged; the picker has no text path; the 988 line is always on the page", () => {
  ["I want to die", "I want to end it all", "I'm worthless and might hurt myself"].forEach(t => assert.deepEqual(M.master(t, M.defaultState()), { crisis: true }));
  assert.equal(M.masterPick(SPEC, M.defaultState()).crisis, false);
  const index = read("index.html"), app = read("js/app.js");
  assert.match(index, /<p class="safety-banner">In crisis, call or text <strong>988<\/strong>/);
  assert.ok(index.indexOf("safety-banner") < index.indexOf('id="picker"'), "the banner sits above the picker");
  assert.match(app, /if \(picking && Grounding\.isCrisis\(\$\("input"\)\.value\)\) \{ crisis\(true\); return false; \}/);
});
test("deterministic: the same pick gives the same reading and the same freeing mix", () => {
  const st = M.defaultState();
  assert.equal(nums(M.masterPick(SPEC, st, { now: NOW })), nums(M.masterPick(SPEC, st, { now: NOW })));
});
test("UI and docs: Write / Pick feelings toggle, chips, the freeing tile, Copy freeing mix, sw v18, README", () => {
  const index = read("index.html"), sw = read("sw.js"), r = read("README.md"), css = read("style.css");
  assert.match(index, /<button type="button" id="mode-write" aria-pressed="true">Write<\/button>/);
  assert.match(index, /<button type="button" id="mode-pick" aria-pressed="false">Pick feelings<\/button>/);
  assert.match(index, /id="picker" class="picker hidden"/);
  assert.match(index, /id="t-free"/);
  assert.match(index, /id="copy-mix" class="secondary">Copy freeing mix</);
  assert.match(css, /\.feel-chip \{[^}]*min-height: 3\.4rem/);
  assert.match(css, /\.mode button \{[^}]*min-height: 2\.75rem/);
  assert.match(sw, /mindframe-shell-v18/);
  ["./js/features/freeing.js", "./js/features/picker.js"].forEach(f => assert.ok(sw.includes(f), f));
  ["## Pick feelings", "## The freeing mix", "J(e) = P(e) \u2212 \u03BC\u00B7N(e)", "mf 3", "Tangney, J. P. (2000)", "Gilbert, P., & Procter, S. (2006)", "Gilbert, P. (2009)", "Burns, D. D. (1980)", "Interior Castle", "Romans 12:3", "1 John 4:19"].forEach(x => assert.ok(r.includes(x), x));
});
test("contrast: chip levels stay readable in both themes (WCAG AA 4.5:1)", () => {
  const css = read("style.css");
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const L = h => { const [r, g, b] = hex(h); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const vars = block => Object.fromEntries([...block.matchAll(/--([a-z0-9-]+): (#[0-9a-f]{6})/g)].map(m => [m[1], m[2]]));
  const light = vars(css.split("@media (prefers-color-scheme: dark)")[0].split("}")[0]);
  const dark = vars(css.split("@media (prefers-color-scheme: dark)")[1].split("}")[0]);
  [light, dark].forEach(v => {
    ["lvl1", "lvl2", "tile-free"].forEach(bg => { assert.ok(ratio(v.muted, v[bg]) >= 4.5, `muted on ${bg}: ${ratio(v.muted, v[bg]).toFixed(2)}`); assert.ok(ratio(v.ink, v[bg]) >= 7, `ink on ${bg}`); });
    assert.ok(ratio(v["on-lvl3"], v.lvl3) >= 4.5, "strongly chip text");
  });
});

console.log(`\n${passed} passed`);
