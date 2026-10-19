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

(function (MF) {
  "use strict";
  const { NAMES, idx, r2, clamp01 } = MF.Movers;

  const S_MAX = 0.99, V_MAX = 0.95, FLICKER = 0.15, SESSION = 0.5, PICK_F = 0.5, PICK_X = 0.75;
  const W = { anger: 0.8, shame: 0.6, fear: 0.4 };
  const ORDER = ["A", "F", "E", "R"];
  const NAME = { A: "self-awareness", F: "forbearance", E: "empathy", R: "respect guard" };
  /** With faith on: the fruits of the Spirit (Galatians 5:22–23). Words only; the numbers are the same. */
  const FRUIT = { A: "self-awareness", F: "patience (forbearance)", E: "kindness (empathy)", R: "gentleness (the respect guard)" };
  /** Practices that count as a virtue practised this session. */
  const PRACTICE_VIRTUE = { pause: "F", waiting: "F", space: "F", surf: "F", cold: "F", pmr: "F", walk: "F", label: "A", kindness: "A", stop: "A", dump: "A", senses: "A", body: "A" };

  /** 1 − e^(−0.7k): k cues → a strength in [0, 1). */
  const cue = k => r2(1 - Math.exp(-0.7 * Math.max(0, k)));
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
    return { data: { kai: c }, notes: c.kX ? ["outside criticism or judgment"] : [] };
  }
  MF.Movers.addWordHook(hook);
  // Picker chips (no text): "criticized or judged" sets X = 0.75 (two cues' worth);
  // "holding back from reacting" sets p_F = ½.
  const JUDGED = { id: "judged", label: "criticized or judged", fn: () => ({ notes: ["outside criticism or judgment"], data: { kaiPickX: PICK_X } }) };
  const HOLDBACK = { id: "holdback", label: "holding back from reacting", fn: () => ({ data: { kaiPickF: PICK_F } }) };
  MF.Movers.addPickExtra(JUDGED);
  MF.Movers.addPickExtra(HOLDBACK);

  const cap = x => Math.min(V_MAX, Math.max(0, x));
  const or = (...xs) => 1 - xs.reduce((p, x) => p * (1 - x), 1);
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
    const X = r2(Math.max(c.X, data.kaiPickX || 0));
    const A = r2(cap((1 - G) * or(cue(c.kA), s("A"))));
    const F = r2(cap(or(cue(c.kF), s("F"), data.kaiPickF || 0)));
    const E = r2(cap(or(cue(c.kE), s("E"))));
    const R = r2(cap((1 - c.attack) * or(cue(c.kR), s("R"))));
    const S = Math.min(S_MAX, r2(1 - (1 - A) * (1 - F) * (1 - E) * (1 - R)));
    const load = X * (1 - S);
    const push = NAMES.map(n => r2(load * (W[n] || 0)));
    const after = clamp01(e[idx.anger] + push[idx.anger]);
    const u = r2(Math.max(after, cue(c.kUrge)));
    const I = r2(load * u);
    const vals = { A, F, E, R };
    const lever = ORDER.reduce((best, k) => (vals[k] < vals[best] - 1e-9 ? k : best), ORDER[0]);
    return { X, A, F, E, R, S, load: r2(load), push, I, u, lever, cues: c };
  }
  /** e_j ← clip01(e_j + X(1 − S)w_j), rounded to 0.01 (identity when X = 0). */
  const apply = (e, k) => (k && k.X > 0 ? e.map((x, j) => r2(clamp01(x + k.push[j]))) : e);

  // ---------- Words (card, story, Ada) ----------
  /** strong ≥ 0.6, growing ≥ 0.3, else just starting. */
  const level = v => (v >= 0.6 ? "strong" : v >= 0.3 ? "growing" : "just starting");
  /** One step for each virtue (words only). */
  const STEP = {
    A: "Self-awareness: name it to yourself, \u201CI feel hurt, and I am still worth respect.\u201D",
    F: "Forbearance: before you answer, breathe out slowly three times, then decide what to say.",
    E: "Empathy: ask yourself once, \u201CWhat might they be carrying today?\u201D Understanding isn't agreeing.",
    R: "Respect guard: say, \u201CI hear you. I see it differently, and I'm going to step away now.\u201D",
  };
  const SOURCE = {
    A: "affect labeling: Lieberman et al., 2007; self-affirmation: Cohen & Sherman, 2014",
    F: "patience: Schnitker, 2012",
    E: "perspective taking: Davis, 1983",
    R: "DEAR MAN and assertiveness: Linehan, 2015; Speed, Goldstein & Goldfried, 2018",
  };
  /** The impulsive-reaction line (with faith on, named as self-control, a fruit of the Spirit). */
  function impulseLine(k, faith) {
    const pre = faith ? "Self-control: " : "";
    if (k.I < FLICKER) return `${pre}${faith ? "the" : "The"} urge to react flickers and fails; it can't break your balance.`;
    if (k.I < 0.35) return `${pre}${faith ? "the" : "The"} urge to react is there, and your shield is holding.`;
    return `${pre}${faith ? "the" : "The"} urge to react is strong right now. Steady first; you can answer later.`;
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
      `Your steadiness: ${ORDER.map(v => `${nm[v]} ${level(k[v])}`).join(", ")}.`,
      impulseLine(k, !!opts.faith),
      `The weakest part of the shield is ${nm[k.lever].replace(/^(?=respect|the)/, "the ").replace(/^the the /, "the ")}; it can grow. ${STEP[k.lever]}`,
    ];
    if (opts.faith) out.push("With faith: these are fruits of the Spirit, and steadiness can rest in Christ, who gives rest to the weary (from Galatians and Matthew). Same numbers, faith words.");
    return out;
  }
  /** Ada's lines (numbers). */
  function mathLines(m) {
    const k = m && m.kai;
    if (!k) return [];
    const f = x => x.toFixed(2);
    return [
      `Kai shield (outside pressure): X = ${f(k.X)} (k = ${k.cues.kX} to-me cues; by me: ${k.cues.byMe.length ? k.cues.byMe.join(", ") : "none"})`,
      `  A = (1 \u2212 G)\u00B7[1 \u2212 (1 \u2212 c_A)(1 \u2212 \u00BD\u03C3_A)] = ${f(k.A)}   F = 1 \u2212 (1 \u2212 c_F)(1 \u2212 \u00BD\u03C3_F)(1 \u2212 p_F) = ${f(k.F)}`,
      `  E = 1 \u2212 (1 \u2212 c_E)(1 \u2212 \u00BD\u03C3_E) = ${f(k.E)}   R = (1 \u2212 c_attack)\u00B7[1 \u2212 (1 \u2212 c_R)(1 \u2212 \u00BD\u03C3_R)] = ${f(k.R)}   (each \u2264 ${V_MAX})`,
      `  S = 1 \u2212 (1 \u2212 A)(1 \u2212 F)(1 \u2212 E)(1 \u2212 R) = ${f(k.S)};  X(1 \u2212 S) = ${f(k.load)};  push = X(1 \u2212 S)\u00B7w, w = {anger ${W.anger}, shame ${W.shame}, fear ${W.fear}} \u2192 +${f(k.push[idx.anger])}, +${f(k.push[idx.shame])}, +${f(k.push[idx.fear])}`,
      `  I = X(1 \u2212 S)\u00B7u = ${f(k.I)} (u = ${f(k.u)}; flickers and fails below ${FLICKER});  lever = weakest virtue: ${NAME[k.lever]}`,
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
      A: { strong: `With a deep breath, ${who} anchored in self-awareness, naming what he felt and remembering his own worth.`,
        growing: `With a deep breath, ${who} began to name what he felt, and to remember that his worth was still his.`,
        "just starting": `${who} took one breath and tried a first small sentence of self-awareness: \u201CI feel hurt, and I am still worth respect.\u201D` },
      F: { strong: `He applied forbearance, holding back the urge to argue.`,
        growing: `The urge to argue tugged at him; forbearance let one slow breath go first.`,
        "just starting": `Forbearance was only a seed today, so he paused for one breath before answering.` },
      E: { strong: `With empathy he saw the pain behind the villagers' words.`,
        growing: `He wondered, with growing empathy, what the villagers might be carrying.`,
        "just starting": `Empathy was just starting; he asked himself once what they might be carrying.` },
      R: { strong: `His respect guard shone like a shield, blocking the barbs of judgment without harming anyone.`,
        growing: `His respect guard was growing, a shield he could lift: \u201CI hear you. I see it differently.\u201D`,
        "just starting": `His respect guard was just starting, so he practiced one calm sentence: \u201CI hear you. I see it differently, and I'm going to step away now.\u201D` },
    };
    const sentences = [`${who} faced a storm of words in the village square.`];
    if (friend) sentences.push(`${friend}, his small friend, stayed close beside him.`);
    ORDER.forEach(v => sentences.push(lines[v][L(v)]));
    sentences.push(k.I < FLICKER ? "Impulsive reaction flickered and failed, unable to break his balance." : k.I < 0.35 ? "Impulsive reaction flickered, and the shield held." : "Impulsive reaction pushed hard, so he stepped back to steady himself first; that was strength too.");
    sentences.push(`${who} stood unmoved, a calm center of peace in the storm.`);
    sentences.push(`His ${NAME[k.lever]} was the part still growing, and that was all right; it grows a little each time he practices.`);
    if (opts.faith) sentences.push(`${who} remembered Jesus before his accusers, who answered nothing, like a sheep that is silent before its shearers (from Matthew and Isaiah); when he was cursed, he didn't curse back (from First Peter), and he prayed, \u201CFather, forgive them\u201D (from Luke). Patience, kindness, gentleness and self-control are fruits of the Spirit (from Galatians).`);
    sentences.push({ A: "What is one true sentence about your worth you could keep today?", F: "Where could one slow breath fit before you answer?", E: "What might they be carrying that you can't see?", R: "What is one calm sentence your respect guard could say today?" }[k.lever]);
    return { text: sentences.join(" "), sentences, lever: k.lever, traveler: who };
  }

  MF.Kai = { JUDGED, HOLDBACK, S_MAX, V_MAX, FLICKER, SESSION, PICK_F, PICK_X, W, ORDER, NAME, FRUIT, PRACTICE_VIRTUE, STEP, SOURCE, TO_ME, A_CUES, F_CUES, E_CUES, R_CUES, URGE, cue, negated, cues, hook, shield, apply, level, impulseLine, cardLines, mathLines, story };
})(typeof window !== "undefined" ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
if (typeof module !== "undefined") module.exports = global.MF.Kai;
