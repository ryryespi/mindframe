// core/reality.js — hidden conflicts, grandiose vs. true-sized thinking, and the
// positive emotions a step points toward. Used INSIDE master() in the same pass.
//
// Nothing here adds a mover or a variable. Three things are derived:
//
//  1. Grandiosity signal g ∈ [0, 1] from the words (negation-aware):
//       raw = 0.6·#grand + 0.5·#certain-catastrophe + 0.25·#all-or-nothing + 0.1·min(3, #absolutist words)
//       g   = 1 − e^(−raw)
//     It feeds the existing movers through the word hook:
//       rumination += 0.5·g,  avoidance/fusion += 0.5·g   (raw, before saturation)
//     Grounding: Beck's cognitive distortions (magnification, all-or-nothing;
//     Beck, 1976; Burns, Feeling Good, 1980) and Al-Mosaiwi & Johnstone (2018),
//     "In an absolute state," Clinical Psychological Science 6(4):529–542, who
//     found absolutist words (always, never, completely, …) more common in
//     anxiety, depression and suicidal-ideation forums. A word signal, not a diagnosis.
//
//  2. Hidden conflicts: opposing pulls that are both active.
//       c(i, j) = √(x_i · y_j), shown when both sides pass their threshold
//       hard/process side x_i = e_i ≥ 0.3; grounding "pull toward" y = e ≥ 0.6;
//       grounding "need" y = 1 − e when e ≤ 0.4
//     plus value/feeling clashes in the words ("I want … but", "part of me",
//     "torn", "mixed feelings") with c = 0.5. Ambivalence is a normal part of
//     change (Miller & Rollnick, Motivational Interviewing, 3rd ed., 2013).
//
//  3. Positive emotions the master step points toward (words, not variables):
//       gain_j = |e_j − h_j| − |next_j − h_j|   (how much mover j moves toward home)
//       calm      = gain(calm) + ½gain(fear) + ½gain(anger)
//       courage   = gain(fear) + gain(avoidance)
//       hope      = gain(hope) + ½gain(sadness)
//       connection= gain(connection) + ½gain(shame)
//       peace     = gain(rumination) + ½gain(anger)
//       gratitude = ½gain(connection) + ½gain(hope)
//       joy       = ½gain(sadness) + ½gain(hope)
//     The top three (score > 0) are named on the card.

if (typeof module !== "undefined") require("./movers.js");

(function (MF) {
  "use strict";
  const { NAMES, idx, r2 } = MF.Movers;
  const G = typeof Grounding !== "undefined" ? Grounding : require("./grounding.js");

  // ---------- 1. Grandiosity and absolutist certainty ----------
  const NEGATORS = /^(not|no|don't|didn't|doesn't|won't|wasn't|isn't|aren't|wouldn't|can't|cannot|hardly)$/;
  /** Pattern groups: kind, weight per match, and the regular expressions. */
  const GRAND = [
    { kind: "grand", w: 0.6, res: [/\bonly i can\b/, /\b(i'?m|i am) destined\b/, /\bdestined for greatness\b/, /\bmeant for greatness\b/, /\beveryone will (see|know|realize|regret)\b/, /\bthey'?ll all see\b/,
      /\b(i'?m|i am) better than (everyone|everybody|anyone|all of them|them all|the rest)\b/, /\bi (never|can'?t|cannot) fail\b/, /\b(nothing|no one|nobody) can stop me\b/, /\b(i'?m|i am) the (best|greatest)\b/,
      /\bi know everything\b/, /\b(i'?m|i am) always right\b/, /\bi can do anything\b/, /\b(i'?m|i am) a genius\b/, /\bi will change the world\b/, /\bthe world needs me\b/] },
    { kind: "catastrophic", w: 0.5, res: [/\bi('ll| will) (definitely|certainly|surely) (fail|lose|mess (it|this) up)\b/, /\b(it'?s|it is) (definitely|certainly) going to (fail|go wrong|be a disaster)\b/,
      /\beverything is ruined\b/, /\bi('ll| will) never (be|get|find|succeed|recover|be happy)\b/, /\beveryone (hates|will hate) me\b/, /\bnobody will ever\b/, /\bi ruin everything\b/, /\bi always (ruin|fail|mess)\b/] },
    { kind: "allOrNothing", w: 0.25, res: [/\b(a )?(total|complete|utter) (failure|disaster|loser)\b/, /\b(completely|totally) (ruined|worthless|useless|hopeless)\b/, /\beither [^.!?;,]{1,30} or nothing\b/, /\bif it'?s not perfect\b/] },
  ];
  // A subset of the absolutist dictionary in Al-Mosaiwi & Johnstone (2018).
  const ABSOLUTIST = /\b(absolutely|always|completely|constantly|definitely|entirely|everyone|everybody|everything|never|nothing|totally)\b/g;
  /** Lower-case, straight apostrophes, single spaces. */
  const clean = text => String(text || "").toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, " ");
  /** True when a negator sits within the four words before `at`, in the same clause. */
  function negated(t, at) {
    const clause = t.slice(0, at).split(/[.!?;,]/).pop();
    return (clause.match(/[a-z']+/g) || []).slice(-4).some(w => NEGATORS.test(w));
  }
  /** Every un-negated match of a regular expression. */
  function hits(t, re) {
    const g = new RegExp(re.source, "g"), out = [];
    let m;
    while ((m = g.exec(t))) if (!negated(t, m.index)) out.push(m[0]);
    return out;
  }
  /**
   * The grandiosity signal for a text (negation-aware; crisis text gives 0).
   * @param {string} text
   * @returns {{g:number, raw:number, kind:string|null, kinds:string[], counts:{grand:number, catastrophic:number, allOrNothing:number, absolutist:number}}}
   */
  function grandiosity(text) {
    const t = clean(text);
    const counts = { grand: 0, catastrophic: 0, allOrNothing: 0, absolutist: 0 };
    if (!t.trim() || G.isCrisis(t)) return { g: 0, raw: 0, kind: null, kinds: [], counts };
    let raw = 0;
    GRAND.forEach(grp => grp.res.forEach(re => { const n = hits(t, re).length; counts[grp.kind] += n; raw += grp.w * n; }));
    counts.absolutist = hits(t, ABSOLUTIST).length;
    raw += 0.1 * Math.min(3, counts.absolutist);
    const kinds = ["grand", "catastrophic", "allOrNothing"].filter(k => counts[k] > 0);
    if (!kinds.length && counts.absolutist) kinds.push("absolutist");
    return { g: r2(1 - Math.exp(-raw)), raw: r2(raw), kind: kinds[0] || null, kinds, counts };
  }
  /** Show the reality check when g reaches this. */
  const G_SHOW = 0.25;

  // ---------- 2. Hidden conflicts ----------
  /** Clashes in the words themselves (value vs. feeling). */
  const TEXT_CLASH = [
    { kind: "wantBut", re: /\bi (really )?(want|wanna|wish|would like|hope)\b[^.!?;]{0,60}?\bbut\b/ },
    { kind: "shouldBut", re: /\bi (know i )?(should|have to|need to|ought to)\b[^.!?;]{0,60}?\bbut\b/ },
    { kind: "loveBut", re: /\bi love\b[^.!?;]{0,40}?\bbut\b/ },
    { kind: "partOfMe", re: /\b(part of me|one part of me|on one hand|torn|mixed feelings|conflicted|ambivalent)\b/ },
  ];
  /**
   * Value/feeling clashes in a text (crisis text gives none).
   * @param {string} text
   * @returns {string[]} kinds found, in a fixed order
   */
  function textConflicts(text) {
    const t = clean(text);
    if (!t.trim() || G.isCrisis(t)) return [];
    return TEXT_CLASH.filter(c => c.re.test(t)).map(c => c.kind);
  }
  /**
   * Opposing mover pairs. side: "high" (e ≥ 0.6, a pull toward) or "need"
   * (e ≤ 0.4, a lack that pulls) for grounding movers; hard/process need e ≥ 0.3.
   */
  const PAIRS = [
    { a: "fear", b: "hope", side: "high" },
    { a: "anger", b: "connection", side: "high" },
    { a: "shame", b: "connection", side: "need" },
    { a: "rumination", b: "calm", side: "high" },
    { a: "avoidance", b: "hope", side: "high" },
  ];
  const T_HARD = 0.3, T_HIGH = 0.6, T_NEED = 0.4;
  /**
   * Hidden conflicts from the movers plus the text clashes, strongest first.
   * @param {number[]} e the mover vector after the words
   * @param {string[]} clashes kinds from textConflicts()
   * @returns {Array<{a:string, b:string, side:string, x:number, y:number, c:number, from:string}>}
   */
  function conflicts(e, clashes = []) {
    const out = [];
    PAIRS.forEach(p => {
      const x = e[idx[p.a]], g = e[idx[p.b]];
      const y = p.side === "high" ? (g >= T_HIGH ? g : 0) : (g <= T_NEED ? 1 - g : 0);
      if (x >= T_HARD && y > 0) out.push({ a: p.a, b: p.b, side: p.side, x, y: r2(y), c: r2(Math.sqrt(x * y)), from: "movers" });
    });
    clashes.forEach(k => out.push({ a: k, b: null, side: "text", x: 0.5, y: 0.5, c: 0.5, from: "words" }));
    return out.sort((p, q) => q.c - p.c);
  }

  // ---------- 3. Positive emotions from the step ----------
  /** How each positive word is built from the gains toward home. */
  const POSITIVE = {
    calm: { calm: 1, fear: 0.5, anger: 0.5 },
    courage: { fear: 1, avoidance: 1 },
    hope: { hope: 1, sadness: 0.5 },
    connection: { connection: 1, shame: 0.5 },
    peace: { rumination: 1, anger: 0.5 },
    gratitude: { connection: 0.5, hope: 0.5 },
    joy: { sadness: 0.5, hope: 0.5 },
  };
  /**
   * The positive emotions the master step points toward, strongest first.
   * At home (no movement) they come from grounding that is already high.
   * @param {number[]} e before the step
   * @param {number[]} next after the step
   * @param {number[]} h home
   * @returns {Array<{word:string, score:number}>} up to three
   */
  function positives(e, next, h) {
    const gain = NAMES.map((n, j) => Math.abs(e[j] - h[j]) - Math.abs(next[j] - h[j]));
    let out = Object.entries(POSITIVE).map(([word, mix]) => ({ word, score: r2(Object.entries(mix).reduce((s, [n, k]) => s + k * gain[idx[n]], 0)) }))
      .filter(x => x.score > 0).sort((p, q) => q.score - p.score);
    if (!out.length) {
      const at = { peace: e[idx.calm], gratitude: e[idx.connection], joy: e[idx.hope] };
      out = Object.entries(at).filter(([, x]) => x >= 0.5).map(([word, x]) => ({ word, score: 0 }));
      if (!out.length) out = [{ word: "calm", score: 0 }];
    }
    return out.slice(0, 3);
  }

  /** The word hook: grandiosity nudges rumination and fusion; clashes pass through as data. */
  function hook(text) {
    const gr = grandiosity(text), clashes = textConflicts(text);
    if (!gr.g && !clashes.length) return null;
    const add = gr.g ? { rumination: 0.5 * gr.g, avoidance: 0.5 * gr.g } : {};
    const notes = gr.g >= G_SHOW ? ["grand or absolute wording"] : [];
    if (clashes.length) notes.push("mixed feelings in the words");
    return { add, notes, data: { grand: gr, clashes } };
  }
  MF.Movers.addWordHook(hook);

  MF.Reality = { GRAND, ABSOLUTIST, G_SHOW, PAIRS, T_HARD, T_HIGH, T_NEED, POSITIVE, TEXT_CLASH, grandiosity, textConflicts, conflicts, positives, hook };
})(typeof window !== "undefined" ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
if (typeof module !== "undefined") module.exports = global.MF.Reality;
