// app.js — the one screen.
//
// One input ("What's on your mind?"), one row of choices for what comes back,
// and one output area. Every action checks the input for crisis wording first.
// Crisis -> only the 988/911 box; nothing is generated and nothing is saved.
//
// Privacy: thought text is stored only when you tap "Save what's in the box"
// in Journal. Everything else keeps numbers or nothing at all.
//
// The other output parts (ground-ui, play-ui, checkin-ui) register themselves
// with registerOutput(). start.js picks the first choice and handles old links.

const $ = id => document.getElementById(id);
const JOURNAL_KEY = "mindframe-journal";
const CHIP_KEY = "mindframe-chip";
const CHIPS = ["equations", "reframe", "coach", "story", "play", "checkin", "journal", "insights"];
const NEEDS_WORDS = new Set(["equations", "reframe", "coach", "story"]);
const PANELS = ["hint", "crisis", "equations", "reframe", "coach", "story", "play", "checkin", "journal", "insights"];
// Panels whose text is worth copying get a small Copy button.
const COPYABLE = new Set(["equations", "reframe", "coach", "story", "checkin", "journal", "insights"]);

const COACHES = [
  { id: "dbt", title: "DBT Coach", render: dbtCoach },
  { id: "philo", title: "Philosopher", render: philosopher },
  { id: "equation", title: "Thought Equation", render: thoughtEquation },
  { id: "compassion", title: "Compassion Coach", render: compassionCoach },
  { id: "cbt", title: "CBT Coach", render: cbtCoach },
];

const VALUES = ["Kindness", "Learning", "Care", "Courage", "Honesty", "Patience"];

const CATEGORY_NAMES = {
  hopelessness: "Hopelessness",
  selfBlame: "Self-blame",
  urge: "Urge",
  anger: "Anger",
  anxiety: "Anxiety",
};

let currentChip = "equations";
let insightIndex = -1;
const outputs = {};
const crisisResets = [];

// Output parts call this to say "I can answer this choice".
function registerOutput(chip, fn) { outputs[chip] = fn; }
// ...and this to clear their drafts when a crisis stops everything.
function onCrisisReset(fn) { crisisResets.push(fn); }

// ---------- Panels ----------

function showPanel(name) {
  PANELS.forEach(id => $("p-" + id).classList.toggle("hidden", id !== name));
  $("copy").classList.toggle("hidden", !COPYABLE.has(name));
  $("copied").textContent = "";
}

function hint(text) {
  $("hint-text").textContent = text;
  showPanel("hint");
}

// ---------- Crisis ----------

function showCrisis() {
  crisisResets.forEach(fn => { try { fn(); } catch (err) { /* keep going: the box must show */ } });
  $("crisis").innerHTML = `<p><strong>You don't have to carry this alone.</strong> What you're feeling matters, and help is available right now.</p>
    <p>Call or text <strong>988</strong> (Suicide &amp; Crisis Lifeline, US, free, 24/7). If you're in immediate danger, call <strong>911</strong>.</p>
    <p>Please also reach out to someone you trust.</p>`;
  showPanel("crisis");
  $("crisis").focus();
}

// True (and the support box is showing) when any text reads as a crisis.
function checkText(...texts) {
  if (texts.some(t => t && analyze(String(t)).crisis)) { showCrisis(); return true; }
  return false;
}

$("crisis-again").addEventListener("click", () => {
  $("thought").value = "";
  hint("Write a thought, pick what you'd like back, then tap Show me.");
  $("thought").focus();
});

// ---------- Choices ----------

function selectChip(chip, run = true) {
  if (!CHIPS.includes(chip)) chip = "equations";
  currentChip = chip;
  localStorage.setItem(CHIP_KEY, chip); // only the name of the choice
  document.querySelectorAll(".choice").forEach(btn => {
    const on = btn.dataset.chip === chip;
    btn.setAttribute("aria-checked", on ? "true" : "false");
    btn.tabIndex = on ? 0 : -1;
  });
  if (run) runChip();
}

function runChip() {
  const text = $("thought").value.trim();
  if (checkText(text)) return;
  if (NEEDS_WORDS.has(currentChip) && !text) {
    hint("Write a thought above first, then tap Show me.");
    return;
  }
  const fn = outputs[currentChip];
  if (fn) fn(text);
}

const choices = $("choices");
choices.addEventListener("click", event => {
  const btn = event.target.closest(".choice");
  if (btn) selectChip(btn.dataset.chip);
});

// Arrow keys move between choices (radio group); Enter or Space shows it.
choices.addEventListener("keydown", event => {
  const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
  if (!(event.key in keys)) return;
  event.preventDefault();
  const i = (CHIPS.indexOf(currentChip) + keys[event.key] + CHIPS.length) % CHIPS.length;
  selectChip(CHIPS[i], false);
  document.querySelector(`.choice[data-chip="${CHIPS[i]}"]`).focus();
});

$("ask").addEventListener("submit", event => {
  event.preventDefault();
  runChip();
});

// Ctrl/Cmd + Enter in the box also shows the answer.
$("thought").addEventListener("keydown", event => {
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    runChip();
  }
});

// ---------- Copy: the visible output text, as plain text ----------

function visibleCopyText() {
  const panel = document.querySelector(".panel:not(.hidden)");
  if (!panel) return "";
  const parts = [...panel.querySelectorAll(".copyable")]
    .filter(node => node.offsetParent !== null && !node.closest(".hidden"))
    .map(node => node.innerText.trim())
    .filter(Boolean);
  return (parts.length ? parts : [panel.innerText.trim()]).join("\n\n");
}

$("copy").addEventListener("click", async () => {
  const text = visibleCopyText();
  if (!text) return;
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
  $("copied").textContent = ok ? "Copied" : "Select the text to copy it";
});

// ---------- Coach: one coach first, the others on request ----------

registerOutput("coach", text => {
  const signals = analyze(text);
  const bestId = bestCoach(signals);
  const best = COACHES.find(coach => coach.id === bestId) || COACHES[3];
  const rest = COACHES.filter(coach => coach.id !== best.id);
  $("best-coach").innerHTML = `<h2>${best.title}</h2>${best.render(signals)}`;
  $("other-angles").innerHTML = rest.map(coach =>
    `<article class="card coach"><h2>${coach.title}</h2>${coach.render(signals)}</article>`
  ).join("");
  $("other-angles").classList.add("hidden");
  $("more-angles").setAttribute("aria-expanded", "false");
  $("more-angles").textContent = "See other angles";
  document.querySelectorAll("#p-coach [id='evidence-mount']").forEach(mount => mountEvidence(mount));
  renderValues(signals);
  equationLine("eq-coach", text);
  showPanel("coach");
});

$("more-angles").addEventListener("click", () => {
  const open = $("more-angles").getAttribute("aria-expanded") === "true";
  $("other-angles").classList.toggle("hidden", open);
  $("more-angles").setAttribute("aria-expanded", open ? "false" : "true");
  $("more-angles").textContent = open ? "See other angles" : "Hide other angles";
});

// Shown only when the analyzer noticed big-ambition language. Nothing here is saved.
function renderValues(signals) {
  const card = $("values-card");
  if (!signals.grandiose) {
    card.classList.add("hidden");
    card.innerHTML = "";
    return;
  }
  const chips = VALUES.map(value =>
    `<button type="button" class="chip" data-value="${esc(value)}" aria-pressed="false">${esc(value)}</button>`
  ).join("");
  card.innerHTML = `
    <h2>One small step</h2>
    <p>A big hope is here. It can begin with one action today.</p>
    <div class="chips" role="group" aria-label="A value">${chips}</div>
    <label for="small-step">One action today</label>
    <input id="small-step" type="text" maxlength="140" autocomplete="off" />
    <p class="quiet">If ideas feel racing or overwhelming, talk with someone you trust.</p>`;
  card.classList.remove("hidden");
  card.querySelectorAll(".chip").forEach(btn => {
    btn.addEventListener("click", () => {
      card.querySelectorAll(".chip").forEach(other => other.setAttribute("aria-pressed", other === btn ? "true" : "false"));
    });
  });
  $("small-step").addEventListener("change", () => checkText($("small-step").value));
}

// ---------- Evidence lists and the believability sentence ----------

function mountEvidence(mount) {
  const D = Number(mount.dataset.d || 0);
  const fore = [];
  const against = [];
  mount.innerHTML = `
    <form class="ev-add" data-side="for">
      <input type="text" maxlength="160" placeholder="A fact that supports it" aria-label="Evidence for" />
      <button type="submit" class="text">Add</button>
    </form>
    <ul class="ev-list" data-list="for"></ul>
    <form class="ev-add" data-side="against">
      <input type="text" maxlength="160" placeholder="A fact that doesn't" aria-label="Evidence against" />
      <button type="submit" class="text">Add</button>
    </form>
    <ul class="ev-list" data-list="against"></ul>
    <p class="score-words" aria-live="polite"></p>`;

  function paint() {
    mount.querySelector('[data-list="for"]').innerHTML = fore.map((item, i) =>
      `<li><span>${esc(item)}</span><button type="button" class="text" data-remove="for" data-i="${i}">Remove</button></li>`
    ).join("");
    mount.querySelector('[data-list="against"]').innerHTML = against.map((item, i) =>
      `<li><span>${esc(item)}</span><button type="button" class="text" data-remove="against" data-i="${i}">Remove</button></li>`
    ).join("");
    const result = believability(fore.length, against.length, D);
    mount.querySelector(".score-words").textContent = believabilityWords(result);
    // The check-in can start from this number. Only the number and time are kept.
    if (result) localStorage.setItem("mindframe-last-believability", JSON.stringify({ pct: result.pct, ts: Date.now() }));
  }

  mount.addEventListener("submit", event => {
    const form = event.target.closest(".ev-add");
    if (!form) return;
    event.preventDefault();
    const input = form.querySelector("input");
    const text = input.value.trim();
    if (!text) return;
    if (checkText(text)) return; // crisis: support box only, nothing kept
    (form.dataset.side === "for" ? fore : against).push(text);
    input.value = "";
    paint();
  });

  mount.addEventListener("click", event => {
    const btn = event.target.closest("[data-remove]");
    if (!btn || !mount.contains(btn)) return;
    const list = btn.dataset.remove === "for" ? fore : against;
    list.splice(Number(btn.dataset.i), 1);
    paint();
  });

  paint();
}

// ---------- Journal: only what you choose to save, on this phone ----------

function loadJournal() {
  try { return JSON.parse(localStorage.getItem(JOURNAL_KEY) || "[]"); }
  catch (err) { return []; }
}

function saveJournal(entries) {
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries));
}

function renderJournal() {
  const items = loadJournal().slice().reverse();
  $("journal-list").innerHTML = items.length
    ? items.map(entry => {
        const when = new Date(entry.date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
        return `<li><time>${esc(when)}</time><p>${esc(entry.text)}</p></li>`;
      }).join("")
    : `<li><p class="quiet">Nothing kept yet.</p></li>`;
  $("clear-journal").classList.toggle("hidden", items.length === 0);
}

registerOutput("journal", () => {
  $("journal-note").textContent = "";
  renderJournal();
  showPanel("journal");
});

$("journal-save").addEventListener("click", () => {
  const text = $("thought").value.trim();
  if (checkText(text)) return;
  if (!text) { $("journal-note").textContent = "Write something above to save it."; return; }
  const signals = analyze(text);
  saveJournal(loadJournal().concat({ text, date: Date.now(), categories: signals.categories, distortions: signals.distortions }));
  $("journal-note").textContent = "Saved on this phone.";
  renderJournal();
});

$("clear-journal").addEventListener("click", () => {
  saveJournal([]);
  insightIndex = -1;
  renderJournal();
});

// ---------- Insights: weekly patterns from saved Journal entries ----------

function mondayStart(timestamp) {
  const date = new Date(timestamp);
  const day = date.getDay();
  const back = day === 0 ? 6 : day - 1;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - back);
  return date.getTime();
}

function renderInsights() {
  const root = $("insights");
  const grouped = new Map();
  loadJournal().forEach(entry => {
    const start = mondayStart(entry.date || Date.now());
    if (!grouped.has(start)) grouped.set(start, []);
    grouped.get(start).push(entry);
  });
  const weeks = [...grouped.entries()].sort((a, b) => a[0] - b[0]);
  if (!weeks.length) {
    root.innerHTML = `<h2>Patterns this week</h2><p class="quiet">Thoughts you save to the Journal will show up here.</p>`;
    return;
  }
  if (insightIndex < 0 || insightIndex >= weeks.length) insightIndex = weeks.length - 1;
  const [start, entries] = weeks[insightIndex];
  const counts = new Map();
  entries.forEach(entry => {
    (entry.distortions || []).forEach(id => {
      const name = DISTORTION_NAMES[id] || id;
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    (entry.categories || []).forEach(id => {
      const name = CATEGORY_NAMES[id] || id;
      counts.set(name, (counts.get(name) || 0) + 1);
    });
  });
  const rows = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 6);
  const max = rows.length ? rows[0][1] : 1;
  const label = new Date(start).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  // Inline SVG, not a chart library, and nothing about this leaves the phone.
  const rowH = 46;
  const bars = rows.length
    ? `<svg viewBox="0 0 320 ${rows.length * rowH}" role="img" aria-label="Most frequent patterns this week">
        <title>Most frequent patterns this week</title>
        ${rows.map(([name, count], i) => {
          const y = i * rowH;
          const barW = Math.max(8, Math.round((count / max) * 300));
          return `<text x="0" y="${y + 16}" fill="#6f685f" font-size="14" font-family="system-ui, sans-serif">${esc(name)}</text>
            <text x="320" y="${y + 16}" text-anchor="end" fill="#6f685f" font-size="14" font-family="system-ui, sans-serif">${count}</text>
            <rect x="0" y="${y + 24}" width="${barW}" height="8" rx="4" fill="#8d9a91"></rect>`;
        }).join("")}
      </svg>`
    : `<p class="quiet">Nothing to chart this week.</p>`;
  const earlier = insightIndex > 0 ? `<button type="button" class="text" id="week-earlier">Earlier</button>` : `<span></span>`;
  const later = insightIndex < weeks.length - 1 ? `<button type="button" class="text" id="week-later">Later</button>` : `<span></span>`;
  const nav = weeks.length > 1 ? `<div class="week-nav">${earlier}${later}</div>` : "";
  root.innerHTML = `<h2>Week of ${esc(label)}</h2>${bars}${nav}`;
  const back = $("week-earlier");
  const forward = $("week-later");
  if (back) back.addEventListener("click", () => { insightIndex -= 1; renderInsights(); });
  if (forward) forward.addEventListener("click", () => { insightIndex += 1; renderInsights(); });
}

const insightParts = [];
// checkin-ui adds the weekly card, the chart, and today's next skill.
function onInsights(fn) { insightParts.push(fn); }

registerOutput("insights", () => {
  insightParts.forEach(fn => fn());
  renderInsights();
  showPanel("insights");
});

// ---------- Install. The button stays hidden until the browser asks. ----------

let deferredPrompt = null;
window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredPrompt = event;
  $("install").classList.remove("hidden");
});

$("install").addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  $("install").classList.add("hidden");
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch(() => {
    // If caching fails, the page still works while you are online.
  });
}
