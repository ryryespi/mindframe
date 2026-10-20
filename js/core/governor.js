// core/governor.js — the Expression governor (push27).
// Goal: let you say what is inside as fully as you need, and offer a gentle
// pause only when the writing itself shows you are nearing a safe limit.
// It never blocks writing, never moves your numbers, and is NOT a diagnosis.
// Crisis wording is handled before this (the 988/911 box only).
//
// Signals, each in [0, 1] (cue c = 1 − e^(−0.7k) for k matching phrases):
//   C   inner conflict: master's strongest hidden conflict (core/reality.js)
//   U   unawareness = 1 − (1 − 0.6·c_numb)(1 − 0.4·rep)(1 − 0.2·(1 − A))
//       numb / detached words, flat repetition rep = 2·max(0, 0.5 − unique/total)
//       (12+ words), and low self-awareness A (Kai, core/kai.js)
//   Y   irritability = 1 − (1 − min(1, 2·max(0, Δanger/Δt_h·0.25)))(1 − 0.5·c_irrit)
//       (anger rising per hour since the last entry, and irritation words)
//   Mn  activation (mania-like, not mania) = 1 − (1 − 0.6·c_race)(1 − 0.4·press)
//       (1 − 0.3·G)(1 − 0.5·c_sleep)(1 − 0.3·burst): racing words, pressured
//       long entries, true-size G, "no sleep" words, and 4+ entries in an hour
// Activation α = 1 − (1 − Y)(1 − Mn)(1 − 0.5·U); limit ℓ(C) = ℓ0(1 − κC), ℓ0 = 0.45,
// κ = 0.5 (the limit tightens as conflict rises). Error E = α − ℓ(C).
// PI controller with leak and anti-windup:
//   I_k = clip_[−1,1](λ_I·I_{k−1} + E_k), but no growth when u is saturated at 1 and E > 0
//   u_k = clip_[0,1](Kp·E_k + Ki·I_k),  Kp = 1.2, Ki = 0.4, λ_I = 0.8
// Graded output: u < 0.15 keep writing; < 0.4 a slow-down pause; < 0.7 breathe or
// ground (STOP); otherwise step away for a while and come back.
// Stability (honest scope): u ∈ [0, 1] and I ∈ [−1, 1] always (bounded-input,
// bounded-output by the clips). The leak makes the integrator a contraction in its
// own state, |I_k − I'_k| ≤ 0.8·|I_{k−1} − I'_{k−1}| for the same errors, so old error
// is forgotten geometrically and two histories converge. With constant E the
// integrator settles at clip(E/(1 − λ_I)). The governor never feeds back into e, so
// master's contraction (q), the anchor chain (q_A) and the resistance bound (q_ρ) are
// untouched. The loop through a person (how they respond to a suggestion) is not
// modeled, and no claim is made about it.
// Safety line: if racing words or short sleep appear on 3 or more different days in
// the saved governor history (this device only), a gentle line suggests talking with
// a doctor. That is context, not a diagnosis (DSM-5 hypomania criteria are only the
// reason such a line exists; APA, 2013).
// Sources: Gross (1998) process model of emotion regulation (pausing early, before
// a response builds); Linehan (2015) DBT distress tolerance (STOP); Åström & Murray
// (2008) Feedback Systems (PI control, anti-windup); APA (2013) DSM-5, context only.

(function (MF) {
  "use strict";
  const KP = 1.2, KI = 0.4, LEAK = 0.8, L0 = 0.45, KAPPA = 0.5, I_MAX = 1, DAYS_DOCTOR = 3, HIST_MAX = 60;
  const cue = k => 1 - Math.exp(-0.7 * k);
  const clip = (x, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
  const hits = (re, t) => ((t || "").toLowerCase().match(re) || []).length;
  const NUMB = /\b(numb|feel nothing|can'?t feel anything|nothing feels real|on autopilot|spaced out|detached|empty inside|don'?t know what i feel)\b/g;
  const IRRIT = /\b(irritated|annoyed|fed up|sick of|on edge|snapping at)\b/g;
  const RACE = /\b(racing thoughts|mind is racing|thoughts are racing|can'?t slow down|so many ideas|wired|unstoppable|talking so fast)\b/g;
  const SLEEP = /\b(no sleep|didn'?t sleep|haven'?t slept|don'?t need sleep|up all night|barely slept|slept \d+ hours?)\b/g;
  const GRADES = [
    { max: 0.15, id: "write", words: "Keep writing. Say it as fully as you need." },
    { max: 0.4, id: "pause", words: "A slow-down pause: finish this thought, then take one slow breath before the next." },
    { max: 0.7, id: "ground", words: "Breathe and ground: Stop, Take a step back, Observe, then Proceed mindfully. Your words can wait a moment." },
    { max: 1.01, id: "away", words: "It may help to step away for a while, and come back to this later. Nothing you wrote is lost." },
  ];
  const DOCTOR = "Racing thoughts or short sleep have come up on several days. It could help to talk with a doctor about it. This is not a diagnosis.";

  /** Flat repetition from the words (0 below 12 words). */
  function repetition(text) {
    const w = (text || "").toLowerCase().match(/[a-z']+/g) || [];
    if (w.length < 12) return 0;
    return clip(2 * Math.max(0, 0.5 - new Set(w).size / w.length));
  }
  /** Pressured writing: very long entries with little pause (few sentence breaks) or many "!". */
  function pressure(text) {
    const t = text || "", n = (t.match(/\S+/g) || []).length;
    if (n < 80) return 0;
    const breaks = (t.match(/[.?;]/g) || []).length, bangs = (t.match(/!/g) || []).length;
    return clip((n / Math.max(1, breaks) - 20) / 40 + bangs / 10);
  }
  /**
   * The signals for one entry. m = master output; prev = {anger, t} of the last entry; hist = saved history.
   */
  function signals(text, m, prev, hist, now) {
    const e = m.e, anger = e[2];
    const A = m.kai && Number.isFinite(m.kai.A) ? m.kai.A : 0;
    const C = (m.peace && m.peace.Cmax) || 0, G = Math.max((m.grand && m.grand.g) || 0, (m.small && m.small.u) || 0);
    const c = { numb: cue(hits(NUMB, text)), irrit: cue(hits(IRRIT, text)), race: cue(hits(RACE, text)), sleep: cue(hits(SLEEP, text)) };
    const rep = repetition(text), press = pressure(text);
    const dtH = prev && prev.t ? Math.max(0.25, (now - prev.t) / 3.6e6) : null;
    const rate = dtH ? (anger - prev.anger) / dtH : 0;
    const burst = cue(Math.max(0, (hist || []).filter(h => now - h.t < 3.6e6).length - 3));
    const U = 1 - (1 - 0.6 * c.numb) * (1 - 0.4 * rep) * (1 - 0.2 * (1 - A));
    const Y = 1 - (1 - clip(2 * Math.max(0, rate * 0.25))) * (1 - 0.5 * c.irrit);
    const Mn = 1 - (1 - 0.6 * c.race) * (1 - 0.4 * press) * (1 - 0.3 * G) * (1 - 0.5 * c.sleep) * (1 - 0.3 * burst);
    return { C, U, Y, Mn, A, G, rep, press, burst, rate, cues: c };
  }
  const limit = C => L0 * (1 - KAPPA * clip(C));
  const activation = s => 1 - (1 - s.Y) * (1 - s.Mn) * (1 - 0.5 * s.U);
  /** One controller step: {I} → {I, u, E, grade}. */
  function control(s, I0 = 0) {
    const E = activation(s) - limit(s.C);
    let I = clip(LEAK * I0 + E, -I_MAX, I_MAX);
    const u0 = KP * E + KI * I;
    if (u0 >= 1 && E > 0) I = Math.min(I, I0); // anti-windup: the integrator does not grow while u is saturated
    const u = clip(KP * E + KI * I);
    return { E, I, u, alpha: activation(s), lim: limit(s.C), grade: GRADES.find(g => u < g.max) };
  }
  /** Distinct days in the history with racing words or short sleep. */
  const activeDays = hist => new Set((hist || []).filter(h => h.race > 0 || h.sleep > 0).map(h => h.day)).size;
  /** Full pass for one entry: signals, control, the new history row and the words. */
  function govern(text, m, mem, now) {
    if (!m || m.crisis || !m.e) return null;
    const hist = (mem && mem.hist) || [], last = hist[hist.length - 1];
    const s = signals(text, m, last ? { anger: last.anger, t: last.t } : null, hist, now);
    const c = control(s, (mem && mem.I) || 0);
    const day = new Date(now).toISOString().slice(0, 10);
    const row = { t: now, day, anger: m.e[2], race: s.cues.race > 0 ? 1 : 0, sleep: s.cues.sleep > 0 ? 1 : 0 };
    const nh = hist.concat([row]).slice(-HIST_MAX);
    const doctor = activeDays(nh) >= DAYS_DOCTOR;
    const words = [c.grade.words];
    if (s.U >= 0.5) words.push("It sounds hard to feel much right now. That's okay; noticing it is a first step.");
    if (s.Y >= 0.4) words.push("Irritation seems to be rising. A pause now can keep it from growing.");
    if (s.Mn >= 0.4) words.push("Your thoughts may be moving fast. Slowing the pace can help them settle.");
    if (doctor) words.push(DOCTOR);
    const math = [
      `C ${s.C.toFixed(2)}, U ${s.U.toFixed(2)}, Y ${s.Y.toFixed(2)}, Mn ${s.Mn.toFixed(2)} (race ${s.cues.race.toFixed(2)}, sleep ${s.cues.sleep.toFixed(2)}, press ${s.press.toFixed(2)}, burst ${s.burst.toFixed(2)}, G ${s.G.toFixed(2)})`,
      `α = 1 − (1 − Y)(1 − Mn)(1 − ½U) = ${c.alpha.toFixed(2)};  ℓ(C) = ${L0}(1 − ${KAPPA}C) = ${c.lim.toFixed(2)};  E = ${c.E.toFixed(2)}`,
      `I = clip(${LEAK}·I₋ + E) = ${c.I.toFixed(2)};  u = clip(${KP}E + ${KI}I) = ${c.u.toFixed(2)} → ${c.grade.id}`,
      `Days with racing or short sleep: ${activeDays(nh)} (line at ${DAYS_DOCTOR})`,
    ];
    return { s, c, words, math, doctor, mem: { I: c.I, hist: nh } };
  }

  const KEY = "mindframe-governor";
  /** Browser: the governor lines in the Anchor view. History stays on this device. */
  function mount(app) {
    const $ = id => document.getElementById(id);
    const store = (() => { try { return window.localStorage; } catch (e) { return null; } })();
    let mem = null; try { mem = JSON.parse((store && store.getItem(KEY)) || "null"); } catch (e) { mem = null; }
    let seen = null, out = null;
    app.gov = () => out;
    $("gv-math").addEventListener("click", () => { const box = $("gv-math-box"), open = box.classList.toggle("hidden") === false; $("gv-math").setAttribute("aria-expanded", String(open)); $("gv-math").textContent = open ? "Hide the math" : "Show the math"; });
    const fill = (id, list) => { const el = $(id); el.innerHTML = ""; list.forEach(t => { const p = document.createElement("p"); p.textContent = t; el.appendChild(p); }); };
    return function render() {
      const m = app.inCrisis() ? null : app.m();
      if (m && m !== seen && m.e) { seen = m; out = govern($("input").value, m, mem, Date.now()); if (out) { mem = out.mem; if (store) store.setItem(KEY, JSON.stringify(mem)); } }
      if (!m) out = null;
      fill("gv-words", out ? out.words : []);
      fill("gv-math-lines", out ? out.math.concat([`Kp ${KP}, Ki ${KI}, leak ${LEAK}, ℓ0 ${L0}, κ ${KAPPA}`]) : []);
      $("gv").classList.toggle("hidden", !out);
    };
  }

  MF.Governor = { KP, KI, LEAK, L0, KAPPA, I_MAX, DAYS_DOCTOR, GRADES, DOCTOR, repetition, pressure, signals, limit, activation, control, activeDays, govern, KEY, mount };
})(typeof window !== "undefined" ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
if (typeof module !== "undefined") module.exports = global.MF.Governor;
