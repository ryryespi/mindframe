// play-ui.js — screens for the Play games (logic in games.js).
// Everything is drawn with textContent. Only a count of games played is
// stored, and a Ground loop result only if you tap "Log as a Ground loop".

const GAMES_COUNT_KEY = "mindframe-games-played";
let playCtx = null;   // where the game's pieces come from
let play = null;      // the running game

const sampleArcs = Object.keys(Games.SAMPLES);

function el(tag, opts = {}, kids = []) {
  const node = document.createElement(tag);
  if (opts.cls) node.className = opts.cls;
  if (opts.text !== undefined) node.textContent = opts.text;
  if (opts.type) node.type = opts.type;
  if (opts.id) node.id = opts.id;
  if (opts.attrs) Object.entries(opts.attrs).forEach(([k, v]) => node.setAttribute(k, v));
  if (opts.onClick) node.addEventListener("click", opts.onClick);
  kids.forEach(k => node.appendChild(k));
  return node;
}

// ---------- Entry points ----------

function showPlay(name) {
  $("g-play-pick").classList.toggle("hidden", name !== "pick");
  $("g-play").classList.toggle("hidden", name !== "game");
}

function openPlayPick() {
  // Check every bit of text before anything is made.
  const probe = Games.make({ ...playCtx, type: "path", seed: 1 });
  if (probe.crisis) { showCrisis(); return; }
  $("gp-pick-tag").textContent = "Guide: " + probe.tag;
  $("gp-pick-note").textContent = playCtx.from === "sample"
    ? `Nothing written yet, so here is a sample thought: \u201C${playCtx.thought}\u201D`
    : playCtx.from === "story"
      ? "Made from your story. Nothing you typed is saved."
      : "Made from your words. Nothing you typed is saved.";
  $("gp-pick-other").classList.toggle("hidden", playCtx.from !== "sample");
  showPanel("play");
  showPlay("pick");
}

function newSample() {
  const prev = playCtx && playCtx.arc;
  const choices = sampleArcs.filter(a => a !== prev);
  const arc = choices[Math.floor(Math.random() * choices.length)];
  playCtx = { from: "sample", arc, thought: Games.SAMPLES[arc], read: Grounding.read(Games.SAMPLES[arc]) };
}

onCrisisReset(() => {
  playCtx = null;
  play = null;
  $("gp-stage").innerHTML = "";
});

// Play from the main box, or from a sample thought when the box is empty.
registerOutput("play", text => {
  if (text) playCtx = { from: "input", thought: text, read: Grounding.read(text) };
  else newSample();
  openPlayPick();
});

$("gp-pick-other").addEventListener("click", () => {
  newSample();
  openPlayPick();
});

// Play the story that is showing, with its reframe, step, and faith setting.
$("g-story-play").addEventListener("click", () => {
  if (!storyCtx) return;
  playCtx = { from: "story", read: storyCtx.read, thought: storyCtx.thought, reframe: storyCtx.reframe, step: storyCtx.step, faith: $("g-faith").checked };
  selectChip("play", false);
  openPlayPick();
});

document.querySelectorAll(".game-option").forEach(btn => {
  btn.addEventListener("click", () => startGame(btn.dataset.game));
});

// ---------- Running a game ----------

function startGame(type) {
  if (!playCtx) return;
  const game = Games.make({ ...playCtx, type, seed: Math.floor(Math.random() * 1e9) });
  if (game.crisis) { showCrisis(); return; }
  play = { game, i: 0, first: 0, retried: 0, missed: false, placed: [], logged: false };
  $("gp-tag").textContent = "Guide: " + game.tag;
  paintMeter();
  showPlay("game");
  renderStep();
}

function paintMeter() {
  const v = Games.steadiness(play.first, play.retried, play.game.steps);
  $("gp-meter-fill").style.width = v + "%";
  $("gp-meter").setAttribute("aria-valuenow", String(v));
  $("gp-meter-label").textContent = `Steadiness ${v}`;
  return v;
}

// Score the current step once: full if no miss, half after a retry.
function scoreStep() {
  if (play.missed) play.retried += 1;
  else play.first += 1;
  play.missed = false;
  paintMeter();
}

function stage(nodes, focusFirst = true) {
  const root = $("gp-stage");
  root.innerHTML = "";
  nodes.forEach(n => root.appendChild(n));
  const h = root.querySelector("h2");
  if (focusFirst && h) h.focus();
}

function nextButton(label, fn) {
  return el("button", { type: "button", cls: "primary", text: label, onClick: fn });
}

function renderStep() {
  const g = play.game;
  if (g.type === "path") return renderScene();
  if (g.type === "spot") return renderSpot();
  return renderTiles();
}

function renderScene() {
  const scene = play.game.scenes[play.i];
  const feedback = el("p", { cls: "feedback", attrs: { "aria-live": "polite" } });
  const choices = el("div", { cls: "options" });
  const next = nextButton(play.i === play.game.scenes.length - 1 ? "Finish" : "Next", () => {
    play.i += 1;
    if (play.i >= play.game.scenes.length) renderEnd(); else renderScene();
  });
  next.classList.add("hidden");
  scene.choices.forEach(c => {
    choices.appendChild(el("button", {
      type: "button", cls: "option", text: c.text,
      onClick: event => {
        const btn = event.currentTarget;
        feedback.textContent = c.feedback;
        if (c.grounded) {
          scoreStep();
          choices.querySelectorAll("button").forEach(b => { b.disabled = true; });
          btn.classList.add("chosen");
          next.classList.remove("hidden");
          next.focus();
        } else {
          play.missed = true;
          btn.disabled = true;
          btn.classList.add("tried");
        }
      },
    }));
  });
  if (play.game.fallback && play.i === 0) {
    feedback.textContent = "That sentence is long for word tiles, so here's a path game instead.";
  }
  stage([
    el("p", { cls: "quiet small", text: `${play.i + 1} of ${play.game.scenes.length}` }),
    el("h2", { text: scene.title, attrs: { tabindex: "-1" } }),
    el("p", { text: scene.text }),
    el("p", { cls: "quiet", text: scene.prompt }),
    choices, feedback, next,
  ]);
}

function renderSpot() {
  const item = play.game.items[play.i];
  const feedback = el("p", { cls: "feedback", attrs: { "aria-live": "polite" } });
  const row = el("div", { cls: "pair" });
  const next = nextButton(play.i === play.game.items.length - 1 ? "Finish" : "Next", () => {
    play.i += 1;
    if (play.i >= play.game.items.length) renderEnd(); else renderSpot();
  });
  next.classList.add("hidden");
  [["mirage", "Mirage"], ["real", "Real"]].forEach(([kind, label]) => {
    row.appendChild(el("button", {
      type: "button", cls: "chip big", text: label, attrs: { "data-kind": kind },
      onClick: event => {
        const btn = event.currentTarget;
        if (kind === item.kind) {
          feedback.textContent = `${label}. ${item.why}`;
          scoreStep();
          row.querySelectorAll("button").forEach(b => { b.disabled = true; });
          btn.setAttribute("aria-pressed", "true");
          next.classList.remove("hidden");
          next.focus();
        } else {
          play.missed = true;
          btn.disabled = true;
          feedback.textContent = `Not quite. ${item.why} Try the other one.`;
        }
      },
    }));
  });
  stage([
    el("p", { cls: "quiet small", text: `${play.i + 1} of ${play.game.items.length}` }),
    el("h2", { text: "Mirage or real?", attrs: { tabindex: "-1" } }),
    el("blockquote", { cls: "spot-line", text: item.text }),
    row, feedback, next,
  ]);
}

function renderTiles() {
  const g = play.game;
  const built = el("p", { cls: "built", attrs: { "aria-live": "polite", "aria-label": "Your sentence so far" } });
  const feedback = el("p", { cls: "feedback", attrs: { "aria-live": "polite" } });
  const tiles = el("div", { cls: "tiles" });
  const next = nextButton("Finish", renderEnd);
  next.classList.add("hidden");
  const paintBuilt = () => { built.textContent = play.placed.length ? play.placed.join(" ") : "\u00A0"; };
  g.tiles.forEach(t => {
    tiles.appendChild(el("button", {
      type: "button", cls: "tile", text: t.word,
      onClick: event => {
        const btn = event.currentTarget;
        if (Games.tileFits(g, play.placed.length, t.word)) {
          play.placed.push(t.word);
          btn.disabled = true;
          btn.classList.add("placed");
          scoreStep();
          feedback.textContent = "";
          paintBuilt();
          if (play.placed.length === g.target.length) {
            feedback.textContent = "That's the sentence. Say it once, slowly.";
            next.classList.remove("hidden");
            next.focus();
          }
        } else {
          play.missed = true;
          feedback.textContent = "Not that one yet. Which word comes next?";
        }
      },
    }));
  });
  paintBuilt();
  stage([
    el("h2", { text: "Rebuild the sentence", attrs: { tabindex: "-1" } }),
    el("p", { cls: "quiet", text: "Tap the words in order." }),
    built, tiles, feedback, next,
  ]);
}

function renderEnd() {
  const g = play.game;
  const value = paintMeter();
  const n = Number(localStorage.getItem(GAMES_COUNT_KEY) || 0) + 1;
  localStorage.setItem(GAMES_COUNT_KEY, String(n)); // a count only
  const logNote = el("p", { cls: "quiet small", attrs: { "aria-live": "polite" } });
  const log = el("button", {
    type: "button", cls: "text", text: "Log as a Ground loop",
    onClick: () => {
      if (play.logged) return;
      play.logged = true;
      const state = loadGround();
      const before = Grounding.currentG(state);
      const M = (playCtx.read && playCtx.read.suggestedM) || 0.5;
      const H = value / 100;
      const after = Grounding.updateG(before, M, H, 1);
      saveGround(Grounding.record(state, { G: after, M, H, r: 1, patterns: (playCtx.read && playCtx.read.patterns) || [], source: "game" }));
      log.disabled = true;
      logNote.textContent = `Logged. Groundedness ${Math.round(before * 100)} \u2192 ${Math.round(after * 100)}.`;
    },
  });
  const again = nextButton("Play another", () => { play = null; openPlayPick(); });
  stage([
    el("h2", { text: { path: "You found the real path", spot: "You spotted the mirages", tiles: "You rebuilt the sentence" }[g.type], attrs: { tabindex: "-1" } }),
    el("p", { cls: "g-result", text: `Steadiness ${value}` }),
    ...g.ending.map(line => el("p", { cls: "copyable", text: line })),
    log, logNote, again,
  ]);
}
