/* MindFrame Now: UI. Stores only preferences (and the optional log inbox) in localStorage. */
(function () {
  "use strict";
  var L = window.MF_NOW, C = window.MF_CONTENT;
  var $ = function (id) { return document.getElementById(id); };
  var PREF = "mindframe.now.prefs.v1";
  var prefs = load(PREF, { faith: true, theme: "" });
  var sel = { energy: null, stress: null, mood: null, focus: null, context: null };
  var card = null, timerId = null;

  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function el(tag, attrs, text) { var n = document.createElement(tag); for (var a in attrs || {}) n.setAttribute(a, attrs[a]); if (text != null) n.textContent = text; return n; }

  function chips(id, labels, field, numbered) {
    var box = $(id);
    Object.keys(labels).forEach(function (k) {
      var b = el("button", { type: "button", class: "chip", "aria-pressed": "false", "data-v": k });
      if (numbered) { b.appendChild(el("b", null, k)); }
      b.appendChild(document.createTextNode(labels[k]));
      b.addEventListener("click", function () {
        var optional = !numbered;
        sel[field] = (optional && sel[field] === k) ? null : k;
        [].forEach.call(box.children, function (c) { c.setAttribute("aria-pressed", String(c.getAttribute("data-v") === sel[field])); });
        render(field === "energy" || field === "stress");
      });
      box.appendChild(b);
    });
  }

  function applyTheme() { if (prefs.theme) document.documentElement.setAttribute("data-theme", prefs.theme); else document.documentElement.removeAttribute("data-theme"); }

  function render(scroll) {
    if (!sel.energy || !sel.stress) return;
    stopTimer();
    card = L.buildCard(sel.energy, sel.stress, { mood: sel.mood, focus: sel.focus, context: sel.context, faith: prefs.faith });
    var s = card.state;
    $("stateName").textContent = s.name;
    $("stateMeta").textContent = "Energy: " + C.energyLabels[s.energy] + " \u00b7 Stress: " + C.stressLabels[s.stress];
    $("stateText").textContent = s.text;
    $("affirm").textContent = card.affirmation;
    $("care").classList.toggle("hidden", !card.care);
    var t = card.technique;
    $("techName").textContent = t.name;
    var ol = $("techSteps"); ol.innerHTML = "";
    t.steps.forEach(function (x) { ol.appendChild(el("li", null, x)); });
    $("techNote").textContent = t.note || "";
    $("techSrc").textContent = t.source ? "Basis: " + t.source : "";
    $("breath").classList.toggle("hidden", !t.breath);
    $("breath").classList.remove("on");
    $("timer").textContent = fmt(t.minutes * 60);
    $("timerBtn").textContent = "Start " + t.minutes + "-min timer";
    var rl = $("restLink");
    if (t.link) { rl.href = t.link; rl.classList.remove("hidden"); } else rl.classList.add("hidden");
    var w = $("words"); w.innerHTML = "";
    card.words.forEach(function (x) {
      var d = el("div", { class: "word" });
      var h = el("h3", null, x.text); h.appendChild(el("span", { class: "cat" }, x.category)); d.appendChild(h);
      d.appendChild(el("p", null, x.meaning));
      d.appendChild(el("p", { class: "closing" }, x.closing));
      w.appendChild(d);
    });
    var q = $("quote"); q.innerHTML = "";
    q.appendChild(el("p", { style: "margin:0" }, "\u201c" + card.quote.text + "\u201d"));
    var qs = card.quote.source || "", qa = card.quote.author || "";
    q.appendChild(el("footer", null, "\u2014 " + (qs.indexOf(qa) === 0 ? qs : qa + (qs ? ", " + qs : ""))));
    $("result").classList.remove("hidden");
    $("toast").textContent = "";
    if (scroll && window.matchMedia && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      $("result").scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (scroll) { $("result").scrollIntoView(); }
  }

  function fmt(sec) { return Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0"); }
  function stopTimer() { if (timerId) { clearInterval(timerId); timerId = null; } $("breath").classList.remove("on"); }
  function startTimer() {
    if (!card) return;
    if (timerId) { stopTimer(); $("timerBtn").textContent = "Start " + card.technique.minutes + "-min timer"; return; }
    var left = card.technique.minutes * 60;
    $("timer").textContent = fmt(left);
    $("timerBtn").textContent = "Stop";
    if (card.technique.breath) $("breath").classList.add("on");
    timerId = setInterval(function () {
      left -= 1; $("timer").textContent = fmt(Math.max(left, 0));
      if (left <= 0) { stopTimer(); $("timer").textContent = "Done. Here."; $("timerBtn").textContent = "Again"; if (navigator.vibrate) navigator.vibrate(120); }
    }, 1000);
  }

  function entry() {
    return L.makeEntry(card, { mood: sel.mood, focus: sel.focus, context: sel.context, before: $("before").value, after: $("after").value });
  }
  function saveToLog() {
    if (!card) return;
    var inbox = load(L.INBOX_KEY, []);
    inbox.push(entry());
    $("toast").textContent = save(L.INBOX_KEY, inbox)
      ? "Saved. MindFrame Log will pick this up the next time you open it (same site)."
      : "Couldn't save on this device. Use Download instead.";
  }
  function download() {
    if (!card) return;
    var blob = new Blob([JSON.stringify(L.exportBundle([entry()]), null, 2)], { type: "application/json" });
    var a = el("a", { href: URL.createObjectURL(blob), download: "mindframe-now-" + L.dayStamp() + ".json" });
    document.body.appendChild(a); a.click(); a.remove();
    $("toast").textContent = "Downloaded. Import it in MindFrame Log \u2192 Data.";
  }

  function init() {
    chips("energy", C.energyLabels, "energy", true);
    chips("stress", C.stressLabels, "stress", true);
    chips("mood", C.moods, "mood");
    chips("focus", C.focuses, "focus");
    chips("context", C.contexts, "context");
    ["before", "after"].forEach(function (id) {
      var s = $(id); s.appendChild(el("option", { value: "" }, "skip"));
      for (var i = 0; i <= 10; i++) s.appendChild(el("option", { value: String(i) }, String(i)));
    });
    $("faith").checked = prefs.faith !== false;
    $("faith").addEventListener("change", function () { prefs.faith = this.checked; save(PREF, prefs); render(false); });
    $("theme").value = prefs.theme || "";
    $("theme").addEventListener("change", function () { prefs.theme = this.value; save(PREF, prefs); applyTheme(); });
    applyTheme();
    $("timerBtn").addEventListener("click", startTimer);
    $("saveBtn").addEventListener("click", saveToLog);
    $("dlBtn").addEventListener("click", download);
    $("again").addEventListener("click", function () {
      stopTimer(); card = null;
      Object.keys(sel).forEach(function (k) { sel[k] = null; });
      [].forEach.call(document.querySelectorAll(".chip"), function (c) { c.setAttribute("aria-pressed", "false"); });
      $("result").classList.add("hidden"); window.scrollTo(0, 0);
    });
    // Deep link support for testing / shortcuts: ?e=3&s=4&focus=looping
    var p = new URLSearchParams(location.search);
    ["mood", "focus", "context"].forEach(function (k) { if (p.get(k)) pressChip(k, p.get(k)); });
    if (p.get("e") && p.get("s")) { pressChip("energy", p.get("e")); pressChip("stress", p.get("s")); }
    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    }
  }
  function pressChip(field, v) { var b = document.querySelector("#" + field + " .chip[data-v='" + v + "']"); if (b) b.click(); }
  window.__now = { get card() { return card; }, sel: sel };
  init();
})();
