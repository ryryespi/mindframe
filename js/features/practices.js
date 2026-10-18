// features/practices.js — patience and mindfulness practices (in "Forgive &
// breathe", the "Breathe & be patient" tab), and the rule that picks one as
// the card's One step from master's numbers.
//
//   • LIBRARY: ten short practices, each with a card instruction (dose words
//     from d), the guided steps for Grace's panel, an optional breath pattern
//     for the breathing circle, and its source.
//   • pick(m): the practice for the One step. n = the inner-peace lever (push15),
//     else master's mover:
//       rumination → labeling if another hard mover ≥ 0.3, else STOP
//       anger      → reappraise the wait if c_wait ≥ 0.3, else pause + longer exhale
//       fear       → reappraise the wait if c_wait ≥ 0.3, else the three-minute breathing space
//       avoidance  → urge surfing          shame → self-compassion break
//       sadness    → gratitude if hope ≥ 0.3, else none (the earlier small-action step)
//       calm       → reappraise the wait if c_wait ≥ 0.3, else five senses if d ≥ 0.5, else the short body scan
//       hope       → gratitude             connection → none (the earlier message step)
//   • A waiting/impatience word hook ("taking forever", "can't wait",
//     "impatient", "stuck in traffic"…): c_wait = 1 − e^(−0.7·k) for k cues,
//     passed to master as data.wait; nudges anger +0.2 and calm −0.2 only
//     (existing movers, no new ones).
//   • schedule(pattern, rounds): the breathing circle's timeline (inhale 4 s,
//     exhale 6 s by default: a longer exhale, six breaths a minute).
//
// Sources: Stahl & Goldstein (2010) MBSR workbook (STOP); Segal, Williams &
// Teasdale (2013) MBCT (three-minute breathing space); Kabat-Zinn (1990) Full
// Catastrophe Living (body scan); Lieberman et al. (2007) Psychol Sci
// 18(5):421–428 (affect labeling); Neff (2003) Self and Identity 2(2):85–101
// (self-compassion); Zaccaro et al. (2018) Front Hum Neurosci 12:353 (slow
// breathing); Gross (1998) Rev Gen Psychol 2(3):271–299 (reappraisal); Bowen &
// Marlatt (2009) Psychol Addict Behav 23(4):666–671 (urge surfing); Emmons &
// McCullough (2003) J Pers Soc Psychol 84(2):377–389 (gratitude); Schnitker
// (2012) J Posit Psychol 7(4):263–280 (patience as a trainable strength).
// The 5-4-3-2-1 senses exercise is a common grounding exercise with no single
// primary source. Practice aids, not treatment.

if (typeof module !== "undefined") {
  require("../core/movers.js");
  require("../core/master.js");
  require("./relationship.js");
}

(function (MF) {
  "use strict";
  const { idx, ACTIVE } = MF.Movers;
  const REL = MF.Relationship;

  /** Two slow breaths patterns: the default longer exhale, and an even one. */
  const BREATH = { exhale: { inhale: 4, hold: 0, exhale: 6 } };

  /**
   * The library. say(x) is the card instruction, x = dose words {min, times}
   * ("two"/"five"/"ten" minutes, "three"/"four"/"five" times). steps are for
   * Grace's panel. kind: "mindfulness" or "patience".
   */
  const LIBRARY = {
    stop: {
      name: "STOP", kind: "mindfulness", breath: BREATH.exhale, source: "Stahl & Goldstein, 2010 (MBSR)",
      say: x => `STOP: stop what you're doing, take ${x.times} slow breaths, observe what's here in your body and mind, then proceed with one kind next action`,
      steps: ["Stop: pause whatever you're doing.", "Take a breath: one or a few slow breaths, a little longer out than in.", "Observe: notice your body, your feelings and your thoughts, without fixing anything.", "Proceed: choose one kind, useful next action."],
    },
    space: {
      name: "Three-minute breathing space", kind: "mindfulness", breath: BREATH.exhale, source: "Segal, Williams & Teasdale, 2013 (MBCT)",
      say: x => `Three-minute breathing space: notice what's here, gather your attention on ${x.times} slow breaths, then widen it to your whole body`,
      steps: ["About a minute: notice what's here right now: thoughts, feelings, body sensations.", "About a minute: gather your attention on the breath in your belly.", "About a minute: widen your attention to your whole body, breathing with it as it is."],
    },
    senses: {
      name: "5-4-3-2-1 senses", kind: "mindfulness", breath: null, source: "a common grounding exercise (no single primary source)",
      say: () => "Five senses: name five things you can see, four you can touch, three you can hear, two you can smell and one you can taste",
      steps: ["Name five things you can see.", "Four things you can touch.", "Three things you can hear.", "Two things you can smell.", "One thing you can taste, or one kind thing about this moment."],
    },
    body: {
      name: "Short body scan", kind: "mindfulness", breath: null, source: "Kabat-Zinn, 1990",
      say: x => `Short body scan: for ${x.min} minutes, move your attention slowly from your feet to your head, noticing without changing anything`,
      steps: ["Sit or lie comfortably and let your breath be as it is.", "Bring your attention to your feet, then slowly up through legs, belly, chest, hands, shoulders, face.", "Where there's tension, just notice it; breathe into it if you like.", "Finish with a sense of the whole body breathing."],
    },
    label: {
      name: "Name it to tame it", kind: "mindfulness", breath: BREATH.exhale, source: "affect labeling: Lieberman et al., 2007",
      say: x => `Name it to tame it: put the feeling into one or two words, like \u201Cthis is worry\u201D, then breathe out slowly ${x.times} times`,
      steps: ["Notice the strongest feeling right now.", "Name it in one or two plain words: \u201Cthis is worry\u201D, \u201Cthis is hurt\u201D.", "Let a thought be a thought: \u201CI'm having the thought that\u2026\u201D", "Breathe out slowly and come back to what's in front of you."],
    },
    kindness: {
      name: "Self-compassion break", kind: "mindfulness", breath: null, source: "Neff, 2003",
      say: () => "Self-compassion break: with a hand on your heart, say \u201Cthis is hard\u201D, \u201Cothers feel this too\u201D, and \u201Cmay I be kind to myself\u201D, then tell one safe person",
      steps: ["Mindfulness: \u201CThis is a moment of suffering.\u201D", "Common humanity: \u201CEveryone struggles and makes mistakes; I'm not alone.\u201D", "Self-kindness: hand on your heart, \u201CMay I be kind to myself.\u201D"],
    },
    pause: {
      name: "Pause and breathe", kind: "patience", breath: BREATH.exhale, source: "slow breathing: Zaccaro et al., 2018",
      say: x => `Pause: step away for ${x.min} minutes and breathe out longer than in, ${x.times} times, then name what matters to you here`,
      steps: ["Step back from the moment if you can, even a few feet.", "Breathe in for about four, out for about six.", "Let the urge to act right now pass a little.", "Name what matters to you here, then choose your response."],
    },
    waiting: {
      name: "Reframe the wait", kind: "patience", breath: BREATH.exhale, source: "reappraisal: Gross, 1998; patience: Schnitker, 2012",
      say: x => `Reframe the wait: breathe out slowly ${x.times} times, then name one thing this wait gives you room for`,
      steps: ["Notice the impatience in your body, without judging it.", "Breathe out slowly a few times.", "Look at the wait another way: what does it give you room for, or what is it protecting?", "Choose one small thing to do with this time."],
    },
    surf: {
      name: "Urge surfing", kind: "patience", breath: BREATH.exhale, source: "Bowen & Marlatt, 2009",
      say: x => `Urge surfing: notice the pull to put it off as a wave, breathe with it as it rises, peaks and falls, then do ${x.min} minutes of the thing you've been putting off`,
      steps: ["Notice the urge and where you feel it in your body.", "Picture it as a wave: it rises, peaks, and falls on its own.", "Breathe with it and ride it without acting on it.", "When it passes a little, take the smallest first step."],
    },
    gratitude: {
      name: "Gratitude for what's here", kind: "patience", breath: null, source: "Emmons & McCullough, 2003",
      say: x => `Gratitude for what's here: name ${x.times} things that are already okay right now; small ones count`,
      steps: ["Look around: what is already here that you're glad of?", "Name three small things, as specific as you can.", "Stay with one of them for a breath or two."],
    },
  };
  const ORDER = ["stop", "space", "senses", "body", "label", "kindness", "pause", "waiting", "surf", "gratitude"];

  // ---------- Patience cue hook (waiting / impatience) ----------
  const WAIT = [/\bwaiting (so long|forever|for hours|all day)\b/, /\btaking (so long|forever|ages)\b/, /\b(can'?t|cannot) wait\b/, /\bimpatien(t|ce)\b/, /\b(stuck|sitting) in traffic\b/, /\bin a hurry\b/, /\bhurry up\b/, /\b(so|too) slow\b/, /\bwhy is (it|this|everything) taking\b/, /\bstill waiting\b/];
  /** Distinct waiting cues in the text (negation-aware). */
  function waitCues(text) {
    const t = REL.clean(text);
    if (!t.trim()) return 0;
    return WAIT.filter(re => { const g = new RegExp(re.source, "g"); let m; while ((m = g.exec(t))) if (!REL.negated(t, m.index)) return true; return false; }).length;
  }
  /** c = 1 − e^(−0.7·k), two decimals. */
  const cueStrength = k => Math.round((1 - Math.exp(-0.7 * k)) * 100) / 100;
  /** Word hook: impatience nudges anger +0.2 and calm −0.2; c_wait passes to master as data.wait. */
  function hook(text) {
    const k = waitCues(text);
    if (!k) return null;
    return { add: { anger: 0.2 }, neg: { calm: 0.2 }, notes: ["impatience wording"], data: { wait: cueStrength(k) } };
  }
  MF.Movers.addWordHook(hook);

  // ---------- The pick rule ----------
  /**
   * The practice for the One step, from master's numbers (see the header).
   * @param {object} m master output
   * @returns {{id:string, mover:string}|null} null keeps the earlier step for that mover
   */
  function pick(m) {
    if (!m || m.crisis) return null;
    const n = (m.peace && m.peace.lever && m.peace.lever.name) || m.mover;
    if (!n) return null;
    const e = name => m.e[idx[name]];
    const wait = (m.wait || 0) >= 0.3;
    const id = {
      rumination: ["fear", "sadness", "anger", "shame"].some(x => e(x) >= ACTIVE) ? "label" : "stop",
      anger: wait ? "waiting" : "pause",
      fear: wait ? "waiting" : "space",
      avoidance: "surf",
      sadness: e("hope") >= 0.3 ? "gratitude" : null,
      shame: "kindness",
      calm: wait ? "waiting" : m.d >= 0.5 ? "senses" : "body",
      hope: "gratitude",
      connection: null,
    }[n];
    return id ? { id, mover: n } : null;
  }

  /**
   * The breathing circle's timeline.
   * @param {{inhale:number, hold:number, exhale:number}} [p] seconds
   * @param {number} [rounds=5]
   * @returns {Array<{phase:"in"|"hold"|"out", ms:number}>}
   */
  function schedule(p = BREATH.exhale, rounds = 5) {
    const out = [];
    for (let r = 0; r < rounds; r++) {
      out.push({ phase: "in", ms: p.inhale * 1000 });
      if (p.hold) out.push({ phase: "hold", ms: p.hold * 1000 });
      out.push({ phase: "out", ms: p.exhale * 1000 });
    }
    return out;
  }
  /** Rounds for the circle from the dose words ("three" → 3 …), default five. */
  const ROUNDS = { three: 3, four: 4, five: 5 };

  /** Master pass: keep c_wait on the reading and pick the One step's practice (after the lever exists). */
  function pass(out, ctx) {
    out.wait = ctx.data.wait || 0;
    out.practice = ctx.sim ? pick(out) : null;
  }
  MF.Master.addPass(pass);

  // ---------- Grace's "Breathe & be patient" tab (browser only) ----------
  const FAITH = { mindfulness: "Be still, and know that I am God (from the Psalms).", patience: "Love is patient, love is kind (from 1 Corinthians)." };
  const PHASE = { in: "Breathe in\u2026", hold: "Hold gently\u2026", out: "Breathe out, slowly\u2026" };
  /**
   * Mount the practice library and the breathing circle in Grace's panel.
   * @param {object} app the app shell (see js/app.js)
   * @returns {function} render
   */
  function mount(app) {
    const { $ } = app;
    let chosen = null, timer = null, picked = false, seen = null;
    /** Build one chip per practice, grouped by kind. */
    const chips = kind => ORDER.filter(id => LIBRARY[id].kind === kind).forEach(id => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.dataset.id = id; b.textContent = LIBRARY[id].name;
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", () => { picked = true; select(id); });
      $(kind === "mindfulness" ? "practice-mind" : "practice-patience").appendChild(b);
    });
    chips("mindfulness"); chips("patience");

    /** Show one practice's steps, source and (with faith on) its verse. */
    function select(id) {
      if (!LIBRARY[id]) id = "pause";
      chosen = id;
      const P = LIBRARY[id];
      document.querySelectorAll("#grace-practice .chip").forEach(b => b.setAttribute("aria-pressed", b.dataset.id === id ? "true" : "false"));
      $("practice-name").textContent = P.name;
      const ol = $("practice-steps"); ol.innerHTML = "";
      P.steps.forEach(t => ol.appendChild(app.li(t)));
      $("practice-source").textContent = `Source: ${P.source}.`;
      $("practice-faith").textContent = FAITH[P.kind];
      $("practice-faith").classList.toggle("hidden", !app.faith());
    }
    app.practices = { select: id => { picked = true; select(id); } };

    /** Stop the circle and reset its words. */
    function stop(msg) {
      if (timer) clearTimeout(timer);
      timer = null;
      $("breath-circle").className = "breath-circle";
      $("breath-phase").textContent = msg || "Ready when you are: in for four, out for six.";
      $("breath-count").textContent = "";
      $("breath-go").textContent = "Start the breathing circle";
    }
    /** Run the schedule: each phase sets the circle's class and transition time. */
    function start() {
      const m = app.m();
      // Rounds follow the dose words (three, four or five breaths by d), five before any reading.
      const rounds = m && !m.crisis ? ROUNDS[m.d >= 1 ? "five" : m.d >= 0.5 ? "four" : "three"] : 5;
      const plan = schedule((chosen && LIBRARY[chosen].breath) || BREATH.exhale, rounds);
      let k = 0;
      $("breath-go").textContent = "Stop";
      const tick = () => {
        if (k >= plan.length) { stop("Done. Notice how you feel now."); app.care("practice"); return; }
        const s = plan[k], c = $("breath-circle");
        c.style.setProperty("--dur", `${s.ms}ms`);
        c.className = `breath-circle ${s.phase}`;
        $("breath-phase").textContent = PHASE[s.phase];
        $("breath-count").textContent = `Breath ${Math.floor(k / (plan.length / rounds)) + 1} of ${rounds}`;
        k += 1;
        timer = setTimeout(tick, s.ms);
      };
      tick();
    }
    $("breath-go").addEventListener("click", () => (timer ? stop() : start()));
    app.onCrisis(() => stop());
    app.onReset(() => stop());
    app.onPanelClose(() => stop());

    return function render() {
      const m = app.m(), pk = m ? m.practice : null;
      $("practice-suggest").textContent = pk ? `Suggested now: ${LIBRARY[pk.id].name}, from your reading.` : "Pick any practice. After Update, one is suggested from your reading.";
      // A new reading brings its suggestion forward; otherwise keep what was picked.
      if (m !== seen) { seen = m; picked = false; }
      select(picked && chosen ? chosen : pk ? pk.id : chosen || "pause");
    };
  }

  MF.Practices = { LIBRARY, ORDER, BREATH, WAIT, waitCues, cueStrength, hook, pass, pick, schedule, ROUNDS, FAITH, mount };
})(typeof window !== "undefined" ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
if (typeof module !== "undefined") module.exports = global.MF.Practices;
