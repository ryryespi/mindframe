// core/words.js — the default output, in words only (no numbers).
//
// From the master output it builds the card:
//   • What you may be feeling: the 1–3 strongest movers with intensity words
//     (< 0.3 a little, 0.3–0.6 quite, > 0.6 strongly)
//   • How they connect: the strongest W link and its stabilizer, λ in words,
//     and any hidden rise ("If this stays unspoken, sadness may creep in.")
//   • Affirmations: 2 from the mover that moves most toward home, 1 from the
//     stabilizer, and exactly 1 more when faith is on (deterministic by seed)
//   • One step: act()'s action
//   • Progress in words from the baseline and recovery

if (typeof module !== "undefined") {
  require("./movers.js");
}

(function (MF) {
  "use strict";
  const { NAMES, GROUND, FIXED, ACTIVE, idx, isGround, cap, listJoin, rng, weights } = MF.Movers;
  // ======================================================================
  // Words, not numbers: the feelings + affirmations card.
  // ======================================================================
  // Intensity bands: < 0.3 a little, 0.3–0.6 quite, > 0.6 strongly.
  /** Intensity word for a value: < 0.3 a little, 0.3–0.6 quite, > 0.6 strongly. */
  const band = x => (x > 0.6 ? "strongly" : x >= 0.3 ? "quite" : "a little");
  const FEEL = {
    fear: "anxious", sadness: "sad", anger: "angry", shame: "ashamed",
    rumination: "caught in replaying thoughts", avoidance: "pulled to avoid things",
    calm: "restless", connection: "alone", hope: "discouraged",
  };
  const FEEL_HIGH = { calm: "calm", connection: "connected", hope: "hopeful" };
  // How strongly each mover is felt: hard/process by value, grounding by how far below neutral.
  /** The one to three most strongly felt movers (grounding counts by how far below neutral). */
  function felt(e) {
    return NAMES.map((n, j) => ({ n, x: isGround[j] ? (e[j] <= 0.4 ? (0.5 - e[j]) / 0.5 : 0) : (e[j] >= ACTIVE ? e[j] : 0) }))
      .filter(f => f.x > 0).sort((p, q) => q.x - p.x || idx[p.n] - idx[q.n]).slice(0, 3);
  }
  /** "You may be feeling …" in words. */
  function feelingLine(m) {
    const f = felt(m.e);
    if (f.length) return `You may be feeling ${listJoin(f.map(x => `${band(x.x)} ${FEEL[x.n]}`))}.`;
    const high = GROUND.filter(n => m.e[idx[n]] >= 0.65).map(n => FEEL_HIGH[n]);
    return high.length ? `You may be feeling ${listJoin(high)}.` : "Nothing strong stands out right now; you may be feeling fairly even.";
  }

  // The relationships between the mental structures, read from W.
  const NOUN = { fear: "fear", sadness: "sadness", anger: "anger", shame: "shame", rumination: "the replaying", avoidance: "avoiding", calm: "calm", connection: "connection", hope: "hope" };
  const EFFECT = {
    "sadness>rumination": "it starts the replaying loop", "rumination>sadness": "it keeps the sadness going",
    "fear>avoidance": "it makes you want to avoid things", "avoidance>fear": "it keeps the fear alive",
    "shame>avoidance": "it makes you want to hide", "avoidance>sadness": "it can leave you sadder",
    "shame>sadness": "it can turn into sadness", "rumination>shame": "it can deepen the shame",
    "anger>rumination": "it keeps the scene replaying", "rumination>anger": "it keeps the anger hot",
    "rumination>fear": "it feeds worry", "fear>anger": "it can come out as anger",
    "fear>calm": "it takes away your calm", "sadness>hope": "it dims your hope",
    "shame>connection": "it pulls you away from people", "avoidance>connection": "it can cut you off from people",
  };
  const SOFTENER = { calm: "slowing down", connection: "connection", hope: "hope" };
  const LOW_LINK = {
    connection: "When you feel alone, shame and sadness grow more easily; reaching toward one person is what softens it.",
    calm: "When you're restless, fear and anger flare up more easily; slowing your breath is what softens it.",
    hope: "When hope runs low, sadness and avoiding grow more easily; one small plan is what softens it.",
  };
  const CREEP = { fear: "worry", sadness: "sadness", anger: "anger", shame: "shame", rumination: "replaying thoughts", avoidance: "the urge to avoid things" };
  // The strongest effect of the top mover, weighted by how present its target is.
  /** The top mover's strongest effect, weighted by how present its target is. */
  function strongestLink(m, W) {
    const t = idx[m.top];
    let best = null;
    NAMES.forEach((n, j) => {
      const w = W[t][j];
      if (!EFFECT[`${m.top}>${n}`] || !w) return;
      const presence = isGround[j] ? Math.max(0, m.h[j] - m.e[j]) : m.e[j];
      const score = Math.abs(w) * (presence + 0.01);
      if (!best || score > best.score) best = { to: n, w, score };
    });
    return best;
  }
  /** How the feelings connect: the strongest link, a loop, λ in words, and a hidden rise. */
  function connectLines(state, m) {
    const W = weights(state.w), out = [];
    if (m.top) {
      const L = strongestLink(m, W);
      const soft = m.stabilizer ? `${SOFTENER[m.stabilizer]} is what softens it` : "one small step is what softens it";
      out.push(L ? `When ${NOUN[m.top]} grows, ${EFFECT[`${m.top}>${L.to}`]}; ${soft}.` : `${cap(NOUN[m.top])} is the loudest part right now; ${soft}.`);
      const loop = m.loops[0];
      if (loop && ![loop.a, loop.b].every(x => x === m.top || (L && x === L.to))) out.push(`${cap(NOUN[loop.a])} and ${NOUN[loop.b]} are feeding each other.`);
    } else if (m.stabilizer && LOW_LINK[m.stabilizer]) out.push(LOW_LINK[m.stabilizer]);
    if (m.lambda !== null) out.push(m.unstable ? "These feelings are feeding each other right now, so go gently." : "These feelings tend to ease on their own.");
    if (m.hidden[0]) out.push(`If this stays unspoken, ${CREEP[m.hidden[0].name]} may creep in.`);
    if (!out.length) out.push("Nothing is pulling hard on anything else right now.");
    return out;
  }

  // Affirmations: true, grounded first-person sentences (not promises).
  const AFFIRM = {
    connection: ["I am worth reaching out to.", "I can let one person in a little.", "Feeling alone right now doesn't mean I am alone for good.", "I belong with people, even on hard days."],
    calm: ["I can slow down; this moment will pass.", "My breath is something I can steady.", "I can take this one breath at a time.", "I don't have to solve everything right now."],
    hope: ["Small steps still count.", "I can plan one small thing for tomorrow.", "Things have changed before, and they can change again.", "I don't need to see the whole road to take one step."],
    shame: ["I made mistakes; I am not a mistake.", "I can be as kind to myself as I would be to a friend.", "A hard moment does not decide who I am.", "I can own what I did without hating who I am."],
    anger: ["My anger shows what matters; I choose how to act.", "I can pause before I answer.", "I can feel angry and still be fair.", "I can care about this without letting it drive me."],
    fear: ["I can feel afraid and still take one safe step.", "A worry is a guess, not a fact.", "I can notice what is actually here right now.", "I have gotten through hard moments before."],
    rumination: ["I can set this thought down for now.", "Going over it again isn't the same as solving it.", "I can come back to this later, at a time I choose.", "I can turn toward what's in front of me."],
    avoidance: ["I can let this feeling be here without obeying it.", "I can take one small step before I feel ready.", "I can face a small piece of this.", "Starting small is still starting."],
    sadness: ["It's okay to feel this; I'm not alone in it.", "This heaviness is real, and it can change.", "I can be gentle with myself today.", "Sadness can sit with me while I do one small thing."],
  };
  const FAITH_AFFIRM = {
    anger: ["God can give me patience for the next moment.", "I can bring this anger to God before I act."],
    shame: ["I am held by mercy, not measured by this moment.", "God's mercy is bigger than my mistake."],
    fear: ["I can trust God with the next hour.", "I am not facing this alone; God is with me."],
    sadness: ["My hope rests in God, even when I feel low.", "God is near to the brokenhearted, and near to me."],
    rumination: ["I can leave this in God's hands for now.", "I don't have to carry every thought; I can let go and trust."],
    avoidance: ["God can give me courage for one small step.", "I can ask for courage and take the next step."],
    calm: ["God's peace can meet me in this breath.", "I can rest in God for one quiet moment."],
    connection: ["I am known and loved by God, and I can reach out to others.", "God made me for connection; I can reach out today."],
    hope: ["God is not finished with my story.", "My hope can rest in God, one day at a time."],
  };
  /** Pick k different items with a seeded generator. */
  const pickN = (list, k, rand) => { const a = list.slice(), out = []; while (out.length < k && a.length) out.push(a.splice(Math.floor(rand() * a.length), 1)[0]); return out; };
  // The mover that moves most toward home gives two; the stabilizer gives one; faith adds one.
  /** Two affirmations from the mover that moves most, one from the stabilizer, and one more with faith on. */
  function affirmations(m, opts = {}) {
    const rand = rng(Number.isFinite(opts.seed) ? opts.seed : 1);
    const main = m.mover || m.stabilizer || "calm";
    const out = pickN(AFFIRM[main], 2, rand);
    const stab = m.stabilizer;
    if (stab && stab !== main) out.push(...pickN(AFFIRM[stab], 1, rand));
    if (opts.faith) out.push(...pickN(FAITH_AFFIRM[main], 1, rand));
    return out;
  }
  /** Progress in words from the baseline and the recovery estimate. */
  function progressLine(m) {
    const parts = [];
    const p = m.baseline;
    if (p.dPrev === null) parts.push("This is your first check-in here, so there's nothing to compare yet.");
    else {
      const diff = p.dPrev - m.d;
      parts.push(diff > 0.15 ? "You're closer to steady than your recent days."
        : diff > 0.03 ? "You're a little closer to steady than your recent days."
        : diff >= -0.03 ? "You're about where you've been lately."
        : diff >= -0.15 ? "You're a little further from steady than lately; one small step is enough."
        : "Today is heavier than your recent days; go gently, and one small step is enough.");
    }
    const r = m.recovery;
    if (r) {
      if (m.d < FIXED.eps) parts.push("You're close to steady right now.");
      else if (!r.reached) parts.push("This may take time, and you don't have to do it alone.");
      else if (r.steps <= 2) parts.push("You're near steady ground.");
      else if (r.steps <= 5) parts.push("A few small steps could bring you close to steady.");
      else if (r.steps <= 12) parts.push("With small steps over the coming days, this can ease.");
      else parts.push("This may take a while, and small steps still count.");
    }
    return parts.join(" ");
  }
  // The default card: words only.
  /** The default card: words only (feeling, connections, affirmations, one step, progress). */
  function card(state, m, opts = {}) {
    return {
      feeling: feelingLine(m),
      connect: connectLines(state, m),
      affirmations: affirmations(m, opts),
      step: m.action,
      progress: progressLine(m),
    };
  }
  // Plain text of the card (copy and tests).
  /** The card as plain text lines (Copy, tests). */
  function lines(state, m, opts = {}) {
    const c = card(state, m, opts);
    return [
      `What you may be feeling: ${c.feeling.replace(/^You may be feeling /, "")}`,
      `How they connect: ${c.connect.join(" ")}`,
      "Affirmations:", ...c.affirmations.map(x => `  ${x}`),
      `One step: ${c.step}`,
      c.progress,
    ];
  }


  MF.Words = { band, FEEL, felt, feelingLine, NOUN, EFFECT, SOFTENER, LOW_LINK, CREEP, connectLines, AFFIRM, FAITH_AFFIRM, affirmations, progressLine, card, lines };
})(typeof window !== "undefined" ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
if (typeof module !== "undefined") module.exports = global.MF.Words;
