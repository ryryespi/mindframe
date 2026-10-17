// Run: node tests/games.test.js   (no dependencies)
const assert = require("node:assert/strict");
const G = require("../js/grounding.js");
const S = require("../js/stories.js");
const Gm = require("../js/games.js");

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}

const ARCS = Object.keys(Gm.SAMPLES);

test("one sample thought per pattern, and each maps to its pattern", () => {
  assert.deepEqual(ARCS.slice().sort(), S.ARCS.slice().sort());
  ARCS.forEach(arc => assert.equal(S.arcFor(G.read(Gm.SAMPLES[arc])), arc));
});

// Plays a game the way a person might, picking mirage first when there is one.
function playThrough(game) {
  if (game.type === "path") {
    for (const scene of game.scenes) {
      const tried = new Set();
      let done = false;
      for (const c of scene.choices) { tried.add(c.text); if (c.grounded) { done = true; break; } }
      assert.ok(done, "scene has a way forward: " + scene.title);
    }
    return true;
  }
  if (game.type === "spot") {
    game.items.forEach(it => assert.ok(["mirage", "real"].includes(it.kind)));
    return true;
  }
  // tiles: always take the first remaining tile that fits.
  const left = game.tiles.slice();
  const placed = [];
  while (left.length) {
    const i = left.findIndex(t => Gm.tileFits(game, placed.length, t.word));
    assert.ok(i >= 0, "a fitting tile always exists");
    placed.push(left.splice(i, 1)[0].word);
  }
  assert.deepEqual(placed, game.target);
  return true;
}

for (const arc of ARCS) {
  test(`${arc}: all three game types are valid and finishable across 25 seeds`, () => {
    for (let seed = 0; seed < 25; seed++) for (const type of Gm.TYPES) for (const faith of [false, true]) {
      const g = Gm.make({ type, thought: Gm.SAMPLES[arc], seed, faith });
      assert.equal(g.crisis, false);
      assert.equal(g.arc, arc);
      assert.equal(g.creature, S.PATTERN_CREATURE[arc], "same guide as the stories");
      assert.ok(g.ending.length >= 2 && g.ending[g.ending.length - 1].endsWith("?"), "ends with a question");
      assert.equal(g.ending.some(l => /God's love/.test(l)), faith, "faith toggle respected");
      if (type === "path") {
        assert.equal(g.scenes.length, 4);
        g.scenes.forEach(sc => {
          assert.ok(sc.choices.length >= 2 && sc.choices.length <= 4);
          assert.ok(sc.choices.some(c => c.grounded), "at least one grounded choice");
          assert.equal(sc.choices.filter(c => !c.grounded).length, 1, "exactly one mirage choice");
          sc.choices.forEach(c => assert.ok(c.feedback && c.text));
          assert.ok(!/\{\w+\}/.test(sc.text + sc.prompt + sc.choices.map(c => c.text + c.feedback).join("")));
        });
        assert.equal(g.steps, 4);
      }
      if (type === "spot") {
        assert.equal(g.items.length, 6);
        assert.equal(g.items.filter(i => i.kind === "mirage").length, 3);
        assert.equal(g.items.filter(i => i.kind === "real").length, 3);
        g.items.forEach(i => assert.ok(i.why.length > 0));
      }
      if (type === "tiles") {
        assert.ok(g.target.length >= 3 && g.target.length <= Gm.MAX_TILE_WORDS);
        assert.equal(g.tiles.length, g.target.length);
        assert.notDeepEqual(g.tiles.map(t => t.word), g.target, "tiles start shuffled");
      }
      assert.ok(playThrough(g));
    }
  });
}

test("the last path scene offers the real step", () => {
  const g = Gm.make({ type: "path", thought: "I'm cursed", step: "Call my brother", seed: 4 });
  assert.ok(g.scenes[3].choices.some(c => c.grounded && c.text === "Call my brother"));
});
test("the reframe appears as a grounded choice in the path game", () => {
  const g = Gm.make({ type: "path", thought: "I'm cursed", reframe: "Today was hard and I can still do one good thing", seed: 2 });
  assert.ok(g.scenes[2].choices.some(c => c.grounded && c.text.includes("Today was hard and I can still do one good thing.")));
});
test("the user's reframe is a 'real' line in spot the mirage", () => {
  const g = Gm.make({ type: "spot", thought: "Nothing I do ever works", reframe: "Some things work", seed: 2 });
  assert.ok(g.items.some(i => i.kind === "real" && i.text === "Some things work."));
});
test("tiles use a short reframe whole", () => {
  const g = Gm.make({ type: "tiles", thought: "x", reframe: "I can still do one good thing", seed: 1 });
  assert.equal(g.type, "tiles");
  assert.deepEqual(g.target, ["I", "can", "still", "do", "one", "good", "thing."]);
});
test("tiles take the first short sentence of a long reframe", () => {
  const g = Gm.make({ type: "tiles", thought: "x", reframe: "This is hard. And I have handled a great many hard and confusing and tiring things before now.", seed: 1 });
  assert.deepEqual(g.target, ["This", "is", "hard."]);
});
test("tiles fall back to the path game when no sentence is short enough", () => {
  const g = Gm.make({ type: "tiles", thought: "x", reframe: "I can still do one good thing today even if it is small and slow and quiet and hard to see", seed: 1 });
  assert.equal(g.type, "path");
  assert.equal(g.fallback, true);
  assert.equal(g.scenes.length, 4);
});
test("repeated words in tiles are still solvable", () => {
  const g = Gm.make({ type: "tiles", thought: "x", reframe: "Some days are hard and some days are not", seed: 9 });
  assert.ok(playThrough(g));
});

const CRISIS = ["I want to end it all", "I want to die", "I might hurt myself"];
for (const line of CRISIS) {
  test(`crisis in thought, reframe, or step -> {crisis:true} only: "${line}"`, () => {
    for (const type of Gm.TYPES) {
      assert.deepEqual(Gm.make({ type, thought: line, seed: 1 }), { crisis: true });
      assert.deepEqual(Gm.make({ type, thought: "I'm cursed", reframe: line, seed: 1 }), { crisis: true });
      assert.deepEqual(Gm.make({ type, thought: "I'm cursed", step: line, seed: 1 }), { crisis: true });
    }
  });
}

test("HTML in user text stays plain text in game data (UI uses textContent)", () => {
  const evil = "<img src=x onerror=alert(1)>";
  const g = Gm.make({ type: "path", thought: "I'm cursed", reframe: evil, step: "<b>walk</b>", seed: 1 });
  assert.ok(g.scenes[2].choices.some(c => c.text.includes("<img src=x onerror=alert(1)>")), "kept as literal text");
  assert.equal(S.escapeHTML(g.scenes[2].choices.find(c => c.grounded && c.text.includes("img")).text).includes("<img"), false);
  const t = Gm.make({ type: "tiles", thought: "x", reframe: "<script>bad()</script> is just text", seed: 1 });
  assert.ok(t.tiles.every(x => typeof x.word === "string"));
});

test("deterministic per seed; different seeds vary", () => {
  for (const type of Gm.TYPES) {
    const a = JSON.stringify(Gm.make({ type, thought: Gm.SAMPLES.allOrNothing, seed: 11 }));
    assert.equal(JSON.stringify(Gm.make({ type, thought: Gm.SAMPLES.allOrNothing, seed: 11 })), a);
    const set = new Set();
    for (let seed = 0; seed < 15; seed++) set.add(JSON.stringify(Gm.make({ type, thought: Gm.SAMPLES.allOrNothing, seed })));
    assert.ok(set.size >= 5, `${type}: ${set.size}`);
  }
});

test("steadiness: 0..100, full marks on first tries, half for retries, never negative", () => {
  assert.equal(Gm.steadiness(4, 0, 4), 100);
  assert.equal(Gm.steadiness(0, 4, 4), 50);
  assert.equal(Gm.steadiness(2, 1, 4), 63);
  assert.equal(Gm.steadiness(0, 0, 4), 0);
  assert.equal(Gm.steadiness(0, 0, 0), 0);
  assert.equal(Gm.steadiness(9, 9, 4), 100);
});

console.log(`\n${passed} passed${process.exitCode ? ", some failed" : ""}`);
