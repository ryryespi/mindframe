// features/scientist.js — Ada the Otter, the Scientist.
//
// Shows the math behind the words and lets you tinker with it:
//   • mathLines: e, the master equation with its values, λ, loops, the hidden
//     rise, act(), the baseline and the recovery count
//   • the nine mover sliders ("adjust numbers")
//   • the variables a0, k, a_max, b, decay, home targets and main W links,
//     with Reset to defaults
// Nothing here computes a step; it only displays master's output.

if (typeof module !== "undefined") {
  require("../core/master.js");
  require("./historian.js");
}

(function (MF) {
  "use strict";
  const { NAMES, HARD, GROUND, FIXED, VAR_SPEC, ACTIVE, idx, homeVec, f2, sgn, label, defaultVars, validateVars, weights, setWeight, MAIN_PAIRS } = MF.Movers;
  const { recText } = MF.Master;
  // ---------- The math behind the card ----------
  /** Movers worth showing in the math view: hard/process ≥ 0.1, grounding 0.1 or more from 0.5. */
  function shown(e) {
    return NAMES.map((n, i) => ({ name: n, label: label(n), v: e[i], group: HARD.includes(n) ? "hard" : GROUND.includes(n) ? "grounding" : "process" }))
      .filter(x => (x.group === "grounding" ? Math.abs(x.v - 0.5) >= 0.1 : x.v >= ACTIVE));
  }
  /** The math behind the card: e, the master equation with its values, λ, loops, baseline and recovery. */
  function mathLines(state, m) {
    const V = state.vars, L = [];
    const mv = shown(m.e);
    L.push(`e: ${mv.length ? mv.map(x => `${x.label} ${f2(x.v)}`).join(", ") : "at rest"}`);
    L.push("step = act(clip01(e + a(e)\u00B7(h \u2212 e) + b\u00B7s(e)))");
    const raw = V.aBase + V.k * m.d;
    L.push(`a(e) = min(a_max, a0 + k\u2016e \u2212 h\u2016) = min(${f2(V.aMax)}, ${f2(V.aBase)} + ${f2(V.k)}\u00B7${f2(m.d)}) = ${f2(Math.min(V.aMax, raw))}${m.unstable ? `, capped at a_cap = ${f2(FIXED.aCap)} (\u03BB > 0) \u2192 ${f2(m.a)}` : ""}`);
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


  // ---------- Panel (browser only) ----------
  /**
   * Mount the Scientist panel: the math (after Update), the nine mover sliders,
   * and the model variables (a0, k, a_max, b, decay, home targets, main W links)
   * with Reset to defaults. Changing a number marks the reading as out of date;
   * nothing is recomputed until Update is pressed.
   * @param {object} app the app shell (see js/app.js)
   * @returns {function} render
   */
  /** Mount this feature's panel. */
  function mount(app) {
    const { $ } = app;
    // Mover sliders
    const box = $("sliders");
    NAMES.forEach((n, i) => {
      const lab = document.createElement("label");
      const name = document.createElement("span");
      name.textContent = label(n);
      const inp = document.createElement("input");
      Object.assign(inp, { type: "range", min: 0, max: 1, step: 0.01 });
      inp.dataset.i = i;
      inp.setAttribute("aria-label", label(n));
      const v = document.createElement("span");
      v.className = "v mono";
      lab.append(name, inp, v);
      box.appendChild(lab);
      inp.addEventListener("input", () => {
        const x = Math.round(Number(inp.value) * 100) / 100;
        app.setBaseValue(i, x);
        v.textContent = f2(x);
        app.stale();
      });
    });
    // Variables
    const grid = $("var-grid");
    const field = (kind, key, text, min, max, hint) => {
      const lab = document.createElement("label");
      const span = document.createElement("span");
      span.textContent = text;
      const inp = document.createElement("input");
      Object.assign(inp, { type: "number", min, max, step: 0.01 });
      inp.dataset.kind = kind;
      inp.dataset.key = key;
      inp.setAttribute("aria-label", `${text}: ${hint}`);
      lab.title = hint;
      lab.append(span, inp);
      grid.appendChild(lab);
    };
    GROUND.forEach(n => field("home", n, `h.${n}`, 0, 1, `home target for ${n}`));
    VAR_SPEC.forEach(([k, , min, max, hint]) => field("var", k, k === "aBase" ? "a0" : k === "aMax" ? "a_max" : k, min, max, hint));
    MAIN_PAIRS.forEach(([a, b]) => field("w", `${a}>${b}`, `${a}\u2192${b}`, -1, 1, `how much ${a} changes ${b}`));
    grid.addEventListener("change", ev => {
      const inp = ev.target;
      if (!inp.dataset.kind) return;
      const { kind, key } = inp.dataset, x = Number(inp.value), notes = [];
      let s = app.state;
      if (kind === "home") {
        const c = Math.min(1, Math.max(0, Math.round((Number.isFinite(x) ? x : 0) * 100) / 100));
        if (c !== x) notes.push(`h.${key}: kept inside 0\u20131`);
        const home = s.home.slice();
        home[idx[key]] = c;
        s = { ...s, home };
      } else if (kind === "var") {
        const v = validateVars({ ...s.vars, [key]: x });
        s = { ...s, vars: v.vars };
        notes.push(...v.notes);
      } else {
        const [a, b] = key.split(">");
        const c = Math.min(1, Math.max(-1, Number.isFinite(x) ? x : 0));
        if (c !== x) notes.push(`${a}\u2192${b}: kept inside \u22121 to 1`);
        s = setWeight(s, a, b, c);
      }
      app.state = s;
      $("var-notes").textContent = notes.join("; ");
      app.save();
      renderInputs();
      app.stale();
    });
    $("vars-reset").addEventListener("click", () => {
      app.state = { ...app.state, vars: defaultVars(), home: homeVec(), w: [] };
      $("var-notes").textContent = "";
      app.save();
      renderInputs();
      app.stale();
    });
    function renderInputs() {
      const s = app.state, W = weights(s.w), base = app.base();
      box.querySelectorAll("label").forEach((lab, i) => {
        const inp = lab.querySelector("input");
        if (document.activeElement !== inp) inp.value = base[i];
        lab.querySelector(".v").textContent = f2(base[i]);
      });
      grid.querySelectorAll("input").forEach(inp => {
        const { kind, key } = inp.dataset;
        const v = kind === "home" ? s.home[idx[key]] : kind === "var" ? s.vars[key] : W[idx[key.split(">")[0]]][idx[key.split(">")[1]]];
        if (document.activeElement !== inp) inp.value = Number(v).toFixed(2);
      });
    }
    return function render() {
      const m = app.m(), ul = $("movers"), ml = $("math-lines");
      ul.innerHTML = "";
      ml.innerHTML = "";
      if (!m) ml.appendChild(app.li("Tap Update to see the math."));
      else {
        shown(m.e).forEach(x => {
          const el = document.createElement("li");
          el.className = x.group;
          const name = document.createElement("span");
          name.textContent = x.label + (x.group === "grounding" && x.v < 0.5 ? " (low)" : "");
          const bar = document.createElement("span");
          bar.className = "bar";
          const fill = document.createElement("span");
          fill.style.width = `${Math.round(x.v * 100)}%`;
          bar.appendChild(fill);
          const v = document.createElement("span");
          v.className = "v";
          v.textContent = f2(x.v);
          el.append(name, bar, v);
          ul.appendChild(el);
        });
        mathLines(app.state, m).concat(MF.Historian.weekMath(app.state)).forEach(t => ml.appendChild(app.li(t)));
      }
      renderInputs();
    };
  }

  MF.Scientist = { shown, mathLines, mount };
})(typeof window !== "undefined" ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
if (typeof module !== "undefined") module.exports = global.MF.Scientist;
