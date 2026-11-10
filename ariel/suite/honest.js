// ariel/suite/honest.js — the Honest Room.
// No DOM. Nothing is sent. Ryan designed this room.
// The words are not saved unless the person taps Keep privately.
//
// Guilt and shame are not the same thing.
// Tangney, J. P., & Dearing, R. L. (2002). Shame and Guilt.
// Guilt is about a behavior ("I did something wrong") and can lead to repair.
// Shame is about the self ("I am bad") and tends toward hiding.
//
// Defusion is the ACT step of naming a thought as a thought
// ("I'm having the thought that…"), not a debate with it.
// ERP is exposure and response prevention, an OCD-informed therapy.
// The teaching is offered once. Asking to hear it again is reassurance.
// After 3 asks, name that and stop. Do not keep reassuring.
//
// ===== PARAMS =====
// welcome     the first line
// teaching    one intrusive-thought teaching, not a loop
// guilt       an act can be named and, when safe, repaired
// shame       "I am bad" hides; it is not the same as guilt
// harm        local phrases that open the 988 / 911 door
// iterations  PBKDF2 rounds for an optional passcode lock
//
// ===== EQUATIONS =====
// harm iff a PARAMS.harm phrase appears as a whole phrase
// reassurance loop iff asks >= 3; the teaching is not repeated after that
// scripture iff faith AND NOT listening
// text stays in memory; leave() and release() set it to ""
// a passcode stores AES-GCM bytes only; the passcode itself is not stored
"use strict";
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ArielHonest = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const PARAMS = {
    welcome: "This is a safe place to be honest. You can say the worst thing here. You are still loved.",
    pause: "Pause here. Nothing has to move for a moment.",
    write: "Write it here, if you want to. It is not saved unless you keep it.",
    writeShort: "Write it here.",
    sort: "Is this a thought that showed up and horrifies you, or something you actually did?",
    teaching: "Unwanted thoughts that go against your values are common, and almost everyone has them. The distress you feel shows your values are intact. A thought is not an act, and it is not your character.",
    teachingShort: "A thought is not an act, and it is not your character.",
    defuse: "I'm having the thought that…",
    defuseMore: "You can set those words in front of it. You don't have to argue with the thought.",
    erp: "If these thoughts are frequent and consuming, an OCD-informed therapist who uses ERP can help a lot.",
    loop: "You've asked to hear this a few times. Another telling won't make it more true. You can let it go.",
    reassuranceLimit: 3,
    both: [
      "If it was a thought that horrified you: a thought is not an act, and it is not your character.",
      "If you did something: guilt can say the act was wrong. Shame says you are bad. Shame is the one that hides."
    ],
    guilt: "Guilt says, I did something wrong. That can lead to repair.",
    shame: "Shame says, I am bad. That leads to hiding.",
    nameIt: "Name what happened, as an act, not as your name.",
    guiltShort: "Guilt names an act. Shame names you. They are not the same.",
    repair: "If it is possible and safe, repair can be an apology, making amends, or changing course.",
    repairSafe: "You don't have to contact anyone who is unsafe, or who asked you to stop.",
    forgive: "Forgiveness here is unearned grace. It does not call the wrong good.",
    notExcuse: "Self-forgiveness is not excusing the wrong. It is laying down the shame that says you are the wrong.",
    close: "You told the truth. That took courage. You are not your worst moment.",
    talk: "You can talk with a trusted person, a pastor, or a counsellor. Nothing here is sent.",
    privacy: "Nothing here leaves your device. Nothing is judged.",
    danger: "If someone is in danger, contacting help comes first.",
    stays: "This stays on this device. Nothing is sent.",
    kept: "Kept on this device. Nothing was sent.",
    released: "Let go.",
    crisis: "This sounds really heavy. If you might hurt yourself or someone else, please reach a person now: call or text 988, or call 911.",
    trusted: "You can talk with someone you trust, a pastor, or a counsellor.",
    welcomeScripture: [
      { ref: "Psalm 32:5", line: "I acknowledged my sin to you, and I did not cover my iniquity. I said, I will confess my transgressions to the Lord, and you forgave the iniquity of my sin." },
      { ref: "Romans 8:1", line: "There is therefore now no condemnation for those who are in Christ Jesus." }
    ],
    forgiveScripture: [
      { ref: "1 John 1:9", line: "If we confess our sins, he is faithful and just to forgive us our sins and to cleanse us from all unrighteousness." },
      { ref: "Romans 8:1", line: "There is therefore now no condemnation for those who are in Christ Jesus." }
    ],
    // Local only. A match stops the room and shows the crisis lines.
    harm: ["kill", "killing", "hurt them", "hurt him", "hurt her", "hurt myself", "harm them", "harm myself", "make them pay", "no point", "want to die", "wanna die", "end my life", "suicide"],
    store: "ariel-honest",
    iterations: 100000,
    keepLimit: 40
  };

  function isHarm(text) {
    const raw = String(text || "");
    return PARAMS.harm.some(phrase => {
      const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp("(?:^|\\b)" + escaped + "(?:\\b|$)", "i").test(raw);
    });
  }

  function start(opts) {
    const o = opts || {};
    const listening = o.mode === "listen";
    return {
      step: "welcome",
      text: "",
      kind: "",
      reassurance: 0,
      faith: !!o.faith && !listening,
      listening: listening,
      fading: false,
      handoff: ""
    };
  }

  function clone(state) {
    const s = state || start({});
    return {
      step: s.step || "welcome",
      text: s.text || "",
      kind: s.kind || "",
      reassurance: s.reassurance || 0,
      faith: !!s.faith,
      listening: !!s.listening,
      fading: !!s.fading,
      handoff: ""
    };
  }

  function release(state) {
    const s = clone(state);
    s.step = "released";
    s.text = "";
    s.fading = true;
    return s;
  }

  function leave(state) { return release(state); }

  function safetyState(state) {
    const s = clone(state);
    s.step = "safety";
    s.text = "";
    s.fading = false;
    return s;
  }

  function linesFor(s) {
    if (s.step === "welcome") return s.listening ? [PARAMS.welcome, PARAMS.pause] : [PARAMS.welcome];
    if (s.step === "write") return [s.listening ? PARAMS.writeShort : PARAMS.write];
    if (s.step === "sort") return [PARAMS.sort];
    if (s.step === "thought") return [s.listening ? PARAMS.teachingShort : PARAMS.teaching];
    if (s.step === "defuse") return s.listening ? [PARAMS.defuse] : [PARAMS.defuse, PARAMS.defuseMore, PARAMS.erp];
    if (s.step === "loop") return [PARAMS.loop];
    if (s.step === "both") return PARAMS.both.slice();
    if (s.step === "name") return s.listening ? [PARAMS.guiltShort] : [PARAMS.guilt, PARAMS.shame, PARAMS.nameIt];
    if (s.step === "repair") return s.listening ? [PARAMS.repair] : [PARAMS.repair, PARAMS.repairSafe];
    if (s.step === "forgive") {
      const lines = [PARAMS.forgive];
      if (!s.listening) lines.push(PARAMS.notExcuse);
      return lines;
    }
    if (s.step === "close") return s.listening ? [PARAMS.close, PARAMS.pause] : [PARAMS.close];
    if (s.step === "keep") return [PARAMS.stays];
    if (s.step === "kept") return [PARAMS.kept];
    if (s.step === "talk") return [PARAMS.talk];
    if (s.step === "released") return [PARAMS.released];
    if (s.step === "safety") return [PARAMS.crisis, PARAMS.trusted];
    return [];
  }

  function scriptureFor(s) {
    if (!s.faith || s.listening) return [];
    if (s.step === "welcome") return PARAMS.welcomeScripture.slice();
    if (s.step === "forgive") return PARAMS.forgiveScripture.slice();
    return [];
  }

  function choicesFor(s) {
    const skip = { id: "skip", label: "Skip" };
    const go = { id: "continue", label: "Continue" };
    const gone = { id: "let-go", label: "Let it go" };
    if (s.step === "welcome" || s.step === "write") return [go, skip];
    if (s.step === "sort") {
      return [
        { id: "thought", label: "Thought that horrifies me" },
        { id: "did", label: "Something I did" },
        { id: "unsure", label: "Not sure" },
        skip
      ];
    }
    if (s.step === "thought") {
      const choices = [go, gone, skip];
      if (!s.listening) choices.splice(1, 0, { id: "again", label: "Say that again" });
      return choices;
    }
    if (s.step === "defuse" || s.step === "name" || s.step === "forgive") return [go, gone, skip];
    if (s.step === "repair") return [go, { id: "reach", label: "Reach out" }, gone, skip];
    if (s.step === "loop") return [gone, skip];
    if (s.step === "both") {
      return [
        go,
        { id: "thought", label: "The thought path" },
        { id: "did", label: "The guilt path" },
        skip
      ];
    }
    if (s.step === "close") {
      return [
        gone,
        { id: "keep", label: "Keep privately" },
        { id: "rest", label: "Rest" },
        { id: "talk", label: "Talk to someone" }
      ];
    }
    if (s.step === "keep") return [{ id: "save", label: "Keep privately" }, gone];
    if (s.step === "talk") return [{ id: "reach", label: "Reach out" }, { id: "rest", label: "Rest" }, gone];
    if (s.step === "safety") return [{ id: "close", label: "Close" }];
    return [];
  }

  function view(state) {
    const s = clone(state);
    return {
      step: s.step,
      lines: linesFor(s),
      scripture: scriptureFor(s),
      choices: choicesFor(s),
      field: s.step === "write",
      passcode: s.step === "keep",
      privacy: PARAMS.privacy,
      danger: PARAMS.danger,
      safety: s.step === "safety",
      fading: s.fading,
      text: s.text,
      graded: false
    };
  }

  function apply(state, action, text) {
    const s = clone(state);
    const raw = text != null ? String(text) : s.text;
    if (s.step === "write") s.text = raw;
    if (s.step !== "safety" && isHarm(raw)) return safetyState(s);
    if (s.step === "safety") {
      if (action === "close" || action === "let-go" || action === "rest") return release(s);
      return s;
    }
    if (action === "let-go") return release(s);
    if (action === "faith-on" && !s.listening) { s.faith = true; return s; }
    if (action === "faith-off") { s.faith = false; return s; }
    if (s.step === "welcome" && (action === "continue" || action === "skip")) { s.step = "write"; return s; }
    if (s.step === "write" && (action === "continue" || action === "skip")) { s.step = "sort"; return s; }
    if (s.step === "sort") {
      if (action === "skip") { s.step = "close"; return s; }
      if (action === "thought") { s.step = "thought"; s.kind = "thought"; return s; }
      if (action === "did") { s.step = "name"; s.kind = "did"; return s; }
      if (action === "unsure") { s.step = "both"; s.kind = "unsure"; return s; }
    }
    if (s.step === "thought") {
      if (action === "again" && !s.listening) {
        s.reassurance += 1;
        if (s.reassurance >= PARAMS.reassuranceLimit) s.step = "loop";
        return s;
      }
      if (action === "continue" || action === "skip") { s.step = "defuse"; return s; }
    }
    if (s.step === "defuse" && (action === "continue" || action === "skip")) { s.step = "close"; return s; }
    if (s.step === "loop" && action === "skip") { s.step = "close"; return s; }
    if (s.step === "both") {
      if (action === "thought") { s.step = "thought"; s.kind = "thought"; return s; }
      if (action === "did") { s.step = "name"; s.kind = "did"; return s; }
      if (action === "continue" || action === "skip") { s.step = "close"; return s; }
    }
    if (s.step === "name" && (action === "continue" || action === "skip")) { s.step = "repair"; return s; }
    if (s.step === "repair") {
      if (action === "reach") { const out = release(s); out.handoff = "reach"; return out; }
      if (action === "continue" || action === "skip") { s.step = "forgive"; return s; }
    }
    if (s.step === "forgive" && (action === "continue" || action === "skip")) { s.step = "close"; return s; }
    if (s.step === "close") {
      if (action === "keep") { s.step = "keep"; return s; }
      if (action === "rest") { const out = release(s); out.handoff = "rest"; return out; }
      if (action === "talk") { s.step = "talk"; return s; }
    }
    if (s.step === "talk") {
      if (action === "reach") { const out = release(s); out.handoff = "reach"; return out; }
      if (action === "rest") { const out = release(s); out.handoff = "rest"; return out; }
    }
    return s;
  }

  function afterKeep(state) {
    const s = clone(state);
    s.step = "kept";
    s.text = "";
    s.fading = false;
    return s;
  }

  function bytesToB64(bytes) {
    let bin = "";
    const list = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    for (let i = 0; i < list.length; i++) bin += String.fromCharCode(list[i]);
    return btoa(bin);
  }

  function b64ToBytes(value) {
    const bin = atob(String(value || ""));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  async function deriveKey(passcode, salt) {
    const base = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(String(passcode)),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: salt, iterations: PARAMS.iterations, hash: "SHA-256" },
      base,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  /** Ciphertext only. The passcode is not returned or stored. */
  async function seal(text, passcode) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(passcode, salt);
    const cipher = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      new TextEncoder().encode(String(text || ""))
    );
    return { v: 1, salt: bytesToB64(salt), iv: bytesToB64(iv), data: bytesToB64(cipher) };
  }

  async function openSeal(blob, passcode) {
    try {
      const key = await deriveKey(passcode, b64ToBytes(blob.salt));
      const plain = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: b64ToBytes(blob.iv) },
        key,
        b64ToBytes(blob.data)
      );
      return { ok: true, text: new TextDecoder().decode(plain) };
    } catch (err) {
      return { ok: false, text: "" };
    }
  }

  function plainEntry(id, at, text) {
    return { id: String(id), at: String(at || ""), locked: false, text: String(text || ""), note: PARAMS.stays };
  }

  function lockedEntry(id, at, blob) {
    return {
      id: String(id),
      at: String(at || ""),
      locked: true,
      text: "",
      blob: { v: 1, salt: String(blob.salt), iv: String(blob.iv), data: String(blob.data) },
      note: PARAMS.stays
    };
  }

  function addKept(list, entry) {
    return [entry].concat(list || []).slice(0, PARAMS.keepLimit);
  }

  function removeKept(list, id) {
    return (list || []).filter(entry => entry && entry.id !== id);
  }

  function normalize(entry) {
    if (!entry || !entry.id) return null;
    if (entry.locked && entry.blob && entry.blob.data) {
      return lockedEntry(entry.id, entry.at, entry.blob);
    }
    return plainEntry(entry.id, entry.at, entry.text);
  }

  function loadKept(storage) {
    try {
      const raw = JSON.parse(storage.getItem(PARAMS.store) || "[]");
      if (!Array.isArray(raw)) return [];
      return raw.map(normalize).filter(Boolean);
    } catch (err) {
      return [];
    }
  }

  function saveKept(storage, list) {
    storage.setItem(PARAMS.store, JSON.stringify((list || []).map(normalize).filter(Boolean)));
  }

  return {
    PARAMS, isHarm, start, view, apply, release, leave, afterKeep,
    seal, openSeal, plainEntry, lockedEntry, addKept, removeKept, loadKept, saveKept
  };
});
