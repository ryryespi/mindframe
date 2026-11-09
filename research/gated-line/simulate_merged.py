import numpy as np, csv, json
from pathlib import Path
P=Path(__file__).parent
CASES=[('Anchor only',0,0,True),('Bridge only',3.2,0,True),('Regulation only',0,.8,True),('Combined',3.2,.8,True),('Combined, no feedback',3.2,.8,False)]
def simulate(gamma,rlevel,feedback,dt=.02,gating=True):
 N=21;q=np.zeros(N);q[0]=1;s=np.zeros(N);z=np.zeros(N);x=np.array([0,.1,.135,.712,.061]);rows=[]
 for n in range(round(90/dt)+1):
  t=n*dt
  if n==round(10/dt): s[:]=0;z[:]=0
  A,H,S,C,G=x;gate=.05+.95*C*(1-G) if gating else 1.;y=gate*s[5]
  if n%round(.2/dt)==0:rows.append([t,*x,gate,y,*s])
  v=.8 if 10<=t<45 else 0;r=rlevel if t>=22 else 0;yy=y if feedback else 0
  target=np.clip([.08+.9*v+.15*S-.5*C-.25*yy,.1+.85*A,.05+.85*H,.8-.65*S+.6*r+.2*yy,.03+.8*S*(1-C)],0,1)
  dx=(target-x)/np.array([2,3,2.5,4,5])
  e=q*(1-s); lap=np.roll(s,1)+np.roll(s,-1)-2*s
  ds=.8*e+.04*z+gamma*gate*lap-(.06+.15*G)*s
  dz=e-.4*z
  x,s,z=x+dt*dx,np.clip(s+dt*ds,0,1),np.clip(z+dt*dz,-1,1)
 return np.array(rows)
runs={name:simulate(g,r,f) for name,g,r,f in CASES};metrics=[]
for name,g,r,f in CASES:
 a=runs[name];mask=(a[:,0]>=22)&(a[:,0]<=60);out=a[:,7];start=None
 for i in range(len(a)-25):
  if a[i,0]>=22 and np.all(out[i:i+26]>=.15): start=float(a[i,0]);break
 metrics.append({'condition':name,'mean_output_22_60':float(out[mask].mean()),'output_at40':float(out[np.argmin(abs(a[:,0]-40))]),'gate_at40':float(a[np.argmin(abs(a[:,0]-40)),6]),'first_sustained_015_after22':start})
 with (P/(name.replace(',','').replace(' ','_')+'.csv')).open('w') as f1:
  w=csv.writer(f1);w.writerow(['t','A','H','S','P','G','gate','output']+['s'+str(i) for i in range(21)]);w.writerows(a)
checks={name:float(np.max(abs(runs[name][-1,1:]-simulate(g,r,f,.01)[-1,1:])) ) for name,g,r,f in CASES}
(P/'results.json').write_text(json.dumps(metrics,indent=2));(P/'convergence.json').write_text(json.dumps(checks,indent=2));print(json.dumps(metrics,indent=2));print(checks)
# Local sensitivity: not an exhaustive uncertainty analysis.
sensitivity=[]
for gamma in [1.6,3.2,6.4]:
 for support in [.4,.8]:
  a=simulate(gamma,support,True);m=(a[:,0]>=22)&(a[:,0]<=60);sensitivity.append([gamma,support,float(a[m,7].mean())])
(P/'sensitivity.json').write_text(json.dumps(sensitivity,indent=2));print('sensitivity',sensitivity)
interaction=metrics[3]['mean_output_22_60']-metrics[1]['mean_output_22_60']-metrics[2]['mean_output_22_60']+metrics[0]['mean_output_22_60'];print('interaction',interaction)
colors=['#8a8a8a','#b17b35','#7b5b9c','#137e80','#4166ad']
def chart(file,series,label,ymax=1):
 W,H=860,335;L=55;pw=785;top=25;ph=225;s=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}"><rect width="100%" height="100%" fill="white"/>']
 for v in np.linspace(0,ymax,5):
  yy=top+ph*(1-v/ymax);s.append(f'<path d="M{L},{yy}h{pw}" stroke="#ddd"/><text x="12" y="{yy+4}" font-size="12">{v:.2f}</text>')
 for t in [0,10,22,45,60,90]:
  xx=L+pw*t/90;s.append(f'<path d="M{xx},{top}v{ph}" stroke="#eee"/><text x="{xx}" y="270" text-anchor="middle" font-size="12">{t}</text>')
 for j,(name,x,y) in enumerate(series):
  pts=' '.join(f'{L+pw*a/90:.2f},{top+ph*(1-b/ymax):.2f}' for a,b in zip(x,y));s.append(f'<polyline points="{pts}" fill="none" stroke="{colors[j]}" stroke-width="2.2"/><text x="{55+(j%3)*265}" y="{309+(j//3)*17}" font-size="12" fill="{colors[j]}">{name}</text>')
 s.append(f'<text x="12" y="15" font-size="13">{label}</text><text x="430" y="289" text-anchor="middle" font-size="13">Time (arbitrary units)</text></svg>');(P/file).write_text(''.join(s))
chart('output.svg',[(n,a[:,0],a[:,7]) for n,a in runs.items()],'Executed-output proxy y = gate × signal at node 5',.6)
chart('gate.svg',[(n,a[:,0],a[:,6]) for n,a in runs.items()],'Regulatory gate g(t)')
a=runs['Combined'];chart('combined.svg', [('Threat A',a[:,0],a[:,1]),('Available control P',a[:,0],a[:,4]),('Immobility G',a[:,0],a[:,5]),('Output-node signal',a[:,0],a[:,13]),('Executed output y',a[:,0],a[:,7])],'Combined condition: coordination and value transfer')
