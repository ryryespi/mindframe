"""Grace-as-gate extension of the gated-line model. Conceptual illustration only."""
import numpy as np, csv, json
from pathlib import Path
OUT=Path(__file__).parent

# Pause budget W=0.8 split half to r, half to bridge (γ=1.6 ≈ half of full 3.2).
# When with-God + pause: r_with is reduced to 0.4 so total r stays 0.8 (no double-count).
CONDITIONS=[
 # name, alpha_v, r_with, pause, feedback
 ('Baseline',          0.90, 0.0, False, False),
 ('Grace',             0.40, 0.0, False, False),
 ('Grace + r',         0.40, 0.8, False, False),
 ('Grace + r + y(pause)', 0.40, 0.4, True,  False),
 ('Full (plus service)',  0.40, 0.4, True,  True),
]

def simulate(alpha_v, r_with, pause, feedback, dt=.02):
 N=21; q=np.zeros(N); q[0]=1
 s=np.zeros(N); z=np.zeros(N)
 x=np.array([0., .1, .135, .712, .061])
 rows=[]
 for n in range(round(90/dt)+1):
  t=n*dt
  if n==round(10/dt): s[:]=0; z[:]=0
  A,H,S,C,G=x
  gate=.05+.95*C*(1-G)
  y=gate*s[5]
  if n%round(.2/dt)==0: rows.append([t,*x,gate,y,*s])
  v=.8 if 10<=t<45 else 0.
  # Support schedule starts at t=22
  if t>=22:
   r_pause = 0.4 if pause else 0.0
   g_pause = 1.6 if pause else 0.0
   r = r_with + r_pause          # when pause: 0.4+0.4=0.8; when r-only: 0.8
   gamma = g_pause               # pause is the low-load bridge; no extra cathedral γ
  else:
   r=0.; gamma=0.
  yy = y if feedback else 0.
  # Grace Γ is encoded as lowered alpha_v on emptiness input v
  target=np.clip([
    .08 + alpha_v*v + .15*S - .5*C - .25*yy,
    .1 + .85*A,
    .05 + .85*H,
    .8 - .65*S + .6*r + .2*yy,
    .03 + .8*S*(1-C)
  ],0,1)
  dx=(target-x)/np.array([2.,3.,2.5,4.,5.])
  e=q*(1-s); lap=np.roll(s,1)+np.roll(s,-1)-2*s
  ds=.8*e + .04*z + gamma*gate*lap - (.06+.15*G)*s
  dz=e-.4*z
  x=x+dt*dx
  s=np.clip(s+dt*ds,0,1)
  z=np.clip(z+dt*dz,-1,1)
 return np.array(rows)

runs={}; metrics=[]
for name,av,rw,pause,fb in CONDITIONS:
 a=simulate(av,rw,pause,fb); runs[name]=a
 mask=(a[:,0]>=22)&(a[:,0]<=60)
 out=a[:,7]; A=a[:,1]; Preg=a[:,4]; g=a[:,6]
 start=None
 for i in range(len(a)-25):
  if a[i,0]>=22 and np.all(out[i:i+26]>=.15):
   start=float(a[i,0]); break
 m=dict(condition=name, mean_y_22_60=float(out[mask].mean()),
        y_at40=float(out[np.argmin(abs(a[:,0]-40))]),
        A_at40=float(A[np.argmin(abs(a[:,0]-40))]),
        P_at40=float(Preg[np.argmin(abs(a[:,0]-40))]),
        gate_at40=float(g[np.argmin(abs(a[:,0]-40))]),
        first_sustained_015=start)
 metrics.append(m)
 safe=name.replace(' ','_').replace('+', 'and').replace('(','').replace(')','')
 with (OUT/f'grace_{safe}.csv').open('w') as f:
  w=csv.writer(f); w.writerow(['t','A','H','S','P','G','gate','output']+[f's{i}' for i in range(21)]); w.writerows(a)

checks={name: float(np.max(np.abs(runs[name][-1,1:]-simulate(av,rw,pause,fb,.01)[-1,1:])))
        for name,av,rw,pause,fb in CONDITIONS}
(OUT/'grace_results.json').write_text(json.dumps(metrics,indent=2))
(OUT/'grace_convergence.json').write_text(json.dumps(checks,indent=2))
print(json.dumps(metrics,indent=2))
print('convergence', checks)

colors=['#8a8a8a','#ad783f','#7758a0','#157f83','#2f6fb5']
def chart(file, series, label, ymax=1):
 W,H=860,350; L=55; pw=785; top=25; ph=225
 s=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}"><rect width="100%" height="100%" fill="white"/>']
 for v in np.linspace(0,ymax,5):
  yy=top+ph*(1-v/ymax); s.append(f'<path d="M{L},{yy}h{pw}" stroke="#ddd"/><text x="12" y="{yy+4}" font-size="12">{v:.2f}</text>')
 for t in [0,10,22,45,60,90]:
  xx=L+pw*t/90; s.append(f'<path d="M{xx},{top}v{ph}" stroke="#eee"/><text x="{xx}" y="270" text-anchor="middle" font-size="12">{t}</text>')
 for j,(name,x,y) in enumerate(series):
  pts=' '.join(f'{L+pw*a/90:.2f},{top+ph*(1-b/ymax):.2f}' for a,b in zip(x,y))
  s.append(f'<polyline points="{pts}" fill="none" stroke="{colors[j]}" stroke-width="2.2"/><text x="{40+(j%3)*270}" y="{308+(j//3)*16}" font-size="11" fill="{colors[j]}">{name}</text>')
 s.append(f'<text x="12" y="15" font-size="13">{label}</text><text x="430" y="289" text-anchor="middle" font-size="13">Time (arbitrary units)</text></svg>')
 (OUT/file).write_text(''.join(s))

chart('grace_output.svg', [(n,a[:,0],a[:,7]) for n,a in runs.items()],
      'Grace conditions: executed-output proxy y', .55)
chart('grace_threat.svg', [(n,a[:,0],a[:,1]) for n,a in runs.items()],
      'Grace conditions: threat appraisal proxy A', 1.0)
