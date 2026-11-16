# The Rest State — a pause menu for the mind (prototype)

A portable **rest-state menu**: the interstitial between *playing* in an environment and *exiting* it. Like a game's pause menu, it lets a person collect their thoughts, then choose **Return**, **Dive elsewhere**, or **Exit**. It sits on top of any app that asks a lot of a human mind (VR, games, trading screens, control rooms, long study or coding sessions, social feeds).

Companion to the paper *The Rest State: A Portal Between Environments* (postulates by Ryan Espinosa; prototype by Grok Bot). Conceptual; not a medical device; no data leaves the browser.

## Files
- `rest-state.js` + `rest-state.css` — the reusable module (three.js riverbank-at-dawn rest space + menu + exit sequence).
- `index.html` — standalone rest state (full entry protocol, Enter VR).
- `host-demo.html` — a busy "host" environment with the menu embedded (Pause, I'm satisfied, Exit now, idle cue, witness call, Dive elsewhere between three environments).
- `witness.html` — same-device witness page.
- `vendor/` — three.js r160 (`three.module.js`, `OrbitControls.js`, `VRButton.js`), so it runs offline.

## Run
ES modules need http, not file://:

    cd app && python3 -m http.server 8080
    # http://localhost:8080/            standalone rest state
    # http://localhost:8080/host-demo.html   embedded in a host app
    # http://localhost:8080/witness.html     witness (same browser, same device)

WebXR "Enter VR" appears on browsers/headsets that support `immersive-vr` (needs https or localhost).

## Embed in your app
```html
<script type="importmap">{ "imports": { "three": "./vendor/three.module.js", "three/addons/": "./vendor/addons/" } }</script>
<script type="module">
  import { RestState } from './rest-state.js';
  function pause(extra = {}) {
    myApp.pause();
    RestState.open({
      host: true, allowReturn: true,               // show "Return"; final button closes the menu
      witnessName: 'Aunt Rosa', fact: 'The kitchen light is on',
      environments: [{ id: 'garden', label: 'Quiet Garden' }],  // enables "Dive elsewhere"
      loved: { on: true, text: 'Someone outside loves you.' },  // optional Loved Beyond anchor
      onReturn: () => myApp.resume(),
      onDive:   (id) => myApp.load(id),
      onExit:   ({ reason }) => myApp.save(),       // reason: return | satisfied | witness | hard
      onClose:  () => myApp.end(),
      onStateChange: (s) => console.log(s),         // rest | limit | readback | ground | done | closed
      ...extra,
    });
  }
  pauseButton.onclick = () => pause();
  satisfiedButton.onclick = () => pause({ start: 'exit', reason: 'satisfied' });
  exitButton.onclick = () => { pause(); RestState.hardExit(); };
</script>
```
API: `RestState.open(options)`, `RestState.close('return')`, `RestState.satisfied()`, `RestState.hardExit()`, `RestState.callBack()` (show a witness call), `RestState.state`, `RestState.isOpen`.

## States and triggers
`playing (host) → rest → return | dive | exit (limit → readback → ground → done) → closed`

Triggers: **user slows** (one soft cue, once, never a nag), **"I'm satisfied"** (a valid ending), **witness call**, **hard exit** (always visible; Esc; VR squeeze; never shamed).

## Components
Fixed reality watermark · persistent witness light · breathing light (5.5 breaths/min, inhale 40% / exhale 60%) · acceptance line ("You are resting. This is not your origin. You can stay as long as you need.") · limitation line ("You don't have to know. You are not the machine. You can rest.") · fade to a neutral return room · read-back ("Where are you?" / "Here." / "Heard.") · 5-4-3-2-1 outward grounding · confirmable-fact check · optional Loved Beyond memory anchor (text or photo, stored only in this browser's localStorage; opt-in because family memories can be painful for some) · optional soft WebAudio (off by default). No scores, no timers shown, no loss framing, no forced camera motion.

## Limits
- Witness link is same-device only (BroadcastChannel + localStorage). Cross-device needs a small relay server (not included).
- Not tested on a physical headset; WebXR paths were written to spec and checked only for errors in headless Chromium.
- Test helpers: `?capture` (keeps the acceptance prompt up), `?t=seconds` (breath phase offset), `?idle=ms` (soft-cue delay).
