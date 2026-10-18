// features/scientist.js — "Show the math" (was Ada the Otter, the Scientist).
// Shows every number behind the card, including the grandiosity signal g,
// the hidden-conflict strengths c, the positive-emotion scores, and inner
// peace: P with its factors, the gradient, the lever, n*, e*, and the
// convergence proof sketch; the forgiveness scores F_self, F_other, the
// path, ΔP_F and the Grace recommendation; and the practice pick.
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
    // Same pass (core/reality.js): grandiosity, hidden conflicts, positive emotions.
    const g = m.grand || { g: 0, raw: 0, kinds: [] };
    L.push(`g = 1 \u2212 e^(\u2212raw), raw = 0.6\u00B7grand + 0.5\u00B7certain-worst + 0.25\u00B7all-or-nothing + 0.1\u00B7min(3, absolutist) = ${f2(g.raw)} \u2192 g = ${f2(g.g)}${g.kinds.length ? ` (${g.kinds.join(", ")})` : ""}; adds 0.5\u00B7g to rumination and fusion`);
    L.push("conflict c = \u221A(x_i\u00B7y_j): hard/process x \u2265 0.30 with grounding y = e \u2265 0.60 (pull toward) or y = 1 \u2212 e when e \u2264 0.40 (need); clashes in the words c = 0.50");
    (m.conflicts || []).forEach(c => L.push(c.from === "words" ? `  clash in the words (${c.a}): c = ${f2(c.c)}` : `  ${label(c.a)} ${f2(c.x)} \u00D7 ${c.side === "need" ? `need for ${c.b}` : c.b} ${f2(c.y)}: c = \u221A(${f2(c.x)}\u00B7${f2(c.y)}) = ${f2(c.c)}`));
    L.push(`positives from gain_j = |e_j \u2212 h_j| \u2212 |next_j \u2212 h_j|: ${(m.positives || []).map(p => `${p.word} ${f2(p.score)}`).join(", ") || "none"}`);
    // Inner peace (core/peace.js) and its solve.
    const p = m.peace;
    if (p) {
      const V2 = state.vars;
      L.push(`P = 1/(1 + (d/d\u2080)\u00B2)\u00B7(1 \u2212 \u03B3\u00B7C_max)\u00B7(1 \u2212 \u03B4\u00B7g) = ${f2(p.Pd)}\u00B7${f2(p.Pc)}\u00B7${f2(p.Pg)} = ${f2(p.P)} (d = ${f2(p.d)}, d\u2080 = ${f2(V2.d0)}, C_max = ${f2(p.Cmax)}, \u03B3 = ${f2(V2.gamma)}, g = ${f2(p.g)}, \u03B4 = ${f2(V2.delta)})`);
      if (p.grad) L.push(`\u2202P/\u2202e: ${NAMES.map((n, i) => `${label(n)} ${p.grad[i] >= 0 ? "+" : ""}${p.grad[i].toFixed(3)}`).join(", ")}`);
      if (p.lever) L.push(`lever = argmax \u0394P_i for e_i \u2192 h_i by 0.05: ${p.lever.name ? `${p.lever.kind} ${label(p.lever.name)} (\u0394P = +${p.lever.dP.toFixed(3)})` : "none (already at home)"}`);
      if (p.solve) {
        const sv = p.solve;
        L.push(`n* = steps until P \u2265 0.80: ${sv.n === null ? `not reached in ${sv.steps} steps` : sv.n}`);
        L.push(`e* (fixed point after ${sv.steps} steps${sv.converged ? "" : ", not converged"}): ${NAMES.map((n, i) => `${label(n)} ${f2(sv.eStar[i])}`).join(", ")}; \u2016e* \u2212 h\u2016 = ${f2(sv.dStar)}, P(e*) = ${f2(sv.PStar)}`);
      }
      L.push("convergence: grounding next \u2212 h = (1 \u2212 a)(e \u2212 h); hard/process 0 \u2264 next \u2264 (1 \u2212 a)e (s \u2264 0, clip at 0 = h)");
      L.push(`  \u21D2 \u2016next \u2212 h\u2016 \u2264 (1 \u2212 a)\u2016e \u2212 h\u2016 with a \u2265 min(a0, a_max, a_cap) = ${f2(Math.min(V2.aBase, V2.aMax, FIXED.aCap))} > 0: a contraction to e* = h, where P = 1 (rounding to 0.01 stops within 0.005/a)`);
    }
    // Forgiveness (features/forgiveness.js) and the practice pick (features/practices.js).
    const f = m.forgive;
    if (f) {
      L.push(`F_self = e_shame\u00B7(0.4 + 0.6\u00B7c_self) = ${f2(m.e[idx.shame])}\u00B7(0.4 + 0.6\u00B7${f2(f.cSelf)}) = ${f2(f.Fself)};  F_other = e_anger\u00B7(0.4 + 0.6\u00B7c_other) = ${f2(m.e[idx.anger])}\u00B7(0.4 + 0.6\u00B7${f2(f.cOther)}) = ${f2(f.Fother)}`);
      L.push(`forgiveness path (\u03B8_F = 0.35): ${f.path || "none"};  \u0394P_F self ${f.dP.self >= 0 ? "+" : ""}${f.dP.self.toFixed(3)}, other ${f.dP.other >= 0 ? "+" : ""}${f.dP.other.toFixed(3)};  Grace recommended: ${f.grace ? "yes (lever in the path's movers)" : "no"}`);
    }
    // True size, the small side (core/reality.js) and the freeing mix (features/freeing.js).
    if (m.small) L.push(`u = 1 \u2212 e^(\u22120.7k) (putting yourself down, k = ${m.small.k}${m.small.chip ? ", the chip" : ""}) = ${f2(m.small.u)}; true size max(g, u) = ${f2(m.tsize || 0)} in P_g = 1 \u2212 \u03B4\u00B7max(g, u); adds shame +0.20, hope \u22120.20`);
    const fr = m.freeing;
    if (fr) {
      L.push(`freeing mix: max J = P \u2212 \u03BC\u00B7N, \u03BC = ${f2(fr.mu)}, N = e_shame + c_self\u00B7e_rumination + u\u00B7max(0, h_hope \u2212 e_hope) (c_self = ${f2(fr.cSelf)}, u = ${f2(fr.u)})`);
      L.push(`  moves: \u2264 ${fr.K} movers per step, one band each toward h (ladder 0, 0.15, 0.45, 0.80), master's step direction; keep P' \u2265 P and shame' \u2264 shame; \u2264 ${fr.T} steps, exhaustive over the subsets`);
      fr.steps.forEach((st, k) => L.push(`  step ${k + 1}: ${st.moves.map(x => `${label(x.name)} ${f2(x.from)}\u2192${f2(x.to)}`).join(", ")}; P = ${f2(st.P)}, J = ${f2(st.J)}`));
      L.push(`  P ${f2(fr.P0)} \u2192 ${f2(fr.P1)}, N ${f2(fr.N0)} \u2192 ${f2(fr.N1)}, J ${f2(fr.J0)} \u2192 ${f2(fr.J1)}${fr.steps.length ? "" : " (no feasible move raises J)"}`);
    }
    if ("wait" in m) L.push(`practice = pick(lever, e, d, c_wait = ${f2(m.wait || 0)}) \u2192 ${m.practice ? `${m.practice.id} for ${label(m.practice.mover)}` : "none (the mover's own step)"}`);
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
    VAR_SPEC.forEach(([k, , min, max, hint]) => field("var", k, ({ aBase: "a0", aMax: "a_max", d0: "d\u2080", gamma: "\u03B3", delta: "\u03B4" })[k] || k, min, max, hint));
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
