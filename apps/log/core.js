/* MindFrame Log: pure core (metrics, reports, flags, import/export, sample data, pacing simulation).
   Runs in the browser (window.MF_LOG) and in Node (require) for unit tests. No network, no DOM. */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.MF_LOG = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var SCHEMA = "mindframe-log/1";
  var INBOX_KEY = "mindframe.inbox.v1";
  var PEAK_ITEMS = ["here", "absorbed", "heard", "held", "done", "savored"];
  var PEAK_LABELS = { here: "Here", absorbed: "Absorbed", heard: "Heard", held: "Held", done: "Done", savored: "Savored" };
  var ENERGY = { 1: "Resting", 2: "Cruising", 3: "Active", 4: "Pushing Hard" };
  var STRESS = { 1: "Calm", 2: "Alert", 3: "Tense", 4: "Overwhelmed" };
  var STATE_NAMES = { "1-1": "Deep Rest", "1-2": "Gentle Pause", "1-3": "Anxious Rest", "1-4": "Paralyzed",
    "2-1": "Light Stroll", "2-2": "Steady Pace", "2-3": "Grinding", "2-4": "Survival Mode",
    "3-1": "Inspired Action", "3-2": "Focused Work", "3-3": "Forcing It", "3-4": "Frantic Hustle",
    "4-1": "Flow State", "4-2": "The Sprint", "4-3": "Overdrive", "4-4": "Total Burnout Alert" };
  var TECHNIQUES = { closeloop: "Close the Loop", readback: "Read-Back", pretech: "Pre-Tech Anchor", reststate: "Rest State",
    dps: "Drop\u00b7Press\u00b7Snap", help: "Reach a person", chain: "One Thought, One Act", pause: "Shared Pause + Repair",
    senses: "5-4-3-2-1", walk: "Short walk", other: "Other" };
  var DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var SUPPORT = "Consider talking to your support person.";

  /* ---------- helpers ---------- */
  function isNum(v) { return typeof v === "number" && isFinite(v); }
  function toNum(v, lo, hi) {
    if (v === "" || v == null) return null;
    var n = Number(v);
    if (!isFinite(n)) return null;
    if (lo != null && n < lo) return null;
    if (hi != null && n > hi) return null;
    return n;
  }
  function mean(a) { var s = 0, n = 0; a.forEach(function (x) { if (isNum(x)) { s += x; n++; } }); return n ? s / n : null; }
  function round(x, d) { if (!isNum(x)) return null; var p = Math.pow(10, d == null ? 1 : d); return Math.round(x * p) / p; }
  function pad(n) { return String(n).padStart(2, "0"); }
  function dayKey(d) { d = d instanceof Date ? d : new Date(d); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function parseDay(k) { var p = k.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); return x; }
  function weekStart(d) { d = d instanceof Date ? d : parseDay(d); var dow = (d.getDay() + 6) % 7; return addDays(d, -dow); } // Monday
  function stateKey(e, s) {
    e = parseInt(e, 10); s = parseInt(s, 10);
    if (!(e >= 1 && e <= 4 && s >= 1 && s <= 4)) return null;
    return e + "-" + s; // fixed State Finder key: `${energyVal}-${stressVal}`
  }
  function uid(prefix) { return (prefix || "e") + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7); }

  /* ---------- normalize / merge ---------- */
  function normalize(raw) {
    if (!raw || typeof raw !== "object") return null;
    var ts = raw.ts ? new Date(raw.ts) : null;
    if (!ts || isNaN(ts.getTime())) return null;
    var e = {
      schema: SCHEMA,
      id: String(raw.id || uid(raw.type || "e")),
      ts: ts.toISOString(),
      type: ["daily", "event", "now", "drill"].indexOf(raw.type) >= 0 ? raw.type : "event",
      source: raw.source ? String(raw.source) : "mindframe-log"
    };
    var en = toNum(raw.energy, 1, 4), st = toNum(raw.stress, 1, 4);
    if (en != null && st != null) { e.energy = Math.round(en); e.stress = Math.round(st); e.stateKey = stateKey(e.energy, e.stress); }
    if (raw.peak && typeof raw.peak === "object") {
      var pk = {}, any = false;
      PEAK_ITEMS.forEach(function (k) { var v = toNum(raw.peak[k], 0, 10); pk[k] = v; if (v != null) any = true; });
      if (any) e.peak = pk;
    }
    ["mood", "focus", "context", "line", "note"].forEach(function (k) { if (raw[k] != null && raw[k] !== "") e[k] = String(raw[k]).slice(0, 500); });
    var sl = toNum(raw.sleepHours, 0, 24); if (sl != null) e.sleepHours = sl;
    var pa = toNum(raw.pauses, 0, 100); if (pa != null) e.pauses = Math.round(pa);
    var re = toNum(raw.repairs, 0, 100); if (re != null) e.repairs = Math.round(re);
    if (Array.isArray(raw.techniques)) {
      e.techniques = raw.techniques.filter(function (t) { return t && t.id; }).map(function (t) {
        return { id: String(t.id), before: toNum(t.before, 0, 10), after: toNum(t.after, 0, 10) };
      });
      if (!e.techniques.length) delete e.techniques;
    }
    if (raw.drill && typeof raw.drill === "object") e.drill = { kind: String(raw.drill.kind || "drill"), detail: raw.drill.detail ? String(raw.drill.detail).slice(0, 200) : undefined };
    if (Array.isArray(raw.words)) e.words = raw.words.map(String).slice(0, 5);
    if (raw.quoteId) e.quoteId = String(raw.quoteId);
    if (raw.example) e.example = true;
    return e;
  }
  function merge(existing, incoming) {
    var seen = {}, out = [], added = 0, skipped = 0;
    (existing || []).forEach(function (e) { if (!seen[e.id]) { seen[e.id] = 1; out.push(e); } });
    (incoming || []).forEach(function (r) {
      var e = normalize(r);
      if (!e) { skipped++; return; }
      if (seen[e.id]) { skipped++; return; }
      seen[e.id] = 1; out.push(e); added++;
    });
    out.sort(function (a, b) { return a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0; });
    return { entries: out, added: added, skipped: skipped };
  }

  /* ---------- CSV / JSON ---------- */
  var CSV_COLS = ["id", "ts", "type", "source", "energy", "stress", "stateKey", "mood", "focus", "context"]
    .concat(PEAK_ITEMS).concat(["line", "sleepHours", "pauses", "repairs", "techniques", "note", "drillKind"]);
  function csvCell(v) {
    if (v == null) return "";
    var s = String(v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function toCSV(entries) {
    var rows = [CSV_COLS.join(",")];
    entries.forEach(function (e) {
      var row = CSV_COLS.map(function (c) {
        if (PEAK_ITEMS.indexOf(c) >= 0) return csvCell(e.peak ? e.peak[c] : null);
        if (c === "techniques") return csvCell((e.techniques || []).map(function (t) {
          return t.id + ":" + (t.before == null ? "" : t.before) + ":" + (t.after == null ? "" : t.after); }).join("|"));
        if (c === "drillKind") return csvCell(e.drill ? e.drill.kind : null);
        return csvCell(e[c]);
      });
      rows.push(row.join(","));
    });
    return rows.join("\r\n") + "\r\n";
  }
  function parseCSVRows(text) {
    var rows = [], row = [], cell = "", q = false, i = 0;
    text = String(text).replace(/^\uFEFF/, "");
    for (; i < text.length; i++) {
      var ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += ch;
      } else if (ch === '"') q = true;
      else if (ch === ",") { row.push(cell); cell = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(cell); cell = ""; if (row.length > 1 || row[0] !== "") rows.push(row); row = [];
      } else cell += ch;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }
  function fromCSV(text) {
    var rows = parseCSVRows(text);
    if (!rows.length) return [];
    var head = rows[0].map(function (h) { return h.trim(); });
    return rows.slice(1).map(function (r) {
      var o = {}; head.forEach(function (h, i) { o[h] = r[i] == null ? "" : r[i]; });
      var e = { id: o.id, ts: o.ts, type: o.type, source: o.source, energy: o.energy, stress: o.stress,
        mood: o.mood, focus: o.focus, context: o.context, line: o.line, sleepHours: o.sleepHours,
        pauses: o.pauses, repairs: o.repairs, note: o.note };
      var pk = {}, any = false;
      PEAK_ITEMS.forEach(function (k) { if (o[k] !== "" && o[k] != null) { pk[k] = o[k]; any = true; } });
      if (any) e.peak = pk;
      if (o.techniques) e.techniques = o.techniques.split("|").map(function (s) { var p = s.split(":"); return { id: p[0], before: p[1], after: p[2] }; });
      if (o.drillKind) e.drill = { kind: o.drillKind };
      return normalize(e);
    }).filter(Boolean);
  }
  /* Accepts: a mindframe-log/1 bundle {entries:[...]}, a bare array, a single entry (e.g. from MindFrame Now), or CSV. */
  function parseImport(text) {
    var t = String(text || "").trim();
    if (!t) return [];
    if (t[0] === "{" || t[0] === "[") {
      var data = JSON.parse(t);
      var list = Array.isArray(data) ? data : Array.isArray(data.entries) ? data.entries : [data];
      return list.map(normalize).filter(Boolean);
    }
    return fromCSV(t);
  }
  function exportJSON(entries) { return JSON.stringify({ schema: SCHEMA, exported: new Date().toISOString(), entries: entries }, null, 2); }

  /* ---------- metrics ---------- */
  function peakMean(e) { return e && e.peak ? mean(PEAK_ITEMS.map(function (k) { return e.peak[k]; })) : null; }
  function byDay(entries) { var m = {}; entries.forEach(function (e) { var k = dayKey(e.ts); (m[k] = m[k] || []).push(e); }); return m; }
  function daySummary(list) {
    var peaks = list.map(peakMean).filter(isNum);
    var items = {}; PEAK_ITEMS.forEach(function (k) { items[k] = mean(list.map(function (e) { return e.peak ? e.peak[k] : null; })); });
    var sleeps = list.map(function (e) { return e.sleepHours; }).filter(isNum);
    return {
      n: list.length,
      peak: mean(peaks), items: items,
      sleep: sleeps.length ? Math.max.apply(null, sleeps) : null,
      energy: mean(list.map(function (e) { return e.energy; })),
      stress: mean(list.map(function (e) { return e.stress; })),
      maxEnergy: Math.max.apply(null, [0].concat(list.map(function (e) { return e.energy || 0; }))),
      maxStress: Math.max.apply(null, [0].concat(list.map(function (e) { return e.stress || 0; }))),
      pauses: list.reduce(function (s, e) { return s + (e.pauses || 0); }, 0),
      repairs: list.reduce(function (s, e) { return s + (e.repairs || 0); }, 0)
    };
  }
  /* Continuous daily series between from..to (Date or day key), inclusive. Days without entries get nulls. */
  function dailySeries(entries, from, to) {
    var m = byDay(entries), out = [];
    var d = from instanceof Date ? new Date(from.getFullYear(), from.getMonth(), from.getDate()) : parseDay(from);
    var end = to instanceof Date ? dayKey(to) : to;
    for (var guard = 0; guard < 4000; guard++) {
      var k = dayKey(d);
      var s = daySummary(m[k] || []); s.day = k; out.push(s);
      if (k >= end) break;
      d = addDays(d, 1);
    }
    return out;
  }
  /* Trailing rolling mean over a window of w positions, ignoring nulls; null when the window has no values. */
  function rolling(values, w) {
    return values.map(function (_, i) { return mean(values.slice(Math.max(0, i - w + 1), i + 1)); });
  }
  function weekly(entries) {
    var m = {};
    entries.forEach(function (e) { var k = dayKey(weekStart(new Date(e.ts))); (m[k] = m[k] || []).push(e); });
    return Object.keys(m).sort().map(function (k) {
      var s = daySummary(m[k]);
      var days = byDay(m[k]);
      s.sleep = mean(Object.keys(days).map(function (d) { return daySummary(days[d]).sleep; }));
      s.week = k; s.daysLogged = Object.keys(days).length; return s;
    });
  }
  function stateFrequency(entries) {
    var counts = {}, total = 0;
    Object.keys(STATE_NAMES).forEach(function (k) { counts[k] = 0; });
    entries.forEach(function (e) { if (e.stateKey && counts[e.stateKey] != null) { counts[e.stateKey]++; total++; } });
    var top = Object.keys(counts).filter(function (k) { return counts[k] > 0; })
      .sort(function (a, b) { return counts[b] - counts[a] || (a < b ? -1 : 1); })
      .map(function (k) { return { key: k, name: STATE_NAMES[k], n: counts[k], share: total ? counts[k] / total : 0 }; });
    return { counts: counts, total: total, top: top };
  }
  /* Effectiveness = mean drop in self-rated distress (before - after). Positive = helped. */
  function techniqueEffect(entries, opts) {
    opts = opts || {};
    var m = {};
    entries.forEach(function (e) {
      if (!e.techniques) return;
      var isDrill = e.type === "drill";
      if (opts.drillsOnly && !isDrill) return;
      if (!opts.drillsOnly && !opts.includeDrills && isDrill) return;
      e.techniques.forEach(function (t) {
        var r = m[t.id] = m[t.id] || { id: t.id, name: TECHNIQUES[t.id] || t.id, n: 0, rated: 0, before: [], after: [], drops: [] };
        r.n++;
        if (isNum(t.before) && isNum(t.after)) { r.rated++; r.before.push(t.before); r.after.push(t.after); r.drops.push(t.before - t.after); }
      });
    });
    return Object.keys(m).map(function (k) {
      var r = m[k];
      return { id: r.id, name: r.name, n: r.n, rated: r.rated, meanBefore: mean(r.before), meanAfter: mean(r.after),
        meanDrop: mean(r.drops), helpedShare: r.rated ? r.drops.filter(function (d) { return d > 0; }).length / r.rated : null };
    }).sort(function (a, b) { return (b.meanDrop == null ? -99 : b.meanDrop) - (a.meanDrop == null ? -99 : a.meanDrop) || b.n - a.n; });
  }
  /* Mean stress by hour of day (0..23), optionally for one weekday. */
  function hourProfile(entries, dow) {
    var b = []; for (var h = 0; h < 24; h++) b.push([]);
    entries.forEach(function (e) {
      if (!isNum(e.stress) || e.type === "drill" || e.type === "daily") return; // daily check-ins are end-of-day summaries, not a time of day
      var d = new Date(e.ts); if (dow != null && d.getDay() !== dow) return;
      b[d.getHours()].push(e.stress);
    });
    return b.map(function (a, h) { return { hour: h, meanStress: mean(a), n: a.length }; });
  }
  function highLoadSlots(entries, k, minN) {
    minN = minN || 2;
    var m = {};
    entries.forEach(function (e) {
      if (!isNum(e.stress) || e.type === "drill" || e.type === "daily") return; // daily check-ins are end-of-day summaries, not a time of day
      var d = new Date(e.ts), key = d.getDay() + ":" + d.getHours();
      (m[key] = m[key] || []).push(e.stress);
    });
    return Object.keys(m).filter(function (key) { return m[key].length >= minN; }).map(function (key) {
      var p = key.split(":"); return { dow: +p[0], hour: +p[1], meanStress: mean(m[key]), n: m[key].length,
        label: DOW[+p[0]] + " " + hourLabel(+p[1]) };
    }).sort(function (a, b) { return b.meanStress - a.meanStress || b.n - a.n; }).slice(0, k || 3);
  }
  function hourLabel(h) { var hh = h % 12 === 0 ? 12 : h % 12; return hh + (h < 12 ? " am" : " pm"); }

  /* ---------- early-warning flags (not diagnosis) ---------- */
  function flags(entries, now) {
    now = now || new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var real = entries.filter(function (e) { return e.type !== "drill"; });
    var last7 = dailySeries(real, addDays(today, -6), today);
    var base = dailySeries(real, addDays(today, -35), addDays(today, -8));
    var out = [];
    var short = last7.filter(function (d) { return isNum(d.sleep) && d.sleep < 5; }).length;
    if (short >= 3) out.push({ id: "short-sleep", title: "Short sleep on " + short + " of the last 7 days",
      detail: "Under 5 hours on " + short + " nights. Much less sleep is one of the early-warning signs on your list. " + SUPPORT });
    var recentSleep = last7.slice(-3).map(function (d) { return d.sleep; }).filter(isNum);
    var baseSleep = base.map(function (d) { return d.sleep; }).filter(isNum);
    if (recentSleep.length >= 2 && baseSleep.length >= 5 && mean(recentSleep) <= mean(baseSleep) - 2)
      out.push({ id: "sleep-drop", title: "Sleep is down about " + round(mean(baseSleep) - mean(recentSleep), 1) + " h from your usual",
        detail: "The last few nights average " + round(mean(recentSleep), 1) + " h vs. " + round(mean(baseSleep), 1) + " h before. " + SUPPORT });
    var push = last7.filter(function (d) { return d.maxEnergy >= 4 && d.maxStress >= 3; }).length;
    if (push >= 3) out.push({ id: "high-push", title: "Pushing hard under stress on " + push + " of 7 days",
      detail: "Overdrive or Burnout-Alert states keep coming back. Plan recovery before the next push. " + SUPPORT });
    var lessSleepHighEnergy = last7.filter(function (d) { return isNum(d.sleep) && d.sleep < 6 && d.maxEnergy >= 4; }).length;
    if (lessSleepHighEnergy >= 2) out.push({ id: "low-sleep-high-energy", title: "Less sleep together with high energy (" + lessSleepHighEnergy + " days)",
      detail: "Sleeping less while energy runs high is worth showing to someone who knows your plan. " + SUPPORT });
    var weekEntries = real.filter(function (e) { return new Date(e.ts) >= addDays(today, -6); });
    var overload = weekEntries.filter(function (e) { return ["4-4", "1-4", "2-4"].indexOf(e.stateKey) >= 0; }).length;
    if (overload >= 3) out.push({ id: "overload-states", title: overload + " overload states this week",
      detail: "Paralyzed, Survival Mode or Total Burnout Alert was logged " + overload + " times in 7 days. " + SUPPORT });
    var here = weekEntries.map(function (e) { return e.peak ? e.peak.here : null; }).filter(isNum);
    if (here.length >= 3 && mean(here) <= 3) out.push({ id: "low-here", title: "\u201cHere\u201d has been low this week (" + round(mean(here), 1) + "/10)",
      detail: "Feeling less present than usual for several days. " + SUPPORT });
    return out;
  }

  /* ---------- reports ---------- */
  function periodRange(kind, anchor) {
    anchor = anchor || new Date();
    if (kind === "month") {
      var s = new Date(anchor.getFullYear(), anchor.getMonth(), 1), e = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
      var ps = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1), pe = new Date(anchor.getFullYear(), anchor.getMonth(), 0);
      return { start: s, end: e, prevStart: ps, prevEnd: pe, label: s.toLocaleString("en-US", { month: "long", year: "numeric" }) };
    }
    var ws = weekStart(anchor), we = addDays(ws, 6);
    return { start: ws, end: we, prevStart: addDays(ws, -7), prevEnd: addDays(ws, -1), label: "Week of " + ws.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) };
  }
  function inRange(entries, s, e) { var a = dayKey(s), b = dayKey(e); return entries.filter(function (x) { var k = dayKey(x.ts); return k >= a && k <= b; }); }
  function summarize(list) {
    var real = list.filter(function (e) { return e.type !== "drill"; });
    var days = byDay(real), dk = Object.keys(days);
    var dsum = dk.map(function (k) { return daySummary(days[k]); });
    var items = {}; PEAK_ITEMS.forEach(function (k) { items[k] = mean(real.map(function (e) { return e.peak ? e.peak[k] : null; })); });
    var pauses = real.reduce(function (s, e) { return s + (e.pauses || 0); }, 0), repairs = real.reduce(function (s, e) { return s + (e.repairs || 0); }, 0);
    return { entries: real.length, drills: list.length - real.length, daysLogged: dk.length,
      peak: mean(real.map(peakMean)), items: items, sleep: mean(dsum.map(function (d) { return d.sleep; })),
      energy: mean(real.map(function (e) { return e.energy; })), stress: mean(real.map(function (e) { return e.stress; })),
      pauses: pauses, repairs: repairs, repairRate: pauses ? Math.min(1, repairs / pauses) : null,
      states: stateFrequency(real).top.slice(0, 5), techniques: techniqueEffect(real),
      lines: real.filter(function (e) { return e.line; }).map(function (e) { return { day: dayKey(e.ts), line: e.line }; }) };
  }
  function report(entries, kind, anchor) {
    var r = periodRange(kind, anchor);
    var cur = summarize(inRange(entries, r.start, r.end)), prev = summarize(inRange(entries, r.prevStart, r.prevEnd));
    function delta(a, b) { return isNum(a) && isNum(b) ? a - b : null; }
    return { kind: kind, label: r.label, start: dayKey(r.start), end: dayKey(r.end), current: cur, previous: prev,
      change: { peak: delta(cur.peak, prev.peak), sleep: delta(cur.sleep, prev.sleep), stress: delta(cur.stress, prev.stress) },
      flags: flags(entries, r.end < (anchor || new Date()) ? r.end : (anchor || new Date())),
      suggestions: suggestSchedule(inRange(entries, addDays(r.end, -55), r.end)) };
  }

  /* ---------- personalized schedule suggestions (heuristic) ---------- */
  function suggestSchedule(entries) {
    var real = entries.filter(function (e) { return e.type !== "drill"; });
    var out = [];
    var slots = highLoadSlots(real, 2, 2).filter(function (s) { return s.meanStress >= 2.6; });
    slots.forEach(function (s) {
      var pre = (s.hour + 23) % 24;
      out.push({ kind: "pre-rest", text: DOW[s.dow] + "s around " + hourLabel(s.hour) + " tend to run tense (avg stress " + round(s.meanStress, 1) +
        "/4 across " + s.n + " logs). Try a 10-minute rest around " + hourLabel(pre).replace(" ", ":30 ") + ", before it starts. Rest is easier to start while the pressure is low." });
    });
    var clear = {}; real.forEach(function (e) { if (e.type !== "daily" && isNum(e.energy) && isNum(e.stress)) { var h = new Date(e.ts).getHours(); var c = clear[h] = clear[h] || [0, 0]; c[1]++; if (e.energy >= 3 && e.stress <= 2) c[0]++; } });
    var best = Object.keys(clear).filter(function (h) { return clear[h][1] >= 3; }).sort(function (a, b) { return clear[b][0] / clear[b][1] - clear[a][0] / clear[a][1]; })[0];
    if (best != null && clear[best][0] / clear[best][1] >= 0.4) out.push({ kind: "focus", text: "Around " + hourLabel(+best) + " you're often clear-headed with energy (" +
      Math.round(100 * clear[best][0] / clear[best][1]) + "% of logs). Consider saving that hour for focused work." });
    var days = byDay(real), keys = Object.keys(days).sort(), hi = [], lo = [];
    keys.forEach(function (k, i) {
      var s = daySummary(days[k]); if (!isNum(s.sleep) || !isNum(s.peak)) return;
      (s.sleep >= 7 ? hi : s.sleep < 6 ? lo : []).push(s.peak);
    });
    if (hi.length >= 3 && lo.length >= 3 && mean(hi) - mean(lo) >= 0.5) out.push({ kind: "sleep", text: "On days with 7+ hours of sleep your Peak Now averaged " +
      round(mean(hi), 1) + " vs. " + round(mean(lo), 1) + " under 6 hours. Protecting sleep looks like your biggest lever." });
    var te = techniqueEffect(real).filter(function (t) { return t.rated >= 3 && t.meanDrop > 0; });
    if (te.length) out.push({ kind: "technique", text: te[0].name + " has helped you most so far (distress down " + round(te[0].meanDrop, 1) +
      " points on average across " + te[0].rated + " rated uses). Make it your first move on hard days." });
    var p = real.reduce(function (s, e) { return s + (e.pauses || 0); }, 0), r = real.reduce(function (s, e) { return s + (e.repairs || 0); }, 0);
    if (p >= 3) out.push({ kind: "pause", text: "You logged " + p + " conversation pauses and " + r + " repairs. Pausing together before repairing tends to work better than repairing alone." });
    var dowPeak = {}; real.forEach(function (e) { var v = peakMean(e); if (isNum(v)) { var d = new Date(e.ts).getDay(); (dowPeak[d] = dowPeak[d] || []).push(v); } });
    var dk = Object.keys(dowPeak).filter(function (d) { return dowPeak[d].length >= 2; });
    if (dk.length >= 4) { var w = dk.sort(function (a, b) { return mean(dowPeak[a]) - mean(dowPeak[b]); })[0];
      out.push({ kind: "weekday", text: DOW[w] + "s have your lowest Peak Now (" + round(mean(dowPeak[w]), 1) + "). Consider a lighter plan, or something to look forward to, on that day." }); }
    return out;
  }

  /* ---------- pacing / hysteresis time simulation ---------- */
  var SIM = { startHour: 7, endHour: 23, stepMin: 15, workCost: 0.6, loadCost: 1.6, restGain: 3.2, loadDamp: 1.0, backlogCost: 0.8, switchCost: 2.5,
    enterBelow: 55, exitAbove: 85, soonBelow: 80, emergency: 15, highLoad: 0.6, soonLoad: 0.6, naiveThreshold: 55 };
  /* Hourly load 0..1 from history (mean stress mapped (s-1)/3). Missing hours are interpolated; default 0.3. */
  function loadProfile(entries, dow) {
    var prof = hourProfile(entries, dow);
    var have = prof.filter(function (p) { return p.n > 0; }).length;
    if (dow != null && have < 4) prof = hourProfile(entries);
    var v = prof.map(function (p) { return p.n ? (p.meanStress - 1) / 3 : null; });
    for (var h = 0; h < 24; h++) if (v[h] == null) {
      var a = null, b = null, i;
      for (i = h - 1; i >= 0; i--) if (v[i] != null && prof[i].n) { a = [i, v[i]]; break; }
      for (i = h + 1; i < 24; i++) if (prof[i].n) { b = [i, (prof[i].meanStress - 1) / 3]; break; }
      v[h] = a && b ? a[1] + (b[1] - a[1]) * (h - a[0]) / (b[0] - a[0]) : a ? a[1] : b ? b[1] : 0.3;
    }
    return v.map(function (x) { return Math.max(0, Math.min(1, x)); });
  }
  function startEnergyFromSleep(sleep) { return isNum(sleep) ? Math.max(30, Math.min(95, 30 + 8 * sleep)) : 80; }
  function makeSim(load, opts) {
    opts = Object.assign({}, SIM, opts || {});
    var perHour = 60 / opts.stepMin, steps = (opts.endHour - opts.startHour) * perHour;
    var st = { i: 0, E: opts.startEnergy == null ? 80 : opts.startEnergy, resting: false, switches: 0, backlog: 0, deferred: 0, energy: [], restSteps: [], loads: [] };
    function loadAt(i) { return load[Math.min(23, opts.startHour + Math.floor(i / perHour))]; }
    return {
      steps: steps, perHour: perHour, opts: opts, state: st, loadAt: loadAt,
      done: function () { return st.i >= steps; },
      step: function (rest) {
        if (st.i >= steps) return st;
        var L = loadAt(st.i);
        if (st.i > 0 && !!rest !== st.resting) { st.switches++; st.E -= opts.switchCost; } // every switch has a settling cost
        st.resting = !!rest;
        var h = opts.stepMin / 60;
        if (rest) {
          // Rest during high load is shallow (the threat is still there) and the work is deferred, not gone.
          st.E += opts.restGain * Math.max(0.1, 1 - opts.loadDamp * L);
          if (L >= opts.highLoad) { st.backlog += L * h; st.deferred += L * h; }
        } else {
          var extra = st.backlog > 0 ? opts.backlogCost : 0;
          st.backlog = Math.max(0, st.backlog - h);
          st.E -= opts.workCost + opts.loadCost * L + extra;
        }
        st.E = Math.max(0, Math.min(100, st.E));
        st.energy.push(st.E); st.restSteps.push(st.resting ? 1 : 0); st.loads.push(L); st.i++;
        return st;
      }
    };
  }
  var POLICIES = {
    none: function () { return false; },
    naive: function (ctx) { return ctx.E < ctx.opts.naiveThreshold; },
    freeze: function (ctx) { return ctx.L >= ctx.opts.highLoad; },
    hysteresis: function (ctx) {
      var o = ctx.opts;
      if (ctx.E < o.emergency) return true;
      if (ctx.resting) return ctx.E < o.exitAbove && (ctx.L < o.highLoad || ctx.E < o.enterBelow); // don't freeze near the load
      var soon = ctx.nextL >= o.soonLoad && ctx.E < o.soonBelow;
      return (ctx.E < o.enterBelow || soon) && ctx.L < o.highLoad;
    },
    plan: function (ctx) { return !!(ctx.plan && ctx.plan.indexOf(ctx.hour) >= 0 && ctx.minuteInHour < 30); }
  };
  /* Simulate a waking day. policy: name in POLICIES or function(ctx)->bool. Returns trajectory and metrics. */
  function simulateDay(load, policy, opts) {
    opts = opts || {};
    var sim = makeSim(load, opts), o = sim.opts, fn = typeof policy === "function" ? policy : POLICIES[policy];
    if (!fn) throw new Error("unknown policy " + policy);
    while (!sim.done()) {
      var i = sim.state.i, L = sim.loadAt(i);
      var ctx = { i: i, E: sim.state.E, L: L, nextL: sim.loadAt(Math.min(sim.steps - 1, i + sim.perHour)), resting: sim.state.resting,
        hour: o.startHour + Math.floor(i / sim.perHour), minuteInHour: (i % sim.perHour) * o.stepMin, opts: o, plan: opts.plan };
      sim.step(fn(ctx));
    }
    return simMetrics(sim);
  }
  function simMetrics(sim) {
    var s = sim.state, o = sim.opts, h = o.stepMin / 60;
    var restDuringLoad = 0, overload = 0, low = 0, entriesUnderLoad = 0;
    s.energy.forEach(function (E, i) {
      if (s.restSteps[i] && (i === 0 || !s.restSteps[i - 1]) && s.loads[i] >= o.highLoad) entriesUnderLoad++;
      if (s.restSteps[i] && s.loads[i] >= o.highLoad) restDuringLoad += h;
      if (E < 25 && s.loads[i] >= o.highLoad) overload += h;
      if (E < 25) low += h;
    });
    return { energy: s.energy.slice(), rest: s.restSteps.slice(), load: s.loads.slice(), stepMin: o.stepMin, startHour: o.startHour,
      metrics: { minEnergy: round(Math.min.apply(null, s.energy), 1), endEnergy: round(s.energy[s.energy.length - 1], 1),
        switches: s.switches, restHours: round(s.restSteps.reduce(function (a, b) { return a + b; }, 0) * h, 2),
        restDuringLoadHours: round(restDuringLoad, 2), restStartsUnderLoad: entriesUnderLoad, deferredLoadHours: round(s.deferred, 2), overloadHours: round(overload, 2), lowEnergyHours: round(low, 2) } };
  }
  /* Scenario for the "replay a high-load time" drill. */
  function drillScenario(entries) {
    var real = entries.filter(function (e) { return e.type !== "drill"; });
    var slot = highLoadSlots(real, 1, 2)[0];
    var te = techniqueEffect(real).filter(function (t) { return t.rated >= 2 && t.meanDrop > 0; })[0];
    if (!slot) return { fromHistory: false, label: "A busy weekday afternoon", meanStress: null, n: 0, technique: te ? te.id : "dps",
      text: "Not enough history yet, so here's a typical high-load moment: a busy weekday afternoon with too many open loops." };
    return { fromHistory: true, label: slot.label, dow: slot.dow, hour: slot.hour, meanStress: slot.meanStress, n: slot.n, technique: te ? te.id : "dps",
      text: "It's " + slot.label + ". Across " + slot.n + " past logs at this time, your stress averaged " + round(slot.meanStress, 1) + "/4 (" + STRESS[Math.round(slot.meanStress)] + ")." };
  }

  /* ---------- example data (clearly labeled) ---------- */
  function rng(seed) { var s = seed >>> 0 || 1; return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
  function sampleData(days, seed, end) {
    days = days || 90; var r = rng(seed || 7); end = end || new Date();
    var out = [], techs = ["closeloop", "dps", "reststate", "pretech", "readback", "chain", "pause", "help"];
    var eff = { closeloop: 2.6, dps: 1.8, reststate: 2.2, pretech: 1.4, readback: 1.6, chain: 1.0, pause: 2.0, help: 2.4 };
    function at(d, h, m) { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m || 0).toISOString(); }
    function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
    for (var k = days - 1; k >= 0; k--) {
      var d = addDays(end, -k), dow = d.getDay();
      if (r() < 0.12) continue; // some days skipped, like real life
      var sleep = clamp(round(7.1 + (r() - 0.5) * 2.4 - (dow === 1 ? 0.6 : 0) - (k < 6 && k > 1 ? 2.8 : 0), 1), 3.5, 9.5);
      var base = 5.3 + (sleep - 6.5) * 0.7 + (dow === 0 || dow === 6 ? 0.8 : 0);
      var ev = 1 + Math.floor(r() * 3), hours = [9, 13, 16, 20];
      for (var j = 0; j < ev; j++) {
        var h = hours[Math.floor(r() * hours.length)], tense = ((dow === 2 || dow === 4) && h === 16) || (dow === 1 && h === 9);
        var stress = clamp(Math.round(1.6 + r() * 1.6 + (tense ? 1.2 : 0) - (sleep > 7.5 ? 0.4 : 0)), 1, 4);
        var energy = clamp(Math.round(1.6 + r() * 2.2 + (h === 9 || h === 13 ? 0.6 : -0.2)), 1, 4);
        var t = techs[Math.floor(r() * techs.length)], before = clamp(Math.round(2 + stress * 1.5 + r() * 2), 0, 10);
        var after = clamp(Math.round(before - eff[t] + (r() - 0.5) * 2.5), 0, 10);
        out.push({ id: "ex-" + dayKey(d) + "-" + j, ts: at(d, h, Math.floor(r() * 50)), type: j === 0 && r() < 0.3 ? "now" : "event",
          source: "example", example: true, energy: energy, stress: stress,
          techniques: [{ id: t, before: before, after: after }],
          pauses: t === "pause" ? 1 : 0, repairs: t === "pause" && r() < 0.75 ? 1 : 0 });
      }
      var pk = {}; ["here", "absorbed", "heard", "held", "done", "savored"].forEach(function (it, i) { pk[it] = clamp(Math.round(base + (r() - 0.5) * 3 + (i === 2 ? 0.5 : 0)), 0, 10); });
      var lines = ["dinner with family", "a long walk after work", "finished the hard email", "morning prayer on the porch", "laughing at lunch", "quiet coffee", "fixed the bug", "church", "call with a friend"];
      out.push({ id: "ex-" + dayKey(d) + "-daily", ts: at(d, 21, 30), type: "daily", source: "example", example: true, peak: pk,
        line: "Today's peak was " + lines[Math.floor(r() * lines.length)] + ".", sleepHours: sleep,
        energy: clamp(Math.round(base / 2.2), 1, 4), stress: clamp(Math.round(4 - base / 2.5), 1, 4) });
    }
    return merge([], out).entries;
  }

  return { SCHEMA: SCHEMA, INBOX_KEY: INBOX_KEY, PEAK_ITEMS: PEAK_ITEMS, PEAK_LABELS: PEAK_LABELS, ENERGY: ENERGY, STRESS: STRESS,
    STATE_NAMES: STATE_NAMES, TECHNIQUES: TECHNIQUES, DOW: DOW, SIM: SIM,
    stateKey: stateKey, normalize: normalize, merge: merge, toCSV: toCSV, fromCSV: fromCSV, parseImport: parseImport, exportJSON: exportJSON,
    mean: mean, round: round, dayKey: dayKey, parseDay: parseDay, addDays: addDays, weekStart: weekStart, peakMean: peakMean,
    dailySeries: dailySeries, rolling: rolling, weekly: weekly, stateFrequency: stateFrequency, techniqueEffect: techniqueEffect,
    hourProfile: hourProfile, highLoadSlots: highLoadSlots, hourLabel: hourLabel, flags: flags, periodRange: periodRange, report: report,
    summarize: summarize, suggestSchedule: suggestSchedule, loadProfile: loadProfile, startEnergyFromSleep: startEnergyFromSleep,
    makeSim: makeSim, POLICIES: POLICIES, simulateDay: simulateDay, simMetrics: simMetrics, drillScenario: drillScenario,
    sampleData: sampleData, uid: uid };
});
