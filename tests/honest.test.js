// Run: node tests/honest.test.js
// The Honest Room. Nothing is saved unless the person keeps it.
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const H = require("../ariel/suite/honest.js");

const tests = [];
function test(name, fn) { tests.push([name, fn]); }

function mem() {
  const box = {};
  return {
    getItem(key) { return Object.prototype.hasOwnProperty.call(box, key) ? box[key] : null; },
    setItem(key, value) { box[key] = String(value); }
  };
}

test("the room welcomes, and faith lines stay off unless asked", () => {
  const open = H.view(H.start({ mode: "open" }));
  assert.equal(open.lines[0], H.PARAMS.welcome);
  assert.equal(open.privacy, "Nothing here leaves your device. Nothing is judged.");
  assert.equal(open.danger, "If someone is in danger, contacting help comes first.");
  assert.deepEqual(open.scripture, []);
  assert.equal(open.text, "");
  const faith = H.view(H.apply(H.start({ faith: true, mode: "open" }), "faith-on"));
  assert.match(faith.scripture.map(v => v.ref).join(" "), /Psalm 32:5/);
  assert.match(faith.scripture.map(v => v.ref).join(" "), /Romans 8:1/);
  const listen = H.view(H.start({ faith: true, mode: "listen" }));
  assert.equal(listen.scripture.length, 0);
  assert.equal(listen.lines[1], H.PARAMS.pause);
  assert.equal(listen.choices.some(c => c.id === "again"), false);
});

test("a horrifying thought is taught once, then the reassurance loop is named", () => {
  let state = H.apply(H.start({ mode: "open" }), "continue");
  state = H.apply(state, "continue", "a thought I hate");
  state = H.apply(state, "thought");
  assert.match(H.view(state).lines[0], /not an act/);
  assert.equal(state.text, "a thought I hate");
  state = H.apply(state, "again");
  state = H.apply(state, "again");
  assert.equal(state.step, "thought");
  state = H.apply(state, "again");
  const loop = H.view(state);
  assert.equal(state.step, "loop");
  assert.equal(state.reassurance, 3);
  assert.doesNotMatch(loop.lines.join(" "), /almost everyone/);
  assert.match(loop.lines[0], /let it go/i);
  assert.equal(loop.choices.some(c => c.id === "again"), false);
  state = H.apply(H.apply(H.start({}), "continue"), "continue", "a thought");
  state = H.apply(H.apply(state, "thought"), "continue");
  const defuse = H.view(state);
  assert.equal(defuse.lines[0], "I'm having the thought that…");
  assert.match(defuse.lines.join(" "), /ERP/);
});

test("something you did separates guilt from shame, then repair and grace", () => {
  let state = H.apply(H.apply(H.start({ faith: true }), "skip"), "skip");
  state = H.apply(state, "did");
  const named = H.view(state);
  assert.match(named.lines.join(" "), /I did something wrong/);
  assert.match(named.lines.join(" "), /I am bad/);
  state = H.apply(state, "continue");
  assert.equal(state.step, "repair");
  assert.match(H.view(state).lines.join(" "), /apology/);
  state = H.apply(state, "continue");
  const grace = H.view(state);
  assert.match(grace.lines.join(" "), /does not call the wrong good/);
  assert.match(grace.lines.join(" "), /not excusing the wrong/);
  assert.match(grace.scripture.map(v => v.ref).join(" "), /1 John 1:9/);
  state = H.apply(state, "skip");
  assert.equal(state.step, "close");
  const talk = H.view(H.apply(state, "talk"));
  assert.match(talk.lines[0], /trusted person, a pastor, or a counsellor/);
  const repair = H.apply(H.apply(H.apply(H.apply(H.start({}), "continue"), "continue", "I broke a promise"), "did"), "continue");
  const handed = H.apply(repair, "reach");
  assert.equal(handed.handoff, "reach");
  assert.equal(handed.text, "");
  const unsure = H.view(H.apply(H.apply(H.apply(H.start({}), "continue"), "continue"), "unsure"));
  assert.match(unsure.lines.join(" "), /not an act/);
  assert.match(unsure.lines.join(" "), /Shame/);
});

test("harm language stops the room and clears the words", () => {
  let state = H.apply(H.start({}), "continue");
  state = H.apply(state, "continue", "I want to die");
  const seen = H.view(state);
  assert.equal(seen.safety, true);
  assert.equal(seen.text, "");
  assert.match(seen.lines.join(" "), /988/);
  assert.match(seen.lines.join(" "), /911/);
  assert.match(seen.danger, /contacting help comes first/);
  const gone = H.apply(state, "close");
  assert.equal(gone.text, "");
  assert.equal(gone.fading, true);
});

test("let it go clears the words, and a private keep can be locked", async () => {
  let state = H.apply(H.apply(H.start({}), "continue"), "continue", "the worst thing");
  state = H.apply(state, "skip");
  const released = H.apply(state, "let-go");
  assert.equal(released.text, "");
  assert.equal(released.fading, true);
  assert.equal(H.leave(state).text, "");
  const store = mem();
  const plain = H.plainEntry("h1", "2026-11-10T20:00:00.000Z", "the worst thing");
  H.saveKept(store, H.addKept([], plain));
  assert.equal(H.loadKept(store)[0].text, "the worst thing");
  assert.match(store.getItem(H.PARAMS.store), /stays on this device/i);
  const blob = await H.seal("the worst thing", "quiet-room");
  assert.equal(JSON.stringify(blob).includes("the worst thing"), false);
  const locked = H.lockedEntry("h2", "2026-11-10T20:01:00.000Z", blob);
  assert.equal(locked.text, "");
  H.saveKept(store, H.addKept(H.loadKept(store), locked));
  const opened = await H.openSeal(H.loadKept(store)[0].blob, "quiet-room");
  assert.equal(opened.ok, true);
  assert.equal(opened.text, "the worst thing");
  const wrong = await H.openSeal(blob, "nope");
  assert.equal(wrong.ok, false);
  assert.equal(wrong.text, "");
});

test("the page offers the room, the privacy line, and a local lock", () => {
  const suite = fs.readFileSync(path.join(__dirname, "../ariel/suite/index.html"), "utf8");
  const file = fs.readFileSync(path.join(__dirname, "../ariel/suite/honest.js"), "utf8");
  assert.match(suite, /id="honest-open"/);
  assert.match(suite, /Honest room/);
  assert.match(suite, /Nothing here leaves your device\. Nothing is judged\./);
  assert.match(file, /Let it go/);
  assert.match(file, /Keep privately/);
  assert.match(suite, /honest-body\.fade/);
  assert.match(file, /Ryan designed this room/);
  assert.match(file, /Tangney/);
  assert.match(file, /===== PARAMS =====/);
  assert.match(file, /===== EQUATIONS =====/);
  assert.match(file, /AES-GCM/);
  assert.match(file, /PBKDF2/);
  assert.equal(H.PARAMS.store, "ariel-honest");
});

test("a kept entry is not the accomplishment record", () => {
  const suite = fs.readFileSync(path.join(__dirname, "../ariel/suite/index.html"), "utf8");
  const keep = suite.slice(suite.indexOf("function keepHonest"), suite.indexOf("function fadeHonest"));
  assert.equal(keep.includes("commitRecord"), false);
  assert.equal(keep.includes("ariel-record"), false);
});

(async () => {
  let passed = 0;
  for (const [name, fn] of tests) {
    try { await fn(); passed += 1; console.log("ok  -", name); }
    catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
  }
  console.log(`\n${passed} passed`);
})();
