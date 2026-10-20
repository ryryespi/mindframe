// features/about.js — "About me" (optional, push27): hobbies and field of study or work.
// Kept on this device in the session's .mf code (an "about" line, so it travels
// only when YOU copy or export the code) and never sent anywhere. Editable and
// clearable in the companion's sheet. Nothing here is required.
//
// How it is used (words only; the numbers never change because of it):
//  1. A step in your own way: each hobby maps to a small behavioral-activation step,
//     a mastery or pleasure activity (Lewinsohn, 1974; Martell, Addis & Jacobson, 2001).
//  2. The story's field motif: scenes get a small motif (a lantern-lit screen for
//     software, a caring hand for nursing, a canvas for art, …) and the quiet-bend
//     beat gets one matching metaphor (features/parable.js, features/scenes.js).
//  3. Continue your story: music adds one more song; films add one more film.
//  4. The governor's kind action (features/scenes.js) is tied to a hobby when one fits.
//  5. Anchor suggestion: hobbies suggest room for flow, the absorbed calm of doing
//     something you are good at (Csikszentmihalyi, 1990), words only.

(function (MF) {
  "use strict";
  const HOBBIES = {
    coding: { label: "Coding", step: "Rubber-duck your feeling: explain it out loud, step by step, as if to a patient friend.", kind: "Help someone with one small question, or leave one kind comment on their work.", flow: "solving one small problem" },
    music: { label: "Music", step: "Play or listen to one song slowly, all the way through, and notice one instrument.", kind: "Share one calm song with someone you like.", flow: "playing or listening closely" },
    sports: { label: "Sports", step: "A brisk ten-minute walk, or a few easy drills at half speed.", kind: "Invite someone for an easy walk or a few gentle drills together.", flow: "moving with a steady rhythm" },
    reading: { label: "Reading", step: "Read one page slowly, then write one line you want to remember.", kind: "Send a friend one line you liked, and why.", flow: "getting lost in a good page" },
    writing: { label: "Writing", step: "Write five honest sentences, then stop and breathe.", kind: "Write a short thank-you note to someone.", flow: "finding the right words" },
    art: { label: "Art and drawing", step: "Draw one ordinary object for ten minutes, just its outline.", kind: "Make a small sketch for someone and give it to them.", flow: "a line following your hand" },
    cooking: { label: "Cooking", step: "Make something simple, one step at a time, tasting as you go.", kind: "Cook something simple and share it.", flow: "the rhythm of chopping and stirring" },
    gardening: { label: "Gardening and nature", step: "Water a plant or step outside and touch one leaf.", kind: "Give someone a cutting, or water a neighbor's plants.", flow: "hands in the soil" },
    gaming: { label: "Games", step: "Play one calm game for a set fifteen minutes, then stand and stretch.", kind: "Play a calm co-op game with a friend, for a set time.", flow: "a game that is just hard enough" },
    films: { label: "Films and shows", step: "Watch one short gentle scene and notice what helped the character.", kind: "Ask someone to watch something gentle with you.", flow: "a story that holds your attention" },
    faith: { label: "Faith and service", step: "Sit quietly for a minute, then do one small act of service.", kind: "Do one small act of service for someone nearby.", flow: "quiet, steady service" },
    crafts: { label: "Crafts and making", step: "Work on one small piece for ten minutes with your hands.", kind: "Make or fix one small thing for someone.", flow: "careful work with your hands" },
  };
  const FIELDS = {
    software: { label: "Software development", motif: "lantern", metaphor: "the way she would step through code, one line at a time, without blaming herself for the bug" },
    nursing: { label: "Nursing and care", motif: "hand", metaphor: "the way she would care for a patient, gently and without hurry" },
    art: { label: "Art and design", motif: "canvas", metaphor: "the way a painter lets a first layer dry before the next" },
    teaching: { label: "Teaching and study", motif: "book", metaphor: "the way a good teacher lets a student try again" },
    science: { label: "Science and research", motif: "lantern", metaphor: "the way a careful scientist treats a thought as a question to test" },
    trades: { label: "Trades and building", motif: "tool", metaphor: "the way a builder checks the level before the next row" },
    business: { label: "Business and office", motif: "book", metaphor: "the way she would clear one task before opening the next" },
    health: { label: "Health and medicine", motif: "hand", metaphor: "the way a clinician listens before deciding" },
    student: { label: "Student", motif: "book", metaphor: "the way a student reads one paragraph at a time" },
    other: { label: "Something else", motif: "seed", metaphor: "the way small steady work grows over time" },
  };
  const MAX_TAG = 24, MAX_TAGS = 8;
  const cleanTag = t => String(t || "").toLowerCase().replace(/[^a-z0-9 \-]/g, "").trim().slice(0, MAX_TAG);
  /** Normalize an about record: {hobbies: [ids], tags: [free], field: id|null, fieldText}. */
  function normalize(a) {
    if (!a) return null;
    const hobbies = Object.keys(HOBBIES).filter(k => (a.hobbies || []).includes(k)); // list order
    const tags = [...new Set((a.tags || []).map(cleanTag).filter(Boolean))].slice(0, MAX_TAGS);
    const field = FIELDS[a.field] ? a.field : null, fieldText = cleanTag(a.fieldText);
    return hobbies.length || tags.length || field || fieldText ? { hobbies, tags, field, fieldText } : null;
  }
  /** The first hobby (by list order) a free tag or a picked hobby names. */
  const hobbyOf = a => (a ? a.hobbies[0] || Object.keys(HOBBIES).find(k => a.tags.some(t => t.includes(k))) || null : null);
  /** 1. A step in your own way. */
  const step = a => { const h = hobbyOf(a); return h ? `A step in your own way: ${HOBBIES[h].step}` : null; };
  /** 4. A kind action tied to a hobby. */
  const kind = a => { const h = hobbyOf(a); return h ? HOBBIES[h].kind : null; };
  /** 2. The field motif and metaphor. */
  const motif = a => (a && a.field ? FIELDS[a.field].motif : null);
  const metaphor = a => (a && a.field ? FIELDS[a.field].metaphor : null);
  /** 5. Anchor suggestion in words. */
  function flowWords(a) {
    const hs = a ? a.hobbies.slice(0, 2) : [];
    return hs.length ? `Your anchor has room for flow: the absorbed calm of ${hs.map(h => HOBBIES[h].flow).join(" or ")}.` : null;
  }
  /** 3. Extra picks for Continue your story. */
  const extras = a => ({ songs: a && a.hobbies.includes("music") ? 1 : 0, films: a && a.hobbies.includes("films") ? 1 : 0 });
  /** The .mf code line, or null. */
  function line(a) {
    const n = normalize(a);
    if (!n) return null;
    const parts = [];
    if (n.hobbies.length) parts.push(`hobbies=${n.hobbies.join(",")}`);
    if (n.tags.length) parts.push(`tags=${n.tags.map(encodeURIComponent).join(",")}`);
    if (n.field) parts.push(`field=${n.field}`);
    if (n.fieldText) parts.push(`fieldtext=${encodeURIComponent(n.fieldText)}`);
    return `about ${parts.join(" ")}`;
  }
  /** Read the tokens after "about"; returns {about, errors}. */
  function read(tokens) {
    const a = { hobbies: [], tags: [], field: null, fieldText: "" }, errors = [];
    tokens.forEach(tok => {
      const m = tok.match(/^(hobbies|tags|field|fieldtext)=(.*)$/);
      if (!m) { errors.push(`\u201C${tok}\u201D should look like hobbies=music,coding or field=software.`); return; }
      try {
        if (m[1] === "hobbies") a.hobbies = m[2].split(",");
        else if (m[1] === "tags") a.tags = m[2].split(",").map(decodeURIComponent);
        else if (m[1] === "field") a.field = m[2];
        else a.fieldText = decodeURIComponent(m[2]);
      } catch (e) { errors.push("an about value can't be read."); }
    });
    return { about: normalize(a), errors };
  }

  /** Browser: the About me view in the companion's sheet. */
  function mount(app) {
    const $ = id => document.getElementById(id);
    const box = $("ab-hobbies");
    Object.keys(HOBBIES).forEach(k => {
      const l = document.createElement("label"); l.className = "ab-chip";
      const c = document.createElement("input"); c.type = "checkbox"; c.value = k; c.id = `ab-h-${k}`;
      l.append(c, ` ${HOBBIES[k].label}`); box.appendChild(l);
    });
    const sel = $("ab-field");
    Object.keys(FIELDS).forEach(k => { const o = document.createElement("option"); o.value = k; o.textContent = FIELDS[k].label; sel.appendChild(o); });
    function fillForm() {
      const a = app.state.about || { hobbies: [], tags: [], field: null, fieldText: "" };
      box.querySelectorAll("input").forEach(c => { c.checked = a.hobbies.includes(c.value); });
      $("ab-tags").value = a.tags.join(", "); sel.value = a.field || ""; $("ab-fieldtext").value = a.fieldText || "";
    }
    $("pet-about").addEventListener("click", () => { fillForm(); app.open("about"); });
    $("ab-save").addEventListener("click", () => {
      const about = normalize({ hobbies: Array.from(box.querySelectorAll("input:checked")).map(c => c.value), tags: $("ab-tags").value.split(","), field: sel.value || null, fieldText: $("ab-fieldtext").value });
      app.state = { ...app.state, about };
      app.save(); app.renderAll();
      $("ab-note").textContent = about ? "Saved on this device. It is never sent." : "Cleared.";
    });
    $("ab-clear").addEventListener("click", () => { app.state = { ...app.state, about: null }; app.save(); fillForm(); app.renderAll(); $("ab-note").textContent = "Cleared."; });
    return () => {};
  }

  MF.About = { HOBBIES, FIELDS, normalize, hobbyOf, step, kind, motif, metaphor, flowWords, extras, line, read, mount };
})(typeof window !== "undefined" ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
if (typeof module !== "undefined") module.exports = global.MF.About;
