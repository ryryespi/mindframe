// bots.js — five "personas". Each is a function: signals in, HTML string out.
// Same input, different mental structure. That's the core idea of the app.

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// ---------- 1. DBT Coach: concrete skills, step by step ----------
function dbtCoach({ categories, absolutes }) {
  const steps = [];
  if (categories.includes("urge")) {
    steps.push("<b>STOP</b>: Stop. Take a step back. Observe the urge (it rises, peaks, and passes like a wave). Proceed mindfully.");
    steps.push("<b>Opposite Action</b>: The urge says move toward it, so move away. Leave the room, text a friend, or start a 10-minute task.");
    steps.push("<b>TIPP</b>: Cold water on your face or 60 seconds of fast exercise can lower the intensity quickly.");
  }
  if (categories.includes("hopelessness") || categories.includes("selfBlame")) {
    steps.push("<b>Check the Facts</b>: What actually happened? Separate events from the story you're telling about them.");
    steps.push("<b>Opposite Action</b>: Hopelessness says quit. Do one tiny thing anyway, like 5 minutes on the task.");
  }
  if (categories.includes("anger")) steps.push("<b>TIPP / Paced breathing</b>: Breathe out longer than you breathe in (4 in, 6 out) for 2 minutes before you act.");
  if (categories.includes("anxiety")) steps.push("<b>Cope Ahead</b>: Picture the feared situation and rehearse how you'd handle it skillfully.");
  if (absolutes.length) steps.push(`<b>Check the Facts</b>: You used "${absolutes.join('", "')}". Is that 100% true, or does it feel true right now?`);
  if (!steps.length) steps.push("<b>Wise Mind</b>: Breathe in and ask \"What does my wise mind know here?\" Breathe out and listen.");
  steps.push("<b>Radical Acceptance</b>: This feeling is here. Accepting it isn't approving of it. It's where change starts.");
  return `<p>${pick(["That sounds really hard. Let's use some skills.", "Thanks for writing it down. That's already a skill (observe & describe)."])}</p><ol>${steps.map(s => `<li>${s}</li>`).join("")}</ol>`;
}

// ---------- 2. Philosopher: Stoic / virtue / existential reframes ----------
function philosopher({ categories }) {
  const parts = [];
  parts.push("<p><b>Dichotomy of control</b> (Epictetus): Split this into two lists, <i>what's up to me</i> (my next action, my effort, my response) and <i>what isn't</i> (the past, other people, outcomes). Put your energy only in the first.</p>");
  if (categories.includes("selfBlame") || categories.includes("hopelessness"))
    parts.push("<p><b>The view from above</b> (Marcus Aurelius): Zoom out to a year from now, or the whole span of your life. A mistake is an event, not an identity. Seneca: <i>\"Every new beginning comes from some other beginning's end.\"</i></p>");
  if (categories.includes("urge"))
    parts.push("<p><b>Virtue as practice</b> (Aristotle): Character is built by repeated choices. Resisting once is a rep, and the next one gets easier. Who do you want to be practicing to become?</p>");
  if (categories.includes("anger"))
    parts.push("<p><b>Seneca on anger</b>: \"The greatest remedy for anger is delay.\" Let the first wave pass before you choose.</p>");
  parts.push("<p><b>Meaning</b> (Viktor Frankl): \"Between stimulus and response there is a space.\" What value can you act on in that space right now: courage, kindness, honesty, patience?</p>");
  return parts.join("");
}

// ---------- 3. Thought Equation: the thought, the traps, then a live score ----------
// The number used to assume evidence for and against were equal (0.5).
// app.js now asks for real list entries and calls believability() below.
// D, the distortion penalty, is still the count of traps the analyzer found.
function thoughtEquation(signals) {
  const ids = signals.distortions || [];
  const names = ids.map(id => DISTORTION_NAMES[id]).filter(Boolean);

  // A softer wording: swap a few absolute words for gentler ones.
  const balanced = signals.text
    .replace(/\balways\b/gi, "sometimes")
    .replace(/\bnever\b/gi, "not yet")
    .replace(/\beverything\b/gi, "some things")
    .replace(/\bnothing\b/gi, "not much right now")
    .replace(/there'?s no point( trying)?/gi, "trying still gives me a chance");

  const tags = names.length
    ? names.map(name => `<span class="tag">${esc(name)}</span>`).join("")
    : `<span class="quiet">No clear trap in the wording.</span>`;

  return `
    <p>${esc(signals.text)}</p>
    <p>${tags}</p>
    <div id="evidence-mount" data-d="${ids.length}"></div>
    <p class="quiet">A softer wording: ${esc(balanced)}</p>`;
}

// B = F / (F + A) × (1 − 0.15 × D)
// F = how many "evidence for" lines the person added
// A = how many "evidence against" lines
// D = how many thinking traps were spotted
// Returns null when F + A is 0, because there is nothing to divide by.
// The penalty is never negative: more than 6 traps just brings that part to 0.
function believability(forCount, againstCount, distortionCount) {
  const F = forCount;
  const A = againstCount;
  const D = distortionCount;
  if (F + A === 0) return null;
  const penalty = Math.max(0, 1 - 0.15 * D);
  const value = (F / (F + A)) * penalty;
  return { F, A, D, value, pct: Math.round(value * 100) };
}

// The same formula, written as a sentence a beginner can read aloud.
function believabilityWords(result) {
  const lead = "Believability is your evidence for, divided by all the evidence you listed, then lowered a little for each thinking trap.";
  if (!result) return lead + " Add a point for or against and the score will use those counts.";
  const { F, A, D, pct } = result;
  return `${lead} You added ${F} for and ${A} against, and ${D} traps were spotted. ${F} divided by (${F} + ${A}), times (1 minus 0.15 times ${D}), is ${pct}%.`;
}

// ---------- 4. Compassion Coach: Kristin Neff's self-compassion + ACT defusion ----------
// Neff's three parts: mindfulness (notice the pain), common humanity (you're not
// alone in it), self-kindness (talk to yourself like a friend). ACT "defusion"
// puts distance between you and the thought, so it becomes a thought, not a fact.
function compassionCoach({ text, categories }) {
  // Defusion: wrap the person's own words in "I'm having the thought that..."
  const thought = esc(text.trim().replace(/[.!?]+$/, ""));
  const kind = categories.includes("urge")
    ? "Wanting something hard to resist is human. You can hold the urge gently without obeying it."
    : "You'd never talk to a friend this harshly. What would you say to them right now? Try saying it to yourself.";
  return `
    <p><b>Mindfulness</b>: This is a moment of suffering. Just notice it, without fighting it or feeding it.</p>
    <p><b>Common humanity</b>: Struggling like this is part of being human. Lots of people feel this way too.</p>
    <p><b>Self-kindness</b>: ${kind} A hand on your heart and "May I be kind to myself" can help.</p>
    <p><b>Defusion</b> (ACT): Try rewording it as <i>"I'm having the thought that ${thought.charAt(0).toLowerCase() + thought.slice(1)}."</i> Notice how it becomes a thought you're having, not the truth about you.</p>
    <p><b>Values</b>: What matters to you here? Choose one small step toward it.</p>`;
}

// ---------- 5. CBT Coach: name the distortion, offer 2–3 exercises ----------
// techniquesFor() and DISTORTION_NAMES live in cbt-techniques.js, loaded first.
// Steps are from that local list. We never send the thought to an API.
function cbtCoach(signals) {
  const names = (signals.distortions || []).map(id => DISTORTION_NAMES[id]).filter(Boolean);
  const techniques = techniquesFor(signals);

  const spotted = names.length
    ? `<p><b>Distortions spotted:</b> ${names.map(name => `<span class="tag">${esc(name)}</span>`).join("")}</p>`
    : `<p><b>Distortions spotted:</b> none obvious in the wording. Two general exercises are below.</p>`;

  const blocks = techniques.map(tech => {
    const steps = tech.steps.map(step => `<li>${esc(step)}</li>`).join("");
    return `<p><b>${esc(tech.name)}</b>. ${esc(tech.description)}</p><ol>${steps}</ol>`;
  }).join("");

  return spotted + blocks;
}

// Which single coach to show first. The other four stay behind "See other angles".
// Points are just a way to pick. They are not a diagnosis.
// On a tie, the earlier name in `order` wins.
// If nothing was detected, Compassion is the calm default (every score stays 0).
function bestCoach(signals) {
  const scores = { dbt: 0, philo: 0, equation: 0, compassion: 0, cbt: 0 };
  const has = id => (signals.categories || []).includes(id);

  if (has("urge")) scores.dbt += 3;
  if (has("anger")) { scores.dbt += 2; scores.philo += 1; }
  if (has("anxiety")) scores.dbt += 2;
  if (has("hopelessness")) { scores.dbt += 2; scores.philo += 2; scores.compassion += 2; }
  if (has("selfBlame")) { scores.compassion += 3; scores.philo += 1; scores.dbt += 1; }

  const traps = (signals.distortions || []).length;
  if (traps) {
    scores.equation += traps * 2;
    scores.cbt += traps + 1;
  }
  if ((signals.absolutes || []).length) scores.equation += 1;

  const order = ["equation", "cbt", "dbt", "compassion", "philo"];
  let best = "compassion";
  let bestScore = 0;
  order.forEach(id => {
    if (scores[id] > bestScore) {
      best = id;
      bestScore = scores[id];
    }
  });
  return best;
}
