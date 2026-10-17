// ground-ui.js — screens for the Grounding Loop (logic lives in grounding.js).
//
// Crisis rule: every piece of text typed in the loop is checked. If it reads
// as a crisis, the loop stops, nothing is saved, and the only thing shown is
// the same 988/911 box Reflect uses.

const GROUND_KEY = "mindframe-ground";
const G_PHASES = ["name", "grip", "test", "reframe", "act", "done"];
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

// ---------- Insights: a 7-day sparkline of G, plus a soft note on low streaks ----------

function groundTrendHTML() {
  const state = loadGround();
  if (!state.log || !state.log.length) return "";
  const days = Grounding.last7(state);
  const W = 320, H = 110, pad = 8;
  const x = i => pad + (i * (W - 2 * pad)) / 6;
  const y = g => H - pad - g * (H - 2 * pad);
  let path = "";
  let pen = false;
  days.forEach((d, i) => {
    if (d.G === null) { pen = false; return; }
    path += `${pen ? "L" : "M"}${x(i).toFixed(1)} ${y(d.G).toFixed(1)} `;
    pen = true;
  });
  const dots = days.map((d, i) => d.G === null ? "" :
    `<circle cx="${x(i).toFixed(1)}" cy="${y(d.G).toFixed(1)}" r="3" fill="#4e5a53"></circle>`).join("");
  const today = days[6].G !== null ? days[6].G : Grounding.currentG(state);
  const note = Grounding.needsCheckIn(state)
    ? `<p class="soft-note">It has felt heavy for a few days. Consider reaching out to someone you trust. If it ever feels like too much, call or text <strong>988</strong>.</p>`
    : "";
  return `<h2>Groundedness, last 7 days</h2>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Groundedness over the last 7 days">
      <title>Groundedness over the last 7 days</title>
      <line x1="${pad}" x2="${W - pad}" y1="${y(0.5)}" y2="${y(0.5)}" stroke="#e3ddd4" stroke-dasharray="3 4"></line>
      <path d="${path}" fill="none" stroke="#8d9a91" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></path>
      ${dots}
    </svg>
    <p class="quiet small">Latest: ${Math.round(today * 100)} of 100</p>
    ${note}`;
}

// Optional: index.html?view=ground (or insights, journal) opens that tab.
const groundStartView = new URLSearchParams(location.search).get("view");
if (["ground", "journal", "insights"].includes(groundStartView)) showView(groundStartView);
