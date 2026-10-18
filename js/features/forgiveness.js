// features/forgiveness.js — Grace the Dove: forgiving yourself and forgiving
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

(function (MF) {
  "use strict";
  const { idx, r2 } = MF.Movers;
  const R = MF.Reality, PEACE = MF.Peace, REL = MF.Relationship;
  const G = typeof Grounding !== "undefined" ? Grounding : require("../core/grounding.js");

  const THETA = 0.35;
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
    const c = k => r2(1 - Math.exp(-0.7 * k));
    return { self, other, cSelf: c(self), cOther: c(other) };
  }

  /** Word hook: small nudges onto existing movers; the cue strengths pass to master as data.forgive. */
  function hook(text) {
    const q = cues(text);
    if (!q.self && !q.other) return null;
    const add = {}, neg = {}, notes = [];
    if (q.self) { add.shame = 0.2; add.rumination = 0.2; notes.push("self-blame (forgiveness)"); }
    if (q.other) { add.anger = 0.3; add.rumination = (add.rumination || 0) + 0.2; neg.connection = 0.2; notes.push("resentment (forgiveness)"); }
    return { add, neg, notes, data: { forgive: { cSelf: q.cSelf, cOther: q.cOther } } };
  }
  MF.Movers.addWordHook(hook);
  /** The "blaming myself" chip in the feelings picker: one self-blame cue (c_self = 0.50), the same nudges as the words. */
  const BLAME = { id: "blame", label: "blaming myself", fn: () => ({ add: { shame: 0.2, rumination: 0.2 }, notes: ["self-blame (forgiveness)"], data: { forgive: { cSelf: 0.5, cOther: 0 } } }) };
  MF.Movers.addPickExtra(BLAME);

  /** What each path is modeled to move, toward home (capped by the gap). */
  const RELEASE = { self: { shame: 0.10, rumination: 0.05 }, other: { anger: 0.10, rumination: 0.05, connection: 0.05 } };
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
    const Fs = r2(e[idx.shame] * (0.4 + 0.6 * f.cSelf)), Fo = r2(e[idx.anger] * (0.4 + 0.6 * f.cOther));
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
    self: "Forgive us our debts, as we also forgive our debtors (from the Lord's Prayer); that mercy is meant for you too.",
    other: "Bear with each other and forgive one another, as the Lord forgave you (from Colossians); you can ask for help to begin.",
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
      out.push(`Forgiving yourself: there's ${f.Fself >= 0.6 ? "a heavy weight" : "some weight"} of self-blame here. You can own your part and still be kind to yourself.`);
    } else {
      out.push(`Forgiving someone: there's ${f.Fother >= 0.6 ? "a deep hurt" : "a hurt"} here that still stings. Forgiveness can come slowly, as a gift you choose, for your own peace.`);
      out.push(SAFE);
    }
    out.push("You can go one gentle step at a time, whenever you are ready.");
    if (opts.faith) out.push(FAITH[f.path]);
    return out;
  }
  /** The peace line when Grace is the lever's helper (words only), or null. */
  function peaceLine(m) {
    const f = m && m.forgive;
    if (!f || !f.grace) return null;
    const lv = m.peace.lever;
    const noun = { shame: "the shame", rumination: "the replaying", anger: "the anger", connection: "connection" }[lv.name];
    return `Grace the Dove can help here: forgiving ${f.path === "self" ? "yourself" : "someone"} is a gentle way to ${lv.kind === "grow" ? "grow" : "ease"} ${noun}.`;
  }

  // ---------- The guided paths (Grace's panel) ----------
  const PATHS = {
    self: {
      title: "Forgive myself",
      intro: "Self-forgiveness isn't letting yourself off the hook. It's owning what's yours, making what repair you can, and treating yourself with the kindness you'd give a friend. If you weren't at fault (for example, if someone harmed you), there's nothing here to forgive in yourself; the self-compassion step is still for you.",
      steps: [
        { k: "Responsibility", say: "Name what happened, plainly and fairly: not bigger, not smaller. Which part is yours, and which part isn't?", box: "The part that's mine is\u2026" },
        { k: "Remorse", say: "Let yourself feel sorry without punishing yourself. Guilt says \u201CI did something wrong\u201D; it doesn't have to become \u201CI am bad.\u201D", box: "I'm sorry that\u2026" },
        { k: "Restoration", say: "Is there one way to repair it: an apology, making amends, or doing it differently next time? If repair isn't possible or safe, a kind act toward someone else counts.", box: "One way I can make it right is\u2026" },
        { k: "Renewal", say: "Self-compassion: with a hand on your heart, say \u201CThis is hard\u201D (mindfulness), \u201CEveryone makes mistakes\u201D (common humanity), \u201CMay I be kind to myself\u201D (self-kindness). Then name how you'll grow.", box: "Next time I'll\u2026" },
      ],
      source: "The four Rs of self-forgiveness: Cornish & Wade (2015). Self-compassion: Neff (2003).",
      faith: "Forgive us our debts, as we also forgive our debtors (from the Lord's Prayer). God's mercy is meant for you too.",
    },
    other: {
      title: "Forgive someone",
      intro: "Forgiving is a choice you can make slowly, at your own pace, for your own peace. It often unfolds over time: noticing the hurt, deciding to forgive, working to understand, and finding meaning. " + SAFE + " If you're not safe, reach out for help first.",
      steps: [
        { k: "Recall", say: "Recall the hurt as calmly as you can, like a fair witness. No need to replay every detail.", box: "What happened was\u2026" },
        { k: "Empathize", say: "Imagine what might have been going on for them: pressures, fears, their own history. Understanding isn't agreeing.", box: "Maybe they were\u2026" },
        { k: "Altruistic gift", say: "Remember a time you were forgiven and how it felt. Forgiveness can be a gift you give, not because they earned it.", box: "A time I was forgiven\u2026" },
        { k: "Commit", say: "Commit to the forgiveness you've reached, even a little: write it here, or tell someone you trust.", box: "Today I choose to\u2026" },
        { k: "Hold on", say: "When the hurt comes back, it doesn't mean you didn't forgive. Come back to what you committed to.", box: "When it comes back, I'll remember\u2026" },
      ],
      source: "REACH: Worthington (2006); evidence: Wade, Hoyt, Kidwell & Worthington (2014). Process model: Enright & Fitzgibbons (2015).",
      faith: "Bear with each other and forgive one another, as the Lord forgave you (from Colossians). Even on the cross, Jesus prayed, \u201CFather, forgive them\u201D (from Luke). You can ask God for help to begin.",
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
        root.querySelector(".path-count").textContent = `Step ${i + 1} of ${P.steps.length}`;
        root.querySelector(".path-dots").innerHTML = P.steps.map((x, j) => `<span class="dot${j === i ? " on" : j < i ? " done" : ""}" aria-hidden="true"></span>`).join("");
        root.querySelector(".path-k").textContent = s.k;
        root.querySelector(".path-say").textContent = s.say;
        const box = root.querySelector("textarea");
        box.placeholder = s.box;
        box.setAttribute("aria-label", `${s.k}: optional note, kept only on this page`);
        box.value = notes[p][i] || "";
        root.querySelector(".path-back").disabled = i === 0;
        root.querySelector(".path-next").textContent = i === P.steps.length - 1 ? "Start over" : "Next step";
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
      root.querySelector(".path-next").addEventListener("click", () => { at[p] = at[p] === PATHS[p].steps.length - 1 ? 0 : at[p] + 1; draw(); root.querySelector(".path-k").focus(); });
      root.querySelector(".path-save").addEventListener("click", () => {
        const kept = PATHS[p].steps.map((s, i) => (notes[p][i] || "").trim() ? `${s.k}: ${notes[p][i].trim()}` : null).filter(Boolean);
        if (!kept.length) { app.note("Write in a step's box first; nothing is saved otherwise."); return; }
        MF.Writer.journalAdd(localStorage, `${PATHS[p].title}\n${kept.join("\n")}`);
        app.note("Saved in your journal on this device.");
        app.renderAll();
      });
    });

    return function render() {
      const m = app.m();
      const hint = $("grace-hint");
      if (!m || !m.forgive) hint.textContent = "Tap Update and Grace will suggest a path. You can open either one any time.";
      else if (m.forgive.path === "self") hint.textContent = "From your reading: forgiving yourself may help most right now.";
      else if (m.forgive.path === "other") hint.textContent = "From your reading: forgiving someone may help most right now, at your own pace.";
      else hint.textContent = "From your reading: no forgiveness path stands out. Both are here if you want them.";
      // The card's forgiveness lines, shown here in full (the short card may not show them).
      const box = $("grace-reading");
      box.innerHTML = "";
      const lines = m ? MF.Words.card(app.state, m, { faith: app.faith(), seed: 1 }).forgive : [];
      lines.forEach(t => { const p = document.createElement("p"); p.textContent = t; box.appendChild(p); });
      box.classList.toggle("hidden", !lines.length);
      draw();
    };
  }

  MF.Forgive = { BLAME, THETA, SELF, OTHER, RELEASE, PATH_MOVERS, SAFE, FAITH, PATHS, cues, hook, pass, released, cardLines, peaceLine, mount };
})(typeof window !== "undefined" ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
if (typeof module !== "undefined") module.exports = global.MF.Forgive;
