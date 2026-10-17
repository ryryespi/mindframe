// workspace-ui.js — the main page: the Equation Workspace.
// Words are read live and never stored. Only the .mf code (numbers and
// labels) is kept, in localStorage, for the next session.

const WS_KEY = "mindframe-workspace";
const $w = id => document.getElementById(id);

let wsState = Workspace.defaultState();
let wsBase = wsState.e.slice(); // the restored or accepted vector; new words add to it
let wsNotes = [];
let wsStory = null;
let wsSeed = 1;
let wsTimer = null;
let wsInCrisis = false;

function wsLoad() {
  const code = localStorage.getItem(WS_KEY);
  if (!code) return;
  const p = Workspace.parse(code);
  if (p.ok) { wsState = Workspace.refreshIdeal(p.state); wsBase = wsState.e.slice(); }
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
  wsState = { ...wsState, e: Workspace.combine(wsBase, words.e) };
  wsNotes = words.notes;
  wsRender();
  wsSave();
}

function wsRender() {
  const m = Workspace.metrics(wsState, wsNotes);
  const ul = $w("ws-lines");
  ul.innerHTML = "";
  Workspace.lines(wsState, m).forEach(l => {
    const li = document.createElement("li");
    li.textContent = l;
    ul.appendChild(li);
  });
  $w("ws-ideal-words").textContent = Workspace.idealWords(m);
  $w("ws-story-go").disabled = m.d === 0;
  wsRenderCheckpoints();
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
    btn.textContent = `${cp.n} \u00B7 ${cp.label} \u00B7 ${cp.t.replace("T", " ")} \u00B7 d = ${d}, \u03BB = ${cp.lambda > 0 ? "+" : ""}${cp.lambda.toFixed(2)}`;
    btn.setAttribute("aria-label", `Restore checkpoint ${cp.n}, ${cp.label}`);
    btn.addEventListener("click", () => wsRestore(cp.n));
    li.appendChild(btn);
    ol.appendChild(li);
  });
}

function wsRestore(n) {
  wsState = Workspace.restore(wsState, n);
  wsBase = wsState.e.slice();
  $w("ws-input").value = "";
  wsNotes = [];
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
  const m = Workspace.metrics(wsState, wsNotes);
  wsStory = Workspace.story(wsState, m, { seed: wsSeed });
  if (!wsStory) { wsHideStory(); return; }
  $w("ws-story-tag").textContent = "Guide: " + wsStory.tag;
  $w("ws-story-text").textContent = wsStory.text;
  const next = wsStory.next;
  const parts = Workspace.NAMES.map((n, i) => [n, next[i]]).filter(([, x]) => x > 0).sort((a, b) => b[1] - a[1]).map(([n, x]) => `${n} ${x.toFixed(2)}`);
  $w("ws-preview").textContent = `preview: e\u2032 = (${parts.join(", ") || "0"}), d\u2032 = ${m.ideal.dNext.toFixed(2)}`;
  $w("ws-story").classList.remove("hidden");
}

$w("ws-story-go").addEventListener("click", () => { wsSeed = 1; wsTell(); });
$w("ws-story-again").addEventListener("click", () => { wsSeed += 1; wsTell(); });

$w("ws-accept").addEventListener("click", () => {
  if (!wsStory || wsInCrisis) return;
  wsState = Workspace.acceptStep(wsState);
  wsBase = wsState.e.slice();
  $w("ws-input").value = "";
  wsNotes = [];
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
  wsBase = wsState.e.slice();
  $w("ws-input").value = "";
  $w("ws-import-text").value = "";
  wsNotes = [];
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
  wsBase = wsState.e.slice();
  $w("ws-input").value = "";
  wsNotes = [];
  wsHideStory();
  wsRender();
});

// ---------- Start ----------
wsLoad();
wsRender();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch(() => { /* works online without it */ });
}
