import numpy as np, itertools, csv, json
from pathlib import Path
P=Path(__file__).parent
names=['A','H','S','P','G']; colors=['#b34848','#b88235','#a25691','#16817d','#536bb4']
def simulate(case,dt=.02):
 x=np.array([.0,.1,.135,.712,.061]); rows=[]
 for n in range(round(90/dt)+1):
  t=n*dt
  if n%round(.2/dt)==0: rows.append([t,*x])
  v=.8 if 10<=t<45 else 0.; r=ua=uh=us=ug=eff=0.
  if t>=22:
   if case=='Reset flow': r=1;ua=.25;uh=.2;us=.25;ug=.15
   if case=='Riding the wave':
    w=min(1,(t-22)/12);r=.6*w;ua=.35*w;us=.12*w;ug=.12*w
   if case=='Fighting through': r=.7;eff=.3
   if case=='Crash-and-recovery' and t>=38:r=1;ua=.25;us=.25;ug=.2
  A,H,S,C,G=x
  target=np.clip([.08+.9*v+.15*S-.5*C-ua,.1+.85*A-uh,.05+.85*H+eff-us,.8-.65*S+.6*r-.2*eff,.03+.8*S*(1-C)-ug],0,1)
  x=x+dt*(target-x)/np.array([2,3,2.5,4,5])
 return np.array(rows)
cases=['Unassisted','Reset flow','Riding the wave','Fighting through','Crash-and-recovery']; runs={c:simulate(c) for c in cases}
metrics=[]
for c,a in runs.items():
 load=(a[:,1]+a[:,2]+a[:,3]+a[:,5]+1-a[:,4])/5
 metrics.append({'case':c,'mean_load_t22_60':float(load[(a[:,0]>=22)&(a[:,0]<=60)].mean()),'P_at_40':float(np.interp(40,a[:,0],a[:,4])),'G_at_40':float(np.interp(40,a[:,0],a[:,5]))})
 with (P/(c.replace(' ','_')+'.csv')).open('w') as f:w=csv.writer(f);w.writerow(['t',*names]);w.writerows(a)
(P/'results.json').write_text(json.dumps(metrics,indent=2));print(metrics)
checks={c:float(np.max(np.abs(runs[c][-1,1:]-simulate(c,.01)[-1,1:]))) for c in cases};(P/'convergence.json').write_text(json.dumps(checks,indent=2));print(checks)
perms=list(itertools.permutations(names));assert len(perms)==len(set(perms))==120
with (P/'permutations.csv').open('w') as f:
 w=csv.writer(f);w.writerow(['id','highest','second','third','fourth','lowest']);w.writerows([[i+1,*p] for i,p in enumerate(perms)])
def chart(file,series,ylabel):
 W,H=850,330;L=55;TOP=25;pw=775;ph=225
 s=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}"><rect width="100%" height="100%" fill="white"/>']
 for yy in [0,.25,.5,.75,1]:
  y=TOP+ph*(1-yy);s.append(f'<path d="M{L},{y}h{pw}" stroke="#ddd"/><text x="15" y="{y+4}" font-size="12">{yy:g}</text>')
 for xx in [0,10,22,38,45,60,90]:
  x=L+pw*xx/90;s.append(f'<path d="M{x},{TOP}v{ph}" stroke="#eee"/><text x="{x}" y="270" text-anchor="middle" font-size="12">{xx}</text>')
 for j,(label,x,y) in enumerate(series):
  pts=' '.join(f'{L+pw*a/90:.2f},{TOP+ph*(1-b):.2f}' for a,b in zip(x,y));s.append(f'<polyline points="{pts}" fill="none" stroke="{colors[j]}" stroke-width="2.2"/><text x="{55+j*158}" y="310" font-size="11" fill="{colors[j]}">{label}</text>')
 s.append(f'<text x="15" y="15" font-size="13">{ylabel}</text><text x="430" y="289" text-anchor="middle" font-size="13">Time (arbitrary units)</text></svg>');(P/file).write_text(''.join(s))
a=runs['Unassisted'];chart('cascade.svg',[(names[j],a[:,0],a[:,j+1]) for j in range(5)],'Hypothetical normalized system state')
chart('strategies.svg',[(c,a[:,0],(a[:,1]+a[:,2]+a[:,3]+a[:,5]+1-a[:,4])/5) for c,a in runs.items()],'Illustrative composite load (not a clinical score)')
# Exhaustive ordinal map. Each row is a rank ordering; split into first-ranked groups.
s=['<svg xmlns="http://www.w3.org/2000/svg" width="850" height="390"><rect width="100%" height="100%" fill="white"/>']
for group in range(5):
 x0=12+group*169;s.append(f'<text x="{x0}" y="18" font-size="13">Highest: {names[group]}</text>')
 for col,n in enumerate(names):s.append(f'<text x="{x0+col*27+8}" y="40" font-size="12">{n}</text>')
 for row,p in enumerate(perms[group*24:(group+1)*24]):
  for col,n in enumerate(names):
   rank=p.index(n)+1;v=int(245-(5-rank)*36);s.append(f'<rect x="{x0+col*27}" y="{48+row*12}" width="25" height="10" fill="rgb({v//2},{v},{v})"/>')
s.append('<text x="12" y="365" font-size="13">120 rows in five groups of 24. Columns: A H S P G. Darker = higher rank; ties excluded.</text></svg>');(P/'permutations.svg').write_text(''.join(s))
