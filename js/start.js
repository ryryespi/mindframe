// start.js — picks the first choice when the page opens. Loaded last.
//
// Old links still work: ?view=reflect|ground|journal|insights map to the new
// choices. ?chip=<choice> picks a choice directly, and ?thought=<text> fills
// the box and shows the answer (used for checks and screenshots).

const OLD_VIEWS = { equations: "equations", reflect: "coach", ground: "reframe", journal: "journal", insights: "insights", checkin: "checkin", play: "play", story: "story" };

(function start() {
  const params = new URLSearchParams(location.search);
  const fromLink = OLD_VIEWS[params.get("view")] || (CHIPS.includes(params.get("chip")) ? params.get("chip") : null);
  const saved = localStorage.getItem(CHIP_KEY);
  const chip = fromLink || (CHIPS.includes(saved) ? saved : "equations");
  const thought = params.get("thought");
  if (thought) $("thought").value = thought;
  // Show right away when there is something to show; otherwise a quiet hint.
  const run = !!thought || !!fromLink || !NEEDS_WORDS.has(chip);
  selectChip(chip, run);
})();
