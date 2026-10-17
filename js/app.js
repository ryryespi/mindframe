// app.js — the app shell: one text box, an Update button, the words-first
// card, and five animal helpers that each open one panel.
//
//   Update (or Ctrl/Cmd+Enter) → master(text, state) → the card. Nothing is
//   computed while you type. Crisis wording shows only the 988/911 box, and
//   nothing is computed or saved.
//
// Privacy: your words are never stored, except what you save in the Writer's
// journal. The session (numbers and labels only) is kept as .mf code in
// localStorage so it is still here next time.
//
// Panels (each in its own file under js/features/):
//   Writer (Fern the Fox)       journal + stories + the path game
//   Historian (Hazel the Owl)   history, checkpoints
//   Analyzer (Remy the Raccoon) the nine movers in words
//   Scribe (Toby the Tortoise)  export / import .mf code
//   Scientist (Ada the Otter)   the math + adjust numbers and variables

(function () {
  "use strict";
  const { defaultState } = MF.Movers;
  const { master, refreshIdeal } = MF.Master;
  const KEY = "mindframe-workspace";
  const FAITH_KEY = "mindframe-faith";
  const $ = id => document.getElementById(id);

  /** A list item with plain text (never HTML). */
  function li(text, cls) { const el = document.createElement("li"); el.textContent = text; if (cls) el.className = cls; return el; }

  let state = defaultState();
  let base = state.e.slice();   // where you were before the words in the box
  let reading = null;           // the last master output (null until Update)
  let inCrisis = false;
  const resets = [];

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
    update, save, crisis, note, copy, renderAll,
    /** Mark the card as out of date after a number changed. */
    stale() { if (reading) note("Numbers changed. Tap Update to see the new reading."); },
    /** Register something to clear when the base resets (for example an open story). */
    onReset(fn) { resets.push(fn); },
    startOver,
  };

  /** Save the session as .mf code (never during a crisis) and keep the Scribe's code current. */
  function save() {
    if (inCrisis) return;
    const code = MF.Scribe.serialize(refreshIdeal(state));
    localStorage.setItem(KEY, code);
    $("code").textContent = code;
  }

  /** Show a short status line under the buttons. */
  function note(t) { $("note").textContent = t || ""; }

  /** Show or hide the crisis box. While it shows, the rest of the app is hidden. */
  function crisis(on) {
    inCrisis = on;
    $("crisis-wrap").classList.toggle("hidden", !on);
    $("body").classList.toggle("hidden", on);
    if (on) {
      reading = null;
      $("out").classList.add("hidden");
      $("crisis").innerHTML = `<p><strong>You don't have to carry this alone.</strong> What you're feeling matters, and help is available right now.</p>
        <p>Call or text <strong>988</strong> (Suicide &amp; Crisis Lifeline, US, free, 24/7). If you're in immediate danger, call <strong>911</strong>.</p>
        <p>Please also reach out to someone you trust.</p>`;
      $("crisis").focus();
    }
  }

  /**
   * Run master on what's in the box and show the card. The only place the
   * reading is made; Update, Ctrl/Cmd+Enter and explicit buttons call it.
   * @returns {boolean} false when the text reads as a crisis
   */
  function update() {
    const out = master($("input").value, { ...state, e: base });
    if (out.crisis) { crisis(true); return false; }
    if (inCrisis) crisis(false);
    reading = out;
    state = { ...state, e: out.e.slice() };
    note("");
    renderCard();
    renderAll();
    save();
    return true;
  }

  /** Fill the words-first card from the last reading. */
  function renderCard() {
    const c = MF.Words.card(state, reading, { faith: app.faith(), seed: 1 });
    $("feel").textContent = c.feeling;
    const fill = (id, list) => { const ul = $(id); ul.innerHTML = ""; list.forEach(t => ul.appendChild(li(t))); };
    fill("connect", c.connect);
    fill("affirm", c.affirmations);
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
    box.classList.toggle("hidden", !rel.length);
    $("out").classList.remove("hidden");
  }

  // ---------- Panels ----------
  const renders = [MF.Writer, MF.Historian, MF.Analyzer, MF.Scribe, MF.Scientist].map(f => f.mount(app));
  /** Re-render every panel (cheap; panels only display). */
  function renderAll() { renders.forEach(r => r()); }

  // The animal row: each friend opens one panel; tapping again closes it.
  document.querySelectorAll(".friend").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("aria-controls"), panel = $(id), open = panel.classList.contains("hidden");
      document.querySelectorAll(".panel").forEach(p => p.classList.add("hidden"));
      document.querySelectorAll(".friend").forEach(b => b.setAttribute("aria-expanded", "false"));
      if (open) {
        panel.classList.remove("hidden");
        btn.setAttribute("aria-expanded", "true");
        panel.scrollIntoView({ block: "start", behavior: "smooth" });
      }
    });
  });
  document.querySelectorAll(".panel-close").forEach(b => b.addEventListener("click", () => {
    b.closest(".panel").classList.add("hidden");
    document.querySelectorAll(".friend").forEach(x => x.setAttribute("aria-expanded", "false"));
  }));

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
    app.resetBase("");
    $("out").classList.add("hidden");
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
