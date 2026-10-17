// Run: node tests/emotions.test.js   (no dependencies)
const assert = require("node:assert/strict");
const E = require("../js/emotions.js");

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const at = (r, name) => r.e[E.NAMES.indexOf(name)];
const TARGET = "I'm ashamed and so alone, nobody cares and I'm angry at myself";

// ---------- Lexicon scoring ----------
test("ten emotions, four helpful", () => {
  assert.equal(E.NAMES.length, 10);
  assert.deepEqual([...E.POSITIVE].sort(), ["calm", "connection", "hope", "joy"]);
});
test("lexicon scores the obvious emotion, e = 1 − exp(−raw) stays in [0,1)", () => {
  const r = E.analyze("I feel scared");
  near(at(r, "fear"), Math.round((1 - Math.exp(-1)) * 100) / 100);
  r.e.forEach(v => assert.ok(v >= 0 && v < 1));
});
test("stems and phrases: ashamed → shame, nobody cares → loneliness", () => {
  const r = E.analyze(TARGET);
  assert.ok(at(r, "shame") > 0.5 && at(r, "loneliness") > 0.5 && at(r, "anger") > 0.5);
});
test("false friends do not match: made, happened, funeral", () => {
  ["I made dinner", "it happened", "a funeral today"].forEach(t => assert.equal(E.analyze(t).top.length, 0, t));
});
test("longest stem wins: hopeless is sadness, not hope", () => {
  const r = E.analyze("I feel hopeless");
  assert.ok(at(r, "sadness") > 0.5);
  assert.equal(at(r, "hope"), 0);
});
test("no emotion words → a gentle prompt, no λ", () => {
  const r = E.analyze("the bus is at noon");
  assert.equal(r.lambda, null);
  assert.match(r.lines.emotions[0], /No clear emotion words/);
  assert.equal(r.summary, "");
});

// ---------- Negation and intensifiers ----------
test("negation flips: not happy → some sadness, no joy", () => {
  const r = E.analyze("I am not happy");
  assert.equal(at(r, "joy"), 0);
  assert.ok(at(r, "sadness") > 0.3);
});
test("negation of a hard feeling: not afraid → some calm, no fear", () => {
  const r = E.analyze("I'm not afraid");
  assert.equal(at(r, "fear"), 0);
  assert.ok(at(r, "calm") > 0);
});
test("negation reaches 3 words back, not further", () => {
  assert.equal(at(E.analyze("I don't feel very sad"), "sadness"), 0);
  assert.ok(at(E.analyze("I don't know why but today I feel sad"), "sadness") > 0.5);
});
test("intensifiers raise, softeners lower", () => {
  const base = at(E.analyze("I am sad"), "sadness");
  assert.ok(at(E.analyze("I am very sad"), "sadness") > base);
  assert.ok(at(E.analyze("I am a little sad"), "sadness") < base);
});

// ---------- W and dynamics ----------
test("W is 10×10 with zero diagonal, built from EDGES", () => {
  assert.equal(E.W.length, 10);
  E.W.forEach((row, i) => { assert.equal(row.length, 10); assert.equal(row[i], 0); });
  E.EDGES.forEach(([a, b, w]) => assert.equal(E.W[E.NAMES.indexOf(a)][E.NAMES.indexOf(b)], w));
});
test("one step matches e + h(Wᵀe − de) by hand", () => {
  const e = new Array(10).fill(0);
  e[E.NAMES.indexOf("shame")] = 0.5;
  const next = E.step(e);
  near(next[E.NAMES.indexOf("shame")], 0.5 + E.H * (-E.D * 0.5));
  near(next[E.NAMES.indexOf("loneliness")], E.H * 0.5 * 0.5);
  near(next[E.NAMES.indexOf("connection")], 0); // pushed below 0, clamped
});
test("dynamics stay inside [0,1] for extreme and random starts", () => {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const starts = [new Array(10).fill(1), new Array(10).fill(0)];
  for (let k = 0; k < 50; k++) starts.push(E.NAMES.map(() => rnd()));
  starts.forEach(s => E.project(s, 40).forEach(v => assert.ok(v >= 0 && v <= 1)));
});

// ---------- Loops and λ ----------
test("loop detection: shame × loneliness is an unstable loop with u = W·W·e·e", () => {
  const r = E.analyze(TARGET);
  const l = r.loops.find(x => x.a === "shame" && x.b === "loneliness");
  assert.ok(l && l.kind === "unstable");
  near(l.u, Math.round(0.5 * 0.4 * at(r, "shame") * at(r, "loneliness") * 1000) / 1000);
});
test("a weak hard loop is 'reinforcing' (√(WW) < d), not unstable", () => {
  const r = E.analyze("I am so scared and furious");
  const l = r.loops.find(x => x.a === "fear" && x.b === "anger");
  assert.ok(l);
  assert.equal(l.kind, "reinforcing");
  assert.equal(r.unstable.length, 0);
});
test("loops among helpful feelings are 'steadying'", () => {
  const r = E.analyze("I am so happy and really hopeful");
  assert.ok(r.loops.some(l => l.kind === "steadying"));
  assert.equal(r.unstable.length, 0);
});
test("eigenvalues: diagonal, 2×2 symmetric, and complex pair cases", () => {
  assert.deepEqual(E.eigenRealParts([[-0.3]]), [-0.3]);
  const sym = E.eigenRealParts([[-0.3, 0.5], [0.4, -0.3]]).sort((a, b) => b - a);
  near(sym[0], -0.3 + Math.sqrt(0.2), 1e-6); near(sym[1], -0.3 - Math.sqrt(0.2), 1e-6);
  const rot = E.eigenRealParts([[-0.3, 0.5], [-0.5, -0.3]]);
  rot.forEach(x => near(x, -0.3, 1e-6));
});
test("λ sign on constructed cases: strong loop > 0, single feeling = −d, tug-of-war > 0, none → null", () => {
  const e = new Array(10).fill(0);
  assert.equal(E.lambda(e).lambda, null);
  e[E.NAMES.indexOf("sadness")] = 0.6;
  near(E.lambda(e).lambda, -E.D, 1e-3);
  e[E.NAMES.indexOf("loneliness")] = 0.6;
  assert.ok(E.lambda(e).lambda > 0);
  const calm = new Array(10).fill(0);
  calm[E.NAMES.indexOf("calm")] = 0.6; calm[E.NAMES.indexOf("fear")] = 0.6;
  // Mutual dampening is a tug-of-war: also λ > 0 (−d + √(0.5·0.4)), one side wins.
  near(E.lambda(calm).lambda, -0.3 + Math.sqrt(0.2), 1e-3);
});
test("the target sentence reads as unstable, λ > 0, stabilizer connection", () => {
  const r = E.analyze(TARGET);
  assert.ok(r.lambda > 0);
  assert.equal(r.stabilizer.name, "connection");
  assert.equal(r.stabilizer.creature, "Tidelyn");
});
test("tension pairs: a helpful and a hard feeling that pull against each other", () => {
  const r = E.analyze("I am lonely but my friend loves me");
  assert.ok(r.tension.some(t => [t.a, t.b].includes("connection") && [t.a, t.b].includes("loneliness")));
  assert.ok(r.lines.unstable.some(l => /tension/.test(l)));
});

// ---------- Language ----------
test("language format: sections and line shapes", () => {
  const r = E.analyze(TARGET);
  const txt = E.toText(r);
  ["Emotions", "Relationships", "Unstable combinations", "Overall", "Stabilizer"].forEach(h => assert.match(txt, new RegExp("^" + h + "$", "m")));
  r.lines.emotions.forEach(l => assert.match(l, /^[a-z]+ = \d\.\d\d$/));
  r.lines.relationships.forEach(l => assert.match(l, /^[a-z]+ \(\d\.\d\d\) [↑↓] [a-z]+( \(\d\.\d\d\))?$/));
  assert.match(r.lines.unstable[0], /^shame × loneliness: loop, u = \d\.\d\d → unstable$/);
  assert.match(r.lines.overall[0], /^λ = \+\d\.\d\d → unstable mix/);
  assert.match(r.summary, /^Equation view: shame × loneliness unstable, λ = \+\d\.\d\d; stabilizer: connection$/);
});
test("arc hint maps the strongest hard loop to a story pattern", () => {
  assert.equal(E.arcHint(E.analyze(TARGET)), "labeling");
  assert.equal(E.arcHint(E.analyze("so sad and so lonely")), "hopelessness");
  assert.equal(E.arcHint(E.analyze("I am so scared and furious")), "catastrophizing");
  assert.equal(E.arcHint(E.analyze("the bus is at noon")), null);
});
test("deterministic: the same text gives the same output", () => {
  assert.equal(E.toText(E.analyze(TARGET)), E.toText(E.analyze(TARGET)));
  assert.deepEqual(E.analyze("very scared, not calm").e, E.analyze("very scared, not calm").e);
});

// ---------- Safety ----------
test("crisis text returns { crisis: true } and nothing else", () => {
  ["I want to kill myself", "I want to die", "I'm going to end my life"].forEach(t => {
    const r = E.analyze(t);
    assert.deepEqual(r, { crisis: true }, t);
    assert.equal(E.toText(r), "");
    assert.equal(E.summaryLine(r), "");
    assert.equal(E.arcHint(r), null);
  });
});
test("output never echoes the input text, so markup cannot get in", () => {
  const r = E.analyze("<img src=x onerror=alert(1)> I am <b>sad</b> & alone");
  const txt = E.toText(r) + r.summary;
  assert.ok(!/[<>&]/.test(txt), txt);
  assert.ok(at(r, "sadness") > 0);
});

console.log(`\n${passed} passed${process.exitCode ? ", some failed" : ""}`);
