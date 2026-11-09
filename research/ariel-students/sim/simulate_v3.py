"""v3: Affirm-then-Fact dosing + pride/surrender balance across three student profiles."""
import numpy as np, csv, json, subprocess
from pathlib import Path
OUT=Path(__file__).parent

PROFILES={
  'Proud': dict(pride0=.85, surr0=.25, recept0=.32),
  'Balanced': dict(pride0=.55, surr0=.55, recept0=.65),
  'Over-surrendered': dict(pride0=.22, surr0=.85, recept0=.78),
}

def run(profile, dt=.05, T=80):
  p=PROFILES[profile]
  A,r=.16,.75
  pride,surr=p['pride0'],p['surr0']
  recept=p['recept0']
  challenge=0.; progress=0.; d_reality=.90
  originality={'Proud':0.92,'Balanced':0.90,'Over-surrendered':0.88}[profile]
  mode='explore'; enter=exit=None
  theta_hi,theta_lo=.52,.34
  affirm_bank=0.; facts_delivered=0.; affirms_delivered=0.
  hist=[]
  for n in range(int(T/dt)+1):
    t=n*dt
    if t<10: abs_w,rep,self_f,hope=.06,.04,.10,.04
    elif t<26:
      u=(t-10)/16
      abs_w=.06+.70*u; rep=.04+.65*u; self_f=.10+.55*u; hope=.04+.50*u
    elif t<48:
      u=(t-26)/22
      abs_w=.76-.55*u; rep=.69-.50*u; self_f=.65-.40*u; hope=.54-.40*u
    else:
      abs_w,rep,self_f,hope=.18,.14,.20,.08
    Ahat=np.clip(0.12+0.35*abs_w+0.30*rep+0.20*self_f+0.25*hope,0,1)
    if mode=='challenge':
      Ahat=0.65*Ahat+0.35*(0.28-0.12*challenge)
    A=float(np.clip(A+dt*(Ahat-A)/1.4,0,1))
    prev=mode
    if mode in ('explore','appraise') and A>=theta_hi: mode='challenge'
    elif mode=='challenge' and A<=theta_lo: mode='ground'
    elif mode=='ground' and (progress>=0.12 or t>52): mode='direct'
    elif mode=='explore' and t>=10: mode='appraise'
    if mode=='challenge' and enter is None: enter=t
    if prev=='challenge' and mode!='challenge' and exit is None: exit=t
    if mode=='challenge': challenge=min(1.,challenge+dt*.09)
    else: challenge=max(0.,challenge-dt*.06)

    Bbal=1.0-abs(pride-surr)
    if mode in ('challenge','ground','direct') and t>=12:
      # Affirm rate rises with threat; fact rate falls with threat and needs receptivity+balance
      affirm_rate=0.12+0.10*A
      # Tunable design heuristic: accumulate ~3 affirm units per fact attempt
      affirm_bank += affirm_rate*dt
      affirms_delivered += affirm_rate*dt
      fact_attempt_rate = (0.05 if mode!="challenge" else 0.028) * recept * (1-0.75*A) * (0.35+0.65*Bbal)
      # Only attempt facts when affirm bank covers 3:1 heuristic
      need = 3.0 if mode=="challenge" else 2.5
      while affirm_bank >= need and fact_attempt_rate>0:
        affirm_bank -= need
        # Excess pride -> bounce (fact not absorbed); excess surrender -> originality bleed
        bounce=np.clip((pride-0.58)/0.42,0,1)
        bleed=np.clip((surr-0.58)/0.42,0,1)
        absorbed=(1.0-0.85*bounce)
        facts_delivered += 1.0
        progress=min(1.0, progress + 0.09*absorbed*(0.5+0.5*Bbal))
        # allow multiple facts per step in ground/direct
        if mode=="challenge":
          break
        d_reality=max(0.05, d_reality - 0.048*absorbed)
        originality=float(np.clip(originality - 0.08*bleed + 0.012*(1-bleed), 0.12, 1))
        # Soft pull toward balance after a successful Affirm-then-Fact cycle
        pride=float(np.clip(pride + 0.025*(0.55-pride) - 0.01*bounce,0,1))
        surr=float(np.clip(surr + 0.025*(0.55-surr) - 0.02*bleed,0,1))
      # Continuous originality support from affirmations (curiosity praise)
      originality=float(np.clip(originality + dt*0.004*(1-0.5*pride) - dt*0.012*max(0.,surr-0.6),0.12,1))
      # Excess pride slows knowledge uptake even when a fact is "heard"
      progress=min(1.0, progress + dt*0.002*Bbal*(1-max(0.,pride-0.6)))
      # Slight drift
      pride=float(np.clip(pride + dt*0.004*(0.52-pride),0,1))
      surr=float(np.clip(surr + dt*0.004*(0.52-surr),0,1))
    else:
      originality=float(np.clip(originality+dt*0.0012,0.12,1))
      d_reality=min(0.98,d_reality+dt*0.003*A)
      pride=float(np.clip(pride+dt*0.002*(p['pride0']-pride),0,1))
      surr=float(np.clip(surr+dt*0.002*(p['surr0']-surr),0,1))

    Bbal=1.0-abs(pride-surr)
    r_target=np.clip(0.78-0.4*A+0.18*challenge+0.16*Bbal+(0.08 if mode in ('ground','direct') else 0),0,1)
    r=float(np.clip(r+dt*(r_target-r)/2.2,0,1))
    g_suite=float(np.clip(0.05+0.95*(0.2+0.8*r)*(1-0.3*A),0.05,1))
    g=float(np.clip(g_suite*(0.50+0.50*Bbal),0.05,1))

    if n%max(1,int(0.25/dt))==0:
      mode_id={'explore':0,'appraise':1,'challenge':2,'ground':3,'direct':4}[mode]
      hist.append([t,A,r,g,challenge,progress,d_reality,originality,pride,surr,Bbal,mode_id,affirms_delivered,facts_delivered])
  arr=np.array(hist,float)
  ratio=affirms_delivered/max(facts_delivered,1e-9)
  return arr, dict(profile=profile,A_peak=float(arr[:,1].max()),
    t_enter=None if enter is None else float(enter), t_exit=None if exit is None else float(exit),
    g_min=float(arr[:,3].min()), g_final=float(arr[-1,3]),
    progress_final=float(arr[-1,5]), distance_final=float(arr[-1,6]),
    originality_final=float(arr[-1,7]), originality_min=float(arr[:,7].min()),
    B_mean=float(arr[:,10].mean()), B_final=float(arr[-1,10]),
    affirm_fact_ratio=float(ratio), facts=float(facts_delivered), affirms=float(affirms_delivered),
    pride_final=float(arr[-1,8]), surr_final=float(arr[-1,9]))

results={}; runs={}
for name in PROFILES:
  arr,m=run(name); runs[name]=arr; results[name]=m
  with (OUT/f'v3_{name.replace(" ","_").replace("-","_")}.csv').open('w') as f:
    w=csv.writer(f)
    w.writerow(['t','A','r','g','challenge','progress','distance','originality','pride','surrender','B','mode','affirms','facts'])
    w.writerows(arr)
(OUT/'v3_results.json').write_text(json.dumps(results,indent=2))
print(json.dumps(results,indent=2))

colors={'Proud':'#b34848','Balanced':'#16817d','Over-surrendered':'#7758a0'}
def chart(path, col, ylabel, ymax=1):
  W,H=860,345; L=55; pw=785; top=25; ph=225
  s=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}"><rect width="100%" height="100%" fill="white"/>']
  for v in np.linspace(0,ymax,5):
    yy=top+ph*(1-v/ymax); s.append(f'<path d="M{L},{yy}h{pw}" stroke="#ddd"/><text x="12" y="{yy+4}" font-size="12">{v:.2f}</text>')
  for t in [0,10,26,48,80]:
    xx=L+pw*t/80; s.append(f'<path d="M{xx},{top}v{ph}" stroke="#eee"/><text x="{xx}" y="270" text-anchor="middle" font-size="12">{t}</text>')
  for j,(name,arr) in enumerate(runs.items()):
    pts=' '.join(f'{L+pw*a/80:.2f},{top+ph*(1-min(ymax,max(0,b))/ymax):.2f}' for a,b in zip(arr[:,0],arr[:,col]))
    s.append(f'<polyline points="{pts}" fill="none" stroke="{colors[name]}" stroke-width="2.4"/><text x="{40+j*270}" y="310" font-size="12" fill="{colors[name]}">{name}</text>')
  s.append(f'<text x="12" y="15" font-size="13">{ylabel}</text><text x="430" y="289" text-anchor="middle" font-size="13">Session time (arbitrary units)</text></svg>')
  path.write_text(''.join(s))

chart(OUT/'v3_gate.svg',3,'Gate g under three pride–surrender profiles')
chart(OUT/'v3_originality.svg',7,'Originality preserved')
chart(OUT/'v3_progress.svg',5,'Knowledge-path progress')
chart(OUT/'v3_balance.svg',10,'Balance B = 1 − |pride − surrender|')
for name in ['v3_gate','v3_originality','v3_progress','v3_balance']:
  subprocess.check_call(['/usr/bin/google-chrome','--headless','--no-sandbox','--disable-gpu',
    f'--screenshot={OUT}/{name}.png','--window-size=860,345',f'file://{OUT}/{name}.svg'],
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
print('figures ok')
