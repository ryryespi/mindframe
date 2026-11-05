// ariel/signal.js — corrected Signal Transmission Model.
// A user submitted S_out = K_i ∫[Ψ − α u] dτ + β dp/dt + γ ∇²M.
// That mixes a vector with scalars, diffuses an undefined M, and leaves symbols open.
// This file is the consistent scalar version. No DOM and no network.
//
// ===== PARAMS (all tunables) =====
// n        grid on each side, coordinates run from 0 to 1
// dt       requested step; stableDt may shrink it
// Imax     anti-windup clamp on the integral field I
// Smax     clamp on the signal field S
// sigma    width of the goal Gaussian Ψ, peaked at the O anchor
// Ki α β γ ρ u   the sliders (gain, input weight, momentum, diffusion, doubt, user level)
//
// ===== EQUATIONS =====
// e(x,y,t) = Ψ(x,y) − α·u(t)                         error, a scalar field
// I        = clamp(∫ e dτ)                           accumulator, same grid, anti-windup
// p(t)     tracer from I to O;  v·n̂ = dp/dt         only the speed along I→O
// ∇²S      5-point stencil on S itself               (S_left + S_right + S_up + S_down − 4 S) / h²
// χ_doubt  1 inside a Circle of Doubt, else 0
// S_{n+1}  = S_n + Δt·[K_i·I + β(v·n̂) + γ∇²S − ρ·χ_doubt·S]
// stable when γ Δt / h² ≤ 0.25; S is then clamped
"use strict";
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ArielSignal = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const PARAMS = { n: 28, dt: 0.05, Imax: 2, Smax: 4, sigma: 0.16, Ki: 0.35, alpha: 0.5, beta: 0.25, gamma: 0.02, rho: 0.4, u: 0.35 };

  /** One line, the same string the Math view shows. */
  const EQ = "Sₙ₊₁ = Sₙ + Δt·[Kᵢ·I + β(v·n̂) + γ∇²S − ρ·χ_doubt·S],  e = Ψ − α·u,  I = clamp(∫ e dτ)";
  const TEX = "S_{n+1}=S_n+\\Delta t[K_i I+\\beta(v\\cdot\\hat{n})+\\gamma\\nabla^{2}S-\\rho\\chi_{\\mathrm{doubt}}S],\\ e=\\Psi-\\alpha u,\\ I=\\mathrm{clamp}(\\int e\\,d\\tau)";

  /** Shrink dt so the explicit 5-point diffusion stays inside γ Δt / h² ≤ 0.25. */
  function stableDt(gamma, h, dt) {
    const want = dt == null || !(dt > 0) ? PARAMS.dt : dt;
    const g = Number(gamma) || 0;
    if (g <= 0 || !(h > 0)) return want;
    return Math.min(want, 0.25 * h * h / g);
  }

  function create(n) {
    const N = (n || PARAMS.n);
    const len = N * N;
    return { n: N, S: new Float64Array(len), I: new Float64Array(len), p: 0, t: 0, hist: [] };
  }

  function sum(a) {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i];
    return s;
  }

  /** Neumann 5-point Laplacian. The ghost cell equals the boundary cell, so the field sum is kept. */
  function laplacian(S, n, h, out) {
    const h2 = h * h;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const k = j * n + i;
        const c = S[k];
        const left = S[j * n + (i === 0 ? i : i - 1)];
        const right = S[j * n + (i === n - 1 ? i : i + 1)];
        const down = S[(j === 0 ? j : j - 1) * n + i];
        const up = S[(j === n - 1 ? j : j + 1) * n + i];
        out[k] = (left + right + down + up - 4 * c) / h2;
      }
    }
  }

  /** Goal field: a Gaussian peak at the output anchor (ox, oy) in 0..1. */
  function psiGrid(n, ox, oy, sigma) {
    const out = new Float64Array(n * n);
    const s2 = 2 * sigma * sigma || 1e-6;
    for (let j = 0; j < n; j++) {
      const y = j / (n - 1);
      for (let i = 0; i < n; i++) {
        const x = i / (n - 1);
        const dx = x - ox, dy = y - oy;
        out[j * n + i] = Math.exp(-(dx * dx + dy * dy) / s2);
      }
    }
    return out;
  }

  /** 1 inside any doubt circle {x, y, r} in 0..1 coordinates, else 0. */
  function doubtMask(n, circles) {
    const out = new Float64Array(n * n);
    const list = circles || [];
    if (!list.length) return out;
    for (let j = 0; j < n; j++) {
      const y = j / (n - 1);
      for (let i = 0; i < n; i++) {
        const x = i / (n - 1);
        for (let c = 0; c < list.length; c++) {
          const C = list[c];
          if ((x - C.x) * (x - C.x) + (y - C.y) * (y - C.y) <= C.r * C.r) { out[j * n + i] = 1; break; }
        }
      }
    }
    return out;
  }

  /**
   * One stable step. Mutates state.S, state.I, state.p, state.t, state.hist.
   * opt.psi and opt.chi may be supplied; otherwise they are built from ox, oy, circles.
   */
  function step(state, opt) {
    const o = opt || {};
    const n = state.n;
    const h = 1 / (n - 1);
    const gamma = Number(o.gamma) || 0;
    const dt = stableDt(gamma, h, o.dt);
    const Ki = Number(o.Ki) || 0, alpha = Number(o.alpha) || 0, beta = Number(o.beta) || 0;
    const rho = Number(o.rho) || 0, u = Number(o.u) || 0;
    const Imax = o.Imax == null ? PARAMS.Imax : o.Imax;
    const Smax = o.Smax == null ? PARAMS.Smax : o.Smax;
    const ox = o.ox == null ? 0.8 : o.ox, oy = o.oy == null ? 0.5 : o.oy;
    const psi = o.psi || psiGrid(n, ox, oy, o.sigma == null ? PARAMS.sigma : o.sigma);
    const chi = o.chi || doubtMask(n, o.circles || []);
    const lap = new Float64Array(n * n);
    if (gamma !== 0) laplacian(state.S, n, h, lap);
    let vhat = u;
    if ((state.p >= 1 && vhat > 0) || (state.p <= 0 && vhat < 0)) vhat = 0;
    state.p = Math.max(0, Math.min(1, state.p + dt * vhat));
    const Sprev = state.S;
    for (let k = 0; k < Sprev.length; k++) {
      const e = psi[k] - alpha * u;
      let I = state.I[k] + dt * e;
      if (I > Imax) I = Imax;
      else if (I < -Imax) I = -Imax;
      state.I[k] = I;
      let S = Sprev[k] + dt * (Ki * I + beta * vhat + gamma * lap[k] - rho * chi[k] * Sprev[k]);
      if (S > Smax) S = Smax;
      else if (S < -Smax) S = -Smax;
      Sprev[k] = S;
    }
    state.t += dt;
    const ix = Math.max(0, Math.min(n - 1, Math.round(ox * (n - 1))));
    const iy = Math.max(0, Math.min(n - 1, Math.round(oy * (n - 1))));
    const sAtO = Sprev[iy * n + ix];
    state.hist.push(sAtO);
    if (state.hist.length > 120) state.hist.shift();
    return { dt, h, vhat, sAtO, limit: gamma > 0 ? gamma * dt / (h * h) : 0 };
  }

  function readout(state, opt) {
    const o = opt || {};
    const last = state.hist.length ? state.hist[state.hist.length - 1] : 0;
    return "The signal is a field of numbers. Ψ is a soft peak at O, and your level u pulls against it. The tracer is " + Math.round(state.p * 100) + "% of the way from I to O"
      + " (speed along that line " + ((o.vhat == null ? o.u : o.vhat) || 0).toFixed(2) + ")."
      + " S at O is " + last.toFixed(2) + ". Diffusion spreads S. Inside a doubt circle it is reduced by ρ. This is a model, not a measurement.";
  }

  return { PARAMS, EQ, TEX, stableDt, create, step, sum, laplacian, psiGrid, doubtMask, readout };
});
