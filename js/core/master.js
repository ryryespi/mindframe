// core/master.js — THE MASTER FUNCTION. Every feature calls master(); nothing
// else steps the numbers.
//
// ===================== THE WHOLE MODEL ON ONE PAGE (push23) =====================
//   (1) e  = clip01( e₋ ⊕ n(text) + X·(1 − S)·w )                       the reading
//   (2) e' = clip01( e + a(e)·(h − e) + b·s(e) )                          the step
//   (3) P  = P_d(e)·(1 − γ·C)·(1 − δ·G);  lever = argmax_i ΔP_i;  step = practice(lever)
//   (4) words = compose(e, e', P, lever, passes)
// where
//   e₋        where you were (the session's e, or the picked vector from the chips)
//   n(text)   the words: lexicon + signals + word hooks (relationship patterns,
//             forgiveness, true size g/u, patience, tension …), each 1 − e^(−raw)
//   ⊕         the saturating add: hard/process 1 − (1 − e)(1 − n); grounding e + n⁺(1 − e) − n⁻e
//   X, S, w   the Kai shield (core/kai.js): outside hurt X, S = 1 − (1−A)(1−F)(1−E)(1−R),
//             w = {anger .8, shame .6, fear .4}; X = 0 for almost every text, so (1) is then e₋ ⊕ n
//   a, b, s   a(e) = min(a_max, a0 + k‖e − h‖) (a_cap and b_U when λ > 0); s ≤ 0 is grounding
//             pressing on hard/process movers above home (below); the 9 movers and h as before
//   P_d       1/(1 + (d/d0)²), d = ‖e − h‖;  C = the strongest hidden conflict;  G = max(g, u) true size
//   ΔP_i      the gain in P for e_i moved 0.05 toward h_i;  practice(): features/practices.js rules
//   passes    in the same call, never moving e: forgiveness F_self, F_other and the path; the freeing
//             mix (max J = P − μN); the Kai lines; the companion grows from caring actions only
//             (Update, a step tried, a journal save, a practice finished), never from e
//   Every value is rounded to 0.01 after (1) and after (2), as the code does.
//   The baseline B_t = 0.8·B_{t−1} + 0.2·e_t and recovery (repeat (2) until d < 0.3) read the same map.
// With faith on, h is described as rest and peace in Christ (Matthew 11:28–30; Philippians 4:7)
// and the virtues as fruits of the Spirit (Galatians 5:22–23); the wording changes, not the math.
// tests/onepage.test.js recomputes (1)–(3) from these lines and checks them against master().
// ===============================================================================
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
  require("./kai.js");
}

if (typeof window === "undefined") { require("../data/strings.js"); require("./equations.js"); }
(function (MF) {
  "use strict";
  const Str = MF.Strings;   // every word lives in js/data/strings.js
  const EQ = MF.Equations;   // every equation: core/equations.js (numbers: data/params.js)
  const R = MF.Reality, PEACE = MF.Peace, KAI = MF.Kai;
  const { NAMES, GROUND, REST, FIXED, ACTIVE, MAX_SIM, idx, isGround, r2, clamp01, distance, stamp, dayOf, weights, fromText, fromPick, combine } = MF.Movers;
  // ---------- Vectors, dynamics, λ ----------

  /** One left-alone dynamics step (core/equations.js drift). */
  const step = (e, W, dt, d) => EQ.drift(e, W, dt, d, REST);

  // Largest growth rate among the active hard and process movers: ρ(W_A) − d.
  // That block has only non-negative weights, so ρ is a real eigenvalue (Perron).
  /** Growth rate λ = ρ(W on the active hard/process movers) − d, or null when nothing is active. */
  const lambda = (e, W, d) => EQ.lambda(e, W, d, isGround);

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
    fear: Str.t("master.SKILL.fear"),
    sadness: Str.t("master.SKILL.sadness"),
    anger: Str.t("master.SKILL.anger"),
    shame: Str.t("master.SKILL.shame"),
    rumination: Str.t("master.SKILL.rumination"),
    avoidance: Str.t("master.SKILL.avoidance"),
    calm: Str.t("master.SKILL.calm"),
    connection: Str.t("master.SKILL.connection"),
    hope: Str.t("master.SKILL.hope"),
  };
  const REFRAME = {
    fear: Str.t("master.REFRAME.fear"),
    sadness: Str.t("master.REFRAME.sadness"),
    anger: Str.t("master.REFRAME.anger"),
    shame: Str.t("master.REFRAME.shame"),
    rumination: Str.t("master.REFRAME.rumination"),
    avoidance: Str.t("master.REFRAME.avoidance"),
    none: Str.t("master.REFRAME.none"),
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
  const ema = EQ.ema;
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
  const sVec = (e, h, W) => EQ.sVec(e, h, W, isGround);

  // act(): the stepped vector becomes one small grounded action.
  // The action belongs to the mover that moves most toward home in this step.
  /** act(): turn the stepped vector into one small action, for the mover that moves most toward home. */
  function act(e, next, h) {
    let mover = null, best = 0;
    NAMES.forEach((n, j) => {
      const gain = Math.abs(e[j] - h[j]) - Math.abs(next[j] - h[j]);
      if (gain > best + 1e-9) { best = gain; mover = n; }
    });
    return { mover, action: mover ? SKILL[mover] : Str.t("master.act.action.keep_going_notice_one_good") };
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
  function reading(e0, words, state, opts) {
    calls.master += 1;
    const h = state.home, W = weights(state.w), V = state.vars;
    const data = words.data || {};
    // The true-size principle, both sides: too big (g) and too small (u, false humility).
    const grand = data.grand || R.grandiosity("");
    const small = data.small || R.smallness("");
    const tsize = Math.max(grand.g, small.u);
    // The Kai term (line 1 of the one-page form): outside hurt X, less the shield S,
    // pushes anger, shame and fear: e ← clip01(e + X(1 − S)·w). X = 0 leaves e as it is.
    const kai = KAI.shield(e0, data, state.session || {}, tsize);
    const e = KAI.apply(e0, kai);
    const lam = lambda(e, W, V.d);
    const unstable = lam !== null && lam > 0;
    const d = distance(e, h);
    const { a, b } = EQ.stepSize(V, d, unstable);                   // OE eq.(2)
    const s = sVec(e, h, W);
    const next = EQ.stepNext(e, h, a, b, s);
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
    const out = {
      crisis: false, notes: words.notes || [], read: words.read || null, found: words.found || [],
      grand, small, tsize, conflicts: R.conflicts(e, data.clashes || []), positives: R.positives(e, next, h),
      e, h: h.slice(), a, b, s, next, lambda: lam, unstable,
      d: r2(d), dNext: r2(distance(next, h)),
      top: top ? top.n : null, stabilizer, mover, action,
      loops: loops(e, W, V.d), hidden: hidden(e, W, V),
      B, baseline: { dPrev: Bprev ? r2(distance(Bprev, h)) : null, dB: r2(distance(B, h)), days: state.days.length },
      kai: kai.X > 0 || data.kai || data.kaiPickF ? kai : null,
    };
    // Inner peace, same pass: P for this reading, then (outside the inner
    // simulation) the lever, the gradient, and the solve for e* and n*.
    out.peace = PEACE.score(e, h, V, out.conflicts, tsize);
    if (opts.sim !== false) {
      // The recovery count and the peace solve walk the same orbit of the master map from e;
      // it is computed once and shared (push28; identical numbers, about half the master calls).
      const orbit = orbitOf();
      out.recovery = recovery({ ...state, e }, orbit);
      out.peace.lever = PEACE.lever(e, h, V, data.clashes || [], tsize);
      out.peace.grad = PEACE.gradient(e, h, V, data.clashes || [], tsize);
      out.peace.solve = solvePeace({ ...state, e }, out.peace.P, orbit);
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
  function solvePeace(state, P0, orbit = orbitOf()) {
    const h = state.home, V = state.vars;
    let cur = state, n = P0 >= PEACE.P_STAR ? 0 : null, t = 0, converged = false;
    while (t < MAX_SIM) {
      const nx = orbit(cur);
      if (nx.every((x, i) => x === cur.e[i])) { converged = true; break; }
      cur = { ...cur, e: nx };
      t += 1;
      if (n === null && PEACE.score(cur.e, h, V, R.conflicts(cur.e, []), 0).P >= PEACE.P_STAR) n = t;
    }
    const sc = PEACE.score(cur.e, h, V, R.conflicts(cur.e, []), 0);
    return { n, steps: t, eStar: cur.e.slice(), PStar: sc.P, dStar: sc.d, converged };
  }

  // ---------- One orbit of the master map, shared by the recovery count and the peace solve ----------
  /** next(cur) = master("", cur).next, remembered by e for one reading (the rest of cur is the same state). */
  function orbitOf() {
    const seen = new Map();
    return cur => { const k = cur.e.join(","); let nx = seen.get(k); if (!nx) { nx = master("", cur, { sim: false }).next; seen.set(k, nx); } return nx; };
  }

  // ---------- Recovery: repeat the master step until d < 0.3 ----------
  /** Repeat the master step until d < 0.3 (at most MAX_SIM steps). */
  function simulate(state, orbit = orbitOf()) {
    let cur = state;
    for (let n = 0; n <= MAX_SIM; n++) {
      const D = distance(cur.e, cur.home);
      if (D < FIXED.eps) return { steps: n, reached: true, final: r2(D) };
      if (n === MAX_SIM) return { steps: n, reached: false, final: r2(D) };
      const nx = orbit(cur);
      if (nx.every((x, i) => x === cur.e[i])) return { steps: n, reached: false, final: r2(D) };
      cur = { ...cur, e: nx };
    }
  }
  /** Recovery estimate: master steps until d < 0.3, and days at your pace of accepted steps. */
  function recovery(state, orbit) {
    const sim = simulate(state, orbit);
    const per = {};
    state.cps.filter(c => /^step-\d+$/.test(c.label)).forEach(c => { per[dayOf(c.t)] = (per[dayOf(c.t)] || 0) + 1; });
    const counts = Object.values(per);
    const rate = counts.length ? r2(counts.reduce((acc, x) => acc + x, 0) / counts.length) : 1;
    return { ...sim, rate, days: sim.reached ? Math.ceil(sim.steps / rate) : null };
  }
  /** Recovery in short text (math view only). */
  const recText = r => (r.reached ? Str.t("master.recText.step_day", { steps: r.steps, v1: r.steps === 1 ? "" : "s", days: r.days, v3: r.days === 1 ? "" : "s" }) : Str.t("master.recText.not_reached_in_steps", { MAX_SIM: MAX_SIM }));


  // ---------- Step sizes kept on the state for the .mf code ----------
  /** Store the current step sizes (a, b) on the state for the .mf code. */
  function refreshIdeal(state) {
    const m = master("", state, { sim: false });
    return { ...state, ideal: { a: r2(m.a), b: r2(m.b) } };
  }

  /** The one-page form, as shown in Ada's panel. */
  const ONE_PAGE = Str.list("master.ONE_PAGE");
  /** How h is described with faith on (wording only). */
  const FAITH_HOME = Str.t("master.FAITH_HOME.rest_and_peace_in_christ");
  MF.Master = {
    ONE_PAGE, FAITH_HOME, SKILL, REFRAME, master, masterState, masterPick, addPass, calls, recovery, solvePeace, recText, refreshIdeal, focus, baselineSeries, baselineOf,
    // Building blocks master uses (exported for tests only; features call master).
    _parts: { step, lambda, hidden, loops, sVec, act, ema, simulate },
  };
})(typeof window !== "undefined" ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
if (typeof module !== "undefined") module.exports = global.MF.Master;
