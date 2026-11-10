// ariel/suite/sketch.js — a sketch kept with a thought.
// No DOM. Nothing is sent. Ryan designed this.
// Images stay small. No generative art yet.
//
// ===== PARAMS =====
// maxEdge    longest side of a saved PNG, about 512px
// heavy      a thought that should be met with a kind reframe, not a grade
// reframe    one gentle line for a heavy thought
// TODO Ryan: future generative positive art from these sketches, to lift
// someone in the void toward rest. No generation now.
//
// ===== EQUATIONS =====
// fit: if max(w, h) > maxEdge, scale = maxEdge / max(w, h)
// card stores the thought, the date, and the bag of words already collected
// reframe is shown only when the thought matches a heavy phrase
// gallery is one sketch at a time
"use strict";
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ArielSketch = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const PARAMS = {
    maxEdge: 512,
    heavy: ["useless", "hate", "alone", "lost", "empty", "can't", "worthless", "no one"],
    reframe: "This was heavy, and you still made something. You can rest with it.",
    empty: "No sketches yet. When you save one, it can sit here with its thought.",
    // TODO Ryan: future generative positive art from these sketches. No generation now.
    generativeArt: null
  };

  function fit(width, height) {
    const w = Math.max(1, Number(width) || 1);
    const h = Math.max(1, Number(height) || 1);
    const edge = Math.max(w, h);
    if (edge <= PARAMS.maxEdge) return { width: Math.round(w), height: Math.round(h) };
    const scale = PARAMS.maxEdge / edge;
    return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
  }

  function isHeavy(thought) {
    const raw = String(thought || "").toLowerCase();
    return PARAMS.heavy.some(phrase => raw.indexOf(phrase) >= 0);
  }

  function card(input) {
    const src = input || {};
    const thought = String(src.thought || "").trim();
    const words = Array.isArray(src.words) ? src.words.map(String).filter(Boolean) : [];
    const entry = {
      id: src.id || "",
      type: "sketch",
      text: thought || "Saved a sketch",
      note: thought,
      words: words,
      href: "#create",
      source: "manual",
      at: src.at || "",
      imageId: src.imageId || src.id || ""
    };
    if (src.thumb && String(src.thumb).indexOf("data:image/") === 0) entry.thumb = String(src.thumb);
    return entry;
  }

  /** Edit the thought only. Words and the picture stay. */
  function editThought(entry, thought) {
    const note = String(thought || "").trim();
    return { text: note || "Saved a sketch", note: note };
  }

  function frames(entries) {
    return (entries || []).filter(entry => entry && entry.type === "sketch").map(entry => {
      const thought = String(entry.note || "").trim();
      return {
        id: entry.id,
        thought: thought,
        title: entry.text,
        words: entry.words || [],
        at: entry.at || "",
        reframe: isHeavy(thought || entry.text) ? PARAMS.reframe : ""
      };
    });
  }

  function artCards(entries) {
    const list = frames(entries);
    if (!list.length) return [{ kind: "invite", text: PARAMS.empty, own: false }];
    return list.map(frame => ({
      kind: "sketch",
      text: frame.thought || frame.title,
      own: true
    }));
  }

  return { PARAMS, fit, isHeavy, card, editThought, frames, artCards };
});
