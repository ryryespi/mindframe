// ariel/words-panel.js — Ariel Words inside the canvas, not a new page.
// No DOM. The drawing is not touched here. Nothing is sent.
//
// ===== PARAMS =====
// src       the game address, with embed=1 so the back link stays hidden
// suiteSrc  the same game from the suite page
//
// ===== EQUATIONS =====
// first open creates the frame; later opens reuse it
// close hides the panel and leaves the frame loaded
// the canvas ignores pointer input while the panel is open
"use strict";
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ArielWordsPanel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const PARAMS = {
    src: "./words/?embed=1",
    suiteSrc: "../words/?embed=1"
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

  return { PARAMS, blank, open, close, ignoresCanvas, isEmbed };
});
