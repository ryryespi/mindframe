// features/movies.js — "Watch something": film suggestions from the reading.
//
// Willow suggests a film mood that might help, and three films at a time.
// 1. The mapping (pick) is a model, decided by the master function's reading:
//    the strongest hard mover, the inner-peace band and lever, self-blame
//    (forgiveness / freeing mix) and connection pick one "what might help" mood:
//      sadness → gentle and uplifting     fear / avoiding → cozy and safe
//      anger → calming, with perspective  shame / self-blame → second chances
//      alone (low connection) → friendship and family
//      replaying → absorbing, light adventure   calm or hopeful → inspiring
//    It follows mood management theory (Zillmann, 1988, American Behavioral
//    Scientist 31(3):327–340): people choose media to ease bad moods and keep
//    good ones, and calm content lowers arousal while absorbing content
//    interrupts rumination. A model and a suggestion, not a treatment.
// 2. Offline first: FILMS is a small curated list (59 well-known, mostly
//    G / PG films). Every title, year, Wikidata id and English Wikipedia
//    link was checked against Wikidata and Wikipedia. Nothing is fetched to
//    show them.
// 3. "Find more online" is the app's only network call, and only on a tap
//    after showing what will be sent: the mood's genre ids and fixed filters,
//    to query.wikidata.org (free, no key, CORS open, CC0 data). Never the
//    text, feelings words or names. Results live in memory for this session.
//    Optionally the user can paste their own TMDB v3 key (off by default,
//    stored only in this browser, never in the mf code) for posters and ratings.
// 4. A crisis shows no films. Watching is not a caring action (no growth).
// The pure parts are tested in node; mount() is browser only.

if (typeof window === "undefined") { require("../data/strings.js"); require("../core/equations.js"); }
(function (MF) {
  "use strict";
  const Str = MF.Strings;   // every word lives in js/data/strings.js
  const P = MF.Params;   // every number: data/params.js

  // Wikidata genre items (labels checked on wikidata.org).
  const WD = {
    Q1361932: "family film", Q202866: "animated film", Q859369: "comedy drama", Q157443: "comedy film",
    Q2143665: "children's film", Q1760864: "nature documentary", Q130232: "drama film",
    Q102429885: "coming-of-age film", Q663106: "buddy film", Q319221: "adventure film",
    Q157394: "fantasy film", Q645928: "biographical film", Q842256: "musical film",
    Q9259727: "religious film", Q115122793: "Christian film", Q1339864: "sport film",
  };
  // Never online: horror, thriller, war, crime, action and Western films, everywhere.
  const NOT_WD = { Q200092: "horror film", Q2484376: "thriller film", Q369747: "war film", Q959790: "crime film", Q188473: "action film", Q172980: "Western film" };
  // Cozy and calm also leave out science fiction, post-apocalyptic and fantasy films.
  const NOT_SOFT = { Q471839: "science fiction film", Q1341051: "post-apocalyptic film", Q157394: "fantasy film" };
  // Well-known family-rated films built around a death, a suicide or a lot of
  // violence. Genres can't tell, so online results drop these on the device
  // (nothing extra is sent). Ids checked on Wikipedia / Wikidata.
  const SKIP = ["Q106316", "Q185071", "Q279274", "Q833299", "Q1129290", "Q1851869", "Q43051", "Q40302", "Q7993465", "Q274520", "Q59249",
    "Q2165639", "Q1138751", "Q2294175", "Q762140", "Q1455870", "Q202211", "Q1068384"];
  // US ratings on Wikidata (P1657): G and PG are fine; PG-13, R, NC-17 and X are left out.
  const RATED_OK = ["Q18665330", "Q18665334"];
  const RATED_NO = ["Q18665339", "Q18665344", "Q18665349", "Q47274658"];
  const KIDS = ["Q1361932", "Q2143665", "Q202866", "Q1760864"];
  const FAITH_WD = ["Q9259727", "Q115122793"];
  // TMDB movie genre ids (from TMDB's genre list).
  const TMDB_GENRES = { 16: "Animation", 35: "Comedy", 10751: "Family", 99: "Documentary", 18: "Drama", 12: "Adventure", 14: "Fantasy", 36: "History", 10402: "Music" };

  /** The "what might help" film moods. */
  const MOODS = {
    gentle: { name: Str.t("movies.MOODS.gentle.name"), short: Str.t("movies.MOODS.gentle.short"), ask: Str.t("movies.MOODS.gentle.ask"),
      why: Str.t("movies.MOODS.gentle.why"), wd: ["Q1361932", "Q202866", "Q859369"], tmdb: [10751, 16] },
    cozy: { name: Str.t("movies.MOODS.cozy.name"), short: Str.t("movies.MOODS.cozy.short"), ask: Str.t("movies.MOODS.cozy.ask"),
      why: Str.t("movies.MOODS.cozy.why"), wd: ["Q2143665", "Q202866"], not: Object.keys(NOT_SOFT), tmdb: [16, 35] },
    calm: { name: Str.t("movies.MOODS.calm.name"), short: Str.t("movies.MOODS.calm.short"), ask: Str.t("movies.MOODS.calm.ask"),
      why: Str.t("movies.MOODS.calm.why"), wd: ["Q1760864"], not: Object.keys(NOT_SOFT), min: 8, tmdb: [99] },
    worth: { name: "about second chances and self-worth", short: Str.t("movies.MOODS.worth.short"), ask: Str.t("movies.MOODS.worth.ask"),
      why: Str.t("movies.MOODS.worth.why"), wd: ["Q859369", "Q102429885"], tmdb: [18, 10751] },
    together: { name: Str.t("movies.MOODS.together.name"), short: Str.t("movies.MOODS.together.short"), ask: Str.t("movies.MOODS.together.ask"),
      why: Str.t("movies.MOODS.together.why"), wd: ["Q663106", "Q1361932", "Q102429885"], tmdb: [10751] },
    absorb: { name: Str.t("movies.MOODS.absorb.name"), short: Str.t("movies.MOODS.absorb.short"), ask: Str.t("movies.MOODS.absorb.ask"),
      why: Str.t("movies.MOODS.absorb.why"), wd: ["Q319221", "Q157394", "Q202866"], tmdb: [12, 14] },
    inspire: { name: "inspiring", short: Str.t("movies.MOODS.inspire.short"), ask: Str.t("movies.MOODS.inspire.ask"),
      why: Str.t("movies.MOODS.inspire.why"), wd: ["Q645928", "Q842256", "Q1339864"], tmdb: [36, 10402, 18] },
  };
  const MOVER_MOOD = { sadness: "gentle", fear: "cozy", avoidance: "cozy", anger: "calm", shame: "worth", rumination: "absorb" };

  /**
   * The curated local list. t title, y year (first release), q Wikidata id,
   * w English Wikipedia article, m moods it suits, faith a faith-friendly
   * pick, why one short reason in words.
   */
  const FILMS = [
    { t: "Paddington", y: 2014, q: "Q15055478", w: "Paddington_(film)", m: ["gentle", "cozy"], why: "A kind bear from Peru finds a home with a London family." },
    { t: "Paddington 2", y: 2017, q: "Q27590871", w: "Paddington_2", m: ["gentle", "worth"], why: "Kindness wins people over, even in the hardest places." },
    { t: "Up", y: 2009, q: "Q174811", w: "Up_(2009_film)", m: ["gentle", "together"], why: "An old man and a young scout find an adventure and a friendship." },
    { t: "Inside Out", y: 2015, q: "Q6144664", w: "Inside_Out_(2015_film)", m: ["gentle"], why: "Shows that sadness has its place, and helps the joy mean more." },
    { t: "Coco", y: 2017, q: "Q5815826", w: "Coco_(2017_film)", m: ["gentle", "together"], why: "A boy learns how much his family remembers and loves." },
    { t: "My Neighbor Totoro", y: 1988, q: "Q39571", w: "My_Neighbor_Totoro", m: ["gentle", "cozy"], why: "Two sisters find comfort and wonder in the countryside." },
    { t: "Babe", y: 1995, q: "Q720724", w: "Babe_(film)", m: ["gentle", "worth"], why: "A gentle piglet shows that kindness can be a strength." },
    { t: "WALL-E", y: 2008, q: "Q104905", w: "WALL-E", m: ["gentle", "together"], why: "A small, lonely robot finds a friend and cares for the Earth." },
    { t: "Kiki's Delivery Service", y: 1989, q: "Q196602", w: "Kiki's_Delivery_Service", m: ["cozy", "worth"], why: "A young witch finds her place, and her confidence, in a new town." },
    { t: "Ponyo", y: 2008, q: "Q236728", w: "Ponyo", m: ["cozy", "gentle"], why: "A sweet seaside fairy tale about a goldfish who wants to be a girl." },
    { t: "Winnie the Pooh", y: 2011, q: "Q922193", w: "Winnie_the_Pooh_(2011_film)", m: ["cozy"], why: "Short, soft and funny, with old friends in the Hundred Acre Wood." },
    { t: "Toy Story", y: 1995, q: "Q171048", w: "Toy_Story", m: ["cozy", "together"], why: "Familiar, funny and warm: two rival toys become friends." },
    { t: "Finding Nemo", y: 2003, q: "Q132863", w: "Finding_Nemo", m: ["cozy", "together"], why: "A worried dad learns to trust, and father and son find each other again." },
    { t: "Shaun the Sheep Movie", y: 2015, q: "Q15545272", w: "Shaun_the_Sheep_Movie", m: ["cozy"], why: "Gentle comedy with almost no words and a happy ending." },
    { t: "Chicken Run", y: 2000, q: "Q156401", w: "Chicken_Run", m: ["cozy", "absorb"], why: "A funny clay-animation escape, with friends who never give up." },
    { t: "The Princess Bride", y: 1987, q: "Q506418", w: "The_Princess_Bride_(film)", m: ["cozy", "absorb"], why: "A grandfather reads his grandson a funny fairy-tale adventure." },
    { t: "March of the Penguins", y: 2005, q: "Q330113", w: "March_of_the_Penguins", m: ["calm", "inspire"], why: "Slow, wide views of emperor penguins getting through the winter together." },
    { t: "Earth", y: 2007, q: "Q819105", w: "Earth_(2007_film)", m: ["calm"], why: "A quiet journey across the planet and its animals." },
    { t: "Oceans", y: 2010, q: "Q597788", w: "Oceans_(film)", m: ["calm"], why: "Calm, long looks at life in the sea." },
    { t: "Microcosmos", y: 1996, q: "Q675044", w: "Microcosmos_(film)", m: ["calm"], why: "Almost no words: insects and dew drops up close." },
    { t: "The Straight Story", y: 1999, q: "Q1139454", w: "The_Straight_Story", m: ["calm", "worth"], why: "An old man rides a lawn mower for miles to make peace with his brother." },
    { t: "Winged Migration", y: 2001, q: "Q747346", w: "Winged_Migration", m: ["calm"], why: "Flying alongside birds on their long journeys." },
    { t: "Monkey Kingdom", y: 2015, q: "Q16998034", w: "Monkey_Kingdom", m: ["calm", "together"], why: "A gentle nature story about a monkey mother and her family in Sri Lanka." },
    { t: "Kung Fu Panda", y: 2008, q: "Q129193", w: "Kung_Fu_Panda_(film)", m: ["worth", "absorb"], why: "An unlikely hero learns there is no secret ingredient: he is enough." },
    { t: "Ratatouille", y: 2007, q: "Q170035", w: "Ratatouille_(film)", m: ["worth"], why: "Anyone can cook: a gift can come from anywhere." },
    { t: "The Lion King", y: 1994, q: "Q36479", w: "The_Lion_King", m: ["worth"], why: "A young lion stops running from the past and comes home." },
    { t: "How to Train Your Dragon", y: 2010, q: "Q373096", w: "How_to_Train_Your_Dragon_(2010_film)", m: ["worth", "together"], why: "A boy who never fits in finds his own way, and a friend." },
    { t: "The Muppet Christmas Carol", y: 1992, q: "Q714721", w: "The_Muppet_Christmas_Carol", m: ["worth", "cozy"], faith: true, why: "A cozy, funny telling of a man who changes his heart in one night." },
    { t: "Wreck-It Ralph", y: 2012, q: "Q28891", w: "Wreck-It_Ralph", m: ["worth"], why: "A video game bad guy learns he doesn't need a medal to be good." },
    { t: "Dumbo", y: 1941, q: "Q40895", w: "Dumbo", m: ["worth"], why: "The thing he was teased for becomes his gift." },
    { t: "Groundhog Day", y: 1993, q: "Q488655", w: "Groundhog_Day_(film)", m: ["worth", "absorb"], why: "A grumpy man lives the same day again and again until he grows kinder." },
    { t: "Lilo & Stitch", y: 2002, q: "Q36092", w: "Lilo_&_Stitch", m: ["together"], why: "Ohana means family, and family means nobody gets left behind." },
    { t: "The Iron Giant", y: 1999, q: "Q867283", w: "The_Iron_Giant", m: ["together", "worth"], why: "A boy and a giant robot become friends: you are who you choose to be." },
    { t: "E.T. the Extra-Terrestrial", y: 1982, q: "Q11621", w: "E.T._the_Extra-Terrestrial", m: ["together"], why: "A lonely boy and a lost visitor help each other." },
    { t: "Charlotte's Web", y: 2006, q: "Q213773", w: "Charlotte's_Web_(2006_film)", m: ["together", "gentle"], why: "A spider's friendship saves a pig's life." },
    { t: "Big Hero 6", y: 2014, q: "Q13091172", w: "Big_Hero_6_(film)", m: ["together", "gentle"], why: "A grieving boy finds care in a gentle robot and new friends." },
    { t: "Luca", y: 2021, q: "Q97925311", w: "Luca_(2021_film)", m: ["together", "cozy"], why: "A sunny summer friendship on the Italian seaside." },
    { t: "Encanto", y: 2021, q: "Q103372692", w: "Encanto", m: ["together", "worth"], why: "A family learns to see and value each other, gifts or not." },
    { t: "The Goonies", y: 1985, q: "Q636043", w: "The_Goonies", m: ["absorb"], why: "A treasure hunt with friends, full of traps and jokes." },
    { t: "Back to the Future", y: 1985, q: "Q91540", w: "Back_to_the_Future", m: ["absorb"], why: "A clever, fun time-travel ride." },
    { t: "Jumanji", y: 1995, q: "Q222939", w: "Jumanji_(film)", m: ["absorb"], why: "A board game comes to life in a fast family adventure." },
    { t: "Spirited Away", y: 2001, q: "Q155653", w: "Spirited_Away", m: ["absorb", "worth"], why: "A girl finds her courage in a strange, beautiful spirit world." },
    { t: "Moana", y: 2016, q: "Q18647981", w: "Moana_(2016_film)", m: ["absorb", "inspire"], why: "An ocean voyage to save her island and find who she is." },
    { t: "Night at the Museum", y: 2006, q: "Q387601", w: "Night_at_the_Museum", m: ["absorb"], why: "A museum comes to life at night; light and funny." },
    { t: "Hugo", y: 2011, q: "Q206576", w: "Hugo_(film)", m: ["absorb", "together"], why: "A boy living in a Paris train station solves a mystery about early films." },
    { t: "The Incredibles", y: 2004, q: "Q213326", w: "The_Incredibles", m: ["absorb", "together"], why: "A superhero family adventure, funny and fast." },
    { t: "Hidden Figures", y: 2016, q: "Q23755544", w: "Hidden_Figures", m: ["inspire"], why: "Three Black women mathematicians help send astronauts into space." },
    { t: "The Sound of Music", y: 1965, q: "Q60072", w: "The_Sound_of_Music_(film)", m: ["inspire", "gentle"], faith: true, why: "Songs, mountains, and a family finding joy together." },
    { t: "October Sky", y: 1999, q: "Q1141420", w: "October_Sky", m: ["inspire"], why: "A coal miner's son builds rockets and follows his dream." },
    { t: "Cool Runnings", y: 1993, q: "Q282748", w: "Cool_Runnings", m: ["inspire", "cozy"], why: "Jamaica's first bobsled team: funny and full of heart." },
    { t: "Queen of Katwe", y: 2016, q: "Q20921603", w: "Queen_of_Katwe", m: ["inspire", "worth"], why: "A girl from Kampala becomes a chess champion." },
    { t: "Soul", y: 2020, q: "Q64744044", w: "Soul_(2020_film)", m: ["inspire", "gentle"], why: "A musician learns that everyday moments are worth living for." },
    { t: "Remember the Titans", y: 2000, q: "Q117696", w: "Remember_the_Titans", m: ["inspire", "together"], why: "A football team learns to come together across race." },
    { t: "Akeelah and the Bee", y: 2006, q: "Q2529557", w: "Akeelah_and_the_Bee", m: ["inspire", "worth"], why: "A girl from South Los Angeles reaches the national spelling bee." },
    { t: "The Prince of Egypt", y: 1998, q: "Q245227", w: "The_Prince_of_Egypt", m: ["inspire", "worth"], faith: true, why: "The story of Moses, told with soaring music." },
    { t: "The Chronicles of Narnia: The Lion, the Witch and the Wardrobe", y: 2005, q: "Q485803", w: "The_Chronicles_of_Narnia:_The_Lion,_the_Witch_and_the_Wardrobe", m: ["absorb", "worth"], faith: true, why: "Four siblings find a magical land, and a lion who forgives." },
    { t: "Chariots of Fire", y: 1981, q: "Q207921", w: "Chariots_of_Fire", m: ["inspire"], faith: true, why: "Two runners at the Olympics; one runs with his faith." },
    { t: "Soul Surfer", y: 2011, q: "Q1156089", w: "Soul_Surfer_(film)", m: ["inspire", "worth"], faith: true, why: "A young surfer returns to the waves after losing her arm." },
    { t: "The Nativity Story", y: 2006, q: "Q171365", w: "The_Nativity_Story", m: ["gentle", "together"], faith: true, why: "A quiet telling of Mary and Joseph's journey to Bethlehem." },
  ];

  /**
   * Pick the film mood from a master reading (null in a crisis or with no
   * reading). The master function decides; this only reads its numbers.
   * @param {object|null} m master output
   * @returns {{id:string, mover:string|null}|null}
   */
  function pick(m) {
    if (!m || m.crisis || !m.e) return null;
    const N = MF.Movers.NAMES, e = m.e, at = n => e[N.indexOf(n)];
    const band = m.peace ? MF.Peace.band(m.peace.P) : null;
    const lever = m.peace && m.peace.lever ? m.peace.lever : null;
    // Self-blame (the forgiveness path or the freeing mix) → second chances.
    const selfBlame = (m.forgive && m.forgive.path === "self") || (m.freeing && m.freeing.selfBlame && m.freeing.show);
    let top = null;
    Object.keys(MOVER_MOOD).forEach(n => { const x = at(n); if (x >= 0.3 && (!top || x > top.x + 1e-9)) top = { n, x }; });
    if (selfBlame && (!top || top.n === "shame" || at("shame") >= 0.3)) return { id: "worth", mover: "shame" };
    // Sad and alone (low connection) → friendship and family.
    if (top && top.n === "sadness" && at("connection") < 0.25) return { id: "together", mover: "sadness" };
    if (top) return { id: MOVER_MOOD[top.n], mover: top.n };
    const lift = Math.max(at("calm"), at("hope"));
    if (band === "close" || band === "steady" || lift >= 0.6) return { id: "inspire", mover: null };
    if (lever && lever.name === "connection" && lever.kind === "grow") return { id: "together", mover: null };
    return { id: "gentle", mover: null };
  }

  /**
   * The films for a mood: the ones made for it first (their first mood), then
   * the others that suit it; with faith on, faith-friendly picks lead.
   */
  function pool(id, opts = {}) {
    const fits = FILMS.filter(f => f.m.includes(id));
    const list = fits.filter(f => f.m[0] === id).concat(fits.filter(f => f.m[0] !== id));
    return opts.faith ? list.filter(f => f.faith).concat(list.filter(f => !f.faith)) : list;
  }

  /**
   * Three suggestions at a time (page 0, 1, … or a start index; wraps
   * around), extra online results appended after the local ones.
   * @returns {object[]} up to three films
   */
  function suggest(id, opts = {}) {
    if (!MOODS[id]) return [];
    const list = pool(id, opts).concat((opts.extra || []).filter(x => !FILMS.some(f => f.q && f.q === x.q)));
    if (!list.length) return [];
    const n = Math.min(3, list.length), start = (opts.start != null ? opts.start : (opts.page || 0) * 3) % list.length;
    return Array.from({ length: n }, (_, i) => list[(start + i) % list.length]);
  }

  /** A link for a film: TMDB when it came from TMDB, else English Wikipedia, else Wikidata. */
  function link(f) {
    if (f.tmdb) return `https://www.themoviedb.org/movie/${f.tmdb}`;
    if (f.w) return `https://en.wikipedia.org/wiki/${encodeURIComponent(f.w).replace(/%2C/g, ",").replace(/%3A/g, ":")}`;
    return `https://www.wikidata.org/wiki/${f.q}`;
  }

  /** The card's single line under See more (words only: a title with no digits). */
  function cardLine(m, opts = {}) {
    const p = pick(m);
    if (!p) return null;
    const f = pool(p.id, opts).find(x => !/[0-9]/.test(x.t));
    return Str.t("movies.cardLine.watch_something_like_has_more", { short: MOODS[p.id].short, t: f.t, v2: opts.name || Str.t("movies.cardLine.your_companion") });
  }

  // ---------- Online (only on a tap) ----------
  const WDQS = "https://query.wikidata.org/sparql";
  const AGENT = Str.t("movies.AGENT.mindframe_21_https_github_com");
  const MIN_LINKS = P.limits.MIN_LINKS;
  const vals = ids => ids.map(q => "wd:" + q).join(" ");

  /**
   * The Wikidata request for a mood. Built ONLY from constants and the mood's
   * genre ids: it takes no text, so nothing the user typed can be in it.
   * @param {string} id a MOODS key
   * @param {{faith?:boolean}} [opts]
   * @returns {{url:string, query:string, host:string, genres:string[], filters:string[]}}
   */
  function wikidataRequest(id, opts = {}) {
    const mood = MOODS[id];
    if (!mood) throw new Error(Str.t("movies.wikidataRequest.unknown_mood"));
    const genres = mood.wd.concat(opts.faith ? FAITH_WD : []);
    const not = Object.keys(NOT_WD).concat(mood.not || []), min = mood.min || MIN_LINKS;
    const query = [
      "SELECT ?film (SAMPLE(?t) AS ?title) (MIN(?y) AS ?year) (SAMPLE(?a) AS ?article) (SAMPLE(?g) AS ?genre) (SAMPLE(?n) AS ?links) WHERE {",
      Str.t("movies.wikidataRequest.query.hint_query_hint_optimizer_none"),
      `  VALUES ?g { ${vals(genres)} }`,
      Str.t("movies.wikidataRequest.query.film_wdt_p136_g"),
      `  ?film wikibase:sitelinks ?n. FILTER(?n >= ${min})`,
      Str.t("movies.wikidataRequest.query.film_wdt_p31_wd_q11424"),
      Str.t("movies.wikidataRequest.query.filter_exists_film_wdt_p1657", { v0: vals(RATED_OK), v1: vals(KIDS.concat(FAITH_WD)) }),
      Str.t("movies.wikidataRequest.query.filter_not_exists_film_wdt", { v0: vals(RATED_NO) }),
      Str.t("movies.wikidataRequest.query.filter_not_exists_film_wdt_2", { v0: vals(not) }),
      "  ?film wdt:P577 ?d. BIND(YEAR(?d) AS ?y)",
      Str.t("movies.wikidataRequest.query.a_schema_about_film_schema"),
      '  ?film rdfs:label ?t. FILTER(LANG(?t) = "en")',
      "} GROUP BY ?film ORDER BY DESC(?links) LIMIT 30",
    ].join("\n");
    return {
      url: `${WDQS}?format=json&query=${encodeURIComponent(query)}`, query, host: "query.wikidata.org",
      genres, not, filters: [Str.t("movies.wikidataRequest.filters.well_known_wikipedia_languages", { min: min }), Str.t("movies.wikidataRequest.filters.rated_g_or_pg_or"), Str.t("movies.wikidataRequest.filters.not_pg_13_or_r"),
        Str.t("movies.wikidataRequest.filters.no_films", { v0: not.map(q => (NOT_WD[q] || NOT_SOFT[q]).replace(/ film$/, "")).join(", ") }), Str.t("movies.wikidataRequest.filters.has_an_english_wikipedia_page")],
    };
  }

  const TMDB_KEY = "mindframe-tmdb-key";
  /** A TMDB v3 API key: 32 hex characters. */
  const validKey = k => /^[a-f0-9]{32}$/i.test(String(k || "").trim());

  /**
   * The TMDB request (only when the user saved their own key). Genre ids
   * and fixed filters only; the key is shown masked.
   */
  function tmdbRequest(id, key) {
    const mood = MOODS[id];
    if (!mood) throw new Error(Str.t("movies.wikidataRequest.unknown_mood"));
    if (!validKey(key)) throw new Error(Str.t("movies.tmdbRequest.no_key"));
    const params = [["with_genres", mood.tmdb.join("|")], ["certification_country", "US"], ["certification.lte", "PG"], ["include_adult", "false"],
      ["sort_by", "vote_average.desc"], ["vote_count.gte", "1000"], ["language", "en-US"], ["page", "1"]];
    const qs = params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
    return { url: `https://api.themoviedb.org/3/discover/movie?${qs}&api_key=${encodeURIComponent(key.trim())}`, shown: `https://api.themoviedb.org/3/discover/movie?${qs}&api_key=(your key)`,
      host: "api.themoviedb.org", genres: mood.tmdb, filters: Str.list("movies.tmdbRequest.filters") };
  }

  /** Plain words for what will be sent (shown before anything is fetched). */
  function preview(req) {
    const names = req.genres.map(g => WD[g] || TMDB_GENRES[g] || String(g));
    return Str.t("movies.preview.only_this_goes_to_film", { host: req.host, v1: names.join(", "), v2: req.filters.join("; ") });
  }

  /** Wikidata JSON → films (title, year, id, Wikipedia article). Bad rows are skipped. */
  function parseWikidata(json) {
    const rows = json && json.results && Array.isArray(json.results.bindings) ? json.results.bindings : [];
    const out = [];
    rows.forEach(b => {
      const v = k => (b[k] && typeof b[k].value === "string" ? b[k].value : "");
      const q = (v("film").match(/\/(Q\d+)$/) || [])[1], t = v("title").slice(0, 120), y = parseInt(v("year"), 10);
      const art = (v("article").match(/^https:\/\/en\.wikipedia\.org\/wiki\/(.+)$/) || [])[1];
      if (!q || !t || !(y > 1880 && y < 2100) || SKIP.includes(q)) return;
      const g = (v("genre").match(/\/(Q\d+)$/) || [])[1];
      out.push({ t, y, q, w: art ? decodeURIComponent(art) : "", m: [], online: true, why: Str.t("movies.why", { v0: WD[g] || "film" }) });
    });
    return out;
  }

  /** TMDB JSON → films (with poster path and rating). */
  function parseTmdb(json) {
    const rows = json && Array.isArray(json.results) ? json.results : [];
    return rows.filter(r => r && r.id && r.title && !r.adult).slice(0, 20).map(r => ({
      t: String(r.title).slice(0, 120), y: parseInt(String(r.release_date || "").slice(0, 4), 10) || null, tmdb: r.id, m: [], online: true,
      poster: /^\/[\w.-]+$/.test(r.poster_path || "") ? `https://image.tmdb.org/t/p/w92${r.poster_path}` : null,
      rating: typeof r.vote_average === "number" ? Math.round(r.vote_average * 10) / 10 : null,
      why: Str.t("movies.why_2"),
    }));
  }

  /**
   * Fetch more films for a mood. Never throws: returns {ok, items} or
   * {ok:false, reason: "offline" | "busy" | "error"}.
   * @param {object} req from wikidataRequest or tmdbRequest
   * @param {Function} fetchFn fetch (injected for tests)
   */
  async function fetchMore(req, fetchFn, opts = {}) {
    if (opts.online === false) return { ok: false, reason: "offline" };
    const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), opts.timeout || 20000) : null;
    try {
      const headers = { Accept: req.host === "query.wikidata.org" ? "application/sparql-results+json" : "application/json" };
      if (req.host === "query.wikidata.org") headers["Api-User-Agent"] = AGENT;
      const res = await fetchFn(req.url, { headers, credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store", signal: ctl ? ctl.signal : undefined });
      if (!res || !res.ok) return { ok: false, reason: res && (res.status === 429 || res.status >= 500) ? "busy" : "error" };
      const json = await res.json();
      const items = req.host === "query.wikidata.org" ? parseWikidata(json) : parseTmdb(json);
      return { ok: true, items };
    } catch (err) {
      return { ok: false, reason: err && err.name === "AbortError" ? "busy" : "offline" };
    } finally { if (timer) clearTimeout(timer); }
  }
  const SORRY = {
    offline: Str.t("movies.SORRY.offline"),
    busy: Str.t("movies.SORRY.busy"),
    error: Str.t("movies.SORRY.error"),
  };

  /** Mount the "Watch something" view in Willow's sheet and the card line. */
  function mount(app) {
    const { $ } = app;
    let start = 0, current = null;
    const extra = {}; // online results, this session only (in memory)
    let pending = null;
    const store = (() => { try { return window.localStorage; } catch (e) { return null; } })();
    const key = () => (store && store.getItem(TMDB_KEY)) || "";

    function list() {
      const ul = $("mv-list");
      ul.innerHTML = "";
      if (!current) return;
      suggest(current.id, { faith: app.faith(), start, extra: extra[current.id + (key() ? "|tmdb" : "")] || [] }).forEach(f => {
        const li = document.createElement("li");
        if (f.poster) { const img = document.createElement("img"); img.src = f.poster; img.alt = ""; img.width = 46; img.loading = "lazy"; img.referrerPolicy = "no-referrer"; li.appendChild(img); }
        const div = document.createElement("div");
        const a = document.createElement("a");
        a.href = link(f); a.target = "_blank"; a.rel = Str.t("movies.noopener_noreferrer");
        a.textContent = f.y ? `${f.t} (${f.y})` : f.t;
        const p = document.createElement("p"); p.className = "small";
        p.textContent = f.rating != null ? Str.t("movies.rated_of_ten", { why: f.why, rating: f.rating }) : f.why;
        div.append(a, p); li.appendChild(div); ul.appendChild(li);
      });
    }
    function render() {
      const m = app.inCrisis() ? null : app.m();
      current = pick(m);
      const ask = current ? MOODS[current.id].ask : Str.t("movies.MOODS.gentle.ask");
      $("pet-watch").querySelector("small").textContent = app.inCrisis() ? "" : ask;
      $("pet-watch").disabled = app.inCrisis();
      const line = app.inCrisis() ? null : cardLine(m, { faith: app.faith(), name: app.companion ? app.companion.get().name : "" });
      $("movie-line").textContent = line || "";
      $("movie-line").classList.toggle("hidden", !line);
      $("mv-intro").textContent = !current ? Str.t("movies.render.tap_update_first_and_i") : `${ask} ${MOODS[current.id].why}`;
      if (!current && !app.inCrisis()) current = { id: "gentle", mover: null, fallback: true };
      $("mv-mood").textContent = current && !app.inCrisis() ? Str.t("movies.render.film_mood", { name: MOODS[current.id].name }) : "";
      $("mv-online").disabled = app.inCrisis();
      $("mv-key-state").textContent = key() ? Str.t("movies.render.your_tmdb_key_is_saved") : Str.t("movies.render.off_find_more_online_uses");
      list();
      cancel();
    }
    function cancel() { pending = null; $("mv-confirm").classList.add("hidden"); }
    // Opening Watch something always starts with the first three films.
    $("pet-watch").addEventListener("click", () => { start = 0; list(); app.open("movies"); });
    $("mv-more").addEventListener("click", () => { start += 3; list(); });
    $("mv-online").addEventListener("click", () => {
      if (!current || app.inCrisis()) return;
      pending = key() ? tmdbRequest(current.id, key()) : wikidataRequest(current.id, { faith: app.faith() });
      $("mv-send-what").textContent = preview(pending);
      $("mv-confirm").classList.remove("hidden");
      $("mv-status").textContent = "";
      $("mv-send").focus();
    });
    $("mv-cancel").addEventListener("click", () => { cancel(); $("mv-online").focus(); });
    $("mv-send").addEventListener("click", async () => {
      if (!pending || app.inCrisis()) return;
      const req = pending, id = current.id, slot = id + (req.host === "api.themoviedb.org" ? "|tmdb" : "");
      cancel();
      $("mv-status").textContent = Str.t("movies.looking_for_more_films");
      const r = await fetchMore(req, (u, o) => fetch(u, o), { online: navigator.onLine !== false });
      if (app.inCrisis()) return;
      if (!r.ok) { $("mv-status").textContent = SORRY[r.reason]; return; }
      const fresh = r.items.filter(x => !FILMS.some(f => f.q && f.q === x.q));
      extra[slot] = fresh;
      if (!fresh.length) { $("mv-status").textContent = Str.t("movies.no_new_films_found_this"); return; }
      start = pool(id, { faith: app.faith() }).length; // the new films first
      list();
      $("mv-status").textContent = Str.t("movies.found_more_films_from_kept", { v0: req.host === "api.themoviedb.org" ? "TMDB" : "Wikidata" });
    });
    $("mv-key-save").addEventListener("click", () => {
      const k = $("mv-key").value.trim();
      if (!validKey(k)) { $("mv-key-state").textContent = Str.t("movies.that_doesn_t_look_like"); return; }
      if (store) store.setItem(TMDB_KEY, k);
      $("mv-key").value = "";
      render();
    });
    $("mv-key-clear").addEventListener("click", () => { if (store) store.removeItem(TMDB_KEY); render(); });
    app.onCrisis(render);
    return () => { start = 0; render(); };
  }

  MF.Movies = { MOODS, FILMS, WD, NOT_WD, NOT_SOFT, SKIP, TMDB_GENRES, MOVER_MOOD, TMDB_KEY, pick, pool, suggest, link, cardLine, wikidataRequest, tmdbRequest, validKey, preview, parseWikidata, parseTmdb, fetchMore, SORRY, mount };
})(typeof window !== "undefined" ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
if (typeof module !== "undefined") module.exports = global.MF.Movies;
