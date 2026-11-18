// Run: node --test now/tests
const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("../logic.js");
const C = require("../content.js");

test("State Finder key bug is fixed: every energy/stress pair resolves (16/16)", () => {
  for (let e = 1; e <= 4; e++) for (let s = 1; s <= 4; s++) {
    assert.equal(L.stateKey(e, s), `${e}-${s}`);
    const st = L.lookupState(e, s);
    assert.ok(st.name && st.text, `state ${e}-${s} has name and text`);
    assert.equal(st.energy, e); assert.equal(st.stress, s);
  }
});
test("the original buggy template would have failed (regression guard)", () => {
  const energyVal = 2, stressVal = 3;
  const buggy = "$energyVal-" + stressVal; // what `$energyVal-${stressVal}` produced
  assert.equal(C.states[buggy], undefined);
  assert.ok(C.states[L.stateKey(energyVal, stressVal)]);
});
test("string inputs from <select>/chips work and bad input is rejected", () => {
  assert.equal(L.stateKey("4", "4"), "4-4");
  assert.throws(() => L.stateKey(0, 2), RangeError);
  assert.throws(() => L.stateKey(5, 1), RangeError);
  assert.throws(() => L.stateKey("x", 1), RangeError);
});
test("every state maps to a real word, technique and quote theme", () => {
  const ids = new Set(C.words.map(w => w.id)), themes = new Set(C.quotes.map(q => q.theme));
  for (const [k, s] of Object.entries(C.states)) {
    assert.ok(ids.has(s.word), k + " word"); assert.ok(C.techniques[s.technique], k + " technique");
    assert.ok(s.themes.every(t => themes.has(t)), k + " themes");
  }
});
test("buildCard returns a complete card for all 16 states x options, no undefined/template leftovers", () => {
  const moods = [null, "heavy", "okay", "light"], focuses = [null, "looping", "scattered", "clear"], ctx = [null, "alone", "with", "conflict"];
  let n = 0;
  for (let e = 1; e <= 4; e++) for (let s = 1; s <= 4; s++) for (const mood of moods) for (const focus of focuses) for (const context of ctx) for (const faith of [true, false]) {
    const c = L.buildCard(e, s, { mood, focus, context, faith, date: new Date(2026, 10, 18) });
    assert.ok(c.affirmation && !/\{\{|undefined/.test(c.affirmation), c.affirmation);
    assert.equal(c.words.length, 2); assert.notEqual(c.words[0].id, c.words[1].id);
    assert.ok(c.quote && c.quote.text); assert.ok(c.technique && c.technique.steps.length >= 3);
    if (!faith) { assert.equal(c.quote.requiresBelief, false); assert.ok(!/God/.test(c.affirmation)); }
    n++;
  }
  assert.equal(n, 16 * 4 * 4 * 4 * 2);
});
test("safety: care states (1-4, 2-4, 4-4) always route to reaching a person", () => {
  for (const [e, s] of [[1, 4], [2, 4], [4, 4]]) for (const focus of [null, "looping", "scattered"]) for (const context of [null, "conflict"]) {
    const c = L.buildCard(e, s, { focus, context });
    assert.equal(c.techniqueId, "help"); assert.equal(c.care, true);
    assert.match(c.technique.note, /988/);
  }
});
test("modifiers: looping -> Close the Loop, conflict -> Shared Pause, heavy mood -> both/and line", () => {
  assert.equal(L.buildCard(2, 2, { focus: "looping" }).techniqueId, "closeloop");
  assert.equal(L.buildCard(3, 2, { context: "conflict" }).techniqueId, "pause");
  const heavy = L.buildCard(2, 3, { mood: "heavy" }).affirmation;
  assert.ok(C.affirmations.heavy.includes(heavy), heavy);
});
test("card is stable within a day (no flicker) and deterministic", () => {
  const d = new Date(2026, 10, 18, 9), d2 = new Date(2026, 10, 18, 21);
  assert.deepEqual(L.buildCard(3, 3, { date: d }).quote, L.buildCard(3, 3, { date: d2 }).quote);
});
test("makeEntry produces a MindFrame Log compatible entry", () => {
  const c = L.buildCard(3, 4, { focus: "looping" });
  const e = L.makeEntry(c, { focus: "looping", before: "7", after: "4", date: new Date("2026-11-18T17:00:00Z") });
  assert.equal(e.schema, "mindframe-log/1"); assert.equal(e.type, "now"); assert.equal(e.stateKey, "3-4");
  assert.deepEqual(e.techniques, [{ id: "closeloop", before: 7, after: 4 }]);
  const Log = require("../../log/core.js");
  const n = Log.normalize(e);
  assert.equal(n.stateKey, "3-4"); assert.equal(n.techniques[0].before, 7);
  const imported = Log.parseImport(JSON.stringify(L.exportBundle([e])));
  assert.equal(imported.length, 1); assert.equal(imported[0].id, e.id);
});
