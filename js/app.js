// app.js — one screen at a time.
//
// Reflect flow, for a thought that is not a crisis:
//   write -> optional 10 second breath -> Notice, Name, Stance, Act
//   -> one coach -> (optional) other angles -> a hopeful picture
//
// Crisis flow: the support box only. No breath, no coaches, nothing saved.
//
// Paths are relative ("./sw.js", "./manifest.json") so the same files work
// on your computer and on GitHub Pages under /mindframe/.

const $ = id => document.getElementById(id);
const JOURNAL_KEY = "mindframe-journal";
const BREATH_MS = 10000;

// The five coaches. bestCoach() in bots.js returns one of these ids.
const COACHES = [
  { id: "dbt", title: "DBT Coach", render: dbtCoach },
  { id: "philo", title: "Philosopher", render: philosopher },
  { id: "equation", title: "Thought Equation", render: thoughtEquation },
  { id: "compassion", title: "Compassion Coach", render: compassionCoach },
  { id: "cbt", title: "CBT Coach", render: cbtCoach },
];

const FRAME = [
  { key: "notice", title: "Notice", hint: "What do you notice, in a few words?" },
  { key: "name", title: "Name", hint: "Give the thought a short name." },
  { key: "stance", title: "Stance", hint: "How do you want to stand toward it?" },
  { key: "act", title: "Act", hint: "One small act." },
];

const VALUES = ["Kindness", "Learning", "Care", "Courage", "Honesty", "Patience"];

const CATEGORY_NAMES = {
  hopelessness: "Hopelessness",
  selfBlame: "Self-blame",
  urge: "Urge",
  anger: "Anger",
  anxiety: "Anxiety",
};

// The thought currently moving through Reflect. Null on the write screen.
let draft = null;
let breathCancel = null;
let hopeFrame = 0;
let insightIndex = -1;

// ---------- Journal: this phone only, no account, no network ----------

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
        const step = entry.step ? `<p class="quiet">Step: ${esc(entry.step)}</p>` : "";
        return `<li><time>${esc(when)}</time><p>${esc(entry.text)}</p>${step}</li>`;
      }).join("")
    : `<li><p class="quiet">Nothing kept yet.</p></li>`;
  $("clear-journal").classList.toggle("hidden", items.length === 0);
}

// ---------- Tabs ----------

function showView(name) {
  ["reflect", "ground", "journal", "insights"].forEach(id => {
    $("view-" + id).classList.toggle("hidden", id !== name);
  });
  document.querySelectorAll(".tab").forEach(btn => {
    if (btn.dataset.view === name) btn.setAttribute("aria-current", "page");
    else btn.removeAttribute("aria-current");
  });
  if (name === "journal") renderJournal();
  if (name === "insights") renderInsights();
  if (name !== "reflect") stopHope();
}

document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => showView(btn.dataset.view));
});

// ---------- Reflect phases ----------

function showPhase(name) {
  ["write", "crisis", "pause", "frame", "advice", "hope"].forEach(id => {
    $("phase-" + id).classList.toggle("hidden", id !== name);
  });
  if (name !== "hope") stopHope();
}

function showCrisis() {
  $("crisis").innerHTML = `<p><strong>You don't have to carry this alone.</strong> What you're feeling matters, and help is available right now.</p>
    <p>Call or text <strong>988</strong> (Suicide &amp; Crisis Lifeline, US, free, 24/7). If you're in immediate danger, call <strong>911</strong>.</p>
    <p>Please also reach out to someone you trust.</p>`;
  showPhase("crisis");
  $("crisis").focus();
}

// Entry point for a thought. Crisis returns before any of the later steps.
function begin(text) {
  const trimmed = text.trim();
  if (!trimmed) return;
  if (breathCancel) breathCancel();
  const signals = analyze(trimmed);
  if (signals.crisis) {
    draft = null;
    showCrisis();
    return;
  }
  draft = { signals, frame: {}, frameIndex: 0, savedAt: null, value: "" };
  startBreath();
}

$("thought-form").addEventListener("submit", event => {
  event.preventDefault();
  begin($("thought").value);
});

$("crisis-again").addEventListener("click", () => {
  $("thought").value = "";
  showPhase("write");
  $("thought").focus();
});

// ---------- 10 second breath. Skip goes to the four-step frame, not past it. ----------

function startBreath() {
  if (breathCancel) breathCancel();
  showPhase("pause");
  const circle = $("breath");
  const word = $("breath-word");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let stopped = false;
  let frame = 0;
  let timer = 0;
  const started = performance.now();

  function stop() {
    stopped = true;
    if (frame) cancelAnimationFrame(frame);
    if (timer) clearTimeout(timer);
  }
  breathCancel = stop;

  function finish() {
    if (stopped) return;
    stopped = true;
    breathCancel = null;
    showFrame();
  }

  if (reduce) {
    word.textContent = "A short pause";
    circle.style.transform = "none";
    timer = setTimeout(finish, BREATH_MS);
    return;
  }

  function tick(now) {
    if (stopped) return;
    const t = Math.min(1, (now - started) / BREATH_MS);
    // One breath: 4 seconds in, 6 seconds out. Together that is 10 seconds.
    const inhaling = t < 0.4;
    const local = inhaling ? t / 0.4 : (t - 0.4) / 0.6;
    const scale = inhaling ? 0.72 + 0.28 * local : 1 - 0.28 * local;
    circle.style.transform = `scale(${scale})`;
    word.textContent = inhaling ? "Breathe in" : "Breathe out";
    if (t < 1) frame = requestAnimationFrame(tick);
    else finish();
  }
  frame = requestAnimationFrame(tick);
}

$("skip-pause").addEventListener("click", () => {
  if (breathCancel) breathCancel();
  breathCancel = null;
  showFrame();
});

// ---------- Notice, Name, Stance, Act ----------

function showFrame() {
  if (!draft) return;
  draft.frameIndex = draft.frameIndex || 0;
  paintFrame();
  showPhase("frame");
  $("frame-input").focus();
}

function paintFrame() {
  const step = FRAME[draft.frameIndex];
  $("frame-count").textContent = `${draft.frameIndex + 1} of ${FRAME.length}`;
  $("frame-title").textContent = step.title;
  $("frame-hint").textContent = step.hint;
  $("frame-label").textContent = step.title;
  $("frame-input").value = draft.frame[step.key] || "";
  $("frame-input").placeholder = step.hint;
  $("frame-next").textContent = draft.frameIndex === FRAME.length - 1 ? "Continue" : "Next";
}

$("frame-form").addEventListener("submit", event => {
  event.preventDefault();
  if (!draft) return;
  const step = FRAME[draft.frameIndex];
  draft.frame[step.key] = $("frame-input").value.trim();
  if (draft.frameIndex < FRAME.length - 1) {
    draft.frameIndex += 1;
    paintFrame();
    $("frame-input").focus();
    return;
  }
  showAdvice();
});

// ---------- One coach, then the others on request ----------

function showAdvice() {
  if (!draft) return;
  const entry = {
    text: draft.signals.text,
    date: Date.now(),
    categories: draft.signals.categories,
    distortions: draft.signals.distortions,
    grandiose: !!draft.signals.grandiose,
    frame: { ...draft.frame },
  };
  draft.savedAt = entry.date;
  saveJournal(loadJournal().concat(entry));

  const bestId = bestCoach(draft.signals);
  const best = COACHES.find(coach => coach.id === bestId) || COACHES[3];
  const rest = COACHES.filter(coach => coach.id !== best.id);

  $("best-coach").innerHTML = `<h2>${best.title}</h2>${best.render(draft.signals)}`;
  $("other-angles").innerHTML = rest.map(coach =>
    `<article class="card coach"><h2>${coach.title}</h2>${coach.render(draft.signals)}</article>`
  ).join("");
  $("other-angles").classList.add("hidden");
  $("more-angles").setAttribute("aria-expanded", "false");
  $("more-angles").textContent = "See other angles";

  const mount = document.getElementById("evidence-mount");
  if (mount) mountEvidence(mount);
  renderValues();
  showPhase("advice");
}

$("more-angles").addEventListener("click", () => {
  const open = $("more-angles").getAttribute("aria-expanded") === "true";
  $("other-angles").classList.toggle("hidden", open);
  $("more-angles").setAttribute("aria-expanded", open ? "false" : "true");
  $("more-angles").textContent = open ? "See other angles" : "Hide other angles";
});

// Shown only when the analyzer noticed big-ambition language.
// The wording stays respectful: a large hope is not a punchline.
function renderValues() {
  const card = $("values-card");
  if (!draft || !draft.signals.grandiose) {
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
      draft.value = btn.dataset.value;
      card.querySelectorAll(".chip").forEach(other => {
        other.setAttribute("aria-pressed", other === btn ? "true" : "false");
      });
      saveSmallStep();
    });
  });
  $("small-step").addEventListener("change", saveSmallStep);
}

function saveSmallStep() {
  if (!draft || !draft.savedAt) return;
  const input = $("small-step");
  const entries = loadJournal();
  const entry = entries.find(item => item.date === draft.savedAt);
  if (!entry) return;
  entry.value = draft.value || "";
  entry.step = input ? input.value.trim() : (entry.step || "");
  saveJournal(entries);
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

// ---------- Insights: counts per week, drawn with plain markup, no network ----------

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
    if (typeof renderInsightsTop === "function") renderInsightsTop();
    root.innerHTML = `<h2>This week</h2><p class="quiet">Reflections you keep will show up here.</p>`;
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
  if (typeof renderInsightsTop === "function") renderInsightsTop();
  root.innerHTML = `<h2>Week of ${esc(label)}</h2>${bars}${nav}`;
  const back = $("week-earlier");
  const forward = $("week-later");
  if (back) back.addEventListener("click", () => { insightIndex -= 1; renderInsights(); });
  if (forward) forward.addEventListener("click", () => { insightIndex += 1; renderInsights(); });
}

$("clear-journal").addEventListener("click", () => {
  saveJournal([]);
  insightIndex = -1;
  renderJournal();
});

// ---------- Hopeful picture ----------

function paintHope(ctx, canvas, now) {
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const t = (now || 0) / 1000;
  const y = h * 0.58 + Math.sin(t * 0.45) * 18;
  const glow = ctx.createRadialGradient(w / 2, y, 10, w / 2, y, 210);
  glow.addColorStop(0, "rgba(214, 196, 166, 0.95)");
  glow.addColorStop(0.45, "rgba(214, 196, 166, 0.28)");
  glow.addColorStop(1, "rgba(243, 240, 234, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(w / 2, y, 210, 0, Math.PI * 2);
  ctx.fill();
}

function startHope() {
  stopHope();
  const canvas = $("hope-canvas");
  const ctx = canvas.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const draw = now => {
    paintHope(ctx, canvas, now || 0);
    if (!reduce) hopeFrame = requestAnimationFrame(draw);
  };
  draw(0);
}

function stopHope() {
  if (hopeFrame) cancelAnimationFrame(hopeFrame);
  hopeFrame = 0;
}

$("to-hope").addEventListener("click", () => {
  saveSmallStep();
  showPhase("hope");
  startHope();
});

$("hope-form").addEventListener("submit", event => {
  event.preventDefault();
  stopHope();
  draft = null;
  $("thought").value = "";
  $("hope-line").value = "";
  showPhase("write");
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

// Optional: index.html?thought=... starts the flow (used for checks and screenshots).
const demo = new URLSearchParams(location.search).get("thought");
if (demo) {
  $("thought").value = demo;
  begin(demo);
}
