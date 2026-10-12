// app.js — wires the page together: form -> analyze -> crisis check -> bots -> journal.

const $ = id => document.getElementById(id);
const JOURNAL_KEY = "mindframe-journal";

function loadJournal() { return JSON.parse(localStorage.getItem(JOURNAL_KEY) || "[]"); }
function saveJournal(entries) { localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries)); }

function renderJournal() {
  const items = loadJournal().slice().reverse();
  $("journal-list").innerHTML = items.length
    ? items.map(e => `<li><time>${new Date(e.date).toLocaleString()}</time>${esc(e.text)}</li>`).join("")
    : "<li><i>No entries yet.</i></li>";
}

function handleThought(text) {
  if (!text.trim()) return;
  const signals = analyze(text);

  // Safety first: if crisis words are found, show ONLY the crisis box.
  // A crisis thought is not a reframing exercise, so the bots stay hidden
  // and we return early (nothing below this block runs, nothing is saved).
  const crisis = $("crisis");
  if (signals.crisis) {
    crisis.innerHTML = `<b>You don't have to carry this alone.</b> What you're feeling matters, and help is available right now.<br>
      Call or text <b>988</b> (Suicide &amp; Crisis Lifeline, US, free, 24/7). If you're in immediate danger, call <b>911</b>.<br>
      Please also reach out to someone you trust (a friend, family member, or counselor) and let them know how you're doing.`;
    crisis.classList.remove("hidden");
    $("results").classList.add("hidden");
    return;
  }
  crisis.classList.add("hidden");

  $("out-dbt").innerHTML = dbtCoach(signals);
  $("out-philo").innerHTML = philosopher(signals);
  $("out-eq").innerHTML = thoughtEquation(signals);
  $("out-comp").innerHTML = compassionCoach(signals);
  $("results").classList.remove("hidden");

  saveJournal([...loadJournal(), { text, date: Date.now(), categories: signals.categories }]);
  renderJournal();
}

$("thought-form").addEventListener("submit", e => { e.preventDefault(); handleThought($("thought").value); });
$("clear-journal").addEventListener("click", () => { saveJournal([]); renderJournal(); });

// Demo helper: index.html?thought=... prefills and submits (used for screenshots).
const demo = new URLSearchParams(location.search).get("thought");
if (demo) { $("thought").value = demo; handleThought(demo); }
renderJournal();
