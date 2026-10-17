// catholic.js — Catholic factors for the Workspace: the theological and
// cardinal virtues, the seven capital tendencies with their contrary virtues,
// and an Ignatian consolation/desolation index. Pure logic, no DOM.
//
// A reflective aid built from design assumptions. It is NOT spiritual
// direction, NOT a judgment of anyone's soul, and NOT validated science.
// A feeling is not a sin, and a tendency is not a verdict. All local.
//
// Sources (checked against the texts):
//   Catechism of the Catholic Church (vatican.va):
//     1805–1809 the cardinal virtues: prudence, justice, fortitude, temperance
//     1812–1829 the theological virtues: faith, hope, charity
//     1831 the seven gifts of the Holy Spirit; 1832 the twelve fruits
//     1846–1848 mercy and sin; 1866 the capital sins
//   St. Ignatius, Spiritual Exercises, Rules for the Discernment of Spirits 313–336:
//     316 consolation, 317 desolation, 318 in desolation make no change,
//     319 pray and examine more, 321 be patient: consolation will come,
//     323 in consolation, store up strength for later.
//
//   factors  c = (v, t, c, d): 13 virtues v ∈ [0,1] (start 0.5), 7 tendencies
//            t ∈ [0,1] (start 0), and consolation/desolation word scores c, d.
//   words    hits n → s = 1 − exp(−0.6·n), an intensifier ("so", "really") adds ½ hit.
//            t = 1 − (1 − t_base)(1 − t_words)
//            v = clamp(v_base + (1 − v_base)·p_words − ½·t_words(contrary) − ½·neg_words)
//   Ignatian I = C − D ∈ [−1, 1]
//            C = 1 − (1 − Pe)(1 − c),  Pe = 0.8·mean(joy, hope, calm, connection)
//                                           + 0.4·max(0, mean(faith, hope, charity) − 0.5)
//            D = 1 − (1 − De)(1 − d),  De = 0.6·max(sadness, fear, loneliness)
//                                           + 0.2·max(anger, shame, guilt)
//            I ≤ −0.2 desolation, I ≥ 0.2 consolation, otherwise a quiet time.

const Catholic = (function () {
  const THEOLOGICAL = ["faith", "hope", "charity"];
  const CARDINAL = ["prudence", "justice", "fortitude", "temperance"];
  // CCC 1866 names avarice; "greed" is the everyday word.
  const PAIRS = [["pride", "humility"], ["greed", "generosity"], ["lust", "chastity"], ["envy", "kindness"],
    ["gluttony", "temperance"], ["wrath", "patience"], ["sloth", "diligence"]];
  const TENDENCIES = PAIRS.map(p => p[0]);
  const CONTRARY = ["humility", "generosity", "chastity", "kindness", "patience", "diligence"]; // temperance is cardinal
  const VIRTUES = THEOLOGICAL.concat(CARDINAL, CONTRARY);
  const VIRTUE_OF = Object.fromEntries(PAIRS);
  const TENDENCY_OF = Object.fromEntries(PAIRS.map(([t, v]) => [v, t]));
  const V0 = 0.5, GAMMA = 0.5, HIT = 0.6;
  const GIFTS = ["wisdom", "understanding", "counsel", "fortitude", "knowledge", "piety", "fear of the Lord"];
  const FRUITS = ["charity", "joy", "peace", "patience", "kindness", "goodness", "generosity", "gentleness", "faithfulness", "modesty", "self-control", "chastity"];
  // Each gift beside the virtue it perfects, as St. Thomas Aquinas pairs them (simplified).
  const GIFT_VIRTUE = { wisdom: "charity", understanding: "faith", counsel: "prudence", fortitude: "fortitude", knowledge: "faith", piety: "justice", "fear of the Lord": "hope" };
  // Each fruit beside the home value it names (emotions) or a virtue target.
  const FRUIT_HOME = { charity: ["e", "connection"], joy: ["e", "joy"], peace: ["e", "calm"], patience: ["v", "patience"], kindness: ["v", "kindness"],
    goodness: ["e", "connection"], generosity: ["v", "generosity"], gentleness: ["e", "calm"], faithfulness: ["e", "hope"], modesty: ["v", "temperance"],
    "self-control": ["v", "temperance"], chastity: ["v", "chastity"] };

  const r2 = x => Math.round(x * 100) / 100;
  const clamp01 = x => Math.min(1, Math.max(0, x));
  const c1 = (a, b) => r2(1 - (1 - a) * (1 - b));

  // ---------- Lexicon ----------
  const VIRTUE_LEX = {
    faith: [/\bi (still )?(believe|trust) (in )?(god|jesus|the lord|him)\b/g, /\b(went to mass|i prayed|i pray|the rosary|my faith)\b/g],
    hope: [/\b(hopeful|god will provide|it will get better|looking forward|i (still )?have hope)\b/g],
    charity: [/\bi (helped|forgave|served|visited)\b/g, /\b(act of (love|kindness)|volunteer(ed|ing)?|i love (him|her|them|my))\b/g],
    prudence: [/\b(thought it through|asked for (advice|counsel)|slept on it|waited before deciding|weighed it)\b/g],
    justice: [/\b(was honest|told the truth|made it right|paid (it|him|her|them) back|apologi[sz]ed|kept my (word|promise))\b/g],
    fortitude: [/\b(kept going|stood firm|was brave|found the courage|didn'?t give up|persever(ed|ing|e))\b/g],
    temperance: [/\b(self[- ]control|held back|in moderation|said no to|fasted|stayed sober)\b/g],
    humility: [/\b(i was wrong|my mistake|i admit(ted)?|humbl(e|ed|y)|humility|learned from it)\b/g],
    generosity: [/\b(i (gave|donated|shared)|generous(ly)?|gave (it )?away)\b/g],
    chastity: [/\b(chaste|chastity|pure (heart|thoughts)|modesty|custody of the eyes)\b/g],
    kindness: [/\b(kindness|kind (to|words)|happy for (him|her|them)|congratulated|encouraged (him|her|them))\b/g],
    patience: [/\b(patient|patiently|patience|calmed down|took a (deep )?breath|counted to ten|held my tongue)\b/g],
    diligence: [/\b(worked hard|got it done|finished (it|my)|diligent(ly)?|kept at it|did my (work|chores|duty))\b/g],
  };
  const NEG_LEX = {
    hope: [/\b(hopeless|no hope|no point|never get better)\b/g],
    charity: [/\bi (hate|can'?t stand) (him|her|them|everyone)\b/g],
    fortitude: [/\b(gave up|giving up|too scared)\b/g],
    prudence: [/\b(impulsive(ly)?|without thinking|rashly)\b/g],
    justice: [/\bi (lied|cheated|stole)\b/g],
  };
  const TENDENCY_LEX = {
    pride: [/\b(better than (all of )?(them|everyone|everybody|him|her)|i'?m (the best|superior)|beneath me|look down on|vain|vanity|i don'?t need (anyone|anybody|help))\b/g],
    greed: [/\b(greed|greedy|avarice|never enough money|want(ed)? more (money|stuff)|can'?t stop buying|hoarding)\b/g],
    lust: [/\b(lust|lustful|lusting|porn|pornography|impure thoughts?)\b/g],
    envy: [/\b(jealous|jealousy|envy|envious|resent (his|her|their) (success|life)|wish i had (his|her|their))\b/g],
    gluttony: [/\b(binge|binged|bingeing|binging|overate|ate too much|drank too much|can'?t stop eating|gluttony)\b/g],
    wrath: [/\b(angry|furious|rage|raging|enraged|wrath|livid|mad at)\b/g, /\b(revenge|get back at|hate (him|her|them))\b/g],
    sloth: [/\b(lazy|laziness|sloth|acedia|can'?t be bothered|procrastinat\w*|wasted the (whole )?day|no motivation|apathetic)\b/g],
  };
  // [regex, weight]
  const DESOLATION_LEX = [
    [/\b(far from god|far away from god|god (is|feels) (so )?(far|distant|silent|absent)|abandoned by god|god (has )?(left|forgotten) me|can'?t pray|prayer (feels|is) (dry|empty)|spiritually (dry|empty)|lukewarm|tepid)\b/g, 1],
    [/\b(lazy|restless|empty inside|darkness)\b/g, 0.5],
  ];
  const CONSOLATION_LEX = [
    [/\b(close to god|god (is|feels) (near|close)|felt god|at peace|peace in my heart|loved by god|thank(ed)? god|consolation)\b/g, 1],
    [/\b(grateful|thankful|peaceful)\b/g, 0.5],
  ];
  const NEGATED = /(\bnot|n't|\bnever|\bno longer)\s+(\w+\s+)?$/;
  const INTENSE = /\b(so|really|very|too|extremely)\s+$/;

  function hits(t, res, weight = 1) {
    let n = 0;
    res.forEach(re => {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(t))) {
        const before = t.slice(Math.max(0, m.index - 24), m.index);
        if (!NEGATED.test(before)) n += weight * (INTENSE.test(before) ? 1.5 : 1);
        if (m[0].length === 0) re.lastIndex++;
      }
    });
    return Math.min(3, n);
  }
  const sat = n => r2(1 - Math.exp(-HIT * n));

  function defaultFactors() {
    return { v: Object.fromEntries(VIRTUES.map(k => [k, V0])), t: Object.fromEntries(TENDENCIES.map(k => [k, 0])), c: 0, d: 0 };
  }
  const copy = f => ({ v: { ...f.v }, t: { ...f.t }, c: f.c, d: f.d });

  // Words -> evidence. Returns numbers only: { v (positive evidence), neg, t, c, d }.
  function score(text) {
    const t = String(text || "").toLowerCase().replace(/[\u2018\u2019]/g, "'");
    const out = { v: {}, neg: {}, t: {}, c: 0, d: 0 };
    VIRTUES.forEach(k => { out.v[k] = sat(hits(t, VIRTUE_LEX[k] || [])); out.neg[k] = sat(hits(t, NEG_LEX[k] || [])); });
    TENDENCIES.forEach(k => { out.t[k] = sat(hits(t, TENDENCY_LEX[k])); });
    out.c = sat(CONSOLATION_LEX.reduce((s, [re, w]) => s + hits(t, [re], w), 0));
    out.d = sat(DESOLATION_LEX.reduce((s, [re, w]) => s + hits(t, [re], w), 0));
    return out;
  }

  // New words add to the stored factors.
  function combine(base, words) {
    const f = copy(base || defaultFactors());
    if (!words) return f;
    TENDENCIES.forEach(k => { f.t[k] = c1(f.t[k], words.t[k] || 0); });
    VIRTUES.forEach(k => {
      const vb = f.v[k];
      const against = TENDENCY_OF[k] ? words.t[TENDENCY_OF[k]] || 0 : 0;
      f.v[k] = r2(clamp01(vb + (1 - vb) * (words.v[k] || 0) - GAMMA * against - GAMMA * (words.neg[k] || 0)));
    });
    f.c = c1(f.c, words.c || 0);
    f.d = c1(f.d, words.d || 0);
    return f;
  }

  // e is an object of emotion values by name.
  function ignatian(e, f) {
    const g = n => Number(e[n]) || 0;
    const theo = (f.v.faith + f.v.hope + f.v.charity) / 3;
    const Pe = clamp01(0.8 * (g("joy") + g("hope") + g("calm") + g("connection")) / 4 + 0.4 * Math.max(0, theo - V0));
    const De = clamp01(0.6 * Math.max(g("sadness"), g("fear"), g("loneliness")) + 0.2 * Math.max(g("anger"), g("shame"), g("guilt")));
    const C = c1(Pe, f.c), D = c1(De, f.d);
    const I = r2(Math.max(-1, Math.min(1, C - D)));
    return { I, C, D, state: I <= -0.2 ? "desolation" : I >= 0.2 ? "consolation" : "quiet" };
  }

  const IGNATIAN_TEXT = {
    desolation: "make no new changes now (SE 318); pray a little more and be patient: consolation will return (SE 321)",
    consolation: "receive it with gratitude and store up strength for harder days (SE 323)",
    quiet: "a quiet time: keep steady and notice what draws you toward God",
  };

  // The strongest tendency (≥ min), or null.
  function activeTendency(f, min = 0.1) {
    const top = TENDENCIES.map(k => [k, f.t[k]]).filter(([, x]) => x >= min).sort((a, b) => b[1] - a[1] || TENDENCIES.indexOf(a[0]) - TENDENCIES.indexOf(b[0]))[0];
    return top ? top[0] : null;
  }
  const weakestVirtue = f => VIRTUES.slice().sort((a, b) => f.v[a] - f.v[b] || VIRTUES.indexOf(a) - VIRTUES.indexOf(b))[0];

  // Gentle, optional practices. "do" speaks to you; "act" is the story version.
  const PRACTICE = {
    humility: { do: "pray the Litany of Humility, or name one thing someone else did well", act: "prayed a few lines of the Litany of Humility and named one thing someone else had done well" },
    generosity: { do: "give one small thing away today, quietly", act: "gave one small thing away, quietly, without telling anyone" },
    chastity: { do: "step away from what pulls at you and pray a short prayer for a pure heart; grace works in small steps", act: "stepped away from what was pulling at them and prayed a short prayer for a clean heart" },
    kindness: { do: "pray for the person you envy, by name, and thank God for one gift of theirs and one of yours", act: "prayed for the person they envied, by name, and thanked God for one gift of theirs and one of their own" },
    temperance: { do: "pause before the next meal or drink and say grace slowly", act: "paused before the next meal and said grace slowly" },
    patience: { do: "pause and pray before you answer: one slow breath, then \u201CJesus, I trust in you\u201D", act: "paused before answering and let one slow breath go all the way out" },
    diligence: { do: "do one small duty now for five minutes, offered to God", act: "did one small duty for five minutes and offered it to God" },
    faith: { do: "sit with a short Gospel passage for five minutes", act: "sat with a short Gospel passage for five minutes" },
    hope: { do: "pray the Memorare slowly, or read Romans 8:28", act: "prayed the Memorare slowly, one line at a time" },
    charity: { do: "do one act of kindness today, without telling anyone", act: "did one quiet act of kindness and told no one" },
    prudence: { do: "before deciding, pause, ask good counsel, and pray for guidance", act: "paused before deciding and asked a wise friend for counsel" },
    justice: { do: "make one thing right that is yours to make right", act: "made one small thing right" },
    fortitude: { do: "ask the Holy Spirit for courage, then take one small brave step", act: "asked the Holy Spirit for courage and took one small brave step" },
    examen: { do: "pray a short Ignatian examen tonight (one gift, one honest look back, mercy, one hope for tomorrow), and don't change big decisions now", act: "prayed a short examen: one gift of the day, one honest look back, mercy, and one hope for tomorrow" },
    mercy: { do: "remember that God's mercy is bigger than any failing; Confession is there whenever you feel ready, never as pressure", act: "remembered that God's mercy was bigger than any failing" },
    gratitude: { do: "thank God for one gift of today", act: "thanked God for one gift of the day" },
  };

  // Which practice: strongest tendency → its contrary virtue; else desolation →
  // examen; else heavy shame or guilt → mercy; else the weakest virtue.
  function practice(f, e, ig) {
    const k = activeTendency(f, 0.2);
    if (k) return { key: VIRTUE_OF[k], why: "tendency", tendency: k, ...PRACTICE[VIRTUE_OF[k]] };
    if (ig && ig.state === "desolation") return { key: "examen", why: "desolation", ...PRACTICE.examen };
    if ((Number(e.shame) || 0) >= 0.4 || (Number(e.guilt) || 0) >= 0.4) return { key: "mercy", why: "mercy", ...PRACTICE.mercy };
    const w = weakestVirtue(f);
    if (f.v[w] < V0) return { key: w, why: "weakest", ...PRACTICE[w] };
    return { key: "gratitude", why: "gratitude", ...PRACTICE.gratitude };
  }
  const mercyDue = e => (Number(e.shame) || 0) >= 0.4 || (Number(e.guilt) || 0) >= 0.4;
  const MERCY_LINE = "God's mercy is greater than any failing (CCC 1846); Confession is there whenever you feel ready, never as pressure";

  // Gifts and fruits as positive-target labels.
  function fruitsView(home, homeNames, f, vHome) {
    return FRUITS.map(fr => {
      const [kind, key] = FRUIT_HOME[fr];
      const target = kind === "e" ? home[homeNames.indexOf(key)] : vHome;
      const now = kind === "v" ? f.v[key] : null;
      return { fruit: fr, kind, key, target: r2(target), now };
    });
  }
  const giftsView = f => GIFTS.map(g => ({ gift: g, virtue: GIFT_VIRTUE[g], v: f.v[GIFT_VIRTUE[g]] }));

  // ---------- Story pieces (Catholic mode) ----------
  const OPEN = {
    pride: ["came home still sure they had been the smartest one in the room, and strangely tired from it.", "replayed the meeting, counting every point they had won."],
    greed: ["scrolled past one more thing to buy, and then another.", "checked the numbers again, as if enough were always one more away."],
    lust: ["noticed the same old pull at the end of a long day.", "felt restless and scattered, reaching for things that never satisfied."],
    envy: ["heard the good news about someone close and felt something sour instead of glad.", "kept comparing their life with a brother's, line by line."],
    gluttony: ["stood at the open fridge again, not really hungry.", "ate past full, trying to fill something food could not reach."],
    wrath: ["came home with the argument still burning in their chest.", "kept rehearsing what they should have said, louder each time."],
    sloth: ["let the whole day slide by, one small thing undone after another.", "lay on the couch, too heavy to start anything, even prayer."],
    desolation: ["felt far from everything that evening, even from God.", "sat in the dark kitchen, and prayer felt like talking to a wall."],
    weak: ["had an ordinary day, a little thin in places.", "noticed one part of their heart that needed tending."],
    mercy: ["carried an old mistake around all day, heavier with each hour.", "kept going back over what they had done, as if guilt could fix it."],
  };
  const NOT_VERDICT = [
    "It was not a verdict on who they were. It was a pull, the kind every person feels.",
    "They did not call themself names for it. A tendency is a direction, not an identity.",
  ];
  const DESOLATION_WORDS = [
    "An old priest had once told them: in a dark season, don't tear up the plans you made in the light. Consolation comes back.",
    "They remembered that dryness is not absence. God was nearer than it felt, and the feeling would pass.",
  ];
  const PRAYER = {
    humility: "They prayed, quietly: \u201CLord, make my heart humble, and keep it honest.\u201D",
    generosity: "They prayed, quietly: \u201CLord, everything I have is yours. Teach me to open my hands.\u201D",
    chastity: "They prayed, quietly: \u201CCreate in me a clean heart, O God.\u201D",
    kindness: "They prayed, quietly: \u201CLord, bless him, and teach me to be glad for him.\u201D",
    temperance: "They prayed, quietly: \u201CLord, you are enough.\u201D",
    patience: "They prayed, quietly: \u201CLord, give me a patient heart.\u201D",
    diligence: "They prayed, quietly: \u201CLord, I offer you this small work.\u201D",
    examen: "They prayed, quietly: \u201CLord, stay with me in the dark. I'll wait for you.\u201D",
    mercy: "They prayed, quietly: \u201CJesus, I trust in your mercy.\u201D",
    default: "They prayed, quietly: \u201CLord, I give you this one small step.\u201D",
  };
  const QUESTION = {
    humility: "What is one thing someone else did well today that you could name?",
    generosity: "What is one small thing you could give away today?",
    chastity: "What is one thing you could step away from today, with grace?",
    kindness: "Who could you pray for by name today?",
    temperance: "Where could you pause and say grace today?",
    patience: "What is one small act of patience you could offer today?",
    diligence: "What is one small duty you could offer today?",
    examen: "What is one gift from today, even a small one?",
    mercy: "Where could you let mercy in today?",
    default: "What is one small step of virtue you could offer today?",
  };

  return {
    THEOLOGICAL, CARDINAL, PAIRS, TENDENCIES, CONTRARY, VIRTUES, VIRTUE_OF, TENDENCY_OF, V0, GAMMA, GIFTS, FRUITS, GIFT_VIRTUE, FRUIT_HOME,
    defaultFactors, copy, score, combine, ignatian, IGNATIAN_TEXT, activeTendency, weakestVirtue, PRACTICE, practice, mercyDue, MERCY_LINE,
    fruitsView, giftsView, OPEN, NOT_VERDICT, DESOLATION_WORDS, PRAYER, QUESTION,
  };
})();

if (typeof module !== "undefined") module.exports = Catholic;
