// Run: node tests/credits.test.js   (no dependencies)
// push25: Credits (features/credits.js), the README Credits section and the
// "Credits and References" sections of both papers: every entry carries how it
// was checked, flagged entries say why, DOIs are well formed, the gratitude
// line and the dedication are kept, and the sheet view is offline.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const C = require("../js/features/credits.js");

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}
const read = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");

test("entries: 101 sources, 99 verified, 2 flagged (the classical works), each with how it was checked", () => {
  assert.deepEqual(C.counts(), { verified: 99, flagged: 2, total: 101 });
  C.ENTRIES.forEach(e => {
    assert.ok(C.CATEGORIES.includes(e.cat), e.cite);
    assert.ok(e.cite.length > 30 && /\.$/.test(e.cite), e.cite);
    assert.ok(["verified", "flagged"].includes(e.status));
    assert.ok(e.how && e.how.length > 6, `how: ${e.cite}`);
    if (e.doi) assert.match(e.doi, /^10\.\d{4,9}\/\S+$/, e.doi);
    assert.ok(!/doi:/i.test(e.cite), "DOIs live in their own field");
  });
  assert.deepEqual(C.ENTRIES.filter(e => e.status === "flagged").map(e => e.cite.split(".")[0]).sort(), ["Epictetus", "Marcus Aurelius"]);
  assert.equal(new Set(C.ENTRIES.map(e => e.cite)).size, C.ENTRIES.length, "no duplicates");
});

test("named researchers and sources are credited", () => {
  const all = C.ENTRIES.map(e => e.cite).join(" ");
  ["Gottman", "Linehan", "Beck", "Cornish", "Worthington", "Enright", "Neff", "Wegner", "Bowen", "Marlatt", "Borkovec", "Hofmann", "Hayes", "King, L. A.", "Peters, M. L.", "Hershfield", "Gross", "Wolpe", "Bond, F. W.", "World English Bible", "Wikidata", "Teresa of Ávila"]
    .forEach(n => assert.ok(all.includes(n), n));
  const doi = c => C.ENTRIES.find(e => e.cite.startsWith(c)).doi;
  assert.equal(doi("Kabat-Zinn, J. (2003)"), "10.1093/clipsy.bpg016");
  assert.equal(doi("Lieberman"), "10.1111/j.1467-9280.2007.01916.x");
  assert.equal(doi("Wegner"), "10.1037/0022-3514.53.1.5");
  assert.match(C.line(C.ENTRIES.find(e => e.status === "flagged")), /\[flagged: /);
  assert.match(C.GRATITUDE, /With gratitude to every researcher/);
  assert.match(C.MEDIA, /studios and filmmakers.*artists and songwriters.*quotes no lyrics/);
});

test("app: the Credits view in the sheet, offline, cached, no network", () => {
  const html = read("index.html"), app = read("js/app.js"), sw = read("sw.js"), src = read("js/features/credits.js");
  assert.match(html, /id="pet-credits"[^>]*data-view="credits"/);
  assert.match(html, /id="p-credits" class="view hidden"/);
  ["cr-thanks", "cr-count", "cr-list", "cr-media"].forEach(id => assert.match(html, new RegExp(`id="${id}"`)));
  assert.match(html, /js\/features\/credits\.js/);
  assert.match(app, /"movies", "credits"\]/);
  assert.match(app, /MF\.Credits\]\.map/);
  assert.ok(sw.includes("./js/features/credits.js"));
  assert.match(sw, /mindframe-shell-v25/);
  assert.ok(!/fetch\(|XMLHttpRequest/.test(src));
});

test("README Credits and both papers: gratitude, counts, flagged, media note, dedication first", () => {
  const r = read("README.md");
  assert.match(r, /## Credits\n\nWith gratitude to every researcher/);
  assert.match(r, /\*\*99 sources are verified and 2 are flagged\.\*\*/);
  assert.match(r, /Flagged \(kept, not fully verifiable\)/);
  assert.ok(r.indexOf("## Credits") < r.indexOf("## References"));
  assert.ok(!r.includes("clipsy/bpg016"));
  ["paper/MindFrame-Grace-Peace-Paper.tex", "paper/MindFrame-One-Equation.tex"].forEach(f => {
    const t = read(f);
    assert.match(t, /\\section\*\{Credits and References\}/);
    assert.match(t, /With gratitude to every researcher/);
    assert.match(t, /99 are verified; 2 are flagged/);
    assert.match(t, /\[Flagged: Classical work \(Enchiridion\)/);
    assert.match(t, /\\renewcommand\{\\refname\}\{Works cited\}/);
    const ded = t.indexOf("All credit and glory to God. I owe my knowledge to my Lord Jesus Christ.");
    assert.ok(ded > 0 && ded < t.indexOf("\\section"), "the dedication comes before every section");
    assert.ok(fs.existsSync(path.join(__dirname, "..", f.replace(".tex", ".pdf"))));
  });
});

console.log(`\n${passed} passed`);
