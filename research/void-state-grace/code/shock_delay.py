#!/usr/bin/env python3
"""Change-shock toy: delay and/or outside kindness, parameters frozen a priori.

A shock adds SHOCK_AMP to the A drive for DELAY_WIN time units after each
shock time (the change is real and lasts a while). Delay multiplies tau_A
by TAU_A_MULT during that window (slower spiral). Kindness subtracts
K_KIND from the A drive during the same window (outside affirmation).
Fork at the end of each window: threat if A >= A_FORK, else challenge.
No post-hoc retuning.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np

import sim as S

OUT = Path(__file__).resolve().parent

# A priori
SHOCK_TIMES = (68.0, 148.0, 228.0)
SHOCK_AMP = 0.55
DELAY_WIN = 10.0
TAU_A_MULT = 3.0
K_KIND = 0.20
A_FORK = 0.50

PROFILES = {
    "Rest-only": dict(base="Zero-Debt Grace", I0=S.I0_HIGH, M=S.M_LOW, decouple=False),
    "Combined": dict(base="Zero-Debt Grace", I0=S.I0_HIGH, M=S.M_HIGH, decouple=True),
}

CONDITIONS = (
    ("shock only", False, False),
    ("delay", True, False),
    ("kindness", False, True),
    ("delay + kindness", True, True),
)


def in_shock_window(t: float) -> bool:
    return any(ts <= t < ts + DELAY_WIN for ts in SHOCK_TIMES)


def run(profile: dict, delay: bool, kindness: bool, T: float = S.T_LONG, dt: float = S.DT):
    A, H, P = S.X0["A"], S.X0["H"], S.X0["P"]
    S_, G, Q = S.X0["S"], S.X0["G"], S.X0["Q"]
    I = float(profile["I0"])
    M = float(profile["M"])
    ctl = S.BurstController()
    n_steps = int(round(T / dt))
    Y = 0.0
    peak_A = 0.0
    sum_A = 0.0
    y_prev = S.output(P, Q, 0.0, G)
    f_prev = 0.0
    forks = []
    window_peaks = {ts: 0.0 for ts in SHOCK_TIMES}
    eval_done = {ts: False for ts in SHOCK_TIMES}

    for n in range(n_steps + 1):
        t = n * dt
        v, r, f_sched, g_grace, uA, uH, uS, uG = S.schedule_inputs(
            profile["base"], t, P, Q, ctl
        )
        gap = S.identity_gap(y_prev, f_prev)
        id_drive = S.K_I * I * (1.0 - M) * gap
        f_c = S.C(S.F_C_MAX * I * (1.0 - M) * gap)
        f = S.C(f_sched + f_c)
        shock_drive = SHOCK_AMP if in_shock_window(t) else 0.0
        kind_drive = K_KIND if (kindness and in_shock_window(t)) else 0.0
        tau_a = S.TAU_A * TAU_A_MULT if (delay and in_shock_window(t)) else S.TAU_A
        target_A = S.C(
            S.A0 + S.A_V * v - S.K_P * P - S.K_G_GRACE * g_grace - uA
            + id_drive + shock_drive - kind_drive
        )
        dA = (target_A - A) / tau_a
        dH = (S.C(S.H0 + S.H_A * A - uH) - H) / S.TAU_H
        dS = (S.C(S.S0 + S.S_H * H + f - uS) - S_) / S.TAU_S
        dP = (S.K_R * r * (1.0 - P) - S.D_F * f * P - S.D_S * S_ * P
              + S.REC * (S.P_BASE - P)) / S.TAU_P
        dG = (S.C(S.G0 + S.G_S * S_ * (1.0 - P) - uG) - G) / S.TAU_G
        L = (A + H + S_ + G + (1.0 - P)) / 5.0
        dQ = (S.Q_REC * (1.0 - L) * (1.0 - Q) - S.Q_DEG * L * Q) / S.TAU_Q
        rel = S.cycle_rel(t)
        active = S.in_window(rel, S.INT_ON, S.INT_OFF)
        dI = -(S.K_DEC * I) / S.TAU_I if (profile["decouple"] and active) else 0.0
        y = S.output(P, Q, f, G)
        peak_A = max(peak_A, A)
        sum_A += A
        for ts in SHOCK_TIMES:
            if ts <= t < ts + DELAY_WIN:
                window_peaks[ts] = max(window_peaks[ts], A)
            if (not eval_done[ts]) and t >= ts + DELAY_WIN:
                forks.append("threat" if A >= A_FORK else "challenge")
                eval_done[ts] = True
        if n == n_steps:
            break
        A = S.C(A + dt * dA)
        H = S.C(H + dt * dH)
        S_ = S.C(S_ + dt * dS)
        P = S.C(P + dt * dP)
        G = S.C(G + dt * dG)
        Q = S.C(Q + dt * dQ)
        I = S.C(I + dt * dI)
        Y += y * dt
        y_prev = y
        f_prev = f

    n_int = n_steps + 1
    n_threat = sum(1 for x in forks if x == "threat")
    return {
        "n_shocks": len(SHOCK_TIMES),
        "n_threat": n_threat,
        "n_challenge": len(forks) - n_threat,
        "forks": forks,
        "window_peak_A": [window_peaks[ts] for ts in SHOCK_TIMES],
        "mean_window_peak_A": float(np.mean(list(window_peaks.values()))),
        "peak_A": float(peak_A),
        "mean_A": float(sum_A / n_int),
        "cumulative_output": float(Y),
        "final_Q": float(Q),
        "final_P": float(P),
        "final_I": float(I),
    }


def main():
    rows = []
    for pname, prof in PROFILES.items():
        for cname, delay, kindness in CONDITIONS:
            met = run(prof, delay, kindness)
            met.update(profile=pname, condition=cname, delay=delay, kindness=kindness)
            rows.append(met)
            print(json.dumps({k: met[k] for k in
                ("profile", "condition", "n_threat", "n_challenge", "forks",
                 "mean_window_peak_A", "window_peak_A", "peak_A", "mean_A",
                 "cumulative_output", "final_Q")}, indent=2))
    payload = {
        "params": {
            "SHOCK_TIMES": list(SHOCK_TIMES), "SHOCK_AMP": SHOCK_AMP,
            "DELAY_WIN": DELAY_WIN, "TAU_A_MULT": TAU_A_MULT,
            "K_KIND": K_KIND, "A_FORK": A_FORK,
        },
        "rows": rows,
    }
    (OUT / "shock_delay.json").write_text(json.dumps(payload, indent=2))
    print("wrote", OUT / "shock_delay.json")


if __name__ == "__main__":
    main()
