import numpy as np, json, csv
from pathlib import Path
P=Path(__file__).parent
N=21; dt=.02; T=80; k=.8; ki=.04; leak=.4; damping=.06
q=np.zeros(N); q[0]=1
cases=[('No anchor',0,.8),('Anchor only',1,0),('Anchor + diffusion',1,.8),('Anchor + fast diffusion',1,3.2)]
allruns={}; summary=[]
for name,anchor,g in cases:
 s=np.zeros(N); z=np.zeros(N); hist=[]
 for n in range(round(T/dt)+1):
  if n%25==0: hist.append([n*dt,*s])
  lap=np.roll(s,1)+np.roll(s,-1)-2*s
  e=anchor*q*(1-s)
  s,z=s+dt*(k*e+ki*z+g*lap-damping*s),z+dt*(e-leak*z)
 arr=np.array(hist); allruns[name]=arr
 out=arr[:,1+5]; ix=np.where(out>=.2)[0]
 summary.append(dict(condition=name,anchor=float(arr[-1,1]),output=float(out[-1]),mean=float(arr[-1,1:].mean()),time_to_02=float(arr[ix[0],0]) if len(ix) else None))
 with (P/(name.replace(' ','_').replace('+','and')+'.csv')).open('w') as f:
  w=csv.writer(f); w.writerow(['time']+['s'+str(i) for i in range(N)]); w.writerows(arr)
(P/'results.json').write_text(json.dumps(summary,indent=2))
colors=['#888888','#ad783f','#157f83','#7758a0']
def svg(name, series, xlabel, ylabel,xmax,ymax):
 W,H=840,370; L,R,TOP,B=65,20,25,80; pw=W-L-R; ph=H-TOP-B
 out=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}"><rect width="100%" height="100%" fill="white"/>']
 for v in np.linspace(0,ymax,5):
  y=TOP+ph*(1-v/ymax); out.append(f'<path d="M{L},{y} H{W-R}" stroke="#ddd"/><text x="{L-10}" y="{y+4}" text-anchor="end" font-size="13">{v:.2f}</text>')
 for x in np.linspace(0,xmax,5):
  xx=L+pw*x/xmax; out.append(f'<text x="{xx}" y="{TOP+ph+20}" text-anchor="middle" font-size="13">{x:g}</text>')
 for j,(label,x,y) in enumerate(series):
  pts=' '.join(f'{L+pw*a/xmax:.2f},{TOP+ph*(1-b/ymax):.2f}' for a,b in zip(x,y))
  out.append(f'<polyline points="{pts}" fill="none" stroke="{colors[j]}" stroke-width="2.5"/><text x="{L+(j%2)*375}" y="{H-23+(j//2)*18}" font-size="13" fill="{colors[j]}">{label}</text>')
 out.append(f'<text x="{W/2}" y="{H-48}" text-anchor="middle" font-size="14">{xlabel}</text><text x="12" y="18" font-size="14">{ylabel}</text></svg>')
 (P/name).write_text(''.join(out))
svg('recovery.svg',[(name,a[:,0],a[:,6]) for name,a in allruns.items()],'Time (arbitrary units)','Output signal, node 5',80,.7)
svg('profiles.svg',[(name,np.arange(N),a[-1,1:]) for name,a in allruns.items()],'Node on periodic ring','Signal at t = 80',20,1)
print(json.dumps(summary,indent=2))
# Explicit diffusion ratio and convergence check are recorded, not fitted.
print('max diffusion ratio',3.2*dt)
checks=[]
for name,anchor,g in cases:
 def final(step):
  s=np.zeros(N); z=np.zeros(N)
  for _ in range(round(T/step)):
   e=anchor*q*(1-s)
   s,z=s+step*(k*e+ki*z+g*(np.roll(s,1)+np.roll(s,-1)-2*s)-damping*s),z+step*(e-leak*z)
  return s
 checks.append({'condition':name,'max_abs_dt_halving_difference':float(np.max(np.abs(final(.02)-final(.01))))})
(P/'convergence.json').write_text(json.dumps(checks,indent=2)); print(checks)
