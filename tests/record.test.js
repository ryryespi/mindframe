// Run: node tests/record.test.js
// Accomplishment record: auto log, manual edits, persistence, counts.
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const R = require("../ariel/suite/record.js");

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}

function memory() {
  const box = {};
  return {
    getItem(k) { return Object.prototype.hasOwnProperty.call(box, k) ? box[k] : null; },
    setItem(k, v) { box[k] = String(v); }
  };
}

const base = {
  collapsed: false,
  collapseText: "",
  layers: [{ name: "Nonsense Layer", role: "nonsense", dots: 2, lines: 1, circles: 0, ink: 0 }]
};

test("a journal note is logged, and a blank note is not", () => {
  const when = "2026-11-09T15:04:00.000Z";
  const item = R.journalEntry("Closed the thought about patience.\nIt took a while.", when);
  assert.equal(item.type, "journal");
  assert.equal(item.source, "auto");
  assert.match(item.text, /^Saved a journal note: Closed the thought about patience\./);
  assert.match(item.note, /a while/);
  let rec = R.add(R.blank(), item, when);
  assert.equal(rec.entries.length, 1);
  assert.equal(rec.entries[0].at, when);
  assert.equal(R.journalEntry("   "), null);
  assert.equal(R.add(rec, { text: "  " }, when).entries.length, 1);
});

test("a new layer and the first marks on it are logged once, then the count updates", () => {
  const t0 = "2026-11-09T16:00:00.000Z";
  const withLayer = {
    collapsed: false,
    layers: base.layers.concat([{ name: "Sketch", role: "", dots: 0, lines: 0, circles: 0, ink: 0 }])
  };
  let rec = R.ingest(R.blank(), null, withLayer, t0);
  assert.equal(rec.entries.length, 0, "the first snapshot is only a baseline");
  rec = R.ingest(rec, base, withLayer, t0);
  assert.equal(rec.entries.length, 1);
  assert.equal(rec.entries[0].type, "layer");
  assert.equal(rec.entries[0].text, "Created your first layer: Sketch");
  const drawn = {
    collapsed: false,
    layers: base.layers.concat([{ name: "Sketch", role: "", dots: 1, lines: 0, circles: 0, ink: 0 }])
  };
  rec = R.ingest(rec, withLayer, drawn, "2026-11-09T16:01:00.000Z");
  assert.equal(rec.entries.length, 2);
  assert.equal(rec.entries[1].text, "Drew your first marks on Sketch");
  assert.equal(rec.entries[1].note, "1 mark");
  const more = {
    collapsed: false,
    layers: base.layers.concat([{ name: "Sketch", role: "", dots: 2, lines: 1, circles: 0, ink: 1 }])
  };
  rec = R.ingest(rec, drawn, more, "2026-11-09T16:02:00.000Z");
  assert.equal(rec.entries.length, 2, "more marks update the same drawing");
  assert.equal(rec.entries[1].note, "4 marks");
  assert.equal(rec.entries[1].at, "2026-11-09T16:01:00.000Z");
  const again = R.ingest(rec, drawn, more, "2026-11-09T16:03:00.000Z");
  assert.equal(again.entries.length, 2);
  const second = {
    collapsed: false,
    layers: more.layers.concat([{ name: "Field", role: "", dots: 0, lines: 0, circles: 0, ink: 0 }])
  };
  rec = R.ingest(rec, more, second, "2026-11-09T16:04:00.000Z");
  assert.equal(rec.entries[rec.entries.length - 1].text, "Created a layer: Field");
});

test("marks that were already on a layer still log the next drawing", () => {
  const present = {
    collapsed: false,
    layers: base.layers.concat([{ name: "Sketch", role: "", dots: 3, lines: 0, circles: 0, ink: 0 }])
  };
  let rec = R.ingest(R.blank(), null, present, "2026-11-09T16:10:00.000Z");
  const grown = {
    collapsed: false,
    layers: base.layers.concat([{ name: "Sketch", role: "", dots: 4, lines: 0, circles: 0, ink: 0 }])
  };
  rec = R.ingest(rec, present, grown, "2026-11-09T16:11:00.000Z");
  assert.equal(rec.entries.length, 1);
  assert.equal(rec.entries[0].text, "Drew your first marks on Sketch");
  assert.equal(rec.entries[0].note, "4 marks");
  const more = {
    collapsed: false,
    layers: base.layers.concat([{ name: "Sketch", role: "", dots: 5, lines: 0, circles: 0, ink: 0 }])
  };
  rec = R.ingest(rec, grown, more, "2026-11-09T16:12:00.000Z");
  assert.equal(rec.entries.length, 1);
  assert.equal(rec.entries[0].note, "5 marks");
});

test("marks already on the Nonsense Layer are not an accomplishment", () => {
  const next = {
    collapsed: false,
    layers: [{ name: "Nonsense Layer", role: "nonsense", dots: 4, lines: 2, circles: 1, ink: 0 }]
  };
  const rec = R.ingest(R.blank(), base, next, "2026-11-09T16:05:00.000Z");
  assert.equal(rec.entries.length, 0);
});

test("collapse logs an I→O bridge, then a closed loop when the line has names", () => {
  const open = { collapsed: true, collapseText: "From I to O: (nothing between). Length 1.", layers: base.layers };
  let rec = R.ingest(R.blank(), base, open, "2026-11-09T17:00:00.000Z");
  assert.equal(rec.entries.length, 1);
  assert.equal(rec.entries[0].type, "bridge");
  assert.equal(rec.entries[0].text, "Drew your first I→O bridge");
  const same = R.ingest(rec, base, open, "2026-11-09T17:01:00.000Z");
  assert.equal(same.entries.length, 1, "the same line is not written twice");
  const named = {
    collapsed: true,
    collapseText: "From I to O: hope → peace, with resistance at doubt. Length 1.",
    layers: base.layers
  };
  const held = Object.assign({}, base, { collapsed: true, collapseText: open.collapseText });
  rec = R.ingest(rec, held, Object.assign({}, named, { collapsed: false }), "2026-11-09T17:02:00.000Z");
  rec = R.ingest(rec, Object.assign({}, named, { collapsed: false }), named, "2026-11-09T17:03:00.000Z");
  assert.equal(rec.entries.length, 2);
  assert.equal(rec.entries[1].type, "loop");
  assert.equal(rec.entries[1].text, "Closed a loop on hope → peace");
  const later = {
    collapsed: true,
    collapseText: "From I to O: (nothing between).",
    layers: base.layers
  };
  rec = R.ingest(rec, Object.assign({}, later, { collapsed: false }), later, "2026-11-09T17:04:00.000Z");
  assert.equal(rec.entries[2].text, "Completed an I→O line");
});

test("a reported kindred card and a knowledge-path step are logged", () => {
  const next = {
    collapsed: false,
    layers: base.layers,
    events: [
      { type: "kindred", title: "Hildegard", saved: false },
      { type: "path", title: "patience", step: "step 2" }
    ]
  };
  const rec = R.ingest(R.blank(), base, next, "2026-11-09T18:00:00.000Z");
  assert.equal(rec.entries[0].text, "Viewed a kindred mind: Hildegard");
  assert.equal(rec.entries[1].text, "Reached step 2 on patience");
  const saved = R.ingest(rec, next, Object.assign({}, next, {
    events: [{ type: "kindred", title: "Hildegard", saved: true }]
  }), "2026-11-09T18:01:00.000Z");
  assert.equal(saved.entries[2].text, "Saved a kindred mind: Hildegard");
});

test("manual add, edit, and delete", () => {
  const t = "2026-11-09T19:00:00.000Z";
  let rec = R.add(R.blank(), { id: "m1", type: "note", text: "Walked the long way home", note: "After class", source: "manual" }, t);
  assert.equal(rec.entries[0].source, "manual");
  assert.equal(rec.entries[0].note, "After class");
  rec = R.edit(rec, "m1", { text: "Walked home", note: "" });
  assert.equal(rec.entries[0].text, "Walked home");
  assert.equal(rec.entries[0].note, "");
  assert.equal(rec.entries[0].edited, true);
  rec = R.edit(rec, "m1", { text: "   " });
  assert.equal(rec.entries[0].text, "Walked home", "an empty edit keeps the old text");
  rec = R.edit(rec, "missing", { text: "nope" });
  assert.equal(rec.entries.length, 1);
  rec = R.remove(rec, "m1");
  assert.equal(rec.entries.length, 0);
  assert.equal(R.remove(rec, "m1").entries.length, 0);
});

test("counts, filter, and a reverse-chronological day grouping", () => {
  let rec = R.blank();
  rec = R.add(rec, { id: "a", type: "journal", text: "Saved a journal note: one", at: "2026-11-08T12:00:00.000Z" }, "2026-11-08T12:00:00.000Z");
  rec = R.add(rec, { id: "b", type: "loop", text: "Closed a loop on hope", at: "2026-11-09T09:00:00.000Z" }, "2026-11-09T09:00:00.000Z");
  rec = R.add(rec, { id: "c", type: "bridge", text: "Drew your first I→O bridge", at: "2026-11-09T15:00:00.000Z" }, "2026-11-09T15:00:00.000Z");
  rec = R.add(rec, { id: "d", type: "drawing", text: "Drew on Sketch", at: "2026-11-09T15:30:00.000Z" }, "2026-11-09T15:30:00.000Z");
  rec = R.add(rec, { id: "e", type: "session", text: "Finished a session", at: "2026-11-09T16:00:00.000Z" }, "2026-11-09T16:00:00.000Z");
  const c = R.counts(rec);
  assert.deepEqual(c, { ideas: 2, loops: 1, drawings: 1, journal: 1 });
  assert.equal(R.summary(rec), "2 ideas finished · 1 loop closed · 1 drawing made · 1 journal entry");
  assert.equal(R.filter(rec, "loop").length, 1);
  assert.equal(R.filter(rec, "all").length, 5);
  const days = R.groupByDay(rec.entries);
  assert.equal(days[0].key, "2026-11-09");
  assert.deepEqual(days[0].entries.map(e => e.id), ["e", "d", "c", "b"]);
  assert.equal(days[1].key, "2026-11-08");
  assert.match(R.summary(rec), /ideas finished/);
  assert.doesNotMatch(R.summary(rec), /streak|great job|amazing|proud/i);
});

test("Remember returns one past entry, and nothing when the record is empty", () => {
  assert.equal(R.remember(R.blank(), () => 0), null);
  const rec = R.add(R.blank(), { id: "a", text: "One", at: "2026-11-09T10:00:00.000Z" }, "2026-11-09T10:00:00.000Z");
  const two = R.add(rec, { id: "b", text: "Two", at: "2026-11-09T11:00:00.000Z" }, "2026-11-09T11:00:00.000Z");
  assert.equal(R.remember(two, () => 0).id, "a");
  assert.equal(R.remember(two, () => 0.99).id, "b");
});

test("the record persists in local storage and merges an import without duplicating ids", () => {
  const store = memory();
  let rec = R.add(R.blank(), { id: "keep", type: "note", text: "Wrote it down", note: "local" }, "2026-11-09T20:00:00.000Z");
  R.save(store, rec);
  const loaded = R.load(store);
  assert.equal(loaded.entries[0].text, "Wrote it down");
  assert.equal(loaded.entries[0].note, "local");
  assert.equal(store.getItem(R.KEY) != null, true);
  const bad = memory();
  bad.setItem(R.KEY, "{not json");
  assert.equal(R.load(bad).entries.length, 0);
  const brought = R.mergeImport(loaded, R.toJSON(R.add(R.blank(), { id: "new", type: "note", text: "From a file" }, "2026-11-09T21:00:00.000Z")));
  assert.equal(brought.ok, true);
  assert.deepEqual(brought.record.entries.map(e => e.id), ["keep", "new"]);
  const twice = R.mergeImport(brought.record, { entries: [{ id: "new", type: "note", text: "From a file" }, { id: "third", type: "journal", text: "Saved a journal note: hi" }] });
  assert.deepEqual(twice.record.entries.map(e => e.id), ["keep", "new", "third"]);
  assert.equal(R.mergeImport(loaded, "nope").ok, false);
  assert.equal(R.mergeImport(loaded, "nope").record.entries.length, 1);
});

test("clearing the marks lets the next drawing be its own entry", () => {
  const layer = { name: "Sketch", role: "", dots: 2, lines: 0, circles: 0, ink: 0 };
  const drawn = { collapsed: false, layers: base.layers.concat([layer]) };
  let rec = R.ingest(R.blank(), base, drawn, "2026-11-09T12:00:00.000Z");
  const cleared = { collapsed: false, layers: base.layers.concat([{ name: "Sketch", role: "", dots: 0, lines: 0, circles: 0, ink: 0 }]) };
  rec = R.ingest(rec, drawn, cleared, "2026-11-09T12:10:00.000Z");
  const again = { collapsed: false, layers: base.layers.concat([{ name: "Sketch", role: "", dots: 1, lines: 0, circles: 0, ink: 0 }]) };
  rec = R.ingest(rec, cleared, again, "2026-11-09T12:20:00.000Z");
  assert.equal(rec.entries.filter(e => e.type === "drawing").length, 2);
});

test("the suite page, the canvas message, and the docs mention the record without adding praise", () => {
  const suite = fs.readFileSync(path.join(__dirname, "../ariel/suite/index.html"), "utf8");
  const shell = fs.readFileSync(path.join(__dirname, "../ariel/shell.js"), "utf8");
  const docs = fs.readFileSync(path.join(__dirname, "../ariel/DOCS.md"), "utf8");
  const readme = fs.readFileSync(path.join(__dirname, "../ariel/README.md"), "utf8");
  const bridge = fs.readFileSync(path.join(__dirname, "../ariel/suite/bridge.js"), "utf8");
  assert.match(suite, /data-tab="record"/);
  assert.match(suite, /What you've done/);
  assert.match(suite, /A record so you don't have to remember it all\./);
  assert.match(suite, /ariel-record|ArielRecord/);
  assert.match(suite, /id="rec-remember"/);
  assert.doesNotMatch(suite, /streak|great job|you broke/i);
  assert.match(shell, /collapseText/);
  assert.match(docs, /Accomplishment Record/);
  assert.match(docs, /988/);
  assert.match(readme, /Accomplishment Record/);
  assert.match(bridge, /===== PARAMS =====/);
  assert.match(bridge, /===== EQUATIONS =====/);
});

console.log(`\n${passed} passed`);
