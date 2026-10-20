// features/parable.js — "A parable of peace" and "Continue your story".
//
// The last stage after Update (never in a crisis, never online).
// 1. parable(m, ctx): five to eight sentences in parable form, composed from
//    the numbers: the feeling (dominant mover), the grip (features/grip.js),
//    past to future (features/past.js), the lever and its practice (the
//    step), the companion's name, and, with faith on, the themes and
//    references of the verses chosen together (features/scripture.js). It
//    opens with the cornerstone image (seeds resting in water above a
//    counter on the cornerstone; faith on names Christ the cornerstone,
//    1 Peter 2:6, and the tree by streams, Psalm 1:3), moves from the past
//    toward the future and ends at rest. Faith off
//    leaves out every verse and reference.
// 2. more(m, ctx): two films (the films feature's offline list and its mood
//    pick) and two or three songs from SONGS, chosen by the same seed as the
//    verses (Scripture.seed). Each pick has one line on how it continues the
//    parable. No lyrics are quoted (titles and artists only).
//    SONGS: 45 well-known recordings, each title and artist checked to be a
//    real release (worship / Christian and general uplifting), tagged by
//    theme. Worship songs are offered only with faith on.

if (typeof window === "undefined") require("../data/strings.js");
(function (MF) {
  "use strict";
  const Str = MF.Strings;   // every word lives in js/data/strings.js

  /** [title, artist, worship?, themes] */
  const SONGS = [
    ["Oceans (Where Feet May Fail)", "Hillsong United", true, ["fear", "avoidance", "hope"]],
    ["It Is Well with My Soul", "Audrey Assad", true, ["calm", "sadness"]],
    ["Amazing Grace (My Chains Are Gone)", "Chris Tomlin", true, ["shame", "renewal"]],
    ["10,000 Reasons (Bless the Lord)", "Matt Redman", true, ["hope", "calm"]],
    ["Way Maker", "Sinach", true, ["hope", "renewal", "avoidance"]],
    ["Goodness of God", "Bethel Music", true, ["hope", "connection", "renewal"]],
    ["Raise a Hallelujah", "Bethel Music", true, ["fear", "avoidance"]],
    ["Do It Again", "Elevation Worship", true, ["hope", "sadness"]],
    ["Graves into Gardens", "Elevation Worship", true, ["renewal", "shame"]],
    ["The Blessing", "Kari Jobe and Cody Carnes", true, ["calm", "connection"]],
    ["Build My Life", "Housefires", true, ["rumination", "calm"]],
    ["Reckless Love", "Cory Asbury", true, ["shame", "connection"]],
    ["You Say", "Lauren Daigle", true, ["shame", "rumination"]],
    ["Rescue", "Lauren Daigle", true, ["sadness", "fear"]],
    ["Trust in You", "Lauren Daigle", true, ["fear", "patience"]],
    ["Scars in Heaven", "Casting Crowns", true, ["sadness", "hope"]],
    ["Voice of Truth", "Casting Crowns", true, ["fear", "rumination", "avoidance"]],
    ["Even If", "MercyMe", true, ["sadness", "patience"]],
    ["I Can Only Imagine", "MercyMe", true, ["hope", "sadness"]],
    ["Gratitude", "Brandon Lake", true, ["calm", "hope"]],
    ["Same God", "Elevation Worship", true, ["fear", "hope"]],
    ["Christ Is Enough", "Hillsong Worship", true, ["calm", "selfcontrol"]],
    ["Cornerstone", "Hillsong Worship", true, ["fear", "calm"]],
    ["Good Good Father", "Chris Tomlin", true, ["connection", "shame"]],
    ["Thy Will", "Hillary Scott and the Scott Family", true, ["sadness", "patience"]],
    ["Peace Be Still", "The Belonging Co", true, ["calm", "fear", "anger"]],
    ["Tell Your Heart to Beat Again", "Danny Gokey", true, ["renewal", "sadness", "shame"]],
    ["Hills and Valleys", "Tauren Wells", true, ["sadness", "hope", "patience"]],
    ["Here Comes the Sun", "The Beatles", false, ["hope", "sadness", "renewal"]],
    ["Three Little Birds", "Bob Marley and the Wailers", false, ["fear", "calm"]],
    ["Lean on Me", "Bill Withers", false, ["connection", "sadness"]],
    ["Fix You", "Coldplay", false, ["sadness", "connection"]],
    ["Rise Up", "Andra Day", false, ["avoidance", "hope"]],
    ["Keep Your Head Up", "Andy Grammer", false, ["hope", "patience"]],
    ["Count on Me", "Bruno Mars", false, ["connection"]],
    ["What a Wonderful World", "Louis Armstrong", false, ["calm", "hope", "gentleness"]],
    ["Let It Be", "The Beatles", false, ["calm", "rumination", "patience"]],
    ["Brave", "Sara Bareilles", false, ["avoidance", "fear"]],
    ["Breathe (2 AM)", "Anna Nalick", false, ["rumination", "calm"]],
    ["The Climb", "Miley Cyrus", false, ["patience", "hope"]],
    ["Stand by Me", "Ben E. King", false, ["connection", "fear"]],
    ["Unwritten", "Natasha Bedingfield", false, ["renewal", "hope"]],
    ["You've Got a Friend", "Carole King", false, ["connection", "sadness"]],
    ["Don't Worry, Be Happy", "Bobby McFerrin", false, ["rumination", "anger", "gentleness"]],
    ["Weightless", "Marconi Union", false, ["calm", "anger", "selfcontrol"]],
  ].map(([t, a, worship, themes]) => ({ t, a, worship, themes }));

  const S = () => MF.Scripture;
  const FEEL = { fear: Str.t("parable.FEEL.fear"), sadness: Str.t("parable.FEEL.sadness"), anger: Str.t("parable.FEEL.anger"), shame: Str.t("parable.FEEL.shame"), rumination: Str.t("parable.FEEL.rumination"), avoidance: Str.t("parable.FEEL.avoidance") };
  const GRIP = { fear: "fear", loop: Str.t("parable.GRIP.loop"), vice: Str.t("parable.GRIP.vice") };
  const PAST = { self: Str.t("parable.PAST.self"), other: Str.t("parable.PAST.other"), loop: Str.t("parable.PAST.loop") };
  const AHEAD = { bps: Str.t("parable.AHEAD.bps"), future: Str.t("parable.AHEAD.future") };

  /**
   * The parable as beats [{id, text}] (5–8): open, grip?, crossroads?, bend, verses|remember,
   * peace, share?, evening. Each beat has a matching scene (features/scenes.js), so text and
   * picture come from the same list. ctx.gov (core/governor.js) adds the shared-table beat
   * when activation or true-size drift is high, and dropping "peace" keeps it at 8.
   */
  function beats(m, ctx = {}) {
    if (!m || m.crisis || !m.e) return [];
    const dom = S().dominant(m), friend = ctx.friend || "Willow", animal = ctx.animal || "fawn";
    const out = [];
    // The cornerstone image opens the parable (faith on: Christ the cornerstone, 1 Peter 2:6; a tree by streams, Psalm 1:3).
    const open = ctx.faith
      ? Str.t("parable.beats.open.seeds_rested_in_still_water")
      : Str.t("parable.beats.open.seeds_rested_in_still_water_2");
    out.push({ id: "open", text: Str.t("parable.beats.text", { open: open, v1: dom ? FEEL[dom] : Str.t("parable.beats.text.a_quiet_heart"), friend: friend, animal: animal }) });
    if (ctx.grip && ctx.grip.show) out.push({ id: "grip", text: Str.t("parable.beats.text_2", { v0: GRIP[ctx.grip.top][0].toUpperCase() + GRIP[ctx.grip.top].slice(1) }) });
    if (ctx.past && ctx.past.show) out.push({ id: "crossroads", text: Str.t("parable.beats.text_3", { v0: PAST[ctx.past.tech], v1: AHEAD[ctx.past.future] }) });
    const pr = m.practice && MF.Practices && MF.Practices.LIBRARY[m.practice.id];
    out.push({ id: "bend", text: Str.t("parable.beats.text_4", { friend: friend, v1: pr ? `, ${pr.name.replace(/:.*$/, "").toLowerCase().replace(/^(\d)/, "the $1")}` : "", v2: ctx.about && MF.About && MF.About.metaphor(ctx.about) ? `, ${MF.About.metaphor(ctx.about)}` : "" }) });
    const tog = ctx.faith && ctx.together;
    if (tog) out.push({ id: "verses", text: Str.t("parable.beats.text_5", { v0: tog.themes.map(t => S().THEMES[t].label).join(" and ").replace(/ and (.*) and /, ", $1 and "), v1: tog.verses.map(v => v.ref).join("; "), v2: S().THREAD[tog.thread].replace(Str.t("parable.beats.text.you_are"), Str.t("parable.beats.text.she_was")) }) });
    else out.push({ id: "remember", text: Str.t("parable.beats.text_6", { v0: S().THREAD[ctxThread(m, ctx)].replace(Str.t("parable.beats.text.you_are"), Str.t("parable.beats.text.she_was")) }) });
    const band = m.peace && MF.Peace ? MF.Peace.band(m.peace.P) : "growing";
    out.push({ id: "peace", text: Str.t("parable.beats.text_7", { band: band }) });
    const g = ctx.gov;
    if (g && (g.s.Mn >= 0.4 || (g.s.G || 0) >= 0.4)) out.push({ id: "share", text: Str.t("parable.beats.text_8") });
    out.push({ id: "evening", text: tog ? Str.t("parable.beats.text.by_evening_she_sat_by") : Str.t("parable.beats.text.by_evening_she_sat_by_2") });
    if (out.length > 8) out.splice(out.findIndex(b => b.id === "peace"), 1);
    return out.slice(0, 8);
  }
  /** The parable sentences (5–8): the text of beats(). */
  function parable(m, ctx = {}) {
    return beats(m, ctx).map(b => b.text);
  }
  /** Faith off: a thread from the themes alone. */
  function ctxThread(m, ctx) {
    const t = ctx.past && ctx.past.show ? "renewal" : S().dominant(m) || S().theme(m);
    return S().THEMES[t].tags[0];
  }

  const FILM_LINE = Str.t("parable.FILM_LINE.watch_it_as_the_traveler");
  const SONG_LINE = { fear: Str.t("parable.SONG_LINE.fear"), sadness: Str.t("parable.SONG_LINE.sadness"), anger: Str.t("parable.SONG_LINE.anger"), shame: Str.t("parable.SONG_LINE.shame"), calm: Str.t("parable.SONG_LINE.calm"), connection: Str.t("parable.SONG_LINE.connection"), hope: Str.t("parable.SONG_LINE.hope"), rumination: Str.t("parable.SONG_LINE.rumination"), avoidance: Str.t("parable.SONG_LINE.avoidance"), patience: Str.t("parable.SONG_LINE.patience"), gentleness: Str.t("parable.SONG_LINE.gentleness"), selfcontrol: Str.t("parable.SONG_LINE.selfcontrol"), renewal: Str.t("parable.SONG_LINE.renewal") };

  /** Two films and two or three songs, seeded; each with a one-line prompt. */
  function more(m, ctx = {}) {
    if (!m || m.crisis || !m.e) return null;
    const seed = S().seed(m, ctx);
    const themes = ctx.faith && ctx.together ? ctx.together.themes : [ctx.past && ctx.past.show ? "renewal" : S().theme(m), S().dominant(m) || "calm", "hope"];
    const uniq = [...new Set(themes)];
    const songs = [];
    uniq.forEach((t, i) => {
      const fit = SONGS.filter(s => s.themes.includes(t) && (ctx.faith || !s.worship) && !songs.includes(s));
      if (fit.length && songs.length < 3) songs.push(fit[(seed + i * 5) % fit.length]);
    });
    const ex = MF.About && ctx.about ? MF.About.extras(ctx.about) : { songs: 0, films: 0 };
    // About me: music adds one more song, films one more film (still seeded).
    if (ex.songs) { const fit = SONGS.filter(s => (ctx.faith || !s.worship) && !songs.includes(s)); if (fit.length) songs.push(fit[(seed + 7) % fit.length]); }
    while (songs.length < 2) songs.push(SONGS.filter(s => !s.worship && !songs.includes(s))[seed % 10]);
    let films = [];
    if (MF.Movies) {
      const p = MF.Movies.pick(m), id = p ? p.id : "inspire";
      const pool = MF.Movies.pool(id, { faith: ctx.faith });
      films = pool.length ? [pool[seed % pool.length], pool[(seed + 1) % pool.length]].concat(ex.films ? [pool[(seed + 2) % pool.length]] : []).filter((f, i, a) => a.indexOf(f) === i) : [];
    }
    const tag = s => s.themes.find(t => uniq.includes(t)) || s.themes[0];
    return {
      films: films.map(f => ({ title: f.t, year: f.y, line: `${f.t} (${f.y}). ${FILM_LINE}` })),
      songs: songs.map(s => ({ title: s.t, artist: s.a, worship: s.worship, theme: tag(s), line: `\u201C${s.t}\u201D by ${s.a}: ${SONG_LINE[tag(s)]}.` })),
    };
  }

  MF.Parable = { SONGS, FEEL, SONG_LINE, beats, parable, more };
})(typeof window !== "undefined" ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
if (typeof module !== "undefined") module.exports = global.MF.Parable;
