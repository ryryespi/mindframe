// core/peace.js — the Inner Peace score P and the most helpful lever.
// Used INSIDE master() in the same pass. A model, not validated science.
//
//   P = P_d · P_c · P_g ∈ [0, 1]
//   P_d = 1 / (1 + (d / d0)²)        d = ‖e − h‖ (the master's distance), d0 = 0.6
//   P_c = 1 − γ·C_max                C_max = strongest hidden conflict c (0 if none), γ = 0.3
//   P_g = 1 − δ·g                    g = the grandiosity signal, δ = 0.3
//
//   • P = 1 exactly at home (d = 0, and with no hard mover active there is no
//     mover conflict); every factor is ≤ 1, so P is highest at h.
//   • P_d is smooth and strictly decreasing in d (never flat), so the lever
//     below always has a direction. With d0 = 0.6, P_d = 0.8 at d = 0.3, the
//     same "close to steady" line the recovery count already uses.
//   • Peace threshold P* = 0.8. Bands: < 0.4 a little, 0.4–0.6 growing,
//     0.6–0.8 close, ≥ 0.8 steady.
//   • Lever: for each mover i, move e_i toward h_i by ε = 0.05 (or less if
//     closer), recompute conflicts and P, and take the largest gain ΔP_i
//     (a finite difference). The gradient ∂P/∂e_i is a central difference
//     (step 0.01, one-sided at 0 and 1).
//   d0, γ and δ are adjustable in Ada's (Scientist) panel.
//
// Conceptual basis (no measurement is claimed):
//   • Equanimity: an even-minded state toward pleasant and unpleasant
//     experience (Desbordes et al., 2015, Mindfulness 6(2):356–372;
//     Kabat-Zinn, 2003, Clin Psychol Sci Pract 10(2):144–156). Here: being
//     near home with nothing pulling hard.
//   • Peace of mind as low-arousal internal peacefulness and harmony (Lee, Lin,
//     Huang & Fredrickson, 2013, J Happiness Stud 14(2):571–590): the conflict
//     factor P_c treats inner disharmony as lowering peace.
//   • Emotion regulation (Gross, 1998, Rev Gen Psychol 2(3):271–299): the lever
//     is one point where a small regulation step helps most; the cognitive-change
//     point is the reality check (P_g).

if (typeof module !== "undefined") {
  require("./equations.js");
  require("./movers.js");
  require("./reality.js");
}

(function (MF) {
  "use strict";
  const P = MF.Params, EQ = MF.Equations;   // every number: data/params.js; every equation: core/equations.js
  const { NAMES, isGround, r2, distance } = MF.Movers;
  const R = MF.Reality;
  const { P_STAR, EPS, H } = P.peace;

  /**
   * The peace score for a vector. conflicts are master's conflicts[] (or
   * R.conflicts(e, clashes)); g is the grandiosity signal.
   * @returns {{P:number, Pd:number, Pc:number, Pg:number, d:number, Cmax:number, g:number, raw:number}}
   */
  function score(e, h, vars, conflicts, g = 0) {
    const d = distance(e, h);
    const Cmax = (conflicts || []).reduce((m, c) => Math.max(m, c.c), 0);
    const { Pd, Pc, Pg, raw } = EQ.peace(d, Cmax, g, vars);   // OE eq.(3)
    return { P: r2(raw), raw, Pd: r2(Pd), Pc: r2(Pc), Pg: r2(Pg), d: r2(d), Cmax, g };
  }
  /** Unrounded P for e (conflicts recomputed from e plus the text clashes). */
  const rawAt = (e, h, vars, clashes, g) => score(e, h, vars, R.conflicts(e, clashes), g).raw;

  /**
   * The most helpful lever: the mover whose move toward home by ε raises P most.
   * @returns {{name:string|null, kind:"ease"|"grow"|null, dP:number, gains:number[]}}
   */
  function lever(e, h, vars, clashes = [], g = 0) {
    const base = rawAt(e, h, vars, clashes, g);
    const gains = NAMES.map((n, i) => {
      const gap = h[i] - e[i];
      if (Math.abs(gap) < 1e-9) return 0;
      const e2 = e.slice();
      e2[i] = e[i] + Math.sign(gap) * Math.min(EPS, Math.abs(gap));
      return rawAt(e2, h, vars, clashes, g) - base;
    });
    let best = -1;
    gains.forEach((x, i) => { if (x > 1e-9 && (best < 0 || x > gains[best] + 1e-12)) best = i; });
    if (best < 0) return { name: null, kind: null, dP: 0, gains: gains.map(r4) };
    const name = NAMES[best];
    return { name, kind: !isGround[best] || e[best] > h[best] ? "ease" : "grow", dP: r4(gains[best]), gains: gains.map(r4) };
  }
  /** Round to four decimals (gradients are small). */
  const r4 = x => Math.round(x * 10000) / 10000;

  /** ∂P/∂e_i by central differences (one-sided at the edges of [0, 1]). */
  function gradient(e, h, vars, clashes = [], g = 0) {
    return NAMES.map((n, i) => {
      const lo = Math.max(0, e[i] - H), hi = Math.min(1, e[i] + H);
      const a = e.slice(), b = e.slice();
      a[i] = lo; b[i] = hi;
      return r4((rawAt(b, h, vars, clashes, g) - rawAt(a, h, vars, clashes, g)) / (hi - lo));
    });
  }

  /** The peace band: < 0.4 a little, 0.4–0.6 growing, 0.6–0.8 close, ≥ 0.8 steady. */
  const band = EQ.peaceBand;

  MF.Peace = { P_STAR, EPS, score, lever, gradient, band };
})(typeof window !== "undefined" ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
if (typeof module !== "undefined") module.exports = global.MF.Peace;
