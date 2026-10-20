// core/topology.js — the layered topology, time, resistance and the moving anchor (push27).
// A model built from design assumptions and informed by research. It is not
// validated science, and it never moves your numbers: master() still takes
// every step. This file only reads the master function's output.
//
// 1. LAYERS. Every variable in the MindFrame equations sits on one of six layers
//    (VARS below; counted in tests). The state space is a stack over L1:
//        E = L1 × L2 × L3 × L4 × L5 × L6,   L1 = [0,1]^9 (the nine movers)
//    The upper layers are read from L1 (plus the words) by projection maps π_k:
//        π3(e) = (P, C, G)            peace, the strongest hidden conflict, true size
//        π4(e) = (fear, loop, vice, ρ) the grip pulls and the resistance
//        π5(e) = (past, hope)         past focus and hope
//        π2(e) = X(1 − S)             the Kai push (S is set by the words, not by e)
//        π6    = faith wording and the seed: words only, NOT a measured quantity
//    so a point of E over e is the section σ(e) = (e, π2(e), …, π6(e)). This is a
//    "fiber-bundle style" stack only in that loose sense: a product space with the
//    upper layers determined by the base point and the words.
// 2. THE STEP AS A MAP T. master's step (2) is T(e) = clip(e + a(e)(h − e) + b·s(e)).
//    Its contraction toward h (core/master.js) gives ‖T(e) − h‖ ≤ q‖e − h‖ with
//    q = 1 − a_lo, a_lo = min(a0, a_max, a_cap) (q = 0.88 with the defaults, ≤ 0.95
//    for any allowed variables). So h is the UNIQUE fixed point and every point of
//    the cube converges to it (basin = the whole cube). V(e) = ‖e − h‖ is a Lyapunov
//    function: V(T(e)) ≤ q·V(e). Honest limit: T is NOT a Banach contraction on the
//    cube in the strict sense (‖T(x) − T(y)‖ ≤ q‖x − y‖ for all x, y), because a(e)
//    switches to a_cap when λ > 0 (a jump). We use the toward-a-point form, which
//    is all uniqueness and convergence need. lipschitz() samples the ratio.
// 3. TIME. Each mover has a time constant τ_i (TAU, hours; sources listed there).
//    Continuous time: de_i/dt = −(e_i − A_i)/τeff_i + inputs, so over a gap dt
//        e_i(t + dt) = A_i + (e_i − A_i)·exp(−dt/τeff_i),   τeff_i = τ_i·(1 + e_rum)/(1 − ρ)
//    (rumination lengthens every τ; Verduyn & Lavrijsen 2015). Per gap dt the map
//    contracts with k(dt) = max_i exp(−dt/τeff_i) < 1 for every dt > 0 and ρ < 1.
//    The time to come near the anchor (each |e_i − A_i| ≤ 0.1) is
//        t = max_i τeff_i·ln(|e_i − A_i| / 0.1),
//    given as a wide range from TAU's low and high values: never a promise.
// 4. RESISTANCE ρ ∈ [0, 0.9]. Pushing a feeling away tends to keep it around:
//        ρ_raw = 1 − (1 − 0.4·e_avoid)(1 − 0.5·c_sup)(1 − 0.3·e_rum)(1 − 0.3·inertia)(1 − 0.3·c_sustain)
//        ρ     = min(0.9, ρ_raw·(1 − 0.5·c_will))
//    avoidance (experiential avoidance: Hayes et al. 2006; AAQ-II: Bond et al. 2011),
//    suppression / fighting words (rebound: Wegner et al. 1987), rumination (Verduyn &
//    Lavrijsen 2015), emotional inertia = lag-1 autocorrelation of the saved days
//    (Kuppens, Allen & Sheeber 2010), sustain talk (Miller & Rollnick 2013), and
//    willingness / acceptance words lowering it (ACT: Hayes et al. 2006). The weights
//    are modeling choices. Effect: τeff = τ/(1 − ρ) and the pull a_eff = a(1 − ρ),
//    so with ρ ≤ 0.9 the anchor step still contracts: q_ρ = 1 − a_lo(1 − ρ) ≤ 0.995 < 1.
//    ∂ρ/∂c_sup > 0 (pushing harder raises ρ), ∂ρ/∂c_will < 0 (willingness lowers it).
// 5. THE MOVING ANCHOR. The anchor is a moving focus point A_k, not one fixed point:
//        A_k = clip(λ·A_{k−1} + (1 − λ)·(β·e + (1 − β)·d)),  λ = 0.6,  β = 0.25 + 0.25ρ
//    d = the desired feelings (the freeing mix target, else home h); A_{−1} = h.
//    Within an epoch A_k is fixed, and the anchor step e ↦ clip(e + a_eff(A_k − e))
//    contracts toward it with q_ρ, so A_k is that epoch's unique fixed point.
//    A "collapse" (only a metaphor for a transition; nothing quantum) to A_{k+1}
//    happens when ‖e − A_k‖ ≤ ε_in = 0.15 has held for a dwell time ≥ τ_dwell; the
//    dwell is broken only when ‖e − A_k‖ > ε_out = 0.25 (hysteresis, so no flip-flop).
//    Chain bound: with d fixed and ‖e − A_k‖ ≤ ε_out at a collapse,
//        ‖A_{k+1} − d‖ ≤ q_A‖A_k − d‖ + (1 − λ)β·ε_out,  q_A = λ + (1 − λ)β ≤ 0.79,
//    so A_k → a ball around d of radius β·ε_out/(1 − β) ≤ 0.23, geometrically; and A_k
//    stays in the cube by the clip. A stone is added only when A moves by ≥ 0.02,
//    so a settled anchor stops adding stones. The path is kept on this device only.
// 6. FAITH (wording only): the anchor is described as rest in Christ, "This hope we
//    have as an anchor of the soul, a hope both sure and steadfast" (Hebrews 6:19, WEB).

if (typeof module !== "undefined") {
  require("./movers.js");
  require("./reality.js");
  require("./peace.js");
  require("./master.js");
}

if (typeof window === "undefined") { require("../data/strings.js"); require("./equations.js"); }
(function (MF) {
  "use strict";
  const Str = MF.Strings;   // every word lives in js/data/strings.js
  const P = MF.Params, EQ = MF.Equations;   // every number: data/params.js; every equation: core/equations.js
  const MV = MF.Movers;
  const { NAMES, r2, clamp01 } = MV;
  const at = (e, n) => e[NAMES.indexOf(n)];
  const dist = (x, y) => Math.sqrt(x.reduce((s, v, i) => s + (v - y[i]) ** 2, 0));

  // ---------- 1. Every variable, by layer ----------
  const V = (layer, sym, what, file) => ({ layer, sym, what, file });
  const VARS = [
    // L1 feelings and the step (core/movers.js, core/master.js)
    ...NAMES.map(n => V(1, `e_${n}`, `mover ${n}`, "core/movers.js")),
    V(1, "e₋", Str.t("topology.VARS.where_you_were"), "core/master.js"), V(1, "n(text)", Str.t("topology.VARS.what_the_words_add"), "core/movers.js"), V(1, "e'", Str.t("topology.VARS.the_stepped_vector"), "core/master.js"),
    V(1, "h", "home", "core/movers.js"), V(1, "d", "‖e − h‖", "core/master.js"), V(1, "a", Str.t("topology.VARS.step_size_a_e"), "core/master.js"), V(1, "a0", Str.t("topology.VARS.base_step"), "core/movers.js"),
    V(1, "k", Str.t("topology.VARS.distance_gain"), "core/movers.js"), V(1, "a_max", Str.t("topology.VARS.largest_step"), "core/movers.js"), V(1, "a_cap", Str.t("topology.VARS.step_when_feeding"), "core/movers.js"), V(1, "b", Str.t("topology.VARS.stabilizer_pull"), "core/movers.js"),
    V(1, "b_U", Str.t("topology.VARS.stabilizer_when_feeding"), "core/movers.js"), V(1, "s", Str.t("topology.VARS.grounding_pressure_s_e"), "core/master.js"), V(1, "W", Str.t("topology.VARS.who_amplifies_whom"), "core/movers.js"), V(1, "λ", Str.t("topology.VARS.growth_rate_w_a_d"), "core/master.js"),
    V(1, "B_t", "baseline", "core/master.js"),
    // L2 virtues and the Kai shield (core/kai.js)
    ...["X", "A", "F", "E", "R", "S", "w_anger", "w_shame", "w_fear", "I", "c_attack", "σ_v", "p_F", "V_MAX"].map(s => V(2, s, Str.t("topology.kai_shield"), "core/kai.js")),
    // L3 peace, conflict, true size (core/peace.js, core/reality.js)
    ...["P", "P_d", "d0", "C", "γ", "G", "g", "u", "δ", "ℓ", "ΔP_i", "P*"].map(s => V(3, s, "peace", "core/peace.js")),
    // L4 grip, rumination, time and resistance (features/grip.js, this file)
    ...["pull_fear", "pull_loop", "pull_vice", "days", "k_loop", "L_tool", "L_value", "L", "x'"].map(s => V(4, s, "grip", "features/grip.js")),
    ...["τ", "m_rum", "τeff", "dt", "k(dt)", "ρ", "c_sup", "inertia", "c_sustain", "c_will"].map(s => V(4, s, Str.t("topology.time_and_resistance"), "core/topology.js")),
    // L5 past to future, hope, forgiveness, the freeing mix, the moving anchor
    ...["past", "k_past", "tech", "L_p", "L_h", "future", "shame'", "rumination'", "hope'"].map(s => V(5, s, Str.t("topology.past_to_future"), "features/past.js")),
    ...["F_self", "F_other", "c_self", "c_other"].map(s => V(5, s, "forgiveness", "features/forgiveness.js")),
    ...["J", "μ", "N_mix"].map(s => V(5, s, Str.t("topology.freeing_mix"), "features/freeing.js")),
    ...["A_k", "λ_A", "β", "d_desired", "ε_in", "ε_out", "τ_dwell"].map(s => V(5, s, Str.t("topology.moving_anchor"), "core/topology.js")),
    // L6 faith and meaning (wording only) and the companion (never from e)
    ...["faith", "seed", "H_numbers", "H_text", "counter", "CORNERSTONE", "verse"].map(s => V(6, s, Str.t("topology.scripture_seed_wording_only"), "features/scripture.js")),
    ...["growth", "stage"].map(s => V(6, s, Str.t("topology.companion_growth_caring_actions_only"), "features/companion.js")),
  ];
  const LAYERS = { 1: "Feelings", 2: Str.t("topology.LAYERS.2"), 3: Str.t("topology.LAYERS.3"), 4: Str.t("topology.LAYERS.4"), 5: Str.t("topology.LAYERS.5"), 6: Str.t("topology.LAYERS.6") };
  const counts = () => Object.fromEntries(Object.keys(LAYERS).map(k => [k, VARS.filter(v => v.layer === Number(k)).length]));

  // ---------- 3. Time constants (hours; low, high) ----------
  const VL = Str.t("topology.VL.verduyn_lavrijsen_2015_motiv_emot");
  // Ranges (hours) from params.js (topology.TAU); the source words from strings.js.
  const TAU_SRC = {
    fear: Str.t("topology.TAU.fear.src", { VL: VL }),
    sadness: Str.t("topology.TAU.sadness.src", { VL: VL }),
    anger: Str.t("topology.TAU.anger.src", { VL: VL }),
    shame: Str.t("topology.TAU.shame.src", { VL: VL }),
    calm: Str.t("topology.TAU.calm.src"),
    connection: Str.t("topology.TAU.calm.src"),
    hope: Str.t("topology.TAU.calm.src"),
    rumination: Str.t("topology.TAU.rumination.src", { VL: VL }),
    avoidance: Str.t("topology.TAU.avoidance.src"),
  };
  const TAU = Object.fromEntries(Object.entries(P.topology.TAU).map(([n, [lo, hi]]) => [n, { lo, hi, src: TAU_SRC[n] }]));
  const tauTyp = EQ.tauTyp;
  const OMITTED = Str.t("topology.OMITTED.the_popular_90_second_rule");
  const PATIENCE = {
    fear: Str.t("topology.PATIENCE.fear"), shame: Str.t("topology.PATIENCE.shame"),
    anger: Str.t("topology.PATIENCE.anger"), sadness: Str.t("topology.PATIENCE.sadness"),
    rumination: Str.t("topology.PATIENCE.rumination"), avoidance: Str.t("topology.PATIENCE.avoidance"),
  };

  // ---------- 4. Resistance ----------
  const SUP = /\b(stop (thinking|feeling)|push (it|this|them|that) (away|down)|get rid of|make (it|this) (go away|stop)|fight(ing)? (it|this)|shouldn'?t feel|block (it|this) out|force myself|won'?t let myself feel)\b/g;
  const SUSTAIN = /\b(i can'?t change|nothing will (change|help)|it'?s pointless|no point|i don'?t want to change|always be like this|why bother)\b/g;
  const WILL = /\b(let it be|make room|allow (it|this|myself)|i'?m willing|willing to|accept(ing)? (it|this|that)|it'?s okay to feel|sit with (it|this))\b/g;
  const cue = EQ.cueRaw;
  const hits = (re, t) => ((t || "").toLowerCase().match(re) || []).length;
  /** Lag-1 autocorrelation of the saved days' mean hard mover (0 with fewer than 4 days), clipped to [0, 1]. */
  function inertia(days) {
    const xs = (days || []).filter(d => d && d.e).slice(-P.topology.INERTIA_DAYS).map(d => (d.e[0] + d.e[1] + d.e[2] + d.e[3]) / 4);
    if (xs.length < P.topology.INERTIA_MIN) return 0;
    const m = xs.reduce((s, x) => s + x, 0) / xs.length, v = xs.reduce((s, x) => s + (x - m) ** 2, 0);
    if (v < 1e-9) return 0;
    let c = 0; for (let i = 1; i < xs.length; i++) c += (xs[i] - m) * (xs[i - 1] - m);
    return clamp01(c / v);
  }
  /** ρ and its parts from the vector, the words and the saved days. */
  const resistance = MF.Movers.memoOn(resistanceOf);
  /** ρ for e (memoized per e by resistance). */
  function resistanceOf(e, text, days) {
    const p = { avoid: at(e, "avoidance"), sup: cue(hits(SUP, text)), rum: at(e, "rumination"), inertia: inertia(days), sustain: cue(hits(SUSTAIN, text)), will: cue(hits(WILL, text)) };
    const { rho, raw } = EQ.resistance(p);   // OE §topology: ρ
    return { rho, raw, parts: p };
  }

  // ---------- 3. Time to the anchor ----------
  const tauEff = (n, e, rho, which = "typ") => EQ.tauEff(n, at(e, "rumination"), rho, which);
  /** k(dt): the per-gap contraction factor toward the anchor (dt in hours). */
  const kdt = (dt, e, rho) => EQ.kdt(dt, NAMES, at(e, "rumination"), rho);
  /** Continuous-time move over dt hours toward A. */
  const flow = (e, A, dt, rho) => EQ.flow(e, A, dt, NAMES, at(e, "rumination"), rho);
  /** Hours until every mover is within 0.1 of A: {lo, hi, typ, slow} (slow = the mover that takes longest). */
  const timeTo = (e, A, rho) => EQ.timeTo(e, A, NAMES, at(e, "rumination"), rho);
  /** Hours in words: "minutes", "a few hours", "about a day", "a few days", "a week or more". */
  function span(h) { return h < 1 ? "minutes" : h < 8 ? Str.t("topology.span.a_few_hours") : h < 36 ? Str.t("topology.span.about_a_day") : h < 120 ? Str.t("topology.span.a_few_days") : Str.t("topology.span.a_week_or_more"); }

  // ---------- 2. The step as a map, its anchor and its contraction ----------
  /** The exact (unrounded) step (2) of master for e, as the code computes it. */
  function T(e, state) {
    const h = state.home, Vv = state.vars, W = MV.weights(state.w);
    // The same equations master uses (core/equations.js), without the rounding.
    const lam = MF.Master._parts.lambda(e, W, Vv.d), unstable = lam !== null && lam > 0;
    const { a, b } = EQ.stepSize(Vv, dist(e, h), unstable);
    return EQ.stepNext(e, h, a, b, MF.Master._parts.sVec(e, h, W), false);
  }
  /** q = 1 − a_lo, the toward-home contraction constant for these variables. */
  const q = EQ.qHome;
  /** Iterate master itself (rounded, as the app does) from e until it stops moving. */
  function anchorOf(e, state, max = 400) {
    let cur = e.slice(), t = 0;
    for (; t < max; t++) { const nx = MF.Master.masterState(cur, state, { sim: false }).next; if (nx.every((x, i) => x === cur[i])) break; cur = nx; }
    return { e: cur, steps: t };
  }
  /** Sampled sup of ‖T(x) − T(y)‖ / ‖x − y‖ (seeded) and of ‖T(x) − h‖ / ‖x − h‖. */
  function lipschitz(state, n = P.seeds.LIPSCHITZ_N, seed = P.seeds.LIPSCHITZ) {
    const rnd = MV.rng ? MV.rng(seed) : Math.random;
    const pt = () => NAMES.map(() => rnd());
    let L = 0, toward = 0;
    for (let i = 0; i < n; i++) {
      const x = pt(), y = i % 2 ? pt() : x.map(v => clamp01(v + (rnd() - 0.5) * 0.02));
      const dxy = dist(x, y); if (dxy > 1e-9) L = Math.max(L, dist(T(x, state), T(y, state)) / dxy);
      const dh = dist(x, state.home); if (dh > 1e-9) toward = Math.max(toward, dist(T(x, state), state.home) / dh);
    }
    return { L, toward };
  }

  // ---------- Projections (layer coordinates) ----------
  function sections(m, text, state) {
    const e = m.e, res = resistance(e, text, state && state.days);
    const g = MF.Grip ? MF.Grip.detect(m, text, state) : null, p = MF.Past ? MF.Past.detect(m, text) : null;
    const k = m.kai || { X: 0, S: 0 };
    return {
      1: e.slice(),
      2: [r2((k.X || 0) * (1 - (k.S || 0)))],
      3: [m.peace.P, m.peace.Cmax || 0, m.peace.g || 0],
      4: [g ? g.pull.fear : at(e, "fear"), g ? g.pull.loop : at(e, "rumination"), g ? g.pull.vice : 0, r2(res.rho)],
      5: [p ? p.past : Math.max(at(e, "shame"), at(e, "rumination")), at(e, "hope")],
    };
  }
  /** Per-layer distance (RMS per coordinate) between the reading's sections and the anchor's. */
  function layerPull(sNow, sA) {
    const out = {};
    [1, 2, 3, 4, 5].forEach(k => { const a = sNow[k], b = sA[k]; out[k] = r2(Math.sqrt(a.reduce((s, x, i) => s + (x - b[i]) ** 2, 0) / a.length)); });
    return out;
  }

  // ---------- 5. The moving anchor ----------
  const { LAMBDA, EPS_IN, EPS_OUT, PATH_MAX, MOVE_MIN } = P.topology;
  const beta = EQ.beta;
  /** One anchor update: A' = clip(λA + (1 − λ)(βe + (1 − β)d)). */
  const nextAnchor = EQ.nextAnchor;
  /** The dwell time in hours: the typical τ of the strongest hard mover (or fear), times (1 + ρ), in [0.25, 24]. */
  function dwell(e, rho) {
    const hard = ["fear", "sadness", "anger", "shame"];
    const top = hard.reduce((a, n) => (at(e, n) > at(e, a) ? n : a), "fear");
    return Math.min(P.topology.DWELL[1], Math.max(P.topology.DWELL[0], tauTyp(top) * (1 + rho)));
  }
  /** A fresh path: A_0 from home, the first reading and its desired feelings. */
  const startPath = (h, e, d, rho, t) => ({ v: 1, A: nextAnchor(h, e, d, rho), since: null, stones: [{ t, A: nextAnchor(h, e, d, rho) }] });
  /**
   * Advance the path with one observation {e, d, rho, t} (t in ms). Returns a new
   * path. Collapse to A_{k+1} after ‖e − A_k‖ ≤ ε_in held for τ_dwell hours; the
   * dwell breaks only past ε_out (hysteresis).
   */
  function advance(path, obs, h) {
    if (!path || !path.A) return startPath(h, obs.e, obs.d, obs.rho, obs.t);
    const p = { ...path, stones: path.stones.slice() }, dd = dist(obs.e, p.A);
    if (p.since == null) { if (dd <= EPS_IN) p.since = obs.t; }
    else if (dd > EPS_OUT) p.since = null;
    if (p.since != null && (obs.t - p.since) / 3.6e6 >= dwell(obs.e, obs.rho)) {
      const A2 = nextAnchor(p.A, obs.e, obs.d, obs.rho); p.since = null;
      // A new stepping stone only when the anchor really moves (≥ MOVE_MIN); otherwise it has settled.
      if (dist(A2, p.A) >= MOVE_MIN) { p.A = A2; p.stones.push({ t: obs.t, A: A2 }); if (p.stones.length > PATH_MAX) p.stones.shift(); }
      else p.settled = true;
    }
    return p;
  }
  /** The anchor step inside one epoch: e ↦ clip(e + a(1 − ρ)(A − e)). */
  const anchorStep = EQ.anchorStep;
  /** Bounds for the chain: q_A, the ball radius around d, and q_ρ. */
  const chainBound = EQ.chainBound;
  /** The anchor in words: what it holds most (two grounding feelings, and the hard ones it eases). */
  function anchorWords(A) {
    const WORD = { rumination: "replaying", avoidance: "avoiding" };
    const name = n => WORD[n] || n;
    const lvl = x => (x >= 0.6 ? Str.t("topology.lvl.a_lot_of") : x >= 0.3 ? "some" : "a little");
    const g = ["calm", "connection", "hope"].sort((a, b) => at(A, b) - at(A, a));
    const hard = ["fear", "sadness", "anger", "shame", "rumination", "avoidance"].filter(n => at(A, n) >= 0.15);
    return `${lvl(at(A, g[0]))} ${name(g[0])} and ${lvl(at(A, g[1]))} ${name(g[1])}${hard.length ? Str.t("topology.anchorWords.with_easing", { v0: hard.map(name).join(" and ") }) : ""}`;
  }

  const HEB619 = "This hope we have as an anchor of the soul, a hope both sure and steadfast and entering into that which is within the veil,";
  const FAITH = Str.t("topology.FAITH.with_faith_the_anchor_is", { v0: HEB619.replace(/,$/, "") });
  const LAYER_WORD = { 1: Str.t("topology.LAYER_WORD.1"), 2: Str.t("topology.LAYER_WORD.2"), 3: Str.t("topology.LAYER_WORD.3"), 4: Str.t("topology.LAYER_WORD.4"), 5: Str.t("topology.LAYER_WORD.5") };

  /** The Anchor view's words (no digits) and math lines, from a reading. */
  function view(m, text, state, path, opts = {}) {
    if (!m || m.crisis || !m.e) return null;
    const h = state.home, res = resistance(m.e, text, state.days);
    const d = m.freeing && m.freeing.target ? m.freeing.target : (state.mix || h);
    const A = path && path.A ? path.A : nextAnchor(h, m.e, d, res.rho);
    const mA = MF.Master.masterState(A, { ...state, session: {} }, { sim: false });
    const pull = layerPull(sections(m, text, state), sections(mA, "", { ...state, days: [] }));
    const top = Object.keys(pull).reduce((a, k) => (pull[k] > pull[a] ? k : a), "1");
    const far = dist(m.e, A), tt = timeTo(m.e, A, res.rho);
    const slowHard = ["sadness", "anger", "fear", "shame", "rumination", "avoidance"].find(n => at(m.e, n) >= 0.3 && Math.abs(at(m.e, n) - at(A, n)) > 0.1);
    const words = [
      Str.t("topology.view.words.you_are_your_anchor", { far_s: far < EPS_IN ? "near" : far < 0.4 ? Str.t("topology.view.words.some_way_from") : Str.t("topology.view.words.far_from"), v1: anchorWords(A) }),
      Str.t("topology.view.words.what_pulls_most_right_now", { v0: LAYER_WORD[top] }),
    ];
    if (slowHard && PATIENCE[slowHard]) words.push(PATIENCE[slowHard]);
    words.push(tt.hi > 0 ? Str.t("topology.view.a_rough_guess_to_feel", { v0: span(tt.lo), v1: span(tt.hi) }) : Str.t("topology.view.you_are_already_close_to"));
    if (res.rho >= 0.3) {
      const why = res.parts.sup >= 0.3 ? Str.t("topology.view.why.pushing_the_feeling_away") : res.parts.rum >= res.parts.avoid ? Str.t("topology.view.why.replaying_it") : Str.t("topology.view.why.avoiding_it");
      words.push(Str.t("topology.view.some_resistance_is_here_fighting", { why: why }));
    }
    const stones = path && path.stones ? path.stones : [{ A }];
    const pathWords = stones.map(s => anchorWords(s.A).replace(/^./, c => c.toUpperCase()));
    const flow = MF.About && state.about ? MF.About.flowWords(state.about) : null;
    if (flow) words.push(flow);
    if (opts.faith) words.push(FAITH);
    const cb = chainBound(res.rho, 1 - q(state.vars));
    const math = [
      `Anchor A_k (${stones.length - 1}): [${A.map(x => x.toFixed(2)).join(", ")}]`,
      Str.t("topology.view.math.e_a_k_in_out", { v0: far.toFixed(2), EPS_IN: EPS_IN, EPS_OUT: EPS_OUT, v3: dwell(m.e, res.rho).toFixed(2) }),
      Str.t("topology.view.math.layer_pull_rms", { v0: Object.keys(pull).map(k => `L${k} ${pull[k].toFixed(2)}`).join(", ") }),
      Str.t("topology.view.math.avoid_suppress_rumination_inertia_sustain", { v0: res.rho.toFixed(2), v1: res.parts.avoid.toFixed(2), v2: res.parts.sup.toFixed(2), v3: res.parts.rum.toFixed(2), v4: res.parts.inertia.toFixed(2), v5: res.parts.sustain.toFixed(2), v6: res.parts.will.toFixed(2) }),
      Str.t("topology.view.math.eff_1_e_rum_1", { v0: NAMES.map(n => `${n} ${tauEff(n, m.e, res.rho).toFixed(1)}h`).join(", ") }),
      Str.t("topology.view.math.time_to_within_0_1", { v0: tt.lo.toFixed(1), v1: tt.hi.toFixed(1), v2: tt.typ.toFixed(1) }),
      Str.t("topology.view.math.k_1_h_q_master", { v0: kdt(1, m.e, res.rho).toFixed(3), v1: q(state.vars).toFixed(2), v2: cb.qRho.toFixed(3), v3: cb.qA.toFixed(2), v4: cb.radius.toFixed(2) }),
    ];
    return { words, pathWords, math, A, rho: res.rho, pull, top: Number(top), time: tt, stones, far };
  }

  /** A small layered SVG: five layer bands, the anchor path as stepping stones, and you. */
  function svg(v, w = 320) {
    const hgt = 170, band = 28, x0 = 24, x1 = w - 16;
    const col = ["#5b8fd6", "#c0645a", "#4e9a6b", "#8a64b8", "#cf8a2c"];
    const lay = [1, 2, 3, 4, 5].map((k, i) => `<rect x="4" y="${8 + i * (band + 4)}" width="${w - 8}" height="${band}" rx="8" fill="${col[i]}" opacity="${v && v.top === k ? 0.28 : 0.12}"/><text x="10" y="${26 + i * (band + 4)}" font-size="9" fill="#444">L${k}</text>`).join("");
    const st = (v && v.stones) || [];
    const px = i => x0 + (st.length < 2 ? (x1 - x0) / 2 : (i * (x1 - x0)) / (st.length - 1));
    const py = A => 8 + 4 * (band + 4) + band / 2 - (1 - Math.min(1, dist(A, MV.homeVec()) / 1.5)) * 120;
    const pts = st.map((s, i) => `${px(i).toFixed(1)},${py(s.A).toFixed(1)}`).join(" ");
    const dots = st.map((s, i) => `<circle cx="${px(i).toFixed(1)}" cy="${py(s.A).toFixed(1)}" r="5" fill="#fff" stroke="#2c5d8a" stroke-width="2"><title>stone ${i + 1}</title></circle>`).join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${hgt}" width="100%" role="img" aria-label="Five layers with your anchor path">${lay}<polyline points="${pts}" fill="none" stroke="#2c5d8a" stroke-width="2" stroke-dasharray="4 3"/>${dots}</svg>`;
  }


  /** Evening review: the anchor path told as one short parable page (words only). */
  function review(stones, opts = {}) {
    const st = (stones || []).slice(-6);
    if (!st.length) return [];
    const out = [Str.t("topology.review.out.today_the_traveler_set_out", { v0: anchorWords(st[0].A) })];
    st.slice(1).forEach((s, i) => out.push(Str.t("topology.she_stepped_to_a_new", { v0: i ? "Then" : Str.t("topology.after_a_while"), v1: anchorWords(s.A) })));
    out.push(st.length > 1 ? Str.t("topology.review.each_stone_held_long_enough") : Str.t("topology.review.she_stayed_by_that_stone"));
    if (opts.faith) out.push(Str.t("topology.review.hebrews_6_19_web", { v0: HEB619.replace(/,$/, "") }));
    return out;
  }
  /** The review as one standalone SVG picture (made on this device; nothing is sent). */
  function reviewSvg(lines, stage = 0) {
    const esc = t => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const wrap = t => { const w = t.split(" "), rows = []; let r = ""; w.forEach(x => { if ((r + " " + x).trim().length > 52) { rows.push(r.trim()); r = x; } else r += " " + x; }); rows.push(r.trim()); return rows; };
    const rows = lines.flatMap(wrap), H = 170 + rows.length * 18 + 30;
    const pic = MF.Scenes ? MF.Scenes.svg("stones", { stage }).replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "") : "";
    return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="${H * 2}" viewBox="0 0 320 ${H}"><rect width="320" height="${H}" fill="#fbf8f2"/><g transform="translate(0 0)">${pic}</g>${rows.map((r, i) => `<text x="16" y="${172 + i * 18}" font-family="Georgia, serif" font-size="11" fill="#333">${esc(r)}</text>`).join("")}</svg>`;
  }

  const PATH_KEY = "mindframe-anchor-path";
  /** Browser: the Anchor view. The path is kept in localStorage on this device only, never sent. */
  function mount(app) {
    const $ = id => document.getElementById(id);
    const store = (() => { try { return window.localStorage; } catch (e) { return null; } })();
    let path = null; try { path = JSON.parse((store && store.getItem(PATH_KEY)) || "null"); } catch (e) { path = null; }
    let seen = null;
    $("pet-anchor").addEventListener("click", () => app.open("anchor"));
    $("an-math").addEventListener("click", () => { const box = $("an-math-box"), open = box.classList.toggle("hidden") === false; $("an-math").setAttribute("aria-expanded", String(open)); $("an-math").textContent = open ? Str.t("governor.hide_the_math") : Str.t("governor.show_the_math"); });
    $("an-save").addEventListener("click", () => {
      const lines = Array.from($("an-story").querySelectorAll("p")).map(p => p.textContent);
      const stage = app.companion && MF.Companion ? MF.Companion.stageOf(app.companion.get().points || 0).i : 0;
      const url = URL.createObjectURL(new Blob([reviewSvg(lines, stage)], { type: "image/svg+xml" }));
      const a = document.createElement("a"); a.href = url; a.download = "mindframe-story.svg"; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      app.note(Str.t("topology.saved_the_story_as_a"));
    });
    $("an-clear").addEventListener("click", () => { path = null; if (store) store.removeItem(PATH_KEY); seen = null; render(); });
    const fill = (id, list, tag = "p") => { const el = $(id); el.innerHTML = ""; list.forEach(t => { const p = document.createElement(tag); p.textContent = t; el.appendChild(p); }); };
    function render() {
      const m = app.inCrisis() ? null : app.m(), text = $("input").value;
      if (m && m !== seen && m.e) {
        seen = m;
        const res = resistance(m.e, text, app.state.days), h = app.state.home;
        const d = m.freeing && m.freeing.target ? m.freeing.target : (app.state.mix || h);
        path = advance(path, { e: m.e, d, rho: res.rho, t: Date.now() }, h);
        if (store) store.setItem(PATH_KEY, JSON.stringify(path));
      }
      const v = view(m, text, app.state, path, { faith: app.faith() });
      $("an-intro").textContent = v ? "" : Str.t("topology.render.tap_update_first_and_i");
      fill("an-words", v ? v.words : []);
      fill("an-path", v ? v.pathWords : [], "li");
      $("an-svg").innerHTML = v ? svg(v) : "";
      fill("an-math-lines", v ? v.math : []);
      const rv = v ? review(v.stones, { faith: app.faith() }) : [];
      fill("an-story", rv);
      $("an-review").classList.toggle("hidden", !rv.length);
      fill("an-tau", NAMES.map(n => `${n}: ${TAU[n].lo}–${TAU[n].hi} h. ${TAU[n].src}`).concat([OMITTED]), "li");
    }
    return render;
  }

  MF.Topology = { VARS, LAYERS, counts, TAU, tauTyp, OMITTED, PATIENCE, resistance, inertia, tauEff, kdt, flow, timeTo, span, T, q, anchorOf, lipschitz, sections, layerPull, LAMBDA, EPS_IN, EPS_OUT, MOVE_MIN, beta, nextAnchor, dwell, startPath, advance, anchorStep, chainBound, anchorWords, HEB619, FAITH, view, svg, review, reviewSvg, PATH_KEY, mount };
})(typeof window !== "undefined" ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
if (typeof module !== "undefined") module.exports = global.MF.Topology;
