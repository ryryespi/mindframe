// analyzer.js — turns raw text into structured "signals" the bots can use.
// This is rule-based NLP: we look for keyword patterns (regular expressions).

// Each category maps to a list of regex patterns. \b = word boundary.
const CATEGORIES = {
  hopelessness: [/no point/, /hopeless/, /never (get|be) better/, /give up/, /what'?s the use/, /pointless/],
  selfBlame:    [/my fault/, /i('m| am) (a )?(failure|worthless|stupid|useless|bad)/, /mess (everything|it all) up/, /hate myself/, /i ruin/],
  // Leading \b so "sin" / "sinful" only match as whole words.
  // Without it, words that merely end in "sin" (cousin, basin) were false hits.
  urge:         [/\burge\b/, /tempt/, /want to (drink|use|smoke|binge|watch|look)/, /craving/, /relapse/, /can'?t resist/, /\bsin(ful)?\b/],
  anger:        [/angry/, /furious/, /hate (him|her|them|you)/, /rage/, /pissed/],
  anxiety:      [/worried/, /anxious/, /panic/, /scared/, /what if/],
};

// All-or-nothing words are a classic cognitive distortion signal.
const ABSOLUTES = ["always", "never", "everything", "nothing", "everyone", "no one", "nobody", "completely", "totally"];

// Specific cognitive distortions, named the way Burns lists them in Feeling Good
// (all-or-nothing, overgeneralization, mental filter, disqualifying / discounting
// the positive, mind reading, fortune telling, catastrophizing, emotional reasoning,
// should statements, labeling, personalization). Beck's cognitive model is the
// idea underneath: a thought can be examined as a hypothesis, not a fact.
// Each key is an id. CBT Coach uses these ids to pick techniques.
// Patterns are intentionally simple (keywords), same style as CATEGORIES above.
// Named DISTORTION_PATTERNS, not DISTORTIONS: bots.js already uses that name
// for the Thought Equation labels. Two const declarations would crash the page.
const DISTORTION_PATTERNS = {
  allOrNothing: [/\balways\b/, /\bnever\b/, /\beverything\b/, /\bnothing\b/, /\beveryone\b/, /\bno one\b/, /\bnobody\b/, /\bcompletely\b/, /\btotally\b/, /\b100%\b/],
  overgeneralization: [/\bevery time\b/, /\btypical of me\b/, /\bkeeps happening\b/, /\bthis always happens\b/, /\bi always\b/, /\bi never\b/, /\bnothing ever\b/, /\beverybody\b/],
  mentalFilter: [/can'?t stop thinking about/, /all i (can )?see/, /the only thing (that|i)/, /nothing but (the )?(bad|negative|worst)/],
  discountingPositives: [/doesn'?t count/, /(just|pure|only|sheer) luck/, /that was luck/, /anyone could/, /doesn'?t matter that/, /\byeah,? but\b/, /so what if/],
  mindReading: [/\b(they|he|she|people|everyone) (must |probably )?(thinks?|believes?|knows?) (that )?i\b/, /\bjudging me\b/],
  fortuneTelling: [/going to fail/, /will never/, /'ll never/, /i know i'?ll/, /\bbound to\b/, /won'?t work/, /\bwhat if\b/, /i (will|'ll) (fail|lose|mess)/],
  catastrophizing: [/\b(disaster|catastrophe|terrible|awful|horrible|worst)\b/, /can'?t (handle|cope|stand)/, /fall apart/, /\bruined\b/, /end of the world/],
  labeling: [/i('m| am) (a |an )?(failure|loser|idiot|worthless|stupid|useless)/, /i('m| am) such a/],
  shouldStatements: [/\bshould\b/, /\bmust\b/, /\bought\b/, /\bhave to\b/, /supposed to/],
  personalization: [/my fault/, /because of me/, /\bi ruin/, /if only i/, /blame myself/],
  emotionalReasoning: [/i feel\b.+\b(so|therefore)\b/, /feels true/, /because i feel/],
};

// Crisis phrases trigger the safety message no matter what else is found.
const CRISIS = [/suicid/, /kill myself/, /end it( all)?\b/, /self[- ]?harm/, /hurt myself/, /cut myself/, /want to die/, /better off dead/, /end my life/, /no reason to live/];

function analyze(text) {
  const t = text.toLowerCase();
  const categories = Object.keys(CATEGORIES).filter(cat => CATEGORIES[cat].some(re => re.test(t)));
  const absolutes = ABSOLUTES.filter(w => new RegExp("\\b" + w + "\\b").test(t));
  const distortions = Object.keys(DISTORTION_PATTERNS).filter(id => DISTORTION_PATTERNS[id].some(re => re.test(t)));
  // Absolute words are the usual sign of all-or-nothing thinking, even if a
  // future edit adds a word to ABSOLUTES and forgets DISTORTION_PATTERNS.
  if (absolutes.length && !distortions.includes("allOrNothing")) distortions.push("allOrNothing");
  const crisis = CRISIS.some(re => re.test(t));
  return { text, categories, absolutes, distortions, crisis };
}
