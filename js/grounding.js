// grounding.js — the Grounding Loop guide.
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

const Grounding = (function () {
  const analyzeFn = typeof analyze === "function" ? analyze : require("./analyzer.js").analyze;

  const ETA = 0.2;
  const START_G = 0.5;
  const LOW_G = 0.3;
  const LOW_DAYS = 3;

  function clamp01(x) {
    if (!Number.isFinite(x)) return 0;
    return Math.min(1, Math.max(0, x));
  }

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
    meaning: "Hidden-meaning story",
    fortuneTelling: "Predicting the future",
    mindReading: "Mind reading",
    allOrNothing: "Absolute words",
    labeling: "A harsh label",
    catastrophizing: "Expecting the worst",
    hopelessness: "Hopeless tone",
  };

  // Order matters: the first match picks the test question.
  const PRIORITY = ["meaning", "fortuneTelling", "mindReading", "allOrNothing", "labeling", "catastrophizing", "hopelessness"];

  const QUESTIONS = {
    meaning: "What actually happened that you could show someone? What meaning did the thought add on top?",
    fortuneTelling: "Do you know how this ends, or is the thought predicting? What is one other way it could go?",
    mindReading: "What did they actually say or do? What else might they be thinking?",
    allOrNothing: "Is it really {word}? Can you remember one time it went differently?",
    labeling: "Would you call a friend that for the same thing? What did you do, rather than what are you?",
    catastrophizing: "If it went badly, what would you do next? What is the most likely outcome, not the worst?",
    hopelessness: "What is one thing, even small, that is still in your hands today?",
    none: "What can you actually see, hear, or check right now?",
  };

  const REFRAMES = {
    meaning: [
      "Something hard happened, and that is real. The hidden meaning is a story the thought added, not something I can see.",
      "I am not being punished. I am going through something hard, and I am not alone in it.",
      "God's love isn't measured by how today went. I can still do one good thing.",
    ],
    fortuneTelling: ["I don't know how this will turn out yet. I can prepare for the next small step."],
    mindReading: ["I don't know what they think. I can ask, or I can let it be."],
    allOrNothing: ["Sometimes this happens, but not every time. There have been days it went differently."],
    labeling: ["I made a mistake. That is something I did, not who I am."],
    catastrophizing: ["This is hard, and it is probably not the worst case. I have handled hard things before."],
    hopelessness: ["Today feels heavy. Heavy is not the same as hopeless, and one small step still counts."],
    none: [
      "This is a thought, not a fact. One real thing I can do now is take a small step.",
      "I can notice this thought and still choose what I do next.",
    ],
  };

  const ACTIONS = {
    pray: "Pray for one minute: name the hard thing and ask for help with the next step",
    text: "Text a friend: \"Thinking of you. Got a minute?\"",
    walk: "Walk for five minutes and name three things you see",
    task: "Do one task that takes two minutes",
    ask: "Ask them one honest question",
    plan: "Write down the very next step, and nothing after it",
  };

  // A reframe that names the absolute word the person used and offers a truer size.
  const BIG_WORD = {
    never: "it hasn't happened yet, and today is not the end of the story",
    always: "it happens sometimes, and there have been times it didn't",
    nothing: "some things are hard right now, and some things are still okay",
    everything: "some things are hard right now, and some things are still okay",
    everyone: "some people may feel that way, and I don't know about the rest",
    everybody: "some people may feel that way, and I don't know about the rest",
    "no one": "it feels lonely right now, and that is not proof nobody cares",
    nobody: "it feels lonely right now, and that is not proof nobody cares",
    completely: "part of this is hard, not all of it",
    totally: "part of this is hard, not all of it",
  };

  function bigWordReframe(word) {
    const truer = BIG_WORD[word];
    if (!truer) return "";
    const cap = word[0].toUpperCase() + word.slice(1);
    return `"${cap}" is a big word. Truer: ${truer}.`;
  }

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

  function dayKey(ts) {
    const d = new Date(ts);
    const pad = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function currentG(state) {
    return state && state.log && state.log.length ? state.log[state.log.length - 1].G : START_G;
  }

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

  function needsCheckIn(state) {
    return lowStreak(state) >= LOW_DAYS;
  }

  return { ETA, START_G, LOW_G, LOW_DAYS, clamp01, updateG, read, isCrisis, bigWordReframe, dayKey, currentG, record, daily, last7, lowStreak, needsCheckIn };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Grounding;
