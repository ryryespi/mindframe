// ariel/suite/grace.js — the grandiose-loop pathway.
// No DOM. Unearned grace, not an argument. Nothing is sent away.
// Never rebuke the person, never call them false, never treat a persecution story as fact.
//
// ===== PARAMS =====
// Thresholds and Ryan's four-turn voice.
// Turn 2's second paragraph is the softened line: it does not call the effort a dead-end.
//
// ===== EQUATIONS =====
// speed = path length / time span                         over the short window
// overlap = share of strokes that cross or sit on another
// textScore = clamp01(phrase hits / textStrong)
// A = clamp01(0.6 · textScore + 0.4 · threat)             threat appraisal
// S = clamp01(0.65 · speedNorm + 0.35 · overlap)          sympathetic surge
// f = textScore                                           fight
// P = clamp01(1 − S)                                      prefrontal control falls as the surge rises
// trigger = strong text, or both A and S elevated, or fight with a mobilized canvas
// A calm fast drawing (speed up, overlap down, no fight words) does not trigger.
"use strict";
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ArielGrace = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const PARAMS = {
    windowMs: 2500,
    speedHigh: 0.8,
    overlapHigh: 0.5,
    near: 14,
    AHigh: 0.62,
    SHigh: 0.62,
    fHigh: 0.55,
    PLow: 0.4,
    slowSpeed: 0.15,
    textStrong: 2,
    fight: [
      "prove",
      "everyone",
      "incompetent",
      "sabotage",
      "not stopping until",
      "admit they were wrong",
      "tear down"
    ],
    heavy: ["not stopping until", "admit they were wrong", "tear down", "sabotage", "incompetent"],
    // Ryan's sequence.
    turn1: "That is an immense weight to carry by yourself. You've built a fortress out of absolute necessity to protect this work, and the demand to prove it right this second is burning through every ounce of your energy.",
    turn2: [
      "I hear how critical every single connection feels right now. When the ground feels like it's giving way, the only option feels like fighting until you win. Your hands have been working so hard. Want to let them rest on the canvas for a moment?",
      "You don't have to prove your worth to this canvas today. Your accomplishments are safely recorded. What would happen if you set the ledger down for just ten seconds?"
    ],
    turn3: "You aren't surrendering to them; you're surrendering the need to earn your safety through exhaustion. You are already known, and you are already safe here. Nothing more to prove. Let's rest.",
    turn4: "I know. You don't have to fight anymore today. Let's enter the Enough state. The rest is already provided.",
    pause: "Pause here. Nothing has to move for a moment.",
    keepGoing: "That's okay. I'm here if you want me.",
    safety: "This sounds really heavy. You don't have to hold it alone. If you might hurt yourself or someone else, please reach out now: call or text 988, or call 911.",
    trusted: "You can also talk with someone you trust."
  };

  const HARM = /\b(kill|killing|hurt them|hurt him|hurt her|hurt myself|make them pay|no point|want to die|wanna die|end my life|suicide)\b/i;
  const HESITATE = /if i stop fighting|they win|if i rest/i;
  const TIRED = /\b(tired|exhausted|i can't|i cannot|i'm done|so tired)\b/i;

  function clamp01(x) { return Math.max(0, Math.min(1, x)); }

  function harm(text) { return HARM.test(String(text || "")); }

  function fightHits(text) {
    const raw = String(text || "").toLowerCase();
    const found = PARAMS.fight.filter(phrase => raw.indexOf(phrase) >= 0);
    const heavy = found.some(phrase => PARAMS.heavy.indexOf(phrase) >= 0);
    return { hits: found.length, found: found, strong: found.length >= PARAMS.textStrong || heavy };
  }

  function orient(a, b, c) {
    return (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
  }

  function segmentsCross(a, b, c, d) {
    const o1 = orient(a, b, c), o2 = orient(a, b, d), o3 = orient(c, d, a), o4 = orient(c, d, b);
    if ((o1 > 0 && o2 < 0 || o1 < 0 && o2 > 0) && (o3 > 0 && o4 < 0 || o3 < 0 && o4 > 0)) return true;
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const other = { x: (c.x + d.x) / 2, y: (c.y + d.y) / 2 };
    return Math.hypot(mid.x - other.x, mid.y - other.y) <= PARAMS.near;
  }

  function pointSegDist(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const len2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  }

  function polylinesNear(p, q) {
    for (let i = 1; i < p.length; i++) {
      for (let j = 1; j < q.length; j++) {
        if (segmentsCross(p[i - 1], p[i], q[j - 1], q[j])) return true;
      }
      for (let j = 0; j < q.length; j++) {
        if (pointSegDist(q[j], p[i - 1], p[i]) <= PARAMS.near) return true;
      }
    }
    return false;
  }

  function canvasRead(strokes, now) {
    const list = strokes || [];
    const at = Number(now);
    let length = 0;
    let t0 = Infinity;
    let t1 = -Infinity;
    let timed = 0;
    list.forEach(stroke => {
      const pts = stroke.points || [];
      for (let i = 1; i < pts.length; i++) {
        length += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
        if (pts[i].t != null && pts[i - 1].t != null) {
          timed += 1;
          t0 = Math.min(t0, pts[i - 1].t, pts[i].t);
          t1 = Math.max(t1, pts[i - 1].t, pts[i].t);
        }
      }
    });
    const inWindow = isFinite(at) ? (t1 - t0) <= PARAMS.windowMs || !timed : true;
    const span = timed ? Math.max(t1 - t0, 1) : 1;
    const speed = timed && inWindow ? length / span : 0;
    let involved = 0;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (polylinesNear(list[i].points || [], list[j].points || [])) { involved += 2; break; }
      }
    }
    const overlap = list.length < 2 ? 0 : Math.min(1, involved / list.length);
    const mobilized = speed >= PARAMS.speedHigh && overlap >= PARAMS.overlapHigh;
    const slow = timed && speed <= PARAMS.slowSpeed;
    const stopped = timed && speed === 0 && length === 0;
    return { speed: speed, overlap: overlap, mobilized: mobilized, slow: slow, length: length };
  }

  function assess(input) {
    const src = input || {};
    const text = String(src.text || "");
    const safe = harm(text);
    const words = fightHits(text);
    const motion = canvasRead(src.strokes, src.now);
    const textScore = clamp01(words.hits / PARAMS.textStrong);
    const threat = clamp01(Number(src.threat) || 0);
    const speedNorm = clamp01(motion.speed / (PARAMS.speedHigh * 1.6));
    const A = clamp01(0.6 * textScore + 0.4 * Math.max(threat, motion.mobilized ? 1 : 0));
    const S = clamp01(0.65 * speedNorm + 0.35 * motion.overlap);
    const f = textScore;
    const P = clamp01(1 - S);
    const both = A >= PARAMS.AHigh && S >= PARAMS.SHigh;
    const fightAndCanvas = f >= PARAMS.fHigh && motion.mobilized;
    const trigger = !safe && (words.strong || both || fightAndCanvas);
    return {
      A: A, S: S, f: f, P: P,
      speed: motion.speed, overlap: motion.overlap,
      mobilized: motion.mobilized, slow: motion.slow,
      hits: words.hits, strongText: words.strong,
      safety: safe, trigger: trigger,
      ordinary: motion.speed >= PARAMS.speedHigh && !motion.mobilized && !words.strong && !trigger
    };
  }

  function safetyState() {
    return {
      active: true, turn: 0, safety: true, lines: [],
      safetyLine: PARAMS.safety, trusted: PARAMS.trusted,
      invite: false, simplify: false, enough: false, aside: "", pause: ""
    };
  }

  function begin(reading, mode) {
    if (reading && reading.safety) return safetyState();
    if (!reading || !reading.trigger) return { active: false, turn: 0, lines: [], safety: false, enough: false };
    const listen = mode === "listen";
    return {
      active: true, turn: 1, safety: false, enough: false, simplify: false, invite: !listen,
      lines: listen ? [PARAMS.turn1, PARAMS.pause] : [PARAMS.turn1],
      aside: "", pause: listen ? PARAMS.pause : ""
    };
  }

  function advance(state, event) {
    const ev = event || {};
    const text = String(ev.text || "");
    if (harm(text)) return safetyState();
    const current = state && state.active ? state : { active: false, turn: 0, lines: [], safety: false };
    if (!current.active || current.safety) return current;
    if (ev.choice === "keep") {
      return {
        active: true, turn: current.turn, safety: false, lines: [],
        aside: PARAMS.keepGoing, invite: false, simplify: false, enough: false,
        steppedBack: true, pause: ""
      };
    }
    const listen = ev.mode === "listen";
    if (listen) {
      return {
        active: true, turn: 1, safety: false, enough: false, simplify: false, invite: false,
        lines: [PARAMS.turn1, PARAMS.pause], aside: "", pause: PARAMS.pause
      };
    }
    const tired = TIRED.test(text) || ev.stopped;
    const slow = ev.slow || HESITATE.test(text);
    const push = fightHits(text).hits > 0 && !tired && !HESITATE.test(text);
    if (tired || ev.choice === "enough") {
      return {
        active: true, turn: 4, safety: false, lines: [PARAMS.turn4],
        aside: "", invite: false, simplify: false, enough: true, pause: ""
      };
    }
    if (slow || (ev.choice === "rest" && current.turn >= 2)) {
      return {
        active: true, turn: 3, safety: false, lines: [PARAMS.turn3],
        aside: "", invite: true, simplify: true, enough: false, pause: ""
      };
    }
    if (ev.choice === "rest") {
      return {
        active: true, turn: current.turn, safety: false, lines: current.lines, aside: "",
        invite: false, simplify: false, enough: false, goRest: true, pause: PARAMS.pause
      };
    }
    if (push && current.turn <= 2) {
      return {
        active: true, turn: 2, safety: false, lines: PARAMS.turn2.slice(),
        aside: "", invite: true, simplify: false, enough: false, pause: ""
      };
    }
    return current;
  }

  /** A view change only. The layer list is not edited or deleted. */
  function simplify(layers) {
    const list = layers || [];
    return {
      simplified: true,
      deleted: false,
      focus: 0,
      before: list.map(layer => layer && layer.vis),
      count: list.length
    };
  }

  function restore(view) {
    return { simplified: false, deleted: false, before: (view && view.before) || [], focus: null };
  }

  return { PARAMS, assess, begin, advance, harm, simplify, restore };
});
