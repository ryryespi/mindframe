// core/grounding.js — the Grounding Loop guide.
//
// A small rule-based guide, not a trained model. It reads the thought you
// type, looks for "mirage" wording, and walks you through four steps:
//   1 Name it    2 Test it    3 Reframe it    4 Act on it
//
// The update rule (approved for this app):
//   G_next = clamp01( G + eta * r * (1 + H - M) / 2 ),  eta = 0.2
//   G = how grounded you feel (0..1)
//   M = how strongly the mirage thought grips you (0..1)
//   H = how true and usable the reframe feels (0..1)
//   r = +1 acted on the real version, 0 unsure, -1 followed the mirage
//   (1 + H - M) / 2 is always between 0 and 1, so the direction always
//   follows r: +1 raises G, -1 lowers it, 0 leaves it. H and M set the size.
//
// Everything here runs on the phone. No network, no API.
// Wrapped in one object so no name collides with the other scripts.

if (typeof window === "undefined") { require("../data/strings.js"); require("./equations.js"); }
const Grounding = (function () {
  const Str = MF.Strings;   // every word lives in js/data/strings.js
  const P = MF.Params;   // every number: data/params.js
  const analyzeFn = typeof analyze === "function" ? analyze : require("./signals.js").analyze;

  const { ETA, START_G, LOW_G, LOW_DAYS } = P.grounding;

  /** Clamp a number to [0, 1]; anything not finite becomes 0. */
  function clamp01(x) {
    if (!Number.isFinite(x)) return 0;
    return Math.min(1, Math.max(0, x));
  }

  /** One grounding update: move G by eta in the direction of r, scaled by hope H and grip M. */
  function updateG(G, M, H, r, eta = ETA) {
    const step = r > 0 ? 1 : r < 0 ? -1 : 0;
    return clamp01(clamp01(G) + eta * step * (1 + clamp01(H) - clamp01(M)) / 2);
  }

  // ---------- Mirage markers ----------
  // "Hidden-meaning" language: a hard event read as a curse, fate, a sign,
  // or punishment. Kept to whole words so ordinary sentences don't trip it.
  const MEANING = [
    /\bcursed?\b/, /\bhex(ed)?\b/, /\bjinx(ed)?\b/, /\bdoomed\b/, /\bfated?\b/,
    /\b(it'?s|this is|that was) a sign\b/, /\bsign from\b/, /\bpunish(ed|ing|ment)?\b/,
    /\bkarma\b/, /\bthe universe (is|wants|hates)\b/, /\bgod (hates|is punishing|has abandoned|abandoned|forgot)\b/,
    /\bmeant to suffer\b/, /\bbad luck (follows|always)\b/, /\bspell on me\b/, /\bdemons?\b/,
  ];

  const LABELS = {
    meaning: Str.t("grounding.LABELS.meaning"),
    fortuneTelling: Str.t("grounding.LABELS.fortuneTelling"),
    mindReading: Str.t("grounding.LABELS.mindReading"),
    allOrNothing: Str.t("grounding.LABELS.allOrNothing"),
    labeling: Str.t("grounding.LABELS.labeling"),
    catastrophizing: Str.t("grounding.LABELS.catastrophizing"),
    hopelessness: Str.t("grounding.LABELS.hopelessness"),
  };

  // Order matters: the first match picks the test question.
  const PRIORITY = ["meaning", "fortuneTelling", "mindReading", "allOrNothing", "labeling", "catastrophizing", "hopelessness"];

  const QUESTIONS = {
    meaning: Str.t("grounding.QUESTIONS.meaning"),
    fortuneTelling: Str.t("grounding.QUESTIONS.fortuneTelling"),
    mindReading: Str.t("grounding.QUESTIONS.mindReading"),
    allOrNothing: Str.t("grounding.QUESTIONS.allOrNothing"),
    labeling: Str.t("grounding.QUESTIONS.labeling"),
    catastrophizing: Str.t("grounding.QUESTIONS.catastrophizing"),
    hopelessness: Str.t("grounding.QUESTIONS.hopelessness"),
    none: Str.t("grounding.QUESTIONS.none"),
  };

  const REFRAMES = {
    meaning: Str.list("grounding.REFRAMES.meaning"),
    fortuneTelling: Str.list("grounding.REFRAMES.fortuneTelling"),
    mindReading: Str.list("grounding.REFRAMES.mindReading"),
    allOrNothing: Str.list("grounding.REFRAMES.allOrNothing"),
    labeling: Str.list("grounding.REFRAMES.labeling"),
    catastrophizing: Str.list("grounding.REFRAMES.catastrophizing"),
    hopelessness: Str.list("grounding.REFRAMES.hopelessness"),
    none: Str.list("grounding.REFRAMES.none"),
  };

  const ACTIONS = {
    pray: Str.t("grounding.ACTIONS.pray"),
    text: Str.t("grounding.ACTIONS.text"),
    walk: Str.t("grounding.ACTIONS.walk"),
    task: Str.t("grounding.ACTIONS.task"),
    ask: Str.t("grounding.ACTIONS.ask"),
    plan: Str.t("grounding.ACTIONS.plan"),
  };

  // A reframe that names the absolute word the person used and offers a truer size.
  const BIG_WORD = {
    never: Str.t("grounding.BIG_WORD.never"),
    always: Str.t("grounding.BIG_WORD.always"),
    nothing: Str.t("grounding.BIG_WORD.nothing"),
    everything: Str.t("grounding.BIG_WORD.nothing"),
    everyone: Str.t("grounding.BIG_WORD.everyone"),
    everybody: Str.t("grounding.BIG_WORD.everyone"),
    "no one": Str.t("grounding.BIG_WORD.no_one"),
    nobody: Str.t("grounding.BIG_WORD.no_one"),
    completely: Str.t("grounding.BIG_WORD.completely"),
    totally: Str.t("grounding.BIG_WORD.completely"),
  };

  /** A gentler phrasing for an absolute word ("always", "never", …). */
  function bigWordReframe(word) {
    const truer = BIG_WORD[word];
    if (!truer) return "";
    const cap = word[0].toUpperCase() + word.slice(1);
    return Str.t("grounding.bigWordReframe.is_a_big_word_truer", { cap: cap, truer: truer });
  }

  /** Round to the nearest 0.05. */
  const round05 = x => Math.round(x * 20) / 20;

  // The guide's whole decision, in one place. Returns everything the screen needs.
  function read(text) {
    const trimmed = String(text || "").trim();
    const signals = analyzeFn(trimmed);
    if (signals.crisis) return { crisis: true };
    const t = trimmed.toLowerCase();
    const found = new Set();
    if (MEANING.some(re => re.test(t))) found.add("meaning");
    signals.distortions.forEach(id => { if (LABELS[id]) found.add(id); });
    if (signals.categories.includes("hopelessness")) found.add("hopelessness");
    const patterns = PRIORITY.filter(id => found.has(id));

    // Suggested M: a gentle starting point from the wording. The person moves it.
    let m = 0.3;
    patterns.forEach(id => { m += id === "meaning" ? 0.2 : 0.1; });
    m += 0.05 * Math.min(2, signals.absolutes.length);
    const suggestedM = round05(Math.min(0.9, Math.max(0.2, m)));

    const top = patterns[0] || "none";
    const word = signals.absolutes[0] || "always";
    const question = QUESTIONS[top].replace("{word}", word);

    const reframes = [];
    const add = s => { if (s && !reframes.includes(s) && reframes.length < 3) reframes.push(s); };
    if (signals.absolutes.length) add(bigWordReframe(signals.absolutes[0]));
    patterns.forEach(id => REFRAMES[id].forEach(add));
    REFRAMES.none.forEach(add);

    const actionIds = top === "meaning" ? ["pray", "text", "walk"]
      : top === "mindReading" ? ["ask", "text", "walk"]
      : top === "fortuneTelling" || top === "catastrophizing" ? ["plan", "walk", "pray"]
      : ["walk", "text", "task"];

    return {
      crisis: false,
      patterns,
      labels: patterns.map(id => LABELS[id]),
      suggestedM,
      question,
      reframes,
      actions: actionIds.map(id => ACTIONS[id]),
    };
  }

  // Any text typed later in the loop is checked too.
  function isCrisis(text) {
    return !!analyzeFn(String(text || "")).crisis;
  }

  // ---------- History (numbers only; the thought text is not stored) ----------

  /** Local calendar day for a timestamp, as YYYY-MM-DD. */
  function dayKey(ts) {
    const d = new Date(ts);
    const pad = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  /** The latest grounding value in the log, or the starting value. */
  function currentG(state) {
    return state && state.log && state.log.length ? state.log[state.log.length - 1].G : START_G;
  }

  /** Add one numbers-only entry to the log (the thought text is never stored). */
  function record(state, entry, ts = Date.now()) {
    const log = (state && state.log ? state.log : []).slice();
    log.push({ ts, day: dayKey(ts), ...entry });
    return { log };
  }

  // Last G of each day, oldest first.
  function daily(state) {
    const map = new Map();
    ((state && state.log) || []).forEach(e => map.set(e.day, e.G));
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([day, G]) => ({ day, G }));
  }

  // The seven calendar days ending today. Days with no loop are null.
  function last7(state, now = Date.now()) {
    const byDay = new Map(daily(state).map(d => [d.day, d.G]));
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setHours(12, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = dayKey(d.getTime());
      out.push({ day: key, G: byDay.has(key) ? byDay.get(key) : null });
    }
    return out;
  }

  // Consecutive calendar days, ending on the latest recorded day, with G below 0.3.
  function lowStreak(state) {
    const days = daily(state);
    let streak = 0;
    let prev = null;
    for (let i = days.length - 1; i >= 0; i--) {
      const { day, G } = days[i];
      if (G >= LOW_G) break;
      if (prev) {
        const gap = Math.round((Date.parse(prev + "T12:00:00") - Date.parse(day + "T12:00:00")) / 86400000);
        if (gap !== 1) break;
      }
      streak += 1;
      prev = day;
    }
    return streak;
  }

  /** True after LOW_DAYS low days in a row. */
  function needsCheckIn(state) {
    return lowStreak(state) >= LOW_DAYS;
  }

  return { ETA, START_G, LOW_G, LOW_DAYS, LABELS, clamp01, updateG, read, isCrisis, bigWordReframe, dayKey, currentG, record, daily, last7, lowStreak, needsCheckIn };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Grounding;
