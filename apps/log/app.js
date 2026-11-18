/* MindFrame Log: UI. All data in localStorage ("mindframe.log.v1"). No network. */
(function () {
  "use strict";
  var M = window.MF_LOG, CH = window.MF_CHARTS, esc = CH.esc;
  var $ = function (id) { return document.getElementById(id); };
  var KEY = "mindframe.log.v1", PREF = "mindframe.log.prefs.v1";
  var store = load(KEY, { schema: M.SCHEMA, entries: [] });
  var prefs = load(PREF, { theme: "", example: false });
  var example = null;
  var sel = { dEnergy: null, dStress: null, eEnergy: null, eStress: null };
  var repAnchor = new Date();
  var timers = {};

  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(store)); return true; } catch (e) { toast("dailyToast", "Storage is full or blocked. Export your data."); return false; } }
  function savePrefs() { try { localStorage.setItem(PREF, JSON.stringify(prefs)); } catch (e) {} }
  function entries() { return prefs.example ? (example || (example = M.sampleData(90, 7, new Date()))) : store.entries; }
  function el(tag, attrs, text) { var n = document.createElement(tag); for (var a in attrs || {}) n.setAttribute(a, attrs[a]); if (text != null) n.textContent = text; return n; }
  function toast(id, msg) { var t = $(id); if (t) { t.textContent = msg; clearTimeout(timers[id]); timers[id] = setTimeout(function () { t.textContent = ""; }, 6000); } }
  function cw(id, max) { var w = $(id).clientWidth || 360; return Math.max(300, Math.min(max || 760, Math.round(w))); }
  function f1(v) { var r = M.round(v, 1); return r == null ? "–" : r.toFixed(1); }
  function scoreOptions(id, skip) { var s = $(id); if (skip) s.appendChild(el("option", { value: "" }, "–")); for (var i = 0; i <= 10; i++) s.appendChild(el("option", { value: String(i) }, String(i))); }
  function fmtTime(sec) { return Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0"); }
  function addEntry(raw) {
    if (prefs.example) return false;
    var r = M.merge(store.entries, [raw]); store.entries = r.entries; return persist();
  }

  /* ---------- chips & sliders ---------- */
  function chips(id, labels, key) {
    var box = $(id);
    Object.keys(labels).forEach(function (k) {
      var b = el("button", { type: "button", class: "chip", "aria-pressed": "false", "data-v": k });
      b.appendChild(el("b", null, k)); b.appendChild(document.createTextNode(labels[k]));
      b.addEventListener("click", function () {
        sel[key] = sel[key] === k ? null : k;
        [].forEach.call(box.children, function (c) { c.setAttribute("aria-pressed", String(c.getAttribute("data-v") === sel[key])); });
      });
      box.appendChild(b);
    });
  }
  function resetChips(id, key) { sel[key] = null; [].forEach.call($(id).children, function (c) { c.setAttribute("aria-pressed", "false"); }); }
  var HINTS = { here: "present, in my body", absorbed: "lost in something good", heard: "someone listened", held: "felt cared for", done: "finished something", savored: "let a good moment last" };
  function sliders() {
    var box = $("peakSliders");
    M.PEAK_ITEMS.forEach(function (k) {
      var row = el("div", { class: "slider" });
      var lab = el("label", { for: "pk-" + k }, M.PEAK_LABELS[k]); lab.appendChild(el("small", null, HINTS[k]));
      var inp = el("input", { type: "range", min: "0", max: "10", step: "1", value: "5", id: "pk-" + k });
      var out = el("output", { id: "pko-" + k }, "5");
      inp.addEventListener("input", function () { out.textContent = inp.value; });
      row.appendChild(lab); row.appendChild(inp); row.appendChild(out); box.appendChild(row);
    });
  }

  /* ---------- Today ---------- */
  function saveDaily(ev) {
    ev.preventDefault();
    if (prefs.example) return toast("dailyToast", "Example data is on. Turn it off under Data to save.");
    var pk = {}; M.PEAK_ITEMS.forEach(function (k) { pk[k] = +$("pk-" + k).value; });
    var line = $("peakLine").value.trim();
    var ok = addEntry({ id: M.uid("daily"), ts: new Date().toISOString(), type: "daily", peak: pk,
      line: line ? (/^today's peak/i.test(line) ? line : "Today's peak was " + line) : null,
      sleepHours: $("sleep").value, energy: sel.dEnergy, stress: sel.dStress,
      pauses: +$("pauses").textContent, repairs: +$("repairs").textContent });
    if (ok) { toast("dailyToast", "Saved. Done. Here."); $("peakLine").value = ""; $("pauses").textContent = "0"; $("repairs").textContent = "0"; resetChips("dEnergy", "dEnergy"); resetChips("dStress", "dStress"); renderAll(); }
  }
  function saveEvent(ev) {
    ev.preventDefault();
    if (prefs.example) return toast("eventToast", "Example data is on. Turn it off under Data to save.");
    if (!sel.eEnergy || !sel.eStress) return toast("eventToast", "Pick an energy and a stress level first.");
    var t = $("eTech").value;
    var ok = addEntry({ id: M.uid("event"), ts: new Date().toISOString(), type: "event", energy: sel.eEnergy, stress: sel.eStress,
      techniques: t ? [{ id: t, before: $("eBefore").value, after: $("eAfter").value }] : null, note: $("eNote").value.trim() || null,
      pauses: t === "pause" ? 1 : 0 });
    if (ok) { toast("eventToast", "Saved: " + M.STATE_NAMES[sel.eEnergy + "-" + sel.eStress] + "."); $("eNote").value = ""; resetChips("eEnergy", "eEnergy"); resetChips("eStress", "eStress"); renderAll(); }
  }
  function describe(e) {
    var bits = [];
    if (e.type === "daily") { bits.push("Peak Now " + f1(M.peakMean(e))); if (e.sleepHours != null) bits.push(e.sleepHours + " h sleep"); }
    if (e.stateKey) bits.push(M.STATE_NAMES[e.stateKey]);
    (e.techniques || []).forEach(function (t) { bits.push((M.TECHNIQUES[t.id] || t.id) + (t.before != null && t.after != null ? " " + t.before + "\u2192" + t.after : "")); });
    if (e.drill) bits.push("drill: " + e.drill.kind);
    return bits.join(" \u00b7 ");
  }
  function renderRecent() {
    var ul = $("recent"); ul.innerHTML = "";
    var list = entries().slice(-10).reverse();
    if (!list.length) { ul.appendChild(el("li", null, "Nothing logged yet. Start with today's check-in.")); return; }
    list.forEach(function (e) {
      var li = el("li"), d = el("div");
      d.appendChild(el("div", null, describe(e)));
      d.appendChild(el("small", null, new Date(e.ts).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) + " \u00b7 " + e.type + (e.example ? " \u00b7 example" : "") + (e.line ? " \u00b7 " + e.line : "")));
      li.appendChild(d);
      if (!prefs.example) { var b = el("button", { type: "button", "aria-label": "Delete entry" }, "delete"); b.addEventListener("click", function () { if (confirm("Delete this entry?")) { store.entries = store.entries.filter(function (x) { return x.id !== e.id; }); persist(); renderAll(); } }); li.appendChild(b); }
      ul.appendChild(li);
    });
  }
  function flagHTML(fl) {
    if (!fl.length) return "";
    return fl.map(function (f) { return '<div class="flag" role="status"><b>' + esc(f.title) + "</b>" + esc(f.detail) + "</div>"; }).join("") +
      '<p class="note">These flags are prompts, not a diagnosis. If you might be in danger or can\u2019t stay safe, call or text <a href="tel:988">988</a> (US) or 911.</p>';
  }

  /* ---------- Trends ---------- */
  function renderTrends() {
    var all = entries(), days = +$("range").value, today = new Date();
    var from = M.addDays(today, -(days - 1));
    var series = M.dailySeries(all.filter(function (e) { return e.type !== "drill"; }), from, today);
    var peak = series.map(function (d) { return d.peak; }), roll = M.rolling(peak, 7);
    var labels = series.map(function (d, i) { var dt = M.parseDay(d.day); return (i % Math.ceil(series.length / 6) === 0) ? (dt.getMonth() + 1) + "/" + dt.getDate() : ""; });
    $("chPeak").innerHTML = CH.line({ width: cw("chPeak"), height: 220, title: "Peak Now daily", labels: labels, min: 0, max: 10, ticks: [0, 5, 10], series: [
      { name: "Daily", values: peak, color: "var(--soft)", dots: true, noLine: true }, { name: "7-day average", values: roll, color: "var(--accent)", width: 2.5 }] });
    var sleep = series.map(function (d) { return d.sleep; });
    $("chSleep").innerHTML = CH.line({ width: cw("chSleep", 420), height: 220, title: "Sleep", labels: labels, min: 3, max: 10, ticks: [4, 6, 8, 10], series: [
      { name: "Night", values: sleep, color: "var(--soft)", dots: true, noLine: true }, { name: "7-day average", values: M.rolling(sleep, 7), color: "var(--warm)", width: 2.5 }] });
    var inRange = all.filter(function (e) { return M.dayKey(e.ts) >= M.dayKey(from); });
    var wk = M.weekly(inRange.filter(function (e) { return e.type !== "drill"; }));
    $("chWeekly").innerHTML = CH.line({ width: cw("chWeekly", 420), height: 220, title: "Weekly", labels: wk.map(function (w) { var d = M.parseDay(w.week); return (d.getMonth() + 1) + "/" + d.getDate(); }), min: 0, max: 10, ticks: [0, 5, 10],
      series: [{ name: "Peak Now", values: wk.map(function (w) { return w.peak; }), color: "var(--accent)", dots: true },
               { name: "Stress \u00d72.5", values: wk.map(function (w) { return w.stress == null ? null : w.stress * 2.5; }), color: "var(--warm)", dash: "5 4" },
               { name: "Sleep h", values: wk.map(function (w) { return w.sleep; }), color: "var(--soft)" }] });
    var sf = M.stateFrequency(inRange);
    $("chHeat").innerHTML = sf.total ? CH.heatmap(sf.counts, M.STATE_NAMES, M.ENERGY, M.STRESS) : '<p class="note">No states logged in this range.</p>';
    var te = M.techniqueEffect(inRange).filter(function (t) { return t.rated > 0; });
    $("chTech").innerHTML = te.length ? CH.bars({ width: cw("chTech", 460), labelWidth: 140, title: "Technique effect", items: te.map(function (t) { return { label: t.name, value: t.meanDrop, note: f1(t.meanDrop) + "  (n=" + t.rated + ")" }; }) }) : '<p class="note">Rate distress before and after a technique to see what helps.</p>';
    var rows = wk.slice(-8).map(function (w) { return "<tr><td>" + esc(w.week) + "</td>" + M.PEAK_ITEMS.map(function (k) { return '<td class="num">' + f1(w.items[k]) + "</td>"; }).join("") + "</tr>"; }).join("");
    $("tbItems").innerHTML = "<div class=\"scroll\"><table><thead><tr><th>Week of</th>" + M.PEAK_ITEMS.map(function (k) { return '<th class="num">' + M.PEAK_LABELS[k] + "</th>"; }).join("") + "</tr></thead><tbody>" + (rows || '<tr><td colspan="7">No check-ins yet.</td></tr>') + "</tbody></table></div>";
    var s = M.summarize(inRange);
    $("kpis").innerHTML = [["Peak Now", f1(s.peak)], ["Sleep avg", f1(s.sleep) + " h"], ["Days logged", s.daysLogged], ["Pauses \u2192 repairs", s.pauses + " \u2192 " + s.repairs]]
      .map(function (k) { return '<div class="kpi"><b>' + esc(k[1]) + "</b><small>" + esc(k[0]) + "</small></div>"; }).join("");
  }

  /* ---------- Reports ---------- */
  function arrow(v, goodUp) { if (v == null || Math.abs(v) < 0.05) return '<span class="note">no change</span>'; var up = v > 0; return '<span class="' + (up === goodUp ? "up" : "down") + '">' + (up ? "\u25b2 " : "\u25bc ") + Math.abs(v).toFixed(1) + "</span>"; }
  function renderReport() {
    var r = M.report(entries(), $("repKind").value, repAnchor), c = r.current, p = r.previous;
    var h = ['<div class="card"><h2>' + esc(r.label) + (prefs.example ? ' <span class="tag">example data</span>' : "") + "</h2>",
      '<p class="note">' + esc(r.start) + " to " + esc(r.end) + " \u00b7 " + c.daysLogged + " days logged \u00b7 " + c.entries + " entries \u00b7 " + c.drills + " training drills</p>",
      '<div class="kpis"><div class="kpi"><b>' + f1(c.peak) + "</b><small>Peak Now vs last " + r.kind + " " + arrow(r.change.peak, true) + '</small></div><div class="kpi"><b>' + f1(c.sleep) + " h</b><small>Sleep " + arrow(r.change.sleep, true) +
      '</small></div><div class="kpi"><b>' + f1(c.stress) + "/4</b><small>Stress " + arrow(r.change.stress, false) + '</small></div><div class="kpi"><b>' + c.pauses + " / " + c.repairs + "</b><small>Pauses / repairs</small></div></div>"];
    h.push("<table><thead><tr><th>Peak Now item</th><th class=num>This " + r.kind + "</th><th class=num>Previous</th></tr></thead><tbody>" + M.PEAK_ITEMS.map(function (k) {
      return "<tr><td>" + M.PEAK_LABELS[k] + '</td><td class="num">' + f1(c.items[k]) + '</td><td class="num">' + f1(p.items[k]) + "</td></tr>"; }).join("") + "</tbody></table></div>");
    h.push('<div class="grid2"><div class="card"><h2>Most frequent states</h2>' + (c.states.length ? "<table><tbody>" + c.states.map(function (s) { return "<tr><td>" + esc(s.name) + '</td><td class="num">' + s.n + '</td><td class="num">' + Math.round(s.share * 100) + "%</td></tr>"; }).join("") + "</tbody></table>" : '<p class="note">None logged.</p>') + "</div>");
    h.push('<div class="card"><h2>Techniques</h2>' + (c.techniques.length ? "<table><thead><tr><th>Technique</th><th class=num>Uses</th><th class=num>Avg drop</th></tr></thead><tbody>" + c.techniques.map(function (t) { return "<tr><td>" + esc(t.name) + '</td><td class="num">' + t.n + '</td><td class="num">' + f1(t.meanDrop) + "</td></tr>"; }).join("") + "</tbody></table>" : '<p class="note">None logged.</p>') + "</div></div>");
    if (c.lines.length) h.push('<div class="card"><h2>Peaks you wrote down</h2><ul>' + c.lines.slice(-10).map(function (l) { return "<li>" + esc(l.day) + ": " + esc(l.line) + "</li>"; }).join("") + "</ul></div>");
    h.push('<div class="card"><h2>Suggestions</h2><p class="heur">These are rough patterns from your own log. They aren\u2019t medical advice.</p>' + (r.suggestions.length ? "<ul>" + r.suggestions.map(function (s) { return "<li>" + esc(s.text) + "</li>"; }).join("") + "</ul>" : '<p class="note">Not enough data yet.</p>') + "</div>");
    if (r.flags.length) h.push('<div class="card"><h2>Worth a conversation</h2>' + flagHTML(r.flags) + "</div>");
    h.push('<p class="note">Generated by MindFrame Log on ' + esc(new Date().toLocaleString()) + ". This is a personal reflection, not a clinical record. All credit and glory to God.</p>");
    $("report").innerHTML = h.join("");
  }

  /* ---------- Training ---------- */
  var TECH_STEPS = {
    closeloop: ["Name it: \u201cThis is a loop.\u201d", "How, not why: what's the next physical step?", "One line: \u201cWhen ___, I will ___.\u201d", "Park the rest to 7:30.", "Five things the light touches.", "\u201cDone. Here.\u201d"],
    dps: ["Drop your shoulders, weight into your heels.", "One long exhale.", "Press your feet into the floor for 5 seconds.", "Name three things you can see."],
    reststate: ["Breathe in as the circle grows, out as it shrinks.", "Make the exhale a little longer.", "Name one thing that's still here."],
    pretech: ["Hold your anchor.", "Three slow breaths, eyes open.", "\u201cBreath, stone, home.\u201d", "One real smell. Both feet."],
    readback: ["\u201cWhere are you?\u201d", "\u201cHere.\u201d \u2192 \u201cHeard.\u201d", "Name one object."],
    help: ["Send one line: \u201cI'm in a loop. Can you ask me where I am?\u201d", "One slow breath while you wait."],
    chain: ["Pick one thought.", "Smallest physical act.", "Do only that.", "\u201cDone. Here.\u201d"],
    pause: ["\u201cCan we pause for two minutes?\u201d", "Three slow breaths each.", "\u201cWhat I heard you say was ___.\u201d"],
    senses: ["5 see", "4 touch", "3 hear", "2 smell", "1 breath"], walk: ["Walk for a few minutes. Notice your feet."], other: ["Do your own technique."]
  };
  var scenario = null;
  function renderTraining() {
    var all = entries();
    scenario = M.drillScenario(all);
    $("scenarioText").textContent = scenario.text + " Your most helpful move so far: " + (M.TECHNIQUES[scenario.technique] || scenario.technique) + ".";
    var ol = $("replaySteps"); ol.innerHTML = "";
    ["Picture yourself there for 20 seconds: the place, the sounds, what's on your plate.", "Notice where it shows up in your body. Name it.",
      "Run " + (M.TECHNIQUES[scenario.technique] || "your technique") + " (90 seconds): " + (TECH_STEPS[scenario.technique] || []).join(" "), "Rate yourself again."].forEach(function (s) { ol.appendChild(el("li", null, s)); });
    var sug = M.suggestSchedule(all), ul = $("suggest"); ul.innerHTML = "";
    if (!sug.length) ul.appendChild(el("li", null, "Log for a couple of weeks and suggestions will appear here."));
    sug.forEach(function (s) { ul.appendChild(el("li", null, s.text)); });
    var lastSleep = all.filter(function (e) { return e.sleepHours != null; }).slice(-7).map(function (e) { return e.sleepHours; });
    if (!$("simSleep").value) $("simSleep").value = M.round(M.mean(lastSleep), 1) || 7;
    var slots = M.highLoadSlots(all, 1, 2)[0];
    if (slots && !$("simDay").dataset.touched) $("simDay").value = String(slots.dow);
  }
  function replay() {
    if (timers.replay) return;
    var phases = [[20, "Picture the scene\u2026"], [10, "Notice it in your body. Name it."], [90, "Now: " + (M.TECHNIQUES[scenario.technique] || "your technique") + ". " + (TECH_STEPS[scenario.technique] || []).join(" ")]];
    var pi = 0, left = phases[0][0];
    $("replayPhase").textContent = phases[0][1]; $("replayTimer").textContent = fmtTime(left); $("replayEnd").classList.add("hidden");
    $("replayStart").disabled = true;
    timers.replay = setInterval(function () {
      left--; $("replayTimer").textContent = fmtTime(Math.max(0, left));
      if (left <= 0) { pi++; if (pi >= phases.length) { clearInterval(timers.replay); timers.replay = null; $("replayPhase").textContent = "Done. Here. How do you feel now?"; $("replayEnd").classList.remove("hidden"); $("replayStart").disabled = false; return; }
        left = phases[pi][0]; $("replayPhase").textContent = phases[pi][1]; }
    }, window.__fast ? 20 : 1000);
  }
  function saveDrill(kind, tech, before, after, detail, toastId) {
    var ok = addEntry({ id: M.uid("drill"), ts: new Date().toISOString(), type: "drill", techniques: [{ id: tech, before: before, after: after }], drill: { kind: kind, detail: detail } });
    $(toastId === "replay" ? "replayPhase" : "restTimer").textContent = prefs.example ? "Example data is on, so this drill wasn't saved." : ok ? "Drill saved." : "Couldn't save.";
    if (ok) renderAll();
  }
  function restDrill() {
    if (timers.rest) { clearInterval(timers.rest); timers.rest = null; $("restStart").textContent = "Start"; $("restBreath").classList.remove("on"); return; }
    var left = +$("restLen").value; $("restBreath").classList.remove("hidden"); $("restBreath").classList.add("on"); $("restEnd").classList.add("hidden");
    $("restStart").textContent = "Stop"; $("restTimer").textContent = fmtTime(left);
    timers.rest = setInterval(function () { left--; $("restTimer").textContent = fmtTime(Math.max(0, left));
      if (left <= 0) { clearInterval(timers.rest); timers.rest = null; $("restStart").textContent = "Start"; $("restBreath").classList.remove("on"); $("restTimer").textContent = "Done. Here."; $("restEnd").classList.remove("hidden"); if (navigator.vibrate) navigator.vibrate(150); } }, window.__fast ? 10 : 1000);
  }
  function simLoad() { var v = $("simDay").value; return M.loadProfile(entries(), v === "" ? null : +v); }
  function simPlan() { return [].map.call(document.querySelectorAll("#simHours .chip[aria-pressed=true]"), function (b) { return +b.dataset.v; }); }
  var lastSim = null;
  function runSim(marker) {
    var load = simLoad(), E0 = M.startEnergyFromSleep(+$("simSleep").value), plan = simPlan();
    var res = { plan: M.simulateDay(load, "plan", { startEnergy: E0, plan: plan }), hysteresis: M.simulateDay(load, "hysteresis", { startEnergy: E0 }),
      freeze: M.simulateDay(load, "freeze", { startEnergy: E0 }), naive: M.simulateDay(load, "naive", { startEnergy: E0 }) };
    lastSim = res;
    var n = res.plan.energy.length, labels = res.plan.energy.map(function (_, i) { return i % 8 === 0 ? M.hourLabel(7 + i / 4).replace(" ", "") : ""; });
    var bands = []; res.plan.rest.forEach(function (r, i) { if (r) bands.push({ from: i, to: i + 1, color: "var(--soft)", opacity: 0.35 }); });
    var html = CH.line({ width: cw("simOut"), height: 240, title: "Energy simulation", labels: labels, min: 0, max: 100, ticks: [0, 25, 50, 75, 100], bands: bands, marker: marker,
      series: [{ name: "Load from your log (\u00d7100)", values: res.plan.load.map(function (l) { return l * 100; }), color: "var(--warm)", area: true, width: 1, dash: "3 3" },
        { name: "Your plan", values: res.plan.energy, color: "var(--accent)", width: 3 },
        { name: "Hysteresis (rest early, stay until restored)", values: res.hysteresis.energy, color: "var(--soft)", width: 2 },
        { name: "Freeze at the peak", values: res.freeze.energy, color: "var(--muted)", dash: "6 4", width: 1.5 }] });
    var names = { plan: "Your plan", hysteresis: "Hysteresis", freeze: "Freeze at peak", naive: "No hysteresis (one threshold)" };
    html += '<div class="scroll"><table style="margin-top:.6rem"><thead><tr><th>Strategy</th><th class=num>Lowest energy</th><th class=num>End</th><th class=num>Rest h</th><th class=num>Switches</th><th class=num>Rest started at peak</th><th class=num>Deferred load h</th></tr></thead><tbody>' +
      Object.keys(res).map(function (k) { var m = res[k].metrics; return "<tr><td>" + names[k] + '</td><td class="num">' + m.minEnergy + '</td><td class="num">' + m.endEnergy + '</td><td class="num">' + m.restHours + '</td><td class="num">' + m.switches + '</td><td class="num">' + m.restStartsUnderLoad + '</td><td class="num">' + m.deferredLoadHours + "</td></tr>"; }).join("") + "</tbody></table></div>";
    html += '<p class="heur">This is a toy model built on the O~3 simulations, not a prediction. Two ideas it practices: start rest while the load is low, and once you rest, stay until you\u2019re restored instead of flipping back and forth (in O~3, hysteresis cut switching by about 60%). Your own experience counts for more than the model.</p>';
    $("simOut").innerHTML = html;
    return res;
  }
  function playSim() {
    if (timers.play) { clearInterval(timers.play); timers.play = null; $("simPlay").textContent = "Play the day"; return; }
    var i = 0, n = 64; $("simPlay").textContent = "Stop";
    timers.play = setInterval(function () { runSim(i); i++; if (i >= n) { clearInterval(timers.play); timers.play = null; $("simPlay").textContent = "Play the day"; runSim(); } }, window.__fast ? 10 : 250);
  }
  var live = null;
  function liveStart() {
    if (live && live.timer) { clearInterval(live.timer); }
    var load = simLoad(), E0 = M.startEnergyFromSleep(+$("simSleep").value);
    var sim = M.makeSim(load, { startEnergy: E0 });
    live = { sim: sim, rest: false, load: load, E0: E0 };
    $("liveToggle").disabled = false; $("liveToggle").textContent = "Rest"; $("liveOut").innerHTML = ""; $("liveStart").textContent = "Restart";
    live.timer = setInterval(function () {
      var st = sim.step(live.rest), i = st.i;
      var hour = 7 + Math.floor(i / 4), min = (i % 4) * 15;
      $("liveClock").textContent = M.hourLabel(hour % 24).replace(" ", ":" + String(min).padStart(2, "0") + " ");
      $("liveBar").style.width = st.E.toFixed(0) + "%";
      var nl = sim.loadAt(Math.min(sim.steps - 1, i + 4));
      $("liveInfo").textContent = "Energy " + st.E.toFixed(0) + " \u00b7 load now " + (sim.loadAt(Math.max(0, i - 1)) * 100).toFixed(0) + " \u00b7 next hour " + (nl * 100).toFixed(0) + (live.rest ? " \u00b7 resting" : "");
      if (sim.done()) {
        clearInterval(live.timer); live.timer = null; $("liveToggle").disabled = true;
        var mine = M.simMetrics(sim), hy = M.simulateDay(load, "hysteresis", { startEnergy: E0 });
        $("liveOut").innerHTML = '<table><thead><tr><th></th><th class=num>Lowest</th><th class=num>Switches</th><th class=num>Rest started at peak</th></tr></thead><tbody><tr><td>You</td><td class="num">' + mine.metrics.minEnergy + '</td><td class="num">' + mine.metrics.switches + '</td><td class="num">' + mine.metrics.restStartsUnderLoad +
          '</td></tr><tr><td>Hysteresis</td><td class="num">' + hy.metrics.minEnergy + '</td><td class="num">' + hy.metrics.switches + '</td><td class="num">' + hy.metrics.restStartsUnderLoad + "</td></tr></tbody></table>";
        if (!prefs.example) addEntry({ id: M.uid("drill"), ts: new Date().toISOString(), type: "drill", drill: { kind: "thermostat", detail: "min " + mine.metrics.minEnergy + ", switches " + mine.metrics.switches } });
        renderRecent();
      }
    }, window.__fast ? 15 : 1000);
  }

  /* ---------- Data ---------- */
  function download(name, text, type) {
    var a = el("a", { href: URL.createObjectURL(new Blob([text], { type: type })), download: name });
    document.body.appendChild(a); a.click(); a.remove();
  }
  function importText(text, label) {
    var list;
    try { list = M.parseImport(text); } catch (e) { toast("impToast", "Couldn't read that file: " + e.message); return 0; }
    var r = M.merge(store.entries, list); store.entries = r.entries; persist();
    toast("impToast", "Imported " + r.added + " entr" + (r.added === 1 ? "y" : "ies") + (r.skipped ? ", skipped " + r.skipped + " duplicate or invalid" : "") + (label ? " from " + label : "") + ".");
    renderAll(); return r.added;
  }
  function pullInbox() {
    var inbox = load(M.INBOX_KEY, []);
    if (!Array.isArray(inbox) || !inbox.length) return 0;
    var r = M.merge(store.entries, inbox); store.entries = r.entries;
    if (persist()) { try { localStorage.removeItem(M.INBOX_KEY); } catch (e) {} }
    toast("dailyToast", "Brought in " + r.added + " entr" + (r.added === 1 ? "y" : "ies") + " from MindFrame Now.");
    return r.added;
  }
  function storageInfo() { var n = store.entries.length, kb = Math.round((localStorage.getItem(KEY) || "").length / 1024); $("storageInfo").textContent = n + " real entries stored (" + kb + " KB) on this device."; }

  /* ---------- wiring ---------- */
  function applyTheme() { if (prefs.theme) document.documentElement.setAttribute("data-theme", prefs.theme); else document.documentElement.removeAttribute("data-theme"); }
  var current = "today";
  function show(tab) {
    current = tab;
    [].forEach.call(document.querySelectorAll("nav.tabs button"), function (b) { b.setAttribute("aria-selected", String(b.dataset.tab === tab)); });
    [].forEach.call(document.querySelectorAll("section.tab"), function (s) { s.classList.toggle("hidden", s.id !== "tab-" + tab); });
    renderCurrent();
  }
  function renderCurrent() {
    if (current === "trends") renderTrends(); else if (current === "reports") renderReport(); else if (current === "training") renderTraining(); else if (current === "data") storageInfo();
  }
  function renderAll() {
    $("exampleBadge").classList.toggle("hidden", !prefs.example);
    $("flagsToday").innerHTML = flagHTML(M.flags(entries(), new Date()));
    renderRecent(); renderCurrent();
  }
  function init() {
    sliders();
    chips("dEnergy", M.ENERGY, "dEnergy"); chips("dStress", M.STRESS, "dStress"); chips("eEnergy", M.ENERGY, "eEnergy"); chips("eStress", M.STRESS, "eStress");
    var ts = $("eTech"); ts.appendChild(el("option", { value: "" }, "none")); Object.keys(M.TECHNIQUES).forEach(function (k) { ts.appendChild(el("option", { value: k }, M.TECHNIQUES[k])); });
    ["eBefore", "eAfter", "rBefore", "rAfter", "restBefore", "restAfter"].forEach(function (id) { scoreOptions(id, true); });
    [].forEach.call(document.querySelectorAll(".counter"), function (c) { c.addEventListener("click", function (ev) { var d = ev.target.dataset.d; if (!d) return; var o = $(c.dataset.for); o.textContent = Math.max(0, +o.textContent + +d); }); });
    var sd = $("simDay"); sd.appendChild(el("option", { value: "" }, "Typical day")); M.DOW.forEach(function (d, i) { sd.appendChild(el("option", { value: String(i) }, d)); });
    sd.addEventListener("change", function () { sd.dataset.touched = "1"; });
    var hb = $("simHours"); for (var h = 7; h < 23; h++) { (function (h) { var b = el("button", { type: "button", class: "chip", "aria-pressed": [12, 18].indexOf(h) >= 0 ? "true" : "false", "data-v": h }, M.hourLabel(h).replace(" ", "")); b.addEventListener("click", function () { b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true")); }); hb.appendChild(b); })(h); }
    [].forEach.call(document.querySelectorAll("nav.tabs button"), function (b) { b.addEventListener("click", function () { show(b.dataset.tab); }); });
    $("dailyForm").addEventListener("submit", saveDaily);
    $("eventForm").addEventListener("submit", saveEvent);
    $("range").addEventListener("change", renderTrends);
    $("repKind").addEventListener("change", function () { repAnchor = new Date(); renderReport(); });
    $("repPrev").addEventListener("click", function () { repAnchor = $("repKind").value === "month" ? new Date(repAnchor.getFullYear(), repAnchor.getMonth() - 1, 15) : M.addDays(repAnchor, -7); renderReport(); });
    $("repNext").addEventListener("click", function () { repAnchor = $("repKind").value === "month" ? new Date(repAnchor.getFullYear(), repAnchor.getMonth() + 1, 15) : M.addDays(repAnchor, 7); renderReport(); });
    $("repPrint").addEventListener("click", function () { var s = $("tab-reports"); s.classList.add("printing"); window.print(); setTimeout(function () { s.classList.remove("printing"); }, 500); });
    $("replayStart").addEventListener("click", replay);
    $("replaySave").addEventListener("click", function () { saveDrill("replay", scenario.technique, $("rBefore").value, $("rAfter").value, scenario.label, "replay"); $("replayEnd").classList.add("hidden"); });
    $("restStart").addEventListener("click", restDrill);
    $("restSave").addEventListener("click", function () { saveDrill("rest", "reststate", $("restBefore").value, $("restAfter").value, $("restLen").value + "s", "rest"); $("restEnd").classList.add("hidden"); });
    $("simRun").addEventListener("click", function () { runSim(); });
    $("simPlay").addEventListener("click", playSim);
    $("liveStart").addEventListener("click", liveStart);
    $("liveToggle").addEventListener("click", function () { if (!live) return; live.rest = !live.rest; $("liveToggle").textContent = live.rest ? "Return" : "Rest"; });
    $("exampleToggle").checked = !!prefs.example;
    $("exampleToggle").addEventListener("change", function () { prefs.example = this.checked; savePrefs(); renderAll(); });
    $("expJson").addEventListener("click", function () { download("mindframe-log-" + M.dayKey(new Date()) + ".json", M.exportJSON(entries()), "application/json"); });
    $("expCsv").addEventListener("click", function () { download("mindframe-log-" + M.dayKey(new Date()) + ".csv", M.toCSV(entries()), "text/csv"); });
    $("impFile").addEventListener("change", function () { var f = this.files[0]; if (!f) return; var rd = new FileReader(); rd.onload = function () { importText(rd.result, f.name); }; rd.readAsText(f); this.value = ""; });
    $("clearAll").addEventListener("click", function () { if (confirm("Delete all " + store.entries.length + " entries on this device? Export first if you want a copy.") && confirm("Are you sure? This can't be undone.")) { store.entries = []; persist(); renderAll(); } });
    $("theme").value = prefs.theme || ""; $("theme").addEventListener("change", function () { prefs.theme = this.value; savePrefs(); applyTheme(); });
    applyTheme();
    pullInbox();
    window.addEventListener("focus", function () { if (pullInbox()) renderAll(); });
    var p = new URLSearchParams(location.search);
    if (p.get("example") === "1") { prefs.example = true; $("exampleToggle").checked = true; }
    renderAll();
    if (p.get("tab")) show(p.get("tab"));
    if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(function () {});
  }
  window.__log = { store: function () { return store; }, entries: entries, importText: importText, runSim: runSim, show: show };
  init();
})();
