// Run: node tests/frameworks.test.js   (no dependencies)
// Editable variables, framework presets, recovery estimates, optimizer.
const assert = require("node:assert/strict");
const W = require("../js/workspace.js");

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}
const EGO = "It's not my fault, they always blame me and I'm better than all of them but I hate myself";
const vec = o => W.fromObj(o);
const live = text => { const s = W.defaultState(), t = W.fromText(text); return { ...s, e: W.combine(s.e, t.e), ego: { ...s.ego, g: W.combine1(s.ego.g, t.ego.g) } }; };
const inBounds = vars => W.VAR_KEYS.every(k => vars[k] >= W.SPEC[k].min && vars[k] <= W.SPEC[k].max) && vars.aMin <= vars.aCap && vars.aCap <= vars.aMax && vars.rCap <= vars.r;

// ---------- Variables ----------
test("defaults: every variable has a default inside its range", () => {
  const v = W.defaultVars();
  assert.ok(inBounds(v));
  assert.equal(v.d, 0.3); assert.equal(v.aMax, 0.25); assert.equal(v.eps, 0.3);
  assert.equal(W.SPEC.target.def, 0.3); assert.equal(W.SPEC.beta.def, 0.2); assert.equal(W.SPEC.k.def, 8);
});
test("validation clamps into range and keeps aMin ≤ aCap ≤ aMax, rCap ≤ r", () => {
  const { vars, notes } = W.validateVars({ d: 5, b: -1, aMin: 0.15, aMax: 0.1, aCap: 0.3, r: 0.1, rCap: 0.3, eps: "x" });
  assert.equal(vars.d, 1); assert.equal(vars.b, 0);
  assert.equal(vars.aMax, 0.15); assert.equal(vars.aCap, 0.15);
  assert.equal(vars.rCap, 0.1); assert.equal(vars.eps, 0.3);
  assert.ok(inBounds(vars));
  assert.ok(notes.length >= 5);
  assert.equal(W.clampExtra("k", 99), 50); assert.equal(W.clampExtra("target", 0), 0.1); assert.equal(W.clampExtra("beta", 3), 1);
});
test("a changed variable changes the output: decay d, horizon k, threshold rise", () => {
  const s = live("I'm ashamed and so alone, nobody cares");
  const base = W.metrics(s);
  const slower = W.metrics({ ...s, vars: W.validateVars({ ...s.vars, d: 0.6 }).vars });
  assert.ok(slower.lambda < base.lambda);
  const sensitive = W.metrics({ ...s, vars: W.validateVars({ ...s.vars, rise: 0.05 }).vars });
  assert.ok(sensitive.hidden.length >= base.hidden.length);
});
test("W pairs: setWeight overrides one entry and removes it when back to default", () => {
  let s = W.defaultState();
  s = W.setWeight(s, "connection", "shame", -0.8);
  assert.deepEqual(s.w, [{ from: "connection", to: "shame", w: -0.8 }]);
  assert.equal(W.weights(s.w)[3][7], -0.8);
  s = W.setWeight(s, "connection", "shame", W.defaultWeight("connection", "shame"));
  assert.deepEqual(s.w, []);
  assert.equal(W.setWeight(s, "calm", "fear", -5).w[0].w, -1);
});

// ---------- Presets ----------
test("eight presets load (with Catholic), each only a set of variable values within range", () => {
  assert.deepEqual(W.PRESETS.map(p => p.id), ["default", "dbt", "cbt", "act", "self-compassion", "stoic", "faith", "catholic"]);
  W.PRESETS.forEach(p => {
    const f = W.presetFramework(p.id);
    assert.ok(inBounds(f.vars), p.id);
    assert.ok(f.home.every(x => x >= 0 && x <= 1));
    assert.ok(f.w.every(o => o.w >= -1 && o.w <= 1));
    assert.ok(f.target >= 0.1 && f.target <= 0.6);
  });
});
test("applying a preset changes variables, home, W, and the label; default resets", () => {
  const s0 = live(EGO);
  const s = W.applyFramework(s0, W.presetFramework("self-compassion"));
  assert.equal(s.framework, "self-compassion");
  assert.equal(s.vars.kShame, 0.45);
  assert.ok(s.w.some(o => o.from === "connection" && o.to === "shame" && o.w === -0.8));
  const f = W.applyFramework(s0, W.presetFramework("faith"));
  assert.equal(f.ego.target, 0.25);
  assert.equal(f.home[1], 0.9);
  const back = W.applyFramework(s, W.presetFramework("default"));
  assert.deepEqual([back.vars, back.w, back.home, back.ego.target], [W.defaultVars(), [], W.defaultState().home, 0.3]);
  assert.deepEqual(back.e, s0.e);
});

// ---------- Custom frameworks in code ----------
test("custom framework: save, round trip in code, and use", () => {
  let s = live(EGO);
  s = { ...s, vars: W.validateVars({ ...s.vars, aMax: 0.3, b: 0.12 }).vars, ego: { ...s.ego, target: 0.25 }, framework: "custom" };
  s = W.setWeight(s, "calm", "fear", -0.65);
  const saved = W.saveFramework(s, "my-plan");
  assert.ok(saved.ok);
  s = W.refreshIdeal(saved.state);
  const code = W.serialize(s);
  assert.match(code, /\nvars framework=my-plan aMax=0\.30 b=0\.12\n/);
  assert.match(code, /\nframework name=my-plan aMax=0\.30 b=0\.12 target=0\.25 w\.calm>fear=-0\.65\n/);
  const p = W.parse(code);
  assert.ok(p.ok, JSON.stringify(p.errors));
  assert.deepEqual(p.state, s);
  assert.equal(W.serialize(p.state), code);
  const fresh = W.applyFramework(W.defaultState(), W.findFramework(p.state, "my-plan"));
  assert.equal(fresh.vars.aMax, 0.3); assert.equal(fresh.ego.target, 0.25);
});
test("framework names: no preset names, label characters only", () => {
  assert.equal(W.saveFramework(W.defaultState(), "dbt").ok, false);
  assert.equal(W.saveFramework(W.defaultState(), "My Plan").ok, false);
  assert.equal(W.saveFramework(W.defaultState(), "kill-myself").crisis, true);
  [["mf 1\nframework name=dbt", /preset name/], ["mf 1\nframework name=x aMax=0.9", /aMax must be from 0\.05 to 0\.5/],
    ["mf 1\nframework name=x zzz=1", /isn't a framework value/], ["mf 1\nvars d=2", /d must be from 0\.05 to 1/],
    ["mf 1\nvars aMin=0.2 aMax=0.1", /don't fit together/], ["mf 1\nvars speed=1", /isn't a variable/]].forEach(([c, re]) => {
    const p = W.parse(c);
    assert.ok(!p.ok && p.errors.some(e => re.test(e.msg)), c + " | " + (p.errors || []).map(e => e.msg).join(";"));
  });
  assert.equal(W.parse("mf 1\nframework name=kill-myself").crisis, true);
});

// ---------- Recovery estimate ----------
test("T_rec: deterministic, counts steps to ‖[e,g] − [h,g*]‖ < eps", () => {
  const s = live(EGO);
  const a = W.recovery(s), b = W.recovery(s);
  assert.deepEqual(a, b);
  assert.ok(a.reached && a.steps > 0 && a.final < s.vars.eps);
  assert.equal(a.days, a.steps);
  assert.deepEqual(W.recovery({ ...W.defaultState(), e: W.defaultState().home }), { steps: 0, reached: true, final: 0, rate: 1, days: 0 });
});
test("T_rec goes down when the step bounds go up (stable case)", () => {
  const s = { ...W.defaultState(), e: vec({ sadness: 0.9, fear: 0.5 }) };
  assert.ok(W.metrics(s).lambda <= 0);
  const t = vars => W.simulate({ ...s, vars: W.validateVars({ ...s.vars, ...vars }).vars }).steps;
  const slow = t({ aBase: 0.1, aMax: 0.15 }), mid = t({}), fast = t({ aBase: 0.35, aMax: 0.4 });
  assert.ok(slow > mid && mid > fast, `${slow} ${mid} ${fast}`);
});
test("not reached: a tiny step and a tight threshold report 'not reached' within the cap", () => {
  const s = { ...live(EGO), vars: W.validateVars({ aBase: 0.05, aMax: 0.05, aMin: 0.01, aCap: 0.01, b: 0, bU: 0, eps: 0.05, r: 0.05, rCap: 0.02 }).vars };
  const r = W.simulate(s, 20);
  assert.equal(r.reached, false);
  assert.equal(r.steps, 20);
  assert.match(W.recText({ ...r, days: null }), /^not reached in 200 steps \(closest \d\.\d\d\)$/);
});
test("days use the observed step rate", () => {
  let s = live(EGO);
  const t = h => new Date(2026, 9, 17, h).getTime();
  s = W.acceptStep(s, t(9)); s = W.acceptStep(s, t(12)); s = W.acceptStep(s, t(15));
  const r = W.recovery(s);
  assert.equal(r.rate, 3);
  assert.equal(r.days, Math.ceil(r.steps / 3));
});
test("compare: every preset, sorted by T_rec, with not-reached last", () => {
  const s = live(EGO);
  const rows = W.compare(s);
  assert.equal(rows.length, W.PRESETS.length);
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1], b = rows[i];
    assert.ok(a.reached >= b.reached && (a.reached !== b.reached || a.steps <= b.steps));
  }
  const withCustom = W.saveFramework({ ...s, vars: W.validateVars({ ...s.vars, aMin: 0.01, aMax: 0.05, aBase: 0.05, aCap: 0.01, b: 0, bU: 0, eps: 0.05 }).vars }, "slow").state;
  const rows2 = W.compare(withCustom);
  assert.equal(rows2.length, W.PRESETS.length + 1);
  assert.equal(rows2[rows2.length - 1].name, "slow");
  assert.deepEqual(withCustom.e, s.e, "comparing changes nothing");
});

// ---------- Optimizer ----------
test("optimizer: never raises T_rec, stays in bounds, never touches the unstable caps", () => {
  [live(EGO), live("I'm ashamed and so alone, nobody cares and I'm angry at myself"), { ...W.defaultState(), e: vec({ sadness: 0.9, fear: 0.5 }) }].forEach(s => {
    const o = W.optimize(s);
    assert.ok(inBounds(o.vars));
    assert.equal(o.vars.aCap, s.vars.aCap); assert.equal(o.vars.rCap, s.vars.rCap); assert.equal(o.vars.bU, s.vars.bU);
    assert.ok(o.after.steps <= o.before.steps);
    const sim = W.simulate({ ...s, vars: o.vars });
    assert.deepEqual(sim, o.after);
  });
});
test("optimizer keeps the safeguards: every simulated step still moves toward home", () => {
  const s = live(EGO);
  const o = W.optimize(s);
  let cur = { ...s, vars: o.vars };
  const H = cur.home.concat([cur.ego.target]);
  let D = W.distance(cur.e.concat([cur.ego.g]), H);
  for (let k = 0; k < 30; k++) {
    const m = W.metrics(cur);
    if (m.lambda > 0) assert.ok(m.ideal.a <= cur.vars.aCap);
    cur = { ...cur, e: m.ideal.next, ego: { ...cur.ego, g: m.ideal.gNext } };
    const D2 = W.distance(cur.e.concat([cur.ego.g]), H);
    assert.ok(D2 <= D + 1e-9);
    D = D2;
  }
});
test("optimizer is deterministic and reports what changed", () => {
  const s = { ...W.defaultState(), e: vec({ sadness: 0.9, fear: 0.5 }) };
  const a = W.optimize(s), b = W.optimize(s);
  assert.deepEqual(a, b);
  assert.ok(a.after.steps < a.before.steps);
  assert.ok(a.changed.length > 0 && a.changed.every(c => ["aBase", "aMax", "b", "r"].includes(c.key)));
});

console.log(`\n${passed} passed${process.exitCode ? ", some failed" : ""}`);
