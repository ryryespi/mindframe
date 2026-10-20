// Run: node tests/golden.test.js          (UPDATE_GOLDEN=1 to re-record)
// push28: golden-output snapshot, recorded BEFORE the strings/params/equations
// refactor, so the refactor is proven to change no output for these fixtures.
// Covers master(), the words card (faith off/on), the journal story, the parable
// beats, the Kai story, the grounding scene, the governor and the anchor view.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const M = require("./mf.js");
require("../js/core/topology.js"); require("../js/core/governor.js");
const MF = global.MF;
const FILE = path.join(__dirname, "fixtures", "golden.json");
const TEXTS = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "golden-texts.json"), "utf8"));
const round = v => JSON.parse(JSON.stringify(v, (k, x) => typeof x === "number" ? Math.round(x * 1e9) / 1e9 : x));

function run() {
  let state = M.defaultState(); const out = []; let mem = { days: {} }; const now0 = Date.UTC(2026, 9, 19, 18);
  TEXTS.forEach((t, i) => {
    const m = M.master(t, state);
    const rec = { t, m };
    if (!m.crisis) {
      state = { ...state, e: m.e.slice(), mix: m.freeing ? m.freeing.target.slice() : null };
      rec.card = [false, true].map(faith => MF.Words.card(state, m, { faith, seed: 1 }));
      rec.story = [false, true].map(faith => MF.Writer.story(state, m, { faith, seed: 3 }));
      rec.beats = MF.Parable.beats(m, {});
      rec.kai = MF.Kai.story(m, {});
      const g = MF.Governor.govern(t, m, mem, now0 + i * 864e5);
      rec.gov = g; mem = g && g.mem ? g.mem : mem;
      rec.scene = MF.Scenes.grounding(g, m, null);
      rec.anchor = [false, true].map(faith => MF.Topology.view(m, t, state, null, { faith }));
    }
    out.push(round(rec));
  });
  return out;
}
const got = run();
if (process.env.UPDATE_GOLDEN) { fs.writeFileSync(FILE, JSON.stringify(got)); console.log("recorded", got.length); }
else {
  const want = JSON.parse(fs.readFileSync(FILE, "utf8"));
  let passed = 0;
  want.forEach((w, i) => { try { assert.deepEqual(got[i], w); passed++; console.log("ok  - golden", i, w.t.slice(0, 40)); } catch (e) { console.error("FAIL - golden", i, w.t); console.error(String(e.message).slice(0, 1500)); process.exitCode = 1; } });
  console.log(`\n${passed} passed`);
}
