// Run: node tests/mindframe-tab.test.js
// The Suite opens the real MindFrame page, with the same saved keys.
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}

test("MindFrame is a Suite tab and stays itself when embedded", () => {
  const root = path.join(__dirname, "..");
  const suite = fs.readFileSync(path.join(root, "ariel/suite/index.html"), "utf8");
  const page = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const app = fs.readFileSync(path.join(root, "js/app.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "style.css"), "utf8");
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  assert.match(suite, /data-tab="mindframe">MindFrame</);
  assert.match(suite, /id="mindframe"/);
  assert.match(suite, /id="suite-mind"/);
  assert.match(suite, /ensureSuiteMind/);
  assert.match(suite, /src = "\.\.\/\.\.\/\?embed=1"/);
  assert.match(suite, /flex-wrap:wrap/);
  assert.match(suite, /data-tab="wordgame"/);
  assert.match(suite, /data-tab="canvas"/);
  assert.match(page, /embed=1/);
  assert.match(css, /html\.embed header\.top \{ display: none; \}/);
  assert.match(app, /mindframe-workspace/);
  assert.match(app, /embed=1/);
  assert.match(app, /serviceWorker\.register\("\.\/sw\.js"/);
  const register = app.slice(app.indexOf("serviceWorker"));
  assert.match(register, /embed=1/);
  assert.match(sw, /mindframe-shell-v31/);
});

console.log(`\n${passed} passed`);
