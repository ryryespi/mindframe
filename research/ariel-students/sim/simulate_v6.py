"""v6: Clear expression, Kindred Minds, Legacy & Peace (Pz), insecurity-dwelling D."""
import numpy as np, csv, json, subprocess
from pathlib import Path
OUT = Path(__file__).parent

# Kindred guide library: (name, era, features, accurate note)
GUIDES = [
  dict(name='Girard Desargues', era='historical', tags=['geometry','projective','infinity','line','circle'],
       blurb='Projective geometry; parallels meet at a point at infinity — a line as circle through infinity.'),
  dict(name='Johannes Kepler', era='historical', tags=['astronomy','geometry','infinity','orbit','ellipse'],
       blurb='Used an infinitely distant focus for the parabola in optical/astronomical geometry.'),
  dict(name='Bernhard Riemann', era='historical', tags=['geometry','curve','space','manifold','sphere'],
       blurb='Curved-space geometry; geodesics as the straightest paths on curved manifolds.'),
  dict(name='M. C. Escher', era='historical', tags=['art','circle','geometry','infinite','pattern'],
       blurb='Art that plays with circles, infinity, and impossible-seeming spatial logics.'),
  dict(name='Konstantin Tsiolkovsky', era='historical', tags=['engineering','dream','rocket','cosmos','future'],
       blurb='Dreamer-engineer of rocketry who treated grandiose spaceflight as a workable structure.'),
  dict(name='Augustine of Hippo', era='historical', tags=['theology','faith','reason','soul','peace'],
       blurb='Faith-and-reason tradition; restless heart seeking rest — legacy already in the conversation.'),
  dict(name='Blaise Pascal', era='historical', tags=['theology','math','faith','reason','heart'],
       blurb='Mathematician-believer; heart and reason both belong in the search.'),
  dict(name='Modern geometry teacher (composite)', era='modern', tags=['geometry','line','circle','classroom','explain'],
       blurb='Living teachers who already walk students from Euclidean habit into projective/geodesic frames.'),
  dict(name='Modern STEAM mentor (composite)', era='modern', tags=['art','engineering','story','dream','build'],
       blurb='Contemporary mentors who braid narrative, art, and build so students feel less alone.'),
]

STUDENT_STYLE = {
  'geometry': 0.85, 'projective': 0.7, 'infinity': 0.8, 'line': 0.9, 'circle': 0.95,
  'art': 0.55, 'dream': 0.7, 'engineering': 0.45, 'theology': 0.5, 'faith': 0.4,
  'cosmos': 0.5, 'story': 0.6, 'curve': 0.65, 'space': 0.55, 'peace': 0.3,
}

def kindred_match(style, guide, top_n=4):
  gtags = guide['tags']
  score = 0.0
  for t in gtags:
    score += style.get(t, 0.0)
  score /= max(1, len(gtags))
  return float(score)

def rank_guides(style, k=4):
  scored = [(kindred_match(style, g), g) for g in GUIDES]
  scored.sort(key=lambda x: -x[0])
  return scored[:k]

def run(dt=0.05, T=90):
  A, r = 0.16, 0.76
  pride, surr = 0.55, 0.55
  Pz = 0.28          # peace
  D = 0.62           # insecurity-dwelling
  dream_hold = 0.88
  loops_closed = 0
  kindred_shown = 0
  savor_events = 0
  clarify_events = 0
  belonging = 0.0
  legacy_felt = 0.15
  hist = []
  last_kindred = -999
  last_loop = -999
  last_savor = -999
  last_clarify = -999
  matches = rank_guides(STUDENT_STYLE, k=5)
  for n in range(int(T/dt)+1):
    t = n*dt
    # Schedules: early insecurity + open loops; mid threat; later belonging/peace
    if t < 12:
      cling, ruminate, open_loops = 0.35, 0.55, 0.70
    elif t < 30:
      u = (t-12)/18
      cling = 0.35+0.55*u; ruminate = 0.55+0.35*u; open_loops = 0.70+0.15*u
    elif t < 55:
      u = (t-30)/25
      cling = 0.90-0.55*u; ruminate = 0.90-0.65*u; open_loops = 0.85-0.55*u
    else:
      cling, ruminate, open_loops = 0.35, 0.25, 0.25
    Ahat = np.clip(0.10 + 0.42*cling + 0.28*ruminate + 0.10*D, 0, 1)
    A = float(np.clip(A + dt*(Ahat-A)/1.5, 0, 1))
    B = 1 - abs(pride - surr)
    r = float(np.clip(r + dt*((0.80 - 0.30*A + 0.10*B + 0.08*Pz) - r)/2.3, 0, 1))
    g_suite = float(np.clip(0.05 + 0.95*(0.2+0.8*r)*(1-0.3*A), 0.05, 1))
    g = float(np.clip(g_suite*(0.5+0.5*B), 0.05, 1))
    if A >= 0.65: mode = 'listen'
    elif A >= 0.40: mode = 'gentle'
    else: mode = 'expansive'

    # Clear communication (clarify) — rate by mode
    if mode == 'listen':
      clarify_gap, kindred_gap, loop_gap, savor_gap = 999, 999, 8.0, 999
      A = float(np.clip(A - dt*0.012, 0, 1))
    elif mode == 'gentle':
      clarify_gap, kindred_gap, loop_gap, savor_gap = 4.0, 6.0, 5.5, 6.5
    else:
      clarify_gap, kindred_gap, loop_gap, savor_gap = 2.5, 4.0, 4.0, 4.5

    if mode != 'listen' and t - last_clarify >= clarify_gap:
      clarify_events += 1
      last_clarify = t
      D = float(np.clip(D - 0.025*(0.6+0.4*B), 0, 1))
      Pz = float(np.clip(Pz + 0.015*(1-0.3*A), 0, 1))

    # Kindred minds cards
    if mode != 'listen' and t - last_kindred >= kindred_gap:
      kindred_shown += 1
      last_kindred = t
      # use next match cyclically
      sim = matches[(kindred_shown-1) % len(matches)][0]
      belonging = float(np.clip(belonging + 0.08*sim*(1-0.35*A), 0, 1))
      legacy_felt = float(np.clip(legacy_felt + 0.05*sim, 0, 1))
      D = float(np.clip(D - 0.03*sim, 0, 1))
      Pz = float(np.clip(Pz + 0.06*sim*(1-0.2*A), 0, 1))
      dream_hold = float(np.clip(dream_hold - 0.02*sim, 0.25, 1))

    # Loop closure (legacy & peace): honor the 'why' of unchangeable ideal within a frame
    if t - last_loop >= loop_gap and open_loops > 0.2:
      # listen-only can still close gently via affirmation-of-meaning
      absorb = (0.55 if mode == 'listen' else 0.85) * (1-0.25*A) * (0.5+0.5*B)
      if absorb > 0.35:
        loops_closed += 1
        last_loop = t
        open_loops = max(0.0, open_loops - 0.12)
        Pz = float(np.clip(Pz + 0.08*absorb, 0, 1))
        D = float(np.clip(D - 0.06*absorb, 0, 1))
        legacy_felt = float(np.clip(legacy_felt + 0.04*absorb, 0, 1))
        dream_hold = float(np.clip(dream_hold - 0.035*absorb, 0.25, 1))
        pride = float(np.clip(pride + 0.01*(0.55-pride), 0, 1))
        surr = float(np.clip(surr + 0.01*(0.55-surr), 0, 1))

    # Savoring / joy focus (positive outlook)
    if mode != 'listen' and t - last_savor >= savor_gap and Pz > 0.28:
      savor_events += 1
      last_savor = t
      Pz = float(np.clip(Pz + 0.05*(1-D), 0, 1))
      D = float(np.clip(D - 0.05, 0, 1))

    # Natural dynamics: rumination raises D; A suppresses Pz
    D = float(np.clip(D + dt*(0.04*ruminate - 0.12*Pz - 0.10*belonging - 0.06*legacy_felt), 0, 1))
    Pz = float(np.clip(Pz + dt*(0.10*belonging + 0.08*legacy_felt + 0.05*(1-D) - 0.06*A), 0, 1))

    if n % max(1, int(0.25/dt)) == 0:
      mid = {'listen':0,'gentle':1,'expansive':2}[mode]
      hist.append([t, A, r, g, Pz, D, belonging, legacy_felt, dream_hold, B,
                   mid, loops_closed, kindred_shown, savor_events, clarify_events])
  arr = np.array(hist, float)
  listen_t = float(np.sum(arr[:,10]==0)*0.25)
  gentle_t = float(np.sum(arr[:,10]==1)*0.25)
  exp_t = float(np.sum(arr[:,10]==2)*0.25)
  metrics = dict(
    A_peak=float(arr[:,1].max()), t_A_peak=float(arr[arr[:,1].argmax(),0]),
    g_min=float(arr[:,3].min()), g_final=float(arr[-1,3]),
    Pz_start=0.28, Pz_final=float(arr[-1,4]), Pz_peak=float(arr[:,4].max()),
    D_start=0.62, D_final=float(arr[-1,5]),
    belonging_final=float(arr[-1,6]), legacy_felt_final=float(arr[-1,7]),
    dream_hold_final=float(arr[-1,8]),
    loops_closed=int(loops_closed), kindred_cards=int(kindred_shown),
    savor_events=int(savor_events), clarify_events=int(clarify_events),
    listen_time=listen_t, gentle_time=gentle_t, expansive_time=exp_t,
    B_final=float(arr[-1,9]),
    top_kindred=[{'name':g['name'],'sim':round(s,3),'era':g['era']} for s,g in matches],
  )
  return arr, metrics, matches

arr, metrics, matches = run()
a2, m2, _ = run(dt=0.025)
metrics['max_abs_dt_halving'] = float(np.max(np.abs(
  arr[-1,[1,2,3,4,5,6,7,8,9]] - a2[-1,[1,2,3,4,5,6,7,8,9]])))

(OUT/'v6_results.json').write_text(json.dumps(metrics, indent=2))
with (OUT/'v6_session.csv').open('w') as f:
  w = csv.writer(f)
  w.writerow(['t','A','r','g','Pz','D','belong','legacy','dream_hold','B','mode',
              'loops','kindred','savor','clarify'])
  w.writerows(arr)
print(json.dumps(metrics, indent=2))

colors = ['#b34848','#16817d','#536bb4','#b88235','#7b5b9c','#5a8f3c']

def chart(path, series, ylabel, ymax=1.0):
  W,H=860,345; L=55; pw=785; top=25; ph=225
  s=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}"><rect width="100%" height="100%" fill="white"/>']
  for v in np.linspace(0,ymax,5):
    yy=top+ph*(1-v/ymax)
    s.append(f'<path d="M{L},{yy}h{pw}" stroke="#ddd"/><text x="12" y="{yy+4}" font-size="12">{v:.2f}</text>')
  for tt in [0,12,30,55,90]:
    xx=L+pw*tt/90
    s.append(f'<path d="M{xx},{top}v{ph}" stroke="#eee"/><text x="{xx}" y="270" text-anchor="middle" font-size="12">{tt}</text>')
  for i in range(len(arr)-1):
    if arr[i,10]==0:
      x0=L+pw*arr[i,0]/90; x1=L+pw*arr[i+1,0]/90
      s.append(f'<rect x="{x0}" y="{top}" width="{max(1,x1-x0)}" height="{ph}" fill="#f0e6f5" opacity="0.55"/>')
  for j,(name,x,y) in enumerate(series):
    pts=' '.join(f'{L+pw*a/90:.2f},{top+ph*(1-min(ymax,max(0,b))/ymax):.2f}' for a,b in zip(x,y))
    s.append(f'<polyline points="{pts}" fill="none" stroke="{colors[j%len(colors)]}" stroke-width="2.3"/>'
             f'<text x="{40+(j%3)*270}" y="{308+(j//3)*16}" font-size="12" fill="{colors[j%len(colors)]}">{name}</text>')
  s.append(f'<text x="12" y="15" font-size="13">{ylabel}</text>'
           f'<text x="430" y="289" text-anchor="middle" font-size="13">Session time (arbitrary units)</text></svg>')
  path.write_text(''.join(s))

chart(OUT/'v6_peace.svg',
      [('Peace Pz', arr[:,0], arr[:,4]),
       ('Insecurity-dwell D', arr[:,0], arr[:,5]),
       ('Threat A', arr[:,0], arr[:,1])],
      'Peace vs insecurity-dwelling under threat modes (shaded = listen-only)')

chart(OUT/'v6_belonging.svg',
      [('Belonging', arr[:,0], arr[:,6]),
       ('Legacy-felt', arr[:,0], arr[:,7]),
       ('Gate g', arr[:,0], arr[:,3])],
      'Kindred belonging, legacy-felt, and gate')

# Kindred bar
def bars(path, matches):
  W,H=860,345; L=40; top=40; ph=240
  s=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}"><rect width="100%" height="100%" fill="white"/>']
  s.append('<text x="12" y="22" font-size="13">Kindred-mind similarity (you are not alone)</text>')
  n=len(matches); bw=min(140, (W-L-40)/n - 20)
  for i,(sim,g) in enumerate(matches):
    h=ph*sim; x=L+20+i*(bw+30); y=top+ph-h
    s.append(f'<rect x="{x}" y="{y}" width="{bw}" height="{h}" fill="{colors[i%len(colors)]}" opacity="0.85"/>')
    label=g['name'].split('(')[0].strip()
    if len(label)>16: label=label[:14]+'…'
    s.append(f'<text x="{x+bw/2}" y="{top+ph+16}" text-anchor="middle" font-size="11">{label}</text>')
    s.append(f'<text x="{x+bw/2}" y="{y-4}" text-anchor="middle" font-size="11">{sim:.2f}</text>')
  s.append('</svg>')
  path.write_text(''.join(s))

bars(OUT/'v6_kindred.svg', matches)

for name in ['v6_peace','v6_belonging','v6_kindred']:
  subprocess.check_call(['/usr/bin/google-chrome','--headless','--no-sandbox','--disable-gpu',
    f'--screenshot={OUT}/{name}.png','--window-size=860,345',f'file://{OUT}/{name}.svg'],
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
print('figs ok')
