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

if (typeof window === "undefined") { require("../data/strings.js"); require("../core/equations.js"); }
(function (MF) {
  "use strict";
  const Str = MF.Strings;   // every word lives in js/data/strings.js
  const P = MF.Params;   // every number: data/params.js
  const HOBBIES = {
    coding: { label: "Coding", step: Str.t("about.HOBBIES.coding.step"), kind: Str.t("about.HOBBIES.coding.kind"), flow: Str.t("about.HOBBIES.coding.flow") },
    music: { label: "Music", step: Str.t("about.HOBBIES.music.step"), kind: Str.t("about.HOBBIES.music.kind"), flow: Str.t("about.HOBBIES.music.flow") },
    sports: { label: "Sports", step: Str.t("about.HOBBIES.sports.step"), kind: Str.t("about.HOBBIES.sports.kind"), flow: Str.t("about.HOBBIES.sports.flow") },
    reading: { label: "Reading", step: Str.t("about.HOBBIES.reading.step"), kind: Str.t("about.HOBBIES.reading.kind"), flow: Str.t("about.HOBBIES.reading.flow") },
    writing: { label: "Writing", step: Str.t("about.HOBBIES.writing.step"), kind: Str.t("about.HOBBIES.writing.kind"), flow: Str.t("about.HOBBIES.writing.flow") },
    art: { label: Str.t("about.HOBBIES.art.label"), step: Str.t("about.HOBBIES.art.step"), kind: Str.t("about.HOBBIES.art.kind"), flow: Str.t("about.HOBBIES.art.flow") },
    cooking: { label: "Cooking", step: Str.t("about.HOBBIES.cooking.step"), kind: Str.t("about.HOBBIES.cooking.kind"), flow: Str.t("about.HOBBIES.cooking.flow") },
    gardening: { label: Str.t("about.HOBBIES.gardening.label"), step: Str.t("about.HOBBIES.gardening.step"), kind: Str.t("about.HOBBIES.gardening.kind"), flow: Str.t("about.HOBBIES.gardening.flow") },
    gaming: { label: "Games", step: Str.t("about.HOBBIES.gaming.step"), kind: Str.t("about.HOBBIES.gaming.kind"), flow: Str.t("about.HOBBIES.gaming.flow") },
    films: { label: Str.t("about.HOBBIES.films.label"), step: Str.t("about.HOBBIES.films.step"), kind: Str.t("about.HOBBIES.films.kind"), flow: Str.t("about.HOBBIES.films.flow") },
    faith: { label: Str.t("about.HOBBIES.faith.label"), step: Str.t("about.HOBBIES.faith.step"), kind: Str.t("about.HOBBIES.faith.kind"), flow: Str.t("about.HOBBIES.faith.flow") },
    crafts: { label: Str.t("about.HOBBIES.crafts.label"), step: Str.t("about.HOBBIES.crafts.step"), kind: Str.t("about.HOBBIES.crafts.kind"), flow: Str.t("about.HOBBIES.crafts.flow") },
  };
  const FIELDS = {
    software: { label: Str.t("about.FIELDS.software.label"), motif: "lantern", metaphor: Str.t("about.FIELDS.software.metaphor") },
    nursing: { label: Str.t("about.FIELDS.nursing.label"), motif: "hand", metaphor: Str.t("about.FIELDS.nursing.metaphor") },
    art: { label: Str.t("about.FIELDS.art.label"), motif: "canvas", metaphor: Str.t("about.FIELDS.art.metaphor") },
    teaching: { label: Str.t("about.FIELDS.teaching.label"), motif: "book", metaphor: Str.t("about.FIELDS.teaching.metaphor") },
    science: { label: Str.t("about.FIELDS.science.label"), motif: "lantern", metaphor: Str.t("about.FIELDS.science.metaphor") },
    trades: { label: Str.t("about.FIELDS.trades.label"), motif: "tool", metaphor: Str.t("about.FIELDS.trades.metaphor") },
    business: { label: Str.t("about.FIELDS.business.label"), motif: "book", metaphor: Str.t("about.FIELDS.business.metaphor") },
    health: { label: Str.t("about.FIELDS.health.label"), motif: "hand", metaphor: Str.t("about.FIELDS.health.metaphor") },
    student: { label: "Student", motif: "book", metaphor: Str.t("about.FIELDS.student.metaphor") },
    other: { label: Str.t("about.FIELDS.other.label"), motif: "seed", metaphor: Str.t("about.FIELDS.other.metaphor") },
  };
  const { MAX_TAG, MAX_TAGS } = P.limits;
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
  const step = a => { const h = hobbyOf(a); return h ? Str.t("about.step.a_step_in_your_own", { step: HOBBIES[h].step }) : null; };
  /** 4. A kind action tied to a hobby. */
  const kind = a => { const h = hobbyOf(a); return h ? HOBBIES[h].kind : null; };
  /** 2. The field motif and metaphor. */
  const motif = a => (a && a.field ? FIELDS[a.field].motif : null);
  const metaphor = a => (a && a.field ? FIELDS[a.field].metaphor : null);
  /** 5. Anchor suggestion in words. */
  function flowWords(a) {
    const hs = a ? a.hobbies.slice(0, 2) : [];
    return hs.length ? Str.t("about.flowWords.your_anchor_has_room_for", { v0: hs.map(h => HOBBIES[h].flow).join(" or ") }) : null;
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
      if (!m) { errors.push(Str.t("about.should_look_like_hobbies_music", { tok: tok })); return; }
      try {
        if (m[1] === "hobbies") a.hobbies = m[2].split(",");
        else if (m[1] === "tags") a.tags = m[2].split(",").map(decodeURIComponent);
        else if (m[1] === "field") a.field = m[2];
        else a.fieldText = decodeURIComponent(m[2]);
      } catch (e) { errors.push(Str.t("about.an_about_value_can_t")); }
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
      $("ab-note").textContent = about ? Str.t("about.saved_on_this_device_it") : "Cleared.";
    });
    $("ab-clear").addEventListener("click", () => { app.state = { ...app.state, about: null }; app.save(); fillForm(); app.renderAll(); $("ab-note").textContent = "Cleared."; });
    return () => {};
  }

  MF.About = { HOBBIES, FIELDS, normalize, hobbyOf, step, kind, motif, metaphor, flowWords, extras, line, read, mount };
})(typeof window !== "undefined" ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
if (typeof module !== "undefined") module.exports = global.MF.About;
