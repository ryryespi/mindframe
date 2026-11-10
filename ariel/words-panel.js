// ariel/words-panel.js — Ariel Words inside the canvas, not a new page.
// No DOM. The drawing is not touched here. Nothing is sent.
//
// ===== PARAMS =====
// src       the game address, with embed=1 so the back link stays hidden
// suiteSrc  the same game from the suite page
// sessionKey  last Create sub-tab, for this browser session only
//
// ===== EQUATIONS =====
// first open creates the frame; later opens reuse it
// close hides the panel and leaves the frame loaded
// the canvas ignores pointer input while the panel is open
// Create sub-tab: first visit to words creates the frame; leaving it keeps the frame
"use strict";
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ArielWordsPanel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const PARAMS = {
    src: "./words/?embed=1",
    suiteSrc: "../words/?embed=1",
    sessionKey: "ariel-create-sub"
  };

  function blank() { return { open: false, loaded: false }; }

  function open(state) {
    const s = state || blank();
    return { open: true, loaded: true, created: !s.loaded };
  }

  function close(state) {
    const s = state || blank();
    return { open: false, loaded: !!s.loaded, created: false };
  }

  function ignoresCanvas(state) { return !!(state && state.open); }

  function isEmbed(search) {
    return /(?:^|[?&])embed=1(?:&|$)/.test(String(search || ""));
  }

  function subBlank() { return { tab: "make", loaded: false }; }

  /** Pick a Create sub-tab. The game frame is created only the first time. */
  function selectSub(state, id) {
    const s = state || subBlank();
    const tab = id === "words" ? "words" : "make";
    const created = tab === "words" && !s.loaded;
    return { tab: tab, loaded: !!(s.loaded || tab === "words"), created: created };
  }

  function recallSub(storage) {
    try {
      return storage && storage.getItem(PARAMS.sessionKey) === "words" ? "words" : "make";
    } catch (err) {
      return "make";
    }
  }

  function rememberSub(storage, state) {
    try { if (storage) storage.setItem(PARAMS.sessionKey, (state && state.tab) || "make"); } catch (err) {}
  }

  return { PARAMS, blank, open, close, ignoresCanvas, isEmbed, subBlank, selectSub, recallSub, rememberSub };
});
