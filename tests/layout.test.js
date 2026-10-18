// Run: node tests/layout.test.js   (no dependencies)
// The short card and the phone layout (push19): at most four default tiles,
// one insight picked by the numbers, a See more expander holding the rest,
// helper panels as accessible bottom sheets, the compact picker grid, and the
// slim chrome (banner, privacy line, tools row). The browser checks (See more,
// the sheet, no overflow at 360 px) are in the e2e run; these are static.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const M = require("./mf.js");
const W = require("../js/core/words.js");

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}
const read = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const index = read("index.html"), css = read("style.css"), app = read("js/app.js");
const outHtml = index.slice(index.indexOf('<section id="out"'), index.indexOf("</section>", index.indexOf('<section id="out"')));
const moreAt = outHtml.indexOf('<div id="more"');
const DIGIT = /[0-9]/;

test("card: at most four default tiles (headline, feeling, the insight slot, One step); the rest is under See more", () => {
  const before = outHtml.slice(0, moreAt);
  const tiles = [...before.matchAll(/<div class="tile[^"]*" id="(t-[a-z]+)"/g)].map(x => x[1]);
  const slots = (before.match(/id="insight-slot"/g) || []).length;
  assert.deepEqual(tiles, ["t-head", "t-feel", "t-step"]);
  assert.equal(slots, 1);
  assert.ok(tiles.length + slots <= 4);
  const rest = [...outHtml.slice(moreAt).matchAll(/<div class="tile[^"]*" id="(t-[a-z]+)"/g)].map(x => x[1]);
  assert.deepEqual(rest, ["t-peace", "t-connect", "t-conflict", "t-reality", "t-forgive", "t-free", "t-pattern", "t-affirm"]);
  assert.ok(outHtml.slice(moreAt).includes('id="progress"'), "progress lives under See more");
  assert.match(outHtml, /<button type="button" id="more-toggle" class="more-toggle" aria-expanded="false" aria-controls="more">See more<\/button>/);
  assert.match(outHtml, /<div id="more" class="more hidden">/);
  assert.match(outHtml, /<ul id="affirm-top" class="affirm-slim"/);
});

test("card: Include faith and Copy sit in a slim row under the card", () => {
  assert.ok(!outHtml.includes('id="faith"') && !outHtml.includes('id="copy"'));
  assert.match(index, /<\/section>\s*<div id="card-tools" class="card-tools hidden">[\s\S]*id="faith"[\s\S]*id="copy"/);
});

test("insight: the strongest of free / forgive / reality / pattern / conflict, ties in that order", () => {
  const st = M.defaultState();
  const pick = t => { const m = M.master(t, st); return { m, c: M.card(st, m) }; };
  // The choice equals the max over the candidate scores.
  ["I am ashamed and so alone, nobody cares", "Only I can fix this and nothing can stop me. I want to rest but I keep going over it.",
    "You always ignore me, you never listen. Whatever.", "It's all my fault, I'm worthless and I don't deserve good things", "I feel calm"].forEach(t => {
    const { m, c } = pick(t);
    const fr = m.freeing, f = m.forgive;
    const sc = {
      free: c.freeing ? Math.max(m.e[M.NAMES.indexOf("shame")], fr.cSelf, fr.u) : 0,
      forgive: c.forgive.length ? Math.max(f.Fself, f.Fother) : 0,
      reality: c.reality.length ? Math.max(m.grand.g, m.small.u) : 0,
      pattern: m.found.length ? 0.7 : 0,
      conflict: c.conflict.length ? Math.max(0, ...m.conflicts.map(q => q.c)) : 0,
    };
    const best = Math.max(...Object.values(sc));
    if (best === 0) assert.equal(c.insight, null, t);
    else { assert.ok(c.insight, t); assert.ok(Math.abs(sc[c.insight.id] - best) < 1e-9, `${t}: ${c.insight.id}`); }
  });
  // Ties go to the earlier one.
  const fake = { e: M.NAMES.map(() => 0), freeing: { cSelf: 0.5, u: 0 }, forgive: { Fself: 0.5, Fother: 0 }, grand: { g: 0 }, small: { u: 0 }, found: [], conflicts: [] };
  assert.equal(W.insight(fake, { freeing: {}, forgive: ["x"], reality: [], conflict: [] }).id, "free");
  assert.equal(W.insight(fake, { freeing: null, forgive: ["x"], reality: [], conflict: [] }).id, "forgive");
  assert.equal(W.insight(fake, { freeing: null, forgive: [], reality: [], conflict: [] }), null);
});

test("headline: one line with the peace band and Room for, no digits", () => {
  const st = M.defaultState();
  ["I am so angry and jealous of my brother", "I feel calm and close to my friends", "I'm ashamed, it's all my fault"].forEach(t => {
    const c = M.card(st, M.master(t, st));
    assert.match(c.headline, /^Inner peace: [^.]+[.,] .*Room for /);
    assert.ok(!c.headline.includes("Room for:"));
    assert.ok(!DIGIT.test(c.headline));
    assert.ok(c.affirmTop.length <= 2 && c.affirmTop.length >= 1);
    assert.deepEqual(c.affirmTop, c.affirmations.slice(0, 2));
  });
});

test("helpers: icon + name only; each panel is a dialog with its role and personality at the top", () => {
  const friends = [...index.matchAll(/<button type="button" class="friend"[^>]*>\s*<img src="img\/[a-z]+\.svg" alt="" width="44" height="44" \/><strong>(\w+)<\/strong>\s*<\/button>/g)].map(x => x[1]);
  assert.deepEqual(friends, ["Fern", "Hazel", "Remy", "Toby", "Ada", "Grace"]);
  ["writer", "historian", "analyzer", "scribe", "scientist", "grace"].forEach(k => {
    assert.match(index, new RegExp(`<section id="p-${k}" class="panel card hidden" role="dialog" aria-modal="true" aria-labelledby="p-${k}-title">`));
    assert.match(index, new RegExp(`<h2 id="p-${k}-title" tabindex="-1">[^<]+</h2><p class="persona">[A-Z][a-z]+ &middot; [^<]+</p>`));
  });
  assert.match(index, /<div id="sheet-backdrop" class="backdrop hidden"><\/div>/);
  assert.match(css, /\.friend \{[^}]*min-height: 4\.6rem/);
});

test("sheet: Esc and Close and the shade close it, Tab wraps inside, focus returns, crisis closes it", () => {
  assert.match(app, /e\.key === "Escape"\) \{ e\.preventDefault\(\); closeSheet\(true\)/);
  assert.match(app, /e\.key !== "Tab"/);
  assert.match(app, /last\.focus\(\)/);
  assert.match(app, /first\.focus\(\)/);
  assert.match(app, /\$\("sheet-backdrop"\)\.addEventListener\("click", \(\) => closeSheet\(true\)\)/);
  assert.match(app, /\.panel-close"\)\.forEach\(b => b\.addEventListener\("click", \(\) => closeSheet\(true\)\)\)/);
  assert.match(app, /opener\.focus\(\)/);
  assert.match(app, /crises\.forEach\(fn => fn\(\)\);[\s\S]{0,200}closeSheet\(false\)/);
  assert.match(css, /\.panel \{ position: fixed;[^}]*overflow-y: auto/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.panel \{ animation: none !important; \} \}/);
});

test("helpers hold what the short card leaves out: Remy (insights + connections), Grace (forgiveness), Hazel (progress)", () => {
  ["remy-insights", "remy-connect", "grace-reading", "hazel-progress"].forEach(id => assert.ok(index.includes(`id="${id}"`), id));
  const A = require("../js/features/analyzer.js");
  const st = M.defaultState();
  const m = M.master("I can't forgive myself, it's all my fault. You always ignore me, you never listen. Only I can fix this.", st);
  const c = M.card(st, m);
  const lines = A.insightLines(st, m, false);
  [].concat(c.conflict, c.reality, c.forgive, c.freeing ? c.freeing.lines : []).forEach(l => assert.ok(lines.includes(l), l));
  assert.ok(lines.some(l => /^A pattern to notice/.test(l) || /: /.test(l)));
  assert.ok(!lines.some(l => DIGIT.test(l)));
  assert.match(read("js/features/historian.js"), /\$\("hazel-progress"\)\.textContent = m \? MF\.Words\.progressLine\(m\)/);
  assert.match(read("js/features/forgiveness.js"), /\$\("grace-reading"\)/);
});

test("input: segmented Write / Pick, one chip grid with dots (the word kept for screen readers), Clear link, one big Update", () => {
  assert.match(index, /<div class="mode seg" role="group" aria-label="How to begin">/);
  assert.ok(!index.includes('id="pick-extras"'), "the extra chips share the grid");
  assert.match(index, /<button type="button" id="pick-reset" class="text small">Clear<\/button>/);
  const pk = read("js/features/picker.js");
  assert.match(pk, /extraBox = grid/);
  assert.match(pk, /dots\.setAttribute\("aria-hidden", "true"\)/);
  assert.match(pk, /feel-level visually-hidden/);
  assert.match(css, /\.feel-chips \{ display: grid; grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.feel-chip \{[^}]*min-height: 2\.9rem/);
  assert.match(css, /\.primary \{[^}]*min-height: 3\.25rem/);
  const top = index.slice(0, index.indexOf('<nav class="friends"'));
  assert.equal((top.match(/class="primary"/g) || []).length, 1, "one primary button above the helpers: Update");
  assert.match(top, /id="update" class="primary">Update</);
});

test("chrome: shorter sky, one small privacy line, slim but sticky readable 988 banner", () => {
  assert.match(css, /\.scene \{ position: relative; height: 5\.6rem;/);
  assert.match(index, /viewBox="0 0 400 100"/);
  assert.equal((index.match(/stay on this device/g) || []).length, 1);
  assert.match(index, /<p class="quiet small privacy">Private: your words stay on this device unless you save them to the journal\.<\/p>/);
  assert.match(index, /<p class="safety-banner">In crisis, call or text <strong>988<\/strong> \(US\)/);
  assert.match(css, /\.safety-banner \{ position: sticky; top: 0; z-index: 30;[^}]*color: var\(--ink\)/);
  assert.match(css, /\.backdrop \{[^}]*z-index: 20/);
  assert.match(css, /\.panel \{[^}]*z-index: 25/);
  // Readable: ink on the banner color in both themes (WCAG AA 4.5:1).
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const L = h => { const [r, g, b] = hex(h); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const vars = block => Object.fromEntries([...block.matchAll(/--([a-z0-9-]+): (#[0-9a-f]{6})/g)].map(m => [m[1], m[2]]));
  const light = vars(css.split("@media (prefers-color-scheme: dark)")[0].split("}")[0]);
  const dark = vars(css.split("@media (prefers-color-scheme: dark)")[1].split("}")[0]);
  [light, dark].forEach(v => assert.ok(ratio(v.ink, v.banner) >= 4.5, `banner ${ratio(v.ink, v.banner).toFixed(2)}`));
  assert.match(css, /body \{ overflow-x: clip; \}/, "clip, not hidden, so the sticky 988 banner keeps working");
});

console.log(`\n${passed} passed`);
