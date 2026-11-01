// ariel/cad.js — pure helpers for the drafting shell.
// Undo history, delete, command parsing, and prompt export.
// No DOM and no network. The page and the node tests share this file.
"use strict";
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ArielCAD = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  /** A stack of whole states. Undo returns the previous state; redo returns the later one. */
  function History(limit) {
    return {
      limit: limit || 80,
      past: [],
      future: [],
      push(before, after, label) {
        if (JSON.stringify(before) === JSON.stringify(after)) return false;
        this.past.push({ before: clone(before), after: clone(after), label: label || "edit" });
        if (this.past.length > this.limit) this.past.shift();
        this.future = [];
        return true;
      },
      canUndo() { return this.past.length > 0; },
      canRedo() { return this.future.length > 0; },
      undo() {
        const e = this.past.pop();
        if (!e) return null;
        this.future.push(e);
        return clone(e.before);
      },
      redo() {
        const e = this.future.pop();
        if (!e) return null;
        this.past.push(e);
        return clone(e.after);
      }
    };
  }

  /**
   * Remove one shape from a layer. sel is { kind: dot|line|circle, id? , index? }.
   * Returns true when a shape was removed. Does not touch other layers.
   */
  function deleteShape(layer, sel) {
    if (!layer || !sel) return false;
    const key = sel.kind === "dot" ? "dots" : sel.kind === "line" ? "lines" : sel.kind === "circle" ? "circles" : null;
    if (!key || !Array.isArray(layer[key])) return false;
    let idx = -1;
    if (sel.id) idx = layer[key].findIndex(sh => sh && sh.id === sel.id);
    if (idx < 0 && Number.isInteger(sel.index)) idx = sel.index;
    if (idx < 0 || idx >= layer[key].length) return false;
    layer[key].splice(idx, 1);
    return true;
  }

  const STYLES = {
    explain: "Explain my thinking. Describe the geometry and the order of my actions in plain language. Do not invent feelings I did not draw.",
    match: "Find a matching idea. Propose one new layer in Ariel notation that shares this drawing's crossing angles, length ratios, and input-to-output turns. Put that layer in one ```ariel fence. Do not change my layers.",
    ground: "Ground this in reality. Say which parts connect to the input and output anchors, which parts are free, and one small next line that would raise grounding. Stay with the geometry."
  };

  /**
   * A ready-to-paste prompt. model: { notation, english[], bag, history[] }.
   * The instruction changes with the style. The record does not.
   */
  function buildPrompt(style, model) {
    const key = Object.prototype.hasOwnProperty.call(STYLES, style) ? style : "explain";
    const m = model || {};
    const lines = [];
    lines.push("# Ariel prompt — " + key);
    lines.push("");
    lines.push("All credit and glory to God. I owe my knowledge to my Lord Jesus Christ.");
    lines.push("");
    lines.push("_Conceptual, not validated science. Not therapy. In crisis in the U.S., call or text 988; in an emergency, call 911._");
    lines.push("");
    lines.push("## Instruction");
    lines.push(STYLES[key]);
    lines.push("");
    lines.push("## Drawing (notation)");
    lines.push(m.notation || "(empty)");
    lines.push("");
    lines.push("## Plain English");
    (m.english || []).forEach(p => lines.push("- " + p));
    if (!(m.english || []).length) lines.push("- (none yet)");
    lines.push("");
    lines.push("## Bag of words");
    lines.push(m.bag || "(empty)");
    lines.push("");
    lines.push("## Math");
    lines.push(m.math || "(none)");
    if (m.glossary) lines.push("Glossary: " + m.glossary);
    lines.push("");
    if (m.domainNote || m.alignment) {
      lines.push("## Field");
      if (m.domainNote) lines.push(m.domainNote);
      if (m.alignment) lines.push(m.alignment);
      lines.push("The Nonsense Layer is the fixed reference. Geometry is unchanged.");
      lines.push("");
    }
    if (m.self) {
      lines.push("## Self established");
      lines.push("Established " + (m.self.at || "") + " by the user (not a metaphysical proof).");
      lines.push("Self-point: " + m.self.point.name + ".");
      (m.self.anchors || []).forEach(a => lines.push("- " + a.name + (a.value ? " = " + a.value : "")));
      lines.push("");
    }
    if (m.environment) {
      lines.push("## Environment (model, not proof)");
      lines.push(m.environment);
      lines.push("");
    }
    lines.push("## What I did, in order");
    (m.history || []).forEach((h, i) => lines.push((i + 1) + ". " + h));
    if (!(m.history || []).length) lines.push("1. (no edits yet)");
    lines.push("");
    lines.push("The AI never edits a human layer. Answer from this record only.");
    return lines.join("\n");
  }

  const ALIAS = { DOT: "POINT", DELETE: "ERASE", U: "UNDO" };
  const KNOWN = ["POINT", "LINE", "CIRCLE", "MOVE", "SELECT", "ERASE", "UNDO", "REDO", "LAYER", "SNAP", "ORTHO", "MERGE", "CLARIFY", "HELP", "EXPORT", "LOCK", "ADVANCED", "MATH"];

  /** Typed command → { cmd, args, raw }. Unknown commands come back as UNKNOWN. */
  function parseCommand(raw) {
    const s = String(raw || "").trim();
    if (!s) return null;
    const parts = s.split(/\s+/);
    const head = parts[0].toUpperCase();
    const cmd = ALIAS[head] || head;
    if (cmd === "MATH") return { cmd, args: [s.replace(/^\s*math\s+/i, "")], raw: s };
    if (!KNOWN.includes(cmd)) return { cmd: "UNKNOWN", args: parts.slice(1), raw: s };
    return { cmd, args: parts.slice(1), raw: s };
  }

  const NUM = "[-+]?(?:\\d+\\.\\d+|\\d+|\\.\\d+)";
  const BAR = "\u0305";
  const LINECH = "\u2194";
  function r3(n) { return (Math.round(Number(n) * 1000) / 1000).toFixed(3); }
  function emptyModel() {
    return { anchors: null, points: [], segments: [], lines: [], circles: [], doubts: [], angles: [], parallels: [], perps: [], members: [], cuts: [], subsets: [], ranges: [], vars: [] };
  }
  /** Resistance ρ from a radius ratio. 0 is no extra damping; 1 is the full short side. */
  function rhoOf(r) {
    const n = Number(r);
    if (!isFinite(n) || n <= 0) return 0;
    return Math.min(1, n);
  }
  /** Inside a doubt circle, γ_eff = γ + ρ. */
  function effectiveGamma(gamma, rho) {
    const g = Math.max(0, Number(gamma) || 0);
    return g + rhoOf(rho);
  }
  function byName(list, name) { return (list || []).find(p => p.name === name); }
  function pairTok(a, b, infinite) {
    if (/^[A-Za-z]$/.test(a) && /^[A-Za-z]$/.test(b)) return a + b + (infinite ? LINECH : BAR);
    return (infinite ? "line" : "seg") + "(" + a + "," + b + ")";
  }
  function pairLatex(a, b, infinite) {
    const body = (/^[A-Za-z]$/.test(a) && /^[A-Za-z]$/.test(b)) ? a + b : "\\mathrm{" + a + "}\\mathrm{" + b + "}";
    return infinite ? "\\overleftrightarrow{" + body + "}" : "\\overline{" + body + "}";
  }

  /** One Unicode line. Pass a model that already lists the relations you want shown. */
  function mathLine(model) {
    const m = model || {};
    const bits = [];
    if (m.anchors && m.anchors.i && m.anchors.o) {
      const i = m.anchors.i, o = m.anchors.o;
      bits.push("I(" + r3(i.x) + "," + r3(i.y) + ") → O(" + r3(o.x) + "," + r3(o.y) + ")");
    }
    if ((m.points || []).length) bits.push(m.points.map(p => p.name + "(" + r3(p.x) + "," + r3(p.y) + ")").join(", "));
    if ((m.segments || []).length) bits.push(m.segments.map(s => pairTok(s.a, s.b, false)).join(", "));
    if ((m.lines || []).length) bits.push(m.lines.map(s => pairTok(s.a, s.b, true)).join(", "));
    (m.angles || []).forEach(a => bits.push("∠" + a.a + a.b + a.c + " = " + Math.round(a.deg) + "°"));
    (m.parallels || []).forEach(p => bits.push(p[0].a + p[0].b + " ∥ " + p[1].a + p[1].b));
    (m.perps || []).forEach(p => bits.push(p[0].a + p[0].b + " ⊥ " + p[1].a + p[1].b));
    (m.circles || []).forEach(c => bits.push("⊙" + c.name + "(" + (c.x == null ? "" : r3(c.x) + "," + r3(c.y) + ",") + "r=" + r3(c.r) + ")"));
    (m.doubts || []).forEach(c => bits.push("◌" + c.name + "(" + (c.x == null ? "" : r3(c.x) + "," + r3(c.y) + ",") + "ρ=" + r3(c.rho != null ? c.rho : rhoOf(c.r)) + ")"));
    (m.members || []).forEach(x => bits.push(x.p + " ∈ " + x.a + x.b));
    (m.cuts || []).forEach(x => bits.push(x.name + " = " + x.a + x.b + " ∩ " + x.c + x.d));
    (m.subsets || []).forEach(x => bits.push("⊙" + x.inner + " ⊂ ⊙" + x.outer));
    (m.ranges || []).forEach(x => bits.push(x.name + " ∈ [" + r3(x.lo) + ", " + r3(x.hi) + "]"));
    (m.vars || []).forEach(v => bits.push(v.name + " = " + v.value));
    return bits.join("; ");
  }

  /** The same sentence in LaTeX, still one line. */
  function mathLatex(model) {
    const m = model || {};
    const bits = [];
    if (m.anchors && m.anchors.i && m.anchors.o) {
      const i = m.anchors.i, o = m.anchors.o;
      bits.push("I(" + r3(i.x) + "," + r3(i.y) + ") \\to O(" + r3(o.x) + "," + r3(o.y) + ")");
    }
    if ((m.points || []).length) bits.push(m.points.map(p => p.name + "(" + r3(p.x) + "," + r3(p.y) + ")").join(", "));
    if ((m.segments || []).length) bits.push(m.segments.map(s => pairLatex(s.a, s.b, false)).join(", "));
    if ((m.lines || []).length) bits.push(m.lines.map(s => pairLatex(s.a, s.b, true)).join(", "));
    (m.angles || []).forEach(a => bits.push("\\angle " + a.a + a.b + a.c + " = " + Math.round(a.deg) + "^{\\circ}"));
    (m.parallels || []).forEach(p => bits.push(p[0].a + p[0].b + " \\parallel " + p[1].a + p[1].b));
    (m.perps || []).forEach(p => bits.push(p[0].a + p[0].b + " \\perp " + p[1].a + p[1].b));
    (m.circles || []).forEach(c => bits.push("\\odot " + c.name + "(" + (c.x == null ? "" : r3(c.x) + "," + r3(c.y) + ",") + "r=" + r3(c.r) + ")"));
    (m.doubts || []).forEach(c => bits.push("\\rho_{" + c.name + "}=" + r3(c.rho != null ? c.rho : rhoOf(c.r))));
    (m.members || []).forEach(x => bits.push(x.p + " \\in " + x.a + x.b));
    (m.cuts || []).forEach(x => bits.push(x.name + " = " + x.a + x.b + " \\cap " + x.c + x.d));
    (m.subsets || []).forEach(x => bits.push("\\odot " + x.inner + " \\subset \\odot " + x.outer));
    (m.ranges || []).forEach(x => bits.push(x.name + " \\in [" + r3(x.lo) + ", " + r3(x.hi) + "]"));
    (m.vars || []).forEach(v => bits.push(v.name + " = " + v.value));
    return bits.join("; ");
  }

  function angleDeg(A, B, C) {
    const ba = Math.atan2(A.y - B.y, A.x - B.x);
    const bc = Math.atan2(C.y - B.y, C.x - B.x);
    let d = Math.abs(bc - ba) * 180 / Math.PI;
    if (d > 180) d = 360 - d;
    return d;
  }
  function orient(a, b) {
    let t = Math.atan2(b.y - a.y, b.x - a.x);
    t %= Math.PI; if (t < 0) t += Math.PI;
    return t;
  }
  function near(a, b, t) { return Math.hypot(a.x - b.x, a.y - b.y) <= t; }

  /** Fill angles, parallel, perpendicular, membership, crossings, and circle subset from coordinates. */
  function deriveRelations(model) {
    const m = clone(model || emptyModel());
    m.angles = []; m.parallels = []; m.perps = []; m.members = []; m.cuts = []; m.subsets = [];
    const P = Object.fromEntries((m.points || []).map(p => [p.name, p]));
    const segs = m.segments || [];
    function dir(s) { const a = P[s.a], b = P[s.b]; return a && b ? orient(a, b) : null; }
    for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
      const di = dir(segs[i]), dj = dir(segs[j]);
      if (di == null || dj == null) continue;
      const d = Math.min(Math.abs(di - dj), Math.PI - Math.abs(di - dj)) * 180 / Math.PI;
      if (d < 1.25) m.parallels.push([segs[i], segs[j]]);
      else if (Math.abs(d - 90) < 1.25) m.perps.push([segs[i], segs[j]]);
      let vertex = null, A, C;
      if (segs[i].a === segs[j].a) { vertex = segs[i].a; A = segs[i].b; C = segs[j].b; }
      else if (segs[i].a === segs[j].b) { vertex = segs[i].a; A = segs[i].b; C = segs[j].a; }
      else if (segs[i].b === segs[j].a) { vertex = segs[i].b; A = segs[i].a; C = segs[j].b; }
      else if (segs[i].b === segs[j].b) { vertex = segs[i].b; A = segs[i].a; C = segs[j].a; }
      if (vertex && P[A] && P[C] && P[vertex]) m.angles.push({ a: A, b: vertex, c: C, deg: angleDeg(P[A], P[vertex], P[C]) });
      const hit = lineCross(P[segs[i].a], P[segs[i].b], P[segs[j].a], P[segs[j].b]);
      if (hit) {
        const named = (m.points || []).find(p => p.name !== segs[i].a && p.name !== segs[i].b && p.name !== segs[j].a && p.name !== segs[j].b && near(p, hit, 0.03));
        if (named) m.cuts.push({ name: named.name, a: segs[i].a, b: segs[i].b, c: segs[j].a, d: segs[j].b });
      }
    }
    (m.points || []).forEach(p => segs.forEach(s => {
      const a = P[s.a], b = P[s.b];
      if (!a || !b || p.name === s.a || p.name === s.b) return;
      const ab = { x: b.x - a.x, y: b.y - a.y }, ap = { x: p.x - a.x, y: p.y - a.y };
      const L = Math.hypot(ab.x, ab.y) || 1;
      const dist = Math.abs(ab.x * ap.y - ab.y * ap.x) / L;
      const t = (ap.x * ab.x + ap.y * ab.y) / (L * L);
      if (dist < 0.02 && t > 0.02 && t < 0.98) m.members.push({ p: p.name, a: s.a, b: s.b });
    }));
    const circles = m.circles || [];
    circles.forEach(inner => circles.forEach(outer => {
      if (inner === outer || inner.x == null || outer.x == null) return;
      const d = Math.hypot(inner.x - outer.x, inner.y - outer.y);
      if (d + inner.r <= outer.r + 0.001) m.subsets.push({ inner: inner.name, outer: outer.name });
    }));
    return m;
  }

  function lineCross(a, b, c, d) {
    if (!a || !b || !c || !d) return null;
    const rx = b.x - a.x, ry = b.y - a.y, sx = d.x - c.x, sy = d.y - c.y;
    const den = rx * sy - ry * sx;
    if (Math.abs(den) < 1e-9) return null;
    const t = ((c.x - a.x) * sy - (c.y - a.y) * sx) / den;
    return { x: a.x + t * rx, y: a.y + t * ry };
  }
  function splitComma(s) {
    const out = []; let cur = "", depth = 0;
    for (const ch of s) {
      if (ch === "(" || ch === "[") depth++;
      else if (ch === ")" || ch === "]") depth--;
      else if (ch === "," && depth === 0) { if (cur.trim()) out.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  function upsertPoint(m, name, x, y) {
    let p = byName(m.points, name);
    if (!p) { p = { name, x, y }; m.points.push(p); }
    else { p.x = x; p.y = y; }
    return p;
  }
  function ensureSeg(m, a, b) {
    if (!byName(m.points, a) || !byName(m.points, b)) return false;
    if (!m.segments.some(s => (s.a === a && s.b === b) || (s.a === b && s.b === a))) m.segments.push({ a, b });
    return true;
  }
  function setAngle(m, A, B, C, deg) {
    const a = byName(m.points, A), b = byName(m.points, B), c = byName(m.points, C);
    if (!a || !b || !c) return false;
    const ba = Math.atan2(a.y - b.y, a.x - b.x);
    const bc = Math.atan2(c.y - b.y, c.x - b.x);
    let cur = (bc - ba) * 180 / Math.PI;
    while (cur > 180) cur -= 360;
    while (cur < -180) cur += 360;
    const sign = cur < 0 ? -1 : 1;
    const len = Math.hypot(c.x - b.x, c.y - b.y) || 0.2;
    const rad = sign * deg * Math.PI / 180;
    c.x = +(b.x + len * Math.cos(ba + rad)).toFixed(6);
    c.y = +(b.y + len * Math.sin(ba + rad)).toFixed(6);
    ensureSeg(m, B, A); ensureSeg(m, B, C);
    return true;
  }
  function aimSeg(m, segNameA, segNameB, srcA, srcB, perp) {
    const a = byName(m.points, segNameA), b = byName(m.points, segNameB);
    const c = byName(m.points, srcA), d = byName(m.points, srcB);
    if (!a || !b || !c || !d) return false;
    let th = orient(c, d) + (perp ? Math.PI / 2 : 0);
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, len = Math.hypot(b.x - a.x, b.y - a.y) / 2 || 0.1;
    a.x = +(mx - Math.cos(th) * len).toFixed(6); a.y = +(my - Math.sin(th) * len).toFixed(6);
    b.x = +(mx + Math.cos(th) * len).toFixed(6); b.y = +(my + Math.sin(th) * len).toFixed(6);
    return true;
  }

  /**
   * Edit a model from one math line. Unknown clauses are skipped.
   * Returns { ok, model, applied }.
   */
  function applyMath(model, text) {
    const m = clone(model || emptyModel());
    ["points", "segments", "lines", "circles", "doubts", "angles", "parallels", "perps", "members", "cuts", "subsets", "ranges", "vars"].forEach(k => { if (!m[k]) m[k] = []; });
    const src = String(text || "").replace(/\s+/g, " ").trim();
    if (!src) return { ok: false, model: m, applied: 0 };
    let applied = 0;
    const pointRe = new RegExp("^([A-Za-z][\\w]*)\\s*\\(\\s*(" + NUM + ")\\s*,\\s*(" + NUM + ")\\s*\\)$");
    const segRe = new RegExp("^([A-Za-z])([A-Za-z])(?:" + BAR + "|¯)$");
    const segWord = /^seg\(([A-Za-z][\w]*),([A-Za-z][\w]*)\)$/;
    const lineRe = new RegExp("^([A-Za-z])([A-Za-z])(?:" + LINECH + "|<->)$");
    const lineWord = /^line\(([A-Za-z][\w]*),([A-Za-z][\w]*)\)$/;
    const angRe = new RegExp("^∠\\s*([A-Za-z])([A-Za-z])([A-Za-z])\\s*=\\s*(" + NUM + ")\\s*°?$");
    const parRe = new RegExp("^([A-Za-z])([A-Za-z])\\s*(?:∥|\\|\\|)\\s*([A-Za-z])([A-Za-z])$");
    const perRe = new RegExp("^([A-Za-z])([A-Za-z])\\s*(?:⊥|perp)\\s*([A-Za-z])([A-Za-z])$");
    const cirRe = new RegExp("^⊙\\s*([A-Za-z][\\w]*)\\s*\\(\\s*(?:(" + NUM + ")\\s*,\\s*(" + NUM + ")\\s*,\\s*)?r\\s*=\\s*(" + NUM + ")\\s*\\)$");
    const doubtRe = new RegExp("^◌\\s*([A-Za-z][\\w]*)\\s*\\(\\s*(?:(" + NUM + ")\\s*,\\s*(" + NUM + ")\\s*,\\s*)?ρ\\s*=\\s*(" + NUM + ")\\s*\\)$");
    const memRe = /^([A-Za-z][\w]*)\s*(?:∈|in)\s*([A-Za-z])([A-Za-z])$/;
    const cutRe = /^([A-Za-z][\w]*)\s*=\s*([A-Za-z])([A-Za-z])\s*(?:∩|cap)\s*([A-Za-z])([A-Za-z])$/;
    const subRe = /^⊙\s*([A-Za-z][\w]*)\s*(?:⊂|subset)\s*⊙\s*([A-Za-z][\w]*)$/;
    const rngRe = new RegExp("^([A-Za-z][\\w]*)\\s*(?:∈|in)\\s*\\[\\s*(" + NUM + ")\\s*,\\s*(" + NUM + ")\\s*\\]$");
    const ancRe = new RegExp("^I\\s*\\(\\s*(" + NUM + ")\\s*,\\s*(" + NUM + ")\\s*\\)\\s*(?:→|->)\\s*O\\s*\\(\\s*(" + NUM + ")\\s*,\\s*(" + NUM + ")\\s*\\)$");
    const varRe = /^([A-Za-z][\w]*)\s*=\s*(.+)$/;
    src.split(";").map(s => s.trim()).filter(Boolean).forEach(clause => {
      let mm;
      if (mm = clause.match(ancRe)) { m.anchors = { i: { x: +mm[1], y: +mm[2] }, o: { x: +mm[3], y: +mm[4] } }; applied++; return; }
      if (clause === "I → O" || clause === "I->O") { applied++; return; }
      if (mm = clause.match(rngRe)) { m.ranges = m.ranges.filter(r => r.name !== mm[1]); m.ranges.push({ name: mm[1], lo: +mm[2], hi: +mm[3] }); applied++; return; }
      if (mm = clause.match(subRe)) {
        const inner = byName(m.circles, mm[1]), outer = byName(m.circles, mm[2]);
        if (inner && outer && inner.x != null && outer.x != null) {
          const dx = inner.x - outer.x, dy = inner.y - outer.y, d = Math.hypot(dx, dy) || 0;
          const room = Math.max(0.01, outer.r * 0.5);
          if (d + inner.r > outer.r) {
            const allow = Math.max(0, outer.r - room);
            if (d > allow && d > 0) { inner.x = outer.x + dx / d * allow; inner.y = outer.y + dy / d * allow; }
            const d2 = Math.hypot(inner.x - outer.x, inner.y - outer.y);
            inner.r = +Math.max(0.01, outer.r - d2).toFixed(6);
          }
          applied++;
        }
        return;
      }
      if (mm = clause.match(doubtRe)) {
        const name = mm[1], x = mm[2] == null ? null : +mm[2], y = mm[3] == null ? null : +mm[3], rho = rhoOf(mm[4]);
        let c = (m.doubts || []).find(d => d.name === name);
        if (!c) { c = { name, x, y, r: rho, rho }; m.doubts.push(c); }
        else { if (x != null) { c.x = x; c.y = y; } c.r = rho; c.rho = rho; }
        applied++; return;
      }
      if (mm = clause.match(cirRe)) {
        const name = mm[1], x = mm[2] == null ? null : +mm[2], y = mm[3] == null ? null : +mm[3], r = +mm[4];
        let c = byName(m.circles, name);
        if (!c) { c = { name, x, y, r }; m.circles.push(c); }
        else { if (x != null) { c.x = x; c.y = y; } c.r = r; }
        if (c.x != null) upsertPoint(m, name, c.x, c.y);
        applied++; return;
      }
      if (mm = clause.match(angRe)) { if (setAngle(m, mm[1], mm[2], mm[3], +mm[4])) applied++; return; }
      if (mm = clause.match(parRe)) { if (aimSeg(m, mm[3], mm[4], mm[1], mm[2], false)) applied++; return; }
      if (mm = clause.match(perRe)) { if (aimSeg(m, mm[3], mm[4], mm[1], mm[2], true)) applied++; return; }
      if (mm = clause.match(cutRe)) {
        const hit = lineCross(byName(m.points, mm[2]), byName(m.points, mm[3]), byName(m.points, mm[4]), byName(m.points, mm[5]));
        if (hit) { upsertPoint(m, mm[1], +hit.x.toFixed(6), +hit.y.toFixed(6)); applied++; }
        return;
      }
      if (mm = clause.match(memRe)) {
        const p = byName(m.points, mm[1]), a = byName(m.points, mm[2]), b = byName(m.points, mm[3]);
        if (p && a && b) {
          const abx = b.x - a.x, aby = b.y - a.y, L2 = abx * abx + aby * aby || 1;
          const t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / L2;
          p.x = +(a.x + abx * t).toFixed(6); p.y = +(a.y + aby * t).toFixed(6);
          applied++;
        }
        return;
      }
      if (mm = clause.match(varRe) && !clause.includes("∩") && !clause.includes("cap")) {
        const vm = clause.match(varRe);
        m.vars = m.vars.filter(v => v.name !== vm[1]);
        m.vars.push({ name: vm[1], value: vm[2].trim() });
        applied++; return;
      }
      const parts = splitComma(clause);
      if (parts.length && parts.every(p => pointRe.test(p))) {
        parts.forEach(p => { const g = p.match(pointRe); upsertPoint(m, g[1], +g[2], +g[3]); });
        applied++; return;
      }
      if (parts.length && parts.every(p => segRe.test(p) || segWord.test(p) || lineRe.test(p) || lineWord.test(p))) {
        let n = 0;
        parts.forEach(p => {
          let g = p.match(segRe) || p.match(segWord);
          if (g && ensureSeg(m, g[1], g[2])) n++;
          g = p.match(lineRe) || p.match(lineWord);
          if (g) {
            if (ensureSeg(m, g[1], g[2])) n++;
            if (!m.lines.some(s => s.a === g[1] && s.b === g[2])) m.lines.push({ a: g[1], b: g[2] });
          }
        });
        if (n) applied++;
      }
    });
    return { ok: applied > 0, model: m, applied };
  }

  const CANON = {
    point: "point", line: "line", segment: "segment", circle: "circle", angle: "angle",
    parallel: "parallel", perpendicular: "perpendicular", intersection: "intersection",
    membership: "lies on", subset: "inside", anchor: "input → output"
  };
  /** Presets only contribute suggestion words and labels. They never add or move shapes. */
  const DOMAINS = {
    nonsense: {
      label: "human thought",
      words: ["input", "output", "patience", "momentum", "entropy", "thought", "anchor", "stage"],
      terms: { point: "thought-point", line: "thought path", segment: "thought step", circle: "stage boundary", angle: "turn", parallel: "same bearing", perpendicular: "right turn", intersection: "meeting", membership: "inside a stage", subset: "stage within a stage", anchor: "I → O" }
    },
    physics: {
      label: "physics",
      words: ["force", "mass", "velocity", "field", "trajectory", "energy", "interaction", "particle"],
      terms: { point: "particle", line: "vector/trajectory", segment: "path segment", circle: "field/range", angle: "deflection", parallel: "parallel trajectories", perpendicular: "orthogonal components", intersection: "interaction", membership: "in the field", subset: "nested field", anchor: "inflow → outflow" }
    },
    music: {
      label: "music",
      words: ["melody", "harmony", "rhythm", "tonic", "phrase", "cadence", "interval", "voice"],
      terms: { point: "note", line: "melodic line", segment: "phrase", circle: "key/tonal center", angle: "interval", parallel: "parallel motion", perpendicular: "contrary motion", intersection: "cadence", membership: "in the key", subset: "key within a key", anchor: "pickup → cadence" }
    },
    psychology: {
      label: "psychology",
      words: ["thought", "belief", "feeling", "defense", "pattern", "trigger", "boundary", "memory"],
      terms: { point: "feeling", line: "thought path", segment: "thought step", circle: "belief boundary", angle: "shift", parallel: "same pattern", perpendicular: "opposing pull", intersection: "conflict", membership: "inside a belief", subset: "belief within a belief", anchor: "trigger → response" }
    },
    theology: {
      label: "theology",
      words: ["grace", "faith", "prayer", "covenant", "presence", "mercy", "hope", "worship"],
      terms: { point: "prayer", line: "path of faith", segment: "step of faith", circle: "covenant boundary", angle: "conversion", parallel: "walking together", perpendicular: "turning aside", intersection: "meeting", membership: "within the covenant", subset: "promise within a promise", anchor: "from God toward God" }
    },
    math: {
      label: "math",
      words: ["point", "line", "circle", "angle", "set", "intersection", "parallel", "proof"],
      terms: { point: "point", line: "line", segment: "segment", circle: "circle", angle: "angle", parallel: "parallel", perpendicular: "perpendicular", intersection: "intersection", membership: "element of", subset: "subset", anchor: "domain → codomain" }
    },
    custom: { label: "custom", words: [], terms: {} }
  };
  const NONSENSE_NAME = "Nonsense Layer";

  function domainWords(domain) {
    const d = DOMAINS[domain] || DOMAINS.custom;
    return d.words.slice();
  }
  /** Canonical terms, then the field's words, then the person's own overrides. Canonical wins when asked. */
  function termsFor(domain, userMap, canonical) {
    const base = Object.assign({}, CANON);
    if (canonical) return base;
    const d = DOMAINS[domain] || DOMAINS.custom;
    Object.assign(base, d.terms || {});
    if (userMap && typeof userMap === "object") Object.keys(CANON).forEach(k => { if (userMap[k]) base[k] = String(userMap[k]); });
    return base;
  }
  function glossary(domain, userMap, canonical) {
    const t = termsFor(domain, userMap, canonical);
    return "point = " + t.point + "; line = " + t.line + "; segment = " + t.segment + "; circle = " + t.circle
      + "; angle = " + t.angle + "; parallel = " + t.parallel + "; perpendicular = " + t.perpendicular
      + "; intersection = " + t.intersection + "; membership = " + t.membership + "; subset = " + t.subset
      + "; anchors = " + t.anchor;
  }
  /**
   * Plain-language reading. Does not change the model.
   * opts: { domain, userMap, canonical, names[], alignment }
   */
  function explainModel(model, opts) {
    const o = opts || {};
    const before = JSON.stringify(model || {});
    const t = termsFor(o.domain || "custom", o.userMap, !!o.canonical);
    const label = (DOMAINS[o.domain] || DOMAINS.custom).label;
    const lines = [];
    if (o.canonical) lines.push("Canonical terms, the geometry's own words.");
    else lines.push("In " + label + ", a line is a " + t.line + ", a circle is a " + t.circle + ", and an intersection is a " + t.intersection + ".");
    const names = (o.names || []).filter(Boolean);
    if (names.length) lines.push("Your words here: " + names.join(", ") + ".");
    if ((model && model.doubts || []).length) lines.push("Inside a doubt circle, damping is γ + ρ. A larger radius is more resistance. The shapes inside stay.");
    if (o.alignment) lines.push(o.alignment);
    lines.push("The drawing itself is unchanged.");
    if (JSON.stringify(model || {}) !== before) throw new Error("explainModel mutated the model");
    return lines;
  }
  /** Layer 0 is the Nonsense Layer: named, locked, domain nonsense, never an AI layer. */
  function sealLayers(layers) {
    const list = layers || [];
    if (!list.length) list.push({});
    const n = list[0];
    n.role = "nonsense";
    n.name = NONSENSE_NAME;
    n.locked = true;
    n.domain = "nonsense";
    n.ai = false;
    for (let i = 1; i < list.length; i++) {
      const L = list[i];
      if (L.role === "nonsense") delete L.role;
      if (!L.name || L.name === NONSENSE_NAME) L.name = "Layer " + (i + 1);
      if (!L.domain) L.domain = "custom";
    }
    return list;
  }
  /**
   * How a freeform layer sits against the Nonsense Layer.
   * Counts shared direction (parallel) and right angles between their segments.
   */
  function alignToNonsense(nonsense, other) {
    const np = Object.fromEntries(((nonsense && nonsense.points) || []).map(p => [p.name, p]));
    const op = Object.fromEntries(((other && other.points) || []).map(p => [p.name, p]));
    const nd = (nonsense && nonsense.segments || []).map(s => np[s.a] && np[s.b] ? orient(np[s.a], np[s.b]) : null).filter(x => x != null);
    const od = (other && other.segments || []).map(s => op[s.a] && op[s.b] ? orient(op[s.a], op[s.b]) : null).filter(x => x != null);
    let parallel = 0, perpendicular = 0;
    nd.forEach(a => od.forEach(b => {
      const d = Math.min(Math.abs(a - b), Math.PI - Math.abs(a - b)) * 180 / Math.PI;
      if (d < 1.25) parallel++;
      else if (Math.abs(d - 90) < 1.25) perpendicular++;
    }));
    return {
      parallel, perpendicular,
      text: "Aligns to the Nonsense Layer: " + parallel + " parallel, " + perpendicular + " perpendicular."
    };
  }

  /**
   * User-only write of the self on the anchor layer.
   * act.by must be "human". An AI act is refused and does not change the record.
   */
  function establishSelf(record, act) {
    const base = clone(record || { self: null });
    if (!act || act.by !== "human") return { ok: false, record: base, reason: "Only the user can establish the self." };
    const name = act.point && String(act.point.name || "").trim();
    if (!name) return { ok: false, record: base, reason: "Name a self-point." };
    base.self = {
      at: act.at || "",
      point: { name, x: +act.point.x || 0, y: +act.point.y || 0 },
      anchors: (act.anchors || []).filter(a => a && String(a.name || "").trim()).map(a => ({ name: String(a.name).trim(), value: String(a.value || "") }))
    };
    return { ok: true, record: base };
  }
  /**
   * P4 as a model inside the app, not a proof.
   * Blank, or a human who has neither the first nor the last move: AI dominant.
   * Human first or last move: the human holds the environment and the AI only adapts.
   */
  function environmentOf(moves) {
    const list = (moves || []).filter(m => m && (m.by === "human" || m.by === "ai"));
    const honest = "A model of the postulate inside this app, not empirical proof.";
    if (!list.length) {
      return { blank: true, first: null, last: null, holder: "ai", humanShare: 0, aiShare: 1, label: "AI dominant (blank layer). " + honest };
    }
    const first = list[0].by, last = list[list.length - 1].by;
    const humanHolds = first === "human" || last === "human";
    const humanCount = list.filter(m => m.by === "human").length;
    const ratio = humanCount / list.length;
    const humanShare = humanHolds ? +(0.5 + 0.5 * ratio).toFixed(3) : +(ratio * 0.4).toFixed(3);
    const aiShare = +(1 - humanShare).toFixed(3);
    return {
      blank: false, first, last, holder: humanHolds ? "human" : "ai", humanShare, aiShare,
      label: (humanHolds
        ? "Human holds the environment (first or last move). The AI only adapts. "
        : "AI dominant: the human has neither the first nor the last move. ") + honest
    };
  }
  /** Reproducible comparison: blank, AI-only, user first, user last. */
  function demonstrateEnvironment() {
    return {
      blank: environmentOf([]),
      aiMoves: environmentOf([{ by: "ai" }, { by: "ai" }]),
      userFirst: environmentOf([{ by: "human" }, { by: "ai" }]),
      userLast: environmentOf([{ by: "ai" }, { by: "human" }])
    };
  }
  /**
   * Project points and doubt onto the straight line from I to O.
   * Does not change the model. Smaller ρ (smaller circle) adds less cost.
   * Returns the ordered stops, path length, cost, and one-line readouts.
   */
  function collapseToLine(model) {
    const m = model || {};
    const before = JSON.stringify(m);
    const I = m.anchors && m.anchors.i;
    const O = m.anchors && m.anchors.o;
    if (!I || !O) return { ok: false, reason: "Need an input I and an output O.", items: [], length: 0, cost: 0, text: "", math: "", latex: "" };
    const dx = O.x - I.x, dy = O.y - I.y;
    const len = Math.hypot(dx, dy);
    const len2 = len * len || 1;
    const stops = [{ name: "I", t: 0, kind: "anchor" }];
    (m.points || []).forEach(p => {
      if (!p || p.x == null || !p.name || p.name === "I" || p.name === "O") return;
      const t = ((p.x - I.x) * dx + (p.y - I.y) * dy) / len2;
      stops.push({ name: String(p.name), t, kind: "point" });
    });
    stops.push({ name: "O", t: 1, kind: "anchor" });
    stops.sort((a, b) => a.t - b.t || a.name.localeCompare(b.name));
    const doubts = (m.doubts || []).map(d => {
      const t = d.x == null ? 0.5 : ((d.x - I.x) * dx + (d.y - I.y) * dy) / len2;
      const rho = rhoOf(d.rho != null ? d.rho : d.r);
      const span = len > 0 ? rho / len : 0;
      return { name: d.name || "doubt", t, rho, span };
    });
    const segments = [];
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i], b = stops[i + 1];
      const mid = (a.t + b.t) / 2;
      let rho = 0;
      doubts.forEach(d => { if (Math.abs(d.t - mid) <= d.span + 1e-9 || (d.t >= Math.min(a.t, b.t) && d.t <= Math.max(a.t, b.t))) rho = Math.max(rho, d.rho); });
      const dist = Math.abs(b.t - a.t) * len;
      segments.push({ from: a.name, to: b.name, rho, dist, cost: dist * (1 + rho) });
    }
    const length = +len.toFixed(3);
    const cost = +segments.reduce((s, seg) => s + seg.cost, 0).toFixed(3);
    const names = stops.filter(s => s.kind === "point").map(s => s.name);
    const chain = ["I"].concat(names).concat(["O"]).join(" → ");
    const resist = doubts.some(d => d.rho > 0);
    const text = "From I to O: " + (names.length ? names.join(" → ") : "(nothing between)") + (resist ? ", with resistance at doubt" : "") + ". Length " + length + ", cost " + cost + ".";
    const math = chain + "; length=" + length + "; cost=" + cost + (resist ? "; ρ=" + r3(Math.max(...doubts.map(d => d.rho))) : "");
    const latex = chain.replace(/ → /g, " \\to ") + ",\\ \\mathrm{length}=" + length + ",\\ \\mathrm{cost}=" + cost + (resist ? ",\\ \\rho=" + r3(Math.max(...doubts.map(d => d.rho))) : "");
    if (JSON.stringify(m) !== before) throw new Error("collapseToLine mutated the model");
    return { ok: true, items: stops, segments, doubts, length, cost, text, math, latex };
  }

  /**
   * Compare two I→O lines. Parallel and overlapping both count as parallel.
   * Overlap (collinear, offset about 0) is the strongest agreement and still uses ∥, with ≡ as the mark.
   */
  function compareLines(a, b) {
    const ang = (l) => { let t = Math.atan2(l.b.y - l.a.y, l.b.x - l.a.x); t %= Math.PI; return t < 0 ? t + Math.PI : t; };
    const da = ang(a), db = ang(b);
    const angle = +((Math.min(Math.abs(da - db), Math.PI - Math.abs(da - db)) * 180 / Math.PI).toFixed(2));
    const dx = a.b.x - a.a.x, dy = a.b.y - a.a.y, L = Math.hypot(dx, dy) || 1;
    const offset = +((Math.abs((b.a.x - a.a.x) * dy - (b.a.y - a.a.y) * dx) / L).toFixed(4));
    const parallel = angle <= 1.25;
    const overlap = parallel && offset <= 0.02;
    let shared = 0;
    if (parallel) {
      const ux = dx / L, uy = dy / L;
      const ts = (p) => p.x * ux + p.y * uy;
      const span = (l) => [ts(l.a), ts(l.b)].sort((p, q) => p - q);
      const A = span(a), B = span(b);
      shared = +Math.max(0, Math.min(A[1], B[1]) - Math.max(A[0], B[0])).toFixed(3);
    }
    return { parallel, overlap, aligned: parallel, angle, offset, shared, mark: overlap ? "≡" : parallel ? "∥" : "" };
  }
  /** Pair every layer's collapsed I→O line. Overlap is reported as parallel. */
  function compareLayerLines(list) {
    const rows = [];
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const cmp = compareLines(list[i].line, list[j].line);
      const other = list[j].domain && list[j].domain !== "custom" && list[j].domain !== "nonsense" ? list[j].domain + " layer" : list[j].name;
      const ref = list[i].role === "nonsense" || list[i].name === "Nonsense Layer" ? "Nonsense Layer" : list[i].name;
      const english = cmp.parallel
        ? "Your " + other + " runs parallel to the " + ref + (cmp.overlap ? " (they overlap, which still counts as parallel)" : "") + "."
        : "Your " + other + " does not run parallel to the " + ref + ".";
      rows.push(Object.assign({ i: list[i].i != null ? list[i].i : i, j: list[j].i != null ? list[j].i : j, left: list[i].name, right: list[j].name, english }, cmp));
    }
    return rows;
  }

  /** The AI keeps its own structure and says it differs. It does not overwrite or agree. */
  function differsFrom(humanSig, aiSig) {
    if (humanSig == null || aiSig == null || humanSig === aiSig) return null;
    return { note: "Differs from the AI layer. The AI keeps its own layer and does not adopt this as absolute truth.", overwrote: false, agreed: false };
  }

  return {
    clone, History, deleteShape, buildPrompt, parseCommand, STYLES: Object.keys(STYLES),
    emptyModel, mathLine, mathLatex, deriveRelations, applyMath, rhoOf, effectiveGamma,
    CANON, DOMAINS, NONSENSE_NAME, domainWords, termsFor, glossary, explainModel, sealLayers, alignToNonsense,
    establishSelf, environmentOf, demonstrateEnvironment, differsFrom, collapseToLine, compareLines, compareLayerLines
  };
});
