// features/past.js — "Past to future": from what happened toward what can grow.
//
// Shown after "Loosen the grip", before the parable; never in a crisis.
// 1. Past focus (detect): past = clamp(max(e_shame, e_rumination) + 0.3·cue(k)),
//    k = past cues ("I should have", "if only", "regret", "my past", "back
//    then", "I ruined", …; negation-aware). It shows when past ≥ 0.3 and a
//    past cue or shame ≥ 0.4 is present (SHOW).
// 2. Technique (selected by the numbers, the strongest score wins):
//      self   = e_shame (+0.2 on the forgiveness path "self")
//               → self-compassion (Neff, 2003, Self and Identity 2(2):85–101)
//                 with the four Rs of self-forgiveness: responsibility,
//                 remorse, restoration, renewal (Cornish & Wade, 2015,
//                 J Couns Dev 93(1):96–104)
//      other  = cOther from the forgiveness path "other"
//               → loving-kindness, radiating self → a loved one → a neutral
//                 person → a difficult person → all people (Hofmann,
//                 Grossman & Hinton, 2011, Clin Psychol Rev 31(7):1126–1132)
//      loop   = e_rumination → acceptance and defusion (ACT: Hayes, Luoma,
//               Bond, Masuda & Lillis, 2006, Behav Res Ther 44(1):1–25)
//    and always a future step:
//      e_hope < 0.4 → Best Possible Self writing (King, 2001, PSPB
//                     27(7):798–807; Peters, Flink, Boersma & Linton, 2010,
//                     J Posit Psychol 5(3):204–211)
//      otherwise    → a short note to your future self (future-self
//                     continuity: Hershfield, 2011, Ann NY Acad Sci 1235:30–43)
// 3. The equation (modeled, not measured): the past terms ease and hope grows,
//      shame' = shame·(1 − Lp),  rumination' = rumination·(1 − Lp),
//      hope'  = hope + (1 − hope)·Lh
//    Lp: self .20, other .15, loop .20; Lh: best possible self .20, future
//    self .15. Words only on the card.
// 4. Faith on adds Philippians 3:13–14, Isaiah 43:18–19, Lamentations
//    3:22–23 and Colossians 3:13 (exact WEB text from features/scripture.js).

if (typeof window === "undefined") { require("../data/strings.js"); require("../core/equations.js"); }
(function (MF) {
  "use strict";
  const Str = MF.Strings;   // every word lives in js/data/strings.js
  const P = MF.Params, EQ = MF.Equations;   // every number: data/params.js; every equation: core/equations.js

  const { SHOW, LP, LH } = P.past;
  const PAST = [/\bi should have\b/, /\bi shouldn't have\b/, /\bif only\b/, /\bregret(s|ted)?\b/, /\bmy past\b/, /\bback then\b/, /\bi ruined\b/, /\bi messed up\b/, /\bwhat i did\b/, /\bwhat (they|he|she) did to me\b/, /\bcan't undo\b/, /\byears ago\b/];
  const clean = t => String(t || "").toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, " ");
  const hits = (list, t) => list.filter(re => { const g = new RegExp(re.source, "g"); let x; while ((x = g.exec(t))) if (!(MF.Kai && MF.Kai.negated(t, x.index))) return true; return false; }).length;

  const detect = MF.Movers.memoOn(detectOf);
  /** The past-to-future reading for m (memoized per m by detect). */
  function detectOf(m, text) {
    if (!m || m.crisis || !m.e) return null;
    const N = MF.Movers.NAMES, at = n => m.e[N.indexOf(n)];
    const k = hits(PAST, clean(text));
    const f = m.forgive || {};
    const { past, score, tech, future, after } = EQ.pastPull(at, k, f.path, f.cOther);   // OE τ15: Π
    return { show: past >= SHOW && (k > 0 || at("shame") >= P.past.SHAME_SHOW), past, k, score, tech, future, before: { shame: at("shame"), rumination: at("rumination"), hope: at("hope") }, after };
  }

  const TECH = {
    self: Str.t("past.TECH.self"),
    other: Str.t("past.TECH.other"),
    loop: Str.t("past.TECH.loop"),
  };
  const FUTURE = {
    bps: Str.t("past.FUTURE.bps"),
    future: Str.t("past.FUTURE.future"),
  };
  const word = x => (x >= 0.7 ? "a lot" : x >= 0.4 ? "some" : "a little");
  const FAITH = [["PHI 3:13", "PHI 3:14"], ["ISA 43:18", "ISA 43:19"], ["LAM 3:22", "LAM 3:23"], ["COL 3:13"]];
  /** The faith passages (exact text, shown separately). */
  const faithPassages = () => (MF.Scripture ? FAITH.map(c => MF.Scripture.passage(c)) : []);

  function lines(p, opts = {}) {
    if (!p || !p.show) return [];
    const out = Str.list("past.lines.out");
    out.push(TECH[p.tech]);
    out.push(FUTURE[p.future]);
    const big = p.before.shame >= p.before.rumination ? "shame" : "rumination";
    const what = big === "shame" ? Str.t("past.lines.what.the_weight_of_the_past") : Str.t("past.lines.what.replaying_the_past");
    const a = word(p.before[big]), b = word(p.after[big]), h0 = word(p.before.hope), h1 = word(p.after.hope);
    out.push(Str.t("past.lines.with_practice_over_days_may", { what: what, a_s: a === b ? " a little" : Str.t("past.lines.from_toward", { a: a, b: b }), h0_s: h0 === h1 ? " a little" : Str.t("past.lines.from_toward_2", { h0: h0, h1: h1 }) }));
    if (opts.faith && MF.Scripture) out.push(Str.t("past.lines.with_faith_scripture_speaks_of", { v0: faithPassages().map(x => x.ref).join("; ") }));
    return out;
  }

  MF.Past = { SHOW, LP, LH, PAST, TECH, FUTURE, FAITH, detect, lines, faithPassages };
})(typeof window !== "undefined" ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
if (typeof module !== "undefined") module.exports = global.MF.Past;
