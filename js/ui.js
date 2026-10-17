// ui.js — the one tool. Words are read live and never stored, except text you
// save with Journal. Every result comes from Model.master(text, state); the card
// shows words (feelings, connections, affirmations, one step, progress) and the
// numbers stay behind "Show the math". The session is kept as .mf code.

const KEY = "mindframe-workspace";
const FAITH_KEY = "mindframe-faith";
const JOURNAL_KEY = "mindframe-journal";
const $ = id => document.getElementById(id);
const f2 = x => x.toFixed(2);

let state = Model.defaultState();
let base = state.e.slice();
let seed = 1, story = null, timer = null, inCrisis = false, game = null;
let m = null; // the master output for what's on screen

function setBase() { base = state.e.slice(); }
function save() { if (!inCrisis) localStorage.setItem(KEY, Model.serialize(Model.refreshIdeal(state))); }
function note(t) { $("note").textContent = t || ""; }

function load() {
  const code = localStorage.getItem(KEY);
  if (!code) return;
  const p = Model.parse(code);
  if (p.ok) { state = Model.refreshIdeal(p.state); setBase(); }
}

function crisis(on) {
  inCrisis = on;
  $("crisis-wrap").classList.toggle("hidden", !on);
  $("body").classList.toggle("hidden", on);
  if (on) {
    hideStory();
    $("crisis").innerHTML = `<p><strong>You don't have to carry this alone.</strong> What you're feeling matters, and help is available right now.</p>
      <p>Call or text <strong>988</strong> (Suicide &amp; Crisis Lifeline, US, free, 24/7). If you're in immediate danger, call <strong>911</strong>.</p>
      <p>Please also reach out to someone you trust.</p>`;
    $("crisis").focus();
  }
}

// ---------- Live card: everything comes from Model.master ----------
function update() {
  const out = Model.master($("input").value, { ...state, e: base });
  if (out.crisis) { crisis(true); return false; }
  if (inCrisis) crisis(false);
  m = out;
  state = { ...state, e: m.e.slice() };
  render();
  save();
  return true;
}
// Re-read the master output for the current numbers (after a restore, import, or variable change).
function recompute() {
  m = Model.master($("input").value, { ...state, e: base });
  if (m.crisis) { crisis(true); return; }
  state = { ...state, e: m.e.slice() };
}

function li(text, cls) { const el = document.createElement("li"); el.textContent = text; if (cls) el.className = cls; return el; }

function render() {
  if (!m || m.crisis) recompute();
  if (!m || m.crisis) return;
  const c = Model.card(state, m, { faith: $("faith").checked, seed });
  $("feel").textContent = c.feeling;
  const con = $("connect");
  con.innerHTML = "";
  c.connect.forEach(t => con.appendChild(li(t)));
  const aff = $("affirm");
  aff.innerHTML = "";
  c.affirmations.forEach(t => aff.appendChild(li(t)));
  $("step").textContent = c.step;
  $("progress").textContent = c.progress;
  // Show the math (collapsed by default)
  const ul = $("movers");
  ul.innerHTML = "";
  const mv = Model.shown(m.e);
  if (!mv.length) ul.appendChild(li("Nothing strong is moving."));
  mv.forEach(x => {
    const el = document.createElement("li");
    el.className = x.group;
    const name = document.createElement("span");
    name.textContent = x.label + (x.group === "grounding" && x.v < 0.5 ? " (low)" : "");
    const bar = document.createElement("span");
    bar.className = "bar";
    const fill = document.createElement("span");
    fill.style.width = `${Math.round(x.v * 100)}%`;
    bar.appendChild(fill);
    const v = document.createElement("span");
    v.className = "v";
    v.textContent = f2(x.v);
    el.append(name, bar, v);
    ul.appendChild(el);
  });
  const ml = $("math-lines");
  ml.innerHTML = "";
  Model.mathLines(state, m).forEach(t => ml.appendChild(li(t)));
  $("story-go").disabled = m.d < 0.005;
  renderSliders();
  renderHistory();
  renderVars();
  renderJournal();
  $("code").textContent = Model.serialize(Model.refreshIdeal(state));
}

// ---------- Adjust numbers ----------
function buildSliders() {
  const box = $("sliders");
  Model.NAMES.forEach((n, i) => {
    const lab = document.createElement("label");
    const name = document.createElement("span");
    name.textContent = Model.label(n);
    const inp = document.createElement("input");
    Object.assign(inp, { type: "range", min: 0, max: 1, step: 0.01 });
    inp.dataset.i = i;
    inp.setAttribute("aria-label", Model.label(n));
    const v = document.createElement("span");
    v.className = "v mono";
    lab.append(name, inp, v);
    box.appendChild(lab);
    inp.addEventListener("input", () => {
      base[i] = Math.round(Number(inp.value) * 100) / 100;
      update();
    });
  });
}
function renderSliders() {
  $("sliders").querySelectorAll("label").forEach((lab, i) => {
    const inp = lab.querySelector("input");
    if (document.activeElement !== inp) inp.value = state.e[i];
    lab.querySelector(".v").textContent = f2(state.e[i]);
  });
}

$("input").addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(update, 350); });
$("faith").checked = localStorage.getItem(FAITH_KEY) === "1";
$("faith").addEventListener("change", () => {
  localStorage.setItem(FAITH_KEY, $("faith").checked ? "1" : "0");
  if (story) tell(); else render();
});

$("copy").addEventListener("click", () => copy(Model.lines(state, m, { faith: $("faith").checked, seed }).join("\n"), "copied"));

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

// ---------- Checkpoints and history ----------
$("save").addEventListener("click", () => {
  if (!update()) return;
  state = Model.addCheckpoint(state, state.cps.length ? "" : "start");
  recompute();
  render();
  save();
  note("Checkpoint saved (numbers only).");
});

function renderHistory() {
  const wk = $("week");
  wk.innerHTML = "";
  Model.weekLines(state).forEach(l => wk.appendChild(li(l)));
  const w = Model.week(state);
  const today = Model.stamp(Date.now()).slice(0, 10);
  const t = w.length && w[w.length - 1].day === today ? w[w.length - 1] : null;
  $("today").textContent = !t ? "Save a checkpoint or accept a step to record today."
    : !t.dir ? "Today is the first day on the map."
    : { up: "Today points toward home.", side: "Today moved sideways. That still counts as showing up.", down: "Today drifted away from home. One small step is enough." }[t.dir];
  const mathWeek = $("week-math");
  mathWeek.innerHTML = "";
  Model.weekMath(state).forEach(l => mathWeek.appendChild(li(l)));
  const ol = $("cps");
  ol.innerHTML = "";
  $("cps-empty").classList.toggle("hidden", state.cps.length > 0);
  state.cps.slice().reverse().forEach(cp => {
    const item = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cp";
    btn.textContent = `${cp.label} \u00B7 ${new Date(cp.t).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}`;
    btn.setAttribute("aria-label", `Restore checkpoint ${cp.n}, ${cp.label}`);
    btn.addEventListener("click", () => {
      state = Model.restore(state, cp.n);
      setBase();
      $("input").value = "";
      hideStory();
      recompute();
      render();
      save();
      note(`Restored checkpoint ${cp.n}. New words add to it.`);
    });
    item.appendChild(btn);
    ol.appendChild(item);
  });
}

// ---------- Story, accepted step, path game ----------
function hideStory() { story = null; game = null; $("story").classList.add("hidden"); $("game").classList.add("hidden"); }

function tell() {
  if (!update()) return;
  story = Model.story(state, m, { seed, faith: $("faith").checked });
  if (!story) { hideStory(); return; }
  $("story-tag").textContent = "Guide: " + story.tag;
  $("story-text").textContent = story.text;
  $("story").classList.remove("hidden");
  $("game").classList.add("hidden");
  game = null;
}
$("story-go").addEventListener("click", () => { seed = 1; tell(); });
$("story-again").addEventListener("click", () => { seed += 1; tell(); });
$("accept").addEventListener("click", () => {
  if (!story || inCrisis) return;
  state = Model.acceptStep(state);
  setBase();
  $("input").value = "";
  hideStory();
  recompute();
  render();
  save();
  note("Step accepted and saved as a checkpoint. The next reading starts from here.");
});

$("play").addEventListener("click", () => {
  if (!story) return;
  const g = Model.game(state, m, { thought: $("input").value.trim(), faith: $("faith").checked, seed });
  if (g.crisis) { crisis(true); return; }
  game = { g, i: 0, tried: 0 };
  $("game").classList.remove("hidden");
  scene();
});

function scene() {
  const { g, i } = game;
  const box = $("game-choices");
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
  $("game-count").textContent = `${i + 1} of ${g.scenes.length}`;
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
$("game-next").addEventListener("click", () => { if (game) { game.i += 1; scene(); } });

// ---------- Journal (explicit saves only) ----------
function journal() { try { return JSON.parse(localStorage.getItem(JOURNAL_KEY) || "[]"); } catch (e) { return []; } }
function renderJournal() {
  const items = journal().slice().reverse();
  const ul = $("journal-list");
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
$("journal-save").addEventListener("click", () => {
  const text = $("input").value.trim();
  if (Model.fromText(text).crisis) { crisis(true); return; }
  if (!text) { note("Write something above to save it in your journal."); return; }
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(journal().concat({ text, date: Date.now() })));
  renderJournal();
  note("Saved in your journal on this device.");
});
$("journal-clear").addEventListener("click", () => {
  if (!confirm("Clear every journal entry on this device?")) return;
  localStorage.setItem(JOURNAL_KEY, "[]");
  renderJournal();
});

// ---------- Variables ----------
function input(kind, key, labelText, min, max, note_) {
  const lab = document.createElement("label");
  lab.title = note_ || "";
  const span = document.createElement("span");
  span.textContent = labelText;
  const inp = document.createElement("input");
  Object.assign(inp, { type: "number", min, max, step: 0.01 });
  inp.dataset.kind = kind;
  inp.dataset.key = key;
  inp.setAttribute("aria-label", `${labelText}${note_ ? ": " + note_ : ""}`);
  lab.append(span, inp);
  return lab;
}
function buildVars() {
  const grid = $("var-grid");
  Model.GROUND.forEach(n => grid.appendChild(input("home", n, `h.${n}`, 0, 1, `home target for ${n}`)));
  Model.VAR_SPEC.forEach(([k, , min, max, n]) => grid.appendChild(input("var", k, k, min, max, n)));
  Model.MAIN_PAIRS.forEach(([a, b]) => grid.appendChild(input("w", `${a}>${b}`, `${a}\u2192${b}`, -1, 1, `how much ${a} changes ${b}`)));
  grid.addEventListener("change", ev => {
    const inp = ev.target;
    if (!inp.dataset.kind) return;
    const { kind, key } = inp.dataset, x = Number(inp.value), notes = [];
    if (kind === "home") {
      const c = Math.min(1, Math.max(0, Math.round((Number.isFinite(x) ? x : 0) * 100) / 100));
      if (c !== x) notes.push(`h.${key}: kept inside 0\u20131`);
      const home = state.home.slice();
      home[Model.NAMES.indexOf(key)] = c;
      state = { ...state, home };
    } else if (kind === "var") {
      const v = Model.validateVars({ ...state.vars, [key]: x });
      state = { ...state, vars: v.vars };
      notes.push(...v.notes);
    } else {
      const [a, b] = key.split(">");
      const c = Math.min(1, Math.max(-1, Number.isFinite(x) ? x : 0));
      if (c !== x) notes.push(`${a}\u2192${b}: kept inside \u22121 to 1`);
      state = Model.setWeight(state, a, b, c);
    }
    $("var-notes").textContent = notes.join("; ");
    inp.blur();
    recompute();
    render();
    save();
  });
}
function renderVars() {
  const W = Model.weights(state.w), N = Model.NAMES;
  $("var-grid").querySelectorAll("input").forEach(inp => {
    const { kind, key } = inp.dataset;
    const v = kind === "home" ? state.home[N.indexOf(key)] : kind === "var" ? state.vars[key] : W[N.indexOf(key.split(">")[0])][N.indexOf(key.split(">")[1])];
    if (document.activeElement !== inp) inp.value = Number(v).toFixed(2);
  });
}
$("vars-reset").addEventListener("click", () => {
  state = { ...state, vars: Model.defaultVars(), home: Model.homeVec(), w: [] };
  $("var-notes").textContent = "";
  recompute();
  render();
  save();
});

// ---------- Export / Import ----------
$("code-open").addEventListener("click", () => { $("code-sec").open = true; $("code-sec").scrollIntoView({ block: "start" }); });
$("copy-code").addEventListener("click", () => copy($("code").textContent));
$("download").addEventListener("click", () => {
  const blob = new Blob([$("code").textContent], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `mindframe-${Model.stamp(Date.now()).slice(0, 10)}.mf.txt`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
});
$("import-file").addEventListener("change", e => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  if (file.size > 64 * 1024) { importErrors(["That file is too big for .mf code (over 64 KB)."]); return; }
  const r = new FileReader();
  r.onload = () => { $("import-text").value = String(r.result || ""); };
  r.readAsText(file);
});
function importErrors(list) { const ul = $("import-errors"); ul.innerHTML = ""; list.forEach(m => ul.appendChild(li(m))); }
$("import-go").addEventListener("click", () => {
  const p = Model.parse($("import-text").value);
  if (p.crisis) { crisis(true); return; }
  if (!p.ok) { importErrors(p.errors.slice(0, 8).map(x => x.msg)); return; }
  state = Model.refreshIdeal(p.state);
  setBase();
  $("input").value = "";
  $("import-text").value = "";
  importErrors([]);
  hideStory();
  recompute();
  render();
  save();
  note(p.from === 1 ? p.notes.join(" ") : "Restored from code. New words add to it.");
});
$("clear").addEventListener("click", () => {
  if (!confirm("Start over? This clears the numbers and checkpoints on this device (not your journal).")) return;
  localStorage.removeItem(KEY);
  state = Model.defaultState();
  setBase();
  $("input").value = "";
  hideStory();
  recompute();
  render();
  note("");
});

// ---------- Start ----------
buildSliders();
buildVars();
load();
recompute();
render();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch(() => { /* works online without it */ });
}
