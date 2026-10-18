// core/movers.js — the nine movers and how words become numbers.
//
// What lives here:
//   • the nine movers (hard: fear, sadness, anger, shame; grounding: calm,
//     connection, hope; process: rumination, avoidance/fusion), rest and home
//   • the adjustable variables (a0, k, a_max, b, d) and the fixed constants
//   • W, the small table of who amplifies (+) or dampens (−) whom
//   • the merged lexicon: fromText(text) → word contributions, combine() adds
//     them to where you are
//   • the feelings picker: pick levels (off / a little / quite / strongly at
//     the band midpoints 0, 0.15, 0.45, 0.80) → a state vector, plus extra
//     chips that features register as nudges onto existing movers (fromPick)
//   • small shared helpers (rounding, distance, timestamps, seeded random)
//
// Pure logic, no DOM, nothing stored, nothing sent. A model built from design
// assumptions informed by research (see README), not a measurement of you.

if (typeof module !== "undefined") {
  require("./grounding.js");
  require("./signals.js");
}

(function (MF) {
  "use strict";
  const G = typeof Grounding !== "undefined" ? Grounding : require("./grounding.js");
  const analyzeFn = typeof analyze === "function" ? analyze : require("./signals.js").analyze;

  // ---------- The nine movers ----------
  const NAMES = ["fear", "sadness", "anger", "shame", "calm", "connection", "hope", "rumination", "avoidance"];
  const HARD = ["fear", "sadness", "anger", "shame"];
  const GROUND = ["calm", "connection", "hope"];
  const PROCESS = ["rumination", "avoidance"];
  const LABEL = { fear: "fear/anxiety", avoidance: "avoidance/fusion" };
  const N = NAMES.length;
  const idx = Object.fromEntries(NAMES.map((n, i) => [n, i]));
  const isGround = NAMES.map(n => GROUND.includes(n));
  const REST = NAMES.map(n => (GROUND.includes(n) ? 0.5 : 0));
  const HOME = { calm: 0.8, connection: 0.8, hope: 0.8 };
  const VERSION = 3;
  const LABEL_RE = /^[a-z0-9-]{1,24}$/;
  const ACTIVE = 0.1, MAX_SIM = 200, MAX_CHECKPOINTS = 50, MAX_DAYS = 60, MAX_LINES = 400, MAX_W = 30;

  /** Round to two decimals. */
  const r2 = x => Math.round(x * 100) / 100;
  /** Clamp x into [lo, hi]. */
  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
  /** Clamp x into [0, 1]. */
  const clamp01 = x => clamp(x, 0, 1);
  /** A fresh copy of the rest vector (hard/process 0, grounding 0.5). */
  const rest = () => REST.slice();
  /** Build a 9-vector from {name: value}, filling missing movers from `fill`. */
  const fromObj = (o, fill = rest()) => NAMES.map((n, i) => r2(clamp01(n in o ? Number(o[n]) || 0 : fill[i])));
  /** The home vector h as a 9-array (grounding targets, everything else 0). */
  const homeVec = (o = HOME) => NAMES.map(n => r2(clamp01(Number(o[n]) || 0)));

  // ---------- Variables (the Scientist panel shows these; the rest are fixed) ----------
  const VAR_SPEC = [
    ["aBase", 0.2, 0.05, 0.5, "a0: base step size toward home"],
    ["k", 0.05, 0, 0.2, "k: how much distance from home adds to the step"],
    ["aMax", 0.25, 0.05, 0.5, "a_max: largest step"],
    ["b", 0.1, 0, 0.5, "stabilizer pull (grounding movers press on hard ones)"],
    ["d", 0.3, 0.05, 1, "decay: how fast a mover settles on its own"],
    // Inner peace (core/peace.js): P = 1/(1 + (d/d0)²) · (1 − γ·C_max) · (1 − δ·g)
    ["d0", 0.6, 0.2, 2, "d0: distance at which inner peace is half"],
    ["gamma", 0.3, 0, 0.6, "γ: how much the strongest hidden pull lowers peace"],
    ["delta", 0.3, 0, 0.6, "δ: how much grand or absolute thinking lowers peace"],
  ];
  const FIXED = { aMin: 0.05, aCap: 0.12, bU: 0.15, dt: 0.15, rise: 0.15, eps: 0.3, k: 8, beta: 0.2 };
  const SPEC = Object.fromEntries(VAR_SPEC.map(([k, def, min, max, note]) => [k, { def, min, max, note }]));
  const VAR_KEYS = VAR_SPEC.map(v => v[0]);
  /** The default adjustable variables {aBase, k, aMax, b, d, d0, gamma, delta}. */
  const defaultVars = () => Object.fromEntries(VAR_SPEC.map(([k, v]) => [k, v]));
  /**
   * Clamp variables into their ranges.
   * @returns {{vars: object, notes: string[]}} the kept values and notes about anything changed
   */
  function validateVars(input = {}) {
    const vars = defaultVars(), notes = [];
    VAR_KEYS.forEach(k => {
      if (!(k in input)) return;
      const x = Number(input[k]);
      if (!Number.isFinite(x)) { notes.push(`${k}: not a number, kept ${vars[k]}`); return; }
      const c = r2(clamp(x, SPEC[k].min, SPEC[k].max));
      if (c !== r2(x)) notes.push(`${k}: kept inside ${SPEC[k].min}\u2013${SPEC[k].max}`);
      vars[k] = c;
    });
    if (vars.aMax < Math.max(FIXED.aMin, vars.aBase / 2)) { vars.aMax = r2(Math.max(FIXED.aMin, vars.aBase / 2)); notes.push("aMax: raised to fit aBase"); }
    return { vars, notes };
  }

  // ---------- W: who amplifies (+) or dampens (−) whom ----------
  // Design assumptions informed by the research in the README; adjustable.
  const EDGES = [
    ["sadness", "rumination", 0.4], ["rumination", "sadness", 0.4],   // depressive rumination
    ["fear", "avoidance", 0.4], ["avoidance", "fear", 0.3],           // avoidance keeps anxiety going
    ["shame", "avoidance", 0.4], ["avoidance", "sadness", 0.3],       // hiding, then withdrawal
    ["shame", "sadness", 0.3], ["rumination", "shame", 0.2],
    ["anger", "rumination", 0.3], ["rumination", "anger", 0.2],       // angry replaying
    ["rumination", "fear", 0.2], ["fear", "anger", 0.2],
    ["calm", "fear", -0.5], ["calm", "anger", -0.4], ["calm", "rumination", -0.3],
    ["connection", "shame", -0.5], ["connection", "sadness", -0.4],
    ["hope", "sadness", -0.5], ["hope", "avoidance", -0.3],
    ["fear", "calm", -0.3], ["sadness", "hope", -0.3], ["shame", "connection", -0.3], ["avoidance", "connection", -0.2],
  ];
  const MAIN_PAIRS = [["sadness", "rumination"], ["rumination", "sadness"], ["fear", "avoidance"], ["shame", "avoidance"], ["calm", "fear"], ["connection", "shame"], ["hope", "sadness"]];
  /** Turn a list of [from, to, w] edges into a 9×9 matrix. */
  function matrix(edges) {
    const W = NAMES.map(() => new Array(N).fill(0));
    edges.forEach(([a, b, w]) => { W[idx[a]][idx[b]] = w; });
    return W;
  }
  const W0 = matrix(EDGES);
  /**
   * W with the user's overrides applied.
   * @param {Array<{from:string,to:string,w:number}>} w overrides
   */
  function weights(w = []) {
    if (!w.length) return W0;
    const edges = EDGES.filter(([a, b]) => !w.some(o => o.from === a && o.to === b));
    return matrix(edges.concat(w.map(o => [o.from, o.to, o.w])));
  }
  /** The built-in W value for one link. */
  const defaultWeight = (from, to) => W0[idx[from]][idx[to]];
  /** Return a new state with one W link set (dropping the override when it equals the default). */
  function setWeight(state, from, to, value) {
    const x = r2(clamp(Number(value) || 0, -1, 1));
    const rest_ = state.w.filter(o => !(o.from === from && o.to === to));
    return { ...state, w: x === defaultWeight(from, to) ? rest_ : rest_.concat({ from, to, w: x }) };
  }

  // ---------- Words -> movers ----------
  // Stem lexicon: a token matches when it starts with the stem (4+ letters);
  // "x=" matches only the whole word; phrases match whole words. Longest stem wins.
  // Old emotion and factor words are merged in (see the mapping table).
  const LEX = {
    fear: [["afraid", 1], ["scared", 1], ["fear", 1], ["anxi", 0.9], ["worr", 0.8], ["panic", 1], ["nervous", 0.7], ["terrif", 1], ["dread", 0.9], ["cursed", 0.6], ["doomed", 0.8], ["greed", 0.3], ["greedy", 0.3]],
    sadness: [["sad=", 1], ["sadness", 1], ["sadden", 1], ["depress", 1], ["down=", 0.5], ["cry=", 0.8], ["crying", 0.8], ["cried", 0.8], ["grief", 1], ["griev", 1], ["hopeless", 0.8], ["empty", 0.8], ["miserable", 1], ["heartbroken", 1], ["tired of", 0.5], ["unhappy", 0.9], ["lazy", 0.5], ["far from god", 0.6], ["no motivation", 0.5], ["numb=", 0.5]],
    anger: [["angry", 1], ["anger", 1], ["mad=", 0.8], ["furious", 1], ["rage", 1], ["hate", 0.8], ["annoy", 0.5], ["frustrat", 0.7], ["pissed", 0.9], ["resent", 0.8], ["irritat", 0.5], ["jealous", 0.6], ["envy", 0.6], ["envious", 0.6], ["revenge", 0.8]],
    shame: [["asham", 1], ["shame", 1], ["humiliat", 1], ["embarrass", 0.8], ["worthless", 1], ["disgust", 0.7], ["failure", 0.8], ["loser", 0.8], ["stupid", 0.6], ["pathetic", 0.9], ["not good enough", 1], ["at myself", 0.4],
      ["guilt", 0.8], ["guilty", 0.8], ["my fault", 0.8], ["regret", 0.6], ["blame myself", 0.9], ["should have", 0.5], ["shouldn't have", 0.5], ["sorry", 0.4]],
    rumination: [["keep thinking", 1], ["keep replaying", 1], ["over and over", 1], ["can't stop thinking", 1], ["why me", 0.8], ["overthink", 0.9], ["replay", 0.8], ["dwell", 0.8], ["ruminat", 1], ["what if", 0.5],
      ["not my fault", 0.6], ["they always", 0.5], ["blame me", 0.5], ["i'm right", 0.5], ["better than", 0.6], ["compar", 0.6], ["everyone else", 0.4], ["hate myself", 0.5]],
    avoidance: [["avoid", 1], ["put off", 0.8], ["putting off", 0.8], ["procrastinat", 0.8], ["can't face", 1], ["hide=", 0.7], ["hiding", 0.7], ["stay in bed", 0.8], ["distract", 0.5], ["ignore it", 0.6], ["don't want to think", 0.9], ["lazy", 0.6], ["shut down", 0.7], ["escape", 0.6], ["binge", 0.5], ["drank too much", 0.6], ["give up", 0.5], ["gave up", 0.5]],
  };
  const LEX_POS = {
    calm: [["calm", 1], ["peace", 1], ["relax", 0.9], ["steady", 0.8], ["safe", 0.7], ["okay", 0.4], ["fine=", 0.3], ["rested", 0.5], ["content", 0.7], ["happy", 0.4], ["glad", 0.4]],
    connection: [["loved", 1], ["love", 0.8], ["friend", 0.6], ["together", 0.7], ["support", 0.7], ["belong", 0.9], ["close to", 0.7], ["family", 0.4], ["cared for", 1], ["hug=", 0.6], ["hugg", 0.6]],
    hope: [["hope", 1], ["hoping", 1], ["hopeful", 1], ["optimis", 0.9], ["looking forward", 0.9], ["better soon", 0.8], ["possible", 0.4], ["can do", 0.6], ["will be okay", 0.9], ["grateful", 0.6], ["thankful", 0.6], ["happy", 0.5], ["joy=", 0.7], ["joyful", 0.7], ["excit", 0.6]],
  };
  const LEX_NEG = {
    calm: [["restless", 0.7], ["tense", 0.6], ["on edge", 0.7], ["overwhelm", 0.8], ["stressed", 0.7], ["can't relax", 0.8], ["panic", 0.5]],
    connection: [["lonel", 1], ["alone", 1], ["isolat", 1], ["nobody cares", 1], ["no one cares", 1], ["left out", 0.9], ["abandon", 1], ["ignored", 0.7], ["rejected", 0.8], ["no friends", 1], ["by myself", 0.6]],
    hope: [["hopeless", 1], ["no point", 1], ["pointless", 0.8], ["never get better", 1], ["give up", 0.6], ["what's the use", 0.8], ["no future", 1], ["far from god", 0.6]],
  };
  const INTENSIFIERS = { very: 1.5, so: 1.4, really: 1.4, extremely: 1.7, totally: 1.5, completely: 1.5, always: 1.3, super: 1.4, deeply: 1.5, too: 1.2 };
  const SOFTENERS = { little: 0.6, bit: 0.6, slightly: 0.5, somewhat: 0.7, kinda: 0.7 };
  const NEGATORS = new Set(["not", "no", "never", "without", "hardly", "isn't", "aren't", "wasn't", "don't", "doesn't", "didn't", "cannot", "can't", "won't", "nor"]);
  const SELF = /\b(i|i'm|im|i've|i'd|i'll|me|my|myself|mine)\b/g;

  /** Lower-case word tokens of a text. */
  const tokens = text => String(text || "").toLowerCase().replace(/[\u2018\u2019]/g, "'").match(/[a-z']+/g) || [];

  // Lists of [channel, stem, w]; a channel is "name", "+name" or "-name".
  const ENTRIES = [];
  Object.entries(LEX).forEach(([n, l]) => l.forEach(([s, w]) => ENTRIES.push([n, s, w])));
  Object.entries(LEX_POS).forEach(([n, l]) => l.forEach(([s, w]) => ENTRIES.push(["+" + n, s, w])));
  Object.entries(LEX_NEG).forEach(([n, l]) => l.forEach(([s, w]) => ENTRIES.push(["-" + n, s, w])));

  /** Raw lexicon hits per channel ("name", "+name", "-name") with intensifiers, softeners and negation. */
  function lexRaw(text) {
    const toks = tokens(text);
    const raw = {}, negd = new Set();
    const add = (ch, w, at, n = 1) => {
      let mult = 1, neg = false;
      for (let k = Math.max(0, at - 3); k < at; k++) if (NEGATORS.has(toks[k]) || toks[k].endsWith("n't")) neg = true;
      const prev = toks[at - 1];
      if (prev && INTENSIFIERS[prev]) mult *= INTENSIFIERS[prev];
      if (prev && SOFTENERS[prev]) mult *= SOFTENERS[prev];
      // "not my fault", "can't stop thinking" are phrases on their own; skip negation for them.
      if (neg && !ch.startsWith("-") && n === 1) { negd.add(ch); return; }
      raw[ch] = (raw[ch] || 0) + w * mult;
    };
    const joined = " " + toks.join(" ") + " ";
    const used = new Array(toks.length).fill(false);
    // Phrases first, longest first; each phrase can feed several channels.
    const phrases = ENTRIES.filter(([, s]) => s.includes(" ")).sort((a, b) => b[1].length - a[1].length);
    const seen = new Set();
    phrases.forEach(([ch, phrase, w]) => {
      let at = joined.indexOf(" " + phrase + " ");
      while (at >= 0) {
        const start = joined.slice(0, at + 1).trim().split(" ").filter(Boolean).length;
        const n = phrase.split(" ").length;
        const key = `${start}:${phrase}`;
        if (!used.slice(start, start + n).some(Boolean) || seen.has(key)) {
          add(ch, w, start, n);
          seen.add(key);
        }
        at = joined.indexOf(" " + phrase + " ", at + 1);
      }
    });
    seen.forEach(k => { const [s, p] = k.split(":"); for (let i = 0; i < p.split(" ").length; i++) used[Number(s) + i] = true; });
    toks.forEach((tok, i) => {
      if (used[i]) return;
      let bestLen = 0, hits = [];
      ENTRIES.forEach(([ch, entry, w]) => {
        if (entry.includes(" ")) return;
        const exact = entry.endsWith("=");
        const stem = exact ? entry.slice(0, -1) : entry;
        const ok = tok === stem || (!exact && stem.length >= 4 && tok.startsWith(stem));
        if (!ok) return;
        if (stem.length > bestLen) { bestLen = stem.length; hits = [[ch, w]]; }
        else if (stem.length === bestLen) hits.push([ch, w]);
      });
      hits.forEach(([ch, w]) => add(ch, w, i));
    });
    return { raw, toks, negd };
  }

  // Words -> { crisis } or { e (hard/process 0..1), pos, neg (grounding 0..1), notes, read }.
  /**
   * Words → movers. Never stores the text.
   * @param {string} text
   * @returns {{crisis:true}|{crisis:false, empty?:boolean, w:object, notes:string[], read:object|null}}
   */
  function fromText(text) {
    const t = String(text || "");
    if (!t.trim()) return { crisis: false, empty: true, w: zeroWords(), notes: [], read: null };
    if (G.isCrisis(t)) return { crisis: true };
    const read = G.read(t);
    if (read.crisis) return { crisis: true };
    const signals = analyzeFn(t);
    const { raw, negd } = lexRaw(t);
    const r = ch => raw[ch] || 0;
    const hp = Object.fromEntries(HARD.concat(PROCESS).map(n => [n, r(n)]));
    const pos = Object.fromEntries(GROUND.map(n => [n, r("+" + n)]));
    const neg = Object.fromEntries(GROUND.map(n => [n, r("-" + n)]));
    const notes = [];
    // A word the person negated ("not angry") also blocks the analyzer's matching category.
    const bump = (n, v, why) => { if (negd.has(n) && hp[n] === 0) return; hp[n] += v; if (why) notes.push(why); };
    if (signals.categories.includes("hopelessness")) { bump("sadness", 0.6, "hopeless wording"); neg.hope += 0.6; }
    if (signals.categories.includes("selfBlame")) bump("shame", 0.5, "self-blame");
    if (signals.categories.includes("anxiety") && hp.fear === 0) bump("fear", 0.5, "worry wording");
    if (signals.categories.includes("anger") && hp.anger === 0) bump("anger", 0.5, "anger wording");
    if (read.patterns.includes("meaning")) { bump("fear", 0.4, "hidden-meaning (curse/sign) language"); hp.avoidance += 0.3; }
    if (signals.distortions.includes("labeling")) { bump("shame", 0.3, "harsh label"); hp.avoidance += 0.2; }
    if (signals.distortions.includes("mindReading")) { bump("fear", 0.2, "mind reading"); hp.shame += 0.2; }
    if (signals.distortions.includes("catastrophizing")) { bump("fear", 0.3, "worst-case wording"); hp.rumination += 0.2; }
    // Fusion: how tightly the thought is believed (the old mirage grip M and believability B).
    if (read.patterns.length) hp.avoidance += Math.max(0, read.suggestedM - 0.3);
    const abs = Math.min(2, signals.absolutes.length);
    if (abs) {
      HARD.concat(["rumination"]).forEach(n => { if (hp[n] > 0) hp[n] *= 1 + 0.15 * abs; });
      hp.avoidance += 0.15 * abs;
      notes.push("absolute words");
    }
    // Self-focus in hard sentences adds a little rumination (the old ego grip).
    let selfN = 0, tokN = 0;
    t.toLowerCase().replace(/[\u2018\u2019]/g, "'").split(/[.!?\n]+/).forEach(sent => {
      const toks = sent.match(/[a-z']+/g) || [];
      if (!toks.length) return;
      const lr = lexRaw(sent).raw;
      if (!HARD.concat(PROCESS).some(n => lr[n] > 0)) return;
      selfN += (sent.match(SELF) || []).length;
      tokN += toks.length;
    });
    if (tokN) hp.rumination += Math.min(0.3, (0.5 * selfN) / tokN);
    // Feature hooks (for example the relationship patterns) add small nudges onto
    // existing movers. They never add new movers or variables.
    const found = [], data = {};
    HOOKS.forEach(hook => {
      const r = hook(t);
      if (!r) return;
      Object.entries(r.add || {}).forEach(([n, v]) => { if (n in hp) hp[n] += v; });
      Object.entries(r.neg || {}).forEach(([n, v]) => { if (n in neg) neg[n] += v; });
      (r.notes || []).forEach(x => notes.push(x));
      (r.found || []).forEach(x => found.push(x));
      Object.assign(data, r.data || {});
    });
    const sat = x => r2(1 - Math.exp(-Math.max(0, x)));
    const w = { e: NAMES.map(n => (isGround[idx[n]] ? 0 : sat(hp[n]))), pos: Object.fromEntries(GROUND.map(n => [n, sat(pos[n])])), neg: Object.fromEntries(GROUND.map(n => [n, sat(neg[n])])) };
    return { crisis: false, w, notes: [...new Set(notes)], read, found, data };
  }
  /** Word contributions of an empty text. */
  const zeroWords = () => ({ e: new Array(N).fill(0), pos: { calm: 0, connection: 0, hope: 0 }, neg: { calm: 0, connection: 0, hope: 0 } });

  // New words add to the base vector.
  /** Add new word contributions to a base vector (hard/process saturate; grounding moves up or down). */
  function combine(base, w) {
    return base.map((b, i) => {
      const n = NAMES[i];
      if (!isGround[i]) return r2(1 - (1 - b) * (1 - w.e[i]));
      return r2(clamp01(b + w.pos[n] * (1 - b) - w.neg[n] * b));
    });
  }


  // ---------- Word hooks (features register small nudges here) ----------
  const HOOKS = [];
  /** Register a word hook: hook(text) → {add?:{mover:raw}, neg?:{grounding:raw}, notes?:string[], found?:any[], data?:object}. data is passed through to master() in the same pass. */
  function addWordHook(hook) { if (!HOOKS.includes(hook)) HOOKS.push(hook); }

  // ---------- The feelings picker (state vector in, no text) ----------
  // Each mover chip is tapped through four levels. The values are the
  // midpoints of the word bands the card uses (a little < 0.3 ≤ quite ≤ 0.6 <
  // strongly), with "off" at 0:
  //   off 0.00 · a little 0.15 · quite 0.45 · strongly 0.80
  // (strongly is the midpoint of 0.6–1.0). Grounding chips (calm, connected,
  // hopeful) start at "quite", near their rest of 0.5, because "off" for them
  // means "not at all calm", which is itself a strong reading; the others start off.
  const LEVELS = { off: 0, "a little": 0.15, quite: 0.45, strongly: 0.8 };
  const LEVEL_ORDER = ["off", "a little", "quite", "strongly"];
  /** Plain words for the chips. */
  const PICK_WORD = { fear: "afraid", sadness: "sad", anger: "angry", shame: "ashamed", calm: "calm", connection: "connected", hope: "hopeful", rumination: "replaying thoughts", avoidance: "avoiding" };
  /** The chip order on screen. */
  const PICK_ORDER = ["fear", "sadness", "anger", "shame", "calm", "connection", "hope", "rumination", "avoidance"];
  /** A chip's starting level. */
  const pickDefault = n => (GROUND.includes(n) ? "quite" : "off");
  /** The level word for a value: off below 0.075 (halfway to "a little"), else the card's band. */
  const levelOf = x => (x < 0.075 ? "off" : x > 0.6 ? "strongly" : x >= 0.3 ? "quite" : "a little");
  /** The next level when a chip is tapped (strongly wraps to off). */
  const nextLevel = l => LEVEL_ORDER[(LEVEL_ORDER.indexOf(l) + 1) % LEVEL_ORDER.length];
  /** Picked levels {mover: level word} → the 9-vector (missing movers take their starting level). */
  const pickVector = (levels = {}) => NAMES.map(n => LEVELS[levels[n] in LEVELS ? levels[n] : pickDefault(n)]);
  /** The 9-vector → level words (the inverse of pickVector on the band midpoints). */
  const vectorLevels = v => Object.fromEntries(NAMES.map((n, i) => [n, levelOf(v[i])]));

  const EXTRAS = [];
  /**
   * Register an extra chip (features only; no new movers). fn() returns the
   * same shape as a word hook: {add?, neg?, notes?, data?}.
   * @param {{id:string, label:string, fn:function}} chip
   */
  function addPickExtra(chip) { if (!EXTRAS.some(c => c.id === chip.id)) EXTRAS.push(chip); }
  /**
   * The picker's version of fromText: picked levels and extra chips → the
   * reading's vector and the same {notes, found, data} master() takes from words.
   * Extras are nudges added exactly as word hooks are (saturating, onto the
   * picked vector with combine()). No text, so no crisis check is needed here.
   * @param {{levels?:object, extras?:string[]}} pick
   * @returns {{crisis:false, picked:true, base:number[], e:number[], w:object, notes:string[], read:null, found:[], data:object, extras:string[]}}
   */
  function fromPick(pick = {}) {
    const base = pickVector(pick.levels || {});
    const hp = Object.fromEntries(HARD.concat(PROCESS).map(n => [n, 0]));
    const neg = Object.fromEntries(GROUND.map(n => [n, 0]));
    const notes = [], data = {}, extras = [];
    EXTRAS.forEach(c => {
      if (!(pick.extras || []).includes(c.id)) return;
      extras.push(c.id);
      const r = c.fn() || {};
      Object.entries(r.add || {}).forEach(([n, v]) => { if (n in hp) hp[n] += v; });
      Object.entries(r.neg || {}).forEach(([n, v]) => { if (n in neg) neg[n] += v; });
      (r.notes || []).forEach(x => notes.push(x));
      Object.assign(data, r.data || {});
    });
    const sat = x => r2(1 - Math.exp(-Math.max(0, x)));
    const w = { e: NAMES.map(n => (isGround[idx[n]] ? 0 : sat(hp[n]))), pos: { calm: 0, connection: 0, hope: 0 }, neg: Object.fromEntries(GROUND.map(n => [n, sat(neg[n])])) };
    return { crisis: false, picked: true, base, e: combine(base, w), w, notes, read: null, found: [], data, extras: extras.sort() };
  }

  // ---------- Small shared helpers ----------
  /** Euclidean length of a vector. */
  const norm = v => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  /** ‖a − b‖. */
  const distance = (a, b) => norm(a.map((x, i) => x - b[i]));
  /** Local timestamp YYYY-MM-DDTHH:MM for a time in ms. */
  function stamp(ts) {
    const d = new Date(ts), p = x => String(x).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  }
  /** The YYYY-MM-DD part of a stamp. */
  const dayOf = t => t.slice(0, 10);
  /** Format with two decimals (math view only). */
  const f2 = x => x.toFixed(2);
  /** Signed two-decimal number with a real minus sign. */
  const sgn = x => (x > 0 ? "+" : x < 0 ? "\u2212" : "") + Math.abs(x).toFixed(2);
  /** Display label for a mover (fear/anxiety, avoidance/fusion). */
  const label = n => LABEL[n] || n;
  /** Capitalize the first letter. */
  const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
  /** Join words as "a", "a and b" or "a, b, and c". */
  const listJoin = l => (l.length <= 1 ? l.join("") : l.length === 2 ? `${l[0]} and ${l[1]}` : `${l.slice(0, -1).join(", ")}, and ${l[l.length - 1]}`);
  /** Seeded random generator (mulberry32): the same seed gives the same sequence. */
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  /** A fresh session: rest vector, home, default variables, no history, no picked feelings or freeing mix yet. */
  function defaultState() {
    return { v: VERSION, home: homeVec(), e: rest(), vars: defaultVars(), w: [], days: [], cps: [], ideal: null, pick: null, mix: null };
  }

  MF.Movers = {
    VERSION, NAMES, HARD, GROUND, PROCESS, LABEL, HOME, REST, FIXED, VAR_SPEC, SPEC, VAR_KEYS, ACTIVE, MAX_SIM, MAX_CHECKPOINTS, MAX_DAYS, MAX_LINES, MAX_W, LABEL_RE, N, idx, isGround, r2, clamp, clamp01, rest, fromObj, homeVec, norm, distance, stamp, dayOf, f2, sgn, label, cap, listJoin, rng, defaultState, defaultVars, validateVars, weights, defaultWeight, setWeight, fromText, combine, EDGES, MAIN_PAIRS, addWordHook,
    LEVELS, LEVEL_ORDER, PICK_WORD, PICK_ORDER, EXTRAS, pickDefault, levelOf, nextLevel, pickVector, vectorLevels, addPickExtra, fromPick,
  };
})(typeof window !== "undefined" ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
if (typeof module !== "undefined") module.exports = global.MF.Movers;
