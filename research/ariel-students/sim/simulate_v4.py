"""v4: Listening companion — Reframe-to-Possible under threat-gated response modes."""
import numpy as np, csv, json, subprocess
from pathlib import Path
OUT=Path(__file__).parent

def run(dt=.05, T=90):
  A,r=.14,.78
  pride,surr=.55,.55
  dream_hold=0.92
  frames_scored=0; frames_presented=0; frames_absorbed=0; listen_only=0.
  originality=.94; progress=0.
  hist=[]; last_present=-999
  for n in range(int(T/dt)+1):
    t=n*dt
    if t<12: cling,rep=.35,.08
    elif t<30:
      u=(t-12)/18; cling=.35+.50*u; rep=.08+.45*u
    elif t<55:
      u=(t-30)/25; cling=.85-.40*u; rep=.53-.35*u
    else:
      cling,rep=.40,.15
    Ahat=np.clip(0.10+0.55*cling+0.30*rep,0,1)
    A=float(np.clip(A+dt*(Ahat-A)/1.5,0,1))
    B=1-abs(pride-surr)
    r=float(np.clip(r+dt*((0.80-0.35*A+0.12*B)-r)/2.3,0,1))
    g_suite=float(np.clip(0.05+0.95*(0.2+0.8*r)*(1-0.3*A),0.05,1))
    g=float(np.clip(g_suite*(0.5+0.5*B),0.05,1))
    if A>=0.65: resp='listen'
    elif A>=0.40: resp='gentle'
    else: resp='expansive'
    if resp=='listen':
      listen_only+=dt
      A=float(np.clip(A-dt*0.015,0,1))
      originality=float(np.clip(originality+dt*0.002,0.2,1))
      present_gap=999
    elif resp=='gentle':
      present_gap=3.0
    else:
      present_gap=1.8
    # Always score candidates when not listen-only (internal)
    if resp!='listen':
      feas=np.array([0.92,0.88,0.85,0.70,0.55])
      preserve=np.array([0.75,0.80,0.78,0.95,0.90])
      honesty=np.array([1.0,1.0,1.0,0.85,0.80])
      w=np.array([0.45,0.35,0.15,0.05,0.0]) if resp=='gentle' else np.array([0.20,0.20,0.15,0.25,0.20])
      score=w*(0.35*feas+0.40*preserve+0.25*honesty)
      k=int(np.argmax(score))
      frames_scored+=1
      if t-last_present>=present_gap:
        frames_presented+=1
        last_present=t
        bounce=np.clip((pride-0.58)/0.4,0,1)
        absorb=(1-0.7*bounce)*(1-0.5*max(0,A-0.35))*(0.4+0.6*B)*float(score[k])
        if absorb>0.18:
          frames_absorbed+=1
          dream_hold=float(np.clip(dream_hold-0.055*absorb*preserve[k],0.2,1))
          progress=min(1.0, progress+0.22*absorb*feas[k])
          originality=float(np.clip(originality-0.012*(1-preserve[k])+0.008*preserve[k],0.2,1))
          pride=float(np.clip(pride+0.012*(0.55-pride),0,1))
          surr=float(np.clip(surr+0.012*(0.55-surr),0,1))
    if n%max(1,int(0.25/dt))==0:
      resp_id={'listen':0,'gentle':1,'expansive':2}[resp]
      hist.append([t,A,r,g,dream_hold,progress,originality,B,resp_id,frames_scored,frames_presented,frames_absorbed,listen_only])
  arr=np.array(hist,float)
  listen_t=float(np.sum(arr[:,8]==0)*0.25)
  gentle_t=float(np.sum(arr[:,8]==1)*0.25)
  exp_t=float(np.sum(arr[:,8]==2)*0.25)
  m=dict(A_peak=float(arr[:,1].max()), t_A_peak=float(arr[arr[:,1].argmax(),0]),
         g_min=float(arr[:,3].min()), g_final=float(arr[-1,3]),
         progress_final=float(arr[-1,5]), originality_final=float(arr[-1,6]),
         dream_hold_start=0.92, dream_hold_final=float(arr[-1,4]),
         frames_scored=int(frames_scored), frames_presented=int(frames_presented),
         frames_absorbed=int(frames_absorbed), listen_time=listen_t, gentle_time=gentle_t,
         expansive_time=exp_t, B_final=float(arr[-1,7]))
  return arr,m

arr,metrics=run()
a2,_=run(.025)
metrics['max_abs_dt_halving']=float(np.max(np.abs(arr[-1,1:8]-a2[-1,1:8])))
(OUT/'v4_results.json').write_text(json.dumps(metrics,indent=2))
with (OUT/'v4_session.csv').open('w') as f:
  w=csv.writer(f); w.writerow(['t','A','r','g','dream_hold','progress','originality','B','resp','scored','presented','absorbed','listen_cum']); w.writerows(arr)
print(json.dumps(metrics,indent=2))
colors=['#b34848','#16817d','#536bb4','#b88235','#7b5b9c']
def chart(path, series, ylabel, ymax=1):
  W,H=860,345; L=55; pw=785; top=25; ph=225
  s=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}"><rect width="100%" height="100%" fill="white"/>']
  for v in np.linspace(0,ymax,5):
    yy=top+ph*(1-v/ymax); s.append(f'<path d="M{L},{yy}h{pw}" stroke="#ddd"/><text x="12" y="{yy+4}" font-size="12">{v:.2f}</text>')
  for tt in [0,12,30,55,90]:
    xx=L+pw*tt/90; s.append(f'<path d="M{xx},{top}v{ph}" stroke="#eee"/><text x="{xx}" y="270" text-anchor="middle" font-size="12">{tt}</text>')
  for i in range(len(arr)-1):
    if arr[i,8]==0:
      x0=L+pw*arr[i,0]/90; x1=L+pw*arr[i+1,0]/90
      s.append(f'<rect x="{x0}" y="{top}" width="{max(1,x1-x0)}" height="{ph}" fill="#f0e6f5" opacity="0.55"/>')
  for j,(name,x,y) in enumerate(series):
    pts=' '.join(f'{L+pw*a/90:.2f},{top+ph*(1-min(ymax,max(0,b))/ymax):.2f}' for a,b in zip(x,y))
    s.append(f'<polyline points="{pts}" fill="none" stroke="{colors[j]}" stroke-width="2.3"/><text x="{40+(j%3)*270}" y="{308+(j//3)*16}" font-size="12" fill="{colors[j]}">{name}</text>')
  s.append(f'<text x="12" y="15" font-size="13">{ylabel}</text><text x="430" y="289" text-anchor="middle" font-size="13">Session time (arbitrary units)</text></svg>')
  path.write_text(''.join(s))
chart(OUT/'v4_threat_modes.svg',[('Threat A',arr[:,0],arr[:,1]),('Gate g',arr[:,0],arr[:,3]),('Dream-hold',arr[:,0],arr[:,4])],'Threat-gated modes (shaded = listen-only) with gate and dream-hold')
chart(OUT/'v4_closure.svg',[('Suggested-direction uptake',arr[:,0],arr[:,5]),('Originality',arr[:,0],arr[:,6])],'Dream closure via suggested directions (no exercises)')
for name in ['v4_threat_modes','v4_closure']:
  subprocess.check_call(['/usr/bin/google-chrome','--headless','--no-sandbox','--disable-gpu',
    f'--screenshot={OUT}/{name}.png','--window-size=860,345',f'file://{OUT}/{name}.svg'],
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
print('ok')
