// features/scripture.js — "Scripture for this moment" and "Verses together".
//
// Faith on only (the existing faith toggle), never in a crisis, never before
// Update, never online.
// 1. VERSES is a fixed offline list of 90 verses from the World English Bible
//    (WEB, public domain). Each text is copied character for character from
//    ebible.org's eng-web_vpl.txt (sha256 52b92dc6…cd8c4); the exact source
//    lines are kept in tests/fixtures/scripture-web.txt and
//    tests/scripture.test.js checks every verse against them. Nothing is
//    paraphrased inside quotation marks.
// 2. Theme (theme): Kai first — when outside hurt X > 0, a strong urge
//    (I ≥ Kai.FLICKER) picks self-control; otherwise the weakest virtue picks
//    patience (F), gentleness (R), love (E) or worth / forgiveness (A).
//    Without X, the inner-peace lever's mover; without a lever, the dominant
//    hard mover; otherwise calm. Mover themes: fear, sadness, anger,
//    shame (forgiveness), calm (peace), connection (love), hope,
//    rumination (renewing the mind), avoidance (courage).
// 3. Seed (seed): mix(CORNERSTONE, numbers, text, counter), FNV-1a 32-bit.
//    CORNERSTONE = FNV-1a("Ephesians 2:20"), a documented constant mixed in
//    first (no entropy; it anchors reproducibility, see below); numbers = the
//    rounded e, e', P and S; text = the words, hashed in memory only;
//    counter = taps of "Another verse" since Update (a new Update resets it).
//    Same numbers and words → same verse; different → varied.
// 4. Verses together (together): two or three verses — the dominant mover's
//    theme, the lever's theme, and hope (P below steady) or calm (at steady),
//    without repeats (a strong "Loosen the grip" pull other than fear
//    makes the first theme renewing the mind; a "Past to future" stage puts
//    the past and a new beginning in the hope slot) — plus a short synthesis composed from theme tags and
//    the numbers: name the feeling and validate it, the thread the verses
//    share, a gentle reframe, how the lever's practice moves P toward steady
//    (slowly, no instant fix), and one small daily habit. Verse text is shown
//    separately, exactly, with references.
// The pure parts are tested in node; mount() is browser only.

(function (MF) {
  "use strict";

  const TRANSLATION = "WEB";
  /** [theme, source code, reference, exact WEB text] */
  const VERSES = [
    ["fear", "ISA 41:10", "Isaiah 41:10", "Don’t you be afraid, for I am with you. Don’t be dismayed, for I am your God. I will strengthen you. Yes, I will help you. Yes, I will uphold you with the right hand of my righteousness."],
    ["fear", "PSA 56:3", "Psalm 56:3", "When I am afraid, I will put my trust in you."],
    ["fear", "JOH 14:27", "John 14:27", "Peace I leave with you. My peace I give to you; not as the world gives, I give to you. Don’t let your heart be troubled, neither let it be fearful."],
    ["fear", "2TI 1:7", "2 Timothy 1:7", "For God didn’t give us a spirit of fear, but of power, love, and self-control."],
    ["fear", "PSA 23:4", "Psalm 23:4", "Even though I walk through the valley of the shadow of death, I will fear no evil, for you are with me. Your rod and your staff, they comfort me."],
    ["fear", "1JO 4:18", "1 John 4:18", "There is no fear in love; but perfect love casts out fear, because fear has punishment. He who fears is not made perfect in love."],
    ["fear", "PSA 34:4", "Psalm 34:4", "I sought Yahweh, and he answered me, and delivered me from all my fears."],
    ["fear", "MAT 6:34", "Matthew 6:34", "Therefore don’t be anxious for tomorrow, for tomorrow will be anxious for itself. Each day’s own evil is sufficient."],
    ["sadness", "PSA 34:18", "Psalm 34:18", "Yahweh is near to those who have a broken heart, and saves those who have a crushed spirit."],
    ["sadness", "MAT 5:4", "Matthew 5:4", "Blessed are those who mourn, for they shall be comforted."],
    ["sadness", "PSA 147:3", "Psalm 147:3", "He heals the broken in heart, and binds up their wounds."],
    ["sadness", "LAM 3:22", "Lamentations 3:22", "It is because of Yahweh’s loving kindnesses that we are not consumed, because his mercies don’t fail."],
    ["sadness", "LAM 3:23", "Lamentations 3:23", "They are new every morning. Great is your faithfulness."],
    ["sadness", "PSA 42:11", "Psalm 42:11", "Why are you in despair, my soul? Why are you disturbed within me? Hope in God! For I shall still praise him, the saving help of my countenance, and my God."],
    ["anger", "EPH 4:26", "Ephesians 4:26", "“Be angry, and don’t sin.” Don’t let the sun go down on your wrath,"],
    ["anger", "JAM 1:20", "James 1:20", "for the anger of man doesn’t produce the righteousness of God."],
    ["anger", "PRO 16:32", "Proverbs 16:32", "One who is slow to anger is better than the mighty; one who rules his spirit, than he who takes a city."],
    ["anger", "EPH 4:31", "Ephesians 4:31", "Let all bitterness, wrath, anger, outcry, and slander be put away from you, with all malice."],
    ["anger", "PRO 14:29", "Proverbs 14:29", "He who is slow to anger has great understanding, but he who has a quick temper displays folly."],
    ["anger", "PSA 37:8", "Psalm 37:8", "Cease from anger, and forsake wrath. Don’t fret; it leads only to evildoing."],
    ["anger", "ECC 7:9", "Ecclesiastes 7:9", "Don’t be hasty in your spirit to be angry, for anger rests in the bosom of fools."],
    ["shame", "1JO 1:9", "1 John 1:9", "If we confess our sins, he is faithful and righteous to forgive us the sins and to cleanse us from all unrighteousness."],
    ["shame", "PSA 103:12", "Psalm 103:12", "As far as the east is from the west, so far has he removed our transgressions from us."],
    ["shame", "ROM 8:1", "Romans 8:1", "There is therefore now no condemnation to those who are in Christ Jesus, who don’t walk according to the flesh, but according to the Spirit."],
    ["shame", "ISA 1:18", "Isaiah 1:18", "“Come now, and let’s reason together,” says Yahweh: “Though your sins are as scarlet, they shall be as white as snow. Though they are red like crimson, they shall be as wool."],
    ["shame", "2CO 5:17", "2 Corinthians 5:17", "Therefore if anyone is in Christ, he is a new creation. The old things have passed away. Behold, all things have become new."],
    ["shame", "PSA 34:5", "Psalm 34:5", "They looked to him, and were radiant. Their faces shall never be covered with shame."],
    ["shame", "EPH 4:32", "Ephesians 4:32", "And be kind to one another, tender hearted, forgiving each other, just as God also in Christ forgave you."],
    ["shame", "COL 3:13", "Colossians 3:13", "bearing with one another, and forgiving each other, if any man has a complaint against any; even as Christ forgave you, so you also do."],
    ["calm", "PHI 4:6", "Philippians 4:6", "In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God."],
    ["calm", "PHI 4:7", "Philippians 4:7", "And the peace of God, which surpasses all understanding, will guard your hearts and your thoughts in Christ Jesus."],
    ["calm", "MAT 11:28", "Matthew 11:28", "“Come to me, all you who labor and are heavily burdened, and I will give you rest."],
    ["calm", "PSA 46:10", "Psalm 46:10", "“Be still, and know that I am God. I will be exalted among the nations. I will be exalted on the earth.”"],
    ["calm", "ISA 26:3", "Isaiah 26:3", "You will keep whoever’s mind is steadfast in perfect peace, because he trusts in you."],
    ["calm", "PSA 4:8", "Psalm 4:8", "In peace I will both lay myself down and sleep, for you alone, Yahweh, make me live in safety."],
    ["calm", "JOH 16:33", "John 16:33", "I have told you these things, that in me you may have peace. In the world you have trouble; but cheer up! I have overcome the world.”"],
    ["calm", "PSA 131:2", "Psalm 131:2", "Surely I have stilled and quieted my soul, like a weaned child with his mother, like a weaned child is my soul within me."],
    ["connection", "1CO 13:4", "1 Corinthians 13:4", "Love is patient and is kind. Love doesn’t envy. Love doesn’t brag, is not proud,"],
    ["connection", "1CO 13:7", "1 Corinthians 13:7", "bears all things, believes all things, hopes all things, and endures all things."],
    ["connection", "JOH 15:12", "John 15:12", "“This is my commandment, that you love one another, even as I have loved you."],
    ["connection", "1JO 4:7", "1 John 4:7", "Beloved, let’s love one another, for love is of God; and everyone who loves has been born of God and knows God."],
    ["connection", "ROM 12:10", "Romans 12:10", "In love of the brothers be tenderly affectionate to one another; in honor prefer one another,"],
    ["hope", "JER 29:11", "Jeremiah 29:11", "For I know the thoughts that I think toward you,” says Yahweh, “thoughts of peace, and not of evil, to give you hope and a future."],
    ["hope", "ROM 15:13", "Romans 15:13", "Now may the God of hope fill you with all joy and peace in believing, that you may abound in hope in the power of the Holy Spirit."],
    ["hope", "ISA 40:31", "Isaiah 40:31", "but those who wait for Yahweh will renew their strength. They will mount up with wings like eagles. They will run, and not be weary. They will walk, and not faint."],
    ["hope", "ROM 8:28", "Romans 8:28", "We know that all things work together for good for those who love God, for those who are called according to his purpose."],
    ["hope", "HEB 11:1", "Hebrews 11:1", "Now faith is assurance of things hoped for, proof of things not seen."],
    ["hope", "LAM 3:24", "Lamentations 3:24", "“Yahweh is my portion,” says my soul. “Therefore I will hope in him.”"],
    ["hope", "ROM 5:5", "Romans 5:5", "and hope doesn’t disappoint us, because God’s love has been poured into our hearts through the Holy Spirit who was given to us."],
    ["hope", "PSA 33:22", "Psalm 33:22", "Let your loving kindness be on us, Yahweh, since we have hoped in you."],
    ["rumination", "ROM 12:2", "Romans 12:2", "Don’t be conformed to this world, but be transformed by the renewing of your mind, so that you may prove what is the good, well-pleasing, and perfect will of God."],
    ["rumination", "PHI 4:8", "Philippians 4:8", "Finally, brothers, whatever things are true, whatever things are honorable, whatever things are just, whatever things are pure, whatever things are lovely, whatever things are of good report: if there is any virtue and if there is anything worthy of praise, think about these things."],
    ["rumination", "2CO 10:5", "2 Corinthians 10:5", "throwing down imaginations and every high thing that is exalted against the knowledge of God and bringing every thought into captivity to the obedience of Christ,"],
    ["rumination", "COL 3:2", "Colossians 3:2", "Set your mind on the things that are above, not on the things that are on the earth."],
    ["rumination", "PSA 139:23", "Psalm 139:23", "Search me, God, and know my heart. Try me, and know my thoughts."],
    ["rumination", "MAT 6:27", "Matthew 6:27", "“Which of you by being anxious, can add one moment to his lifespan?"],
    ["rumination", "1PE 5:7", "1 Peter 5:7", "casting all your worries on him, because he cares for you."],
    ["rumination", "PSA 19:14", "Psalm 19:14", "Let the words of my mouth and the meditation of my heart be acceptable in your sight, Yahweh, my rock, and my redeemer."],
    ["avoidance", "JOS 1:9", "Joshua 1:9", "Haven’t I commanded you? Be strong and courageous. Don’t be afraid. Don’t be dismayed, for Yahweh your God is with you wherever you go.”"],
    ["avoidance", "DEU 31:6", "Deuteronomy 31:6", "Be strong and courageous. Don’t be afraid or scared of them, for Yahweh your God himself is who goes with you. He will not fail you nor forsake you.”"],
    ["avoidance", "PSA 31:24", "Psalm 31:24", "Be strong, and let your heart take courage, all you who hope in Yahweh."],
    ["avoidance", "1CO 16:13", "1 Corinthians 16:13", "Watch! Stand firm in the faith! Be courageous! Be strong!"],
    ["avoidance", "ISA 43:2", "Isaiah 43:2", "When you pass through the waters, I will be with you, and through the rivers, they will not overflow you. When you walk through the fire, you will not be burned, and flame will not scorch you."],
    ["avoidance", "PHI 4:13", "Philippians 4:13", "I can do all things through Christ who strengthens me."],
    ["avoidance", "PSA 27:14", "Psalm 27:14", "Wait for Yahweh. Be strong, and let your heart take courage. Yes, wait for Yahweh."],
    ["patience", "GAL 5:22", "Galatians 5:22", "But the fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faith,"],
    ["patience", "ROM 12:12", "Romans 12:12", "rejoicing in hope, enduring in troubles, continuing steadfastly in prayer,"],
    ["patience", "COL 3:12", "Colossians 3:12", "Put on therefore, as God’s chosen ones, holy and beloved, a heart of compassion, kindness, lowliness, humility, and perseverance;"],
    ["patience", "PSA 37:7", "Psalm 37:7", "Rest in Yahweh, and wait patiently for him. Don’t fret because of him who prospers in his way, because of the man who makes wicked plots happen."],
    ["patience", "ECC 7:8", "Ecclesiastes 7:8", "Better is the end of a thing than its beginning. The patient in spirit is better than the proud in spirit."],
    ["patience", "EPH 4:2", "Ephesians 4:2", "with all lowliness and humility, with patience, bearing with one another in love,"],
    ["patience", "PRO 19:11", "Proverbs 19:11", "The discretion of a man makes him slow to anger. It is his glory to overlook an offense."],
    ["gentleness", "PRO 15:1", "Proverbs 15:1", "A gentle answer turns away wrath, but a harsh word stirs up anger."],
    ["gentleness", "PHI 4:5", "Philippians 4:5", "Let your gentleness be known to all men. The Lord is at hand."],
    ["gentleness", "MAT 11:29", "Matthew 11:29", "Take my yoke upon you and learn from me, for I am gentle and humble in heart; and you will find rest for your souls."],
    ["gentleness", "2TI 2:24", "2 Timothy 2:24", "The Lord’s servant must not quarrel, but be gentle toward all, able to teach, patient,"],
    ["gentleness", "COL 4:6", "Colossians 4:6", "Let your speech always be with grace, seasoned with salt, that you may know how you ought to answer each one."],
    ["gentleness", "PRO 25:15", "Proverbs 25:15", "By patience a ruler is persuaded. A soft tongue breaks the bone."],
    ["gentleness", "TIT 3:2", "Titus 3:2", "to speak evil of no one, not to be contentious, to be gentle, showing all humility toward all men."],
    ["gentleness", "ROM 12:18", "Romans 12:18", "If it is possible, as much as it is up to you, be at peace with all men."],
    ["selfcontrol", "GAL 5:23", "Galatians 5:23", "gentleness, and self-control. Against such things there is no law."],
    ["selfcontrol", "PRO 25:28", "Proverbs 25:28", "Like a city that is broken down and without walls is a man whose spirit is without restraint."],
    ["selfcontrol", "1PE 2:23", "1 Peter 2:23", "When he was cursed, he didn’t curse back. When he suffered, he didn’t threaten, but committed himself to him who judges righteously."],
    ["selfcontrol", "JAM 1:19", "James 1:19", "So, then, my beloved brothers, let every man be swift to hear, slow to speak, and slow to anger;"],
    ["selfcontrol", "PRO 29:11", "Proverbs 29:11", "A fool vents all of his anger, but a wise man brings himself under control."],
    ["selfcontrol", "PRO 17:27", "Proverbs 17:27", "He who spares his words has knowledge. He who is even tempered is a man of understanding."],
    ["renewal", "PHI 3:13", "Philippians 3:13", "Brothers, I don’t regard myself as yet having taken hold, but one thing I do: forgetting the things which are behind and stretching forward to the things which are before,"],
    ["renewal", "PHI 3:14", "Philippians 3:14", "I press on toward the goal for the prize of the high calling of God in Christ Jesus."],
    ["renewal", "ISA 43:18", "Isaiah 43:18", "“Don’t remember the former things, and don’t consider the things of old."],
    ["renewal", "ISA 43:19", "Isaiah 43:19", "Behold, I will do a new thing. It springs out now. Don’t you know it? I will even make a way in the wilderness, and rivers in the desert."],
  ].map(([theme, code, ref, text]) => ({ theme, code, ref, text }));

  /** The cornerstone passages (exact WEB text; for the parable, not in the theme lists). */
  const CORNER_VERSES = [
    { code: "EPH 2:20", ref: "Ephesians 2:20", text: "being built on the foundation of the apostles and prophets, Christ Jesus himself being the chief cornerstone;" },
    { code: "1PE 2:6", ref: "1 Peter 2:6", text: "Because it is contained in Scripture, \u201CBehold, I lay in Zion a chief cornerstone, chosen and precious. He who believes in him will not be disappointed.\u201D" },
    { code: "PSA 1:3", ref: "Psalm 1:3", text: "He will be like a tree planted by the streams of water, that produces its fruit in its season, whose leaf also does not wither. Whatever he does shall prosper." },
  ];
  /** Theme labels and the tags used to compose the synthesis. */
  const THEMES = {
    fear: { label: "fear", tags: ["presence", "courage"] },
    sadness: { label: "sadness", tags: ["comfort", "presence"] },
    anger: { label: "anger", tags: ["slow", "peace"] },
    shame: { label: "shame and forgiveness", tags: ["mercy", "new"] },
    calm: { label: "calm and peace", tags: ["peace", "rest"] },
    connection: { label: "connection and love", tags: ["love", "presence"] },
    hope: { label: "hope", tags: ["hope", "new"] },
    rumination: { label: "renewing the mind", tags: ["mind", "rest"] },
    avoidance: { label: "courage", tags: ["courage", "presence"] },
    patience: { label: "patience", tags: ["slow", "peace"] },
    gentleness: { label: "gentleness", tags: ["gentle", "peace"] },
    selfcontrol: { label: "self-control", tags: ["slow", "gentle"] },
    renewal: { label: "the past and a new beginning", tags: ["new", "mercy"] },
  };
  /** What a shared tag says (the thread through the verses). */
  const THREAD = {
    presence: "you are not facing this alone",
    courage: "courage can stand next to fear",
    comfort: "sorrow is met with comfort, not hurry",
    slow: "slowness is a strength here",
    peace: "peace is offered, not demanded",
    mercy: "mercy is bigger than the mistake",
    new: "something new can begin",
    rest: "rest is allowed",
    love: "love holds people together",
    hope: "hope looks ahead",
    mind: "a weary mind can be renewed",
    gentle: "gentleness is strong",
  };
  /** Naming and validating the feeling, by mover. */
  const VALID = {
    fear: "fear is how a mind tries to keep you safe",
    sadness: "sadness is what caring feels like when something hurts",
    anger: "anger often means something mattered to you",
    shame: "shame hurts, and it is not the last word about you",
    rumination: "a mind that keeps replaying is trying to solve something",
    avoidance: "wanting to step back is a human way to protect yourself",
  };
  /** A gentle reframe through the verses, by theme. */
  const REFRAME = {
    fear: "the verses don't ask you to stop feeling afraid; they place someone beside you in it",
    sadness: "the verses don't hurry grief; they promise comfort along the way",
    anger: "the verses don't call anger wrong; they invite you to be slow with it",
    shame: "the verses speak of mercy, so what you did can be named without becoming who you are",
    calm: "the verses offer peace as a gift you can receive a little at a time",
    connection: "the verses remind you that you were made for love, given and received",
    hope: "the verses lift your eyes a little further than today",
    rumination: "the verses invite your mind to rest on what is true and good",
    avoidance: "the verses offer courage for one small step, not the whole road",
    patience: "the verses treat patience as fruit that grows, not a test you pass",
    gentleness: "the verses show that a gentle answer is strength under control",
    selfcontrol: "the verses show that holding back is a quiet kind of strength",
    renewal: "the verses don't erase the past; they point to mercy that is new and a way that opens ahead",
  };
  /** Small daily habits (the reference, never a paraphrase in quotes). */
  const HABITS = [
    v => `Each morning, read ${v.ref} slowly once, at the same moment (with your first drink, or at the door).`,
    v => `Try a breath prayer each evening: breathe in slowly, then read ${v.ref} on a long breath out.`,
    v => `Write ${v.ref} on a card and read it at one set moment a day, like lunch.`,
  ];
  const KAI_THEME = { F: "patience", R: "gentleness", E: "connection", A: "shame" };
  const HARD = ["fear", "sadness", "anger", "shame", "rumination", "avoidance"];
  const r2 = x => Math.round((Number(x) || 0) * 100) / 100;
  const idx = n => MF.Movers.NAMES.indexOf(n);

  /** FNV-1a 32-bit hash of a string. */
  function hash(s) {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h >>> 0;
  }
  /**
   * Cornerstone: a fixed constant, FNV-1a("Ephesians 2:20"), mixed in first.
   * Randomness analysis: it is a constant, so it adds no entropy at all
   * (H(seed) = H(numbers, text, counter)); what it does is anchor the hash's
   * starting point, so the same reading gives the same picks on every device
   * and in every version that keeps the constant. Changing it would re-shuffle
   * every pick at once; it never changes per user, per day, or per run.
   */
  const CORNERSTONE = hash("Ephesians 2:20");
  /** Hash of the rounded equation outputs e, e', P and S. */
  function numbers(m) {
    const P = m.peace ? m.peace.P : 0, S = m.kai ? m.kai.S : 0;
    return hash([m.e.map(r2).join(","), (m.next || m.e).map(r2).join(","), r2(P), r2(S)].join("|"));
  }
  /** Hash of the words (lowercased, spaces folded; in memory only, never stored). */
  const textHash = t => hash(String(t || "").toLowerCase().replace(/\s+/g, " ").trim());
  /** mix(cornerstone, numbers, text, counter): FNV-1a over the four 32-bit values, cornerstone first. */
  const mix = (...xs) => hash(xs.map(x => (x >>> 0).toString(16).padStart(8, "0")).join(""));
  /**
   * The seed: mix(CORNERSTONE, numbers hash, text hash, counter), where the
   * counter is how many times Another verse was tapped since Update.
   * @param {object} m @param {{text?: string, offset?: number}} [o]
   */
  const seed = (m, o = {}) => mix(CORNERSTONE, numbers(m), textHash(o.text), o.offset || 0);
  /** An index into a list of n: the seed mod n, moved on by one if it would repeat the previous counter's pick. */
  function index(m, o, n, salt = 0) {
    const at = c => (mix(seed(m, { ...o, offset: c }), salt) % n);
    const c = o.offset || 0, i = at(c);
    return c > 0 && n > 1 && i === index(m, { ...o, offset: c - 1 }, n, salt) ? (i + 1) % n : i;
  }

  /** The dominant hard mover (highest e among the hard movers), or null when all are low. */
  function dominant(m) {
    let best = null, v = 0.2;
    HARD.forEach(n => { if (m.e[idx(n)] > v) { v = m.e[idx(n)]; best = n; } });
    return best;
  }
  /** The theme for this reading (see the header). */
  function theme(m) {
    if (m.kai && m.kai.X > 0) {
      if (MF.Kai && m.kai.I >= MF.Kai.FLICKER) return "selfcontrol";
      return KAI_THEME[m.kai.lever] || "patience";
    }
    const lv = m.peace && m.peace.lever && m.peace.lever.name;
    return lv || dominant(m) || "calm";
  }
  /** True when scripture may show: faith on, a reading, not a crisis. */
  const allowed = (m, o = {}) => !!(m && !m.crisis && o.faith && !o.crisis);
  /** Verses for "Past to future" (pairs shown as one passage). */
  function passage(codes) {
    const vs = codes.map(c => VERSES.find(v => v.code === c));
    const a = vs[0].ref, b = vs[vs.length - 1].ref.split(":")[1];
    return { ref: vs.length > 1 ? `${a}\u2013${b}` : a, text: vs.map(v => v.text).join(" "), codes };
  }
  /** One verse for this moment, or null. @param {{faith, crisis, offset}} o */
  function pick(m, o = {}) {
    if (!allowed(m, o)) return null;
    const t = theme(m), list = VERSES.filter(v => v.theme === t);
    return { theme: t, label: THEMES[t].label, verse: list[index(m, o, list.length)] };
  }
  /** The verse as display lines: the quote, then its reference. */
  const show = v => [`\u201C${v.text}\u201D`, `${v.ref} (${TRANSLATION})`];

  /** The peace band word, or a plain fallback. */
  const band = P => (MF.Peace ? MF.Peace.band(P) : "growing");
  /** "a lot of fear" style naming, from the level. */
  const amount = x => (x >= 0.7 ? "a lot of" : x >= 0.4 ? "some" : "a little");

  /**
   * Verses together: two or three verses and a synthesis composed from the
   * theme tags and the numbers. Null when scripture may not show.
   */
  function together(m, o = {}) {
    if (!allowed(m, o)) return null;
    const g = o.grip && o.grip.show ? o.grip : null;
    const dom = g && g.top !== "fear" ? "rumination" : dominant(m), lv = theme(m), P = m.peace ? m.peace.P : 0;
    const steady = MF.Peace && P >= MF.Peace.P_STAR;
    const past = o.past && o.past.show;
    const want = [dom, lv, past ? "renewal" : steady ? "calm" : "hope", steady ? "hope" : "calm"].filter(Boolean);
    const themes = [...new Set(want)].slice(0, 3);
    const s = seed(m, o);
    const verses = themes.map((t, i) => { const l = VERSES.filter(v => v.theme === t); return l[index(m, o, l.length, i + 1)]; });
    // The thread: the tag shared by the most themes (ties: the first theme's order).
    const count = {};
    themes.forEach(t => THEMES[t].tags.forEach(g => { count[g] = (count[g] || 0) + 1; }));
    const thread = THEMES[themes[0]].tags.concat(...themes.map(t => THEMES[t].tags)).reduce((a, g) => (count[g] > count[a] ? g : a));
    const feel = dom || (m.e[idx("calm")] >= 0.5 ? null : "rumination");
    const lines = [];
    lines.push(feel
      ? `You are carrying ${amount(m.e[idx(feel)])} ${feel === "rumination" ? "replaying" : feel === "avoidance" ? "wanting to pull back" : feel} right now, and that makes sense: ${VALID[feel]}.`
      : "Things feel fairly settled right now, and that is worth noticing.");
    lines.push(`These verses, on ${themes.map(t => THEMES[t].label).join(", ").replace(/, ([^,]*)$/, " and $1")}, share one thread: ${THREAD[thread]}.`);
    lines.push(`Gently, ${REFRAME[themes[0]]}.`);
    const pr = m.practice && MF.Practices && MF.Practices.LIBRARY[m.practice.id];
    const lvl = m.peace && m.peace.lever;
    const toward = steady ? "keeps it near steady" : lvl && lvl.dP > 0 ? `${lvl.kind === "grow" ? "grows" : "eases"} ${lvl.name}, which moves it a little toward steady` : "may move it a little toward steady";
    lines.push(`Your inner peace is ${band(P)} now. ${pr ? `One gentle step, ${pr.name.replace(/:.*$/, "")}, ` : "One gentle step "}${toward}; peace grows over days of small practice, not all at once.`);
    lines.push(`A small daily habit: ${HABITS[s % HABITS.length](verses[verses.length - 1])}`);
    return { themes, verses, thread, lines };
  }

  /**
   * Browser: the "For this moment" tile in See more, in stage order —
   * Loosen the grip, Past to future, Scripture for this moment and Verses
   * together (faith on only), the parable, Continue your story — plus
   * "Another verse" and the companion's verse in the sheet. Nothing shows
   * before Update or in a crisis.
   */
  function mount(app) {
    const $ = id => document.getElementById(id);
    let offset = 0, last = null;
    function render() {
      const m = app.inCrisis() ? null : app.m();
      if (m !== last) { offset = 0; last = m; }
      const faith = app.faith(), text = $("input").value, state = app.state;
      $("t-scripture").classList.toggle("hidden", !m);
      scene(m);
      $("pet-verse").classList.add("hidden");
      const box = $("scripture"); box.innerHTML = "";
      $("scripture-next").classList.add("hidden");
      if (!m) return;
      const p = (t, c) => { const e = document.createElement("p"); if (c) e.className = c; e.textContent = t; box.appendChild(e); };
      const quote = v => show(v).forEach((t, i) => p(t, i ? "quiet small" : "verse"));
      const grip = MF.Grip ? MF.Grip.detect(m, text, state) : null;
      const past = MF.Past ? MF.Past.detect(m, text) : null;
      const o = { faith, crisis: app.inCrisis(), offset, grip, past, text };
      if (grip && grip.show) { p("Loosen the grip", "label"); MF.Grip.lines(grip, m, o).forEach(t => p(t)); if (faith) MF.Grip.faithVerses().forEach(quote); }
      if (past && past.show) { p("Past to future", "label"); MF.Past.lines(past, o).forEach(t => p(t)); if (faith) MF.Past.faithPassages().forEach(quote); }
      const one = pick(m, o), tog = together(m, o);
      if (one) {
        p(`Scripture for this moment: ${one.label}`, "label"); quote(one.verse);
        $("scripture-next").classList.remove("hidden");
        p("Verses together", "label"); tog.verses.forEach(quote); tog.lines.forEach(t => p(t));
        const name = app.companion ? app.companion.get().name : "Your companion";
        $("pet-verse").textContent = `${name} keeps a verse with you: \u201C${one.verse.text}\u201D ${one.verse.ref} (${TRANSLATION})`;
        $("pet-verse").classList.remove("hidden");
      }
      if (MF.Parable) {
        const friend = app.companion ? app.companion.get().name : "Willow";
        const ctx = { ...o, together: tog, friend };
        p("A parable of peace", "label"); p(MF.Parable.parable(m, ctx).join(" "));
        if (faith) CORNER_VERSES.filter(v => v.code !== "EPH 2:20").forEach(quote);
        const more = MF.Parable.more(m, ctx);
        p("Continue your story", "label"); more.films.concat(more.songs).forEach(x => p(x.line));
      }
    }
    /** The cornerstone scene: the counter shows the seed counter; seeds glow, then settle, on a new reading. */
    let shown = null;
    function scene(m) {
      $("cs-count").textContent = String(offset);
      $("cs-scene").setAttribute("aria-label", `Seeds resting in water above a counter on a cornerstone; seed counter ${offset}`);
      if (m && m !== shown) { shown = m; const el = $("cs-scene"); el.classList.remove("composing"); void el.getBoundingClientRect(); el.classList.add("composing"); }
    }
    $("scripture-next").addEventListener("click", () => { offset++; render(); });
    app.onCrisis(render);
    return render;
  }

  MF.Scripture = { CORNERSTONE, numbers, textHash, mix, index, CORNER_VERSES, passage, TRANSLATION, VERSES, THEMES, THREAD, VALID, REFRAME, HABITS, KAI_THEME, hash, seed, dominant, theme, allowed, pick, show, together, mount };
})(typeof window !== "undefined" ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
if (typeof module !== "undefined") module.exports = global.MF.Scripture;
