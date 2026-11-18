// Run: node --test log/tests
const test = require("node:test");
const assert = require("node:assert/strict");
const M = require("../core.js");
const CH = require("../charts.js");
const day = (d, h = 12) => new Date(2026, 10, d, h).toISOString(); // November 2026, local time

test("stateKey uses the fixed State Finder template", () => {
  assert.equal(M.stateKey(3, 2), "3-2"); assert.equal(M.stateKey("4", "1"), "4-1");
  assert.equal(M.stateKey(0, 1), null); assert.equal(M.stateKey(2, 9), null);
  assert.equal(Object.keys(M.STATE_NAMES).length, 16);
});
test("normalize clamps/validates and rejects bad input", () => {
  assert.equal(M.normalize({}), null); assert.equal(M.normalize({ ts: "not a date" }), null);
  const e = M.normalize({ ts: day(3), type: "daily", peak: { here: 11, absorbed: 4, heard: "7" }, sleepHours: "6.5", energy: 2, stress: 3, pauses: 2 });
  assert.equal(e.peak.here, null); assert.equal(e.peak.absorbed, 4); assert.equal(e.peak.heard, 7);
  assert.equal(e.sleepHours, 6.5); assert.equal(e.stateKey, "2-3"); assert.equal(e.pauses, 2);
  assert.equal(M.normalize({ ts: day(3), type: "weird" }).type, "event");
});
test("peakMean averages the six items, ignoring missing", () => {
  assert.equal(M.peakMean({ peak: { here: 4, absorbed: 6, heard: null, held: 8, done: 2, savored: 10 } }), 6);
  assert.equal(M.peakMean({}), null);
});
test("rolling mean ignores nulls and uses a trailing window", () => {
  assert.deepEqual(M.rolling([2, 4, null, 6, 8], 3), [2, 3, 3, 5, 7]);
  assert.deepEqual(M.rolling([null, null], 7), [null, null]);
});
test("dailySeries fills gaps and takes the night's sleep", () => {
  const es = [M.normalize({ ts: day(2), type: "daily", sleepHours: 7, peak: { here: 6 } }), M.normalize({ ts: day(4), type: "daily", sleepHours: 5, peak: { here: 2 } })];
  const s = M.dailySeries(es, new Date(2026, 10, 1), new Date(2026, 10, 5));
  assert.equal(s.length, 5); assert.equal(s[0].peak, null); assert.equal(s[1].sleep, 7); assert.equal(s[3].peak, 2);
});
test("weekly groups by Monday-start weeks", () => {
  const es = [16, 17, 22, 23].map(d => M.normalize({ ts: day(d), type: "daily", peak: { here: d === 22 ? 2 : 8 } }));
  const w = M.weekly(es);
  assert.deepEqual(w.map(x => x.week), ["2026-11-16", "2026-11-23"]);
  // Nov 22 2026 is a Sunday -> belongs to the week of Nov 16
  assert.equal(w[0].daysLogged, 3); assert.equal(w[1].daysLogged, 1);
});
test("stateFrequency counts the 4x4 grid", () => {
  const es = [[4, 4], [4, 4], [2, 2]].map(([e, s], i) => M.normalize({ ts: day(1 + i), energy: e, stress: s }));
  const f = M.stateFrequency(es);
  assert.equal(f.total, 3); assert.equal(f.counts["4-4"], 2); assert.equal(f.top[0].name, "Total Burnout Alert");
});
test("techniqueEffect = mean(before - after), drills excluded unless asked", () => {
  const es = [
    { ts: day(1), techniques: [{ id: "closeloop", before: 8, after: 4 }] },
    { ts: day(2), techniques: [{ id: "closeloop", before: 6, after: 4 }] },
    { ts: day(3), techniques: [{ id: "dps", before: 5, after: 6 }] },
    { ts: day(4), techniques: [{ id: "dps" }] },
    { ts: day(5), type: "drill", techniques: [{ id: "dps", before: 9, after: 1 }] }
  ].map(M.normalize);
  const t = M.techniqueEffect(es);
  const cl = t.find(x => x.id === "closeloop"), dps = t.find(x => x.id === "dps");
  assert.equal(cl.meanDrop, 3); assert.equal(cl.rated, 2); assert.equal(cl.helpedShare, 1);
  assert.equal(dps.meanDrop, -1); assert.equal(dps.n, 2); assert.equal(dps.rated, 1);
  assert.equal(t[0].id, "closeloop");
  assert.equal(M.techniqueEffect(es, { drillsOnly: true })[0].meanDrop, 8);
});
test("CSV round-trip preserves entries, including commas/quotes/newlines", () => {
  const es = M.sampleData(30, 3, new Date(2026, 10, 18));
  es.push(M.normalize({ id: "tricky", ts: day(10), type: "daily", line: 'He said "here, heard"\nand smiled', peak: { here: 7 }, techniques: [{ id: "pause", before: 6, after: 3 }], drill: { kind: "rest" } }));
  const back = M.fromCSV(M.toCSV(es));
  assert.equal(back.length, es.length);
  const strip = e => JSON.parse(JSON.stringify(Object.assign({}, e, { example: undefined, words: undefined, quoteId: undefined })));
  const byId = Object.fromEntries(back.map(e => [e.id, e]));
  for (const e of es) {
    const b = byId[e.id];
    assert.ok(b, "missing " + e.id);
    assert.deepEqual(strip(b).peak, strip(e).peak); assert.deepEqual(b.techniques, e.techniques);
    assert.equal(b.line, e.line); assert.equal(b.sleepHours, e.sleepHours); assert.equal(b.stateKey, e.stateKey);
  }
});
test("JSON import accepts bundle, array, single Now entry; merge skips duplicates", () => {
  const e = { schema: M.SCHEMA, id: "now-1", ts: day(5), type: "now", energy: 3, stress: 4, techniques: [{ id: "closeloop", before: 7, after: 3 }] };
  assert.equal(M.parseImport(JSON.stringify({ schema: M.SCHEMA, entries: [e] })).length, 1);
  assert.equal(M.parseImport(JSON.stringify([e, e])).length, 2);
  assert.equal(M.parseImport(JSON.stringify(e))[0].stateKey, "3-4");
  const m1 = M.merge([], [e, e]); assert.equal(m1.added, 1); assert.equal(m1.skipped, 1);
  const m2 = M.merge(m1.entries, [e, { ts: "bad" }]); assert.equal(m2.added, 0); assert.equal(m2.skipped, 2);
  assert.throws(() => M.parseImport("{not json"));
});
test("flags: short sleep, sleep drop, overload, high push; none on a healthy log", () => {
  const now = new Date(2026, 10, 18, 22);
  const healthy = []; for (let d = 1; d <= 18; d++) healthy.push(M.normalize({ ts: day(d, 21), type: "daily", sleepHours: 7.5, energy: 2, stress: 2, peak: { here: 7 } }));
  assert.deepEqual(M.flags(healthy, now), []);
  const rough = healthy.map(e => { const d = new Date(e.ts).getDate(); return d >= 15 ? Object.assign({}, e, { sleepHours: 4.5, energy: 4, stress: 4, stateKey: "4-4" }) : e; });
  const ids = M.flags(rough, now).map(f => f.id);
  for (const id of ["short-sleep", "sleep-drop", "high-push", "low-sleep-high-energy", "overload-states"]) assert.ok(ids.includes(id), id);
  for (const f of M.flags(rough, now)) { assert.match(f.detail, /support person/); assert.doesNotMatch(f.detail + f.title, /diagnos|disorder|mania|bipolar/i); }
  // threshold edge: only 2 short nights -> no short-sleep flag
  const two = healthy.map(e => { const d = new Date(e.ts).getDate(); return d >= 17 ? Object.assign({}, e, { sleepHours: 4.9 }) : e; });
  assert.ok(!M.flags(two, now).some(f => f.id === "short-sleep"));
});
test("reports: weekly and monthly ranges, deltas vs previous period", () => {
  const es = M.sampleData(90, 11, new Date(2026, 10, 18));
  const w = M.report(es, "week", new Date(2026, 10, 18));
  assert.equal(w.start, "2026-11-16"); assert.equal(w.end, "2026-11-22");
  const m = M.report(es, "month", new Date(2026, 10, 18));
  assert.equal(m.start, "2026-11-01"); assert.equal(m.end, "2026-11-30"); assert.ok(m.current.entries > 0);
  assert.ok(typeof m.change.peak === "number");
});
test("schedule suggestions find the seeded high-load slots (Tue/Thu 4 pm) and best technique", () => {
  const es = M.sampleData(90, 7, new Date(2026, 10, 18));
  const s = M.suggestSchedule(es).map(x => x.text).join(" | ");
  assert.match(s, /(Tuesday|Thursday)s around 4 pm/);
  assert.match(s, /3:30 pm/);
  assert.match(s, /7\+ hours of sleep/);
});
test("load profile maps stress 1..4 to 0..1 and interpolates missing hours", () => {
  const es = [M.normalize({ ts: day(3, 9), energy: 2, stress: 1 }), M.normalize({ ts: day(3, 13), energy: 2, stress: 4 })];
  const L = M.loadProfile(es);
  assert.equal(L.length, 24); assert.equal(L[9], 0); assert.equal(L[13], 1); assert.equal(+L[11].toFixed(2), 0.5);
  assert.ok(L.every(x => x >= 0 && x <= 1));
});
test("pacing sim: hysteresis switches far less than a single threshold; never resting drains energy", () => {
  const es = M.sampleData(90, 7, new Date(2026, 10, 18));
  for (const dow of [null, 1, 2]) {
    const L = M.loadProfile(es, dow);
    const naive = M.simulateDay(L, "naive", { startEnergy: 80 }).metrics, hyst = M.simulateDay(L, "hysteresis", { startEnergy: 80 }).metrics, none = M.simulateDay(L, "none", { startEnergy: 80 }).metrics;
    assert.ok(hyst.switches <= 0.4 * naive.switches, `hyst ${hyst.switches} vs naive ${naive.switches}`);
    assert.ok(none.minEnergy < hyst.minEnergy);
    assert.equal(hyst.restStartsUnderLoad, 0, "hysteresis starts rest only when the load is low");
  }
  const sim = M.simulateDay(new Array(24).fill(0.2), "plan", { startEnergy: 70, plan: [12] });
  assert.equal(sim.energy.length, 64); assert.equal(sim.metrics.restHours, 0.5);
});
test("startEnergyFromSleep is bounded", () => {
  assert.equal(M.startEnergyFromSleep(8), 94); assert.equal(M.startEnergyFromSleep(0), 30); assert.equal(M.startEnergyFromSleep(12), 95); assert.equal(M.startEnergyFromSleep(null), 80);
});
test("sample data is deterministic and marked as example", () => {
  const a = M.sampleData(30, 5, new Date(2026, 10, 18)), b = M.sampleData(30, 5, new Date(2026, 10, 18));
  assert.deepEqual(a, b); assert.ok(a.length > 30); assert.ok(a.every(e => e.example && e.source === "example"));
});
test("charts render valid-looking SVG and escape labels", () => {
  const svg = CH.line({ labels: ["<a>"], series: [{ name: "x", values: [1, null, 3] }] });
  assert.match(svg, /^<svg/); assert.ok(!svg.includes("<a>")); assert.match(svg, /&lt;a&gt;/);
  assert.match(CH.bars({ items: [{ label: "A", value: -1 }, { label: "B", value: 2 }] }), /<rect/);
  assert.match(CH.heatmap({ "4-4": 2 }, M.STATE_NAMES, M.ENERGY, M.STRESS), /Total Burnout Alert/);
});
