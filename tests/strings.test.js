// Run: node tests/strings.test.js   (no dependencies)
// push28: every static user-facing string lives in js/data/strings.js; the t(key, vars) API.
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Str = require("../js/data/strings.js");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
const jsFiles = d => fs.readdirSync(path.join(root, d)).flatMap(f => { const p = path.join(d, f); return fs.statSync(path.join(root, p)).isDirectory() ? jsFiles(p) : p.endsWith(".js") ? [p] : []; });
const code = jsFiles("js").filter(f => !f.includes("data/strings.js"));

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}

test("t(): plain strings, {{name}} placeholders filled with String(value), lists are fresh copies", () => {
  const k = Str.keys().find(x => /\{\{\w+\}\}/.test(Str.raw(x)));
  const names = [...Str.raw(k).matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]);
  const vars = Object.fromEntries(names.map((n, i) => [n, i === 0 ? 7 : `v${i}`]));
  const out = Str.t(k, vars);
  assert.ok(!/\{\{/.test(out), out);
  assert.ok(out.includes("7"));
  assert.equal(Str.t(k, vars), out, "the precompiled template gives the same text each call");
  assert.equal(Str.t("html.update"), "Update");
  const lk = Str.keys().find(x => Array.isArray(Str.raw(x)));
  const a = Str.list(lk); a.push("x");
  assert.notEqual(Str.list(lk).length, a.length, "list() returns a copy");
});
test("t(): a missing key throws (a typo fails a test, never a blank on screen); list/t type checks", () => {
  assert.throws(() => Str.t("nope.missing"), /string missing/);
  const lk = Str.keys().find(x => Array.isArray(Str.raw(x)));
  assert.throws(() => Str.t(lk), /use Str.list/);
  assert.throws(() => Str.list("html.update"), /not a list/);
});
test("t() matches a template literal exactly (numbers, null, undefined, booleans)", () => {
  const k = Str.keys().find(x => (Str.raw(x).match(/\{\{\w+\}\}/g) || []).length === 1);
  const n = Str.raw(k).match(/\{\{(\w+)\}\}/)[1];
  [0, 0.1 + 0.2, null, undefined, true, "a"].forEach(v => assert.equal(Str.t(k, { [n]: v }), Str.raw(k).replace(`{{${n}}}`, `${v}`)));
});
test("every Str.t / Str.list key used in code exists, and every data-t key in index.html exists", () => {
  const used = new Set();
  code.forEach(f => { for (const m of read(f).matchAll(/Str\.(?:t|list)\("([^"]+)"/g)) used.add(m[1]); });
  for (const m of read("index.html").matchAll(/data-t(?:-[a-z-]+)?="([^"]+)"/g)) used.add(m[1]);
  const missing = [...used].filter(k => !Str.has(k));
  assert.deepEqual(missing, []);
  assert.ok(used.size > 1200, `${used.size} keys used`);
});
test("no string in strings.js is unused (each key is read by code or by index.html)", () => {
  const all = code.map(read).join("\n") + read("index.html");
  const unused = Str.keys().filter(k => !all.includes(`"${k}"`));
  assert.deepEqual(unused, []);
});
test("grouped by feature with comments: one group per source file, each with a header naming the file", () => {
  const src = read("js/data/strings.js");
  Object.keys(Str.S).forEach(g => {
    if (g === "html") return assert.match(src, /===== index\.html/);
    const f = g.replace(/\./g, "/");
    assert.ok(new RegExp(`===== (core|features)/${f}\\.js|===== ${f}\\.js`).test(src), g);
  });
});
test("Str.apply fills [data-t] text and attributes (a tiny fake DOM)", () => {
  const el = { dataset: { t: "html.update" }, textContent: "" };
  const at = { attrs: { "data-t-placeholder": "html." + Str.keys().find(k => k.startsWith("html.attr.placeholder")).slice(5) }, getAttribute(a) { return this.attrs[a]; }, setAttribute(a, v) { this.attrs[a] = v; } };
  const root = { querySelectorAll: sel => (sel === "[data-t]" ? [el] : sel === "[data-t-placeholder]" ? [at] : []) };
  Str.apply(root);
  assert.equal(el.textContent, "Update");
  assert.ok(at.attrs.placeholder && at.attrs.placeholder.length > 3);
});
test("index.html: the page's static labels are filled from strings.js (no static prose left in the body)", () => {
  const body = read("index.html").replace(/^[\s\S]*?<body[^>]*>/, "").replace(/<script[\s\S]*$/, "").replace(/<svg[\s\S]*?<\/svg>/g, "").replace(/<!--[\s\S]*?-->/g, "");
  const left = (body.match(/>([^<>]*[A-Za-z]{2,}[^<>]*)</g) || []);
  assert.deepEqual(left, []);
  assert.match(read("js/data/strings.js"), /if \(typeof document !== "undefined"\) apply\(document\);/);
});
test("the crisis wording still shows only 988/911 (unchanged, now in strings.js)", () => {
  const crisis = Str.keys().filter(k => /988/.test(Str.raw(k)) && !Array.isArray(Str.raw(k)));
  assert.ok(crisis.length >= 1);
  crisis.forEach(k => assert.ok(!/\b(?:1-?800|741741|\d{3}-\d{3}-\d{4})\b/.test(Str.raw(k)), k));
});
console.log(`\n${passed} passed`);
