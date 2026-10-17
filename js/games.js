// games.js — small offline games made from the same pieces as the stories.
//
// Three games, all built on the phone from templates (no network, no model):
//   path    Choose a path: 4 scenes. Each has one mirage choice and 1-2
//           grounded ones. The mirage gets kind feedback and a retry. No game over.
//   spot    Spot the mirage: sort 6 short lines into "mirage" or "real".
//   tiles   Rebuild the sentence: tap shuffled word tiles to rebuild the reframe.
//           Long reframes fall back to the path game.
// A steadiness meter (0..100) rises with grounded choices and never drops.
// Nothing here is saved. The UI may keep a count of games played.

const Games = (function () {
  const G = typeof Grounding !== "undefined" ? Grounding : require("./grounding.js");
  const S = typeof Stories !== "undefined" ? Stories : require("./stories.js");
  const P = S.parts;

  const TYPES = ["path", "spot", "tiles"];
  const MAX_TILE_WORDS = 14;

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

  // First-person mirage lines for the sorting game, with a kind "why".
  const SPOT_MIRAGE = {
    meaning: [["This must be a sign I'm being punished.", "A hard event, with a hidden meaning added on top."], ["Bad luck follows me everywhere.", "Feels true, but it is a story, not something you can see."], ["I'm cursed, so why try.", "The curse is the mirage. The trying is real."]],
    fortuneTelling: [["Tomorrow is definitely going to go badly.", "A guess about a day that hasn't happened."], ["There's no way this works out.", "No one can see the ending yet."], ["I already know how this ends.", "Predicting, not knowing."]],
    mindReading: [["They all think I'm strange.", "A guess at other minds. No one said it."], ["Her short text means she's upset with me.", "There are many reasons for a short text."], ["Everyone noticed my mistake.", "Most people are busy with their own day."]],
    allOrNothing: [["Nothing I do ever works.", "\u201CNothing\u201D and \u201Cever\u201D are big words that rarely fit."], ["I always mess everything up.", "\u201CAlways\u201D erases the times it went fine."], ["It's completely ruined.", "Real things are usually partly okay."]],
    labeling: [["I'm a total failure.", "A mistake is something you did, not who you are."], ["I'm just not good enough.", "A harsh label, not a fact."], ["I'm such an idiot.", "You'd never say that to a friend."]],
    catastrophizing: [["This small problem will ruin everything.", "It jumps to the worst ending and skips the likely ones."], ["I can't handle any of this.", "You've handled hard things before."], ["It's going to be a disaster.", "Worst case is not the same as most likely."]],
    hopelessness: [["There's no point in trying.", "Heavy is not the same as hopeless."], ["It will never get better.", "Feelings move, even slowly."], ["Nothing can help me now.", "One small thing can still help a little."]],
    none: [["This feeling will last forever.", "Feelings rise and fall."], ["Everything is wrong today.", "Usually some things are okay too."], ["I'll never feel calm again.", "\u201CNever\u201D is a guess, not a fact."]],
  };

  const SPOT_REAL = [
    ["Today was hard, and I'm still here.", "Both parts are true and you can see them."],
    ["I can take one small step right now.", "A step you can actually take."],
    ["I don't know how this ends yet.", "Honest about what you can and can't see."],
    ["One hard day is not a whole life.", "True to size."],
  ];

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

  function spotGame(pc, rand) {
    const mirage = SPOT_MIRAGE[pc.arc].map(([text, why]) => ({ text, kind: "mirage", why }));
    const realPool = [
      [`I can see ${pc.real}.`.replace(/\btheir\b/g, "my"), "Something you can actually see."],
      [pc.reframe, "Your truer sentence."],
    ].concat(shuffle(SPOT_REAL, rand));
    const real = realPool.slice(0, 3).map(([text, why]) => ({ text, kind: "real", why }));
    return { items: shuffle(mirage.concat(real), rand) };
  }

  const words = s => s.replace(/[\u201C\u201D"]/g, "").split(/\s+/).filter(Boolean);

  // Uses the whole reframe if it is short, otherwise its first short sentence.
  function tileSentence(reframe) {
    const fits = s => { const n = words(s).length; return n >= 3 && n <= MAX_TILE_WORDS && !s.endsWith("\u2026"); };
    if (fits(reframe)) return reframe;
    const parts = reframe.match(/[^.!?]+[.!?]/g) || [];
    return parts.map(x => x.trim()).find(fits) || null;
  }

  function tilesGame(pc, rand) {
    const sentence = tileSentence(pc.reframe);
    if (!sentence) return null;
    const target = words(sentence);
    let tiles = shuffle(target.map((w, i) => ({ id: i, word: w })), rand);
    // Make sure the shuffle is not already the answer.
    if (tiles.every((t, i) => t.word === target[i])) tiles = tiles.slice(1).concat(tiles[0]);
    return { sentence, target, tiles };
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
    let type = TYPES.includes(opts.type) ? opts.type : "path";
    let body;
    let fallback = false;
    if (type === "tiles") {
      body = tilesGame(pc, rand);
      if (!body) { type = "path"; fallback = true; }
    }
    if (type === "path") body = pathGame(pc, rand);
    if (type === "spot") body = spotGame(pc, rand);
    const steps = type === "path" ? body.scenes.length : type === "spot" ? body.items.length : body.target.length;
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

  // Helper for the tile game: is this word the next one?
  function tileFits(game, placedCount, word) {
    return game.target[placedCount] === word;
  }

  return { TYPES, SAMPLES, MAX_TILE_WORDS, make, steadiness, tileFits, words };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Games;
