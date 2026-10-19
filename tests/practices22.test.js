// Run: node tests/practices22.test.js   (no dependencies)
// Push22: four new practices (cold-water reset, progressive muscle relaxation,
// brain dump, short brisk walk). Each is picked for its target state by the
// numbers; mild states keep their old picks; the cold-water caution is always
// shown; the brain-dump text is never stored, exported or sent; crisis clears it.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const M = require("./mf.js");
const PR = require("../js/features/practices.js");
const C = require("../js/features/writer/comfort.js");
const G = require("../js/core/grounding.js");

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}
const I = n => M.NAMES.indexOf(n);
const DIGIT = /[0-9]/;
const read = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const e0 = M.defaultState().home.slice();
// A synthetic reading: lever, feelings, dose d, c_wait, peace P, c_tense, c_tired.
const m = (lever, set = {}, o = {}) => {
  const e = e0.slice(); Object.entries(set).forEach(([n, v]) => { e[I(n)] = v; });
  return { e, d: o.d ?? 0.4, wait: o.wait || 0, tense: o.tense || 0, tired: o.tired || 0, peace: { lever: { name: lever }, P: o.P ?? 0.5 } };
};
const id = x => (PR.pick(x) || { id: null }).id;
const LOW = 0.3, OK = 0.5; // peace bands: "a little" (< 0.4) and "growing"

test("library: the four new practices, words-only card text, verified sources, no 'shaking'", () => {
  ["cold", "pmr", "dump", "walk"].forEach(k => {
    const p = PR.LIBRARY[k];
    assert.ok(p && p.name && p.source && p.steps.length >= 3, k);
    [{ min: "two", times: "three" }, { min: "ten", times: "five" }].forEach(x => assert.ok(!DIGIT.test(p.say(x)), `${k}: words only`));
  });
  assert.match(PR.LIBRARY.cold.source, /Linehan, 2015/);
  assert.match(PR.LIBRARY.pmr.source, /Jacobson, 1938.*McCallie, Blum & Hood, 2006/);
  assert.match(PR.LIBRARY.dump.source, /Pennebaker & Beall, 1986.*Frattaroli, 2006/);
  assert.match(PR.LIBRARY.walk.source, /Rebar et al\., 2015/);
  assert.match(PR.LIBRARY.cold.steps.join(" "), /15 to 30 seconds/);
  assert.match(PR.LIBRARY.pmr.steps.join(" "), /hands[\s\S]*shoulders[\s\S]*jaw[\s\S]*feet/i);
  assert.match(PR.LIBRARY.pmr.steps.join(" "), /5 seconds, then let go for about 10/);
  assert.match(PR.LIBRARY.dump.steps.join(" "), /10-minute timer/);
  assert.match(PR.LIBRARY.walk.steps.join(" "), /5 to 10 minutes/);
  assert.equal(PR.LIBRARY.dump.writes, true);
  assert.ok(!/shak(e|ing)/i.test(JSON.stringify(Object.values(PR.LIBRARY).map(p => [p.name, p.steps, p.say({ min: "two", times: "three" })]))), "no shaking practice");
  const src = read("js/features/practices.js").replace(/\n\/\/\s*/g, " ");
  [/Linehan \(2015\)/, /Jacobson \(1938\)/, /McCallie, Blum & Hood \(2006\)/, /Pennebaker & Beall \(1986\)/, /Frattaroli \(2006\)/, /Rebar et al\. \(2015\)/].forEach(r => assert.match(src, r));
  const readme = read("README.md");
  [/Linehan, M\. M\. \(2015\)\. \*DBT/, /Jacobson, E\. \(1938\)\. \*Progressive relaxation/, /McCallie, M\. S\., Blum, C\. M\., & Hood, C\. J\. \(2006\)[\s\S]*10\.1300\/J137v13n03_04/,
   /Pennebaker, J\. W\., & Beall, S\. K\. \(1986\)[\s\S]*10\.1037\/0021-843X\.95\.3\.274/, /Frattaroli, J\. \(2006\)[\s\S]*10\.1037\/0033-2909\.132\.6\.823/,
   /Rebar, A\. L\., Stanton, R\., Geard, D\., Short, C\., Duncan, M\. J\., & Vandelanotte, C\. \(2015\)[\s\S]*10\.1080\/17437199\.2015\.1022901/,
   /Ekkekakis, P\., Hall, E\. E\., VanLanduyt, L\. M\., & Petruzzello, S\. J\. \(2000\)/, /\| Cold-water reset \(.*\) \| body \|/, /\| Brain dump \(.*\) \| mindfulness \|/, /\| Progressive muscle relaxation \(.*\) \| body \|/, /\| Short brisk walk \(.*\) \| body \|/].forEach(r => assert.match(readme, r));
});
test("cold-water reset: very high fear or anger with low peace; never for mild or with peace growing", () => {
  assert.equal(id(m("fear", { fear: 0.8 }, { P: LOW })), "cold");
  assert.equal(id(m("anger", { anger: 0.9 }, { P: LOW })), "cold");
  assert.equal(id(m("fear", { fear: 0.8 }, { P: OK })), "space", "peace not low: the usual pick");
  assert.equal(id(m("fear", { fear: 0.5 }, { P: LOW })), "space", "mild fear");
  assert.equal(id(m("anger", { anger: 0.5 }, { P: LOW })), "pause", "mild anger");
  assert.equal(id(m("anger", { anger: 0.63 }, { P: LOW })), "pause", "one plain feeling word is not 'very high'");
  assert.equal(id(m("sadness", { sadness: 0.9 }, { P: LOW })), "gratitude", "only fear and anger");
  const st = M.defaultState();
  assert.equal(M.master("I'm so scared and terrified", st).practice.id, "cold");
  assert.equal(M.master("I'm scared", st).practice.id, "space");
});
test("cold-water caution: always present in the library, the card, Copy, and the panel", () => {
  const CAUTION = "Skip this if you have a heart condition, low blood pressure, fainting, or an eating disorder; check with your doctor first.";
  assert.equal(PR.COLD_CAUTION, CAUTION);
  assert.equal(PR.LIBRARY.cold.caution, CAUTION);
  const st = M.defaultState();
  ["I'm so scared and terrified", "I'm so angry", "I'm so angry and jealous of my brother, I feel far from God and lazy"].forEach(t => {
    const r = M.master(t, st), c = M.card(st, r);
    assert.equal(c.practice.id, "cold", t);
    assert.equal(c.practice.caution, CAUTION);
    const L = M.lines(st, r).join("\n");
    assert.ok(L.includes(`One step: ${c.step}\nCaution: ${CAUTION}`), "Copy carries the caution right after the step");
  });
  const app = read("js/app.js"), html = read("index.html"), src = read("js/features/practices.js");
  assert.match(html, /id="step-caution"/); assert.match(html, /id="practice-caution"/);
  assert.match(app, /\$\("step-caution"\)\.textContent = c\.practice && c\.practice\.caution/);
  assert.match(src, /\$\("practice-caution"\)\.textContent = P\.caution \? `Caution: \$\{P\.caution\}`/);
});
test("progressive muscle relaxation: fear or avoidance with tension words, or an alternative calm builder", () => {
  assert.equal(id(m("fear", { fear: 0.6 }, { tense: 0.5 })), "pmr");
  assert.equal(id(m("avoidance", { avoidance: 0.6 }, { tense: 0.5 })), "pmr");
  assert.equal(id(m("calm", { calm: 0.4 }, { d: 0.3, tense: 0.5 })), "pmr");
  assert.equal(id(m("fear", { fear: 0.6 }, { tense: 0.2 })), "space", "below the cue threshold");
  assert.equal(PR.bodyHook("tight shoulders and a clenched jaw").data.tense, PR.cueStrength(2));
  assert.equal(PR.bodyHook("I'm not tense at all"), null, "negation-aware");
  const r = M.master("I'm so tense, my shoulders are tight and I'm scared", M.defaultState());
  assert.equal(r.practice.id, "pmr"); assert.ok(r.tense >= 0.3);
  const h = PR.bodyHook("I'm exhausted and so tense");
  assert.deepEqual([h.add, h.neg], [undefined, undefined], "data only: no feelings are nudged");
});
test("brain dump: very high rumination; plain replaying keeps labeling / STOP", () => {
  assert.equal(id(m("rumination", { rumination: 0.8 })), "dump");
  assert.equal(id(m("rumination", { rumination: 0.8, fear: 0.5 })), "dump");
  assert.equal(id(m("rumination", { rumination: 0.7, fear: 0.5 })), "label");
  assert.equal(id(m("rumination", { rumination: 0.7 })), "stop");
  assert.equal(M.master("I keep replaying it over and over all night", M.defaultState()).practice.id, "dump");
  assert.equal(M.master("I keep replaying what I said and I feel sick with worry", M.defaultState()).practice.id, "label");
});
test("short brisk walk: sadness + avoidance with low-energy words; fallback for strong anger when peace isn't low", () => {
  assert.equal(id(m("avoidance", { avoidance: 0.6, sadness: 0.5 }, { tired: 0.5 })), "walk");
  assert.equal(id(m("sadness", { avoidance: 0.4, sadness: 0.6 }, { tired: 0.5 })), "walk");
  assert.equal(id(m("sadness", { avoidance: 0.4, sadness: 0.6 }, { tired: 0 })), "gratitude", "no low-energy words");
  assert.equal(id(m("avoidance", { avoidance: 0.6, sadness: 0.1 }, { tired: 0.5 })), "surf", "no sadness");
  assert.equal(id(m("anger", { anger: 0.7 }, { P: OK })), "walk");
  assert.equal(id(m("anger", { anger: 0.7 }, { P: OK, wait: 0.5 })), "waiting", "waiting cues win");
  assert.equal(M.master("I feel sad and exhausted and I keep avoiding everyone", M.defaultState()).practice.id, "walk");
});
test("mild states: the earlier picks are unchanged", () => {
  [["anger", { anger: 0.4 }, "pause"], ["fear", { fear: 0.4 }, "space"], ["avoidance", { avoidance: 0.4 }, "surf"],
   ["calm", { calm: 0.4 }, "body", 0.3], ["calm", { calm: 0.2 }, "senses", 0.6], ["rumination", { rumination: 0.5 }, "stop"],
   ["rumination", { rumination: 0.5, fear: 0.3 }, "label"], ["shame", { shame: 0.5 }, "kindness"], ["sadness", { sadness: 0.5 }, "gratitude"],
   ["hope", { hope: 0.3 }, "gratitude"], ["connection", { connection: 0.3 }, null]].forEach(([l, s, want, d]) =>
    [LOW, OK].forEach(P => assert.equal(id(m(l, s, { P, d: d ?? 0.4 })), want, `${l} at P=${P}`)));
  const st = M.defaultState();
  [["I'm angry", "pause"], ["I'm scared", "space"], ["I keep putting off my taxes, I just avoid it", "surf"], ["I'm a little nervous", "space"]]
    .forEach(([t, want]) => assert.equal(M.master(t, st).practice.id, want, t));
  assert.equal(PR.pick({ crisis: true }), null);
  assert.equal(id({ ...m("anger", { anger: 0.9 }), peace: { lever: { name: "anger" } } }), "pause", "peace unknown: no cold reset or walk");
});
test("determinism: the same reading always gives the same practice", () => {
  const st = M.defaultState();
  ["I'm so scared and terrified", "I keep replaying it over and over all night", "I feel sad and exhausted and I keep avoiding everyone", "I'm so tense, my shoulders are tight and I'm scared", "I'm angry"].forEach(t => {
    const a = new Set(Array.from({ length: 20 }, () => JSON.stringify(M.master(t, M.defaultState()).practice)));
    assert.equal(a.size, 1, t);
    assert.equal(M.lines(st, M.master(t, st), { seed: 1 }).join("\n"), M.lines(st, M.master(t, st), { seed: 1 }).join("\n"));
  });
  const x = m("fear", { fear: 0.8 }, { P: LOW, tense: 0.6 });
  assert.equal(new Set(Array.from({ length: 50 }, () => id(x))).size, 1);
  assert.ok(!/Math\.random|Date\.now/.test(PR.pick.toString()), "no randomness or clock in the pick");
});
test("brain dump privacy: the text is never stored except by Save to journal, never exported or sent", () => {
  const src = read("js/features/practices.js");
  assert.ok(!/localStorage\.setItem|sessionStorage/.test(src), "no direct storage");
  const uses = src.match(/localStorage/g) || [];
  assert.equal(uses.length, 1, "the only storage use is the explicit Save to journal");
  assert.match(src, /\$\("dump-save"\)[\s\S]*journalAdd\(localStorage, `Brain dump\\n\$\{t\}`\)/);
  assert.match(read("index.html"), /<textarea id="dump-text"[^>]*autocomplete="off"/);
  // The reading, the export (.mf.txt) and the comfort prompt never see it.
  const DUMP = "zebra-quartz private dump text";
  const st = M.defaultState(), r = M.master("I keep replaying it over and over all night", st);
  assert.equal(r.practice.id, "dump");
  const p = C.buildPrompt(st, r, { raw: "" });
  assert.match(p, /Practice for the one step: Brain dump$/m, "the practice name only");
  assert.ok(!/Pennebaker|Frattaroli/.test(p), "no source in the AI summary");
  assert.ok(!p.includes(DUMP));
  const S = require("../js/features/scribe.js");
  assert.ok(!S.serialize(st).includes(DUMP));
  assert.ok(!/dump/i.test(read("js/features/scribe.js")) && !/dump-text/.test(read("js/features/writer/comfort.js")), "export and prompt code never read the box");
});
test("brain dump clears: Let it go (with a gentle fade), close, Update, Start over, a new reading, and crisis", () => {
  const src = read("js/features/practices.js");
  assert.match(src, /\$\("dump-letgo"\)\.addEventListener\("click", \(\) => \{[^}]*dumpClear\(true\)/);
  assert.match(src, /classList\.add\("fading"\)/);
  assert.match(src, /app\.onPanelClose\(\(\) => \{ stop\(\); dumpClear\(false\); \}\)/);
  assert.match(src, /app\.onReset\(\(\) => \{ stop\(\); dumpClear\(false\); \}\)/);
  assert.match(src, /app\.onCrisis\(\(\) => \{ stop\(\); dumpClear\(false\); \}\)/);
  assert.match(src, /if \(m !== seen\)[\s\S]{0,80}dumpClear\(false\)/, "a new reading (Update) clears it");
  assert.match(src, /Grounding\.isCrisis\(box\.value\)\) \{ box\.value = ""; dumpStop\(\); app\.crisis\(true\); \}/);
  assert.ok(G.isCrisis("I want to kill myself"), "the same crisis check as the journal");
  assert.match(read("style.css"), /\.dump-text\.fading \{ opacity: 0; \}/);
});
test("Ada's rule display: the pick inputs (c_wait, c_tense, c_tired, peace band) and the new rules", () => {
  const S = require("../js/features/scientist.js");
  const st = M.defaultState(), L = S.mathLines(st, M.master("I'm so scared and terrified", st)).join("\n");
  assert.match(L, /practice = pick\(lever, e, d, c_wait = 0\.00, c_tense = 0\.00, c_tired = 0\.00, peace band = a little\) \u2192 cold for /);
  assert.match(L, /cold-water reset: lever fear or anger, that mover \u2265 0\.75/);
  assert.match(L, /brain dump: lever rumination \u2265 0\.75/);
  assert.match(L, /short brisk walk: /);
});

console.log(`\n${passed} passed`);
