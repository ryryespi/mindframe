// emotions.js — the equation engine. Reads a thought, scores ten emotions,
// and describes how they push on each other as short equation sentences.
//
// This is a MODEL built from design assumptions informed by general emotion
// research. It is not validated science and not a diagnosis. All local,
// deterministic, no network.
//
//   e ∈ [0,1]^10      emotion vector scored from the text
//   W (10×10)          W[i][j] > 0: i amplifies j;  W[i][j] < 0: i dampens j
//   e_{t+1} = clamp01( e_t + h·(Wᵀe_t − d·e_t) )     h = 0.15, d = 0.3
//   u_ij = W_ij·W_ji·e_i·e_j  (both W > 0)           mutual amplification (a loop)
//   a hard-feeling loop is unstable on its own when √(W_ij·W_ji) − d > 0
//   J = Wᵀ − d·I on active emotions (e_i > 0.1)      λ = largest real part of eig(J)
//   λ > 0: small changes grow (a feeding loop, or a tug-of-war where one side
//   wins);  λ ≤ 0: the mix settles back.

const Emotions = (function () {
  const analyzeFn = typeof analyze === "function" ? analyze : require("./analyzer.js").analyze;
  const G = typeof Grounding !== "undefined" ? Grounding : require("./grounding.js");

  const NAMES = ["joy", "hope", "calm", "connection", "fear", "anger", "sadness", "shame", "guilt", "loneliness"];
  const POSITIVE = new Set(["joy", "hope", "calm", "connection"]);
  const idx = Object.fromEntries(NAMES.map((n, i) => [n, i]));
  const H = 0.15, D = 0.3, STEPS = 8, ACTIVE = 0.1, LOOP_MIN = 0.025;

  // ---------- Lexicon: word stems -> emotion and weight ----------
  // A token matches a stem when it starts with it ("ashamed" ~ "asham") and the
  // stem has 4+ letters. A stem ending in "=" matches only the whole word
  // ("mad=" is not "made"). The longest matching stem wins ("hopeless" is
  // sadness, not hope).
  const LEXICON = {
    joy: [["happy", 1], ["happi", 1], ["happier", 1], ["joy=", 1], ["joyful", 1], ["glad", 0.9], ["excit", 0.8], ["delight", 1], ["grateful", 0.8], ["thankful", 0.8], ["fun=", 0.5], ["laugh", 0.6], ["good=", 0.4], ["great", 0.6]],
    hope: [["hope", 1], ["hoping", 1], ["optimis", 0.9], ["looking forward", 0.9], ["better soon", 0.8], ["possible", 0.4], ["can do", 0.6], ["will be okay", 0.9]],
    calm: [["calm", 1], ["peace", 1], ["relax", 0.9], ["steady", 0.8], ["safe", 0.7], ["okay", 0.4], ["fine=", 0.3], ["rest=", 0.4], ["rested", 0.5]],
    connection: [["loved", 1], ["love", 0.8], ["friend", 0.6], ["together", 0.7], ["support", 0.7], ["belong", 0.9], ["close to", 0.7], ["family", 0.4], ["cared for", 1], ["hug=", 0.6], ["hugg", 0.6]],
    fear: [["afraid", 1], ["scared", 1], ["fear", 1], ["anxi", 0.9], ["worr", 0.8], ["panic", 1], ["nervous", 0.7], ["terrif", 1], ["dread", 0.9], ["restless", 0.6], ["what if", 0.6], ["cursed", 0.6], ["doomed", 0.8]],
    anger: [["angry", 1], ["anger", 1], ["mad=", 0.8], ["furious", 1], ["rage", 1], ["hate", 0.8], ["annoy", 0.5], ["frustrat", 0.7], ["pissed", 0.9], ["resent", 0.8], ["irritat", 0.5]],
    sadness: [["sad=", 1], ["sadness", 1], ["sadden", 1], ["depress", 1], ["down=", 0.5], ["cry=", 0.8], ["crying", 0.8], ["cried", 0.8], ["grief", 1], ["griev", 1], ["hopeless", 1], ["empty", 0.8], ["miserable", 1], ["heartbroken", 1], ["tired of", 0.5], ["unhappy", 0.9]],
    shame: [["asham", 1], ["shame", 1], ["humiliat", 1], ["embarrass", 0.8], ["worthless", 1], ["disgust", 0.7], ["failure", 0.8], ["loser", 0.8], ["stupid", 0.6], ["pathetic", 0.9], ["not good enough", 1], ["at myself", 0.4]],
    guilt: [["guilt", 1], ["my fault", 1], ["sorry", 0.6], ["regret", 0.9], ["blame myself", 1], ["should have", 0.7], ["shouldn't have", 0.7], ["apolog", 0.5]],
    loneliness: [["lonel", 1], ["alone", 1], ["isolat", 1], ["nobody cares", 1], ["no one cares", 1], ["left out", 0.9], ["abandon", 1], ["ignored", 0.7], ["rejected", 0.8], ["no friends", 1], ["by myself", 0.6]],
  };

  const INTENSIFIERS = { very: 1.5, so: 1.4, really: 1.4, extremely: 1.7, totally: 1.5, completely: 1.5, always: 1.3, super: 1.4, deeply: 1.5, too: 1.2 };
  const SOFTENERS = { little: 0.6, bit: 0.6, slightly: 0.5, somewhat: 0.7, kinda: 0.7, kind: 0.8 };
  const NEGATORS = new Set(["not", "no", "never", "without", "hardly", "isn't", "aren't", "wasn't", "don't", "doesn't", "didn't", "cannot", "can't", "won't", "nor"]);
  // "not happy" -> some sadness, "not afraid" -> some calm, and so on.
  const NEGATED_TO = { joy: "sadness", hope: "sadness", calm: "fear", connection: "loneliness", fear: "calm", anger: "calm", sadness: "calm", shame: null, guilt: null, loneliness: "connection" };

  function tokens(text) {
    return String(text || "").toLowerCase().replace(/[\u2018\u2019]/g, "'").match(/[a-z']+/g) || [];
  }

  // Scores the text. Returns { e: number[10], raw, notes }.
  function score(text) {
    const toks = tokens(text);
    const raw = new Array(NAMES.length).fill(0);
    const joined = " " + toks.join(" ") + " ";
    const used = new Array(toks.length).fill(false);

    // Phrases first (multi-word entries), then single tokens.
    NAMES.forEach(name => {
      LEXICON[name].filter(([stem]) => stem.includes(" ")).forEach(([phrase, w]) => {
        let at = joined.indexOf(" " + phrase + " ");
        while (at >= 0) {
          const start = joined.slice(0, at + 1).trim().split(" ").filter(Boolean).length;
          const n = phrase.split(" ").length;
          if (!used.slice(start, start + n).some(Boolean)) {
            add(name, w, start);
            for (let k = start; k < start + n; k++) used[k] = true;
          }
          at = joined.indexOf(" " + phrase + " ", at + 1);
        }
      });
    });
    toks.forEach((tok, i) => {
      if (used[i]) return;
      let best = null;
      for (const name of NAMES) {
        for (const [entry, w] of LEXICON[name]) {
          if (entry.includes(" ")) continue;
          const exact = entry.endsWith("=");
          const stem = exact ? entry.slice(0, -1) : entry;
          const ok = tok === stem || (!exact && stem.length >= 4 && tok.startsWith(stem));
          if (ok && (!best || stem.length > best.len)) best = { name, w, len: stem.length };
        }
      }
      if (best) { add(best.name, best.w, i); used[i] = true; }
    });

    function add(name, w, at) {
      let mult = 1;
      let negated = false;
      for (let k = Math.max(0, at - 3); k < at; k++) {
        const t = toks[k];
        if (NEGATORS.has(t) || t.endsWith("n't")) negated = true;
      }
      const prev = toks[at - 1];
      if (prev && INTENSIFIERS[prev]) mult *= INTENSIFIERS[prev];
      if (prev && SOFTENERS[prev]) mult *= SOFTENERS[prev];
      if (negated) {
        const to = NEGATED_TO[name];
        if (to) raw[idx[to]] += 0.5 * w * mult;
        return;
      }
      raw[idx[name]] += w * mult;
    }

    // Amplifiers from the existing analyzers.
    const signals = analyzeFn(String(text || ""));
    const read = G.read(String(text || ""));
    const notes = [];
    const bump = (name, v, why) => { raw[idx[name]] += v; notes.push(why); };
    if (signals.categories.includes("hopelessness")) { bump("sadness", 0.6, "hopeless wording"); raw[idx.hope] *= 0.5; }
    if (signals.categories.includes("selfBlame")) { bump("shame", 0.4, "self-blame"); raw[idx.guilt] += 0.3; }
    if (signals.categories.includes("anxiety") && raw[idx.fear] === 0) bump("fear", 0.5, "worry wording");
    if (signals.categories.includes("anger") && raw[idx.anger] === 0) bump("anger", 0.5, "anger wording");
    if (read.patterns && read.patterns.includes("meaning")) bump("fear", 0.4, "hidden-meaning (curse/sign) language");
    if (signals.distortions.includes("labeling")) bump("shame", 0.3, "harsh label");
    if (signals.distortions.includes("mindReading")) { bump("fear", 0.2, "mind reading"); raw[idx.shame] += 0.2; }
    if (signals.distortions.includes("catastrophizing")) bump("fear", 0.3, "worst-case wording");
    // Absolute words make whatever negative feeling is there louder.
    const abs = Math.min(2, signals.absolutes.length);
    if (abs) {
      NAMES.forEach((n, i) => { if (!POSITIVE.has(n) && raw[i] > 0) raw[i] *= 1 + 0.15 * abs; });
      notes.push("absolute words");
    }

    // Normalize: e = 1 − exp(−raw), so more evidence approaches 1 but never passes it.
    const e = raw.map(r => round(1 - Math.exp(-Math.max(0, r))));
    return { e, raw, notes };
  }

  // ---------- W: who amplifies (+) or dampens (−) whom ----------
  // Design assumptions, informed by general emotion research; adjustable later.
  const EDGES = [
    // feedback loops among hard feelings
    ["shame", "loneliness", 0.5], ["loneliness", "shame", 0.4],     // hiding and isolating
    ["sadness", "loneliness", 0.4], ["loneliness", "sadness", 0.5], // withdrawal
    ["fear", "anger", 0.3], ["anger", "fear", 0.2],                 // threat and defense
    ["shame", "guilt", 0.3], ["guilt", "shame", 0.4],               // "I did bad" -> "I am bad"
    ["shame", "anger", 0.35], ["anger", "shame", 0.2],              // shame turning into anger
    ["anger", "guilt", 0.3], ["fear", "sadness", 0.2], ["sadness", "shame", 0.2], ["anger", "loneliness", 0.2],
    // steadying loops among helpful feelings
    ["joy", "hope", 0.3], ["hope", "joy", 0.3], ["calm", "connection", 0.2], ["connection", "calm", 0.3],
    // dampeners (stabilizers)
    ["connection", "shame", -0.5], ["connection", "loneliness", -0.6], ["connection", "sadness", -0.3],
    ["calm", "fear", -0.5], ["calm", "anger", -0.4], ["hope", "sadness", -0.4], ["hope", "fear", -0.2],
    ["joy", "sadness", -0.3], ["calm", "shame", -0.2], ["hope", "shame", -0.15],
    // hard feelings pushing helpful ones down
    ["shame", "connection", -0.4], ["loneliness", "connection", -0.3], ["fear", "calm", -0.4],
    ["anger", "calm", -0.3], ["sadness", "hope", -0.4], ["sadness", "joy", -0.3], ["guilt", "joy", -0.2],
  ];

  function matrix(edges = EDGES) {
    const W = NAMES.map(() => new Array(NAMES.length).fill(0));
    edges.forEach(([a, b, w]) => { W[idx[a]][idx[b]] = w; });
    return W;
  }
  const W0 = matrix();

  const clamp01 = x => Math.min(1, Math.max(0, x));
  const round = (x, p = 2) => Math.round(x * 10 ** p) / 10 ** p;

  // One step of e_{t+1} = clamp01(e + h(Wᵀe − d e)).
  function step(e, W = W0, h = H, d = D) {
    return e.map((ej, j) => clamp01(ej + h * (e.reduce((s, ei, i) => s + W[i][j] * ei, 0) - d * ej)));
  }

  function project(e, k = STEPS, W = W0) {
    let cur = e.slice();
    for (let t = 0; t < k; t++) cur = step(cur, W);
    return cur;
  }

  // ---------- Eigenvalues (small real matrices): unshifted QR iteration ----------
  function qr(A) {
    const n = A.length;
    const Q = A.map(() => new Array(n).fill(0));
    const R = A.map(() => new Array(n).fill(0));
    const cols = [];
    for (let j = 0; j < n; j++) {
      let v = A.map(row => row[j]);
      for (let k = 0; k < j; k++) {
        const r = cols[k].reduce((s, q, i) => s + q * A[i][j], 0);
        R[k][j] = r;
        v = v.map((x, i) => x - r * cols[k][i]);
      }
      const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
      R[j][j] = norm;
      const q = norm > 1e-12 ? v.map(x => x / norm) : v.map((_, i) => (i === j ? 1 : 0));
      cols.push(q);
      q.forEach((x, i) => { Q[i][j] = x; });
    }
    return { Q, R };
  }

  const mul = (A, B) => A.map(row => B[0].map((_, j) => row.reduce((s, x, k) => s + x * B[k][j], 0)));

  // Real parts of all eigenvalues.
  function eigenRealParts(M) {
    const n = M.length;
    if (n === 0) return [];
    if (n === 1) return [M[0][0]];
    let A = M.map(r => r.slice());
    for (let it = 0; it < 500; it++) { const { Q, R } = qr(A); A = mul(R, Q); }
    const out = [];
    for (let i = 0; i < n; i++) {
      if (i < n - 1 && Math.abs(A[i + 1][i]) > 1e-6) {
        const a = A[i][i], b = A[i][i + 1], c = A[i + 1][i], d = A[i + 1][i + 1];
        const tr = a + d, det = a * d - b * c, disc = tr * tr / 4 - det;
        if (disc >= 0) { out.push(tr / 2 + Math.sqrt(disc), tr / 2 - Math.sqrt(disc)); }
        else { out.push(tr / 2, tr / 2); }
        i++;
      } else out.push(A[i][i]);
    }
    return out;
  }

  // λ for the active emotions: largest real part of eig(Wᵀ − dI) on that set.
  function lambda(e, W = W0, d = D) {
    const act = e.map((v, i) => (v > ACTIVE ? i : -1)).filter(i => i >= 0);
    if (!act.length) return { lambda: null, active: [] };
    const J = act.map(j => act.map(i => W[i][j] - (i === j ? d : 0)));
    return { lambda: round(Math.max(...eigenRealParts(J)), 3), active: act.map(i => NAMES[i]) };
  }

  // ---------- Relationships, loops, tension ----------
  function relations(e, W = W0) {
    const rel = [], loops = [], tension = [];
    for (let i = 0; i < NAMES.length; i++) for (let j = 0; j < NAMES.length; j++) {
      if (i === j || W[i][j] === 0 || e[i] <= ACTIVE) continue;
      const strength = W[i][j] * e[i] * (e[j] > ACTIVE ? e[j] : 0.5);
      rel.push({ from: NAMES[i], to: NAMES[j], w: W[i][j], strength: round(strength, 3), present: e[j] > ACTIVE });
      if (j > i && e[j] > ACTIVE && W[i][j] > 0 && W[j][i] > 0) {
        const u = round(W[i][j] * W[j][i] * e[i] * e[j], 3);
        const hard = !POSITIVE.has(NAMES[i]) && !POSITIVE.has(NAMES[j]);
        // The pair alone: eig([[−d, W_ji], [W_ij, −d]]) = −d ± √(W_ij·W_ji).
        const pairLambda = round(Math.sqrt(W[i][j] * W[j][i]) - D, 3);
        const kind = !hard ? "steadying" : pairLambda > 0 ? "unstable" : "reinforcing";
        if (u >= LOOP_MIN) loops.push({ a: NAMES[i], b: NAMES[j], u, pairLambda, kind, unstable: kind === "unstable" });
      }
      if (j > i && e[j] > ACTIVE && (W[i][j] < 0 || W[j][i] < 0)) {
        tension.push({ a: NAMES[i], b: NAMES[j], w: round(Math.min(W[i][j], W[j][i]), 2) });
      }
    }
    // Links between feelings that are both present come first.
    rel.sort((a, b) => (b.present - a.present) || Math.abs(b.strength) - Math.abs(a.strength));
    loops.sort((a, b) => b.u - a.u);
    return { rel, loops, tension };
  }

  // Which helpful feeling dampens the hard pair most, and which skill grows it.
  const STABILIZER_SKILL = {
    connection: { skill: "Reach out", creature: "Tidelyn" },
    calm: { skill: "Paced breathing (TIPP)", creature: "Mistfawn" },
    hope: { skill: "One small step", creature: "Hivewright" },
    joy: { skill: "One pleasant activity", creature: "Pell" },
  };

  function stabilizer(targets, W = W0) {
    let best = null;
    ["connection", "calm", "hope", "joy"].forEach(k => {
      const effect = targets.reduce((s, t) => s + W[idx[k]][idx[t]], 0);
      if (effect < 0 && (!best || effect < best.effect)) best = { name: k, effect };
    });
    if (!best) return null;
    const hits = targets.filter(t => W[idx[best.name]][idx[t]] < 0);
    return { name: best.name, targets: hits, ...STABILIZER_SKILL[best.name] };
  }

  // Unstable pair -> the story/game pattern it is closest to (used only when the words gave none).
  function arcHint(result) {
    const hard = result && !result.crisis ? result.loops.filter(l => l.kind !== "steadying") : [];
    if (!hard.length) return null;
    const pair = [hard[0].a, hard[0].b];
    const has = n => pair.includes(n);
    if (has("shame") || has("guilt")) return "labeling";
    if (has("loneliness") || has("sadness")) return "hopelessness";
    if (has("fear") || has("anger")) return "catastrophizing";
    return null;
  }

  // ---------- The whole analysis ----------
  function analyzeText(text) {
    if (analyzeFn(String(text || "")).crisis) return { crisis: true };
    const { e, notes } = score(text);
    const { rel, loops, tension } = relations(e);
    const lam = lambda(e);
    const proj = project(e);
    const top = NAMES.map((n, i) => ({ name: n, value: e[i] })).filter(x => x.value > ACTIVE).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
    const unstable = loops.filter(l => l.unstable);
    const hardTop = top.filter(t => !POSITIVE.has(t.name)).slice(0, 2).map(t => t.name);
    const targets = unstable.length ? [unstable[0].a, unstable[0].b] : hardTop;
    const stab = targets.length ? stabilizer(targets) : null;
    let mover = null;
    NAMES.forEach((n, i) => {
      const delta = proj[i] - e[i];
      if (Math.abs(delta) >= 0.05 && (!mover || Math.abs(delta) > Math.abs(mover.delta))) mover = { name: n, from: e[i], to: round(proj[i]), delta: round(delta) };
    });
    const result = { crisis: false, names: NAMES, e, top: top.slice(0, 5), relations: rel.slice(0, 4), loops, unstable, tension: tension.slice(0, 3), lambda: lam.lambda, active: lam.active, projection: mover, stabilizer: stab, notes };
    result.lines = language(result);
    result.summary = summaryLine(result);
    return result;
  }

  // ---------- The "language": short equation sentences ----------
  const f2 = x => x.toFixed(2);
  const signed = x => (x > 0 ? "+" : x < 0 ? "\u2212" : "") + Math.abs(x).toFixed(2);

  function language(r) {
    const L = { emotions: [], relationships: [], unstable: [], overall: [], projection: [], stabilizer: [] };
    if (!r.top.length) {
      L.emotions.push("No clear emotion words found. Try saying how it feels: sad, scared, alone, angry\u2026");
      return L;
    }
    L.emotions = r.top.map(t => `${t.name} = ${f2(t.value)}`);
    L.relationships = r.relations.map(x => `${x.from} (${f2(r.e[idx[x.from]])}) ${x.w > 0 ? "\u2191" : "\u2193"} ${x.to}${x.present ? ` (${f2(r.e[idx[x.to]])})` : ""}`);
    r.loops.forEach(l => {
      const label = l.kind === "unstable" ? "unstable" : l.kind === "reinforcing" ? "reinforcing, settles on its own" : "steadying";
      L.unstable.push(`${l.a} \u00D7 ${l.b}: loop, u = ${f2(l.u)} \u2192 ${label}`);
    });
    r.tension.forEach(t => L.unstable.push(`${t.a} \u2194 ${t.b}: tension, a tug-of-war (one tends to win)`));
    if (!L.unstable.length) L.unstable.push("No feedback loops above the threshold.");
    if (r.lambda !== null) {
      L.overall.push(`\u03BB = ${signed(r.lambda)} \u2192 ${r.lambda > 0 ? "unstable mix (small changes grow instead of fading)" : "settles over time"}`);
    }
    if (r.projection) {
      L.projection.push(`If nothing changes (${STEPS} steps): ${r.projection.name} ${f2(r.projection.from)} \u2192 ${f2(r.projection.to)}`);
    }
    if (r.stabilizer) {
      L.stabilizer.push(`${r.stabilizer.name} ${r.stabilizer.targets.map(t => "\u2193 " + t).join(", ")} \u2192 try ${r.stabilizer.skill}, with ${r.stabilizer.creature}`);
    }
    return L;
  }

  // One short line for the other outputs.
  function summaryLine(r) {
    if (!r || r.crisis || !r.top.length) return "";
    const lead = r.unstable.length ? `${r.unstable[0].a} \u00D7 ${r.unstable[0].b} unstable` : `${r.top[0].name} ${f2(r.top[0].value)}`;
    const lam = r.lambda !== null ? `, \u03BB = ${signed(r.lambda)}` : "";
    const stab = r.stabilizer ? `; stabilizer: ${r.stabilizer.name}` : "";
    return `Equation view: ${lead}${lam}${stab}`;
  }

  // Plain text version of the whole output (for Copy and tests).
  function toText(r) {
    if (!r || r.crisis) return "";
    const L = r.lines;
    const sec = (title, lines) => (lines.length ? `${title}\n${lines.map(l => "  " + l).join("\n")}` : "");
    return [sec("Emotions", L.emotions), sec("Relationships", L.relationships), sec("Unstable combinations", L.unstable),
      sec("Overall", L.overall), sec("Projection", L.projection), sec("Stabilizer", L.stabilizer)].filter(Boolean).join("\n");
  }

  return { NAMES, POSITIVE, EDGES, H, D, STEPS, ACTIVE, LOOP_MIN, score, matrix, W: W0, step, project, eigenRealParts, lambda, relations, stabilizer, arcHint, analyze: analyzeText, language, summaryLine, toText };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Emotions;
