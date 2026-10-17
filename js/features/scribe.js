// features/scribe.js — Toby the Tortoise, the Scribe.
//
// Writes your session down as plain .mf code and reads it back:
//   • serialize: state → mf 2 (numbers and labels only, never your words)
//   • parse: mf 2 exactly (round trip), mf 1 best effort via mapOld, friendly
//     line errors, and crisis wording in a label is refused
//
//   mf 2
//   home calm=v connection=v hope=v
//   e name=v ...              (hard/process when > 0; grounding always)
//   vars key=v ...            (only values that differ from the default)
//   w from>to=v               (one W override)
//   day YYYY-MM-DD name=v ...
//   cp n YYYY-MM-DDTHH:MM label=x name=v ... lambda=v
//   ideal a=v b=v             eq ... (readable, rebuilt on save, ignored on read)
//   # comment

if (typeof module !== "undefined") {
  require("../core/master.js");
}

(function (MF) {
  "use strict";
  const { VERSION, NAMES, GROUND, SPEC, VAR_KEYS, MAX_CHECKPOINTS, MAX_DAYS, MAX_LINES, MAX_W, LABEL_RE, idx, r2, clamp01, fromObj, stamp, defaultState } = MF.Movers;
  const { refreshIdeal } = MF.Master;
  const G = typeof Grounding !== "undefined" ? Grounding : require("../core/grounding.js");
  // ---------- The code language (mf 2) ----------
  const NUM = "-?(?:\\d+(?:\\.\\d*)?|\\.\\d+)";
  const PAIR = new RegExp(`^([a-zA-Z]+)=(${NUM})$`);
  const TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
  const DAY = /^\d{4}-\d{2}-\d{2}$/;
  /** Two-decimal number for the code (no negative zero). */
  const num = x => (Object.is(r2(x), -0) ? 0 : r2(x)).toFixed(2);
  /** A vector as name=value pairs. */
  const vecCode = v => NAMES.map((n, i) => [n, v[i]]).filter(([n, x]) => GROUND.includes(n) || x > 0).map(([n, x]) => `${n}=${num(x)}`).join(" ");
  /** Join the non-empty parts with spaces. */
  const join = parts => parts.filter(Boolean).join(" ");

  /** State → .mf code (mf 2). Numbers and labels only, never words. */
  function serialize(state) {
    const out = [`mf ${VERSION}`];
    out.push(`home ${GROUND.map(n => `${n}=${num(state.home[idx[n]])}`).join(" ")}`);
    out.push(join(["e", vecCode(state.e)]));
    const vs = VAR_KEYS.filter(k => state.vars[k] !== SPEC[k].def);
    if (vs.length) out.push(join(["vars", ...vs.map(k => `${k}=${num(state.vars[k])}`)]));
    state.w.forEach(o => out.push(`w ${o.from}>${o.to}=${num(o.w)}`));
    state.days.forEach(x => out.push(join([`day ${x.day}`, vecCode(x.e)])));
    state.cps.forEach(c => out.push(join([`cp ${c.n} ${c.t} label=${c.label}`, vecCode(c.e), `lambda=${num(c.lambda)}`])));
    if (state.ideal) {
      out.push(`ideal a=${num(state.ideal.a)} b=${num(state.ideal.b)}`);
      out.push(`eq step = act(clip01(e + ${num(state.ideal.a)}*(h - e) + ${num(state.ideal.b)}*s(e)))`);
    }
    return out.join("\n") + "\n";
  }

  // mf 1 -> mf 2, best effort (see the mapping table in the README).
  /** Probabilistic OR of two values in [0, 1]. */
  const or1 = (a, b) => 1 - (1 - a) * (1 - b);
  /** Map an mf 1 emotion object onto the nine movers (best effort; see the README mapping table). */
  function mapOld(o, extra = {}) {
    const g = n => clamp01(Number(o[n]) || 0);
    const v = {};
    v.fear = g("fear");
    v.sadness = g("sadness");
    v.anger = g("anger");
    v.shame = or1(g("shame"), g("guilt"));
    v.calm = g("calm") || g("joy") ? Math.max(g("calm"), 0.5 * g("joy")) : 0.5;
    v.hope = g("hope") || g("joy") ? Math.max(g("hope"), 0.8 * g("joy")) : 0.5;
    const c0 = g("connection") || 0.5;
    v.connection = c0 * (1 - g("loneliness"));
    const gr = Number.isFinite(extra.g) ? clamp01((extra.g - (extra.target ?? 0.3)) / (1 - (extra.target ?? 0.3))) : 0;
    v.rumination = gr;
    v.avoidance = 0;
    const t = extra.t || {};
    if (t.wrath) v.anger = or1(v.anger, 0.5 * t.wrath);
    if (t.envy) { v.anger = or1(v.anger, 0.3 * t.envy); v.shame = or1(v.shame, 0.2 * t.envy); }
    if (t.sloth) { v.sadness = or1(v.sadness, 0.3 * t.sloth); v.avoidance = or1(v.avoidance, 0.4 * t.sloth); }
    if (t.pride) { v.rumination = or1(v.rumination, 0.3 * t.pride); v.anger = or1(v.anger, 0.2 * t.pride); }
    if (t.greed) v.fear = or1(v.fear, 0.2 * t.greed);
    if (t.gluttony || t.lust) v.avoidance = or1(v.avoidance, 0.2 * Math.max(t.gluttony || 0, t.lust || 0));
    if (extra.desolation) { v.sadness = or1(v.sadness, 0.4 * extra.desolation); v.hope = v.hope * (1 - 0.4 * extra.desolation); }
    return NAMES.map(n => r2(clamp01(v[n])));
  }

  /** Read mf 1 code via the mapping. Old variables and frameworks are dropped with a note. */
  function parseOld(raw) {
    const state = defaultState();
    const notes = ["Imported from mf 1 and mapped onto the nine movers (best effort)."];
    let crisis = false;
    const P1 = new RegExp(`^([a-zA-Z.>]+)=(${NUM})$`);
    const pairs = toks => Object.fromEntries(toks.map(t => t.match(P1)).filter(Boolean).map(m => [m[1], Number(m[2])]));
    let e = {}, ego = {}, t = {}, desolation = 0;
    const days = [], cps = [];
    const label = s => { const m = (s || "").match(/^label=(.*)$/); return m && LABEL_RE.test(m[1]) ? m[1] : null; };
    raw.forEach(line0 => {
      const line = line0.replace(/#.*$/, "").trim();
      if (!line) return;
      const [kw, ...rest] = line.split(/\s+/);
      if (kw === "home") {
        const o = pairs(rest);
        GROUND.forEach(n => { if (n in o) state.home[idx[n]] = r2(clamp01(n === "hope" ? Math.max(o.hope, o.joy || 0) : o[n])); });
      } else if (kw === "e") e = pairs(rest);
      else if (kw === "ego") ego = pairs(rest);
      else if (kw === "tendency") t = pairs(rest);
      else if (kw === "ignatian") desolation = Number(pairs(rest.slice(1)).d) || 0;
      else if (kw === "day" && DAY.test(rest[0] || "")) days.push({ day: rest[0], o: pairs(rest.slice(1)) });
      else if (kw === "cp" && TIME.test(rest[1] || "")) {
        const lab = label(rest[2]);
        if ((rest[2] || "").startsWith("label=") && G.isCrisis((rest[2] || "").slice(6).replace(/-/g, " "))) crisis = true;
        if (lab) cps.push({ n: Number(rest[0]), t: rest[1], label: lab, o: pairs(rest.slice(3)) });
      } else if ((kw === "vars" || kw === "framework") && rest.some(x => /^(framework|name)=/.test(x))) {
        const nm = rest.find(x => /^(framework|name)=/.test(x)).split("=")[1];
        if (G.isCrisis(nm.replace(/-/g, " "))) crisis = true;
      }
    });
    if (crisis) return { ok: false, crisis: true, errors: [] };
    const extra = { g: ego.g, target: ego.target, t, desolation };
    state.e = mapOld(e, extra);
    days.forEach(x => { if (!state.days.length || x.day > state.days[state.days.length - 1].day) state.days.push({ day: x.day, e: mapOld(x.o, { g: x.o.g, target: ego.target }) }); });
    cps.forEach(c => { if (Number.isInteger(c.n) && c.n > 0 && (!state.cps.length || c.n > state.cps[state.cps.length - 1].n)) state.cps.push({ n: c.n, t: c.t, label: c.label, e: mapOld(c.o, { g: c.o.g, target: ego.target }), lambda: r2(Number(c.o.lambda) || 0) }); });
    state.days = state.days.slice(-MAX_DAYS);
    state.cps = state.cps.slice(-MAX_CHECKPOINTS);
    notes.push("Old variables, weights and frameworks were left out; the new defaults apply.");
    return { ok: true, state: refreshIdeal(state), notes, from: 1 };
  }

  /**
   * Read .mf code (mf 2 exactly, mf 1 best effort) with friendly line errors.
   * @returns {{ok:true,state:object,from:number,notes?:string[]}|{ok:false,errors:Array,crisis?:boolean}}
   */
  function parse(text) {
    const errors = [];
    const err = (line, msg) => errors.push({ line, msg: `Line ${line}: ${msg}` });
    const raw = String(text || "").replace(/\r\n?/g, "\n").split("\n");
    if (raw.length > MAX_LINES) return { ok: false, errors: [{ line: 0, msg: `That code is too long (more than ${MAX_LINES} lines).` }] };
    const first = raw.findIndex(l => l.replace(/#.*$/, "").trim());
    if (first < 0) return { ok: false, errors: [{ line: 0, msg: "Nothing to import yet. Paste code that starts with \u201Cmf 2\u201D." }] };
    const head = raw[first].replace(/#.*$/, "").trim().split(/\s+/);
    if (head[0] !== "mf") return { ok: false, errors: [{ line: first + 1, msg: `Line ${first + 1}: the code should start with \u201Cmf 2\u201D.` }] };
    if (head[1] === "1") return parseOld(raw.slice(first + 1));
    if (head[1] !== String(VERSION)) return { ok: false, errors: [{ line: first + 1, msg: `Line ${first + 1}: this is version ${head[1] || "?"}; this app reads versions 1 and 2.` }] };
    const state = defaultState();
    let crisis = false, sawHome = false;
    const readVec = (toks, line, extra = {}) => {
      const o = {}, ex = {};
      toks.forEach(tok => {
        const m = tok.match(PAIR);
        if (!m) { err(line, `\u201C${tok}\u201D should look like name=0.50.`); return; }
        const k = m[1], x = Number(m[2]);
        if (k in extra) { ex[k] = x; return; }
        if (!(k in idx)) { err(line, `\u201C${k}\u201D isn't one of the nine movers (${NAMES.join(", ")}).`); return; }
        if (k in o) { err(line, `${k} appears twice.`); return; }
        if (x < 0 || x > 1) { err(line, `${k}=${m[2]} must be between 0 and 1.`); return; }
        o[k] = x;
      });
      return { vec: fromObj(o, NAMES.map(n => (GROUND.includes(n) ? 0.5 : 0))), ex };
    };
    raw.slice(first + 1).forEach((rawLine, k) => {
      const n = first + k + 2;
      const line = rawLine.replace(/#.*$/, "").trim();
      if (!line) return;
      const [kw, ...rest] = line.split(/\s+/);
      switch (kw) {
        case "home": {
          if (sawHome) { err(n, "home appears twice."); break; }
          sawHome = true;
          rest.forEach(tok => {
            const m = tok.match(PAIR);
            if (!m || !GROUND.includes(m[1]) || Number(m[2]) < 0 || Number(m[2]) > 1) { err(n, "home looks like home calm=0.80 connection=0.80 hope=0.80."); return; }
            state.home[idx[m[1]]] = r2(Number(m[2]));
          });
          break;
        }
        case "e": state.e = readVec(rest, n).vec; break;
        case "vars": {
          rest.forEach(tok => {
            const m = tok.match(PAIR);
            if (!m || !VAR_KEYS.includes(m[1])) { err(n, `\u201C${tok}\u201D isn't a variable (${VAR_KEYS.join(", ")}).`); return; }
            const x = Number(m[2]), sp = SPEC[m[1]];
            if (!(x >= sp.min && x <= sp.max)) { err(n, `${m[1]} must be from ${sp.min} to ${sp.max}.`); return; }
            state.vars[m[1]] = r2(x);
          });
          break;
        }
        case "w": {
          const m = rest.length === 1 && rest[0].match(new RegExp(`^([a-z]+)>([a-z]+)=(${NUM})$`));
          if (!m) { err(n, "a weight looks like w sadness>rumination=0.40."); break; }
          const [, from, to, v] = m, x = Number(v);
          if (!(from in idx) || !(to in idx) || from === to) { err(n, "a weight joins two different movers."); break; }
          if (x < -1 || x > 1) { err(n, "a weight must be between -1 and 1."); break; }
          if (state.w.length >= MAX_W) { err(n, `at most ${MAX_W} weights.`); break; }
          state.w = state.w.filter(o => !(o.from === from && o.to === to)).concat({ from, to, w: r2(x) });
          break;
        }
        case "day": {
          const [dk, ...vals] = rest;
          if (!DAY.test(dk || "")) { err(n, "a day looks like day 2026-10-17 sadness=0.50."); break; }
          if (state.days.length && dk <= state.days[state.days.length - 1].day) { err(n, "days should go forward in time."); break; }
          if (state.days.length >= MAX_DAYS) { err(n, `at most ${MAX_DAYS} days.`); break; }
          state.days.push({ day: dk, e: readVec(vals, n).vec });
          break;
        }
        case "cp": {
          const [nn, t, lab, ...vals] = rest;
          const k2 = Number(nn);
          if (!Number.isInteger(k2) || k2 < 1) { err(n, "a checkpoint starts with its number, like cp 1."); break; }
          if (state.cps.length && k2 <= state.cps[state.cps.length - 1].n) { err(n, "checkpoint numbers should go up."); break; }
          if (!TIME.test(t || "")) { err(n, "the time should look like 2026-10-17T13:50."); break; }
          const lm = (lab || "").match(/^label=(.*)$/);
          if (!lm || !LABEL_RE.test(lm[1])) { err(n, "the label should look like label=start (a-z, 0-9, dashes)."); break; }
          if (G.isCrisis(lm[1].replace(/-/g, " "))) { crisis = true; break; }
          if (state.cps.length >= MAX_CHECKPOINTS) { err(n, `at most ${MAX_CHECKPOINTS} checkpoints.`); break; }
          const { vec, ex } = readVec(vals, n, { lambda: true });
          state.cps.push({ n: k2, t, label: lm[1], e: vec, lambda: r2(Number.isFinite(ex.lambda) ? ex.lambda : 0) });
          break;
        }
        case "ideal": {
          const m = line.match(new RegExp(`^ideal a=(${NUM}) b=(${NUM})$`));
          if (!m || ![m[1], m[2]].every(x => Number(x) >= 0 && Number(x) <= 1)) { err(n, "ideal looks like ideal a=0.10 b=0.15 (each 0 to 1)."); break; }
          state.ideal = { a: r2(Number(m[1])), b: r2(Number(m[2])) };
          break;
        }
        case "eq": break;
        case "mf": err(n, "the header appears twice."); break;
        default: err(n, `\u201C${kw}\u201D isn't a keyword (mf, home, e, vars, w, day, cp, ideal, eq).`);
      }
    });
    if (crisis) return { ok: false, crisis: true, errors: [] };
    return errors.length ? { ok: false, errors } : { ok: true, state, from: 2 };
  }


  // ---------- Panel (browser only) ----------
  /**
   * Mount the Scribe panel: the current code, Copy, Download, Import (paste or
   * file), and Start over.
   * @param {object} app the app shell (see js/app.js)
   * @returns {function} render
   */
  /** Mount this feature's panel. */
  function mount(app) {
    const { $, li } = app;
    const errors = list => { const ul = $("import-errors"); ul.innerHTML = ""; list.forEach(x => ul.appendChild(li(x))); };
    $("copy-code").addEventListener("click", () => app.copy($("code").textContent));
    $("download").addEventListener("click", () => {
      const blob = new Blob([$("code").textContent], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `mindframe-${stamp(Date.now()).slice(0, 10)}.mf.txt`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
    });
    $("import-file").addEventListener("change", e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (file.size > 64 * 1024) { errors(["That file is too big for .mf code (over 64 KB)."]); return; }
      const r = new FileReader();
      r.onload = () => { $("import-text").value = String(r.result || ""); };
      r.readAsText(file);
    });
    $("import-go").addEventListener("click", () => {
      const p = parse($("import-text").value);
      if (p.crisis) { app.crisis(true); return; }
      if (!p.ok) { errors(p.errors.slice(0, 8).map(x => x.msg)); return; }
      app.state = p.state;
      app.resetBase("");
      $("import-text").value = "";
      errors([]);
      app.update();
      app.note(p.from === 1 ? p.notes.join(" ") : "Restored from code. New words add to it.");
    });
    $("clear").addEventListener("click", () => {
      if (!confirm("Start over? This clears the numbers and checkpoints on this device (not your journal).")) return;
      app.startOver();
    });
    return function render() { $("code").textContent = serialize(MF.Master.refreshIdeal(app.state)); };
  }

  MF.Scribe = { serialize, parse, mapOld, mount };
})(typeof window !== "undefined" ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
if (typeof module !== "undefined") module.exports = global.MF.Scribe;
