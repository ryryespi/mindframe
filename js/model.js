// model.js — MindFrame's one model: nine movers, one master function (every feature
// calls it), a words-first card, stories, checkpoints and days, and the .mf code (mf 2).
// Pure logic, no DOM. All local; nothing is sent anywhere.
//
// A MODEL built from design assumptions, informed by research (see README).
// It is not validated science, not a diagnosis, and not a measurement of you.
//
//   movers   e ∈ [0,1]^9
//            hard:      fear (anxiety), sadness, anger, shame         rest 0
//            grounding: calm, connection, hope                        rest 0.5 (unknown)
//            process:   rumination, avoidance (avoidance and fusion)  rest 0
//   words    hard/process: e = 1 − exp(−raw)
//            grounding:    e = base + pos·(1 − base) − neg·base
//            new words add to the base: hard/process 1 − (1 − base)(1 − words)
//   dynamics e ← clamp01(e + dt·(Wᵀ(e − rest) − d·(e − rest)))   (the "left alone" projection)
//   λ        = ρ(W on the active hard and process movers) − d   (> 0: unstable)
//   home     h: calm, connection, hope 0.8; everything else 0
//
//   THE MASTER FUNCTION (master(text, state)); every feature calls it:
//     e      = score(text)
//     step   = act(clip01(e + a(e)·(h − e) + b·s(e)))
//     a(e)   = min(a_max, a0 + k·‖e − h‖), capped at a_cap when λ > 0 (and b = b_U)
//     s_j    = e_j·Σ_{grounding i} min(0, W_ij)·h_i  for hard/process j above home
//     d      = ‖e − h‖;  B_t = 0.8·B_{t−1} + 0.2·e_t;  recovery = master steps until d < 0.3
//   Output is words: feelings, connections, affirmations, one step, progress.
//   The numbers stay behind "Show the math".

const Model = (function () {
  const G = typeof Grounding !== "undefined" ? Grounding : require("./grounding.js");
  const S = typeof Stories !== "undefined" ? Stories : require("./stories.js");
  const analyzeFn = typeof analyze === "function" ? analyze : require("./analyzer.js").analyze;

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
  const VERSION = 2;
  const ACTIVE = 0.1, MAX_SIM = 200, MAX_CHECKPOINTS = 50, MAX_DAYS = 60, MAX_LINES = 400, MAX_W = 30;

  const r2 = x => Math.round(x * 100) / 100;
  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
  const clamp01 = x => clamp(x, 0, 1);
  const rest = () => REST.slice();
  const fromObj = (o, fill = rest()) => NAMES.map((n, i) => r2(clamp01(n in o ? Number(o[n]) || 0 : fill[i])));
  const homeVec = (o = HOME) => NAMES.map(n => r2(clamp01(Number(o[n]) || 0)));

  // ---------- Variables (the panel shows these; the rest are fixed) ----------
  const VAR_SPEC = [
    ["aBase", 0.2, 0.05, 0.5, "a0: base step size toward home"],
    ["aMax", 0.25, 0.05, 0.5, "a_max: largest step"],
    ["b", 0.1, 0, 0.5, "stabilizer pull (grounding movers press on hard ones)"],
    ["d", 0.3, 0.05, 1, "decay: how fast a mover settles on its own"],
  ];
  const FIXED = { aMin: 0.05, kd: 0.05, aCap: 0.12, bU: 0.15, dt: 0.15, rise: 0.15, eps: 0.3, k: 8, beta: 0.2 };
  const SPEC = Object.fromEntries(VAR_SPEC.map(([k, def, min, max, note]) => [k, { def, min, max, note }]));
  const VAR_KEYS = VAR_SPEC.map(v => v[0]);
  const defaultVars = () => Object.fromEntries(VAR_SPEC.map(([k, v]) => [k, v]));
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
  function matrix(edges) {
    const W = NAMES.map(() => new Array(N).fill(0));
    edges.forEach(([a, b, w]) => { W[idx[a]][idx[b]] = w; });
    return W;
  }
  const W0 = matrix(EDGES);
  function weights(w = []) {
    if (!w.length) return W0;
    const edges = EDGES.filter(([a, b]) => !w.some(o => o.from === a && o.to === b));
    return matrix(edges.concat(w.map(o => [o.from, o.to, o.w])));
  }
  const defaultWeight = (from, to) => W0[idx[from]][idx[to]];
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

  const tokens = text => String(text || "").toLowerCase().replace(/[\u2018\u2019]/g, "'").match(/[a-z']+/g) || [];

  // Lists of [channel, stem, w]; a channel is "name", "+name" or "-name".
  const ENTRIES = [];
  Object.entries(LEX).forEach(([n, l]) => l.forEach(([s, w]) => ENTRIES.push([n, s, w])));
  Object.entries(LEX_POS).forEach(([n, l]) => l.forEach(([s, w]) => ENTRIES.push(["+" + n, s, w])));
  Object.entries(LEX_NEG).forEach(([n, l]) => l.forEach(([s, w]) => ENTRIES.push(["-" + n, s, w])));

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
    const sat = x => r2(1 - Math.exp(-Math.max(0, x)));
    const w = { e: NAMES.map(n => (isGround[idx[n]] ? 0 : sat(hp[n]))), pos: Object.fromEntries(GROUND.map(n => [n, sat(pos[n])])), neg: Object.fromEntries(GROUND.map(n => [n, sat(neg[n])])) };
    return { crisis: false, w, notes: [...new Set(notes)], read };
  }
  const zeroWords = () => ({ e: new Array(N).fill(0), pos: { calm: 0, connection: 0, hope: 0 }, neg: { calm: 0, connection: 0, hope: 0 } });

  // New words add to the base vector.
  function combine(base, w) {
    return base.map((b, i) => {
      const n = NAMES[i];
      if (!isGround[i]) return r2(1 - (1 - b) * (1 - w.e[i]));
      return r2(clamp01(b + w.pos[n] * (1 - b) - w.neg[n] * b));
    });
  }

  // ---------- Vectors, dynamics, λ ----------
  const norm = v => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  const distance = (a, b) => norm(a.map((x, i) => x - b[i]));
  const dmax = h => norm(h.map(x => Math.max(x, 1 - x)));

  function step(e, W, dt, d) {
    return e.map((x, j) => {
      let inflow = 0;
      for (let i = 0; i < N; i++) inflow += W[i][j] * (e[i] - REST[i]);
      return clamp01(x + dt * (inflow - d * (x - REST[j])));
    });
  }

  // Largest growth rate among the active hard and process movers: ρ(W_A) − d.
  // That block has only non-negative weights, so ρ is a real eigenvalue (Perron).
  function lambda(e, W, d) {
    const A = NAMES.map((n, i) => i).filter(i => !isGround[i] && e[i] > ACTIVE);
    if (!A.length) return null;
    let v = A.map(() => 1), rho = 0;
    for (let it = 0; it < 200; it++) {
      const nv = A.map((j) => A.reduce((s, i, k) => s + Math.max(0, W[i][j]) * v[k], 0));
      const nn = norm(nv);
      if (nn < 1e-12) { rho = 0; break; }
      rho = nn / norm(v);
      v = nv.map(x => x / nn);
    }
    return r2(rho - d);
  }

  function loops(e, W, d) {
    const out = [];
    NAMES.forEach((a, i) => NAMES.forEach((b, j) => {
      if (j <= i || isGround[i] || isGround[j] || e[i] <= ACTIVE || e[j] <= ACTIVE) return;
      if (W[i][j] > 0 && W[j][i] > 0) {
        const g = Math.sqrt(W[i][j] * W[j][i]);
        out.push({ a, b, gain: r2(g), u: r2(g * Math.sqrt(e[i] * e[j])), unstable: g - d > 0 });
      }
    }));
    return out.sort((x, y) => y.u - x.u);
  }

  function hidden(e, W, vars) {
    let cur = e.slice();
    for (let t = 0; t < FIXED.k; t++) cur = step(cur, W, FIXED.dt, vars.d);
    const out = [];
    NAMES.forEach((n, j) => {
      if (isGround[j] || e[j] > ACTIVE || cur[j] - e[j] < FIXED.rise - 1e-9) return;
      let via = null, best = 0;
      NAMES.forEach((m, i) => { if (i !== j && W[i][j] > 0 && W[i][j] * e[i] > best) { best = W[i][j] * e[i]; via = m; } });
      out.push({ name: n, from: e[j], to: r2(cur[j]), via });
    });
    return out.sort((a, b) => (b.to - b.from) - (a.to - a.from));
  }

  // ---------- Skills, reframes, faith wording ----------
  const SKILL = {
    fear: "Paced breathing: breathe out longer than in, five times, then name one thing you can see.",
    sadness: "One small action: do one thing you used to enjoy, for ten minutes.",
    anger: "Pause: step away for ten minutes, then name what matters to you here.",
    shame: "Self-compassion: say to yourself what you'd say to a friend, and tell one safe person.",
    rumination: "Worry window: give the replay ten minutes later today, then turn to one task now.",
    avoidance: "Approach: do two minutes of the thing you've been putting off.",
    calm: "Paced breathing: breathe out longer than in, five times.",
    connection: "Reach out: send one short message to someone kind.",
    hope: "One small plan: write down one thing for tomorrow.",
  };
  const REFRAME = {
    fear: "A fear is a guess about the future, not a fact.",
    sadness: "This heavy feeling is real, and it can change.",
    anger: "My anger is telling me something matters; I can choose what to do with it.",
    shame: "I am a person having a hard moment, not a bad person.",
    rumination: "Replaying it again won't change it; one next step might.",
    avoidance: "I don't have to feel ready to take one small step.",
    none: "This is a feeling, not a fact.",
  };
  const TEST = {
    fear: "What is the most likely outcome, not the worst one?",
    sadness: "Has this feeling ever eased before, even a little?",
    anger: "What do I actually want to happen next?",
    shame: "Would I say this about a friend in the same spot?",
    rumination: "Is thinking about this right now helping me solve it?",
    avoidance: "What is the smallest piece of this I could do in two minutes?",
    none: "What do I know for sure right now?",
  };
  const FAITH = {
    anger: "Faith (patience): pray one short line before you answer, \u201CLord, give me patience.\u201D",
    shame: "Faith (mercy): you are held by mercy, not measured by this moment.",
    fear: "Faith (trust): hand the next hour to God, then do one small thing.",
    sadness: "Faith (hope): hope can be a practice; pray one line and take one step.",
    rumination: "Faith (humility, letting go): you don't have to win this replay; leave it in God's hands for now.",
    avoidance: "Faith (courage): ask for courage for one small step.",
    none: "Faith (gratitude): thank God for one gift of today.",
  };

  // The weakest grounding mover (lowest vs. home), or the strongest hard/process mover.
  function focus(state) {
    const e = state.e, h = state.home;
    const top = NAMES.map((n, j) => ({ n, gap: e[j] - h[j] })).filter(x => !GROUND.includes(x.n) && x.gap >= ACTIVE).sort((p, q) => q.gap - p.gap)[0];
    if (top) return { kind: "strongest", name: top.n };
    const low = GROUND.map(n => ({ n, gap: h[idx[n]] - e[idx[n]] })).sort((p, q) => q.gap - p.gap)[0];
    return { kind: "weakest", name: low.gap >= ACTIVE ? low.n : null };
  }

  // ---------- Days and baseline helpers ----------
  function stamp(ts) {
    const d = new Date(ts), p = x => String(x).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  }
  const dayOf = t => t.slice(0, 10);
  // B_t = (1 − β)·B_{t−1} + β·e_t with β = 0.2, i.e. B_t = 0.8·B_{t−1} + 0.2·e_t.
  const ema = (B, e) => (B ? B.map((b, i) => (1 - FIXED.beta) * b + FIXED.beta * e[i]) : e.slice());
  function baselineSeries(days) {
    let B = null;
    return days.map(x => { B = ema(B, x.e); return { day: x.day, D: x.e, B: B.slice() }; });
  }
  function baselineOf(days) {
    const s = baselineSeries(days);
    return s.length ? s[s.length - 1].B : null;
  }

  // s(e): grounding movers press on hard/process movers that sit above home.
  // s_j = e_j · Σ_{grounding i} min(0, W_ij)·h_i  (≤ 0), and 0 for grounding movers.
  function sVec(e, h, W) {
    return NAMES.map((n, j) => {
      if (isGround[j] || e[j] <= h[j]) return 0;
      return e[j] * NAMES.reduce((acc, m, i) => acc + (isGround[i] ? Math.min(0, W[i][j]) * h[i] : 0), 0);
    });
  }

  // act(): the stepped vector becomes one small grounded action.
  // The action belongs to the mover that moves most toward home in this step.
  function act(e, next, h) {
    let mover = null, best = 0;
    NAMES.forEach((n, j) => {
      const gain = Math.abs(e[j] - h[j]) - Math.abs(next[j] - h[j]);
      if (gain > best + 1e-9) { best = gain; mover = n; }
    });
    return { mover, action: mover ? SKILL[mover] : "Keep going: notice one good thing and stay with it for a breath." };
  }

  // ======================================================================
  // THE MASTER FUNCTION. Every feature calls this; nothing else steps e.
  //
  //   e      = score(text)            (the text's words added to where you are)
  //   step   = act(clip01(e + a(e)·(h − e) + b·s(e)))
  //   a(e)   = min(a_max, a0 + k·‖e − h‖), capped at a_cap when λ > 0
  //   b      = b (b_U when λ > 0)
  //   d      = ‖e − h‖;  B_t = 0.8·B_{t−1} + 0.2·e_t;  recovery = steps until d < 0.3
  //
  // text may be "" (step from where you are). opts.sim = false skips the
  // recovery count (used inside the recovery count itself).
  // ======================================================================
  const calls = { master: 0 };
  function master(text, state, opts = {}) {
    calls.master += 1;
    const words = fromText(typeof text === "string" ? text : "");
    if (words.crisis) return { crisis: true };
    const h = state.home, W = weights(state.w), V = state.vars;
    const e = combine(state.e, words.w);
    const lam = lambda(e, W, V.d);
    const unstable = lam !== null && lam > 0;
    const d = distance(e, h);
    let a = Math.min(V.aMax, V.aBase + FIXED.kd * d);
    if (unstable) a = Math.min(a, FIXED.aCap);
    const b = unstable ? FIXED.bU : V.b;
    const s = sVec(e, h, W);
    const next = e.map((x, j) => r2(clamp01(x + a * (h[j] - x) + b * s[j])));
    const { mover, action } = act(e, next, h);
    // The top hard/process mover above home, and the grounding mover that presses on it most.
    const top = NAMES.map((n, j) => ({ n, j, gap: e[j] - h[j] })).filter(x => !isGround[x.j] && x.gap > 0).sort((p, q) => q.gap - p.gap)[0] || null;
    let stabilizer = null;
    if (top) {
      let best = 0;
      GROUND.forEach(g => { const p = -Math.min(0, W[idx[g]][top.j]); if (p > best) { best = p; stabilizer = g; } });
    } else {
      const low = GROUND.map(n => ({ n, gap: h[idx[n]] - e[idx[n]] })).sort((p, q) => q.gap - p.gap)[0];
      if (low.gap >= ACTIVE) stabilizer = low.n;
    }
    // Baseline: today's e folded into the days before today.
    const today = dayOf(stamp(Number.isFinite(opts.now) ? opts.now : Date.now()));
    const Bprev = baselineOf(state.days.filter(x => x.day < today));
    const B = ema(Bprev, e).map(r2);
    const out = {
      crisis: false, notes: words.notes, read: words.read,
      e, h: h.slice(), a, b, s, next, lambda: lam, unstable,
      d: r2(d), dNext: r2(distance(next, h)),
      top: top ? top.n : null, stabilizer, mover, action,
      loops: loops(e, W, V.d), hidden: hidden(e, W, V),
      B, baseline: { dPrev: Bprev ? r2(distance(Bprev, h)) : null, dB: r2(distance(B, h)), days: state.days.length },
    };
    if (opts.sim !== false) out.recovery = recovery({ ...state, e });
    return out;
  }

  // ---------- Recovery: repeat the master step until d < 0.3 ----------
  function simulate(state) {
    let cur = state;
    for (let n = 0; n <= MAX_SIM; n++) {
      const D = distance(cur.e, cur.home);
      if (D < FIXED.eps) return { steps: n, reached: true, final: r2(D) };
      if (n === MAX_SIM) return { steps: n, reached: false, final: r2(D) };
      const m = master("", cur, { sim: false });
      if (m.next.every((x, i) => x === cur.e[i])) return { steps: n, reached: false, final: r2(D) };
      cur = { ...cur, e: m.next };
    }
  }
  function recovery(state) {
    const sim = simulate(state);
    const per = {};
    state.cps.filter(c => /^step-\d+$/.test(c.label)).forEach(c => { per[dayOf(c.t)] = (per[dayOf(c.t)] || 0) + 1; });
    const counts = Object.values(per);
    const rate = counts.length ? r2(counts.reduce((acc, x) => acc + x, 0) / counts.length) : 1;
    return { ...sim, rate, days: sim.reached ? Math.ceil(sim.steps / rate) : null };
  }
  const recText = r => (r.reached ? `~${r.steps} step${r.steps === 1 ? "" : "s"} (~${r.days} day${r.days === 1 ? "" : "s"})` : `not reached in ${MAX_SIM} steps`);

  // ---------- Checkpoints, days, history (all read the master output) ----------
  function recordDay(state, ts) {
    const day = dayOf(stamp(ts));
    const days = state.days.filter(x => x.day !== day).concat({ day, e: state.e.slice() }).sort((a, b) => (a.day < b.day ? -1 : 1)).slice(-MAX_DAYS);
    return { ...state, days };
  }
  function addCheckpoint(state, label, ts = Date.now()) {
    const m = master("", state, { sim: false, now: ts });
    const n = state.cps.length ? state.cps[state.cps.length - 1].n + 1 : 1;
    const cp = { n, t: stamp(ts), label: LABEL_RE.test(label || "") ? label : `cp-${n}`, e: m.e.slice(), lambda: m.lambda === null ? 0 : m.lambda };
    return recordDay({ ...state, e: m.e.slice(), cps: state.cps.concat(cp).slice(-MAX_CHECKPOINTS) }, ts);
  }
  function restore(state, n) {
    const cp = state.cps.find(c => c.n === n);
    return cp ? refreshIdeal({ ...state, e: cp.e.slice() }) : state;
  }
  // Accept the step: e ← the master step from where you are.
  function acceptStep(state, ts = Date.now()) {
    const m = master("", state, { sim: false, now: ts });
    const n = state.cps.filter(c => /^step-\d+$/.test(c.label)).length + 1;
    return refreshIdeal(addCheckpoint({ ...state, e: m.next.slice() }, `step-${n}`, ts));
  }
  function refreshIdeal(state) {
    const m = master("", state, { sim: false });
    return { ...state, ideal: { a: r2(m.a), b: r2(m.b) } };
  }
  const baseline = state => { const m = master("", state, { sim: false }); return m.baseline.days ? baselineOf(state.days).map(r2) : null; };
  // Each day's direction: cos(D_t − D_{t−1}, h − B_{t−1}).
  function week(state, now = Date.now()) {
    const s = baselineSeries(state.days), h = state.home;
    const start = dayOf(stamp(now - 6 * 86400000));
    return s.map((x, t) => {
      let dir = null;
      if (t > 0) {
        const v = x.D.map((y, i) => y - s[t - 1].D[i]), to = h.map((y, i) => y - s[t - 1].B[i]);
        const c = norm(v) && norm(to) ? v.reduce((p, y, i) => p + y * to[i], 0) / (norm(v) * norm(to)) : 0;
        dir = c > 0.15 ? "up" : c < -0.15 ? "down" : "side";
      }
      return { day: x.day, dB: r2(distance(x.B, h)), dir };
    }).filter(x => x.day >= start);
  }
  const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayName = day => WEEKDAY[new Date(`${day}T12:00:00`).getDay()];
  const DIR_WORDS = { up: "a step toward steady", side: "a sideways day (showing up still counts)", down: "a heavier day" };
  const weekLines = (state, now) => week(state, now).map(x => `${dayName(x.day)}: ${x.dir ? DIR_WORDS[x.dir] : "the first day on the map"}`);
  const weekMath = (state, now) => week(state, now).map(x => `${x.day.slice(5)}  \u2016B \u2212 h\u2016 = ${x.dB.toFixed(2)}  ${x.dir || "start"}`);

  function defaultState() {
    return { v: VERSION, home: homeVec(), e: rest(), vars: defaultVars(), w: [], days: [], cps: [], ideal: null };
  }
  // Kept for callers: the master output for a state (and optional text).
  const metrics = (state, text = "") => master(typeof text === "string" ? text : "", state);

  // ======================================================================
  // Words, not numbers: the feelings + affirmations card.
  // ======================================================================
  const f2 = x => x.toFixed(2);
  const sgn = x => (x > 0 ? "+" : x < 0 ? "\u2212" : "") + Math.abs(x).toFixed(2);
  const label = n => LABEL[n] || n;
  const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
  const listJoin = l => (l.length <= 1 ? l.join("") : l.length === 2 ? `${l[0]} and ${l[1]}` : `${l.slice(0, -1).join(", ")}, and ${l[l.length - 1]}`);

  // Intensity bands: < 0.3 a little, 0.3–0.6 quite, > 0.6 strongly.
  const band = x => (x > 0.6 ? "strongly" : x >= 0.3 ? "quite" : "a little");
  const FEEL = {
    fear: "anxious", sadness: "sad", anger: "angry", shame: "ashamed",
    rumination: "caught in replaying thoughts", avoidance: "pulled to avoid things",
    calm: "restless", connection: "alone", hope: "discouraged",
  };
  const FEEL_HIGH = { calm: "calm", connection: "connected", hope: "hopeful" };
  // How strongly each mover is felt: hard/process by value, grounding by how far below neutral.
  function felt(e) {
    return NAMES.map((n, j) => ({ n, x: isGround[j] ? (e[j] <= 0.4 ? (0.5 - e[j]) / 0.5 : 0) : (e[j] >= ACTIVE ? e[j] : 0) }))
      .filter(f => f.x > 0).sort((p, q) => q.x - p.x || idx[p.n] - idx[q.n]).slice(0, 3);
  }
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
  const pickN = (list, k, rand) => { const a = list.slice(), out = []; while (out.length < k && a.length) out.push(a.splice(Math.floor(rand() * a.length), 1)[0]); return out; };
  // The mover that moves most toward home gives two; the stabilizer gives one; faith adds one.
  function affirmations(m, opts = {}) {
    const rand = S.parts.rng(Number.isFinite(opts.seed) ? opts.seed : 1);
    const main = m.mover || m.stabilizer || "calm";
    const out = pickN(AFFIRM[main], 2, rand);
    const stab = m.stabilizer;
    if (stab && stab !== main) out.push(...pickN(AFFIRM[stab], 1, rand));
    if (opts.faith) out.push(...pickN(FAITH_AFFIRM[main], 1, rand));
    return out;
  }
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

  // ---------- Show the math (off by default) ----------
  function shown(e) {
    return NAMES.map((n, i) => ({ name: n, label: label(n), v: e[i], group: HARD.includes(n) ? "hard" : GROUND.includes(n) ? "grounding" : "process" }))
      .filter(x => (x.group === "grounding" ? Math.abs(x.v - 0.5) >= 0.1 : x.v >= ACTIVE));
  }
  function mathLines(state, m) {
    const V = state.vars, L = [];
    const mv = shown(m.e);
    L.push(`e: ${mv.length ? mv.map(x => `${x.label} ${f2(x.v)}`).join(", ") : "at rest"}`);
    L.push("step = act(clip01(e + a(e)\u00B7(h \u2212 e) + b\u00B7s(e)))");
    const raw = V.aBase + FIXED.kd * m.d;
    L.push(`a(e) = min(a_max, a0 + k\u2016e \u2212 h\u2016) = min(${f2(V.aMax)}, ${f2(V.aBase)} + ${f2(FIXED.kd)}\u00B7${f2(m.d)}) = ${f2(Math.min(V.aMax, raw))}${m.unstable ? `, capped at a_cap = ${f2(FIXED.aCap)} (\u03BB > 0) \u2192 ${f2(m.a)}` : ""}`);
    L.push(`b = ${f2(m.b)}${m.unstable ? " (b_U, \u03BB > 0)" : ""}`);
    L.push(`d = \u2016e \u2212 h\u2016 = ${f2(m.d)} \u2192 ${f2(m.dNext)} after one step`);
    L.push(`\u03BB = \u03C1(W_active) \u2212 d = ${m.lambda === null ? "none (nothing active)" : `${sgn(m.lambda)} (${m.unstable ? "unstable" : "settles"})`}`);
    if (m.loops[0]) L.push(`strongest loop: ${label(m.loops[0].a)} \u00D7 ${label(m.loops[0].b)} (gain ${f2(m.loops[0].gain)})`);
    if (m.hidden[0]) L.push(`hidden rise: ${label(m.hidden[0].name)} ${f2(m.hidden[0].from)} \u2192 ${f2(m.hidden[0].to)} in ${FIXED.k} steps${m.hidden[0].via ? ` via ${label(m.hidden[0].via)}` : ""}`);
    L.push(`act(): ${m.mover ? `${label(m.mover)} moves most toward home` : "no move"}; stabilizer ${m.stabilizer || "none"}`);
    L.push(`B = 0.8\u00B7B\u208B\u2081 + 0.2\u00B7e: \u2016B \u2212 h\u2016 = ${f2(m.baseline.dB)}${m.baseline.dPrev === null ? "" : ` (yesterday's B: ${f2(m.baseline.dPrev)})`}`);
    if (m.recovery) L.push(`recovery: ${recText(m.recovery)} until d < ${f2(FIXED.eps)} (model estimate)`);
    return L;
  }

  // ---------- Story (creature story driven by the master step) ----------
  const ARC_FOR = { shame: "labeling", sadness: "hopelessness", fear: "catastrophizing", anger: "catastrophizing", rumination: "allOrNothing", avoidance: "fortuneTelling" };
  const STEP_FOR = { calm: SKILL.calm.split(": ")[1].replace(/\.$/, "").toLowerCase(), connection: "send one short message to someone who is kind", hope: "pick one small thing for tomorrow and write it down" };
  const LOOSEN = {
    anger: ["the anger loosened its grip", "the anger loosened its grip a little"],
    shame: ["the shame grew quieter", "the shame grew a little quieter"],
    fear: ["the fear settled", "the fear settled a little"],
    sadness: ["the sadness grew lighter", "the sadness grew a little lighter"],
    rumination: ["the replaying slowed", "the replaying slowed a little"],
    avoidance: ["the urge to look away eased", "the urge to look away eased a little"],
    calm: ["their breath slowed", "their breath slowed a little"],
    connection: ["they felt less alone", "they felt a little less alone"],
    hope: ["hope came back", "a little hope came back"],
  };
  function storyFocus(state, m) { return focus({ e: m.e, home: state.home }).name || m.top || "calm"; }
  function story(state, m, opts = {}) {
    if (!m || m.crisis || m.d < 0.005) return null;
    const top = storyFocus(state, m);
    const i = idx[top];
    const arc = HARD.concat(PROCESS).includes(top) ? ARC_FOR[top] : "none";
    const stab = m.stabilizer;
    const guide = stab === "connection" ? "Tidelyn" : stab === "calm" ? "Mistfawn" : stab === "hope" ? "Hivewright" : S.PATTERN_CREATURE[arc] || S.PATTERN_CREATURE.none;
    // The opening follows the mover; the text's own pattern is used only when it fits that mover.
    const read = { patterns: (m.read && m.read.patterns) || [], reframes: [REFRAME[top] || REFRAME.none] };
    const base = S.tell({ read, mover: top, character: guide, step: STEP_FOR[stab] || STEP_FOR.calm, seed: opts.seed || 1, faith: !!opts.faith });
    if (base.crisis) return null;
    const from = m.e[i], to = m.next[i];
    const moved = Math.abs(from - state.home[i]) - Math.abs(to - state.home[i]);
    const helper = stab && stab !== top ? `They knew ${SOFTENER[stab]} could soften it, so the plan stayed small and real.` : "The plan stayed small and real.";
    const loosen = `${cap(LOOSEN[top][moved >= 0.15 ? 0 : 1])}. Not all the way. Just closer.`;
    const aff = affirmations(m, { seed: opts.seed || 1 })[0];
    const keep = `They kept one sentence close: \u201C${aff}\u201D`;
    const b = base.sentences;
    const sentences = [b[0], helper, ...b.slice(1, -1), loosen, keep, b[b.length - 1]];
    return { guide, tag: base.tag, focus: top, arc, opening: base.opening, openingFrom: base.openingFrom, from, to, affirmation: aff, text: sentences.join(" "), next: m.next };
  }
  // The path game for this moment: the same master output picks scene 1 and the closing affirmation.
  function game(state, m, opts = {}) {
    if (!m || m.crisis) return { crisis: true };
    const G2 = typeof Games !== "undefined" ? Games : require("./games.js");
    const top = storyFocus(state, m);
    const arc = HARD.concat(PROCESS).includes(top) ? ARC_FOR[top] : "none";
    return G2.make({
      type: "path", thought: opts.thought || G2.SAMPLES[arc] || G2.SAMPLES.none, read: m.read || undefined, mover: top,
      reframe: REFRAME[top] || REFRAME.none, faith: !!opts.faith, seed: opts.seed || 1,
      affirmation: affirmations(m, { seed: opts.seed || 1 })[0],
    });
  }

  // ---------- The code language (mf 2) ----------
  //   mf 2
  //   home calm=v connection=v hope=v
  //   e name=v ...              (hard/process when > 0; grounding always)
  //   vars key=v ...            (only values that differ from the default)
  //   w from>to=v               (one W override)
  //   day YYYY-MM-DD name=v ...
  //   cp n YYYY-MM-DDTHH:MM label=x name=v ... lambda=v
  //   ideal a=v b=v             eq ... (readable, rebuilt on save, ignored on read)
  //   # comment
  const NUM = "-?(?:\\d+(?:\\.\\d*)?|\\.\\d+)";
  const PAIR = new RegExp(`^([a-zA-Z]+)=(${NUM})$`);
  const LABEL_RE = /^[a-z0-9-]{1,24}$/;
  const TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
  const DAY = /^\d{4}-\d{2}-\d{2}$/;
  const num = x => (Object.is(r2(x), -0) ? 0 : r2(x)).toFixed(2);
  const vecCode = v => NAMES.map((n, i) => [n, v[i]]).filter(([n, x]) => GROUND.includes(n) || x > 0).map(([n, x]) => `${n}=${num(x)}`).join(" ");
  const join = parts => parts.filter(Boolean).join(" ");

  function serialize(state) {
    const out = [`mf ${VERSION}`];
    out.push(`home ${GROUND.map(n => `${n}=${num(state.home[idx[n]])}`).join(" ")}`);
    out.push(join(["e", vecCode(state.e)]));
    const vs = VAR_KEYS.filter(k => state.vars[k] !== SPEC[k].def);
    if (vs.length) out.push(join(["vars", ...vs.map(k => `${k}=${num(state.vars[k])}`)]));
    state.w.forEach(o => out.push(`w ${o.from}>${o.to}=${num(o.w)}`));
    state.days.forEach(x => out.push(join([`day ${x.day}`, vecCode(x.e)])));
    state.cps.forEach(c => out.push(join([`cp ${c.n} ${c.t} label=${c.label}`, vecCode(c.e), `lambda=${num(c.lambda)}`])));
    if (state.ideal) {
      out.push(`ideal a=${num(state.ideal.a)} b=${num(state.ideal.b)}`);
      out.push(`eq step = act(clip01(e + ${num(state.ideal.a)}*(h - e) + ${num(state.ideal.b)}*s(e)))`);
    }
    return out.join("\n") + "\n";
  }

  // mf 1 -> mf 2, best effort (see the mapping table in the README).
  const or1 = (a, b) => 1 - (1 - a) * (1 - b);
  function mapOld(o, extra = {}) {
    const g = n => clamp01(Number(o[n]) || 0);
    const v = {};
    v.fear = g("fear");
    v.sadness = g("sadness");
    v.anger = g("anger");
    v.shame = or1(g("shame"), g("guilt"));
    v.calm = g("calm") || g("joy") ? Math.max(g("calm"), 0.5 * g("joy")) : 0.5;
    v.hope = g("hope") || g("joy") ? Math.max(g("hope"), 0.8 * g("joy")) : 0.5;
    const c0 = g("connection") || 0.5;
    v.connection = c0 * (1 - g("loneliness"));
    const gr = Number.isFinite(extra.g) ? clamp01((extra.g - (extra.target ?? 0.3)) / (1 - (extra.target ?? 0.3))) : 0;
    v.rumination = gr;
    v.avoidance = 0;
    const t = extra.t || {};
    if (t.wrath) v.anger = or1(v.anger, 0.5 * t.wrath);
    if (t.envy) { v.anger = or1(v.anger, 0.3 * t.envy); v.shame = or1(v.shame, 0.2 * t.envy); }
    if (t.sloth) { v.sadness = or1(v.sadness, 0.3 * t.sloth); v.avoidance = or1(v.avoidance, 0.4 * t.sloth); }
    if (t.pride) { v.rumination = or1(v.rumination, 0.3 * t.pride); v.anger = or1(v.anger, 0.2 * t.pride); }
    if (t.greed) v.fear = or1(v.fear, 0.2 * t.greed);
    if (t.gluttony || t.lust) v.avoidance = or1(v.avoidance, 0.2 * Math.max(t.gluttony || 0, t.lust || 0));
    if (extra.desolation) { v.sadness = or1(v.sadness, 0.4 * extra.desolation); v.hope = v.hope * (1 - 0.4 * extra.desolation); }
    return NAMES.map(n => r2(clamp01(v[n])));
  }

  function parseOld(raw) {
    const state = defaultState();
    const notes = ["Imported from mf 1 and mapped onto the nine movers (best effort)."];
    let crisis = false;
    const P1 = new RegExp(`^([a-zA-Z.>]+)=(${NUM})$`);
    const pairs = toks => Object.fromEntries(toks.map(t => t.match(P1)).filter(Boolean).map(m => [m[1], Number(m[2])]));
    let e = {}, ego = {}, t = {}, desolation = 0;
    const days = [], cps = [];
    const label = s => { const m = (s || "").match(/^label=(.*)$/); return m && LABEL_RE.test(m[1]) ? m[1] : null; };
    raw.forEach(line0 => {
      const line = line0.replace(/#.*$/, "").trim();
      if (!line) return;
      const [kw, ...rest] = line.split(/\s+/);
      if (kw === "home") {
        const o = pairs(rest);
        GROUND.forEach(n => { if (n in o) state.home[idx[n]] = r2(clamp01(n === "hope" ? Math.max(o.hope, o.joy || 0) : o[n])); });
      } else if (kw === "e") e = pairs(rest);
      else if (kw === "ego") ego = pairs(rest);
      else if (kw === "tendency") t = pairs(rest);
      else if (kw === "ignatian") desolation = Number(pairs(rest.slice(1)).d) || 0;
      else if (kw === "day" && DAY.test(rest[0] || "")) days.push({ day: rest[0], o: pairs(rest.slice(1)) });
      else if (kw === "cp" && TIME.test(rest[1] || "")) {
        const lab = label(rest[2]);
        if ((rest[2] || "").startsWith("label=") && G.isCrisis((rest[2] || "").slice(6).replace(/-/g, " "))) crisis = true;
        if (lab) cps.push({ n: Number(rest[0]), t: rest[1], label: lab, o: pairs(rest.slice(3)) });
      } else if ((kw === "vars" || kw === "framework") && rest.some(x => /^(framework|name)=/.test(x))) {
        const nm = rest.find(x => /^(framework|name)=/.test(x)).split("=")[1];
        if (G.isCrisis(nm.replace(/-/g, " "))) crisis = true;
      }
    });
    if (crisis) return { ok: false, crisis: true, errors: [] };
    const extra = { g: ego.g, target: ego.target, t, desolation };
    state.e = mapOld(e, extra);
    days.forEach(x => { if (!state.days.length || x.day > state.days[state.days.length - 1].day) state.days.push({ day: x.day, e: mapOld(x.o, { g: x.o.g, target: ego.target }) }); });
    cps.forEach(c => { if (Number.isInteger(c.n) && c.n > 0 && (!state.cps.length || c.n > state.cps[state.cps.length - 1].n)) state.cps.push({ n: c.n, t: c.t, label: c.label, e: mapOld(c.o, { g: c.o.g, target: ego.target }), lambda: r2(Number(c.o.lambda) || 0) }); });
    state.days = state.days.slice(-MAX_DAYS);
    state.cps = state.cps.slice(-MAX_CHECKPOINTS);
    notes.push("Old variables, weights and frameworks were left out; the new defaults apply.");
    return { ok: true, state: refreshIdeal(state), notes, from: 1 };
  }

  function parse(text) {
    const errors = [];
    const err = (line, msg) => errors.push({ line, msg: `Line ${line}: ${msg}` });
    const raw = String(text || "").replace(/\r\n?/g, "\n").split("\n");
    if (raw.length > MAX_LINES) return { ok: false, errors: [{ line: 0, msg: `That code is too long (more than ${MAX_LINES} lines).` }] };
    const first = raw.findIndex(l => l.replace(/#.*$/, "").trim());
    if (first < 0) return { ok: false, errors: [{ line: 0, msg: "Nothing to import yet. Paste code that starts with \u201Cmf 2\u201D." }] };
    const head = raw[first].replace(/#.*$/, "").trim().split(/\s+/);
    if (head[0] !== "mf") return { ok: false, errors: [{ line: first + 1, msg: `Line ${first + 1}: the code should start with \u201Cmf 2\u201D.` }] };
    if (head[1] === "1") return parseOld(raw.slice(first + 1));
    if (head[1] !== String(VERSION)) return { ok: false, errors: [{ line: first + 1, msg: `Line ${first + 1}: this is version ${head[1] || "?"}; this app reads versions 1 and 2.` }] };
    const state = defaultState();
    let crisis = false, sawHome = false;
    const readVec = (toks, line, extra = {}) => {
      const o = {}, ex = {};
      toks.forEach(tok => {
        const m = tok.match(PAIR);
        if (!m) { err(line, `\u201C${tok}\u201D should look like name=0.50.`); return; }
        const k = m[1], x = Number(m[2]);
        if (k in extra) { ex[k] = x; return; }
        if (!(k in idx)) { err(line, `\u201C${k}\u201D isn't one of the nine movers (${NAMES.join(", ")}).`); return; }
        if (k in o) { err(line, `${k} appears twice.`); return; }
        if (x < 0 || x > 1) { err(line, `${k}=${m[2]} must be between 0 and 1.`); return; }
        o[k] = x;
      });
      return { vec: fromObj(o, NAMES.map(n => (GROUND.includes(n) ? 0.5 : 0))), ex };
    };
    raw.slice(first + 1).forEach((rawLine, k) => {
      const n = first + k + 2;
      const line = rawLine.replace(/#.*$/, "").trim();
      if (!line) return;
      const [kw, ...rest] = line.split(/\s+/);
      switch (kw) {
        case "home": {
          if (sawHome) { err(n, "home appears twice."); break; }
          sawHome = true;
          rest.forEach(tok => {
            const m = tok.match(PAIR);
            if (!m || !GROUND.includes(m[1]) || Number(m[2]) < 0 || Number(m[2]) > 1) { err(n, "home looks like home calm=0.80 connection=0.80 hope=0.80."); return; }
            state.home[idx[m[1]]] = r2(Number(m[2]));
          });
          break;
        }
        case "e": state.e = readVec(rest, n).vec; break;
        case "vars": {
          rest.forEach(tok => {
            const m = tok.match(PAIR);
            if (!m || !VAR_KEYS.includes(m[1])) { err(n, `\u201C${tok}\u201D isn't a variable (${VAR_KEYS.join(", ")}).`); return; }
            const x = Number(m[2]), sp = SPEC[m[1]];
            if (!(x >= sp.min && x <= sp.max)) { err(n, `${m[1]} must be from ${sp.min} to ${sp.max}.`); return; }
            state.vars[m[1]] = r2(x);
          });
          break;
        }
        case "w": {
          const m = rest.length === 1 && rest[0].match(new RegExp(`^([a-z]+)>([a-z]+)=(${NUM})$`));
          if (!m) { err(n, "a weight looks like w sadness>rumination=0.40."); break; }
          const [, from, to, v] = m, x = Number(v);
          if (!(from in idx) || !(to in idx) || from === to) { err(n, "a weight joins two different movers."); break; }
          if (x < -1 || x > 1) { err(n, "a weight must be between -1 and 1."); break; }
          if (state.w.length >= MAX_W) { err(n, `at most ${MAX_W} weights.`); break; }
          state.w = state.w.filter(o => !(o.from === from && o.to === to)).concat({ from, to, w: r2(x) });
          break;
        }
        case "day": {
          const [dk, ...vals] = rest;
          if (!DAY.test(dk || "")) { err(n, "a day looks like day 2026-10-17 sadness=0.50."); break; }
          if (state.days.length && dk <= state.days[state.days.length - 1].day) { err(n, "days should go forward in time."); break; }
          if (state.days.length >= MAX_DAYS) { err(n, `at most ${MAX_DAYS} days.`); break; }
          state.days.push({ day: dk, e: readVec(vals, n).vec });
          break;
        }
        case "cp": {
          const [nn, t, lab, ...vals] = rest;
          const k2 = Number(nn);
          if (!Number.isInteger(k2) || k2 < 1) { err(n, "a checkpoint starts with its number, like cp 1."); break; }
          if (state.cps.length && k2 <= state.cps[state.cps.length - 1].n) { err(n, "checkpoint numbers should go up."); break; }
          if (!TIME.test(t || "")) { err(n, "the time should look like 2026-10-17T13:50."); break; }
          const lm = (lab || "").match(/^label=(.*)$/);
          if (!lm || !LABEL_RE.test(lm[1])) { err(n, "the label should look like label=start (a-z, 0-9, dashes)."); break; }
          if (G.isCrisis(lm[1].replace(/-/g, " "))) { crisis = true; break; }
          if (state.cps.length >= MAX_CHECKPOINTS) { err(n, `at most ${MAX_CHECKPOINTS} checkpoints.`); break; }
          const { vec, ex } = readVec(vals, n, { lambda: true });
          state.cps.push({ n: k2, t, label: lm[1], e: vec, lambda: r2(Number.isFinite(ex.lambda) ? ex.lambda : 0) });
          break;
        }
        case "ideal": {
          const m = line.match(new RegExp(`^ideal a=(${NUM}) b=(${NUM})$`));
          if (!m || ![m[1], m[2]].every(x => Number(x) >= 0 && Number(x) <= 1)) { err(n, "ideal looks like ideal a=0.10 b=0.15 (each 0 to 1)."); break; }
          state.ideal = { a: r2(Number(m[1])), b: r2(Number(m[2])) };
          break;
        }
        case "eq": break;
        case "mf": err(n, "the header appears twice."); break;
        default: err(n, `\u201C${kw}\u201D isn't a keyword (mf, home, e, vars, w, day, cp, ideal, eq).`);
      }
    });
    if (crisis) return { ok: false, crisis: true, errors: [] };
    return errors.length ? { ok: false, errors } : { ok: true, state, from: 2 };
  }

  return {
    VERSION, NAMES, HARD, GROUND, PROCESS, LABEL, HOME, REST, FIXED, VAR_SPEC, SPEC, VAR_KEYS, EDGES, MAIN_PAIRS, SKILL, REFRAME, TEST, MAX_SIM,
    AFFIRM, FAITH_AFFIRM, FEEL, EFFECT, LOW_LINK, CREEP,
    master, calls,
    defaultState, defaultVars, validateVars, weights, defaultWeight, setWeight, fromText, combine, distance,
    focus, metrics, card, lines, mathLines, shown, band, felt, feelingLine, connectLines, affirmations, progressLine,
    story, game, acceptStep, refreshIdeal, addCheckpoint, restore, recordDay, baseline, baselineSeries, week, weekLines, weekMath,
    recovery, recText, serialize, parse, mapOld, stamp, homeVec, fromObj, label,
    // Building blocks master uses (exported for tests only; features call master).
    _parts: { step, lambda, hidden, loops, sVec, act, ema },
  };
})();

if (typeof module !== "undefined") module.exports = Model;
