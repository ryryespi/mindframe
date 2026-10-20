// core/equations.js — the papers' equations as pure functions, one function per equation (push28).
// Every feature calls these instead of keeping its own copy of the math. Numbers come from
// js/data/params.js (P); nothing here reads the DOM, storage, the clock or randomness.
//
// Cross-reference: paper equation → function → params
//   OE = paper/MindFrame-One-Equation.pdf, GP = paper/MindFrame-Grace-Peace-Paper.pdf
//   ┌──────────────────────────────────────────────┬──────────────────────┬──────────────────────────────────┐
//   │ OE eq.(1)  c = 1 − e^(−0.7k) (every cue)      │ cue, cueRaw          │ words.CUE_RATE                   │
//   │ OE eq.(1)  n = 1 − e^(−raw) (lexicon)         │ sat                  │ —                                │
//   │ OE eq.(1)  e₋ ⊕ n (saturating add)            │ oplus                │ —                                │
//   │ OE eq.(1)  + X(1 − S)w (Kai push)             │ kaiApply             │ kai.W                            │
//   │ OE §Kai    A, F, E, R, S, I                   │ kaiShield, kaiImpulse│ kai.*                            │
//   │ OE eq.(2)  a(e) = min(a_max, a0 + k‖e − h‖)   │ stepSize             │ model.VAR_SPEC, model.FIXED      │
//   │ OE eq.(2)  s_j = e_j Σ_g min(0, W_gj) h_g     │ sVec                 │ model.EDGES                      │
//   │ OE eq.(2)  e' = clip(e + a(h − e) + b s)      │ stepNext             │ —                                │
//   │ OE eq.(2)  λ = ρ(W_A) − d                     │ lambda (memoized)    │ model.ACTIVE, model.POWER_ITERS  │
//   │ OE eq.(3)  left-alone drift (hidden C)        │ drift                │ model.REST_GROUND                │
//   │ OE eq.(3)  P = P_d(1 − γC)(1 − δG)            │ peace                │ VAR_SPEC d0, gamma, delta        │
//   │ OE eq.(3)  G = 1 − e^(−raw) + absolutist      │ (reality.js, sat)    │ words.ABSOLUTIST_*               │
//   │ OE eq.(4)  words: the peace band              │ peaceBand            │ peace.P_STAR, peace.BANDS        │
//   │ OE §1      B_t = 0.8 B_{t−1} + 0.2 e_t        │ ema                  │ model.FIXED.beta                 │
//   │ OE eq.(4)  F_self, F_other                    │ forgiveness          │ forgive.F0, forgive.F1           │
//   │ OE eq.(4)  J = P − μN, N(e)                   │ freeLoad, freeJ      │ freeing.MU                       │
//   │ OE τ14     x(1 − L), L = 1 − (1−L_t)(1−L_v)   │ gripLoosen           │ grip.L                           │
//   │ OE τ15     Π: past, after                     │ pastPull             │ past.*                           │
//   │ OE §topo   ρ = min(.9, raw(1 − .5 will))      │ resistance           │ topology.RHO_W, WILL_W, RHO_MAX  │
//   │ OE §topo   τ_eff = τ(1 + e_rum)/(1 − ρ)       │ tauTyp, tauEff       │ topology.TAU                     │
//   │ OE §topo   k(dt) = max_i e^(−dt/τ_eff,i)      │ kdt, flow            │ topology.TAU                     │
//   │ OE §topo   t = max_i τ_eff ln(|e−A|/0.1)      │ timeTo               │ topology.NEAR                    │
//   │ OE §topo   q = 1 − a_lo                       │ qHome                │ model.FIXED.aCap                 │
//   │ OE §topo   A' = clip(λA + (1−λ)(βe+(1−β)d))   │ beta, nextAnchor     │ topology.LAMBDA, BETA0, BETA1    │
//   │ OE §topo   e ↦ clip(e + a(1−ρ)(A − e))        │ anchorStep           │ —                                │
//   │ OE §topo   q_A, radius, q_ρ                   │ chainBound           │ topology.LAMBDA, EPS_OUT         │
//   │ OE §gov    U, Y, M_n                          │ govSignals           │ governor.U_W, Y_W, MN_W          │
//   │ OE §gov    α, ℓ(C), E, PI + anti-windup       │ activation, limit, pi│ governor.KP, KI, LEAK, L0, KAPPA │
//   │ (not in papers) Grounding Loop G update       │ (grounding.js)       │ grounding.ETA                    │
//   └──────────────────────────────────────────────┴──────────────────────┴──────────────────────────────────┘
// tests/params.test.js checks this table: every function named here exists, and every params key
// named here is in params.js.
if (typeof window === "undefined") require("../data/params.js");
(function (MF) {
  "use strict";
  const P = MF.Params;
  const r2 = x => Math.round(x * 100) / 100;
  const clamp01 = x => Math.min(1, Math.max(0, x));
  const clip = (x, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
  const norm = v => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  const distance = (a, b) => norm(a.map((x, i) => x - b[i]));

  // ---------- OE eq.(1): cues, saturation, the saturating add ----------
  /** c = 1 − e^(−0.7k), rounded to 0.01 (k ≥ 0 matching phrases). */
  const cue = k => r2(1 - Math.exp(-P.words.CUE_RATE * Math.max(0, k)));
  /** The same strength, unrounded (topology and the governor use it inside products). */
  const cueRaw = k => 1 - Math.exp(-P.words.CUE_RATE * k);
  /** n = 1 − e^(−raw), rounded (the lexicon's raw sum → a strength). */
  const sat = x => r2(1 - Math.exp(-Math.max(0, x)));
  /** Noisy-OR: 1 − Π(1 − x_i), left to right (the shield S, ρ, U, Y, M_n). */
  const noisyOr = xs => 1 - xs.reduce((p, x) => p * (1 - x), 1);
  /**
   * e₋ ⊕ n: hard/process 1 − (1 − e)(1 − n); grounding e + n⁺(1 − e) − n⁻e. Rounded.
   * @param {number[]} base e₋   @param {{e:number[], pos:object, neg:object}} w the words   @param {string[]} names   @param {boolean[]} isGround
   */
  const oplus = (base, w, names, isGround) => base.map((b, i) => {
    if (!isGround[i]) return r2(1 - (1 - b) * (1 - w.e[i]));
    const n = names[i];
    return r2(clamp01(b + w.pos[n] * (1 - b) - w.neg[n] * b));
  });

  // ---------- OE §Kai: the shield and the push ----------
  /**
   * The shield from cue strengths. c: {kA,kF,kE,kR,kUrge,attack,X}; sess(k) = σ·SESSION; G = true size; anger = e_anger.
   * Returns {X, A, F, E, R, S, load, push(by name), I, u}.
   */
  function kaiShield(c, sess, pickX, pickF, G, anger, names) {
    const K = P.kai, cap = x => Math.min(K.V_MAX, Math.max(0, x));
    const X = r2(Math.max(c.X, pickX || 0));
    const A = r2(cap((1 - G) * noisyOr([cue(c.kA), sess("A")])));
    const F = r2(cap(noisyOr([cue(c.kF), sess("F"), pickF || 0])));
    const E = r2(cap(noisyOr([cue(c.kE), sess("E")])));
    const R = r2(cap((1 - c.attack) * noisyOr([cue(c.kR), sess("R")])));
    const S = Math.min(K.S_MAX, r2(1 - (1 - A) * (1 - F) * (1 - E) * (1 - R)));
    const load = X * (1 - S);
    const push = names.map(n => r2(load * (K.W[n] || 0)));
    return { X, A, F, E, R, S, load, push };
  }
  /** I = X(1 − S)·u, u = max(e_anger after the push, c_urge). */
  const kaiImpulse = (load, angerAfter, kUrge) => { const u = r2(Math.max(angerAfter, cue(kUrge))); return { u, I: r2(load * u) }; };
  /** e_j ← clip01(e_j + X(1 − S)w_j), rounded (identity when X = 0). */
  const kaiApply = (e, k) => (k && k.X > 0 ? e.map((x, j) => r2(clamp01(x + k.push[j]))) : e);

  // ---------- OE eq.(2): the step ----------
  /** a(e) and b: a = min(a_max, a0 + k·d), capped at a_cap with b = b_U when λ > 0. */
  function stepSize(V, d, unstable) {
    let a = Math.min(V.aMax, V.aBase + V.k * d);
    if (unstable) a = Math.min(a, P.model.FIXED.aCap);
    return { a, b: unstable ? P.model.FIXED.bU : V.b };
  }
  /** s_j(e) = e_j Σ_g min(0, W_gj) h_g ≤ 0 (grounding pressing on hard/process movers). */
  const sVec = (e, h, W, isGround) => e.map((ej, j) => (isGround[j] || ej <= h[j] ? 0 : ej * e.reduce((acc, m, i) => acc + (isGround[i] ? Math.min(0, W[i][j]) * h[i] : 0), 0)));
  /** e' = clip01(e + a(h − e) + b s); round = true rounds each mover to 0.01 (as master does). */
  const stepNext = (e, h, a, b, s, round = true) => e.map((x, j) => (round ? r2(clamp01(x + a * (h[j] - x) + b * s[j])) : clamp01(x + a * (h[j] - x) + b * s[j])));
  /** One left-alone dynamics step: e ← clamp01(e + dt(Wᵀ(e − rest) − d(e − rest))). */
  const drift = (e, W, dt, d, rest) => e.map((x, j) => {
    let inflow = 0;
    for (let i = 0; i < e.length; i++) inflow += W[i][j] * (e[i] - rest[i]);
    return clamp01(x + dt * (inflow - d * (x - rest[j])));
  });
  // λ depends only on WHICH movers are active, on W and on d (the iteration starts from ones), so it is
  // memoized on that key: the recovery and the peace solve call it hundreds of times per Update.
  const LAMBDA_MEMO = new Map();
  /** λ = ρ(W on the active hard/process movers) − d by power iteration (Perron), or null when none is active. */
  function lambda(e, W, d, isGround) {
    const A = [];
    for (let i = 0; i < e.length; i++) if (!isGround[i] && e[i] > P.model.ACTIVE) A.push(i);
    if (!A.length) return null;
    let byW = LAMBDA_MEMO.get(W);
    if (!byW) { byW = new Map(); LAMBDA_MEMO.set(W, byW); if (LAMBDA_MEMO.size > 32) LAMBDA_MEMO.delete(LAMBDA_MEMO.keys().next().value); }
    const key = A.join(",") + "|" + d;
    if (byW.has(key)) return byW.get(key);
    let v = A.map(() => 1), rho = 0;
    for (let it = 0; it < P.model.POWER_ITERS; it++) {
      const nv = A.map((j) => A.reduce((s, i, k) => s + Math.max(0, W[i][j]) * v[k], 0));
      const nn = norm(nv);
      if (nn < 1e-12) { rho = 0; break; }
      rho = nn / norm(v);
      v = nv.map(x => x / nn);
    }
    const out = r2(rho - d);
    byW.set(key, out);
    return out;
  }
  /** B_t = (1 − β)B_{t−1} + βe_t (β = 0.2); B_{t−1} null starts at e_t. */
  const ema = (B, e) => (B ? B.map((b, i) => (1 - P.model.FIXED.beta) * b + P.model.FIXED.beta * e[i]) : e.slice());

  // ---------- OE eq.(3): inner peace ----------
  /** P = P_d(1 − γC)(1 − δG), P_d = 1/(1 + (d/d0)²). */
  function peace(d, Cmax, g, V) {
    const Pd = 1 / (1 + (d / V.d0) ** 2), Pc = 1 - V.gamma * Cmax, Pg = 1 - V.delta * g;
    return { Pd, Pc, Pg, raw: Pd * Pc * Pg };
  }
  /** The peace band: < .4 a little, .4–.6 growing, .6–.8 close, ≥ .8 steady (a key, not display words). */
  const peaceBand = x => (x >= P.peace.P_STAR ? "steady" : x >= P.peace.BANDS[1] ? "close" : x >= P.peace.BANDS[0] ? "growing" : "a little");

  // ---------- OE eq.(4) passes ----------
  /** F_self = e_shame(0.4 + 0.6c_self), F_other = e_anger(0.4 + 0.6c_other), rounded. */
  const forgiveness = (eShame, eAnger, cSelf, cOther) => ({ Fs: r2(eShame * (P.forgive.F0 + P.forgive.F1 * cSelf)), Fo: r2(eAnger * (P.forgive.F0 + P.forgive.F1 * cOther)) });
  /** N(e) = e_shame + c_self·e_rumination + u·max(0, h_hope − e_hope). */
  const freeLoad = (eShame, eRum, eHope, hHope, cSelf, u) => eShame + cSelf * eRum + u * Math.max(0, hHope - eHope);
  /** J = P − μN. */
  const freeJ = (Praw, N) => Praw - P.freeing.MU * N;
  /** Loosen the grip: L = 1 − (1 − L_tool)(1 − L_value); after = x(1 − L). */
  function gripLoosen(pull, tool) {
    const L = P.grip.L, Lt = r2(1 - (1 - L[tool]) * (1 - L.value));
    return { Lt, after: Object.fromEntries(Object.keys(pull).map(k => [k, r2(pull[k] * (1 - Lt))])) };
  }
  /** Loop pull: clip(e_rum + 0.1·days + 0.2·c_loop). */
  const loopPull = (eRum, days, kLoop) => r2(clamp01(eRum + P.grip.DAY_W * days + P.grip.LOOP_W * cue(kLoop)));
  /** Π: past = clip(max(shame, rum) + 0.3c); after: shame, rum × (1 − LP), hope + (1 − hope)LH. */
  function pastPull(at, k, path, cOther) {
    const Q = P.past;
    const past = r2(clamp01(Math.max(at("shame"), at("rumination")) + Q.CUE_W * cue(k)));
    const score = { self: r2(at("shame") + (path === "self" ? Q.SELF_BONUS : 0)), other: r2(path === "other" ? cOther || 0 : 0), loop: r2(at("rumination")) };
    const tech = ["self", "other", "loop"].reduce((a, x) => (score[x] > score[a] + 1e-9 ? x : a), "self");
    const future = at("hope") < Q.HOPE_LOW ? "bps" : "future";
    const after = { shame: r2(at("shame") * (1 - Q.LP[tech])), rumination: r2(at("rumination") * (1 - Q.LP[tech])), hope: r2(at("hope") + (1 - at("hope")) * Q.LH[future]) };
    return { past, score, tech, future, after };
  }

  // ---------- OE §topology: time, resistance, the moving anchor ----------
  /** ρ = min(0.9, [1 − Π(1 − w·part)](1 − 0.5·will)). parts: {avoid, sup, rum, inertia, sustain, will}. */
  function resistance(p) {
    const w = P.topology.RHO_W;
    const raw = 1 - (1 - w.avoid * p.avoid) * (1 - w.sup * p.sup) * (1 - w.rum * p.rum) * (1 - w.inertia * p.inertia) * (1 - w.sustain * p.sustain);
    return { rho: Math.min(P.topology.RHO_MAX, raw * (1 - P.topology.WILL_W * p.will)), raw };
  }
  /** Typical τ (hours): the geometric mean of the range. */
  const tauTyp = n => Math.sqrt(P.topology.TAU[n][0] * P.topology.TAU[n][1]);
  /** τ_eff = τ(1 + e_rum)/(1 − ρ); which = "typ" | "lo" | "hi". */
  const tauEff = (n, eRum, rho, which = "typ") => (which === "typ" ? tauTyp(n) : P.topology.TAU[n][which === "lo" ? 0 : 1]) * (1 + eRum) / (1 - rho);
  /** k(dt) = max_i e^(−dt/τ_eff,i). */
  const kdt = (dt, names, eRum, rho) => Math.max(...names.map(n => Math.exp(-dt / tauEff(n, eRum, rho))));
  /** Continuous-time move over dt hours toward A: A + (e − A)e^(−dt/τ_eff). */
  const flow = (e, A, dt, names, eRum, rho) => e.map((x, i) => A[i] + (x - A[i]) * Math.exp(-dt / tauEff(names[i], eRum, rho)));
  /** Hours until every mover is within 0.1 of A: {lo, hi, typ, slow}. */
  function timeTo(e, A, names, eRum, rho) {
    const near = P.topology.NEAR;
    const one = w => names.map((n, i) => { const g = Math.abs(e[i] - A[i]); return g > near ? tauEff(n, eRum, rho, w) * Math.log(g / near) : 0; });
    const typ = one("typ"), slowI = typ.indexOf(Math.max(...typ));
    return { lo: Math.max(...one("lo")), hi: Math.max(...one("hi")), typ: Math.max(...typ), slow: typ[slowI] > 0 ? names[slowI] : null };
  }
  /** q = 1 − a_lo, a_lo = min(a0, a_max, a_cap): ‖T(e) − h‖ ≤ q‖e − h‖. */
  const qHome = V => 1 - Math.min(V.aBase, V.aMax, P.model.FIXED.aCap);
  /** β = 0.25 + 0.25ρ. */
  const beta = rho => P.topology.BETA0 + P.topology.BETA1 * rho;
  /** A' = clip(λA + (1 − λ)(βe + (1 − β)d)), rounded. */
  const nextAnchor = (A, e, d, rho) => { const L = P.topology.LAMBDA; return A.map((x, i) => r2(clamp01(L * x + (1 - L) * (beta(rho) * e[i] + (1 - beta(rho)) * d[i])))); };
  /** Inside one epoch: e ↦ clip(e + a(1 − ρ)(A − e)). */
  const anchorStep = (e, A, a, rho) => e.map((x, i) => clamp01(x + a * (1 - rho) * (A[i] - x)));
  /** q_A = λ + (1 − λ)β, radius βε_out/(1 − β), q_ρ = 1 − a_lo(1 − ρ). */
  const chainBound = (rho, aLo) => { const L = P.topology.LAMBDA; return { qA: L + (1 - L) * beta(rho), radius: beta(rho) * P.topology.EPS_OUT / (1 - beta(rho)), qRho: 1 - aLo * (1 - rho) }; };

  // ---------- OE §governor ----------
  /** U, Y, M_n from the cue strengths and the text measures. */
  function govSignals(c, rep, press, A, G, rate, burst) {
    const U_ = P.governor.U_W, Y_ = P.governor.Y_W, M_ = P.governor.MN_W;
    const U = 1 - (1 - U_.numb * c.numb) * (1 - U_.rep * rep) * (1 - U_.lowA * (1 - A));
    const Y = 1 - (1 - clip(Y_.gain * Math.max(0, rate * Y_.rate))) * (1 - Y_.irrit * c.irrit);
    const Mn = 1 - (1 - M_.race * c.race) * (1 - M_.press * press) * (1 - M_.G * G) * (1 - M_.sleep * c.sleep) * (1 - M_.burst * burst);
    return { U, Y, Mn };
  }
  /** ℓ(C) = L0(1 − κC). */
  const limit = C => P.governor.L0 * (1 - P.governor.KAPPA * clip(C));
  /** α = 1 − (1 − Y)(1 − M_n)(1 − ½U). */
  const activation = s => 1 - (1 - s.Y) * (1 - s.Mn) * (1 - P.governor.ALPHA_U * s.U);
  /** PI with leak and anti-windup: I = clip(0.8I₋ + E), frozen while u saturates; u = clip(1.2E + 0.4I). */
  function pi(E, I0) {
    const G = P.governor;
    let I = clip(G.LEAK * I0 + E, -G.I_MAX, G.I_MAX);
    const u0 = G.KP * E + G.KI * I;
    if (u0 >= 1 && E > 0) I = Math.min(I, I0);
    return { I, u: clip(G.KP * E + G.KI * I) };
  }

  MF.Equations = {
    r2, clamp01, clip, norm, distance,
    cue, cueRaw, sat, noisyOr, oplus,
    kaiShield, kaiImpulse, kaiApply,
    stepSize, sVec, stepNext, drift, lambda, ema,
    peace, peaceBand,
    forgiveness, freeLoad, freeJ, gripLoosen, loopPull, pastPull,
    resistance, tauTyp, tauEff, kdt, flow, timeTo, qHome, beta, nextAnchor, anchorStep, chainBound,
    govSignals, limit, activation, pi,
  };
})(typeof window !== "undefined" ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
if (typeof module !== "undefined") module.exports = global.MF.Equations;
