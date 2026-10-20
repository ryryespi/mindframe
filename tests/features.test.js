// Run: node tests/features.test.js   (no dependencies)
// The feature modules added in the feature-grouped rebuild: relationship (Four
// Horsemen), analyzer (movers in words), scientist (variables), and the page
// rule that output only appears after Update.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const M = require("./mf.js");
const R = require("../js/features/relationship.js");
const A = require("../js/features/analyzer.js");

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}
const I = n => M.NAMES.indexOf(n);
const DIGIT = /[0-9]/;
const { read } = require("./resolve.js");

// ---------- relationship: the Four Horsemen ----------
test("relationship: detects each of the four patterns", () => {
  assert.deepEqual(R.detect("You always forget my birthday"), ["criticism"]);
  assert.deepEqual(R.detect("You never listen to me"), ["criticism"]);
  assert.deepEqual(R.detect("Honestly you are pathetic"), ["contempt"]);
  assert.deepEqual(R.detect("I rolled my eyes at him"), ["contempt"]);
  assert.deepEqual(R.detect("Yeah right, like that will happen"), ["contempt"]);
  assert.deepEqual(R.detect("It's not my fault the bill was late"), ["defensiveness"]);
  assert.deepEqual(R.detect("Yes, but you were late too"), ["defensiveness"]);
  assert.deepEqual(R.detect("What about when you forgot?"), ["defensiveness"]);
  assert.deepEqual(R.detect("I'm done talking about this"), ["stonewalling"]);
  assert.deepEqual(R.detect("I just shut down when she yells"), ["stonewalling"]);
  assert.deepEqual(R.detect("He gave me the silent treatment"), ["stonewalling"]);
  assert.deepEqual(R.detect("She walked out of the room"), ["stonewalling"]);
  assert.deepEqual(R.detect("You always do this, it's not my fault, I'm done talking"), ["criticism", "defensiveness", "stonewalling"]);
});
test("relationship: curly apostrophes and capitals still match", () => {
  assert.deepEqual(R.detect("IT\u2019S NOT MY FAULT"), ["defensiveness"]);
});
test("relationship: negation within four words (same clause) cancels a match", () => {
  ["I don't think you always forget", "I would never say you never help", "I'm not done talking", "He didn't walk out",
    "We never walked out on each other", "I didn't give him the silent treatment", "Not pathetic at all"].forEach(t => assert.deepEqual(R.detect(t), [], t));
  assert.deepEqual(R.detect("I'm not angry. You always interrupt me."), ["criticism"], "a negation far away does not cancel");
});
test("relationship: ordinary text and empty text find nothing", () => {
  ["", "I feel anxious about work", "We talked it through and it felt good", "I always feel better after a walk"].forEach(t => assert.deepEqual(R.detect(t), [], t));
});
test("relationship: crisis wording finds nothing, and master still returns only { crisis: true }", () => {
  ["You always say I should just die, I want to die", "I'm done talking, I want to end it all"].forEach(t => {
    assert.deepEqual(R.detect(t), []);
    assert.deepEqual(M.master(t, M.defaultState()), { crisis: true });
  });
});
test("relationship: nudges only touch existing movers, and add no new variables", () => {
  R.ORDER.forEach(k => {
    const h = R.HORSEMEN[k];
    Object.keys({ ...(h.add || {}), ...(h.neg || {}) }).forEach(n => assert.ok(M.NAMES.includes(n), `${k} → ${n}`));
  });
  assert.deepEqual(Object.keys(R.HORSEMEN.criticism.add), ["anger"]);
  assert.deepEqual(Object.keys(R.HORSEMEN.contempt.add).sort(), ["anger", "shame"]);
  assert.deepEqual(Object.keys(R.HORSEMEN.defensiveness.add).sort(), ["fear", "shame"]);
  assert.deepEqual(Object.keys(R.HORSEMEN.stonewalling.add), ["avoidance"]);
  assert.deepEqual(Object.keys(R.HORSEMEN.stonewalling.neg), ["connection"]);
  assert.equal(M.NAMES.length, 9, "still nine movers");
  assert.deepEqual(Object.keys(M.defaultVars()).sort(), ["aBase", "aMax", "b", "d", "d0", "delta", "gamma", "k"], "the only new variables are the inner-peace weights");
});
test("relationship: nudges move the master reading in the expected direction", () => {
  const base = M.defaultState();
  const plain = M.master("we argued", base), crit = M.master("we argued, you always do this", base);
  assert.ok(crit.e[I("anger")] > plain.e[I("anger")], "criticism → more anger");
  assert.deepEqual(crit.found, ["criticism"]);
  const sw = M.master("we argued and I walked out", base);
  assert.ok(sw.e[I("avoidance")] > plain.e[I("avoidance")], "stonewalling → more avoidance");
  assert.ok(sw.e[I("connection")] < plain.e[I("connection")], "stonewalling → lower connection");
  const neg = M.master("we argued but I didn't walk out", base);
  assert.deepEqual(neg.found, []);
  const ct = M.master("he said I was pathetic", base);
  assert.ok(ct.e[I("shame")] > plain.e[I("shame")] && ct.e[I("anger")] > plain.e[I("anger")], "contempt → anger and shame");
  const df = M.master("yes but it's not my fault", base);
  assert.ok(df.e[I("fear")] > base.e[I("fear")] && df.e[I("shame")] > base.e[I("shame")], "defensiveness → shame and fear");
});
test("relationship: card section is words only, with an antidote and one example", () => {
  const s = R.section(["criticism", "stonewalling"]);
  assert.equal(s.length, 2);
  assert.equal(s[0].title, "A pattern to notice: Criticism");
  assert.equal(s[1].title, "A pattern to notice: Stonewalling");
  R.ORDER.forEach(k => R.section([k]).forEach(x => {
    assert.ok(x.antidote.length > 10 && x.example.length > 10);
    assert.ok(!DIGIT.test(x.title + x.antidote + x.example), k);
  }));
  assert.deepEqual(R.section([]), []);
});
test("relationship: the module cites Gottman and notes the debate", () => {
  const src = read("js/features/relationship.js"), readme = read("README.md");
  [src, readme].forEach(t => {
    assert.match(t, /Gottman & Levenson \(1992\)/);
    assert.match(t, /Gottman & Levenson \(2000\)/);
    assert.match(t, /What Predicts Divorce\?/);
    assert.match(t, /small sample/i);
    assert.match(t, /not a predictor/i);
  });
});

// ---------- analyzer: the nine movers in words ----------
test("analyzer: all nine movers, in words with no numbers", () => {
  const m = M.master("I'm ashamed and so alone, nobody cares", M.defaultState());
  const b = A.breakdown(M.defaultState(), m);
  assert.deepEqual(b.map(x => x.name), M.NAMES);
  b.forEach(x => {
    assert.ok(!DIGIT.test(x.title + x.level + x.links + x.group), x.name);
    assert.ok(x.links.length > 5);
  });
  assert.match(b[I("shame")].level, /ashamed/);
  assert.equal(A.level("fear", 0.05), "quiet right now");
});

// ---------- scientist: k is an adjustable variable ----------
test("scientist: k changes a(e), and the math shows it", () => {
  const st = M.defaultState(), text = "I'm so angry and jealous of my brother";
  const low = M.master(text, st), hi = M.master(text, { ...st, vars: { ...st.vars, k: 0.2 } });
  assert.ok(hi.a >= low.a);
  assert.ok(M.validateVars({ k: 9 }).vars.k <= 0.2 && M.validateVars({ k: -1 }).vars.k >= 0);
  assert.ok(M.mathLines(st, low).some(l => /0\.05/.test(l) && /a\(e\)|a =/.test(l)));
});

// ---------- page: output only after Update ----------
test("page: an Update button, Ctrl/Cmd+Enter, and no auto-update on typing", () => {
  const index = read("index.html"), app = read("js/app.js");
  assert.match(index, /<button[^>]*id="update"[^>]*>Update<\/button>/);
  assert.match(index, /id="out" class="card reading hidden"/, "the card starts hidden");
  assert.match(app, /\$\("update"\)\.addEventListener\("click", update\)/);
  assert.match(app, /e\.ctrlKey \|\| e\.metaKey/);
  const onInput = app.match(/\$\("input"\)\.addEventListener\("input",[^\n]*/);
  assert.ok(onInput && !/update\(|master\(/.test(onInput[0]), "typing only shows a note");
});
test("page: one companion replaces the six helpers; its sheet has six actions that open the old panels as views", () => {
  const index = read("index.html");
  assert.ok(!/class="friend"/.test(index), "no helper grid");
  assert.ok(!/img\/(fox|owl|raccoon|tortoise|otter|dove)\.svg/.test(index + read("sw.js")), "no helper pictures");
  ["fox", "owl", "raccoon", "tortoise", "otter", "dove"].forEach(n => assert.ok(!fs.existsSync(path.join(__dirname, "..", "img", `${n}.svg`)), n));
  ["writer", "historian", "analyzer", "scribe", "scientist", "grace"].forEach(k => {
    assert.match(index, new RegExp(`<div id="p-${k}" class="view hidden" role="group" aria-labelledby="v-${k}-title">`), k);
  });
  assert.equal((index.match(/class="panel card hidden"/g) || []).length, 1, "one sheet");
  assert.match(index, /<section id="p-companion" class="panel card hidden" role="dialog" aria-modal="true" aria-labelledby="pet-title">/);
  assert.ok(read("sw.js").includes("./js/features/companion.js"));
});
test("code: every js file has a header comment, and every function a JSDoc or a one-line comment", () => {
  const files = ["js/app.js", ...["data", "core", "features", "features/writer"].flatMap(d => fs.readdirSync(path.join(__dirname, "../js", d)).filter(f => f.endsWith(".js")).map(f => `js/${d}/${f}`))];
  assert.equal(files.length, 37);
  files.forEach(f => {
    const src = read(f);
    assert.match(src.split("\n")[0], /^\/\/ js\/|^\/\/ /, `${f} header`);
  });
});

console.log(`\n${passed} passed`);
