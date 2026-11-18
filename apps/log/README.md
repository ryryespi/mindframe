# MindFrame Log

This is the long-term app: daily and moment logging, metric dashboards, weekly and monthly reports, and "time simulation" training driven by your own history. It runs offline and keeps all data on the device in `localStorage` under `mindframe.log.v1`. There's no account, server or tracking.

## Tabs
- **Today**
  - **Daily check-in (Peak Now).** Six 0–10 sliders: Here, Absorbed, Heard, Held, Done, Savored. Plus "Today's peak was…", sleep hours, an optional State Finder state, and counters for conversation pauses and repairs.
  - **Log a moment.** Energy × stress state, the technique you used, distress before and after, and a note.
  - **Recent entries** (you can delete them) and any **early-warning flags**.
- **Trends**
  - Peak Now daily with a 7-day rolling average.
  - Weekly trend: Peak Now, stress, sleep.
  - Sleep, with a 7-day average.
  - State-frequency 4×4 heatmap.
  - Technique effectiveness: mean drop in distress (before − after) with n.
  - Peak Now items by week.
  - KPIs.
  - Range options: 4 weeks, 12 weeks or 1 year.
- **Reports**
  - Weekly or monthly, with ‹ › to change the period.
  - Includes deltas vs the previous period, item table, top states, techniques, the peaks you wrote down, suggestions and flags.
  - **Print / save as PDF** uses a print stylesheet.
- **Training** (time simulation, all driven by your log)
  - **Replay a high-load time.** Finds your highest-stress weekday and hour (for example "Tuesday 4 pm, avg 3.5/4 over 4 logs"). Then: 20 s of picturing the scene, 10 s of noticing it in your body, 90 s of your most effective technique, and a before/after rating that's saved as a drill.
  - **Timed rest drill.** 2, 5 or 10 minutes of paced breathing (5.5 breaths/min), with before/after ratings.
  - **Pacing simulation.** A waking-day energy model (7 am–11 pm, 15-minute steps). The hourly load comes from your logged stress. Your chosen rest half-hours are compared against:
    - **Hysteresis**: rest early, while load is low, and stay until restored.
    - **Freeze at the peak**.
    - **One-threshold** switching.
    - It reports lowest and ending energy, rest hours, switches, "rest started at peak" and deferred load.
    - "Play the day" animates it.
  - **Thermostat drill (live).** The day plays at 1 s = 15 minutes. You tap Rest and Return yourself, then compare against hysteresis.
  - **Suggestions from your history.** All clearly labeled heuristic and not medical:
    - pre-rest before high-load slots
    - your clearest hour
    - sleep vs Peak Now
    - best technique
    - pauses and repairs
    - your lowest weekday
- **Data**
  - **Example data** toggle: 90 made-up days, with an "EXAMPLE DATA" banner and tag everywhere. Your real log is untouched and saving is paused.
  - JSON and CSV export.
  - Import of JSON, CSV or MindFrame Now `.json` files, with duplicates skipped.
  - Theme setting.
  - Delete all (double confirm).

## Early-warning flags (prompts, not diagnoses)
Each flag ends with "Consider talking to your support person," and the page shows the 988 note. Thresholds are in `core.js` → `flags()`:
- under 5 h sleep on 3 or more of the last 7 days
- sleep down 2 h or more vs. the previous 4 weeks
- Energy 4 with stress 3 or higher on 3 or more of 7 days
- under 6 h sleep with Energy 4 on 2 or more days
- 3 or more Paralyzed, Survival or Burnout states in 7 days
- "Here" averaging 3 or less this week

## Model notes
The pacing model is a toy based on the O~3 simulations, not a prediction:
- Rest started under high load is shallow, and that work is deferred.
- Every switch has a settling cost.
- Hysteresis (enter below 55 or before a coming peak, exit at 85) cuts switching sharply compared with a single threshold (the unit test requires at least 60% fewer).
- No strategy rescues a short-sleep, high-load day. That is itself a useful lesson.

## Files
- `index.html`, `app.css`, `app.js`: UI and print CSS.
- `core.js`: pure metrics, reports, flags, CSV/JSON, the pacing simulation and the example generator. UMD format, so it runs in Node.
- `charts.js`: dependency-free SVG line, bar and heatmap charts.
- `manifest.webmanifest`, `sw.js`, `icons/`: installable, offline PWA.
- `tests/core.test.js`: run `node --test log/tests/*.test.js`.

## Shared data format (`mindframe-log/1`)
`{ schema, id, ts (ISO), type: daily|event|now|drill, source, energy 1-4, stress 1-4, stateKey "e-s", peak{here,absorbed,heard,held,done,savored 0-10}, line, sleepHours, pauses, repairs, techniques[{id,before,after}], mood, focus, context, note, drill{kind,detail} }`

Not medical advice. In crisis, call or text 988 (US) or 911. All credit and glory to God.
