// Run: node tests/marketplace-tab.test.js
// The Suite opens the hardened Ariel Marketplace, still local and zero-debt.
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}

test("Marketplace is a Suite tab that embeds the published page", () => {
  const root = path.join(__dirname, "..");
  const suite = fs.readFileSync(path.join(root, "ariel/suite/index.html"), "utf8");
  const page = fs.readFileSync(path.join(root, "ariel/marketplace/index.html"), "utf8");
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  assert.match(suite, /data-tab="marketplace">Marketplace</);
  assert.match(suite, /id="marketplace"/);
  assert.match(suite, /id="suite-market"/);
  assert.match(suite, /ensureSuiteMarket/);
  assert.match(suite, /src = "\.\.\/marketplace\/\?embed=1"/);
  assert.match(suite, /"marketplace"/);
  assert.match(suite, /flex-wrap:wrap/);
  assert.match(suite, /data-tab="mindframe"/);
  assert.match(suite, /data-tab="wordgame"/);
  assert.match(suite, /data-tab="canvas"/);
  assert.match(page, /embed=1/);
  assert.match(page, /html\.embed header \{ position: static/);
  assert.match(page, /html\.embed \.logo-area \{ display: none/);
  assert.match(page, /ariel-marketplace-v1/);
  assert.match(page, /if \(state\.chrons < 0\) state\.chrons = 0/);
  assert.match(page, /SANCTUARY_LAMBDA = 0\.00005/);
  assert.match(page, /DELTA_MIN = 0\.25/);
  assert.match(page, /Recognition \(not a lottery\)/);
  assert.match(page, /deterministic, not a lottery/);
  assert.match(page, /988/);
  assert.match(page, /Conceptual sandbox/);
  assert.match(page, /AI assistant: Grok Bot/);
  assert.match(page, /All credit and glory to God\. I owe my knowledge to my Lord Jesus Christ\./);
  assert.match(page, /Chrons never go below zero/);
  assert.match(sw, /mindframe-shell-v32/);
  assert.match(sw, /\/ariel\//);
});

console.log(`\n${passed} passed`);
