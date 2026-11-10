// Run: node tests/paths.test.js
// Afraid-to-stop doses, and the spiral the person chooses.
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const P = require("../ariel/suite/paths.js");

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log("ok  -", name); }
  catch (err) { console.error("FAIL -", name); console.error(err); process.exitCode = 1; }
}

test("afraid-to-stop opens from the words or a long session, and rest stays short", () => {
  const named = P.afraid({ text: "I can't stop. I feel useless and I'm wasting my life. I'm afraid to rest.", sessionMs: 0, breaks: 0, mode: "open" });
  assert.equal(named.show, true);
  assert.equal(named.forced, false);
  assert.equal(named.lines[0], P.PARAMS.kept);
  assert.equal(named.lines[1], P.PARAMS.already);
  assert.equal(named.lines[2], P.PARAMS.question);
  assert.deepEqual(named.doses, [10, 30, 60]);
  const quiet = P.afraid({ text: "I am drawing a tree", sessionMs: 1000, breaks: 0, mode: "open" });
  assert.equal(quiet.show, false);
  const long = P.afraid({ text: "", sessionMs: P.PARAMS.longSessionMs, breaks: 0, mode: "open" });
  assert.equal(long.show, true);
  assert.equal(long.long, true);
  const broke = P.afraid({ text: "", sessionMs: P.PARAMS.longSessionMs, breaks: 1, mode: "open" });
  assert.equal(broke.show, false);
  assert.equal(P.dose(0).seconds, 10);
  assert.equal(P.dose(1).seconds, 30);
  assert.equal(P.dose(2).seconds, 60);
  assert.equal(P.dose(2).end, "Your work is still here.");
  assert.equal(P.dose(8).seconds, 60);
  assert.equal(P.dose(2).next, null);
  const listen = P.afraid({ text: "I'm afraid to stop", sessionMs: 0, mode: "listen" });
  assert.deepEqual(listen.doses, [10]);
  assert.deepEqual(listen.lines, [P.PARAMS.kept, P.PARAMS.pause]);
  assert.doesNotMatch(listen.lines.join(" "), /who I'd be if I stopped/);
});

test("the spiral offers one choice at a time and never starts itself", () => {
  const mood = P.spiral({ text: "No one cares. The world is cruel. I don't forgive them. I feel isolated.", mode: "open" });
  assert.equal(mood.show, true);
  assert.equal(mood.forced, false);
  assert.equal(mood.offers.length, P.PARAMS.offers.length);
  assert.equal(mood.offers[0].line, "This feeling is real, and it can wait ten minutes before it decides anything.");
  const first = P.offerAt(mood, 0);
  assert.equal(first.offer.id, "wait");
  assert.equal(first.offer.seconds, 600);
  const drop = P.spiral({ text: "something shifted", change: true, drop: true, mode: "open" });
  assert.equal(drop.show, true);
  assert.equal(drop.drop, true);
  const calm = P.spiral({ text: "the leaves are bright", change: false, drop: false, mode: "open" });
  assert.equal(calm.show, false);
  const breathe = P.PARAMS.offers.find(item => item.id === "breathe");
  assert.ok(P.PARAMS.breathe.exhale > P.PARAMS.breathe.inhale);
  assert.equal(breathe.seconds, 60);
  const stop = P.PARAMS.offers.find(item => item.id === "stop");
  assert.deepEqual(stop.steps, ["Stop", "Take a breath", "Observe", "Proceed mindfully"]);
  const listen = P.spiral({ text: "No one cares", mode: "listen" });
  assert.equal(listen.offers.length, 1);
  assert.equal(listen.offers[0].id, "wait");
});

test("kindness is saved only when added, and the record can show two recent items", () => {
  assert.deepEqual(P.addKindness([], "  "), []);
  const list = P.addKindness([], "A stranger held the door.", "2026-11-10T18:00:00.000Z");
  const more = P.addKindness(list, "The light on the wall was beautiful.", "2026-11-10T18:05:00.000Z");
  assert.equal(more.length, 2);
  assert.equal(P.kindnessProof(more, 3)[0].text, "The light on the wall was beautiful.");
  const recent = P.recentKept([
    { text: "Older", at: "2026-11-09T12:00:00.000Z" },
    { text: "Newer", at: "2026-11-10T12:00:00.000Z" },
    { text: "Middle", at: "2026-11-09T18:00:00.000Z" }
  ], 2);
  assert.deepEqual(recent, ["Newer", "Middle"]);
});

test("harm language closes both paths and keeps the safety door", () => {
  const afraid = P.afraid({ text: "I want to die. There is no point.", sessionMs: P.PARAMS.longSessionMs, breaks: 0, mode: "open" });
  const spiral = P.spiral({ text: "I will hurt them and make them pay", mode: "open" });
  assert.equal(afraid.safety, true);
  assert.equal(afraid.show, false);
  assert.equal(spiral.safety, true);
  assert.deepEqual(spiral.offers, []);
  assert.match(afraid.line, /call or text 988/);
  assert.match(afraid.line, /911/);
  assert.match(spiral.trusted, /trust/);
  const suite = fs.readFileSync(path.join(__dirname, "../ariel/suite/index.html"), "utf8");
  const file = fs.readFileSync(path.join(__dirname, "../ariel/suite/paths.js"), "utf8");
  assert.match(suite, /I'm afraid to stop/);
  assert.match(suite, /id="kind-add"/);
  assert.match(suite, /Add kindness/);
  assert.match(suite, /id="spiral-skip"/);
  assert.doesNotMatch(suite, /tel:|sms:/);
  assert.match(file, /===== PARAMS =====/);
  assert.match(file, /===== EQUATIONS =====/);
});

console.log(`\n${passed} passed`);
