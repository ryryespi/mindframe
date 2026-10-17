// workspace.js — the Equation Workspace: vector math, ego release, daily
// baseline, editable variables and frameworks, recovery estimates, the .mf
// code language, checkpoints, and the step story. Pure logic, no DOM.
//
// A MODEL built from design assumptions, not validated science. All local.
// Every number below is a variable (see VAR_SPEC) and can be changed in the
// Variables panel or in the code.
//
//   e        current emotion vector, 10 values in [0,1] (see emotions.js)
//   h        home vector ("a positive reality"): joy .6, hope .8, calm .8,
//            connection .8, every hard feeling 0.
//   d        = ‖e − h‖                      distance from home
//   cos      = e·h / (‖e‖‖h‖)               alignment with home (0 if e = 0)
//   words    new words add to the base:  e = 1 − (1 − base)(1 − words), same for g
//   hidden   feelings not named (e ≤ 0.1) that the dynamics
//            e ← clamp01(e + dt·(Wᵀe − d·e)) raise by ≥ rise within k steps,
//            plus pattern amplifiers found in the words
//   ideal    e' = e + a·(h − e) + b·s(e)
//            s_j = e_j · Σ_{i helpful} min(0, W_ij)·h_i   for hard j above home
//            a = clamp(aBase·(0.5 + D/Dmax), aMin, aMax); when λ > 0:
//            a = max(aMin, min(aCap, a/(1 + 4λ))) and b = bU.
//            D is the baseline's distance from home once days are recorded.
//            No value ever passes its home value, so d always shrinks.
//   ego      g ∈ [0,1], ego grip. Release: g' = g − r·(g − g*), never past g*;
//            when λ > 0, r = min(rCap, r/(1 + 4λ)). Below g* the same rule
//            raises g (self-respect). The change Δ = |g − g'| nudges
//            shame −kShame·Δ, anger −kAnger·Δ, connection +kConn·Δ, calm +kCalm·Δ.
//   days     D_t = last saved state of each day [e, g];
//            B_t = (1 − β)·B_{t−1} + β·D_t  (B_1 = D_1);  v_t = D_t − D_{t−1};
//            alignment = cos(v_t, h − B_{t−1}).
//   λ        on the active hard feelings only (see lambdaHard).
//   T_rec    ideal steps until ‖[e, g] − [h, g*]‖ < eps (simulated, ≤ 200).
//   Catholic (see catholic.js; on when the virtue pull cv > 0):
//            words: tendencies amplify the hard feelings they feed,
//              e_j ← 1 − (1 − e_j)(1 − Σ_k τ_kj·t_k), g ← 1 − (1 − g)(1 − τ_pride·t_pride)
//            ideal e' = e + a(h − e) + b·s(e) + c_v·V(e), never past home, with
//              V_j = Σ_virtues κ_vj·v·(h_j − e_j) + v*·Σ τ_k*j·(h_j − e_j)
//              where k* is the strongest tendency and v* its contrary virtue;
//              c_v = cv, or cv/(1 + 4λ) when λ > 0.
//            ego r ← r + cv·kvHumility·v_humility (then the unstable cap).
//            factors: v*' = v* + a(v_h − v*),  t*' = t*·(1 − a(0.5 + v*')).

const Workspace = (function () {
  const E = typeof Emotions !== "undefined" ? Emotions : require("./emotions.js");
  const G = typeof Grounding !== "undefined" ? Grounding : require("./grounding.js");
  const S = typeof Stories !== "undefined" ? Stories : require("./stories.js");
  const C = typeof Catholic !== "undefined" ? Catholic : require("./catholic.js");

  const NAMES = E.NAMES;
  const N = NAMES.length;
  const idx = Object.fromEntries(NAMES.map((n, i) => [n, i]));
  const HELPFUL = NAMES.map(n => E.POSITIVE.has(n));
  const HOME = { joy: 0.6, hope: 0.8, calm: 0.8, connection: 0.8 };
  const VERSION = 1;
  const MAX_CHECKPOINTS = 50, MAX_LINES = 400, MAX_W = 40, MAX_DAYS = 60, MAX_FRAMEWORKS = 20, MAX_SIM = 200;

  // ---------- Variables ----------
  // [key, default, min, max, what it does]
  const VAR_SPEC = [
    ["d", 0.3, 0.05, 1, "decay: how fast each feeling fades on its own"],
    ["dt", 0.15, 0.05, 0.5, "time step of the dynamics (hidden variables)"],
    ["rise", 0.15, 0.05, 0.5, "hidden-variable threshold: rise needed to show"],
    ["aBase", 0.2, 0.05, 0.5, "base step toward home"],
    ["aMin", 0.05, 0.01, 0.2, "smallest step"],
    ["aMax", 0.25, 0.05, 0.5, "largest step"],
    ["aCap", 0.12, 0.02, 0.3, "step cap when the mix is unstable"],
    ["b", 0.1, 0, 0.5, "stabilizer pull"],
    ["bU", 0.15, 0, 0.5, "stabilizer pull when unstable"],
    ["r", 0.25, 0.05, 0.6, "ego release rate"],
    ["rCap", 0.15, 0.02, 0.4, "ego release cap when unstable"],
    ["eps", 0.3, 0.05, 1, "recovery threshold: close enough to home"],
    ["kShame", 0.3, 0, 0.6, "ego release lowers shame by kShame·Δ"],
    ["kAnger", 0.3, 0, 0.6, "ego release lowers anger by kAnger·Δ"],
    ["kConn", 0.2, 0, 0.6, "ego release raises connection by kConn·Δ"],
    ["kCalm", 0.2, 0, 0.6, "ego release raises calm by kCalm·Δ"],
    // Catholic couplings (off while cv = 0; the Catholic framework sets cv = 0.15)
    ["cv", 0, 0, 0.5, "virtue pull c_v: 0 turns the Catholic couplings off"],
    ["vHome", 0.7, 0.3, 1, "virtue target v_h in the home vector"],
    ["kvFaith", 0.3, 0, 1, "faith raises hope"],
    ["kvHope", 0.4, 0, 1, "hope (the virtue) eases sadness"],
    ["kvCharity", 0.4, 0, 1, "charity raises connection and eases loneliness"],
    ["kvPatience", 0.4, 0, 1, "patience eases anger"],
    ["kvFortitude", 0.3, 0, 1, "fortitude eases fear"],
    ["kvTemperance", 0.3, 0, 1, "temperance raises calm"],
    ["kvHumility", 0.5, 0, 1, "humility speeds the ego release toward g*"],
    ["ktPride", 0.3, 0, 0.6, "pride tendency raises the ego grip g"],
    ["ktGreed", 0.2, 0, 0.6, "greed tendency raises fear"],
    ["ktLust", 0.2, 0, 0.6, "lust tendency lowers calm (restlessness)"],
    ["ktEnvy", 0.25, 0, 0.6, "envy tendency raises shame and anger"],
    ["ktGluttony", 0.2, 0, 0.6, "gluttony tendency lowers calm"],
    ["ktWrath", 0.3, 0, 0.6, "wrath tendency raises anger"],
    ["ktSloth", 0.3, 0, 0.6, "sloth tendency raises sadness"],
  ];
  // Which emotion each coupling moves (sign: + raises, − lowers).
  const VIRTUE_LINKS = {
    faith: [["kvFaith", "hope", 1]], hope: [["kvHope", "sadness", -1]], charity: [["kvCharity", "connection", 1], ["kvCharity", "loneliness", -1]],
    patience: [["kvPatience", "anger", -1]], fortitude: [["kvFortitude", "fear", -1]], temperance: [["kvTemperance", "calm", 1]],
  };
  const TENDENCY_LINKS = {
    pride: [["ktPride", "g", 1]], greed: [["ktGreed", "fear", 1]], lust: [["ktLust", "calm", -1]], envy: [["ktEnvy", "shame", 1], ["ktEnvy", "anger", 1]],
    gluttony: [["ktGluttony", "calm", -1]], wrath: [["ktWrath", "anger", 1]], sloth: [["ktSloth", "sadness", 1]],
  };
  // Kept on their own code lines: ego target, baseline beta, horizon k.
  const EXTRA_SPEC = [
    ["target", 0.3, 0.1, 0.6, "appropriate ego g*: healthy self-respect"],
    ["beta", 0.2, 0.05, 1, "baseline weight of each new day"],
    ["k", 8, 1, 50, "horizon: steps looked ahead for hidden variables"],
  ];
  const SPEC = Object.fromEntries(VAR_SPEC.concat(EXTRA_SPEC).map(([k, def, min, max, note]) => [k, { def, min, max, note }]));
  const VAR_KEYS = VAR_SPEC.map(v => v[0]);
  const defaultVars = () => Object.fromEntries(VAR_SPEC.map(([k, v]) => [k, v]));

  const r2 = x => Math.round(x * 100) / 100;
  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
  const clamp01 = x => clamp(x, 0, 1);
  const zero = () => new Array(N).fill(0);
  const fromObj = o => NAMES.map(n => r2(clamp01(Number(o[n]) || 0)));
  const toObj = v => Object.fromEntries(NAMES.map((n, i) => [n, v[i]]).filter(([, x]) => x > 0));

  // Clamp every variable into its range and keep the order aMin ≤ aCap ≤ aMax.
  // Returns { vars, notes } where notes says what was changed.
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
    if (vars.aMax < vars.aMin) { vars.aMax = vars.aMin; notes.push("aMax: raised to aMin"); }
    if (vars.aCap > vars.aMax) { vars.aCap = vars.aMax; notes.push("aCap: lowered to aMax"); }
    if (vars.aCap < vars.aMin) { vars.aCap = vars.aMin; notes.push("aCap: raised to aMin"); }
    if (vars.rCap > vars.r) { vars.rCap = vars.r; notes.push("rCap: lowered to r"); }
    return { vars, notes };
  }
  const clampExtra = (k, x) => (k === "k" ? Math.round(clamp(Number(x) || SPEC.k.def, 1, 50)) : r2(clamp(Number(x), SPEC[k].min, SPEC[k].max)));

  function defaultState() {
    return {
      v: VERSION, home: fromObj(HOME), e: zero(), ego: { g: SPEC.target.def, target: SPEC.target.def }, steps: SPEC.k.def,
      vars: defaultVars(), framework: "default", w: [], beta: SPEC.beta.def, baseline: null, days: [], frameworks: [], cps: [], ideal: null,
      cath: C.defaultFactors(),
    };
  }

  // ---------- Vectors ----------
  const norm = v => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  const distance = (a, b) => norm(a.map((x, i) => x - b[i]));
  function cosine(a, b) {
    const na = norm(a), nb = norm(b);
    return na && nb ? a.reduce((s, x, i) => s + x * b[i], 0) / (na * nb) : 0;
  }
  const dmax = h => norm(h.map(x => Math.max(x, 1 - x)));
  const combine = (base, words) => base.map((b, i) => r2(1 - (1 - b) * (1 - words[i])));
  const combine1 = (base, word) => r2(1 - (1 - base) * (1 - word));
  const aug = (e, g) => e.concat([g]);
  const homeAug = state => aug(state.home, state.ego.target);

  function lambdaHard(e, W = E.W, d = SPEC.d.def) {
    return E.lambda(e.map((x, i) => (HELPFUL[i] ? 0 : x)), W, d).lambda;
  }

  function weights(w = []) {
    if (!w.length) return E.W;
    const edges = E.EDGES.filter(([a, b]) => !w.some(o => o.from === a && o.to === b));
    return E.matrix(edges.concat(w.map(o => [o.from, o.to, o.w])));
  }
  const defaultWeight = (from, to) => E.W[idx[from]][idx[to]];

  // The pairs shown in the Variables panel.
  const MAIN_PAIRS = [
    ["shame", "loneliness"], ["loneliness", "shame"], ["sadness", "loneliness"], ["loneliness", "sadness"],
    ["guilt", "shame"], ["shame", "guilt"], ["fear", "anger"], ["anger", "fear"],
    ["connection", "shame"], ["connection", "loneliness"], ["calm", "fear"], ["calm", "anger"], ["hope", "sadness"],
  ];

  // Set one W entry; an entry equal to its default is removed from the overrides.
  function setWeight(state, from, to, value) {
    const x = r2(clamp(Number(value), -1, 1));
    const rest = state.w.filter(o => !(o.from === from && o.to === to));
    return { ...state, w: x === defaultWeight(from, to) ? rest : rest.concat({ from, to, w: x }) };
  }

  // ---------- Ego grip ----------
  // Markers of self-focused defending, comparing, self-attack, pride and
  // rumination. Each kind counts at most twice. Self-attack counts too: it is
  // still the self at the center.
  const EGO_MARKERS = {
    defensiveness: { w: 0.6, label: "defending", res: [/\bnot my fault\b/g, /\bthey (always|never)\b/g, /\bi'?m (always )?right\b/g, /\b(it'?s|it is) (all )?their fault\b/g, /\bblame me\b/g, /\bwasn'?t me\b/g] },
    comparison: { w: 0.5, label: "comparing", res: [/\b(better|worse|smarter|dumber|prettier|richer|poorer) than\b/g, /\beveryone else\b/g, /\bcompar(e|ed|ing) (myself|me)\b/g, /\bnot as (good|smart) as\b/g] },
    selfAttack: { w: 0.6, label: "self-attack", res: [/\bi hate myself\b/g, /\bi'?m (so )?(stupid|worthless|useless|pathetic|an idiot|a failure|a loser)\b/g, /(?<!not )\bmy fault\b/g, /\bwhat'?s wrong with me\b/g] },
    pride: { w: 0.5, label: "proving", res: [/\bbetter than (all of )?(them|everyone|everybody)\b/g, /\bi'?m (the best|superior)\b/g, /\b(beneath|below) me\b/g, /\bi deserve better\b/g, /\bthey('re| are) (all )?(idiots|stupid)\b/g] },
    rumination: { w: 0.4, label: "replaying", res: [/\bwhy me\b/g, /\bi keep (thinking|replaying)\b/g, /\bcan'?t stop thinking\b/g, /\bover and over\b/g, /\bwhy does this always\b/g] },
  };
  const SELF = /\b(i|i'm|im|i've|i'd|i'll|me|my|myself|mine)\b/g;

  function egoScore(text) {
    const t = String(text || "").toLowerCase().replace(/[\u2018\u2019]/g, "'");
    const markers = {};
    let raw = 0;
    Object.entries(EGO_MARKERS).forEach(([kind, m]) => {
      const n = m.res.reduce((s, re) => s + (t.match(re) || []).length, 0);
      if (n) { markers[kind] = n; raw += m.w * Math.min(2, n); }
    });
    // Self-focus: share of I/me/my words in sentences with a hard feeling or a marker.
    let selfN = 0, tokN = 0;
    t.split(/[.!?\n]+/).forEach(sent => {
      const toks = sent.match(/[a-z']+/g) || [];
      if (!toks.length) return;
      const hard = E.score(sent).e.some((x, i) => !HELPFUL[i] && x > 0);
      const marked = Object.values(EGO_MARKERS).some(m => m.res.some(re => new RegExp(re.source).test(sent)));
      if (!hard && !marked) return;
      selfN += (sent.match(SELF) || []).length;
      tokN += toks.length;
    });
    const focus = tokN ? r2(Math.min(0.3, (0.5 * selfN) / tokN)) : 0;
    raw += focus;
    return { g: r2(1 - Math.exp(-raw)), markers, focus };
  }
  const dominantMarker = markers => {
    const top = Object.entries(markers || {}).sort((a, b) => b[1] * EGO_MARKERS[b[0]].w - a[1] * EGO_MARKERS[a[0]].w)[0];
    return top ? top[0] : null;
  };

  // Words -> vector and ego. Crisis text gives { crisis: true } and nothing else.
  function fromText(text) {
    const t = String(text || "");
    if (!t.trim()) return { crisis: false, e: zero(), notes: [], ego: { g: 0, markers: {}, focus: 0 }, cath: null };
    if (G.isCrisis(t)) return { crisis: true };
    const r = E.analyze(t);
    if (r.crisis) return { crisis: true };
    return { crisis: false, e: r.e.map(r2), notes: r.notes.slice(), ego: egoScore(t), cath: C.score(t) };
  }

  const catholicOn = (state, opts = {}) => state.vars.cv > 0 || !!opts.faith;

  // Words add to a base { e, g, cath }. With the Catholic couplings on, the
  // tendencies in the words amplify the hard feelings they feed (once).
  function applyWords(base, words, vars = defaultVars()) {
    let we = words.e.slice(), wg = words.ego.g;
    if (vars.cv > 0 && words.cath) {
      Object.entries(TENDENCY_LINKS).forEach(([k, links]) => {
        const t = words.cath.t[k] || 0;
        if (!t) return;
        links.forEach(([key, name, sign]) => {
          const x = vars[key] * t;
          if (name === "g") wg = combine1(wg, x);
          else if (sign > 0) we[idx[name]] = combine1(we[idx[name]], x);
          else we[idx[name]] = r2(we[idx[name]] * (1 - x));
        });
      });
    }
    return { e: combine(base.e, we), g: combine1(base.g, wg), cath: C.combine(base.cath, words.cath) };
  }

  // ---------- Hidden variables ----------
  function project(e, k, W, vars) {
    let cur = e.slice();
    for (let t = 0; t < k; t++) cur = E.step(cur, W, vars.dt, vars.d);
    return cur;
  }

  function hidden(e, W, steps, notes = [], vars = defaultVars()) {
    const proj = project(e, steps, W, vars);
    const out = [];
    NAMES.forEach((n, j) => {
      const rise = proj[j] - e[j];
      if (e[j] > E.ACTIVE || rise < vars.rise - 1e-9) return;
      let via = null, best = 0;
      NAMES.forEach((m, i) => { if (i !== j && W[i][j] > 0 && W[i][j] * e[i] > best) { best = W[i][j] * e[i]; via = m; } });
      out.push({ kind: "dynamics", name: n, from: e[j], to: r2(proj[j]), via });
    });
    out.sort((a, b) => (b.to - b.from) - (a.to - a.from));
    [...new Set(notes)].forEach(note => out.push({ kind: "pattern", note }));
    return out;
  }

  // Loops, with "unstable" judged by this workspace's decay d.
  function loops(e, W, d) {
    return E.relations(e, W).loops.map(l => {
      const i = idx[l.a], j = idx[l.b];
      const pairLambda = r2(Math.sqrt(W[i][j] * W[j][i]) - d);
      const kind = l.kind === "steadying" ? "steadying" : pairLambda > 0 ? "unstable" : "reinforcing";
      return { ...l, pairLambda, kind, unstable: kind === "unstable" };
    });
  }

  // ---------- The ideal step (emotions and ego) ----------
  // opts: { home, W, vars, g, target, refD, refDmax }
  function ideal(e, opts = {}) {
    const h = opts.home || fromObj(HOME);
    const W = opts.W || E.W;
    const V = opts.vars || defaultVars();
    const g = Number.isFinite(opts.g) ? opts.g : SPEC.target.def;
    const target = Number.isFinite(opts.target) ? opts.target : SPEC.target.def;
    const lam = lambdaHard(e, W, V.d);
    const d = distance(e, h);
    const refD = Number.isFinite(opts.refD) ? opts.refD : d;
    const refDmax = opts.refDmax || dmax(h);
    let a = clamp(V.aBase * (0.5 + refD / refDmax), V.aMin, V.aMax);
    let b = V.b, r = V.r;
    const cath = opts.cath || null;
    const catholic = V.cv > 0 && cath;
    if (catholic) r = r + V.cv * V.kvHumility * cath.v.humility;
    let cvEff = catholic ? V.cv : 0;
    const unstable = lam !== null && lam > 0;
    if (unstable) {
      a = Math.max(V.aMin, Math.min(V.aCap, a / (1 + 4 * lam)));
      b = V.bU;
      r = Math.max(0.02, Math.min(V.rCap, r / (1 + 4 * lam)));
      cvEff = cvEff / (1 + 4 * lam);
    }
    a = r2(a); b = r2(b); r = r2(r); cvEff = r2(cvEff);
    // The virtue pull V(e): each virtue presses its emotions toward home, and the
    // contrary virtue of the strongest tendency presses on what that tendency feeds.
    const Vpull = zero();
    let pullInfo = null, cathNext = cath ? C.copy(cath) : null;
    if (catholic) {
      Object.entries(VIRTUE_LINKS).forEach(([v, links]) => links.forEach(([key, name]) => { Vpull[idx[name]] += V[key] * cath.v[v] * (h[idx[name]] - e[idx[name]]); }));
      const k = C.activeTendency(cath);
      const weak = C.weakestVirtue(cath);
      const vk = k ? C.VIRTUE_OF[k] : cath.v[weak] < C.V0 ? weak : "hope";
      if (k) TENDENCY_LINKS[k].forEach(([key, name]) => { if (name !== "g") Vpull[idx[name]] += V[key] * cath.v[vk] * (h[idx[name]] - e[idx[name]]); });
      // The practiced virtue grows toward v_h; its tendency fades faster the stronger it is.
      const v0 = cath.v[vk];
      let v1 = v0 < V.vHome ? r2(Math.min(V.vHome, v0 + a * (V.vHome - v0))) : v0;
      if (v1 === v0 && v0 < V.vHome) v1 = r2(Math.min(V.vHome, v0 + 0.01));
      cathNext.v[vk] = v1;
      if (k) {
        const t0 = cath.t[k];
        let t1 = r2(Math.max(0, t0 * (1 - a * (0.5 + v1))));
        if (t1 === r2(t0) && t0 > 0) t1 = r2(Math.max(0, t0 - 0.01));
        cathNext.t[k] = t1;
      }
      pullInfo = { tendency: k, t: k ? cath.t[k] : null, tNext: k ? cathNext.t[k] : null, virtue: vk, v: v0, vNext: v1 };
    }
    const toward = (x, y, home) => (x > home ? Math.max(home, y) : Math.min(home, y));
    // Ego: g' = g − r(g − g*), never past g*, at least 0.01 when not there.
    let gNext = r2(toward(g, g - r * (g - target), target));
    if (gNext === r2(g) && r2(g) !== r2(target)) gNext = r2(g + (target > g ? 0.01 : -0.01));
    const delta = Math.abs(g - gNext);
    const pull = NAMES.map((n, j) => (HELPFUL[j] ? 0 : NAMES.reduce((s, m, i) => s + (HELPFUL[i] ? Math.min(0, W[i][j]) * h[i] : 0), 0)));
    const COUPLE = { shame: -V.kShame, anger: -V.kAnger, connection: V.kConn, calm: V.kCalm };
    const next = e.map((x, j) => {
      let y = x + a * (h[j] - x);
      if (!HELPFUL[j] && x > h[j]) y += b * x * pull[j];
      if (cvEff) y += cvEff * Vpull[j];
      y = r2(clamp01(toward(x, y, h[j])));
      if (y === x && x !== h[j]) y = r2(x + (h[j] > x ? 0.01 : -0.01));
      // Ego release coupling, also never past home.
      const c = COUPLE[NAMES[j]];
      if (c && delta > 0 && ((c < 0 && y > h[j]) || (c > 0 && y < h[j]))) y = r2(toward(y, y + c * delta, h[j]));
      return y;
    });
    const work = [];
    const L = loops(e, W, V.d);
    L.filter(l => l.kind === "unstable").forEach(l => work.push({ kind: "loop", a: l.a, b: l.b, u: l.u }));
    const egoGap = r2(Math.abs(g - target));
    const hardGaps = NAMES.map((n, i) => (!HELPFUL[i] && e[i] > h[i] ? e[i] - h[i] : 0));
    const egoTop = egoGap >= 0.1 && egoGap > Math.max(...hardGaps);
    if (egoGap >= 0.1) work.push({ kind: "ego", gap: egoGap, dir: g > target ? "down" : "up" });
    NAMES.map((n, i) => ({ kind: "gap", name: n, gap: r2(Math.abs(h[i] - e[i])), dir: h[i] > e[i] ? "up" : "down" }))
      .filter(x => x.gap >= 0.1).sort((x, y) => y.gap - x.gap || x.name.localeCompare(y.name)).slice(0, 3).forEach(x => work.push(x));
    const strongest = pull.map((p, j) => ({ j, p: p * e[j] })).filter(x => !HELPFUL[x.j] && e[x.j] > h[x.j]).sort((x, y) => x.p - y.p)[0];
    const targets = work.filter(w => w.kind === "loop").slice(0, 1).flatMap(w => [w.a, w.b]);
    if (!targets.length && strongest) targets.push(NAMES[strongest.j]);
    const stab = targets.length ? E.stabilizer(targets, W) : null;
    return { a, b, r, cv: cvEff, pull: pullInfo, cathNext, lambda: lam, unstable, d: r2(d), next, dNext: r2(distance(next, h)), g: r2(g), gNext, target, egoGap, egoTop, work, stabilizer: stab, targets };
  }

  // ---------- Days and the baseline ----------
  const dayOf = t => t.slice(0, 10);

  function recordDay(state, ts) {
    const day = dayOf(stamp(ts));
    const days = state.days.filter(x => x.day !== day).concat({ day, e: state.e.slice(), g: state.ego.g })
      .sort((a, b) => (a.day < b.day ? -1 : 1)).slice(-MAX_DAYS);
    return withBaseline({ ...state, days });
  }

  // B_1 = D_1, B_t = (1 − β)·B_{t−1} + β·D_t. Returns the B after each day.
  function baselineSeries(days, beta) {
    const out = [];
    let B = null;
    days.forEach(x => {
      const D = aug(x.e, x.g);
      B = B ? B.map((b, i) => (1 - beta) * b + beta * D[i]) : D.slice();
      out.push({ day: x.day, D, B: B.slice() });
    });
    return out;
  }

  function withBaseline(state) {
    const series = baselineSeries(state.days, state.beta);
    if (!series.length) return { ...state, baseline: state.days.length ? null : state.baseline };
    const B = series[series.length - 1].B.map(r2);
    return { ...state, baseline: { e: B.slice(0, N), g: B[N] } };
  }

  const ARROW = { up: "\u2191 toward home", side: "\u2194 sideways", down: "\u2193 away from home" };
  const arrowOf = c => (c > 0.15 ? "up" : c < -0.15 ? "down" : "side");

  // Each day's baseline distance and direction: cos(D_t − D_{t−1}, h − B_{t−1}).
  function dailyView(state) {
    const H = homeAug(state);
    const series = baselineSeries(state.days, state.beta);
    return series.map((x, t) => {
      const out = { day: x.day, dB: r2(distance(x.B, H)), cos: null, dir: null };
      if (t > 0) {
        const v = x.D.map((y, i) => y - series[t - 1].D[i]);
        const toHome = H.map((y, i) => y - series[t - 1].B[i]);
        if (norm(v) < 1e-9) { out.cos = 0; out.dir = "side"; }
        else { out.cos = r2(cosine(v, toHome)); out.dir = arrowOf(out.cos); }
      }
      return out;
    });
  }

  function lastWeek(state, now = Date.now()) {
    const start = dayOf(stamp(now - 6 * 86400000));
    return dailyView(state).filter(x => x.day >= start);
  }

  const GENTLE = {
    up: "Today points toward home.",
    side: "Today moved sideways. That still counts as showing up.",
    down: "Today drifted away from home. One small step is enough.",
  };

  // ---------- Recovery estimate ----------
  // Simulate ideal steps from here (no new words) until ‖[e,g] − [h,g*]‖ < eps.
  function simulate(state, maxIter = MAX_SIM) {
    const W = weights(state.w), V = state.vars, H = homeAug(state);
    let e = state.e.slice(), g = state.ego.g, cath = state.cath;
    for (let n = 0; n <= maxIter; n++) {
      const D = distance(aug(e, g), H);
      if (D < V.eps) return { steps: n, reached: true, final: r2(D) };
      if (n === maxIter) return { steps: maxIter, reached: false, final: r2(D) };
      const id = ideal(e, { home: state.home, W, vars: V, g, target: state.ego.target, cath });
      if (id.next.every((x, i) => x === e[i]) && id.gNext === g) return { steps: n, reached: false, final: r2(D) };
      e = id.next; g = id.gNext; cath = id.cathNext;
    }
  }

  // Accepted steps per day, from the step checkpoints; 1 when unknown.
  function stepRate(state) {
    const perDay = {};
    state.cps.filter(c => /^step-\d+$/.test(c.label)).forEach(c => { perDay[dayOf(c.t)] = (perDay[dayOf(c.t)] || 0) + 1; });
    const counts = Object.values(perDay);
    return counts.length ? r2(counts.reduce((s, x) => s + x, 0) / counts.length) : 1;
  }

  function recovery(state) {
    const sim = simulate(state);
    const rate = stepRate(state);
    return { ...sim, rate, days: sim.reached ? Math.ceil(sim.steps / rate) : null };
  }

  // ---------- Frameworks ----------
  // Each preset is only a set of variable values. Design choices inspired by
  // each approach, not validated versions of them.
  const PRESETS = [
    { id: "default", title: "Default (MindFrame)", note: "the standard variables" },
    { id: "dbt", title: "DBT-inspired", note: "emotion regulation: stronger calm and opposite-action pulls",
      vars: { b: 0.14, bU: 0.2, kCalm: 0.3 }, home: { calm: 0.9 }, w: [["calm", "fear", -0.7], ["calm", "anger", -0.6], ["calm", "shame", -0.35]] },
    { id: "cbt", title: "CBT-inspired", note: "checks thought patterns early: more sensitive hidden variables, stronger hope pull",
      vars: { rise: 0.1, aBase: 0.22 }, k: 10, w: [["hope", "sadness", -0.5], ["hope", "fear", -0.35]] },
    { id: "act", title: "ACT-inspired", note: "acceptance: feelings fade on their own a little more, values of connection and hope, a lower ego target",
      vars: { d: 0.35, r: 0.3 }, target: 0.25, home: { connection: 0.9, hope: 0.85 } },
    { id: "self-compassion", title: "Self-compassion (Neff-inspired)", note: "kindness: strong connection against shame and loneliness",
      vars: { kShame: 0.45, kConn: 0.3 }, w: [["connection", "shame", -0.8], ["connection", "loneliness", -0.7]] },
    { id: "stoic", title: "Stoic-inspired", note: "calm and focus on what you control: steadier, smaller steps",
      vars: { aBase: 0.18, b: 0.12 }, home: { calm: 0.9, joy: 0.5 }, w: [["calm", "fear", -0.6], ["calm", "anger", -0.6]] },
    { id: "faith", title: "Faith & grace", note: "hope and connection, humility: a gentle ego target",
      vars: { r: 0.3 }, target: 0.25, home: { hope: 0.9, connection: 0.9 }, w: [["hope", "sadness", -0.5], ["hope", "fear", -0.3]] },
    { id: "catholic", title: "Catholic (virtues & discernment)", note: "theological and cardinal virtues, capital tendencies with their contrary virtues, Ignatian discernment. A reflective aid, not spiritual direction.",
      vars: { cv: 0.15, r: 0.3 }, target: 0.25, home: { hope: 0.9, connection: 0.9 }, w: [["hope", "sadness", -0.5], ["connection", "loneliness", -0.7]] },
  ];
  const PRESET_IDS = new Set(PRESETS.map(p => p.id));

  // A framework as plain values: { name, vars, target, beta, k, home, w }.
  function presetFramework(id) {
    const p = PRESETS.find(x => x.id === id);
    if (!p) return null;
    return {
      name: p.id, vars: validateVars(p.vars || {}).vars, target: p.target ?? SPEC.target.def, beta: p.beta ?? SPEC.beta.def, k: p.k ?? SPEC.k.def,
      home: fromObj({ ...HOME, ...(p.home || {}) }), w: (p.w || []).map(([from, to, w]) => ({ from, to, w })),
    };
  }

  function currentFramework(state, name) {
    return { name, vars: { ...state.vars }, target: state.ego.target, beta: state.beta, k: state.steps, home: state.home.slice(), w: state.w.map(o => ({ ...o })) };
  }

  function findFramework(state, name) {
    return presetFramework(name) || state.frameworks.find(f => f.name === name) || null;
  }

  function applyFramework(state, fw) {
    if (!fw) return state;
    const s = {
      ...state, framework: fw.name, vars: { ...fw.vars }, home: fw.home.slice(), w: fw.w.map(o => ({ ...o })),
      ego: { ...state.ego, target: fw.target }, beta: fw.beta, steps: fw.k,
    };
    return refreshIdeal(withBaseline(s));
  }

  function saveFramework(state, name) {
    if (!LABEL.test(name || "") || PRESET_IDS.has(name)) return { ok: false, msg: "Name it with a\u2013z, 0\u20139 and dashes, and not the same as a preset." };
    if (G.isCrisis(name.replace(/-/g, " "))) return { ok: false, crisis: true };
    const fw = currentFramework(state, name);
    const frameworks = state.frameworks.filter(f => f.name !== name).concat(fw).slice(-MAX_FRAMEWORKS);
    return { ok: true, state: { ...state, frameworks, framework: name } };
  }

  const titleOf = (state, name) => {
    const p = PRESETS.find(x => x.id === name);
    return p ? p.title : name === "custom" ? "custom variables" : name;
  };

  // Simulate every preset (and saved framework) from the current e and g.
  function compare(state) {
    const names = PRESETS.map(p => p.id).concat(state.frameworks.map(f => f.name));
    const rows = names.map(name => {
      const s = applyFramework(state, findFramework(state, name));
      const rec = recovery(s);
      return { name, title: titleOf(state, name), ...rec };
    });
    rows.sort((x, y) => (y.reached - x.reached) || x.steps - y.steps || x.final - y.final || x.name.localeCompare(y.name));
    return rows;
  }

  const recText = rec => (rec.reached
    ? `~${rec.steps} step${rec.steps === 1 ? "" : "s"} (~${rec.days} day${rec.days === 1 ? "" : "s"})`
    : `not reached in ${MAX_SIM} steps (closest ${f2(rec.final)})`);

  // Coordinate search over aBase, aMax, b, r inside their ranges. The unstable
  // caps (aCap, rCap, bU) are never touched, so the safeguards stay.
  const OPT_KEYS = ["aBase", "aMax", "b", "r"];
  function optimize(state, rounds = 4) {
    const score = s => { const x = simulate(s); return [x.reached ? 0 : 1, x.steps, x.final]; };
    const better = (p, q) => p[0] < q[0] || (p[0] === q[0] && (p[1] < q[1] || (p[1] === q[1] && p[2] < q[2] - 1e-9)));
    const before = simulate(state);
    let best = state, bestScore = score(state);
    for (let round = 0; round < rounds; round++) {
      let moved = false;
      OPT_KEYS.forEach(k => {
        [0.05, -0.05, 0.02, -0.02].forEach(step => {
          const vars = validateVars({ ...best.vars, [k]: r2(best.vars[k] + step) }).vars;
          if (vars.aCap !== state.vars.aCap || vars.rCap !== state.vars.rCap || vars.bU !== state.vars.bU) return;
          const cand = { ...best, vars };
          const sc = score(cand);
          if (better(sc, bestScore)) { best = cand; bestScore = sc; moved = true; }
        });
      });
      if (!moved) break;
    }
    const after = simulate(best);
    const changed = OPT_KEYS.filter(k => best.vars[k] !== state.vars[k]).map(k => ({ key: k, from: state.vars[k], to: best.vars[k] }));
    return { vars: best.vars, before, after, changed };
  }

  // ---------- Everything the live view needs ----------
  function metrics(state, notes = [], markers = null) {
    const W = weights(state.w), V = state.vars;
    const e = state.e, h = state.home;
    const opts = { home: h, W, vars: V, g: state.ego.g, target: state.ego.target, cath: state.cath };
    if (state.baseline) { opts.refD = distance(aug(state.baseline.e, state.baseline.g), homeAug(state)); opts.refDmax = dmax(homeAug(state)); }
    const L = loops(e, W, V.d);
    const week = lastWeek(state);
    return {
      d: r2(distance(e, h)), cos: r2(cosine(e, h)), lambda: lambdaHard(e, W, V.d),
      loops: L, unstable: L.filter(l => l.kind === "unstable"),
      hidden: hidden(e, W, state.steps, notes, V), ideal: ideal(e, opts),
      ego: { g: state.ego.g, target: state.ego.target, markers: markers || {}, structure: structure(state, markers) },
      baseline: state.baseline ? { dB: r2(distance(aug(state.baseline.e, state.baseline.g), homeAug(state))), days: state.days.length } : null,
      today: week.length && week[week.length - 1].day === dayOf(stamp(Date.now())) ? week[week.length - 1] : null,
      week, recovery: recovery(state), catholic: catholicView(state),
    };
  }

  function catholicView(state) {
    const f = state.cath, eo = toObjAll(state.e);
    const ig = C.ignatian(eo, f);
    return { factors: f, ignatian: ig, practice: C.practice(f, eo, ig), mercy: C.mercyDue(eo), active: C.activeTendency(f) };
  }
  const toObjAll = v => Object.fromEntries(NAMES.map((n, i) => [n, v[i]]));

  // The structure you are in now, and the one you are moving toward.
  function structure(state, markers) {
    const g = state.ego.g, t = state.ego.target;
    const calm = state.e[idx.calm], conn = state.e[idx.connection];
    let now;
    if (g > t + 0.25) {
      const dom = dominantMarker(markers);
      now = dom ? EGO_MARKERS[dom].label : "self-focus";
    } else if (g < t - 0.15) now = "low self-respect";
    else if (calm >= 0.5 && conn >= 0.5) now = "humble confidence";
    else now = "steady self-respect";
    return { now, toward: "humble confidence" };
  }

  // ---------- Plain equation lines ----------
  const f2 = x => x.toFixed(2);
  const sgn = x => (x > 0 ? "+" : x < 0 ? "\u2212" : "") + Math.abs(x).toFixed(2);
  const vecText = v => {
    const parts = NAMES.map((n, i) => [n, v[i]]).filter(([, x]) => x > 0).sort((a, b) => b[1] - a[1]).map(([n, x]) => `${n} ${f2(x)}`);
    return parts.length ? `(${parts.join(", ")})` : "(0)";
  };
  const LET_GO = { defensiveness: "defending", comparison: "comparing", selfAttack: "attacking yourself", pride: "proving", rumination: "replaying it" };

  function egoLine(m) {
    const { g, target } = m.ego, id = m.ideal;
    if (Math.abs(g - target) < 0.005) return `ego g = ${f2(g)} (at g* = ${f2(target)}: healthy self-respect)`;
    if (g > target) {
      const dom = dominantMarker(m.ego.markers);
      return `ego g = ${f2(g)} \u2192 ${f2(id.gNext)} (release toward g* = ${f2(target)}: keep self-respect, let go of ${dom ? LET_GO[dom] : "self-focus"})`;
    }
    return `ego g = ${f2(g)} \u2192 ${f2(id.gNext)} (raise toward g* = ${f2(target)}: self-respect)`;
  }

  function catholicLines(state, m) {
    const L = [], cv = m.catholic, f = cv.factors, id = m.ideal;
    L.push(`theological: ${C.THEOLOGICAL.map(k => `${k} ${f2(f.v[k])}`).join(", ")}`);
    L.push(`cardinal: ${C.CARDINAL.map(k => `${k} ${f2(f.v[k])}`).join(", ")}`);
    const act = C.TENDENCIES.filter(k => f.t[k] >= 0.1).sort((a, b) => f.t[b] - f.t[a] || C.TENDENCIES.indexOf(a) - C.TENDENCIES.indexOf(b)).slice(0, 3);
    act.forEach((k, i) => {
      const v = C.VIRTUE_OF[k];
      L.push(`virtue: ${v} ${f2(f.v[v])} ↔ ${k} ${f2(f.t[k])}${i === 0 ? ` → pull ${v}` : ""}`);
    });
    if (!act.length) { const w = C.weakestVirtue(f); L.push(`virtue: no strong tendency; weakest virtue ${w} ${f2(f.v[w])}`); }
    if (id.pull) L.push(`virtue step: ${id.pull.virtue} ${f2(id.pull.v)} → ${f2(id.pull.vNext)}${id.pull.tendency ? `, ${id.pull.tendency} ${f2(id.pull.t)} → ${f2(id.pull.tNext)}` : ""} (v_h = ${f2(state.vars.vHome)})`);
    const ig = cv.ignatian;
    L.push(`Ignatian: ${ig.state === "quiet" ? "quiet" : ig.state} ${sgn(ig.I)} → ${C.IGNATIAN_TEXT[ig.state]}`);
    return L;
  }

  function lines(state, m, opts = {}) {
    const L = [];
    const id = m.ideal;
    L.push(`e = ${vecText(state.e)}`);
    L.push(`h = ${vecText(state.home)}`);
    L.push(`d = \u2016e \u2212 h\u2016 = ${f2(m.d)}`);
    L.push(`cos(e, h) = ${f2(m.cos)}`);
    if (m.lambda !== null) L.push(`\u03BB = ${sgn(m.lambda)} \u2192 ${m.lambda > 0 ? "unstable (small changes grow)" : "settles"}`);
    m.unstable.forEach(l => L.push(`unstable: ${l.a} \u00D7 ${l.b}, u = ${f2(l.u)}`));
    m.hidden.forEach(x => L.push(x.kind === "dynamics"
      ? `hidden: ${x.name} ${f2(x.from)} \u2192 ${f2(x.to)} in ${state.steps} steps${x.via ? ` (via ${x.via})` : ""}`
      : `hidden: ${x.note} (amplifier)`));
    L.push(egoLine(m));
    const mk = Object.entries(m.ego.markers);
    if (mk.length) L.push(`ego markers: ${mk.sort((a, b) => b[1] - a[1]).map(([k, n]) => `${EGO_MARKERS[k].label} ${n}`).join(", ")}`);
    const st = m.ego.structure;
    L.push(st.now === st.toward ? `structure: humble confidence (g near g*, calm and connection high)` : `structure: ${st.now} \u2192 toward humble confidence`);
    const cathOn = catholicOn(state, opts);
    if (cathOn) catholicLines(state, m).forEach(x => L.push(x));
    L.push(`ideal: e\u2032 = e + ${f2(id.a)}\u00B7(h \u2212 e) + ${f2(id.b)}\u00B7s(e)${id.cv ? ` + ${f2(id.cv)}\u00B7V(e)` : ""}; g\u2032 = g \u2212 ${f2(id.r)}\u00B7(g \u2212 ${f2(id.target)}) \u2192 d\u2032 = ${f2(id.dNext)}`);
    if (m.baseline) L.push(`baseline: \u2016B \u2212 h\u2016 = ${f2(m.baseline.dB)} (\u03B2 = ${f2(state.beta)}, ${m.baseline.days} day${m.baseline.days === 1 ? "" : "s"})`);
    if (m.today && m.today.cos !== null) L.push(`today: cos(v, h \u2212 B) = ${sgn(m.today.cos)} ${ARROW[m.today.dir]}`);
    L.push(`recovery: ${recText(m.recovery)} to d < ${f2(state.vars.eps)} with ${titleOf(state, state.framework)} (model estimate)`);
    const work = id.work.map(w => (w.kind === "loop" ? `${w.a} \u00D7 ${w.b} loop`
      : w.kind === "ego" ? `${w.dir === "down" ? "ego grip \u2193" : "self-respect \u2191"} (gap ${f2(w.gap)})`
      : `${w.name} ${w.dir === "up" ? "\u2191" : "\u2193"} (gap ${f2(w.gap)})`));
    if (work.length) L.push(`work on: ${work.join("; ")}`);
    if (id.stabilizer) L.push(`stabilizer: ${id.stabilizer.name} \u2192 ${id.stabilizer.skill}, with ${id.stabilizer.creature}`);
    if (cathOn) {
      const p = m.catholic.practice;
      L.push(`practice (optional): ${p.key} \u2192 ${p.do}`);
      if (m.catholic.mercy && p.key !== "mercy") L.push(`mercy: ${C.MERCY_LINE}`);
    }
    return L;
  }

  function idealWords(m) {
    const id = m.ideal;
    if (m.d === 0 && id.egoGap < 0.005) return "You are at home. Nothing to move.";
    const pct = Math.round(id.a * 100);
    const why = id.unstable ? " The mix is unstable, so the step is kept small." : "";
    const helper = id.stabilizer ? ` Let ${id.stabilizer.name} press on ${id.targets.join(" and ")} (try: ${id.stabilizer.skill}).` : "";
    const ego = id.egoGap >= 0.005 ? (id.g > id.target ? ` Loosen the ego grip from ${f2(id.g)} to ${f2(id.gNext)}, keeping self-respect.` : ` Raise self-respect from ${f2(id.g)} to ${f2(id.gNext)}.`) : "";
    const virtue = id.pull && id.pull.tendency ? ` Let ${id.pull.virtue} pull on ${id.pull.tendency}.` : id.pull ? ` Grow in ${id.pull.virtue}.` : "";
    return `Move ${pct}% of the way home.${helper}${virtue}${ego}${why} Distance ${f2(id.d)} \u2192 ${f2(id.dNext)}.`;
  }

  function weekLines(state, now = Date.now()) {
    return lastWeek(state, now).map(x => `${x.day.slice(5)}  \u2016B \u2212 h\u2016 = ${f2(x.dB)}  ${x.dir ? ARROW[x.dir] : "start"}`);
  }
  function todayWords(state, now = Date.now()) {
    const w = lastWeek(state, now);
    const t = w.length && w[w.length - 1].day === dayOf(stamp(now)) ? w[w.length - 1] : null;
    if (!t) return "Save a checkpoint or accept a step to record today.";
    return t.dir ? GENTLE[t.dir] : "Today is the first day on the map.";
  }

  // ---------- The code language (.mf) ----------
  // Line-based plain data. Never evaluated, only matched against these shapes:
  //   mf 1
  //   home name=v ...          e name=v ...          ego g=v target=v
  //   steps k                  vars framework=x key=v ...
  //   w from>to=v              baseline beta=v [name=v ... g=v]
  //   day YYYY-MM-DD name=v ... g=v
  //   virtue name=v ...        (only virtues not at 0.50)
  //   tendency name=v ...      (only tendencies above 0)
  //   ignatian I c=v d=v       (I is readable and recomputed; c, d are the word scores)
  //   framework name=x key=v ... target=v beta=v k=n h.name=v w.from>to=v
  //   cp n YYYY-MM-DDTHH:MM label=x name=v ... g=v lambda=v
  //   ideal a=v b=v [r=v] [cv=v]   eq ...   (readable, rebuilt on save, ignored on read)
  //   # comment
  const NUM = "-?(?:\\d+(?:\\.\\d*)?|\\.\\d+)";
  const PAIR = new RegExp(`^([a-z]+)=(${NUM})$`);
  const VPAIR = new RegExp(`^([a-zA-Z]+)=(${NUM})$`);
  const LABEL = /^[a-z0-9-]{1,24}$/;
  const TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
  const DAY = /^\d{4}-\d{2}-\d{2}$/;

  const vecCode = v => NAMES.map((n, i) => [n, v[i]]).filter(([, x]) => x > 0).map(([n, x]) => `${n}=${f2(x)}`).join(" ");
  const num = x => (Object.is(r2(x), -0) ? 0 : r2(x)).toFixed(2);
  const join = parts => parts.filter(Boolean).join(" ");

  function frameworkCode(f) {
    const parts = [`framework name=${f.name}`];
    VAR_KEYS.forEach(k => { if (f.vars[k] !== SPEC[k].def) parts.push(`${k}=${num(f.vars[k])}`); });
    if (f.target !== SPEC.target.def) parts.push(`target=${num(f.target)}`);
    if (f.beta !== SPEC.beta.def) parts.push(`beta=${num(f.beta)}`);
    if (f.k !== SPEC.k.def) parts.push(`k=${f.k}`);
    const H = fromObj(HOME);
    NAMES.forEach((n, i) => { if (f.home[i] !== H[i]) parts.push(`h.${n}=${num(f.home[i])}`); });
    f.w.forEach(o => parts.push(`w.${o.from}>${o.to}=${num(o.w)}`));
    return parts.join(" ");
  }

  function serialize(state) {
    const out = [`mf ${VERSION}`];
    out.push(join(["home", vecCode(state.home)]));
    out.push(join(["e", vecCode(state.e)]));
    out.push(`ego g=${num(state.ego.g)} target=${num(state.ego.target)}`);
    out.push(`steps ${state.steps}`);
    out.push(join([`vars framework=${state.framework}`, ...VAR_KEYS.filter(k => state.vars[k] !== SPEC[k].def).map(k => `${k}=${num(state.vars[k])}`)]));
    state.w.forEach(o => out.push(`w ${o.from}>${o.to}=${num(o.w)}`));
    out.push(join([`baseline beta=${num(state.beta)}`, state.baseline ? vecCode(state.baseline.e) : "", state.baseline ? `g=${num(state.baseline.g)}` : ""]));
    state.days.forEach(x => out.push(join([`day ${x.day}`, vecCode(x.e), `g=${num(x.g)}`])));
    const f = state.cath;
    const vs = C.VIRTUES.filter(k => f.v[k] !== C.V0), ts = C.TENDENCIES.filter(k => f.t[k] > 0);
    if (vs.length) out.push(join(["virtue", ...vs.map(k => `${k}=${num(f.v[k])}`)]));
    if (ts.length) out.push(join(["tendency", ...ts.map(k => `${k}=${num(f.t[k])}`)]));
    if (vs.length || ts.length || f.c || f.d || state.vars.cv > 0) out.push(`ignatian ${num(C.ignatian(toObjAll(state.e), f).I)} c=${num(f.c)} d=${num(f.d)}`);
    state.frameworks.forEach(f => out.push(frameworkCode(f)));
    state.cps.forEach(c => out.push(join([`cp ${c.n} ${c.t} label=${c.label}`, vecCode(c.e), `g=${num(c.g)}`, `lambda=${num(c.lambda)}`])));
    if (state.ideal) {
      out.push(`ideal a=${num(state.ideal.a)} b=${num(state.ideal.b)} r=${num(state.ideal.r)}${state.ideal.cv ? ` cv=${num(state.ideal.cv)}` : ""}`);
      out.push(`eq e' = e + ${num(state.ideal.a)}*(h - e) + ${num(state.ideal.b)}*s(e)${state.ideal.cv ? ` + ${num(state.ideal.cv)}*V(e)` : ""}; g' = g - ${num(state.ideal.r)}*(g - ${num(state.ego.target)})`);
    }
    return out.join("\n") + "\n";
  }

  function parse(text) {
    const errors = [];
    const err = (line, msg) => errors.push({ line, msg: `Line ${line}: ${msg}` });
    const raw = String(text || "").replace(/\r\n?/g, "\n").split("\n");
    if (raw.length > MAX_LINES) return { ok: false, errors: [{ line: 0, msg: `That code is too long (more than ${MAX_LINES} lines).` }] };
    const state = defaultState();
    let sawHeader = false, sawHome = false, crisis = false, sawEgoG = false, baselineLine = null;

    const readVec = (tokens, line, extra = {}) => {
      const o = {}, ex = {};
      tokens.forEach(tok => {
        const m = tok.match(PAIR);
        if (!m) { err(line, `\u201C${tok}\u201D should look like name=0.50.`); return; }
        const [, k, v] = m, x = Number(v);
        if (k in extra) { ex[k] = x; return; }
        if (!(k in idx)) { err(line, `\u201C${k}\u201D isn't one of the ten emotions (${NAMES.join(", ")}).`); return; }
        if (k in o) { err(line, `${k} appears twice.`); return; }
        if (x < 0 || x > 1) { err(line, `${k}=${v} must be between 0 and 1.`); return; }
        o[k] = x;
      });
      return { vec: fromObj(o), ex };
    };
    const in01 = (line, k, x) => { if (!(x >= 0 && x <= 1)) { err(line, `${k} must be between 0 and 1.`); return false; } return true; };
    const inRange = (line, k, x) => {
      const sp = SPEC[k];
      if (!Number.isFinite(x) || x < sp.min || x > sp.max || (k === "k" && !Number.isInteger(x))) { err(line, `${k} must be ${k === "k" ? "a whole number " : ""}from ${sp.min} to ${sp.max}.`); return false; }
      return true;
    };
    const readLabel = (line, tok, key) => {
      const m = (tok || "").match(new RegExp(`^${key}=(.*)$`));
      if (!m || !LABEL.test(m[1])) { err(line, `the ${key} should look like ${key}=start (a\u2013z, 0\u20139, dashes).`); return null; }
      if (G.isCrisis(m[1].replace(/-/g, " "))) { crisis = true; return null; }
      return m[1];
    };

    raw.forEach((rawLine, i) => {
      const n = i + 1;
      const line = rawLine.replace(/#.*$/, "").trim();
      if (!line) return;
      const [kw, ...rest] = line.split(/\s+/);
      if (!sawHeader) {
        if (kw !== "mf") { err(n, "the code should start with \u201Cmf 1\u201D."); sawHeader = true; return; }
        sawHeader = true;
        if (rest[0] !== String(VERSION)) err(n, `this is version ${rest[0] || "?"}; this app reads version ${VERSION}.`);
        return;
      }
      switch (kw) {
        case "home": {
          if (sawHome) { err(n, "home appears twice."); break; }
          sawHome = true;
          state.home = readVec(rest, n).vec;
          break;
        }
        case "e": state.e = readVec(rest, n).vec; break;
        case "ego": {
          rest.forEach(tok => {
            const m = tok.match(PAIR);
            if (!m || !["g", "target"].includes(m[1])) { err(n, "ego looks like ego g=0.50 target=0.30."); return; }
            const x = Number(m[2]);
            if (m[1] === "g" && in01(n, "g", x)) { state.ego.g = r2(x); sawEgoG = true; }
            if (m[1] === "target" && inRange(n, "target", x)) state.ego.target = r2(x);
          });
          break;
        }
        case "steps": {
          const k = Number(rest[0]);
          if (rest.length !== 1 || !Number.isInteger(k) || k < 1 || k > 50) err(n, "steps should be a whole number from 1 to 50.");
          else state.steps = k;
          break;
        }
        case "vars": {
          rest.forEach(tok => {
            if (tok.startsWith("framework=")) { const f = readLabel(n, tok, "framework"); if (f) state.framework = f; return; }
            const m = tok.match(VPAIR);
            if (!m || !VAR_KEYS.includes(m[1])) { err(n, `\u201C${tok}\u201D isn't a variable (${VAR_KEYS.join(", ")}).`); return; }
            const x = Number(m[2]);
            if (inRange(n, m[1], x)) state.vars[m[1]] = r2(x);
          });
          const v = validateVars(state.vars);
          if (v.notes.length) err(n, `the variables don't fit together: ${v.notes.join("; ")}.`);
          break;
        }
        case "w": {
          const m = rest.length === 1 && rest[0].match(new RegExp(`^([a-z]+)>([a-z]+)=(${NUM})$`));
          if (!m) { err(n, "a weight looks like w shame>loneliness=0.50."); break; }
          const [, from, to, v] = m, x = Number(v);
          if (!(from in idx) || !(to in idx)) { err(n, "both sides of a weight must be emotion names."); break; }
          if (from === to) { err(n, "a weight joins two different emotions."); break; }
          if (x < -1 || x > 1) { err(n, "a weight must be between -1 and 1."); break; }
          if (state.w.length >= MAX_W) { err(n, `at most ${MAX_W} weights.`); break; }
          state.w = state.w.filter(o => !(o.from === from && o.to === to));
          state.w.push({ from, to, w: r2(x) });
          break;
        }
        case "baseline": {
          const [bt, ...vals] = rest;
          const m = (bt || "").match(new RegExp(`^beta=(${NUM})$`));
          if (!m) { err(n, "baseline looks like baseline beta=0.20."); break; }
          if (inRange(n, "beta", Number(m[1]))) state.beta = r2(Number(m[1]));
          if (vals.length) {
            const { vec, ex } = readVec(vals, n, { g: true });
            baselineLine = { e: vec, g: r2(Number.isFinite(ex.g) ? clamp01(ex.g) : state.ego.target) };
          }
          break;
        }
        case "day": {
          const [dk, ...vals] = rest;
          if (!DAY.test(dk || "")) { err(n, "a day looks like day 2026-10-17 shame=0.50 g=0.40."); break; }
          if (state.days.length && dk <= state.days[state.days.length - 1].day) { err(n, "days should go forward in time."); break; }
          if (state.days.length >= MAX_DAYS) { err(n, `at most ${MAX_DAYS} days.`); break; }
          const { vec, ex } = readVec(vals, n, { g: true });
          if (Number.isFinite(ex.g) && !in01(n, "g", ex.g)) break;
          state.days.push({ day: dk, e: vec, g: r2(Number.isFinite(ex.g) ? ex.g : SPEC.target.def) });
          break;
        }
        case "virtue":
        case "tendency": {
          const names = kw === "virtue" ? C.VIRTUES : C.TENDENCIES;
          rest.forEach(tok => {
            const m = tok.match(PAIR);
            if (!m || !names.includes(m[1])) { err(n, `\u201C${tok}\u201D should be one of ${names.join(", ")}, like ${names[0]}=0.50.`); return; }
            const x = Number(m[2]);
            if (in01(n, m[1], x)) state.cath[kw === "virtue" ? "v" : "t"][m[1]] = r2(x);
          });
          break;
        }
        case "ignatian": {
          const [ix, ...vals] = rest;
          const I = Number(ix);
          if (!new RegExp(`^${NUM}$`).test(ix || "") || I < -1 || I > 1) { err(n, "ignatian looks like ignatian -0.45 c=0.00 d=0.50 (the first number from -1 to 1)."); break; }
          vals.forEach(tok => {
            const m = tok.match(PAIR);
            if (!m || !["c", "d"].includes(m[1])) { err(n, "ignatian looks like ignatian -0.45 c=0.00 d=0.50."); return; }
            if (in01(n, m[1], Number(m[2]))) state.cath[m[1]] = r2(Number(m[2]));
          });
          break;
        }
        case "framework": {
          const [nm, ...vals] = rest;
          const name = readLabel(n, nm, "name");
          if (!name) break;
          if (PRESET_IDS.has(name)) { err(n, `\u201C${name}\u201D is a preset name; pick another.`); break; }
          if (state.frameworks.length >= MAX_FRAMEWORKS) { err(n, `at most ${MAX_FRAMEWORKS} frameworks.`); break; }
          const fw = { name, vars: defaultVars(), target: SPEC.target.def, beta: SPEC.beta.def, k: SPEC.k.def, home: fromObj(HOME), w: [] };
          let bad = false;
          vals.forEach(tok => {
            const hm = tok.match(new RegExp(`^h\\.([a-z]+)=(${NUM})$`));
            const wm = tok.match(new RegExp(`^w\\.([a-z]+)>([a-z]+)=(${NUM})$`));
            const pm = tok.match(VPAIR);
            if (hm) {
              if (!(hm[1] in idx)) { err(n, `\u201C${hm[1]}\u201D isn't one of the ten emotions.`); bad = true; return; }
              if (!in01(n, `h.${hm[1]}`, Number(hm[2]))) { bad = true; return; }
              fw.home[idx[hm[1]]] = r2(Number(hm[2]));
            } else if (wm) {
              const x = Number(wm[3]);
              if (!(wm[1] in idx) || !(wm[2] in idx) || wm[1] === wm[2] || x < -1 || x > 1) { err(n, `\u201C${tok}\u201D should look like w.shame>loneliness=0.50 (\u22121 to 1).`); bad = true; return; }
              fw.w = fw.w.filter(o => !(o.from === wm[1] && o.to === wm[2])).concat({ from: wm[1], to: wm[2], w: r2(x) });
            } else if (pm && (VAR_KEYS.includes(pm[1]) || ["target", "beta", "k"].includes(pm[1]))) {
              const x = Number(pm[2]);
              if (!inRange(n, pm[1], x)) { bad = true; return; }
              if (VAR_KEYS.includes(pm[1])) fw.vars[pm[1]] = r2(x); else fw[pm[1]] = pm[1] === "k" ? x : r2(x);
            } else { err(n, `\u201C${tok}\u201D isn't a framework value.`); bad = true; }
          });
          const v = validateVars(fw.vars);
          if (v.notes.length) { err(n, `the variables don't fit together: ${v.notes.join("; ")}.`); bad = true; }
          if (!bad) state.frameworks.push(fw);
          break;
        }
        case "cp": {
          const [nn, t, lab, ...vals] = rest;
          const k = Number(nn);
          if (!Number.isInteger(k) || k < 1) { err(n, "a checkpoint starts with its number, like cp 1."); break; }
          if (state.cps.length && k <= state.cps[state.cps.length - 1].n) { err(n, "checkpoint numbers should go up."); break; }
          if (!TIME.test(t || "")) { err(n, "the time should look like 2026-10-17T13:50."); break; }
          const lm = (lab || "").match(/^label=(.*)$/);
          if (!lm || !LABEL.test(lm[1])) { err(n, "the label should look like label=start (a-z, 0-9, dashes)."); break; }
          if (G.isCrisis(lm[1].replace(/-/g, " "))) { crisis = true; break; }
          if (state.cps.length >= MAX_CHECKPOINTS) { err(n, `at most ${MAX_CHECKPOINTS} checkpoints.`); break; }
          const { vec, ex } = readVec(vals, n, { lambda: true, g: true });
          state.cps.push({ n: k, t, label: lm[1], e: vec, g: r2(Number.isFinite(ex.g) ? clamp01(ex.g) : SPEC.target.def), lambda: r2(Number.isFinite(ex.lambda) ? ex.lambda : 0) });
          break;
        }
        case "ideal": {
          const m = line.match(new RegExp(`^ideal a=(${NUM}) b=(${NUM})(?: r=(${NUM}))?(?: cv=(${NUM}))?$`));
          const ok = m && [m[1], m[2], m[3] ?? "0", m[4] ?? "0"].every(x => Number(x) >= 0 && Number(x) <= 1);
          if (!ok) { err(n, "ideal looks like ideal a=0.10 b=0.15 r=0.12 (each 0 to 1)."); break; }
          state.ideal = { a: r2(Number(m[1])), b: r2(Number(m[2])), r: r2(Number(m[3] ?? state.vars.r)), cv: r2(Number(m[4] ?? 0)) };
          break;
        }
        case "eq": break; // readable copy of the ideal line
        case "mf": err(n, "the header appears twice."); break;
        default: err(n, `\u201C${kw}\u201D isn't a keyword (mf, home, e, ego, steps, vars, w, baseline, day, virtue, tendency, ignatian, framework, cp, ideal, eq).`);
      }
    });
    if (crisis) return { ok: false, crisis: true, errors: [] };
    if (!sawHeader) return { ok: false, errors: [{ line: 0, msg: "Nothing to import yet. Paste code that starts with \u201Cmf 1\u201D." }] };
    if (!sawEgoG) state.ego.g = state.ego.target;
    // Old codes have no ideal r; use the variable.
    if (state.ideal && !Number.isFinite(state.ideal.r)) state.ideal.r = state.vars.r;
    // The baseline comes from the days when there are any; otherwise from its line.
    const out = state.days.length ? withBaseline(state) : { ...state, baseline: baselineLine };
    return errors.length ? { ok: false, errors } : { ok: true, state: out };
  }

  // ---------- Checkpoints ----------
  function stamp(ts) {
    const d = new Date(ts), p = x => String(x).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  function addCheckpoint(state, label, ts = Date.now()) {
    const n = state.cps.length ? state.cps[state.cps.length - 1].n + 1 : 1;
    const lam = lambdaHard(state.e, weights(state.w), state.vars.d);
    const cp = { n, t: stamp(ts), label: LABEL.test(label || "") ? label : `cp-${n}`, e: state.e.slice(), g: state.ego.g, lambda: r2(lam === null ? 0 : lam) };
    const cps = state.cps.concat(cp).slice(-MAX_CHECKPOINTS);
    return recordDay({ ...state, cps }, ts);
  }

  function restore(state, n) {
    const cp = state.cps.find(c => c.n === n);
    return cp ? { ...state, e: cp.e.slice(), ego: { ...state.ego, g: cp.g } } : state;
  }

  // ---------- The step story ----------
  const STEP_FOR = {
    connection: "send one short message to someone who is kind",
    calm: "breathe out slowly, longer than the breath in, five times",
    hope: "pick one small thing for tomorrow and write it down",
    joy: "do one small thing they used to enjoy, for ten minutes",
  };
  const REFRAME_FOR = {
    shame: "I am a person having a hard moment, not a bad person.",
    loneliness: "Feeling alone right now does not mean I am alone for good.",
    sadness: "This heavy feeling is real, and it can change.",
    fear: "A fear is a guess about the future, not a fact.",
    anger: "My anger is telling me something matters; I can choose what to do with it.",
    guilt: "I can make it right where I can, and still be kind to myself.",
  };
  const ARC_FOR = { shame: "labeling", guilt: "labeling", loneliness: "hopelessness", sadness: "hopelessness", fear: "catastrophizing", anger: "catastrophizing" };

  // Ego story pieces: letting go of defending/comparing, keeping self-respect.
  const EGO_OPEN = [
    "came home after a long day, still arguing the whole thing over in their head.",
    "sat by the window, replaying who was right and who was wrong.",
    "walked the long way home, measuring themself against everyone they had met that day.",
  ];
  const EGO_NAMING = {
    defensiveness: "Part of them was busy defending, building a wall of reasons, and the wall was tiring to hold up.",
    comparison: "Part of them kept a scoreboard, better than this one, worse than that one, and the scoreboard never let them rest.",
    selfAttack: "Part of them had turned the blame inward, which was still the self at the center, only louder.",
    pride: "Part of them needed to be above everyone, and staying up there took all their strength.",
    rumination: "The same moment kept playing over and over, as if one more replay would finally fix it.",
    none: "Most of their attention was on themself: how they looked, what they were owed, what they had done wrong.",
  };
  const EGO_KEEP = [
    "Letting go of defending did not mean letting go of self-respect.",
    "They did not need to win, and they did not need to lose. They only needed to stay themself.",
    "Humility, they remembered, was not thinking less of themself, only thinking of themself a little less.",
  ];
  const EGO_STEP = {
    defensiveness: ["say one honest sentence without a defense attached", "name one thing the other person might be right about, and one thing they themself did well"],
    comparison: ["set the scoreboard down for one hour and notice one person without measuring", "name one thing they did well that needed no comparison"],
    selfAttack: ["speak to themself the way they would speak to a friend", "write one kind, true sentence about themself and leave it there"],
    pride: ["ask one person what they thought, and listen to the end", "name one thing someone else did better, and say it out loud"],
    rumination: ["write the replay down once, then close the notebook", "take a ten-minute walk and count five things they could see"],
    none: ["name one thing the other person might be right about, and one thing they themself did well"],
  };
  const EGO_FAITH = [
    "They remembered grace: they did not have to prove anything to be loved.",
    "They prayed a short prayer for a humble heart and a steady spine.",
  ];
  const EGO_LOW = [
    "Lately they had made themself very small, as if taking up any room were a mistake.",
    "They kept apologizing for things that were not theirs to carry.",
  ];
  const EGO_LOW_KEEP = [
    "Self-respect, they decided, is not pride. It is just standing where you actually are.",
    "Being humble did not mean disappearing.",
  ];
  const EGO_LOW_STEP = ["write down one thing they did well today, without a \u201Cbut\u201D", "say one small no, kindly, where a yes would hurt"];

  function egoStory(state, m, opts) {
    const id = m.ideal, rand = S.parts.rng(opts.seed || 1);
    const pick = list => list[Math.floor(rand() * list.length)];
    const who = S.CHARACTERS.find(c => c.name === "Pell");
    const low = id.g < id.target;
    const dom = dominantMarker(m.ego.markers) || "none";
    const s = [];
    s.push(`${who.intro} ${pick(EGO_OPEN)}`);
    s.push(`They kept a small map of the mind, and on it the ego grip sat at ${f2(id.g)}, ${low ? "below the line of healthy self-respect" : "the farthest point from home"}.`);
    s.push(low ? pick(EGO_LOW) : EGO_NAMING[dom]);
    s.push(low ? pick(EGO_LOW_KEEP) : pick(EGO_KEEP));
    s.push(`So they did one real thing: ${pick(low ? EGO_LOW_STEP : EGO_STEP[dom])}.`);
    if (opts.faith) s.push(pick(EGO_FAITH));
    s.push(`On the map, the grip moved from ${f2(id.g)} to ${f2(id.gNext)}, ${low ? "a little more room to stand in" : "loose enough to listen, firm enough to keep their self-respect"}. Not all the way. Just closer.`);
    s.push(low ? "What is one thing about you that deserves respect today?" : "What is one thing you could stop defending today, and one thing about you worth respecting?");
    const text = s.map(x => x.charAt(0).toUpperCase() + x.slice(1)).join(" ");
    return { guide: who.name, tag: `${who.name}, ${who.intro.slice(who.name.length + 2).replace(/,$/, "")}`, focus: "ego", arc: "ego", from: id.g, to: id.gNext, sentences: s, text, next: id.next, gNext: id.gNext };
  }

  // Catholic mode: a virtue is the turning point. Calm, realistic, one prayer line, never shaming.
  function catholicStory(state, m, opts) {
    const id = m.ideal, cv = m.catholic, f = cv.factors, rand = S.parts.rng(opts.seed || 1);
    const pick = list => list[Math.floor(rand() * list.length)];
    const p = cv.practice;
    const k = p.why === "tendency" ? p.tendency : null;
    const desol = cv.ignatian.state === "desolation";
    const who = S.CHARACTERS.find(c => c.name === (k === "wrath" || k === "envy" ? "Mistfawn" : desol ? "Nim" : "Sela"));
    const s = [];
    const mercy = p.key === "mercy";
    s.push(`${who.intro} ${pick(C.OPEN[k || (desol ? "desolation" : mercy ? "mercy" : "weak")])}`);
    if (k) {
      s.push(`They kept a small map of the soul, and on it ${k} sat at ${f2(f.t[k])} and ${p.key} at ${f2(f.v[p.key])}.`);
      s.push(pick(C.NOT_VERDICT));
    } else if (mercy) {
      const n = state.e[idx.shame] >= state.e[idx.guilt] ? "shame" : "guilt";
      s.push(`They kept a small map of the soul, and on it ${n} sat at ${f2(state.e[idx[n]])}, the farthest point from home.`);
    } else s.push(`They kept a small map of the soul, and on it the Ignatian needle pointed to ${sgn(cv.ignatian.I)}.`);
    if (desol) s.push(pick(C.DESOLATION_WORDS));
    s.push(`So they chose ${k ? p.key : p.key === "examen" ? "the examen" : mercy ? "to let mercy in" : p.key}, not as a feeling but as one small act: they ${p.act}.`);
    if (mercy) s.push("Confession would be there whenever they felt ready. No rush, no pressure.");
    // One prayer line: the act itself when it is a prayer, otherwise a short one.
    if (!/pray/i.test(p.act)) s.push(C.PRAYER[p.key] || C.PRAYER.default);
    const pi = id.pull;
    const top = NAMES.map((n, i) => ({ n, i, drop: state.e[i] - id.next[i] })).filter(x => !HELPFUL[x.i]).sort((a, b) => b.drop - a.drop)[0];
    const moved = pi ? `${pi.virtue} rose from ${f2(pi.v)} to ${f2(pi.vNext)}` : "";
    const eased = top && top.drop > 0 ? `${top.n} eased from ${f2(state.e[top.i])} to ${f2(id.next[top.i])}` : "";
    s.push(`On the map, ${[moved, eased].filter(Boolean).join(" and ") || "things moved a little"}. Not all the way. Just closer.`);
    s.push(C.QUESTION[p.key] || C.QUESTION.default);
    const text = s.map(x => x.charAt(0).toUpperCase() + x.slice(1)).join(" ");
    return { guide: who.name, tag: `${who.name}, ${who.intro.slice(who.name.length + 2).replace(/,$/, "")}`, focus: p.key, arc: "catholic", from: pi ? pi.v : null, to: pi ? pi.vNext : null, sentences: s, text, next: id.next, gNext: id.gNext };
  }

  function story(state, m, opts = {}) {
    const id = m.ideal;
    const h = state.home;
    if (state.vars.cv > 0 && m.catholic) {
      const cv = m.catholic;
      if (["tendency", "desolation", "mercy"].includes(cv.practice.why)) return catholicStory(state, m, opts);
    }
    if (!m.d && id.egoGap < 0.005) return null;
    if (id.egoTop || (!m.d && id.egoGap >= 0.005)) return egoStory(state, m, opts);
    const gaps = NAMES.map((n, i) => ({ n, i, gap: Math.abs(h[i] - state.e[i]), hard: !HELPFUL[i] && state.e[i] > h[i] }));
    const hardTop = gaps.filter(g => g.hard).sort((a, b) => b.gap - a.gap)[0];
    const top = hardTop || gaps.sort((a, b) => b.gap - a.gap)[0];
    const stab = id.stabilizer;
    const guide = stab ? stab.creature : S.PATTERN_CREATURE.none;
    const arc = hardTop ? ARC_FOR[hardTop.n] : "none";
    const read = { patterns: [arc], reframes: [REFRAME_FOR[top.n] || "This is a feeling, not a fact."] };
    const step = stab ? STEP_FOR[stab.name] : STEP_FOR.calm;
    const base = S.tell({ read, character: guide, step, seed: opts.seed || 1, faith: !!opts.faith });
    if (base.crisis) return null;
    const from = state.e[top.i], to = id.next[top.i];
    const map = `They kept a small map of feelings, and on it ${top.n} sat at ${f2(from)}, the farthest point from home.`;
    const helper = stab ? `They knew ${stab.name} could pull on it, so the plan stayed small and real.` : "The plan stayed small and real.";
    const landing = `On the map, ${top.n} moved from ${f2(from)} to ${f2(to)}, and the way home grew ${f2(Math.max(0, id.d - id.dNext))} shorter. Not all the way. Just closer.`;
    const b = base.sentences;
    const sentences = [b[0], map, helper, ...b.slice(1, -1), landing, b[b.length - 1]];
    return { guide, tag: base.tag, focus: top.n, arc, from, to, sentences, text: sentences.join(" "), next: id.next, gNext: id.gNext };
  }

  // Take the ideal step: e and g move, a checkpoint is saved, and today's day vector updates.
  function acceptStep(state, ts = Date.now()) {
    const m = metrics(state);
    const s = { ...state, e: m.ideal.next.slice(), ego: { ...state.ego, g: m.ideal.gNext }, cath: m.ideal.cathNext ? C.copy(m.ideal.cathNext) : state.cath };
    const n = state.cps.filter(c => /^step-\d+$/.test(c.label)).length + 1;
    return refreshIdeal(addCheckpoint(s, `step-${n}`, ts));
  }

  function refreshIdeal(state) {
    const m = metrics(state);
    return { ...state, ideal: { a: m.ideal.a, b: m.ideal.b, r: m.ideal.r, cv: m.ideal.cv } };
  }

  return {
    VERSION, HOME, NAMES, VAR_SPEC, EXTRA_SPEC, SPEC, VAR_KEYS, PRESETS, MAIN_PAIRS, EGO_MARKERS, MAX_CHECKPOINTS, MAX_SIM,
    VIRTUE_LINKS, TENDENCY_LINKS, catholicOn, applyWords, catholicView, catholicLines,
    defaultState, defaultVars, validateVars, clampExtra, lambdaHard, distance, cosine, dmax, combine, combine1, weights, setWeight, defaultWeight,
    egoScore, fromText, hidden, ideal, metrics, lines, idealWords, weekLines, todayWords,
    baselineSeries, withBaseline, recordDay, dailyView, lastWeek,
    simulate, stepRate, recovery, recText, presetFramework, currentFramework, findFramework, applyFramework, saveFramework, compare, optimize, titleOf,
    serialize, parse, stamp, addCheckpoint, restore, story, acceptStep, refreshIdeal, fromObj, toObj,
  };
})();

if (typeof module !== "undefined") module.exports = Workspace;
