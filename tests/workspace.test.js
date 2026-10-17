// Run: node tests/workspace.test.js   (no dependencies)
const assert = require("node:assert/strict");
const W = require("../js/workspace.js");
const E = require("../js/emotions.js");

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}
const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const TARGET = "I'm ashamed and so alone, nobody cares and I'm angry at myself";
const T0 = new Date(2026, 9, 17, 13, 50).getTime();
const vec = o => W.fromObj(o);
const withE = e => ({ ...W.defaultState(), e });

// ---------- Vectors ----------
test("home vector: joy .6, hope .8, calm .8, connection .8, hard feelings 0", () => {
  assert.deepEqual(W.defaultState().home, vec({ joy: 0.6, hope: 0.8, calm: 0.8, connection: 0.8 }));
});
test("distance, cosine, and the zero vector", () => {
  const h = W.defaultState().home;
  near(W.distance(h, h), 0);
  near(W.cosine(h, h), 1);
  assert.equal(W.cosine(new Array(10).fill(0), h), 0);
  near(W.distance(new Array(10).fill(0), h), Math.sqrt(0.36 + 3 * 0.64));
});
test("words add to the base: e = 1 − (1 − base)(1 − words), never lower", () => {
  const base = vec({ shame: 0.5 }), words = vec({ shame: 0.5, fear: 0.2 });
  const c = W.combine(base, words);
  near(c[E.NAMES.indexOf("shame")], 0.75); near(c[E.NAMES.indexOf("fear")], 0.2);
  c.forEach((x, i) => assert.ok(x >= base[i] && x >= words[i]));
});
test("fromText reads the engine; empty text is the zero vector", () => {
  const r = W.fromText(TARGET);
  assert.ok(r.e[E.NAMES.indexOf("shame")] > 0.5);
  assert.deepEqual(W.fromText("   ").e, new Array(10).fill(0));
});

// ---------- Hidden variables ----------
test("hidden variables: unstated feelings the dynamics raise, with the source", () => {
  const s = withE(W.fromText(TARGET).e);
  const m = W.metrics(s);
  const sad = m.hidden.find(x => x.kind === "dynamics" && x.name === "sadness");
  assert.ok(sad && sad.from === 0 && sad.to - sad.from >= W.HIDDEN_RISE);
  assert.equal(sad.via, "loneliness");
  m.hidden.filter(x => x.kind === "dynamics").forEach(x => assert.ok(x.from <= E.ACTIVE));
});
test("hidden variables: pattern amplifiers from the words (absolutes, curse language)", () => {
  const r = W.fromText("I'm cursed and nothing will ever change, I always fail");
  const m = W.metrics(withE(r.e), r.notes);
  const notes = m.hidden.filter(x => x.kind === "pattern").map(x => x.note);
  assert.ok(notes.includes("absolute words"), notes.join());
  assert.ok(notes.some(n => /curse/.test(n)), notes.join());
});
test("no hidden variables at home", () => {
  assert.equal(W.metrics(W.defaultState()).hidden.length, 0);
});

// ---------- The ideal step ----------
test("ideal step: distance to home goes down at every step (stable case)", () => {
  let s = withE(vec({ sadness: 0.6, fear: 0.3 }));
  assert.ok(W.metrics(s).lambda <= 0);
  let d = W.metrics(s).d;
  for (let k = 0; k < 25; k++) {
    s = W.acceptStep(s, T0 + k * 60000);
    const m = W.metrics(s);
    assert.ok(m.d < d || m.d === 0, `step ${k}: ${m.d} !< ${d}`);
    d = m.d;
  }
  assert.ok(d < 0.3);
  for (let k = 0; k < 200 && d > 0; k++) { s = W.acceptStep(s, T0); const m = W.metrics(s); assert.ok(m.d < d); d = m.d; }
  assert.equal(d, 0, "reaches home");
});
test("ideal step: also shrinks distance in the unstable case, with a capped step", () => {
  let s = withE(W.fromText(TARGET).e);
  let m = W.metrics(s);
  assert.ok(m.lambda > 0);
  assert.ok(m.ideal.a <= W.A_UNSTABLE && m.ideal.a >= W.A_MIN);
  assert.equal(m.ideal.b, W.B_UNSTABLE);
  let d = m.d;
  for (let k = 0; k < 10; k++) {
    s = W.acceptStep(s, T0 + k * 60000);
    m = W.metrics(s);
    assert.ok(m.d < d, `step ${k}`);
    if (m.lambda > 0) assert.ok(m.ideal.a <= W.A_UNSTABLE);
    d = m.d;
  }
});
test("ideal step: a scales with distance (bigger far away, never above the cap)", () => {
  const far = W.ideal(vec({ sadness: 0.9, fear: 0.9, guilt: 0.9 })), near_ = W.ideal(vec({ joy: 0.5, hope: 0.7, calm: 0.7, connection: 0.7 }));
  assert.ok(far.lambda <= 0);
  assert.ok(far.a > near_.a);
  [far, near_].forEach(x => assert.ok(x.a <= W.A_MAX && x.a >= W.A_MIN));
});
test("ideal step: every value moves toward home and never passes it", () => {
  const s = withE(vec({ joy: 0.9, shame: 0.7, calm: 0.2 }));
  const h = s.home, id = W.metrics(s).ideal;
  id.next.forEach((y, i) => {
    const x = s.e[i];
    assert.ok(Math.abs(y - h[i]) <= Math.abs(x - h[i]) + 1e-9);
    assert.ok((x - h[i]) * (y - h[i]) >= 0);
  });
});
test("ideal step names what to work on: the unstable loop, then the biggest gaps", () => {
  const m = W.metrics(withE(W.fromText(TARGET).e));
  assert.equal(m.ideal.work[0].kind, "loop");
  assert.deepEqual([m.ideal.work[0].a, m.ideal.work[0].b], ["shame", "loneliness"]);
  assert.equal(m.ideal.work[1].name, "loneliness");
  assert.equal(m.ideal.stabilizer.name, "connection");
});
test("at home there is nothing to move", () => {
  const home = withE(W.defaultState().home);
  const m = W.metrics(home);
  assert.equal(m.d, 0);
  assert.deepEqual(m.ideal.next, home.e);
  assert.equal(W.idealWords(m), "You are at home. Nothing to move.");
  assert.equal(W.story(home, m), null);
});

// ---------- The code language ----------
function sample() {
  let s = withE(W.fromText(TARGET).e);
  s = W.addCheckpoint(s, "start", T0);
  s = W.acceptStep(s, T0 + 5 * 60000);
  return { ...s, w: [{ from: "shame", to: "loneliness", w: 0.45 }] };
}
test("round trip: parse(serialize(s)) = s, and serialize(parse(code)) = code", () => {
  const s = W.refreshIdeal(sample());
  const code = W.serialize(s);
  const p = W.parse(code);
  assert.ok(p.ok, JSON.stringify(p.errors));
  assert.deepEqual(p.state, s);
  assert.equal(W.serialize(p.state), code);
});
test("code shape: header, home, e, steps, w, cp, ideal, eq", () => {
  const code = W.serialize(W.refreshIdeal(sample()));
  const lines = code.trim().split("\n");
  assert.equal(lines[0], "mf 1");
  assert.equal(lines[1], "home joy=0.60 hope=0.80 calm=0.80 connection=0.80");
  assert.match(lines[2], /^e( [a-z]+=\d\.\d\d)+$/);
  assert.equal(lines[3], "steps 8");
  assert.equal(lines[4], "w shame>loneliness=0.45");
  assert.match(lines[5], /^cp 1 2026-10-17T13:50 label=start anger=0\.68 shame=0\.80 loneliness=0\.94 lambda=0\.27$/);
  assert.match(lines[6], /^cp 2 2026-10-17T13:55 label=step-1 /);
  assert.match(lines[7], /^ideal a=0\.\d\d b=0\.\d\d$/);
  assert.match(lines[8], /^eq e' = e \+ 0\.\d\d\*\(h - e\) \+ 0\.\d\d\*s\(e\)$/);
});
test("parser is lenient on form: comments, blank lines, short numbers, CRLF", () => {
  const p = W.parse("# my session\r\n\r\nmf 1\r\ne shame=.8 fear=1   # end note\r\nsteps 4\r\n");
  assert.ok(p.ok);
  assert.equal(p.state.e[E.NAMES.indexOf("shame")], 0.8);
  assert.equal(p.state.e[E.NAMES.indexOf("fear")], 1);
  assert.equal(p.state.steps, 4);
});
test("parser errors are friendly and name the line", () => {
  const cases = [
    ["hello", /Line 1: the code should start with “mf 1”/],
    ["mf 2", /Line 1: this is version 2/],
    ["mf 1\ne sham=0.5", /Line 2: “sham” isn't one of the ten emotions/],
    ["mf 1\ne shame=1.5", /Line 2: shame=1\.5 must be between 0 and 1/],
    ["mf 1\ne shame", /Line 2: “shame” should look like name=0\.50/],
    ["mf 1\nsteps 0", /Line 2: steps should be a whole number from 1 to 50/],
    ["mf 1\nw shame>shame=0.5", /Line 2: a weight joins two different emotions/],
    ["mf 1\nw shame>fear=2", /Line 2: a weight must be between -1 and 1/],
    ["mf 1\ncp 1 yesterday label=a", /Line 2: the time should look like/],
    ["mf 1\ncp 1 2026-10-17T13:50 label=Hello there", /Line 2: the label should look like/],
    ["mf 1\ncp 2 2026-10-17T13:50 label=a\ncp 1 2026-10-17T13:51 label=b", /Line 3: checkpoint numbers should go up/],
    ["mf 1\nrun alert(1)", /Line 2: “run” isn't a keyword/],
    ["", /Nothing to import yet/],
  ];
  cases.forEach(([code, re]) => {
    const p = W.parse(code);
    assert.equal(p.ok, false, code);
    assert.ok(p.errors.some(e => re.test(e.msg)), `${code}: ${p.errors.map(e => e.msg).join(" | ")}`);
  });
});
test("parser never evaluates code: script-like text is just an error", () => {
  globalThis.__pwned = false;
  const p = W.parse("mf 1\ne shame=0.5\n__pwned=true\neq e' = (globalThis.__pwned = true)");
  assert.equal(globalThis.__pwned, false);
  assert.equal(p.ok, false);
});
test("too long or too many checkpoints is refused", () => {
  assert.equal(W.parse("mf 1\n" + "# x\n".repeat(500)).ok, false);
  let code = "mf 1\n";
  for (let i = 1; i <= 51; i++) code += `cp ${i} 2026-10-17T13:50 label=a\n`;
  assert.match(W.parse(code).errors[0].msg, /at most 50 checkpoints/);
});

// ---------- Checkpoints ----------
test("checkpoints number up, keep a copy of e, and restore it", () => {
  let s = withE(vec({ fear: 0.6 }));
  s = W.addCheckpoint(s, "start", T0);
  s = { ...s, e: vec({ fear: 0.2, calm: 0.5 }) };
  s = W.addCheckpoint(s, "", T0 + 60000);
  assert.deepEqual(s.cps.map(c => [c.n, c.label, c.t]), [[1, "start", "2026-10-17T13:50"], [2, "cp-2", "2026-10-17T13:51"]]);
  const r = W.restore(s, 1);
  assert.deepEqual(r.e, vec({ fear: 0.6 }));
  assert.equal(r.cps.length, 2);
  assert.equal(W.restore(s, 99), s);
});
test("accept step: the step becomes e and a new checkpoint, so the next equation starts there", () => {
  const s0 = withE(W.fromText(TARGET).e);
  const next = W.metrics(s0).ideal.next;
  const s1 = W.acceptStep(s0, T0);
  assert.deepEqual(s1.e, next);
  assert.equal(s1.cps[0].label, "step-1");
  assert.deepEqual(s1.cps[0].e, next);
  assert.equal(W.acceptStep(s1, T0).cps[1].label, "step-2");
});

// ---------- Story ----------
test("story names the top gap, the stabilizer guide, and the move toward home", () => {
  const s = withE(W.fromText(TARGET).e);
  const m = W.metrics(s);
  const st = W.story(s, m, { seed: 3 });
  assert.equal(st.guide, "Tidelyn");
  assert.equal(st.focus, "loneliness");
  assert.match(st.text, /loneliness sat at 0\.94/);
  assert.match(st.text, /loneliness moved from 0\.94 to 0\.\d\d/);
  assert.match(st.text, /send one short message to someone who is kind/);
  assert.ok(!/ashamed|nobody cares/.test(st.text), "story does not repeat the words");
  assert.deepEqual(st.next, m.ideal.next);
});

// ---------- Determinism and safety ----------
test("deterministic: same input, same lines, code, and story", () => {
  const a = withE(W.fromText(TARGET).e), b = withE(W.fromText(TARGET).e);
  assert.deepEqual(W.lines(a, W.metrics(a)), W.lines(b, W.metrics(b)));
  assert.equal(W.serialize(W.refreshIdeal(a)), W.serialize(W.refreshIdeal(b)));
  assert.equal(W.story(a, W.metrics(a), { seed: 2 }).text, W.story(b, W.metrics(b), { seed: 2 }).text);
});
test("crisis gating: crisis words give { crisis: true } and no vector", () => {
  ["I want to kill myself", "I want to end it all", "I don't want to live, I want to die"].forEach(t => assert.deepEqual(W.fromText(t), { crisis: true }, t));
  assert.equal(W.parse("mf 1\ncp 1 2026-10-17T13:50 label=kill-myself").crisis, true);
});
test("no user text in exported code: only keywords, emotion names, numbers, times, labels", () => {
  const words = "I'm ashamed and so alone, nobody cares and I'm angry at myself because of Jordan";
  let s = withE(W.fromText(words).e);
  s = W.addCheckpoint(s, "start", T0);
  const code = W.serialize(W.refreshIdeal(W.acceptStep(s, T0)));
  ["ashamed", "alone", "nobody", "Jordan", "myself", "angry"].forEach(w => assert.ok(!code.includes(w), w));
  code.trim().split("\n").forEach(line => assert.match(line, /^(mf 1|home( [a-z]+=\d\.\d\d)*|e( [a-z]+=\d\.\d\d)*|steps \d+|cp \d+ [\dT:-]+ label=[a-z0-9-]+( [a-z]+=-?\d\.\d\d)*|ideal a=\d\.\d\d b=\d\.\d\d|eq e' = e \+ \d\.\d\d\*\(h - e\) \+ \d\.\d\d\*s\(e\))$/, line));
});
test("lines never echo the input, so markup cannot get in", () => {
  const r = W.fromText("<img src=x onerror=alert(1)> I am <b>sad</b>");
  const s = withE(r.e);
  const txt = W.lines(s, W.metrics(s, r.notes)).join("\n");
  assert.ok(!/[<>]/.test(txt));
});

console.log(`\n${passed} passed${process.exitCode ? ", some failed" : ""}`);
