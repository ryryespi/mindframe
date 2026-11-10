// ariel/suite/welcome.js — six gifts on first open.
// No DOM. Nothing is sent. Ryan designed this welcome.
// Receive first, before doing anything. Never graded. Never required.
//
// ===== PARAMS =====
// open       the first line
// gifts      grace, belonging, rest, truth, kindness, novelty
// scripture  shown only when faith-aware is on
// close      the last line, from 1 John 4:19
// flag       a local "seen" mark. Skip, Look around, and Rest here set it.
//
// ===== EQUATIONS =====
// show on open iff flag is unset
// scripture line iff faith AND NOT listening
// Next moves one gift and stores nothing
// I receive this may store "Received: <id>" and also moves on
// Listening keeps one gift line and the pause, not the scripture
"use strict";
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ArielWelcome = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const PARAMS = {
    open: "You're here. Before you do anything, there are some things that are already yours to receive.",
    close: "We love because we were first loved. When you're ready, you can give some of this away.",
    closeRef: "1 John 4:19",
    pause: "Pause here. Nothing has to move for a moment.",
    gifts: [
      { id: "grace", line: "You are loved and enough before you make or prove anything.", ref: "Ephesians 2:8", verse: "For by grace you have been saved through faith. And this is not your own doing; it is the gift of God." },
      { id: "belonging", line: "You are wanted here. You are not alone.", ref: "Isaiah 43:1", verse: "I have called you by name; you are mine." },
      { id: "rest", line: "You can stop without disappearing.", ref: "Matthew 11:28", verse: "Come to me, all who labor and are heavy laden, and I will give you rest." },
      { id: "truth", line: "You'll hear honest words here, said with care.", ref: "John 8:32", verse: "You will know the truth, and the truth will set you free." },
      { id: "kindness", line: "Good things have been given to you, and more are coming. We'll keep them so you can remember.", ref: "Lamentations 3:22–23", verse: "The steadfast love of the Lord never ceases; his mercies never come to an end; they are new every morning." },
      { id: "novelty", line: "Something new is always possible. Even today.", ref: "Isaiah 43:19", verse: "Behold, I am doing a new thing." }
    ]
  };

  function shouldOpen(flag) { return flag !== "1"; }

  function start(opts) {
    const o = opts || {};
    return { index: -1, faith: !!o.faith, listening: o.mode === "listen", graded: false };
  }

  function view(state) {
    const s = state || start({});
    if (s.index < 0) {
      return {
        kind: "open", index: -1, lines: s.listening ? [PARAMS.open, PARAMS.pause] : [PARAMS.open],
        scripture: null, receive: false, end: false, graded: false
      };
    }
    if (s.index >= PARAMS.gifts.length) {
      const lines = [PARAMS.close];
      if (s.faith && !s.listening) lines.push(PARAMS.closeRef);
      if (s.listening) lines.push(PARAMS.pause);
      return { kind: "end", index: s.index, lines: lines, scripture: null, receive: false, end: true, graded: false };
    }
    const gift = PARAMS.gifts[s.index];
    const lines = [gift.line];
    if (s.listening) lines.push(PARAMS.pause);
    const scripture = s.faith && !s.listening ? { ref: gift.ref, verse: gift.verse } : null;
    return { kind: "gift", index: s.index, id: gift.id, lines: lines, scripture: scripture, receive: true, end: false, graded: false };
  }

  function next(state) {
    const s = state || start({});
    return { index: s.index + 1, faith: s.faith, listening: s.listening, graded: false };
  }

  function receive(state) {
    const seen = view(state);
    if (!seen.receive) return { state: state, entry: null };
    const entry = {
      type: "gift",
      text: "Received: " + seen.id,
      note: "",
      href: "#rest",
      source: "manual",
      key: "gift:" + seen.id
    };
    return { state: next(state), entry: entry };
  }

  return { PARAMS, shouldOpen, start, view, next, receive };
});
