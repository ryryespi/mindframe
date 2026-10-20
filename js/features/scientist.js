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

if (typeof window === "undefined") require("../data/strings.js");
(function (MF) {
  "use strict";
  const Str = MF.Strings;   // every word lives in js/data/strings.js
  const { NAMES, HARD, GROUND, FIXED, VAR_SPEC, ACTIVE, idx, homeVec, f2, sgn, label, defaultVars, validateVars, weights, setWeight, MAIN_PAIRS } = MF.Movers;
  const { recText } = MF.Master;
  // ---------- The math behind the card ----------
  /** Movers worth showing in the math view: hard/process ≥ 0.1, grounding 0.1 or more from 0.5. */
  function shown(e) {
    return NAMES.map((n, i) => ({ name: n, label: label(n), v: e[i], group: HARD.includes(n) ? "hard" : GROUND.includes(n) ? "grounding" : "process" }))
      .filter(x => (x.group === "grounding" ? Math.abs(x.v - 0.5) >= 0.1 : x.v >= ACTIVE));
  }
  /** The math behind the card: e, the master equation with its values, λ, loops, baseline and recovery. */
  function mathLines(state, m, opts = {}) {
    const V = state.vars, L = [];
    const mv = shown(m.e);
    // The whole model on one page (core/master.js header; README).
    MF.Master.ONE_PAGE.forEach(x => L.push(x));
    if (opts.faith) L.push(Str.t("scientist.mathLines.h_home_with_faith_on", { FAITH_HOME: MF.Master.FAITH_HOME }));
    L.push(`e: ${mv.length ? mv.map(x => `${x.label} ${f2(x.v)}`).join(", ") : Str.t("freeing.line.at_rest")}`);
    // The Kai shield (core/kai.js): the X(1 \u2212 S)\u00B7w term of line (1).
    if (MF.Kai) MF.Kai.mathLines(m).forEach(x => L.push(x));
    L.push(Str.t("scientist.mathLines.step_act_clip01_e_a"));
    const raw = V.aBase + V.k * m.d;
    L.push(Str.t("scientist.mathLines.a_e_min_a_max", { v0: f2(V.aMax), v1: f2(V.aBase), v2: f2(V.k), v3: f2(m.d), v4: f2(Math.min(V.aMax, raw)), v5: m.unstable ? Str.t("scientist.mathLines.capped_at_a_cap_0", { v0: f2(FIXED.aCap), v1: f2(m.a) }) : "" }));
    L.push(`b = ${f2(m.b)}${m.unstable ? " (b_U, \u03BB > 0)" : ""}`);
    L.push(Str.t("scientist.mathLines.d_e_h_after_one", { v0: f2(m.d), v1: f2(m.dNext) }));
    L.push(`\u03BB = \u03C1(W_active) \u2212 d = ${m.lambda === null ? Str.t("scientist.mathLines.none_nothing_active") : `${sgn(m.lambda)} (${m.unstable ? "unstable" : "settles"})`}`);
    if (m.loops[0]) L.push(Str.t("scientist.mathLines.strongest_loop_gain", { v0: label(m.loops[0].a), v1: label(m.loops[0].b), v2: f2(m.loops[0].gain) }));
    if (m.hidden[0]) L.push(Str.t("scientist.mathLines.hidden_rise_in_steps", { v0: label(m.hidden[0].name), v1: f2(m.hidden[0].from), v2: f2(m.hidden[0].to), k: FIXED.k, v4: m.hidden[0].via ? ` via ${label(m.hidden[0].via)}` : "" }));
    L.push(Str.t("scientist.mathLines.act_stabilizer", { v0: m.mover ? Str.t("scientist.mathLines.moves_most_toward_home", { v0: label(m.mover) }) : Str.t("scientist.mathLines.no_move"), v1: m.stabilizer || "none" }));
    L.push(`B = 0.8\u00B7B\u208B\u2081 + 0.2\u00B7e: \u2016B \u2212 h\u2016 = ${f2(m.baseline.dB)}${m.baseline.dPrev === null ? "" : ` (yesterday's B: ${f2(m.baseline.dPrev)})`}`);
    if (m.recovery) L.push(Str.t("scientist.mathLines.recovery_until_d_model_estimate", { v0: recText(m.recovery), v1: f2(FIXED.eps) }));
    // Same pass (core/reality.js): grandiosity, hidden conflicts, positive emotions.
    const g = m.grand || { g: 0, raw: 0, kinds: [] };
    L.push(Str.t("scientist.mathLines.g_1_e_raw_raw", { v0: f2(g.raw), v1: f2(g.g), v2: g.kinds.length ? ` (${g.kinds.join(", ")})` : "" }));
    L.push(Str.t("scientist.mathLines.conflict_c_x_i_y"));
    (m.conflicts || []).forEach(c => L.push(c.from === "words" ? Str.t("scientist.clash_in_the_words_c", { a: c.a, v1: f2(c.c) }) : `  ${label(c.a)} ${f2(c.x)} \u00D7 ${c.side === "need" ? Str.t("scientist.need_for", { b: c.b }) : c.b} ${f2(c.y)}: c = \u221A(${f2(c.x)}\u00B7${f2(c.y)}) = ${f2(c.c)}`));
    L.push(Str.t("scientist.mathLines.positives_from_gain_j_e", { v0: (m.positives || []).map(p => `${p.word} ${f2(p.score)}`).join(", ") || "none" }));
    // Inner peace (core/peace.js) and its solve.
    const p = m.peace;
    if (p) {
      const V2 = state.vars;
      L.push(Str.t("scientist.mathLines.p_1_1_d_d", { v0: f2(p.Pd), v1: f2(p.Pc), v2: f2(p.Pg), v3: f2(p.P), v4: f2(p.d), v5: f2(V2.d0), v6: f2(p.Cmax), v7: f2(V2.gamma), v8: f2(p.g), v9: f2(V2.delta) }));
      if (p.grad) L.push(`\u2202P/\u2202e: ${NAMES.map((n, i) => `${label(n)} ${p.grad[i] >= 0 ? "+" : ""}${p.grad[i].toFixed(3)}`).join(", ")}`);
      if (p.lever) L.push(Str.t("scientist.mathLines.lever_argmax_p_i_for", { v0: p.lever.name ? `${p.lever.kind} ${label(p.lever.name)} (\u0394P = +${p.lever.dP.toFixed(3)})` : Str.t("scientist.mathLines.none_already_at_home") }));
      if (p.solve) {
        const sv = p.solve;
        L.push(Str.t("scientist.mathLines.n_steps_until_p_0", { v0: sv.n === null ? Str.t("scientist.mathLines.not_reached_in_steps", { steps: sv.steps }) : sv.n }));
        L.push(Str.t("scientist.mathLines.e_fixed_point_after_steps", { steps: sv.steps, v1: sv.converged ? "" : Str.t("scientist.mathLines.not_converged"), v2: NAMES.map((n, i) => `${label(n)} ${f2(sv.eStar[i])}`).join(", "), v3: f2(sv.dStar), v4: f2(sv.PStar) }));
      }
      L.push(Str.t("scientist.mathLines.convergence_grounding_next_h_1"));
      L.push(Str.t("scientist.mathLines.next_h_1_a_e", { v0: f2(Math.min(V2.aBase, V2.aMax, FIXED.aCap)) }));
      L.push(Str.t("scientist.mathLines.the_kai_term_x_1"));
    }
    // Forgiveness (features/forgiveness.js) and the practice pick (features/practices.js).
    const f = m.forgive;
    if (f) {
      L.push(Str.t("scientist.mathLines.f_self_e_shame_0", { v0: f2(m.e[idx.shame]), v1: f2(f.cSelf), v2: f2(f.Fself), v3: f2(m.e[idx.anger]), v4: f2(f.cOther), v5: f2(f.Fother) }));
      L.push(Str.t("scientist.mathLines.forgiveness_path_f_0_35", { v0: f.path || "none", v1: f.dP.self >= 0 ? "+" : "", v2: f.dP.self.toFixed(3), v3: f.dP.other >= 0 ? "+" : "", v4: f.dP.other.toFixed(3), v5: f.grace ? Str.t("scientist.mathLines.yes_lever_in_the_path") : "no" }));
    }
    // True size, the small side (core/reality.js) and the freeing mix (features/freeing.js).
    if (m.small) L.push(Str.t("scientist.mathLines.u_1_e_0_7k", { k: m.small.k, v1: m.small.chip ? Str.t("scientist.mathLines.the_chip") : "", v2: f2(m.small.u), v3: f2(m.tsize || 0) }));
    const fr = m.freeing;
    if (fr) {
      L.push(Str.t("scientist.mathLines.freeing_mix_max_j_p", { v0: f2(fr.mu), v1: f2(fr.cSelf), v2: f2(fr.u) }));
      L.push(Str.t("scientist.mathLines.moves_movers_per_step_one", { K: fr.K, T: fr.T }));
      fr.steps.forEach((st, k) => L.push(`  step ${k + 1}: ${st.moves.map(x => `${label(x.name)} ${f2(x.from)}\u2192${f2(x.to)}`).join(", ")}; P = ${f2(st.P)}, J = ${f2(st.J)}`));
      L.push(`  P ${f2(fr.P0)} \u2192 ${f2(fr.P1)}, N ${f2(fr.N0)} \u2192 ${f2(fr.N1)}, J ${f2(fr.J0)} \u2192 ${f2(fr.J1)}${fr.steps.length ? "" : Str.t("scientist.mathLines.no_feasible_move_raises_j")}`);
    }
    if ("wait" in m) {
      const band = m.peace && MF.Peace ? MF.Peace.band(m.peace.P) : "none";
      L.push(Str.t("scientist.mathLines.practice_pick_lever_e_d", { v0: f2(m.wait || 0), v1: f2(m.tense || 0), v2: f2(m.tired || 0), band: band, v4: m.practice ? `${m.practice.id} for ${label(m.practice.mover)}` : Str.t("scientist.mathLines.none_the_mover_s_own") }));
      L.push(Str.t("scientist.mathLines.cold_water_reset_lever_fear"));
      L.push(Str.t("scientist.mathLines.brain_dump_lever_rumination_0"));
      L.push(Str.t("scientist.mathLines.short_brisk_walk_lever_sadness"));
    }
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
    GROUND.forEach(n => field("home", n, `h.${n}`, 0, 1, Str.t("scientist.home_target_for", { n: n })));
    VAR_SPEC.forEach(([k, , min, max, hint]) => field("var", k, ({ aBase: "a0", aMax: "a_max", d0: "d\u2080", gamma: "\u03B3", delta: "\u03B4" })[k] || k, min, max, hint));
    MAIN_PAIRS.forEach(([a, b]) => field("w", `${a}>${b}`, `${a}\u2192${b}`, -1, 1, Str.t("scientist.how_much_changes", { a: a, b: b })));
    grid.addEventListener("change", ev => {
      const inp = ev.target;
      if (!inp.dataset.kind) return;
      const { kind, key } = inp.dataset, x = Number(inp.value), notes = [];
      let s = app.state;
      if (kind === "home") {
        const c = Math.min(1, Math.max(0, Math.round((Number.isFinite(x) ? x : 0) * 100) / 100));
        if (c !== x) notes.push(Str.t("scientist.h_kept_inside_0_1", { key: key }));
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
        if (c !== x) notes.push(Str.t("scientist.kept_inside_1_to_1", { a: a, b: b }));
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
      if (!m) ml.appendChild(app.li(Str.t("scientist.render.tap_update_to_see_the")));
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
        mathLines(app.state, m, { faith: app.faith() }).concat(MF.Historian.weekMath(app.state)).forEach(t => ml.appendChild(app.li(t)));
      }
      renderInputs();
    };
  }

  MF.Scientist = { shown, mathLines, mount };
})(typeof window !== "undefined" ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
if (typeof module !== "undefined") module.exports = global.MF.Scientist;
