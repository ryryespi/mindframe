// bots.js — three "personas". Each is a function: signals in, HTML string out.
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

// ---------- 3. Thought Equation: structured worksheet + a score ----------
const DISTORTIONS = {
  absolutes: "All-or-nothing thinking",
  selfBlame: "Labeling / personalization",
  hopelessness: "Fortune telling (predicting the future)",
  anxiety: "Catastrophizing",
  anger: "Mind reading / should statements",
  urge: "Emotional reasoning (\"I feel it, so I must act\")",
};

function thoughtEquation({ text, categories, absolutes }) {
  const distortions = categories.map(c => DISTORTIONS[c]).filter(Boolean);
  if (absolutes.length) distortions.unshift(DISTORTIONS.absolutes);

  // Simple, transparent formula. Each distortion lowers how believable the
  // thought is as stated; we assume a neutral 0.5 evidence balance.
  //   Believability = EvidenceFor / (EvidenceFor + EvidenceAgainst) × (1 − 0.15 × D)
  const D = distortions.length;
  const believability = Math.max(0.05, 0.5 * (1 - 0.15 * D));
  const pct = Math.round(believability * 100);

  // Balanced conclusion: soften absolute words.
  let balanced = text
    .replace(/\balways\b/gi, "sometimes")
    .replace(/\bnever\b/gi, "not yet")
    .replace(/\beverything\b/gi, "some things")
    .replace(/\bnothing\b/gi, "not much right now")
    .replace(/there'?s no point( trying)?/gi, "trying still gives me a chance");

  return `
    <p><b>Thought:</b> "${esc(text)}"</p>
    <p><b>Evidence for:</b> <i>List facts (not feelings) that support it.</i></p>
    <p><b>Evidence against:</b> <i>Times it wasn't true, what a friend would say, things you've done well.</i></p>
    <p><b>Distortions spotted:</b> ${D ? distortions.map(d => `<span class="tag">${d}</span>`).join("") : "none obvious"}</p>
    <div class="formula">B = F / (F + A) × (1 − 0.15·D)<br>B = 0.5 × (1 − 0.15·${D}) = <b>${pct}%</b></div>
    <p style="font-size:12px;color:#888">F = evidence for, A = evidence against (assumed equal), D = distortions. Lower B means the thought, as worded, is less reliable.</p>
    <p><b>Balanced conclusion:</b> "${esc(balanced)}" + "I'm struggling right now, and I can take one small step."</p>`;
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
