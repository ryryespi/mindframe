// core/words.js — THE COMPOSER: every sentence on the card is built from the
// master function's numbers. There are no fixed reply lists.
//
// Each sentence is put together from small grammar parts:
//   subject        a mover's noun ("the anger") or "part of you"
//   feeling word   FEEL[mover] ("angry"); grounding movers use their low word ("alone")
//   intensity      band(x): < 0.3 a little, 0.3–0.6 quite, > 0.6 strongly,
//                  then a degree word for that band (DEGREE)
//   link verb      chosen by the SIGN and STRENGTH of the coupling W_ij between
//                  two movers (LINK_VERB): + strong "fuels", + weak "nudges",
//                  − toward a grounding mover "wears down", stabilizer "softens"
//   direction      gain_j = |e_j − h_j| − |next_j − h_j| from the master step:
//                  which mover eases, and by how much ("loosens its grip a little")
//   conflicts      the pulls in master's conflicts[] with the strength c
//   grandiosity    master's grand.g and its kinds ("very sure that the worst will happen")
//   dose           the distance d sets the size of the step ("two" / "five" / "ten" minutes)
//
// Choices between equal parts (for example "fuels" or "feeds") are made by a
// hash of the seed and the numbers themselves (choose()), so the same state
// and seed always give the same words, and different numbers give different words.
//
// The only fixed text kept on purpose is safety wording: the crisis box (in
// js/app.js) and short, true, non-medical phrases. No diagnoses, no promises.
// Output is words only; the numbers are in Ada's (Scientist) panel.

if (typeof module !== "undefined") {
  require("./movers.js");
  require("./reality.js");
}

(function (MF) {
  "use strict";
  const { NAMES, GROUND, HARD, FIXED, ACTIVE, idx, isGround, cap, listJoin, weights } = MF.Movers;
  const { G_SHOW } = MF.Reality;

  // ---------- Deterministic choice ----------
  /** FNV-1a hash of a string (32-bit, unsigned). */
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  /**
   * Pick one of several equal grammar parts. The key carries the numbers that
   * drive the sentence, so a change in e, step, d or c can change the word,
   * while the same numbers and seed always give the same word.
   * @param {string[]} list
   * @param {string} key  for example "link|anger|0.86|rumination|0.6"
   * @param {number} [seed=1]
   */
  const choose = (list, key, seed = 1) => list[hash(`${seed}|${key}`) % list.length];
  /** Two-decimal string for hash keys. */
  const k2 = x => (Math.round(x * 100) / 100).toFixed(2);

  // ---------- Grammar parts ----------
  /** Intensity band for a value: < 0.3 a little, 0.3–0.6 quite, > 0.6 strongly. */
  const band = x => (x > 0.6 ? "strongly" : x >= 0.3 ? "quite" : "a little");
  /** Degree words per band (the band decides; the hash picks within it). */
  const DEGREE = { strongly: ["strongly", "deeply"], quite: ["quite", "fairly"], "a little": ["a little", "slightly"] };
  /** Adverbs for adjectives ("very afraid"). */
  const ADV = { strongly: ["very", "really"], quite: ["quite", "fairly"], "a little": ["a little", "slightly"] };
  /** Size words for a mover as a noun ("the anger is loud"). */
  const SIZE = { strongly: ["strong", "loud"], quite: ["present", "noticeable"], "a little": ["faint", "small"] };
  const FEEL = {
    fear: "anxious", sadness: "sad", anger: "angry", shame: "ashamed",
    rumination: "caught in replaying thoughts", avoidance: "pulled to avoid things",
    calm: "restless", connection: "alone", hope: "discouraged",
  };
  const FEEL_HIGH = { calm: "calm", connection: "connected", hope: "hopeful" };
  const NOUN = { fear: "fear", sadness: "sadness", anger: "anger", shame: "shame", rumination: "the replaying", avoidance: "avoiding", calm: "calm", connection: "connection", hope: "hope" };
  /** Nouns for a low grounding mover. */
  const LOW_NOUN = { calm: "restlessness", connection: "loneliness", hope: "discouragement" };
  const SOFTENER = { calm: "slowing down", connection: "connection", hope: "hope" };
  /** Subject form of a mover inside a sentence. */
  const subj = n => (HARD.includes(n) ? `the ${NOUN[n]}` : NOUN[n]);
  /**
   * Link verbs by the sign and strength of a coupling W_ij.
   * up: i raises j (hard/process target); down: i lowers grounding j; soft: grounding i softens j.
   */
  const LINK_VERB = {
    up: { strong: ["fuels", "feeds"], mid: ["stirs up", "adds to"], weak: ["nudges up", "can add a little to"] },
    down: { strong: ["wears down", "drains"], mid: ["dims", "chips away at"], weak: ["can dim", "can wear on"] },
    soft: { strong: ["softens", "eases"], mid: ["can soften", "takes the edge off"], weak: ["can ease a little"] },
  };
  /** Strength class of |w|: ≥ 0.5 strong, ≥ 0.3 mid, else weak. */
  const strength = w => (Math.abs(w) >= 0.5 ? "strong" : Math.abs(w) >= 0.3 ? "mid" : "weak");
  /** How a mover eases: [base, third person, past] ("loosen its grip" / "loosens its grip" / "loosened its grip"). */
  const EASE = {
    anger: ["loosen its grip", "loosens its grip", "loosened its grip"], shame: ["grow quieter", "grows quieter", "grew quieter"],
    fear: ["settle", "settles", "settled"], sadness: ["grow lighter", "grows lighter", "grew lighter"],
    rumination: ["slow down", "slows down", "slowed"], avoidance: ["ease", "eases", "eased"],
    calm: ["come back", "comes back", "came back"], connection: ["grow", "grows", "grew"], hope: ["come back", "comes back", "came back"],
  };
  /** Small grounded actions, first person, as verb phrases. */
  const ACT = {
    fear: "take one safe step", sadness: "do one small kind thing for myself", anger: "choose how I respond",
    shame: "treat myself the way I'd treat a friend", rumination: "set this thought down for now", avoidance: "face one small piece of this",
    calm: "slow my breath", connection: "let one person in a little", hope: "plan one small thing",
  };
  /** What a low grounding mover feels like, as a clause. */
  const LOW_STATE = { connection: "you feel alone", calm: "you're restless", hope: "hope runs low" };
  const LOW_FIX = { connection: "reaching toward one person", calm: "slowing your breath", hope: "one small plan" };

  /** How present a mover is: hard/process by value, grounding by how far below neutral. */
  const presence = (n, x) => (isGround[idx[n]] ? (x <= 0.4 ? (0.5 - x) / 0.5 : 0) : (x >= ACTIVE ? x : 0));
  /** Gain toward home for mover j in this step. */
  const gainOf = (m, j) => Math.abs(m.e[j] - m.h[j]) - Math.abs(m.next[j] - m.h[j]);

  // ---------- Feelings ----------
  /** The one to three most strongly felt movers. */
  function felt(e) {
    return NAMES.map(n => ({ n, x: presence(n, e[idx[n]]) }))
      .filter(f => f.x > 0).sort((p, q) => q.x - p.x || idx[p.n] - idx[q.n]).slice(0, 3);
  }
  /**
   * "You may be feeling …": each felt mover gets a degree word from its band
   * (the value picks the band, the hash picks the word within it).
   */
  function feelingLine(m, seed = 1) {
    const f = felt(m.e);
    if (f.length) return `You may be feeling ${listJoin(f.map(x => `${choose(DEGREE[band(x.x)], `deg|${x.n}|${k2(x.x)}`, seed)} ${FEEL[x.n]}`))}.`;
    const high = GROUND.filter(n => m.e[idx[n]] >= 0.65).map(n => FEEL_HIGH[n]);
    return high.length ? `You may be feeling ${listJoin(high)}.` : "Nothing strong stands out right now; you may be feeling fairly even.";
  }

  // ---------- Room for: positive emotions ----------
  /**
   * "Room for: calm, courage, and hope, as the fear settles a little."
   * The words come from master's positives (gains toward home); the clause
   * names the mover that moves most in the step and how much (gain < 0.15: "a little").
   */
  function roomLine(m) {
    const words = (m.positives || []).map(p => p.word);
    const j = m.mover ? idx[m.mover] : -1;
    const g = j >= 0 ? gainOf(m, j) : 0;
    const as = j >= 0 && g > 0.005 ? `, as ${subj(m.mover)} ${EASE[m.mover][1]}${g < 0.15 ? " a little" : ""}` : "";
    return `Room for: ${listJoin(words)}${as}.`;
  }

  // ---------- How they connect ----------
  /** The top mover's strongest coupling, weighted by how present its target is. */
  function strongestLink(m, W) {
    const t = idx[m.top];
    let best = null;
    NAMES.forEach((n, j) => {
      const w = W[t][j];
      if (j === t || !w || (isGround[j] && w > 0)) return;
      const pres = isGround[j] ? Math.max(0, m.h[j] - m.e[j]) : m.e[j];
      const score = Math.abs(w) * (pres + 0.01);
      if (!best || score > best.score) best = { to: n, w, score };
    });
    return best;
  }
  /**
   * How the feelings connect, composed from W, λ, loops and the hidden rise:
   *  • link: "When the anger is loud, it fuels the replaying; slowing down softens it."
   *    size word ← band(e_top); verb ← sign/strength of W[top][to]; soft verb ← |W[stab][top]|
   *  • loop: gain ≥ 0.5 "keep feeding each other", else "nudge each other"
   *  • λ: > 0 building on each other; ≤ −0.2 ease fairly quickly; else ease slowly
   *  • hidden: rise ≥ 0.2 "may grow", else "may creep in"
   */
  function connectLines(state, m, seed = 1) {
    const W = weights(state.w), out = [];
    if (m.top) {
      const t = idx[m.top], L = strongestLink(m, W);
      const stabW = m.stabilizer ? W[idx[m.stabilizer]][t] : 0;
      const soft = m.stabilizer ? `${SOFTENER[m.stabilizer]} ${choose(LINK_VERB.soft[strength(stabW)], `soft|${m.stabilizer}|${k2(stabW)}`, seed)} it` : "one small step can soften it";
      const size = choose(SIZE[band(m.e[t])], `size|${m.top}|${k2(m.e[t])}`, seed);
      if (L) {
        const kind = isGround[idx[L.to]] ? "down" : "up";
        const verb = choose(LINK_VERB[kind][strength(L.w)], `link|${m.top}|${L.to}|${k2(L.w)}|${k2(m.e[t])}`, seed);
        out.push(`When ${subj(m.top)} is ${size}, it ${verb} ${isGround[idx[L.to]] ? "your " : ""}${NOUN[L.to]}; ${soft}.`);
      } else out.push(`${cap(subj(m.top))} is the ${size === "faint" || size === "small" ? "main" : "loudest"} part right now; ${soft}.`);
      const loop = m.loops[0];
      if (loop && ![loop.a, loop.b].every(x => x === m.top || (L && x === L.to))) {
        const v = loop.gain >= 0.5 ? ["keep feeding each other", "keep each other going"] : ["nudge each other", "stir each other a little"];
        out.push(`${cap(NOUN[loop.a])} and ${NOUN[loop.b]} ${choose(v, `loop|${loop.a}|${loop.b}|${k2(loop.u)}`, seed)}.`);
      }
    } else if (m.stabilizer && LOW_STATE[m.stabilizer]) {
      const g = idx[m.stabilizer];
      const eased = NAMES.filter((n, j) => !isGround[j] && W[g][j] < 0).sort((p, q) => W[g][idx[p]] - W[g][idx[q]]).slice(0, 2).map(n => NOUN[n]);
      const verb = choose(LINK_VERB.soft[strength(m.h[g] - m.e[g])], `low|${m.stabilizer}|${k2(m.e[g])}`, seed);
      out.push(`When ${LOW_STATE[m.stabilizer]}, ${listJoin(eased)} grow more easily; ${LOW_FIX[m.stabilizer]} ${verb} it.`);
    }
    if (m.lambda !== null) {
      out.push(m.unstable ? `These feelings are ${choose(["building on", "feeding"], `lam|${k2(m.lambda)}`, seed)} each other right now, so go gently.`
        : m.lambda <= -0.2 ? "These feelings tend to ease on their own." : "These feelings tend to ease on their own, slowly.");
    }
    if (m.hidden[0]) {
      const hd = m.hidden[0], rise = hd.to - hd.from;
      const creep = { fear: "worry", sadness: "sadness", anger: "anger", shame: "shame", rumination: "replaying thoughts", avoidance: "the urge to avoid things" }[hd.name];
      out.push(`If this stays unspoken, ${creep} ${choose(rise >= 0.2 ? ["may grow", "may rise"] : ["may creep in", "may slip in"], `hid|${hd.name}|${k2(rise)}`, seed)}.`);
    }
    if (!out.length) out.push("Nothing is pulling hard on anything else right now.");
    return out;
  }

  // ---------- Hidden conflicts ----------
  /** The two sides of each conflict, as verb phrases after "part of you". `l` is the band of that side. */
  const PULL = {
    fear: l => `is ${l} afraid of what could go wrong`,
    anger: l => `is ${l} angry`,
    shame: l => `${l === "very" || l === "really" ? "badly " : ""}wants to hide`,
    rumination: l => `keeps going over it${l === "very" || l === "really" ? " again and again" : ""}`,
    avoidance: l => `${l === "very" || l === "really" ? "really " : ""}wants to pull back`,
  };
  const PULL_B = {
    "fear>hope": "is hoping it goes well", "anger>connection": "wants to stay close", "shame>connection": "needs to be close to someone",
    "rumination>calm": "wants some peace", "avoidance>hope": "hopes to move forward",
  };
  const TEXT_PULL = {
    wantBut: ["wants something", "is holding back"], shouldBut: ["knows what it would like to do", "isn't ready yet"],
    loveBut: ["cares deeply", "is hurt or unsure"], partOfMe: ["feels one way", "feels another"],
  };
  /**
   * The two sides of a conflict in words. Mover sides take an adverb from the
   * band of their value; text clashes use the clash kind.
   * @returns {[string, string]}
   */
  function pulls(c, seed = 1) {
    if (c.from === "words") return TEXT_PULL[c.a];
    const adv = choose(ADV[band(c.x)], `pull|${c.a}|${k2(c.x)}`, seed);
    return [PULL[c.a](adv), `${c.y >= 0.8 ? "really " : ""}${PULL_B[`${c.a}>${c.b}`]}`.replace(/^really is /, "is really ")];
  }
  /**
   * "A hidden pull: part of you … while part of you …" for the strongest
   * conflict, plus a holding line chosen by its strength c (≥ 0.6 or not).
   * Ambivalence is a normal part of change (Miller & Rollnick, 2013).
   */
  function conflictLines(m, seed = 1) {
    const c = (m.conflicts || [])[0];
    if (!c) return [];
    const [a, b] = pulls(c, seed);
    const hold = c.c >= 0.6
      ? choose(["Feeling both is a normal part of change; you can hold both and still take one small step.", "Being pulled both ways is a normal part of change; you can hold both and still choose one small step."], `hold|${k2(c.c)}`, seed)
      : choose(["It's normal to feel two ways at once; you don't have to settle it today.", "Mixed feelings are normal; you can let both be here for now."], `hold|${k2(c.c)}`, seed);
    return [`A hidden pull: part of you ${a}, while part of you ${b}.`, hold];
  }

  // ---------- Reality check (grand vs. true-sized) ----------
  const CLAIM = {
    grand: "it all depends on you, or that you can't fall short", catastrophic: "the worst will happen",
    allOrNothing: "it's all or nothing", absolutist: "it is always or never this way",
  };
  const TRUE_SIZE = {
    grand: "You matter, and you are also human; one good step is enough.",
    catastrophic: "The ending isn't written yet; you can handle the next hour, and that is enough.",
    allOrNothing: "Partly done and partly good still counts.",
    absolutist: "Some of the time, with some people, is usually closer to true.",
  };
  /** How sure the thought sounds, from the band of g. */
  const SURE = { strongly: "very sure", quite: "sure", "a little": "a bit sure" };
  /**
   * The reality check when grand.g ≥ 0.25: the thought's claim (by kind) at the
   * certainty of g's band, then the true-sized version. No labels, no shaming.
   */
  function realityLines(m) {
    const gr = m.grand;
    if (!gr || gr.g < G_SHOW || !gr.kinds.length) return [];
    const kinds = gr.kinds.slice(0, 2);
    return [`Reality check: part of this thought sounds ${SURE[band(gr.g)]} that ${kinds.map(k => CLAIM[k]).join(", and that ")}.`, TRUE_SIZE[kinds[0]]];
  }

  // ---------- Affirmations ----------
  /** First-person stances per intensity band; the seed and value pick one of two. */
  const STANCE = {
    strongly: [(n, act) => `I can feel ${FEEL[n]} and still ${act}.`, (n, act) => `Even when I feel this ${FEEL[n]}, I can ${act}.`],
    quite: [(n, act) => `${cap(isGround[idx[n]] ? LOW_NOUN[n] : NOUN[n])} is here, and I can ${act}.`, (n, act) => `I can make room for ${isGround[idx[n]] ? LOW_NOUN[n] : NOUN[n]} and ${act}.`],
    "a little": [(n, act) => `I notice a little ${isGround[idx[n]] ? LOW_NOUN[n] : NOUN[n]}; I can ${act}.`, (n, act) => `This is small enough to hold, and I can ${act}.`],
  };
  /**
   * Three affirmations composed from the reading (plus one with faith on):
   *  1. the mover that moves most: stance by its band, action ACT[mover]
   *  2. the top positive word: "There is room for … here, even now."
   *  3. the conflict (both pulls, "I can hold both"), else the true-sized line
   *     for grand thinking, else the stabilizer's action
   *  faith: "God can give me <positive> for <span>", span by d
   */
  function affirmations(m, opts = {}) {
    const seed = Number.isFinite(opts.seed) ? opts.seed : 1;
    const main = m.mover || m.stabilizer || "calm";
    const x = presence(main, m.e[idx[main]]);
    const out = [choose(STANCE[band(x)], `st|${main}|${k2(x)}`, seed)(main, ACT[main])];
    const pos = (m.positives || [])[0];
    if (pos) out.push(choose([`There is room for ${pos.word} here, even now.`, `I can make a little room for ${pos.word} today.`], `pos|${pos.word}|${k2(pos.score)}`, seed));
    const c = (m.conflicts || [])[0];
    if (c) { const [a, b] = pulls(c, seed); out.push(`Part of me ${a}, and part of me ${b}; I can hold both.`); }
    else if (m.grand && m.grand.g >= G_SHOW) out.push(m.grand.kind === "grand" ? "I matter, and I am human; one good step is enough." : m.grand.kind === "catastrophic" ? "I don't know the ending yet, and I can handle the next hour." : "Some of the time is not all of the time.");
    else if (m.stabilizer && m.stabilizer !== main) out.push(`I can ${ACT[m.stabilizer]}.`);
    if (opts.faith) {
      const span = m.d >= 1 ? "this hard day" : m.d >= 0.5 ? "the next hour" : "this moment";
      out.push(choose([`God can give me ${pos ? pos.word : "peace"} for ${span}.`, `I can bring this ${isGround[idx[main]] ? LOW_NOUN[main] : NOUN[main]} to God and ask for ${pos ? pos.word : "peace"}.`], `faith|${main}|${k2(m.d)}`, seed));
    }
    return out;
  }

  // ---------- One step ----------
  /** Number words for the dose: d ≥ 1 big, d ≥ 0.5 medium, else small. */
  const dose = d => (d >= 1 ? { min: "ten", times: "five" } : d >= 0.5 ? { min: "five", times: "four" } : { min: "two", times: "three" });
  /** The technique for each mover; the dose comes from d. */
  const TECHNIQUE = {
    fear: x => `breathe out longer than in, ${x.times} times, then name one thing you can see`,
    sadness: x => `do one thing you used to enjoy, for ${x.min} minutes`,
    anger: x => `pause: step away for ${x.min} minutes, then name what matters to you here`,
    shame: () => "say to yourself what you'd say to a friend, then tell one safe person",
    rumination: x => `give the replay ${x.min} minutes later today, then turn to one task now`,
    avoidance: x => `do ${x.min} minutes of the thing you've been putting off`,
    calm: x => `breathe out longer than in, ${x.times} times`,
    connection: () => "send one short message to someone kind",
    hope: () => "write down one small thing for tomorrow",
  };
  /**
   * One step: the technique for master's mover, sized by d, and why, from
   * the step's gain for that mover ("so the anger can loosen its grip a little").
   */
  function stepLine(m) {
    if (!m.mover) return "Keep going: notice one good thing and stay with it for a breath.";
    const g = gainOf(m, idx[m.mover]);
    return `${cap(TECHNIQUE[m.mover](dose(m.d)))}, so ${subj(m.mover)} can ${EASE[m.mover][0]}${g < 0.15 ? " a little" : ""}.`;
  }

  // ---------- Progress ----------
  /** Steps as words: ≤ 2 "one or two", ≤ 5 "a few", ≤ 12 "several", else "many". */
  const howMany = n => (n <= 2 ? "one or two" : n <= 5 ? "a few" : n <= 12 ? "several" : "many");
  /**
   * Progress from the baseline (Δ = d_prev − d: direction and degree) and the
   * recovery count (as words).
   */
  function progressLine(m) {
    const parts = [], p = m.baseline;
    if (p.dPrev === null) parts.push("This is your first check-in here, so there's nothing to compare yet.");
    else {
      const diff = p.dPrev - m.d, deg = Math.abs(diff) > 0.15 ? "noticeably" : "a little";
      parts.push(Math.abs(diff) <= 0.03 ? "You're about where you've been lately."
        : diff > 0 ? `You're ${deg} closer to steady than your recent days.`
        : `You're ${deg} further from steady than your recent days; one small step is enough.`);
    }
    const r = m.recovery;
    if (r) {
      if (m.d < FIXED.eps) parts.push("You're close to steady right now.");
      else if (!r.reached) parts.push("This may take time, and you don't have to do it alone.");
      else parts.push(`${cap(howMany(r.steps))} small step${r.steps <= 1 ? "" : "s"} could bring you close to steady.`);
    }
    return parts.join(" ");
  }

  // ---------- The card ----------
  /**
   * The default card, words only, every line composed from the master output.
   * @returns {{room:string, feeling:string, connect:string[], conflict:string[], reality:string[], affirmations:string[], step:string, progress:string}}
   */
  function card(state, m, opts = {}) {
    const seed = Number.isFinite(opts.seed) ? opts.seed : 1;
    return {
      room: roomLine(m),
      feeling: feelingLine(m, seed),
      connect: connectLines(state, m, seed),
      conflict: conflictLines(m, seed),
      reality: realityLines(m),
      affirmations: affirmations(m, opts),
      step: stepLine(m),
      progress: progressLine(m),
    };
  }
  /** The card as plain text lines (Copy, tests). */
  function lines(state, m, opts = {}) {
    const c = card(state, m, opts);
    return [
      c.room,
      `What you may be feeling: ${c.feeling.replace(/^You may be feeling /, "")}`,
      `How they connect: ${c.connect.join(" ")}`,
      ...c.conflict, ...c.reality,
      "Affirmations:", ...c.affirmations.map(x => `  ${x}`),
      `One step: ${c.step}`,
      c.progress,
    ];
  }

  MF.Words = {
    hash, choose, band, DEGREE, ADV, SIZE, FEEL, FEEL_HIGH, NOUN, LOW_NOUN, SOFTENER, LINK_VERB, strength, EASE, ACT, subj,
    felt, feelingLine, roomLine, connectLines, pulls, conflictLines, realityLines, affirmations, stepLine, progressLine, card, lines,
  };
})(typeof window !== "undefined" ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
if (typeof module !== "undefined") module.exports = global.MF.Words;
