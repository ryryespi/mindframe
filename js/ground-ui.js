// ground-ui.js — the Reframe and Story outputs (logic in grounding.js, stories.js).
//
// Reframe runs the Grounding Loop on the thought in the main box:
//   Name it (grip) -> Test it -> Reframe it -> Act on it -> groundedness update.
// Every piece of text is checked; crisis wording shows only the 988/911 box
// and nothing is saved. Only numbers go into the groundedness history.

const GROUND_KEY = "mindframe-ground";
const G_PHASES = ["grip", "test", "reframe", "act", "done"];
const STORY_COUNT_KEY = "mindframe-stories-read";
let gDraft = null;
let storyCtx = null;

function loadGround() {
  try { return JSON.parse(localStorage.getItem(GROUND_KEY) || "{}"); }
  catch (err) { return {}; }
}

function saveGround(state) {
  localStorage.setItem(GROUND_KEY, JSON.stringify(state));
}

function showG(name) {
  G_PHASES.forEach(id => $("g-" + id).classList.toggle("hidden", id !== name));
  const h = $("g-" + name).querySelector("h2");
  if (h && name !== "grip") h.focus();
}

function resetGround() {
  gDraft = null;
  ["g-see", "g-real", "g-step"].forEach(id => { $(id).value = ""; });
  document.querySelectorAll("#p-reframe .chip").forEach(c => c.setAttribute("aria-pressed", "false"));
  $("g-finish").disabled = true;
}

onCrisisReset(() => {
  resetGround();
  storyCtx = null;
  $("g-story-text").textContent = "";
  $("g-story-tag").textContent = "";
});

function gCheckCrisis(...texts) {
  return checkText(...texts);
}

const gGripWords = v => v < 0.25 ? "A light grip" : v < 0.5 ? "Some grip" : v < 0.75 ? "A strong grip" : "A very strong grip";
const gTrueWords = v => v < 0.25 ? "Hard to believe yet" : v < 0.5 ? "A little true" : v < 0.75 ? "Mostly true" : "Feels true";

function gSlider(input, out, words) {
  $(out).textContent = words(Number($(input).value));
}

function gPick(group, btn) {
  group.querySelectorAll(".chip").forEach(c => c.setAttribute("aria-pressed", c === btn ? "true" : "false"));
}

// Step 1: name it, from the main box. app.js has already checked for crisis.
registerOutput("reframe", text => {
  const read = Grounding.read(text);
  if (read.crisis) { showCrisis(); return; }
  resetGround();
  equationLine("eq-reframe", text);
  gDraft = { read, kind: "", r: null };
  $("g-labels").innerHTML = read.labels.length
    ? read.labels.map(l => `<span class="tag">${esc(l)}</span>`).join("")
    : `<span class="quiet small">No strong mirage words found.</span>`;
  $("g-m").value = read.suggestedM;
  gSlider("g-m", "g-m-words", gGripWords);
  showPanel("reframe");
  showG("grip");
});

$("g-m").addEventListener("input", () => gSlider("g-m", "g-m-words", gGripWords));
$("g-h").addEventListener("input", () => gSlider("g-h", "g-h-words", gTrueWords));

// Step 2: test it.
$("g-to-test").addEventListener("click", () => {
  if (!gDraft) return;
  $("g-question").textContent = gDraft.read.question;
  showG("test");
});

$("g-test").querySelector(".chips").addEventListener("click", event => {
  const btn = event.target.closest(".chip");
  if (!btn || !gDraft) return;
  gDraft.kind = btn.dataset.kind;
  gPick(event.currentTarget, btn);
});

// Step 3: reframe it. Tapping an option copies it into the editable box.
$("g-to-reframe").addEventListener("click", () => {
  if (!gDraft || gCheckCrisis($("g-see").value)) return;
  $("g-options").innerHTML = gDraft.read.reframes.map((s, i) =>
    `<button type="button" class="option" data-i="${i}">${esc(s)}</button>`).join("");
  $("g-real").value = gDraft.read.reframes[0] || "";
  $("g-h").value = 0.5;
  gSlider("g-h", "g-h-words", gTrueWords);
  showG("reframe");
});

$("g-options").addEventListener("click", event => {
  const btn = event.target.closest(".option");
  if (!btn || !gDraft) return;
  $("g-real").value = gDraft.read.reframes[Number(btn.dataset.i)];
});

// Step 4: act on it.
$("g-to-act").addEventListener("click", () => {
  if (!gDraft || gCheckCrisis($("g-real").value)) return;
  $("g-actions").innerHTML = gDraft.read.actions.map((s, i) =>
    `<button type="button" class="option" data-i="${i}">${esc(s)}</button>`).join("");
  showG("act");
});

$("g-actions").addEventListener("click", event => {
  const btn = event.target.closest(".option");
  if (!btn || !gDraft) return;
  $("g-step").value = gDraft.read.actions[Number(btn.dataset.i)];
});

$("g-act").querySelector(".chips").addEventListener("click", event => {
  const btn = event.target.closest(".chip");
  if (!btn || !gDraft) return;
  gDraft.r = Number(btn.dataset.r);
  gPick(event.currentTarget, btn);
  $("g-finish").disabled = false;
});

// Update G and keep only the numbers (not the thought) on this phone.
$("g-finish").addEventListener("click", () => {
  if (!gDraft || gDraft.r === null) return;
  if (gCheckCrisis($("g-see").value, $("g-real").value, $("g-step").value)) return;
  const state = loadGround();
  const before = Grounding.currentG(state);
  const M = Number($("g-m").value);
  const H = Number($("g-h").value);
  const after = Grounding.updateG(before, M, H, gDraft.r);
  const next = Grounding.record(state, { G: after, M, H, r: gDraft.r, patterns: gDraft.read.patterns });
  saveGround(next);
  const pct = x => Math.round(x * 100);
  $("g-result").textContent = `Groundedness ${pct(before)} → ${pct(after)}`;
  $("g-note").textContent = gDraft.r === 1
    ? "You chose the real version. Small steps add up."
    : gDraft.r === 0
      ? "Unsure is honest. Nothing changed, and you can try the loop again later."
      : "That's okay. Noticing it is a step too. Try again when you're ready.";
  showG("done");
});

// ---------- Stories: made from templates, shown with textContent, never saved ----------

function gTellStory(fresh) {
  if (!storyCtx) return;
  const s = storyCtx;
  if (fresh) s.seed = Math.floor(Math.random() * 1e9);
  const story = Stories.tell({
    read: s.read,
    thought: s.thought,
    reframe: s.reframe,
    step: s.step,
    faith: $("g-faith").checked,
    you: $("g-you").checked,
    seed: s.seed,
    avoid: fresh ? s.lastKey : null,
  });
  if (story.crisis) { showCrisis(); return; }
  s.lastKey = story.key;
  $("g-story-text").textContent = story.text;
  $("g-story-tag").textContent = "Guide: " + story.tag;
  if (fresh) {
    const n = Number(localStorage.getItem(STORY_COUNT_KEY) || 0) + 1;
    localStorage.setItem(STORY_COUNT_KEY, String(n)); // a count only
  }
}

function openStory(ctx) {
  const eq = equationLine("eq-story", ctx.thought);
  ctx = { ...ctx, read: withEmotionArc(ctx.read, ctx.thought, eq) };
  storyCtx = { ...ctx, seed: 0, lastKey: null };
  // Faith starts on only for hidden-meaning thoughts. The toggle is yours.
  $("g-faith").checked = Stories.arcFor(ctx.read) === "meaning";
  $("g-you").checked = false;
  showPanel("story");
  gTellStory(true);
}

// Story from the main box.
registerOutput("story", text => {
  const read = Grounding.read(text);
  if (read.crisis) { showCrisis(); return; }
  openStory({ read, thought: text, reframe: "", step: "" });
});

// Story from inside the Reframe loop, using your reframe (and step, from Act).
document.querySelectorAll(".g-story-open").forEach(btn => {
  btn.addEventListener("click", () => {
    if (!gDraft) return;
    const reframe = $("g-real").value;
    const step = btn.dataset.from === "act" ? $("g-step").value : "";
    if (gCheckCrisis($("thought").value, $("g-see").value, reframe, step)) return;
    selectChip("story", false);
    openStory({ read: gDraft.read, thought: $("thought").value, reframe, step });
  });
});

$("g-story-again").addEventListener("click", () => gTellStory(true));
// Toggles re-tell the same story with or without the change.
$("g-faith").addEventListener("change", () => gTellStory(false));
$("g-you").addEventListener("change", () => gTellStory(false));
