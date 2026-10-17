// workspace.js — the Equation Workspace: vector math, the .mf code language,
// checkpoints, the ideal step, and the step story. Pure logic, no DOM.
//
// A MODEL built from design assumptions, not validated science. All local.
//
//   e        current emotion vector, 10 values in [0,1] (see emotions.js)
//   h        home vector ("a positive reality"): joy .6, hope .8, calm .8,
//            connection .8, every hard feeling 0. Adjustable in the code.
//   d        = ‖e − h‖                      distance from home
//   cos      = e·h / (‖e‖‖h‖)               alignment with home (0 if e = 0)
//   words    new words add to the base:  e = 1 − (1 − base)(1 − words)
//   hidden   feelings not named (e ≤ 0.1) that the W dynamics raise by ≥ 0.15
//            within k steps, plus pattern amplifiers found in the words
//   ideal    e' = e + a·(h − e) + b·s(e)
//            s_j = e_j · Σ_{i helpful} min(0, W_ij)·h_i   for hard j above home
//            (the pull of home's helpful feelings on the hard ones), and no
//            coordinate ever passes its home value, so d always shrinks.
//            a = clamp(0.2·(0.5 + d/dmax), 0.05, 0.25); when λ > 0 the step is
//            smaller: a = max(0.05, min(0.12, a/(1 + 4λ))), and b = 0.15.
//   λ        here is computed on the active hard feelings only (see lambdaHard).

const Workspace = (function () {
  const E = typeof Emotions !== "undefined" ? Emotions : require("./emotions.js");
  const G = typeof Grounding !== "undefined" ? Grounding : require("./grounding.js");
  const S = typeof Stories !== "undefined" ? Stories : require("./stories.js");

  const NAMES = E.NAMES;
  const N = NAMES.length;
  const idx = Object.fromEntries(NAMES.map((n, i) => [n, i]));
  const HELPFUL = NAMES.map(n => E.POSITIVE.has(n));
  const HOME = { joy: 0.6, hope: 0.8, calm: 0.8, connection: 0.8 };
  const VERSION = 1;
  const A_BASE = 0.2, A_MIN = 0.05, A_MAX = 0.25, A_UNSTABLE = 0.12, B_STABLE = 0.1, B_UNSTABLE = 0.15;
  const HIDDEN_RISE = 0.15, MAX_CHECKPOINTS = 50, MAX_LINES = 400, MAX_W = 40;

  const r2 = x => Math.round(x * 100) / 100;
  const clamp01 = x => Math.min(1, Math.max(0, x));
  const zero = () => new Array(N).fill(0);
  const fromObj = o => NAMES.map(n => r2(clamp01(Number(o[n]) || 0)));
  const toObj = v => Object.fromEntries(NAMES.map((n, i) => [n, v[i]]).filter(([, x]) => x > 0));

  function defaultState() {
    return { v: VERSION, home: fromObj(HOME), e: zero(), steps: E.STEPS, w: [], cps: [], ideal: null };
  }

  // ---------- Vectors ----------
  const norm = v => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  const distance = (a, b) => norm(a.map((x, i) => x - b[i]));
  function cosine(a, b) {
    const na = norm(a), nb = norm(b);
    return na && nb ? a.reduce((s, x, i) => s + x * b[i], 0) / (na * nb) : 0;
  }
  // Farthest any vector can be from h.
  const dmax = h => norm(h.map(x => Math.max(x, 1 - x)));
  // New words add to what is already there.
  const combine = (base, words) => base.map((b, i) => r2(1 - (1 - b) * (1 - words[i])));

  // λ for the workspace: the largest real eigenvalue on the active HARD
  // feelings only. A helpful feeling pushing a hard one down (a tug-of-war
  // that home wins) is not counted as instability here.
  function lambdaHard(e, W = E.W) {
    return E.lambda(e.map((x, i) => (HELPFUL[i] ? 0 : x)), W).lambda;
  }

  // W with the code's overrides applied.
  function weights(w = []) {
    if (!w.length) return E.W;
    const edges = E.EDGES.filter(([a, b]) => !w.some(o => o.from === a && o.to === b));
    return E.matrix(edges.concat(w.map(o => [o.from, o.to, o.w])));
  }

  // Words -> vector. Crisis text gives { crisis: true } and nothing else.
  function fromText(text) {
    const t = String(text || "");
    if (!t.trim()) return { crisis: false, e: zero(), notes: [] };
    if (G.isCrisis(t)) return { crisis: true };
    const r = E.analyze(t);
    if (r.crisis) return { crisis: true };
    return { crisis: false, e: r.e.map(r2), notes: r.notes.slice() };
  }

  // ---------- Hidden variables ----------
  function hidden(e, W, steps, notes = []) {
    const proj = E.project(e, steps, W);
    const out = [];
    NAMES.forEach((n, j) => {
      const rise = proj[j] - e[j];
      if (e[j] > E.ACTIVE || rise < HIDDEN_RISE) return;
      let via = null, best = 0;
      NAMES.forEach((m, i) => { if (i !== j && W[i][j] > 0 && W[i][j] * e[i] > best) { best = W[i][j] * e[i]; via = m; } });
      out.push({ kind: "dynamics", name: n, from: e[j], to: r2(proj[j]), via });
    });
    out.sort((a, b) => (b.to - b.from) - (a.to - a.from));
    [...new Set(notes)].forEach(note => out.push({ kind: "pattern", note }));
    return out;
  }

  // ---------- The ideal step ----------
  function ideal(e, opts = {}) {
    const h = opts.home || fromObj(HOME);
    const W = opts.W || E.W;
    const lam = lambdaHard(e, W);
    const d = distance(e, h);
    let a = Math.min(A_MAX, Math.max(A_MIN, A_BASE * (0.5 + d / dmax(h))));
    let b = B_STABLE;
    const unstable = lam !== null && lam > 0;
    if (unstable) { a = Math.max(A_MIN, Math.min(A_UNSTABLE, a / (1 + 4 * lam))); b = B_UNSTABLE; }
    a = r2(a); b = r2(b);
    const pull = NAMES.map((n, j) => (HELPFUL[j] ? 0 : NAMES.reduce((s, m, i) => s + (HELPFUL[i] ? Math.min(0, W[i][j]) * h[i] : 0), 0)));
    const next = e.map((x, j) => {
      let y = x + a * (h[j] - x);
      if (!HELPFUL[j] && x > h[j]) y += b * x * pull[j];
      // Never pass home: each value only moves toward its home value.
      y = x > h[j] ? Math.max(h[j], y) : Math.min(h[j], y);
      y = r2(clamp01(y));
      // Values are kept to 0.01; a tiny step still moves by at least 0.01.
      if (y === x && x !== h[j]) y = r2(x + (h[j] > x ? 0.01 : -0.01));
      return y;
    });
    // What to work on: unstable loops first, then the biggest gaps to home.
    const work = [];
    const rel = E.relations(e, W);
    rel.loops.filter(l => l.kind === "unstable").forEach(l => work.push({ kind: "loop", a: l.a, b: l.b, u: l.u }));
    NAMES.map((n, i) => ({ kind: "gap", name: n, gap: r2(Math.abs(h[i] - e[i])), dir: h[i] > e[i] ? "up" : "down" }))
      .filter(g => g.gap >= 0.1).sort((x, y) => y.gap - x.gap || x.name.localeCompare(y.name)).slice(0, 3).forEach(g => work.push(g));
    const strongest = pull.map((p, j) => ({ j, p: p * e[j] })).filter(x => !HELPFUL[x.j] && e[x.j] > h[x.j]).sort((x, y) => x.p - y.p)[0];
    const targets = work.filter(w => w.kind === "loop").slice(0, 1).flatMap(w => [w.a, w.b]);
    if (!targets.length && strongest) targets.push(NAMES[strongest.j]);
    const stab = targets.length ? E.stabilizer(targets, W) : null;
    return { a, b, lambda: lam, unstable, d: r2(d), next, dNext: r2(distance(next, h)), work, stabilizer: stab, targets };
  }

  // Everything the live view needs.
  function metrics(state, notes = []) {
    const W = weights(state.w);
    const e = state.e, h = state.home;
    const rel = E.relations(e, W);
    return {
      d: r2(distance(e, h)), cos: r2(cosine(e, h)), lambda: lambdaHard(e, W),
      loops: rel.loops, unstable: rel.loops.filter(l => l.kind === "unstable"),
      hidden: hidden(e, W, state.steps, notes), ideal: ideal(e, { home: h, W }),
    };
  }

  // ---------- Plain equation lines ----------
  const f2 = x => x.toFixed(2);
  const sgn = x => (x > 0 ? "+" : x < 0 ? "\u2212" : "") + Math.abs(x).toFixed(2);
  const vecText = v => {
    const parts = NAMES.map((n, i) => [n, v[i]]).filter(([, x]) => x > 0).sort((a, b) => b[1] - a[1]).map(([n, x]) => `${n} ${f2(x)}`);
    return parts.length ? `(${parts.join(", ")})` : "(0)";
  };

  function lines(state, m) {
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
    L.push(`ideal: e\u2032 = e + ${f2(id.a)}\u00B7(h \u2212 e) + ${f2(id.b)}\u00B7s(e) \u2192 d\u2032 = ${f2(id.dNext)}`);
    const work = id.work.map(w => (w.kind === "loop" ? `${w.a} \u00D7 ${w.b} loop` : `${w.name} ${w.dir === "up" ? "\u2191" : "\u2193"} (gap ${f2(w.gap)})`));
    if (work.length) L.push(`work on: ${work.join("; ")}`);
    if (id.stabilizer) L.push(`stabilizer: ${id.stabilizer.name} \u2192 ${id.stabilizer.skill}, with ${id.stabilizer.creature}`);
    return L;
  }

  // Plain words for the ideal step.
  function idealWords(m) {
    const id = m.ideal;
    if (m.d === 0) return "You are at home. Nothing to move.";
    const pct = Math.round(id.a * 100);
    const why = id.unstable ? " The mix is unstable, so the step is kept small." : "";
    const helper = id.stabilizer ? ` Let ${id.stabilizer.name} press on ${id.targets.join(" and ")} (try: ${id.stabilizer.skill}).` : "";
    return `Move ${pct}% of the way home.${helper}${why} Distance ${f2(id.d)} \u2192 ${f2(id.dNext)}.`;
  }

  // ---------- The code language (.mf) ----------
  // Line-based plain data. Never evaluated, only matched against these shapes:
  //   mf 1
  //   home name=v ...            e name=v ...            steps k
  //   w from>to=v                cp n YYYY-MM-DDTHH:MM label=x name=v ... lambda=v
  //   ideal a=v b=v              eq ...   (readable, rebuilt on save, ignored on read)
  //   # comment
  const NUM = "-?(?:\\d+(?:\\.\\d*)?|\\.\\d+)";
  const PAIR = new RegExp(`^([a-z]+)=(${NUM})$`);
  const LABEL = /^[a-z0-9-]{1,24}$/;
  const TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

  const vecCode = v => NAMES.map((n, i) => [n, v[i]]).filter(([, x]) => x > 0).map(([n, x]) => `${n}=${f2(x)}`).join(" ");
  const num = x => (Object.is(r2(x), -0) ? 0 : r2(x)).toFixed(2);

  function serialize(state) {
    const out = [`mf ${VERSION}`];
    out.push(`home ${vecCode(state.home)}`.trimEnd());
    out.push(`e ${vecCode(state.e)}`.trimEnd());
    out.push(`steps ${state.steps}`);
    state.w.forEach(o => out.push(`w ${o.from}>${o.to}=${num(o.w)}`));
    state.cps.forEach(c => out.push(`cp ${c.n} ${c.t} label=${c.label} ${vecCode(c.e)} lambda=${num(c.lambda)}`.replace(/  +/g, " ")));
    if (state.ideal) {
      out.push(`ideal a=${num(state.ideal.a)} b=${num(state.ideal.b)}`);
      out.push(`eq e' = e + ${num(state.ideal.a)}*(h - e) + ${num(state.ideal.b)}*s(e)`);
    }
    return out.join("\n") + "\n";
  }

  function parse(text) {
    const errors = [];
    const err = (line, msg) => errors.push({ line, msg: `Line ${line}: ${msg}` });
    const raw = String(text || "").replace(/\r\n?/g, "\n").split("\n");
    if (raw.length > MAX_LINES) return { ok: false, errors: [{ line: 0, msg: `That code is too long (more than ${MAX_LINES} lines).` }] };
    const state = defaultState();
    let sawHeader = false, sawHome = false, crisis = false;

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
        case "steps": {
          const k = Number(rest[0]);
          if (rest.length !== 1 || !Number.isInteger(k) || k < 1 || k > 50) err(n, "steps should be a whole number from 1 to 50.");
          else state.steps = k;
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
          const { vec, ex } = readVec(vals, n, { lambda: true });
          state.cps.push({ n: k, t, label: lm[1], e: vec, lambda: r2(Number.isFinite(ex.lambda) ? ex.lambda : 0) });
          break;
        }
        case "ideal": {
          const m = line.match(new RegExp(`^ideal a=(${NUM}) b=(${NUM})$`));
          if (!m || Number(m[1]) < 0 || Number(m[1]) > 1 || Number(m[2]) < 0 || Number(m[2]) > 1) { err(n, "ideal looks like ideal a=0.10 b=0.15 (each 0 to 1)."); break; }
          state.ideal = { a: r2(Number(m[1])), b: r2(Number(m[2])) };
          break;
        }
        case "eq": break; // readable copy of the ideal line
        case "mf": err(n, "the header appears twice."); break;
        default: err(n, `\u201C${kw}\u201D isn't a keyword (mf, home, e, steps, w, cp, ideal, eq).`);
      }
    });
    if (crisis) return { ok: false, crisis: true, errors: [] };
    if (!sawHeader) return { ok: false, errors: [{ line: 0, msg: "Nothing to import yet. Paste code that starts with \u201Cmf 1\u201D." }] };
    return errors.length ? { ok: false, errors } : { ok: true, state };
  }

  // ---------- Checkpoints ----------
  function stamp(ts) {
    const d = new Date(ts), p = x => String(x).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  function addCheckpoint(state, label, ts = Date.now()) {
    const n = state.cps.length ? state.cps[state.cps.length - 1].n + 1 : 1;
    const lam = lambdaHard(state.e, weights(state.w));
    const cp = { n, t: stamp(ts), label: LABEL.test(label || "") ? label : `cp-${n}`, e: state.e.slice(), lambda: r2(lam === null ? 0 : lam) };
    const cps = state.cps.concat(cp).slice(-MAX_CHECKPOINTS);
    return { ...state, cps };
  }

  function restore(state, n) {
    const cp = state.cps.find(c => c.n === n);
    return cp ? { ...state, e: cp.e.slice() } : state;
  }

  // ---------- The step story ----------
  // A calm fictional story, driven by the ideal step. Reuses stories.js.
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

  function story(state, m, opts = {}) {
    const id = m.ideal;
    const h = state.home;
    if (!m.d) return null;
    const gaps = NAMES.map((n, i) => ({ n, i, gap: Math.abs(h[i] - state.e[i]), hard: !HELPFUL[i] && state.e[i] > h[i] }));
    const hardTop = gaps.filter(g => g.hard).sort((a, b) => b.gap - a.gap)[0];
    const top = hardTop || gaps.sort((a, b) => b.gap - a.gap)[0];
    const stab = id.stabilizer;
    const guide = stab ? stab.creature : S.PATTERN_CREATURE.none;
    const arc = hardTop ? ARC_FOR[hardTop.n] : "none";
    const read = { patterns: [arc], reframes: [REFRAME_FOR[top.n] || "This is a feeling, not a fact."] };
    const step = stab ? STEP_FOR[stab.name] : STEP_FOR.calm;
    const base = S.tell({ read, character: guide, step, seed: opts.seed || 1, faith: false });
    if (base.crisis) return null;
    const from = state.e[top.i], to = id.next[top.i];
    const map = `They kept a small map of feelings, and on it ${top.n} sat at ${f2(from)}, the farthest point from home.`;
    const helper = stab ? `They knew ${stab.name} could pull on it, so the plan stayed small and real.` : "The plan stayed small and real.";
    const landing = `On the map, ${top.n} moved from ${f2(from)} to ${f2(to)}, and the way home grew ${f2(Math.max(0, id.d - id.dNext))} shorter. Not all the way. Just closer.`;
    const b = base.sentences;
    const sentences = [b[0], map, helper, ...b.slice(1, -1), landing, b[b.length - 1]];
    return { guide, tag: base.tag, focus: top.n, from, to, sentences, text: sentences.join(" "), next: id.next };
  }

  // Take the ideal step: it becomes the new current vector and a checkpoint.
  function acceptStep(state, ts = Date.now()) {
    const m = metrics(state);
    const s = { ...state, e: m.ideal.next.slice() };
    const n = state.cps.filter(c => /^step-\d+$/.test(c.label)).length + 1;
    const withCp = addCheckpoint(s, `step-${n}`, ts);
    return { ...withCp, ideal: { a: m.ideal.a, b: m.ideal.b } };
  }

  // Keep the stored ideal in step with the current vector.
  function refreshIdeal(state) {
    const m = metrics(state);
    return { ...state, ideal: { a: m.ideal.a, b: m.ideal.b } };
  }

  return {
    VERSION, HOME, NAMES, A_BASE, A_MIN, A_MAX, A_UNSTABLE, B_STABLE, B_UNSTABLE, HIDDEN_RISE, MAX_CHECKPOINTS,
    defaultState, lambdaHard, distance, cosine, dmax, combine, weights, fromText, hidden, ideal, metrics, lines, idealWords,
    serialize, parse, stamp, addCheckpoint, restore, story, acceptStep, refreshIdeal, fromObj, toObj,
  };
})();

if (typeof module !== "undefined") module.exports = Workspace;
