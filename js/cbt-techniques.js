// cbt-techniques.js — a local list of well-known CBT exercises.
//
// CBT Coach reads this file. Nothing here is sent to a server.
//
// Why not a public API? A quick check didn't find a reputable, CORS-friendly
// API that serves technique descriptions without wanting the user's thought.
// Endpoints that analyze text would ship the thought off the page. Article
// catalogs aren't a technique list. So the descriptions live here, and the
// page still works offline.
//
// Sources for the names and the shape of the exercises (we don't quote them):
// - Aaron T. Beck, A. John Rush, Brian F. Shaw, & Gary Emery,
//   Cognitive Therapy of Depression (1979): thought records, Socratic
//   questions, activity scheduling.
// - Judith S. Beck, Cognitive Behavior Therapy: Basics and Beyond:
//   Socratic questioning, behavioral experiments, thought records.
// - David D. Burns, Feeling Good (1980): the cognitive distortions list.
// - David D. Burns, The Feeling Good Handbook (1989): double-standard
//   technique, cost-benefit analysis.
// - Dennis Greenberger & Christine A. Padesky, Mind Over Mood:
//   7-column thought records, behavioral experiments.
// - Christopher Martell, Sona Dimidjian, & Ruth Herman-Dunn,
//   Behavioral Activation for Depression: behavioral activation,
//   activity scheduling.
// - Thomas D'Zurilla & Arthur Nezu, Problem-Solving Therapy: the
//   define / brainstorm / choose / try / review steps.
// - Thomas Borkovec: "worry time" (stimulus control / worry postponement)
//   in CBT for generalized anxiety.
// - Michelle Craske, David Barlow, and earlier exposure work (Joseph Wolpe):
//   graded exposure.
// - Paul Salkovskis, and common CBT worksheets: the responsibility pie,
//   especially when someone takes 100% of the blame.
// - Robert L. Leahy, Cognitive Therapy Techniques: a practitioner guide
//   that gathers many of these into one place.

// Plain-language names for the ids that analyzer.js puts in signals.distortions.
const DISTORTION_NAMES = {
  allOrNothing: "All-or-nothing thinking",
  overgeneralization: "Overgeneralization",
  mentalFilter: "Mental filter",
  discountingPositives: "Discounting the positive",
  mindReading: "Mind reading",
  fortuneTelling: "Fortune telling",
  catastrophizing: "Catastrophizing",
  labeling: "Labeling",
  shouldStatements: "Should statements",
  personalization: "Personalization",
  emotionalReasoning: "Emotional reasoning",
};

// fits: analyzer category ids (anxiety, selfBlame, ...) and distortion ids.
// CBT Coach scores a technique higher when a distortion matches than when
// only a broad mood category matches. See techniquesFor() below.
const CBT_TECHNIQUES = [
  {
    id: "thought-record",
    name: "Thought record",
    description: "Write the thought down like a hypothesis, then line up the facts on both sides. This is the basic CBT worksheet (Beck; Greenberger and Padesky).",
    steps: [
      "Situation: what happened, in one sentence, with no story attached?",
      "Feeling: name the emotion and rate it 0–100.",
      "Automatic thought: the exact words that ran through your head.",
      "Evidence for, then evidence against. Facts count; feelings are not facts.",
      "Balanced thought: a sentence a fair friend could agree with. Re-rate the feeling."
    ],
    fits: ["hopelessness", "selfBlame", "anxiety", "anger", "allOrNothing", "overgeneralization", "labeling", "personalization", "mentalFilter", "discountingPositives"],
  },
  {
    id: "cognitive-distortions",
    name: "Cognitive distortions list",
    description: "Burns' checklist of thinking habits: all-or-nothing thinking, overgeneralization, mental filter, discounting the positive, mind reading, fortune telling, catastrophizing, emotional reasoning, should statements, labeling, and personalization.",
    steps: [
      "Look at the distortion tags above and read each name slowly.",
      "Ask: which of these is this thought using, if any?",
      "Say the habit out loud (\"that's fortune telling\") so it is a pattern, not a fact.",
      "Rewrite the thought without that habit. Keep whatever part is still a real fact."
    ],
    fits: ["allOrNothing", "overgeneralization", "mentalFilter", "discountingPositives", "mindReading", "fortuneTelling", "catastrophizing", "labeling", "shouldStatements", "personalization", "emotionalReasoning"],
  },
  {
    id: "socratic-questioning",
    name: "Socratic questioning",
    description: "A short set of questions therapists use to examine a thought instead of arguing with it (Beck).",
    steps: [
      "What is the evidence for this thought? What is the evidence against it?",
      "Is there another way to see the same facts?",
      "What would I tell a friend who said this?",
      "What is the effect of believing it, and what happens if I loosen my grip a little?"
    ],
    fits: ["allOrNothing", "mindReading", "fortuneTelling", "shouldStatements", "emotionalReasoning", "selfBlame", "anger", "labeling"],
  },
  {
    id: "decatastrophizing",
    name: "Decatastrophizing",
    description: "When the mind jumps to the worst outcome, spell out the worst, the best, and the most likely, then plan for the likely one (Beck; Burns' \"what if\" questions).",
    steps: [
      "If this worry came true, what is the worst realistic outcome? Not a movie, the actual next events.",
      "What is the best realistic outcome? What is the most likely one?",
      "If the most likely one happened, what would I do in the first hour?",
      "Has a similar fear happened before? How did it actually turn out?"
    ],
    fits: ["catastrophizing", "fortuneTelling", "anxiety"],
  },
  {
    id: "behavioral-activation",
    name: "Behavioral activation",
    description: "Mood often follows action, not the other way around. Do one small, valued activity before you feel motivated (Martell, Dimidjian, and Herman-Dunn).",
    steps: [
      "Pick one activity that used to matter: a person, a task, or a body movement.",
      "Shrink it until it takes 10 minutes or less.",
      "Put a time on it today. Do it whether motivation shows up or not.",
      "Afterward, note the mood before and after, just as data."
    ],
    fits: ["hopelessness", "selfBlame"],
  },
  {
    id: "behavioral-experiments",
    name: "Behavioral experiment",
    description: "Treat the prediction as a guess and collect one piece of real-world evidence (Beck; Greenberger and Padesky).",
    steps: [
      "Write the prediction: \"If I do X, then Y will happen,\" and rate how sure you are (0–100).",
      "Pick a small, safe test you can do today. Skip anything dangerous.",
      "Do the test. Write what actually happened, not what you feared.",
      "What does that result say about the original prediction?"
    ],
    fits: ["fortuneTelling", "mindReading", "catastrophizing", "anxiety"],
  },
  {
    id: "cost-benefit",
    name: "Cost-benefit analysis",
    description: "List what the thought, the urge, or the rule is costing you and what it seems to give you (Burns, The Feeling Good Handbook).",
    steps: [
      "Draw two columns: advantages of holding this thought or following this urge, and disadvantages.",
      "Be honest about the short-term relief in the advantages column.",
      "Then list longer-term costs: time, relationships, energy, self-respect.",
      "Ask which column you want to vote for today, and name one action that matches that vote."
    ],
    fits: ["shouldStatements", "urge", "anger", "emotionalReasoning"],
  },
  {
    id: "double-standard",
    name: "Double-standard technique",
    description: "Compare the words you use on yourself with the words you would use for someone you care about (Burns).",
    steps: [
      "Write the harsh sentence exactly as you said it to yourself.",
      "Imagine a friend in the same situation. What would you say to them?",
      "If those two speeches don't match, the harsher one is a double standard, not a fact.",
      "Keep the kinder version. It still has to be honest, not fake cheer."
    ],
    fits: ["labeling", "selfBlame", "shouldStatements", "personalization"],
  },
  {
    id: "responsibility-pie",
    name: "Responsibility pie",
    description: "When blame collapses onto you, slice the causes into a pie so one person is not carrying the whole circle (Salkovskis; common CBT worksheets).",
    steps: [
      "Name the outcome you feel entirely responsible for.",
      "List every other contributing factor: other people, timing, chance, missing information, the task itself.",
      "Give each factor a slice that adds up to 100%. Leave a slice for your own part, no bigger than the facts support.",
      "Look at your slice. Responsibility can be real without being total."
    ],
    fits: ["personalization", "selfBlame"],
  },
  {
    id: "worry-time",
    name: "Worry time",
    description: "Postpone everyday worries to a short, scheduled window instead of rehearsing them all day (Borkovec's worry postponement). Not for thoughts of harming yourself; use the 988 resources in the banner for those.",
    steps: [
      "Choose a 15-minute worry window later today, not at bedtime.",
      "When a worry shows up early, write it in one line and tell yourself you will open it at that time.",
      "At worry time, read the list. For each item, either problem-solve one step or decatastrophize it.",
      "When the timer ends, stop. Unfinished items can wait for the next window."
    ],
    fits: ["anxiety", "fortuneTelling", "catastrophizing"],
  },
  {
    id: "graded-exposure",
    name: "Graded exposure",
    description: "Anxiety shrinks when you stay with a feared situation in small steps, instead of escaping it (Wolpe; Craske and Barlow). Use a therapist if the fear is severe. Do not use this for urges to harm yourself.",
    steps: [
      "List situations that scare you, from mildly uncomfortable to the hardest.",
      "Start with the easiest one that you can stay in for a few minutes.",
      "Stay, without safety behaviors if you can, until the feeling eases a notch. Then leave on purpose, not in a panic.",
      "Repeat that step until it is boring, then move one step up the list."
    ],
    fits: ["anxiety", "catastrophizing"],
  },
  {
    id: "activity-scheduling",
    name: "Activity scheduling",
    description: "Plan a few mastery or pleasure activities into the day so the day isn't only the mood (Beck's depression treatment; behavioral activation).",
    steps: [
      "On paper, mark three slots today: morning, afternoon, evening.",
      "Put one small mastery task (something that gets finished) and one pleasant activity on the page.",
      "Rate expected enjoyment 0–10 before, and actual enjoyment after.",
      "Keep the activities that scored higher than you predicted. Schedule those again tomorrow."
    ],
    fits: ["hopelessness"],
  },
  {
    id: "problem-solving",
    name: "Problem solving",
    description: "Split \"this is awful\" into a concrete problem and a first step (D'Zurilla and Nezu).",
    steps: [
      "State the problem in one sentence that starts with a fact, not a label about you.",
      "Brainstorm at least four options, including one tiny option. Don't judge them yet.",
      "Cross out anything unsafe. Pick the option with the best mix of helpful and doable.",
      "Do the first step, then review: what changed, and what is the next step?"
    ],
    fits: ["hopelessness", "anxiety", "anger"],
  },
];

// Pick 2 or 3 techniques. Distortion matches count double, because they are
// more specific than a broad category like "anxiety". If nothing matches,
// fall back to the two most general worksheets so the card is never empty.
function techniquesFor(signals) {
  const distortions = new Set(signals.distortions || []);
  const categories = new Set(signals.categories || []);

  const scored = CBT_TECHNIQUES.map(tech => {
    let score = 0;
    tech.fits.forEach(tag => {
      if (distortions.has(tag)) score += 2;
      else if (categories.has(tag)) score += 1;
    });
    return { tech, score };
  });

  // Highest score first. Ties break alphabetically so the result doesn't flicker.
  scored.sort((a, b) => b.score - a.score || a.tech.name.localeCompare(b.tech.name));

  const picked = scored.filter(item => item.score > 0).slice(0, 3).map(item => item.tech);

  const fillers = ["thought-record", "socratic-questioning"];
  fillers.forEach(id => {
    if (picked.length >= 2) return;
    if (picked.some(tech => tech.id === id)) return;
    const fallback = CBT_TECHNIQUES.find(tech => tech.id === id);
    if (fallback) picked.push(fallback);
  });

  return picked.slice(0, 3);
}
