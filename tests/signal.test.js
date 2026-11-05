// Run: node tests/signal.test.js
// Corrected signal field: stability, diffusion conservation, integral clamp.
"use strict";
const assert = require("node:assert/strict");
const Sig = require("../ariel/signal.js");

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}

test("the displayed equation is the scalar correction, and the step stays inside γΔt/h² ≤ 0.25", () => {
  assert.equal(Sig.EQ, "Sₙ₊₁ = Sₙ + Δt·[Kᵢ·I + β(v·n̂) + γ∇²S − ρ·χ_doubt·S],  e = Ψ − α·u,  I = clamp(∫ e dτ)");
  assert.match(Sig.TEX, /\\nabla\^\{2\}S/);
  assert.match(Sig.TEX, /\\hat\{n\}/);
  const h = 1 / 15;
  const dt = Sig.stableDt(4, h, 1);
  assert.ok(4 * dt / (h * h) <= 0.25 + 1e-12);
  assert.ok(dt < 1);
  const st = Sig.create(16);
  let limit = 0;
  for (let k = 0; k < 40; k++) {
    const r = Sig.step(st, { gamma: 3, dt: 1, Ki: 0.2, alpha: 0.2, beta: 0.2, rho: 0.3, u: 0.5, circles: [{ x: 0.5, y: 0.5, r: 0.2 }] });
    limit = Math.max(limit, r.limit);
    for (let i = 0; i < st.S.length; i++) {
      assert.ok(Math.abs(st.S[i]) <= Sig.PARAMS.Smax + 1e-9);
      assert.ok(isFinite(st.S[i]));
    }
  }
  assert.ok(limit <= 0.25 + 1e-9);
});

test("diffusion alone conserves the field (only γ on, Neumann stencil)", () => {
  const st = Sig.create(12);
  for (let i = 0; i < st.S.length; i++) st.S[i] = Math.sin(i * 0.37) * 0.8;
  const before = Sig.sum(st.S);
  const zero = new Float64Array(st.n * st.n);
  for (let k = 0; k < 25; k++) Sig.step(st, { gamma: 0.08, dt: 0.02, Ki: 0, alpha: 0, beta: 0, rho: 0, u: 0, psi: zero, chi: zero });
  assert.ok(Math.abs(Sig.sum(st.S) - before) < 1e-8, Sig.sum(st.S) + " vs " + before);
});

test("the integral clamps and does not wind up", () => {
  const st = Sig.create(8);
  const ones = new Float64Array(st.n * st.n);
  ones.fill(1);
  const zero = new Float64Array(st.n * st.n);
  for (let k = 0; k < 80; k++) Sig.step(st, { dt: 0.2, Ki: 0, alpha: 0, beta: 0, gamma: 0, rho: 0, u: 0, psi: ones, chi: zero, Imax: 0.5, Smax: 4 });
  for (let i = 0; i < st.I.length; i++) {
    assert.ok(st.I[i] <= 0.5 + 1e-12);
    assert.ok(st.I[i] >= -0.5 - 1e-12);
    assert.equal(st.I[i], 0.5);
  }
});

console.log(`\n${passed} passed`);
