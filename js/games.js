// games.js — small offline games made from the same pieces as the stories.
//
// One game, built on the phone from templates (no network, no model):
//   path    Choose a path: 4 scenes. Each has one mirage choice and 1-2
//           grounded ones. The mirage gets kind feedback and a retry. No game over.
// A steadiness meter (0..100) rises with grounded choices and never drops.
// Nothing here is saved. The UI may keep a count of games played.

const Games = (function () {
  const G = typeof Grounding !== "undefined" ? Grounding : require("./grounding.js");
  const S = typeof Stories !== "undefined" ? Stories : require("./stories.js");
  const P = S.parts;

  const TYPES = ["path"];

  // A thought to play with when nothing was typed. One per pattern.
  const SAMPLES = {
    meaning: "I'm cursed. Bad things keep happening to me.",
    fortuneTelling: "I'm going to fail the interview.",
    mindReading: "They probably think I am weird.",
    allOrNothing: "Nothing I do ever works.",
    labeling: "I'm such a loser.",
    catastrophizing: "This is a disaster.",
    hopelessness: "What's the use of trying.",
    none: "Today felt heavy.",
  };

  // Scene choices for the path game. Mirage choices are written gently.
  const PATH_MIRAGE = [
    ["Believe it and stay stuck", "That's the mirage pulling. It pulls everyone sometimes. Try another way."],
    ["Look for more proof that it's true", "Searching for proof feeds the mirage. Try another way."],
    ["Repeat the old thought until it feels certain", "Repeating a thought makes it loud, not true. Try another way."],
    ["Wait until the feeling is completely gone", "Feelings don't have to leave before you act. Try another way."],
  ];

  const GAME_STEPS = [
    "walk to the end of the path and back",
    "send one short message to a friend",
    "do one task that takes two minutes",
    "drink a glass of water and open a window",
  ];

  function shuffle(list, rand) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // The same pieces a story would use: creature, mirage line, real thing, reframe, step.
  function pieces(opts, rand) {
    const read = opts.read || G.read(opts.thought || "");
    const arc = S.arcFor(read);
    const name = S.PATTERN_CREATURE[arc];
    const who = S.CHARACTERS.find(c => c.name === name);
    const pick = list => list[Math.floor(rand() * list.length)];
    const pro = { they: "they", them: "them", themself: "themself", They: "They" };
    const reframe = P.asReframe(opts.reframe) || P.asReframe((read.reframes && read.reframes[0]) || "This is a thought, not a fact.");
    const step = P.asStep(opts.step, false) || pick(GAME_STEPS);
    const faith = opts.faith === undefined ? arc === "meaning" : !!opts.faith;
    return {
      read, arc, faith, reframe, step,
      creature: name,
      tag: `${name}, ${who.intro.slice(name.length + 2).replace(/,$/, "")}`,
      mirage: P.fill(pick(P.MIRAGE[arc]), pro),
      naming: P.fill(pick(P.NAMING[arc]), pro),
      real: pick(P.REAL_THINGS),
      faithLine: faith ? P.fill(P.FAITH[0], pro) : "",
      landing: P.fill(pick(P.LANDING), pro),
      question: pick(P.QUESTIONS),
    };
  }

  function pathGame(pc, rand) {
    const n = pc.creature;
    const choice = (text, grounded, feedback) => ({ text, grounded, feedback });
    const scenes = [
      {
        title: "A thought arrives",
        text: `${n} feels a thought arrive: ${pc.mirage}.`,
        prompt: `What does ${n} do?`,
        choices: [
          choice(PATH_MIRAGE[0][0], false, PATH_MIRAGE[0][1]),
          choice("Notice it's a thought, not a fact", true, pc.naming),
        ],
      },
      {
        title: "Look around",
        text: `The thought feels loud. ${n} could look for proof, or look at what's really here.`,
        prompt: "What next?",
        choices: [
          choice(PATH_MIRAGE[1][0], false, PATH_MIRAGE[1][1]),
          choice("Name one real thing in sight", true, P.cap(`${n} sees ${pc.real}.`)),
          choice("Take three slow breaths first", true, `${n} breathes out a little longer each time, then sees ${pc.real}.`),
        ],
      },
      {
        title: "A truer sentence",
        text: `${n} wants something to hold on to.`,
        prompt: "Which sentence?",
        choices: [
          choice(PATH_MIRAGE[2][0], false, PATH_MIRAGE[2][1]),
          choice(`\u201C${pc.reframe}\u201D`, true, "That one is true and usable."),
        ].concat(pc.faith ? [choice("Pray a short prayer for help with the next step", true, pc.faithLine)] : []),
      },
      {
        title: "One small step",
        text: `${n} is ready for something small and real.`,
        prompt: "Which step?",
        choices: [
          choice(PATH_MIRAGE[3][0], false, PATH_MIRAGE[3][1]),
          choice(P.cap(pc.step), true, `${n} does it. Nothing magic, just real.`),
        ],
      },
    ];
    scenes.forEach(s => { s.choices = shuffle(s.choices, rand); });
    return { scenes };
  }

  // opts: { type, read, thought, reframe, step, faith, seed }
  function make(opts = {}) {
    const texts = [opts.thought, opts.reframe, opts.step].filter(Boolean);
    if (texts.some(t => G.isCrisis(t))) return { crisis: true };
    if (opts.read && opts.read.crisis) return { crisis: true };
    const seed = Number.isFinite(opts.seed) ? opts.seed : Math.floor(Math.random() * 1e9);
    const rand = P.rng(seed);
    const pc = pieces(opts, rand);
    if (pc.read.crisis) return { crisis: true };
    const type = "path";
    const body = pathGame(pc, rand);
    const fallback = false;
    const steps = body.scenes.length;
    return {
      crisis: false, type, fallback, seed,
      arc: pc.arc, creature: pc.creature, tag: pc.tag, faith: pc.faith,
      reframe: pc.reframe, step: pc.step,
      ending: [pc.landing, pc.faithLine, pc.question].filter(Boolean),
      steps,
      ...body,
    };
  }

  // Steadiness: starts at 0 and reaches 100 when every step is got right the first time.
  // A retry still earns half. It never goes down.
  function steadiness(firstTry, retried, steps) {
    if (!steps) return 0;
    return Math.max(0, Math.min(100, Math.round((100 * (firstTry + 0.5 * retried)) / steps)));
  }

  return { TYPES, SAMPLES, make, steadiness };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Games;
