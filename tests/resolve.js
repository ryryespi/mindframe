// tests/resolve.js — push28: the feature files now say Str.t("group.key", { … }) where they
// used to hold the words. Source-text tests read a file through resolve(), which puts the
// words from js/data/strings.js back in place (a template for Str.t with vars), so those
// tests keep checking the same wording and the same wiring.
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const Str = require("../js/data/strings.js");
const q = s => JSON.stringify(s);
const tpl = (s, vars) => "`" + s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/`/g, "\\`").replace(/\$\{/g, "\\${").replace(/\{\{(\w+)\}\}/g, (_, n) => "${" + vars[n] + "}") + "`";
// split "{ a: x, b: f(y, z) }" into {a: "x", b: "f(y, z)"} (balanced brackets, strings)
function parseVars(src) {
  const body = src.trim().replace(/^\{\s*/, "").replace(/\s*\}$/, ""); const out = {}; let depth = 0, cur = "", str = null;
  const push = () => { const m = cur.match(/^\s*(\w+)\s*:\s*([\s\S]*?)\s*$/); if (m) out[m[1]] = m[2]; cur = ""; };
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (str) { cur += c; if (c === "\\") { cur += body[++i]; continue; } if (c === str) str = null; continue; }
    if (c === '"' || c === "'" || c === "`") { str = c; cur += c; continue; }
    if ("([{".includes(c)) depth++; if (")]}".includes(c)) depth--;
    if (c === "," && depth === 0) { push(); continue; }
    cur += c;
  }
  if (cur.trim()) push();
  return out;
}
function resolveSrc(src) {
  let out = "", i = 0;
  const re = /Str\.(t|list)\(/g; let m;
  while ((m = re.exec(src))) {
    let j = m.index + m[0].length, depth = 1, str = null;
    for (; j < src.length && depth; j++) { const c = src[j]; if (str) { if (c === "\\") j++; else if (c === str) str = null; continue; } if (c === '"' || c === "'" || c === "`") str = c; else if (c === "(") depth++; else if (c === ")") depth--; }
    const args = src.slice(m.index + m[0].length, j - 1);
    const km = args.match(/^\s*"([^"]+)"\s*(?:,([\s\S]*))?$/);
    let rep;
    if (!km || !Str.has(km[1])) rep = src.slice(m.index, j);   // not a call with a known key (e.g. an example in a comment)
    else if (m[1] === "list") rep = "[" + Str.list(km[1]).map(q).join(", ") + "]";
    else if (km[2]) rep = tpl(Str.raw(km[1]), parseVars(resolveSrc(km[2])));
    else rep = q(Str.t(km[1]));
    out += src.slice(i, m.index) + rep; i = j; re.lastIndex = j;
  }
  return out + src.slice(i);
}
// index.html: the labels come from Str.apply at load; put them back for source checks.
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\u00a0/g, "&nbsp;").replace(/·/g, "&middot;").replace(/›/g, "&rsaquo;").replace(/−/g, "&minus;").replace(/←/g, "&larr;");
function resolveHtml(h) {
  return h
    .replace(/<span data-t="(html\.[^"]+)"><\/span>/g, (_, k) => esc(Str.t(k)))
    .replace(/ data-t="(html\.[^"]+)">(<\/\w+>)/g, (_, k, close) => ">" + esc(Str.t(k)) + close)
    .replace(/ data-t-(placeholder|aria-label|title)="(html\.[^"]+)"/g, (_, a, k) => ` ${a}="${esc(Str.t(k)).replace(/"/g, "&quot;")}"`);
}
function read(rel) { const s = fs.readFileSync(path.join(__dirname, "..", rel), "utf8"); return rel.endsWith(".html") ? resolveHtml(s) : resolveSrc(s); }
module.exports = { read, resolveSrc, resolveHtml };
