// features/companion.js — your companion: a little fawn that grows with you.
//
// One gentle animal stands for you. It replaces the six helpers: tapping it
// opens one bottom sheet with its name, its stage, a growth bar and six
// actions that open the old helpers' panels (Write a story, My days, Look
// closer, Save & share code, Show the math, Forgive & breathe).
//
// 1. Growth (nurture) comes ONLY from caring actions, never from how the
//    feelings read. Each kind counts a few times a day (RULES): an Update, a
//    One step tried (Try it together or Accept step), a journal save, a
//    practice finished (the breathing circle or a forgiveness path walked to
//    the end), and coming back on a new day. Points only go up; a hard
//    reading never takes any away, and there are no streaks to lose: coming
//    back after a gap is a plain "Welcome back." Five stages (STAGES):
//    Newborn → Little → Young → Grown → Wise. A crisis awards nothing.
// 2. Mood follows the reading gently (mood): a pose from the strongest hard
//    mover (resting for sadness, ears down and close for fear, slow breaths for
//    anger, tucked in with a small heart for shame, watching a leaf drift for
//    replaying, peeking for avoiding, a soft glow for calm or hope) and an aura
//    color from the inner-peace band. It is always kind: content eyes and a
//    small smile, never a frown or a punished look.
// 3. It speaks one first-person line composed from the numbers (line), like
//    the card: "I'm here with you. Let's ease the anger together."
// 4. Storage: localStorage "mindframe-companion" (name, points, days, today's
//    counts) and a "pet" line in the mf 4 code (features/scribe.js).
// The pure parts (rules, mood, line, the SVG drawing) are tested in node;
// mount() is browser only.

(function (MF) {
  "use strict";
  const KEY = "mindframe-companion";
  const ANIMAL = "fawn";
  const DEFAULT_NAME = "Willow";
  const NAME_MAX = 20;

  // ---------- Growth ----------
  /** The five stages and the points where each begins. */
  const STAGES = [
    { id: "newborn", name: "Newborn", at: 0 },
    { id: "little", name: "Little", at: 8 },
    { id: "young", name: "Young", at: 25 },
    { id: "grown", name: "Grown", at: 55 },
    { id: "wise", name: "Wise", at: 100 },
  ];
  /** Caring actions: points each, and how many count per day. */
  const RULES = {
    update: { pts: 1, cap: 3, word: "checking in" },
    step: { pts: 2, cap: 2, word: "trying a step" },
    journal: { pts: 2, cap: 2, word: "a journal save" },
    practice: { pts: 2, cap: 2, word: "finishing a practice" },
    day: { pts: 3, cap: 1, word: "coming back" },
  };

  /** The local calendar day (YYYY-MM-DD) of a time in ms. */
  function dayKey(ms) {
    const d = new Date(ms);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  /** A new companion record (not named yet). */
  function fresh() { return { v: 1, name: DEFAULT_NAME, asked: false, points: 0, days: 0, lastDay: null, today: { day: null, counts: {} } }; }

  /** Keep a name short and plain: letters, spaces, apostrophes and hyphens; the default when empty. */
  function cleanName(s) {
    const t = String(s || "").normalize("NFC").replace(/[^\p{L}\p{M} '\-]/gu, "").replace(/\s+/g, " ").trim().slice(0, NAME_MAX).trim();
    return t || DEFAULT_NAME;
  }

  /** A stored record made safe (bad or missing fields get defaults; points never negative). */
  function normalize(o) {
    const r = fresh();
    if (!o || typeof o !== "object") return r;
    r.name = cleanName(o.name);
    r.asked = !!o.asked;
    r.points = Number.isFinite(o.points) ? Math.max(0, Math.floor(o.points)) : 0;
    r.days = Number.isFinite(o.days) ? Math.max(0, Math.floor(o.days)) : 0;
    r.lastDay = typeof o.lastDay === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.lastDay) ? o.lastDay : null;
    if (o.today && typeof o.today.day === "string" && o.today.counts && typeof o.today.counts === "object") {
      r.today = { day: o.today.day, counts: {} };
      Object.keys(RULES).forEach(k => { const n = o.today.counts[k]; if (Number.isFinite(n) && n > 0) r.today.counts[k] = Math.floor(n); });
    }
    return r;
  }

  /**
   * One caring action. Returns a new record (the old one is not changed),
   * the points gained (zero once today's cap for that kind is reached, or in a
   * crisis), and for "day" whether this is a return ("Welcome back").
   * Points never go down here: hard readings are simply not a kind.
   * @param {object} rec the companion record
   * @param {"update"|"step"|"journal"|"practice"|"day"} kind
   * @param {number} now time in ms
   * @param {{crisis?:boolean}} [opts]
   * @returns {{rec:object, gained:number, welcome:boolean, grew:boolean}}
   */
  function award(rec, kind, now, opts = {}) {
    const r = normalize(rec), rule = RULES[kind], today = dayKey(now);
    if (!rule || opts.crisis) return { rec: r, gained: 0, welcome: false, grew: false };
    if (r.today.day !== today) r.today = { day: today, counts: {} };
    let welcome = false;
    if (kind === "day") {
      if (r.lastDay === today) return { rec: r, gained: 0, welcome: false, grew: false };
      welcome = r.lastDay !== null;
      r.lastDay = today;
      r.days += 1;
    }
    const used = r.today.counts[kind] || 0;
    if (used >= rule.cap) return { rec: r, gained: 0, welcome, grew: false };
    const before = stageOf(r.points).i;
    r.today.counts[kind] = used + 1;
    r.points += rule.pts;
    return { rec: r, gained: rule.pts, welcome, grew: stageOf(r.points).i > before };
  }

  /**
   * The stage for some points, with how far along it is toward the next one.
   * @returns {{i:number, id:string, name:string, next:object|null, frac:number}}
   */
  function stageOf(points) {
    let i = 0;
    STAGES.forEach((s, k) => { if (points >= s.at) i = k; });
    const s = STAGES[i], next = STAGES[i + 1] || null;
    const frac = next ? Math.min(1, (points - s.at) / (next.at - s.at)) : 1;
    return { i, id: s.id, name: s.name, next, frac };
  }

  /** The numbers the mf 4 code keeps (name, points, days). */
  function snapshot(rec) { const r = normalize(rec); return { name: r.name, points: r.points, days: r.days }; }
  /** A record with the points, days and name from a code (named, so the name box doesn't ask again). */
  function restore(rec, snap) {
    const r = normalize(rec);
    if (!snap) return r;
    r.name = cleanName(snap.name);
    r.points = Math.max(0, Math.floor(snap.points || 0));
    r.days = Math.max(0, Math.floor(snap.days || 0));
    r.asked = true;
    return r;
  }
  /** Read the record from storage (a fresh one if missing or broken). */
  function load(storage) { try { return normalize(JSON.parse(storage.getItem(KEY))); } catch (e) { return fresh(); } }
  /** Write the record to storage. */
  function save(storage, rec) { storage.setItem(KEY, JSON.stringify(normalize(rec))); }

  // ---------- Mood (from the reading; never from growth) ----------
  const HARD_POSE = { sadness: "rest", fear: "near", anger: "breathe", shame: "tuck", rumination: "watch", avoidance: "peek" };
  /** Aura colors by inner-peace band (soft, never alarming). */
  const AURA = { "a little": "#c9c2ea", growing: "#f5c7a4", close: "#b5ddd0", steady: "#f3d98a" };
  const BAND_OF = P => (P < 0.4 ? "a little" : P < 0.6 ? "growing" : P < 0.8 ? "close" : "steady");

  /**
   * The companion's mood after Update: the pose from the strongest hard mover
   * (at least 0.3), else a soft glow when calm or hope is strong or peace is
   * close, else simply here. The aura color follows the inner-peace band.
   * @param {object|null} m master output (null before Update or in a crisis)
   * @returns {{pose:string, aura:string|null, band:string|null, mover:string|null}}
   */
  function mood(m) {
    if (!m || m.crisis || !m.e) return { pose: "here", aura: null, band: null, mover: null };
    const N = MF.Movers.NAMES, e = m.e;
    let top = null;
    Object.keys(HARD_POSE).forEach(n => { const x = e[N.indexOf(n)]; if (x >= 0.3 && (!top || x > top.x + 1e-9)) top = { n, x }; });
    const band = m.peace ? BAND_OF(m.peace.P) : null;
    const aura = band ? AURA[band] : null;
    if (top) return { pose: HARD_POSE[top.n], aura, band, mover: top.n };
    const lift = Math.max(e[N.indexOf("calm")], e[N.indexOf("hope")]);
    return { pose: lift >= 0.6 || band === "close" || band === "steady" ? "glow" : "here", aura, band, mover: null };
  }

  // ---------- What it says (composed from the numbers) ----------
  const OPEN = {
    rest: ["I'm resting right here beside you.", "I'm curled up close to you."],
    near: ["I'm staying close to you.", "I'm right here, close by."],
    breathe: ["I'm here with you, breathing slowly.", "I'm here with you."],
    tuck: ["I'm here with you, just as you are.", "I'm on your side."],
    watch: ["I'm here with you, watching the thoughts drift by.", "I'm here with you; thoughts can float past."],
    peek: ["I'm here whenever you're ready.", "I'm right beside you, no rush."],
    glow: ["I feel calm here with you.", "It's peaceful here with you."],
    here: ["I'm here with you."],
  };
  const LEVER = { fear: "the fear", sadness: "the sadness", anger: "the anger", shame: "the shame", rumination: "the replaying", avoidance: "the urge to avoid things", calm: "some calm", connection: "some connection", hope: "a little hope" };
  const QUIET = "I'm here, keeping you company.";
  const WELCOME = "Welcome back. I'm glad you're here.";

  /**
   * One short first-person line from the companion, composed from the
   * reading like the card (pose opener + the inner-peace lever). Words only.
   * @param {object|null} m master output
   * @param {{seed?:number, welcome?:boolean}} [opts]
   * @returns {string}
   */
  function line(m, opts = {}) {
    const seed = opts.seed || 1;
    if (!m || m.crisis) return opts.welcome ? WELCOME : QUIET;
    const md = mood(m), W = MF.Words;
    const open = W.choose(OPEN[md.pose], `pet|${md.pose}|${md.mover || ""}|${md.band || ""}`, seed);
    const lv = m.peace && m.peace.lever && m.peace.lever.name;
    let act;
    if (md.band === "steady" || !lv) act = "Let's enjoy this quiet moment together.";
    else act = `Let's ${m.peace.lever.kind === "grow" ? "grow" : "ease"} ${LEVER[lv]} together.`;
    return `${opts.welcome ? "Welcome back. " : ""}${open} ${act}`;
  }

  /** How it grows, in one plain sentence (for the sheet). */
  const HOW = "I grow when you check in, try a step, save to your journal, finish a practice, or come back another day. Hard days never make me smaller.";

  // ---------- The drawing (original SVG; five stages × eight poses) ----------
  const C = { fur: "#c98b5e", furDark: "#a86c45", cream: "#f7e6cc", ear: "#f0b6a6", eye: "#3b2a22", nose: "#4a3329", hoof: "#6b4a36", leaf: "#8fb38a", leaf2: "#6f9a6a", heart: "#e9a3a8", star: "#f3d98a" };
  /** Eyes: open (soft dots with a shine) or content (closed, smiling arcs). */
  const eyes = (open, y = -2) => open
    ? `<g fill="${C.eye}"><ellipse cx="-7" cy="${y}" rx="2.6" ry="3"/><ellipse cx="7" cy="${y}" rx="2.6" ry="3"/></g><g fill="#fff"><circle cx="-6.1" cy="${y - 1.1}" r="0.9"/><circle cx="7.9" cy="${y - 1.1}" r="0.9"/></g>`
    : `<g fill="none" stroke="${C.eye}" stroke-width="1.6" stroke-linecap="round"><path d="M-10 ${y}q3 2.6 6 0"/><path d="M4 ${y}q3 2.6 6 0"/></g>`;
  /** The head at the origin: ears (angle sets up or down), face, a small smile. */
  function head(o) {
    const a = o.earAngle, s = o.earLen;
    const ear = side => `<g transform="translate(${side * 13} -9) rotate(${side * a})"><ellipse rx="${s * 0.45}" ry="${s}" cy="${-s * 0.8}" fill="${C.fur}"/><ellipse rx="${s * 0.25}" ry="${s * 0.65}" cy="${-s * 0.8}" fill="${C.ear}"/></g>`;
    return `${ear(-1)}${ear(1)}
      <ellipse rx="17" ry="15" fill="${C.fur}"/>
      <ellipse cy="6" rx="10" ry="7.5" fill="${C.cream}"/>
      <ellipse cx="-11" cy="4" rx="3" ry="2" fill="${C.ear}" opacity="0.55"/><ellipse cx="11" cy="4" rx="3" ry="2" fill="${C.ear}" opacity="0.55"/>
      ${eyes(o.eyesOpen)}
      <ellipse cy="3.4" rx="3" ry="2.2" fill="${C.nose}"/>
      <path d="M-3 7.4q3 2.6 6 0" fill="none" stroke="${C.nose}" stroke-width="1.3" stroke-linecap="round"/>
      ${o.crown ? `<g transform="translate(0 -14)"><path d="M-14 0q14 -9 28 0" fill="none" stroke="${C.leaf2}" stroke-width="1.6"/><ellipse cx="-9" cy="-3" rx="3.4" ry="1.8" fill="${C.leaf}" transform="rotate(-25 -9 -3)"/><ellipse cx="0" cy="-5" rx="3.4" ry="1.8" fill="${C.leaf}"/><ellipse cx="9" cy="-3" rx="3.4" ry="1.8" fill="${C.leaf}" transform="rotate(25 9 -3)"/><circle cx="0" cy="-5" r="1.4" fill="${C.star}"/></g>` : ""}
      ${o.flower ? `<g transform="translate(15 -14)"><circle r="2.6" fill="#f6d5e0"/><circle r="1.1" fill="${C.star}"/></g>` : ""}`;
  }
  /** Spots on the back or side (fewer as it grows wise). */
  const spots = (pts, r) => pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${C.cream}" opacity="0.9"/>`).join("");

  /**
   * The companion as an SVG string.
   * @param {number} stage 0..4
   * @param {string} pose rest | near | breathe | tuck | watch | peek | glow | here
   * @param {{aura?:string|null, uid?:string, size?:number, title?:string}} [opts]
   * @returns {string}
   */
  function svg(stage, pose = "here", opts = {}) {
    const st = Math.max(0, Math.min(4, stage | 0)), uid = opts.uid || "p", size = opts.size || 96;
    const lying = st === 0 || pose === "rest";
    const eyesOpen = !(st === 0 || pose === "rest" || pose === "breathe" || pose === "glow");
    const earAngle = pose === "near" ? 72 : pose === "tuck" ? 48 : pose === "rest" ? 58 : 28;
    const sc = [1.0, 1.0, 0.94, 1.06, 1.1][st];
    const earLen = [6, 8, 9.5, 10.5, 10.5][st];
    const headO = { eyesOpen, earAngle, earLen, crown: st === 4, flower: st === 3 };
    const aura = opts.aura ? `<defs><radialGradient id="aura-${uid}"><stop offset="0" stop-color="${opts.aura}" stop-opacity="${pose === "glow" ? 0.85 : 0.55}"/><stop offset="1" stop-color="${opts.aura}" stop-opacity="0"/></radialGradient></defs><circle cx="60" cy="64" r="${pose === "glow" ? 56 : 50}" fill="url(#aura-${uid})"/>` : "";
    let body;
    if (lying) {
      // Curled up and resting (the newborn always rests in a little leaf nest).
      body = `<g class="pet-breath">
        <ellipse cx="0" cy="-12" rx="30" ry="14" fill="${C.fur}"/>
        <ellipse cx="4" cy="-7" rx="20" ry="7" fill="${C.cream}" opacity="0.8"/>
        ${spots([[8, -20], [16, -17], [0, -21], [22, -12]], st >= 3 ? 1.6 : 2)}
        <ellipse cx="27" cy="-17" rx="4" ry="3" fill="${C.cream}"/>
        <path d="M-20 -2h14M2 -2h12" stroke="${C.hoof}" stroke-width="3" stroke-linecap="round" opacity="0.7"/>
        <g transform="translate(-20 -28) rotate(${pose === "tuck" ? -12 : -6}) scale(0.95)">${head(headO)}</g></g>`;
    } else {
      const standing = st >= 2;
      const legs = standing
        ? `<g fill="${C.furDark}"><rect x="-15" y="-24" width="6" height="24" rx="3"/><rect x="-5" y="-24" width="6" height="24" rx="3"/><rect x="5" y="-24" width="6" height="24" rx="3"/><rect x="13" y="-24" width="6" height="22" rx="3"/></g><g fill="${C.hoof}"><rect x="-15" y="-4" width="6" height="4" rx="2"/><rect x="-5" y="-4" width="6" height="4" rx="2"/><rect x="5" y="-4" width="6" height="4" rx="2"/><rect x="13" y="-4" width="6" height="4" rx="2"/></g>`
        : `<g fill="${C.furDark}"><ellipse cx="-11" cy="-4" rx="7" ry="4"/><ellipse cx="11" cy="-4" rx="7" ry="4"/></g><g fill="${C.hoof}"><ellipse cx="-16" cy="-3" rx="2.4" ry="2"/><ellipse cx="16" cy="-3" rx="2.4" ry="2"/></g>`;
      const by = standing ? -34 : -18;
      const headY = standing ? (pose === "tuck" ? -50 : -56) : (pose === "tuck" ? -36 : -42);
      body = `<g class="pet-breath">${legs}
        <ellipse cx="2" cy="${by}" rx="${standing ? 24 : 20}" ry="${standing ? 15 : 17}" fill="${C.fur}"/>
        <ellipse cx="0" cy="${by + 4}" rx="${standing ? 12 : 11}" ry="${standing ? 9 : 11}" fill="${C.cream}"/>
        ${spots(standing ? [[-14, by - 6], [-6, by - 9], [12, by - 8], [20, by - 3]] : [[-12, by - 4], [12, by - 5], [-6, by - 10]], st >= 4 ? 1.3 : 1.9)}
        <ellipse cx="${standing ? 25 : 20}" cy="${by - 8}" rx="3.6" ry="2.8" fill="${C.cream}"/>
        <g transform="translate(${pose === "peek" ? 6 : 0} ${headY}) rotate(${pose === "tuck" ? 8 : pose === "peek" ? 10 : pose === "watch" ? -8 : 0})">${head(headO)}</g></g>`;
    }
    // Small, kind extras for some poses.
    const extra = {
      tuck: `<path d="M92 34c0-3 4-4 5-1c1-3 5-2 5 1c0 3-5 6-5 6s-5-3-5-6z" fill="${C.heart}"/>`,
      watch: `<g class="pet-leaf"><ellipse cx="28" cy="30" rx="5" ry="2.4" fill="${C.leaf}" transform="rotate(-30 28 30)"/></g>`,
      peek: `<path d="M98 104v-9" stroke="${C.leaf2}" stroke-width="2"/><ellipse cx="94" cy="95" rx="4" ry="2" fill="${C.leaf}" transform="rotate(-25 94 95)"/><ellipse cx="102" cy="93" rx="4" ry="2" fill="${C.leaf}" transform="rotate(25 102 93)"/>`,
      breathe: `<g fill="none" stroke="${C.leaf2}" stroke-width="1.4" stroke-linecap="round" opacity="0.7"><path d="M84 40q4-3 8 0"/><path d="M88 32q4-3 8 0"/></g>`,
      glow: `<g fill="${C.star}"><path d="M22 28l1.4 3.2 3.2 1.4-3.2 1.4-1.4 3.2-1.4-3.2-3.2-1.4 3.2-1.4z"/><path d="M98 22l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1z"/></g>`,
      near: "", rest: "", here: "",
    }[pose] || "";
    const nest = st === 0 ? `<g><ellipse cx="60" cy="106" rx="40" ry="7" fill="${C.leaf2}" opacity="0.55"/><ellipse cx="28" cy="102" rx="11" ry="4" fill="${C.leaf}" transform="rotate(-18 28 102)"/><ellipse cx="92" cy="102" rx="11" ry="4" fill="${C.leaf}" transform="rotate(18 92 102)"/><ellipse cx="60" cy="108" rx="13" ry="4" fill="${C.leaf}"/></g>` : `<ellipse cx="60" cy="107" rx="${24 + st * 4}" ry="4" fill="#000" opacity="0.08"/>`;
    const title = opts.title ? `<title>${String(opts.title).replace(/[<&>"]/g, "")}</title>` : "";
    return `<svg class="pet-svg pose-${pose} stage-${STAGES[st].id}" viewBox="0 0 120 120" width="${size}" height="${size}" role="img"${opts.title ? "" : ' aria-hidden="true"'} focusable="false">${title}${aura}${nest}<g transform="translate(60 106) scale(${sc})">${body}</g>${extra}</svg>`;
  }

  // ---------- In the page (browser only) ----------
  const ACTIONS = [
    { view: "writer", title: "Write a story", sub: "Your journal, a gentle story and a comfort prompt", ico: "i-leaf" },
    { view: "historian", title: "My days", sub: "Your days, inner peace over time and checkpoints", ico: "i-sun" },
    { view: "analyzer", title: "Look closer", sub: "Every insight and each feeling in words", ico: "i-eye" },
    { view: "scribe", title: "Save & share code", sub: "Your freeing mix and the .mf code", ico: "i-open" },
    { view: "scientist", title: "Show the math", sub: "The equations, and numbers you can adjust", ico: "i-spark" },
    { view: "grace", title: "Forgive & breathe", sub: "Forgiveness paths, patience and the breathing circle", ico: "i-dove" },
  ];
  /**
   * Mount the companion: the header button, the buddy beside the card, the
   * name box, the home view of the sheet, and app.care(kind) for growth.
   * @param {object} app the app shell (see js/app.js)
   * @returns {function} render
   */
  function mount(app) {
    const { $ } = app;
    let rec = load(localStorage), welcome = false, md = mood(null);
    /** Persist and redraw. */
    const keep = () => { save(localStorage, rec); draw(); };
    // Coming back on a new day is a caring action too (no streaks, no "you missed").
    const d = award(rec, "day", Date.now(), { crisis: app.inCrisis() });
    rec = d.rec; welcome = d.welcome; save(localStorage, rec);

    /** Redraw every place the companion appears. */
    function draw() {
      const s = stageOf(rec.points), m = app.inCrisis() ? null : app.m();
      md = app.inCrisis() ? { pose: "here", aura: null } : mood(m);
      const label = `${rec.name}, your companion (${s.name.toLowerCase()} ${ANIMAL}). Open`;
      $("pet-top").innerHTML = svg(s.i, md.pose, { aura: md.aura, uid: "top", size: 64 });
      $("pet-top").setAttribute("aria-label", label);
      $("pet-top").disabled = app.inCrisis();
      $("pet-card").innerHTML = svg(s.i, md.pose, { aura: md.aura, uid: "card", size: 72 });
      $("pet-card").setAttribute("aria-label", label);
      $("pet-say").textContent = app.inCrisis() ? "" : line(m, { welcome: welcome && !m });
      $("pet-mini").innerHTML = svg(s.i, md.pose, { uid: "mini", size: 40 });
      $("pet-big").innerHTML = svg(s.i, md.pose, { aura: md.aura, uid: "big", size: 132, title: `${rec.name}, a ${s.name.toLowerCase()} ${ANIMAL}` });
      $("pet-title").textContent = rec.name;
      $("pet-sub").textContent = `${s.name} ${ANIMAL} \u00B7 growing with you`;
      $("pet-home-say").textContent = app.inCrisis() ? "" : line(m, { welcome: welcome && !m });
      const pct = Math.round(s.frac * 100);
      const bar = $("pet-growth");
      bar.setAttribute("aria-valuenow", String(pct));
      bar.setAttribute("aria-valuetext", s.next ? `${s.name}: ${pct} percent of the way to ${s.next.name}` : `${s.name}: fully grown`);
      bar.querySelector(".fill").style.width = `${pct}%`;
      $("pet-stage").textContent = s.next ? `${s.name} \u2192 ${s.next.name}` : `${s.name}, fully grown`;
      $("pet-days").textContent = rec.days > 1 ? `Days together: ${rec.days > 20 ? "more than twenty" : MF.Words.countWord(rec.days)}.` : "Our first day together.";
      $("name-box").classList.toggle("hidden", rec.asked || app.inCrisis());
      $("name-pet").innerHTML = svg(0, "here", { uid: "name", size: 56 });
    }

    // The name box (first use): a name, or skip to keep the default. Stored on this device only.
    const setName = n => {
      // Crisis wording in a name shows the 988/911 box, and nothing is kept.
      if (typeof Grounding !== "undefined" && Grounding.isCrisis(String(n || ""))) { app.crisis(true); return; }
      rec = { ...rec, name: cleanName(n), asked: true }; keep(); app.save();
      app.note(`Nice to meet you, ${rec.name}.`);
    };
    $("name-save").addEventListener("click", () => setName($("pet-name").value));
    $("pet-name").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); setName($("pet-name").value); } });
    $("name-skip").addEventListener("click", () => { rec = { ...rec, asked: true }; keep(); });
    $("pet-rename").addEventListener("click", () => {
      const n = prompt("A new name for your companion?", rec.name);
      if (n !== null) setName(n);
    });
    $("pet-reset").addEventListener("click", () => {
      if (!confirm(`Start ${rec.name}'s growth again from a newborn? Your journal and readings stay.`)) return;
      rec = { ...fresh(), name: rec.name, asked: true, lastDay: rec.lastDay }; keep(); app.save();
    });
    // The action rows.
    const list = $("pet-actions");
    ACTIONS.forEach(a => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "act"; b.dataset.view = a.view; b.setAttribute("aria-controls", `p-${a.view}`);
      b.innerHTML = `<svg class="ico" aria-hidden="true"><use href="#${a.ico}"/></svg><span class="act-text"><strong></strong><small></small></span><span class="act-go" aria-hidden="true">\u203A</span>`;
      b.querySelector("strong").textContent = a.title;
      b.querySelector("small").textContent = a.sub;
      b.addEventListener("click", () => app.open(a.view));
      list.appendChild(b);
    });

    /**
     * A caring action happened: add its points (capped per day; nothing in a crisis).
     * @param {string} kind a RULES key
     */
    app.care = kind => {
      const r = award(rec, kind, Date.now(), { crisis: app.inCrisis() });
      if (!r.gained) return 0;
      rec = r.rec; keep();
      if (r.grew) app.note(`${rec.name} grew: now ${stageOf(rec.points).name.toLowerCase()}.`);
      return r.gained;
    };
    app.companion = {
      /** The record (a copy). */
      get: () => normalize(rec),
      /** For the mf 4 code. */
      snapshot: () => snapshot(rec),
      /** From an imported mf 4 code. */
      restore: snap => { rec = restore(rec, snap); keep(); },
      /** Name and stage for the comfort prompt. */
      about: () => ({ name: rec.name, stage: stageOf(rec.points).name, animal: ANIMAL }),
      /** Set the record directly (tests and screenshots). */
      set: o => { rec = normalize({ ...rec, ...o }); keep(); },
    };
    app.onCrisis(draw);
    app.redrawPet = draw;
    draw();
    return draw;
  }

  MF.Companion = { KEY, ANIMAL, DEFAULT_NAME, NAME_MAX, STAGES, RULES, HOW, ACTIONS, dayKey, fresh, cleanName, normalize, award, stageOf, snapshot, restore, load, save, mood, line, svg, AURA, mount };
})(typeof window !== "undefined" ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
if (typeof module !== "undefined") module.exports = global.MF.Companion;
