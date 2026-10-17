// features/writer/writer.js — Fern the Fox, the Writer.
//
// Keeps your journal and writes gentle stories:
//   • story(): a creature story driven by the master step, told in feeling
//     words ("the anger loosened its grip"), ending with an affirmation and a
//     question; Accept step moves you to master's next step
//   • game(): the choose-a-path game for the same moment
//   • journal: the only place your words are kept, and only when you tap Save
// Templates live next door in stories.js (story pieces) and games.js (the game).

if (typeof module !== "undefined") {
  require("../../core/words.js");
  require("./stories.js");
  require("./games.js");
  require("../historian.js");
}

(function (MF) {
  "use strict";
  const { HARD, PROCESS, idx, cap } = MF.Movers;
  const { SKILL, REFRAME, focus } = MF.Master;
  const { SOFTENER, affirmations } = MF.Words;
  const S = typeof Stories !== "undefined" ? Stories : require("./stories.js");
  const Gm = typeof Games !== "undefined" ? Games : require("./games.js");
  const G = typeof Grounding !== "undefined" ? Grounding : require("../../core/grounding.js");
  // ---------- Stories (driven by the master step) ----------
  const ARC_FOR = { shame: "labeling", sadness: "hopelessness", fear: "catastrophizing", anger: "catastrophizing", rumination: "allOrNothing", avoidance: "fortuneTelling" };
  const STEP_FOR = { calm: SKILL.calm.split(": ")[1].replace(/\.$/, "").toLowerCase(), connection: "send one short message to someone who is kind", hope: "pick one small thing for tomorrow and write it down" };
  const LOOSEN = {
    anger: ["the anger loosened its grip", "the anger loosened its grip a little"],
    shame: ["the shame grew quieter", "the shame grew a little quieter"],
    fear: ["the fear settled", "the fear settled a little"],
    sadness: ["the sadness grew lighter", "the sadness grew a little lighter"],
    rumination: ["the replaying slowed", "the replaying slowed a little"],
    avoidance: ["the urge to look away eased", "the urge to look away eased a little"],
    calm: ["their breath slowed", "their breath slowed a little"],
    connection: ["they felt less alone", "they felt a little less alone"],
    hope: ["hope came back", "a little hope came back"],
  };
  /** Which mover the story is about: the strongest one, else the biggest grounding gap. */
  function storyFocus(state, m) { return focus({ e: m.e, home: state.home }).name || m.top || "calm"; }
  /** A creature story driven by the master step, in feeling words, ending with an affirmation and a question. */
  function story(state, m, opts = {}) {
    if (!m || m.crisis || m.d < 0.005) return null;
    const top = storyFocus(state, m);
    const i = idx[top];
    const arc = HARD.concat(PROCESS).includes(top) ? ARC_FOR[top] : "none";
    const stab = m.stabilizer;
    const guide = stab === "connection" ? "Tidelyn" : stab === "calm" ? "Mistfawn" : stab === "hope" ? "Hivewright" : S.PATTERN_CREATURE[arc] || S.PATTERN_CREATURE.none;
    // The opening follows the mover; the text's own pattern is used only when it fits that mover.
    const read = { patterns: (m.read && m.read.patterns) || [], reframes: [REFRAME[top] || REFRAME.none] };
    const base = S.tell({ read, mover: top, character: guide, step: STEP_FOR[stab] || STEP_FOR.calm, seed: opts.seed || 1, faith: !!opts.faith });
    if (base.crisis) return null;
    const from = m.e[i], to = m.next[i];
    const moved = Math.abs(from - state.home[i]) - Math.abs(to - state.home[i]);
    const helper = stab && stab !== top ? `They knew ${SOFTENER[stab]} could soften it, so the plan stayed small and real.` : "The plan stayed small and real.";
    const loosen = `${cap(LOOSEN[top][moved >= 0.15 ? 0 : 1])}. Not all the way. Just closer.`;
    const aff = affirmations(m, { seed: opts.seed || 1 })[0];
    const keep = `They kept one sentence close: \u201C${aff}\u201D`;
    const b = base.sentences;
    const sentences = [b[0], helper, ...b.slice(1, -1), loosen, keep, b[b.length - 1]];
    return { guide, tag: base.tag, focus: top, arc, opening: base.opening, openingFrom: base.openingFrom, from, to, affirmation: aff, text: sentences.join(" "), next: m.next };
  }
  // The path game for this moment: the same master output picks scene 1 and the closing affirmation.
  /** The choose-a-path game for this moment (scene one follows the mover; it ends with an affirmation). */
  function game(state, m, opts = {}) {
    if (!m || m.crisis) return { crisis: true };
    const top = storyFocus(state, m);
    const arc = HARD.concat(PROCESS).includes(top) ? ARC_FOR[top] : "none";
    return Gm.make({
      type: "path", thought: opts.thought || Gm.SAMPLES[arc] || Gm.SAMPLES.none, read: m.read || undefined, mover: top,
      reframe: REFRAME[top] || REFRAME.none, faith: !!opts.faith, seed: opts.seed || 1,
      affirmation: affirmations(m, { seed: opts.seed || 1 })[0],
    });
  }


  // ---------- Journal (explicit saves only) ----------
  const JOURNAL_KEY = "mindframe-journal";
  /** Read the journal from storage (an array of {text, date}). */
  function journalLoad(store) { try { return JSON.parse(store.getItem(JOURNAL_KEY) || "[]"); } catch (e) { return []; } }
  /** Add one entry. Returns false and saves nothing when the text is empty or reads as a crisis. */
  function journalAdd(store, text, now = Date.now()) {
    const t = String(text || "").trim();
    if (!t || G.isCrisis(t)) return false;
    store.setItem(JOURNAL_KEY, JSON.stringify(journalLoad(store).concat({ text: t, date: now })));
    return true;
  }
  /** Remove every journal entry. */
  function journalClear(store) { store.setItem(JOURNAL_KEY, "[]"); }

  // ---------- Panel (browser only) ----------
  /**
   * Mount the Writer panel: Write a story (with Accept step and the path game)
   * and the journal (saved only when you tap Save to journal).
   * @param {object} app the app shell (see js/app.js)
   * @returns {function} render
   */
  /** Mount this feature's panel. */
  function mount(app) {
    const { $, li } = app;
    let current = null, play = null, seed = 1;
    const hide = () => { current = null; play = null; $("story").classList.add("hidden"); $("game").classList.add("hidden"); };
    app.onReset(hide);
    function tell() {
      if (!app.update()) return;
      current = story(app.state, app.m(), { seed, faith: app.faith() });
      if (!current) { hide(); app.note("You're close to steady; there's no story to tell right now."); return; }
      $("story-tag").textContent = "Guide: " + current.tag;
      $("story-text").textContent = current.text;
      $("story").classList.remove("hidden");
      $("game").classList.add("hidden");
      play = null;
    }
    $("story-go").addEventListener("click", () => { seed = 1; tell(); });
    $("story-again").addEventListener("click", () => { seed += 1; tell(); });
    $("accept").addEventListener("click", () => {
      if (!current) return;
      app.state = MF.Historian.acceptStep(app.state);
      app.resetBase("");
      hide();
      app.update();
      app.note("Step accepted and saved as a checkpoint. The next reading starts from here.");
    });
    $("play").addEventListener("click", () => {
      if (!current) return;
      const g = game(app.state, app.m(), { thought: $("input").value.trim(), faith: app.faith(), seed });
      if (g.crisis) { app.crisis(true); return; }
      play = { g, i: 0 };
      $("game").classList.remove("hidden");
      scene();
    });
    function scene() {
      const { g, i } = play, box = $("game-choices");
      box.innerHTML = "";
      $("game-feedback").textContent = "";
      $("game-next").classList.add("hidden");
      if (i >= g.scenes.length) {
        $("game-count").textContent = "";
        $("game-title").textContent = "You found the real path";
        $("game-text").textContent = g.ending.join(" ");
        $("game-prompt").textContent = "";
        return;
      }
      const sc = g.scenes[i];
      $("game-count").textContent = `Scene ${["one", "two", "three", "four"][i] || ""} of four`;
      $("game-title").textContent = sc.title;
      $("game-text").textContent = sc.text;
      $("game-prompt").textContent = sc.prompt;
      sc.choices.forEach(ch => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "choice";
        b.textContent = ch.text;
        b.addEventListener("click", () => {
          $("game-feedback").textContent = ch.feedback;
          if (ch.grounded) {
            b.classList.add("chosen");
            box.querySelectorAll("button").forEach(x => { x.disabled = true; });
            $("game-next").textContent = i === g.scenes.length - 1 ? "Finish" : "Next";
            $("game-next").classList.remove("hidden");
          } else { b.classList.add("tried"); b.disabled = true; }
        });
        box.appendChild(b);
      });
    }
    $("game-next").addEventListener("click", () => { if (play) { play.i += 1; scene(); } });
    $("journal-save").addEventListener("click", () => {
      const text = $("input").value.trim();
      if (G.isCrisis(text)) { app.crisis(true); return; }
      if (!journalAdd(localStorage, text)) { app.note("Write something above to save it in your journal."); return; }
      render();
      app.note("Saved in your journal on this device.");
    });
    $("journal-clear").addEventListener("click", () => {
      if (!confirm("Clear every journal entry on this device?")) return;
      journalClear(localStorage);
      render();
    });
    function render() {
      const items = journalLoad(localStorage).slice().reverse(), ul = $("journal-list");
      ul.innerHTML = "";
      if (!items.length) ul.appendChild(li("Nothing kept yet."));
      items.forEach(x => {
        const el = document.createElement("li");
        const t = document.createElement("time");
        t.textContent = new Date(x.date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
        const p = document.createElement("p");
        p.textContent = x.text;
        el.append(t, p);
        ul.appendChild(el);
      });
      $("journal-clear").classList.toggle("hidden", !items.length);
    }
    return render;
  }

  MF.Writer = { story, game, storyFocus, journalLoad, journalAdd, journalClear, JOURNAL_KEY, mount };
})(typeof window !== "undefined" ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
if (typeof module !== "undefined") module.exports = global.MF.Writer;
