// features/relationship.js — Gottman's "Four Horsemen", as a gentle pattern helper.
//
// Detects four conflict patterns in what you typed and, after Update, shows a
// words-only note with the antidote and one example phrase:
//   criticism      ("you always/never…")              → gentle startup
//   contempt       (sarcasm, insults, eye-rolling)    → a culture of appreciation
//   defensiveness  ("it's not my fault", "yes, but") → take responsibility for a small part
//   stonewalling   ("I'm done talking", walked out)   → self-soothe + a structured break
//
// No new movers or variables: each pattern only nudges existing movers
// (criticism → anger; contempt → anger + shame; defensiveness → shame + fear;
// stonewalling → avoidance and lower connection) through a word hook in
// core/movers.js, so master() stays the one function that computes everything.
//
// Sources: Gottman & Levenson (1992), J Pers Soc Psychol 63(2):221–233;
// Gottman (1994), What Predicts Divorce?; Gottman & Levenson (2000), J Marriage
// Fam 62(3):737–745. The high prediction accuracies reported in this line of
// work come from small samples and are debated (e.g. Heyman & Slep, 2001,
// J Marriage Fam 63(2):473–479, on missing cross-validation). This is a pattern
// helper for one message, not a predictor of any relationship.

if (typeof module !== "undefined") require("../core/movers.js");

if (typeof window === "undefined") require("../data/strings.js");
(function (MF) {
  "use strict";
  const Str = MF.Strings;   // every word lives in js/data/strings.js
  const G = typeof Grounding !== "undefined" ? Grounding : require("../core/grounding.js");

  // Words that cancel a match when they come up to three words before it.
  const NEGATORS = /^(not|never|no|don't|didn't|doesn't|won't|wasn't|isn't|aren't|wouldn't|shouldn't|can't|cannot|stop|stopped)$/;

  /** The four patterns: how to spot them, how they nudge the movers, and the antidote. */
  const HORSEMEN = {
    criticism: {
      name: "Criticism",
      patterns: [/\byou (always|never)\b/, /\bwhat'?s wrong with you\b/, /\bwhy can'?t you (ever|just)\b/, /\byou'?re (so |always )?(selfish|lazy|careless|inconsiderate|thoughtless|useless)\b/, /\byou (only|just) (ever )?care about yourself\b/],
      add: { anger: 0.4 },
      antidote: Str.t("relationship.HORSEMEN.criticism.antidote"),
      example: Str.t("relationship.HORSEMEN.criticism.example"),
    },
    contempt: {
      name: "Contempt",
      patterns: [/\bpathetic\b/, /\bdisgusting\b/, /\byou'?re (such )?(an? )?(idiot|loser|moron|joke|clown)\b/, /\b(what an?|such an?) (idiot|loser|moron)\b/, /\broll(ed|ing)? (my|her|his|their) eyes\b/, /\beye[- ]?roll/, /\byeah,? right\b/, /\boh,? (great|sure|brilliant|wonderful|perfect),? (job|idea|move)?\b/, /\bmock(ed|ing)?\b/, /\bsneer(ed|ing)?\b/],
      add: { anger: 0.4, shame: 0.3 },
      antidote: Str.t("relationship.HORSEMEN.contempt.antidote"),
      example: Str.t("relationship.HORSEMEN.contempt.example"),
    },
    defensiveness: {
      name: "Defensiveness",
      patterns: [/\bit'?s not my fault\b/, /\bit is not my fault\b/, /\b(yes|yeah),? but\b/, /\bi didn'?t do anything wrong\b/, /\bwhat about (you|when you)\b/, /\byou do it too\b/, /\byou'?re one to talk\b/, /\bwell,? you started it\b/, /\bthat'?s not what i said\b/],
      add: { shame: 0.3, fear: 0.3 },
      antidote: Str.t("relationship.HORSEMEN.defensiveness.antidote"),
      example: Str.t("relationship.HORSEMEN.defensiveness.example"),
    },
    stonewalling: {
      name: "Stonewalling",
      patterns: [/\b(i'?m|i am) done talking\b/, /\bdone talking\b/, /\bshut(s|ting)? (down|me out|him out|her out|them out)\b/, /\bsilent treatment\b/, /\bwalk(ed|ing|s)? out\b/, /\bstopped (talking|responding|answering)\b/, /\bcold shoulder\b/, /\b(won'?t|refuse to) (talk|speak) to (him|her|them|me)\b/],
      add: { avoidance: 0.5 },
      neg: { connection: 0.4 },
      antidote: Str.t("relationship.HORSEMEN.stonewalling.antidote"),
      example: Str.t("relationship.HORSEMEN.stonewalling.example"),
    },
  };
  const ORDER = ["criticism", "contempt", "defensiveness", "stonewalling"];

  /** Lower-case, straight apostrophes, single spaces. */
  const clean = text => String(text || "").toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, " ");

  /**
   * True when one of the four words before position `at`, inside the same
   * clause (stops at . ! ? ; or a comma), is a negator ("I didn't give him the silent treatment").
   */
  function negated(t, at) {
    const sentence = t.slice(0, at).split(/[.!?;,]/).pop();
    const before = sentence.match(/[a-z']+/g) || [];
    return before.slice(-4).some(w => NEGATORS.test(w));
  }

  /**
   * Find the Four Horsemen patterns in a text (negation-aware).
   * Crisis wording returns [] so that only the crisis box is shown.
   * @param {string} text
   * @returns {string[]} keys in a fixed order (criticism, contempt, defensiveness, stonewalling)
   */
  function detect(text) {
    const t = clean(text);
    if (!t.trim() || G.isCrisis(t)) return [];
    return ORDER.filter(k => HORSEMEN[k].patterns.some(re => {
      const g = new RegExp(re.source, "g");
      let m;
      while ((m = g.exec(t))) if (!negated(t, m.index)) return true;
      return false;
    }));
  }

  /** The word hook for core/movers.js: small nudges onto existing movers only. */
  function hook(text) {
    const found = detect(text);
    if (!found.length) return null;
    const add = {}, neg = {};
    found.forEach(k => {
      Object.entries(HORSEMEN[k].add || {}).forEach(([n, v]) => { add[n] = (add[n] || 0) + v; });
      Object.entries(HORSEMEN[k].neg || {}).forEach(([n, v]) => { neg[n] = (neg[n] || 0) + v; });
    });
    return { add, neg, notes: found.map(k => `${HORSEMEN[k].name.toLowerCase()} pattern`), found };
  }
  MF.Movers.addWordHook(hook);

  /**
   * The card section for detected patterns (words only).
   * @param {string[]} found keys from detect()
   * @returns {Array<{title:string, antidote:string, example:string}>}
   */
  function section(found) {
    return (found || []).map(k => ({ title: Str.t("relationship.title", { name: HORSEMEN[k].name }), antidote: HORSEMEN[k].antidote, example: HORSEMEN[k].example }));
  }

  MF.Relationship = { HORSEMEN, ORDER, NEGATORS, clean, negated, detect, hook, section };
})(typeof window !== "undefined" ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
if (typeof module !== "undefined") module.exports = global.MF.Relationship;
