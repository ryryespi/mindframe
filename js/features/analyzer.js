// features/analyzer.js — "Look closer" (was Remy the Raccoon, the Analyzer).
//
// Turns over every mover to see how it fits with the others. After Update it
// lists all nine movers in words: how present each one is (a little, quite,
// strongly), what it feeds, and what softens it, read from W. Words only; the
// numbers live with the Scientist.
// Remy also lists every hidden pull (conflicts) and any grand or absolute
// wording, with its true-sized version, from the same master reading.

if (typeof module !== "undefined") require("../core/words.js");

if (typeof window === "undefined") { require("../data/strings.js"); require("../core/equations.js"); }
(function (MF) {
  "use strict";
  const Str = MF.Strings;   // every word lives in js/data/strings.js
  const P = MF.Params;   // every number: data/params.js
  const { NAMES, HARD, GROUND, ACTIVE, idx, isGround, label, cap, listJoin, weights } = MF.Movers;
  const { band, FEEL, NOUN, SOFTENER } = MF.Words;

  const GROUP = { hard: Str.t("analyzer.GROUP.hard"), grounding: Str.t("analyzer.GROUP.grounding"), process: Str.t("analyzer.GROUP.process") };
  const HIGH = { calm: "steady", connection: Str.t("analyzer.HIGH.connection"), hope: "hopeful" };

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
      return Str.t("analyzer.level.in_the_middle");
    }
    return x >= ACTIVE ? `${band(x)} ${FEEL[n]}` : Str.t("analyzer.level.quiet_right_now");
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
        links = eases.length ? Str.t("analyzer.helps_soften", { v0: listJoin(eases) }) : Str.t("analyzer.steadies_you_in_the_background");
      } else {
        const feeds = NAMES.filter((t, k) => k !== j && !isGround[k] && W[j][k] > 0).map(t => NOUN[t]);
        const lowers = NAMES.filter((t, k) => isGround[k] && W[j][k] < 0).map(t => NOUN[t]);
        const soft = NAMES.filter((t, k) => isGround[k] && W[k][j] < 0).map(t => SOFTENER[t]);
        const parts = [];
        if (feeds.length || lowers.length) parts.push(Str.t("analyzer.it_can_feed", { v0: listJoin(feeds.concat(lowers.map(x => `lower ${x}`))) }));
        if (soft.length) parts.push(`${cap(listJoin(soft))} ${soft.length > 1 ? "soften" : "softens"} it.`);
        links = parts.join(" ") || Str.t("analyzer.it_mostly_moves_on_its");
      }
      return { name: n, title: cap(label(n)), group: GROUP[g], level: level(n, m.e[j]), links };
    });
  }

  /** How strong a pull is, in words, from c. */
  const pullSize = c => (c >= 0.6 ? Str.t("analyzer.pullSize.a_strong_pull") : c >= 0.4 ? Str.t("analyzer.pullSize.a_clear_pull") : Str.t("analyzer.pullSize.a_gentle_pull"));
  const KIND_WORDS = { grand: Str.t("analyzer.KIND_WORDS.grand"), catastrophic: "certain-worst wording", allOrNothing: "all-or-nothing wording", absolutist: Str.t("analyzer.KIND_WORDS.absolutist") };
  /**
   * Remy's extra detail, in words: every hidden pull (with its size from c)
   * and any grand or absolute wording (how sure it sounds, from g).
   * @param {object} m the master output
   * @returns {string[]}
   */
  function details(m) {
    const out = (m.conflicts || []).map(c => { const [a, b] = MF.Words.pulls(c); return Str.t("analyzer.hidden_pull_part_of_you", { v0: pullSize(c.c), v1: c.from === "words" ? Str.t("analyzer.in_your_words") : "", a: a, b: b }); });
    const g = m.grand;
    if (g && g.kinds.length && g.g > 0) {
      out.push(Str.t("analyzer.details.grand_or_absolute_wording_present", { v0: band(g.g), v1: g.kinds.map(k => KIND_WORDS[k]).join(", ") }));
      MF.Words.realityLines({ ...m, small: null }).forEach(x => out.push(x));
    }
    // The other side of the true-size check: putting yourself down (core/reality.js).
    const sm = m.small;
    if (sm && sm.u > 0) {
      out.push(Str.t("analyzer.details.putting_yourself_down_it_adds", { v0: sm.chip ? Str.t("analyzer.details.you_marked_it_in_the") : Str.t("analyzer.details.present_in_the_wording") }));
      MF.Words.realityLines({ ...m, grand: null }).forEach(x => out.push(x));
    }
    // Forgiveness cues (features/forgiveness.js), in words.
    const f = m.forgive;
    if (f && (f.cSelf > 0 || f.cOther > 0)) {
      const w = c => (c >= 0.7 ? "clearly" : "a little");
      if (f.cSelf > 0) out.push(Str.t("analyzer.details.self_blame_wording_present_it", { v0: w(f.cSelf) }));
      if (f.cOther > 0) out.push(Str.t("analyzer.details.resentment_toward_someone_present_it", { v0: w(f.cOther) }));
    }
    if (!out.length) out.push(Str.t("analyzer.details.no_hidden_pulls_grand_wording"));
    return out;
  }

  // ---------- Panel (browser only) ----------
  /**
   * Mount the Analyzer panel.
   * @param {object} app the app shell (see js/app.js)
   * @returns {function} render
   */
  /**
   * Every insight line from the card, in one list for Remy's panel: hidden pulls,
   * reality check, forgiveness, the freeing mix and any relationship pattern.
   * @returns {string[]}
   */
  function insightLines(state, m, faith) {
    const c = MF.Words.card(state, m, { faith, seed: P.seeds.CARD });
    const rel = MF.Relationship.section(m.found).map(r => `${r.title}: ${r.antidote}`);
    return [].concat(c.kai || [], c.conflict, c.reality, c.forgive, c.freeing ? c.freeing.lines : [], rel);
  }

  function mount(app) {
    const { $ } = app;
    return function render() {
      const ul = $("breakdown"), m = app.m();
      ul.innerHTML = "";
      ["remy-insights", "remy-connect"].forEach(id => { $(id).innerHTML = ""; });
      if (!m) { ul.appendChild(app.li(Str.t("analyzer.render.tap_update_to_see_each"))); $("remy-extra").innerHTML = ""; return; }
      // Remy keeps the full card detail the short card leaves out: every insight and the connections.
      insightLines(app.state, m, app.faith()).forEach(t => $("remy-insights").appendChild(app.li(t)));
      MF.Words.card(app.state, m, { faith: app.faith(), seed: P.seeds.CARD }).connect.forEach(t => $("remy-connect").appendChild(app.li(t)));
      const ex = $("remy-extra");
      ex.innerHTML = "";
      details(m).forEach(t => ex.appendChild(app.li(t)));
      breakdown(app.state, m).forEach(x => {
        const li = document.createElement("li");
        const h = document.createElement("strong");
        h.textContent = `${x.title}: ${x.level}`;
        const p = document.createElement("span");
        p.className = Str.t("analyzer.quiet_small");
        p.textContent = ` (${x.group}). ${x.links}`;
        li.append(h, p);
        ul.appendChild(li);
      });
    };
  }

  MF.Analyzer = { insightLines, level, breakdown, details, mount };
})(typeof window !== "undefined" ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
if (typeof module !== "undefined") module.exports = global.MF.Analyzer;
