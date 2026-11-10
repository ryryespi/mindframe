// ariel/shell.js — drafting shell around the geometry engine.
// Ribbon, layers, command line, undo, math line, Nonsense Layer, domain language.
// The engine stays the source of truth. This file only labels, explains, and edits through it.
"use strict";
(function () {
  const CAD = window.ArielCAD;
  if (!CAD) return;
  const Hist = CAD.History(80);
  const log = [];
  let ortho = false;
  let sel = null;
  let gesture = null;

  const style = document.createElement("style");
  style.textContent = `
    body.cad{background:#f4f1ec}
    #ribbon{position:fixed;z-index:8;left:0;right:0;top:0;height:52px;display:flex;gap:8px;align-items:flex-end;padding:2px 6px 4px;background:#f7f4ef;border-bottom:1px solid #e4dfd6;overflow-x:auto}
    #ribbon .g{display:flex;gap:2px;align-items:flex-end;padding-bottom:1px}
    #ribbon .g span{position:absolute;top:2px;font:10px system-ui;letter-spacing:.04em;color:#8a93a0}
    #ribbon .g{position:relative;padding-top:14px}
    #ribbon button,#cmdrow button,#xport button,#dock-tools button,#help button{min-width:40px;min-height:32px;border:0;border-radius:8px;background:transparent;color:#5b6472;font:12px system-ui;padding:0 8px;cursor:pointer}
    #ribbon button.on,#ribbon button:active{background:#e6e1d8}
    #ribbon button.primary{background:#5b6472;color:#f7f4ef;font-weight:600}
    #cmp{position:fixed;z-index:7;right:8px;top:60px;width:240px;max-height:46vh;overflow:auto;background:#fffc;border-radius:12px;padding:8px;display:none;box-shadow:0 2px 12px #0001;font:12px/1.35 system-ui;color:#5b6472}
    #cmp.on{display:block}
    #signal{position:fixed;z-index:7;left:184px;bottom:64px;width:min(420px,calc(100vw - 200px));max-height:42vh;overflow:auto;background:#fffc;border-radius:12px;padding:8px 10px;display:none;box-shadow:0 2px 12px #0001;font:12px/1.35 system-ui;color:#5b6472}
    #signal.on{display:block}
    #signal label{display:flex;align-items:center;gap:6px;margin:2px 0}
    #signal input[type=range]{flex:1}
    #signal button{min-height:28px;border:0;border-radius:8px;background:#e6e1d8;color:#5b6472;padding:0 8px}
    #sig-eq{font:11px ui-monospace,monospace;margin:4px 0}
    #sig-plot{width:100%;height:36px;display:block;background:#f4f1ec;border-radius:6px}
    body.cad #bar{position:fixed;left:0;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none}
    body.cad #bWords{position:fixed;z-index:9;left:12px;bottom:46px;width:auto;min-width:44px;height:36px;opacity:1;pointer-events:auto;display:inline-flex;align-items:center;gap:6px;padding:0 12px;border-radius:999px;background:#fffc;color:#5b6472;box-shadow:0 2px 12px #0001;font:13px system-ui,sans-serif}
    body.cad #bWords svg{width:18px;height:18px;stroke:#5b6472;fill:none;stroke-width:2;flex:none}
    body.cad #bWords.on{background:#e6e1d8}
    body.cad #layers{position:fixed;z-index:6;left:8px;top:60px;bottom:70px;width:168px;transform:none;max-height:none;display:none;flex-direction:column;align-items:stretch;gap:6px;background:#fffc;border-radius:12px;box-shadow:0 2px 12px #0001;padding:8px;overflow:auto}
    body.cad.dock-open #layers{display:flex}
    body.cad #layers > div:not(#layer-meta){width:16px;height:16px}
    body.cad #layers span{width:28px!important;height:28px!important;display:inline-grid;place-items:center}
    #layer-meta{font:12px/1.35 system-ui;color:#5b6472}
    #layer-meta input,#layer-meta select{width:100%;font:12px system-ui;color:#5b6472;border:1px solid #e4dfd6;border-radius:8px;padding:4px 6px;background:#fff;margin-top:4px}
    #status{position:fixed;z-index:8;left:0;right:0;bottom:34px;height:22px;display:flex;gap:10px;align-items:center;padding:0 8px;background:#f7f4ef;border-top:1px solid #e4dfd6;font:11px ui-monospace,monospace;color:#5b6472;overflow:hidden;white-space:nowrap}
    #cmdrow{position:fixed;z-index:8;left:0;right:0;bottom:0;height:34px;display:flex;background:#fff;border-top:1px solid #e4dfd6}
    #cmd{flex:1;border:0;outline:0;font:13px ui-monospace,monospace;color:#5b6472;padding:0 8px;background:transparent;min-width:0}
    #echo{flex:1.2;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font:11px ui-monospace,monospace;color:#8a93a0;padding:9px 8px 0}
    #gloss{position:fixed;z-index:5;left:8px;right:8px;bottom:64px;display:none;font:12px/1.4 system-ui;color:#5b6472;background:#fffc;border-radius:10px;padding:6px 8px;box-shadow:0 1px 8px #0001}
    body.cad #tp{bottom:78px}
    body.cad #lex{top:60px}
    body.cad:not(.adv) #lex,body.cad:not(.adv) #dial,body.cad:not(.adv) #side{display:none!important}
    body.cad.embed:not(.more-tools) #ribbon .g:nth-child(n+4),
    body.cad.embed:not(.more-tools) #status,
    body.cad.embed:not(.more-tools) #cmdrow,
    body.cad.embed:not(.more-tools) a.paper-dl{display:none!important}
    #xport,#help{z-index:9}
    #xport{position:fixed;inset:56px 10px 70px;background:#f4f1ecf7;display:none;padding:12px;border-radius:14px;overflow:auto}
    #xport.on{display:block}
    .env-meter{height:8px;background:#e6e1d8;border-radius:4px;margin:6px 0}
    .env-meter i{display:block;height:8px;background:#7a9cc6;border-radius:4px}
    #demo{position:fixed;z-index:9;left:12px;right:12px;top:60px;max-width:420px;background:#f7f4ef;border-radius:12px;padding:12px;display:none;box-shadow:0 2px 14px #0002;font:13px/1.4 system-ui;color:#5b6472}
    #demo.on{display:block}
    a.paper-dl{align-self:center;margin-left:auto;font:12px system-ui;color:#5b6472;white-space:nowrap}
    body.cad #layer-meta, body.cad #layer-meta div, body.cad #layer-meta p{width:auto!important;height:auto!important;border:0!important;opacity:1!important;transform:none!important;border-radius:0!important}
    #xport textarea{width:100%;height:46vh;font:12px/1.45 ui-monospace,monospace;border:1px solid #e4dfd6;border-radius:10px;padding:8px;color:#5b6472}
    #help{font-size:14px}
    #help h2{font:600 16px system-ui;margin:12px 0 4px}
    #help p,#help li{margin:0 0 6px}
    @media(max-width:700px){
      #ribbon button{min-width:44px;min-height:36px}
      body.cad #layers{width:min(78vw,240px)}
    }`;
  document.head.appendChild(style);
  if (/[?&]embed=1/.test(location.search)) document.body.classList.add("embed");
  if (/[?&]full=1/.test(location.search)) document.body.classList.add("more-tools");

  const ribbon = document.createElement("header");
  ribbon.id = "ribbon";
  const groups = [
    ["Draw", [["point", "Point"], ["line", "Line"], ["freehand", "Freehand"], ["circle", "Circle"], ["doubt", "Doubt"]]],
    ["Modify", [["move", "Move"], ["select", "Select"], ["erase", "Delete"], ["undo", "Undo"], ["redo", "Redo"]]],
    ["Purpose", [["collapse", "Collapse"]]],
    ["Anchors", [["snap", "Snap"], ["ortho", "Ortho"], ["view", "Side"]]],
    ["AI", [["ai", "Pause"], ["merge", "Merge"], ["clarify", "Clarify"]]],
    ["More", [["layers", "Layers"], ["text", "Text"], ["signal", "Signal"], ["adv", "Advanced"], ["export", "Export"], ["canon", "Terms"], ["help", "?"]]]
  ];
  groups.forEach(([name, buttons]) => {
    const g = document.createElement("div");
    g.className = "g";
    const lab = document.createElement("span");
    lab.textContent = name;
    g.appendChild(lab);
    buttons.forEach(([id, label]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.cad = id;
      b.textContent = label;
      b.onclick = () => runCad(id);
      g.appendChild(b);
    });
    ribbon.appendChild(g);
  });
  const paperLink = document.createElement("a");
  paperLink.className = "paper-dl";
  paperLink.href = "Project-Ariel-Paper.pdf";
  paperLink.textContent = "Download the paper (PDF)";
  ribbon.appendChild(paperLink);
  document.body.appendChild(ribbon);
  const wordsBtn = document.getElementById("bWords");
  if (wordsBtn) document.body.appendChild(wordsBtn);

  const status = document.createElement("div");
  status.id = "status";
  const cmdrow = document.createElement("div");
  cmdrow.id = "cmdrow";
  const cmd = document.createElement("input");
  cmd.id = "cmd";
  cmd.setAttribute("autocomplete", "off");
  cmd.setAttribute("aria-label", "Command line");
  cmd.placeholder = "LINE, ERASE, UNDO, MATH …";
  const echo = document.createElement("div");
  echo.id = "echo";
  cmdrow.appendChild(cmd);
  cmdrow.appendChild(echo);
  const demo = document.createElement("div");
  demo.id = "demo";
  document.body.appendChild(demo);
  document.body.appendChild(status);
  document.body.appendChild(cmdrow);
  const gloss = document.createElement("div");
  gloss.id = "gloss";
  document.body.appendChild(gloss);
  const cmp = document.createElement("div");
  cmp.id = "cmp";
  document.body.appendChild(cmp);

  const xport = document.createElement("div");
  xport.id = "xport";
  xport.innerHTML = '<p><strong>Export a prompt</strong> from this drawing. Nothing is sent.</p>'
    + '<select id="xstyle"><option value="explain">Explain my thinking</option><option value="match">Find a matching idea</option><option value="ground">Ground this in reality</option></select>'
    + '<textarea id="xtext" readonly></textarea><div>'
    + '<button type="button" id="xcopy">Copy</button> <button type="button" id="xdl">Download .md</button> '
    + '<button type="button" id="xtex">Copy LaTeX</button> <button type="button" id="xclose">Close</button></div>';
  document.body.appendChild(xport);

  if (typeof dial !== "undefined") dial.id = "dial";
  const help = document.getElementById("help");
  help.innerHTML = "";
  help.onclick = null;

  function canonOn() { return localStorage.getItem("ariel-canon") === "1"; }
  function userTerms(domain) {
    try { return (JSON.parse(localStorage.getItem("ariel-terms") || "{}"))[domain] || {}; }
    catch (e) { return {}; }
  }
  function saveUserTerm(domain, key, value) {
    const all = JSON.parse(localStorage.getItem("ariel-terms") || "{}");
    all[domain] = all[domain] || {};
    if (value) all[domain][key] = value; else delete all[domain][key];
    localStorage.setItem("ariel-terms", JSON.stringify(all));
  }
  let collapsed = false;
  let collapseRead = "";
  function note(msg) { echo.textContent = msg; }

  function snap() {
    return {
      layers: JSON.parse(JSON.stringify(layers)),
      active, VARS: JSON.parse(JSON.stringify(VARS)),
      M: P.M, dRate: P.dRate, gamma: P.gamma, snap: P.snap, ortho, collapsed
    };
  }
  function restore(s) {
    layers.length = 0;
    s.layers.forEach(L => layers.push(L));
    CAD.sealLayers(layers);
    active = Math.min(s.active, layers.length - 1);
    Object.keys(VARS).forEach(k => delete VARS[k]);
    Object.assign(VARS, s.VARS);
    P.M = s.M; P.dRate = s.dRate; P.gamma = s.gamma; P.snap = s.snap; ortho = !!s.ortho;
    collapsed = !!s.collapsed; showCollapse();
    if (typeof vel !== "undefined") vel.clear();
    prevSnap = []; ghosts = []; varGhosts = [];
    saveVars(); renderLayers();
  }
  function checkpoint(label) {
    // filled by callers that pass before/after via Hist directly
  }

  function layerModel(L) {
    const sy = symbolsOf(L), m = CAD.emptyModel();
    const nm = v => (VARS[v.id] && VARS[v.id].name) || v.sym;
    sy.dots.filter(d => d.kind === "P").forEach(d => m.points.push({ name: nm(d), x: d.p.x / W, y: d.p.y / H_, id: d.id }));
    L.lines.forEach(l => {
      const nearP = (pt, q) => Math.hypot(pt.x - q.x, pt.y - q.y) < 14;
      const a = sy.dots.find(d => d.kind === "P" && nearP(d.p, l.a));
      const b = sy.dots.find(d => d.kind === "P" && nearP(d.p, l.b));
      if (a && b && nm(a) !== nm(b)) m.segments.push({ a: nm(a), b: nm(b) });
    });
    sy.circles.forEach(c => {
      const item = { name: nm(c), x: c.c.c.x / W, y: c.c.c.y / H_, r: c.c.r / S(), id: c.id };
      if (c.c.doubt) { item.rho = CAD.rhoOf(item.r); m.doubts.push(item); }
      else m.circles.push(item);
    });
    const io = ioOf(L, layers.indexOf(L));
    m.anchors = { i: { x: io.i.x / W, y: io.i.y / H_ }, o: { x: io.o.x / W, y: io.o.y / H_ } };
    [...sy.dots, ...sy.circles].forEach(v => {
      const d = VARS[v.id]; if (!d) return;
      const range = String(d.value || "").match(/^\[\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\]$/);
      if (range) m.ranges.push({ name: d.name || nm(v), lo: +range[1], hi: +range[2] });
      else if (d.value) m.vars.push({ name: d.name || nm(v), value: d.value });
    });
    return m;
  }
  function dotByName(L, name) {
    const sy = symbolsOf(L);
    return sy.dots.find(d => d.kind === "P" && ((VARS[d.id] && VARS[d.id].name) === name || d.sym === name));
  }
  window.mathLineOf = function (L) {
    return CAD.mathLine(CAD.deriveRelations(layerModel(L)));
  };
  window.showGloss = function (L) {
    const domain = (L && L.domain) || "custom";
    const g = CAD.glossary(domain, userTerms(domain), canonOn());
    let extra = "";
    if (L && L.role !== "nonsense" && layers[0]) {
      const al = CAD.alignToNonsense(CAD.deriveRelations(layerModel(layers[0])), CAD.deriveRelations(layerModel(L)));
      const t = CAD.termsFor(domain, userTerms(domain), canonOn());
      extra = " Against the Nonsense Layer: " + al.parallel + " " + t.parallel + ", " + al.perpendicular + " " + t.perpendicular + ".";
    } else if (L && L.role === "nonsense") extra = " Nonsense Layer: locked origin (I/O, patience, momentum, entropy).";
    const aiL = layers.find(x => x.ai && x !== L);
    if (L && aiL) {
      const diff = CAD.differsFrom(mathLineOf(L), mathLineOf(aiL));
      if (diff) extra += " " + diff.note;
    }
    gloss.textContent = g + extra;
    gloss.style.display = (tp.classList.contains("on") && (tab === "m" || tab === "h")) ? "block" : "none";
  };
  function domainEnglish(L) {
    const m = layerModel(L);
    const sy = symbolsOf(L);
    const names = [...sy.dots, ...sy.circles].map(v => VARS[v.id] && VARS[v.id].name).filter(Boolean);
    (L.ins || []).forEach(w => names.push(w));
    let alignment;
    if (L.role === "nonsense") alignment = "This is the Nonsense Layer, the locked origin every other field is read against.";
    else {
      const al = CAD.alignToNonsense(CAD.deriveRelations(layerModel(layers[0])), CAD.deriveRelations(m));
      const t = CAD.termsFor(L.domain, userTerms(L.domain), canonOn());
      alignment = "Against the Nonsense Layer: " + al.parallel + " " + t.parallel + ", " + al.perpendicular + " " + t.perpendicular + ".";
    }
    return CAD.explainModel(m, { domain: L.domain || "custom", userMap: userTerms(L.domain), canonical: canonOn(), names, alignment }).join("\n");
  }

  const setTabCore = setTab;
  setTab = function (k) {
    setTabCore(k);
    const L = layers[active];
    if (k === "h" && !canonOn()) tpa.value = domainEnglish(L);
    if (k === "m") tpa.value = mathLineOf(L);
    showGloss(L);
  };

  window.applyMathFromLine = function (text) {
    const L = layers[active];
    if (!L || L.locked) { note("That layer is locked"); return false; }
    const before = snap();
    const res = CAD.applyMath(layerModel(L), text);
    if (!res.ok) { note("Could not read that math line"); return false; }
    const m = res.model;
    m.points.forEach(p => {
      const d = dotByName(L, p.name);
      if (d) { d.p.x = p.x * W; d.p.y = p.y * H_; }
      else {
        const nd = { x: p.x * W, y: p.y * H_, id: "d" + uid() };
        L.dots.push(nd);
        if (p.name.length > 1) VARS[nd.id] = { name: p.name, value: "" };
      }
    });
    m.segments.forEach(s => {
      const A = dotByName(L, s.a), B = dotByName(L, s.b);
      if (!A || !B) return;
      const hit = L.lines.some(l => (Math.hypot(l.a.x - A.p.x, l.a.y - A.p.y) < 16 && Math.hypot(l.b.x - B.p.x, l.b.y - B.p.y) < 16)
        || (Math.hypot(l.a.x - B.p.x, l.a.y - B.p.y) < 16 && Math.hypot(l.b.x - A.p.x, l.b.y - A.p.y) < 16));
      if (!hit) L.lines.push({ a: { x: A.p.x, y: A.p.y }, b: { x: B.p.x, y: B.p.y } });
    });
    m.circles.forEach(c => {
      if (c.x == null) return;
      const sy = symbolsOf(L);
      const ex = sy.circles.find(v => v.sym === c.name || (VARS[v.id] && VARS[v.id].name) === c.name);
      if (ex) { ex.c.c.x = c.x * W; ex.c.c.y = c.y * H_; ex.c.r = Math.max(8, c.r * S()); }
      else L.circles.push({ c: { x: c.x * W, y: c.y * H_ }, r: Math.max(8, c.r * S()), id: "c" + uid() });
    });
    (m.doubts || []).forEach(c => {
      if (c.x == null) return;
      const sy = symbolsOf(L);
      const ex = sy.circles.find(v => v.c.doubt && (v.sym === c.name || (VARS[v.id] && VARS[v.id].name) === c.name));
      const rho = CAD.rhoOf(c.rho != null ? c.rho : c.r);
      if (ex) { ex.c.c.x = c.x * W; ex.c.c.y = c.y * H_; ex.c.r = Math.max(8, rho * S()); ex.c.doubt = true; }
      else L.circles.push({ c: { x: c.x * W, y: c.y * H_ }, r: Math.max(8, rho * S()), doubt: true, id: "c" + uid() });
    });
    m.vars.forEach(v => { const d = dotByName(L, v.name); if (d) VARS[d.id] = { name: v.name, value: v.value }; });
    m.ranges.forEach(r => { const d = dotByName(L, r.name); if (d) VARS[d.id] = { name: r.name, value: "[" + r.lo + ", " + r.hi + "]" }; });
    saveVars();
    Hist.push(before, snap(), "MATH");
    log.push("MATH " + text);
    say("MATH", L.ai ? "A" : "H");
    note(mathLineOf(L));
    return true;
  };

  function cadPick(h) {
    ensureIds(layers[active]);
    const k = h.k;
    sel = { kind: k.c ? "circle" : k.a ? "line" : "dot", id: k.id, layer: active };
  }
  function cadErase() {
    const L = layers[active];
    if (!L || L.locked) { note("That layer is locked"); return; }
    if (!sel || sel.layer !== active) { note("Select a shape, then Delete"); return; }
    const before = snap();
    const ok = CAD.deleteShape(L, sel);
    if (!ok) { note("Nothing selected"); return; }
    Hist.push(before, snap(), "ERASE");
    log.push("ERASE");
    say("ERASE", "H");
    sel = null;
    note("Erased");
  }
  function doUndo() {
    const s = Hist.undo();
    if (!s) { note("Nothing to undo"); return; }
    restore(s); log.push("UNDO"); note("Undo");
  }
  function doRedo() {
    const s = Hist.redo();
    if (!s) { note("Nothing to redo"); return; }
    restore(s); log.push("REDO"); note("Redo");
  }

  const barBtn = id => document.getElementById(id);
  function clickTool(name) {
    const b = document.querySelector('#bar [data-tool="' + name + '"]');
    if (b) b.click();
    tool = name;
    mark();
  }
  function barNearHelp(offset) {
    const helpB = barBtn("bHelp");
    let el = helpB;
    for (let i = 0; i < offset && el; i++) el = el.previousElementSibling;
    return el;
  }
  function layerAxes() {
    return layers.map((L, i) => {
      if (L.vis === 2) return null;
      const io = ioOf(L, i);
      return { name: L.name || ("Layer " + (i + 1)), domain: L.domain || "custom", role: L.role || "", i, line: { a: { x: io.i.x / W, y: io.i.y / H_ }, b: { x: io.o.x / W, y: io.o.y / H_ } } };
    }).filter(Boolean);
  }
  function gatherMap() {
    const m = CAD.emptyModel();
    const axis = layerAxes()[0];
    if (!axis) return null;
    m.anchors = { i: axis.line.a, o: axis.line.b };
    layers.forEach(L => {
      if (L.vis === 2) return;
      const part = layerModel(L);
      part.points.forEach(p => { if (!m.points.some(q => q.name === p.name)) m.points.push(p); });
      (part.doubts || []).forEach(d => m.doubts.push(d));
    });
    return m;
  }
  function showCollapse() {
    const btn = document.querySelector('#ribbon button[data-cad="collapse"]');
    if (btn) { btn.textContent = collapsed ? "Expand" : "Collapse"; btn.classList.toggle("primary", true); }
    if (!collapsed) { cmp.classList.remove("on"); collapseRead = ""; return null; }
    const map = gatherMap();
    const line = map ? CAD.collapseToLine(map) : null;
    const rows = CAD.compareLayerLines(layerAxes());
    cmp.innerHTML = "";
    const title = document.createElement("p");
    title.innerHTML = "<strong>Collapsed I → O</strong>";
    cmp.appendChild(title);
    if (line && line.ok) {
      const p = document.createElement("p");
      p.textContent = line.text;
      cmp.appendChild(p);
      note(line.math);
    }
    rows.forEach(r => {
      const p = document.createElement("p");
      p.textContent = r.left + " " + (r.mark || "∠") + " " + r.right + " · angle " + r.angle + "° · offset " + r.offset + " · shared " + r.shared + ". " + r.english;
      cmp.appendChild(p);
    });
    cmp.classList.add("on");
    collapseRead = (line && line.ok) ? line.text : "";
    return line;
  }
  function toggleCollapse() {
    const before = snap();
    collapsed = !collapsed;
    const after = snap();
    Hist.push(before, after, collapsed ? "COLLAPSE" : "EXPAND");
    log.push(collapsed ? "COLLAPSE" : "EXPAND");
    const line = showCollapse();
    if (!collapsed) note("Expanded. The map is back.");
    else if (line && line.ok) note(line.text);
  }
  function runCad(id) {
    if (id === "point" || id === "line" || id === "circle" || id === "doubt" || id === "freehand") { clickTool(id === "point" ? "dot" : id); note(id === "doubt" ? "DOUBT ρ" : id.toUpperCase()); return; }
    if (id === "move" || id === "select") { tool = id; mark(); note(id.toUpperCase()); return; }
    if (id === "erase") { cadErase(); return; }
    if (id === "undo") { doUndo(); return; }
    if (id === "redo") { doRedo(); return; }
    if (id === "snap") { const b = barNearHelp(4); if (b) b.click(); note("SNAP " + (P.snap ? "on" : "off")); return; }
    if (id === "ortho") { ortho = !ortho; note("ORTHO " + (ortho ? "on" : "off")); return; }
    if (id === "view") { barBtn("bView").click(); return; }
    if (id === "ai") { barBtn("bAI").click(); note(aiOn ? "AI on" : "AI paused"); return; }
    if (id === "merge") { const b = snap(); const n = synthesize(); if (n) Hist.push(b, snap(), "MERGE"); log.push("MERGE"); note("Merged into a new AI layer"); return; }
    if (id === "clarify") { clarify(); note("Clarify suggests; nothing changes until you accept"); return; }
    if (id === "layers") { document.body.classList.toggle("dock-open"); return; }
    if (id === "text") { const b = barNearHelp(3); if (b) b.click(); return; }
    if (id === "adv") { document.body.classList.toggle("adv"); note(document.body.classList.contains("adv") ? "Advanced on" : "Advanced hidden"); return; }
    if (id === "export") { openExport(); return; }
    if (id === "canon") { localStorage.setItem("ariel-canon", canonOn() ? "0" : "1"); note(canonOn() ? "Canonical terms" : "Field terms"); if (tp.classList.contains("on")) setTab(tab); return; }
    if (id === "collapse") { toggleCollapse(); return; }
    if (id === "signal") { if (typeof toggleSignal === "function") toggleSignal(); return; }
    if (id === "help") { fillHelp(); help.classList.add("on"); return; }
  }
  function mark() {
    document.querySelectorAll("#ribbon button").forEach(b => b.classList.toggle("on", b.dataset.cad === tool || (tool === "dot" && b.dataset.cad === "point")));
  }

  addEventListener("pointerdown", e => {
    if (e.target !== cv) return;
    gesture = snap();
    if (layers[active] && layers[active].locked) { e.stopImmediatePropagation(); note("The Nonsense Layer is locked"); gesture = null; return; }
    if (tool === "select" || tool === "erase") {
      e.stopImmediatePropagation();
      const h = hit({ x: e.clientX, y: e.clientY });
      if (h) cadPick(h); else sel = null;
      if (tool === "erase" && h) cadErase();
    }
  }, true);
  addEventListener("pointerup", () => {
    if (!gesture) return;
    const before = gesture; gesture = null;
    const after = snap();
    if (Hist.push(before, after, "draw")) {
      const L = layers[active];
      if (L && !L.locked) { L.moves = L.moves || []; L.moves.push({ by: L.ai ? "ai" : "human" }); }
      log.push("DRAW");
      renderLayers();
    }
  });
  addEventListener("pointermove", e => {
    if (!ortho || !drag || drag.part !== "b" || !drag.k || !drag.k.a) return;
    const l = drag.k, dx = l.b.x - l.a.x, dy = l.b.y - l.a.y;
    if (Math.abs(dx) >= Math.abs(dy)) l.b.y = l.a.y; else l.b.x = l.a.x;
  });
  addEventListener("keydown", e => {
    const typing = document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA") && document.activeElement !== cmd;
    if (typing) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); doUndo(); }
    else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) { e.preventDefault(); doRedo(); }
    else if ((e.key === "Delete" || e.key === "Backspace") && document.activeElement !== cmd) { e.preventDefault(); cadErase(); }
  });
  cmd.addEventListener("keydown", e => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const raw = cmd.value;
    cmd.value = "";
    runCommand(raw);
  });

  function runCommand(raw) {
    const parsed = CAD.parseCommand(raw);
    if (!parsed) return;
    if (parsed.cmd === "UNKNOWN") {
      if (applyMathFromLine(raw)) log.push(raw);
      return;
    }
    const c = parsed.cmd;
    if (c === "POINT") runCad("point");
    else if (c === "LINE") runCad("line");
    else if (c === "CIRCLE") runCad("circle");
    else if (c === "MOVE") runCad("move");
    else if (c === "SELECT") runCad("select");
    else if (c === "ERASE") cadErase();
    else if (c === "UNDO") doUndo();
    else if (c === "REDO") doRedo();
    else if (c === "LAYER") {
      const n = parseInt(parsed.args[0], 10);
      if (n >= 1 && n <= layers.length) { active = n - 1; renderLayers(); note("Layer " + n + " " + layers[active].name); }
    } else if (c === "SNAP") runCad("snap");
    else if (c === "ORTHO") runCad("ortho");
    else if (c === "MERGE") runCad("merge");
    else if (c === "CLARIFY") runCad("clarify");
    else if (c === "HELP") runCad("help");
    else if (c === "EXPORT") openExport(parsed.args[0]);
    else if (c === "LOCK") {
      const L = layers[active];
      if (L.role === "nonsense") { note("The Nonsense Layer stays locked"); return; }
      L.locked = !L.locked; renderLayers(); note(L.locked ? "Locked" : "Unlocked");
    } else if (c === "ADVANCED") runCad("adv");
    else if (c === "MATH") applyMathFromLine(parsed.args[0] || "");
    log.push(raw);
  }

  function promptModel() {
    const L = layers[active];
    const m = CAD.deriveRelations(layerModel(L));
    const domain = L.domain || "custom";
    const g = CAD.glossary(domain, userTerms(domain), canonOn());
    let alignment = "This is the Nonsense Layer, the locked origin.";
    if (L.role !== "nonsense") {
      const al = CAD.alignToNonsense(CAD.deriveRelations(layerModel(layers[0])), m);
      const t = CAD.termsFor(domain, userTerms(domain), canonOn());
      alignment = "Against the Nonsense Layer: " + al.parallel + " " + t.parallel + ", " + al.perpendicular + " " + t.perpendicular + ".";
    }
    const english = domainEnglish(L).split("\n");
    return {
      notation: (typeof genText === "function" ? genText(L, active, false) : ""),
      english, bag: Object.entries(bagOfWords()).map(([k, v]) => k + "×" + v).join(", "),
      history: log.slice(), math: CAD.mathLine(m), glossary: g,
      domainNote: "Active layer: " + L.name + " (" + (CAD.DOMAINS[domain] ? CAD.DOMAINS[domain].label : domain) + ").",
      alignment,
      self: (layers[0] && layers[0].self) || null,
      environment: CAD.environmentOf((L && L.moves) || []).label
    };
  }
  function openExport(which) {
    const sel = document.getElementById("xstyle");
    if (which && CAD.STYLES.includes(which)) sel.value = which;
    document.getElementById("xtext").value = CAD.buildPrompt(sel.value, promptModel());
    xport.classList.add("on");
  }
  document.getElementById("xstyle").onchange = () => openExport();
  document.getElementById("xcopy").onclick = () => copyText(document.getElementById("xtext").value);
  document.getElementById("xdl").onclick = () => download("ariel-prompt.md", document.getElementById("xtext").value, "text/markdown");
  document.getElementById("xtex").onclick = () => {
    const tex = CAD.mathLatex(CAD.deriveRelations(layerModel(layers[active])));
    copyText(tex);
    download("ariel-math.tex", "\\documentclass{article}\\begin{document}\n\\[" + tex + "\\]\n\\end{document}\n", "text/plain");
  };
  document.getElementById("xclose").onclick = () => xport.classList.remove("on");
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).catch(() => {});
    note("Copied");
  }
  const copyBtn = document.createElement("button");
  copyBtn.type = "button"; copyBtn.textContent = "Copy"; copyBtn.title = "Copy this tab";
  copyBtn.onclick = () => copyText(tpa.value);
  const texBtn = document.createElement("button");
  texBtn.type = "button"; texBtn.textContent = "LaTeX"; texBtn.title = "Copy and download the math line as LaTeX";
  texBtn.onclick = () => document.getElementById("xtex").click();
  tpt.appendChild(copyBtn); tpt.appendChild(texBtn);

  const renderCore = renderLayers;
  renderLayers = function () {
    CAD.sealLayers(layers);
    renderCore();
    const box = document.getElementById("layers");
    const meta = document.createElement("div");
    meta.id = "layer-meta";
    const L = layers[active];
    meta.innerHTML = "<strong></strong><div class='small'></div>";
    meta.querySelector("strong").textContent = L.name + (L.locked ? " · locked" : "");
    const sub = meta.querySelector("div");
    sub.textContent = L.role === "nonsense" ? "Origin. Human thought: I/O, patience, momentum, entropy." : "Freeform. Draw anything in this field.";
    const env = L.role === "nonsense"
      ? { holder: "human", humanShare: 1, aiShare: 0, label: "Anchor layer. The AI cannot write here. A model inside this app, not empirical proof." }
      : CAD.environmentOf(L.moves || []);
    const meter = document.createElement("div");
    meter.className = "env-meter";
    meter.title = env.label;
    const fill = document.createElement("i");
    fill.style.width = Math.round((env.holder === "human" ? env.humanShare : env.aiShare) * 100) + "%";
    fill.style.background = env.holder === "human" ? "#7a9cc6" : "#c79a7a";
    meter.appendChild(fill);
    const cap = document.createElement("p");
    cap.textContent = (env.holder === "human" ? "Human holds the environment" : "AI dominant") + ". " + env.label;
    meta.appendChild(meter);
    meta.appendChild(cap);
    if (L.role === "nonsense") {
      if (!L.self) { try { L.self = JSON.parse(localStorage.getItem("ariel-self") || "null"); } catch (e) { L.self = null; } }
      const st = document.createElement("p");
      st.textContent = L.self ? ("Self established " + L.self.at + " · " + L.self.point.name + ". Editable only by you. Not a metaphysical proof.") : "Self not established. Only you can do this.";
      const nm = document.createElement("input");
      nm.placeholder = "Self-point name"; nm.setAttribute("aria-label", "Self-point name");
      nm.value = L.self ? L.self.point.name : "";
      const a1 = document.createElement("input");
      a1.placeholder = "A belief or value (may be wrong)"; nm.setAttribute && a1.setAttribute("aria-label", "A belief or value");
      a1.value = L.self && L.self.anchors[0] ? L.self.anchors[0].value : "";
      const a2 = document.createElement("input");
      a2.placeholder = "Another anchor"; a2.setAttribute("aria-label", "Another anchor");
      a2.value = L.self && L.self.anchors[1] ? L.self.anchors[1].value : "";
      const fix = document.createElement("button");
      fix.type = "button"; fix.textContent = "Establish self";
      fix.onclick = () => {
        const res = CAD.establishSelf({ self: L.self }, { by: "human", at: new Date().toISOString().slice(0, 10), point: { name: nm.value, x: 0.5, y: 0.5 }, anchors: [{ name: "belief", value: a1.value }, { name: "value", value: a2.value }] });
        if (!res.ok) { note(res.reason); return; }
        const blocked = CAD.establishSelf({ self: L.self }, { by: "ai", point: { name: "no", x: 0, y: 0 } });
        if (blocked.ok) { note("Refused"); return; }
        L.self = res.record.self;
        try { localStorage.setItem("ariel-self", JSON.stringify(L.self)); } catch (e) {}
        log.push("ESTABLISH " + L.self.at);
        note("Self established " + L.self.at);
        renderLayers();
      };
      meta.appendChild(st); meta.appendChild(nm); meta.appendChild(a1); meta.appendChild(a2); meta.appendChild(fix);
    }
    const show = document.createElement("button");
    show.type = "button"; show.textContent = "Show environment model";
    show.onclick = () => {
      const d = CAD.demonstrateEnvironment();
      const box = document.getElementById("demo");
      box.innerHTML = "";
      const title = document.createElement("p");
      title.innerHTML = "<strong>Environment model</strong>";
      box.appendChild(title);
      [["Blank layer", d.blank], ["Blank, then AI moves", d.aiMoves], ["User first move", d.userFirst], ["User last move", d.userLast]].forEach(([name, row]) => {
        const p = document.createElement("p");
        p.textContent = name + ": " + row.holder + " · human " + row.humanShare + " · AI " + row.aiShare;
        box.appendChild(p);
      });
      const honest = document.createElement("p");
      honest.textContent = d.blank.label;
      const close = document.createElement("button");
      close.type = "button"; close.textContent = "Close";
      close.onclick = () => box.classList.remove("on");
      box.appendChild(honest); box.appendChild(close);
      box.classList.add("on");
    };
    meta.appendChild(show);
    if (L.role !== "nonsense") {
      const name = document.createElement("input");
      name.value = L.name; name.setAttribute("aria-label", "Layer name");
      name.onchange = () => { L.name = name.value.trim() || L.name; renderLayers(); };
      const domain = document.createElement("select");
      domain.setAttribute("aria-label", "Field");
      Object.keys(CAD.DOMAINS).filter(k => k !== "nonsense").forEach(k => {
        const o = document.createElement("option"); o.value = k; o.textContent = CAD.DOMAINS[k].label; domain.appendChild(o);
      });
      domain.value = CAD.DOMAINS[L.domain] ? L.domain : "custom";
      domain.onchange = () => { L.domain = domain.value; renderLayers(); note(CAD.DOMAINS[L.domain].label); };
      meta.appendChild(name); meta.appendChild(domain);
    }
    box.appendChild(meta);
    paintStatus();
  };

  const candidatesCore = candidates;
  candidates = function () {
    const base = candidatesCore();
    const L = layers[active];
    CAD.domainWords(L && L.domain).forEach(w => {
      if (!base.some(c => c.w === w)) base.push({ w, freq: 0, H: 0, A: 1, layers: new Set(), used: false, who: "A", score: 0.35 });
    });
    return base;
  };

  function paintStatus() {
    const L = layers[active];
    const t = CAD.termsFor(L.domain, userTerms(L.domain), canonOn());
    status.textContent = [
      "SNAP " + (P.snap ? "on" : "off"),
      "ORTHO " + (ortho ? "on" : "off"),
      "EUCLID " + (P.snap ? "on" : "off"),
      "M " + P.M.toFixed(2) + " γ " + P.gamma.toFixed(2),
      "P_t " + Math.round(Pt) + "s",
      L.name,
      canonOn() ? "canonical terms" : t.line
    ].join("  ·  ");
    const tail = sentence.slice(-6).map(s => s.t).join(" ");
    if (!echo.textContent) echo.textContent = tail;
  }
  const drawCore = draw;
  draw = function (t) {
    drawCore(t);
    layers.forEach((L, i) => (L.circles || []).forEach(c => {
      if (!c.doubt || typeof ellipse !== "function") return;
      ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = "#9aa3ad"; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.9;
      ellipse(c, i); ctx.stroke(); ctx.restore();
    }));
    layers.forEach((L, i) => (L.ink || []).forEach(stroke => {
      if (!stroke.length) return;
      ctx.save(); ctx.strokeStyle = "#7a9cc6"; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.beginPath();
      stroke.forEach((pt, k) => { const q = proj(pt, i); k ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); });
      ctx.stroke(); ctx.restore();
    }));
    if (collapsed) drawCollapsed();
    if (typeof paintSignal === "function") paintSignal();
    if (tilt > 0.35) drawAlignedAxes();
    paintStatus();
    if (sel && layers[sel.layer]) highlight();
    if (graceSimple) drawGraceLine();
  };
  let graceSimple = false;
  function drawGraceLine() {
    if (typeof ctx === "undefined" || typeof ioOf !== "function") return;
    const io = ioOf(layers[0], 0);
    ctx.save();
    ctx.fillStyle = "rgba(244,241,236,0.86)";
    ctx.fillRect(0, 0, typeof W !== "undefined" ? W : ctx.canvas.width, typeof H_ !== "undefined" ? H_ : ctx.canvas.height);
    ctx.strokeStyle = "#5b6472";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const A = typeof proj === "function" ? proj(io.i, 0) : io.i;
    const B = typeof proj === "function" ? proj(io.o, 0) : io.o;
    ctx.moveTo(A.x, A.y);
    ctx.lineTo(B.x, B.y);
    ctx.stroke();
    ctx.restore();
  }
  function drawCollapsed() {
    const axes = layerAxes();
    if (!axes.length) return;
    const axis = axes[0].line;
    const A = proj({ x: axis.a.x * W, y: axis.a.y * H_ }, 0);
    const B = proj({ x: axis.b.x * W, y: axis.b.y * H_ }, 0);
    ctx.save();
    ctx.strokeStyle = "#5b6472"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
    const map = gatherMap();
    const line = map ? CAD.collapseToLine(map) : null;
    if (line && line.ok) line.items.forEach(item => {
      const x = axis.a.x + (axis.b.x - axis.a.x) * item.t;
      const y = axis.a.y + (axis.b.y - axis.a.y) * item.t;
      const p = proj({ x: x * W, y: y * H_ }, 0);
      ctx.beginPath(); ctx.arc(p.x, p.y, item.kind === "anchor" ? 7 : 4, 0, 7); ctx.fillStyle = "#c9a23f"; ctx.fill();
    });
    ctx.restore();
  }
  function drawAlignedAxes() {
    const axes = layerAxes();
    const rows = CAD.compareLayerLines(axes);
    const aligned = new Set();
    rows.forEach(r => { if (r.parallel) { aligned.add(r.i); aligned.add(r.j); } });
    axes.forEach(ax => {
      const A = proj({ x: ax.line.a.x * W, y: ax.line.a.y * H_ }, ax.i);
      const B = proj({ x: ax.line.b.x * W, y: ax.line.b.y * H_ }, ax.i);
      ctx.save();
      ctx.strokeStyle = aligned.has(ax.i) ? "#c9a23f" : (typeof col === "function" ? col(ax.i) : "#7a9cc6");
      ctx.lineWidth = aligned.has(ax.i) ? 3 : 1.5;
      ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
      ctx.restore();
    });
  }
  function highlight() {
    const L = layers[sel.layer]; if (!L) return;
    ensureIds(L);
    const pool = sel.kind === "line" ? L.lines : sel.kind === "circle" ? L.circles : L.dots;
    const sh = pool.find(s => s.id === sel.id); if (!sh) return;
    ctx.save(); ctx.strokeStyle = "#c9a23f"; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
    if (sh.a) { const a = proj(sh.a, sel.layer), b = proj(sh.b, sel.layer); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    else if (sh.c) { const c = proj(sh.c, sel.layer); ctx.beginPath(); ctx.arc(c.x, c.y, 14, 0, 7); ctx.stroke(); }
    else { const p = proj(sh, sel.layer); ctx.beginPath(); ctx.arc(p.x, p.y, 12, 0, 7); ctx.stroke(); }
    ctx.restore();
  }

  function fillHelp() {
    const L = layers[active];
    const g = CAD.glossary(L.domain, userTerms(L.domain), canonOn());
    help.innerHTML = "";
    const h = document.createElement("div");
    h.innerHTML = "<h2>Ariel</h2><p>Conceptual, not validated science. Not therapy. In crisis in the U.S., call or text <strong>988</strong>.</p>"
      + "<p>All credit and glory to God. I owe my knowledge to my Lord Jesus Christ.</p>"
      + "<p><a href='Project-Ariel-Paper.pdf'>Download the paper (PDF)</a></p>"
      + "<p>Full guide: <a href='DOCS.md'>DOCS.md</a>.</p>"
      + "<h2>Self and environment</h2><p>On the Nonsense Layer, Establish self marks a self-point and a few anchors. Only you can do that. The AI cannot write there. The words say established, not proved. Each layer shows who holds the environment: if it is blank, or you have neither the first nor the last move, the AI's share dominates. If you take the first or the last move, you hold it and the AI only adapts. Show environment model runs that comparison. It is a model inside this app, not empirical proof. If your layer differs from the AI layer, the note says so. The AI keeps its own layer.</p>"
      + "<h2>Quick start</h2><p>Layer 1 is the Nonsense Layer, a locked picture of the thought model (input, output, patience, momentum, entropy). Draw on any other layer. Name it and choose a field. The field only changes the words, never the shapes.</p>"
      + "<h2>Commands</h2><p>POINT LINE CIRCLE MOVE SELECT ERASE UNDO REDO LAYER n SNAP ORTHO MERGE CLARIFY LOCK EXPORT HELP MATH, or paste one math line.</p>"
      + "<h2>Math</h2><p>One line, for example A(0.2,0.5), B(0.8,0.5); AB̅; ∠ABC = 90°; AB ∥ CD; ⊙O(r=0.2); P ∈ AB; X = AB ∩ CD; h ∈ [0.2, 0.8]; I(0.14,0.42) → O(0.80,0.42). The Math tab copies it and exports LaTeX. Typing it edits the active layer and can be undone.</p>"
      + "<p>Doubt is a resistance circle ◌. Its radius is ρ, and inside it damping is γ + ρ. A smaller circle is less resistance. Drag the rim to change it. Undo puts it back. Shapes inside stay.</p>"
      + "<p><strong>Collapse</strong> is the point of the screen. It lays every visible layer on one straight line from input I to output O, without deleting anything. Expand, or undo, brings the map back. After that, layers whose I→O lines are parallel or overlapping both count as parallel (∥). Overlap, offset 0, is the strongest agreement and can be marked ≡. In the side view those aligned lines share one color.</p>"
      + "<p><strong>Signal</strong> is a scalar field. " + (window.ArielSignal ? ArielSignal.EQ : "") + " It is a user-contributed model, conceptual and not validated.</p>"
      + "<h2>This layer's words</h2>";
    const glossP = document.createElement("p");
    glossP.textContent = g;
    h.appendChild(glossP);
    const form = document.createElement("div");
    if (L.role !== "nonsense") {
      Object.keys(CAD.CANON).forEach(key => {
        const row = document.createElement("label");
        row.style.display = "block";
        row.textContent = key + " ";
        const input = document.createElement("input");
        input.value = userTerms(L.domain)[key] || "";
        input.placeholder = CAD.termsFor(L.domain, null, false)[key];
        input.onchange = () => { saveUserTerm(L.domain, key, input.value.trim()); note("Saved on this device"); };
        row.appendChild(input);
        form.appendChild(row);
      });
      h.appendChild(form);
    }
    const close = document.createElement("p");
    const b = document.createElement("button");
    b.type = "button"; b.textContent = "Close";
    b.onclick = () => help.classList.remove("on");
    close.appendChild(b);
    h.appendChild(close);
    help.appendChild(h);
  }
  help.addEventListener("click", e => { if (e.target === help) help.classList.remove("on"); });

  CAD.sealLayers(layers);
  layers.forEach(L => {
    if (L.role === "nonsense") return;
    const has = (L.dots && L.dots.length) || (L.lines && L.lines.length) || (L.circles && L.circles.length);
    if (has && !(L.moves && L.moves.length)) L.moves = [{ by: L.ai ? "ai" : "human" }];
  });
  if (layers[1] && !layers[1].name) layers[1].name = "Layer 2";
  if (active === 0 && layers.length > 1) active = 1;
  if (innerWidth >= 700) document.body.classList.add("dock-open");
  renderLayers();
  mark();
  note("Nonsense Layer is locked. Draw on " + layers[active].name + ".");
  // ===== Signal panel: the corrected scalar transmission model =====
  const Sig = window.ArielSignal;
  let sig = null, sigOn = false, sigPlay = null, sigOpt = null;
  function doubtCircles() {
    const out = [];
    layers.forEach(L => (L.circles || []).forEach(c => { if (c.doubt) out.push({ x: c.c.x / W, y: c.c.y / H_, r: c.r / S() }); }));
    return out;
  }
  function readSigOpt() {
    const g = id => +document.getElementById(id).value;
    const io = ioOf(layers[0], 0);
    return { Ki: g("sig-ki"), alpha: g("sig-a"), beta: g("sig-b"), gamma: g("sig-g"), rho: g("sig-r"), u: g("sig-u"), ox: io.o.x / W, oy: io.o.y / H_, circles: doubtCircles() };
  }
  function paintPlot() {
    const cv = document.getElementById("sig-plot");
    if (!cv || !sig) return;
    const g = cv.getContext("2d");
    const w = cv.width = cv.clientWidth * 2, h = cv.height = 72;
    g.clearRect(0, 0, w, h);
    g.strokeStyle = "#c79a7a"; g.lineWidth = 2;
    const hist = sig.hist;
    if (hist.length < 2) { paintSignalShows(hist); return; }
    g.beginPath();
    hist.forEach((v, i) => {
      const x = i / (hist.length - 1) * w;
      const y = h / 2 - (v / Sig.PARAMS.Smax) * (h * 0.45);
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    });
    g.stroke();
    paintSignalShows(hist);
  }
  function paintSignalShows(hist) {
    const box = document.getElementById("sig-shows");
    const Shows = window.ArielFeedback;
    if (!box || !Shows) return;
    const card = Shows.chart({
      listening: !!window.__arielListen,
      series: [{ id: "signal", name: "The signal at O", higherIsBetter: true, deadband: 0.15, sharpDrop: 0.8, points: hist || [] }]
    });
    box.replaceChildren();
    const k = document.createElement("p");
    k.textContent = card.title;
    box.appendChild(k);
    card.lines.forEach(line => {
      const p = document.createElement("p");
      p.textContent = line;
      box.appendChild(p);
    });
    const note = document.createElement("p");
    note.textContent = card.guide;
    box.appendChild(note);
    if (card.suggestion) {
      const p = document.createElement("p");
      p.textContent = card.suggestion;
      box.appendChild(p);
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = card.label;
      b.onclick = () => { if (window.parent) window.parent.postMessage({ type: "ariel-show", action: card.action }, "*"); };
      box.appendChild(b);
    }
  }
  function paintSignalRead() {
    if (!sig || !sigOpt) return;
    const plain = document.getElementById("sig-plain");
    if (plain) plain.textContent = Sig.readout(sig, sigOpt);
    const vals = document.getElementById("sig-vals");
    if (vals) vals.textContent = "Kᵢ " + sigOpt.Ki.toFixed(2) + "  α " + sigOpt.alpha.toFixed(2) + "  β " + sigOpt.beta.toFixed(2) + "  γ " + sigOpt.gamma.toFixed(3) + "  ρ " + sigOpt.rho.toFixed(2) + "  u " + sigOpt.u.toFixed(2);
    paintPlot();
  }
  function stepSignal() {
    if (!sig) return;
    sigOpt = readSigOpt();
    if (window.__arielGate != null) sigOpt = Object.assign({}, sigOpt, { Ki: sigOpt.Ki * window.__arielGate });
    Sig.step(sig, sigOpt);
    paintSignalRead();
  }
  window.paintSignal = function () {
    if (!sigOn || !sig) return;
    const n = sig.n, cellW = W / n, cellH = H_ / n;
    ctx.save();
    ctx.globalAlpha = 0.42;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const v = sig.S[j * n + i] / Sig.PARAMS.Smax;
      const t = Math.max(-1, Math.min(1, v));
      ctx.fillStyle = t >= 0 ? "rgba(199,154,122," + t + ")" : "rgba(122,156,198," + (-t) + ")";
      ctx.fillRect(i * cellW, j * cellH, cellW + 0.5, cellH + 0.5);
    }
    const io = ioOf(layers[0], 0);
    const x = io.i.x + (io.o.x - io.i.x) * sig.p;
    const y = io.i.y + (io.o.y - io.i.y) * sig.p;
    ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fillStyle = "#c9a23f"; ctx.fill();
    ctx.restore();
  };
  function toggleSignal() {
    const panel = document.getElementById("signal");
    sigOn = !sigOn;
    panel.classList.toggle("on", sigOn);
    if (sigOn && !sig) sig = Sig.create(Sig.PARAMS.n);
    if (sigOn) sigOpt = readSigOpt();
    if (!sigOn && sigPlay) { clearInterval(sigPlay); sigPlay = null; }
    paintSignalRead();
  }
  function buildSignal() {
    if (!Sig) return;
    const panel = document.createElement("section");
    panel.id = "signal";
    panel.innerHTML = "<strong>Signal</strong><p id='sig-eq'></p><p id='sig-tex'></p><p id='sig-plain'></p>"
      + "<label>Kᵢ gain <input id='sig-ki' type='range' min='0' max='1' step='0.01'></label>"
      + "<label>α input weight <input id='sig-a' type='range' min='0' max='1.5' step='0.01'></label>"
      + "<label>β momentum <input id='sig-b' type='range' min='0' max='1' step='0.01'></label>"
      + "<label>γ diffusion <input id='sig-g' type='range' min='0' max='0.2' step='0.001'></label>"
      + "<label>ρ doubt <input id='sig-r' type='range' min='0' max='1.5' step='0.01'></label>"
      + "<label>u your level <input id='sig-u' type='range' min='0' max='1' step='0.01'></label>"
      + "<p><button type='button' id='sig-play'>Play</button> <button type='button' id='sig-pause'>Pause</button> <button type='button' id='sig-reset'>Reset</button></p>"
      + "<canvas id='sig-plot'></canvas><div id='sig-shows'></div><p id='sig-vals'></p>"
      + "<p>Kᵢ gain on the integral. α weight on your level u. Ψ goal peak at O. I integral of e, clamped. β gain on v·n̂, the tracer speed along I→O. γ diffusion of S. ρ doubt weight. χ_doubt is 1 inside a doubt circle.</p>";
    document.body.appendChild(panel);
    document.getElementById("sig-eq").textContent = Sig.EQ;
    document.getElementById("sig-tex").textContent = Sig.TEX;
    const set = (id, v) => { document.getElementById(id).value = v; };
    set("sig-ki", Sig.PARAMS.Ki); set("sig-a", Sig.PARAMS.alpha); set("sig-b", Sig.PARAMS.beta);
    set("sig-g", Sig.PARAMS.gamma); set("sig-r", Sig.PARAMS.rho); set("sig-u", Sig.PARAMS.u);
    document.getElementById("sig-play").onclick = () => { if (sigPlay) return; if (!sig) sig = Sig.create(Sig.PARAMS.n); sigPlay = setInterval(stepSignal, 50); };
    document.getElementById("sig-pause").onclick = () => { clearInterval(sigPlay); sigPlay = null; };
    document.getElementById("sig-reset").onclick = () => { sig = Sig.create(Sig.PARAMS.n); paintSignalRead(); };
    ["sig-ki", "sig-a", "sig-b", "sig-g", "sig-r", "sig-u"].forEach(id => document.getElementById(id).oninput = paintSignalRead);
  }
  buildSignal();
  window.toggleSignal = toggleSignal;
  const setTabSig = setTab;
  setTab = function (k) {
    setTabSig(k);
    if (k === "m" && sigOn && tpa && Sig) tpa.value = (tpa.value ? tpa.value + "\n" : "") + Sig.EQ;
  };
  const graceTrace = [];
  function noteGracePoint(e) {
    if (!e || !e.buttons) return;
    graceTrace.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    if (graceTrace.length > 240) graceTrace.splice(0, graceTrace.length - 240);
  }
  window.addEventListener("pointermove", noteGracePoint);
  function storyMarks() {
    const palette = ["#7a9cc6", "#c79a7a", "#5b6472", "#e8c76a", "#8a93a0"];
    const q = (n) => Math.round(Number(n) / 16) * 16;
    const marks = [];
    layers.forEach((L, i) => {
      const color = palette[i % palette.length];
      (L.dots || []).forEach((p, k) => marks.push({ color: color, t: k, points: [{ x: q(p.x), y: q(p.y) }] }));
      (L.lines || []).forEach((l, k) => marks.push({ color: color, t: 100 + k, points: [{ x: q(l.a.x), y: q(l.a.y) }, { x: q(l.b.x), y: q(l.b.y) }] }));
      (L.circles || []).forEach((c, k) => marks.push({ color: c.doubt ? "#9aa3ad" : color, t: 200 + k, points: [{ x: q(c.c.x), y: q(c.c.y) }, { x: q(c.r || 0), y: 0 }] }));
      (L.ink || []).forEach((stroke, k) => {
        const pts = [];
        for (let n = 0; n < stroke.length && pts.length < 12; n += 4) pts.push({ x: q(stroke[n].x), y: q(stroke[n].y) });
        if (pts.length) marks.push({ color: color, t: 300 + k, points: pts });
      });
    });
    if (marks.length > 30) marks.length = 30;
    return marks;
  }
  function publishSuite() {
    if (window.parent === window) return;
    let rho = 0, doubts = 0, shapes = 0;
    layers.forEach(L => {
      shapes += (L.dots || []).length + (L.lines || []).length + (L.circles || []).length + (L.ink || []).length;
      (L.circles || []).forEach(c => { if (c.doubt) { doubts++; rho = Math.max(rho, Math.max(0, Math.min(1, c.r / S()))); } });
    });
    const io = ioOf(layers[0], 0);
    const span = Math.hypot(io.o.x - io.i.x, io.o.y - io.i.y) / Math.max(W, 1);
    window.parent.postMessage({
      type: "ariel-state",
      doubtRho: rho,
      doubts, shapes,
      bridge: Math.max(0, Math.min(1, span)),
      collapsed: !!collapsed,
      collapseText: collapseRead,
      layers: layers.map(L => ({ name: L.name || "", role: L.role || "", domain: L.domain || "custom", dots: (L.dots || []).length, lines: (L.lines || []).length, circles: (L.circles || []).length, doubts: (L.circles || []).filter(c => c.doubt).length, ink: (L.ink || []).length })),
      marks: storyMarks(),
      trace: graceTrace.filter(p => performance.now() - p.t < 2500).slice(-80),
      signal: sig ? { p: sig.p, sAtO: sig.hist.length ? sig.hist[sig.hist.length - 1] : 0 } : null
    }, "*");
  }
  setInterval(publishSuite, 500);
  window.addEventListener("message", (e) => {
    const d = e.data;
    if (!d) return;
    if (d.type === "ariel-tools") { document.body.classList.toggle("more-tools", !!d.on); return; }
    if (d.type === "ariel-simplify") { graceSimple = !!d.on; return; }
    if (d.type !== "ariel-gate" || typeof d.g !== "number") return;
    window.__arielGate = Math.max(0, Math.min(1, d.g));
    window.__arielListen = !!d.listen;
  });
  if (location.hash.includes("collapse")) toggleCollapse();
  if (location.hash.includes("signal")) { toggleSignal(); for (let i = 0; i < 14; i++) stepSignal(); }
})();
