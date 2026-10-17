// psi.js — the 30-second daily check-in (the Ψ index from the combined paper).
//
//   C = 1 - SUDS/10        calm (distress 0..10, reversed)
//   S = (s - 1)/4          belonging, 1..5
//   M = share of planned skills used: None 0, Some .33, Most .67, All 1
//   R = (r - 1)/6          avoidance, 1..7 (one item adapted from the AAQ-II)
//   B = believability of the hard thought, 0..1
//
//   Ψ = wC·C + wS·S + wM·M − wR·R − wB·B
//   research starting weights: wC .18, wS .14, wM .12, wR .26, wB .31
//
// The signs are fixed (+, +, +, −, −). Only the sizes can be adjusted.
// Score = 100·(Ψ − min)/(max − min), with min = −(wR + wB), max = wC + wS + wM.
// With the research weights this is 100·(Ψ + 0.57)/1.01, as in the paper.
// The weights come from published correlations. They are a starting point,
// not a validated scoring model.

const Psi = (function () {
  const DEFAULT_WEIGHTS = Object.freeze({ C: 0.18, S: 0.14, M: 0.12, R: 0.26, B: 0.31 });
  const POSITIVE = ["C", "S", "M"];
  const NEGATIVE = ["R", "B"];
  const TERMS = ["C", "S", "M", "R", "B"];
  const SKILL_LEVELS = { none: 0, some: 0.33, most: 0.67, all: 1 };
  const LOW_SCORE = 30;

  const clamp = (x, lo, hi) => (Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : lo);

  // Raw answers -> the five terms, each 0..1.
  function terms({ suds, belong, skills, avoid, believe }) {
    return {
      C: 1 - clamp(suds, 0, 10) / 10,
      S: (clamp(belong, 1, 5) - 1) / 4,
      M: typeof skills === "string" ? (SKILL_LEVELS[skills] ?? 0) : clamp(skills, 0, 1),
      R: (clamp(avoid, 1, 7) - 1) / 6,
      B: clamp(believe, 0, 100) / 100,
    };
  }

  // Any weight set -> sizes only, 0..1. A missing weight falls back to research.
  function weights(w) {
    const out = {};
    TERMS.forEach(k => {
      const v = w && Number.isFinite(Number(w[k])) ? Math.abs(Number(w[k])) : DEFAULT_WEIGHTS[k];
      out[k] = clamp(v, 0, 1);
    });
    return out;
  }

  function psi(t, w) {
    const W = weights(w);
    return POSITIVE.reduce((s, k) => s + W[k] * t[k], 0) - NEGATIVE.reduce((s, k) => s + W[k] * t[k], 0);
  }

  function bounds(w) {
    const W = weights(w);
    return { min: -(W.R + W.B), max: W.C + W.S + W.M };
  }

  // 0..100. If every weight is zero there is nothing to measure, so 50.
  function score(t, w) {
    const { min, max } = bounds(w);
    if (max - min <= 0) return 50;
    return Math.round(clamp((100 * (psi(t, w) - min)) / (max - min), 0, 100));
  }

  // ---------- Next skill: the weakest term, relative to its best possible value ----------
  const SKILLS = {
    C: { creature: "Mistfawn", name: "Paced breathing (TIPP)", line: "Breathe out longer than you breathe in, for one minute." },
    S: { creature: "Tidelyn", name: "Reach out", line: "Send one warm message to someone, even just hello." },
    M: { creature: "Hivewright", name: "One planned skill", line: "Pick one skill you planned and do the smallest version of it." },
    R: { creature: "Brakkor", name: "Opposite Action", line: "Take one small step toward what you've been avoiding." },
    B: { creature: "Lumowl", name: "Check the Facts", line: "Check the facts on the hard thought with Reframe." },
  };
  const GOOD_ENOUGH = 0.75;

  // "Goodness" of a term: its value for C, S, M; one minus its value for R, B.
  // Ties go to the term with more weight. Terms with zero weight are skipped.
  function nextSkill(t, w) {
    const W = weights(w);
    let best = null;
    TERMS.forEach(k => {
      if (W[k] <= 0) return;
      const good = POSITIVE.includes(k) ? t[k] : 1 - t[k];
      if (!best || good < best.good - 1e-9 || (Math.abs(good - best.good) < 1e-9 && W[k] > W[best.term])) {
        best = { term: k, good };
      }
    });
    if (!best || best.good >= GOOD_ENOUGH) return { term: null, creature: "Hivewright", name: "Keep going", line: "Everything looks steady today. Keep doing what helps." };
    return { term: best.term, ...SKILLS[best.term] };
  }

  // ---------- History: one entry per day, numbers only, last one wins ----------
  function dayKey(ts) {
    const d = new Date(ts);
    const pad = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function record(state, answers, ts = Date.now()) {
    const day = dayKey(ts);
    const log = ((state && state.log) || []).filter(e => e.day !== day);
    const clean = {
      suds: clamp(Number(answers.suds), 0, 10),
      belong: clamp(Number(answers.belong), 1, 5),
      skills: typeof answers.skills === "string" ? answers.skills : clamp(Number(answers.skills), 0, 1),
      avoid: clamp(Number(answers.avoid), 1, 7),
      believe: clamp(Number(answers.believe), 0, 100),
    };
    log.push({ day, ts, ...clean, skill: answers.skill || null });
    log.sort((a, b) => (a.day < b.day ? -1 : 1));
    return { ...(state || {}), log };
  }

  // Seven calendar days ending today: [{day, value|null}].
  function last7(valueByDay, now = Date.now()) {
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setHours(12, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = dayKey(d.getTime());
      out.push({ day: key, value: valueByDay.has(key) ? valueByDay.get(key) : null });
    }
    return out;
  }

  // Consecutive calendar days, ending on the latest recorded day, below a threshold.
  function lowStreak(days, threshold = LOW_SCORE) {
    const sorted = days.filter(d => d.value !== null && d.value !== undefined).sort((a, b) => (a.day < b.day ? -1 : 1));
    let streak = 0;
    let prev = null;
    for (let i = sorted.length - 1; i >= 0; i--) {
      const { day, value } = sorted[i];
      if (value >= threshold) break;
      if (prev && Math.round((Date.parse(prev + "T12:00:00") - Date.parse(day + "T12:00:00")) / 86400000) !== 1) break;
      streak += 1;
      prev = day;
    }
    return streak;
  }

  function daysBetween(a, b) {
    return Math.round((Date.parse(b + "T12:00:00") - Date.parse(a + "T12:00:00")) / 86400000);
  }

  // ---------- Weekly reflection ----------
  // checkins: [{day, score, skill}]   ground: [{day, G, patterns}]
  // Due once there are 7+ days with any data, and 7+ days since the last one.
  function weeklyDue({ checkins = [], ground = [], lastWeekly = null, now = Date.now() }) {
    const days = new Set([...checkins.map(c => c.day), ...ground.map(g => g.day)]);
    if (days.size < 7) return false;
    return !lastWeekly || daysBetween(lastWeekly, dayKey(now)) >= 7;
  }

  function mostCommon(items) {
    const counts = new Map();
    items.forEach(x => { if (x) counts.set(x, (counts.get(x) || 0) + 1); });
    let top = null;
    counts.forEach((n, k) => { if (!top || n > top[1]) top = [k, n]; });
    return top ? top[0] : null;
  }

  function weeklySummary({ checkins = [], ground = [], now = Date.now(), labels = {} }) {
    const start = dayKey(now - 6 * 86400000);
    const end = dayKey(now);
    const inWeek = d => d >= start && d <= end;
    const c = checkins.filter(x => inWeek(x.day));
    const g = ground.filter(x => inWeek(x.day));
    const avg = xs => (xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : null);
    const pattern = mostCommon(g.flatMap(x => x.patterns || []));
    const skill = mostCommon(c.map(x => x.skill));
    return {
      avgScore: avg(c.map(x => x.score)),
      avgG: avg(g.map(x => x.G * 100)),
      pattern: pattern ? labels[pattern] || pattern : null,
      skill: skill && SKILLS[skill] ? SKILLS[skill].name : null,
      days: new Set([...c.map(x => x.day), ...g.map(x => x.day)]).size,
    };
  }

  return { DEFAULT_WEIGHTS, TERMS, POSITIVE, NEGATIVE, SKILL_LEVELS, SKILLS, LOW_SCORE, terms, weights, psi, bounds, score, nextSkill, dayKey, record, last7, lowStreak, weeklyDue, weeklySummary, daysBetween };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Psi;
