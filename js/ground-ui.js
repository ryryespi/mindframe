// ground-ui.js — screens for the Grounding Loop (logic lives in grounding.js).
//
// Crisis rule: every piece of text typed in the loop is checked. If it reads
// as a crisis, the loop stops, nothing is saved, and the only thing shown is
// the same 988/911 box Reflect uses.

const GROUND_KEY = "mindframe-ground";
const G_PHASES = ["name", "grip", "test", "reframe", "act", "story", "done"];
const STORY_COUNT_KEY = "mindframe-stories-read";
let gDraft = null;

function loadGround() {
  try { return JSON.parse(localStorage.getItem(GROUND_KEY) || "{}"); }
  catch (err) { return {}; }
}

function saveGround(state) {
  localStorage.setItem(GROUND_KEY, JSON.stringify(state));
}

function showG(name) {
  G_PHASES.forEach(id => $("g-" + id).classList.toggle("hidden", id !== name));
}

function resetGround() {
  gDraft = null;
  ["g-thought", "g-see", "g-real", "g-step"].forEach(id => { $(id).value = ""; });
  document.querySelectorAll("#view-ground .chip").forEach(c => c.setAttribute("aria-pressed", "false"));
  $("g-finish").disabled = true;
  showG("name");
}

// Stop everything and hand over to the crisis box. Nothing is written.
function groundCrisis() {
  resetGround();
  showView("reflect");
  showCrisis();
}

function gCheckCrisis(...texts) {
  if (texts.some(t => Grounding.isCrisis(t))) { groundCrisis(); return true; }
  return false;
}

const gGripWords = v => v < 0.25 ? "A light grip" : v < 0.5 ? "Some grip" : v < 0.75 ? "A strong grip" : "A very strong grip";
const gTrueWords = v => v < 0.25 ? "Hard to believe yet" : v < 0.5 ? "A little true" : v < 0.75 ? "Mostly true" : "Feels true";

function gSlider(input, out, words) {
  $(out).textContent = words(Number($(input).value));
}

function gPick(group, btn) {
  group.querySelectorAll(".chip").forEach(c => c.setAttribute("aria-pressed", c === btn ? "true" : "false"));
}

// Step 1: name it.
$("g-name-form").addEventListener("submit", event => {
  event.preventDefault();
  const text = $("g-thought").value.trim();
  if (!text) return;
  const read = Grounding.read(text);
  if (read.crisis) { groundCrisis(); return; }
  gDraft = { read, kind: "", r: null };
  $("g-labels").innerHTML = read.labels.length
    ? read.labels.map(l => `<span class="tag">${esc(l)}</span>`).join("")
    : `<span class="quiet small">No strong mirage words found.</span>`;
  $("g-m").value = read.suggestedM;
  gSlider("g-m", "g-m-words", gGripWords);
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

$("g-again").addEventListener("click", resetGround);

// ---------- Stories: made from templates, shown with textContent, never saved ----------

function gTellStory(fresh) {
  if (!gDraft) return;
  const s = gDraft.story;
  if (fresh) s.seed = Math.floor(Math.random() * 1e9);
  const story = Stories.tell({
    read: gDraft.read,
    thought: $("g-thought").value,
    reframe: $("g-real").value,
    step: s.from === "act" ? $("g-step").value : "",
    faith: $("g-faith").checked,
    you: $("g-you").checked,
    seed: s.seed,
    avoid: fresh ? s.lastKey : null,
  });
  if (story.crisis) { groundCrisis(); return; }
  s.lastKey = story.key;
  $("g-story-text").textContent = story.text;
  $("g-story-tag").textContent = "Guide: " + story.tag;
  if (fresh) {
    const n = Number(localStorage.getItem(STORY_COUNT_KEY) || 0) + 1;
    localStorage.setItem(STORY_COUNT_KEY, String(n)); // a count only
  }
}

document.querySelectorAll(".g-story-open").forEach(btn => {
  btn.addEventListener("click", () => {
    if (!gDraft) return;
    gDraft.story = { from: btn.dataset.from, seed: 0, lastKey: null };
    // Faith starts on only for hidden-meaning thoughts. The toggle is yours.
    $("g-faith").checked = Stories.arcFor(gDraft.read) === "meaning";
    $("g-you").checked = false;
    showG("story");
    gTellStory(true);
  });
});

$("g-story-again").addEventListener("click", () => gTellStory(true));
// Toggles re-tell the same story with or without the change.
$("g-faith").addEventListener("change", () => gTellStory(false));
$("g-you").addEventListener("change", () => gTellStory(false));
$("g-story-back").addEventListener("click", () => {
  if (!gDraft) return;
  showG(gDraft.story && gDraft.story.from === "act" ? "act" : "reframe");
});
