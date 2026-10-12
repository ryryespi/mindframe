// analyzer.js — turns raw text into structured "signals" the bots can use.
// This is rule-based NLP: we look for keyword patterns (regular expressions).

// Each category maps to a list of regex patterns. \b = word boundary.
const CATEGORIES = {
  hopelessness: [/no point/, /hopeless/, /never (get|be) better/, /give up/, /what'?s the use/, /pointless/],
  selfBlame:    [/my fault/, /i('m| am) (a )?(failure|worthless|stupid|useless|bad)/, /mess (everything|it all) up/, /hate myself/, /i ruin/],
  urge:         [/\burge\b/, /tempt/, /want to (drink|use|smoke|binge|watch|look)/, /craving/, /relapse/, /can'?t resist/, /sin(ful)?\b/],
  anger:        [/angry/, /furious/, /hate (him|her|them|you)/, /rage/, /pissed/],
  anxiety:      [/worried/, /anxious/, /panic/, /scared/, /what if/],
};

// All-or-nothing words are a classic cognitive distortion signal.
const ABSOLUTES = ["always", "never", "everything", "nothing", "everyone", "no one", "nobody", "completely", "totally"];

// Crisis phrases trigger the safety message no matter what else is found.
const CRISIS = [/suicid/, /kill myself/, /end it( all)?\b/, /self[- ]?harm/, /hurt myself/, /cut myself/, /want to die/, /better off dead/, /end my life/, /no reason to live/];

function analyze(text) {
  const t = text.toLowerCase();
  const categories = Object.keys(CATEGORIES).filter(cat => CATEGORIES[cat].some(re => re.test(t)));
  const absolutes = ABSOLUTES.filter(w => new RegExp("\\b" + w + "\\b").test(t));
  const crisis = CRISIS.some(re => re.test(t));
  return { text, categories, absolutes, crisis };
}
