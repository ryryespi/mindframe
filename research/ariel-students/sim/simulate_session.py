"""Illustrative student session: Explore -> Challenge -> Ground -> Direct."""
import numpy as np, csv, json
from pathlib import Path
OUT=Path(__file__).parent

def session(dt=.05):
  A,r=.15,.78
  progress=0.; d_reality=.90
  challenge=0.; mode='explore'
  hist=[]; enter_challenge=None; exit_challenge=None
  theta_hi, theta_lo = .52, .34
  for n in range(int(80/dt)+1):
    t=n*dt
    # Synthetic narrative feature intensities
    if t<10:
      abs_w,rep,self_f,hope=.06,.04,.10,.04
    elif t<26:  # rumination rises in the story
      u=(t-10)/16
      abs_w=.06+.70*u; rep=.04+.65*u; self_f=.10+.55*u; hope=.04+.50*u
    elif t<48:  # challenge lowers markers
      u=(t-26)/22
      abs_w=.76-.55*u; rep=.69-.50*u; self_f=.65-.40*u; hope=.54-.40*u
    else:  # grounded + knowledge work
      abs_w,rep,self_f,hope=.18,.14,.20,.08
    # Lexical threat proxy (noisy, illustrative)
    Ahat = np.clip(0.12 + 0.35*abs_w + 0.30*rep + 0.20*self_f + 0.25*hope, 0, 1)
    # During challenge, prompts pull A toward a lower target
    if mode=='challenge':
      Ahat = 0.65*Ahat + 0.35*(0.28 - 0.15*challenge)
    A = float(np.clip(A + dt*(Ahat-A)/1.4, 0, 1))
    # Hysteresis mode machine
    prev=mode
    if mode in ('explore','appraise') and A>=theta_hi:
      mode='challenge'
    elif mode=='challenge' and A<=theta_lo:
      mode='ground'
    elif mode=='ground' and (progress>=0.15 or t>52):
      mode='direct'
    elif mode=='explore' and t>=10:
      mode='appraise'
    if mode=='challenge' and enter_challenge is None: enter_challenge=t
    if prev=='challenge' and mode!='challenge' and exit_challenge is None: exit_challenge=t
    # Graded challenge intensity
    if mode=='challenge':
      challenge = min(1., challenge + dt*0.09)
    else:
      challenge = max(0., challenge - dt*0.06)
    # Control responds to threat and successful challenge/grounding
    r_target = np.clip(0.82 - 0.45*A + 0.20*challenge + (0.12 if mode in ('ground','direct') else 0), 0, 1)
    r = float(np.clip(r + dt*(r_target-r)/2.2, 0, 1))
    # Live-suite UI gate simplification (v≈A)
    g = float(np.clip(0.05 + 0.95*(0.2 + 0.8*r)*(1 - 0.3*A), 0.05, 1))
    # Knowledge path / distance-to-reality
    if mode in ('ground','direct'):
      d_reality = max(0.06, d_reality - dt*(0.018 + 0.03*g*(1-A)))
      progress = min(1.0, progress + dt*(0.016 + 0.035*g*(1-A)))
    elif mode=='challenge' and challenge>0.3:
      d_reality = max(0.20, d_reality - dt*0.004)
      progress = min(0.25, progress + dt*0.004)
    else:
      d_reality = min(0.98, d_reality + dt*0.003*A)
    if n % max(1,int(0.25/dt))==0:
      mode_id={'explore':0,'appraise':1,'challenge':2,'ground':3,'direct':4}[mode]
      hist.append([t,A,r,g,challenge,progress,d_reality,mode_id])
  return np.array(hist,float), enter_challenge, exit_challenge

arr,t_enter,t_exit=session()
metrics=dict(
  A_peak=float(arr[:,1].max()), t_A_peak=float(arr[arr[:,1].argmax(),0]),
  t_enter_challenge=None if t_enter is None else float(t_enter),
  t_exit_challenge=None if t_exit is None else float(t_exit),
  A_at_exit=None if t_exit is None else float(arr[np.argmin(np.abs(arr[:,0]-t_exit)),1]),
  g_min=float(arr[:,3].min()), g_at_peakA=float(arr[arr[:,1].argmax(),3]),
  g_final=float(arr[-1,3]), progress_final=float(arr[-1,5]), distance_final=float(arr[-1,6]),
)
(OUT/'session_results.json').write_text(json.dumps(metrics,indent=2))
with (OUT/'session.csv').open('w') as f:
  import csv; w=csv.writer(f); w.writerow(['t','A','r','g','challenge','progress','distance','mode']); w.writerows(arr)
a2,_,_=session(.025)
metrics['max_abs_dt_halving']=float(np.max(np.abs(arr[-1,1:7]-a2[-1,1:7])))
(OUT/'session_results.json').write_text(json.dumps(metrics,indent=2))
print(json.dumps(metrics,indent=2))

colors=['#b34848','#16817d','#536bb4','#b88235','#7b5b9c','#2f6fb5']
def chart(path, series, ylabel, ymax=1):
  W,H=860,345; L=55; pw=785; top=25; ph=225
  s=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}"><rect width="100%" height="100%" fill="white"/>']
  for v in np.linspace(0,ymax,5):
    yy=top+ph*(1-v/ymax); s.append(f'<path d="M{L},{yy}h{pw}" stroke="#ddd"/><text x="12" y="{yy+4}" font-size="12">{v:.2f}</text>')
  for t in [0,10,26,48,80]:
    xx=L+pw*t/80; s.append(f'<path d="M{xx},{top}v{ph}" stroke="#eee"/><text x="{xx}" y="270" text-anchor="middle" font-size="12">{t}</text>')
  if t_enter and t_exit:
    x0=L+pw*t_enter/80; x1=L+pw*t_exit/80
    s.append(f'<rect x="{x0}" y="{top}" width="{max(1,x1-x0)}" height="{ph}" fill="#f6e8e8" opacity="0.75"/>')
  for j,(name,x,y) in enumerate(series):
    pts=' '.join(f'{L+pw*a/80:.2f},{top+ph*(1-min(ymax,max(0,b))/ymax):.2f}' for a,b in zip(x,y))
    s.append(f'<polyline points="{pts}" fill="none" stroke="{colors[j]}" stroke-width="2.3"/><text x="{40+(j%3)*270}" y="{308+(j//3)*16}" font-size="12" fill="{colors[j]}">{name}</text>')
  s.append(f'<text x="12" y="15" font-size="13">{ylabel}</text><text x="430" y="289" text-anchor="middle" font-size="13">Session time (arbitrary units)</text></svg>')
  path.write_text(''.join(s))

chart(OUT/'fig_threat_gate.svg',[('Threat A',arr[:,0],arr[:,1]),('Control r',arr[:,0],arr[:,2]),('Gate g',arr[:,0],arr[:,3]),('Challenge intensity',arr[:,0],arr[:,4])],'Threat, control, gate, and challenge (shaded = challenge window)')
chart(OUT/'fig_path.svg',[('Knowledge-path progress',arr[:,0],arr[:,5]),('Distance-to-reality',arr[:,0],arr[:,6])],'Grounding: knowledge-path progress vs distance-to-reality')
print('ok')
