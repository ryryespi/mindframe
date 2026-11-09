"""v5: Cognitive offloading — Perfect-but-Blind sifting of chaotic fragments into fields."""
import numpy as np, csv, json, subprocess
from pathlib import Path
from collections import defaultdict
OUT = Path(__file__).parent

# ---- Field lexicons (keyword features; embedding-free) ----
FIELDS = {
  'geometry':  ['circle','line','curve','sphere','radius','geodesic','angle','parallel','plane','infinite'],
  'ecology':   ['forest','river','soil','species','habitat','cycle','growth','root','bloom','ecosystem'],
  'music':     ['melody','harmony','rhythm','chord','tempo','song','scale','voice','note','silence'],
  'engineering':['bridge','load','circuit','structure','material','stress','design','build','tool','system'],
  'theology':  ['grace','faith','prayer','soul','glory','mercy','spirit','sacred','hope','light'],
  'astronomy': ['star','orbit','planet','galaxy','lightyear','cosmos','nebula','moon','solar','void'],
  'narrative': ['story','character','journey','home','dream','vision','myth','quest','ending','beginning'],
}

GRAND_IDEA = "a circle that is also a line carrying a city of light across the void toward home"
GRAND_KW = set('circle line city light void home journey dream orbit geodesic infinite grace hope structure bridge'.split())

def make_fragments(rng, n=48):
  """Synthetic journal/canvas chaos: short noisy phrases mixing field words + noise."""
  noise = ['maybe','somehow','i feel','remember','what if','blur','wait','again','not sure','wow']
  frags = []
  # Seeded mix so grand idea is supported by geometry + narrative + astronomy + theology + engineering
  seeds = [
    "the circle wants to be a line forever",
    "city of light floating in the void",
    "geodesic path home across the sphere",
    "bridge structure that carries hope",
    "grace like a radius growing infinite",
    "orbit of a dream that never corners",
    "melody of silence under star light",
    "habitat cycle for the journey home",
    "parallel lines meeting in prayer",
    "material stress on a sacred bridge",
    "nebula bloom like a root of cosmos",
    "character quest ending at beginning",
    "load on the circuit of faith",
    "angle of mercy in the plane of soul",
    "tempo of growth through the forest",
    "tool to build a myth of lightyear travel",
  ]
  for s in seeds:
    frags.append(s)
  while len(frags) < n:
    f = rng.choice(list(FIELDS.keys()))
    words = rng.choice(FIELDS[f], size=rng.integers(2,5), replace=False).tolist()
    words += rng.choice(noise, size=rng.integers(1,3), replace=False).tolist()
    rng.shuffle(words)
    frags.append(' '.join(words))
  rng.shuffle(frags)
  return frags

def bag(text):
  return set(w.lower().strip('.,;:!?') for w in text.split() if w.strip())

def feature_vec(text):
  b = bag(text)
  v = np.zeros(len(FIELDS))
  for i, (name, kws) in enumerate(FIELDS.items()):
    v[i] = sum(1 for k in kws if k in b)
  return v

def support_score(field_name, frags_in_field):
  """How well this field supports the grand idea (keyword overlap + presence)."""
  field_kws = set(FIELDS[field_name])
  overlap = len(field_kws & GRAND_KW) / max(1, len(GRAND_KW))
  mass = 0.0
  for t in frags_in_field:
    b = bag(t)
    mass += len(b & GRAND_KW) + 0.5*len(b & field_kws)
  return float(0.35*overlap + 0.65*np.tanh(mass/8.0))

def sift(frags, top_k=5):
  """Assign each fragment to best field by feature; score fields by support."""
  assign = defaultdict(list)
  for t in frags:
    v = feature_vec(t)
    if v.sum() == 0:
      assign['narrative'].append(t)  # default soft bucket
    else:
      assign[list(FIELDS.keys())[int(np.argmax(v))]].append(t)
  scores = {}
  for name in FIELDS:
    scores[name] = support_score(name, assign.get(name, []))
  ranked = sorted(scores.items(), key=lambda x: -x[1])
  return assign, scores, ranked[:top_k]

def human_load_proxy(n_frags, n_fields_attended):
  """Toy: unaided human load ~ fragments in focus / Cowan-ish capacity 4."""
  capacity = 4.0
  return float(np.clip(n_frags / capacity, 0, 20)), float(np.clip(n_fields_attended / capacity, 0, 5))

def run_session(dt=0.05, T=90, seed=7):
  rng = np.random.default_rng(seed)
  frags = make_fragments(rng, n=48)
  assign, scores, top = sift(frags, top_k=7)
  # Session dynamics: threat + offload + lights surfaced + notation triggers
  A, r = 0.14, 0.78
  pride, surr = 0.55, 0.55
  dream_hold = 0.90
  load_human0, _ = human_load_proxy(len(frags), len(FIELDS))
  load_offloaded = 0.0
  lights_shown = 0
  notation_events = 0
  support_found = 0.0
  hist = []
  last_light = -999
  last_notation = -999
  transfer_need = 0.0  # rises when share/build/tool intent appears
  for n in range(int(T/dt)+1):
    t = n*dt
    # Threat schedule similar to v4 (cling to grand dream + chaos overwhelm)
    if t < 10: cling, chaos = 0.30, 0.55
    elif t < 28:
      u = (t-10)/18; cling = 0.30+0.50*u; chaos = 0.55+0.25*u
    elif t < 52:
      u = (t-28)/24; cling = 0.80-0.35*u; chaos = 0.80-0.40*u
    else:
      cling, chaos = 0.40, 0.30
    Ahat = np.clip(0.08 + 0.50*cling + 0.35*chaos, 0, 1)
    A = float(np.clip(A + dt*(Ahat-A)/1.5, 0, 1))
    B = 1 - abs(pride - surr)
    r = float(np.clip(r + dt*((0.80 - 0.35*A + 0.12*B) - r)/2.3, 0, 1))
    g_suite = float(np.clip(0.05 + 0.95*(0.2+0.8*r)*(1-0.3*A), 0.05, 1))
    g = float(np.clip(g_suite*(0.5+0.5*B), 0.05, 1))
    if A >= 0.65: mode = 'listen'
    elif A >= 0.40: mode = 'gentle'
    else: mode = 'expansive'
    # How many lights (fields) to surface
    if mode == 'listen':
      k_lights, gap = 0, 999
      A = float(np.clip(A - dt*0.012, 0, 1))
    elif mode == 'gentle':
      k_lights, gap = 2, 4.0
    else:
      k_lights, gap = 4, 2.2
    # Offload: AI holds the fragment map; human load falls as lights are trusted
    if mode != 'listen' and t - last_light >= gap:
      lights_shown += k_lights
      last_light = t
      # absorb top-k support
      batch = top[:k_lights]
      batch_sup = float(np.mean([s for _, s in batch])) if batch else 0
      support_found = float(np.clip(support_found + 0.08*batch_sup*(1-0.4*A), 0, 1))
      load_offloaded = float(np.clip(load_offloaded + 0.06*(1-0.3*A)*B, 0, 1))
      dream_hold = float(np.clip(dream_hold - 0.03*batch_sup*(1-0.2*A), 0.25, 1))
      pride = float(np.clip(pride + 0.01*(0.55-pride), 0, 1))
      surr = float(np.clip(surr + 0.01*(0.55-surr), 0, 1))
    # Transfer-need trigger: rises late when user wants to share/build
    if t > 40:
      transfer_need = float(np.clip(transfer_need + dt*0.025*(0.3+0.7*support_found), 0, 1))
    else:
      transfer_need = float(np.clip(transfer_need - dt*0.01, 0, 1))
    # Notation on demand: fire when transfer_need high AND mode not listen AND support enough
    if transfer_need >= 0.55 and mode != 'listen' and support_found >= 0.35 and t - last_notation >= 6.0:
      notation_events += 1
      last_notation = t
      transfer_need = float(np.clip(transfer_need - 0.35, 0, 1))  # need partially satisfied
    load_remaining = float(np.clip(1.0 - load_offloaded, 0, 1))
    if n % max(1, int(0.25/dt)) == 0:
      mid = {'listen':0,'gentle':1,'expansive':2}[mode]
      hist.append([t, A, r, g, dream_hold, support_found, load_offloaded, load_remaining,
                   B, mid, lights_shown, notation_events, transfer_need])
  arr = np.array(hist, float)
  listen_t = float(np.sum(arr[:,9]==0)*0.25)
  gentle_t = float(np.sum(arr[:,9]==1)*0.25)
  exp_t = float(np.sum(arr[:,9]==2)*0.25)
  # Field summary
  field_rows = []
  for name, sc in sorted(scores.items(), key=lambda x: -x[1]):
    field_rows.append({
      'field': name,
      'n_frags': len(assign.get(name, [])),
      'support': round(sc, 4),
      'examples': assign.get(name, [])[:2],
    })
  metrics = dict(
    n_fragments=len(frags),
    n_fields=len(FIELDS),
    A_peak=float(arr[:,1].max()),
    t_A_peak=float(arr[arr[:,1].argmax(),0]),
    g_min=float(arr[:,3].min()),
    g_final=float(arr[-1,3]),
    dream_hold_start=0.90,
    dream_hold_final=float(arr[-1,4]),
    support_final=float(arr[-1,5]),
    load_offloaded_final=float(arr[-1,6]),
    load_remaining_final=float(arr[-1,7]),
    lights_shown_total=int(lights_shown),
    notation_events=int(notation_events),
    listen_time=listen_t, gentle_time=gentle_t, expansive_time=exp_t,
    B_final=float(arr[-1,8]),
    top_fields=[r['field'] for r in field_rows[:5]],
    top_supports=[r['support'] for r in field_rows[:5]],
    human_load_proxy_start=load_human0,
  )
  return arr, metrics, field_rows, frags

arr, metrics, field_rows, frags = run_session()
a2, m2, _, _ = run_session(dt=0.025)
metrics['max_abs_dt_halving'] = float(np.max(np.abs(arr[-1,[1,2,3,4,5,6,7,8]] - a2[-1,[1,2,3,4,5,6,7,8]])))

(OUT/'v5_results.json').write_text(json.dumps({'metrics':metrics,'fields':field_rows}, indent=2))
with (OUT/'v5_session.csv').open('w') as f:
  w = csv.writer(f)
  w.writerow(['t','A','r','g','dream_hold','support','load_off','load_rem','B','mode','lights','notation','transfer_need'])
  w.writerows(arr)
with (OUT/'v5_fragments.csv').open('w') as f:
  w = csv.writer(f); w.writerow(['fragment']); w.writerows([[x] for x in frags])

print(json.dumps(metrics, indent=2))

# ---- Figures ----
colors = ['#b34848','#16817d','#536bb4','#b88235','#7b5b9c','#5a8f3c']

def chart(path, series, ylabel, ymax=1.0, shade_listen=True):
  W,H = 860, 345; L=55; pw=785; top=25; ph=225
  s = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}"><rect width="100%" height="100%" fill="white"/>']
  for v in np.linspace(0, ymax, 5):
    yy = top + ph*(1-v/ymax)
    s.append(f'<path d="M{L},{yy}h{pw}" stroke="#ddd"/><text x="12" y="{yy+4}" font-size="12">{v:.2f}</text>')
  for tt in [0,10,28,52,90]:
    xx = L + pw*tt/90
    s.append(f'<path d="M{xx},{top}v{ph}" stroke="#eee"/><text x="{xx}" y="270" text-anchor="middle" font-size="12">{tt}</text>')
  if shade_listen:
    for i in range(len(arr)-1):
      if arr[i,9] == 0:
        x0 = L+pw*arr[i,0]/90; x1 = L+pw*arr[i+1,0]/90
        s.append(f'<rect x="{x0}" y="{top}" width="{max(1,x1-x0)}" height="{ph}" fill="#f0e6f5" opacity="0.55"/>')
  for j,(name,x,y) in enumerate(series):
    pts = ' '.join(f'{L+pw*a/90:.2f},{top+ph*(1-min(ymax,max(0,b))/ymax):.2f}' for a,b in zip(x,y))
    s.append(f'<polyline points="{pts}" fill="none" stroke="{colors[j%len(colors)]}" stroke-width="2.3"/>'
             f'<text x="{40+(j%3)*270}" y="{308+(j//3)*16}" font-size="12" fill="{colors[j%len(colors)]}">{name}</text>')
  s.append(f'<text x="12" y="15" font-size="13">{ylabel}</text>'
           f'<text x="430" y="289" text-anchor="middle" font-size="13">Session time (arbitrary units)</text></svg>')
  path.write_text(''.join(s))

chart(OUT/'v5_offload.svg',
      [('Threat A', arr[:,0], arr[:,1]),
       ('Load offloaded', arr[:,0], arr[:,6]),
       ('Support found', arr[:,0], arr[:,5])],
      'Offload and support under threat modes (shaded = listen-only)')

chart(OUT/'v5_lights_notation.svg',
      [('Lights shown (cum/40)', arr[:,0], arr[:,10]/40.0),
       ('Notation events (cum/5)', arr[:,0], arr[:,11]/5.0),
       ('Transfer need', arr[:,0], arr[:,12]),
       ('Gate g', arr[:,0], arr[:,3])],
      'Fields surfaced (lights) and notation-on-demand triggers')

# Field support bar chart
def bars(path, rows):
  W,H = 860, 345; L=120; top=30; ph=260; bw=70
  names = [r['field'] for r in rows]
  vals = [r['support'] for r in rows]
  s = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}"><rect width="100%" height="100%" fill="white"/>']
  s.append('<text x="12" y="18" font-size="13">Field support for the grand idea (sifted from chaos)</text>')
  for i,(nm,v) in enumerate(zip(names, vals)):
    h = ph*v
    x = L + i*95
    y = top + ph - h
    s.append(f'<rect x="{x}" y="{y}" width="{bw}" height="{h}" fill="{colors[i%len(colors)]}" opacity="0.85"/>')
    s.append(f'<text x="{x+bw/2}" y="{top+ph+18}" text-anchor="middle" font-size="11">{nm}</text>')
    s.append(f'<text x="{x+bw/2}" y="{y-4}" text-anchor="middle" font-size="11">{v:.2f}</text>')
  for vv in [0,0.25,0.5,0.75,1.0]:
    yy = top + ph*(1-vv)
    s.append(f'<path d="M{L-10},{yy}h{7*95}" stroke="#eee"/><text x="40" y="{yy+4}" font-size="11">{vv:.2f}</text>')
  s.append('</svg>')
  path.write_text(''.join(s))

bars(OUT/'v5_fields.svg', field_rows)

for name in ['v5_offload','v5_lights_notation','v5_fields']:
  subprocess.check_call([
    '/usr/bin/google-chrome','--headless','--no-sandbox','--disable-gpu',
    f'--screenshot={OUT}/{name}.png','--window-size=860,345',
    f'file://{OUT}/{name}.svg'
  ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
print('figs ok')
