// Run: node tests/create-tabs.test.js
// Create keeps Out of the Void, and Ariel Words opens beside it.
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

function memory() {
  const box = {};
  return {
    getItem(k) { return Object.prototype.hasOwnProperty.call(box, k) ? box[k] : null; },
    setItem(k, v) { box[k] = String(v); }
  };
}

test("Ariel Words is created once and stays loaded when you leave it", () => {
  let state = W.subBlank();
  assert.equal(state.tab, "make");
  const first = W.selectSub(state, "words");
  assert.equal(first.tab, "words");
  assert.equal(first.created, true);
  assert.equal(first.loaded, true);
  const back = W.selectSub(first, "make");
  assert.equal(back.tab, "make");
  assert.equal(back.loaded, true);
  assert.equal(back.created, false);
  const again = W.selectSub(back, "words");
  assert.equal(again.created, false);
  assert.equal(again.loaded, true);
  assert.equal(W.PARAMS.suiteSrc, "../words/?embed=1");
});

test("the last sub-tab is remembered for the session only", () => {
  const session = memory();
  const local = memory();
  let state = W.selectSub(W.subBlank(), "words");
  W.rememberSub(session, state);
  assert.equal(W.recallSub(session), "words");
  assert.equal(W.recallSub(local), "make");
  W.rememberSub(session, W.selectSub(state, "make"));
  assert.equal(W.recallSub(session), "make");
  const suite = fs.readFileSync(path.join(__dirname, "../ariel/suite/index.html"), "utf8");
  const page = fs.readFileSync(path.join(__dirname, "../ariel/index.html"), "utf8");
  assert.match(suite, /role="tablist"/);
  assert.match(suite, /id="create-tab-make"/);
  assert.match(suite, /id="create-tab-words"/);
  assert.match(suite, /Out of the Void/);
  assert.match(suite, /Ariel Words/);
  assert.match(suite, /aria-selected/);
  assert.match(suite, /ArrowRight/);
  assert.match(suite, /sessionStorage/);
  assert.match(suite, /id="create-words-frame"/);
  assert.match(suite, /data-tab="canvas"/);
  assert.match(page, /id="words-panel"/);
  assert.match(page, /id="bWords"/);
  assert.doesNotMatch(suite, /localStorage\.setItem\(WordsPanel\.PARAMS\.sessionKey/);
});

console.log(`\n${passed} passed`);
