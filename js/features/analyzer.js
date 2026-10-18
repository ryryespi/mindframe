// features/analyzer.js — Remy the Raccoon, the Analyzer.
//
// Turns over every mover to see how it fits with the others. After Update it
// lists all nine movers in words: how present each one is (a little, quite,
// strongly), what it feeds, and what softens it, read from W. Words only; the
// numbers live with the Scientist.
// Remy also lists every hidden pull (conflicts) and any grand or absolute
// wording, with its true-sized version, from the same master reading.

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

  /** How strong a pull is, in words, from c. */
  const pullSize = c => (c >= 0.6 ? "a strong pull" : c >= 0.4 ? "a clear pull" : "a gentle pull");
  const KIND_WORDS = { grand: "big, everything-on-me wording", catastrophic: "certain-worst wording", allOrNothing: "all-or-nothing wording", absolutist: "always/never wording" };
  /**
   * Remy's extra detail, in words: every hidden pull (with its size from c)
   * and any grand or absolute wording (how sure it sounds, from g).
   * @param {object} m the master output
   * @returns {string[]}
   */
  function details(m) {
    const out = (m.conflicts || []).map(c => { const [a, b] = MF.Words.pulls(c); return `Hidden pull (${pullSize(c.c)}${c.from === "words" ? ", in your words" : ""}): part of you ${a}, while part of you ${b}.`; });
    const g = m.grand;
    if (g && g.kinds.length && g.g > 0) {
      out.push(`Grand or absolute wording: ${band(g.g)} present (${g.kinds.map(k => KIND_WORDS[k]).join(", ")}). It adds to the replaying and to believing the thought word for word.`);
      MF.Words.realityLines({ ...m, small: null }).forEach(x => out.push(x));
    }
    // The other side of the true-size check: putting yourself down (core/reality.js).
    const sm = m.small;
    if (sm && sm.u > 0) {
      out.push(`Putting yourself down: ${sm.chip ? "you marked it in the feelings picker" : "present in the wording"}. It adds to the shame and dims hope.`);
      MF.Words.realityLines({ ...m, grand: null }).forEach(x => out.push(x));
    }
    // Forgiveness cues (features/forgiveness.js), in words.
    const f = m.forgive;
    if (f && (f.cSelf > 0 || f.cOther > 0)) {
      const w = c => (c >= 0.7 ? "clearly" : "a little");
      if (f.cSelf > 0) out.push(`Self-blame wording: ${w(f.cSelf)} present. It adds to the shame and the replaying.`);
      if (f.cOther > 0) out.push(`Resentment toward someone: ${w(f.cOther)} present. It adds to the anger and the replaying, and dims connection.`);
    }
    if (!out.length) out.push("No hidden pulls, grand wording or put-downs stand out right now.");
    return out;
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
      if (!m) { ul.appendChild(app.li("Tap Update to see each mover.")); $("remy-extra").innerHTML = ""; return; }
      const ex = $("remy-extra");
      ex.innerHTML = "";
      details(m).forEach(t => ex.appendChild(app.li(t)));
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

  MF.Analyzer = { level, breakdown, details, mount };
})(typeof window !== "undefined" ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
if (typeof module !== "undefined") module.exports = global.MF.Analyzer;
