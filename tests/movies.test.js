// Run: node tests/movies.test.js   (no dependencies)
// Watch something (features/movies.js): the film mood per mover from the
// master reading, crisis gives none, the online request carries only genre
// and filter ids (never text), gentle offline / error fallbacks, and the
// curated local list's integrity.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const M = require("./mf.js");
const V = require("../js/features/movies.js");

let passed = 0;
const pending = [];
function test(name, fn) {
  const done = () => { passed += 1; console.log("ok  -", name); };
  const fail = err => { console.error("FAIL -", name); console.error(err); process.exitCode = 1; };
  try { const r = fn(); if (r && r.then) pending.push(r.then(done, fail)); else done(); } catch (err) { fail(err); }
}
const read = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const st = M.defaultState();
const N = M.NAMES;
/** A synthetic reading: e from a map, peace from P (with an optional lever). */
const fake = (map, P = 0.3, extra = {}) => { const e = N.map(n => map[n] || 0); return { e, peace: { P, lever: extra.lever || null }, forgive: extra.forgive || { path: null }, freeing: extra.freeing || null }; };

test("mapping per mover (from the master reading): sad gentle, afraid cozy, angry calm, ashamed second chances, replaying absorbing", () => {
  const cases = [["I am so sad", "gentle"], ["I am scared", "cozy"], ["I am furious", "calm"], ["It was my fault, I can't forgive myself", "worth"],
    ["I keep replaying it over and over", "absorb"], ["I keep avoiding everyone", "cozy"], ["I am so sad and lonely", "together"],
    ["nobody cares about me, I am alone", "together"], ["I feel calm and hopeful", "inspire"]];
  cases.forEach(([t, want]) => assert.equal(V.pick(M.master(t, st)).id, want, t));
  // Synthetic: the strongest hard mover wins; ties and small values do not count.
  assert.equal(V.pick(fake({ fear: 0.5, anger: 0.7, connection: 0.5 })).id, "calm");
  assert.equal(V.pick(fake({ sadness: 0.8, fear: 0.4, connection: 0.6 })).id, "gentle");
  assert.equal(V.pick(fake({ sadness: 0.8, connection: 0.1 })).id, "together", "sad and alone → friendship");
  assert.equal(V.pick(fake({ shame: 0.6, connection: 0.5 })).id, "worth");
  assert.equal(V.pick(fake({ rumination: 0.5, connection: 0.5 })).id, "absorb");
  assert.equal(V.pick(fake({ avoidance: 0.5, connection: 0.5 })).id, "cozy");
  assert.equal(V.pick(fake({ sadness: 0.2, calm: 0.7, connection: 0.5 }, 0.5)).id, "inspire", "calm ≥ 0.6");
  assert.equal(V.pick(fake({ hope: 0.3, calm: 0.3, connection: 0.5 }, 0.85)).id, "inspire", "a steady band");
  assert.equal(V.pick(fake({ connection: 0.1 }, 0.3, { lever: { name: "connection", kind: "grow" } })).id, "together", "growing connection is the lever");
  assert.equal(V.pick(fake({ calm: 0.4, connection: 0.5 }, 0.3)).id, "gentle", "otherwise gentle");
  // Self-blame from the forgiveness path or the freeing mix → second chances, even when another mover is a bit higher.
  assert.equal(V.pick(fake({ sadness: 0.6, shame: 0.4, connection: 0.5 }, 0.3, { forgive: { path: "self" } })).id, "worth");
  assert.equal(V.pick(fake({ shame: 0.35, connection: 0.5 }, 0.3, { freeing: { selfBlame: true, show: true } })).id, "worth");
  assert.deepEqual(Object.keys(V.MOODS).sort(), ["absorb", "calm", "cozy", "gentle", "inspire", "together", "worth"]);
  // Every mood has its own question for Willow to ask, and a reason in words.
  Object.values(V.MOODS).forEach(m => { assert.match(m.ask, /^Want to .+ together\?$/); assert.ok(!/[0-9]/.test(m.ask + m.why + m.name)); });
  assert.equal(V.MOODS.gentle.ask, "Want to watch something gentle together?");
});

test("crisis gives no films (pick, card line); no reading gives none on the card", () => {
  const m = M.master("I want to end it all", st);
  assert.equal(m.crisis, true);
  assert.equal(V.pick(m), null);
  assert.equal(V.cardLine(m), null);
  assert.equal(V.pick(null), null); assert.equal(V.cardLine(null), null);
  assert.equal(V.pick({ crisis: true, e: N.map(() => 0.9) }), null);
  // In the page: the row and Find more online are disabled in a crisis, and a reply that lands during a crisis is dropped.
  const src = read("js/features/movies.js");
  assert.match(src, /\$\("pet-watch"\)\.disabled = app\.inCrisis\(\);/);
  assert.match(src, /\$\("mv-online"\)\.disabled = app\.inCrisis\(\);/);
  assert.match(src, /const r = await fetchMore\([^\n]+\n\s+if \(app\.inCrisis\(\)\) return;/);
  assert.match(src, /app\.onCrisis\(render\)/);
});

test("suggestions: three at a time, More pages through, faith-friendly first with faith on", () => {
  const a = V.suggest("gentle"), b = V.suggest("gentle", { page: 1 });
  assert.equal(a.length, 3); assert.equal(b.length, 3);
  assert.ok(a.every(f => f.m.includes("gentle")));
  assert.ok(!a.some(f => b.includes(f)), "More shows different films");
  assert.equal(a[0].m[0], "gentle", "the films made for the mood come first");
  const seen = new Set();
  for (let p = 0; p < 10; p++) V.suggest("calm", { page: p }).forEach(f => seen.add(f.t));
  assert.equal(seen.size, V.pool("calm").length, "paging wraps around the whole list");
  assert.ok(V.suggest("inspire", { faith: true })[0].faith, "faith on: a faith-friendly pick leads");
  assert.ok(!V.suggest("inspire")[0].faith);
  assert.deepEqual(V.suggest("nope"), []);
  // Online extras come after the local ones and never duplicate them.
  const local = V.pool("gentle");
  const extra = [{ t: "Extra", y: 2000, q: "Q1", m: [], why: "x" }, { ...local[0] }];
  const pages = Math.floor(local.length / 3);
  const later = V.suggest("gentle", { page: pages, extra });
  assert.ok(later.some(f => f.t === "Extra"));
  assert.equal(V.suggest("gentle", { start: local.length, extra })[0].t, "Extra", "a start index shows the new films first");
  assert.equal(V.cardLine(M.master("I am so sad", st), { name: "Pip" }), "Watch something: something gentle, like Paddington. Pip has more ideas.");
  assert.ok(!/[0-9]/.test(V.cardLine(M.master("I keep replaying it", st))), "the card line has no digits");
});

test("the online request carries only genre and filter ids — never text, feelings words or names", () => {
  const ids = new Set(Object.keys(V.WD).concat(Object.keys(V.NOT_WD), Object.keys(V.NOT_SOFT), ["Q11424", "Q18665330", "Q18665334", "Q18665339", "Q18665344", "Q18665349", "Q47274658"]));
  const strip = q => q.replace(/VALUES \?g \{[^}]*\}/, "VALUES ?g {}").replace(/VALUES \?skip \{[^}]*\}/, "VALUES ?skip {}").replace(/FILTER\(\?n >= \d+\)/, "FILTER(?n >= N)");
  const base = strip(V.wikidataRequest("gentle").query);
  Object.keys(V.MOODS).forEach(id => [false, true].forEach(faith => {
    // Extra fields (as if text leaked in) are ignored: the request only reads the mood id and the faith switch.
    const r = V.wikidataRequest(id, { faith, text: "my brother Sam took the car, I'm so angry", name: "Willow" });
    assert.equal(r.host, "query.wikidata.org");
    assert.ok(r.url.startsWith("https://query.wikidata.org/sparql?format=json&query="));
    const u = new URL(r.url);
    assert.deepEqual([...u.searchParams.keys()], ["format", "query"]);
    assert.equal(u.searchParams.get("query"), r.query);
    assert.equal(strip(r.query), base, "the same fixed template for every mood: only the genre ids change");
    (r.query.match(/Q\d+/g) || []).forEach(q => assert.ok(ids.has(q), `${q} is a known genre or filter id`));
    assert.deepEqual(r.genres, V.MOODS[id].wd.concat(faith ? ["Q9259727", "Q115122793"] : []));
    Object.keys(V.NOT_WD).forEach(q => assert.ok(r.not.includes(q) && r.query.includes("wd:" + q), `${id} leaves out ${V.NOT_WD[q]}`));
    assert.equal(r.genres.some(q => r.not.includes(q)), false);
    assert.ok(!/brother|\bSam\b|angry|Willow|sad\b|fear|shame|lonely/.test(decodeURIComponent(r.url)), "no words from the user or the reading");
    const words = V.preview(r);
    assert.match(words, /^Only this goes to query\.wikidata\.org: film genres \(/);
    assert.match(words, /Nothing you typed, no feelings and no names\.$/);
  }));
  assert.throws(() => V.wikidataRequest("I feel sad"), /unknown mood/);
  // TMDB (only with the user's own key): genre ids and fixed filters; the key is never shown.
  const key = "0123456789abcdef0123456789abcdef";
  const t = V.tmdbRequest("gentle", key);
  const tu = new URL(t.url);
  assert.equal(tu.origin + tu.pathname, "https://api.themoviedb.org/3/discover/movie");
  assert.deepEqual([...tu.searchParams.keys()], ["with_genres", "certification_country", "certification.lte", "include_adult", "sort_by", "vote_count.gte", "language", "page", "api_key"]);
  assert.equal(tu.searchParams.get("with_genres"), "10751|16");
  assert.equal(tu.searchParams.get("certification.lte"), "PG");
  assert.ok(!t.shown.includes(key) && !V.preview(t).includes(key), "the key is masked");
  assert.match(V.preview(t), /^Only this goes to api\.themoviedb\.org: film genres \(Family, Animation\)/);
  assert.throws(() => V.tmdbRequest("gentle", "not a key"), /no key/);
  assert.equal(V.validKey(key), true); assert.equal(V.validKey("abc"), false); assert.equal(V.validKey(""), false);
  // Nothing is sent without a confirm tap: the button only shows the preview; Send fetches.
  const src = read("js/features/movies.js");
  const onl = src.slice(src.indexOf('$("mv-online").addEventListener'), src.indexOf('$("mv-cancel")'));
  assert.ok(!/fetch/.test(onl), "Find more online only previews");
  assert.match(onl, /\$\("mv-send-what"\)\.textContent = preview\(pending\)/);
  assert.equal((src.match(/\bfetch\(/g) || []).length, 1, "one fetch call in the app, behind Send");
  // The key is only in this browser: not in the mf code, the workspace or the comfort prompt.
  const code = M.serialize({ ...st, pet: { name: "Willow", points: 1, days: 1 } });
  assert.ok(!/tmdb|key/i.test(code));
  assert.ok(!/tmdb/i.test(read("js/features/scribe.js") + read("js/core/movers.js") + read("js/features/writer/comfort.js")));
});

test("offline first and gentle fallbacks: offline, busy, errors and timeouts never throw", async () => {
  const req = V.wikidataRequest("gentle");
  assert.deepEqual(await V.fetchMore(req, () => { throw new Error("should not fetch"); }, { online: false }), { ok: false, reason: "offline" });
  assert.deepEqual(await V.fetchMore(req, async () => { throw new TypeError("Failed to fetch"); }), { ok: false, reason: "offline" });
  assert.deepEqual(await V.fetchMore(req, async () => ({ ok: false, status: 429 })), { ok: false, reason: "busy" });
  assert.deepEqual(await V.fetchMore(req, async () => ({ ok: false, status: 503 })), { ok: false, reason: "busy" });
  assert.deepEqual(await V.fetchMore(req, async () => ({ ok: false, status: 400 })), { ok: false, reason: "error" });
  assert.deepEqual(await V.fetchMore(req, async () => { const e = new Error("aborted"); e.name = "AbortError"; throw e; }), { ok: false, reason: "busy" });
  assert.deepEqual(await V.fetchMore(req, async () => ({ ok: true, json: async () => { throw new SyntaxError("bad json"); } })), { ok: false, reason: "offline" });
  // A real reply shape (as returned by query.wikidata.org), plus rows to skip.
  let sent = null;
  const ok = await V.fetchMore(req, async (url, o) => { sent = { url, o }; return { ok: true, status: 200, json: async () => ({ results: { bindings: [
    { film: { value: "http://www.wikidata.org/entity/Q27590871" }, title: { value: "Paddington 2" }, year: { value: "2017" }, article: { value: "https://en.wikipedia.org/wiki/Paddington_2" }, genre: { value: "http://www.wikidata.org/entity/Q1361932" } },
    { film: { value: "http://www.wikidata.org/entity/Q1" }, title: { value: "No year" } },
    { film: { value: "not an id" }, title: { value: "Bad" }, year: { value: "2000" } },
  ] } }) }; });
  assert.equal(ok.ok, true); assert.equal(ok.items.length, 1);
  assert.deepEqual(ok.items[0], { t: "Paddington 2", y: 2017, q: "Q27590871", w: "Paddington_2", m: [], online: true, why: "A well-known family film (from Wikidata)." });
  assert.equal(sent.url, req.url);
  assert.equal(sent.o.credentials, "omit"); assert.equal(sent.o.referrerPolicy, "no-referrer"); assert.equal(sent.o.cache, "no-store");
  assert.equal(sent.o.headers.Accept, "application/sparql-results+json");
  assert.match(sent.o.headers["Api-User-Agent"], /^MindFrame\/21 \(https:\/\/github\.com\/ryryespi\/mindframe\)$/);
  assert.deepEqual(Object.keys(sent.o.headers).sort(), ["Accept", "Api-User-Agent"], "no other headers (no cookies, no text)");
  const tm = V.parseTmdb({ results: [{ id: 9, title: "Up", release_date: "2009-05-29", poster_path: "/abc.jpg", vote_average: 7.95 }, { id: 2, title: "X", adult: true }, { title: "no id" }] });
  assert.deepEqual(tm, [{ t: "Up", y: 2009, tmdb: 9, m: [], online: true, poster: "https://image.tmdb.org/t/p/w92/abc.jpg", rating: 8, why: "Well rated on TMDB." }]);
  const skipped = V.parseWikidata({ results: { bindings: [{ film: { value: "http://www.wikidata.org/entity/Q106316" }, title: { value: "Dead Poets Society" }, year: { value: "1989" } }] } });
  assert.deepEqual(skipped, [], "a film on the skip list is dropped on the device");
  assert.ok(V.SKIP.every(q => /^Q\d+$/.test(q)) && !V.FILMS.some(f => V.SKIP.includes(f.q)), "the skip list never hides a local film");
  assert.deepEqual(V.parseWikidata(null), []); assert.deepEqual(V.parseTmdb({}), []);
  Object.values(V.SORRY).forEach(s => assert.ok(!/error|fail/i.test(s) || /Couldn't/.test(s)));
  assert.match(V.SORRY.offline, /still work without the network/);
  // Offline, the local list still gives three films for every mood.
  Object.keys(V.MOODS).forEach(id => assert.equal(V.suggest(id).length, 3, id));
  // The service worker never caches other sites (the film APIs go straight to the network).
  assert.match(read("sw.js"), /if \(new URL\(request\.url\)\.origin !== self\.location\.origin\) return;/);
  assert.match(read("sw.js"), /mindframe-shell-v26/);
  assert.ok(read("sw.js").includes('"./js/features/movies.js"'));
});

test("local list integrity: 40-60 films, no duplicates, every entry has a mood, real ids and links", () => {
  const F = V.FILMS;
  assert.ok(F.length >= 40 && F.length <= 60, `${F.length} films`);
  const uniq = k => new Set(F.map(k)).size;
  assert.equal(uniq(f => f.t.toLowerCase()), F.length, "no duplicate titles");
  assert.equal(uniq(f => f.q), F.length, "no duplicate Wikidata ids");
  assert.equal(uniq(f => f.w), F.length, "no duplicate Wikipedia pages");
  F.forEach(f => {
    assert.ok(Array.isArray(f.m) && f.m.length >= 1, `${f.t} has a mood`);
    f.m.forEach(x => assert.ok(V.MOODS[x], `${f.t}: ${x}`));
    assert.equal(new Set(f.m).size, f.m.length, `${f.t}: moods listed once`);
    assert.ok(Number.isInteger(f.y) && f.y >= 1930 && f.y <= 2025, `${f.t} ${f.y}`);
    assert.match(f.q, /^Q\d+$/);
    assert.match(f.w, /^[^\s/?#]+$/, `${f.t}: a Wikipedia article name`);
    assert.ok(f.why.length > 10 && f.why.length <= 90 && /\.$/.test(f.why), `${f.t}: one short reason`);
    assert.ok(!/[0-9]/.test(f.why), `${f.t}: the reason is in words`);
    assert.match(V.link(f), /^https:\/\/en\.wikipedia\.org\/wiki\/[^\s]+$/);
  });
  Object.keys(V.MOODS).forEach(id => assert.ok(V.pool(id).length >= 6, `${id} has at least six films`));
  assert.ok(F.filter(f => f.faith).length >= 5, "some faith-friendly picks");
  assert.equal(V.link({ q: "Q5" }), "https://www.wikidata.org/wiki/Q5");
  assert.equal(V.link({ tmdb: 14160 }), "https://www.themoviedb.org/movie/14160");
  assert.equal(V.link(F.find(f => f.t === "Lilo & Stitch")), "https://en.wikipedia.org/wiki/Lilo_%26_Stitch");
  // A few spot checks of the verified facts (Wikidata, October 2026).
  const by = t => F.find(f => f.t === t);
  assert.deepEqual([by("Paddington 2").y, by("Paddington 2").q], [2017, "Q27590871"]);
  assert.deepEqual([by("My Neighbor Totoro").y, by("Toy Story").y, by("Hidden Figures").y], [1988, 1995, 2016]);
});

test("page and docs: one Watch something row, its view, the card line, honest privacy, no growth for watching", () => {
  const index = read("index.html"), app = read("js/app.js"), src = read("js/features/movies.js"), readme = read("README.md");
  assert.match(index, /<button type="button" id="pet-watch" class="act act-watch" data-view="movies" aria-controls="p-movies">/);
  assert.match(index, /<div id="p-movies" class="view hidden" role="group" aria-labelledby="v-movies-title">/);
  assert.ok(index.indexOf('id="movie-line"') > index.indexOf('<div id="more"'), "the card line is under See more");
  assert.match(index, /Nothing goes online unless you tap Find more online, which sends only film genres\./);
  assert.match(index, /<summary class="small">Use my own TMDB key \(optional, off\)<\/summary>/);
  assert.match(index, /This product uses the TMDB API but is not endorsed or certified by TMDB\./);
  assert.match(index, /mood management theory, Zillmann, 1988/);
  assert.match(app, /"grace", "movies", "credits"\]/);
  assert.match(app, /MF\.Companion, MF\.Movies, MF\.Scripture, MF\.Credits\]\.map/);
  assert.ok(!/care\(/.test(src), "watching is not a caring action");
  assert.ok(index.indexOf("js/features/movies.js") > index.indexOf("js/features/companion.js"));
  assert.match(readme, /## Watch something/);
  assert.match(readme, /query\.wikidata\.org/);
  assert.match(readme, /Zillmann, D\. \(1988\)\. Mood management through communication choices\. \*American Behavioral Scientist, 31\*\(3\), 327–340/);
  assert.match(readme, /offline cache \(v26\)/);
});

Promise.all(pending).then(() => console.log(`\n${passed} passed`));
