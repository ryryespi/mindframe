// checkin-ui.js — the 30-second check-in, adjustable weights, the next-skill
// card, the combined 7-day chart, and the weekly reflection (all in Insights).
// Math lives in psi.js. Only numbers are stored, never text, unless you tap
// Save on the weekly reflection.

const CHECKIN_KEY = "mindframe-checkin";
const WEIGHTS_KEY = "mindframe-psi-weights";
const WEEKLY_KEY = "mindframe-weekly-last";
const BELIEVE_KEY = "mindframe-last-believability";
const BELIEVE_FRESH_MS = 24 * 3600 * 1000;
const WEIGHT_NAMES = { C: "Calm", S: "Belonging", M: "Skills used", R: "Avoidance", B: "Believing the thought" };
let ciSkills = null;

function readJSON(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v === null ? fallback : v; }
  catch (err) { return fallback; }
}

const loadCheckins = () => readJSON(CHECKIN_KEY, { log: [] });
const loadWeights = () => Psi.weights(readJSON(WEIGHTS_KEY, null));

function ciAnswers() {
  return {
    suds: Number($("ci-suds").value),
    belong: Number($("ci-belong").value),
    skills: ciSkills,
    avoid: Number($("ci-avoid").value),
    believe: Number($("ci-believe").value),
  };
}

function ciPaintValues() {
  $("ci-suds-v").textContent = $("ci-suds").value;
  $("ci-belong-v").textContent = $("ci-belong").value;
  $("ci-avoid-v").textContent = $("ci-avoid").value;
  $("ci-believe-v").textContent = $("ci-believe").value + "%";
}

["ci-suds", "ci-belong", "ci-avoid", "ci-believe"].forEach(id => $(id).addEventListener("input", ciPaintValues));

$("ci-skills").addEventListener("click", event => {
  const btn = event.target.closest(".chip");
  if (!btn) return;
  ciSkills = btn.dataset.skills;
  $("ci-skills").querySelectorAll(".chip").forEach(c => c.setAttribute("aria-pressed", c === btn ? "true" : "false"));
  $("ci-save").disabled = false;
});

// ---------- Weights (Advanced) ----------
function paintWeights() {
  const W = loadWeights();
  $("ci-weights").innerHTML = Psi.TERMS.map(k => {
    const sign = Psi.POSITIVE.includes(k) ? "+" : "\u2212";
    return `<label for="w-${k}">${esc(WEIGHT_NAMES[k])} (${sign}) <span class="val" id="w-${k}-v">${W[k].toFixed(2)}</span></label>
      <input id="w-${k}" data-term="${k}" type="range" min="0" max="0.5" step="0.01" value="${W[k]}" />`;
  }).join("");
}

$("ci-weights").addEventListener("input", event => {
  const input = event.target.closest("input[data-term]");
  if (!input) return;
  const W = loadWeights();
  W[input.dataset.term] = Number(input.value);
  localStorage.setItem(WEIGHTS_KEY, JSON.stringify(W));
  $(`w-${input.dataset.term}-v`).textContent = Number(input.value).toFixed(2);
  if (!$("ci-result").classList.contains("hidden")) showCheckinResult();
  renderTrend();
});

$("ci-reset").addEventListener("click", () => {
  localStorage.removeItem(WEIGHTS_KEY);
  paintWeights();
  if (!$("ci-result").classList.contains("hidden")) showCheckinResult();
  renderTrend();
});

// ---------- Open, save, result ----------
function ciShow(name) {
  $("ci-start").classList.toggle("hidden", name !== "start");
  $("ci-form").classList.toggle("hidden", name !== "form");
  $("ci-result").classList.toggle("hidden", name !== "result");
}

function openCheckin() {
  const today = Psi.dayKey(Date.now());
  const prev = loadCheckins().log.find(e => e.day === today);
  $("ci-suds").value = prev ? prev.suds : 5;
  $("ci-belong").value = prev ? prev.belong : 3;
  $("ci-avoid").value = prev ? prev.avoid : 4;
  ciSkills = prev ? prev.skills : null;
  $("ci-skills").querySelectorAll(".chip").forEach(c => c.setAttribute("aria-pressed", c.dataset.skills === ciSkills ? "true" : "false"));
  $("ci-save").disabled = !ciSkills;
  // Believability starts from a recent Reflect, if there is one.
  const last = readJSON(BELIEVE_KEY, null);
  const fresh = last && Number.isFinite(last.pct) && Date.now() - last.ts < BELIEVE_FRESH_MS;
  $("ci-believe").value = prev ? prev.believe : fresh ? last.pct : 50;
  $("ci-believe-src").classList.toggle("hidden", !(fresh && !prev));
  $("ci-advanced").open = false;
  paintWeights();
  ciPaintValues();
  ciShow("form");
}

$("ci-open").addEventListener("click", openCheckin);
$("ci-redo").addEventListener("click", openCheckin);
$("ci-cancel").addEventListener("click", () => renderInsightsTop());

$("ci-form").addEventListener("submit", event => {
  event.preventDefault();
  if (!ciSkills) return;
  const answers = ciAnswers();
  const skill = Psi.nextSkill(Psi.terms(answers), loadWeights());
  const state = Psi.record(loadCheckins(), { ...answers, skill: skill.term });
  localStorage.setItem(CHECKIN_KEY, JSON.stringify(state));
  showCheckinResult();
  renderTrend();
});

function todayEntry() {
  const today = Psi.dayKey(Date.now());
  return loadCheckins().log.find(e => e.day === today) || null;
}

function showCheckinResult() {
  const entry = todayEntry();
  if (!entry) { ciShow("start"); return; }
  const W = loadWeights();
  const t = Psi.terms(entry);
  const skill = Psi.nextSkill(t, W);
  $("ci-score").textContent = `${Psi.score(t, W)} of 100`;
  const card = $("ci-skill");
  card.innerHTML = "";
  const line = document.createElement("p");
  line.innerHTML = `<span class="creature-tag">${esc(skill.creature)} suggests</span> <strong>${esc(skill.name)}.</strong> `;
  line.appendChild(document.createTextNode(skill.line));
  card.appendChild(line);
  if (skill.term === "B") {
    const go = document.createElement("button");
    go.type = "button";
    go.className = "text";
    go.textContent = "Open Ground";
    go.addEventListener("click", () => showView("ground"));
    card.appendChild(go);
  }
  ciShow("result");
}

// ---------- Combined 7-day chart ----------
function scoreByDay() {
  const W = loadWeights();
  return new Map(loadCheckins().log.map(e => [e.day, Psi.score(Psi.terms(e), W)]));
}

function groundByDay() {
  return new Map(Grounding.daily(loadGround()).map(d => [d.day, Math.round(d.G * 100)]));
}

function lineChart(series) {
  const W = 320, H = 120, pad = 10;
  const x = i => pad + (i * (W - 2 * pad)) / 6;
  const y = v => H - pad - (v / 100) * (H - 2 * pad);
  const paths = series.map(s => {
    let d = "";
    let pen = false;
    s.days.forEach((p, i) => {
      if (p.value === null) { pen = false; return; }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)} ${y(p.value).toFixed(1)} `;
      pen = true;
    });
    const dots = s.days.map((p, i) => p.value === null ? "" :
      `<circle cx="${x(i).toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="3" fill="${s.color}"></circle>`).join("");
    return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" ${s.dash ? 'stroke-dasharray="5 4"' : ""} stroke-linejoin="round" stroke-linecap="round" class="line-${s.id}"></path>${dots}`;
  }).join("");
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Check-in score and groundedness, last 7 days">
    <title>Check-in score and groundedness, last 7 days</title>
    <line x1="${pad}" x2="${W - pad}" y1="${y(50)}" y2="${y(50)}" stroke="#e3ddd4" stroke-dasharray="3 4"></line>
    ${paths}
  </svg>`;
}

function renderTrend() {
  const scores = scoreByDay();
  const ground = groundByDay();
  const root = $("trend");
  if (!scores.size && !ground.size) { root.innerHTML = ""; return; }
  const series = [
    { id: "score", name: "Check-in", color: "#4e5a53", days: Psi.last7(scores) },
    { id: "g", name: "Groundedness", color: "#b39b74", dash: true, days: Psi.last7(ground) },
  ];
  const legend = series.map(s =>
    `<span class="legend-item"><span class="swatch${s.dash ? " dash" : ""}" style="border-color:${s.color}"></span>${esc(s.name)}</span>`).join("");
  const lowG = Grounding.needsCheckIn(loadGround());
  const lowScore = Psi.lowStreak([...scores.entries()].map(([day, value]) => ({ day, value }))) >= 3;
  const note = lowG || lowScore
    ? `<p class="soft-note">It has felt heavy for a few days. Consider reaching out to someone you trust. If it ever feels like too much, call or text <strong>988</strong>.</p>`
    : "";
  root.innerHTML = `<h2>Last 7 days</h2>${lineChart(series)}<p class="legend">${legend}</p>${note}`;
}

// ---------- Weekly reflection ----------
function weeklyData() {
  const W = loadWeights();
  const checkins = loadCheckins().log.map(e => ({ day: e.day, score: Psi.score(Psi.terms(e), W), skill: e.skill }));
  const ground = ((loadGround().log) || []).map(e => ({ day: e.day, G: e.G, patterns: e.patterns || [] }));
  return { checkins, ground };
}

function renderWeekly() {
  const card = $("weekly");
  const data = weeklyData();
  if (!Psi.weeklyDue({ ...data, lastWeekly: localStorage.getItem(WEEKLY_KEY) })) {
    card.classList.add("hidden");
    card.innerHTML = "";
    return;
  }
  const sum = Psi.weeklySummary({ ...data, labels: Grounding.LABELS });
  const rows = [
    sum.avgScore !== null ? `Average check-in: ${sum.avgScore}` : "",
    sum.avgG !== null ? `Average groundedness: ${sum.avgG}` : "",
    sum.pattern ? `Pattern that came up most: ${sum.pattern}` : "",
    sum.skill ? `Skill suggested most: ${sum.skill}` : "",
  ].filter(Boolean).map(r => `<li>${esc(r)}</li>`).join("");
  card.innerHTML = `<h2>Your week</h2>
    <ul class="plain">${rows}</ul>
    <label for="weekly-answer">What helped most this week?</label>
    <textarea id="weekly-answer" rows="2" class="short" placeholder="Optional. Not saved unless you tap Save."></textarea>
    <div class="row">
      <button type="button" id="weekly-save" class="text">Save to journal</button>
      <button type="button" id="weekly-dismiss" class="text">Dismiss</button>
    </div>`;
  card.classList.remove("hidden");
  $("weekly-dismiss").addEventListener("click", () => {
    localStorage.setItem(WEEKLY_KEY, Psi.dayKey(Date.now()));
    renderWeekly();
  });
  // Crisis: drop the text, save nothing, show only the support box.
  const crisisStop = () => {
    if (!Grounding.isCrisis($("weekly-answer").value)) return false;
    $("weekly-answer").value = "";
    showView("reflect");
    showCrisis();
    return true;
  };
  $("weekly-answer").addEventListener("change", crisisStop);
  $("weekly-save").addEventListener("click", () => {
    if (crisisStop()) return;
    const text = $("weekly-answer").value.trim();
    if (text) saveJournal(loadJournal().concat({ text: "This week, what helped: " + text, date: Date.now(), categories: [], distortions: [] }));
    localStorage.setItem(WEEKLY_KEY, Psi.dayKey(Date.now()));
    renderWeekly();
  });
}

// Called by renderInsights() in app.js.
function renderInsightsTop() {
  renderWeekly();
  if (todayEntry()) showCheckinResult();
  else ciShow("start");
  renderTrend();
}

// Optional: index.html?view=ground (or insights, journal) opens that tab.
// Kept in the last script so every function exists before it runs.
const groundStartView = new URLSearchParams(location.search).get("view");
if (["ground", "journal", "insights"].includes(groundStartView)) showView(groundStartView);
