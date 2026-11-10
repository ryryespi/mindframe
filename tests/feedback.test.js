// Run: node tests/feedback.test.js
// Plain words under a graph. A guide, not a diagnosis.
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const F = require("../ariel/suite/feedback.js");

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}

function days(start, n, value) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const day = "2026-11-" + String(start + i).padStart(2, "0");
    out.push({ day: day, value: value });
  }
  return out;
}

test("a rising line names the improvement first", () => {
  const card = F.chart({
    series: [{ id: "r", name: "Control", higherIsBetter: true, points: days(1, 7, 0.42).concat(days(8, 7, 0.7)) }],
    factors: { rest: 0.9, connection: 0.9, rumination: 0.1, kindness: 5, guilt: 0.1 }
  });
  assert.equal(card.lines[0], "Control has been rising, and that came first.");
  assert.equal(card.trend, "rising");
  assert.equal(card.variability, "steady");
  assert.equal(card.best.day, "2026-11-14");
  assert.equal(card.hardest.day, "2026-11-07");
  assert.match(card.lines[1], /best day was 2026-11-14/);
  assert.match(card.lines[1], /hardest was 2026-11-07/);
  assert.equal(card.guide, "A guide, not a diagnosis.");
  assert.equal(card.action, "rest");
  assert.equal(card.crisis, false);
});

test("too little data, a dip, and a heavy stretch stay gentle", () => {
  const little = F.chart({ series: [{ name: "Threat", higherIsBetter: false, points: [0.2, 0.4] }] });
  assert.deepEqual(little.lines, ["Not enough yet to see a pattern, and that's okay."]);
  assert.equal(little.action, "");
  const dip = F.chart({
    series: [{ name: "Control", higherIsBetter: true, points: days(1, 7, 0.8).concat(days(8, 7, 0.5)) }],
    factors: { rest: 0.9, kindness: 4, rumination: 0.1, guilt: 0.1 }
  });
  assert.equal(dip.lines[1], "Dips are part of the path, not a verdict.");
  assert.equal(dip.trend, "dipping");
  const sharp = F.chart({
    series: [{ name: "Control", higherIsBetter: true, points: [0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.2] }]
  });
  assert.equal(sharp.crisis, true);
  assert.match(sharp.crisisLine, /988/);
  assert.match(sharp.crisisLine, /911/);
  assert.match(sharp.crisisLine, /talk to someone you trust/i);
  const stuck = F.chart({
    series: [{ name: "The gate", higherIsBetter: true, points: days(1, 4, 0.5) }],
    zones: ["void", "void", "void"]
  });
  assert.equal(stuck.crisis, true);
});

test("the weakest factor opens an existing path, and the readout says where you are", () => {
  const spiral = F.chart({
    series: [{ name: "Threat", higherIsBetter: false, points: days(1, 7, 0.4).concat(days(8, 7, 0.2)) }],
    factors: { rumination: 0.8, rest: 0.8, connection: 0.8, kindness: 4, guilt: 0.1 }
  });
  assert.equal(spiral.action, "spiral");
  assert.match(spiral.suggestion, /Slow the spiral/);
  const reach = F.chart({
    series: [{ name: "Transfer", higherIsBetter: true, points: days(1, 6, 0.4) }],
    factors: { connection: 0.2, rest: 0.8, rumination: 0.1, kindness: 4, guilt: 0.1 }
  });
  assert.equal(reach.action, "reach");
  const afraid = F.chart({
    series: [{ name: "Threat", higherIsBetter: false, points: days(1, 6, 0.3) }],
    factors: { rest: 0.2, rumination: 0.1, connection: 0.8, kindness: 4, guilt: 0.1 }
  });
  assert.equal(afraid.action, "afraid");
  const kind = F.chart({
    series: [{ name: "The gate", higherIsBetter: true, points: days(1, 6, 0.5) }],
    factors: { kindness: 0, rest: 0.9, rumination: 0.1, connection: 0.9, guilt: 0.1 }
  });
  assert.equal(kind.action, "kindness");
  const guilt = F.chart({
    series: [{ name: "The gate", higherIsBetter: true, points: days(1, 6, 0.5) }],
    factors: { guilt: 0.9, rest: 0.9, rumination: 0.1, connection: 0.9, kindness: 4 }
  });
  assert.equal(guilt.action, "honest");
  const now = F.fromWidth(0.25, { rumination: 0.7, x: -0.4 });
  const before = F.fromWidth(0.55, { rumination: 0.2, x: 0.05 });
  assert.equal(now.zone, "void");
  assert.equal(before.zone, "edge");
  const placed = F.chart({
    series: [{ name: "The gate", higherIsBetter: true, points: days(1, 6, 0.55) }],
    valence: now,
    valencePrev: before,
    factors: { rest: 0.9, kindness: 4, rumination: 0.1, guilt: 0.1, connection: 0.9 }
  });
  assert.match(placed.lines[0], /in the void/);
  assert.match(placed.lines[0], /rumination is what moved it/);
  const listen = F.chart({
    listening: true,
    series: [{ name: "Control", higherIsBetter: true, points: days(1, 7, 0.4).concat(days(8, 7, 0.7)) }],
    factors: { rumination: 0.9 }
  });
  assert.equal(listen.action, "");
  assert.equal(listen.lines.length, 1);
  assert.equal(F.streak([0.2, 0.3, 0.5, 0.7], true), 3);
});

test("each suite graph has a What this shows card", () => {
  const suite = fs.readFileSync(path.join(__dirname, "../ariel/suite/index.html"), "utf8");
  const shell = fs.readFileSync(path.join(__dirname, "../ariel/shell.js"), "utf8");
  const file = fs.readFileSync(path.join(__dirname, "../ariel/suite/feedback.js"), "utf8");
  ["engine-shows", "curves-shows", "radar-shows", "void-shows"].forEach(id => {
    assert.match(suite, new RegExp('id="' + id + '"'));
  });
  assert.match(suite, /WHAT THIS SHOWS/);
  assert.match(suite, /feedback\.js/);
  assert.match(shell, /id='sig-shows'/);
  assert.match(shell, /ArielFeedback/);
  assert.match(file, /Ryan asked for this/);
  assert.match(file, /===== PARAMS =====/);
  assert.match(file, /===== EQUATIONS =====/);
  assert.match(file, /A guide, not a diagnosis/);
});

console.log(`\n${passed} passed`);
