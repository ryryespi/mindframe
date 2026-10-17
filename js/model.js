// model.js — MindFrame's one model: nine movers, small dynamics, one ideal
// step, a recovery estimate, checkpoints and days, and the .mf code (mf 2).
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
//   dynamics e ← clamp01(e + dt·(Wᵀ(e − rest) − d·(e − rest)))
//            (grounding movers act through their distance from 0.5: low connection
//            feeds shame and sadness, high calm eases fear)
//   λ        = ρ(W on the active hard and process movers) − d   (> 0: unstable)
//   home     h: calm, connection, hope 0.8; everything else 0
//   d        = ‖e − h‖
//   ideal    e' = e + a·(h − e) + b·s(e), never past home, at least 0.01 move
//            s_j = e_j·Σ_{grounding i} min(0, W_ij)·h_i  for hard/process j above home
//            a = clamp(aBase·(0.5 + D/Dmax), aMin, aMax); λ > 0: a = max(aMin, min(aCap, a/(1 + 4λ))), b = bU
//            D is the 7-day baseline's distance once days are recorded
//   T_rec    ideal steps until d < eps (≤ 200); days = ⌈T_rec ÷ accepted steps per day⌉

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
    ["aBase", 0.2, 0.05, 0.5, "step size toward home"],
    ["aMax", 0.25, 0.05, 0.5, "largest step"],
    ["b", 0.1, 0, 0.5, "stabilizer pull (grounding movers press on hard ones)"],
    ["d", 0.3, 0.05, 1, "decay: how fast a mover settles on its own"],
  ];
  const FIXED = { aMin: 0.05, aCap: 0.12, bU: 0.15, dt: 0.15, rise: 0.15, eps: 0.3, k: 8, beta: 0.2 };
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

  // ---------- The ideal step ----------
  function ideal(e, opts = {}) {
    const h = opts.home || homeVec(), W = opts.W || W0, V = opts.vars || defaultVars();
    const lam = lambda(e, W, V.d);
    const d = distance(e, h);
    const refD = Number.isFinite(opts.refD) ? opts.refD : d;
    let a = clamp(V.aBase * (0.5 + refD / dmax(h)), FIXED.aMin, V.aMax), b = V.b;
    const unstable = lam !== null && lam > 0;
    if (unstable) { a = Math.max(FIXED.aMin, Math.min(FIXED.aCap, a / (1 + 4 * lam))); b = FIXED.bU; }
    a = r2(a); b = r2(b);
    const toward = (x, y, hj) => (x > hj ? Math.max(hj, y) : Math.min(hj, y));
    const pull = NAMES.map((n, j) => (isGround[j] ? 0 : NAMES.reduce((s, m, i) => s + (isGround[i] ? Math.min(0, W[i][j]) * h[i] : 0), 0)));
    const next = e.map((x, j) => {
      let y = x + a * (h[j] - x);
      if (!isGround[j] && x > h[j]) y += b * x * pull[j];
      y = r2(clamp01(toward(x, y, h[j])));
      if (y === r2(x) && r2(x) !== h[j]) y = r2(x + (h[j] > x ? 0.01 : -0.01));
      return y;
    });
    // The stabilizer: the grounding mover that presses hardest on the top hard/process mover.
    const top = NAMES.map((n, j) => ({ n, j, gap: e[j] - h[j] })).filter(x => !isGround[x.j] && x.gap > 0).sort((p, q) => q.gap - p.gap)[0] || null;
    let stab = null;
    if (top) {
      let best = 0;
      GROUND.forEach(g => { const p = -Math.min(0, W[idx[g]][top.j]); if (p > best) { best = p; stab = g; } });
    }
    return { a, b, lambda: lam, unstable, d: r2(d), next, dNext: r2(distance(next, h)), top: top ? top.n : null, stabilizer: stab };
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

  // ---------- Days, baseline, checkpoints ----------
  function stamp(ts) {
    const d = new Date(ts), p = x => String(x).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  }
  const dayOf = t => t.slice(0, 10);
  function baselineSeries(days, beta = FIXED.beta) {
    let B = null;
    return days.map(x => { B = B ? B.map((b, i) => (1 - beta) * b + beta * x.e[i]) : x.e.slice(); return { day: x.day, D: x.e, B: B.slice() }; });
  }
  function baseline(state) {
    const s = baselineSeries(state.days);
    return s.length ? s[s.length - 1].B.map(r2) : null;
  }
  function recordDay(state, ts) {
    const day = dayOf(stamp(ts));
    const days = state.days.filter(x => x.day !== day).concat({ day, e: state.e.slice() }).sort((a, b) => (a.day < b.day ? -1 : 1)).slice(-MAX_DAYS);
    return { ...state, days };
  }
  function addCheckpoint(state, label, ts = Date.now()) {
    const n = state.cps.length ? state.cps[state.cps.length - 1].n + 1 : 1;
    const lam = lambda(state.e, weights(state.w), state.vars.d);
    const cp = { n, t: stamp(ts), label: LABEL_RE.test(label || "") ? label : `cp-${n}`, e: state.e.slice(), lambda: lam === null ? 0 : lam };
    return recordDay({ ...state, cps: state.cps.concat(cp).slice(-MAX_CHECKPOINTS) }, ts);
  }
  function restore(state, n) {
    const cp = state.cps.find(c => c.n === n);
    return cp ? { ...state, e: cp.e.slice() } : state;
  }
  // Each day's baseline distance and direction: cos(D_t − D_{t−1}, h − B_{t−1}).
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
  const ARROW = { up: "\u2191 toward home", side: "\u2194 sideways", down: "\u2193 away from home" };
  const weekLines = (state, now) => week(state, now).map(x => `${x.day.slice(5)}  \u2016B \u2212 h\u2016 = ${x.dB.toFixed(2)}  ${x.dir ? ARROW[x.dir] : "start"}`);

  // ---------- Recovery estimate ----------
  function simulate(state) {
    const W = weights(state.w);
    let e = state.e.slice();
    for (let n = 0; n <= MAX_SIM; n++) {
      const D = distance(e, state.home);
      if (D < FIXED.eps) return { steps: n, reached: true, final: r2(D) };
      if (n === MAX_SIM) return { steps: n, reached: false, final: r2(D) };
      const id = ideal(e, { home: state.home, W, vars: state.vars });
      if (id.next.every((x, i) => x === e[i])) return { steps: n, reached: false, final: r2(D) };
      e = id.next;
    }
  }
  function recovery(state) {
    const sim = simulate(state);
    const per = {};
    state.cps.filter(c => /^step-\d+$/.test(c.label)).forEach(c => { per[dayOf(c.t)] = (per[dayOf(c.t)] || 0) + 1; });
    const counts = Object.values(per);
    const rate = counts.length ? r2(counts.reduce((s, x) => s + x, 0) / counts.length) : 1;
    return { ...sim, rate, days: sim.reached ? Math.ceil(sim.steps / rate) : null };
  }
  const recText = r => (r.reached ? `~${r.steps} step${r.steps === 1 ? "" : "s"} (~${r.days} day${r.days === 1 ? "" : "s"})` : `not reached in ${MAX_SIM} steps`);

  // ---------- Everything the card needs ----------
  function defaultState() {
    return { v: VERSION, home: homeVec(), e: rest(), vars: defaultVars(), w: [], days: [], cps: [], ideal: null };
  }
  function metrics(state, live = {}) {
    const W = weights(state.w);
    const B = baseline(state);
    const opts = { home: state.home, W, vars: state.vars };
    if (B) opts.refD = distance(B, state.home);
    const id = ideal(state.e, opts);
    return {
      d: r2(distance(state.e, state.home)), lambda: lambda(state.e, W, state.vars.d), loops: loops(state.e, W, state.vars.d),
      hidden: hidden(state.e, W, state.vars), ideal: id, focus: focus(state), recovery: recovery(state),
      baseline: B ? { dB: r2(distance(B, state.home)), days: state.days.length } : null,
      notes: live.notes || [], read: live.read || null,
    };
  }

  const f2 = x => x.toFixed(2);
  const sgn = x => (x > 0 ? "+" : x < 0 ? "\u2212" : "") + Math.abs(x).toFixed(2);
  const label = n => LABEL[n] || n;
  // Movers worth showing: hard/process ≥ 0.1, grounding 0.1 or more away from 0.5.
  function shown(state) {
    return NAMES.map((n, i) => ({ name: n, label: label(n), v: state.e[i], group: HARD.includes(n) ? "hard" : GROUND.includes(n) ? "grounding" : "process" }))
      .filter(x => (x.group === "grounding" ? Math.abs(x.v - 0.5) >= 0.1 : x.v >= ACTIVE));
  }

  function reading(state, m) {
    const parts = [];
    const L = m.loops[0];
    if (L) parts.push(`The strongest loop is ${label(L.a)} \u00D7 ${label(L.b)}: each one feeds the other${L.unstable ? ", and the loop can grow" : ""}.`);
    const hd = m.hidden[0];
    if (hd) parts.push(`Left alone, ${label(hd.name)} could rise from ${f2(hd.from)} to ${f2(hd.to)} in ${FIXED.k} steps${hd.via ? ` (via ${label(hd.via)})` : ""}.`);
    if (m.lambda !== null) parts.push(m.lambda > 0 ? "The mix is unstable (small changes grow), so the step is kept small." : "The active movers settle on their own over time.");
    const low = GROUND.filter(n => state.e[idx[n]] <= 0.3);
    if (low.length) parts.push(`${low.map(n => n[0].toUpperCase() + n.slice(1)).join(" and ")} ${low.length > 1 ? "are" : "is"} low.`);
    if (!parts.length) parts.push(m.d < FIXED.eps ? "You're close to home right now." : "Nothing strong is moving; a quiet moment.");
    return parts.join(" ");
  }

  function card(state, m, opts = {}) {
    const f = m.focus, key = f.kind === "strongest" ? f.name : "none";
    const read = m.read;
    // The thought's own reframe when it has a pattern or a big word; otherwise the top mover's.
    const own = read && read.reframes && (read.patterns.length || /^"/.test(read.reframes[0] || ""));
    const reframe = (own && read.reframes[0]) || REFRAME[key] || REFRAME.none;
    const test = (own && read.question) || TEST[key] || TEST.none;
    const skill = f.name ? SKILL[f.name] : "Keep going: notice one good thing and stay with it for a breath.";
    const id = m.ideal;
    const out = {
      movers: shown(state),
      reading: reading(state, m),
      reframe, test, skill,
      step: `e\u2032 = e + ${f2(id.a)}\u00B7(h \u2212 e) + ${f2(id.b)}\u00B7s(e): d ${f2(id.d)} \u2192 ${f2(id.dNext)}`,
      recovery: `${recText(m.recovery)} to d < ${f2(FIXED.eps)} (model estimate)`,
      faith: opts.faith ? FAITH[f.kind === "strongest" ? f.name : "none"] || FAITH.none : null,
    };
    return out;
  }

  // Plain text lines (for copy and for tests).
  function lines(state, m, opts = {}) {
    const c = card(state, m, opts), L = [];
    L.push(`movers: ${c.movers.length ? c.movers.map(x => `${x.label} ${f2(x.v)}${x.group === "grounding" && x.v < 0.5 ? " (low)" : ""}`).join(", ") : "nothing strong"}`);
    L.push(`d = \u2016e \u2212 h\u2016 = ${f2(m.d)}${m.lambda !== null ? `, \u03BB = ${sgn(m.lambda)} (${m.lambda > 0 ? "unstable" : "settles"})` : ""}`);
    L.push(`reading: ${c.reading}`);
    L.push(`reframe: ${c.reframe}`);
    L.push(`test: ${c.test}`);
    L.push(`next skill: ${c.skill}`);
    L.push(`ideal step: ${c.step}`);
    L.push(`recovery: ${c.recovery}`);
    if (c.faith) L.push(c.faith);
    return L;
  }

  // ---------- Story (creature story driven by the ideal step) ----------
  const ARC_FOR = { shame: "labeling", sadness: "hopelessness", fear: "catastrophizing", anger: "catastrophizing", rumination: "allOrNothing", avoidance: "fortuneTelling" };
  const STEP_FOR = { calm: SKILL.calm.split(": ")[1].replace(/\.$/, "").toLowerCase(), connection: "send one short message to someone who is kind", hope: "pick one small thing for tomorrow and write it down" };
  function story(state, m, opts = {}) {
    const id = m.ideal;
    if (m.d < 0.005) return null;
    // Strongest hard/process mover, else the grounding mover with the biggest gap.
    const top = focus(state).name || id.top || "calm";
    const i = idx[top];
    const arc = HARD.concat(PROCESS).includes(top) ? ARC_FOR[top] : "none";
    const stab = id.stabilizer;
    const guide = stab === "connection" ? "Tidelyn" : stab === "calm" ? "Mistfawn" : stab === "hope" ? "Hivewright" : S.PATTERN_CREATURE[arc] || S.PATTERN_CREATURE.none;
    // The opening follows the mover; the text's own pattern is used only when it fits that mover.
    const read = { patterns: (m.read && m.read.patterns) || [], reframes: [REFRAME[top] || REFRAME.none] };
    const base = S.tell({ read, mover: top, character: guide, step: STEP_FOR[stab] || STEP_FOR.calm, seed: opts.seed || 1, faith: !!opts.faith });
    if (base.crisis) return null;
    const from = state.e[i], to = id.next[i];
    const map = `They kept a small map of feelings, and on it ${label(top)} sat at ${f2(from)}, the farthest point from home.`;
    const helper = stab ? `They knew ${stab} could pull on it, so the plan stayed small and real.` : "The plan stayed small and real.";
    const landing = `On the map, ${label(top)} moved from ${f2(from)} to ${f2(to)}, and the way home grew ${f2(Math.max(0, id.d - id.dNext))} shorter. Not all the way. Just closer.`;
    const b = base.sentences;
    const sentences = [b[0], map, helper, ...b.slice(1, -1), landing, b[b.length - 1]];
    return { guide, tag: base.tag, focus: top, arc, opening: base.opening, openingFrom: base.openingFrom, from, to, text: sentences.join(" "), next: id.next };
  }

  function acceptStep(state, ts = Date.now()) {
    const m = metrics(state);
    const n = state.cps.filter(c => /^step-\d+$/.test(c.label)).length + 1;
    return refreshIdeal(addCheckpoint({ ...state, e: m.ideal.next.slice() }, `step-${n}`, ts));
  }
  function refreshIdeal(state) {
    const m = metrics(state);
    return { ...state, ideal: { a: m.ideal.a, b: m.ideal.b } };
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
      out.push(`eq e' = e + ${num(state.ideal.a)}*(h - e) + ${num(state.ideal.b)}*s(e)`);
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
    VERSION, NAMES, HARD, GROUND, PROCESS, LABEL, HOME, REST, FIXED, VAR_SPEC, SPEC, VAR_KEYS, EDGES, MAIN_PAIRS, SKILL, REFRAME, TEST, FAITH, MAX_SIM,
    defaultState, defaultVars, validateVars, weights, defaultWeight, setWeight, fromText, combine, distance, step, lambda, loops, hidden, ideal,
    focus, metrics, shown, card, lines, reading, story, acceptStep, refreshIdeal, addCheckpoint, restore, recordDay, baseline, baselineSeries, week, weekLines,
    simulate, recovery, recText, serialize, parse, mapOld, stamp, homeVec, fromObj, label,
  };
})();

if (typeof module !== "undefined") module.exports = Model;
