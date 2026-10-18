// features/historian.js — "My days" (was Hazel the Owl, the Historian).
//
// Remembers your days and checkpoints (numbers and labels only, never words):
//   • addCheckpoint / restore: save a moment and come back to it
//   • acceptStep: e becomes master's next step (saved as step-n)
//   • week / weekLines: the last seven days, in words
//   • peaceTrend / peaceLine: inner peace P across the saved days (via master), in words
// Everything reads the master output; nothing here steps the numbers itself.

if (typeof module !== "undefined") {
  require("../core/master.js");
}

(function (MF) {
  "use strict";
  const { MAX_CHECKPOINTS, MAX_DAYS, LABEL_RE, r2, norm, distance, stamp, dayOf } = MF.Movers;
  const { master, refreshIdeal, baselineSeries } = MF.Master;
  /** Record today's vector as one point per day (the last checkpoint or step of the day wins). */
  function recordDay(state, ts) {
    const day = dayOf(stamp(ts));
    const days = state.days.filter(x => x.day !== day).concat({ day, e: state.e.slice() }).sort((a, b) => (a.day < b.day ? -1 : 1)).slice(-MAX_DAYS);
    return { ...state, days };
  }
  /** Save a checkpoint (numbers and a label only) and record the day. */
  function addCheckpoint(state, label, ts = Date.now()) {
    const m = master("", state, { sim: false, now: ts });
    const n = state.cps.length ? state.cps[state.cps.length - 1].n + 1 : 1;
    const cp = { n, t: stamp(ts), label: LABEL_RE.test(label || "") ? label : `cp-${n}`, e: m.e.slice(), lambda: m.lambda === null ? 0 : m.lambda };
    return recordDay({ ...state, e: m.e.slice(), cps: state.cps.concat(cp).slice(-MAX_CHECKPOINTS) }, ts);
  }
  /** Go back to a checkpoint's numbers. */
  function restore(state, n) {
    const cp = state.cps.find(c => c.n === n);
    return cp ? refreshIdeal({ ...state, e: cp.e.slice() }) : state;
  }
  // Accept the step: e ← the master step from where you are.
  /** Accept the master step: e becomes master's next, saved as checkpoint step-n. */
  function acceptStep(state, ts = Date.now()) {
    const m = master("", state, { sim: false, now: ts });
    const n = state.cps.filter(c => /^step-\d+$/.test(c.label)).length + 1;
    return refreshIdeal(addCheckpoint({ ...state, e: m.next.slice() }, `step-${n}`, ts));
  }
  // Each day's direction: cos(D_t − D_{t−1}, h − B_{t−1}).
  /** The last seven days: baseline distance and direction (toward, sideways, away from home). */
  function week(state, now = Date.now()) {
    const s = baselineSeries(state.days), h = state.home;
    const start = dayOf(stamp(now - 6 * 86400000));
    return s.map((x, t) => {
      let dir = null;
      if (t > 0) {
        const v = x.D.map((y, i) => y - s[t - 1].D[i]), to = h.map((y, i) => y - s[t - 1].B[i]);
        const c = norm(v) && norm(to) ? v.reduce((p, y, i) => p + y * to[i], 0) / (norm(v) * norm(to)) : 0;
        dir = c > 0.15 ? "up" : c < -0.15 ? "down" : "side";
      }
      return { day: x.day, dB: r2(distance(x.B, h)), dir };
    }).filter(x => x.day >= start);
  }
  const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  /** Weekday name for a YYYY-MM-DD day. */
  const dayName = day => WEEKDAY[new Date(`${day}T12:00:00`).getDay()];
  const DIR_WORDS = { up: "a step toward steady", side: "a sideways day (showing up still counts)", down: "a heavier day" };
  /** The week in words. */
  const weekLines = (state, now) => week(state, now).map(x => `${dayName(x.day)}: ${x.dir ? DIR_WORDS[x.dir] : "the first day on the map"}`);
  /**
   * Inner peace P for each saved day (last seven), from master's peace score
   * of that day's vector (no text, so only mover conflicts count).
   * @returns {Array<{day:string, P:number}>}
   */
  function peaceTrend(state, now = Date.now()) {
    const start = dayOf(stamp(now - 6 * 86400000));
    return state.days.filter(x => x.day >= start).map(x => ({ day: x.day, P: master("", { ...state, e: x.e.slice() }, { sim: false }).peace.P }));
  }
  /**
   * The peace trend in words: the band of the first and last saved day and
   * the direction (a change under 0.05 counts as holding steady).
   */
  function peaceLine(state, now) {
    const t = peaceTrend(state, now);
    if (!t.length) return null;
    const band = MF.Peace.band;
    if (t.length === 1) return `Inner peace on your first saved day: ${band(t[0].P)}.`;
    const a = t[0], b = t[t.length - 1], diff = b.P - a.P;
    const dir = diff >= 0.05 ? "rising" : diff <= -0.05 ? "dipping for now" : "holding steady";
    return band(a.P) === band(b.P) ? `Inner peace across your saved days: ${band(b.P)}, ${dir}.` : `Inner peace across your saved days: from ${band(a.P)} to ${band(b.P)}, ${dir}.`;
  }
  /** The week in numbers (for the math view). */
  const weekMath = (state, now) => week(state, now).map(x => `${x.day.slice(5)}  \u2016B \u2212 h\u2016 = ${x.dB.toFixed(2)}  ${x.dir || "start"}`)
    .concat(peaceTrend(state, now).map(x => `${x.day.slice(5)}  P = ${x.P.toFixed(2)}`));


  // ---------- Panel (browser only) ----------
  /**
   * Mount the Historian panel: the week in words, Save checkpoint, and the
   * checkpoint list (tap one to go back to it).
   * @param {object} app the app shell (see js/app.js)
   * @returns {function} render
   */
  /** Mount this feature's panel. */
  function mount(app) {
    const { $, li } = app;
    $("save").addEventListener("click", () => {
      if (!app.update()) return;
      app.state = addCheckpoint(app.state, app.state.cps.length ? "" : "start");
      app.save();
      app.renderAll();
      app.note("Checkpoint saved (numbers only).");
    });
    return function render() {
      const s = app.state, m = app.m();
      // Hazel shows the card's progress line (it is no longer on the short card).
      $("hazel-progress").textContent = m ? MF.Words.progressLine(m) : "";
      const wk = $("week");
      wk.innerHTML = "";
      const lines = weekLines(s);
      if (!lines.length) wk.appendChild(li("Nothing recorded yet. Save a checkpoint or accept a step."));
      lines.forEach(l => wk.appendChild(li(l)));
      const pl = peaceLine(s);
      if (pl) wk.appendChild(li(pl, "peace-trend"));
      const ol = $("cps");
      ol.innerHTML = "";
      $("cps-empty").classList.toggle("hidden", s.cps.length > 0);
      s.cps.slice().reverse().forEach(cp => {
        const item = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "cp";
        btn.textContent = `${cp.label} \u00B7 ${new Date(cp.t).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}`;
        btn.setAttribute("aria-label", `Go back to checkpoint ${cp.label}`);
        btn.addEventListener("click", () => {
          app.state = restore(app.state, cp.n);
          app.resetBase("");
          app.update({ care: false });
          app.note(`Back at checkpoint ${cp.label}. New words add to it.`);
        });
        item.appendChild(btn);
        ol.appendChild(item);
      });
    };
  }

  MF.Historian = { recordDay, addCheckpoint, restore, acceptStep, week, weekLines, weekMath, peaceTrend, peaceLine, mount };
})(typeof window !== "undefined" ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
if (typeof module !== "undefined") module.exports = global.MF.Historian;
