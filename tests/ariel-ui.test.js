// Run: node tests/ariel-ui.test.js
// Drafting shell: undo/redo, delete, and prompt export. No browser.
"use strict";
const assert = require("node:assert/strict");
const CAD = require("../ariel/cad.js");

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}

test("history: push, undo, redo, and a new edit clears the redo stack", () => {
  const h = CAD.History(3);
  assert.equal(h.push({ n: 0 }, { n: 1 }, "line"), true);
  assert.equal(h.push({ n: 1 }, { n: 1 }, "same"), false, "identical states are not edits");
  assert.equal(h.push({ n: 1 }, { n: 2 }, "circle"), true);
  assert.equal(h.push({ n: 2 }, { n: 3 }, "point"), true);
  assert.equal(h.push({ n: 3 }, { n: 4 }, "erase"), true);
  assert.equal(h.past.length, 3, "the stack keeps the newest limit");
  assert.deepEqual(h.undo(), { n: 3 });
  assert.deepEqual(h.undo(), { n: 2 });
  assert.deepEqual(h.redo(), { n: 3 });
  assert.equal(h.push({ n: 3 }, { n: 9 }, "draw"), true);
  assert.equal(h.canRedo(), false, "a new edit drops the redo branch");
  assert.deepEqual(h.undo(), { n: 3 });
  const h2 = CAD.History();
  h2.push({ a: 1 }, { a: 2 }, "only");
  assert.deepEqual(h2.undo(), { a: 1 });
  assert.equal(h2.undo(), null);
  assert.deepEqual(h2.redo(), { a: 2 });
  assert.equal(h2.redo(), null);
});

test("delete: removes the selected dot, line, or circle and leaves the other layer alone", () => {
  const layer = {
    dots: [{ id: "d1", x: 1 }, { id: "d2", x: 2 }],
    lines: [{ id: "l1" }, { id: "l2" }],
    circles: [{ id: "c1" }]
  };
  const other = { dots: [{ id: "d9" }], lines: [], circles: [] };
  assert.equal(CAD.deleteShape(layer, { kind: "line", id: "l2" }), true);
  assert.deepEqual(layer.lines.map(l => l.id), ["l1"]);
  assert.equal(CAD.deleteShape(layer, { kind: "dot", index: 0 }), true);
  assert.deepEqual(layer.dots.map(d => d.id), ["d2"]);
  assert.equal(CAD.deleteShape(layer, { kind: "circle", id: "missing" }), false);
  assert.equal(CAD.deleteShape(layer, { kind: "nope", index: 0 }), false);
  assert.equal(CAD.deleteShape(null, { kind: "dot", index: 0 }), false);
  assert.equal(other.dots.length, 1, "a different layer is not edited");
  assert.equal(layer.circles.length, 1);
});

test("delete then undo restores the shape (history holds the whole layer)", () => {
  const before = { dots: [{ id: "d1" }], lines: [{ id: "l1" }], circles: [] };
  const after = CAD.clone(before);
  assert.equal(CAD.deleteShape(after, { kind: "dot", id: "d1" }), true);
  const h = CAD.History();
  assert.equal(h.push(before, after, "erase"), true);
  assert.deepEqual(h.undo().dots.map(d => d.id), ["d1"]);
  assert.deepEqual(h.redo().dots, []);
});

test("commands: LINE, ERASE, aliases, and unknown words", () => {
  assert.deepEqual(CAD.parseCommand("  line  "), { cmd: "LINE", args: [], raw: "line" });
  assert.equal(CAD.parseCommand("delete").cmd, "ERASE");
  assert.equal(CAD.parseCommand("dot").cmd, "POINT");
  assert.deepEqual(CAD.parseCommand("LAYER 2").args, ["2"]);
  assert.equal(CAD.parseCommand("export explain").cmd, "EXPORT");
  assert.equal(CAD.parseCommand("frobnicate").cmd, "UNKNOWN");
  assert.equal(CAD.parseCommand("   "), null);
});

test("export: three styles share one record, in the order things happened", () => {
  const model = {
    notation: "→I 0.140,0.420\nL 0.200,0.500 0.800,0.500",
    english: ["x leads to y", "moving steadily with steady momentum, settling gently"],
    bag: "line:x→y×1",
    history: ["LINE", "ERASE d1", "accept clarify"]
  };
  const explain = CAD.buildPrompt("explain", model);
  const match = CAD.buildPrompt("match", model);
  const ground = CAD.buildPrompt("ground", model);
  [explain, match, ground].forEach(p => {
    assert.match(p, /All credit and glory to God\. I owe my knowledge to my Lord Jesus Christ\./);
    assert.match(p, /Conceptual, not validated science/);
    assert.match(p, /988/);
    assert.ok(p.includes(model.notation));
    assert.ok(p.includes("x leads to y"));
    assert.ok(p.includes("line:x→y×1"));
    assert.ok(p.indexOf("1. LINE") < p.indexOf("2. ERASE d1") && p.indexOf("2. ERASE d1") < p.indexOf("3. accept clarify"));
    assert.match(p, /never edits a human layer/);
  });
  assert.match(explain, /Explain my thinking/);
  assert.match(match, /```ariel/);
  assert.match(ground, /input and output anchors/);
  assert.equal(explain.includes("Find a matching idea"), false);
  const fallback = CAD.buildPrompt("nope", model);
  assert.match(fallback, /Explain my thinking/);
  const empty = CAD.buildPrompt("explain", {});
  assert.match(empty, /\(empty\)/);
  assert.match(empty, /no edits yet/);
});

test("math line: Unicode, LaTeX, and a typed line that edits and round-trips", () => {
  const m = CAD.emptyModel();
  m.anchors = { i: { x: 0.14, y: 0.42 }, o: { x: 0.8, y: 0.42 } };
  m.points = [{ name: "A", x: 0.2, y: 0.5 }, { name: "B", x: 0.8, y: 0.5 }, { name: "C", x: 0.2, y: 0.2 }, { name: "D", x: 0.8, y: 0.2 }];
  m.segments = [{ a: "A", b: "B" }, { a: "C", b: "D" }];
  m.circles = [{ name: "O", x: 0.5, y: 0.5, r: 0.2 }];
  m.ranges = [{ name: "h", lo: 0.2, hi: 0.8 }];
  const derived = CAD.deriveRelations(m);
  const line = CAD.mathLine(derived);
  assert.ok(!line.includes("\n"), "one line");
  assert.match(line, /I\(0\.140,0\.420\) → O\(0\.800,0\.420\)/);
  assert.match(line, /AB̅/);
  assert.match(line, /AB ∥ CD/);
  assert.match(line, /⊙O\(0\.500,0\.500,r=0\.200\)/);
  assert.match(line, /h ∈ \[0\.200, 0\.800\]/);
  const tex = CAD.mathLatex(derived);
  assert.match(tex, /\\overline\{AB\}/);
  assert.match(tex, /\\parallel/);
  assert.match(tex, /\\odot/);
  assert.match(tex, /\\in/);
  assert.match(tex, /\\to/);
  const edited = CAD.applyMath(m, "A(0.200,0.500), B(0.800,0.500); ∠ABC = 90°");
  assert.equal(edited.ok, true);
  const ang = CAD.deriveRelations(edited.model).angles.find(a => a.a + a.b + a.c === "CBA" || a.b === "B");
  assert.ok(ang && Math.abs(ang.deg - 90) < 1.5, JSON.stringify(CAD.deriveRelations(edited.model).angles));
  const again = CAD.applyMath(CAD.emptyModel(), line);
  assert.equal(again.ok, true);
  assert.ok(again.model.points.some(p => p.name === "A"));
  assert.ok(again.model.segments.some(s => s.a === "A" && s.b === "B"));
  const cross = CAD.emptyModel();
  cross.points = [{ name: "A", x: 0.2, y: 0.5 }, { name: "B", x: 0.8, y: 0.5 }, { name: "C", x: 0.5, y: 0.2 }, { name: "D", x: 0.5, y: 0.8 }];
  cross.segments = [{ a: "A", b: "B" }, { a: "C", b: "D" }];
  const cut = CAD.applyMath(cross, "X = AB ∩ CD");
  assert.equal(cut.ok, true);
  assert.ok(cut.model.points.some(p => p.name === "X"));
  const hist = CAD.History();
  assert.equal(hist.push(cross, cut.model, "MATH"), true);
  assert.equal(hist.undo().points.some(p => p.name === "X"), false);
});

test("Nonsense Layer is the locked origin; other layers are freeform", () => {
  const layers = [{ ai: true, name: "nope" }, { name: "Sketch" }];
  CAD.sealLayers(layers);
  assert.equal(layers[0].name, "Nonsense Layer");
  assert.equal(layers[0].locked, true);
  assert.equal(layers[0].domain, "nonsense");
  assert.equal(layers[0].ai, false);
  assert.equal(layers[0].role, "nonsense");
  layers[0].locked = false;
  layers[0].name = "Physics";
  CAD.sealLayers(layers);
  assert.equal(layers[0].name, "Nonsense Layer");
  assert.equal(layers[0].locked, true);
  assert.equal(layers[1].name, "Sketch");
  assert.notEqual(layers[1].role, "nonsense");
});

test("domain presets only seed words, and language never changes the geometry", () => {
  assert.deepEqual(CAD.DOMAINS.physics.terms.line, "vector/trajectory");
  assert.deepEqual(CAD.DOMAINS.music.terms.parallel, "parallel motion");
  assert.deepEqual(CAD.DOMAINS.music.terms.circle, "key/tonal center");
  assert.deepEqual(CAD.DOMAINS.psychology.terms.line, "thought path");
  assert.deepEqual(CAD.DOMAINS.psychology.terms.circle, "belief boundary");
  ["physics", "theology", "music", "psychology", "math"].forEach(d => {
    const words = CAD.domainWords(d);
    assert.ok(words.length >= 4, d);
    assert.ok(words.every(w => typeof w === "string"));
  });
  const model = { points: [{ name: "A", x: 0.2, y: 0.2 }], segments: [] };
  const snap = JSON.stringify(model);
  const plain = CAD.explainModel(model, { domain: "physics", names: ["energy", "mass"], alignment: "Aligns to the Nonsense Layer: 1 parallel, 0 perpendicular." });
  assert.match(plain.join("\n"), /vector\/trajectory/);
  assert.match(plain.join("\n"), /field\/range/);
  assert.match(plain.join("\n"), /interaction/);
  assert.match(plain.join("\n"), /energy, mass/);
  assert.match(plain.join("\n"), /Nonsense Layer/);
  assert.equal(JSON.stringify(model), snap);
  const mine = CAD.termsFor("physics", { line: "world-line" }, false);
  assert.equal(mine.line, "world-line");
  assert.equal(CAD.termsFor("physics", { line: "world-line" }, true).line, "line");
  const g = CAD.glossary("music", null, false);
  assert.match(g, /melodic line/);
  assert.match(CAD.glossary("music", null, true), /line = line/);
  const n = { points: [{ name: "A", x: 0, y: 0 }, { name: "B", x: 1, y: 0 }], segments: [{ a: "A", b: "B" }] };
  const o = { points: [{ name: "C", x: 0, y: 1 }, { name: "D", x: 1, y: 1 }], segments: [{ a: "C", b: "D" }] };
  const al = CAD.alignToNonsense(n, o);
  assert.equal(al.parallel, 1);
  assert.match(al.text, /Nonsense Layer/);
  const prompt = CAD.buildPrompt("explain", { notation: "AB̅", math: CAD.mathLine(n), glossary: g, domainNote: "Field: music.", alignment: al.text, history: ["LINE"] });
  assert.match(prompt, /AB̅/);
  assert.match(prompt, /melodic line/);
  assert.match(prompt, /Nonsense Layer/);
  assert.match(prompt, /Geometry is unchanged/);
});

test("self on the anchor layer is user-only, and the AI cannot write it", () => {
  const rec = { self: null };
  const denied = CAD.establishSelf(rec, { by: "ai", at: "2026-11-01", point: { name: "S", x: 0.5, y: 0.5 }, anchors: [{ name: "hope", value: "0.7" }] });
  assert.equal(denied.ok, false);
  assert.equal(denied.record.self, null);
  assert.equal(rec.self, null, "the call does not write through an AI act");
  const ok = CAD.establishSelf(rec, { by: "human", at: "2026-11-01", point: { name: "S", x: 0.5, y: 0.5 }, anchors: [{ name: "hope", value: "even if wrong" }] });
  assert.equal(ok.ok, true);
  assert.equal(ok.record.self.at, "2026-11-01");
  assert.equal(ok.record.self.point.name, "S");
  assert.equal(ok.record.self.anchors[0].value, "even if wrong");
  const prompt = CAD.buildPrompt("explain", { self: ok.record.self, history: ["ESTABLISH"] });
  assert.match(prompt, /Self established/);
  assert.match(prompt, /2026-11-01/);
  assert.match(prompt, /not a metaphysical proof/);
});

test("environment: a blank layer is AI-dominant until the human takes the first or last move", () => {
  const demo = CAD.demonstrateEnvironment();
  assert.equal(demo.blank.holder, "ai");
  assert.equal(demo.blank.blank, true);
  assert.equal(demo.blank.humanShare, 0);
  assert.equal(demo.aiMoves.holder, "ai");
  assert.ok(demo.aiMoves.aiShare > demo.aiMoves.humanShare);
  assert.equal(demo.userFirst.holder, "human");
  assert.equal(demo.userFirst.first, "human");
  assert.ok(demo.userFirst.humanShare > demo.userFirst.aiShare);
  assert.equal(demo.userLast.holder, "human");
  assert.equal(demo.userLast.last, "human");
  const middle = CAD.environmentOf([{ by: "ai" }, { by: "human" }, { by: "ai" }]);
  assert.equal(middle.holder, "ai", "a human move that is neither first nor last does not hold the environment");
  [demo.blank, demo.aiMoves, demo.userFirst, demo.userLast].forEach(row => assert.match(row.label, /not empirical proof/));
  const note = CAD.differsFrom("AB", "CD");
  assert.equal(note.overwrote, false);
  assert.equal(note.agreed, false);
  assert.match(note.note, /Differs from/);
  assert.equal(CAD.differsFrom("AB", "AB"), null);
});

console.log(`\n${passed} passed`);
