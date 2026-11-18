/* MindFrame Now — bundled content. Static; no network, no updates required.
   Sources: State Finder (Ryan Espinosa, Drive), Ariel Words (ariel_words.json),
   Ariel quotes (quotes.json), MindFrame affirmations (js/data/strings.js),
   MindFrame research companions (Box 4 Close-the-Loop, Read-Back, Pre-Technological Anchor,
   Rest State, Peak Now). All credit and glory to God. */
(function (root) {
  "use strict";
  var C = {};
  C.version = "1.0.0";
  C.energyLabels = { 1: "Resting", 2: "Cruising", 3: "Active", 4: "Pushing Hard" };
  C.stressLabels = { 1: "Calm", 2: "Alert", 3: "Tense", 4: "Overwhelmed" };
  C.moods = { heavy: "Heavy", okay: "Okay", light: "Light" };
  C.focuses = { looping: "Looping", scattered: "Scattered", clear: "Clear" };
  C.contexts = { alone: "Alone", with: "With someone", conflict: "In a hard conversation" };

  /* 16 states. key = `${energy}-${stress}` (the State Finder lookup key, fixed). */
  C.states = {
    "1-1": { name: "Deep Rest", text: "You are fully at peace. There is no pressure to perform. You are safe just existing right now.", word: "rest", technique: "pretech", themes: ["rest", "silence"], affirmWord: "rest" },
    "1-2": { name: "Gentle Pause", text: "You are resting but keeping a light eye on things. Breathe and let the awareness fade.", word: "rest", technique: "reststate", themes: ["rest", "silence"], affirmWord: "quiet" },
    "1-3": { name: "Anxious Rest", text: "You are physically resting, but your mind is racing. Rest is a biological necessity, not a reward to earn.", word: "rumination", technique: "pretech", themes: ["silence", "rest"], affirmWord: "calm" },
    "1-4": { name: "Paralyzed", text: "The pressure is incredibly high, but you have no energy to move. Your body pulled the emergency brake. Do not fight this.", word: "reach-out", technique: "help", themes: ["grace", "belonging"], affirmWord: "gentleness", care: true },
    "2-1": { name: "Light Stroll", text: "Moving forward easily with zero pressure. You are handling the day as it comes.", word: "behavioral-activation", technique: "chain", themes: ["hope", "return"], affirmWord: "ease" },
    "2-2": { name: "Steady Pace", text: "A normal, balanced day. You're getting things done without burning out.", word: "wise-mind", technique: "readback", themes: ["return", "hope"], affirmWord: "steadiness" },
    "2-3": { name: "Grinding", text: "Everything feels heavier than it should. It takes conscious willpower to keep momentum going.", word: "opposite-action", technique: "dps", themes: ["endurance", "waiting"], affirmWord: "patience" },
    "2-4": { name: "Survival Mode", text: "Doing the bare minimum to keep your head above water. Be gentle with yourself.", word: "grace", technique: "help", themes: ["grace", "belonging"], affirmWord: "kindness", care: true },
    "3-1": { name: "Inspired Action", text: "You are motivated because you want to be, not because you have to. Enjoy this natural momentum.", word: "behavioral-activation", technique: "chain", themes: ["hope", "return"], affirmWord: "joy" },
    "3-2": { name: "Focused Work", text: "Highly engaged and tackling challenges with clear-headed focus.", word: "wise-mind", technique: "chain", themes: ["return", "endurance"], affirmWord: "focus" },
    "3-3": { name: "Forcing It", text: "Working hard, but fueled by anxiety. You're getting things done, but it's costing you peace.", word: "tipp", technique: "dps", themes: ["endurance", "rest"], affirmWord: "peace" },
    "3-4": { name: "Frantic Hustle", text: "Rushing to put out fires. Stress is driving your actions. Finish what's critical, then step away.", word: "tipp", technique: "closeloop", themes: ["rest", "endurance"], affirmWord: "calm" },
    "4-1": { name: "Flow State", text: "Pure, effortless creation. You are pouring intense energy into something you love, completely stress-free.", word: "rest", technique: "reststate", themes: ["hope", "rest"], affirmWord: "gratitude" },
    "4-2": { name: "The Sprint", text: "Pushing hard toward a goal. Intense, but you are still in control. Plan recovery for the finish line.", word: "wise-mind", technique: "reststate", themes: ["endurance", "waiting"], affirmWord: "steadiness" },
    "4-3": { name: "Overdrive", text: "Pushing physical/mental limits while highly stressed. You need to decelerate soon.", word: "tipp", technique: "dps", themes: ["rest", "endurance"], affirmWord: "rest" },
    "4-4": { name: "Total Burnout Alert", text: "Demanding maximum effort under crushing stress. The system is overloading. Stop and recover immediately.", word: "rest", technique: "help", themes: ["rest", "grace"], affirmWord: "rest", care: true }
  };

  /* Affirmation templates from MindFrame (js/data/strings.js). */
  C.affirmations = {
    room: ["There is room for {{word}} here, even now.", "I can make a little room for {{word}} today."],
    general: ["I matter, and I am human; one good step is enough.", "I don't know the ending yet, and I can handle the next hour."],
    heavy: ["Some of the time is not all of the time.", "Part of me feels heavy, and part of me is still here; I can hold both."],
    light: ["Part of me is glad, and part of me is still careful; I can hold both."],
    faith: ["God can give me {{word}} for {{span}}.", "I can bring this {{state}} to God and ask for {{word}}."],
    spans: ["this hard day", "the next hour", "this moment"]
  };

  /* Grounding techniques (MindFrame research companions). */
  C.techniques = {
    closeloop: { name: "Close the Loop (Box 4)", minutes: 3, steps: [
      "Notice and name it: \u201cThis is a loop.\u201d",
      "Ask how, not why: what is the very next physical step?",
      "Write one completion line: \u201cWhen ___, I will ___.\u201d Or: \u201cThis is done.\u201d Or: \u201cI let this go for today.\u201d",
      "Park anything left to your 7:30 slot.",
      "Senses: five things the light touches, both feet, one sound.",
      "Turn to a person or an act. Say: \u201cDone. Here.\u201d"],
      note: "At most two runs per loop. Not for racing thoughts that won't slow down. For those, rest and reach a person.",
      source: "MindFrame Box 4; implementation intentions (Gollwitzer & Sheeran, 2006); Zeigarnik plan-making (Masicampo & Baumeister, 2011)." },
    readback: { name: "Read-Back", minutes: 1, steps: [
      "Ask, or have someone ask you: \u201cWhere are you?\u201d",
      "Answer: \u201cHere.\u201d They answer: \u201cHeard.\u201d",
      "Name one object you can both see.",
      "No rehashing the topic for 15 minutes."],
      note: "Works alone too: say it to yourself, then name an object out loud.",
      source: "MindFrame Read-Back; affect labeling (Lieberman et al., 2007)." },
    pretech: { name: "Pre-Technological Anchor", minutes: 1, steps: [
      "Hold your anchor (a stone, a ring, anything you can touch).",
      "Three slow breaths with your eyes open.",
      "Say quietly: \u201cBreath, stone, home.\u201d",
      "Find one real smell nearby (coffee, soap, air).",
      "Feel both feet on the floor."],
      note: "Nothing to charge, nothing to update.",
      source: "MindFrame Pre-Technological Anchor; slow breathing (Zaccaro et al., 2018)." },
    reststate: { name: "Rest State (60-second breath)", minutes: 1, breath: true, steps: [
      "Use the breathing circle below: in as it grows, out as it shrinks.",
      "About 5.5 breaths a minute. Let the exhale be a little longer.",
      "When it ends, name one thing that is still here.",
      "If you're in a flow or a sprint, choose your exit time now, while things are calm."],
      note: "Rest is best entered while the pressure is low, not in the middle of it.",
      link: "https://ryryespi.github.io/mindframe/rest-state/app/",
      source: "MindFrame Rest State; resonance breathing (Lehrer & Gevirtz, 2014); O~3 finding: enter rest while the threat is absent." },
    dps: { name: "Drop \u00b7 Press \u00b7 Snap", minutes: 1, steps: [
      "Drop your shoulders. Let your weight sink into your heels.",
      "Take one long exhale, longer than the inhale.",
      "Press your feet into the floor for five seconds.",
      "Snap back: name three things you can see right now."],
      note: "Repeat once if needed, then go on to the next small step.",
      source: "MindFrame grounding; physiological sigh (Balban et al., 2023)." },
    help: { name: "Reach one person", minutes: 2, breath: true, steps: [
      "Stop pushing. This isn't a moment to fix everything.",
      "Send one line to a person you trust: \u201cI'm in a loop. Can you ask me where I am?\u201d",
      "While you wait: one slow breath with the circle below.",
      "When they answer, say \u201cHere,\u201d and let them say \u201cHeard.\u201d"],
      note: "If you might hurt yourself or can't stay safe, call or text 988 (US) now, or 911.",
      source: "MindFrame Accepting Help card; social support and stress (Cohen & Wills, 1985)." },
    chain: { name: "One Thought, One Act", minutes: 1, steps: [
      "Pick one thought worth acting on.",
      "Name the smallest physical act that moves it.",
      "Do only that act.",
      "Say: \u201cDone. Here.\u201d Then choose: next act, or rest."],
      note: "Momentum is a gift. Spend it on one thing at a time.",
      source: "MindFrame Chain card; behavioral activation (Dimidjian et al., 2006)." },
    pause: { name: "Shared Pause, then Repair", minutes: 2, steps: [
      "Say: \u201cCan we pause for two minutes?\u201d Both of you stop talking.",
      "Each of you takes three slow breaths.",
      "Come back and say one true sentence: \u201cWhat I heard you say was ___.\u201d",
      "Let them confirm or correct it, then go on."],
      note: "In the O~3 simulations, pausing together and then repairing worked in 62 of 80 runs. Repair alone worked in 5 of 80. That's a model, not proof, but it's worth a try.",
      source: "MindFrame O~3 v1.1; repair attempts (Gottman & Levenson, 1999)." },
    senses: { name: "5-4-3-2-1", minutes: 2, steps: [
      "5 things you can see.", "4 things you can touch.", "3 things you can hear.", "2 things you can smell.", "1 slow breath."],
      note: "A common grounding exercise (no single primary source).",
      source: "Common grounding practice." }
  };

  C.words = [
 {
  "id": "rumination",
  "text": "rumination",
  "category": "barrier",
  "meaning": "Brooding that pretends to be work and never clocks out.",
  "opening": "The loop pretended to be work and never clocked out.",
  "turn": "The same question turned over like a stone with no underside.",
  "closing": "You could notice the loop without immediately obeying it."
 },
 {
  "id": "isolate",
  "text": "isolate",
  "category": "barrier",
  "meaning": "Pulling away until the room has no windows.",
  "opening": "Every door looked safer closed.",
  "turn": "Silence filled the gaps with threat.",
  "closing": "Isolation was a shelter that had become a room without windows."
 },
 {
  "id": "hopeless",
  "text": "hopeless",
  "category": "barrier",
  "meaning": "The sweeping claim that nothing ahead is worth crossing toward.",
  "opening": "A sweeping claim said nothing ahead was worth the crossing.",
  "turn": "The future arrived already decided.",
  "closing": "The claim could sit in the room without becoming the only voice."
 },
 {
  "id": "wise-mind",
  "text": "wise mind",
  "category": "dbt",
  "meaning": "The place where emotion and reason sit at the same table.",
  "opening": "Emotion and reason sat at the same table, and neither was thrown out.",
  "turn": "You asked whether the hidden race was even real.",
  "closing": "Wise mind offered the ground that was already under your feet."
 },
 {
  "id": "opposite-action",
  "text": "opposite action",
  "category": "dbt",
  "meaning": "Doing the kind thing the urge voted against.",
  "opening": "The feeling argued for disappearing, and another action was still possible.",
  "turn": "You did the kind thing the urge had voted against.",
  "closing": "One opposite step did not betray how hard it felt."
 },
 {
  "id": "tipp",
  "text": "TIPP",
  "category": "dbt",
  "meaning": "Cooling the body so a wider thought can enter.",
  "opening": "The body was carrying more fire than the mind could interpret.",
  "turn": "You cooled it a little, with breath or cold or a slower stance.",
  "closing": "When the body softened, a wider thought could enter."
 },
 {
  "id": "behavioral-activation",
  "text": "one small task",
  "category": "tool",
  "meaning": "One small task, no larger than a cup you can wash.",
  "opening": "One small task sat within reach, no larger than a cup you could wash.",
  "turn": "You did the next right inch instead of the entire future.",
  "closing": "A finished small thing is already a way back into the day."
 },
 {
  "id": "reach-out",
  "text": "reach out",
  "category": "tool",
  "meaning": "One true sentence toward someone real.",
  "opening": "One small sentence toward a real person waited to be sent.",
  "turn": "Reaching out was courage for connection, not a fight against anyone.",
  "closing": "The world does not always end when a true word leaves your hands."
 },
 {
  "id": "grace",
  "text": "grace",
  "category": "gift",
  "meaning": "A kindness you did not have to earn.",
  "opening": "No one asked you to audition for being wanted.",
  "turn": "Grace arrived the way morning does, without consulting your list of failures.",
  "closing": "You were loved before the work, and after it, and in the long stretch where you could not work at all."
 },
 {
  "id": "rest",
  "text": "rest",
  "category": "gift",
  "meaning": "Remaining without a performance.",
  "opening": "The day had been loud in ways that did not make a sound.",
  "turn": "You sat down, and the chair did not require a reason.",
  "closing": "Rest was not disappearing; it was remaining without a performance."
 },
 {
  "id": "belonging",
  "text": "belonging",
  "category": "connection",
  "meaning": "The quiet fact that your absence would be noticed.",
  "opening": "You had stood in the doorway long enough to memorize the wood grain.",
  "turn": "Someone looked up and made a space that was clearly yours.",
  "closing": "Belonging is not a prize for being easy to love. It is the quiet fact that your absence would be noticed."
 }
];

  C.quotes = [
 {
  "id": "psalm-46-10",
  "text": "Be still, and know that I am God.",
  "author": "Psalm 46:10",
  "source": "Psalm 46:10, King James Version (public domain).",
  "theme": "silence",
  "path": "endure",
  "requiresBelief": true
 },
 {
  "id": "psalm-23-1",
  "text": "The Lord is my shepherd; I shall not want.",
  "author": "Psalm 23:1",
  "source": "Psalm 23:1, King James Version (public domain).",
  "theme": "belonging",
  "path": "endure",
  "requiresBelief": true
 },
 {
  "id": "psalm-30-5",
  "text": "Weeping may endure for a night, but joy cometh in the morning.",
  "author": "Psalm 30:5",
  "source": "Psalm 30:5, King James Version (public domain).",
  "theme": "hope",
  "path": "endure",
  "requiresBelief": true
 },
 {
  "id": "matthew-11-28",
  "text": "Come unto me, all ye that labour and are heavy laden, and I will give you rest.",
  "author": "Matthew 11:28",
  "source": "Matthew 11:28, King James Version (public domain).",
  "theme": "rest",
  "path": "endure",
  "requiresBelief": true
 },
 {
  "id": "2-cor-12-9",
  "text": "My grace is sufficient for thee: for my strength is made perfect in weakness.",
  "author": "2 Corinthians 12:9",
  "source": "2 Corinthians 12:9, King James Version (public domain).",
  "theme": "grace",
  "path": "endure",
  "requiresBelief": true
 },
 {
  "id": "mark-5-36",
  "text": "Be not afraid, only believe.",
  "author": "Mark 5:36",
  "source": "Mark 5:36, King James Version (public domain).",
  "theme": "hope",
  "path": "endure",
  "requiresBelief": true
 },
 {
  "id": "isaiah-30-15",
  "text": "In returning and rest shall ye be saved; in quietness and in confidence shall be your strength.",
  "author": "Isaiah 30:15",
  "source": "Isaiah 30:15, King James Version (public domain).",
  "theme": "rest",
  "path": "endure",
  "requiresBelief": true
 },
 {
  "id": "isaiah-40-31",
  "text": "They that wait upon the Lord shall renew their strength.",
  "author": "Isaiah 40:31",
  "source": "Isaiah 40:31, King James Version (public domain).",
  "theme": "waiting",
  "path": "endure",
  "requiresBelief": true
 },
 {
  "id": "psalm-34-18",
  "text": "The Lord is nigh unto them that are of a broken heart.",
  "author": "Psalm 34:18",
  "source": "Psalm 34:18, King James Version (public domain).",
  "theme": "grace",
  "path": "endure",
  "requiresBelief": true
 },
 {
  "id": "hebrews-13-5",
  "text": "I will never leave thee, nor forsake thee.",
  "author": "Hebrews 13:5",
  "source": "Hebrews 13:5, King James Version (public domain).",
  "theme": "belonging",
  "path": "endure",
  "requiresBelief": true
 },
 {
  "id": "john-14-27",
  "text": "Peace I leave with you, my peace I give unto you.",
  "author": "John 14:27",
  "source": "John 14:27, King James Version (public domain).",
  "theme": "rest",
  "path": "endure",
  "requiresBelief": true
 },
 {
  "id": "1-peter-5-7",
  "text": "Casting all your care upon him; for he careth for you.",
  "author": "1 Peter 5:7",
  "source": "1 Peter 5:7, King James Version (public domain).",
  "theme": "grace",
  "path": "endure",
  "requiresBelief": true
 },
 {
  "id": "lamentations-3-26",
  "text": "It is good that a man should both hope and quietly wait for the salvation of the Lord.",
  "author": "Lamentations 3:26",
  "source": "Lamentations 3:26, King James Version (public domain).",
  "theme": "waiting",
  "path": "endure",
  "requiresBelief": true
 },
 {
  "id": "isaiah-26-3",
  "text": "Thou wilt keep him in perfect peace, whose mind is stayed on thee.",
  "author": "Isaiah 26:3",
  "source": "Isaiah 26:3, King James Version (public domain).",
  "theme": "rest",
  "path": "endure",
  "requiresBelief": true
 },
 {
  "id": "psalm-46-1",
  "text": "God is our refuge and strength, a very present help in trouble.",
  "author": "Psalm 46:1",
  "source": "Psalm 46:1, King James Version (public domain).",
  "theme": "belonging",
  "path": "endure",
  "requiresBelief": true
 },
 {
  "id": "psalm-27-14",
  "text": "Wait on the Lord: be of good courage, and he shall strengthen thine heart.",
  "author": "Psalm 27:14",
  "source": "Psalm 27:14, King James Version (public domain).",
  "theme": "waiting",
  "path": "endure",
  "requiresBelief": true
 },
 {
  "id": "john-14-18",
  "text": "I will not leave you comfortless: I will come to you.",
  "author": "John 14:18",
  "source": "John 14:18, King James Version (public domain).",
  "theme": "belonging",
  "path": "endure",
  "requiresBelief": true
 },
 {
  "id": "psalm-23-4",
  "text": "Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me.",
  "author": "Psalm 23:4",
  "source": "Psalm 23:4, King James Version (public domain).",
  "theme": "endurance",
  "path": "endure",
  "requiresBelief": true
 },
 {
  "id": "julian-all-shall-be-well",
  "text": "All shall be well, and all shall be well, and all manner of thing shall be well.",
  "author": "Julian of Norwich",
  "source": "Julian of Norwich, Revelations of Divine Love, chapter 27, translated by Grace Warrack (1901).",
  "theme": "hope",
  "path": "endure",
  "requiresBelief": true
 },
 {
  "id": "teresa-nada-te-turbe",
  "text": "Let nothing disturb thee, nothing affright thee; all things are passing; God never changeth.",
  "author": "Teresa of Avila",
  "source": "Teresa of Avila, \"Nada te turbe,\" English by Henry Wadsworth Longfellow (first published 1871).",
  "theme": "rest",
  "path": "endure",
  "requiresBelief": true
 },
 {
  "id": "marcus-retire-into-soul",
  "text": "Nowhere either with more quiet or more freedom from trouble does a man retire than into his own soul.",
  "author": "Marcus Aurelius",
  "source": "Marcus Aurelius, Meditations 4.3, translated by George Long (1862).",
  "theme": "silence",
  "path": "endure",
  "requiresBelief": false
 },
 {
  "id": "marcus-be-one",
  "text": "Put an end once for all to this discussion of what a good man should be, and be one.",
  "author": "Marcus Aurelius",
  "source": "Marcus Aurelius, Meditations 10.16, translated by C. R. Haines (Loeb Classical Library, 1916).",
  "theme": "return",
  "path": "out",
  "requiresBelief": false
 },
 {
  "id": "frankl-last-freedom",
  "text": "Everything can be taken from a man but one thing: the last of the human freedoms—to choose one's attitude in any given set of circumstances, to choose one's own way.",
  "author": "Viktor E. Frankl",
  "source": "Viktor E. Frankl, Man's Search for Meaning, Part One, translated by Ilse Lasch (Beacon Press, 1959; Washington Square Press, 1963, p. 104).",
  "theme": "endurance",
  "path": "endure",
  "requiresBelief": false
 },
 {
  "id": "kierkegaard-forwards",
  "text": "It is perfectly true, as the philosophers say, that life must be understood backwards. But they forget the other proposition, that it must be lived forwards.",
  "author": "Soren Kierkegaard",
  "source": "Soren Kierkegaard, Journals IV A 164 (1843).",
  "theme": "return",
  "path": "out",
  "requiresBelief": false
 },
 {
  "id": "merton-balance",
  "text": "Happiness is not a matter of intensity but of balance and order and rhythm and harmony.",
  "author": "Thomas Merton",
  "source": "Thomas Merton, No Man Is an Island (1955), chapter 7, \"Being and Doing.\"",
  "theme": "rest",
  "path": "endure",
  "requiresBelief": false
 },
 {
  "id": "merton-with-another",
  "text": "We do not find the meaning of life by ourselves alone — we find it with another.",
  "author": "Thomas Merton",
  "source": "Thomas Merton, Love and Living (1979), Part One, p. 27.",
  "theme": "belonging",
  "path": "out",
  "requiresBelief": false
 },
 {
  "id": "mlk-darkness",
  "text": "Darkness cannot drive out darkness; only light can do that. Hate cannot drive out hate; only love can do that.",
  "author": "Martin Luther King Jr.",
  "source": "Martin Luther King Jr., Strength to Love (1963), chapter 5, \"Loving Your Enemies.\"",
  "theme": "hope",
  "path": "out",
  "requiresBelief": false
 },
 {
  "id": "keller-overcoming",
  "text": "Although the world is full of suffering, it is full also of the overcoming of it.",
  "author": "Helen Keller",
  "source": "Helen Keller, Optimism: An Essay (1903), \"Optimism Within.\"",
  "theme": "endurance",
  "path": "endure",
  "requiresBelief": false
 },
 {
  "id": "keller-optimism",
  "text": "Optimism is the faith that leads to achievement. Nothing can be done without hope and confidence.",
  "author": "Helen Keller",
  "source": "Helen Keller, Optimism: An Essay (1903).",
  "theme": "hope",
  "path": "out",
  "requiresBelief": false
 },
 {
  "id": "rilke-questions",
  "text": "Be patient toward all that is unsolved in your heart and try to love the questions themselves.",
  "author": "Rainer Maria Rilke",
  "source": "Rainer Maria Rilke, Letters to a Young Poet, Letter 4 (16 July 1903), translated by M. D. Herter Norton.",
  "theme": "waiting",
  "path": "endure",
  "requiresBelief": false
 },
 {
  "id": "frost-through",
  "text": "The best way out is always through.",
  "author": "Robert Frost",
  "source": "Robert Frost, \"A Servant to Servants,\" in North of Boston (1914).",
  "theme": "endurance",
  "path": "out",
  "requiresBelief": false
 },
 {
  "id": "camus-summer",
  "text": "In the middle of winter I at last discovered that there was in me an invincible summer.",
  "author": "Albert Camus",
  "source": "Albert Camus, \"Return to Tipasa\" (\"Retour a Tipasa,\" 1952), collected in L'Ete (1954). French: Au milieu de l'hiver, j'apprenais enfin qu'il y avait en moi un ete invincible.",
  "theme": "hope",
  "path": "endure",
  "requiresBelief": false
 },
 {
  "id": "anne-frank-heart",
  "text": "In spite of everything I still believe that people are really good at heart.",
  "author": "Anne Frank",
  "source": "Anne Frank, The Diary of a Young Girl, entry of 15 July 1944.",
  "theme": "hope",
  "path": "endure",
  "requiresBelief": false
 },
 {
  "id": "epictetus-opinions",
  "text": "Men are disturbed not by the things which happen, but by the opinions about the things.",
  "author": "Epictetus",
  "source": "Epictetus, Enchiridion 5, translated by George Long.",
  "theme": "endurance",
  "path": "endure",
  "requiresBelief": false
 },
 {
  "id": "dickinson-hope",
  "text": "Hope is the thing with feathers that perches in the soul.",
  "author": "Emily Dickinson",
  "source": "Emily Dickinson, \"'Hope' is the thing with feathers,\" first published 1891.",
  "theme": "hope",
  "path": "endure",
  "requiresBelief": false
 },
 {
  "id": "tennyson-abides",
  "text": "Though much is taken, much abides.",
  "author": "Alfred, Lord Tennyson",
  "source": "Alfred, Lord Tennyson, \"Ulysses\" (1842).",
  "theme": "endurance",
  "path": "endure",
  "requiresBelief": false
 },
 {
  "id": "thoreau-dawn",
  "text": "There is more day to dawn. The sun is but a morning star.",
  "author": "Henry David Thoreau",
  "source": "Henry David Thoreau, Walden (1854), \"Conclusion.\"",
  "theme": "hope",
  "path": "out",
  "requiresBelief": false
 },
 {
  "id": "whitman-enough",
  "text": "I exist as I am, that is enough.",
  "author": "Walt Whitman",
  "source": "Walt Whitman, \"Song of Myself,\" Leaves of Grass (1855).",
  "theme": "belonging",
  "path": "endure",
  "requiresBelief": false
 },
 {
  "id": "shakespeare-night",
  "text": "The night is long that never finds the day.",
  "author": "William Shakespeare",
  "source": "William Shakespeare, Macbeth, act 4, scene 3.",
  "theme": "hope",
  "path": "endure",
  "requiresBelief": false
 },
 {
  "id": "laotzu-still",
  "text": "Who can (make) the muddy water clear? Let it be still, and it will gradually become clear.",
  "author": "Lao Tzu",
  "source": "Tao Te Ching, chapter 15, translated by James Legge (1891).",
  "theme": "silence",
  "path": "endure",
  "requiresBelief": false
 },
 {
  "id": "seneca-imagination",
  "text": "We suffer more often in imagination than in reality.",
  "author": "Seneca",
  "source": "Seneca, Moral Letters to Lucilius, Letter 13, translated by Richard M. Gummere (Loeb Classical Library, 1917).",
  "theme": "endurance",
  "path": "endure",
  "requiresBelief": false
 },
 {
  "id": "stevenson-travel",
  "text": "To travel hopefully is a better thing than to arrive.",
  "author": "Robert Louis Stevenson",
  "source": "Robert Louis Stevenson, Virginibus Puerisque, \"El Dorado\" (1881).",
  "theme": "hope",
  "path": "out",
  "requiresBelief": false
 },
 {
  "id": "keats-beauty",
  "text": "A thing of beauty is a joy for ever.",
  "author": "John Keats",
  "source": "John Keats, Endymion (1818), Book I, line 1.",
  "theme": "hope",
  "path": "out",
  "requiresBelief": false
 }
];

  if (typeof module !== "undefined" && module.exports) module.exports = C;
  else root.MF_CONTENT = C;
})(typeof self !== "undefined" ? self : this);
