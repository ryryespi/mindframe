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

(function (MF) {
  "use strict";

  const SHOW = 0.3;
  const LP = { self: 0.2, other: 0.15, loop: 0.2 };
  const LH = { bps: 0.2, future: 0.15 };
  const PAST = [/\bi should have\b/, /\bi shouldn't have\b/, /\bif only\b/, /\bregret(s|ted)?\b/, /\bmy past\b/, /\bback then\b/, /\bi ruined\b/, /\bi messed up\b/, /\bwhat i did\b/, /\bwhat (they|he|she) did to me\b/, /\bcan't undo\b/, /\byears ago\b/];
  const cue = k => Math.round((1 - Math.exp(-0.7 * Math.max(0, k))) * 100) / 100;
  const clamp = x => Math.max(0, Math.min(1, x));
  const r2 = x => Math.round(x * 100) / 100;
  const clean = t => String(t || "").toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, " ");
  const hits = (list, t) => list.filter(re => { const g = new RegExp(re.source, "g"); let x; while ((x = g.exec(t))) if (!(MF.Kai && MF.Kai.negated(t, x.index))) return true; return false; }).length;

  function detect(m, text) {
    if (!m || m.crisis || !m.e) return null;
    const N = MF.Movers.NAMES, at = n => m.e[N.indexOf(n)];
    const k = hits(PAST, clean(text));
    const past = r2(clamp(Math.max(at("shame"), at("rumination")) + 0.3 * cue(k)));
    const f = m.forgive || {};
    const score = { self: r2(at("shame") + (f.path === "self" ? 0.2 : 0)), other: r2(f.path === "other" ? f.cOther || 0 : 0), loop: r2(at("rumination")) };
    const tech = ["self", "other", "loop"].reduce((a, x) => (score[x] > score[a] + 1e-9 ? x : a), "self");
    const future = at("hope") < 0.4 ? "bps" : "future";
    const after = { shame: r2(at("shame") * (1 - LP[tech])), rumination: r2(at("rumination") * (1 - LP[tech])), hope: r2(at("hope") + (1 - at("hope")) * LH[future]) };
    return { show: past >= SHOW && (k > 0 || at("shame") >= 0.4), past, k, score, tech, future, before: { shame: at("shame"), rumination: at("rumination"), hope: at("hope") }, after };
  }

  const TECH = {
    self: "Self-compassion: speak to yourself as you would to a friend, remember that everyone stumbles, and notice the hurt without drowning in it. Then the four Rs: take responsibility, feel remorse without self-punishment, restore what you can, and renew your commitment to your values.",
    other: "Loving-kindness: wish well slowly, first to yourself, then someone you love, then someone neutral, then the person who is hard for you, then all people. Wishing well is not excusing what happened.",
    loop: "Acceptance: say to yourself, \u201CThis happened, and I'm having thoughts about it,\u201D and let the memory be there without replaying it to fix it. You can carry it and still move.",
  };
  const FUTURE = {
    bps: "Toward the future: write for a few minutes about your best possible self, a life where things have gone as well as they reasonably could, and notice one thing you could start now.",
    future: "Toward the future: write a short note to yourself a year from now, about who you are growing into; that future you is still you.",
  };
  const word = x => (x >= 0.7 ? "a lot" : x >= 0.4 ? "some" : "a little");
  const FAITH = [["PHI 3:13", "PHI 3:14"], ["ISA 43:18", "ISA 43:19"], ["LAM 3:22", "LAM 3:23"], ["COL 3:13"]];
  /** The faith passages (exact text, shown separately). */
  const faithPassages = () => (MF.Scripture ? FAITH.map(c => MF.Scripture.passage(c)) : []);

  function lines(p, opts = {}) {
    if (!p || !p.show) return [];
    const out = ["Past to future: what happened is real, and it doesn't have to decide what comes next."];
    out.push(TECH[p.tech]);
    out.push(FUTURE[p.future]);
    const big = p.before.shame >= p.before.rumination ? "shame" : "rumination";
    const what = big === "shame" ? "the weight of the past" : "replaying the past";
    const a = word(p.before[big]), b = word(p.after[big]), h0 = word(p.before.hope), h1 = word(p.after.hope);
    out.push(`With practice over days, ${what} may ease${a === b ? " a little" : ` from ${a} toward ${b}`}, and hope may grow${h0 === h1 ? " a little" : ` from ${h0} toward ${h1}`}. The past stays part of your story; it doesn't have to lead it.`);
    if (opts.faith && MF.Scripture) out.push(`With faith: Scripture speaks of pressing on toward what is ahead, of a new thing springing up, of mercies new every morning, and of forgiving as Christ forgave (${faithPassages().map(x => x.ref).join("; ")}).`);
    return out;
  }

  MF.Past = { SHOW, LP, LH, PAST, TECH, FUTURE, FAITH, detect, lines, faithPassages };
})(typeof window !== "undefined" ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
if (typeof module !== "undefined") module.exports = global.MF.Past;
