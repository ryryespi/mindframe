// Run: node tests/params.test.js   (no dependencies)
// push28: every equation constant lives in js/data/params.js with a paper reference, and
// js/core/equations.js carries a cross-reference table (paper eq → function → params).
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
require("./mf.js");
const P = global.MF.Params, EQ = global.MF.Equations;
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
const jsFiles = d => fs.readdirSync(path.join(root, d)).flatMap(f => { const p = path.join(d, f); return fs.statSync(path.join(root, p)).isDirectory() ? jsFiles(p) : p.endsWith(".js") ? [p] : []; });
const others = jsFiles("js").filter(f => !/data\/params\.js|core\/equations\.js/.test(f)).map(read).join("\n");
const eqSrc = read("js/core/equations.js");
const oe = read("paper/MindFrame-One-Equation.tex"), gp = read("paper/MindFrame-Grace-Peace-Paper.tex");

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}

test("REF annotates every params key exactly (no missing, no stale rows)", () => {
  assert.deepEqual([...P.keys()].sort(), Object.keys(P.REF).sort());
  for (const [k, [where, src]] of Object.entries(P.REF)) { assert.ok(where && src, k); }
});

test("every REF row names a real place: an OE/GP equation number or section that exists, or says it is not in the papers / not an equation", () => {
  const eqs = { OE: (oe.match(/\\label\{eq:/g) || []).length, GP: (gp.match(/\\label\{eq:/g) || []).length };
  for (const [k, [where]] of Object.entries(P.REF)) {
    if (/not in the papers|\(not an equation\)/.test(where)) continue;
    const m = where.match(/^(OE|GP)\b/); assert.ok(m, `${k}: ${where}`);
    const n = where.match(/eq\.\((\d+)\)/); if (n) assert.ok(+n[1] >= 1 && +n[1] <= eqs[m[1]], `${k}: ${where}`);
    if (/§Kai/.test(where)) assert.ok(/label\{sec:kai\}/.test(oe), k);
    if (/§topology/.test(where)) assert.ok(/label\{sec:topology\}/.test(oe), k);
    const tau = where.match(/τ(\d+)/); if (tau) assert.ok(oe.includes(`\\tau_{${tau[1]}}`), `${k}: ${where}`);
  }
});

const groups = [...new Set(P.keys().map(k => k.split(".")[0]))];
const rows = eqSrc.split("\n").filter(l => /^\/\/\s+│/.test(l)).map(l => l.split("│").map(s => s.trim()));
test("the equations.js cross-reference table: every function named exists, every params key named exists", () => {
  assert.ok(rows.length >= 25, rows.length);
  for (const r of rows) {
    for (const f of (r[2].match(/[A-Za-z_]\w*/g) || [])) { if (/\.js$|^grounding$|^memoized$|^reality$|^js$/.test(f)) continue; assert.equal(typeof EQ[f], "function", `table names ${f}`); }
    let g = null;
    for (const tok of r[3].split(/[,\s]+/).filter(Boolean)) {
      if (tok === "—" || /^(d0|gamma|delta)$/.test(tok)) continue;
      const m = tok.match(/^(\w+)\.(\w+\*?|\*)(?:\.\w+)?$/); if (m) g = m[1];
      const key = m ? m[2] : tok.replace(/\..*/, "");
      if (!m && !(g && P[g] && key in P[g])) g = groups.find(x => key in P[x]) || g;
      assert.ok(g && P[g], `group for ${tok}`);
      if (key !== "*") assert.ok(key in P[g] || Object.keys(P[g]).some(k => k.startsWith(key.replace("*", ""))), `${g}.${key}`);
    }
  }
  assert.ok(groups.length >= 10);
});

test("every params key is used outside params.js (no dead constants)", () => {
  for (const k of P.keys()) { const key = k.split(".")[1]; assert.ok(new RegExp(`\\b${key}\\b`).test(others + eqSrc.replace(/^\/\/.*$/gm, "")), `unused param ${k}`); }
});

test("every exported equation is called by a feature or by another equation (features use EQ, not local math)", () => {
  const eqBody = eqSrc.replace(/\/\/.*$/gm, "");
  const helpers = new Set(["r2", "clamp01", "clip", "norm", "distance"]);
  for (const f of Object.keys(EQ)) { if (helpers.has(f)) continue; assert.ok(new RegExp(`\\b${f}\\b`).test(others) || (eqBody.match(new RegExp(`\\b${f}\\(`, "g")) || []).length >= 2, `EQ.${f} unused`); }
});

test("equations are pure: no DOM, storage, clock or randomness in equations.js", () => {
  const body = eqSrc.replace(/\/\/.*$/gm, "").replace(/\}\)\(typeof window[^\n]*$/m, "");
  assert.ok(!/document|window\.|localStorage|Date\.now|Math\.random/.test(body));
});

console.log(`\n${passed} passed`);
