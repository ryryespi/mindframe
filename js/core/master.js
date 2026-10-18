// core/master.js — THE MASTER FUNCTION. Every feature calls master(); nothing
// else steps the numbers.
//
//   e        = score(text)                       (words added to where you are)
//              or a picked vector                 (masterState / masterPick: the feelings picker)
//              — both then run the one shared path reading(e, …) below
//   step     = act(clip01(e + a(e)·(h − e) + b·s(e)))
//   a(e)     = min(a_max, a0 + k·‖e − h‖), capped at a_cap when λ > 0 (then b = b_U)
//   s_j      = e_j·Σ_grounding min(0, W_ij)·h_i for hard/process movers above home
//   d        = ‖e − h‖;   B_t = 0.8·B_{t−1} + 0.2·e_t;   recovery = steps until d < 0.3
//   λ        = ρ(W on the active hard/process movers) − d   (> 0: feeding each other)
//   hidden   = a left-alone projection with the small W dynamics
//   g        = 1 − e^(−raw grand/absolute wording)        (feeds rumination + fusion)
//   conflicts= √(x_i·y_j) for opposing pulls both active, plus "I want … but" clashes
//   positives= positive words from the gains toward home in this step
//   (the last three come from core/reality.js, computed in this same pass)
//   u        = 1 − e^(−0.7·k) false-humility cues (putting yourself down; reality.js)
//   P        = 1/(1 + (d/d0)²)·(1 − γ·C_max)·(1 − δ·max(g, u))  inner peace (core/peace.js):
//              the true-size factor counts too big (g) and too small (u) alike
//   lever    = argmax_i ΔP_i for a move of e_i toward h_i by 0.05
//   solve    = iterate the master map to its fixed point e*; n* = steps until P ≥ 0.8
//   passes   = feature passes in the same call (features/forgiveness.js adds
//              forgive {F_self, F_other, path, dP, grace}; features/freeing.js adds
//              freeing, the freeing mix); they never move e
//
// Convergence (proof sketch; exact map, before rounding). With hard/process
// homes at 0 (always true in the app), for every mover j:
//   grounding j:      next_j − h_j = (1 − a)(e_j − h_j)
//   hard/process j:   next_j = clip01(e_j(1 − a − b·κ_j)), κ_j = −Σ_g min(0, W_gj)·h_g ≥ 0,
//                     so 0 ≤ next_j ≤ (1 − a)·e_j
// hence ‖next − h‖ ≤ (1 − a)‖e − h‖, and a ≥ a_lo = min(a0, a_max, a_cap) ≥ 0.05
// (validateVars keeps a_max ≥ 0.05; a0 ≥ 0.05; a_cap = 0.12). So
// d_t ≤ (1 − a_lo)^t·d_0 → 0: the map is a contraction toward h for ANY b ≥ 0
// and any W, and e* = h is its unique fixed point, where P = 1.
// The app rounds each step to 0.01, so the computed iteration stops at a
// lattice point with |e*_j − h_j| ≤ 0.005/a per mover (tested; ≤ 0.03 with defaults).
//
// Also here: act()'s skills and the reframes, the baseline, and the recovery count.

if (typeof module !== "undefined") {
  require("./movers.js");
  require("./reality.js");
  require("./peace.js");
}

(function (MF) {
  "use strict";
  const R = MF.Reality, PEACE = MF.Peace;
  const { NAMES, GROUND, REST, FIXED, ACTIVE, MAX_SIM, N, idx, isGround, r2, clamp01, norm, distance, stamp, dayOf, weights, fromText, fromPick, combine } = MF.Movers;
  // ---------- Vectors, dynamics, λ ----------

  /** One left-alone dynamics step: e ← clamp01(e + dt·(Wᵀ(e − rest) − d·(e − rest))). */
  function step(e, W, dt, d) {
    return e.map((x, j) => {
      let inflow = 0;
      for (let i = 0; i < N; i++) inflow += W[i][j] * (e[i] - REST[i]);
      return clamp01(x + dt * (inflow - d * (x - REST[j])));
    });
  }

  // Largest growth rate among the active hard and process movers: ρ(W_A) − d.
  // That block has only non-negative weights, so ρ is a real eigenvalue (Perron).
  /** Growth rate λ = ρ(W on the active hard/process movers) − d, or null when nothing is active. */
  function lambda(e, W, d) {
    const A = NAMES.map((n, i) => i).filter(i => !isGround[i] && e[i] > ACTIVE);
    if (!A.length) return null;
    let v = A.map(() => 1), rho = 0;
    for (let it = 0; it < 200; it++) {
      const nv = A.map((j) => A.reduce((s, i, k) => s + Math.max(0, W[i][j]) * v[k], 0));
      const nn = norm(nv);
      if (nn < 1e-12) { rho = 0; break; }
      rho = nn / norm(v);
      v = nv.map(x => x / nn);
    }
    return r2(rho - d);
  }

  /** Two-way positive loops between active movers, strongest first. */
  function loops(e, W, d) {
    const out = [];
    NAMES.forEach((a, i) => NAMES.forEach((b, j) => {
      if (j <= i || isGround[i] || isGround[j] || e[i] <= ACTIVE || e[j] <= ACTIVE) return;
      if (W[i][j] > 0 && W[j][i] > 0) {
        const g = Math.sqrt(W[i][j] * W[j][i]);
        out.push({ a, b, gain: r2(g), u: r2(g * Math.sqrt(e[i] * e[j])), unstable: g - d > 0 });
      }
    }));
    return out.sort((x, y) => y.u - x.u);
  }

  /** Movers that are quiet now but would rise if left alone for FIXED.k steps. */
  function hidden(e, W, vars) {
    let cur = e.slice();
    for (let t = 0; t < FIXED.k; t++) cur = step(cur, W, FIXED.dt, vars.d);
    const out = [];
    NAMES.forEach((n, j) => {
      if (isGround[j] || e[j] > ACTIVE || cur[j] - e[j] < FIXED.rise - 1e-9) return;
      let via = null, best = 0;
      NAMES.forEach((m, i) => { if (i !== j && W[i][j] > 0 && W[i][j] * e[i] > best) { best = W[i][j] * e[i]; via = m; } });
      out.push({ name: n, from: e[j], to: r2(cur[j]), via });
    });
    return out.sort((a, b) => (b.to - b.from) - (a.to - a.from));
  }

  // ---------- Skills and reframes (used by act() and the story) ----------
  const SKILL = {
    fear: "Paced breathing: breathe out longer than in, five times, then name one thing you can see.",
    sadness: "One small action: do one thing you used to enjoy, for ten minutes.",
    anger: "Pause: step away for ten minutes, then name what matters to you here.",
    shame: "Self-compassion: say to yourself what you'd say to a friend, and tell one safe person.",
    rumination: "Worry window: give the replay ten minutes later today, then turn to one task now.",
    avoidance: "Approach: do two minutes of the thing you've been putting off.",
    calm: "Paced breathing: breathe out longer than in, five times.",
    connection: "Reach out: send one short message to someone kind.",
    hope: "One small plan: write down one thing for tomorrow.",
  };
  const REFRAME = {
    fear: "A fear is a guess about the future, not a fact.",
    sadness: "This heavy feeling is real, and it can change.",
    anger: "My anger is telling me something matters; I can choose what to do with it.",
    shame: "I am a person having a hard moment, not a bad person.",
    rumination: "Replaying it again won't change it; one next step might.",
    avoidance: "I don't have to feel ready to take one small step.",
    none: "This is a feeling, not a fact.",
  };
  // The weakest grounding mover (lowest vs. home), or the strongest hard/process mover.
  /** The strongest hard/process mover above home, else the grounding mover furthest below home. */
  function focus(state) {
    const e = state.e, h = state.home;
    const top = NAMES.map((n, j) => ({ n, gap: e[j] - h[j] })).filter(x => !GROUND.includes(x.n) && x.gap >= ACTIVE).sort((p, q) => q.gap - p.gap)[0];
    if (top) return { kind: "strongest", name: top.n };
    const low = GROUND.map(n => ({ n, gap: h[idx[n]] - e[idx[n]] })).sort((p, q) => q.gap - p.gap)[0];
    return { kind: "weakest", name: low.gap >= ACTIVE ? low.n : null };
  }

  // ---------- Baseline, s(e), act() ----------
  // B_t = (1 − β)·B_{t−1} + β·e_t with β = 0.2, i.e. B_t = 0.8·B_{t−1} + 0.2·e_t.
  /** Baseline update B_t = 0.8·B_{t−1} + 0.2·e_t (B_{t−1} null means start at e_t). */
  const ema = (B, e) => (B ? B.map((b, i) => (1 - FIXED.beta) * b + FIXED.beta * e[i]) : e.slice());
  /** Baseline after each recorded day. */
  function baselineSeries(days) {
    let B = null;
    return days.map(x => { B = ema(B, x.e); return { day: x.day, D: x.e, B: B.slice() }; });
  }
  /** The latest baseline over a list of days, or null. */
  function baselineOf(days) {
    const s = baselineSeries(days);
    return s.length ? s[s.length - 1].B : null;
  }

  // s(e): grounding movers press on hard/process movers that sit above home.
  // s_j = e_j · Σ_{grounding i} min(0, W_ij)·h_i  (≤ 0), and 0 for grounding movers.
  /** s(e): how grounding movers press on hard/process movers that sit above home. */
  function sVec(e, h, W) {
    return NAMES.map((n, j) => {
      if (isGround[j] || e[j] <= h[j]) return 0;
      return e[j] * NAMES.reduce((acc, m, i) => acc + (isGround[i] ? Math.min(0, W[i][j]) * h[i] : 0), 0);
    });
  }

  // act(): the stepped vector becomes one small grounded action.
  // The action belongs to the mover that moves most toward home in this step.
  /** act(): turn the stepped vector into one small action, for the mover that moves most toward home. */
  function act(e, next, h) {
    let mover = null, best = 0;
    NAMES.forEach((n, j) => {
      const gain = Math.abs(e[j] - h[j]) - Math.abs(next[j] - h[j]);
      if (gain > best + 1e-9) { best = gain; mover = n; }
    });
    return { mover, action: mover ? SKILL[mover] : "Keep going: notice one good thing and stay with it for a breath." };
  }

  // ======================================================================
  // THE MASTER FUNCTION. Every feature calls this; nothing else steps e.
  //
  //   e      = score(text)            (the text's words added to where you are)
  //   step   = act(clip01(e + a(e)·(h − e) + b·s(e)))
  //   a(e)   = min(a_max, a0 + k·‖e − h‖), capped at a_cap when λ > 0
  //   b      = b (b_U when λ > 0)
  //   d      = ‖e − h‖;  B_t = 0.8·B_{t−1} + 0.2·e_t;  recovery = steps until d < 0.3
  //
  // text may be "" (step from where you are). opts.sim = false skips the
  // recovery count (used inside the recovery count itself).
  // ======================================================================
  const calls = { master: 0 };
  /**
   * THE MASTER FUNCTION, text entry. Words are scored, added to where you are,
   * and the result goes through the one shared path (reading()).
   *   e    = score(text) added to state.e
   *   step = act(clip01(e + a(e)(h − e) + b·s(e)))
   *   a(e) = min(a_max, a0 + k‖e − h‖), capped at a_cap when λ > 0
   * @param {string} text  what was typed ("" steps from where you are)
   * @param {object} state the session
   * @param {{sim?:boolean, now?:number}} [opts] sim:false skips the recovery count
   * @returns {object} {crisis:true} or the full reading (e, next, a, b, s, d, λ, links, baseline, recovery,
   *   grand {g, kind…}, small {u, kinds…}, conflicts[], positives[], peace {P, Pd, Pc, Pg, lever, grad, solve {n, eStar, PStar}})
   */
  function master(text, state, opts = {}) {
    const words = fromText(typeof text === "string" ? text : "");
    if (words.crisis) { calls.master += 1; return { crisis: true }; }
    return reading(combine(state.e, words.w), words, state, opts);
  }
  /**
   * THE MASTER FUNCTION, state-vector entry: the same path with e given
   * directly (the feelings picker, or any vector). words carries the notes and
   * the feature data (for example the extra chips); omit it for none.
   * master(text, state) ≡ masterState(combine(state.e, fromText(text).w), state, opts, fromText(text)).
   * @param {number[]} e the 9-vector to read
   * @param {object} state the session
   * @param {object} [opts] as for master()
   * @param {{notes?:string[], read?:object, found?:any[], data?:object}} [words]
   */
  function masterState(e, state, opts = {}, words = {}) {
    return reading(e.map(x => r2(clamp01(Number(x) || 0))), words, state, opts);
  }
  /**
   * THE MASTER FUNCTION, picker entry: picked levels and extra chips → a vector
   * (MF.Movers.fromPick) → masterState(). There is no text, so there is no crisis path here;
   * the 988 line stays on screen as always.
   * @param {{levels?:object, extras?:string[]}} pick
   */
  function masterPick(pick, state, opts = {}) {
    const p = fromPick(pick);
    const out = masterState(p.e, state, opts, p);
    out.pick = { base: p.base, extras: p.extras };
    return out;
  }

  /** The one shared path: everything after the vector e is known. */
  function reading(e, words, state, opts) {
    calls.master += 1;
    const h = state.home, W = weights(state.w), V = state.vars;
    const lam = lambda(e, W, V.d);
    const unstable = lam !== null && lam > 0;
    const d = distance(e, h);
    let a = Math.min(V.aMax, V.aBase + V.k * d);
    if (unstable) a = Math.min(a, FIXED.aCap);
    const b = unstable ? FIXED.bU : V.b;
    const s = sVec(e, h, W);
    const next = e.map((x, j) => r2(clamp01(x + a * (h[j] - x) + b * s[j])));
    const { mover, action } = act(e, next, h);
    // The top hard/process mover above home, and the grounding mover that presses on it most.
    const top = NAMES.map((n, j) => ({ n, j, gap: e[j] - h[j] })).filter(x => !isGround[x.j] && x.gap > 0).sort((p, q) => q.gap - p.gap)[0] || null;
    let stabilizer = null;
    if (top) {
      let best = 0;
      GROUND.forEach(g => { const p = -Math.min(0, W[idx[g]][top.j]); if (p > best) { best = p; stabilizer = g; } });
    } else {
      const low = GROUND.map(n => ({ n, gap: h[idx[n]] - e[idx[n]] })).sort((p, q) => q.gap - p.gap)[0];
      if (low.gap >= ACTIVE) stabilizer = low.n;
    }
    // Baseline: today's e folded into the days before today.
    const today = dayOf(stamp(Number.isFinite(opts.now) ? opts.now : Date.now()));
    const Bprev = baselineOf(state.days.filter(x => x.day < today));
    const B = ema(Bprev, e).map(r2);
    // Same pass: grandiosity (already folded into e by the word hook), hidden conflicts, positive emotions.
    const data = words.data || {};
    const grand = data.grand || R.grandiosity("");
    // The true-size principle, both sides: too big (g) and too small (u, false humility).
    const small = data.small || R.smallness("");
    const tsize = Math.max(grand.g, small.u);
    const out = {
      crisis: false, notes: words.notes || [], read: words.read || null, found: words.found || [],
      grand, small, tsize, conflicts: R.conflicts(e, data.clashes || []), positives: R.positives(e, next, h),
      e, h: h.slice(), a, b, s, next, lambda: lam, unstable,
      d: r2(d), dNext: r2(distance(next, h)),
      top: top ? top.n : null, stabilizer, mover, action,
      loops: loops(e, W, V.d), hidden: hidden(e, W, V),
      B, baseline: { dPrev: Bprev ? r2(distance(Bprev, h)) : null, dB: r2(distance(B, h)), days: state.days.length },
    };
    // Inner peace, same pass: P for this reading, then (outside the inner
    // simulation) the lever, the gradient, and the solve for e* and n*.
    out.peace = PEACE.score(e, h, V, out.conflicts, tsize);
    if (opts.sim !== false) {
      out.recovery = recovery({ ...state, e });
      out.peace.lever = PEACE.lever(e, h, V, data.clashes || [], tsize);
      out.peace.grad = PEACE.gradient(e, h, V, data.clashes || [], tsize);
      out.peace.solve = solvePeace({ ...state, e }, out.peace.P);
    }
    // Feature passes (for example forgiveness), same call: they read this
    // reading and add their own field. They never change e, next or peace.P.
    PASSES.forEach(fn => fn(out, { state, data, h, V, clashes: data.clashes || [], sim: opts.sim !== false }));
    return out;
  }

  // ---------- Feature passes ----------
  const PASSES = [];
  /** Register a pass: fn(out, {state, data, h, V, clashes, sim}) adds a field to master's output in the same call. */
  function addPass(fn) { if (!PASSES.includes(fn)) PASSES.push(fn); }

  // ---------- Solve for inner peace ----------
  /**
   * Iterate the master map (text "") from the reading to its fixed point e*.
   * n* is the first step t with P(e_t) ≥ 0.8 (t = 0 is the reading itself,
   * with its text conflicts and g; later steps have no text, so only mover
   * conflicts count and g = 0). Stops when a step changes nothing (the
   * rounded fixed point) or after MAX_SIM steps.
   * @param {object} state the session with e = the reading's e
   * @param {number} P0 P of the reading
   * @returns {{n:number|null, steps:number, eStar:number[], PStar:number, dStar:number, converged:boolean}}
   */
  function solvePeace(state, P0) {
    const h = state.home, V = state.vars;
    let cur = state, n = P0 >= PEACE.P_STAR ? 0 : null, t = 0, converged = false;
    while (t < MAX_SIM) {
      const m = master("", cur, { sim: false });
      if (m.next.every((x, i) => x === cur.e[i])) { converged = true; break; }
      cur = { ...cur, e: m.next };
      t += 1;
      if (n === null && PEACE.score(cur.e, h, V, R.conflicts(cur.e, []), 0).P >= PEACE.P_STAR) n = t;
    }
    const sc = PEACE.score(cur.e, h, V, R.conflicts(cur.e, []), 0);
    return { n, steps: t, eStar: cur.e.slice(), PStar: sc.P, dStar: sc.d, converged };
  }

  // ---------- Recovery: repeat the master step until d < 0.3 ----------
  /** Repeat the master step until d < 0.3 (at most MAX_SIM steps). */
  function simulate(state) {
    let cur = state;
    for (let n = 0; n <= MAX_SIM; n++) {
      const D = distance(cur.e, cur.home);
      if (D < FIXED.eps) return { steps: n, reached: true, final: r2(D) };
      if (n === MAX_SIM) return { steps: n, reached: false, final: r2(D) };
      const m = master("", cur, { sim: false });
      if (m.next.every((x, i) => x === cur.e[i])) return { steps: n, reached: false, final: r2(D) };
      cur = { ...cur, e: m.next };
    }
  }
  /** Recovery estimate: master steps until d < 0.3, and days at your pace of accepted steps. */
  function recovery(state) {
    const sim = simulate(state);
    const per = {};
    state.cps.filter(c => /^step-\d+$/.test(c.label)).forEach(c => { per[dayOf(c.t)] = (per[dayOf(c.t)] || 0) + 1; });
    const counts = Object.values(per);
    const rate = counts.length ? r2(counts.reduce((acc, x) => acc + x, 0) / counts.length) : 1;
    return { ...sim, rate, days: sim.reached ? Math.ceil(sim.steps / rate) : null };
  }
  /** Recovery in short text (math view only). */
  const recText = r => (r.reached ? `~${r.steps} step${r.steps === 1 ? "" : "s"} (~${r.days} day${r.days === 1 ? "" : "s"})` : `not reached in ${MAX_SIM} steps`);


  // ---------- Step sizes kept on the state for the .mf code ----------
  /** Store the current step sizes (a, b) on the state for the .mf code. */
  function refreshIdeal(state) {
    const m = master("", state, { sim: false });
    return { ...state, ideal: { a: r2(m.a), b: r2(m.b) } };
  }

  MF.Master = {
    SKILL, REFRAME, master, masterState, masterPick, addPass, calls, recovery, solvePeace, recText, refreshIdeal, focus, baselineSeries, baselineOf,
    // Building blocks master uses (exported for tests only; features call master).
    _parts: { step, lambda, hidden, loops, sVec, act, ema, simulate },
  };
})(typeof window !== "undefined" ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
if (typeof module !== "undefined") module.exports = global.MF.Master;
