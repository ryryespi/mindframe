// tests/mf.js — loads every module in Node and merges them into one object,
// so tests can call M.master, M.story, M.serialize, … without caring which
// feature file a function lives in.
"use strict";
const parts = [
  require("../js/core/movers.js"),
  require("../js/core/reality.js"),
  require("../js/core/peace.js"),
  require("../js/core/kai.js"),
  require("../js/core/master.js"),
  require("../js/core/words.js"),
  require("../js/features/relationship.js"),
  require("../js/features/forgiveness.js"),
  require("../js/features/practices.js"),
  require("../js/features/freeing.js"),
  require("../js/features/historian.js"),
  require("../js/features/writer/writer.js"),
  require("../js/features/writer/comfort.js"),
  require("../js/features/analyzer.js"),
  require("../js/features/scribe.js"),
  require("../js/features/scientist.js"),
];
// The stage modules (films, scripture, grip, past, parable) register on MF but
// are not merged here, since names like pick / lines / seed would clash.
["movies", "scripture", "grip", "past", "parable", "scenes", "about"].forEach(f => require(`../js/features/${f}.js`));
module.exports = Object.assign({}, ...parts.map(p => { const c = Object.assign({}, p); delete c.mount; return c; }));
