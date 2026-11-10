// ariel/suite/guide.js — plain language for the five suite tabs.
// No DOM. The gate math stays in bridge.js. This file only chooses words.
// Tone follows the gate. It is not a score.
//
// ===== TONE =====
// listen     threat is high: fewer words, a pause is offered
// gentle     the middle: reflect, and do not grade
// expansive  threat is low: there is room to stay with the idea
"use strict";
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ArielGuide = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const FORGIVENESS = "You can let yourself off the hook for this.";
  const ENOUGH = "You've learned what you needed here. Nothing more to prove.";
  const ENOUGH_MORE = "And there is always more to enjoy.";
  const FOOTER = "Not a tower to climb, a world to discover.";
  const VERSE = "It is the glory of God to conceal a thing: but the honour of kings is to search out a matter. (Proverbs 25:2)";
  const WONDER_LINE = "This sounds like it might be about proving. Want to come back to wonder?";
  const STOP = {
    a: 1, an: 1, the: 1, and: 1, or: 1, to: 1, of: 1, in: 1, on: 1, for: 1, with: 1,
    my: 1, i: 1, me: 1, it: 1, is: 1, am: 1, are: 1, was: 1, be: 1, this: 1, that: 1,
    just: 1, really: 1, very: 1, so: 1, but: 1, if: 1, as: 1, at: 1, from: 1, about: 1,
    into: 1, when: 1, what: 1, have: 1, has: 1, had: 1, not: 1, you: 1, your: 1,
    keep: 1, returning: 1, want: 1, feel: 1, feels: 1, felt: 1, like: 1, know: 1,
    think: 1, going: 1, something: 1, here: 1, there: 1, because: 1, while: 1,
    still: 1, them: 1, they: 1, their: 1, been: 1, being: 1, would: 1, could: 1, should: 1
  };
  const THEMES = [
    {
      keys: ["forgive", "forgiveness", "guilt", "ashamed", "mistake", "hook"],
      concepts: ["what happened", "what can be set down", "what remains yours", "a limit"],
      mind: { name: "Desmond Tutu", line: "He wrote about forgiveness without pretending the harm was small." }
    },
    {
      keys: ["humble", "humility", "vain", "vanity", "prove", "perfect", "flawless"],
      concepts: ["what is true", "what is wished", "a limit", "enough"],
      mind: { name: "Marcus Aurelius", line: "He kept returning to what was actually in front of him." }
    },
    {
      keys: ["knowledge", "learn", "learning", "study", "question", "fundamental", "fundamentals"],
      concepts: ["a question", "a source", "a limit", "practice"],
      mind: { name: "Socrates", line: "He treated the question as the work." }
    },
    {
      keys: ["art", "draw", "drawing", "story", "image", "paint"],
      concepts: ["attention", "form", "revision", "a limit"],
      mind: { name: "Hildegard of Bingen", line: "She treated making as a way of seeing." }
    },
    {
      keys: ["peace", "enough", "rest", "void", "empty", "quiet"],
      concepts: ["a pause", "a limit", "what remains", "enough"],
      mind: { name: "Thich Nhat Hanh", line: "He taught stopping as part of the path." }
    },
    {
      keys: ["afraid", "fear", "overwhelm", "anxious", "panic"],
      concepts: ["the body", "one fact", "a smaller step", "time"],
      mind: { name: "Julian of Norwich", line: "She sat with fear and wrote of being held." }
    }
  ];
  const VANITY = /\b(perfect|flawless|everyone|no one else|the best|better than|prove myself|prove them|famous|impressive|never wrong|always right|have to be|need to be)\b/i;
  const PROVING = /\b(prove|be known|show them|better than|remembered forever|make us a name|make a name)\b/i;
  const WOVEN = [
    { keys: ["geometry", "geometric", "fibonacci", "spiral"], example: "the Fibonacci spiral in a sunflower" },
    { keys: ["symmetry", "symmetric", "snowflake", "snowflakes"], example: "snowflakes" },
    { keys: ["ratio", "ratios", "proportion", "harmony", "music", "musical"], example: "musical harmony" }
  ];

  function tone(v) {
    const x = Number(v);
    if (x >= 0.6) return "listen";
    if (x >= 0.35) return "gentle";
    return "expansive";
  }

  function toneLine(name) {
    if (name === "listen") return "Listening.";
    if (name === "expansive") return "There is room.";
    return "Here with you.";
  }

  function contentWords(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s'-]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP[w]);
  }

  function reflect(text, toneName) {
    const raw = String(text || "").trim();
    const toneUsed = toneName === "listen" || toneName === "expansive" ? toneName : "gentle";
    if (!raw) {
      return {
        heard: "", core: "", tone: toneUsed,
        lines: ["Write when you are ready. I will only reflect what you put here."]
      };
    }
    const sentence = raw.split(/\n|(?<=[.!?])\s+/)[0].trim();
    const heard = sentence.length > 140 ? sentence.slice(0, 137) + "…" : sentence;
    const words = contentWords(raw);
    const freq = {};
    words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
    let core = words[0] || "this";
    words.forEach(w => {
      if (freq[w] > freq[core] || (freq[w] === freq[core] && w.length > core.length)) core = w;
    });
    const lines = ["I hear: “" + heard + "”", "The core of this: " + core + "."];
    if (toneUsed === "gentle") lines.push("Nothing here is being graded.");
    if (toneUsed === "expansive") lines.push("There is room to stay with this.");
    return { heard, core, tone: toneUsed, lines };
  }

  function wovenExamples(text) {
    const raw = String(text || "");
    const found = [];
    WOVEN.forEach(row => {
      if (row.keys.some(k => new RegExp("\\b" + k + "\\b", "i").test(raw)) && found.indexOf(row.example) < 0) found.push(row.example);
    });
    return found;
  }

  function asConcept(name) {
    const own = wovenExamples(name);
    return {
      name: name,
      line: "Already in the architecture of the world.",
      woven: own.length ? own[0] : ""
    };
  }

  function frameConcepts(names, source) {
    const concepts = names.slice(0, 4).map(asConcept);
    const used = {};
    concepts.forEach(c => { if (c.woven) used[c.woven] = 1; });
    const woven = wovenExamples(source).filter(ex => !used[ex]);
    return { concepts, woven };
  }

  function learn(text) {
    const raw = String(text || "").trim();
    const words = contentWords(raw);
    const foot = { footer: FOOTER, verse: VERSE };
    if (!words.length) {
      return Object.assign({
        concepts: [], woven: [], mind: null,
        note: "Write an idea first. Suggestions only. No exercises and no tests."
      }, foot);
    }
    let best = null;
    let bestHits = 0;
    THEMES.forEach(theme => {
      const hits = theme.keys.filter(k => words.indexOf(k) >= 0 || new RegExp("\\b" + k + "\\b", "i").test(raw)).length;
      if (hits > bestHits) { best = theme; bestHits = hits; }
    });
    if (best) {
      const framed = frameConcepts(best.concepts, raw);
      return Object.assign({
        concepts: framed.concepts,
        woven: framed.woven,
        mind: { name: best.mind.name, line: best.mind.line },
        note: "A suggestion. Not an exercise and not a test."
      }, foot);
    }
    const names = [];
    words.forEach(w => { if (names.indexOf(w) < 0 && names.length < 4) names.push(w); });
    while (names.length < 2) names.push(names.length === 0 ? "the question you asked" : "what you can see from here");
    const framed = frameConcepts(names, raw);
    return Object.assign({
      concepts: framed.concepts,
      woven: framed.woven,
      mind: null,
      note: "A suggestion from your own words. I don't have a kindred mind for this yet. Not an exercise and not a test."
    }, foot);
  }

  function wonderKey(text) {
    return String(text || "").trim().toLowerCase().replace(/\s+/g, " ");
  }

  /** Motive check. Dismissal is a key the caller keeps. No judgment of the person. */
  function wonderCard(text, dismissedKey) {
    const raw = String(text || "");
    const key = wonderKey(raw);
    const flagged = PROVING.test(raw);
    return {
      flagged: flagged,
      show: flagged && key !== String(dismissedKey || ""),
      key: key,
      line: WONDER_LINE
    };
  }

  function reality(text, dream) {
    const raw = String(text || "").trim();
    const named = String(dream || "").trim();
    const flagged = VANITY.test(raw);
    if (flagged) {
      return {
        flagged: true,
        heard: "This ideal may be heavier than what is true.",
        trueNow: "What is true is what you can point to on the page, not a verdict on your worth.",
        dreamHolds: named
          ? "The dream can still hold: “" + named + ".” It does not have to prove you."
          : "The wish can stay as a direction. It does not have to be a proof.",
        invite: "You can accept both. The ideal can be false, and the dream can still be yours."
      };
    }
    return {
      flagged: false,
      heard: "Nothing here needs to be taken apart.",
      trueNow: "What is true is the words you actually wrote.",
      dreamHolds: named
        ? "The dream can still hold: “" + named + ".”"
        : "A dream can stay small and still be real.",
      invite: "You can let it be what it is."
    };
  }

  function restOffer(v, dream, idea) {
    const high = Number(v) >= 0.6;
    const named = String(dream || "").trim();
    return {
      high,
      tone: tone(v),
      pause: high
        ? "Pause here. Nothing has to move for a moment."
        : "You can pause here, even if the hour is quiet.",
      forgiveness: FORGIVENESS,
      drive: named
        ? "The drive you named: “" + named + "”"
        : "The drive is yours to name. It stays on this device.",
      reality: reality(idea, named)
    };
  }

  function enough(title) {
    const name = String(title || "").trim();
    const settled = name ? "Settled: " + name : "";
    return {
      text: ENOUGH,
      more: ENOUGH_MORE,
      note: name,
      entry: {
        type: "enough",
        text: ENOUGH,
        note: settled ? settled + ". " + ENOUGH_MORE : ENOUGH_MORE,
        source: "auto",
        key: "enough:" + (name || "idea"),
        href: ""
      }
    };
  }

  return {
    FORGIVENESS, ENOUGH, ENOUGH_MORE, FOOTER, VERSE, WONDER_LINE,
    tone, toneLine, reflect, learn, reality, restOffer, enough, wonderCard
  };
});
