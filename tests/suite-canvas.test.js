// Run: node tests/suite-canvas.test.js
// The Suite canvas tab is the live Ariel page, not a second copy.
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}

const KEYS = ["ariel-names", "ariel-lex", "ariel-lexlabels", "ariel-vars", "ariel-Pt", "ariel-self", "ariel-terms", "ariel-canon"];

test("the Suite canvas tab embeds the current canvas and keeps its storage keys", () => {
  const suite = fs.readFileSync(path.join(__dirname, "../ariel/suite/index.html"), "utf8");
  const page = fs.readFileSync(path.join(__dirname, "../ariel/index.html"), "utf8");
  const shell = fs.readFileSync(path.join(__dirname, "../ariel/shell.js"), "utf8");
  assert.match(suite, /data-tab="canvas"/);
  assert.match(suite, />Canvas</);
  assert.match(suite, /id="suite-canvas"/);
  assert.match(suite, /src="\.\.\/index\.html\?embed=1&amp;full=1"/);
  assert.match(suite, /"canvas"/);
  assert.match(page, /id="words-panel"/);
  assert.match(page, /id="side"/);
  assert.match(page, /id="tp"/);
  assert.match(page, /id="bWords"/);
  assert.match(shell, /full=1/);
  assert.match(shell, /more-tools/);
  KEYS.forEach(key => {
    assert.match(page + shell, new RegExp(key));
    assert.doesNotMatch(suite, new RegExp("suite-" + key));
  });
  assert.equal((suite.match(/id="bar"/g) || []).length, 0);
});

console.log(`\n${passed} passed`);
