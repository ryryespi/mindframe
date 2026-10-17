// features/analyzer.js — Remy the Raccoon, the Analyzer.
//
// Turns over every mover to see how it fits with the others. After Update it
// lists all nine movers in words: how present each one is (a little, quite,
// strongly), what it feeds, and what softens it, read from W. Words only; the
// numbers live with the Scientist.

if (typeof module !== "undefined") require("../core/words.js");

(function (MF) {
  "use strict";
  const { NAMES, HARD, GROUND, ACTIVE, idx, isGround, label, cap, listJoin, weights } = MF.Movers;
  const { band, FEEL, NOUN, SOFTENER } = MF.Words;

  const GROUP = { hard: "a hard feeling", grounding: "a grounding strength", process: "a thinking habit" };
  const HIGH = { calm: "steady", connection: "close to people", hope: "hopeful" };

  /**
   * How present one mover is, in words.
   * @param {string} n mover name
   * @param {number} x its value in [0, 1]
   * @returns {string}
   */
  function level(n, x) {
    if (isGround[idx[n]]) {
      if (x <= 0.4) return `${band((0.5 - x) / 0.5)} ${FEEL[n]}`;
      if (x >= 0.65) return HIGH[n];
      return "in the middle";
    }
    return x >= ACTIVE ? `${band(x)} ${FEEL[n]}` : "quiet right now";
  }

  /**
   * The nine movers in words: presence, what each feeds, and what softens it.
   * @param {object} state the session (for W overrides)
   * @param {object} m the master output
   * @returns {Array<{name:string, title:string, group:string, level:string, links:string}>}
   */
  function breakdown(state, m) {
    const W = weights(state.w);
    return NAMES.map((n, j) => {
      const g = HARD.includes(n) ? "hard" : GROUND.includes(n) ? "grounding" : "process";
      let links;
      if (g === "grounding") {
        const eases = NAMES.filter((t, k) => !isGround[k] && W[j][k] < 0).map(t => NOUN[t]);
        links = eases.length ? `Helps soften ${listJoin(eases)}.` : "Steadies you in the background.";
      } else {
        const feeds = NAMES.filter((t, k) => k !== j && !isGround[k] && W[j][k] > 0).map(t => NOUN[t]);
        const lowers = NAMES.filter((t, k) => isGround[k] && W[j][k] < 0).map(t => NOUN[t]);
        const soft = NAMES.filter((t, k) => isGround[k] && W[k][j] < 0).map(t => SOFTENER[t]);
        const parts = [];
        if (feeds.length || lowers.length) parts.push(`It can feed ${listJoin(feeds.concat(lowers.map(x => `lower ${x}`)))}.`);
        if (soft.length) parts.push(`${cap(listJoin(soft))} ${soft.length > 1 ? "soften" : "softens"} it.`);
        links = parts.join(" ") || "It mostly moves on its own.";
      }
      return { name: n, title: cap(label(n)), group: GROUP[g], level: level(n, m.e[j]), links };
    });
  }

  // ---------- Panel (browser only) ----------
  /**
   * Mount the Analyzer panel.
   * @param {object} app the app shell (see js/app.js)
   * @returns {function} render
   */
  function mount(app) {
    const { $ } = app;
    return function render() {
      const ul = $("breakdown"), m = app.m();
      ul.innerHTML = "";
      if (!m) { ul.appendChild(app.li("Tap Update to see each mover.")); return; }
      breakdown(app.state, m).forEach(x => {
        const li = document.createElement("li");
        const h = document.createElement("strong");
        h.textContent = `${x.title}: ${x.level}`;
        const p = document.createElement("span");
        p.className = "quiet small";
        p.textContent = ` (${x.group}). ${x.links}`;
        li.append(h, p);
        ul.appendChild(li);
      });
    };
  }

  MF.Analyzer = { level, breakdown, mount };
})(typeof window !== "undefined" ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
if (typeof module !== "undefined") module.exports = global.MF.Analyzer;
