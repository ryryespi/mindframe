// Run: node tests/stories.test.js   (no dependencies)
const assert = require("node:assert/strict");
const G = require("../js/grounding.js");
const S = require("../js/stories.js");

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}

// One sample thought per arc, so the arc really comes from the guide's reading.
const SAMPLES = {
  meaning: "I'm cursed",
  fortuneTelling: "I'm going to fail the interview",
  mindReading: "They probably think I am weird",
  allOrNothing: "Nothing I do ever works",
  labeling: "I'm such a loser",
  catastrophizing: "This is a disaster",
  hopelessness: "What's the use",
  none: "Work was long today",
};

test("every arc has a sample thought that maps to it", () => {
  assert.deepEqual(Object.keys(SAMPLES).sort(), S.ARCS.slice().sort());
  for (const [arc, thought] of Object.entries(SAMPLES)) assert.equal(S.arcFor(G.read(thought)), arc, thought);
});

for (const [arc, thought] of Object.entries(SAMPLES)) {
  test(`${arc}: 5-8 sentences, ends with a question, across 40 seeds and both modes`, () => {
    for (let seed = 0; seed < 40; seed++) for (const you of [false, true]) for (const faith of [false, true]) {
      const s = S.tell({ thought, seed, you, faith });
      assert.equal(s.crisis, false);
      assert.equal(s.arc, arc);
      assert.ok(s.sentences.length >= 5 && s.sentences.length <= 8, `${s.sentences.length} sentences`);
      assert.ok(s.text.trim().endsWith("?"), s.text);
      assert.ok(!/\{\w+\}/.test(s.text), "unfilled template: " + s.text);
    }
  });
}

test("contains the user's reframe and step when given", () => {
  const s = S.tell({ thought: "I'm cursed", reframe: "Today was hard and I can still do one good thing", step: "Call my brother", seed: 5 });
  assert.ok(s.text.includes("Today was hard and I can still do one good thing."));
  assert.ok(s.text.includes("call my brother"));
});

test("falls back to the guide's first reframe when none is given", () => {
  const read = G.read("Nothing I do ever works");
  const expected = read.reframes[0].replace(/"([^"]*)"/g, "\u2018$1\u2019");
  assert.ok(S.tell({ read, seed: 1 }).text.includes(expected));
});

test("long reframes are truncated with an ellipsis", () => {
  const long = "I can take this one step at a time ".repeat(20);
  const s = S.tell({ thought: "I'm cursed", reframe: long, seed: 2 });
  const quoted = s.text.match(/\u201C([^\u201D]*)\u201D/)[1];
  assert.ok(quoted.length <= 162, String(quoted.length));
  assert.ok(quoted.endsWith("\u2026"));
});

const CRISIS = ["I want to end it all", "I want to die", "I might hurt myself"];
for (const line of CRISIS) {
  test(`crisis in thought, reframe, or step -> {crisis:true} only: "${line}"`, () => {
    assert.deepEqual(S.tell({ thought: line, seed: 1 }), { crisis: true });
    assert.deepEqual(S.tell({ thought: "I'm cursed", reframe: line, seed: 1 }), { crisis: true });
    assert.deepEqual(S.tell({ thought: "I'm cursed", step: line, seed: 1 }), { crisis: true });
    assert.equal(S.toHTML(S.tell({ thought: line })), "");
  });
}

test("same seed gives the same story; different seeds give variety", () => {
  const a = S.tell({ thought: "I'm cursed", seed: 42 }).text;
  assert.equal(S.tell({ thought: "I'm cursed", seed: 42 }).text, a);
  const set = new Set();
  for (let seed = 0; seed < 30; seed++) set.add(S.tell({ thought: "I'm cursed", seed }).text);
  assert.ok(set.size >= 20, `only ${set.size} distinct stories`);
  const chars = new Set();
  for (let seed = 0; seed < 60; seed++) chars.add(S.tell({ thought: "I'm cursed", seed }).character);
  assert.ok(chars.size >= 4);
});

test("avoid prevents an immediate repeat of character and opening", () => {
  for (let seed = 0; seed < 50; seed++) {
    const first = S.tell({ thought: "This is a disaster", seed });
    const next = S.tell({ thought: "This is a disaster", seed, avoid: first.key });
    assert.notEqual(next.key, first.key);
  }
});

test("faith: on by default only for hidden meaning; toggle respected", () => {
  const faithy = /God's love|prayer/;
  assert.equal(S.tell({ thought: "I'm cursed", seed: 3 }).faith, true);
  assert.equal(S.tell({ thought: "Nothing I do ever works", seed: 3 }).faith, false);
  for (let seed = 0; seed < 20; seed++) {
    assert.ok(faithy.test(S.tell({ thought: "I'm cursed", seed, faith: true }).text));
    assert.ok(!/God's love|short prayer/.test(S.tell({ thought: "I'm cursed", seed, faith: false }).text));
  }
});

test("'you' mode uses second person and no character name", () => {
  const s = S.tell({ thought: "Nothing I do ever works", seed: 7, you: true });
  assert.ok(/\byou\b/i.test(s.sentences[0]));
  for (const c of S.CHARACTERS) assert.ok(!s.text.includes(c.name + ","));
});

test("HTML in user text is escaped by toHTML, raw text stays plain", () => {
  const evil = "<img src=x onerror=alert(1)> & 'apos'";
  const s = S.tell({ thought: "I'm cursed", reframe: evil, step: 'Say "hi" <b>now</b>', seed: 1 });
  const html = S.toHTML(s);
  assert.ok(!html.includes("<img") && !html.includes("<b>"));
  assert.ok(html.includes("&lt;img src=x onerror=alert(1)&gt; &amp; &#39;apos&#39;"), html);
  assert.ok(html.includes("say &quot;hi&quot; &lt;b&gt;now&lt;/b&gt;"), html);
  assert.equal(S.escapeHTML("<b>'x'</b>"), "&lt;b&gt;&#39;x&#39;&lt;/b&gt;");
});

test("no magic-fix or promise wording in any template output", () => {
  for (const thought of Object.values(SAMPLES)) for (let seed = 0; seed < 30; seed++) {
    const t = S.tell({ thought, seed, faith: true }).text.toLowerCase();
    assert.ok(!/\b(magic|miracle|guarantee|forever fixed|everything was fine|all better)\b/.test(t), t);
  }
});

console.log(`\n${passed} passed${process.exitCode ? ", some failed" : ""}`);
