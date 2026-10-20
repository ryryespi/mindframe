// features/writer/comfort.js — "Comfort story from a public AI" (in Write a story).
//
// The app composes its own replies from the equation and makes NO network
// calls. This optional button builds a prompt you can read and edit, then
// opens Grok or ChatGPT in a new tab with it (or copy it yourself).
//
// What the prompt contains (and nothing else):
//   • the analysis in plain words, exactly as composed by core/words.js
//     (room for positive emotions, feelings, how they connect, the hidden
//     pull, the reality check, the step, the affirmations; faith wording if on)
//   • a compact numbers summary from master(): movers with bands, the step
//     direction (d → d_next and the mover that moves most), conflicts with c,
//     the grandiosity signal g, the positive emotions, and inner peace
//     (P with its band, steps n* to the 0.8 threshold, the lever), the
//     forgiveness scores and suggested path, and the One step's practice with its source
//   • the forgiveness tile's lines, plus a note that forgiving is not excusing,
//     reconciling, or staying unsafe, when a path is suggested
//   • your companion's name and stage, so the story can feature it (never your words)
//   • a request for a ~200-word comfort story with a friendly animal plus
//     three affirmations written FROM that analysis, with no medical advice
// It never contains the text you typed: every line is composed from numbers,
// and scrub() drops any line that repeats four or more of your words in a row.
// In a crisis there is no prompt (buildPrompt returns null) and the button is disabled.
//
// URL formats (checked Oct 2026): https://grok.com/?q=<encoded> and
// https://chatgpt.com/?q=<encoded>. ChatGPT pre-fills the box; Grok may send
// the prompt right away. The prompt is also copied, in case a site doesn't fill it in.

if (typeof module !== "undefined") {
  require("../../core/words.js");
}

if (typeof window === "undefined") require("../../data/strings.js");
(function (MF) {
  "use strict";
  const Str = MF.Strings;   // every word lives in js/data/strings.js
  const { NAMES, LABEL, idx, isGround, f2 } = MF.Movers;
  const W = MF.Words;

  const ASK = Str.t("writer.comfort.ASK.please_write_a_short_gentle")
    + Str.t("writer.comfort.ASK.base_both_only_on_the");
  const ABOUT = Str.t("writer.comfort.ABOUT.the_analysis_comes_from_a");

  /**
   * The compact numbers summary: movers with bands, step direction, conflicts, g, positives.
   * Values are master's numbers (0 to 1); grounding movers are listed with their level.
   * @param {object} m master output
   * @returns {string[]}
   */
  function numbers(m) {
    const movers = NAMES.map((n, j) => ({ n, x: m.e[j] }))
      .filter(({ n, x }) => (isGround[idx[n]] ? true : x >= 0.1))
      .map(({ n, x }) => `${LABEL[n] || n} ${f2(x)} (${isGround[idx[n]] ? (x >= 0.65 ? "high" : x <= 0.4 ? "low" : "middle") : W.band(x)})`);
    const j = m.mover ? idx[m.mover] : -1;
    const dir = Str.t("writer.comfort.numbers.dir.distance_from_steady", { v0: f2(m.d), v1: f2(m.dNext), j_s: j >= 0 ? Str.t("writer.comfort.numbers.dir.biggest_move", { v0: LABEL[m.mover] || m.mover, v1: f2(m.e[j]), v2: f2(m.next[j]) }) : "" });
    const conf = (m.conflicts || []).map(c => {
      if (c.from === "words") { const [a, b] = W.pulls(c); return Str.t("writer.comfort.vs_in_the_words", { a: a, b: b, v2: f2(c.c) }); }
      return `${c.a} vs ${c.side === "need" ? Str.t("writer.comfort.need_for", { b: c.b }) : c.b} ${f2(c.c)}`;
    });
    const g = m.grand || { g: 0, kinds: [] };
    return [
      `Movers: ${movers.join(", ")}`,
      Str.t("writer.comfort.numbers.step_direction", { dir: dir }),
      Str.t("writer.comfort.numbers.hidden_conflicts", { v0: conf.length ? conf.join("; ") : "none" }),
      Str.t("writer.comfort.numbers.grandiosity_signal", { v0: f2(g.g), v1: g.kinds.length ? ` (${g.kinds.join(", ")})` : "" }),
      Str.t("writer.comfort.numbers.positive_emotions_it_points_toward", { v0: (m.positives || []).map(p => p.word).join(", ") || "calm" }),
      ...(m.peace ? [Str.t("writer.comfort.numbers.inner_peace_p_steps_until", { v0: f2(m.peace.P), v1: MF.Peace.band(m.peace.P), v2: m.peace.solve ? (m.peace.solve.n === null ? Str.t("writer.comfort.numbers.not_reached") : m.peace.solve.n) : "?", v3: m.peace.lever && m.peace.lever.name ? `${m.peace.lever.kind === "grow" ? "growing" : "easing"} ${m.peace.lever.name}` : "none" })] : []),
      ...(m.forgive ? [Str.t("writer.comfort.numbers.forgiveness_self_f_others_f", { v0: f2(m.forgive.Fself), v1: f2(m.forgive.Fother), v2: m.forgive.path === "self" ? Str.t("writer.comfort.numbers.forgiving_yourself") : m.forgive.path === "other" ? Str.t("writer.comfort.numbers.forgiving_someone") : "none" })] : []),
      ...(m.small && m.small.u > 0 ? [Str.t("writer.comfort.numbers.putting_yourself_down_false_humility", { v0: f2(m.small.u), v1: m.small.kinds.length ? ` (${m.small.kinds.join(", ")})` : Str.t("writer.comfort.numbers.chosen_in_the_feelings_picker") })] : []),
      ...(m.freeing && MF.Freeing ? [Str.t("writer.comfort.numbers.freeing_mix_inner_peace_shame", { v0: f2(m.freeing.P0), v1: f2(m.freeing.P1), v2: MF.Freeing.line(m.e, m.freeing.target, m.pick ? m.pick.extras : []) })] : []),
      ...(m.practice && MF.Practices ? [Str.t("writer.comfort.numbers.practice_for_the_one_step", { name: MF.Practices.LIBRARY[m.practice.id].name })] : []),
      ...(m.kai && m.kai.X > 0 && MF.Kai ? [Str.t("writer.comfort.numbers.steadiness_under_outside_criticism_kai", { v0: f2(m.kai.X), v1: f2(m.kai.S), v2: f2(m.kai.A), v3: f2(m.kai.F), v4: f2(m.kai.E), v5: f2(m.kai.R), v6: f2(m.kai.I), v7: MF.Kai.NAME[m.kai.lever] })] : []),
    ];
  }

  /**
   * Drop any line that repeats four or more consecutive words of the raw text.
   * The composed lines never do; this is a second guard.
   * @param {string[]} lines
   * @param {string} [raw]
   */
  function scrub(lines, raw) {
    const toks = String(raw || "").toLowerCase().match(/[a-z']+/g) || [];
    if (toks.length < 4) return lines;
    const grams = new Set();
    for (let i = 0; i + 4 <= toks.length; i++) grams.add(toks.slice(i, i + 4).join(" "));
    return lines.filter(line => {
      const t = (line.toLowerCase().match(/[a-z']+/g) || []);
      for (let i = 0; i + 4 <= t.length; i++) if (grams.has(t.slice(i, i + 4).join(" "))) return false;
      return true;
    });
  }

  /**
   * Build the prompt from the reading only. Returns null in a crisis or with no reading.
   * @param {object} state the session
   * @param {object} m master output
   * @param {{faith?:boolean, seed?:number, raw?:string, pet?:{name:string, stage:string, animal:string}}} [opts] raw is used only by scrub(); pet is the companion
   * @returns {string|null}
   */
  function buildPrompt(state, m, opts = {}) {
    if (!m || m.crisis) return null;
    const c = W.card(state, m, { faith: !!opts.faith, seed: opts.seed || 1 });
    const words = [
      `- ${c.room}`,
      ...c.peace.map(x => `- ${x}`),
      `- ${c.feeling}`,
      Str.t("writer.comfort.buildPrompt.words.how_they_connect", { v0: c.connect.join(" ") }),
      ...c.conflict.map(x => `- ${x}`),
      ...c.reality.map(x => `- ${x}`),
      ...(c.forgive || []).map(x => `- ${x}`),
      ...(c.freeing ? c.freeing.lines.map(x => `- ${x}`) : []),
      Str.t("writer.comfort.buildPrompt.words.suggested_step", { step: c.step }),
      Str.t("writer.comfort.buildPrompt.words.affirmations_the_app_composed", { v0: c.affirmations.join(" / ") }),
    ];
    const out = [ASK, "", ABOUT, "", Str.t("writer.comfort.buildPrompt.out.in_words"), ...scrub(words, opts.raw), "", Str.t("writer.comfort.buildPrompt.out.numbers_0_to_1"), ...numbers(m).map(x => `- ${x}`)];
    if (m.forgive && m.forgive.path) out.push("", Str.t("writer.comfort.buildPrompt.if_the_story_touches_forgiveness"));
    // The user's companion may star in the story (its name and stage only; never the typed text).
    if (opts.pet && opts.pet.name) out.push("", Str.t("writer.comfort.buildPrompt.companion_please_make_the_friendly", { v0: opts.pet.animal || "fawn", name: opts.pet.name, v2: String(opts.pet.stage || "young").toLowerCase() }));
    if (opts.faith) out.push("", Str.t("writer.comfort.buildPrompt.faith_please_include_one_gentle"));
    return out.join("\n");
  }

  /**
   * The two public AI links, with the prompt URL-encoded.
   * @param {string} prompt
   * @returns {{grok:string, chatgpt:string}}
   */
  function urls(prompt) {
    const q = encodeURIComponent(prompt);
    return { grok: `https://grok.com/?q=${q}`, chatgpt: `https://chatgpt.com/?q=${q}` };
  }

  // ---------- Panel (browser only) ----------
  /**
   * Mount the comfort-story controls in the Writer panel.
   * @param {object} app the app shell (see js/app.js)
   * @returns {function} render
   */
  function mount(app) {
    const { $ } = app;
    const hide = () => { $("comfort").classList.add("hidden"); $("comfort-prompt").value = ""; };
    app.onReset(hide);
    $("comfort-go").addEventListener("click", () => {
      if (!app.update()) { hide(); return; }
      const p = buildPrompt(app.state, app.m(), { faith: app.faith(), raw: $("input").value, pet: app.companion ? app.companion.about() : null });
      if (!p) { hide(); return; }
      $("comfort-prompt").value = p;
      $("comfort").classList.remove("hidden");
    });
    /** Open one AI in a new tab with the (possibly edited) prompt, and copy it too. */
    const open = which => {
      const p = $("comfort-prompt").value.trim();
      if (!p || app.inCrisis()) return;
      app.copy(p, "comfort-status");
      window.open(urls(p)[which], "_blank", "noopener,noreferrer");
    };
    $("open-grok").addEventListener("click", () => open("grok"));
    $("open-chatgpt").addEventListener("click", () => open("chatgpt"));
    $("comfort-copy").addEventListener("click", () => { const p = $("comfort-prompt").value.trim(); if (p) app.copy(p, "comfort-status"); });
    return function render() {};
  }

  MF.Comfort = { ASK, numbers, scrub, buildPrompt, urls, mount };
})(typeof window !== "undefined" ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
if (typeof module !== "undefined") module.exports = global.MF.Comfort;
