// core/kai.js — the Kai shield: steadiness under outside pressure (push23).
//
// From Ryan's story: Kai faces a storm of criticism, anchors in self-awareness,
// applies forbearance and empathy, and his respect guard blocks the barbs
// without harming anyone, so impulsive reaction "flickers and fails".
//
// It is merged INTO the master function (core/master.js), with no new movers:
//   X  outside hurt received (criticism / judgment AT you, 1 − e^(−0.7k));
//      distinct from you doing it (the Four Horsemen in your own words)
//   A  self-awareness  = (1 − G)·[1 − (1 − c_A)(1 − ½σ_A)]          G = true size max(g, u)
//   F  forbearance     = 1 − (1 − c_F)(1 − ½σ_F)(1 − p_F)   (the anger impulse itself is in I)
//   E  empathy         = 1 − (1 − c_E)(1 − ½σ_E)
//   R  respect guard   = (1 − c_attack)·[1 − (1 − c_R)(1 − ½σ_R)]   c_attack: your own contempt/criticism
//      each capped at V_MAX = 0.95; c_* = 1 − e^(−0.7k) for k cues (negation-aware);
//      σ_* = 1 when a matching practice was finished this session (pause, breathing,
//      labeling, the REACH "Empathize" step …), else 0; p_F = ½ for the picker's
//      "holding back" chip
//   S  shield          = 1 − (1 − A)(1 − F)(1 − E)(1 − R)   ∈ [0, 0.99] (capped so X(1 − S) > 0 stays visible)
//   push               e_j ← clip01(e_j + X·(1 − S)·w_j),  w = {anger .8, shame .6, fear .4}
//   I  impulsive reaction = X·(1 − S)·u,   u = max(e_anger after the push, c_urge)
//      "flickers and fails" when I < 0.15
//   lever = the weakest virtue (ties: A, F, E, R order), with one matching step.
//
// Bands for words: strong ≥ 0.6, growing ≥ 0.3, else just starting.
// With X = 0 nothing changes anywhere (no push, no card tile, no story).
//
// Sources (a model, not a validated measure):
//   self-awareness: affect labeling, Lieberman et al. (2007) Psychol Sci 18(5):421–428;
//     self-affirmation, Cohen & Sherman (2014) Annu Rev Psychol 65:333–371
//   forbearance: patience, Schnitker (2012) J Posit Psychol 7(4):263–280
//   empathy: perspective taking, Davis (1983) J Pers Soc Psychol 44(1):113–126 (the IRI)
//   respect guard: DEAR MAN, Linehan (2015) DBT Skills Training Manual, 2nd ed.;
//     assertiveness, Speed, Goldstein & Goldfried (2018) Clin Psychol Sci Pract 25(1):e12216
// The weights w and the ½ session/picker terms are modeling choices.

if (typeof module !== "undefined") require("./movers.js");

if (typeof window === "undefined") { require("../data/strings.js"); require("./equations.js"); }
(function (MF) {
  "use strict";
  const Str = MF.Strings;   // every word lives in js/data/strings.js
  const P = MF.Params, EQ = MF.Equations;   // every number: data/params.js; every equation: core/equations.js
  const { NAMES, idx, r2, clamp01 } = MF.Movers;

  const { S_MAX, V_MAX, FLICKER, SESSION, PICK_F, PICK_X, W } = P.kai;
  const ORDER = ["A", "F", "E", "R"];
  const NAME = { A: "self-awareness", F: "forbearance", E: "empathy", R: Str.t("kai.NAME.R") };
  /** With faith on: the fruits of the Spirit (Galatians 5:22–23). Words only; the numbers are the same. */
  const FRUIT = { A: "self-awareness", F: Str.t("kai.FRUIT.F"), E: Str.t("kai.FRUIT.E"), R: Str.t("kai.FRUIT.R") };
  /** Practices that count as a virtue practised this session. */
  const PRACTICE_VIRTUE = { pause: "F", waiting: "F", space: "F", surf: "F", cold: "F", pmr: "F", walk: "F", label: "A", kindness: "A", stop: "A", dump: "A", senses: "A", body: "A" };

  /** 1 − e^(−0.7k): k cues → a strength in [0, 1). */
  const cue = EQ.cue;
  const clean = t => String(t || "").toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, " ");
  const NEG = /^(not|never|no|nobody|noone|don't|didn't|doesn't|won't|wasn't|isn't|aren't|wouldn't|can't|cannot|couldn't|haven't|hasn't)$/;
  /** True when a negator sits in the four words before `at`, in the same clause. */
  function negated(t, at) {
    const before = t.slice(0, at).replace(/\bno one\b/g, "noone").split(/[.!?;,]|\bbut\b/).pop().match(/[a-z']+/g) || [];
    return before.slice(-4).some(w => NEG.test(w));
  }
  /** Count the patterns that match somewhere (negation-aware unless the pattern carries its own "not"). */
  function count(list, t, spans) {
    return list.filter(re => {
      const g = new RegExp(re.source, "g");
      let m;
      while ((m = g.exec(t))) {
        if (re.self || !negated(t, m.index)) { if (spans) spans.push([m.index, m.index + m[0].length]); return true; }
      }
      return false;
    }).length;
  }
  const own = re => Object.assign(re, { self: true });

  // ---------- Cues ----------
  const HURT = "criticized|criticised|criticizing|judged|judging|mocked|mocking|insulted|insulting|humiliated|belittled|shamed|blamed|ridiculed|attacked|bullied|teased|scolded|lectured|yelled at|shouted at|screamed at|snapped at|laughed at|made fun of|talked down to|put down|picked on|sneered at|rolled (?:his|her|their) eyes at|ganged up on|went off on|tore into|trashed";
  /** Outside hurt received (to me). */
  const TO_ME = [
    new RegExp(`\\b(?:${HURT}) me\\b`),
    /\bcalled me (?:a |an )?[a-z]+/,
    /\b(?:told|tells|telling) me (?:that )?i(?:'m| am| was) (?:useless|stupid|lazy|worthless|a failure|an idiot|not good enough|too [a-z]+|bad at|wrong|terrible|hopeless)/,
    /\b(?:said|says|saying) (?:that )?i(?:'m| am| was) (?:useless|stupid|lazy|worthless|a failure|an idiot|not good enough|terrible|bad|wrong|hopeless|selfish)\b/,
    /\b(?:said|says|saying) i (?:always|never)\b/,
    new RegExp(`\\b(?:was|were|got|getting|being|been|am|i'm|feel|felt) (?:${HURT.replace(/ (?:at|on|of|to|down)\b/g, "")})\\b(?! (?:him|her|them|it)\\b)`),
    /\b(?:storm|wave|barrage|flood|pile|lot|lots) of (?:criticism|judgment|judgement|insults|abuse|hate|harsh words|mean comments)\b/,
    /\b(?:everyone|everybody|people|they|he|she) (?:think|thinks|thought) i(?:'m| am| was) (?:stupid|lazy|useless|a failure|worthless|an idiot|a joke|weird|pathetic)\b/,
    /\b(?:gave|give|gives|giving) me the (?:silent treatment|cold shoulder)\b/,
    /\bshut(?:s|ting)? me out\b/,
  ];
  /** "in front of everyone" makes a received hurt heavier (counted only with another cue). */
  const PUBLIC = [/\bin front of (?:everyone|everybody|the (?:whole )?(?:team|class|office|family)|people|others|them all)\b/];
  const A_CUES = [
    /\bi (?:feel|felt|am feeling|'m feeling) (?:hurt|angry|sad|embarrassed|ashamed|anxious|nervous|upset|frustrated|annoyed|scared|afraid|small|humiliated|stung|defensive|rejected)\b/,
    /\bi(?:'m| am) (?:hurt|stung|feeling hurt)\b/,
    /\bi (?:notice|noticed|can name|can see that i)\b/,
    /\bi(?:'m| am) aware\b/,
    /\b(?:i know|i remember|remembering|recognizing|recognising) (?:my|i have) (?:own )?worth\b/,
    /\bi(?:'m| am) (?:still )?(?:enough|worthy|worth (?:it|respect|something))\b/,
    /\bi know who i am\b/,
    /\bi(?:'m| am) (?:still )?(?:a )?good (?:person|enough)\b/,
  ];
  const F_CUES = [
    own(/\b(?:want|wanted|urge|tempted) to (?:snap|yell|shout|scream|argue|lash out|fire back|talk back|hit back)(?: back)?,? but\b/),
    /\bh(?:o|e)ld(?:ing)? (?:back|my tongue)\b/,
    /\bbit my tongue\b/,
    own(/\b(?:didn't|did not|won't|will not|chose not to|decided not to|not going to) (?:argue|snap|yell|react|fight back|retaliate|lash out|answer back)\b/),
    /\b(?:took|take|taking) a (?:deep |slow |long )?breath\b/,
    /\bdeep breath\b/,
    /\b(?:stayed|stay|staying|kept|keep|keeping) (?:calm|quiet|patient|steady)\b/,
    /\b(?:be|being|was) patient\b/,
    /\blet it (?:go|pass|slide)\b/,
    /\bcount(?:ed)? to ten\b/,
  ];
  const E_CUES = [
    /\b(?:they|he|she|my [a-z]+) (?:must|might|may) (?:be|have been) (?:hurting|stressed|tired|scared|struggling|overwhelmed|under pressure|having a (?:hard|bad|rough) (?:day|time|week)|going through)/,
    /\b(?:they're|they are|he's|he is|she's|she is) (?:just |really |so |probably |also )?(?:stressed|tired|hurting|struggling|overwhelmed|scared|exhausted|under (?:a lot of )?pressure|going through)/,
    /\bhaving a (?:hard|bad|rough) (?:day|time|week)\b/,
    /\bin (?:their|his|her) shoes\b/,
    /\bfrom (?:their|his|her) (?:side|point of view|perspective)\b/,
    /\bi (?:can )?understand (?:why|them|him|her|their)\b/,
    /\b(?:they|he|she) (?:have|has|had) (?:a lot|so much) going on\b/,
    /\b(?:their|his|her) (?:own )?pain\b/,
  ];
  const R_CUES = [
    /\bi see it differently\b/,
    /\bi (?:respectfully )?disagree\b/,
    /\bi hear you\b/,
    /\bi(?:'m| am) going to step away\b/,
    /\bi(?:'ll| will) step away\b/,
    /\bi need (?:you to|some space|a break|time|a minute)\b/,
    own(/\bplease (?:don't|do not|stop)\b/),
    /\b(?:set|setting|hold|holding|held|keep|keeping) (?:a |my )?boundar(?:y|ies)\b/,
    own(/\bi won't accept\b/),
    own(/\bthat's not okay with me\b/),
    /\b(?:calmly|kindly|firmly) (?:said|told|asked|answered)\b/,
    /\bstood my ground\b/,
    /\brespectfully\b/,
  ];
  const URGE = [
    /\b(?:want|wanted|urge|tempted|itching|ready) to (?:snap|yell|shout|scream|hit|punch|lash out|fire back|argue|talk back|tell (?:them|him|her) off|get back at|explode)\b/,
    /\bsnap back\b/,
    /\bso (?:mad|angry) i could\b/,
    /\babout to (?:explode|lose it|snap)\b/,
  ];
  /** Your own attack words (the respect guard drops when you attack): insults and contempt aimed out. */
  const ATTACK = [/\bi (?:yelled|screamed|shouted|snapped) at (?:him|her|them|my [a-z]+)\b/, /\bi (?:insulted|mocked|humiliated|called) (?:him|her|them)\b/];

  /**
   * Text → the Kai cues (counts and strengths). Never stores the text.
   * byMe: Four Horsemen contempt / criticism in your own words, after the to-me spans are removed.
   * @param {string} text
   */
  function cues(text) {
    const t = clean(text);
    if (!t.trim()) return null;
    const spans = [];
    const kx = count(TO_ME, t, spans);
    const kxAll = kx ? kx + count(PUBLIC, t) : 0;
    // Remove the to-me spans before looking for patterns in your own words.
    let rest = t;
    spans.sort((p, q) => q[0] - p[0]).forEach(([a, b]) => { rest = rest.slice(0, a) + " ".repeat(b - a) + rest.slice(b); });
    const rel = MF.Relationship ? MF.Relationship.detect(rest) : [];
    const byMe = rel.filter(k => k === "contempt" || k === "criticism");
    const kAttack = byMe.length + count(ATTACK, rest);
    return {
      kX: kxAll, X: cue(kxAll), kA: count(A_CUES, t), kF: count(F_CUES, t), kE: count(E_CUES, t), kR: count(R_CUES, t),
      kUrge: count(URGE, t), byMe, attack: cue(kAttack),
    };
  }
  /** Word hook: data only (no nudges here; the push happens inside master with the shield). */
  function hook(text) {
    const c = cues(text);
    if (!c || (!c.kX && !c.kA && !c.kF && !c.kE && !c.kR && !c.kUrge && !c.attack)) return null;
    return { data: { kai: c }, notes: c.kX ? Str.list("kai.hook.notes") : [] };
  }
  MF.Movers.addWordHook(hook);
  // Picker chips (no text): "criticized or judged" sets X = 0.75 (two cues' worth);
  // "holding back from reacting" sets p_F = ½.
  const JUDGED = { id: "judged", label: Str.t("kai.JUDGED.label"), fn: () => ({ notes: Str.list("kai.fn.notes"), data: { kaiPickX: PICK_X } }) };
  const HOLDBACK = { id: "holdback", label: Str.t("kai.HOLDBACK.label"), fn: () => ({ data: { kaiPickF: PICK_F } }) };
  MF.Movers.addPickExtra(JUDGED);
  MF.Movers.addPickExtra(HOLDBACK);

  /**
   * The shield for a reading. Pure and deterministic.
   * @param {number[]} e the reading's vector (before the push)
   * @param {object} data the words' data (data.kai cues, data.kaiPickX / data.kaiPickF from picker chips)
   * @param {object} [session] virtues practised this session {A?, F?, E?, R?} (truthy = done)
   * @param {number} [G] the true-size signal max(g, u)
   * @returns {{X:number, A:number, F:number, E:number, R:number, S:number, shield:number, push:number[], I:number, u:number, lever:string, cues:object}}
   */
  function shield(e, data = {}, session = {}, G = 0) {
    const c = data.kai || { kX: 0, X: 0, kA: 0, kF: 0, kE: 0, kR: 0, kUrge: 0, byMe: [], attack: 0 };
    const s = k => (session && session[k] ? SESSION : 0);
    const { X, A, F, E, R, S, load, push } = EQ.kaiShield(c, s, data.kaiPickX, data.kaiPickF, G, e[idx.anger], NAMES);   // OE §Kai
    const { u, I } = EQ.kaiImpulse(load, clamp01(e[idx.anger] + push[idx.anger]), c.kUrge);
    const vals = { A, F, E, R };
    const lever = ORDER.reduce((best, k) => (vals[k] < vals[best] - 1e-9 ? k : best), ORDER[0]);
    return { X, A, F, E, R, S, load: r2(load), push, I, u, lever, cues: c };
  }
  /** e_j ← clip01(e_j + X(1 − S)w_j), rounded to 0.01 (identity when X = 0). */
  const apply = EQ.kaiApply;

  // ---------- Words (card, story, Ada) ----------
  /** strong ≥ 0.6, growing ≥ 0.3, else just starting. */
  const level = v => (v >= P.kai.LEVEL[1] ? "strong" : v >= P.kai.LEVEL[0] ? "growing" : Str.t("kai.level.just_starting"));
  /** One step for each virtue (words only). */
  const STEP = {
    A: Str.t("kai.STEP.A"),
    F: Str.t("kai.STEP.F"),
    E: Str.t("kai.STEP.E"),
    R: Str.t("kai.STEP.R"),
  };
  const SOURCE = {
    A: Str.t("kai.SOURCE.A"),
    F: Str.t("kai.SOURCE.F"),
    E: Str.t("kai.SOURCE.E"),
    R: Str.t("kai.SOURCE.R"),
  };
  /** The impulsive-reaction line (with faith on, named as self-control, a fruit of the Spirit). */
  function impulseLine(k, faith) {
    const pre = faith ? "Self-control: " : "";
    if (k.I < FLICKER) return Str.t("kai.impulseLine.urge_to_react_flickers_and", { pre: pre, v1: faith ? "the" : "The" });
    if (k.I < P.kai.STRONG_I) return Str.t("kai.impulseLine.urge_to_react_is_there", { pre: pre, v1: faith ? "the" : "The" });
    return Str.t("kai.impulseLine.urge_to_react_is_strong", { pre: pre, v1: faith ? "the" : "The" });
  }
  /**
   * The card lines (words only, no digits), only when outside hurt is present.
   * @param {object} m master output (m.kai)
   * @param {{faith?:boolean}} [opts]
   * @returns {string[]}
   */
  function cardLines(m, opts = {}) {
    const k = m && m.kai;
    if (!k || !(k.X > 0)) return [];
    const nm = opts.faith ? FRUIT : NAME;
    const out = [
      Str.t("kai.cardLines.out.your_steadiness", { v0: ORDER.map(v => `${nm[v]} ${level(k[v])}`).join(", ") }),
      impulseLine(k, !!opts.faith),
      Str.t("kai.cardLines.out.the_weakest_part_of_the", { v0: nm[k.lever].replace(/^(?=respect|the)/, "the ").replace(/^the the /, "the "), v1: STEP[k.lever] }),
    ];
    if (opts.faith) out.push(Str.t("kai.cardLines.with_faith_these_are_fruits"));
    return out;
  }
  /** Ada's lines (numbers). */
  function mathLines(m) {
    const k = m && m.kai;
    if (!k) return [];
    const f = x => x.toFixed(2);
    return [
      Str.t("kai.mathLines.kai_shield_outside_pressure_x", { v0: f(k.X), kX: k.cues.kX, v2: k.cues.byMe.length ? k.cues.byMe.join(", ") : "none" }),
      `  A = (1 \u2212 G)\u00B7[1 \u2212 (1 \u2212 c_A)(1 \u2212 \u00BD\u03C3_A)] = ${f(k.A)}   F = 1 \u2212 (1 \u2212 c_F)(1 \u2212 \u00BD\u03C3_F)(1 \u2212 p_F) = ${f(k.F)}`,
      Str.t("kai.mathLines.e_1_1_c_e", { v0: f(k.E), v1: f(k.R), V_MAX: V_MAX }),
      Str.t("kai.mathLines.s_1_1_a_1", { v0: f(k.S), v1: f(k.load), anger: W.anger, shame: W.shame, fear: W.fear, v5: f(k.push[idx.anger]), v6: f(k.push[idx.shame]), v7: f(k.push[idx.fear]) }),
      Str.t("kai.mathLines.i_x_1_s_u", { v0: f(k.I), v1: f(k.u), FLICKER: FLICKER, v3: NAME[k.lever] }),
    ];
  }

  /**
   * A Kai-style story: a traveler stands calm in a storm of words; each virtue
   * line follows its level; the weakest is shown growing. Faith adds a Christ-centered line.
   * @param {object} m master output (needs m.kai with X > 0)
   * @param {{traveler?:string, friend?:string, faith?:boolean}} [opts]
   * @returns {{text:string, sentences:string[], lever:string}|null}
   */
  function story(m, opts = {}) {
    const k = m && !m.crisis && m.kai;
    if (!k || !(k.X > 0)) return null;
    const who = String(opts.traveler || "Kai").replace(/[^\p{L}\p{M} '\-]/gu, "").trim().slice(0, 20) || "Kai";
    const friend = opts.friend ? String(opts.friend).replace(/[^\p{L}\p{M} '\-]/gu, "").trim().slice(0, 20) : "";
    const L = v => level(k[v]);
    const lines = {
      A: { strong: Str.t("kai.story.lines.A.strong", { who: who }),
        growing: Str.t("kai.story.lines.A.growing", { who: who }),
        "just starting": Str.t("kai.story.lines.A.just_starting", { who: who }) },
      F: { strong: Str.t("kai.story.lines.F.strong", {  }),
        growing: Str.t("kai.story.lines.F.growing", {  }),
        "just starting": Str.t("kai.story.lines.F.just_starting", {  }) },
      E: { strong: Str.t("kai.story.lines.E.strong", {  }),
        growing: Str.t("kai.story.lines.E.growing", {  }),
        "just starting": Str.t("kai.story.lines.E.just_starting", {  }) },
      R: { strong: Str.t("kai.story.lines.R.strong", {  }),
        growing: Str.t("kai.story.lines.R.growing", {  }),
        "just starting": Str.t("kai.story.lines.R.just_starting", {  }) },
    };
    const sentences = [Str.t("kai.story.sentences.faced_a_storm_of_words", { who: who })];
    if (friend) sentences.push(Str.t("kai.story.his_small_friend_stayed_close", { friend: friend }));
    ORDER.forEach(v => sentences.push(lines[v][L(v)]));
    sentences.push(k.I < FLICKER ? Str.t("kai.story.impulsive_reaction_flickered_and_failed") : k.I < 0.35 ? Str.t("kai.story.impulsive_reaction_flickered_and_the") : Str.t("kai.story.impulsive_reaction_pushed_hard_so"));
    sentences.push(Str.t("kai.story.stood_unmoved_a_calm_center", { who: who }));
    sentences.push(Str.t("kai.story.his_was_the_part_still", { v0: NAME[k.lever] }));
    if (opts.faith) sentences.push(Str.t("kai.story.remembered_jesus_before_his_accusers", { who: who }));
    sentences.push({ A: Str.t("kai.story.A"), F: Str.t("kai.story.F"), E: Str.t("kai.story.E"), R: Str.t("kai.story.R") }[k.lever]);
    return { text: sentences.join(" "), sentences, lever: k.lever, traveler: who };
  }

  MF.Kai = { JUDGED, HOLDBACK, S_MAX, V_MAX, FLICKER, SESSION, PICK_F, PICK_X, W, ORDER, NAME, FRUIT, PRACTICE_VIRTUE, STEP, SOURCE, TO_ME, A_CUES, F_CUES, E_CUES, R_CUES, URGE, cue, negated, cues, hook, shield, apply, level, impulseLine, cardLines, mathLines, story };
})(typeof window !== "undefined" ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
if (typeof module !== "undefined") module.exports = global.MF.Kai;
