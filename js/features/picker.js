// features/picker.js — the "Write" / "Pick feelings" toggle and the feelings
// chips on the main screen (browser only; the numbers live in core/movers.js).
//
//   • Write (the default): the text box, exactly as before.
//   • Pick feelings: the nine movers as plain-word chips (afraid, sad, angry,
//     ashamed, calm, connected, hopeful, replaying thoughts, avoiding). Each tap
//     goes off → a little → quite → strongly → off (0, 0.15, 0.45, 0.80, the
//     band midpoints; see MF.Movers.LEVELS). Two extra chips, "blaming myself"
//     and "putting myself down", turn on nudges onto existing movers.
//   • Update reads the picked state with MF.Master.masterPick(), the same master
//     path the text uses (no text, so no crisis path; the 988 line stays visible).
//   • The picked levels are kept with the session (state.pick, mf 3 code), so
//     the chips come back as you left them. Nothing you type is involved.

if (typeof module !== "undefined") {
  require("../core/movers.js");
}

(function (MF) {
  "use strict";
  const { PICK_WORD, PICK_ORDER, LEVELS, pickDefault, nextLevel, levelOf } = MF.Movers;
  /** The extra chips, in screen order. */
  const EXTRA_ORDER = ["blame", "putdown"];

  /**
   * Mount the toggle and the chips.
   * @param {object} app the app shell (see js/app.js)
   * @returns {function} render
   */
  function mount(app) {
    const { $ } = app;
    let mode = "write";
    let levels = {}, extras = [], loaded;
    /** Load the chips from the saved pick (or the starting levels). */
    const load = () => {
      const p = app.state.pick;
      loaded = p;
      levels = Object.fromEntries(PICK_ORDER.map(n => [n, p ? levelOf(p.e[MF.Movers.idx[n]]) : pickDefault(n)]));
      extras = p ? (p.extras || []).slice() : [];
    };
    load();

    const grid = $("pick-chips"), extraBox = $("pick-extras");
    PICK_ORDER.forEach(n => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "feel-chip";
      b.dataset.mover = n;
      b.addEventListener("click", () => { levels[n] = nextLevel(levels[n]); paint(); changed(); });
      grid.appendChild(b);
    });
    EXTRA_ORDER.forEach(id => {
      const chip = MF.Movers.EXTRAS.find(c => c.id === id);
      if (!chip) return;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "feel-chip extra";
      b.dataset.extra = id;
      b.textContent = chip.label;
      b.addEventListener("click", () => { extras = extras.includes(id) ? extras.filter(x => x !== id) : extras.concat(id); paint(); changed(); });
      extraBox.appendChild(b);
    });
    /** Show each chip's level in words (and as its data-level for the color). */
    function paint() {
      grid.querySelectorAll(".feel-chip").forEach(b => {
        const n = b.dataset.mover, l = levels[n];
        b.dataset.level = l.replace(" ", "-");
        b.innerHTML = "";
        const w = document.createElement("span"); w.className = "feel-word"; w.textContent = PICK_WORD[n];
        const lv = document.createElement("span"); lv.className = "feel-level"; lv.textContent = l;
        b.append(w, lv);
        b.setAttribute("aria-label", `${PICK_WORD[n]}: ${l}. Tap to change.`);
      });
      extraBox.querySelectorAll(".feel-chip").forEach(b => b.setAttribute("aria-pressed", extras.includes(b.dataset.extra) ? "true" : "false"));
    }
    /** A chip changed: the card is out of date until Update. */
    const changed = () => { if (app.m()) app.note("Tap Update to read the feelings you picked."); };
    /** Switch between Write and Pick feelings. */
    function setMode(m) {
      mode = m;
      $("mode-write").setAttribute("aria-pressed", m === "write" ? "true" : "false");
      $("mode-pick").setAttribute("aria-pressed", m === "pick" ? "true" : "false");
      $("write-box").classList.toggle("hidden", m !== "write");
      $("picker").classList.toggle("hidden", m !== "pick");
    }
    $("mode-write").addEventListener("click", () => setMode("write"));
    $("mode-pick").addEventListener("click", () => setMode("pick"));
    $("pick-reset").addEventListener("click", () => { levels = Object.fromEntries(PICK_ORDER.map(n => [n, pickDefault(n)])); extras = []; paint(); changed(); });
    app.onReset(() => { load(); paint(); });
    paint();
    setMode("write");

    app.picker = {
      /** "write" or "pick". */
      mode: () => mode,
      /** The current pick for masterPick(). */
      pick: () => ({ levels: { ...levels }, extras: extras.slice() }),
      /** Set chips directly (tests and screenshots): {levels, extras}. */
      set(p) { levels = { ...levels, ...(p.levels || {}) }; extras = (p.extras || []).slice(); paint(); },
      setMode,
    };
    // A restored session (start-up, Restore from code) brings its picked chips back.
    return function render() { if (app.state.pick && app.state.pick !== loaded) { load(); paint(); } };
  }

  MF.Picker = { EXTRA_ORDER, LEVELS, mount };
})(typeof window !== "undefined" ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
if (typeof module !== "undefined") module.exports = global.MF.Picker;
