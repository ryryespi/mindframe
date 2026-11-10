// ariel/suite/reach.js — Reach out, and the reel of what we've made.
// No DOM. Nothing is sent. Ryan designed these paths.
// Never urge contact with someone who is unsafe or who asked for space.
//
// ===== PARAMS =====
// steps        one screen at a time
// readings     the void's story beside a kinder one
// scripture    optional, only when the person asked for faith-aware lines
// tips         one relationship fundamental at a time
// starters     copied by the person. Ariel does not send them.
// reelOnce     show the reel at most once per session unless they ask
//
// Sources for the tips, in comments below, not as a lecture on screen:
// Reis, H. T., & Shaver, P. (1988). Intimacy as an interpersonal process. Responsiveness.
// Gottman, J. M. Turning toward bids; soft start-up; about five positives to one negative; repair.
// Rusbult, C. E. Commitment as a choice (investment model), not a mood that must stay high.
//
// ===== EQUATIONS =====
// safe contact continues; "not safe" or "asked for space" stops the message steps
// courage 0, 1, 2 → tiny, small, medium starter
// reel shows iff asked OR (void signs AND not yet shown this session)
// harm language returns the 988 / 911 door and no message starters
"use strict";
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ArielReach = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const PARAMS = {
    validate: "It makes sense this feels broken. Pulling away can feel safer. You don't have to fix everything today.",
    safetyAsk: "Is this person safe to contact, and have they not asked you to stop?",
    honour: "Then the brave step is reaching toward someone safe instead.",
    trusted: "You can talk with someone you trust, or with a counsellor.",
    crisis: "If you might hurt yourself or someone else, please reach out now: call or text 988, or call 911.",
    readings: [
      { void: "They hate me.", kinder: "They may be hurt, busy, or scared. Hate is not the only reading." },
      { void: "It's over forever.", kinder: "A silence is not the whole future." },
      { void: "New people will hurt me like before.", kinder: "One hurt does not decide every person." }
    ],
    // Optional faith-aware lines. Shown only if the person turned that setting on.
    scripture: [
      { ref: "Lamentations 3:22–23", line: "The steadfast love of the Lord never ceases; his mercies never come to an end; they are new every morning." },
      { ref: "Romans 12:18", line: "If it is possible, as far as it depends on you, live at peace with everyone." },
      { ref: "Colossians 3:13", line: "Bear with each other and forgive one another if any of you has a grievance against someone." }
    ],
    tips: [
      "A bond grows when someone hears you and answers.",
      "When they reach toward you, even a small answer counts.",
      "You do not need a perfect talk. A repair is enough.",
      "About five kind moments for each hard one can hold a bond.",
      "Begin gently. A harsh opening makes the other person defend.",
      "Forgiveness is a way back from pulling away.",
      "Staying is a choice you can make again, not a feeling you must hold every hour."
    ],
    starters: {
      tiny: "Just checking in, hope you're okay.",
      small: "I've been thinking about you. I miss us.",
      medium: "I'm sorry for my part. No pressure to reply."
    },
    also: "Can we talk sometime this week?",
    after: "You fought for connection, not against them. Whatever they say, that was brave.",
    silence: "Silence isn't always a verdict. People get busy, scared, or tired too.",
    pause: "Pause here. Nothing has to move for a moment.",
    gratitude: "One thing you're thankful for, one person you respect.",
    fortress: "When everything feels empty, the mind can build a fortress of being right. Gratitude is the gentler way out.",
    invite: "You can save one of your own. It stays on this device.",
    // General facts, not a story about this person.
    madeTogether: [
      "People have finished songs by answering each other, one line and then the next.",
      "Open-source software is built by many people, each adding one piece.",
      "A letter is two people making something neither could finish alone."
    ]
  };

  const HARM = /\b(kill|killing|hurt them|hurt him|hurt her|hurt myself|make them pay|no point|want to die|wanna die|end my life|suicide)\b/i;
  const SIZES = ["tiny", "small", "medium"];

  function harm(text) { return HARM.test(String(text || "")); }

  function door() {
    return { safety: true, step: "safety", lines: [PARAMS.crisis, PARAMS.trusted], starters: [], blocked: true };
  }

  function start(mode) {
    const listen = mode === "listen";
    return {
      step: "validate",
      listening: listen,
      faith: false,
      safety: null,
      tip: 0,
      courage: 1,
      lines: listen ? [PARAMS.validate, PARAMS.pause] : [PARAMS.validate],
      choices: ["Continue"],
      starters: [],
      scripture: [],
      blocked: false
    };
  }

  function screen(state, choice) {
    const current = state || start("open");
    if (harm(choice)) return door();
    const listen = current.listening;
    if (choice === "not-safe" || choice === "space") {
      return {
        step: "honour",
        listening: listen,
        faith: current.faith,
        safety: choice,
        tip: current.tip,
        courage: current.courage,
        lines: [PARAMS.honour, PARAMS.trusted, PARAMS.crisis],
        choices: ["Not now"],
        starters: [],
        scripture: [],
        blocked: true
      };
    }
    if (choice === "safe") {
      return readings(current, true);
    }
    if (choice === "faith-on") return readings(Object.assign({}, current, { faith: true }), current.safety === "safe");
    if (choice === "faith-off") return readings(Object.assign({}, current, { faith: false }), current.safety === "safe");
    if (current.step === "validate" && choice === "continue") return safetyScreen(current);
    if (current.step === "safety" && !choice) return safetyScreen(current);
    if (current.step === "readings" && choice === "continue") return tipScreen(current);
    if (current.step === "tip" && choice === "continue") return messageScreen(current);
    if (current.step === "tip" && choice === "next-tip") return tipScreen(Object.assign({}, current, { tip: current.tip + 1 }));
    if (current.step === "message" && choice === "continue") return afterScreen(current, false);
    if (choice === "no-reply") return afterScreen(current, true);
    if (choice === "courage") return messageScreen(current);
    return current;
  }

  function safetyScreen(current) {
    return {
      step: "safety",
      listening: current.listening,
      faith: current.faith,
      safety: null,
      tip: current.tip,
      courage: current.courage,
      lines: [PARAMS.safetyAsk],
      choices: ["Safe to contact", "Not safe", "They asked for space"],
      starters: [],
      scripture: [],
      blocked: false
    };
  }

  function readings(current, allowed) {
    if (!allowed && current.safety !== "safe") return safetyScreen(current);
    const lines = [];
    PARAMS.readings.forEach(pair => {
      lines.push(pair.void);
      lines.push(pair.kinder);
    });
    const scripture = current.faith && !current.listening ? PARAMS.scripture.slice() : [];
    if (current.listening) {
      return {
        step: "readings",
        listening: true,
        faith: false,
        safety: "safe",
        tip: 0,
        courage: current.courage,
        lines: [PARAMS.readings[0].void, PARAMS.readings[0].kinder, PARAMS.pause],
        choices: ["Continue"],
        starters: [],
        scripture: [],
        blocked: false
      };
    }
    return {
      step: "readings",
      listening: false,
      faith: !!current.faith,
      safety: "safe",
      tip: 0,
      courage: current.courage,
      lines: lines,
      choices: ["Continue"],
      starters: [],
      scripture: scripture,
      blocked: false
    };
  }

  function tipScreen(current) {
    const i = Math.max(0, (current.tip || 0) % PARAMS.tips.length);
    const lines = current.listening ? [PARAMS.tips[i], PARAMS.pause] : [PARAMS.tips[i]];
    return {
      step: "tip",
      listening: current.listening,
      faith: current.faith,
      safety: "safe",
      tip: i,
      courage: current.courage,
      lines: lines,
      choices: current.listening ? ["Continue"] : ["Another tip", "Continue"],
      starters: [],
      scripture: [],
      blocked: false
    };
  }

  function messageScreen(current) {
    const size = SIZES[Math.max(0, Math.min(2, current.courage || 0))];
    const one = PARAMS.starters[size];
    return {
      step: "message",
      listening: current.listening,
      faith: current.faith,
      safety: "safe",
      tip: current.tip,
      courage: current.courage || 0,
      lines: current.listening ? [one, PARAMS.pause] : [one, PARAMS.also],
      choices: ["I sent it myself", "No reply came"],
      starters: current.listening ? [one] : [one, PARAMS.also, PARAMS.starters.small, PARAMS.starters.medium, PARAMS.starters.tiny].filter((item, idx, arr) => arr.indexOf(item) === idx),
      scripture: [],
      blocked: false,
      sends: false
    };
  }

  function afterScreen(current, noReply) {
    const lines = [PARAMS.after];
    if (noReply) lines.push(PARAMS.silence);
    if (!current.listening) lines.push("You can keep this moment on the Record.");
    return {
      step: "after",
      listening: current.listening,
      faith: current.faith,
      safety: "safe",
      tip: current.tip,
      courage: current.courage,
      lines: lines,
      choices: ["Keep this moment", "Not now"],
      starters: [],
      scripture: [],
      blocked: false,
      noReply: !!noReply
    };
  }

  function starterFor(courage) {
    const size = SIZES[Math.max(0, Math.min(2, courage || 0))];
    return PARAMS.starters[size];
  }

  function courageEntry(note, when) {
    const text = String(note || "").trim();
    if (!text) return null;
    return {
      type: "courage",
      text: "Reached toward someone",
      note: text,
      href: "#rest",
      source: "manual",
      at: when || ""
    };
  }

  function memories(entries, kindness) {
    const out = [];
    (entries || []).forEach(entry => {
      if (!entry) return;
      if (entry.type === "story" || entry.type === "courage" || entry.type === "journal" || entry.type === "note") {
        const text = String(entry.note || entry.text || "").trim();
        if (text) out.push({ kind: entry.type, text: text });
      }
    });
    (kindness || []).forEach(item => {
      const text = String(item && item.text || "").trim();
      if (text) out.push({ kind: "kindness", text: text });
    });
    return out;
  }

  function reel(items, opts) {
    const o = opts || {};
    if (harm(o.text)) return { show: false, safety: true, line: PARAMS.crisis, trusted: PARAMS.trusted, cards: [] };
    if (o.seen && !o.asked) return { show: false, safety: false, cards: [], reason: "once" };
    if (o.dismissed && !o.asked) return { show: false, safety: false, cards: [], reason: "not-now" };
    const listen = o.mode === "listen";
    const real = items || [];
    const cards = real.length ? real.map(item => ({ kind: item.kind, text: item.text, own: true })) : PARAMS.madeTogether.map(text => ({ kind: "together", text: text, own: false }));
    if (!real.length && !listen) cards.push({ kind: "invite", text: PARAMS.invite, own: false });
    if (!listen) cards.push({ kind: "thanks", text: PARAMS.gratitude + " " + PARAMS.fortress, own: false });
    else cards.push({ kind: "thanks", text: PARAMS.gratitude, own: false });
    return { show: true, safety: false, cards: cards, index: 0, once: !o.asked, asked: !!o.asked };
  }

  function reelCard(state, index) {
    const cards = (state && state.cards) || [];
    if (!cards.length) return null;
    const i = Math.max(0, Math.min(cards.length - 1, index || 0));
    return { index: i, card: cards[i], last: i === cards.length - 1 };
  }

  return { PARAMS, start, screen, starterFor, courageEntry, memories, reel, reelCard };
});
