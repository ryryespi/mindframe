// js/data/params.js — every equation variable and constant in MindFrame, in one place (push28).
//
// Each group follows a paper section; each entry has a REF row below: [where in the papers, source].
//   "OE" = paper/MindFrame-One-Equation.pdf (eq. (1)–(4), §Kai, §topology, …),
//   "GP" = paper/MindFrame-Grace-Peace-Paper.pdf.
// "design choice" means no study sets the number; it is a modeling assumption, labeled honestly.
// js/core/equations.js holds the pure functions that use these; features read them from there.
// Change a number here and every feature, the Show-the-math view and the tests see the same value.
(function (MF) {
  "use strict";
  // Order (push28, see /workspace/mf-layer-groups.md): groups follow the topology layers L1 → L6,
  // then the cross-layer governor, then non-equation limits. Inside a group, entries go by role:
  // state/target → input reading → gain/weight → threshold → cap/iteration/memory.
  const P = {
    // ######## L1 feelings and the step ########
    // ===== Reading the words: OE eq. (1), n(text) =====
    words: {
      CUE_RATE: 0.7,          // c = 1 − e^(−0.7k): k matching phrases → a strength in [0, 1)
      INTENSIFIERS: { very: 1.5, so: 1.4, really: 1.4, extremely: 1.7, totally: 1.5, completely: 1.5, always: 1.3, super: 1.4, deeply: 1.5, too: 1.2 },
      SOFTENERS: { little: 0.6, bit: 0.6, slightly: 0.5, somewhat: 0.7, kinda: 0.7 },
      LEVELS: { off: 0, "a little": 0.15, quite: 0.45, strongly: 0.8 },   // the feelings picker's band midpoints
      ABSOLUTIST_W: 0.1, ABSOLUTIST_MAX: 3,                              // g: + 0.1 per absolute word, at most 3
    },
    // ===== The step toward home: OE eq. (1)–(2) =====
    model: {
      HOME: { calm: 0.8, connection: 0.8, hope: 0.8 },   // h: grounding targets; hard/process movers 0
      REST_GROUND: 0.5,                                   // left-alone rest of a grounding mover (hidden() drift)
      // Adjustable variables [key, default, min, max] (the Show the math sliders); notes in strings.js
      VAR_SPEC: [["aBase", 0.2, 0.05, 0.5], ["k", 0.05, 0, 0.2], ["aMax", 0.25, 0.05, 0.5], ["b", 0.1, 0, 0.5], ["d", 0.3, 0.05, 1], ["d0", 0.6, 0.2, 2], ["gamma", 0.3, 0, 0.6], ["delta", 0.3, 0, 0.6]],
      FIXED: { aMin: 0.05, aCap: 0.12, bU: 0.15, dt: 0.15, rise: 0.15, eps: 0.3, k: 8, beta: 0.2 },
      ACTIVE: 0.1,            // a hard/process mover counts as active above this
      MAX_SIM: 200,           // iteration cap for recovery and the peace solve
      POWER_ITERS: 200,       // power-iteration cap for λ = ρ(W_A) − d
      // W: who amplifies (+) or dampens (−) whom
      EDGES: [
        ["sadness", "rumination", 0.4], ["rumination", "sadness", 0.4],
        ["fear", "avoidance", 0.4], ["avoidance", "fear", 0.3],
        ["shame", "avoidance", 0.4], ["avoidance", "sadness", 0.3],
        ["shame", "sadness", 0.3], ["rumination", "shame", 0.2],
        ["anger", "rumination", 0.3], ["rumination", "anger", 0.2],
        ["rumination", "fear", 0.2], ["fear", "anger", 0.2],
        ["calm", "fear", -0.5], ["calm", "anger", -0.4], ["calm", "rumination", -0.3],
        ["connection", "shame", -0.5], ["connection", "sadness", -0.4],
        ["hope", "sadness", -0.5], ["hope", "avoidance", -0.3],
        ["fear", "calm", -0.3], ["sadness", "hope", -0.3], ["shame", "connection", -0.3], ["avoidance", "connection", -0.2],
      ],
    },
    // ===== The Grounding Loop: not in the papers (app design, see README) =====
    grounding: { ETA: 0.2, START_G: 0.5, LOW_G: 0.3, LOW_DAYS: 3 },
    // ######## L2 virtues and the Kai shield ########
    // ===== The Kai shield: OE §Kai =====
    kai: {
      W: { anger: 0.8, shame: 0.6, fear: 0.4 },              // gain: X(1 − S)w per hard mover
      PICK_X: 0.75, PICK_F: 0.5, SESSION: 0.5,               // input: X and p_F from a chip, ½σ this session
      FLICKER: 0.15, STRONG_I: 0.35, LEVEL: [0.3, 0.6],      // thresholds: impulse words; virtue words growing ≥ .3, strong ≥ .6
      V_MAX: 0.95, S_MAX: 0.99,                              // caps
    },
    // ######## L3 peace, conflict, true size ########
    // ===== Inner peace: OE eq. (3) =====
    peace: { P_STAR: 0.8, EPS: 0.05, H: 0.01, BANDS: [0.4, 0.6] },        // steady ≥ P*, close ≥ .6, growing ≥ .4
    // ===== True size and hidden conflicts: OE eq. (3), C and G =====
    reality: { G_SHOW: 0.25, U_SHOW: 0.25, T_HARD: 0.3, T_HIGH: 0.6, T_NEED: 0.4 },
    // ===== Practices (the One step rule table): OE eq. (3) practice(ℓ) =====
    practices: { STRONG: 0.6, VERY: 0.75 },
    // ######## L4 grip, time and resistance (topology also holds the L5 moving anchor) ########
    // ===== Loosen the grip x(1 − L): OE attribution τ14 =====
    grip: { SHOW: 0.3, L: { defuse: 0.25, surf: 0.3, window: 0.2, value: 0.15 }, DAY_W: 0.1, LOOP_W: 0.2, LOOP_DAY: 0.5, DAYS: 7 },
    // ===== Time, resistance and the moving anchor: OE §topology =====
    topology: {
      // L4 time: τ table (hours [lo, hi]) and "near"
      TAU: { fear: [0.25, 3], sadness: [24, 120], anger: [0.5, 48], shame: [0.25, 2], calm: [1, 24], connection: [1, 24], hope: [1, 24], rumination: [2, 48], avoidance: [2, 48] },
      NEAR: 0.1,              // "near the anchor": every mover within 0.1
      // L4 resistance ρ: weights → cap; inertia memory
      RHO_W: { avoid: 0.4, sup: 0.5, rum: 0.3, inertia: 0.3, sustain: 0.3 }, WILL_W: 0.5, RHO_MAX: 0.9,
      INERTIA_DAYS: 14, INERTIA_MIN: 4,
      // L5 moving anchor: gains → thresholds → clamps/memory
      LAMBDA: 0.6, BETA0: 0.25, BETA1: 0.25,    // β = 0.25 + 0.25ρ
      EPS_IN: 0.15, EPS_OUT: 0.25, MOVE_MIN: 0.02,
      DWELL: [0.25, 24],                         // τ_dwell clamp, hours
      PATH_MAX: 30,
    },
    // ######## L5 past to future, forgiveness, the freeing mix ########
    // ===== Past to future Π: OE attribution τ15 =====
    past: { SHOW: 0.3, LP: { self: 0.2, other: 0.15, loop: 0.2 }, LH: { bps: 0.2, future: 0.15 }, CUE_W: 0.3, SELF_BONUS: 0.2, HOPE_LOW: 0.4, SHAME_SHOW: 0.4 },
    // ===== Forgiveness: OE eq. (4) passes, F_self / F_other =====
    forgive: {
      THETA: 0.35, F0: 0.4, F1: 0.6,       // F = e·(0.4 + 0.6c); a path shows at F ≥ θ
      RELEASE: { self: { shame: 0.10, rumination: 0.05 }, other: { anger: 0.10, rumination: 0.05, connection: 0.05 } },
    },
    // ===== The freeing mix: OE eq. (4) passes, max J = P − μN =====
    freeing: { MU: 0.5, K: 3, T: 3, MIN_GAIN: 0.001 },
    // ######## Cross-layer: the Expression governor (reads L1, L3, L4; changes wording only) ########
    // ===== The Expression governor: OE §topology, governor paragraph =====
    governor: {
      U_W: { numb: 0.6, rep: 0.4, lowA: 0.2 },                    // input weights: U, Y, M_n
      Y_W: { rate: 0.25, gain: 2, irrit: 0.5 },
      MN_W: { race: 0.6, press: 0.4, G: 0.3, sleep: 0.5, burst: 0.3 },
      ALPHA_U: 0.5,
      REP_MIN_WORDS: 12, PRESS_MIN_WORDS: 80, PRESS_RATE: 20, PRESS_SCALE: 40, BANG_SCALE: 10, BURST_FREE: 3, MIN_GAP_H: 0.25, // signal scales
      KP: 1.2, KI: 0.4, LEAK: 0.8, L0: 0.45, KAPPA: 0.5,         // gains: PI, leak, limit ℓ(C)
      GRADES: [0.15, 0.4, 0.7, 1.01],            // thresholds: write < .15 ≤ pause < .4 ≤ ground < .7 ≤ away
      I_MAX: 1, DAYS_DOCTOR: 3, HIST_MAX: 60,    // cap and memory
    },
    // ######## L6 faith and meaning (wording only) ########
    // ===== Seeds (deterministic wording; L6, wording only): OE §faith, §topology L6 =====
    seeds: { CARD: 1, LIPSCHITZ: 7, LIPSCHITZ_N: 4000 },
    // ===== Storage limits (not equations; kept here so every number is in one file) =====
    limits: { MAX_CHECKPOINTS: 50, MAX_DAYS: 60, MAX_LINES: 400, MAX_W: 30, NAME_MAX: 20, MAX_TAG: 24, MAX_TAGS: 8, MIN_LINKS: 25 },
  };

  // [where in the papers, source]. tests/params.test.js checks every entry above has a row here,
  // every row names a real paper section, and every parameter is used by code.
  const OE = "OE", GP = "GP";
  const REF = {
    "words.CUE_RATE": [OE + " eq.(1) n(text), §Kai c = 1 − e^(−0.7k)", "design choice"],
    "words.INTENSIFIERS": [OE + " eq.(1) n(text)", "design choice"],
    "words.SOFTENERS": [OE + " eq.(1) n(text)", "design choice"],
    "words.LEVELS": [OE + " eq.(1) e₋ from the picker", "design choice"],
    "words.ABSOLUTIST_W": [OE + " eq.(3) G (absolutist words)", "Al-Mosaiwi & Johnstone 2018"],
    "words.ABSOLUTIST_MAX": [OE + " eq.(3) G (absolutist words)", "design choice"],
    "model.HOME": [OE + " eq.(2) h", "design choice (calm, connection, hope high; Holt-Lunstad 2010, Snyder 2002 for the grounding movers)"],
    "model.REST_GROUND": [OE + " eq.(3) hidden conflicts (left-alone drift)", "design choice"],
    "model.VAR_SPEC": [OE + " eq.(2) a(e)=min(a_max, a0+k‖e−h‖), b; eq.(3) d0, γ, δ", "design choice"],
    "model.FIXED": [OE + " eq.(2) a_cap, b_U; §topology a_lo; recovery ε; baseline β", "design choice"],
    "model.ACTIVE": [OE + " eq.(2) λ on active movers", "design choice"],
    "model.MAX_SIM": [OE + " eq.(3) solve for e*, recovery", "design choice"],
    "model.POWER_ITERS": [OE + " eq.(2) λ = ρ(W_A) − d (power iteration)", "Perron–Frobenius (numerical method)"],
    "model.EDGES": [OE + " eq.(2) s(e), W", "design choice informed by Nolen-Hoeksema 2008, Barlow 2004, Aldao 2010"],
    "grounding.ETA": ["not in the papers (app Grounding Loop, js/core/grounding.js)", "design choice"],
    "grounding.START_G": ["not in the papers (app Grounding Loop, js/core/grounding.js)", "design choice"],
    "grounding.LOW_G": ["not in the papers (app Grounding Loop, js/core/grounding.js)", "design choice"],
    "grounding.LOW_DAYS": ["not in the papers (app Grounding Loop, js/core/grounding.js)", "design choice"],
    "kai.W": [OE + " §Kai w = (0.8, 0.6, 0.4)", "design choice"],
    "kai.PICK_X": [OE + " §Kai X from a chip", "design choice"],
    "kai.PICK_F": [OE + " §Kai p_F = ½ from a chip", "design choice"],
    "kai.SESSION": [OE + " §Kai σ = practice this session (½σ)", "design choice"],
    "kai.FLICKER": [OE + " §Kai I (flickers below 0.15)", "design choice"],
    "kai.STRONG_I": [OE + " §Kai I (strong above 0.35)", "design choice"],
    "kai.LEVEL": [OE + " §Kai words", "design choice"],
    "kai.V_MAX": [OE + " §Kai each virtue ≤ 0.95", "design choice"],
    "kai.S_MAX": [OE + " §Kai S = min(0.99, …)", "design choice"],
    "peace.P_STAR": [OE + " eq.(3) n* = first P ≥ 0.8", "design choice"],
    "peace.EPS": [OE + " eq.(3) ΔP_i for a 0.05 move", "design choice"],
    "peace.H": [OE + " eq.(3) ∂P/∂e_i central difference", "numerical method"],
    "peace.BANDS": [OE + " eq.(4) words (peace band)", "design choice"],
    "reality.G_SHOW": [OE + " eq.(3) G (show threshold)", "design choice"],
    "reality.U_SHOW": [OE + " eq.(3) G (show threshold)", "design choice"],
    "reality.T_HARD": [OE + " eq.(3) C hidden conflicts", "Lee 2013; Miller & Rollnick 2013"],
    "reality.T_HIGH": [OE + " eq.(3) C hidden conflicts", "design choice"],
    "reality.T_NEED": [OE + " eq.(3) C hidden conflicts", "design choice"],
    "practices.STRONG": [OE + " eq.(3) practice(ℓ) rule table", "design choice"],
    "practices.VERY": [OE + " eq.(3) practice(ℓ) rule table", "design choice"],
    "grip.SHOW": [OE + " attribution τ14 x(1 − L)", "design choice"],
    "grip.L": [OE + " attribution τ14 x(1 − L)", "Masuda 2004 (defusion); Bowen & Marlatt 2009 (urge surfing); Borkovec 1983 (worry window)"],
    "grip.DAY_W": [OE + " attribution τ14 loop pull", "design choice"],
    "grip.LOOP_W": [OE + " attribution τ14 loop pull", "design choice"],
    "grip.LOOP_DAY": [OE + " attribution τ14 loop pull (a replay day)", "design choice"],
    "grip.DAYS": [OE + " attribution τ14 loop pull (days looked at)", "design choice"],
    "topology.TAU": [OE + " §topology Table tau", "Verduyn & Lavrijsen 2015; Verduyn et al. 2009 (grounding/process ranges: design choice)"],
    "topology.NEAR": [OE + " §topology time to within 0.1", "design choice"],
    "topology.RHO_W": [OE + " §topology resistance ρ", "Hayes 2006; Bond 2011; Wegner 1987; Kuppens 2010; Miller & Rollnick 2013 (weights: design choice)"],
    "topology.WILL_W": [OE + " §topology resistance ρ (willingness)", "Hayes 2006 (weight: design choice)"],
    "topology.RHO_MAX": [OE + " §topology ρ ≤ 0.9", "design choice"],
    "topology.INERTIA_DAYS": [OE + " §topology inertia ι (lag-1 autocorrelation)", "Kuppens 2010"],
    "topology.INERTIA_MIN": [OE + " §topology inertia ι", "design choice"],
    "topology.LAMBDA": [OE + " §topology moving anchor λ", "design choice"],
    "topology.BETA0": [OE + " §topology β = 0.25 + 0.25ρ", "design choice"],
    "topology.BETA1": [OE + " §topology β = 0.25 + 0.25ρ", "design choice"],
    "topology.EPS_IN": [OE + " §topology ε_in", "design choice"],
    "topology.EPS_OUT": [OE + " §topology ε_out (hysteresis)", "design choice"],
    "topology.MOVE_MIN": [OE + " §topology a stone needs a 0.02 move", "design choice"],
    "topology.DWELL": [OE + " §topology τ_dwell clamp", "design choice"],
    "topology.PATH_MAX": [OE + " §topology anchor path (stones kept)", "design choice"],
    "past.SHOW": [OE + " attribution τ15 Π", "design choice"],
    "past.LP": [OE + " attribution τ15 Π (past loosens)", "Neff 2003; Cornish & Wade 2015; Hofmann 2011"],
    "past.LH": [OE + " attribution τ15 Π (hope grows)", "King 2001; Peters 2010; Hershfield 2011"],
    "past.CUE_W": [OE + " attribution τ15 Π", "design choice"],
    "past.SELF_BONUS": [OE + " attribution τ15 Π", "design choice"],
    "past.HOPE_LOW": [OE + " attribution τ15 Π (best possible self when hope is low)", "design choice"],
    "past.SHAME_SHOW": [OE + " attribution τ15 Π", "design choice"],
    "forgive.THETA": [OE + " eq.(4) passes F", "design choice"],
    "forgive.F0": [OE + " eq.(4) F_self = e_shame(0.4 + 0.6c_self)", "design choice; Cornish & Wade 2015"],
    "forgive.F1": [OE + " eq.(4) F_self = e_shame(0.4 + 0.6c_self)", "design choice; Cornish & Wade 2015"],
    "forgive.RELEASE": [OE + " eq.(4) passes F (released step)", "design choice; Worthington 2006"],
    "freeing.MU": [OE + " eq.(4) passes max J = P − μN", "design choice"],
    "freeing.K": [OE + " eq.(4) passes J (≤ 3 movers per move)", "design choice"],
    "freeing.T": [OE + " eq.(4) passes J (≤ 3 moves)", "design choice"],
    "freeing.MIN_GAIN": [OE + " eq.(4) passes J (stop rule)", "design choice"],
    "governor.U_W": [OE + " §topology governor U", "design choice"],
    "governor.Y_W": [OE + " §topology governor Y", "design choice"],
    "governor.MN_W": [OE + " §topology governor M_n", "design choice; APA 2013 context only"],
    "governor.ALPHA_U": [OE + " §topology governor α", "design choice"],
    "governor.REP_MIN_WORDS": [OE + " §topology governor U (repetition)", "design choice"],
    "governor.PRESS_MIN_WORDS": [OE + " §topology governor M_n (pressure)", "design choice"],
    "governor.PRESS_RATE": [OE + " §topology governor M_n (pressure)", "design choice"],
    "governor.PRESS_SCALE": [OE + " §topology governor M_n (pressure)", "design choice"],
    "governor.BANG_SCALE": [OE + " §topology governor M_n (pressure)", "design choice"],
    "governor.BURST_FREE": [OE + " §topology governor M_n (burst)", "design choice"],
    "governor.MIN_GAP_H": [OE + " §topology governor Y (rate)", "design choice"],
    "governor.KP": [OE + " §topology governor PI u = 1.2E + 0.4I", "Åström & Murray 2008 (gain: design choice)"],
    "governor.KI": [OE + " §topology governor PI", "Åström & Murray 2008 (gain: design choice)"],
    "governor.LEAK": [OE + " §topology governor I = 0.8I₋ + E", "Åström & Murray 2008"],
    "governor.L0": [OE + " §topology governor ℓ(C) = 0.45(1 − 0.5C)", "design choice"],
    "governor.KAPPA": [OE + " §topology governor ℓ(C)", "design choice"],
    "governor.GRADES": [OE + " §topology governor grades", "Linehan 2015 (STOP); Gross 1998 (cut points: design choice)"],
    "governor.I_MAX": [OE + " §topology governor anti-windup clip", "Åström & Murray 2008"],
    "governor.DAYS_DOCTOR": [OE + " §topology governor doctor line (≥ 3 days)", "APA 2013 (context only)"],
    "governor.HIST_MAX": [OE + " §topology governor history kept", "design choice"],
    "seeds.CARD": [OE + " eq.(4) words (deterministic phrasing)", "design choice"],
    "seeds.LIPSCHITZ": [OE + " §topology honest limit (sampled L)", "numerical method"],
    "seeds.LIPSCHITZ_N": [OE + " §topology honest limit (4000 pairs)", "numerical method"],
    "limits.MAX_CHECKPOINTS": ["storage (not an equation)", "design choice"],
    "limits.MAX_DAYS": ["storage (not an equation)", "design choice"],
    "limits.MAX_LINES": ["storage (not an equation)", "design choice"],
    "limits.MAX_W": ["storage (not an equation)", "design choice"],
    "limits.NAME_MAX": ["storage (not an equation)", "design choice"],
    "limits.MAX_TAG": ["storage (not an equation)", "design choice"],
    "limits.MAX_TAGS": ["storage (not an equation)", "design choice"],
    "limits.MIN_LINKS": ["films (not an equation)", "design choice"],
  };
  /** Every parameter as "group.KEY" (for tests and the analysis). */
  const GROUPS = Object.keys(P);
  const keys = () => GROUPS.flatMap(g => Object.keys(P[g]).map(k => g + "." + k));
  /** The value for "group.KEY". */
  const get = key => { const [g, k] = key.split("."); return P[g][k]; };
  MF.Params = Object.assign(P, { REF, GROUPS, keys, get });
})(typeof window !== "undefined" ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
if (typeof module !== "undefined") module.exports = global.MF.Params;
