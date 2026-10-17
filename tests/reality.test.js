// Run: node tests/reality.test.js   (no dependencies)
// Hidden conflicts, grandiose vs. true-sized thinking, positive emotions, and
// the public-AI comfort prompt (core/reality.js, core/words.js, features/writer/comfort.js).
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const M = require("./mf.js");
const R = require("../js/core/reality.js");
const C = require("../js/features/writer/comfort.js");
const A = require("../js/features/analyzer.js");

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}
const I = n => M.NAMES.indexOf(n);
const DIGIT = /[0-9]/;
const read = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const GRAND = "Only I can fix this and nothing can stop me. I want to rest but I keep going over it.";
const CAT = "I always mess up, I will never be happy, everyone hates me";
const CONFLICT = "I hope it goes well but I'm scared it will all go wrong";
const CRISIS = ["I want to end it all", "Only I can fix this, I want to die"];

// ---------- grandiosity ----------
test("grandiosity: grand, certain-worst, all-or-nothing and absolutist wording", () => {
  ["Only I can do this", "I'm destined for this", "Everyone will see I was right", "I'm better than everyone here", "I never fail", "Nothing can stop me now", "I'm a genius"].forEach(t => {
    const g = R.grandiosity(t);
    assert.ok(g.g >= R.G_SHOW && g.kinds.includes("grand"), t);
  });
  ["I will definitely fail the exam", "Everything is ruined", "I'll never be happy", "Everyone hates me"].forEach(t => assert.ok(R.grandiosity(t).kinds.includes("catastrophic"), t));
  assert.ok(R.grandiosity("I'm a total failure").kinds.includes("allOrNothing"));
  const abs = R.grandiosity("It is always like this, nothing works, everyone leaves");
  assert.deepEqual(abs.kinds, ["absolutist"]);
  assert.equal(abs.counts.absolutist, 3);
  assert.ok(abs.g >= R.G_SHOW);
  assert.equal(R.grandiosity("I had a calm walk today").g, 0);
  assert.equal(R.grandiosity("").g, 0);
});
test("grandiosity: negation-aware (a negator within four words, same clause)", () => {
  ["I'm not better than anyone", "I don't think only I can do this", "It's not like I never fail", "I'm not destined for anything special", "It isn't always like this"].forEach(t => {
    const g = R.grandiosity(t);
    assert.ok(!g.kinds.includes("grand"), t);
    assert.ok(g.g < R.G_SHOW, t);
  });
  assert.ok(R.grandiosity("I'm not tired, I'm destined for greatness").kinds.includes("grand"), "a negation in another clause does not cancel");
});
test("grandiosity: g = 1 − e^(−raw) and it feeds rumination and fusion (no new mover)", () => {
  const g = R.grandiosity("Only I can do this");
  assert.equal(g.raw, 0.6);
  assert.equal(g.g, Math.round((1 - Math.exp(-0.6)) * 100) / 100);
  const plain = M.master("I can do this", M.defaultState()), grand = M.master("Only I can do this", M.defaultState());
  assert.ok(grand.e[I("rumination")] > plain.e[I("rumination")]);
  assert.ok(grand.e[I("avoidance")] > plain.e[I("avoidance")]);
  assert.equal(M.NAMES.length, 9);
  assert.equal(grand.grand.g, g.g, "computed in the same master pass");
});
test("reality check: words only, a true-sized version, no labels or shaming", () => {
  const { e } = M.master(GRAND, M.defaultState());
  assert.ok(e);
  const m = M.master(GRAND, M.defaultState());
  const r = M.realityLines(m);
  assert.equal(r.length, 2);
  assert.match(r[0], /^Reality check: part of this thought sounds (very sure|sure|a bit sure) that it all depends on you/);
  assert.equal(r[1], "You matter, and you are also human; one good step is enough.");
  const c = M.realityLines(M.master(CAT, M.defaultState()));
  assert.match(c[0], /the worst will happen/);
  [r, c].flat().forEach(x => {
    assert.ok(!DIGIT.test(x));
    assert.ok(!/\b(mania|manic|narciss|disorder|delusion|bipolar|grandiose|stupid|arrogant|selfish)/i.test(x), x);
  });
  assert.deepEqual(M.realityLines(M.master("I feel a bit sad", M.defaultState())), []);
});

// ---------- hidden conflicts ----------
test("conflicts: opposing pulls from the movers, c = √(x·y), strongest first", () => {
  const s = M.defaultState();
  s.e[I("fear")] = 0.64; s.e[I("hope")] = 0.81;
  const m = M.master("", s);
  const c = m.conflicts.find(x => x.a === "fear" && x.b === "hope");
  assert.ok(c);
  assert.equal(c.c, Math.round(Math.sqrt(c.x * c.y) * 100) / 100);
  const need = M.defaultState(); need.e[I("shame")] = 0.6; need.e[I("connection")] = 0.2;
  const n = M.master("", need).conflicts.find(x => x.a === "shame");
  assert.equal(n.side, "need");
  assert.equal(n.y, 0.8);
  assert.deepEqual(M.master("", M.defaultState()).conflicts, [], "nothing active, no conflict");
  R.PAIRS.forEach(p => { assert.ok(M.NAMES.includes(p.a) && M.NAMES.includes(p.b)); });
});
test("conflicts: clashes in the words ('I want … but', 'part of me', torn)", () => {
  assert.deepEqual(R.textConflicts("I want to go but I'm tired"), ["wantBut"]);
  assert.deepEqual(R.textConflicts("Part of me wants to stay"), ["partOfMe"]);
  assert.deepEqual(R.textConflicts("I know I should call her but I can't"), ["shouldBut"]);
  assert.deepEqual(R.textConflicts("I love him but it hurts"), ["loveBut"]);
  assert.deepEqual(R.textConflicts("I went for a walk"), []);
  const m = M.master("I want to rest but I keep working", M.defaultState());
  assert.ok(m.conflicts.some(c => c.from === "words" && c.a === "wantBut"));
});
test("conflicts: card wording names both parts and a holding line (ambivalence is normal)", () => {
  const m = M.master(CONFLICT, M.defaultState());
  const l = M.conflictLines(m);
  assert.match(l[0], /^A hidden pull: part of you .+ afraid of what could go wrong, while part of you .*hoping it goes well\.$/);
  assert.match(l[1], /normal/);
  assert.ok(!DIGIT.test(l.join(" ")));
  assert.match(read("js/core/reality.js"), /Miller & Rollnick/);
  assert.deepEqual(M.conflictLines(M.master("I feel calm", M.defaultState())), []);
});
test("crisis: no conflicts, no reality check, master returns only { crisis: true }", () => {
  CRISIS.forEach(t => {
    assert.deepEqual(M.master(t, M.defaultState()), { crisis: true });
    assert.equal(R.grandiosity(t).g, 0);
    assert.deepEqual(R.textConflicts(t), []);
  });
});

// ---------- positive emotions ----------
test("positive emotions: from the step's gains toward home, words only, lead the card", () => {
  const anx = M.master("I'm terrified it will all go wrong", M.defaultState());
  assert.ok(anx.positives.length >= 1 && anx.positives.length <= 3);
  assert.ok(anx.positives.some(p => ["calm", "courage"].includes(p.word)), JSON.stringify(anx.positives));
  const alone = M.master("I feel so alone and ashamed", M.defaultState());
  assert.equal(alone.positives[0].word, "connection");
  anx.positives.forEach(p => assert.ok(Object.keys(R.POSITIVE).includes(p.word)));
  const c = M.card(M.defaultState(), anx);
  assert.match(c.room, /^Room for: [a-z, ]+(, as .+)?\.$/);
  assert.equal(Object.keys(c)[0], "room", "the card leads with the positive emotions");
  assert.ok(!DIGIT.test(c.room));
  assert.equal(M.lines(M.defaultState(), anx)[0], c.room);
});

// ---------- Remy (Analyzer) ----------
test("analyzer: lists every hidden pull and the grand wording, in words", () => {
  const m = M.master(GRAND, M.defaultState());
  const d = A.details(m);
  assert.ok(d.some(x => /^Hidden pull \(/.test(x)));
  assert.ok(d.some(x => /^Grand or absolute wording:/.test(x)));
  assert.ok(d.includes("You matter, and you are also human; one good step is enough."));
  d.forEach(x => assert.ok(!DIGIT.test(x), x));
  assert.deepEqual(A.details(M.master("", M.defaultState())), ["No hidden pulls or grand wording stand out right now."]);
});

// ---------- the public-AI comfort prompt ----------
test("comfort prompt: built from the analysis (words + numbers), never the raw text", () => {
  [GRAND, CAT, CONFLICT, "My boss Kevin yelled at me in the parking lot at 5pm"].forEach(t => {
    const st = M.defaultState(), m = M.master(t, st);
    const p = C.buildPrompt(st, m, { raw: t });
    assert.ok(p && p.length > 200);
    assert.ok(!p.includes(t), "the full text is never included");
    const toks = t.toLowerCase().match(/[a-z']+/g);
    const low = p.toLowerCase();
    for (let i = 0; i + 4 <= toks.length; i++) assert.ok(!low.includes(toks.slice(i, i + 4).join(" ")), `no four words in a row from the text: ${toks.slice(i, i + 4).join(" ")}`);
    assert.ok(!/kevin|parking|5pm/i.test(p));
    assert.match(p, /about 200 words/);
    assert.match(p, /friendly animal/);
    assert.match(p, /no medical or diagnostic advice/);
    assert.match(p, /hopeful/);
    assert.match(p, /Movers: /);
    assert.match(p, /Step direction: distance from steady \d\.\d\d -> \d\.\d\d/);
    assert.match(p, /Hidden conflicts: /);
    assert.match(p, /Grandiosity signal: \d\.\d\d/);
    assert.match(p, /Positive emotions it points toward: /);
    M.card(st, m).affirmations.forEach(a => assert.ok(p.includes(a), "the app's composed affirmations are included"));
  });
});
test("comfort prompt: faith wording only when on; null in crisis", () => {
  const st = M.defaultState(), m = M.master(CONFLICT, st);
  assert.ok(!/Christian faith/.test(C.buildPrompt(st, m)));
  assert.match(C.buildPrompt(st, m, { faith: true }), /Christian faith/);
  assert.equal(C.buildPrompt(st, { crisis: true }), null);
  assert.equal(C.buildPrompt(st, null), null);
  CRISIS.forEach(t => assert.equal(C.buildPrompt(st, M.master(t, st), { raw: t }), null));
});
test("comfort prompt: scrub drops any line that repeats four words of the text", () => {
  assert.deepEqual(C.scrub(["safe line", "my boss yelled at me today"], "my boss yelled at me"), ["safe line"]);
  assert.deepEqual(C.scrub(["a b c"], "hi"), ["a b c"]);
});
test("comfort URLs: Grok and ChatGPT with the prompt URL-encoded", () => {
  const p = "Hello & welcome?\nLine #2 = ok / 100%";
  const u = C.urls(p);
  assert.equal(u.grok, "https://grok.com/?q=" + encodeURIComponent(p));
  assert.equal(u.chatgpt, "https://chatgpt.com/?q=" + encodeURIComponent(p));
  [u.grok, u.chatgpt].forEach(x => {
    const q = x.split("?q=")[1];
    assert.ok(!/[ &#?\n=]/.test(q), "no raw separators in q");
    assert.equal(decodeURIComponent(q), p);
    assert.equal(new URL(x).searchParams.get("q"), p);
  });
});
test("page: comfort button in Fern's panel, disabled in crisis, privacy line, no fetch", () => {
  const index = read("index.html"), app = read("js/app.js");
  const writer = index.slice(index.indexOf('id="p-writer"'), index.indexOf('id="p-historian"'));
  assert.match(writer, /id="comfort-go"[^>]*>Comfort story from a public AI</);
  assert.match(writer, /Only this text will be shared\. Your journal stays on your phone\./);
  assert.match(writer, />Open in Grok</);
  assert.match(writer, />Open in ChatGPT</);
  assert.match(writer, />Copy prompt</);
  assert.match(app, /\$\("comfort-go"\)\.disabled = on;/);
  const js = ["js/app.js", "js/features/writer/comfort.js", "js/core/words.js", "js/core/reality.js"].map(read).join("\n");
  assert.ok(!/\bfetch\(|XMLHttpRequest|navigator\.sendBeacon|WebSocket/.test(js), "the app makes no network calls");
});
test("README: composer, optional public AI, citations, and the model note", () => {
  const r = read("README.md");
  [/Miller & Rollnick/, /Al-Mosaiwi & Johnstone \(2018\)/, /Beck/, /Burns/, /composes its own replies/i, /no network calls/i, /not validated science/i, /grok\.com\/\?q=/, /chatgpt\.com\/\?q=/].forEach(re => assert.match(r, re));
});

console.log(`\n${passed} passed`);
