// app.js — the app shell: one text box (or the feelings picker), an Update button, the words-first
// card (soft tiles with small icons), the sky-and-meadow scene, and your
// companion (a little fawn, features/companion.js) that opens one sheet.
//
//   Update (or Ctrl/Cmd+Enter) → master(text, state) → the card, every line
//   (in "Pick feelings" mode: masterPick(pick, state), the same master path on
//   the picked vector; features/picker.js),
//   composed from master's numbers by core/words.js. Nothing is
//   computed while you type. Crisis wording shows only the 988/911 box, and
//   nothing is computed, saved or grown.
//
// Privacy: your words are never stored, except what you save in the journal.
// The session (numbers and labels only, plus the companion's name and growth)
// is kept as .mf code in localStorage so it is still here next time.
//
// The companion sheet: home (name, stage, growth, six actions), then one view
// per action, each in its own file under js/features/:
//   Write a story      journal + stories + the path game + the optional
//                      public-AI comfort prompt (writer/writer.js, writer/comfort.js)
//   My days            history, checkpoints (historian.js)
//   Look closer        every insight and the nine movers in words (analyzer.js)
//   Save & share code  the freeing mix line and export / import .mf code (scribe.js, freeing.js)
//   Show the math      the math + adjust numbers and variables (scientist.js)
//   Forgive & breathe  forgive myself, forgive someone, and the patience &
//                      mindfulness practices with the breathing circle
//                      (forgiveness.js, practices.js)
//
// The scene: after Update, body[data-peace] is set to the inner-peace band
// (a-little, growing, close, steady) and style.css shifts the sky and meadow
// colors to match; it is cleared on reset and in a crisis. Dark mode follows
// prefers-color-scheme; motion follows prefers-reduced-motion.

(function () {
  "use strict";
  const { defaultState } = MF.Movers;
  const { master, masterPick, refreshIdeal } = MF.Master;
  const KEY = "mindframe-workspace";
  const FAITH_KEY = "mindframe-faith";
  const $ = id => document.getElementById(id);

  /** A list item with plain text (never HTML). */
  function li(text, cls) { const el = document.createElement("li"); el.textContent = text; if (cls) el.className = cls; return el; }

  let state = defaultState();
  let base = state.e.slice();   // where you were before the words in the box
  let reading = null;           // the last master output (null until Update)
  let inCrisis = false;
  // Virtues practised this session (the Kai shield, core/kai.js): {A, F, E, R}. In memory only, never saved.
  let session = {};
  const resets = [], crises = [], closes = [];

  // ---------- The app shell the feature panels use ----------
  const app = {
    $, li,
    get state() { return state; },
    set state(s) { state = s; },
    /** The last master output, or null before Update. */
    m: () => reading,
    /** A copy of the base vector (before the typed words). */
    base: () => base.slice(),
    /** Set one mover in the base vector by hand (Scientist sliders). */
    setBaseValue(i, x) { base[i] = x; },
    /** Start the base from the current state (after restore, import, or accepting a step), and set the text box. */
    resetBase(text) { base = state.e.slice(); $("input").value = text; reading = null; resets.forEach(fn => fn()); },
    faith: () => $("faith").checked,
    /** True while the crisis box is showing. */
    inCrisis: () => inCrisis,
    update, save, crisis, note, copy, renderAll,
    /** Mark the card as out of date after a number changed. */
    stale() { if (reading) note("Numbers changed. Tap Update to see the new reading."); },
    /** Register something to clear when the base resets (for example an open story). */
    onReset(fn) { resets.push(fn); },
    /** Register something to clear when the crisis box shows (for example the forgiveness notes, the breathing circle). */
    onCrisis(fn) { crises.push(fn); },
    /** Register something to stop when the sheet closes or switches view (the breathing circle). */
    onPanelClose(fn) { closes.push(fn); },
    /** Open the companion sheet on one view by id ("grace", "writer", …), or its home with null. */
    open: who => openPanel(who),
    /** A caring action for the companion's growth (set by features/companion.js). */
    care: () => 0,
    /** A virtue was practised this session (A, F, E or R): it counts toward the Kai shield from the next Update. */
    practised(v) { if (["A", "F", "E", "R"].includes(v)) session = { ...session, [v]: 1 }; },
    /** The virtues practised this session (a copy). */
    session: () => ({ ...session }),
    startOver,
  };

  /** Save the session as .mf code (never during a crisis) and keep the Scribe's code current. */
  function save() {
    if (inCrisis) return;
    // The companion's name, points and days ride along in the mf 4 code.
    if (app.companion) state = { ...state, pet: app.companion.snapshot() };
    const code = MF.Scribe.serialize(refreshIdeal(state));
    localStorage.setItem(KEY, code);
    $("code").textContent = code;
  }

  /** Show a short status line under the buttons. */
  function note(t) { $("note").textContent = t || ""; }

  /** Show or hide the crisis box. While it shows, the rest of the app is hidden. */
  function crisis(on) {
    inCrisis = on;
    // The public AI button is disabled in a crisis, and any prompt is cleared.
    $("comfort-go").disabled = on;
    if (on) { $("comfort").classList.add("hidden"); $("comfort-prompt").value = ""; }
    $("crisis-wrap").classList.toggle("hidden", !on);
    // The companion stays calm and quiet in a crisis (no line, no growth), and is itself again after.
    if (!on && app.redrawPet) app.redrawPet();
    $("body").classList.toggle("hidden", on);
    if (on) {
      reading = null;
      delete document.body.dataset.peace;
      crises.forEach(fn => fn());
      $("out").classList.add("hidden");
      $("card-tools").classList.add("hidden");
      closeSheet(false);
      $("crisis").innerHTML = `<p><strong>You don't have to carry this alone.</strong> What you're feeling matters, and help is available right now.</p>
        <p>Call or text <strong>988</strong> (Suicide &amp; Crisis Lifeline, US, free, 24/7). If you're in immediate danger, call <strong>911</strong>.</p>
        <p>Please also reach out to someone you trust.</p>`;
      $("crisis").focus();
    }
  }

  /**
   * Run master on what's in the box and show the card. The only place the
   * reading is made; Update, Ctrl/Cmd+Enter and explicit buttons call it.
   * @param {{care?: boolean}} [opts] care: false when the reading is not a new
   *   check-in (a restored code or checkpoint), so the companion is not awarded
   * @returns {boolean} false when the text reads as a crisis
   */
  function update(opts) {
    const picking = app.picker && app.picker.mode() === "pick";
    // Safety first: crisis wording still in the text box shows the 988/911 box even in pick mode.
    if (picking && Grounding.isCrisis($("input").value)) { crisis(true); return false; }
    const pick = picking ? app.picker.pick() : null;
    const out = picking ? masterPick(pick, { ...state, e: base, session }) : master($("input").value, { ...state, e: base, session });
    if (out.crisis) { crisis(true); return false; }
    if (inCrisis) crisis(false);
    reading = out;
    // The session keeps the reading's e, the picked levels (pick mode only) and the freeing mix (mf 3 and up).
    state = { ...state, e: out.e.slice(), pick: picking ? { e: out.pick.base.slice(), extras: out.pick.extras.slice() } : null, mix: out.freeing ? out.freeing.target.slice() : null };
    if (picking) base = out.e.slice();
    note("");
    renderCard();
    if (!opts || opts.care !== false) app.care("update");
    renderAll();
    save();
    return true;
  }

  /** Fill the words-first card from the last reading. */
  function renderCard() {
    const c = MF.Words.card(state, reading, { faith: app.faith(), seed: 1 });
    // The scene follows the inner-peace band (colors only; words stay on the card).
    if (reading.peace) document.body.dataset.peace = MF.Peace.band(reading.peace.P).replace(" ", "-");
    $("headline").textContent = c.headline;
    $("room").textContent = c.room;
    $("feel").textContent = c.feeling;
    const soft = (id, list) => { const el = $(id); el.innerHTML = ""; list.forEach(t => { const p = document.createElement("p"); p.textContent = t; el.appendChild(p); }); el.classList.toggle("hidden", !list.length); };
    soft("peace", c.peace.concat(c.peaceFaith ? [c.peaceFaith] : []));
    soft("conflict", c.conflict);
    soft("reality", c.reality);
    soft("forgive", c.forgive);
    // A tile is shown only when it has something to say.
    [["t-conflict", c.conflict], ["t-reality", c.reality], ["t-forgive", c.forgive]].forEach(([id, l]) => $(id).classList.toggle("hidden", !l.length));
    // The freeing mix tile (features/freeing.js): ease/grow, the peace band, true humility, One step.
    soft("free", c.freeing ? c.freeing.lines : []);
    $("t-free").classList.toggle("hidden", !c.freeing);
    $("free-step").textContent = c.freeing ? c.freeing.step : "";
    $("free-grace").classList.toggle("hidden", !(c.freeing && c.freeing.grace));
    $("free-try").classList.toggle("hidden", !(c.freeing && c.freeing.tryIt));
    $("step-try").classList.toggle("hidden", !c.practice);
    $("step-try").dataset.practice = c.practice ? c.practice.id : "";
    $("step-try").textContent = c.practice ? `Try it together: ${c.practice.name}` : "";
    // A practice's caution (the cold-water reset always has one) shows with the step.
    $("step-caution").textContent = c.practice && c.practice.caution ? `Caution: ${c.practice.caution}` : "";
    $("step-caution").classList.toggle("hidden", !(c.practice && c.practice.caution));
    $("forgive-open").dataset.path = reading.forgive && reading.forgive.path ? reading.forgive.path : "";
    const fill = (id, list) => { const ul = $(id); ul.innerHTML = ""; list.forEach(t => ul.appendChild(li(t))); };
    fill("connect", c.connect);
    fill("affirm", c.affirmations);
    fill("affirm-top", c.affirmTop);
    $("step").textContent = c.step;
    $("progress").textContent = c.progress;
    const rel = MF.Relationship.section(reading.found);
    const box = $("pattern");
    box.innerHTML = "";
    rel.forEach(r => {
      const h = document.createElement("span");
      h.className = "label";
      h.textContent = r.title;
      const a = document.createElement("p");
      a.textContent = r.antidote;
      const ex = document.createElement("p");
      ex.className = "quiet";
      ex.textContent = `Try: \u201C${r.example}\u201D`;
      box.append(h, a, ex);
    });
    $("t-pattern").classList.toggle("hidden", !rel.length);
    // The Kai shield tile (core/kai.js): only when outside hurt is present.
    soft("kai", c.kai);
    $("t-kai").classList.toggle("hidden", !c.kai.length);
    placeInsight(c.insight ? c.insight.id : null);
    const out = $("out");
    out.classList.remove("hidden");
    $("card-tools").classList.remove("hidden");
    // A soft, staggered fade-in for the visible tiles (none with reduced motion; see style.css).
    let i = 0;
    out.querySelectorAll(".tile").forEach(t => { if (!t.classList.contains("hidden")) t.style.setProperty("--i", i++); });
    out.classList.remove("fresh"); void out.offsetWidth; out.classList.add("fresh");
  }

  // ---------- Short card + See more ----------
  // The insight tiles live in #more in a fixed order; the one the numbers pick
  // (Words.insight) moves into #insight-slot, shown short (.compact) until See more.
  const INSIGHT_TILE = { kai: "t-kai", free: "t-free", forgive: "t-forgive", reality: "t-reality", pattern: "t-pattern", conflict: "t-conflict" };
  const MORE_ORDER = ["t-peace", "t-connect", "t-kai", "t-conflict", "t-reality", "t-forgive", "t-free", "t-pattern", "t-affirm"];
  /** Put the chosen insight tile in the slot and every other tile back in #more, in order. */
  function placeInsight(id) {
    const more = $("more"), slot = $("insight-slot"), pick = id ? INSIGHT_TILE[id] : null;
    MORE_ORDER.forEach(t => { $(t).classList.remove("compact"); more.insertBefore($(t), $("progress")); });
    if (pick) { const t = $(pick); t.classList.add("compact"); slot.appendChild(t); t.classList.toggle("compact", !expanded()); }
    setMore(false);
  }
  /** True when See more is open. */
  const expanded = () => $("more-toggle").getAttribute("aria-expanded") === "true";
  /** Open or close the See more part of the card. */
  function setMore(open) {
    $("more").classList.toggle("hidden", !open);
    $("more-toggle").setAttribute("aria-expanded", String(open));
    $("more-toggle").textContent = open ? "See less" : "See more";
    $("insight-slot").querySelectorAll(".tile").forEach(t => t.classList.toggle("compact", !open));
  }
  $("more-toggle").addEventListener("click", () => setMore(!expanded()));

  // ---------- Panels ----------
  const renders = [MF.Writer, MF.Comfort, MF.Historian, MF.Analyzer, MF.Scribe, MF.Scientist, MF.Forgive, MF.Practices, MF.Freeing, MF.Picker, MF.Companion, MF.Movies].map(f => f.mount(app));
  /** Re-render every panel (cheap; panels only display). */
  function renderAll() { renders.forEach(r => r()); }

  // ---------- The companion sheet ----------
  // One bottom sheet over the page (a modal dialog: focus moves in and stays in;
  // Close, Esc or the shade closes it, and focus goes back to what opened it).
  // It opens on the companion's home (name, stage, growth, six actions); each
  // action shows one view (the old helpers' panels) in the same sheet, with Back.
  const VIEWS = ["writer", "historian", "analyzer", "scribe", "scientist", "grace", "movies"];
  let opener = null, view = null;
  /** The sheet element. */
  const sheetEl = () => $("p-companion");
  /** The open sheet, or null. */
  const openSheet = () => (sheetEl().classList.contains("hidden") ? null : sheetEl());
  /** Show one view in the open sheet (null = the companion's home) and move focus to its title. */
  function showView(who) {
    if (view !== who) closes.forEach(fn => fn());
    view = who;
    $("pet-home").classList.toggle("hidden", !!who);
    VIEWS.forEach(v => $("p-" + v).classList.toggle("hidden", v !== who));
    $("sheet-back").classList.toggle("hidden", !who);
    $("sheet-back").setAttribute("aria-label", `Back to ${app.companion ? app.companion.get().name : "your companion"}`);
    sheetEl().scrollTop = 0;
    (who ? $(`v-${who}-title`) : $("pet-title")).focus({ preventScroll: true });
  }
  /**
   * Open the sheet on a view (or the home) — never during a crisis.
   * @param {string|null} who a view id ("grace", "writer", …) or null
   */
  function openPanel(who) {
    if (inCrisis) return;
    if (!openSheet()) {
      const active = document.activeElement;
      opener = active && active !== document.body && !active.closest(".panel") ? active : $("pet-top");
      sheetEl().classList.remove("hidden");
      $("sheet-backdrop").classList.remove("hidden");
      document.body.classList.add("sheet-open");
      document.querySelectorAll(".pet-btn").forEach(b => b.setAttribute("aria-expanded", "true"));
      view = undefined;
    }
    showView(who || null);
  }
  /** Close the sheet; with restore, give focus back to what opened it. */
  function closeSheet(restore = true) {
    const was = !!openSheet();
    sheetEl().classList.add("hidden");
    document.querySelectorAll(".pet-btn").forEach(b => b.setAttribute("aria-expanded", "false"));
    $("sheet-backdrop").classList.add("hidden");
    document.body.classList.remove("sheet-open");
    closes.forEach(fn => fn());
    view = null;
    if (was && restore) (opener && document.contains(opener) && opener.getClientRects().length && !opener.disabled ? opener : $("pet-top")).focus();
    if (was) opener = null;
  }
  /** The focusable things inside a sheet, in tab order. */
  const focusables = el => [...el.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
    .filter(x => !x.disabled && x.getClientRects().length && !x.closest(".hidden"));
  // Esc closes; Tab and Shift+Tab wrap inside the sheet (the focus trap).
  document.addEventListener("keydown", e => {
    const panel = openSheet();
    if (!panel) return;
    if (e.key === "Escape") { e.preventDefault(); closeSheet(true); return; }
    if (e.key !== "Tab") return;
    const f = focusables(panel);
    if (!f.length) { e.preventDefault(); return; }
    const first = f[0], last = f[f.length - 1], at = document.activeElement;
    // Wrap when nothing focusable is left in that direction (from a control or a view title).
    const ahead = f.some(x => at.compareDocumentPosition(x) & Node.DOCUMENT_POSITION_FOLLOWING);
    const behind = f.some(x => at.compareDocumentPosition(x) & Node.DOCUMENT_POSITION_PRECEDING);
    if (!panel.contains(at)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && (!behind || at === panel.querySelector("h2"))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && !ahead) { e.preventDefault(); first.focus(); }
  });
  // Focus that wanders out (a click on the page behind) is brought back in.
  document.addEventListener("focusin", e => { const panel = openSheet(); if (panel && !panel.contains(e.target)) panel.querySelector("h2").focus({ preventScroll: true }); });
  $("sheet-backdrop").addEventListener("click", () => closeSheet(true));
  // The companion (in the header and beside the card) opens and closes the sheet.
  document.querySelectorAll(".pet-btn").forEach(btn => btn.addEventListener("click", () => (openSheet() ? closeSheet(true) : openPanel(null))));
  document.querySelectorAll(".panel-close").forEach(b => b.addEventListener("click", () => closeSheet(true)));
  $("sheet-back").addEventListener("click", () => {
    const from = view;
    showView(null);
    const row = document.querySelector(`.act[data-view="${from}"]`);
    if (row) row.focus();
  });
  // From the card into Forgive & breathe: the One step's practice (a caring action), or the suggested forgiveness path.
  $("step-try").addEventListener("click", () => { app.care("step"); app.open("grace"); app.grace.show("practice"); app.practices.select($("step-try").dataset.practice); });
  $("forgive-open").addEventListener("click", () => { app.open("grace"); app.grace.show($("forgive-open").dataset.path || "self"); });

  // ---------- Input ----------
  $("update").addEventListener("click", update);
  $("input").addEventListener("keydown", e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); update(); } });
  // Typing never makes a reading. The one exception is safety: crisis wording
  // shows the 988/911 box at once (nothing is computed or saved), and it hides
  // again when the wording is gone.
  $("input").addEventListener("input", () => {
    const danger = Grounding.isCrisis($("input").value);
    if (danger) { if (!inCrisis) crisis(true); return; }
    if (inCrisis) crisis(false);
    if (reading) note("Tap Update to refresh the reading.");
  });
  $("faith").checked = localStorage.getItem(FAITH_KEY) === "1";
  $("faith").addEventListener("change", () => {
    localStorage.setItem(FAITH_KEY, app.faith() ? "1" : "0");
    if (reading) renderCard();
    renderAll();
  });
  $("copy").addEventListener("click", () => { if (reading) copy(MF.Words.lines(state, reading, { faith: app.faith(), seed: 1 }).join("\n"), "copied"); });

  /** Copy text to the clipboard, with a fallback for older browsers. */
  async function copy(text, where) {
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; }
    catch (err) {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      area.remove();
    }
    if (where) $(where).textContent = ok ? "Copied" : "Select the text to copy it";
    else note(ok ? "Copied." : "Select the text to copy it.");
  }

  /** Clear the numbers and checkpoints (not the journal). */
  function startOver() {
    localStorage.removeItem(KEY);
    state = defaultState();
    session = {};
    app.resetBase("");
    delete document.body.dataset.peace;
    $("out").classList.add("hidden");
    $("card-tools").classList.add("hidden");
    renderAll();
    note("");
  }

  // ---------- Start: restore the session, but show nothing until Update ----------
  const code = localStorage.getItem(KEY);
  if (code) {
    const p = MF.Scribe.parse(code);
    if (p.ok) { state = refreshIdeal(p.state); base = state.e.slice(); }
  }
  renderAll();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch(() => { /* works online without it */ });
  }
})();
