// rest-state.js — a portable "rest-state menu": the interstitial between playing in an
// environment and exiting it. Embed in any app, game, VR scene, or high-load tool.
//   import { RestState } from './rest-state.js';
//   RestState.open({ witnessName, fact, allowReturn: true, onReturn, onExit, onStateChange });
// States: playing (host) -> rest -> return (back to host) | exit (limit -> readback -> ground -> done).
// Triggers (host or module): user slows (one soft cue), "I'm satisfied", witness call, hard exit.
// Design rules: no scores, no timers shown, no loss framing, no forced camera motion,
// a fixed reality watermark, a persistent witness light, a hard exit always visible.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { VRButton } from 'three/addons/VRButton.js';

const MARKUP = `
<div id="scene" aria-hidden="true"></div>

<!-- Fixed reality watermark: never moves, never fades -->
<div id="watermark" role="note">SIMULATED REST STATE · NOT YOUR ORIGIN</div>

<!-- Persistent witness light -->
<button id="witness" class="witness off" type="button" aria-live="polite" title="Your witness light">
  <span class="dot" aria-hidden="true"></span><span id="witnessLabel">Witness: not connected</span>
</button>

<!-- Entry protocol -->
<section id="entry" class="card" aria-labelledby="entryTitle">
  <h1 id="entryTitle">Before you rest</h1>
  <p class="soft">Write your way out while you are calm. This place keeps no clock and no score.</p>
  <label>Your witness (a living person)
    <input id="witnessName" type="text" maxlength="40" placeholder="e.g. Aunt Rosa" autocomplete="off">
  </label>
  <label>One fact someone else can confirm in your real room
    <input id="fact" type="text" maxlength="80" placeholder="e.g. The kitchen light is on" autocomplete="off">
  </label>
  <details id="lovedBox"><summary>Loved Beyond — a memory anchor (optional, private)</summary>
    <label class="inline"><input type="checkbox" id="lovedOn"> Show it softly in the rest space</label>
    <label>A line from someone who loves you
      <input id="lovedText" type="text" maxlength="90" placeholder="Someone outside loves you." autocomplete="off">
    </label>
    <label>Or a photo (stays on this device only)
      <input id="lovedImg" type="file" accept="image/*">
    </label>
    <p class="fine">Saved only in this browser, never uploaded. If family memories are painful right now, leave this off, or choose any person, pet, or place that feels safe.</p>
  </details>
  <ul class="checks">
    <li><label><input type="checkbox" id="chkTimer"> I set a timer on another device (outside this app).</label></li>
    <li><label><input type="checkbox" id="chkAnchor"> I'm holding a real object — my touch anchor.</label></li>
    <li><label><input type="checkbox" id="chkBlind"> One sense stays in my real room (sound, floor, or air).</label></li>
  </ul>
  <p class="ritual">Entry ritual: three slow breaths with eyes open in your real room. Name your anchor aloud — <em>breath, stone, home.</em></p>
  <div class="row">
    <label class="toggle"><input type="checkbox" id="soundOpt"> Soft sound (off by default)</label>
  </div>
  <button id="enterBtn" class="primary" type="button">Enter the rest state</button>
  <p class="fine">Optional: open <a href="witness.html" target="_blank" rel="noopener">witness.html</a> in another tab on this device for your witness. If you're in crisis, call or text <strong>988</strong> (US).</p>
</section>

<!-- Acceptance prompt -->
<div id="accept" class="accept hidden" role="status">
  <p>You are resting.</p><p>This is not your origin.</p><p>You can stay as long as you need.</p>
</div>

<!-- Breath cue text (subtle) -->
<div id="breathCue" class="breathcue hidden" aria-live="off">breathe in</div>

<!-- Single soft cue when the user slows (once per session; never a nag) -->
<div id="softCue" class="softcue hidden" role="status">Rest is here. If you feel satisfied, that is an allowed ending.</div>

<!-- Witness call notice -->
<div id="callNotice" class="notice hidden" role="alert">
  <p><span id="callWho">Your witness</span> is calling you back.</p>
  <button id="callReturn" class="primary" type="button">Begin return</button>
  <button id="callStay" type="button">A little longer</button>
</div>

<!-- Dive elsewhere chooser -->
<div id="divePanel" class="card small hidden" role="dialog" aria-label="Dive elsewhere">
  <h2>Dive elsewhere</h2>
  <p class="soft">Collected? Choose your next environment. Your exit rules come with you.</p>
  <div id="diveList"></div>
  <button id="diveClose" type="button">Stay resting</button>
</div>

<!-- Reality checks panel -->
<div id="checksPanel" class="card small hidden" role="dialog" aria-label="Reality checks">
  <h2>Physics checks</h2>
  <ol>
    <li>Look away, then back: the far hills have not changed.</li>
    <li>Read this line twice: it says the same thing both times.</li>
    <li>The light always comes from the dawn on your left; shadows never jump.</li>
    <li>Nothing here smells. Your real room does — that is your tell.</li>
  </ol>
  <button id="checksClose" type="button">Close</button>
</div>

<!-- Persistent controls -->
<nav id="controls" class="hidden" aria-label="Rest state controls">
  <button id="breathBtn" type="button" aria-pressed="true">Breath guide: on</button>
  <button id="soundBtn" type="button" aria-pressed="false">Sound: off</button>
  <button id="checksBtn" type="button">Reality check</button>
  <button id="satisfiedBtn" type="button" title="Satisfaction is an allowed ending">I'm satisfied</button>
</nav>
<div id="exits" class="hidden">
  <button id="playBtn" class="hidden" type="button">Return</button>
  <button id="diveBtn" class="hidden" type="button">Dive elsewhere</button>
  <button id="returnBtn" class="primary" type="button">Begin return</button>
  <button id="hardExit" class="hard" type="button" title="Leave immediately. Always allowed.">Exit now</button>
</div>

<!-- Exit sequence -->
<section id="exitSeq" class="card hidden" aria-live="polite">
  <div id="stepLimit" class="step">
    <p class="big">You don't have to know.</p>
    <p class="big">You are not the machine.</p>
    <p class="big">You can rest.</p>
    <button class="primary next" type="button" data-next="stepReadback">Continue</button>
  </div>
  <div id="stepReadback" class="step hidden">
    <p class="big">Where are you?</p>
    <button id="hereBtn" class="primary" type="button">Here.</button>
    <p id="heard" class="heard hidden">Heard.</p>
    <p id="heardNote" class="fine hidden"></p>
    <button id="toGround" class="next hidden" type="button" data-next="stepGround">Continue</button>
  </div>
  <div id="stepGround" class="step hidden">
    <p class="fine">In your real room, outward:</p>
    <p id="groundText" class="big"></p>
    <button id="groundNext" class="primary" type="button">Next</button>
  </div>
  <div id="stepDone" class="step hidden">
    <p id="factCheck" class="big"></p>
    <p>Take off the headset or look up from the screen. Turn to someone.</p>
    <p id="lovedDone" class="hidden"></p>
    <p class="closure">Nothing left to seek this session. Done. Here.</p>
    <p class="fine">If you're in crisis, call or text <strong>988</strong> (Suicide &amp; Crisis Lifeline, US). For immediate danger, call 911.</p>
    <button id="againBtn" type="button">Return to rest</button>
  </div>
</section>

<div id="fade" aria-hidden="true"></div>
`;

let root = null, api = null, isOpen = false, cfg = {};
let lastState = null, exitFired = false, exitReason = 'return';

function ensureCSS() {
  if (document.querySelector('link[data-rest-state]')) return;
  const l = document.createElement('link'); l.rel = 'stylesheet'; l.dataset.restState = '';
  l.href = new URL('./rest-state.css', import.meta.url).href; document.head.appendChild(l);
}

function init() {
  ensureCSS();
  root = document.createElement('div'); root.className = 'rs-root rs-closed'; root.innerHTML = MARKUP;
  (cfg.container || document.body).appendChild(root);


  const $ = (id) => root.querySelector('#' + id);
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const params = new URLSearchParams(location.search);

  // ---------- Breath pacing: 5.5 breaths/min, inhale 40% / exhale 60% ----------
  const BPM = 5.5, CYCLE = 60 / BPM, INHALE = CYCLE * 0.4;
  function breathPhase(t) { // returns 0..1 expansion and label
    const c = t % CYCLE;
    if (c < INHALE) { const x = c / INHALE; return { v: 0.5 - 0.5 * Math.cos(Math.PI * x), label: 'breathe in' }; }
    const x = (c - INHALE) / (CYCLE - INHALE); return { v: 0.5 + 0.5 * Math.cos(Math.PI * x), label: 'breathe out' };
  }

  // ---------- Renderer / scene ----------
  const container = $('scene');
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: params.has('capture') });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local-floor');
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const DAWN_HORIZON = new THREE.Color(0xf6c79a), DAWN_TOP = new THREE.Color(0x3d5a8a);
  scene.fog = new THREE.Fog(0xe9c4a6, 40, 620);

  const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.05, 1200);
  // User rig sits under the shelter (refuge), facing the open river view (prospect).
  const rig = new THREE.Group(); scene.add(rig); // desktop: rig at origin, camera at the shelter
  rig.add(camera); camera.position.set(0, 1.25, 6.001);

  // Sky dome with a soft dawn gradient and a low sun on the left.
  const sunDir = new THREE.Vector3(-0.75, 0.1, -0.65).normalize();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: DAWN_TOP }, horizon: { value: DAWN_HORIZON }, sunDir: { value: sunDir } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: `uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDir; varying vec3 vDir;
      void main(){ float h = clamp(vDir.y, -0.2, 1.0);
        vec3 col = mix(horizon, top, pow(max(h,0.0), 0.55));
        col = mix(col, vec3(0.93,0.78,0.68), smoothstep(0.0,-0.2,h));
        float s = max(dot(normalize(vDir), sunDir), 0.0);
        col += vec3(1.0,0.82,0.55) * (pow(s, 900.0)*1.4 + pow(s, 12.0)*0.25);
        gl_FragColor = vec4(col,1.0);} `
  }));
  scene.add(sky);

  scene.add(new THREE.HemisphereLight(0xffe2c4, 0x45503a, 0.9));
  const sun = new THREE.DirectionalLight(0xffd2a0, 1.6); sun.position.copy(sunDir).multiplyScalar(100); scene.add(sun);

  // ---------- Terrain: gentle banks on both sides of a slow river ----------
  function hash(n) { return Math.abs(Math.sin(n * 127.1) * 43758.5453) % 1; }
  function noise1(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i) * (1 - u) + hash(i + 1) * u; }
  function fbm(x, oct = 5) { let a = 0.5, s = 0, f = 1; for (let i = 0; i < oct; i++) { s += a * noise1(x * f); f *= 2; a *= 0.5; } return s; }
  function noise2(x, z) { return (noise1(x * 0.9 + z * 1.7) + noise1(z * 0.8 - x * 1.3)) * 0.5; }

  const RIVER_Z = -14, RIVER_W = 16; // river runs along x, centered at z = RIVER_Z
  const groundGeo = new THREE.PlaneGeometry(400, 300, 160, 120); groundGeo.rotateX(-Math.PI / 2);
  const gp = groundGeo.attributes.position, gcol = [];
  const cNear = new THREE.Color(0x7d8c55), cFar = new THREE.Color(0x8a8a5c), cSand = new THREE.Color(0xc2a77f);
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i), z = gp.getZ(i);
    const d = Math.abs(z - RIVER_Z);
    let y = d < RIVER_W / 2 ? -1.2 : (Math.min(d - RIVER_W / 2, 12) / 12) * 0.9 - 0.3;
    y += (noise2(x * 0.05, z * 0.05) - 0.5) * 1.2 * Math.min(1, Math.max(0, (d - RIVER_W / 2) / 10));
    if (z > 2 && z < 12 && Math.abs(x) < 6) y = Math.max(y, 0) * 0.2; // flat refuge pad
    gp.setY(i, y);
    const c = d < RIVER_W / 2 + 2.5 ? cSand.clone() : cNear.clone().lerp(cFar, Math.min(1, d / 120));
    gcol.push(c.r, c.g, c.b);
  }
  groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(gcol, 3)); groundGeo.computeVertexNormals();
  scene.add(new THREE.Mesh(groundGeo, new THREE.MeshLambertMaterial({ vertexColors: true })));

  // River surface: slow ripples, reflects the dawn.
  const waterMat = new THREE.ShaderMaterial({
    transparent: true, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { t: { value: 0 }, horizon: { value: DAWN_HORIZON }, top: { value: DAWN_TOP } }]),
    vertexShader: `
      #include <fog_pars_vertex>
      varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz;
      vec4 mvPosition = viewMatrix*w; gl_Position = projectionMatrix*mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `
      #include <fog_pars_fragment>
      uniform float t; uniform vec3 horizon; uniform vec3 top; varying vec2 vUv; varying vec3 vW;
      void main(){ float r = sin(vW.x*0.45 + t*0.25)*0.5 + sin(vW.x*1.3 - vW.z*0.7 + t*0.4)*0.25 + sin(vW.z*2.1 + t*0.33)*0.15;
        vec3 col = mix(vec3(0.36,0.48,0.66), horizon, 0.42 + r*0.12);
        float glint = smoothstep(0.82, 1.0, r) * 0.25; col += vec3(1.0,0.85,0.6)*glint;
        gl_FragColor = vec4(col, 0.93);
        #include <fog_fragment>
        }`
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(400, RIVER_W + 2, 1, 1), waterMat);
  water.rotation.x = -Math.PI / 2; water.position.set(0, -0.55, RIVER_Z); scene.add(water);

  // Distant hills: fractal (fBm) silhouettes, mid-range fractal dimension (calming).
  function hillLayer(dist, height, color, seed) {
    const shape = new THREE.Shape(); const W = 900, N = 220;
    shape.moveTo(-W / 2, -10);
    for (let i = 0; i <= N; i++) { const x = -W / 2 + (i / N) * W; shape.lineTo(x, fbm(i * 0.035 + seed, 5) * height); }
    shape.lineTo(W / 2, -10); shape.closePath();
    const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color, fog: true }));
    m.position.set(0, -1, -dist); scene.add(m);
  }
  hillLayer(330, 70, 0x9a8aa0, 3.1); hillLayer(230, 48, 0x7f7f86, 9.7); hillLayer(150, 30, 0x5f6e5c, 17.3);

  // Trees: grove behind and beside the shelter (refuge), scattered across the river.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5a4632 });
  const leafMats = [0x4f6b3e, 0x5d7845, 0x46603a].map((c) => new THREE.MeshLambertMaterial({ color: c }));
  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 2.2, 6), leafGeo = new THREE.ConeGeometry(1.1, 3.2, 8), crownGeo = new THREE.IcosahedronGeometry(1.3, 1);
  const sway = [];
  function tree(x, z, s = 1, round = false, k = 0) {
    const g = new THREE.Group(); const tr = new THREE.Mesh(trunkGeo, trunkMat); tr.position.y = 1.1; g.add(tr);
    const lf = new THREE.Mesh(round ? crownGeo : leafGeo, leafMats[k % 3]); lf.position.y = round ? 3.0 : 3.3; g.add(lf);
    g.position.set(x, 0, z); g.scale.setScalar(s); scene.add(g); sway.push({ g, p: hash(x * 3 + z) * 6.28 });
  }
  for (let i = 0; i < 26; i++) { const a = i * 2.4; const r = 6 + (i % 7) * 1.6; tree(Math.cos(a) * r, 14 + Math.abs(Math.sin(a)) * r * 0.7, 0.9 + hash(i) * 0.6, i % 3 === 0, i); }
  for (let i = 0; i < 40; i++) { const x = -120 + i * 6 + hash(i + 9) * 4; tree(x, RIVER_Z - RIVER_W / 2 - 4 - hash(i) * 30, 1 + hash(i + 2), i % 2 === 0, i); }
  for (let i = 0; i < 14; i++) { const x = (i < 7 ? -1 : 1) * (9 + hash(i + 5) * 30); tree(x, 2 + hash(i + 7) * 10, 1 + hash(i + 1) * 0.5, i % 2 === 1, i); }

  // Shelter: four posts and a low roof — the refuge you sit under.
  const wood = new THREE.MeshLambertMaterial({ color: 0x7a5a3c });
  const shelter = new THREE.Group();
  [[-1.8, -1.4], [1.8, -1.4], [-1.8, 1.6], [1.8, 1.6]].forEach(([x, z]) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.5, 0.16), wood); p.position.set(x, 1.25, z); shelter.add(p); });
  const roof = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.12, 4.0), new THREE.MeshLambertMaterial({ color: 0x6b4e33 }));
  roof.position.set(0, 2.55, 0.1); roof.rotation.x = 0.08; shelter.add(roof);
  const bench = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.1, 0.5), wood); bench.position.set(0, 0.45, 0.6); shelter.add(bench);
  shelter.position.set(0, 0, 6); scene.add(shelter);
  // River stones near the bank (a touch-anchor echo).
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x9b958a });
  for (let i = 0; i < 12; i++) { const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25 + hash(i) * 0.35, 0), stoneMat); s.position.set(-6 + i * 1.1 + hash(i + 3), -0.15, RIVER_Z + RIVER_W / 2 + 0.6 + hash(i + 8) * 1.5); s.rotation.set(hash(i), hash(i + 1), 0); scene.add(s); }

  // Drifting motes ("never empty"), very slow.
  const MOTES = reduceMotion ? 0 : 60; const moteGeo = new THREE.BufferGeometry(); const mp = new Float32Array(MOTES * 3);
  for (let i = 0; i < MOTES; i++) { mp[i * 3] = (hash(i) - 0.5) * 30; mp[i * 3 + 1] = 0.5 + hash(i + 1) * 3; mp[i * 3 + 2] = -6 + (hash(i + 2) - 0.5) * 20; }
  moteGeo.setAttribute('position', new THREE.BufferAttribute(mp, 3));
  const motes = new THREE.Points(moteGeo, new THREE.PointsMaterial({ color: 0xfff0c8, size: 0.06, transparent: true, opacity: 0.7, depthWrite: false }));
  scene.add(motes);

  // Breathing light: a soft orb over the water that expands with inhale and contracts with exhale.
  function glowTexture() { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,244,220,1)'); r.addColorStop(0.25, 'rgba(255,214,160,0.75)'); r.addColorStop(1, 'rgba(255,190,120,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); }
  const glowTex = glowTexture();
  const breathOrb = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, fog: false }));
  breathOrb.position.set(0, 1.6, 2.5); scene.add(breathOrb);
  const breathRing = new THREE.Mesh(new THREE.RingGeometry(0.98, 1.0, 64), new THREE.MeshBasicMaterial({ color: 0xffe7c4, transparent: true, opacity: 0.35, side: THREE.DoubleSide, fog: false }));
  breathRing.position.copy(breathOrb.position); scene.add(breathRing);

  // ---------- Loved Beyond: optional, user-set memory anchor (local only) ----------
  const LOVED_KEY = 'rs-loved';
  let loved = { on: false, text: '', img: '' };
  try { loved = Object.assign(loved, JSON.parse(localStorage.getItem(LOVED_KEY) || '{}')); } catch (e) {}
  const lovedCard = new THREE.Group();
  const lovedFrame = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.5), new THREE.MeshLambertMaterial({ color: 0x7a5a3c }));
  const lovedFace = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.44), new THREE.MeshBasicMaterial({ fog: false, transparent: true }));
  lovedFace.position.z = 0.005; lovedCard.add(lovedFrame, lovedFace);
  lovedCard.position.set(-1.6, 0.95, 3.6); lovedCard.scale.setScalar(0.85); lovedCard.lookAt(0, 1.2, 6); lovedCard.visible = false; scene.add(lovedCard);
  function lovedTextTexture(line) {
    const c = document.createElement('canvas'); c.width = 560; c.height = 440; const g = c.getContext('2d');
    const grd = g.createLinearGradient(0, 0, 0, 440); grd.addColorStop(0, '#fbf1e2'); grd.addColorStop(1, '#f1dcc0'); g.fillStyle = grd; g.fillRect(0, 0, 560, 440);
    g.fillStyle = '#5b4632'; g.textAlign = 'center'; g.font = 'italic 300 38px Georgia, serif';
    const words = line.split(' '); const lines = []; let cur = '';
    words.forEach((w) => { if (g.measureText(cur + ' ' + w).width > 470) { lines.push(cur.trim()); cur = w; } else cur += ' ' + w; }); lines.push(cur.trim());
    lines.forEach((l, i) => g.fillText(l, 280, 220 + (i - (lines.length - 1) / 2) * 50));
    g.font = '300 20px -apple-system, Segoe UI, sans-serif'; g.fillStyle = '#9a7b5c'; g.fillText('loved beyond this place', 280, 405);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  function applyLoved() {
    const show = loved.on && (loved.text || loved.img || true);
    if (!show) { lovedCard.visible = false; return; }
    if (loved.img) { new THREE.TextureLoader().load(loved.img, (t) => { t.colorSpace = THREE.SRGBColorSpace; lovedFace.material.map = t; lovedFace.material.needsUpdate = true; }); }
    else { lovedFace.material.map = lovedTextTexture(loved.text || 'Someone outside loves you.'); lovedFace.material.needsUpdate = true; }
    lovedCard.visible = true;
  }
  function saveLoved() { try { localStorage.setItem(LOVED_KEY, JSON.stringify(loved)); } catch (e) { /* quota: keep in memory only */ } }
  function downscale(file, cb) { const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = () => { const k = Math.min(1, 640 / Math.max(im.width, im.height)); const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); cb(c.toDataURL('image/jpeg', 0.82)); }; im.src = r.result; }; r.readAsDataURL(file); }

  // ---------- In-headset HUD: watermark + witness light attached to the camera ----------
  function textTexture(lines, w = 1024, h = 256, size = 54, color = '#f4efe6', bg = 'rgba(0,0,0,0)') {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `300 ${size}px -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`;
    lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.3));
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const hud = new THREE.Group(); camera.add(hud);
  const wmMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.05), new THREE.MeshBasicMaterial({ map: textTexture(['SIMULATED REST STATE · NOT YOUR ORIGIN'], 1024, 100, 44, 'rgba(255,255,255,0.75)'), transparent: true, depthTest: false, fog: false }));
  wmMesh.position.set(-0.32, 0.3, -1); wmMesh.renderOrder = 999; hud.add(wmMesh);
  const hudWitness = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffb45a, transparent: true, depthTest: false, fog: false }));
  hudWitness.position.set(0.42, 0.3, -1); hudWitness.scale.setScalar(0.05); hudWitness.renderOrder = 999; hud.add(hudWitness);
  hud.visible = false; // shown only inside XR (HTML overlay covers desktop)

  // In-world VR panels (acceptance + exit steps), clickable with a controller ray.
  const vrPanel = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.55), new THREE.MeshBasicMaterial({ transparent: true, fog: false }));
  vrPanel.position.set(0, 1.55, 4.0); vrPanel.visible = false; scene.add(vrPanel);
  const vrButtons = [];
  function vrButton(label, x, y, onSelect) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.14), new THREE.MeshBasicMaterial({ map: textTexture([label], 512, 140, 56, '#1b2233', 'rgba(255,214,160,0.92)'), fog: false }));
    m.position.set(x, y, 4.02); m.userData.onSelect = onSelect; m.visible = false; scene.add(m); vrButtons.push(m); return m; }
  function setVRPanel(lines) { vrPanel.material.map = textTexture(lines, 1024, 352, 50, '#f4efe6', 'rgba(24,28,38,0.72)'); vrPanel.material.needsUpdate = true; vrPanel.visible = renderer.xr.isPresenting; }
  const vrReturn = vrButton('Begin return', -0.3, 1.12, () => beginReturn());
  const vrExit = vrButton('Exit now', 0.3, 1.12, () => hardExit());
  const vrNext = vrButton('Continue', 0, 1.12, () => vrAdvance());
  function showVRButtons(...btns) { vrButtons.forEach((b) => (b.visible = false)); if (renderer.xr.isPresenting) btns.forEach((b) => (b.visible = true)); }

  const raycaster = new THREE.Raycaster(); const tmpM = new THREE.Matrix4();
  for (let i = 0; i < 2; i++) {
    const ctrl = renderer.xr.getController(i); rig.add(ctrl);
    const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
    const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xffe2bd, transparent: true, opacity: 0.5 })); line.scale.z = 3; ctrl.add(line);
    ctrl.addEventListener('select', () => { tmpM.identity().extractRotation(ctrl.matrixWorld); raycaster.ray.origin.setFromMatrixPosition(ctrl.matrixWorld); raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tmpM);
      const hit = raycaster.intersectObjects(vrButtons.filter((b) => b.visible))[0]; if (hit) hit.object.userData.onSelect(); });
    ctrl.addEventListener('squeeze', () => hardExit()); // squeeze = hard exit, always
  }

  // ---------- Neutral return room (passthrough-like plain view) ----------
  const returnScene = new THREE.Scene(); returnScene.background = new THREE.Color(0xd8d4cc);
  returnScene.add(new THREE.HemisphereLight(0xffffff, 0xbdb7ac, 1.2));
  const room = new THREE.Mesh(new THREE.BoxGeometry(8, 3.2, 8), new THREE.MeshLambertMaterial({ color: 0xe4e0d8, side: THREE.BackSide }));
  room.position.set(0, 1.6, 6); returnScene.add(room);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshLambertMaterial({ color: 0xc9c2b6 })); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0.01, 6); returnScene.add(floor);
  const doorway = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.1), new THREE.MeshLambertMaterial({ color: 0xf6f3ee })); doorway.position.set(0, 1.05, 2.02); returnScene.add(doorway);
  let activeScene = scene;

  // ---------- Desktop / touch look-around: rotate only, no forced motion ----------
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = false; controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = 0.06;
  controls.rotateSpeed = -0.35; // drag to look (first-person feel)
  camera.position.set(0, 1.25, 6.001); controls.target.set(0, 1.25, 6);
  controls.minPolarAngle = Math.PI * 0.32; controls.maxPolarAngle = Math.PI * 0.62;
  controls.update();
  let lastInput = performance.now(); let idleCueShown = false;
  ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'].forEach((ev) => addEventListener(ev, () => (lastInput = performance.now()), { passive: true }));

  if (cfg.vr) root.appendChild(VRButton.createButton(renderer));
  renderer.xr.addEventListener('sessionstart', () => { hud.visible = true; controls.enabled = false; rig.position.set(0, 0, 6); if (state === 'rest') { setVRPanel(['You are resting.', 'This is not your origin.', 'You can stay as long as you need.']); showVRButtons(vrReturn, vrExit); } });
  renderer.xr.addEventListener('sessionend', () => { hud.visible = false; controls.enabled = true; rig.position.set(0, 0, 0); camera.position.set(0, 1.25, 6.001); controls.target.set(0, 1.25, 6); controls.update(); vrPanel.visible = false; showVRButtons(); });

  // ---------- Optional soft sound (WebAudio; off by default) ----------
  let audio = null;
  function startAudio() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    const len = ctx.sampleRate * 4, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0); let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; } // brown noise ≈ river
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
    const riverGain = ctx.createGain(); riverGain.gain.value = 0.35; src.connect(lp).connect(riverGain).connect(master); src.start();
    const pad = ctx.createGain(); pad.gain.value = 0; pad.connect(master);
    const notes = [196.0, 246.94, 293.66]; // G major triad: consonant, low
    const oscs = notes.map((f) => { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; const g = ctx.createGain(); g.gain.value = 0.05; o.connect(g).connect(pad); o.start(); return o; });
    master.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 4);
    audio = { ctx, master, pad, oscs };
  }
  function setSound(on) {
    $('soundBtn').textContent = 'Sound: ' + (on ? 'on' : 'off'); $('soundBtn').setAttribute('aria-pressed', String(on));
    if (on && !audio) startAudio(); else if (audio) audio.master.gain.linearRampToValueAtTime(on ? 0.5 : 0, audio.ctx.currentTime + 2);
    soundOn = on;
  }
  let soundOn = false;

  // ---------- Witness link (same-device: BroadcastChannel + localStorage fallback) ----------
  const CH = 'rest-state-witness'; const bc = 'BroadcastChannel' in window ? new BroadcastChannel(CH) : null;
  function send(msg) { msg.at = Date.now(); if (bc) bc.postMessage(msg); try { localStorage.setItem(CH, JSON.stringify(msg)); } catch (e) {} }
  let witnessPresent = false, witnessName = '', heardFromWitness = false;
  function onWitness(msg) {
    if (!msg || !msg.type) return;
    if (msg.type === 'presence') { witnessPresent = !!msg.present; if (msg.name) witnessName = msg.name; updateWitness(); }
    if (msg.type === 'call') receiveCall();
    if (msg.type === 'heard') { heardFromWitness = true; showHeard(true); }
    if (msg.type === 'ping') send({ type: 'state', state });
  }
  if (bc) bc.onmessage = (e) => onWitness(e.data);
  addEventListener('storage', (e) => { if (e.key === CH && e.newValue && !bc) { try { onWitness(JSON.parse(e.newValue)); } catch (err) {} } });
  function updateWitness() {
    const el = $('witness'); const name = witnessName || 'your witness';
    el.classList.toggle('off', !witnessPresent);
    $('witnessLabel').textContent = witnessPresent ? `Witness: ${name} is here` : `Witness: ${witnessName ? witnessName + ' (not connected)' : 'not connected'}`;
    hudWitness.material.opacity = witnessPresent ? 1 : 0.4;
  }
  function receiveCall() {
    $('witness').classList.add('calling'); $('callWho').textContent = witnessName || 'Your witness';
    if (state === 'rest') { $('callNotice').classList.remove('hidden'); setVRPanel([`${witnessName || 'Your witness'} is calling you back.`, 'Begin return when you are ready.']); showVRButtons(vrReturn, vrExit); }
  }

  // ---------- State machine ----------
  let state = 'entry', fact = '';
  const GROUND = ['5 things you can see', '4 things you can hear', '3 things you can touch — start with your anchor', '2 things you can smell (smell is your tell)', '1 slow breath, out longer than in'];
  let groundIdx = 0;

  function enterRest() {
    witnessName = $('witnessName').value.trim(); fact = $('fact').value.trim(); updateWitness();
    loved.on = $('lovedOn').checked; loved.text = $('lovedText').value.trim(); saveLoved(); applyLoved();
    $('entry').classList.add('hidden'); ['controls', 'exits'].forEach((id) => $(id).classList.remove('hidden'));
    state = 'rest'; send({ type: 'state', state, name: witnessName });
    const a = $('accept'); a.classList.remove('hidden', 'quiet'); a.style.opacity = '1';
    setTimeout(() => { a.style.opacity = '0'; setTimeout(() => { a.classList.add('quiet'); a.style.opacity = ''; }, 3000); }, params.has('capture') ? 60000 : 9000);
    if ($('soundOpt').checked) setSound(true);
    $('breathCue').classList.toggle('hidden', !breathOn);
    lastInput = performance.now();
  }
  function beginReturn(reason) {
    if (state !== 'rest') return;
    exitReason = reason || 'return';
    state = 'limit'; send({ type: 'state', state, reason: reason || 'return' });
    ['callNotice', 'checksPanel', 'accept', 'breathCue', 'controls'].forEach((id) => $(id).classList.add('hidden'));
    $('witness').classList.remove('calling');
    $('returnBtn').classList.add('hidden'); $('playBtn').classList.add('hidden'); $('diveBtn').classList.add('hidden'); $('divePanel').classList.add('hidden');
    showStep('stepLimit');
    setVRPanel(["You don't have to know.", 'You are not the machine.', 'You can rest.']); showVRButtons(vrNext, vrExit);
  }
  function toReturnRoom() { // resonance completion + fade to neutral room
    if (audio) { audio.oscs.forEach((o, i) => o.frequency.linearRampToValueAtTime([196.0, 246.94, 293.66][i] * 0.5 * 2, audio.ctx.currentTime + 3)); audio.master.gain.linearRampToValueAtTime(0.0, audio.ctx.currentTime + 5); }
    const f = $('fade'); f.style.opacity = '1';
    setTimeout(() => { activeScene = returnScene; f.style.opacity = '0'; }, reduceMotion ? 1000 : 4000);
  }
  function showStep(id) { document.querySelectorAll('#exitSeq .step').forEach((s) => s.classList.add('hidden')); $('exitSeq').classList.remove('hidden'); $(id).classList.remove('hidden');
    if (id === 'stepReadback') { state = 'readback'; toReturnRoom(); setVRPanel(['Where are you?']); vrNext.material.map = textTexture(['Here.'], 512, 140, 56, '#1b2233', 'rgba(255,214,160,0.92)'); showVRButtons(vrNext, vrExit); }
    if (id === 'stepGround') { state = 'ground'; groundIdx = 0; $('groundText').textContent = GROUND[0]; setVRPanel(['In your real room, outward:', GROUND[0]]); }
    if (id === 'stepDone') { const ld = $('lovedDone'); ld.classList.toggle('hidden', !loved.on); ld.textContent = 'You are loved beyond this environment. Go find them.'; state = 'done'; $('factCheck').textContent = fact ? `Check your fact: “${fact}”` : 'You are back.'; send({ type: 'state', state });
      setVRPanel([fact ? `Check: ${fact}` : 'You are back.', 'Nothing left to seek this session. Done. Here.']); showVRButtons(vrExit); vrExit.material.map = textTexture(['Leave VR'], 512, 140, 56, '#1b2233', 'rgba(255,255,255,0.92)'); }
  }
  function showHeard(fromWitness) {
    $('heard').classList.remove('hidden'); $('toGround').classList.remove('hidden');
    $('heardNote').classList.remove('hidden');
    $('heardNote').textContent = fromWitness ? `— ${witnessName || 'your witness'}` : (witnessPresent ? 'Waiting for your witness… you can continue anytime.' : 'Say “Here” to a living person too, and let them answer.');
    if (fromWitness) $('heard').textContent = 'Heard.';
  }
  function vrAdvance() {
    if (state === 'limit') return showStep('stepReadback');
    if (state === 'readback') { $('hereBtn').click(); vrNext.material.map = textTexture(['Continue'], 512, 140, 56, '#1b2233', 'rgba(255,214,160,0.92)'); state = 'readback2'; setVRPanel(['Here.', 'Heard.']); return; }
    if (state === 'readback2') return showStep('stepGround');
    if (state === 'ground') return $('groundNext').click();
  }
  function hardExit() { // immediate, never shamed
    if (!isOpen) return;
    const s = renderer.xr.getSession(); if (s) s.end();
    state = 'rest'; beginReturn('hard'); exitReason = 'hard'; activeScene = returnScene; $('fade').style.opacity = '0';
    showStep('stepDone'); $('factCheck').textContent = 'You left. That is always allowed.' + (fact ? ` Check your fact: “${fact}”` : '');
    send({ type: 'state', state: 'exited' });
  }
  function satisfied() { // satisfaction is a valid ending
    if (state !== 'rest') return; send({ type: 'satisfied' }); beginReturn('satisfied');
  }

  // Wire UI
  $('enterBtn').onclick = enterRest;
  $('returnBtn').onclick = () => beginReturn();
  $('hardExit').onclick = hardExit;
  $('satisfiedBtn').onclick = satisfied;
  $('callReturn').onclick = () => beginReturn('witness');
  $('callStay').onclick = () => { $('callNotice').classList.add('hidden'); };
  $('checksBtn').onclick = () => $('checksPanel').classList.toggle('hidden');
  $('checksClose').onclick = () => $('checksPanel').classList.add('hidden');
  let breathOn = true;
  $('breathBtn').onclick = () => { breathOn = !breathOn; $('breathBtn').textContent = 'Breath guide: ' + (breathOn ? 'on' : 'off'); $('breathBtn').setAttribute('aria-pressed', String(breathOn)); $('breathCue').classList.toggle('hidden', !breathOn); };
  $('soundBtn').onclick = () => setSound(!soundOn);
  document.querySelectorAll('#exitSeq .next').forEach((b) => (b.onclick = () => showStep(b.dataset.next)));
  $('hereBtn').onclick = () => { send({ type: 'here' }); $('hereBtn').disabled = true; showHeard(heardFromWitness); };
  $('groundNext').onclick = () => { groundIdx++; if (groundIdx < GROUND.length) { $('groundText').textContent = GROUND[groundIdx]; setVRPanel(['In your real room, outward:', GROUND[groundIdx]]); } else showStep('stepDone'); };
  $('againBtn').onclick = () => { if (cfg.host) return close('exit'); $('exitSeq').classList.add('hidden'); activeScene = scene; $('hereBtn').disabled = false; ['heard', 'heardNote', 'toGround'].forEach((id) => $(id).classList.add('hidden')); heardFromWitness = false; $('returnBtn').classList.remove('hidden'); $('controls').classList.remove('hidden'); state = 'rest'; idleCueShown = false; lastInput = performance.now(); if (breathOn) $('breathCue').classList.remove('hidden'); send({ type: 'state', state }); };
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen) hardExit(); });
  send({ type: 'ping' }); updateWitness();

  // ---------- Single soft cue when the user slows (shown once, never repeated) ----------
  function maybeIdleCue(now) {
    const IDLE_MS = params.has('idle') ? Number(params.get('idle')) : (cfg.idleMs || 90000);
    if (state === 'rest' && !idleCueShown && now - lastInput > IDLE_MS) {
      idleCueShown = true; const n = $('softCue'); n.classList.remove('hidden'); n.style.opacity = '1';
      setTimeout(() => { n.style.opacity = '0'; setTimeout(() => n.classList.add('hidden'), 3000); }, 12000);
    }
  }

  // ---------- Loop ----------
  const clock = new THREE.Clock(); let t0 = 0;
  if (params.has('t')) t0 = Number(params.get('t'));
  function frame() {
    const t = clock.getElapsedTime() + t0; const now = performance.now();
    waterMat.uniforms.t.value = t;
    const b = breathPhase(t); const s = 0.35 + b.v * 0.65;
    breathOrb.visible = breathRing.visible = breathOn && state === 'rest';
    if (lovedCard.visible !== (loved.on && state === 'rest')) lovedCard.visible = loved.on && state === 'rest';
    breathOrb.scale.setScalar(0.6 + s * 0.9); breathRing.scale.setScalar(0.25 + s * 0.45); breathRing.lookAt(camera.getWorldPosition(new THREE.Vector3()));
    if (breathOn && state === 'rest') { const cue = $('breathCue'); if (cue.textContent !== b.label) cue.textContent = b.label; }
    if (audio && soundOn && state === 'rest') audio.pad.gain.setTargetAtTime(0.02 + b.v * 0.1, audio.ctx.currentTime, 0.3);
    if (!reduceMotion) { sway.forEach(({ g, p }) => (g.rotation.z = Math.sin(t * 0.35 + p) * 0.012));
      const arr = moteGeo.attributes.position.array; for (let i = 0; i < MOTES; i++) { arr[i * 3 + 1] += Math.sin(t * 0.3 + i) * 0.0008; arr[i * 3] += Math.cos(t * 0.1 + i) * 0.0006; } moteGeo.attributes.position.needsUpdate = true; }
    if (state === 'rest' && renderer.xr.isPresenting && !vrPanel.visible) showVRButtons(vrReturn, vrExit);
    maybeIdleCue(now);
    if (controls.enabled) controls.update();
    renderer.render(activeScene, camera);
    if (state !== lastState) { lastState = state; cfg.onStateChange && cfg.onStateChange(state); if ((state === 'done') && !exitFired) { exitFired = true; cfg.onExit && cfg.onExit({ reason: exitReason, fact }); } }
  }
  addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });


  function open(o) {
    isOpen = true; lastState = null; exitFired = false; root.classList.remove('rs-closed');
    $('playBtn').classList.toggle('hidden', !cfg.allowReturn);
    $('playBtn').textContent = cfg.returnLabel || 'Return';
    $('diveBtn').classList.toggle('hidden', !(cfg.environments && cfg.environments.length) && !cfg.onDive);
    $('divePanel').classList.add('hidden');
    if (cfg.host) $('againBtn').textContent = cfg.closeLabel || 'Close';
    renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setAnimationLoop(frame);
    // reset to a clean rest
    $('exitSeq').classList.add('hidden'); activeScene = scene; $('hereBtn').disabled = false;
    ['heard', 'heardNote', 'toGround'].forEach((id) => $(id).classList.add('hidden')); heardFromWitness = false;
    $('returnBtn').classList.remove('hidden'); idleCueShown = false;
    if (cfg.showEntry) { state = 'entry'; $('entry').classList.remove('hidden'); ['controls', 'exits'].forEach((id) => $(id).classList.add('hidden')); }
    if (cfg.loved) { loved = Object.assign({ on: true, text: '', img: '' }, cfg.loved); $('lovedOn').checked = !!loved.on; $('lovedText').value = loved.text || ''; }
    else { $('witnessName').value = cfg.witnessName || ''; $('fact').value = cfg.fact || ''; $('soundOpt').checked = !!cfg.sound; enterRest(); }
    if (o && o.start === 'exit') beginReturn(o.reason || 'satisfied');
  }
  function close(reason, target) {
    isOpen = false; const s = renderer.xr.getSession(); if (s) s.end();
    if (audio) audio.master.gain.linearRampToValueAtTime(0, audio.ctx.currentTime + 0.5);
    renderer.setAnimationLoop(null); root.classList.add('rs-closed');
    state = 'closed';
    if (reason === 'return') cfg.onReturn && cfg.onReturn();
    else if (reason === 'dive') cfg.onDive && cfg.onDive(target);
    else cfg.onClose && cfg.onClose({ reason });
  }
  $('lovedImg').onchange = (e) => { const f = e.target.files && e.target.files[0]; if (f) downscale(f, (url) => { loved.img = url; loved.on = true; $('lovedOn').checked = true; saveLoved(); }); };
  $('lovedOn').checked = !!loved.on; $('lovedText').value = loved.text || '';
  $('diveBtn').onclick = () => {
    const envs = cfg.environments || [];
    if (!envs.length) { send({ type: 'state', state: 'dive' }); close('dive'); return; }
    const list = $('diveList'); list.innerHTML = '';
    envs.forEach((e) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'primary'; b.textContent = e.label || e.id;
      b.onclick = () => { send({ type: 'state', state: 'dive', to: e.id }); close('dive', e.id); }; list.appendChild(b); });
    $('divePanel').classList.remove('hidden');
  };
  $('diveClose').onclick = () => $('divePanel').classList.add('hidden');
  $('playBtn').onclick = () => { send({ type: 'state', state: 'returned-to-play' }); close('return'); };
  api = { open, close, beginReturn, hardExit, satisfied, receiveCall, showStep, get state() { return state; } };
}

export const RestState = {
  /** Open the rest-state menu. Options:
   *  container, showEntry (bool), witnessName, fact, sound (bool), vr (bool, show Enter VR),
   *  allowReturn (bool: show "Return to play"), host (bool: final button closes instead of resting again),
   *  idleMs, returnLabel, environments: [{id,label}] + onDive(id) for "Dive elsewhere",
   *  loved: {on, text, img} optional Loved Beyond anchor (img = URL or data URL; stays local),
   *  onReturn(), onExit({reason, fact}), onClose({reason}), onStateChange(state),
   *  start: 'exit' with reason ('satisfied' | 'witness' | 'hard') to jump straight to the exit sequence. */
  open(options = {}) { cfg = Object.assign({ showEntry: false, allowReturn: false, host: false, vr: false }, options); if (!root) init(); api.open(options); return RestState; },
  close(reason = 'return') { if (api && isOpen) api.close(reason); },
  satisfied() { api && api.satisfied(); },
  hardExit() { api && api.hardExit(); },
  callBack() { api && api.receiveCall(); },
  get state() { return api ? api.state : 'closed'; },
  get isOpen() { return isOpen; },
};
window.__rest = RestState;
