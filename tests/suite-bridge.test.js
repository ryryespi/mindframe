// Run: node tests/suite-bridge.test.js
// Connections from the Ariel canvas into the suite gate, journal nodes, and signal scale.
"use strict";
const assert = require("node:assert/strict");
const B = require("../ariel/suite/bridge.js");

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}

test("doubt raises threat and lowers control; the gate scales signal transfer", () => {
  const calm = B.fromAriel({ doubtRho: 0, bridge: 0.5, layers: [] });
  const tense = B.fromAriel({ doubtRho: 1, bridge: 0.5, layers: [] });
  assert.ok(tense.v > calm.v);
  assert.ok(tense.r < calm.r);
  assert.equal(tense.g, B.gate(tense.v, tense.r));
  assert.equal(tense.yOut, B.transfer(tense.y, tense.g, tense.v));
  assert.equal(tense.signalScale, tense.g);
  assert.ok(tense.g < calm.g);
});

test("the I→O span sets the bridge y, and layers become journal nodes", () => {
  const low = B.fromAriel({ doubtRho: 0, bridge: 0.1, layers: [] });
  const high = B.fromAriel({ doubtRho: 0, bridge: 0.9, layers: [] });
  assert.ok(high.y > low.y);
  assert.ok(high.y <= B.PARAMS.yMax);
  const read = B.fromAriel({
    doubtRho: 0.4,
    bridge: 0.66,
    collapse: "From I to O: hope → peace",
    layers: [
      { name: "Nonsense Layer", role: "nonsense", domain: "nonsense", dots: 1, lines: 2, circles: 1, doubts: 0, ink: 0 },
      { name: "Sketch", role: "", domain: "physics", dots: 0, lines: 3, circles: 1, doubts: 1, ink: 2 }
    ]
  });
  assert.equal(read.nodes[0].kind, "Support");
  assert.equal(read.nodes[1].kind, "Threat");
  assert.match(read.nodes[1].detail, /physics/);
  assert.equal(read.nodes[2].kind, "Line");
  assert.match(read.nodes[2].detail, /hope/);
});

test("a closed gate scales the signal gain down and never leaves 0.05..1", () => {
  const g = B.gate(1, 0);
  assert.ok(g >= 0.05 && g <= 1);
  assert.ok(B.transfer(6.4, g, 1) <= 0.6);
  assert.ok(B.transfer(0, 1, 0) === 0);
});

console.log(`\n${passed} passed`);
