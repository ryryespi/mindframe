// equations-ui.js — the Equations output, the short "Equation view" lines in
// the other outputs, and the 7-day instability (λ) trend for Insights.
// Math lives in emotions.js. Only a daily λ number is stored, never text.

const LAMBDA_KEY = "mindframe-lambda";

function loadLambda() {
  try { return JSON.parse(localStorage.getItem(LAMBDA_KEY) || "{}"); }
  catch (err) { return {}; }
}

// One number per day; the last one counts.
function recordLambda(result) {
  if (!result || result.crisis || result.lambda === null) return;
  const day = Psi.dayKey(Date.now());
  const log = (loadLambda().log || []).filter(x => x.day !== day);
  log.push({ day, lambda: result.lambda });
  log.sort((a, b) => (a.day < b.day ? -1 : 1));
  localStorage.setItem(LAMBDA_KEY, JSON.stringify({ log: log.slice(-60) }));
}

// Analyze once, record λ, return the result (or null for crisis/empty text).
function emotionResult(text) {
  if (!text) return null;
  const r = Emotions.analyze(text);
  if (r.crisis) return null;
  recordLambda(r);
  return r;
}

// The short line at the top of Reframe, Coach, Story, and Play.
function equationLine(id, text, result) {
  const r = result || emotionResult(text);
  const line = r ? r.summary : "";
  $(id).textContent = line;
  $(id).classList.toggle("hidden", !line);
  return r;
}

// Story and Play: when the words point to no story pattern, use the pattern
// closest to the strongest hard-feeling loop. Words win when they say more.
function withEmotionArc(read, text, result) {
  if (!read || read.crisis || Stories.arcFor(read) !== "none" || !text) return read;
  const r = result || Emotions.analyze(text);
  const hint = Emotions.arcHint(r);
  return hint ? { ...read, patterns: [hint, ...(read.patterns || [])], emotionArc: hint } : read;
}

// A crisis clears every engine output already on screen.
onCrisisReset(() => {
  $("eq-out").innerHTML = "";
  ["eq-reframe", "eq-coach", "eq-story", "eq-play"].forEach(id => {
    $(id).textContent = "";
    $(id).classList.add("hidden");
  });
});

// ---------- The Equations output ----------

const EQ_SECTIONS = [
  ["emotions", "Emotions"],
  ["relationships", "Relationships"],
  ["unstable", "Unstable combinations"],
  ["overall", "Overall"],
  ["projection", "Projection"],
  ["stabilizer", "Stabilizer"],
];

registerOutput("equations", text => {
  const r = Emotions.analyze(text);
  if (r.crisis) { showCrisis(); return; }
  recordLambda(r);
  const root = $("eq-out");
  root.innerHTML = "";
  EQ_SECTIONS.forEach(([key, title]) => {
    const lines = r.lines[key] || [];
    if (!lines.length) return;
    const sec = document.createElement("section");
    sec.className = "eq-sec copyable";
    const h = document.createElement("h3");
    h.textContent = title;
    const ul = document.createElement("ul");
    lines.forEach(l => {
      const li = document.createElement("li");
      li.textContent = l;
      ul.appendChild(li);
    });
    sec.append(h, ul);
    root.appendChild(sec);
  });
  showPanel("equations");
});

// ---------- Check-in: the Ψ equation with today's numbers ----------

function psiEquationLine(entry, weights) {
  const t = Psi.terms(entry), W = Psi.weights(weights);
  const f = v => v.toFixed(2);
  const val = Psi.psi(t, W);
  return `Equation view: \u03A8 = ${f(W.C)}\u00B7C(${f(t.C)}) + ${f(W.S)}\u00B7S(${f(t.S)}) + ${f(W.M)}\u00B7M(${f(t.M)}) \u2212 ${f(W.R)}\u00B7R(${f(t.R)}) \u2212 ${f(W.B)}\u00B7B(${f(t.B)}) = ${val >= 0 ? "+" : "\u2212"}${f(Math.abs(val))} \u2192 ${Psi.score(t, W)} of 100`;
}

// ---------- Insights: 7-day λ trend ----------

onInsights(() => {
  const root = $("eq-trend");
  const byDay = new Map((loadLambda().log || []).map(x => [x.day, x.lambda]));
  if (!byDay.size) { root.innerHTML = ""; return; }
  const days = Psi.last7(byDay);
  const vals = days.map(d => d.value).filter(v => v !== null);
  if (!vals.length) { root.innerHTML = ""; return; }
  const W = 320, Hh = 70, pad = 8, lim = 0.5;
  const x = i => pad + (i * (W - 2 * pad)) / 6;
  const y = v => Hh / 2 - (Math.max(-lim, Math.min(lim, v)) / lim) * (Hh / 2 - pad);
  let d = "", pen = false;
  days.forEach((p, i) => {
    if (p.value === null) { pen = false; return; }
    d += `${pen ? "L" : "M"}${x(i).toFixed(1)} ${y(p.value).toFixed(1)} `;
    pen = true;
  });
  const dots = days.map((p, i) => p.value === null ? "" :
    `<circle cx="${x(i).toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="3" fill="${p.value > 0 ? "#a0726a" : "#8d9a91"}"></circle>`).join("");
  const unstable = vals.filter(v => v > 0).length;
  root.innerHTML = `<h2>Emotional instability (\u03BB), last 7 days</h2>
    <svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Instability lambda over the last 7 days">
      <title>Instability over the last 7 days</title>
      <line x1="${pad}" x2="${W - pad}" y1="${y(0)}" y2="${y(0)}" stroke="#e3ddd4" stroke-dasharray="3 4"></line>
      <path d="${d}" fill="none" stroke="#b5a99a" stroke-width="2" stroke-linejoin="round"></path>${dots}
    </svg>
    <p class="quiet small">Above the dotted line (\u03BB &gt; 0) small changes could grow instead of fading. Unstable days: ${unstable} of ${vals.length}.</p>`;
});
