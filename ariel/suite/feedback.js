// ariel/suite/feedback.js — plain words under a graph.
// No DOM. Nothing is sent. No model writes the sentences. Ryan asked for this.
// A guide, not a diagnosis, and never a grade.
//
// ===== PARAMS =====
// deadband     a slope inside this is steady
// vary         mean absolute deviation above this is up-and-down
// window       last 7 points, compared with the 7 before them
// minPoints    fewer than this has no pattern yet
// sharpDrop    a fall in the kinder direction this large asks for a person
// voidDays     this many recent days in the void also asks for a person
// xVoid, xOut  the in-void / edge / out guide, same cuts as the valence note
//
// ===== EQUATIONS =====
// slope = mean(last k) − mean(prior k)
// k = 7 when there are at least 14 points, otherwise floor(n / 2)
// trend = steady if |slope| ≤ deadband, rising if slope > deadband, else dipping
// variability = up-and-down if MAD(last k) > vary, else steady
// best day = the day whose mean is kinder; hardest day is the other end
// streak = consecutive latest steps that move in the kinder direction
// zone = out if x > xOut and rumination is low and isolation is low and w > wWide
// zone = void if x < xVoid and (rumination is high or isolation is high)
// zone = edge otherwise
// x from a gate width, when no valence x is given: x = clamp(2w − 1, −1, 1)
// the weakest factor (rumination, connection, rest, kindness, guilt) picks one existing path
"use strict";
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ArielFeedback = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const PARAMS = {
    deadband: 0.04,
    vary: 0.06,
    window: 7,
    minPoints: 3,
    sharpDrop: 0.25,
    voidDays: 3,
    weakAt: 0.45,
    afraidAt: 0.35,
    kindnessFew: 2,
    xVoid: -0.10,
    xOut: 0.20,
    rumHigh: 0.40,
    rumLow: 0.35,
    isoHigh: 0.40,
    isoLow: 0.35,
    wWide: 0.40,
    little: "Not enough yet to see a pattern, and that's okay.",
    dip: "Dips are part of the path, not a verdict.",
    guide: "A guide, not a diagnosis.",
    crisis: "This looks heavy. Talk to someone you trust. Call or text 988, or call 911.",
    actions: {
      spiral: { label: "Slow the spiral", line: "When thoughts circle, Slow the spiral is here, one step at a time." },
      reach: { label: "Reach out", line: "If connection feels thin, Reach out is here." },
      afraid: { label: "I'm afraid to stop", line: "If rest feels like disappearing, I'm afraid to stop is here." },
      rest: { label: "Rest", line: "A pause is here when you want it." },
      kindness: { label: "Add kindness", line: "A kindness you've seen can be kept on this device." },
      honest: { label: "Honest room", line: "If guilt is heavy, the Honest Room can hold it." }
    }
  };

  function clamp(x, a, b) { return Math.min(b, Math.max(a, x)); }

  function asPoints(points) {
    return (points || []).map(p => {
      if (typeof p === "number") return { value: p, day: "" };
      const value = Number(p && p.value);
      return { value: value, day: p && p.day ? String(p.day) : "" };
    }).filter(p => Number.isFinite(p.value));
  }

  function mean(values) {
    if (!values.length) return 0;
    return values.reduce((sum, n) => sum + n, 0) / values.length;
  }

  function windows(values) {
    const n = values.length;
    if (n < PARAMS.minPoints) return null;
    const k = n >= PARAMS.window * 2 ? PARAMS.window : Math.floor(n / 2);
    if (k < 1) return null;
    return { recent: values.slice(-k), prior: values.slice(-2 * k, -k) };
  }

  function trendOf(values, deadband) {
    const span = windows(values);
    if (!span || !span.prior.length) return { trend: "steady", slope: 0 };
    const slope = mean(span.recent) - mean(span.prior);
    const band = deadband == null ? PARAMS.deadband : deadband;
    const trend = Math.abs(slope) <= band ? "steady" : (slope > 0 ? "rising" : "dipping");
    return { trend: trend, slope: slope };
  }

  function variabilityOf(values, deadband) {
    const span = windows(values);
    const sample = span ? span.recent : values.slice(-PARAMS.window);
    if (sample.length < 2) return "steady";
    const mid = mean(sample);
    const mad = mean(sample.map(n => Math.abs(n - mid)));
    const band = deadband == null ? PARAMS.vary : Math.max(PARAMS.vary, deadband);
    return mad > band ? "up-and-down" : "steady";
  }

  function byDay(points, higherIsBetter) {
    const groups = [];
    points.forEach(p => {
      if (!p.day) return;
      const found = groups.filter(g => g.day === p.day)[0];
      if (found) found.values.push(p.value);
      else groups.push({ day: p.day, values: [p.value] });
    });
    return groups.map(g => ({ day: g.day, value: mean(g.values), higherIsBetter: !!higherIsBetter }));
  }

  function bestHardest(points, higherIsBetter) {
    const days = byDay(points, higherIsBetter);
    if (days.length < 2) return { best: null, hardest: null };
    const pick = (score) => days.slice().sort((a, b) => {
      const diff = score(b) - score(a);
      if (diff !== 0) return diff;
      return a.day < b.day ? 1 : -1;
    })[0];
    const best = pick(day => higherIsBetter ? day.value : -day.value);
    const hardest = pick(day => higherIsBetter ? -day.value : day.value);
    return { best: { day: best.day, value: best.value }, hardest: { day: hardest.day, value: hardest.value } };
  }

  function streak(values, higherIsBetter, deadband) {
    const band = deadband == null ? PARAMS.deadband : deadband;
    let n = 0;
    for (let i = values.length - 1; i > 0; i--) {
      const step = values[i] - values[i - 1];
      const kinder = higherIsBetter ? step > band : step < -band;
      if (!kinder) break;
      n += 1;
    }
    return n;
  }

  function classify(x, rum, iso, w) {
    const rumination = Number(rum) || 0;
    const isolation = Number(iso) || 0;
    const width = Number(w) || 0;
    if (x > PARAMS.xOut && rumination < PARAMS.rumLow && isolation < PARAMS.isoLow && width > PARAMS.wWide) return "out";
    if (x < PARAMS.xVoid && (rumination > PARAMS.rumHigh || isolation > PARAMS.isoHigh)) return "void";
    return "edge";
  }

  function fromWidth(w, extra) {
    const width = clamp(Number(w) || 0, 0, 1);
    const src = extra || {};
    const x = src.x == null ? clamp(2 * width - 1, -1, 1) : clamp(Number(src.x) || 0, -1, 1);
    const rum = src.rumination == null ? 0 : Number(src.rumination) || 0;
    const iso = src.isolation == null ? 0 : Number(src.isolation) || 0;
    return { x: x, w: width, rum: rum, iso: iso, zone: classify(x, rum, iso, width) };
  }

  function place(zone) {
    if (zone === "void") return "in the void";
    if (zone === "out") return "out of the void";
    return "on the edge";
  }

  function valenceLine(current, previous) {
    if (!current || current.x == null || !current.zone) return "";
    let mover = current.movedBy || "";
    if (!mover && current.zone === "void" && current.rum > PARAMS.rumHigh) mover = "rumination";
    else if (!mover && current.zone === "void" && current.iso > PARAMS.isoHigh) mover = "being apart from people";
    else if (!mover && previous && current.w != null && previous.w != null && current.w - previous.w > PARAMS.deadband) mover = "the gate opening";
    else if (!mover && previous && current.w != null && previous.w != null && previous.w - current.w > PARAMS.deadband) mover = "the gate narrowing";
    let line = "Right now the readout is " + place(current.zone);
    if (mover) line += ", and " + mover + " is what moved it";
    else if (previous && previous.zone && previous.zone !== current.zone) line += ", after being " + place(previous.zone);
    else if (previous && previous.x != null && current.x - previous.x > PARAMS.deadband) line += ", and it moved toward rest";
    else if (previous && previous.x != null && previous.x - current.x > PARAMS.deadband) line += ", and it moved back toward the void";
    else line += ", and it has not moved much";
    return line + ".";
  }

  function sharper(values, higherIsBetter, drop) {
    const span = windows(values);
    if (!span || !span.prior.length) return false;
    const kinder = higherIsBetter ? values[values.length - 1] - mean(span.prior) : mean(span.prior) - values[values.length - 1];
    return kinder <= -(drop == null ? PARAMS.sharpDrop : drop);
  }

  function voidRun(zones) {
    let n = 0;
    const list = zones || [];
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i] !== "void") break;
      n += 1;
    }
    return n;
  }

  function weakest(factors) {
    const f = factors || {};
    const scores = [];
    if (f.guilt != null) scores.push({ action: "honest", worse: Number(f.guilt) || 0 });
    if (f.rumination != null) scores.push({ action: "spiral", worse: Number(f.rumination) || 0 });
    if (f.connection != null) scores.push({ action: "reach", worse: 1 - (Number(f.connection) || 0) });
    if (f.rest != null) {
      const rest = Number(f.rest) || 0;
      scores.push({ action: rest < PARAMS.afraidAt ? "afraid" : "rest", worse: 1 - rest });
    }
    if (f.kindness != null) {
      const count = Number(f.kindness) || 0;
      scores.push({ action: "kindness", worse: count < PARAMS.kindnessFew ? 0.6 : 0.1 });
    }
    scores.sort((a, b) => b.worse - a.worse);
    if (!scores.length || scores[0].worse < PARAMS.weakAt) return "rest";
    return scores[0].action;
  }

  function readSeries(series) {
    const src = series || {};
    const points = asPoints(src.points);
    const values = points.map(p => p.value);
    const higher = src.higherIsBetter !== false;
    const dead = src.deadband;
    const trend = trendOf(values, dead);
    const improved = (higher && trend.trend === "rising") || (!higher && trend.trend === "dipping");
    const worsened = (higher && trend.trend === "dipping") || (!higher && trend.trend === "rising");
    const ends = bestHardest(points, higher);
    return {
      id: src.id || "",
      name: src.name || "This",
      higherIsBetter: higher,
      points: points,
      values: values,
      trend: trend.trend,
      slope: trend.slope,
      variability: variabilityOf(values, dead),
      improved: improved,
      worsened: worsened,
      best: ends.best,
      hardest: ends.hardest,
      streak: streak(values, higher, dead),
      sharp: sharper(values, higher, src.sharpDrop),
      enough: values.length >= PARAMS.minPoints
    };
  }

  function chart(input) {
    const src = input || {};
    const series = (src.series || []).map(readSeries);
    const listening = !!src.listening;
    const primary = series[0] || readSeries({});
    if (!series.length || series.every(item => !item.enough)) {
      return {
        title: "What this shows",
        guide: PARAMS.guide,
        lines: [PARAMS.little],
        suggestion: "",
        action: "",
        label: "",
        crisis: false,
        crisisLine: "",
        trend: "",
        variability: "",
        best: null,
        hardest: null,
        streak: 0,
        listening: listening
      };
    }
    const improved = series.filter(item => item.enough && item.improved);
    const worsened = series.filter(item => item.enough && item.worsened);
    const named = improved[0] || series.filter(item => item.enough)[0];
    const lead = named.improved
      ? named.name + " has been " + named.trend + ", and that came first."
      : named.name + " has been " + named.trend + ".";
    const valence = valenceLine(src.valence, src.valencePrev);
    const detailSource = named.best ? named : primary;
    let detail = "";
    if (detailSource.best && detailSource.hardest && detailSource.best.day !== detailSource.hardest.day) {
      detail = "The best day was " + detailSource.best.day + ", and the hardest was " + detailSource.hardest.day + ".";
    } else {
      detail = named.variability === "up-and-down" ? "The recent readings are up and down." : "The recent readings are steady.";
    }
    if (named.streak >= 2) detail += " The kinder direction has held for " + named.streak + " readings.";
    const dip = worsened.length > 0;
    let lines = [];
    lines.push(valence ? lead + " " + valence : lead);
    lines.push(dip ? PARAMS.dip : detail);
    if (listening) lines = dip ? [lines[0], PARAMS.dip] : [lines[0]];
    const action = listening ? "" : weakest(src.factors);
    const suggestion = action ? PARAMS.actions[action].line : "";
    const zones = src.zones || [];
    const crisis = voidRun(zones) >= PARAMS.voidDays || series.some(item => item.sharp);
    if (crisis) lines.push(PARAMS.crisis);
    return {
      title: "What this shows",
      guide: PARAMS.guide,
      lines: lines,
      suggestion: suggestion,
      action: action,
      label: action ? PARAMS.actions[action].label : "",
      crisis: crisis,
      crisisLine: crisis ? PARAMS.crisis : "",
      trend: named.trend,
      variability: named.variability,
      best: detailSource.best,
      hardest: detailSource.hardest,
      streak: named.streak,
      listening: listening
    };
  }

  return { PARAMS, asPoints, trendOf, variabilityOf, bestHardest, streak, classify, fromWidth, valenceLine, weakest, chart };
});
