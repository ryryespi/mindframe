// features/freeing.js — the freeing mix: the combination of feelings that best
// frees you from shame, self-blame and false humility, solved from master's
// own numbers. No new movers, no new variables; it never moves e.
//
// 1. Master pass (same master() call, after forgiveness), from the reading e:
//      Objective   J(e) = P(e) − μ·N(e),  μ = 0.5
//                  P    = master's inner peace (core/peace.js), with the
//                         reading's text clashes and true-size signal max(g, u) held fixed
//                  N(e) = e_shame + c_self·e_rumination + u·max(0, h_hope − e_hope)
//                         (the "nudge load": shame itself, plus the channels the
//                         self-blame cue (rumination) and the put-down cue (hope) push on)
//      Moves       each step, at most K = 3 movers move, each by exactly one band
//                  toward home on the picker's ladder (off 0, a little 0.15,
//                  quite 0.45, strongly 0.80; clipped at h_j, never past it):
//                  the same direction as the master step, since master's next_j
//                  lies between e_j and h_j for every mover (see core/master.js).
//      Feasible    P(e') ≥ P(e) and e'_shame ≤ e_shame (shame never rises).
//      Step        e ← argmax J over all feasible moves (130 subsets of ≤ 3 movers:
//                  exhaustive, so each step is the exact optimum); stop when J
//                  no longer rises (by > 0.001) or after T = 3 steps.
//      Guarantees  (by construction, and tested) P(target) ≥ P(now),
//                  shame(target) ≤ shame(now), J rises every step, every moved
//                  mover moves toward home in master's step direction, and no
//                  mover moves more than one band per step.
//    out.freeing = {now, target, steps[], ease[], grow[], P0, P1, J0, J1, N0, N1,
//                   cSelf, u, show, selfBlame, practice: "kindness"}
// 2. Words (card): the "Your freeing mix" tile (ease and grow lists, the inner
//    peace band before and after, the true-humility line, faith wording when on,
//    One step: the self-compassion break, and Grace's Forgive myself when
//    self-blame is present). Words only, no digits.
// 3. Export: line(now, target, extras) is the compact readable line Toby shows,
//    copies ("Copy freeing mix"), and writes into the .mf code (mf 3), e.g.
//      Now: ashamed strongly, … → Freeing mix: ashamed a little, calm strongly, …
//
// Sources for the words: Tangney (2000) J Soc Clin Psychol 19(1):70–82 (true
// humility as accurate self-assessment); Burns (1980) Feeling Good
// (disqualifying the positive); Neff (2003) Self and Identity 2(2):85–101 and
// the self-compassion break; Gilbert & Procter (2006) Clin Psychol Psychother
// 13(6):353–379 and Gilbert (2009) Adv Psychiatr Treat 15(3):199–208 (shame,
// self-criticism, compassion-focused therapy). Faith (only with Include faith):
// Romans 12:3 (sober judgment); Teresa of Ávila, The Interior Castle VI.10.7
// ("to be humble is to walk in truth", Kavanaugh & Rodriguez translation);
// 1 John 4:19 ("We love because he first loved us"). A model, not therapy.

if (typeof module !== "undefined") {
  require("../core/movers.js");
  require("../core/reality.js");
  require("../core/peace.js");
  require("../core/master.js");
  require("./forgiveness.js");
  require("./practices.js");
}

(function (MF) {
  "use strict";
  const { NAMES, LEVELS, LEVEL_ORDER, PICK_WORD, idx, isGround, r2, levelOf, listJoin, cap } = MF.Movers;
  const R = MF.Reality, PEACE = MF.Peace;

  const MU = 0.5, K = 3, T = 3, MIN_GAIN = 0.001;
  /** The picker's ladder: band midpoints, by band index (off, a little, quite, strongly). */
  const LADDER = LEVEL_ORDER.map(l => LEVELS[l]);
  /** Band index of a value (0 off … 3 strongly), the same cut points as levelOf. */
  const bandIndex = x => LEVEL_ORDER.indexOf(levelOf(x));

  /**
   * One band toward home for one mover: the next band's midpoint in the
   * direction of h, clipped at h (never past home). Returns x when at home.
   */
  function oneBand(x, h) {
    if (Math.abs(x - h) < 1e-9) return x;
    const b = bandIndex(x);
    if (h < x) return b === 0 ? h : Math.max(h, LADDER[b - 1]);
    return b === LADDER.length - 1 ? h : Math.min(h, LADDER[b + 1]);
  }

  /** The nudge load N(e) = e_shame + c_self·e_rumination + u·max(0, h_hope − e_hope). */
  const load = (e, h, cSelf, u) => e[idx.shame] + cSelf * e[idx.rumination] + u * Math.max(0, h[idx.hope] - e[idx.hope]);

  /** All subsets of 1..k indices from a list. */
  function subsets(list, k) {
    const out = [];
    const go = (start, cur) => {
      if (cur.length) out.push(cur.slice());
      if (cur.length === k) return;
      for (let i = start; i < list.length; i++) { cur.push(list[i]); go(i + 1, cur); cur.pop(); }
    };
    go(0, []);
    return out;
  }

  /**
   * Solve for the freeing mix from a vector (see the header).
   * @param {number[]} e0 the reading's e
   * @param {number[]} h home
   * @param {object} V variables (d0, γ, δ)
   * @param {{clashes?:string[], tsize?:number, cSelf?:number, u?:number}} [ctx]
   * @returns {{target:number[], steps:Array, P0:number, P1:number, J0:number, J1:number, N0:number, N1:number}}
   */
  function solve(e0, h, V, ctx = {}) {
    const clashes = ctx.clashes || [], ts = ctx.tsize || 0, cSelf = ctx.cSelf || 0, u = ctx.u || 0;
    const P = e => PEACE.score(e, h, V, R.conflicts(e, clashes), ts).raw;
    const J = e => P(e) - MU * load(e, h, cSelf, u);
    let cur = e0.slice();
    const steps = [];
    for (let t = 0; t < T; t++) {
      const Pc = P(cur), Jc = J(cur);
      const movable = NAMES.map((n, j) => j).filter(j => Math.abs(oneBand(cur[j], h[j]) - cur[j]) > 1e-9);
      let best = null;
      subsets(movable, K).forEach(set => {
        const e2 = cur.slice();
        set.forEach(j => { e2[j] = r2(oneBand(cur[j], h[j])); });
        if (e2[idx.shame] > cur[idx.shame] + 1e-9) return;
        const p2 = P(e2);
        if (p2 < Pc - 1e-12) return;
        const j2 = J(e2);
        if (!best || j2 > best.J + 1e-12 || (Math.abs(j2 - best.J) <= 1e-12 && set.length < best.set.length)) best = { e: e2, J: j2, P: p2, set };
      });
      if (!best || best.J - Jc <= MIN_GAIN) break;
      steps.push({ moves: best.set.map(j => ({ name: NAMES[j], from: cur[j], to: best.e[j], kind: best.e[j] < cur[j] ? "ease" : "grow" })), P: r4(best.P), J: r4(best.J) });
      cur = best.e;
    }
    return { target: cur, steps, P0: r4(P(e0)), P1: r4(P(cur)), J0: r4(J(e0)), J1: r4(J(cur)), N0: r4(load(e0, h, cSelf, u)), N1: r4(load(cur, h, cSelf, u)) };
  }
  /** Round to four decimals. */
  const r4 = x => Math.round(x * 10000) / 10000;

  /**
   * Master pass: out.freeing (skipped inside master's own inner simulations).
   * @param {object} out master output
   * @param {{h:number[], V:object, clashes:string[], sim:boolean}} ctx
   */
  function pass(out, ctx) {
    if (!ctx.sim) return;
    const cSelf = out.forgive ? out.forgive.cSelf : 0, u = out.small ? out.small.u : 0;
    const s = solve(out.e, ctx.h, ctx.V, { clashes: ctx.clashes, tsize: out.tsize || 0, cSelf, u });
    const ease = [], grow = [];
    NAMES.forEach((n, j) => {
      if (s.target[j] < out.e[j] - 1e-9) ease.push(n);
      else if (s.target[j] > out.e[j] + 1e-9) grow.push(n);
    });
    const selfBlame = cSelf > 0 || !!(out.forgive && out.forgive.path === "self");
    const show = (ease.length + grow.length > 0) && (out.e[idx.shame] >= R.T_HARD || cSelf > 0 || u >= R.U_SHOW);
    out.freeing = { now: out.e.slice(), ...s, ease, grow, cSelf, u, selfBlame, show, mu: MU, K, T, practice: "kindness" };
  }
  MF.Master.addPass(pass);

  // ---------- Words (card) ----------
  const EASE_NOUN = { fear: "the fear", sadness: "the sadness", anger: "the anger", shame: "the shame", rumination: "the replaying", avoidance: "the avoiding", calm: "the calm", connection: "the closeness", hope: "the hope" };
  const GROW_NOUN = { calm: "calm", connection: "connection", hope: "hope", fear: "fear", sadness: "sadness", anger: "anger", shame: "shame", rumination: "replaying", avoidance: "avoiding" };
  const BAND_WORD = { "a little": "a little peace", growing: "growing peace", close: "close to steady", steady: "steady" };
  const NUMBER = ["no", "one", "two", "three"];
  /** The true-humility line (always on the freeing tile). */
  const TRUE_HUMILITY = "True humility sees you at your real size: not worse than others, not better; worthy of kindness and still learning.";
  /** Faith wording (only with Include faith on). */
  const FAITH = "Think of yourself with sober judgment (from Romans). To be humble is to walk in truth (Teresa of \u00C1vila), and your worth rests on God's love, not on your record: we love because he first loved us (from First John).";
  const GRACE = "Grace's Forgive myself path can help you own your part and set the rest down.";

  /**
   * The "Your freeing mix" tile, in words (empty when it isn't relevant).
   * @param {object} m master output
   * @param {{faith?:boolean}} [opts]
   * @returns {{lines:string[], step:string, grace:boolean}|null}
   */
  function cardLines(m, opts = {}) {
    const f = m && m.freeing;
    if (!f || !f.show) return null;
    const parts = [];
    if (f.ease.length) parts.push(`ease ${listJoin(f.ease.map(n => EASE_NOUN[n]))}`);
    if (f.grow.length) parts.push(`grow ${listJoin(f.grow.map(n => GROW_NOUN[n]))}`);
    const lines = [`Your freeing mix: ${parts.join("; ")}.`];
    const b0 = PEACE.band(f.P0), b1 = PEACE.band(f.P1), n = f.steps.length;
    const how = `${cap(NUMBER[n])} gentle step${n === 1 ? "" : "s"}, one band at a time`;
    lines.push(b0 === b1
      ? `${how}: inner peace rises within ${BAND_WORD[b0]}, and shame only goes down.`
      : `${how}: inner peace could go from ${BAND_WORD[b0]} to ${BAND_WORD[b1]}, and shame only goes down.`);
    lines.push(TRUE_HUMILITY);
    if (opts.faith) lines.push(FAITH);
    // Grace's route in words only when the forgiveness tile isn't already saying it (the button shows either way).
    if (f.selfBlame && !(m.forgive && m.forgive.path === "self")) lines.push(GRACE);
    const lib = MF.Practices && MF.Practices.LIBRARY[f.practice];
    // When the card's own One step is already this practice, point to it instead of repeating it.
    const same = m.practice && m.practice.id === f.practice;
    const step = !lib ? "" : same ? "One step: start with the self-compassion break in the One step below." : `One step: ${lib.say({ min: "two", times: "three" })}.`;
    return { lines, step, grace: f.selfBlame, practice: f.practice, tryIt: !same };
  }

  // ---------- Export: the compact readable line ----------
  /** Short plain words for the line. */
  const SHORT = { ...PICK_WORD, rumination: "replaying" };
  /** Line order: the hard feelings, then replaying and avoiding, then the grounding ones. */
  const LINE_ORDER = ["fear", "sadness", "anger", "shame", "rumination", "avoidance", "calm", "connection", "hope"];
  const EXTRA_WORD = { blame: "blaming myself", putdown: "putting myself down" };
  /**
   * "Now: … → Freeing mix: …". A hard/process mover is listed when it is not
   * off on either side; a grounding mover when its level changes or is not "quite".
   * @param {number[]} now
   * @param {number[]} target
   * @param {string[]} [extras] picked extra chips (listed on the Now side)
   * @returns {string}
   */
  function line(now, target, extras = []) {
    const keep = LINE_ORDER.filter(n => {
      const j = idx[n];
      const a = levelOf(now[j]), b = levelOf(target[j]);
      return isGround[j] ? a !== b || a !== "quite" : a !== "off" || b !== "off";
    });
    const side = v => keep.map(n => `${SHORT[n]} ${levelOf(v[idx[n]])}`);
    const nowSide = side(now).concat(Object.keys(EXTRA_WORD).filter(x => extras.includes(x)).map(x => EXTRA_WORD[x]));
    return `Now: ${nowSide.join(", ") || "at rest"} \u2192 Freeing mix: ${side(target).join(", ") || "at rest"}`;
  }

  // ---------- Panel bits (browser only) ----------
  /**
   * Mount the freeing tile's buttons and Toby's "Copy freeing mix".
   * @param {object} app the app shell
   * @returns {function} render
   */
  function mount(app) {
    const { $ } = app;
    const current = () => (app.state.mix ? line(app.state.e, app.state.mix, app.state.pick ? app.state.pick.extras : []) : "");
    $("free-try").addEventListener("click", () => { app.open("grace"); app.grace.show("practice"); app.practices.select("kindness"); });
    $("free-grace").addEventListener("click", () => { app.open("grace"); app.grace.show("self"); });
    $("copy-mix").addEventListener("click", () => { const t = current(); if (t) app.copy(t, "mix-copied"); });
    return function render() {
      const t = current();
      $("mix-line").textContent = t || "Tap Update to see your freeing mix.";
      $("copy-mix").disabled = !t;
    };
  }

  MF.Freeing = { MU, K, T, LADDER, TRUE_HUMILITY, FAITH, GRACE, oneBand, bandIndex, load, solve, pass, cardLines, line, mount };
})(typeof window !== "undefined" ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
if (typeof module !== "undefined") module.exports = global.MF.Freeing;
