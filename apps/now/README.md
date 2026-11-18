# MindFrame Now

You pick a state and get one card right away. It takes less than a minute, works fully offline, and never needs updates because all the content is bundled in the app.

## What it does
1. **Pick your state** using the State Finder grid: Energy (Resting, Cruising, Active, Pushing Hard) × Stress (Calm, Alert, Tense, Overwhelmed). That gives 16 states.
   - Optional extras: Mood (Heavy, Okay, Light), Focus (Looping, Scattered, Clear), and Right now I'm (Alone, With someone, In a hard conversation).
2. **The card appears as soon as both chips are picked.** The headless test measured about 0.1 s. Each card has:
   - **The state narrative**, taken word for word from State Finder.
   - **A matched affirmation**, built from the MindFrame affirmation templates. A heavy mood gets a "both/and" line. Faith lines are optional.
   - **Two words** from Ariel Words, each with its meaning and its closing line.
   - **One quote** from the Ariel quote set. A faith toggle turns off Scripture (quotes marked `requiresBelief`).
   - **One grounding technique** with steps, a timer and the basis for it:
     - Close the Loop (Box 4)
     - Read-Back
     - Pre-Technological Anchor ("Breath, stone, home")
     - Rest State 60-second breath, with a link to the live Rest State app
     - Drop · Press · Snap
     - Reach one person
     - One Thought, One Act
     - Shared Pause + Repair
     - 5-4-3-2-1
3. **Safety.** Paralyzed (1-4), Survival Mode (2-4) and Total Burnout Alert (4-4) always go to "Reach one person", with a 988/911 note. Modifiers can't override this.
4. **Save to log (optional).** You can add a before and after distress rating (0–10), then either:
   - **Save to MindFrame Log**: writes to the shared `localStorage` key `mindframe.inbox.v1`. MindFrame Log imports it automatically when both apps are served from the same origin, for example `ryryespi.github.io/mindframe/apps/now` and `/apps/log`.
   - **Download .json**: a `mindframe-log/1` bundle you can import in MindFrame Log → Data.

## How the mapping works
`logic.js` is pure code and runs in Node as well as the browser:
- `stateKey(energy, stress)` returns `${energy}-${stress}`. This fixes the Drive State Finder bug, where `` `$energyVal-${stressVal}` `` was missing `${…}` and every lookup returned undefined.
- `buildCard()` picks the technique in this order: care state → conflict → looping → scattered → with someone → the state's default.
- Quotes and affirmations are chosen deterministically per day, so the card doesn't change every time you open it.

## Files
- `index.html`, `app.css`, `app.js`: the UI, in the MindFrame palette with light/dark themes. It respects reduced-motion settings and uses no external fonts or assets.
- `content.js`: all bundled content.
  - 16 State Finder narratives
  - 11 Ariel words
  - 43 quotes
  - affirmation templates
  - 9 techniques
- `logic.js`: lookup and matching.
- `manifest.webmanifest`, `sw.js` (cache-first offline), `icons/`: installable PWA.
- `tests/logic.test.js`: run `node --test now/tests/*.test.js` from the `mindframe-apps` folder.

## Install
To install it on a Pixel, open the site in Chrome, then ⋮ → **Add to Home screen / Install app**. On desktop Chrome or Edge, use the install icon in the address bar.

It needs to be served over https or localhost (GitHub Pages works). Opening it as a `file://` page works too, but without install or offline caching.

If you change any file, bump `VERSION` in `sw.js` so installed copies refresh.

Not medical advice. In crisis, call or text 988 (US) or 911. All credit and glory to God.
