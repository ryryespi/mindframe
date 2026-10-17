// workspace-ui.js — the main page: the Equation Workspace.
// Words are read live and never stored. Only the .mf code (numbers and
// labels) is kept, in localStorage, for the next session.

const WS_KEY = "mindframe-workspace";
const $w = id => document.getElementById(id);

let wsState = Workspace.defaultState();
let wsBase = wsState.e.slice(); // the restored or accepted vector; new words add to it
let wsBaseG = wsState.ego.g;      // same for the ego grip
let wsBaseCath = Catholic.copy(wsState.cath); // and the Catholic factors
const FAITH_KEY = "mindframe-faith";
let wsNotes = [];
let wsMarkers = {};
let wsOpt = null;
let wsStory = null;
let wsSeed = 1;
let wsTimer = null;
let wsInCrisis = false;

function wsLoad() {
  const code = localStorage.getItem(WS_KEY);
  if (!code) return;
  const p = Workspace.parse(code);
  if (p.ok) { wsState = Workspace.refreshIdeal(p.state); wsSetBase(); }
}

function wsSetBase() {
  wsBase = wsState.e.slice();
  wsBaseG = wsState.ego.g;
  wsBaseCath = Catholic.copy(wsState.cath);
  wsNotes = [];
  wsMarkers = {};
}

function wsSave() {
  if (wsInCrisis) return;
  wsState = Workspace.refreshIdeal(wsState);
  localStorage.setItem(WS_KEY, Workspace.serialize(wsState));
}

function wsCrisis(on) {
  wsInCrisis = on;
  $w("ws-crisis-wrap").classList.toggle("hidden", !on);
  $w("ws-body").classList.toggle("hidden", on);
  if (on) {
    wsStory = null;
    $w("ws-story").classList.add("hidden");
    $w("ws-crisis").innerHTML = `<p><strong>You don't have to carry this alone.</strong> What you're feeling matters, and help is available right now.</p>
      <p>Call or text <strong>988</strong> (Suicide &amp; Crisis Lifeline, US, free, 24/7). If you're in immediate danger, call <strong>911</strong>.</p>
      <p>Please also reach out to someone you trust.</p>`;
    $w("ws-crisis").focus();
  }
}

// ---------- Live view ----------
function wsUpdate() {
  const words = Workspace.fromText($w("ws-input").value);
  if (words.crisis) { wsCrisis(true); return; }
  if (wsInCrisis) wsCrisis(false);
  const r = Workspace.applyWords({ e: wsBase, g: wsBaseG, cath: wsBaseCath }, words, wsState.vars);
  wsState = { ...wsState, e: r.e, ego: { ...wsState.ego, g: r.g }, cath: r.cath };
  wsNotes = words.notes;
  wsMarkers = words.ego.markers;
  wsRender();
  wsSave();
}

function wsRender() {
  const m = Workspace.metrics(wsState, wsNotes, wsMarkers);
  const ul = $w("ws-lines");
  ul.innerHTML = "";
  Workspace.lines(wsState, m, { faith: $w("ws-faith").checked }).forEach(l => {
    const li = document.createElement("li");
    li.textContent = l;
    ul.appendChild(li);
  });
  $w("ws-ideal-words").textContent = Workspace.idealWords(m);
  $w("ws-story-go").disabled = m.d === 0 && m.ideal.egoGap < 0.005;
  wsRenderCheckpoints();
  wsRenderWeek();
  wsRenderVars();
  wsRenderCath(m);
  $w("ws-code").textContent = Workspace.serialize(Workspace.refreshIdeal(wsState));
}

function wsRenderCheckpoints() {
  const ol = $w("ws-cps");
  ol.innerHTML = "";
  $w("ws-cps-empty").classList.toggle("hidden", wsState.cps.length > 0);
  wsState.cps.slice().reverse().forEach(cp => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cp";
    btn.dataset.n = cp.n;
    const d = Workspace.distance(cp.e, wsState.home).toFixed(2);
    btn.textContent = `${cp.n} \u00B7 ${cp.label} \u00B7 ${cp.t.replace("T", " ")} \u00B7 d = ${d}, g = ${cp.g.toFixed(2)}, \u03BB = ${cp.lambda > 0 ? "+" : ""}${cp.lambda.toFixed(2)}`;
    btn.setAttribute("aria-label", `Restore checkpoint ${cp.n}, ${cp.label}`);
    btn.addEventListener("click", () => wsRestore(cp.n));
    li.appendChild(btn);
    ol.appendChild(li);
  });
}

function wsRestore(n) {
  wsState = Workspace.restore(wsState, n);
  wsSetBase();
  $w("ws-input").value = "";
  wsHideStory();
  wsRender();
  wsSave();
  $w("ws-base-note").textContent = `Restored checkpoint ${n}. New words add to it.`;
}

$w("ws-input").addEventListener("input", () => {
  clearTimeout(wsTimer);
  wsTimer = setTimeout(wsUpdate, 400);
});

$w("ws-save").addEventListener("click", () => {
  wsUpdate();
  if (wsInCrisis) return;
  wsState = Workspace.addCheckpoint(wsState, wsState.cps.length ? "" : "start");
  wsRender();
  wsSave();
});

// ---------- Story and the accepted step ----------
function wsHideStory() {
  wsStory = null;
  $w("ws-story").classList.add("hidden");
}

function wsTell() {
  wsUpdate();
  if (wsInCrisis) return;
  const m = Workspace.metrics(wsState, wsNotes, wsMarkers);
  wsStory = Workspace.story(wsState, m, { seed: wsSeed, faith: $w("ws-faith").checked });
  if (!wsStory) { wsHideStory(); return; }
  $w("ws-story-tag").textContent = "Guide: " + wsStory.tag;
  $w("ws-story-text").textContent = wsStory.text;
  const next = wsStory.next;
  const parts = Workspace.NAMES.map((n, i) => [n, next[i]]).filter(([, x]) => x > 0).sort((a, b) => b[1] - a[1]).map(([n, x]) => `${n} ${x.toFixed(2)}`);
  $w("ws-preview").textContent = `preview: e\u2032 = (${parts.join(", ") || "0"}), g\u2032 = ${m.ideal.gNext.toFixed(2)}, d\u2032 = ${m.ideal.dNext.toFixed(2)}`;
  $w("ws-story").classList.remove("hidden");
}

$w("ws-story-go").addEventListener("click", () => { wsSeed = 1; wsTell(); });
$w("ws-story-again").addEventListener("click", () => { wsSeed += 1; wsTell(); });
$w("ws-faith").checked = localStorage.getItem(FAITH_KEY) === "1";
$w("ws-faith").addEventListener("change", () => {
  localStorage.setItem(FAITH_KEY, $w("ws-faith").checked ? "1" : "0");
  if (wsStory) wsTell(); else wsRender();
});

$w("ws-accept").addEventListener("click", () => {
  if (!wsStory || wsInCrisis) return;
  wsState = Workspace.acceptStep(wsState);
  wsSetBase();
  $w("ws-input").value = "";
  wsHideStory();
  wsRender();
  wsSave();
  $w("ws-base-note").textContent = "Step accepted and saved as a checkpoint. The next equation starts from here.";
});

// ---------- Copy, export, import ----------
async function wsCopy(text) {
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
  $w("ws-copied").textContent = ok ? "Copied" : "Select the text to copy it";
  return ok;
}

$w("ws-copy-lines").addEventListener("click", () => {
  const lines = [...$w("ws-lines").children].map(li => li.textContent);
  wsCopy(lines.concat($w("ws-ideal-words").textContent).join("\n"));
});
$w("ws-copy-code").addEventListener("click", () => wsCopy($w("ws-code").textContent));

$w("ws-download").addEventListener("click", () => {
  const blob = new Blob([$w("ws-code").textContent], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `mindframe-${Workspace.stamp(Date.now()).slice(0, 10)}.mf.txt`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
});

$w("ws-import-open").addEventListener("click", () => {
  $w("ws-import").classList.toggle("hidden");
  $w("ws-import-errors").innerHTML = "";
});

$w("ws-import-file").addEventListener("change", e => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  if (file.size > 64 * 1024) { wsImportErrors(["That file is too big for .mf code (over 64 KB)."]); return; }
  const reader = new FileReader();
  reader.onload = () => { $w("ws-import-text").value = String(reader.result || ""); };
  reader.readAsText(file);
});

function wsImportErrors(list) {
  const ul = $w("ws-import-errors");
  ul.innerHTML = "";
  list.forEach(msg => { const li = document.createElement("li"); li.textContent = msg; ul.appendChild(li); });
}

$w("ws-import-go").addEventListener("click", () => {
  const p = Workspace.parse($w("ws-import-text").value);
  if (p.crisis) { wsCrisis(true); return; }
  if (!p.ok) { wsImportErrors(p.errors.slice(0, 8).map(x => x.msg)); return; }
  wsState = Workspace.refreshIdeal(p.state);
  wsSetBase();
  $w("ws-input").value = "";
  $w("ws-import-text").value = "";
  wsImportErrors([]);
  $w("ws-import").classList.add("hidden");
  wsHideStory();
  wsRender();
  wsSave();
  $w("ws-base-note").textContent = "Restored from code. New words add to it.";
});

$w("ws-clear").addEventListener("click", () => {
  if (!confirm("Start over? This clears the vector and checkpoints on this device.")) return;
  localStorage.removeItem(WS_KEY);
  wsState = Workspace.defaultState();
  wsSetBase();
  $w("ws-input").value = "";
  wsOpt = null;
  $w("ws-compare-list").innerHTML = "";
  wsHideStory();
  wsRender();
});

// ---------- Every day ----------
function wsRenderWeek() {
  const ul = $w("ws-week");
  ul.innerHTML = "";
  Workspace.weekLines(wsState).forEach(l => { const li = document.createElement("li"); li.textContent = l; ul.appendChild(li); });
  $w("ws-today").textContent = Workspace.todayWords(wsState);
}

// ---------- Variables and frameworks ----------
const WS_GROUPS = [
  ["Steps toward home", ["aBase", "aMin", "aMax", "aCap", "b", "bU", "eps"]],
  ["Dynamics", ["d", "dt", "rise", "k"]],
  ["Ego and days", ["target", "r", "rCap", "kShame", "kAnger", "kConn", "kCalm", "beta"]],
  ["Catholic: virtue pull", ["cv", "vHome", "kvFaith", "kvHope", "kvCharity", "kvPatience", "kvFortitude", "kvTemperance", "kvHumility"]],
  ["Catholic: tendencies", ["ktPride", "ktGreed", "ktLust", "ktEnvy", "ktGluttony", "ktWrath", "ktSloth"]],
];

function wsInput(kind, key, label, min, max, step, note) {
  const lab = document.createElement("label");
  lab.title = note || "";
  const span = document.createElement("span");
  span.textContent = label;
  const inp = document.createElement("input");
  inp.type = "number";
  Object.assign(inp, { min, max, step });
  inp.dataset.kind = kind;
  inp.dataset.key = key;
  inp.setAttribute("aria-label", `${label}${note ? ": " + note : ""}`);
  lab.append(span, inp);
  return lab;
}

function wsBuildVars() {
  const grid = $w("ws-var-grid");
  grid.innerHTML = "";
  const head = t => { const h = document.createElement("h3"); h.textContent = t; grid.appendChild(h); };
  WS_GROUPS.forEach(([title, keys]) => {
    head(title);
    keys.forEach(k => {
      const sp = Workspace.SPEC[k];
      grid.appendChild(wsInput(Workspace.VAR_KEYS.includes(k) ? "var" : "extra", k, k === "target" ? "g*" : k === "beta" ? "\u03B2" : k, sp.min, sp.max, k === "k" ? 1 : 0.01, sp.note));
    });
  });
  head("Home h");
  ["joy", "hope", "calm", "connection"].forEach(n => grid.appendChild(wsInput("home", n, `h.${n}`, 0, 1, 0.01, `home value of ${n}`)));
  head("Main pairs W (+ amplifies, \u2212 dampens)");
  Workspace.MAIN_PAIRS.forEach(([a, b]) => grid.appendChild(wsInput("w", `${a}>${b}`, `${a}\u2192${b}`, -1, 1, 0.01, `how much ${a} changes ${b}`)));
  grid.addEventListener("change", wsVarChanged);
}

function wsRenderVars() {
  const sel = $w("ws-fw");
  sel.innerHTML = "";
  const opt = (value, text) => { const o = document.createElement("option"); o.value = value; o.textContent = text; sel.appendChild(o); };
  Workspace.PRESETS.forEach(p => opt(p.id, p.title));
  wsState.frameworks.forEach(f => opt(f.name, `${f.name} (yours)`));
  if (![...sel.options].some(o => o.value === wsState.framework)) opt(wsState.framework, wsState.framework === "custom" ? "Custom (edited)" : wsState.framework);
  sel.value = wsState.framework;
  const preset = Workspace.PRESETS.find(p => p.id === wsState.framework);
  $w("ws-fw-note").textContent = preset ? preset.note : wsState.framework === "custom" ? "Your edits. Save them as a framework to keep a name." : "Your saved framework.";
  const W = Workspace.weights(wsState.w), NAMES = Workspace.NAMES;
  $w("ws-var-grid").querySelectorAll("input").forEach(inp => {
    const { kind, key } = inp.dataset;
    let v;
    if (kind === "var") v = wsState.vars[key];
    else if (kind === "extra") v = key === "target" ? wsState.ego.target : key === "beta" ? wsState.beta : wsState.steps;
    else if (kind === "home") v = wsState.home[NAMES.indexOf(key)];
    else { const [a, b] = key.split(">"); v = W[NAMES.indexOf(a)][NAMES.indexOf(b)]; }
    if (document.activeElement !== inp) inp.value = key === "k" ? String(v) : Number(v).toFixed(2);
  });
}

function wsVarChanged(ev) {
  const inp = ev.target;
  if (!inp.dataset || !inp.dataset.kind) return;
  const { kind, key } = inp.dataset;
  const x = Number(inp.value);
  let s = { ...wsState, framework: "custom" }, notes = [];
  if (kind === "var") { const v = Workspace.validateVars({ ...s.vars, [key]: x }); s.vars = v.vars; notes = v.notes; }
  else if (kind === "extra") {
    const c = Workspace.clampExtra(key, x);
    if (c !== x) notes.push(`${key}: kept inside ${Workspace.SPEC[key].min}\u2013${Workspace.SPEC[key].max}`);
    if (key === "target") s.ego = { ...s.ego, target: c };
    else if (key === "beta") s = Workspace.withBaseline({ ...s, beta: c });
    else s.steps = c;
  } else if (kind === "home") {
    const home = s.home.slice();
    const c = Math.min(1, Math.max(0, Math.round((Number.isFinite(x) ? x : 0) * 100) / 100));
    if (c !== x) notes.push(`h.${key}: kept inside 0\u20131`);
    home[Workspace.NAMES.indexOf(key)] = c;
    s.home = home;
  } else {
    const [a, b] = key.split(">");
    const c = Math.min(1, Math.max(-1, Number.isFinite(x) ? x : 0));
    if (c !== x) notes.push(`${a}\u2192${b}: kept inside \u22121 to 1`);
    s = Workspace.setWeight(s, a, b, c);
  }
  wsState = s;
  $w("ws-var-notes").textContent = notes.join("; ");
  wsOpt = null;
  $w("ws-opt").classList.add("hidden");
  inp.blur();
  wsUpdate();
}

function wsUseFramework(name) {
  wsState = Workspace.applyFramework(wsState, Workspace.findFramework(wsState, name));
  $w("ws-var-notes").textContent = "";
  wsUpdate();
}

$w("ws-fw").addEventListener("change", () => {
  if (Workspace.findFramework(wsState, $w("ws-fw").value)) wsUseFramework($w("ws-fw").value);
});
$w("ws-vars-reset").addEventListener("click", () => wsUseFramework("default"));

$w("ws-compare").addEventListener("click", () => {
  const ul = $w("ws-compare-list");
  ul.innerHTML = "";
  Workspace.compare(wsState).forEach(row => {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = `${row.title}: ${Workspace.recText(row)}`;
    const use = document.createElement("button");
    use.type = "button";
    use.className = "text";
    use.dataset.fw = row.name;
    use.textContent = row.name === wsState.framework ? "in use" : "Use this";
    use.disabled = row.name === wsState.framework;
    use.addEventListener("click", () => { wsUseFramework(row.name); $w("ws-compare").click(); });
    li.append(span, use);
    ul.appendChild(li);
  });
});

$w("ws-optimize").addEventListener("click", () => {
  wsOpt = Workspace.optimize(wsState);
  const ch = wsOpt.changed.map(c => `${c.key} ${c.from.toFixed(2)} \u2192 ${c.to.toFixed(2)}`).join(", ");
  const t = x => Workspace.recText({ ...x, days: x.steps });
  $w("ws-opt-text").textContent = ch
    ? `optimized: ${t(wsOpt.after)} (was ${t(wsOpt.before)}); ${ch}. Unstable caps unchanged.`
    : `Already as quick as these safe bounds allow: ${t(wsOpt.before)}.`;
  $w("ws-opt-accept").disabled = !ch;
  $w("ws-opt").classList.remove("hidden");
});

$w("ws-opt-accept").addEventListener("click", () => {
  if (!wsOpt || !wsOpt.changed.length) return;
  const n = wsState.frameworks.filter(f => /^optimized-\d+$/.test(f.name)).length + 1;
  const saved = Workspace.saveFramework({ ...wsState, vars: wsOpt.vars }, `optimized-${n}`);
  if (saved.ok) wsState = Workspace.refreshIdeal(saved.state);
  wsOpt = null;
  $w("ws-opt").classList.add("hidden");
  $w("ws-fw-msg").textContent = `Saved as optimized-${n}.`;
  wsRender();
  wsSave();
});
$w("ws-opt-discard").addEventListener("click", () => { wsOpt = null; $w("ws-opt").classList.add("hidden"); });

$w("ws-fw-save").addEventListener("click", () => {
  const name = $w("ws-fw-name").value.trim();
  const saved = Workspace.saveFramework(wsState, name);
  if (saved.crisis) { wsCrisis(true); return; }
  if (!saved.ok) { $w("ws-fw-msg").textContent = saved.msg; return; }
  wsState = saved.state;
  $w("ws-fw-name").value = "";
  $w("ws-fw-msg").textContent = `Saved as ${name}. It is in the code, so it exports and imports with your session.`;
  wsRender();
  wsSave();
});

// ---------- Catholic factors ----------
function wsBuildCath() {
  const grid = $w("ws-cath-grid");
  grid.innerHTML = "";
  const head = t => { const h = document.createElement("h3"); h.textContent = t; grid.appendChild(h); };
  head("Theological virtues (CCC 1812\u20131829)");
  Catholic.THEOLOGICAL.forEach(k => grid.appendChild(wsInput("virtue", k, k, 0, 1, 0.01, `virtue: ${k}`)));
  head("Cardinal virtues (CCC 1805\u20131809)");
  Catholic.CARDINAL.forEach(k => grid.appendChild(wsInput("virtue", k, k, 0, 1, 0.01, `virtue: ${k}`)));
  head("Capital tendencies \u2194 contrary virtues (CCC 1866)");
  Catholic.PAIRS.forEach(([t, v]) => {
    grid.appendChild(wsInput("tendency", t, t, 0, 1, 0.01, `tendency: ${t} (a pull, not a verdict)`));
    grid.appendChild(wsInput(v === "temperance" ? "virtue-dup" : "virtue", v, `\u2194 ${v}`, 0, 1, 0.01, `contrary virtue: ${v}`));
  });
  grid.addEventListener("change", wsCathChanged);
}

function wsRenderCath(m) {
  const f = wsState.cath, cv = m.catholic;
  $w("ws-cath-grid").querySelectorAll("input").forEach(inp => {
    const { kind, key } = inp.dataset;
    const v = kind === "tendency" ? f.t[key] : f.v[key];
    if (document.activeElement !== inp) inp.value = Number(v).toFixed(2);
  });
  const ig = cv.ignatian;
  $w("ws-ig").textContent = `Ignatian index I = ${ig.I > 0 ? "+" : ig.I < 0 ? "\u2212" : ""}${Math.abs(ig.I).toFixed(2)} (${ig.state}): ${Catholic.IGNATIAN_TEXT[ig.state]}.`;
  const fill = (id, list) => { const ul = $w(id); ul.innerHTML = ""; list.forEach(t => { const li = document.createElement("li"); li.textContent = t; ul.appendChild(li); }); };
  fill("ws-fruits", Catholic.fruitsView(wsState.home, Workspace.NAMES, f, wsState.vars.vHome).map(x =>
    x.kind === "e" ? `fruit: ${x.fruit} \u2192 home ${x.key} ${x.target.toFixed(2)}` : `fruit: ${x.fruit} \u2192 virtue ${x.key} target ${x.target.toFixed(2)} (now ${x.now.toFixed(2)})`));
  fill("ws-gifts-list", Catholic.giftsView(f).map(x => `gift: ${x.gift} \u2192 ${x.virtue} ${x.v.toFixed(2)}`));
}

function wsCathChanged(ev) {
  const inp = ev.target;
  if (!inp.dataset || !inp.dataset.kind) return;
  const { kind, key } = inp.dataset;
  const x = Math.min(1, Math.max(0, Math.round((Number(inp.value) || 0) * 100) / 100));
  if (kind === "tendency") wsBaseCath.t[key] = x; else wsBaseCath.v[key] = x;
  inp.blur();
  wsUpdate();
}

$w("ws-cath-use").addEventListener("click", () => wsUseFramework("catholic"));
$w("ws-cath-reset").addEventListener("click", () => {
  wsBaseCath = Catholic.defaultFactors();
  wsUpdate();
});

// ---------- Start ----------
wsBuildVars();
wsBuildCath();
wsLoad();
wsRender();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch(() => { /* works online without it */ });
}
