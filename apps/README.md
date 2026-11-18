# MindFrame apps: Now + Log

Two new standalone, offline, installable web apps (PWAs). Each is a folder of static files with no build step, no server, no external API and no external fonts or CDNs.

| App | Use | Data |
|---|---|---|
| `now/`: **MindFrame Now** | You pick a state and get an affirmation, words, a quote and a grounding step in under 60 s. The content is bundled, so it never needs updates. | Preferences only. "Save to log" is optional. |
| `log/`: **MindFrame Log** | Long-term logging, metrics, weekly and monthly reports, and time-simulation training. | `localStorage` on the device. JSON and CSV export/import. |

**Hand-off.** Copy `now/` and `log/` into the site, for example `mindframe/apps/now/` and `mindframe/apps/log/`. Keeping both on the same origin lets Now hand entries straight to Log. Nothing in the existing apps was modified.

**Tests.** From this folder:
- `node --test now/tests/*.test.js log/tests/*.test.js`
- Headless browser check: `tools/e2e.mjs`. It needs `puppeteer-core` and Chrome; serve this folder on port 8811 first.

**Screenshots** are in `screenshots/`, including a printed sample report PDF.

Not medical advice. In crisis, call or text 988 (US) or 911. All credit and glory to God.
