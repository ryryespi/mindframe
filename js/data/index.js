// js/data/index.js — where every piece of MindFrame's content lives (push28).
//
// One index, so nothing has to be hunted for:
//   words and labels      js/data/strings.js     MF.Strings (t(key, vars), list(key))
//   numbers               js/data/params.js      MF.Params (each with its paper section and source)
//   equations             js/core/equations.js   MF.Equations (one function per paper equation)
// Large content stays in its own file (it is data, not interface words), and is listed here:
//   Bible verses (WEB)    features/scripture.js  MF.Scripture.VERSES, CORNER_VERSES
//   films                 features/movies.js     MF.Movies.FILMS (credited to their studios)
//   songs                 features/parable.js    MF.Parable.SONGS (credited to their artists)
//   credits / references  features/credits.js    MF.Credits.ENTRIES
//   stories               features/writer/stories.js   Stories (characters, arcs)
//   path games            features/writer/games.js     Games (types, samples)
//   lexicon (cue words)   core/movers.js LEX, core/kai.js cue lists, core/reality.js (matching data)
// Loaded after every feature and before app.js; MF.Data.check() is used by the tests.
(function (MF) {
  "use strict";
  const g = typeof window !== "undefined" ? window : global;
  const SOURCES = {
    strings: () => MF.Strings, params: () => MF.Params, equations: () => MF.Equations,
    verses: () => MF.Scripture && MF.Scripture.VERSES, cornerVerses: () => MF.Scripture && MF.Scripture.CORNER_VERSES,
    films: () => MF.Movies && MF.Movies.FILMS, songs: () => MF.Parable && MF.Parable.SONGS,
    credits: () => MF.Credits && MF.Credits.ENTRIES,
    // stories.js and games.js declare top-level consts (shared script scope, not window properties)
    stories: () => (typeof Stories !== "undefined" ? Stories : g.Stories), games: () => (typeof Games !== "undefined" ? Games : g.Games),
  };
  /** The content for one name ("verses", "films", …), read live from the module that owns it. */
  const get = name => (SOURCES[name] ? SOURCES[name]() : undefined);
  /** Names whose module is not loaded (tests: none in the app). */
  const check = () => Object.keys(SOURCES).filter(n => !get(n));
  MF.Data = { names: Object.keys(SOURCES), get, check };
})(typeof window !== "undefined" ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
if (typeof module !== "undefined") module.exports = global.MF.Data;
