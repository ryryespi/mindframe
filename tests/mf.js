// tests/mf.js — loads every module in Node and merges them into one object,
// so tests can call M.master, M.story, M.serialize, … without caring which
// feature file a function lives in.
"use strict";
const parts = [
  require("../js/core/movers.js"),
  require("../js/core/master.js"),
  require("../js/core/words.js"),
  require("../js/features/relationship.js"),
  require("../js/features/historian.js"),
  require("../js/features/writer/writer.js"),
  require("../js/features/analyzer.js"),
  require("../js/features/scribe.js"),
  require("../js/features/scientist.js"),
];
module.exports = Object.assign({}, ...parts.map(p => { const c = Object.assign({}, p); delete c.mount; return c; }));
