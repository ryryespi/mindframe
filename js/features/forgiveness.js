// features/forgiveness.js — "Forgive & breathe" (was Grace the Dove): forgiving yourself and forgiving
// someone, hooked into the master function with no new movers.
//
// 1. Word hook (in fromText, before master steps). Cues, negation-aware:
//      self   self-blame ("my fault", "I blame myself", "I can't forgive myself",
//             "I messed up", "I should have", "I let them down", "I regret"…)
//      other  resentment toward someone ("I can't forgive him", "resent",
//             "grudge", "she betrayed me", "how could they", "bitter"…)
//    c = 1 − e^(−0.7·k) for k distinct cues (one 0.50, two 0.75).
//    Nudges onto existing movers only: self → shame +0.2, rumination +0.2;
//    other → anger +0.3, rumination +0.2, connection −0.2. data.forgive = {cSelf, cOther}.
//    The feelings picker's "blaming myself" chip is one self cue (c_self = 0.50,
//    the same self nudges), registered with MF.Movers.addPickExtra.
// 2. Master pass (same master() call, after inner peace):
//      F_self  = e_shame · (0.4 + 0.6·c_self)
//      F_other = e_anger · (0.4 + 0.6·c_other)
//      path    = argmax(F_self, F_other) when it is ≥ θ_F = 0.35 (tie → self), else none
//      ΔP_F    = P(e + release) − P(e), release (toward home, capped by the gap):
//                self shame −0.10, rumination −0.05; other anger −0.10,
//                rumination −0.05, connection +0.05
//      grace   = a path is suggested AND the peace lever is one of its movers
//                (self: shame, rumination; other: anger, rumination, connection)
// 3. Words (after Update): a forgiveness tile on the card, words only, with the
//    safety line "Forgiving is not excusing what happened, making up, or staying
//    anywhere unsafe." for the other path; faith wording only with Include faith on.
// 4. Grace's panel: two guided paths with optional text boxes kept only in the
//    page (saved only via "Save these notes to the journal"):
//      Forgive myself  the four Rs (Cornish & Wade, 2015) + Neff's self-compassion
//      Forgive someone REACH (Worthington) + Enright's process model
//
// Sources: Cornish & Wade (2015) J Couns Dev 93(1):96–104; Worthington (2006)
// Forgiveness and Reconciliation (REACH); Wade, Hoyt, Kidwell & Worthington
// (2014) J Consult Clin Psychol 82(1):154–170; Enright & Fitzgibbons (2015)
// Forgiveness Therapy (APA); McCullough, Bono & Root (2007) J Pers Soc Psychol
// 92(3):490–505 (rumination and forgiveness); Neff (2003) Self and Identity
// 2(2):85–101. A model and a practice aid, not therapy.

if (typeof module !== "undefined") {
  require("../core/movers.js");
  require("../core/reality.js");
  require("../core/peace.js");
  require("../core/master.js");
  require("./relationship.js");
}

if (typeof window === "undefined") { require("../data/strings.js"); require("../core/equations.js"); }
(function (MF) {
  "use strict";
  const Str = MF.Strings;   // every word lives in js/data/strings.js
  const P = MF.Params, EQ = MF.Equations;   // every number: data/params.js; every equation: core/equations.js
  const { idx } = MF.Movers;
  const R = MF.Reality, PEACE = MF.Peace, REL = MF.Relationship;
  const G = typeof Grounding !== "undefined" ? Grounding : require("../core/grounding.js");

  const THETA = P.forgive.THETA;
  const WHO = "(him|her|them|you|my \\w+)";
  /** Self-blame cues. */
  const SELF = [/\bmy fault\b/, /\bi blame myself\b/, /\b(can'?t|cannot|can not|never|won'?t) forgive myself\b/, /\bhate myself\b/, /\bi (messed|screwed) (it |everything |things )?up\b/, /\bi (ruined|wrecked) (it|everything|things)\b/, /\bi should(n'?t)? have\b/, new RegExp(`\\bi let ${WHO.replace("you|", "you|everyone|")} down\\b`), /\bi regret\b/, /\bi feel (so )?guilty\b/, /\bashamed of (myself|what i did)\b/, new RegExp(`\\bi hurt ${WHO}\\b`), /\bi'?m (such )?an? (terrible|horrible|awful|bad) (person|friend|parent|mom|dad|mother|father|partner|son|daughter|wife|husband)\b/];
  /** Resentment cues toward someone. */
  const OTHER = [new RegExp(`\\b(can'?t|cannot|can not|won'?t|never|could never) forgive ${WHO}\\b`), /\bresent(ment|ful|s)?\b/, /\bgrudge\b/, new RegExp(`\\b(he|she|they|you|my \\w+) (hurt|betrayed|lied to|cheated on|abandoned|humiliated|wronged|used) me\\b`), /\bhow could (he|she|they|you)\b/, /\bbitter(ness)?\b/, /\bbetray(ed|al)\b/, /\bstabbed me in the back\b/];

  /** Distinct cues of one kind in the text (negation-aware, as in the Four Horsemen). */
  function count(list, t) {
    return list.filter(re => { const g = new RegExp(re.source, "g"); let m; while ((m = g.exec(t))) if (!REL.negated(t, m.index)) return true; return false; }).length;
  }
  /**
   * Forgiveness cues in a text. Crisis wording gives zeros.
   * @returns {{self:number, other:number, cSelf:number, cOther:number}} counts and strengths c = 1 − e^(−0.7k)
   */
  function cues(text) {
    const t = REL.clean(text);
    if (!t.trim() || G.isCrisis(t)) return { self: 0, other: 0, cSelf: 0, cOther: 0 };
    const self = count(SELF, t), other = count(OTHER, t);
    const c = EQ.cue;
    return { self, other, cSelf: c(self), cOther: c(other) };
  }

  /** Word hook: small nudges onto existing movers; the cue strengths pass to master as data.forgive. */
  function hook(text) {
    const q = cues(text);
    if (!q.self && !q.other) return null;
    const add = {}, neg = {}, notes = [];
    if (q.self) { add.shame = 0.2; add.rumination = 0.2; notes.push(Str.t("forgiveness.hook.self_blame_forgiveness")); }
    if (q.other) { add.anger = 0.3; add.rumination = (add.rumination || 0) + 0.2; neg.connection = 0.2; notes.push(Str.t("forgiveness.hook.resentment_forgiveness")); }
    return { add, neg, notes, data: { forgive: { cSelf: q.cSelf, cOther: q.cOther } } };
  }
  MF.Movers.addWordHook(hook);
  /** The "blaming myself" chip in the feelings picker: one self-blame cue (c_self = 0.50), the same nudges as the words. */
  const BLAME = { id: "blame", label: "blaming myself", fn: () => ({ add: { shame: 0.2, rumination: 0.2 }, notes: ["self-blame (forgiveness)"], data: { forgive: { cSelf: 0.5, cOther: 0 } } }) };
  MF.Movers.addPickExtra(BLAME);

  /** What each path is modeled to move, toward home (capped by the gap). */
  const RELEASE = P.forgive.RELEASE;
  /** The movers each path works on (for the Grace recommendation). */
  const PATH_MOVERS = { self: ["shame", "rumination"], other: ["anger", "rumination", "connection"] };

  /** e moved toward home by the path's release vector. */
  function released(e, h, path) {
    const out = e.slice();
    Object.entries(RELEASE[path]).forEach(([n, v]) => {
      const j = idx[n], gap = h[j] - e[j];
      out[j] = e[j] + Math.sign(gap) * Math.min(v, Math.abs(gap));
    });
    return out;
  }

  /**
   * Master pass: the forgiveness reading for this call (see the header).
   * @param {object} out master output (gets out.forgive)
   * @param {{data:object, h:number[], V:object, clashes:string[]}} ctx
   */
  function pass(out, ctx) {
    const f = ctx.data.forgive || { cSelf: 0, cOther: 0 };
    const e = out.e, h = ctx.h, g = out.grand ? out.grand.g : 0;
    const { Fs, Fo } = EQ.forgiveness(e[idx.shame], e[idx.anger], f.cSelf, f.cOther);   // OE eq.(4) passes
    const best = Fs >= Fo ? "self" : "other", top = Math.max(Fs, Fo);
    const path = top >= THETA ? best : null;
    const P0 = PEACE.score(e, h, ctx.V, R.conflicts(e, ctx.clashes), g).raw;
    const dP = {};
    ["self", "other"].forEach(p => { const e2 = released(e, h, p); dP[p] = Math.round((PEACE.score(e2, h, ctx.V, R.conflicts(e2, ctx.clashes), g).raw - P0) * 10000) / 10000; });
    const lever = out.peace && out.peace.lever ? out.peace.lever.name : null;
    out.forgive = { cSelf: f.cSelf, cOther: f.cOther, Fself: Fs, Fother: Fo, path, dP, grace: !!(path && lever && PATH_MOVERS[path].includes(lever)) };
  }
  MF.Master.addPass(pass);

  // ---------- Words (card) ----------
  const SAFE = "Forgiving is not excusing what happened, making up, or staying anywhere unsafe.";
  const FAITH = {
    self: Str.t("forgiveness.FAITH.self"),
    other: Str.t("forgiveness.FAITH.other"),
  };
  /**
   * The forgiveness tile in words (empty when no path is suggested).
   * Weight words come from F: ≥ 0.6 "a heavy" / "a deep", else "some" / "a".
   * @param {object} m master output
   * @param {{faith?:boolean}} [opts]
   * @returns {string[]}
   */
  function cardLines(m, opts = {}) {
    const f = m && m.forgive;
    if (!f || !f.path) return [];
    const out = [];
    if (f.path === "self") {
      out.push(Str.t("forgiveness.cardLines.forgiving_yourself_there_s_of", { v0: f.Fself >= 0.6 ? Str.t("forgiveness.cardLines.a_heavy_weight") : Str.t("forgiveness.cardLines.some_weight") }));
    } else {
      out.push(Str.t("forgiveness.cardLines.forgiving_someone_there_s_here", { v0: f.Fother >= 0.6 ? Str.t("forgiveness.cardLines.a_deep_hurt") : "a hurt" }));
      out.push(SAFE);
    }
    out.push(Str.t("forgiveness.cardLines.you_can_go_one_gentle"));
    if (opts.faith) out.push(FAITH[f.path]);
    return out;
  }
  /** The peace line when Grace is the lever's helper (words only), or null. */
  function peaceLine(m) {
    const f = m && m.forgive;
    if (!f || !f.grace) return null;
    const lv = m.peace.lever;
    const noun = { shame: Str.t("words.LEVER_NOUN.shame"), rumination: Str.t("words.NOUN.rumination"), anger: Str.t("words.LEVER_NOUN.anger"), connection: "connection" }[lv.name];
    return Str.t("forgiveness.peaceLine.forgive_breathe_can_help_here", { v0: f.path === "self" ? "yourself" : "someone", v1: lv.kind === "grow" ? "grow" : "ease", noun: noun });
  }

  // ---------- The guided paths (Grace's panel) ----------
  const PATHS = {
    self: {
      title: Str.t("forgiveness.PATHS.self.title"),
      intro: Str.t("forgiveness.PATHS.self.intro"),
      steps: [
        { k: "Responsibility", say: Str.t("forgiveness.PATHS.self.steps.say"), box: Str.t("forgiveness.PATHS.self.steps.box") },
        { k: "Remorse", say: Str.t("forgiveness.PATHS.self.steps.say_2"), box: Str.t("forgiveness.PATHS.self.steps.box_2") },
        { k: "Restoration", say: Str.t("forgiveness.PATHS.self.steps.say_3"), box: Str.t("forgiveness.PATHS.self.steps.box_3") },
        { k: "Renewal", say: Str.t("forgiveness.PATHS.self.steps.say_4"), box: Str.t("forgiveness.PATHS.self.steps.box_4") },
      ],
      source: Str.t("forgiveness.PATHS.self.source"),
      faith: Str.t("forgiveness.PATHS.self.faith"),
    },
    other: {
      title: Str.t("forgiveness.PATHS.other.title"),
      intro: Str.t("forgiveness.PATHS.other.intro.forgiving_is_a_choice_you") + SAFE + Str.t("forgiveness.PATHS.other.intro.if_you_re_not_safe"),
      steps: [
        { k: "Recall", say: Str.t("forgiveness.PATHS.other.steps.say"), box: Str.t("forgiveness.PATHS.other.steps.box") },
        { k: "Empathize", say: Str.t("forgiveness.PATHS.other.steps.say_2"), box: Str.t("forgiveness.PATHS.other.steps.box_2") },
        { k: Str.t("forgiveness.PATHS.other.steps.k"), say: Str.t("forgiveness.PATHS.other.steps.say_3"), box: Str.t("forgiveness.PATHS.other.steps.box_3") },
        { k: "Commit", say: Str.t("forgiveness.PATHS.other.steps.say_4"), box: Str.t("forgiveness.PATHS.other.steps.box_4") },
        { k: Str.t("forgiveness.PATHS.other.steps.k_2"), say: Str.t("forgiveness.PATHS.other.steps.say_5"), box: Str.t("forgiveness.PATHS.other.steps.box_5") },
      ],
      source: Str.t("forgiveness.PATHS.other.source"),
      faith: Str.t("forgiveness.PATHS.other.faith"),
    },
  };

  // ---------- Grace's panel (browser only) ----------
  /**
   * Mount Grace's forgiveness tabs. The practices tab is mounted by
   * features/practices-panel code in the same panel (see mountPractices).
   * @param {object} app the app shell (see js/app.js)
   * @returns {function} render
   */
  function mount(app) {
    const { $ } = app;
    const notes = { self: [], other: [] };   // in the page only
    const at = { self: 0, other: 0 };
    const clear = () => { notes.self = []; notes.other = []; at.self = 0; at.other = 0; draw(); };
    app.onCrisis(clear);

    /** Switch tabs (self / other / practice). */
    function show(which) {
      document.querySelectorAll("#grace-tabs [role=tab]").forEach(b => {
        const on = b.dataset.tab === which;
        b.setAttribute("aria-selected", on ? "true" : "false");
        b.tabIndex = on ? 0 : -1;
      });
      ["self", "other", "practice"].forEach(t => $(`grace-${t}`).classList.toggle("hidden", t !== which));
      draw();
    }
    document.querySelectorAll("#grace-tabs [role=tab]").forEach(b => b.addEventListener("click", () => show(b.dataset.tab)));
    app.grace = { show };

    /** Draw the current step of one path, with its optional text box. */
    function draw() {
      ["self", "other"].forEach(p => {
        const P = PATHS[p], i = at[p], s = P.steps[i], root = $(`grace-${p}`);
        root.querySelector(".path-intro").textContent = P.intro;
        root.querySelector(".path-count").textContent = Str.t("forgiveness.step_of", { v0: i + 1, length: P.steps.length });
        root.querySelector(".path-dots").innerHTML = P.steps.map((x, j) => `<span class="dot${j === i ? " on" : j < i ? " done" : ""}" aria-hidden="true"></span>`).join("");
        root.querySelector(".path-k").textContent = s.k;
        root.querySelector(".path-say").textContent = s.say;
        const box = root.querySelector("textarea");
        box.placeholder = s.box;
        box.setAttribute("aria-label", Str.t("forgiveness.optional_note_kept_only_on", { k: s.k }));
        box.value = notes[p][i] || "";
        root.querySelector(".path-back").disabled = i === 0;
        root.querySelector(".path-next").textContent = i === P.steps.length - 1 ? Str.t("forgiveness.start_over") : Str.t("forgiveness.next_step");
        root.querySelector(".path-source").textContent = P.source;
        const fl = root.querySelector(".path-faith");
        fl.textContent = P.faith;
        fl.classList.toggle("hidden", !app.faith());
      });
    }
    ["self", "other"].forEach(p => {
      const root = $(`grace-${p}`), box = root.querySelector("textarea");
      box.addEventListener("input", () => {
        // Safety first: crisis wording in a note shows the 988/911 box at once.
        if (G.isCrisis(box.value)) { box.value = ""; app.crisis(true); return; }
        notes[p][at[p]] = box.value;
      });
      root.querySelector(".path-back").addEventListener("click", () => { at[p] = Math.max(0, at[p] - 1); draw(); });
      root.querySelector(".path-next").addEventListener("click", () => {
        // Walking a path to its last step is a practice finished (a caring action for the companion).
        if (at[p] === PATHS[p].steps.length - 1) app.care("practice");
        // Walking past REACH's "Empathize" step counts as empathy practised (the Kai shield).
        if (PATHS[p].steps[at[p]].k === "Empathize" && app.practised) app.practised("E");
        at[p] = at[p] === PATHS[p].steps.length - 1 ? 0 : at[p] + 1; draw(); root.querySelector(".path-k").focus();
      });
      root.querySelector(".path-save").addEventListener("click", () => {
        const kept = PATHS[p].steps.map((s, i) => (notes[p][i] || "").trim() ? `${s.k}: ${notes[p][i].trim()}` : null).filter(Boolean);
        if (!kept.length) { app.note(Str.t("forgiveness.write_in_a_step_s")); return; }
        MF.Writer.journalAdd(localStorage, `${PATHS[p].title}\n${kept.join("\n")}`);
        app.note(Str.t("forgiveness.saved_in_your_journal_on"));
        app.care("journal");
        app.renderAll();
      });
    });

    return function render() {
      const m = app.m();
      const hint = $("grace-hint");
      if (!m || !m.forgive) hint.textContent = Str.t("forgiveness.render.tap_update_for_a_suggested");
      else if (m.forgive.path === "self") hint.textContent = Str.t("forgiveness.render.from_your_reading_forgiving_yourself");
      else if (m.forgive.path === "other") hint.textContent = Str.t("forgiveness.render.from_your_reading_forgiving_someone");
      else hint.textContent = Str.t("forgiveness.render.from_your_reading_no_forgiveness");
      // The card's forgiveness lines, shown here in full (the short card may not show them).
      const box = $("grace-reading");
      box.innerHTML = "";
      const lines = m ? MF.Words.card(app.state, m, { faith: app.faith(), seed: P.seeds.CARD }).forgive : [];
      lines.forEach(t => { const p = document.createElement("p"); p.textContent = t; box.appendChild(p); });
      box.classList.toggle("hidden", !lines.length);
      draw();
    };
  }

  MF.Forgive = { BLAME, THETA, SELF, OTHER, RELEASE, PATH_MOVERS, SAFE, FAITH, PATHS, cues, hook, pass, released, cardLines, peaceLine, mount };
})(typeof window !== "undefined" ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
if (typeof module !== "undefined") module.exports = global.MF.Forgive;
