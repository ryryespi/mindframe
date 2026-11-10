// Run: node tests/create-tabs.test.js
// Ariel Words is its own Suite tab. Create is the drawing again.
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const W = require("../ariel/words-panel.js");

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}

test("the game frame is created once and kept", () => {
  let state = W.blank();
  const first = W.open(state);
  assert.equal(first.created, true);
  const again = W.open(first);
  assert.equal(again.created, false);
  assert.equal(again.loaded, true);
  assert.equal(W.PARAMS.suiteSrc, "../words/?embed=1");
});

test("Ariel Words is a top-level tab and Create has no sub-tabs", () => {
  const suite = fs.readFileSync(path.join(__dirname, "../ariel/suite/index.html"), "utf8");
  const page = fs.readFileSync(path.join(__dirname, "../ariel/index.html"), "utf8");
  const sw = fs.readFileSync(path.join(__dirname, "../sw.js"), "utf8");
  assert.match(suite, /data-tab="wordgame">Ariel Words</);
  assert.match(suite, /id="wordgame"/);
  assert.match(suite, /id="suite-game"/);
  assert.match(suite, /ensureSuiteWords/);
  assert.match(suite, /flex-wrap:wrap/);
  assert.doesNotMatch(suite, /role="tablist"/);
  assert.doesNotMatch(suite, /create-tab-words/);
  assert.match(suite, /data-tab="canvas"/);
  assert.match(suite, /data-tab="create"/);
  assert.match(page, /id="bWords"/);
  assert.match(page, /id="words-panel"/);
  assert.match(page, /flex:0 0 36px/);
  assert.match(sw, /mindframe-shell-v29/);
  assert.match(sw, /\/ariel\//);
});

console.log(`\n${passed} passed`);
