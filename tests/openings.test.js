// Run: node tests/openings.test.js   (no dependencies)
// Story openings and the path game's first scene follow the strongest mover.
const assert = require("node:assert/strict");
const S = require("../js/features/writer/stories.js");
const Gm = require("../js/features/writer/games.js");
const M = require("./mf.js");

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}
const P = S.parts;
const pro = { they: "they", them: "them", themself: "themself", their: "their", They: "They" };
const lines = list => list.map(l => P.fill(l, pro));
const has = (text, list) => lines(list).some(l => text.includes(l));
const I = n => M.NAMES.indexOf(n);
const live = text => {
  const s = M.defaultState(), r = M.fromText(text);
  const state = { ...s, e: M.combine(s.e, r.w) };
  return { state, m: M.master("", state) };
};
// A state where one mover leads: a hard/process mover high, or one grounding mover low.
function leading(mover) {
  const s = M.defaultState();
  if (M.GROUND.includes(mover)) s.e[I(mover)] = 0.1;
  else s.e[I(mover)] = 0.7;
  return s;
}
const ALL9 = ["anger", "shame", "fear", "sadness", "rumination", "avoidance", "hope", "connection", "calm"];
const S1 = "I'm so angry and jealous of my brother, I feel far from God and lazy";
const FEARISH = [...P.MIRAGE.fortuneTelling, ...P.MIRAGE.catastrophizing, ...P.MIRAGE.meaning, ...P.MOVER_MIRAGE.fear];
const FEAR_NAMING = [...P.NAMING.fortuneTelling, ...P.NAMING.catastrophizing, ...P.NAMING.meaning, ...P.MOVER_NAMING.fear];

test("there are openings and naming lines for all nine movers", () => {
  assert.deepEqual(S.MOVERS.slice().sort(), ALL9.slice().sort());
  ALL9.forEach(n => {
    assert.ok(P.MOVER_MIRAGE[n].length >= 3, n);
    assert.ok(P.MOVER_NAMING[n].length >= 2, n);
  });
});

for (const mover of ALL9) {
  test(`${mover}: the story opens with a ${mover} line (Stories.tell, 20 seeds)`, () => {
    for (let seed = 0; seed < 20; seed++) for (const faith of [false, true]) {
      const st = S.tell({ read: { patterns: [], reframes: ["x"] }, mover, seed, faith });
      assert.equal(st.opening, mover);
      assert.equal(st.openingFrom, "mover");
      assert.ok(has(st.sentences[0], P.MOVER_MIRAGE[mover]), st.sentences[0]);
      assert.ok(has(st.sentences[1], P.MOVER_NAMING[mover]), st.sentences[1]);
      assert.ok(!/\{\w+\}/.test(st.text), "no unfilled template");
    }
  });
  test(`${mover}: the model picks it as the opening when it leads`, () => {
    const s = leading(mover);
    const story = M.story(s, M.master("", s), { seed: 3 });
    assert.equal(story.focus, mover);
    assert.equal(story.opening, mover);
    assert.ok(has(story.text, P.MOVER_MIRAGE[mover]));
  });
  test(`${mover}: the path game's first scene matches`, () => {
    for (let seed = 0; seed < 10; seed++) {
      const g = Gm.make({ thought: "Today felt heavy.", mover, seed });
      assert.equal(g.opening, mover);
      assert.ok(has(g.scenes[0].text, P.MOVER_MIRAGE[mover]), g.scenes[0].text);
      const grounded = g.scenes[0].choices.find(c => c.grounded);
      assert.ok(has(grounded.feedback, P.MOVER_NAMING[mover]));
      assert.ok(!/\{\w+\}/.test(g.scenes[0].text + grounded.feedback));
    }
  });
}

test("a fitting thinking pattern keeps its own opening; a non-fitting one does not", () => {
  const cat = { patterns: ["catastrophizing"], reframes: ["x"] };
  assert.equal(S.tell({ read: cat, mover: "fear", seed: 1 }).opening, "catastrophizing");
  assert.equal(S.tell({ read: cat, mover: "anger", seed: 1 }).opening, "anger");
  assert.equal(S.tell({ read: { patterns: ["labeling"], reframes: ["x"] }, mover: "shame", seed: 1 }).opening, "labeling");
  assert.equal(S.tell({ read: { patterns: ["labeling"], reframes: ["x"] }, mover: "sadness", seed: 1 }).opening, "sadness");
  assert.equal(S.tell({ read: { patterns: ["hopelessness"], reframes: ["x"] }, mover: "hope", seed: 1 }).opening, "hopelessness");
  assert.equal(S.tell({ read: { patterns: [], reframes: ["x"] }, seed: 1 }).opening, "none", "no mover: pattern templates as before");
});

test("the anger sentence never opens with a fear or prediction thought (stories and game)", () => {
  const { state, m } = live(S1);
  for (let seed = 1; seed <= 60; seed++) for (const faith of [false, true]) {
    const st = M.story(state, m, { seed, faith });
    assert.equal(st.focus, "anger");
    assert.equal(st.opening, "anger");
    assert.ok(!has(st.text, FEARISH), st.text);
    assert.ok(!has(st.text, FEAR_NAMING), st.text);
    assert.ok(has(st.text, P.MOVER_MIRAGE.anger));
    const g = Gm.make({ thought: S1, read: m.read, mover: st.focus, seed, faith });
    assert.ok(!has(g.scenes[0].text, FEARISH));
    assert.ok(has(g.scenes[0].text, P.MOVER_MIRAGE.anger));
  }
});

test("the shame sentence opens with shame", () => {
  const { state, m } = live("I'm ashamed and so alone, nobody cares");
  const st = M.story(state, m, { seed: 1 });
  assert.equal(st.opening, "shame");
});

console.log(`\n${passed} passed`);
