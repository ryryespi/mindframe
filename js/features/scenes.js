// features/scenes.js — the story scenes: small original SVG illustrations (push27).
// Drawn here in code (no image files, nothing fetched, no copyrighted art). One
// palette and the same two characters throughout: the traveler (a figure in a
// blue coat) and the companion (the fawn, drawn larger at later growth stages).
//
// 1. STORY SCENES follow the parable beats (features/parable.js beats()): the
//    opening seeds in still water on the cornerstone, the road, the loosening
//    loop, the crossroads, the quiet bend, the verses (a lamp in a window), the
//    peace horizon, the shared table, and evening rest by still water. Text and
//    picture come from the same beats list, so they stay in sync.
// 2. GROUNDING IMAGES pair a scene with one kind, concrete prompt, chosen from the
//    Expression governor (core/governor.js) and true size (non-local drift):
//      mania-like activation or grandiosity high → slow, ordinary, shared scenes
//        (the shared table, tending a garden, a walk with a friend)
//      irritability high → cooling and space (still water, a horizon at dusk)
//      unawareness high → sensory grounding (hands helping, a lamp in the window)
//      otherwise by the governor level: pause → still water, ground → stepping
//      stones, step away → a walk with a friend.
//    Calm variant: when the governor level is pause or higher, scenes drop extra
//    detail and use softer colors (lower arousal). Motion is one slow ripple that
//    stops under prefers-reduced-motion; dark mode dims the palette (style.css).
// Sources: positive mental imagery and emotion (Holmes & Mathews, 2010); nature
// and attention restoration (Kaplan, 1995; Berman, Jonides & Kaplan, 2008); acts of
// kindness and the well-being of the giver, a small average effect (Curry et al.,
// 2018). Pictures here are a gentle aid, not a treatment.

(function (MF) {
  "use strict";
  const PAL = { sky: "#cfe3f2", dusk: "#f3d3b4", water: "#8fbcd9", deep: "#5f93b8", land: "#b9d3a0", path: "#e7d8b9", stone: "#a9a39a", coat: "#3f6fa8", skin: "#e8c4a0", fawn: "#c8925c", spot: "#f4e6d0", wood: "#9b6b43", warm: "#f2b84b", ink: "#3b3b3b", leaf: "#6f9f5a" };
  const CALM = { sky: "#dde8ef", dusk: "#efe2d6", water: "#a9c6d8", deep: "#88a9bf", land: "#c9d8bb", warm: "#e9cf98" };
  const pal = calm => (calm ? { ...PAL, ...CALM } : PAL);

  /** The traveler, standing (or sitting) at x, y (feet). */
  function traveler(x, y, P, sit = false) {
    const h = sit ? 22 : 34;
    return `<g class="sc-traveler"><circle cx="${x}" cy="${y - h - 6}" r="6" fill="${P.skin}"/><path d="M${x - 7} ${y - h + 2} q7 -6 14 0 l${sit ? 4 : 2} ${h - 4} h-${sit ? 22 : 18} z" fill="${P.coat}"/></g>`;
  }
  /** The fawn at x, y (feet); stage 0–4 scales it. */
  function fawn(x, y, P, stage = 0) {
    const s = 0.7 + 0.12 * Math.max(0, Math.min(4, stage));
    return `<g class="sc-fawn" transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="-14" rx="12" ry="7" fill="${P.fawn}"/><circle cx="11" cy="-22" r="5" fill="${P.fawn}"/><path d="M8 -26 l-2 -6 M13 -26 l2 -6" stroke="${P.fawn}" stroke-width="2"/><circle cx="-4" cy="-15" r="1.4" fill="${P.spot}"/><circle cx="2" cy="-13" r="1.4" fill="${P.spot}"/><path d="M-8 -9 v9 M-3 -9 v9 M5 -9 v9 M9 -9 v9" stroke="${P.fawn}" stroke-width="2"/></g>`;
  }
  const water = (y, P, w = 320) => `<rect x="0" y="${y}" width="${w}" height="${150 - y}" fill="${P.water}"/><path class="sc-ripple" d="M40 ${y + 14} q20 -5 40 0 t40 0 M180 ${y + 26} q20 -5 40 0 t40 0" stroke="${P.sky}" stroke-width="2" fill="none"/>`;
  const sky = (P, dusk = false) => `<rect width="320" height="150" fill="${dusk ? P.dusk : P.sky}"/>`;
  const land = (y, P) => `<rect x="0" y="${y}" width="320" height="${150 - y}" fill="${P.land}"/>`;

  // Each scene: (P, o) → inner SVG. o = {stage, calm, detail}
  const SCENES = {
    seeds: { label: "Seeds resting in still water above a stone counter on a cornerstone", draw: (P, o) => `${sky(P)}${water(70, P)}<rect x="120" y="96" width="80" height="34" fill="${P.stone}"/><rect x="132" y="84" width="56" height="14" fill="#c9c3b9"/>${[0, 1, 2, 3, 4].map(i => `<ellipse cx="${138 + i * 11}" cy="80" rx="3.5" ry="2.4" fill="${P.wood}"/>`).join("")}` },
    road: { label: "The traveler walks a winding road with the fawn beside her", draw: (P, o) => `${sky(P)}${land(80, P)}<path d="M150 150 C120 120 210 110 170 80" stroke="${P.path}" stroke-width="22" fill="none"/>${o.detail ? `<circle cx="270" cy="34" r="14" fill="${P.warm}"/>` : ""}${traveler(140, 130, P)}${fawn(172, 132, P, o.stage)}` },
    loop: { label: "A loose loop of string drifts away on the breeze as the traveler walks on", draw: (P, o) => `${sky(P)}${land(90, P)}${traveler(110, 130, P)}${fawn(140, 132, P, o.stage)}<path d="M170 70 c30 -30 60 10 30 20 c-25 8 -10 -30 20 -25" stroke="${P.ink}" stroke-width="1.6" fill="none" stroke-dasharray="3 3"/>` },
    crossroads: { label: "At a crossroads, a signpost points back and ahead; the traveler holds a small note", draw: (P, o) => `${sky(P)}${land(85, P)}<path d="M0 120 L320 120 M160 150 L160 85" stroke="${P.path}" stroke-width="16"/><rect x="180" y="60" width="4" height="50" fill="${P.wood}"/><path d="M182 64 h34 l8 6 -8 6 h-34 z M182 82 h-34 l-8 6 8 6 h34 z" fill="${P.wood}"/>${traveler(140, 128, P)}<rect x="146" y="98" width="9" height="7" fill="#fff"/>${fawn(112, 130, P, o.stage)}` },
    bend: { label: "At a quiet bend, the traveler breathes slowly while the fawn rests", draw: (P, o) => `${sky(P)}${land(85, P)}<path d="M0 140 C90 100 230 140 320 100" stroke="${P.path}" stroke-width="18" fill="none"/><circle class="sc-breath" cx="150" cy="70" r="16" fill="none" stroke="${P.deep}" stroke-width="2"/>${traveler(150, 126, P, true)}${fawn(190, 128, P, o.stage)}` },
    lamp: { label: "A lamp glows in the window of a small house at dusk", draw: (P, o) => `${sky(P, true)}${land(100, P)}<rect x="120" y="60" width="80" height="50" fill="#d9c7ad"/><path d="M112 62 L160 30 L208 62 z" fill="${P.wood}"/><rect x="146" y="74" width="20" height="18" fill="${P.warm}"/>${o.detail ? `<circle cx="156" cy="83" r="14" fill="${P.warm}" opacity=".25"/>` : ""}${fawn(230, 128, P, o.stage)}` },
    horizon: { label: "A wide horizon at dusk with open space", draw: (P, o) => `${sky(P, true)}<circle cx="160" cy="96" r="22" fill="${P.warm}"/>${water(96, P)}${traveler(80, 140, P, true)}` },
    table: { label: "She shares bread with neighbors at a long table", draw: (P, o) => `${sky(P, true)}${land(96, P)}<rect x="70" y="100" width="180" height="8" fill="${P.wood}"/><path d="M80 108 v24 M240 108 v24" stroke="${P.wood}" stroke-width="4"/><ellipse cx="160" cy="97" rx="16" ry="5" fill="${P.warm}"/>${traveler(110, 112, P, true)}<g opacity=".9">${traveler(200, 112, { ...P, coat: "#8a6fb0" }, true)}${traveler(160, 110, { ...P, coat: "#5e9a72" }, true)}</g>${fawn(270, 138, P, o.stage)}` },
    garden: { label: "Tending a small garden, hands in the soil", draw: (P, o) => `${sky(P)}${land(90, P)}${[0, 1, 2, 3].map(i => `<path d="M${90 + i * 40} 120 q-6 -18 0 -26 q6 8 0 26" fill="${P.leaf}"/>`).join("")}<rect x="70" y="120" width="180" height="8" fill="${P.wood}" opacity=".6"/>${traveler(250, 132, P, true)}${fawn(40, 134, P, o.stage)}` },
    friend: { label: "A walk with a friend along a quiet path", draw: (P, o) => `${sky(P)}${land(86, P)}<path d="M0 132 C100 120 220 128 320 112" stroke="${P.path}" stroke-width="18" fill="none"/>${traveler(140, 128, P)}${traveler(165, 126, { ...P, coat: "#5e9a72" })}${fawn(200, 128, P, o.stage)}` },
    hands: { label: "Two hands helping lift a basket", draw: (P, o) => `${sky(P)}${land(110, P)}<rect x="130" y="80" width="60" height="30" rx="6" fill="${P.wood}"/><ellipse cx="124" cy="96" rx="10" ry="6" fill="${P.skin}"/><ellipse cx="196" cy="96" rx="10" ry="6" fill="#c99e7a"/>${fawn(250, 140, P, o.stage)}` },
    stones: { label: "Stepping stones across still water, one at a time", draw: (P, o) => `${sky(P)}${water(80, P)}${[0, 1, 2, 3, 4].map(i => `<ellipse cx="${50 + i * 55}" cy="${130 - i * 8}" rx="18" ry="6" fill="${P.stone}"/>`).join("")}${traveler(50, 128, P)}${fawn(85, 126, P, o.stage)}` },
    still: { label: "Evening rest by still water, the traveler and the fawn together", draw: (P, o) => `${sky(P, true)}${water(92, P)}${land(120, P)}${o.detail ? `<circle cx="250" cy="40" r="12" fill="${P.warm}"/>` : ""}${traveler(140, 132, P, true)}${fawn(178, 134, P, o.stage)}` },
  };
  // Small field motifs (About me), drawn in the top-left corner.
  const MOTIF = {
    lantern: P => `<g class="sc-motif"><rect x="12" y="12" width="26" height="18" rx="3" fill="#2f3a4a"/><rect x="15" y="15" width="20" height="12" fill="${P.warm}" opacity=".85"/><path d="M18 19 h8 M18 23 h12" stroke="#2f3a4a" stroke-width="1.2"/></g>`,
    hand: P => `<g class="sc-motif"><ellipse cx="25" cy="24" rx="12" ry="7" fill="${P.skin}"/><path d="M25 14 c-4 -6 -10 0 0 7 c10 -7 4 -13 0 -7" fill="#d9776a"/></g>`,
    canvas: P => `<g class="sc-motif"><path d="M14 36 L24 10 L34 36" stroke="${P.wood}" stroke-width="2" fill="none"/><rect x="15" y="12" width="18" height="14" fill="#fff"/><circle cx="22" cy="19" r="3" fill="${P.deep}"/></g>`,
    book: P => `<g class="sc-motif"><path d="M12 16 q12 -4 13 2 q1 -6 13 -2 v16 q-12 -4 -13 2 q-1 -6 -13 -2 z" fill="#fff" stroke="${P.wood}"/></g>`,
    tool: P => `<g class="sc-motif"><rect x="14" y="22" width="24" height="5" fill="${P.wood}"/><rect x="30" y="14" width="8" height="10" fill="${P.stone}"/></g>`,
    seed: P => `<g class="sc-motif"><path d="M24 34 q-8 -12 0 -20 q8 8 0 20" fill="${P.leaf}"/></g>`,
  };
  /** The SVG for one scene. o = {stage, calm, motif} */
  function svg(id, o = {}) {
    const s = SCENES[id] || SCENES.still, P = pal(o.calm);
    return `<svg xmlns="http://www.w3.org/2000/svg" class="scene${o.calm ? " calm" : ""}" viewBox="0 0 320 150" width="100%" role="img" aria-label="${s.label}">${s.draw(P, { stage: o.stage || 0, calm: !!o.calm, detail: !o.calm })}${o.motif && MOTIF[o.motif] ? MOTIF[o.motif](P) : ""}</svg>`;
  }

  /** Beat id (features/parable.js) → scene. */
  const BEAT_SCENE = { open: "seeds", road: "road", grip: "loop", crossroads: "crossroads", bend: "bend", verses: "lamp", remember: "lamp", peace: "horizon", share: "table", evening: "still" };

  const PROMPTS = {
    table: "Share something ordinary: make tea or a snack for someone, or eat slowly with someone nearby.",
    garden: "Do one ordinary task slowly: water a plant, fold laundry, wash one dish with care.",
    friend: "Write one kind text to someone nearby, or ask a friend for a short walk.",
    still: "Sit by a window or near water for a few minutes, and let your breath slow.",
    horizon: "Give yourself some space: step outside and look at the farthest thing you can see.",
    hands: "Use your hands: hold something warm, notice its weight and texture, then help with one small thing.",
    lamp: "Name three things you can see and two you can hear, right where you are.",
    stones: "Take just the next small step, then pause before the one after it.",
  };
  /** Pick the grounding image from the governor result and true size. Returns null when writing should simply go on. */
  function grounding(gov, m, about) {
    if (!gov || !m) return null;
    const s = gov.s, id0 = gov.c.grade.id, G = s.G || 0;
    let id;
    if (s.Mn >= 0.4 || G >= 0.4) id = s.Mn >= 0.6 ? "table" : G >= 0.4 ? "table" : "garden";
    else if (s.Y >= 0.4) id = "horizon";
    else if (s.U >= 0.5) id = "hands";
    else if (id0 === "pause") id = "still";
    else if (id0 === "ground") id = "stones";
    else if (id0 === "away") id = "friend";
    else return null;
    const own = MF.About && about ? MF.About.kind(about) : null;
    return { id, prompt: own && ["table", "garden", "friend"].includes(id) ? own : PROMPTS[id], calm: id0 !== "write" || s.Mn >= 0.4, label: SCENES[id].label };
  }

  MF.Scenes = { PAL, CALM, SCENES, MOTIF, BEAT_SCENE, PROMPTS, svg, grounding, traveler, fawn };
})(typeof window !== "undefined" ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
if (typeof module !== "undefined") module.exports = global.MF.Scenes;
