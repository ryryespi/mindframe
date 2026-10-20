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
//   inner peace    P's band (a little / growing / close / steady), n* as number
//                  words, the lever (ease X / grow Y), and how much the hidden
//                  pull (1 − P_c) and the grand thought (1 − P_g) take away
//   features       optional: when features/practices.js is loaded, the One step
//                  uses its picked practice (m.practice); when features/forgiveness.js
//                  is loaded, the card gets its forgiveness tile (m.forgive) and
//                  Grace's peace line. Both read master's numbers only.
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
  require("./peace.js");
}

if (typeof window === "undefined") require("../data/strings.js");
(function (MF) {
  "use strict";
  const Str = MF.Strings;   // every word lives in js/data/strings.js
  const { NAMES, GROUND, HARD, FIXED, ACTIVE, idx, isGround, cap, listJoin, weights } = MF.Movers;
  const { G_SHOW } = MF.Reality;
  const PEACE = MF.Peace;

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
    rumination: Str.t("words.FEEL.rumination"), avoidance: Str.t("words.FEEL.avoidance"),
    calm: "restless", connection: "alone", hope: "discouraged",
  };
  const FEEL_HIGH = { calm: "calm", connection: "connected", hope: "hopeful" };
  const NOUN = { fear: "fear", sadness: "sadness", anger: "anger", shame: "shame", rumination: Str.t("words.NOUN.rumination"), avoidance: "avoiding", calm: "calm", connection: "connection", hope: "hope" };
  /** Nouns for a low grounding mover. */
  const LOW_NOUN = { calm: "restlessness", connection: "loneliness", hope: "discouragement" };
  const SOFTENER = { calm: Str.t("words.SOFTENER.calm"), connection: "connection", hope: "hope" };
  /** Subject form of a mover inside a sentence. */
  const subj = n => (HARD.includes(n) ? `the ${NOUN[n]}` : NOUN[n]);
  /**
   * Link verbs by the sign and strength of a coupling W_ij.
   * up: i raises j (hard/process target); down: i lowers grounding j; soft: grounding i softens j.
   */
  const LINK_VERB = {
    up: { strong: ["fuels", "feeds"], mid: Str.list("words.LINK_VERB.up.mid"), weak: Str.list("words.LINK_VERB.up.weak") },
    down: { strong: Str.list("words.LINK_VERB.down.strong"), mid: Str.list("words.LINK_VERB.down.mid"), weak: Str.list("words.LINK_VERB.down.weak") },
    soft: { strong: ["softens", "eases"], mid: Str.list("words.LINK_VERB.soft.mid"), weak: Str.list("words.LINK_VERB.soft.weak") },
  };
  /** Strength class of |w|: ≥ 0.5 strong, ≥ 0.3 mid, else weak. */
  const strength = w => (Math.abs(w) >= 0.5 ? "strong" : Math.abs(w) >= 0.3 ? "mid" : "weak");
  /** How a mover eases: [base, third person, past] ("loosen its grip" / "loosens its grip" / "loosened its grip"). */
  const EASE = {
    anger: Str.list("words.EASE.anger"), shame: Str.list("words.EASE.shame"),
    fear: ["settle", "settles", "settled"], sadness: Str.list("words.EASE.sadness"),
    rumination: Str.list("words.EASE.rumination"), avoidance: ["ease", "eases", "eased"],
    calm: Str.list("words.EASE.calm"), connection: ["grow", "grows", "grew"], hope: Str.list("words.EASE.hope"),
  };
  /** Small grounded actions, first person, as verb phrases. */
  const ACT = {
    fear: Str.t("words.ACT.fear"), sadness: Str.t("words.ACT.sadness"), anger: Str.t("words.ACT.anger"),
    shame: Str.t("words.ACT.shame"), rumination: Str.t("words.ACT.rumination"), avoidance: Str.t("words.ACT.avoidance"),
    calm: Str.t("words.ACT.calm"), connection: Str.t("words.ACT.connection"), hope: Str.t("words.ACT.hope"),
  };
  /** What a low grounding mover feels like, as a clause. */
  const LOW_STATE = { connection: Str.t("words.LOW_STATE.connection"), calm: Str.t("words.LOW_STATE.calm"), hope: Str.t("words.LOW_STATE.hope") };
  const LOW_FIX = { connection: Str.t("words.LOW_FIX.connection"), calm: Str.t("words.LOW_FIX.calm"), hope: Str.t("words.LOW_FIX.hope") };

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
    if (f.length) return Str.t("words.feelingLine.you_may_be_feeling", { v0: listJoin(f.map(x => `${choose(DEGREE[band(x.x)], `deg|${x.n}|${k2(x.x)}`, seed)} ${FEEL[x.n]}`)) });
    const high = GROUND.filter(n => m.e[idx[n]] >= 0.65).map(n => FEEL_HIGH[n]);
    return high.length ? Str.t("words.feelingLine.you_may_be_feeling_2", { v0: listJoin(high) }) : Str.t("words.feelingLine.nothing_strong_stands_out_right");
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
    return Str.t("words.roomLine.room_for", { v0: listJoin(words), as: as });
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
      const soft = m.stabilizer ? `${SOFTENER[m.stabilizer]} ${choose(LINK_VERB.soft[strength(stabW)], `soft|${m.stabilizer}|${k2(stabW)}`, seed)} it` : Str.t("words.connectLines.soft.one_small_step_can_soften");
      const size = choose(SIZE[band(m.e[t])], `size|${m.top}|${k2(m.e[t])}`, seed);
      if (L) {
        const kind = isGround[idx[L.to]] ? "down" : "up";
        const verb = choose(LINK_VERB[kind][strength(L.w)], `link|${m.top}|${L.to}|${k2(L.w)}|${k2(m.e[t])}`, seed);
        out.push(Str.t("words.connectLines.when_is_it", { v0: subj(m.top), size: size, verb: verb, v3: isGround[idx[L.to]] ? "your " : "", v4: NOUN[L.to], soft: soft }));
      } else out.push(Str.t("words.connectLines.is_the_part_right_now", { v0: cap(subj(m.top)), v1: size === "faint" || size === "small" ? "main" : "loudest", soft: soft }));
      const loop = m.loops[0];
      if (loop && ![loop.a, loop.b].every(x => x === m.top || (L && x === L.to))) {
        const v = loop.gain >= 0.5 ? Str.list("words.connectLines.v") : Str.list("words.connectLines.v_2");
        out.push(`${cap(NOUN[loop.a])} and ${NOUN[loop.b]} ${choose(v, `loop|${loop.a}|${loop.b}|${k2(loop.u)}`, seed)}.`);
      }
    } else if (m.stabilizer && LOW_STATE[m.stabilizer]) {
      const g = idx[m.stabilizer];
      const eased = NAMES.filter((n, j) => !isGround[j] && W[g][j] < 0).sort((p, q) => W[g][idx[p]] - W[g][idx[q]]).slice(0, 2).map(n => NOUN[n]);
      const verb = choose(LINK_VERB.soft[strength(m.h[g] - m.e[g])], `low|${m.stabilizer}|${k2(m.e[g])}`, seed);
      out.push(Str.t("words.connectLines.when_grow_more_easily_it", { v0: LOW_STATE[m.stabilizer], v1: listJoin(eased), v2: LOW_FIX[m.stabilizer], verb: verb }));
    }
    if (m.lambda !== null) {
      out.push(m.unstable ? Str.t("words.connectLines.these_feelings_are_each_other", { v0: choose(Str.list("words.connectLines"), `lam|${k2(m.lambda)}`, seed) })
        : m.lambda <= -0.2 ? Str.t("words.connectLines.these_feelings_tend_to_ease") : Str.t("words.connectLines.these_feelings_tend_to_ease_2"));
    }
    if (m.hidden[0]) {
      const hd = m.hidden[0], rise = hd.to - hd.from;
      const creep = { fear: "worry", sadness: "sadness", anger: "anger", shame: "shame", rumination: Str.t("movers.PICK_WORD.rumination"), avoidance: Str.t("words.connectLines.creep.avoidance") }[hd.name];
      out.push(Str.t("words.connectLines.if_this_stays_unspoken", { creep: creep, v1: choose(rise >= 0.2 ? Str.list("words.connectLines_2") : Str.list("words.connectLines_3"), `hid|${hd.name}|${k2(rise)}`, seed) }));
    }
    if (!out.length) out.push(Str.t("words.connectLines.nothing_is_pulling_hard_on"));
    return out;
  }

  // ---------- Hidden conflicts ----------
  /** The two sides of each conflict, as verb phrases after "part of you". `l` is the band of that side. */
  const PULL = {
    fear: l => Str.t("words.fear.is_afraid_of_what_could", { l: l }),
    anger: l => Str.t("words.anger.is_angry", { l: l }),
    shame: l => Str.t("words.shame.wants_to_hide", { v0: l === "very" || l === "really" ? "badly " : "" }),
    rumination: l => Str.t("words.rumination.keeps_going_over_it", { v0: l === "very" || l === "really" ? Str.t("words.rumination.again_and_again") : "" }),
    avoidance: l => Str.t("words.avoidance.wants_to_pull_back", { v0: l === "very" || l === "really" ? "really " : "" }),
  };
  const PULL_B = {
    "fear>hope": Str.t("words.PULL_B.fear_hope"), "anger>connection": Str.t("words.PULL_B.anger_connection"), "shame>connection": Str.t("words.PULL_B.shame_connection"),
    "rumination>calm": Str.t("words.PULL_B.rumination_calm"), "avoidance>hope": Str.t("words.PULL_B.avoidance_hope"),
  };
  const TEXT_PULL = {
    wantBut: Str.list("words.TEXT_PULL.wantBut"), shouldBut: Str.list("words.TEXT_PULL.shouldBut"),
    loveBut: Str.list("words.TEXT_PULL.loveBut"), partOfMe: Str.list("words.TEXT_PULL.partOfMe"),
  };
  /**
   * The two sides of a conflict in words. Mover sides take an adverb from the
   * band of their value; text clashes use the clash kind.
   * @returns {[string, string]}
   */
  function pulls(c, seed = 1) {
    if (c.from === "words") return TEXT_PULL[c.a];
    const adv = choose(ADV[band(c.x)], `pull|${c.a}|${k2(c.x)}`, seed);
    return [PULL[c.a](adv), `${c.y >= 0.8 ? "really " : ""}${PULL_B[`${c.a}>${c.b}`]}`.replace(/^really is /, Str.t("words.pulls.is_really"))];
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
      ? choose(Str.list("words.conflictLines.hold"), `hold|${k2(c.c)}`, seed)
      : choose(Str.list("words.conflictLines.hold_2"), `hold|${k2(c.c)}`, seed);
    return [Str.t("words.conflictLines.a_hidden_pull_part_of", { a: a, b: b }), hold];
  }

  // ---------- Reality check (grand vs. true-sized) ----------
  const CLAIM = {
    grand: Str.t("words.CLAIM.grand"), catastrophic: Str.t("words.CLAIM.catastrophic"),
    allOrNothing: Str.t("words.CLAIM.allOrNothing"), absolutist: Str.t("words.CLAIM.absolutist"),
  };
  const TRUE_SIZE = {
    grand: Str.t("words.TRUE_SIZE.grand"),
    catastrophic: Str.t("words.TRUE_SIZE.catastrophic"),
    allOrNothing: Str.t("words.TRUE_SIZE.allOrNothing"),
    absolutist: Str.t("words.TRUE_SIZE.absolutist"),
  };
  /** How sure the thought sounds, from the band of g. */
  /** What a put-down claims, by kind (core/reality.js SMALL). */
  const SMALL_CLAIM = {
    worthless: Str.t("words.SMALL_CLAIM.worthless"),
    undeserving: Str.t("words.SMALL_CLAIM.undeserving"),
    disqualify: Str.t("words.SMALL_CLAIM.disqualify"),
    compare: Str.t("words.SMALL_CLAIM.compare"),
  };
  /** The true-size answer to a put-down: not bigger, not smaller (Burns, 1980: disqualifying the positive). */
  const SMALL_TRUE = {
    worthless: Str.t("words.SMALL_TRUE.worthless"),
    undeserving: Str.t("words.SMALL_TRUE.undeserving"),
    disqualify: Str.t("words.SMALL_TRUE.disqualify"),
    compare: Str.t("words.SMALL_TRUE.compare"),
    chip: Str.t("words.SMALL_TRUE.chip"),
  };
  const SURE = { strongly: Str.t("words.SURE.strongly"), quite: "sure", "a little": Str.t("words.SURE.a_little") };
  /**
   * The reality check when grand.g ≥ 0.25: the thought's claim (by kind) at the
   * certainty of g's band, then the true-sized version. No labels, no shaming.
   */
  function realityLines(m) {
    const gr = m.grand, out = [];
    if (gr && gr.g >= G_SHOW && gr.kinds.length) {
      const kinds = gr.kinds.slice(0, 2);
      out.push(Str.t("words.realityLines.reality_check_part_of_this", { v0: SURE[band(gr.g)], v1: kinds.map(k => CLAIM[k]).join(Str.t("words.realityLines.and_that")) }), TRUE_SIZE[kinds[0]]);
    }
    // The other side of the same check: too small (false humility).
    const sm = m.small;
    if (sm && sm.u >= MF.Reality.U_SHOW) {
      out.push(sm.kinds.length
        ? Str.t("words.realityLines.reality_check_part_of_this_2", { v0: SURE[band(sm.u)], v1: sm.kinds.slice(0, 2).map(k => SMALL_CLAIM[k]).join(Str.t("words.realityLines.and_that")) })
        : Str.t("words.realityLines.reality_check_you_marked_putting"));
      out.push(SMALL_TRUE[sm.kinds[0] || "chip"]);
    }
    return out;
  }

  // ---------- Affirmations ----------
  /** First-person stances per intensity band; the seed and value pick one of two. */
  const STANCE = {
    strongly: [(n, act) => Str.t("words.i_can_feel_and_still", { v0: FEEL[n], act: act }), (n, act) => Str.t("words.even_when_i_feel_this", { v0: FEEL[n], act: act })],
    quite: [(n, act) => Str.t("words.is_here_and_i_can", { v0: cap(isGround[idx[n]] ? LOW_NOUN[n] : NOUN[n]), act: act }), (n, act) => Str.t("words.i_can_make_room_for", { v0: isGround[idx[n]] ? LOW_NOUN[n] : NOUN[n], act: act })],
    "a little": [(n, act) => Str.t("words.i_notice_a_little_i", { v0: isGround[idx[n]] ? LOW_NOUN[n] : NOUN[n], act: act }), (n, act) => Str.t("words.this_is_small_enough_to", { act: act })],
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
    if (pos) out.push(choose([Str.t("words.affirmations.there_is_room_for_here", { word: pos.word }), Str.t("words.affirmations.i_can_make_a_little", { word: pos.word })], `pos|${pos.word}|${k2(pos.score)}`, seed));
    const c = (m.conflicts || [])[0];
    if (c) { const [a, b] = pulls(c, seed); out.push(Str.t("words.affirmations.part_of_me_and_part", { a: a, b: b })); }
    else if (m.grand && m.grand.g >= G_SHOW) out.push(m.grand.kind === "grand" ? Str.t("words.affirmations.i_matter_and_i_am") : m.grand.kind === "catastrophic" ? Str.t("words.affirmations.i_don_t_know_the") : Str.t("words.affirmations.some_of_the_time_is"));
    else if (m.stabilizer && m.stabilizer !== main) out.push(`I can ${ACT[m.stabilizer]}.`);
    if (opts.faith) {
      const span = m.d >= 1 ? Str.t("words.affirmations.span.this_hard_day") : m.d >= 0.5 ? Str.t("words.affirmations.span.the_next_hour") : Str.t("words.affirmations.span.this_moment");
      out.push(choose([Str.t("words.affirmations.god_can_give_me_for", { v0: pos ? pos.word : "peace", span: span }), Str.t("words.affirmations.i_can_bring_this_to", { v0: (isGround[idx[main]] ? LOW_NOUN[main] : NOUN[main]).replace(/^the /, ""), v1: pos ? pos.word : "peace" })], `faith|${main}|${k2(m.d)}`, seed));
    }
    return out;
  }

  // ---------- One step ----------
  /** Number words for the dose: d ≥ 1 big, d ≥ 0.5 medium, else small. */
  const dose = d => (d >= 1 ? { min: "ten", times: "five" } : d >= 0.5 ? { min: "five", times: "four" } : { min: "two", times: "three" });
  /** The technique for each mover; the dose comes from d. */
  const TECHNIQUE = {
    fear: x => Str.t("words.fear.breathe_out_longer_than_in", { times: x.times }),
    sadness: x => Str.t("words.sadness.do_one_thing_you_used", { min: x.min }),
    anger: x => Str.t("words.anger.pause_step_away_for_minutes", { min: x.min }),
    shame: () => Str.t("words.shame.say_to_yourself_what_you"),
    rumination: x => Str.t("words.rumination.give_the_replay_minutes_later", { min: x.min }),
    avoidance: x => Str.t("words.avoidance.do_minutes_of_the_thing", { min: x.min }),
    calm: x => Str.t("words.calm.breathe_out_longer_than_in", { times: x.times }),
    connection: () => Str.t("words.connection.send_one_short_message_to"),
    hope: () => Str.t("words.hope.write_down_one_small_thing"),
  };
  /**
   * One step: the technique for master's mover, sized by d, and why, from
   * the step's gain for that mover ("so the anger can loosen its grip a little").
   */
  function stepLine(m) {
    // The most helpful lever for inner peace (∂P/∂e_i), else the mover that moves most.
    const n = (m.peace && m.peace.lever && m.peace.lever.name) || m.mover;
    if (!n) return Str.t("master.act.action.keep_going_notice_one_good");
    const g = gainOf(m, idx[n]);
    // A patience or mindfulness practice when features/practices.js picked one
    // for this mover (m.practice, from its master pass); else the mover's technique.
    const lib = MF.Practices && m.practice && m.practice.mover === n ? MF.Practices.LIBRARY[m.practice.id] : null;
    const how = lib ? lib.say(dose(m.d)) : TECHNIQUE[n](dose(m.d));
    return Str.t("words.stepLine.so_can", { v0: cap(how), v1: subj(n), v2: EASE[n][0], g_s: g < 0.15 ? " a little" : "" });
  }

  // ---------- Inner peace ----------
  const NUMBER = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
  /** A count as words (over twenty: "many"). */
  const countWord = n => (n <= 20 ? NUMBER[n] : "many");
  /** What the lever acts on, as an object of "easing" / "growing". */
  const LEVER_NOUN = { fear: Str.t("words.LEVER_NOUN.fear"), sadness: Str.t("words.LEVER_NOUN.sadness"), anger: Str.t("words.LEVER_NOUN.anger"), shame: Str.t("words.LEVER_NOUN.shame"), rumination: Str.t("words.NOUN.rumination"), avoidance: Str.t("words.connectLines.creep.avoidance"), calm: "calm", connection: "connection", hope: "hope" };
  /** Endings for the peace band line (no "growing, and it can grow"). */
  const PEACE_TAIL = { "a little": Str.list("words.PEACE_TAIL.a_little"), growing: Str.list("words.PEACE_TAIL.growing"), close: Str.list("words.PEACE_TAIL.close") };
  /** "a little" when a factor takes less than 0.15 of peace, else "some". */
  const takes = x => (x >= 0.15 ? "some" : "a little");
  /**
   * Inner peace in words, from master's peace output:
   *  • "Inner peace: <band>." with band from P (< 0.4 a little, < 0.6 growing, < 0.8 close, else steady)
   *  • "Path to peace: about <n* in words> gentle steps; the biggest help right now is easing X / growing Y."
   *  • the hidden pull's share (1 − P_c) and the grand thought's share (1 − P_g), when ≥ 0.03
   */
  function peaceLines(m, seed = 1) {
    const p = m.peace;
    if (!p) return [];
    const b = PEACE.band(p.P);
    const out = [Str.t("words.peaceLines.out.inner_peace", { b: b, b_s: b === "steady" ? "." : choose(PEACE_TAIL[b], `peace|${k2(p.P)}`, seed) })];
    const lv = p.lever && p.lever.name ? `${p.lever.kind === "grow" ? "growing" : "easing"} ${LEVER_NOUN[p.lever.name]}` : Str.t("words.peaceLines.lv.keeping_things_gentle");
    const sv = p.solve;
    if (sv && sv.n === 0) out.push(Str.t("words.peaceLines.path_to_peace_you_re", { lv: lv }));
    else if (sv && sv.n !== null) out.push(Str.t("words.peaceLines.path_to_peace_about_gentle", { v0: countWord(sv.n), v1: sv.n === 1 ? "" : "s", lv: lv }));
    else out.push(Str.t("words.peaceLines.path_to_peace_this_may", { lv: lv }));
    if (1 - p.Pc >= 0.03) out.push(Str.t("words.peaceLines.the_hidden_pull_takes_of", { v0: takes(1 - p.Pc) }));
    // The true-size factor counts too big (g) and too small (u); name the side that sets it.
    const smallSide = m.small && m.small.u > (m.grand ? m.grand.g : 0);
    if (1 - p.Pg >= 0.03) out.push(smallSide
      ? Str.t("words.peaceLines.putting_yourself_down_takes_too", { v0: takes(1 - p.Pg) })
      : Str.t("words.peaceLines.the_grand_thought_takes_too", { v0: takes(1 - p.Pg) }));
    return out;
  }
  /** Faith wording for peace (only with Include faith on). */
  const PEACE_FAITH = Str.t("words.PEACE_FAITH.may_the_peace_of_god");

  // ---------- Progress ----------
  /** Steps as words: ≤ 2 "one or two", ≤ 5 "a few", ≤ 12 "several", else "many". */
  const howMany = n => (n <= 2 ? Str.t("words.howMany.one_or_two") : n <= 5 ? "a few" : n <= 12 ? "several" : "many");
  /**
   * Progress from the baseline (Δ = d_prev − d: direction and degree) and the
   * recovery count (as words).
   */
  function progressLine(m) {
    const parts = [], p = m.baseline;
    if (p.dPrev === null) parts.push(Str.t("words.progressLine.this_is_your_first_check"));
    else {
      const diff = p.dPrev - m.d, deg = Math.abs(diff) > 0.15 ? "noticeably" : "a little";
      parts.push(Math.abs(diff) <= 0.03 ? Str.t("words.progressLine.you_re_about_where_you")
        : diff > 0 ? Str.t("words.progressLine.you_re_closer_to_steady", { deg: deg })
        : Str.t("words.progressLine.you_re_further_from_steady", { deg: deg }));
    }
    const r = m.recovery;
    if (r) {
      if (m.d < FIXED.eps) parts.push(Str.t("words.progressLine.you_re_close_to_steady"));
      else if (!r.reached) parts.push(Str.t("words.progressLine.this_may_take_time_and"));
      else parts.push(Str.t("words.progressLine.small_step_could_bring_you", { v0: cap(howMany(r.steps)), v1: r.steps <= 1 ? "" : "s" }));
    }
    return parts.join(" ");
  }

  // ---------- The card ----------
  /**
   * The default card, words only, every line composed from the master output.
   * @returns {{room:string, peace:string[], peaceFaith:string|null, feeling:string, connect:string[], conflict:string[], reality:string[], forgive:string[], affirmations:string[], step:string, practice:{id:string,name:string}|null, progress:string}}
   */
  // ---------- The short card (push19): headline + feeling + one insight + One step ----------
  /**
   * The one most relevant insight, chosen by the numbers (strongest first):
   *   kai      X, the outside hurt, when the Kai shield tile shows (push23)
   *   free     max(e_shame, c_self, u) when the freeing tile shows
   *   forgive  max(F_self, F_other) when a forgiveness path is suggested
   *   reality  max(g, u) when the reality check shows
   *   pattern  0.7 when a relationship pattern is found (explicit and actionable)
   *   conflict C_max, the strongest hidden pull
   * Ties go to the earlier one in that order. null when nothing applies.
   * @param {object} m master output
   * @param {object} c the composed card (needs conflict, reality, forgive, freeing)
   * @returns {{id:string, score:number}|null}
   */
  function insight(m, c) {
    const fr = m.freeing, f = m.forgive;
    const cand = [
      ["kai", c.kai && c.kai.length ? m.kai.X : 0],
      ["free", c.freeing ? Math.max(m.e[MF.Movers.idx.shame], fr ? fr.cSelf : 0, fr ? fr.u : 0) : 0],
      ["forgive", c.forgive && c.forgive.length && f ? Math.max(f.Fself, f.Fother) : 0],
      ["reality", c.reality && c.reality.length ? Math.max(m.grand ? m.grand.g : 0, m.small ? m.small.u : 0) : 0],
      ["pattern", (m.found || []).length ? 0.7 : 0],
      ["conflict", c.conflict && c.conflict.length ? (m.conflicts || []).reduce((x, q) => Math.max(x, q.c), 0) : 0],
    ];
    let best = null;
    cand.forEach(([id, score]) => { if (score > 0 && (!best || score > best.score + 1e-9)) best = { id, score: MF.Movers.r2(score) }; });
    return best;
  }
  /** The headline: the peace band line, then "Room for …" (one short tile). */
  function headline(m, seed = 1) {
    const room = roomLine(m).replace(/^Room for: /, Str.t("words.headline.room.room_for"));
    const p = m.peace ? peaceLines(m, seed)[0] : "";
    return p ? `${p} ${room}` : room;
  }

  const cardMemo = MF.Movers.memoOn((m, state, opts) => cardOf(state, m, opts));
  /** The words-first card for a reading: computed once per reading m (same state and options). */
  function card(state, m, opts = {}) { return cardMemo(m, state, opts); }
  /** The card for one reading (memoized per m by card(); see MF.Movers.memoOn). */
  function cardOf(state, m, opts = {}) {
    const seed = Number.isFinite(opts.seed) ? opts.seed : 1;
    const c = {
      room: roomLine(m),
      // Grace's line joins the peace lines when the lever is one of a forgiveness path's movers.
      peace: peaceLines(m, seed).concat(MF.Forgive && MF.Forgive.peaceLine(m) ? [MF.Forgive.peaceLine(m)] : []),
      peaceFaith: opts.faith && m.peace ? PEACE_FAITH : null,
      feeling: feelingLine(m, seed),
      connect: connectLines(state, m, seed),
      conflict: conflictLines(m, seed),
      reality: realityLines(m),
      kai: MF.Kai ? MF.Kai.cardLines(m, opts) : [],
      forgive: MF.Forgive ? MF.Forgive.cardLines(m, opts) : [],
      freeing: MF.Freeing ? MF.Freeing.cardLines(m, opts) : null,
      affirmations: affirmations(m, opts),
      step: stepLine(m),
      practice: MF.Practices && m.practice ? { id: m.practice.id, name: MF.Practices.LIBRARY[m.practice.id].name, caution: MF.Practices.LIBRARY[m.practice.id].caution || null } : null,
      progress: progressLine(m),
    };
    c.headline = headline(m, seed);
    c.insight = insight(m, c);
    c.affirmTop = c.affirmations.slice(0, 2);
    return c;
  }
  /** The card as plain text lines (Copy, tests). */
  function lines(state, m, opts = {}) {
    const c = card(state, m, opts);
    return [
      c.room,
      ...c.peace, ...(c.peaceFaith ? [c.peaceFaith] : []),
      Str.t("words.lines.what_you_may_be_feeling", { v0: c.feeling.replace(/^You may be feeling /, "") }),
      Str.t("words.lines.how_they_connect", { v0: c.connect.join(" ") }),
      ...c.kai, ...c.conflict, ...c.reality, ...c.forgive,
      ...(c.freeing ? [...c.freeing.lines, c.freeing.step] : []),
      "Affirmations:", ...c.affirmations.map(x => `  ${x}`),
      Str.t("words.lines.one_step", { step: c.step }),
      ...(c.practice && c.practice.caution ? [`Caution: ${c.practice.caution}`] : []),
      c.progress,
    ];
  }

  MF.Words = {
    hash, choose, band, DEGREE, ADV, SIZE, FEEL, FEEL_HIGH, NOUN, LOW_NOUN, SOFTENER, LINK_VERB, strength, EASE, ACT, subj,
    felt, feelingLine, roomLine, headline, insight, peaceLines, countWord, PEACE_FAITH, connectLines, pulls, conflictLines, realityLines, affirmations, stepLine, progressLine, card, lines,
  };
})(typeof window !== "undefined" ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
if (typeof module !== "undefined") module.exports = global.MF.Words;
