// ariel/suite/story.js — a story seeded by the drawing.
// No DOM. The same marks always tell the same story. Nothing is sent away.
// Wonder, not a tower. No grades, no winning.
//
// ===== PARAMS =====
// grid       quantize a point so a tiny wobble does not change the tale
// minDiffer  if fewer elements differ from the last saved story, step the seed
// steps      how far the seed may walk to find a fresher telling
// rate       more than this many tellings inside the window offers rest
// windowMs   ten minutes
// banks      local words. Ryan's shape: character, place, question, discovery, sharing, rest
//
// ===== EQUATIONS =====
// q = round(x / grid) * grid
// seed = FNV-1a(color, order t, quantized points)     the same drawing hashes the same
// u = mulberry32(seed + step)                         step is 0 unless novelty asks for a nudge
// differ = how many of the six elements are not the last story's
// offer rest when the count of tellings in the window is greater than rate
"use strict";
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ArielStory = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const PARAMS = {
    grid: 16,
    minDiffer: 3,
    steps: 8,
    rate: 5,
    windowMs: 10 * 60 * 1000,
    presence: "Pause here. Nothing has to move for a moment.",
    forgiveness: "You can let yourself off the hook for this.",
    guard: "That's a lot of stories. Want to rest with this one for a moment?",
    characters: [
      "A quiet student",
      "A gardener",
      "A child with a piece of chalk",
      "An old friend of the river",
      "A baker at the end of the day",
      "A traveler with empty pockets",
      "A sibling on the back step",
      "A keeper of small lamps"
    ],
    settings: [
      "a kitchen after the dishes",
      "a field where the rain had just stopped",
      "a library corner no one was using",
      "the edge of a pond",
      "a workshop where the tools were at rest",
      "a hill path in the late light",
      "a room with one open window",
      "the shade under a wide tree"
    ],
    longings: [
      "what the curve was quietly doing",
      "whether the light had a shape",
      "how one sound could sit inside another",
      "why the same count kept returning",
      "what the pattern was keeping safe",
      "whether rest could be a kind of seeing",
      "how something small could hold an order",
      "what would happen if they only looked"
    ],
    discoveries: [
      { kind: "spiral", line: "a spiral already wound into a seed head" },
      { kind: "pattern", line: "a five-part pattern in the leaves" },
      { kind: "light", line: "light breaking into colors on the rim of a glass" },
      { kind: "sound", line: "two notes standing in a simple ratio" },
      { kind: "number", line: "the same number of petals, again and again" },
      { kind: "spiral", line: "a shell repeating its slow turn" },
      { kind: "pattern", line: "frost repeating the same tile on the pane" },
      { kind: "light", line: "a thin beam laying a line across the floor" }
    ],
    companions: [
      "a friend who did not interrupt",
      "a grandparent",
      "a younger child",
      "a neighbor on the path",
      "someone who had been quiet too",
      "a teacher who only listened",
      "the person they lived with",
      "a stranger who stopped to see"
    ],
    endings: [
      "They let it be, and the hour returned to rest.",
      "The wonder was enough, and the day grew gentle.",
      "They stayed a little longer, then set the seeing down.",
      "Grace looked like sitting still with what they had found.",
      "The story ended where it began, in quiet.",
      "They carried it home and set it on the table, softly.",
      "Rest came by itself.",
      "The world kept its architecture, and they kept their peace."
    ],
    extras: [
      "The shape had been there before anyone named it.",
      "Light, number, and sound were ways of noticing the same kindness.",
      "No one had to finish it for it to be real."
    ]
  };
  const ELEMENT_KEYS = ["character", "setting", "longing", "discovery", "companion", "ending"];

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function quantize(n) {
    const g = PARAMS.grid;
    return Math.round(Number(n) / g) * g;
  }

  function normalize(drawing) {
    const marks = Array.isArray(drawing) ? drawing : ((drawing && drawing.marks) || []);
    return marks.map((m, i) => ({
      color: String((m && m.color) || "#7a9cc6"),
      t: m && m.t != null ? Math.round(Number(m.t)) : i,
      points: ((m && m.points) || []).map(p => ({ x: quantize(p.x), y: quantize(p.y) }))
    })).filter(m => m.points.length);
  }

  /** FNV-1a over color, order, and quantized points. Clock time is not in the hash. */
  function hashMarks(marks) {
    let h = 0x811c9dc5;
    const s = marks.map(m => m.color + "|" + m.t + "|" + m.points.map(p => p.x + "," + p.y).join(";")).join("||");
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  function seedOf(drawing) {
    return hashMarks(normalize(drawing));
  }

  function pick(rng, list) {
    return list[Math.floor(rng() * list.length) % list.length];
  }

  function compose(seed) {
    const rng = mulberry32(seed);
    const discovery = pick(rng, PARAMS.discoveries);
    const elements = {
      character: pick(rng, PARAMS.characters),
      setting: pick(rng, PARAMS.settings),
      longing: pick(rng, PARAMS.longings),
      discovery: discovery.line,
      kind: discovery.kind,
      companion: pick(rng, PARAMS.companions),
      ending: pick(rng, PARAMS.endings)
    };
    const sentences = [
      elements.character + " was in " + elements.setting + ".",
      "A small question stayed nearby: " + elements.longing + ".",
      "They noticed " + elements.discovery + ".",
      "It was a " + elements.kind + ", already built into the world.",
      "They showed it to " + elements.companion + ", and the two of them only looked.",
      elements.ending
    ];
    const extras = [];
    PARAMS.extras.forEach(line => { if (extras.length < 2 && rng() > 0.45) extras.push(line); });
    if (rng() < 0.34) sentences.splice(3, 1);
    const body = sentences.slice(0, sentences.length - 1).concat(extras).concat(sentences.slice(-1));
    return { elements: elements, sentences: body, text: body.join(" ") };
  }

  function lastElements(previous) {
    const list = previous || [];
    if (!list.length) return null;
    const last = list[list.length - 1];
    return last.elements || last;
  }

  function differ(elements, previous) {
    const prior = lastElements(previous);
    if (!prior) return ELEMENT_KEYS.length;
    return ELEMENT_KEYS.filter(k => elements[k] !== prior[k]).length;
  }

  function thumbnail(drawing) {
    const marks = normalize(drawing);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    marks.forEach(m => m.points.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }));
    if (!isFinite(minX)) minX = 0, minY = 0, maxX = 1, maxY = 1;
    const span = Math.max(maxX - minX, maxY - minY, 1);
    const sx = (x) => (4 + (x - minX) / span * 72).toFixed(1);
    const sy = (y) => (4 + (y - minY) / span * 72).toFixed(1);
    let body = "";
    marks.forEach(m => {
      const color = String(m.color).replace(/[^#0-9A-Za-z]/g, "") || "#7a9cc6";
      if (m.points.length === 1) body += '<circle cx="' + sx(m.points[0].x) + '" cy="' + sy(m.points[0].y) + '" r="2" fill="' + color + '"/>';
      else body += '<polyline fill="none" stroke="' + color + '" stroke-width="1.5" points="' + m.points.map(p => sx(p.x) + "," + sy(p.y)).join(" ") + '"/>';
    });
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">' + body + "</svg>";
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  /**
   * Tell the drawing's story.
   * opts.previous: saved stories, newest last, each { elements }.
   * opts.tone: "listen" hides the tale and offers rest instead.
   * The drawing fixes the seed. A nudge walks seed, seed+1, ... only when overlap is high.
   */
  function tell(drawing, opts) {
    const o = opts || {};
    const tone = o.tone === "listen" || o.tone === "expansive" ? o.tone : "gentle";
    const marks = normalize(drawing);
    if (tone === "listen") {
      return {
        show: false, tone: "listen", seed: marks.length ? hashMarks(marks) : 0,
        presence: PARAMS.presence, forgiveness: PARAMS.forgiveness,
        text: "", sentences: [], elements: null, differ: 0, nudged: 0, thumb: ""
      };
    }
    if (!marks.length) {
      return {
        show: false, tone: tone, empty: true, seed: 0,
        presence: "Draw something first. The story comes from the marks.",
        forgiveness: "", text: "", sentences: [], elements: null, differ: 0, nudged: 0, thumb: ""
      };
    }
    const seed = hashMarks(marks);
    const previous = o.previous || [];
    let chosen = null;
    for (let step = 0; step < PARAMS.steps; step++) {
      const story = compose(seed + step);
      const diff = differ(story.elements, previous);
      const row = { story: story, differ: diff, nudged: step };
      if (!chosen || diff > chosen.differ) chosen = row;
      if (step === 0 && (!previous.length || diff >= PARAMS.minDiffer)) break;
      if (diff >= PARAMS.minDiffer) break;
    }
    return {
      show: true, empty: false, tone: tone, seed: seed,
      nudged: chosen.nudged, differ: chosen.differ,
      text: chosen.story.text, sentences: chosen.story.sentences,
      elements: chosen.story.elements, presence: "", forgiveness: "",
      thumb: thumbnail(marks)
    };
  }

  /** More than `rate` tellings inside the window. Never a block. */
  function guard(times, now) {
    const at = Number(now) || 0;
    const recent = (times || []).filter(t => at - Number(t) < PARAMS.windowMs && at - Number(t) >= 0);
    const offer = recent.length > PARAMS.rate;
    return { offer: offer, blocked: false, recent: recent.length, line: offer ? PARAMS.guard : "" };
  }

  function keepEntry(result, when) {
    if (!result || !result.show) return null;
    return {
      type: "story",
      text: "Kept a story from the canvas",
      note: result.text,
      href: "#create",
      source: "auto",
      key: "story:" + result.seed,
      at: when || "",
      thumb: result.thumb || ""
    };
  }

  return { PARAMS, mulberry32, seedOf, normalize, compose, differ, tell, guard, thumbnail, keepEntry };
});
