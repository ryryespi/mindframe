// Run: node tests/logo.test.js
// The Ariel mark is one SVG, used by the canvas, the Suite, and Ariel Words.
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}

test("the logo keeps its meaning and is the mark on the Ariel pages", () => {
  const root = path.join(__dirname, "..");
  const svg = fs.readFileSync(path.join(root, "ariel/assets/ariel-logo.svg"), "utf8");
  const words = fs.readFileSync(path.join(root, "ariel/words/index.html"), "utf8");
  const canvas = fs.readFileSync(path.join(root, "ariel/index.html"), "utf8");
  const suite = fs.readFileSync(path.join(root, "ariel/suite/index.html"), "utf8");
  const css = fs.readFileSync(path.join(root, "ariel/words/TemplateData/style.css"), "utf8");
  assert.match(svg, /The circle is the void/);
  assert.match(svg, /gold point is grace/);
  assert.match(svg, /three small dots are words/);
  assert.match(svg, /All credit and glory to God/);
  assert.match(words, /assets\/ariel-logo\.svg/);
  assert.match(words, /id="unity-title">Ariel Words/);
  assert.doesNotMatch(words + css, /unity-logo-dark\.png|unity-logo-light\.png|unity-logo-title-footer\.png/);
  assert.match(canvas, /assets\/ariel-logo\.svg/);
  assert.match(canvas, /apple-touch-icon/);
  assert.match(suite, /assets\/ariel-logo\.svg/);
  assert.match(suite, /class="mark"/);
  for (const size of [180, 192, 512]) {
    assert.ok(fs.existsSync(path.join(root, "ariel/assets/ariel-logo-" + size + ".png")));
  }
});

console.log(`\n${passed} passed`);
