/* MindFrame Now: pure logic (works in the browser and in Node for tests). */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory(require("./content.js"));
  else root.MF_NOW = factory(root.MF_CONTENT);
})(typeof self !== "undefined" ? self : this, function (C) {
  "use strict";
  var SCHEMA = "mindframe-log/1";
  var INBOX_KEY = "mindframe.inbox.v1";

  function clampLevel(v) {
    var n = parseInt(v, 10);
    if (!(n >= 1 && n <= 4)) throw new RangeError("level must be 1-4, got " + v);
    return n;
  }
  /* State Finder lookup key. The original Drive version had `$energyVal-${stressVal}`
     (missing the ${...} around energyVal), so every lookup returned undefined. */
  function stateKey(energyVal, stressVal) {
    return clampLevel(energyVal) + "-" + clampLevel(stressVal);
  }
  function lookupState(energyVal, stressVal) {
    var key = stateKey(energyVal, stressVal);
    var s = C.states[key];
    if (!s) throw new Error("no state for key " + key);
    return Object.assign({ key: key, energy: +key[0], stress: +key[2] }, s);
  }
  /* Small deterministic hash so the card is stable for a given day/choice but varies across days. */
  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function pick(arr, seed) { return arr[seed % arr.length]; }
  function fill(t, vars) { return t.replace(/\{\{(\w+)\}\}/g, function (_, k) { return vars[k] != null ? vars[k] : ""; }); }
  function dayStamp(d) {
    d = d || new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function chooseTechnique(state, opts) {
    // Care states always keep "reach one person": safety comes before anything else.
    if (state.care) return "help";
    if (opts.context === "conflict") return "pause";
    if (opts.focus === "looping") return "closeloop";
    if (opts.focus === "scattered") return state.stress >= 3 ? "dps" : "chain";
    if (opts.context === "with" && state.technique === "chain") return "readback";
    return state.technique;
  }
  function chooseWords(state, opts) {
    var primary = state.word;
    var second;
    if (state.care) second = primary === "grace" ? "belonging" : "grace";
    else if (opts.mood === "heavy") second = state.stress >= 3 ? "grace" : "belonging";
    else if (opts.focus === "looping") second = "rumination";
    else if (state.stress >= 3) second = "opposite-action";
    else if (state.energy <= 1) second = "grace";
    else second = "behavioral-activation";
    if (second === primary) second = state.care ? "belonging" : "rest";
    return [primary, second].map(function (id) {
      var w = C.words.filter(function (x) { return x.id === id; })[0];
      if (!w) throw new Error("missing word " + id);
      return w;
    });
  }
  function chooseQuote(state, opts, seed) {
    var faith = opts.faith !== false;
    var pool = C.quotes.filter(function (q) { return state.themes.indexOf(q.theme) >= 0 && (faith || !q.requiresBelief); });
    if (!pool.length) pool = C.quotes.filter(function (q) { return faith || !q.requiresBelief; });
    return pick(pool, seed);
  }
  function chooseAffirmation(state, opts, seed) {
    var faith = opts.faith !== false;
    var list = C.affirmations.room.map(function (t) { return fill(t, { word: state.affirmWord }); });
    if (opts.mood === "heavy") list = C.affirmations.heavy.concat(list);
    else if (opts.mood === "light") list = list.concat(C.affirmations.light);
    list = list.concat(C.affirmations.general);
    if (faith) {
      var span = pick(C.affirmations.spans, seed >>> 3);
      list = list.concat(C.affirmations.faith.map(function (t) {
        return fill(t, { word: state.affirmWord, span: span, state: state.name.toLowerCase() });
      }));
    }
    if (opts.mood === "heavy") return list[seed % 2]; // heavy mood: always a "both/and" line first
    return pick(list, seed);
  }

  /* Build the full card. opts: {mood, focus, context, faith, date} */
  function buildCard(energyVal, stressVal, opts) {
    opts = opts || {};
    var state = lookupState(energyVal, stressVal);
    var seed = hash(state.key + "|" + (opts.mood || "") + "|" + (opts.focus || "") + "|" + (opts.context || "") + "|" + dayStamp(opts.date));
    var techId = chooseTechnique(state, opts);
    return {
      state: state,
      affirmation: chooseAffirmation(state, opts, seed),
      words: chooseWords(state, opts),
      quote: chooseQuote(state, opts, seed >>> 5),
      techniqueId: techId,
      technique: C.techniques[techId],
      care: !!state.care,
      seed: seed
    };
  }

  /* Entry for MindFrame Log (shared schema mindframe-log/1). */
  function makeEntry(card, opts) {
    opts = opts || {};
    var now = opts.date || new Date();
    var e = {
      schema: SCHEMA,
      id: "now-" + now.getTime().toString(36) + "-" + (card.seed % 46656).toString(36),
      ts: now.toISOString(),
      type: "now",
      source: "mindframe-now",
      energy: card.state.energy,
      stress: card.state.stress,
      stateKey: card.state.key,
      stateName: card.state.name,
      mood: opts.mood || null,
      focus: opts.focus || null,
      context: opts.context || null,
      techniques: [{ id: card.techniqueId, before: num(opts.before), after: num(opts.after) }],
      words: card.words.map(function (w) { return w.id; }),
      quoteId: card.quote ? card.quote.id : null
    };
    return e;
  }
  function num(v) { if (v === "" || v == null) return null; var n = Number(v); return isFinite(n) && n >= 0 && n <= 10 ? n : null; }
  function exportBundle(entries) { return { schema: SCHEMA, exported: new Date().toISOString(), entries: entries }; }

  return { SCHEMA: SCHEMA, INBOX_KEY: INBOX_KEY, stateKey: stateKey, lookupState: lookupState, buildCard: buildCard,
           makeEntry: makeEntry, exportBundle: exportBundle, hash: hash, dayStamp: dayStamp, content: C };
});
