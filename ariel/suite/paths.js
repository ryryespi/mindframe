// ariel/suite/paths.js — two quiet paths. No DOM. Nothing is sent away.
// Afraid to stop: identity fused with making. Rest in small doses, never a long forced rest.
// Slow the spiral: the person picks one step. Nothing starts by itself.
//
// ===== PARAMS =====
// longSessionMs   a session with no break this long can open the afraid path
// doses           10s, then 30s, then 1 minute. Never longer.
// afraid          phrases that mean rest feels like disappearing
// spiral          withdrawal, isolation, cruelty, unforgiveness
// offers          one practice at a time
//
// ===== EQUATIONS =====
// afraid = phrase OR (sessionMs >= longSessionMs AND breaks = 0)
// spiral = phrase OR (mood drop AND an unexpected change)
// dose(n) = doses[min(n, doses.length - 1)]          capped at one minute
// safety overrides both paths
// Listening shows one line and one offer, not a stack of invitations
"use strict";
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ArielPaths = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const PARAMS = {
    longSessionMs: 45 * 60 * 1000,
    doses: [10, 30, 60],
    doseEnd: "Your work is still here.",
    pause: "Pause here. Nothing has to move for a moment.",
    afraid: ["can't stop", "cant stop", "useless", "wasting my life", "afraid to rest", "afraid to stop"],
    kept: "You are not what you make. What you've made is kept. You can rest without disappearing.",
    already: "The new creation you're reaching for is already made. You are it. You can create now from joy, not to become someone.",
    question: "Am I creating because I want to, or because I'm afraid of who I'd be if I stopped?",
    spiral: ["no one cares", "nobody cares", "world is cruel", "leave me alone", "i don't forgive", "i will never forgive", "unforgivable", "withdraw", "isolated", "all alone"],
    waitDone: "Ten minutes passed. How is it now? You don't have to decide yet.",
    breathe: { inhale: 4, exhale: 6, seconds: 60 },
    safety: "This sounds really heavy. You don't have to hold it alone. If you might hurt yourself or someone else, please reach out now: call or text 988, or call 911.",
    trusted: "You can also talk with someone you trust.",
    offers: [
      { id: "wait", title: "Wait 10 minutes", line: "This feeling is real, and it can wait ten minutes before it decides anything.", seconds: 600 },
      { id: "breathe", title: "Breathe slower", line: "Breathe in, then let the breath out more slowly. One minute.", seconds: 60 },
      { id: "stop", title: "STOP", steps: ["Stop", "Take a breath", "Observe", "Proceed mindfully"] },
      { id: "name", title: "Name the change", line: "Something changed. You don't have to lose what you've done. Let's look at this new thing together." },
      { id: "kindness", title: "Kindness I've seen", line: "The world has been kind to you before. Here's proof you saved." },
      { id: "person", title: "Reach a real person", line: "You could message or call someone you trust. Nothing will open on its own.", outside: "Step outside for five minutes." },
      { id: "record", title: "What you've done", line: "Two things you have already kept." }
    ]
  };

  const HARM = /\b(kill|killing|hurt them|hurt him|hurt her|hurt myself|make them pay|no point|want to die|wanna die|end my life|suicide)\b/i;

  function harm(text) { return HARM.test(String(text || "")); }

  function door(text) {
    if (!harm(text)) return null;
    return { safety: true, show: false, line: PARAMS.safety, trusted: PARAMS.trusted, offers: [], lines: [] };
  }

  function hasPhrase(text, list) {
    const raw = String(text || "").toLowerCase();
    return list.some(phrase => raw.indexOf(phrase) >= 0);
  }

  function dose(step) {
    const i = Math.max(0, Math.min(PARAMS.doses.length - 1, step || 0));
    const seconds = PARAMS.doses[i];
    return {
      seconds: seconds,
      end: PARAMS.doseEnd,
      next: i + 1 < PARAMS.doses.length ? i + 1 : null,
      label: seconds === 60 ? "Rest 1 minute" : "Rest " + seconds + " seconds"
    };
  }

  function afraid(input) {
    const src = input || {};
    const blocked = door(src.text);
    if (blocked) return blocked;
    const phrase = hasPhrase(src.text, PARAMS.afraid);
    const long = Number(src.sessionMs) >= PARAMS.longSessionMs && !Number(src.breaks);
    if (!phrase && !long) return { show: false, safety: false, lines: [], doses: [], forced: false };
    const listen = src.mode === "listen";
    return {
      show: true,
      safety: false,
      forced: false,
      phrase: phrase,
      long: long,
      lines: listen ? [PARAMS.kept, PARAMS.pause] : [PARAMS.kept, PARAMS.already, PARAMS.question],
      doses: listen ? [PARAMS.doses[0]] : PARAMS.doses.slice()
    };
  }

  function spiral(input) {
    const src = input || {};
    const blocked = door(src.text);
    if (blocked) return blocked;
    const phrase = hasPhrase(src.text, PARAMS.spiral);
    const drop = !!(src.change && src.drop);
    if (!phrase && !drop) return { show: false, safety: false, offers: [], forced: false };
    const offers = src.mode === "listen" ? PARAMS.offers.slice(0, 1) : PARAMS.offers.slice();
    return { show: true, safety: false, forced: false, offers: offers, phrase: phrase, drop: drop };
  }

  function offerAt(state, index) {
    const offers = (state && state.offers) || [];
    if (!offers.length) return null;
    const i = Math.max(0, Math.min(offers.length - 1, index || 0));
    return { index: i, offer: offers[i], last: i === offers.length - 1 };
  }

  function addKindness(list, text, at) {
    const note = String(text || "").trim();
    if (!note) return (list || []).slice();
    return (list || []).concat([{ text: note, at: at || "" }]);
  }

  function kindnessProof(list, n) {
    const take = n || 3;
    return (list || []).slice(-take).reverse();
  }

  function recentKept(entries, n) {
    const list = (entries || []).slice().sort((a, b) => (String(a.at) < String(b.at) ? 1 : String(a.at) > String(b.at) ? -1 : 0));
    return list.slice(0, n || 2).map(entry => entry.text).filter(Boolean);
  }

  return { PARAMS, door, dose, afraid, spiral, offerAt, addKindness, kindnessProof, recentKept };
});
