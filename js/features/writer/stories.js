// features/writer/stories.js — (Writer) short, calm, grounded stories for the Grounding Loop.
//
// Built from templates on the phone. No network, no model.
// Each story follows one shape:
//   a made-up character feels the mirage thought (named briefly and calmly)
//   -> notices one real thing -> says a true reframe -> takes one small step
//   -> nothing magic happens, but they feel a little more grounded
//   -> a gentle question back to you.
// Stories make no promises about outcomes, and nothing here is saved.

if (typeof module !== "undefined") require("../../core/movers.js");

const Stories = (function () {
  const G = typeof Grounding !== "undefined" ? Grounding : require("../../core/grounding.js");

  // Invented creatures and simple travelers. Not real animals.
  // The first five come from Project Veda (veda/mental.py), so the same
  // creatures appear across Ryan's projects. Each pattern keeps one guide,
  // so a thought type always meets the same creature; only the wording varies.
  const CHARACTERS = [
    { name: "Lumowl", intro: "Lumowl, a lantern-eyed night watcher," },
    { name: "Mistfawn", intro: "Mistfawn, a fog spirit who slows every breath," },
    { name: "Tidelyn", intro: "Tidelyn, a sea serpent who links far shores," },
    { name: "Hivewright", intro: "Hivewright, a many-armed builder who lays one brick a day," },
    { name: "Pell", intro: "Pell, a small fernling with leaf-shaped ears," },
    { name: "Brakkor", intro: "Brakkor, a stone-maned beast who walks toward the storm," },
    { name: "Sela", intro: "Sela, a traveler in a patched blue coat," },
    { name: "Nim", intro: "Nim, a quiet lamplighter from the edge of town," },
  ];

  // Pattern -> guide. Chosen to fit each creature's role in Veda.
  const PATTERN_CREATURE = {
    meaning: "Lumowl",          // watches in the dark, checks what is really there
    fortuneTelling: "Mistfawn", // slows the racing guess about tomorrow
    mindReading: "Tidelyn",     // reaches across to ask, instead of guessing
    allOrNothing: "Hivewright", // one brick at a time, never all or nothing
    labeling: "Pell",           // small and gentle with itself
    catastrophizing: "Brakkor", // walks toward the storm and finds it smaller
    hopelessness: "Sela",       // keeps walking, one patch at a time
    none: "Nim",                // lights one lamp
  };

  // How each arc names the mirage: briefly, calmly, never vividly.
  const MIRAGE = {
    meaning: ["that the hard week was some kind of curse", "that the trouble was a sign of being punished", "that bad luck had been marked on {them}"],
    fortuneTelling: ["that tomorrow was sure to go badly", "that the plan would fail before it started", "that the ending was already decided"],
    mindReading: ["that everyone was quietly thinking the worst of {them}", "that a friend's short reply meant something cold", "that the others had already judged {them}"],
    allOrNothing: ["that it was always like this and never would be different", "that nothing {they} did ever worked", "that everything was going wrong"],
    labeling: ["that one mistake meant {they} were a failure", "that {they} were simply not good enough", "a harsh name for {themself}"],
    catastrophizing: ["that one small problem would turn into a disaster", "that the worst was surely coming", "that {they} could not handle what was next"],
    hopelessness: ["that there was no point in trying today", "that nothing would get better", "that the heaviness would never lift"],
    none: ["a heavy thought that felt bigger than it was", "a cloudy thought that would not settle", "an old worry that came back"],
  };

  // Openings by mover: the strongest hard/process mover, or the grounding mover
  // with the biggest gap (hope, connection, calm mean "low hope" and so on).
  // Used unless the text has a clear thinking pattern that fits that mover.
  const MOVER_MIRAGE = {
    anger: ["a hot, tight thought that someone had wronged {them}", "that it wasn't fair, and the unfairness burned", "a flash of anger that wanted to answer right away"],
    shame: ["that something about {them} was wrong underneath it all", "that {they} should hide so no one would see", "a small, hot feeling of not being enough"],
    fear: ["a tight worry that something was about to go wrong", "a jumpy feeling that kept scanning for danger", "a worry that would not sit still"],
    sadness: ["a heavy, gray feeling that sat on {their} chest", "that something good had been lost", "a tiredness that felt like sorrow"],
    rumination: ["the same old scene, replaying again and again", "a question that kept circling without an answer", "a loop of going over what had already happened"],
    avoidance: ["that it would be easier not to face it today", "an urge to put it off one more time", "that if {they} just didn't look, it would go away"],
    hope: ["that nothing ahead was worth reaching for", "that the road forward had gone dim", "that trying again would not change anything"],
    connection: ["that no one would notice if {they} disappeared for a while", "that {they} were on the outside, looking in", "a quiet, far-away loneliness"],
    calm: ["a buzzing restlessness with nowhere to land", "that {they} could not slow down", "a busy, unsettled hum under everything"],
  };
  const MOVER_NAMING = {
    anger: ["The anger was real and it pointed at something that mattered, but it did not have to choose {their} next move.", "Anger can be a signal; {they} could listen to it without letting it drive."],
    shame: ["The feeling said something was wrong with {them}, but a hard moment is not a verdict on a person.", "Shame wanted {them} to hide, yet hiding was the one thing that would keep it loud."],
    fear: ["The worry was a body alarm, not a forecast, and alarms can ring when nothing is wrong.", "Fear was trying to protect {them}; {they} could thank it and still check what was real."],
    sadness: ["The sadness was real, and it could be felt without deciding anything.", "Sad is a weather, not a climate; it can be here and still pass."],
    rumination: ["Going over it again had not brought an answer, only more of the same.", "The loop felt like thinking, but it was turning in place, not moving forward."],
    avoidance: ["Putting it off felt like relief, but the relief was small and the weight came back.", "Not looking made it bigger; one small look would make it its true size."],
    hope: ["Dim is not the same as dark; the next step only needed a little light.", "Hope did not need to be big. It only needed one small next thing."],
    connection: ["Feeling alone was real, but it was a feeling about now, not proof about everyone.", "Loneliness says no one is there; often someone is, a message away."],
    calm: ["The body was running fast, and bodies can be slowed down on purpose.", "Restless is a state, not a fact about the day; a slower breath can change it."],
  };
  // Thinking patterns that fit each mover. Only these may replace a mover's opening.
  const MOVER_FITS = {
    anger: [], shame: ["labeling", "mindReading"], fear: ["fortuneTelling", "catastrophizing", "meaning"],
    sadness: ["hopelessness"], rumination: ["allOrNothing"], avoidance: ["fortuneTelling"],
    hope: ["hopelessness", "fortuneTelling"], connection: ["mindReading"], calm: ["catastrophizing"],
  };
  const MOVERS = Object.keys(MOVER_MIRAGE);

  // Which lines open the story: the mover's own, or a fitting pattern's.
  function opening(mover, read) {
    const arc = arcFor(read);
    if (!MOVERS.includes(mover)) return { from: "pattern", key: arc, mirage: MIRAGE[arc], naming: NAMING[arc] };
    if (arc !== "none" && MOVER_FITS[mover].includes(arc)) return { from: "pattern", key: arc, mirage: MIRAGE[arc], naming: NAMING[arc] };
    return { from: "mover", key: mover, mirage: MOVER_MIRAGE[mover], naming: MOVER_NAMING[mover] };
  }

  const OPENINGS = [
    "{Intro} woke one gray morning with an old thought: {mirage}.",
    "One quiet evening, {intro} sat down and felt a familiar thought arrive: {mirage}.",
    "On the walk home, {intro} felt a thought settling in: {mirage}.",
  ];

  // The calm naming line, per arc.
  const NAMING = {
    meaning: ["The thought sounded certain, but it was a story about what the day meant, not something {they} could see.", "It felt like a hidden meaning, yet nothing in front of {them} showed it."],
    fortuneTelling: ["It sounded like a fact, but it was only a guess about a day that had not happened yet.", "The thought spoke as if it knew the ending, though no one does."],
    mindReading: ["It felt true, but {they} had not actually heard anyone say it.", "The thought was guessing at what others thought, and guesses are not facts."],
    allOrNothing: ["The thought used big words, always and never, that rarely fit a real life.", "It sounded total, but real days are usually mixed."],
    labeling: ["The label was loud, but one moment does not decide who someone is.", "It was a name for a mistake, not a name for {them}."],
    catastrophizing: ["The thought jumped to the worst ending and skipped all the likely ones.", "It made the problem sound enormous, though it had not grown at all."],
    hopelessness: ["The heaviness was real, but heavy is not the same as hopeless.", "It felt final, but feelings move, even slowly."],
    none: ["{They} let the thought be a thought, without arguing and without obeying.", "It was only a thought, and {they} could look at it from the outside."],
  };

  const REAL_THINGS = [
    "a cup of water on the table, still cool",
    "soft light resting on the wall",
    "a message from a friend, unanswered but kind",
    "a short list of tasks, two of them already done",
    "their own hands, steady enough to hold a pen",
    "the path outside, wet from rain and still walkable",
    "a window, and a patch of sky that was not falling",
    "a pair of shoes by the door, ready for a short walk",
  ];

  const NOTICING = [
    "{They} looked around and noticed what was actually there: {real}.",
    "Instead of following the thought, {they} named one real thing in sight: {real}.",
    "{They} slowed down and found something solid: {real}.",
  ];

  const SAYING = [
    "So {they} said quietly, \u201C{reframe}\u201D",
    "{They} chose a truer sentence and said it out loud: \u201C{reframe}\u201D",
    "Then {they} tried on a truer thought: \u201C{reframe}\u201D",
  ];

  const DEFAULT_STEPS = [
    "walk to the end of the path and back",
    "send one short message to a friend",
    "do one small task that took two minutes",
    "drink a glass of water and open a window",
  ];

  const STEPPING = [
    "Then {they} took one small step: {step}.",
    "After that, {they} did one real thing: {step}.",
    "{They} picked one small step and did it: {step}.",
  ];

  const FAITH = [
    "{They} remembered that God's love isn't measured by how today went.",
    "{They} whispered a short prayer, asking only for help with the next step.",
  ];

  const LANDING = [
    "Nothing big changed, and the day was still the day, but {they} stood a little more on the ground.",
    "The problem did not vanish, but it was smaller than the thought had said, and {they} felt steadier.",
    "It was not a perfect fix, only a real one, and that was enough for this moment.",
  ];

  const QUESTIONS = [
    "What is one real thing you can see from where you are right now?",
    "What is one small step that would be real for you today?",
    "If you said your truer sentence out loud, how would it sound?",
    "Who is one person you could share a small, true thing with today?",
  ];

  const ARCS = Object.keys(MIRAGE);

  // The seeded random generator is shared with the rest of the app (core/movers.js).
  const rng = (typeof window !== "undefined" ? window.MF : global.MF).Movers.rng;

  /** Escape text for safe use inside HTML. */
  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // Shorten at a word boundary. Trailing punctuation is trimmed so it reads cleanly in a quote or clause.
  function truncate(text, max) {
    const clean = String(text || "").replace(/\s+/g, " ").trim();
    if (clean.length <= max) return clean;
    const cut = clean.slice(0, max);
    const at = cut.lastIndexOf(" ");
    return (at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,;:.!?-]+$/, "") + "\u2026";
  }

  // Inner double quotes become single curly quotes, so the story's own quote marks stay clear.
  function asReframe(text) {
    let t = truncate(text, 160).replace(/"([^"]*)"/g, "\u2018$1\u2019").replace(/"/g, "\u2019");
    if (t && !/[.!?\u2026]$/.test(t)) t += ".";
    return t;
  }

  // "Walk for five minutes." -> "walk for five minutes" (fits after a colon).
  // Outside quoted text: colons become commas, and "you" becomes "they"
  // when the story is about a character.
  function asStep(text, you) {
    let t = truncate(text, 120).replace(/[.!?]+$/, "");
    if (t && /^[A-Z][a-z]/.test(t)) t = t[0].toLowerCase() + t.slice(1);
    return t.split(/("[^"]*"|\u201C[^\u201D]*\u201D)/).map((part, i) => {
      if (i % 2) return part;
      part = part.replace(/:\s*/g, ", ");
      if (!you) part = part.replace(/\byourself\b/gi, "themself").replace(/\byour\b/gi, "their").replace(/\byou\b/gi, "they");
      return part;
    }).join("").replace(/,\s*$/, "");
  }

  /** Capitalize the first letter. */
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  /** Replace {key} placeholders in a template from ctx. */
  function fill(template, ctx) {
    return template.replace(/\{(\w+)\}/g, (m, key) => (key in ctx ? ctx[key] : m));
  }

  /** The story arc for a reading: its top pattern, or "none". */
  function arcFor(read) {
    const top = read && read.patterns && read.patterns[0];
    return ARCS.includes(top) ? top : "none";
  }

  /**
   * Tell one creature story. opts: { read, thought, reframe, step, faith, you, seed, avoid, mover }.
   * Returns { crisis: true } and nothing else when any text reads as a crisis.
   */
  function tell(opts = {}) {
    const texts = [opts.thought, opts.reframe, opts.step].filter(Boolean);
    if (texts.some(t => G.isCrisis(t))) return { crisis: true };
    const read = opts.read || (opts.thought ? G.read(opts.thought) : null);
    if (read && read.crisis) return { crisis: true };
    const arc = arcFor(read);
    const faith = opts.faith === undefined ? arc === "meaning" : !!opts.faith;
    let seed = Number.isFinite(opts.seed) ? opts.seed : Math.floor(Math.random() * 1e9);

    for (let attempt = 0; attempt < 12; attempt++) {
      const story = compose(arc, read, opts, faith, seed + attempt * 7919);
      if (!opts.avoid || story.key !== opts.avoid) return story;
    }
    return compose(arc, read, opts, faith, seed);
  }

  /** Write one story for an arc with a seeded choice of creature, opening and lines. */
  function compose(arc, read, opts, faith, seed) {
    const rand = rng(seed);
    const pick = list => list[Math.floor(rand() * list.length)];
    const who = CHARACTERS.find(c => c.name === (opts.character || PATTERN_CREATURE[arc])) || CHARACTERS[0];
    const oi = Math.floor(rand() * OPENINGS.length);
    const you = !!opts.you;

    const p = you
      ? { they: "you", them: "you", themself: "yourself", their: "your", intro: "you", Intro: "You" }
      : { they: "they", them: "them", themself: "themself", their: "their", intro: who.intro, Intro: who.intro };
    const pro = { they: p.they, them: p.them, themself: p.themself, their: p.their, They: cap(p.they) };

    const reframe = asReframe(opts.reframe) || asReframe((read && read.reframes && read.reframes[0]) || "This is a thought, not a fact.");
    const step = asStep(opts.step, you) || pick(DEFAULT_STEPS);
    let real = pick(REAL_THINGS);
    if (you) real = real.replace(/\btheir\b/g, "your");

    const op = opening(opts.mover, read);
    const picks = [];
    const pickI = list => { const i = Math.floor(rand() * list.length); picks.push(i); return list[i]; };
    const sentences = [
      fill(OPENINGS[oi], { ...pro, intro: p.intro, Intro: p.Intro, mirage: fill(pick(op.mirage), pro) }),
      fill(pickI(op.naming), pro),
      fill(pickI(NOTICING), { ...pro, real }),
      fill(pickI(SAYING), { ...pro, reframe }),
      fill(pickI(STEPPING), { ...pro, step }),
    ];
    // If the step is already a prayer, use the other faith line so it isn't said twice.
    if (faith) sentences.push(fill(/\bpray/i.test(step) ? FAITH[0] : pick(FAITH), pro));
    sentences.push(fill(pickI(LANDING), pro));
    sentences.push(pick(QUESTIONS));

    // A step that ends in a quoted question already has its punctuation.
    const tidy = sentences.map(s => cap(s).replace(/([.!?\u2026]["\u201D])\.$/, "$1"));
    sentences.splice(0, sentences.length, ...tidy);
    const text = sentences.join(" ");
    return { crisis: false, arc, opening: op.key, openingFrom: op.from, faith, you, character: who.name, tag: `${who.name}, ${who.intro.slice(who.name.length + 2).replace(/,$/, "")}`, key: [oi, ...picks].join("-"), sentences, text };
  }

  // Safe markup, if a caller ever needs HTML. The app itself uses textContent.
  function toHTML(story) {
    return story && !story.crisis ? `<p>${escapeHTML(story.text)}</p>` : "";
  }

  // Shared with games.js so games use the same story pieces.
  const parts = { MIRAGE, NAMING, MOVER_MIRAGE, MOVER_NAMING, MOVER_FITS, opening, REAL_THINGS, FAITH, LANDING, QUESTIONS, DEFAULT_STEPS, asReframe, asStep, rng, fill, cap };

  return { tell, toHTML, escapeHTML, truncate, arcFor, opening, MOVERS, ARCS, CHARACTERS, PATTERN_CREATURE, parts };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Stories;
