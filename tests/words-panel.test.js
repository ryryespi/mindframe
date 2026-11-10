// Run: node tests/words-panel.test.js
// Ariel Words stays inside the canvas. The drawing is not replaced.
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

test("the panel opens once, and closing it leaves the game loaded", () => {
  let state = W.blank();
  assert.equal(W.ignoresCanvas(state), false);
  const first = W.open(state);
  assert.equal(first.open, true);
  assert.equal(first.created, true);
  assert.equal(first.loaded, true);
  assert.equal(W.ignoresCanvas(first), true);
  const again = W.open(first);
  assert.equal(again.created, false);
  assert.equal(again.loaded, true);
  const shut = W.close(again);
  assert.equal(shut.open, false);
  assert.equal(shut.loaded, true);
  assert.equal(shut.created, false);
  assert.equal(W.ignoresCanvas(shut), false);
  assert.equal(W.PARAMS.src, "./words/?embed=1");
  assert.equal(W.isEmbed("?embed=1"), true);
  assert.equal(W.isEmbed(""), false);
});

test("the canvas page keeps the game in a panel and ignores drawing while it is open", () => {
  const page = fs.readFileSync(path.join(__dirname, "../ariel/index.html"), "utf8");
  const shell = fs.readFileSync(path.join(__dirname, "../ariel/shell.js"), "utf8");
  const words = fs.readFileSync(path.join(__dirname, "../ariel/words/index.html"), "utf8");
  const suite = fs.readFileSync(path.join(__dirname, "../ariel/suite/index.html"), "utf8");
  assert.match(page, /id="words-panel"/);
  assert.match(page, /id="bWords"/);
  assert.match(page, /id="words-close"/);
  assert.doesNotMatch(page, /id="bWords"[^>]*href=/);
  assert.match(page, /ArielWordsPanel\.open\(wordsState\)/);
  assert.match(page, /next\.created/);
  assert.match(page, /pointerEvents=wordsState\.open\?'none':''/);
  assert.match(page, /stopImmediatePropagation/);
  assert.match(shell, /getElementById\("bWords"\)/);
  assert.match(shell, /appendChild\(wordsBtn\)/);
  assert.match(words, /html\.embed #back-canvas \{ display: none/);
  assert.match(words, /embed=1/);
  assert.match(words, /Dedication/);
  assert.match(words, /AI assistant: Grok Bot/);
  assert.match(suite, /data-tab="wordgame"/);
  assert.match(suite, /WordsPanel\.PARAMS\.suiteSrc/);
  assert.doesNotMatch(suite, /create-tab-words/);
});

console.log(`\n${passed} passed`);
