// features/writer/comfort.js — Fern the Fox's "Comfort story from a public AI".
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

(function (MF) {
  "use strict";
  const { NAMES, LABEL, idx, isGround, f2 } = MF.Movers;
  const W = MF.Words;

  const ASK = "Please write a short, gentle, grounded comfort story (about 200 words) with a friendly animal as the main character, followed by three short first-person affirmations. "
    + "Base both ONLY on the analysis below. Keep it warm and realistic, give no medical or diagnostic advice, and end on a hopeful note.";
  const ABOUT = "The analysis comes from a small local equation model of nine feelings (a model, not a measurement or a diagnosis).";

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
    const dir = `distance from steady ${f2(m.d)} -> ${f2(m.dNext)}${j >= 0 ? `; biggest move: ${LABEL[m.mover] || m.mover} ${f2(m.e[j])} -> ${f2(m.next[j])}` : ""}`;
    const conf = (m.conflicts || []).map(c => {
      if (c.from === "words") { const [a, b] = W.pulls(c); return `${a} vs ${b} (in the words) ${f2(c.c)}`; }
      return `${c.a} vs ${c.side === "need" ? `need for ${c.b}` : c.b} ${f2(c.c)}`;
    });
    const g = m.grand || { g: 0, kinds: [] };
    return [
      `Movers: ${movers.join(", ")}`,
      `Step direction: ${dir}`,
      `Hidden conflicts: ${conf.length ? conf.join("; ") : "none"}`,
      `Grandiosity signal: ${f2(g.g)}${g.kinds.length ? ` (${g.kinds.join(", ")})` : ""}`,
      `Positive emotions it points toward: ${(m.positives || []).map(p => p.word).join(", ") || "calm"}`,
      ...(m.peace ? [`Inner peace P: ${f2(m.peace.P)} (${MF.Peace.band(m.peace.P)}); steps until P >= 0.80: ${m.peace.solve ? (m.peace.solve.n === null ? "not reached" : m.peace.solve.n) : "?"}; biggest lever: ${m.peace.lever && m.peace.lever.name ? `${m.peace.lever.kind === "grow" ? "growing" : "easing"} ${m.peace.lever.name}` : "none"}`] : []),
      ...(m.forgive ? [`Forgiveness: self F=${f2(m.forgive.Fself)}, others F=${f2(m.forgive.Fother)} (threshold 0.35); suggested path: ${m.forgive.path === "self" ? "forgiving yourself" : m.forgive.path === "other" ? "forgiving someone" : "none"}`] : []),
      ...(m.small && m.small.u > 0 ? [`Putting yourself down (false humility) signal: ${f2(m.small.u)}${m.small.kinds.length ? ` (${m.small.kinds.join(", ")})` : " (chosen in the feelings picker)"}`] : []),
      ...(m.freeing && MF.Freeing ? [`Freeing mix (inner peace ${f2(m.freeing.P0)} -> ${f2(m.freeing.P1)}, shame only goes down): ${MF.Freeing.line(m.e, m.freeing.target, m.pick ? m.pick.extras : [])}`] : []),
      ...(m.practice && MF.Practices ? [`Practice for the one step: ${MF.Practices.LIBRARY[m.practice.id].name} (${MF.Practices.LIBRARY[m.practice.id].source})`] : []),
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
   * @param {{faith?:boolean, seed?:number, raw?:string}} [opts] raw is used only by scrub()
   * @returns {string|null}
   */
  function buildPrompt(state, m, opts = {}) {
    if (!m || m.crisis) return null;
    const c = W.card(state, m, { faith: !!opts.faith, seed: opts.seed || 1 });
    const words = [
      `- ${c.room}`,
      ...c.peace.map(x => `- ${x}`),
      `- ${c.feeling}`,
      `- How they connect: ${c.connect.join(" ")}`,
      ...c.conflict.map(x => `- ${x}`),
      ...c.reality.map(x => `- ${x}`),
      ...(c.forgive || []).map(x => `- ${x}`),
      ...(c.freeing ? c.freeing.lines.map(x => `- ${x}`) : []),
      `- Suggested step: ${c.step}`,
      `- Affirmations the app composed: ${c.affirmations.join(" / ")}`,
    ];
    const out = [ASK, "", ABOUT, "", "In words:", ...scrub(words, opts.raw), "", "Numbers (0 to 1):", ...numbers(m).map(x => `- ${x}`)];
    if (m.forgive && m.forgive.path) out.push("", "If the story touches forgiveness, keep it gentle and unhurried: forgiving is not excusing what happened, reconciling, or staying anywhere unsafe.");
    if (opts.faith) out.push("", "Faith: please include one gentle line of Christian faith, for example the peace of God that surpasses understanding (Philippians 4:7).");
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
      const p = buildPrompt(app.state, app.m(), { faith: app.faith(), raw: $("input").value });
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
