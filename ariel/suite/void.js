// ariel/suite/void.js — Out of the Void. Ryan designed this.
// No DOM. The drawing is not a grade. Nothing is sent away.
// Story Seed's hash and PRNG pick the words. The story is the reward.
//
// ===== PARAMS =====
// P0, A0          resting confidence and arousal
// kA              how strongly arousal narrows the gate
// dP, dA          a choice lifts confidence and calms arousal
// need            words before the gate opens, with a skill and enough gifts
// barrierChance   a line sometimes names a trap instead of a skill
// heavyBarriers   several traps in a row invite a pause
//
// ===== EQUATIONS =====
// w = clamp(P · (1 − kA · A), 0, 1)     Void-State gate width, kA = 0.6
// same mark → same seed → same word     Story Seed hash and mulberry32
// any skill helps; the mapped skill helps a little more
// open when gifts ≥ needAffirm AND skills ≥ needSkill AND words ≥ need
"use strict";
(function (root, factory) {
  const Story = typeof module === "object" && module.exports ? require("./story.js") : root.ArielStory;
  const api = factory(Story);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ArielVoid = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Story) {
  const PARAMS = {
    P0: 0.42,
    A0: 0.48,
    kA: 0.6,
    dPAny: 0.04,
    dPBest: 0.08,
    dAAny: -0.03,
    dABest: -0.07,
    dPAffirm: 0.05,
    dPSkill: 0.03,
    need: 6,
    needAffirm: 3,
    needSkill: 1,
    barrierChance: 0.34,
    heavyBarriers: 3,
    close: 18,
    pause: "Pause here. Nothing has to move for a moment.",
    heavyLine: "This seems heavy. Want to pause or talk to someone?",
    out: "You're out. Nothing more to prove.",
    how: "Draw a circle for a word that is already yours, or a line for a skill. A barrier is a chance to choose. This is not a grade.",
    affirmations: ["grace", "enough", "belonging", "rest", "kept", "new", "loved", "safe", "wanted", "peace"],
    skills: ["Check the Facts", "Opposite Action", "TIPP", "STOP", "Radical Acceptance", "Wise Mind", "Self-Soothe", "Pros and Cons"],
    barriers: ["all is lost", "they hate me", "withdraw", "unforgiveness", "no one cares", "it's over"],
    // A barrier and the skills that meet it. Every other skill still helps.
    counters: {
      "they hate me": ["Check the Facts"],
      "withdraw": ["Opposite Action"],
      "all is lost": ["Radical Acceptance", "Wise Mind"],
      "unforgiveness": ["Opposite Action", "Radical Acceptance"],
      "no one cares": ["Check the Facts", "Wise Mind"],
      "it's over": ["Wise Mind", "Radical Acceptance"]
    },
    starters: [
      "People have finished songs by answering each other, one line and then the next.",
      "A letter is two people making something neither could finish alone."
    ]
  };

  function clamp(x) { return Math.max(0, Math.min(1, x)); }

  function blank() {
    return { P: PARAMS.P0, A: PARAMS.A0, bag: [], barrierRun: 0, pending: null, open: false, heavy: false };
  }

  /** w = clamp(P · (1 − 0.6 A), 0, 1). A picture of the gate, not a grade. */
  function width(state) {
    const P = state && state.P != null ? state.P : PARAMS.P0;
    const A = state && state.A != null ? state.A : PARAMS.A0;
    return clamp(P * (1 - PARAMS.kA * A));
  }

  function gateWord(w) {
    if (w >= 0.62) return "The gate is open.";
    if (w >= 0.4) return "The gate is opening.";
    return "The gate is narrow.";
  }

  function pick(rng, list) {
    return list[Math.floor(rng() * list.length) % list.length];
  }

  function closed(mark) {
    if (!mark) return false;
    if (mark.kind === "circle") return true;
    const pts = mark.points || [];
    if (pts.length < 3) return false;
    const a = pts[0], b = pts[pts.length - 1];
    return Math.hypot(a.x - b.x, a.y - b.y) <= PARAMS.close;
  }

  function choicesFor(word, rng) {
    const best = (PARAMS.counters[word] || []).slice();
    const pool = PARAMS.skills.filter(skill => best.indexOf(skill) < 0);
    const want = rng() < 0.5 ? 2 : 3;
    const out = [];
    best.forEach(skill => { if (out.length < want) out.push(skill); });
    while (out.length < want && pool.length) {
      const i = Math.floor(rng() * pool.length);
      out.push(pool.splice(i, 1)[0]);
    }
    return out;
  }

  function reveal(mark) {
    const seed = Story.seedOf([mark]);
    const rng = Story.mulberry32(seed);
    if (closed(mark)) {
      return { seed: seed, kind: "affirmation", word: pick(rng, PARAMS.affirmations), choices: [] };
    }
    if (rng() < PARAMS.barrierChance) {
      const word = pick(rng, PARAMS.barriers);
      return { seed: seed, kind: "barrier", word: word, choices: choicesFor(word, rng) };
    }
    return { seed: seed, kind: "skill", word: pick(rng, PARAMS.skills), choices: [] };
  }

  function ready(bag) {
    const affirm = bag.filter(item => item.kind === "affirmation").length;
    const skills = bag.filter(item => item.kind === "skill").length;
    return bag.length >= PARAMS.need && affirm >= PARAMS.needAffirm && skills >= PARAMS.needSkill;
  }

  function withOpen(state) {
    const open = ready(state.bag);
    return {
      P: state.P, A: state.A, bag: state.bag, barrierRun: state.barrierRun,
      pending: state.pending, open: open, heavy: state.heavy && !open
    };
  }

  function take(state, token) {
    const base = state || blank();
    if (!token) return { state: base, added: false };
    if (base.bag.some(item => item.seed === token.seed)) return { state: base, added: false };
    if (token.kind === "barrier") {
      const run = base.barrierRun + 1;
      return {
        state: {
          P: base.P, A: base.A, bag: base.bag, barrierRun: run, pending: token,
          open: base.open, heavy: run >= PARAMS.heavyBarriers
        },
        added: false
      };
    }
    const bag = base.bag.concat([{ word: token.word, kind: token.kind, seed: token.seed }]);
    const bump = token.kind === "affirmation" ? PARAMS.dPAffirm : PARAMS.dPSkill;
    return {
      state: withOpen({
        P: clamp(base.P + bump), A: base.A, bag: bag, barrierRun: 0, pending: null, heavy: false
      }),
      added: true
    };
  }

  function choose(state, skill) {
    const base = state || blank();
    const pending = base.pending;
    if (!pending || pending.kind !== "barrier") return { state: base, added: false, best: false };
    const mapped = PARAMS.counters[pending.word] || [];
    const best = mapped.indexOf(skill) >= 0;
    const bag = base.bag.concat([{ word: skill, kind: "skill", seed: pending.seed }]);
    return {
      state: withOpen({
        P: clamp(base.P + (best ? PARAMS.dPBest : PARAMS.dPAny)),
        A: clamp(base.A + (best ? PARAMS.dABest : PARAMS.dAAny)),
        bag: bag,
        barrierRun: base.barrierRun,
        pending: null,
        heavy: base.heavy
      }),
      added: true,
      best: best
    };
  }

  function sentence(state) {
    const words = [];
    ((state && state.bag) || []).forEach(item => {
      if (item.kind === "affirmation" && words.indexOf(item.word) < 0) words.push(item.word);
    });
    const few = words.slice(0, 3);
    const head = few.length ? few.join(", ") + " — already yours. " : "";
    return head + PARAMS.out;
  }

  function flood(items) {
    const real = (items || []).map(item => item && (item.text || item)).filter(Boolean);
    return real.length ? real : PARAMS.starters.slice();
  }

  function present(state, mode) {
    const w = width(state);
    const base = { gate: gateWord(w), width: w, heavy: !!(state && state.heavy), heavyLine: state && state.heavy ? PARAMS.heavyLine : "", open: !!(state && state.open) };
    if (!base.open) return base;
    const line = sentence(state);
    if (mode === "listen") return Object.assign(base, { lines: [line, PARAMS.pause], offers: ["Rest here"] });
    return Object.assign(base, {
      lines: [line],
      offers: ["Tell me a story from your words", "Rest here", "Keep this"]
    });
  }

  function bagMarks(state) {
    return ((state && state.bag) || []).map((item, i) => ({
      color: "#7a9cc6",
      t: i,
      kind: "line",
      points: [{ x: i * 20, y: 16 }, { x: i * 20 + 12, y: String(item.word).length * 8 }]
    }));
  }

  return { PARAMS, blank, width, gateWord, reveal, take, choose, ready, sentence, flood, present, bagMarks };
});
