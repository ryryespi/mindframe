// features/grip.js — "Loosen the grip": fear, mental vices and looping thoughts.
//
// Shown after Update, before the parable, never in a crisis. The aim is never
// to remove or push away a thought (suppression tends to bring it back:
// Wegner, Schneider, Carter & White, 1987, JPSP 53(1):5–13); it is to loosen
// its hold, gently and without shame.
// 1. Pulls (detect), each 0..1:
//      fear  = e_fear
//      loop  = clamp(e_rumination + 0.1·days + 0.2·cue(kLoop))   days = saved
//              days (of the last seven) with rumination ≥ 0.5; kLoop = "over
//              and over", "can't stop thinking", …
//      vice  = cue(k) = 1 − e^(−0.7k) over gentle cue lists (desire, envy,
//              resentment, pride), negation-aware (core/kai.js), plus the
//              existing signals: grandiosity g ≥ G_SHOW → pride, the
//              forgiveness path "other" with cOther ≥ 0.5 → resentment.
//    It shows when the strongest pull is ≥ 0.3 (SHOW).
// 2. Tool (by the strongest pull) and a value step after it:
//      vice → urge surfing (Bowen & Marlatt, 2009, Psychol Addict Behav 23(4):666–671)
//      loop with days ≥ 2 or a loop cue → a scheduled worry window
//             (Borkovec et al., 1983, Behav Res Ther 21(3):247–251;
//              McGowan & Behar, 2013, Behav Modif 37(1):90–112)
//      otherwise → notice, name, defuse (Masuda et al., 2004, Behav Res Ther 42(4):477–485)
//      then → one small value step (the lever's practice)
// 3. The equation: each tool loosens the pull terms by a fraction L
//    (defuse .25, surf .30, window .20, value .15; modeling choices, not
//    measured effects). With both tools, L = 1 − (1 − L_tool)(1 − L_value),
//    and the projected pull is x' = x·(1 − L) for fear, loop and vice. Words
//    only on the card ("may loosen from a lot toward some, with practice").
// 4. Faith on adds 2 Corinthians 10:5 and Philippians 4:8 (exact WEB text,
//    from features/scripture.js) as a framing: taking thoughts captive and
//    setting the mind on what is true, as practice, not as suppression.

if (typeof window === "undefined") { require("../data/strings.js"); require("../core/equations.js"); }
(function (MF) {
  "use strict";
  const Str = MF.Strings;   // every word lives in js/data/strings.js
  const P = MF.Params, EQ = MF.Equations;   // every number: data/params.js; every equation: core/equations.js

  const { SHOW, L } = P.grip;
  const { cue, r2 } = EQ;
  /** Gentle names (no shaming), and negation-aware cue lists. */
  const VICE = {
    desire: { name: Str.t("grip.VICE.desire.name"), res: [/\blust(ing|ful)?\b/, /\bporn\b/, /\bcan't stop looking at\b/, /\bcraving\b/] },
    envy: { name: Str.t("grip.VICE.envy.name"), res: [/\b(jealous|envious|envy)\b/, /\bwhy do(es)? (they|he|she) get\b/, /\bwish i had (their|his|her)\b/] },
    resentment: { name: Str.t("grip.VICE.resentment.name"), res: [/\bresent(ment|ful|ing)?\b/, /\bgrudge\b/, /\b(forgive|let go of) (them|him|her|what (they|he|she) did)\b/] },
    pride: { name: Str.t("grip.VICE.pride.name"), res: [/\bbetter than (them|everyone|him|her|all of)\b/, /\bbeneath me\b/, /\bi'?m always right\b/] },
  };
  const LOOP = [/\bover and over\b/, /\bagain and again\b/, /\bcan't stop (thinking|checking|scrolling|replaying)\b/, /\bkeep (replaying|going over|checking)\b/, /\bon a loop\b/];
  const clean = t => String(t || "").toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, " ");
  const neg = (t, at) => (MF.Kai ? MF.Kai.negated(t, at) : false);
  /** Count the patterns that match somewhere not negated. */
  const hits = (list, t) => list.filter(re => { const g = new RegExp(re.source, "g"); let x; while ((x = g.exec(t))) if (!neg(t, x.index)) return true; return false; }).length;
  const level = x => (x >= 0.7 ? "a lot" : x >= 0.4 ? "some" : "a little");

  /**
   * @param {object} m master output
   * @param {string} text the words (empty in pick mode)
   * @param {{days?: {e:number[]}[]}} [state] for the repetition across days
   */
  const detect = MF.Movers.memoOn(detectOf);
  /** The grip reading for m (memoized per m by detect). */
  function detectOf(m, text, state) {
    if (!m || m.crisis || !m.e) return null;
    const N = MF.Movers.NAMES, at = n => m.e[N.indexOf(n)], t = clean(text);
    const days = ((state && state.days) || []).slice(-P.grip.DAYS).filter(d => d.e && d.e[N.indexOf("rumination")] >= P.grip.LOOP_DAY).length;
    const kLoop = hits(LOOP, t);
    const vices = Object.keys(VICE).filter(k => hits(VICE[k].res, t) > 0);
    if (m.grand && MF.Reality && m.grand.g >= MF.Reality.G_SHOW && !vices.includes("pride")) vices.push("pride");
    if (m.forgive && m.forgive.path === "other" && m.forgive.cOther >= 0.5 && !vices.includes("resentment")) vices.push("resentment");
    const pull = { fear: r2(at("fear")), loop: EQ.loopPull(at("rumination"), days, kLoop), vice: cue(vices.length) };
    const top = ["vice", "loop", "fear"].reduce((a, k) => (pull[k] > pull[a] + 1e-9 ? k : a), "vice");
    const tool = top === "vice" ? "surf" : top === "loop" && (days >= 2 || kLoop > 0) ? "window" : "defuse";
    const { Lt, after } = EQ.gripLoosen(pull, tool);   // OE τ14: x(1 − L)
    return { show: pull[top] >= SHOW, top, pull, after, L: Lt, tool, vices, days, kLoop };
  }

  const TOOL = {
    defuse: Str.t("grip.TOOL.defuse"),
    surf: Str.t("grip.TOOL.surf"),
    window: Str.t("grip.TOOL.window"),
  };
  const WHAT = { fear: "fear", loop: Str.t("grip.WHAT.loop"), vice: null };

  /** The card lines (words only; never a promise to remove thoughts). */
  function lines(g, m, opts = {}) {
    if (!g || !g.show) return [];
    const what = g.top === "vice" ? g.vices.map(v => VICE[v].name).join(" and ") : WHAT[g.top];
    const out = [Str.t("grip.lines.out.loosen_the_grip_is_pulling", { what: what })];
    out.push(TOOL[g.tool]);
    const pr = m && m.practice && MF.Practices && MF.Practices.LIBRARY[m.practice.id];
    out.push(Str.t("grip.lines.then_one_small_step_toward", { v0: pr ? `: ${pr.name.replace(/:.*$/, "")}` : Str.t("grip.lines.like_a_kind_word_or") }));
    const from = level(g.pull[g.top]), to = level(g.after[g.top]);
    out.push(from === to ? Str.t("grip.lines.with_practice_its_hold_may", { from: from }) : Str.t("grip.lines.with_practice_its_hold_may_2", { from: from, to: to }));
    if (opts.faith && MF.Scripture) {
      const v = c => MF.Scripture.VERSES.find(x => x.code === c);
      out.push(Str.t("grip.lines.with_faith_scripture_speaks_of", { ref: v("2CO 10:5").ref, ref1: v("PHI 4:8").ref }));
    }
    return out;
  }
  /** The exact faith verses (shown separately, with references). */
  const faithVerses = () => (MF.Scripture ? ["2CO 10:5", "PHI 4:8"].map(c => MF.Scripture.VERSES.find(x => x.code === c)) : []);

  MF.Grip = { SHOW, L, VICE, LOOP, TOOL, detect, lines, faithVerses, level };
})(typeof window !== "undefined" ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
if (typeof module !== "undefined") module.exports = global.MF.Grip;
