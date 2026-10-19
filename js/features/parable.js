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

(function (MF) {
  "use strict";

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
  const idx = n => MF.Movers.NAMES.indexOf(n);
  const FEEL = { fear: "a heavy bag of fear", sadness: "a heavy bag of sorrow", anger: "a hot coal of anger", shame: "a stone of shame", rumination: "a tangle of the same thoughts", avoidance: "a wish to turn back" };
  const GRIP = { fear: "fear", loop: "the old loop of thoughts", vice: "a pull that kept tugging at the sleeve" };
  const PAST = { self: "the traveler looked back at a mistake, spoke to it as kindly as to a friend, and set down the stone of self-blame", other: "the traveler thought of the one who had caused the hurt and, slowly, wished them well, without pretending the hurt was small", loop: "the traveler let the old memory walk behind, no longer turning around to replay it" };
  const AHEAD = { bps: "then she pictured the road ahead going as well as it reasonably could, and one small thing to start today", future: "then she wrote a short note to the self who would arrive a year from now" };

  /** The parable sentences (5–8). ctx: {faith, grip, past, together, friend, animal} */
  function parable(m, ctx = {}) {
    if (!m || m.crisis || !m.e) return [];
    const dom = S().dominant(m), friend = ctx.friend || "Willow", animal = ctx.animal || "fawn";
    const out = [];
    // The cornerstone image opens the parable (faith on: Christ the cornerstone, 1 Peter 2:6; a tree by streams, Psalm 1:3).
    const open = ctx.faith
      ? "Seeds rested in still water above a stone counter set on the cornerstone, the way Christ is called the chief cornerstone (1 Peter 2:6), and a tree planted by streams of water bears fruit in its season (Psalm 1:3)"
      : "Seeds rested in still water above a stone counter set on a strong cornerstone, waiting for their season";
    out.push(`${open}. Once, a traveler carried ${dom ? FEEL[dom] : "a quiet heart"} past that water along a winding road, and ${friend} the ${animal} walked beside her.`);
    if (ctx.grip && ctx.grip.show) out.push(`${GRIP[ctx.grip.top][0].toUpperCase() + GRIP[ctx.grip.top].slice(1)} tugged at her; she didn't fight it or run, she named it and let it walk alongside, and its hold loosened a little.`);
    if (ctx.past && ctx.past.show) out.push(`At a crossroads, ${PAST[ctx.past.tech]}; ${AHEAD[ctx.past.future]}.`);
    const pr = m.practice && MF.Practices && MF.Practices.LIBRARY[m.practice.id];
    out.push(`At a quiet bend, ${friend} showed her one small practice${pr ? `, ${pr.name.replace(/:.*$/, "").toLowerCase().replace(/^(\d)/, "the $1")}` : ""}, and she tried it, one breath at a time.`);
    const tog = ctx.faith && ctx.together;
    if (tog) out.push(`She remembered words about ${tog.themes.map(t => S().THEMES[t].label).join(" and ").replace(/ and (.*) and /, ", $1 and ")} (${tog.verses.map(v => v.ref).join("; ")}), and that ${S().THREAD[tog.thread].replace("you are", "she was")}.`);
    else out.push(`She remembered that ${S().THREAD[ctxThread(m, ctx)].replace("you are", "she was")}.`);
    const band = m.peace && MF.Peace ? MF.Peace.band(m.peace.P) : "growing";
    out.push(`Nothing changed all at once; her peace, ${band} at first, grew a little with each step she took.`);
    out.push(tog ? "By evening she sat by still water, and rest came, not because the road was gone, but because she was not walking it alone." : "By evening she sat by still water and rested, carrying the road more lightly than before.");
    return out.slice(0, 8);
  }
  /** Faith off: a thread from the themes alone. */
  function ctxThread(m, ctx) {
    const t = ctx.past && ctx.past.show ? "renewal" : S().dominant(m) || S().theme(m);
    return S().THEMES[t].tags[0];
  }

  const FILM_LINE = "Watch it as the traveler's next evening by the fire: notice where someone in it carries something heavy and finds a small way forward.";
  const SONG_LINE = { fear: "let it walk beside you like the friend on the road", sadness: "let it sit with you at the still water", anger: "let it cool the coal a little", shame: "let it remind you that the stone can be set down", calm: "breathe slowly with it, as the traveler rests", connection: "think of who walks beside you", hope: "picture the road ahead", rumination: "let it give your mind one place to rest", avoidance: "take one step forward while it plays", patience: "let it be slow; the road is long and that is all right", gentleness: "answer the day gently", selfcontrol: "breathe once before you answer anything", renewal: "let it be the first page of the next chapter" };

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
    while (songs.length < 2) songs.push(SONGS.filter(s => !s.worship && !songs.includes(s))[seed % 10]);
    let films = [];
    if (MF.Movies) {
      const p = MF.Movies.pick(m), id = p ? p.id : "inspire";
      const pool = MF.Movies.pool(id, { faith: ctx.faith });
      films = pool.length ? [pool[seed % pool.length], pool[(seed + 1) % pool.length]].filter((f, i, a) => a.indexOf(f) === i) : [];
    }
    const tag = s => s.themes.find(t => uniq.includes(t)) || s.themes[0];
    return {
      films: films.map(f => ({ title: f.t, year: f.y, line: `${f.t} (${f.y}). ${FILM_LINE}` })),
      songs: songs.map(s => ({ title: s.t, artist: s.a, worship: s.worship, theme: tag(s), line: `\u201C${s.t}\u201D by ${s.a}: ${SONG_LINE[tag(s)]}.` })),
    };
  }

  MF.Parable = { SONGS, FEEL, SONG_LINE, parable, more };
})(typeof window !== "undefined" ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
if (typeof module !== "undefined") module.exports = global.MF.Parable;
