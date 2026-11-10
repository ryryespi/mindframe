// Run: node tests/desktop-words.test.js
// The Ariel Words tab and the canvas button stay on screen at desktop widths.
"use strict";
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const WIDTHS = [[1366, 768], [1920, 1080], [2560, 1440]];
const ROOT = path.join(__dirname, "..");

function serve() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    let name = decodeURIComponent(url.pathname);
    if (name.endsWith("/")) name += "index.html";
    const file = path.join(ROOT, name.replace(/^\/+/, ""));
    fs.readFile(file, (err, data) => {
      if (err || !file.startsWith(ROOT)) { res.statusCode = 404; res.end("missing"); return; }
      res.end(data);
    });
  });
  return new Promise(resolve => server.listen(0, "127.0.0.1", () => resolve(server)));
}

function boxInside(box, width, height) {
  return box && box.w > 0 && box.h > 0 && box.x >= 0 && box.y >= 0 && box.x + box.w <= width + 1 && box.y + box.h <= height + 1;
}

async function main() {
  const server = await serve();
  const port = server.address().port;
  const chrome = spawn("google-chrome", [
    "--headless=new", "--disable-gpu", "--no-sandbox",
    "--remote-debugging-port=9334",
    "--user-data-dir=/tmp/chrome-desk-words-" + Date.now()
  ], { stdio: "ignore" });
  let passed = 0;
  try {
    let version = null;
    for (let i = 0; i < 40 && !version; i++) {
      try { version = await (await fetch("http://127.0.0.1:9334/json/version")).json(); }
      catch (err) { await new Promise(r => setTimeout(r, 100)); }
    }
    if (!version) throw new Error("Chrome did not start");
    const tab = await (await fetch("http://127.0.0.1:9334/json/new?about:blank", { method: "PUT" })).json();
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    let seq = 0;
    const pending = new Map();
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        const item = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) item.reject(new Error(JSON.stringify(msg.error)));
        else item.resolve(msg.result);
      }
    });
    const send = (method, params) => new Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
    const ev = async (expression) => {
      const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    await send("Page.enable");
    for (const [width, height] of WIDTHS) {
      await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
      await send("Page.navigate", { url: "http://127.0.0.1:" + port + "/ariel/suite/?desk=" + width });
      await ev("new Promise(r => setTimeout(r, 400))");
      const tabBox = JSON.parse(await ev(`(() => {
        const b = [...document.querySelectorAll("nav button")].find(x => x.textContent === "Ariel Words");
        const r = b.getBoundingClientRect();
        return JSON.stringify({ w: r.width, h: r.height, x: r.x, y: r.y, shown: getComputedStyle(b).display !== "none" });
      })()`));
      assert.ok(boxInside(tabBox, width, height), width + " suite tab " + JSON.stringify(tabBox));
      await send("Page.navigate", { url: "http://127.0.0.1:" + port + "/ariel/index.html?desk=" + width });
      await ev("new Promise(r => setTimeout(r, 500))");
      const btn = JSON.parse(await ev(`(() => {
        const b = document.getElementById("bWords");
        const r = b.getBoundingClientRect();
        const cs = getComputedStyle(b);
        return JSON.stringify({ w: r.width, h: r.height, x: r.x, y: r.y, pe: cs.pointerEvents, op: cs.opacity });
      })()`));
      assert.ok(boxInside(btn, width, height), width + " canvas button " + JSON.stringify(btn));
      assert.equal(btn.pe, "auto");
      assert.equal(btn.op, "1");
      console.log("ok  -", width + "x" + height);
      passed += 1;
    }
    ws.close();
  } finally {
    chrome.kill("SIGKILL");
    await new Promise(resolve => server.close(resolve));
  }
  console.log("\n" + passed + " passed");
}

main().catch(err => { console.error(err); process.exit(1); });
