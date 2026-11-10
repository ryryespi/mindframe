#!/usr/bin/env python3
"""
Void-State + Zero-Debt Grace simulation
=======================================
A rebuilt, bounded implementation of Espinosa's void-state toy model,
with missing A and P equations filled in as labeled assumptions,
an explicit slow allostatic capacity Q, a performance output y,
repeated void episodes, and a Grace + Chosen Burst schedule.

This is a conceptual dynamical sketch, not a fitted neural model
and not evidence of treatment efficacy.

Reproduce:
    python3 sim.py
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np

OUT = Path(__file__).resolve().parent

# ---------------------------------------------------------------------------
# PARAMS  (set a priori from the original void-state toy model and the
#          verbal description of missing terms; not fitted to a desired ranking)
# ---------------------------------------------------------------------------

# Integration
DT = 0.02
T_SINGLE = 90.0          # one episode, matching the original horizon
T_LONG = 300.0           # repeated episodes so capacity can accumulate debt
CYCLE = 80.0             # each cycle contains one void and one intervention
SAMPLE = 0.20            # record every 0.2 time units

# Void and intervention windows, relative to each cycle (user specification)
VOID_ON, VOID_OFF = 10.0, 45.0
INT_ON, INT_OFF = 22.0, 60.0
V_AMP = 0.80             # void input amplitude (original)

# Time constants (original A,H,S,P,G; Q is new and slower)
TAU_A, TAU_H, TAU_S, TAU_P, TAU_G = 2.0, 3.0, 2.5, 4.0, 5.0
TAU_Q = 50.0

# --- A  (ASSUMPTION: equation was missing; filled to match the verbal
#     description "driven by +0.90 v, with P and g_grace as negative feedback")
A0 = 0.05
A_V = 0.90
K_P = 0.50               # P down-regulates appraisal (original used 0.50)
K_G_GRACE = 0.30         # extra ledger-free suppression of A; see sensitivity
# The original toy also fed +0.15 S into A (arousal amplifying appraisal).
# That term is omitted here and listed as a suggested improvement.

# --- H, S, G  (given)
H0, H_A = 0.10, 0.85
S0, S_H = 0.05, 0.85     # f is added to the S drive, as specified
G0, G_S = 0.03, 0.80     # G driven by S * (1 - P)

# --- P  (ASSUMPTION: equation was missing; mechanistic restoration/depletion
#     so that P stays in (0,1) without an extra clip on the target)
#     tau_P dP/dt = k_r r (1-P) - d_f f P - d_S S P + rec (P_base - P)
K_R = 0.60               # r restores P toward 1
D_F = 0.80               # f depletes P (stronger than the original 0.20
                         # implied cost, following "f is effort cost depleting P")
D_S = 0.45               # surge occupies / depletes regulation
REC = 0.35               # baseline recovery toward P_BASE
P_BASE = 0.75

# --- Q  (NEW: slow allostatic capacity / regulatory reserve)
Q_REC = 0.40             # recovery toward 1 when load is low
Q_DEG = 0.55             # degradation toward 0 when load is high

# --- Performance  (NEW)
# y = Q * P * (Y_BASE + Y_EFFORT * f) * (1 - G)
Y_BASE = 0.30            # output available without friction, if regulated
Y_EFFORT = 0.70          # extra output bought by friction (Fighting Through's
                         # short-term advantage)

# --- Chosen-burst controller  (NEW schedule)
P_BURST_THRESH = 0.58
Q_BURST_THRESH = 0.50
T_BURST = 8.0
T_REFRACTORY = 14.0
F_BURST = 0.30

# Initial state (original toy initial condition; Q starts full)
X0 = dict(A=0.00, H=0.10, S=0.135, P=0.712, G=0.061, Q=1.00)

# --- Identity fusion  (NEW, all labeled assumptions)
# I in [0, 1]: how much worth rests on output / on being-in-the-act of creating.
# When I = 0 the terms below vanish and the original model is recovered.
I0_HIGH = 0.80           # a "high-I person" starting fusion
M_LOW = 0.10             # no visible accomplishment record (fear of no memory)
M_HIGH = 0.75            # Ariel's Accomplishment Record is kept and reviewable
K_I = 0.45               # rest-as-void gain into A
F_C_MAX = 0.35           # scale of compulsive fight; persists even if P, Q are low
Y_REF = 0.18             # "enough output that I do not feel useless" (near mean
                         # grace y in the original run, ~0.16)
W_Y = 0.50               # weight on low-output gap in the rest-as-void signal
W_F = 0.50               # weight on not-currently-striving (1 - f)
TAU_I = 80.0             # identity changes more slowly than an episode
K_DEC = 0.55             # decoupling rate when a given-identity intervention is on
RELAPSE_THRESH = 0.10    # f_c above this during an intervention counts as relapse

# --- Effective clock and valence  (NEW, all labeled assumptions; downstream
#     readout only: these terms do not feed back into A, H, S, P, G, Q, I, or y.
#     When I = 0 the original Table 1 states are therefore unchanged.)
# Calendar time t still runs the existing ODEs. Subjective / effective time
# tau accumulates at rate phi = d tau/dt. Position x in [-1, 1] starts
# negative ("negativity at time zero") and moves with phi * drift.
# Time itself is not a healer: direction comes from drift, not from t.
PHI0 = 0.70              # baseline felt-time rate
PHI_HOME = 1.00          # the rate "word" steadies toward
K_REST_PHI = 0.45        # true rest (not rest-as-void) raises phi
K_GRAND_PHI = 0.55       # fusion * compulsive fight speeds phi (wrong direction)
K_DEP_PHI = 0.50         # depression composite slows felt time
K_WORD_PHI = 0.40        # fraction of (PHI_HOME - phi_raw) closed by "word"
K_WILL_PHI = 0.00        # default: sheer will does NOT steady the clock
                         # sensitivity may raise this to K_WORD_PHI
TAU_X = 10.0             # x moves on a slower scale than A
X0_X = -0.55             # start in negativity
# Buffer ("stopping power" metaphor, not physics)
K_STOP = 1.20
B_M, B_CON, B_WORD, B_G = 0.35, 0.25, 0.20, 0.25
# Drift toward positive
K_GX, K_RX, K_MX, K_CX = 0.28, 0.22, 0.18, 0.20
K_EX, K_SX, K_WX = 0.12, 0.15, 0.12
# Drift toward negative
K_RUM, K_ISO, K_IX, K_FCX = 0.35, 0.22, 0.20, 0.18
# Assessment thresholds (a priori)
X_VOID, X_OUT = -0.10, 0.20
RUM_HIGH, RUM_LOW = 0.40, 0.35
ISO_HIGH, ISO_LOW = 0.40, 0.35
W_WIDE = 0.40

# Reset-flow damping targets (original)
RESET = dict(r=1.00, uA=0.25, uH=0.20, uS=0.25, uG=0.15)

SCHEDULES = [
    "Unassisted",
    "Reset Flow",
    "Fighting Through",
    "Zero-Debt Grace",
    "Grace + Chosen Burst",
]

COLORS = {
    "Unassisted": "#677780",
    "Reset Flow": "#16817d",
    "Fighting Through": "#b34848",
    "Zero-Debt Grace": "#536bb4",
    "Grace + Chosen Burst": "#2e7d4f",
}


# ---------------------------------------------------------------------------
# EQUATIONS
# ---------------------------------------------------------------------------

def C(x: float) -> float:
    """Clip/squash to the unit interval. A hard clip is the simplest C(.);
    a logistic squash is listed as a suggested improvement."""
    return float(np.clip(x, 0.0, 1.0))


def in_window(rel: float, start: float, end: float) -> bool:
    return start <= rel < end


def cycle_rel(t: float) -> float:
    return t % CYCLE


class BurstController:
    """Fires a short friction burst only when regulation and capacity are high."""

    def __init__(self):
        self.burst_end = -1.0
        self.refract_end = -1.0

    def friction(self, t: float, P: float, Q: float, allow: bool) -> float:
        if not allow:
            return 0.0
        if t < self.burst_end:
            return F_BURST
        if t < self.refract_end:
            return 0.0
        if P >= P_BURST_THRESH and Q >= Q_BURST_THRESH:
            self.burst_end = t + T_BURST
            self.refract_end = t + T_BURST + T_REFRACTORY
            return F_BURST
        return 0.0


def schedule_inputs(name: str, t: float, P: float, Q: float, ctl: BurstController):
    rel = cycle_rel(t)
    v = V_AMP if in_window(rel, VOID_ON, VOID_OFF) else 0.0
    active = in_window(rel, INT_ON, INT_OFF)
    r = f = g_grace = uA = uH = uS = uG = 0.0
    if name == "Unassisted" or not active:
        return v, r, f, g_grace, uA, uH, uS, uG
    if name == "Reset Flow":
        r, uA, uH, uS, uG = (RESET["r"], RESET["uA"], RESET["uH"],
                             RESET["uS"], RESET["uG"])
    elif name == "Fighting Through":
        r, f = 0.70, 0.30
        # g_grace = 0: support is present but the ledger-free appraisal
        # path is not claimed for this schedule.
    elif name == "Zero-Debt Grace":
        r, g_grace, f = 0.70, 0.70, 0.00
    elif name == "Grace + Chosen Burst":
        r, g_grace = 0.70, 0.70
        f = ctl.friction(t, P, Q, allow=True)
    else:
        raise ValueError(name)
    return v, r, f, g_grace, uA, uH, uS, uG


def derivatives(A, H, S, P, G, Q, v, r, f, g_grace, uA, uH, uS, uG,
                identity_drive=0.0):
    """Right-hand sides. All drives that use C(.) are clipped; P and Q
    are naturally attracted to (0,1) for non-negative coefficients.

    identity_drive is ASSUMPTION (a): rest / low creating raises A in
    proportion to fusion I and is buffered by the record M. It is 0 when I = 0.
    """
    dA = (C(A0 + A_V * v - K_P * P - K_G_GRACE * g_grace - uA
            + identity_drive) - A) / TAU_A
    dH = (C(H0 + H_A * A - uH) - H) / TAU_H
    dS = (C(S0 + S_H * H + f - uS) - S) / TAU_S
    dP = (K_R * r * (1.0 - P) - D_F * f * P - D_S * S * P
          + REC * (P_BASE - P)) / TAU_P
    dG = (C(G0 + G_S * S * (1.0 - P) - uG) - G) / TAU_G
    L = (A + H + S + G + (1.0 - P)) / 5.0
    dQ = (Q_REC * (1.0 - L) * (1.0 - Q) - Q_DEG * L * Q) / TAU_Q
    return dA, dH, dS, dP, dG, dQ, L


def output(P, Q, f, G) -> float:
    return Q * P * (Y_BASE + Y_EFFORT * f) * (1.0 - G)


def gate_width(P: float, A: float) -> float:
    """Derived earlier: w = C(P (1 - 0.6 A))."""
    return C(P * (1.0 - 0.6 * A))


def schedule_guides(name: str, r: float, g_grace: float,
                    uA: float, uH: float, uS: float, uG: float):
    """Labeled map from a schedule to 'word', connection, and skill.

    Word (scripture or an affirmation used as an anchor) is available on
    the grace schedules, matching the suite's optional faith-aware lines.
    It is not claimed for Fighting Through or Unassisted. Connection is
    stronger when support is ledger-free. Skill is Reset Flow's
    down-regulation plus a smaller grace term.
    """
    if name in ("Zero-Debt Grace", "Grace + Chosen Burst"):
        word = 1.0
    else:
        word = 0.0
    connect = C(0.45 * r + 0.55 * g_grace)
    skill = C(0.25 * (uA + uH + uS + uG) + 0.35 * g_grace)
    return word, connect, skill


def clock_and_valence(A, P, G, I, f, f_c, f_sched, r, g_grace, M, gap, y,
                      word, connect, skill, will_steadiest=0.0):
    """Downstream phi, drift, and helpers. No feedback into the ODEs."""
    dep = C(0.40 * A + 0.30 * G + 0.30 * (1.0 - P))
    rest_eff = r * (1.0 - f) * (1.0 - I * gap)
    rum = C(A * (1.0 - P))
    iso = C((1.0 - r) * (0.5 * G + 0.5 * (1.0 - M)))
    enough = C(y / max(Y_REF, 1e-9)) * (1.0 - I) * (1.0 - f_c)
    phi_raw = PHI0 + K_REST_PHI * rest_eff + K_GRAND_PHI * I * f_c - K_DEP_PHI * dep
    # Word steadies the rate toward PHI_HOME. Sheer will does so only if
    # a sensitivity run raises K_WILL_PHI; the default is 0.
    will_term = will_steadiest * f_sched * (1.0 if g_grace <= 1e-12 else 0.0)
    phi = C(phi_raw + K_WORD_PHI * word * (PHI_HOME - phi_raw)
            + will_term * (PHI_HOME - phi_raw))
    B = C(B_M * M + B_CON * connect + B_WORD * word + B_G * g_grace)
    rum_eff = rum / (1.0 + K_STOP * B)
    drift = (K_GX * g_grace + K_RX * rest_eff + K_MX * M + K_CX * connect
             + K_EX * enough + K_SX * skill + K_WX * word
             - K_RUM * rum_eff - K_ISO * iso - K_IX * I - K_FCX * f_c)
    return {
        "dep": dep, "rest_eff": rest_eff, "rum": rum, "iso": iso,
        "enough": enough, "phi": phi, "B": B, "drift": drift,
    }


def classify_zone(x: float, rum: float, iso: float, w: float) -> str:
    """Toy in-void / edge / out guide. Not a diagnosis."""
    if (x > X_OUT and rum < RUM_LOW and iso < ISO_LOW and w > W_WIDE):
        return "out"
    if x < X_VOID and (rum > RUM_HIGH or iso > ISO_HIGH):
        return "void"
    return "edge"


def identity_gap(y_prev: float, f_prev: float) -> float:
    """ASSUMPTION (a)+(c) signal: how much 'rest feels like the void'.

    Mixes low output relative to Y_REF with not-currently-striving (1 - f).
    The mix is set a priori (W_Y = W_F = 0.5), not fitted. Using only y
    would let rest look safe whenever grace-produced y exceeds fighting y
    (as it did in the original run). Using only (1 - f) would make rest
    threatening by definition. The mix lets either channel, or both, matter.
    """
    y_term = max(0.0, 1.0 - y_prev / max(Y_REF, 1e-9))
    f_term = max(0.0, 1.0 - f_prev)
    return W_Y * y_term + W_F * f_term


def simulate(name: str, T: float = T_LONG, dt: float = DT,
             I0: float = 0.0, M: float = 0.0, decouple: bool = False,
             display_name: str | None = None,
             will_steadiest: float = None):
    """Forward Euler. I0 = 0 recovers the original model exactly, because
    identity_drive and f_c are then identically zero.
    """
    A, H, S, P, G, Q = (X0["A"], X0["H"], X0["S"], X0["P"], X0["G"], X0["Q"])
    I = float(I0)
    ctl = BurstController()
    n_steps = int(round(T / dt))
    rec_every = max(1, int(round(SAMPLE / dt)))
    rows = []
    Y = 0.0
    peak_L = 0.0
    sum_L = 0.0
    sum_A = 0.0
    peak_A = 0.0
    sum_fc = 0.0
    n_int_active = 0
    n_relapse = 0
    y_prev = output(P, Q, 0.0, G)
    f_prev = 0.0
    x_pos = X0_X
    tau = 0.0
    will_k = K_WILL_PHI if will_steadiest is None else will_steadiest
    sum_phi = sum_x = sum_w = sum_rum = sum_dep = sum_B = sum_drift = 0.0
    n_void = n_edge = n_out = 0
    min_x = 1.0
    max_x = -1.0
    min_w = 1.0

    for n in range(n_steps + 1):
        t = n * dt
        v, r, f_sched, g_grace, uA, uH, uS, uG = schedule_inputs(name, t, P, Q, ctl)
        gap = identity_gap(y_prev, f_prev)
        # ASSUMPTION (a)+(c): rest-as-void drive into A, buffered by M
        id_drive = K_I * I * (1.0 - M) * gap
        # ASSUMPTION (b): compulsive fight; does not require high P or Q
        f_c = C(F_C_MAX * I * (1.0 - M) * gap)
        f = C(f_sched + f_c)
        dA, dH, dS, dP, dG, dQ, L = derivatives(
            A, H, S, P, G, Q, v, r, f, g_grace, uA, uH, uS, uG,
            identity_drive=id_drive,
        )
        # ASSUMPTION (d): a given-identity intervention (not an achieved one)
        # slowly lowers I during the intervention window. Creating-as-overflow
        # rather than creating-to-become-someone.
        rel = cycle_rel(t)
        active = in_window(rel, INT_ON, INT_OFF)
        dI = -(K_DEC * I) / TAU_I if (decouple and active) else 0.0
        y = output(P, Q, f, G)
        peak_L = max(peak_L, L)
        sum_L += L
        sum_A += A
        peak_A = max(peak_A, A)
        if active:
            n_int_active += 1
            sum_fc += f_c
            if f_c > RELAPSE_THRESH:
                n_relapse += 1
        word, connect, skill = schedule_guides(name, r, g_grace, uA, uH, uS, uG)
        cv = clock_and_valence(A, P, G, I, f, f_c, f_sched, r, g_grace, M, gap, y,
                               word, connect, skill, will_steadiest=will_k)
        w = gate_width(P, A)
        zone = classify_zone(x_pos, cv["rum"], cv["iso"], w)
        sum_phi += cv["phi"]
        sum_x += x_pos
        sum_w += w
        sum_rum += cv["rum"]
        sum_dep += cv["dep"]
        sum_B += cv["B"]
        sum_drift += cv["drift"]
        min_x = min(min_x, x_pos)
        max_x = max(max_x, x_pos)
        min_w = min(min_w, w)
        if zone == "void":
            n_void += 1
        elif zone == "out":
            n_out += 1
        else:
            n_edge += 1
        if n % rec_every == 0:
            rows.append((t, A, H, S, P, G, Q, L, y, Y, f, r, g_grace, v,
                         I, f_c, f_sched, gap,
                         cv["phi"], tau, x_pos, w, cv["rum"], cv["dep"],
                         cv["rest_eff"], cv["B"], cv["drift"], cv["iso"],
                         {"void": 0.0, "edge": 1.0, "out": 2.0}[zone]))
        if n == n_steps:
            break
        A = C(A + dt * dA)
        H = C(H + dt * dH)
        S = C(S + dt * dS)
        P = C(P + dt * dP)
        G = C(G + dt * dG)
        Q = C(Q + dt * dQ)
        I = C(I + dt * dI)
        Y += y * dt
        tau += cv["phi"] * dt
        x_pos = float(np.clip(x_pos + dt * cv["phi"] * cv["drift"] / TAU_X, -1.0, 1.0))
        y_prev = y
        f_prev = f

    rec = np.array(rows, dtype=float)
    n_int = n_steps + 1
    metrics = {
        "schedule": display_name or name,
        "base_schedule": name,
        "I0": float(I0),
        "M": float(M),
        "decouple": bool(decouple),
        "mean_load": float(sum_L / n_int),
        "peak_load": float(peak_L),
        "cumulative_output": float(Y),
        "final_capacity": float(Q),
        "final_P": float(P),
        "final_G": float(G),
        "final_I": float(I),
        "mean_A": float(sum_A / n_int),
        "peak_A": float(peak_A),
        "mean_f_c": float(sum_fc / n_int_active) if n_int_active else 0.0,
        "relapse_frac": float(n_relapse / n_int_active) if n_int_active else 0.0,
        "mean_y": float(Y / T),
        "min_state": float(rec[:, 1:7].min()),
        "max_state": float(rec[:, 1:7].max()),
        "min_L": float(rec[:, 7].min()),
        "max_L": float(rec[:, 7].max()),
        "mean_phi": float(sum_phi / n_int),
        "final_tau": float(tau),
        "final_x": float(x_pos),
        "mean_x": float(sum_x / n_int),
        "min_x": float(min_x),
        "max_x": float(max_x),
        "mean_w": float(sum_w / n_int),
        "min_w": float(min_w),
        "mean_rum": float(sum_rum / n_int),
        "mean_dep": float(sum_dep / n_int),
        "mean_B": float(sum_B / n_int),
        "mean_drift": float(sum_drift / n_int),
        "frac_void": float(n_void / n_int),
        "frac_edge": float(n_edge / n_int),
        "frac_out": float(n_out / n_int),
    }
    return rec, metrics


COLS = ["t", "A", "H", "S", "P", "G", "Q", "L", "y", "Y", "f", "r", "g_grace", "v",
        "I", "f_c", "f_sched", "identity_gap",
        "phi", "tau", "x", "w", "rum", "dep", "rest_eff", "B", "drift", "iso", "zone"]


def save_csv(path: Path, rec: np.ndarray) -> None:
    header = ",".join(COLS)
    np.savetxt(path, rec, delimiter=",", header=header, comments="")


# ---------------------------------------------------------------------------
# Figures (SVG only; no matplotlib required)
# ---------------------------------------------------------------------------

def _polyline(xs, ys, x0, y0, pw, ph, xmin, xmax, ymin, ymax):
    pts = []
    for x, y in zip(xs, ys):
        px = x0 + pw * (x - xmin) / (xmax - xmin)
        py = y0 + ph * (1.0 - (y - ymin) / (ymax - ymin))
        pts.append(f"{px:.2f},{py:.2f}")
    return " ".join(pts)


def fig_states(runs: dict, path: Path) -> None:
    """2x2 first-episode trajectories of A, P, G, Q."""
    focal = ["Unassisted", "Fighting Through", "Zero-Debt Grace",
             "Grace + Chosen Burst"]
    panels = [("A", "A  threat appraisal"), ("P", "P  regulation"),
              ("G", "G  defensive immobility"), ("Q", "Q  allostatic capacity")]
    W, H = 920, 620
    pad_l, pad_t, gap_x, gap_y = 58, 48, 24, 42
    pw, ph = 380, 230
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}">',
         '<rect width="100%" height="100%" fill="white"/>',
         '<text x="20" y="28" font-size="14" fill="#126e73">First episode: states remain in [0, 1]. Warm band = void; cool band = intervention.</text>']
    for i, (key, lab) in enumerate(panels):
        col, row = i % 2, i // 2
        x0 = pad_l + col * (pw + gap_x + 40)
        y0 = pad_t + row * (ph + gap_y)
        # bands
        def xmap(t):
            return x0 + pw * t / T_SINGLE
        s.append(f'<rect x="{xmap(VOID_ON):.1f}" y="{y0}" width="{pw*(VOID_OFF-VOID_ON)/T_SINGLE:.1f}" height="{ph}" fill="#f4e6e2"/>')
        s.append(f'<rect x="{xmap(INT_ON):.1f}" y="{y0}" width="{pw*(INT_OFF-INT_ON)/T_SINGLE:.1f}" height="{ph}" fill="#e7f0ef" fill-opacity="0.55"/>')
        for yy in (0, 0.25, 0.5, 0.75, 1):
            y = y0 + ph * (1 - yy)
            s.append(f'<path d="M{x0},{y:.1f}h{pw}" stroke="#eee"/>')
            s.append(f'<text x="{x0-8}" y="{y+4:.1f}" font-size="11" text-anchor="end" fill="#52636b">{yy:g}</text>')
        for xt in (0, 22, 45, 60, 90):
            x = xmap(xt)
            s.append(f'<text x="{x:.1f}" y="{y0+ph+16:.1f}" font-size="11" text-anchor="middle" fill="#52636b">{xt:g}</text>')
        s.append(f'<rect x="{x0}" y="{y0}" width="{pw}" height="{ph}" fill="none" stroke="#d8e1e3"/>')
        s.append(f'<text x="{x0}" y="{y0-8}" font-size="12" fill="#126e73">{lab}</text>')
        for name in focal:
            rec = runs[name]
            mask = rec[:, 0] <= T_SINGLE + 1e-9
            pts = _polyline(rec[mask, 0], rec[mask, COLS.index(key)],
                            x0, y0, pw, ph, 0, T_SINGLE, 0, 1)
            s.append(f'<polyline points="{pts}" fill="none" stroke="{COLORS[name]}" stroke-width="2"/>')
    # legend
    lx = 58
    for name in focal:
        s.append(f'<rect x="{lx}" y="598" width="14" height="4" fill="{COLORS[name]}"/>')
        s.append(f'<text x="{lx+20}" y="604" font-size="12" fill="{COLORS[name]}">{name}</text>')
        lx += 210
    s.append('</svg>')
    svg_path = path.with_suffix(".svg") if path.suffix != ".svg" else path
    svg_path.write_text("".join(s))


def fig_load(runs: dict, path: Path) -> None:
    W, H, x0, y0, pw, ph = 920, 360, 58, 40, 840, 250
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}">',
         '<rect width="100%" height="100%" fill="white"/>',
         '<text x="20" y="24" font-size="14" fill="#126e73">Instantaneous load over four repeated void episodes</text>']
    for k in range(int(T_LONG // CYCLE) + 1):
        xa = x0 + pw * (k * CYCLE + VOID_ON) / T_LONG
        xb = x0 + pw * min(T_LONG, k * CYCLE + VOID_OFF) / T_LONG
        s.append(f'<rect x="{xa:.1f}" y="{y0}" width="{max(0, xb-xa):.1f}" height="{ph}" fill="#f4e6e2"/>')
    for yy in (0, 0.25, 0.5, 0.75, 1):
        y = y0 + ph * (1 - yy)
        s.append(f'<path d="M{x0},{y:.1f}h{pw}" stroke="#eee"/>')
        s.append(f'<text x="{x0-8}" y="{y+4:.1f}" font-size="11" text-anchor="end" fill="#52636b">{yy:g}</text>')
    for xt in (0, 80, 160, 240, 300):
        x = x0 + pw * xt / T_LONG
        s.append(f'<text x="{x:.1f}" y="{y0+ph+16:.1f}" font-size="11" text-anchor="middle" fill="#52636b">{xt:g}</text>')
    s.append(f'<rect x="{x0}" y="{y0}" width="{pw}" height="{ph}" fill="none" stroke="#d8e1e3"/>')
    for name in SCHEDULES:
        rec = runs[name]
        pts = _polyline(rec[:, 0], rec[:, COLS.index("L")],
                        x0, y0, pw, ph, 0, T_LONG, 0, 1)
        s.append(f'<polyline points="{pts}" fill="none" stroke="{COLORS[name]}" stroke-width="2"/>')
    lx = 58
    for name in SCHEDULES:
        s.append(f'<rect x="{lx}" y="332" width="14" height="4" fill="{COLORS[name]}"/>')
        s.append(f'<text x="{lx+20}" y="338" font-size="11" fill="{COLORS[name]}">{name}</text>')
        lx += 175
    s.append(f'<text x="{x0+pw/2:.0f}" y="356" font-size="12" text-anchor="middle" fill="#52636b">time (arbitrary units)</text>')
    s.append('</svg>')
    path.with_suffix(".svg").write_text("".join(s))


def fig_output(runs: dict, path: Path) -> None:
    ymax = max(float(runs[n][-1, COLS.index("Y")]) for n in SCHEDULES) * 1.08
    W, H, x0, y0, pw, ph = 920, 360, 58, 40, 840, 250
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}">',
         '<rect width="100%" height="100%" fill="white"/>',
         '<text x="20" y="24" font-size="14" fill="#126e73">Cumulative performance over the same four episodes</text>']
    ticks = np.linspace(0, ymax, 5)
    for yy in ticks:
        y = y0 + ph * (1 - yy / ymax)
        s.append(f'<path d="M{x0},{y:.1f}h{pw}" stroke="#eee"/>')
        s.append(f'<text x="{x0-8}" y="{y+4:.1f}" font-size="11" text-anchor="end" fill="#52636b">{yy:.0f}</text>')
    for xt in (0, 80, 160, 240, 300):
        x = x0 + pw * xt / T_LONG
        s.append(f'<text x="{x:.1f}" y="{y0+ph+16:.1f}" font-size="11" text-anchor="middle" fill="#52636b">{xt:g}</text>')
    s.append(f'<rect x="{x0}" y="{y0}" width="{pw}" height="{ph}" fill="none" stroke="#d8e1e3"/>')
    for name in SCHEDULES:
        rec = runs[name]
        pts = _polyline(rec[:, 0], rec[:, COLS.index("Y")],
                        x0, y0, pw, ph, 0, T_LONG, 0, ymax)
        s.append(f'<polyline points="{pts}" fill="none" stroke="{COLORS[name]}" stroke-width="2"/>')
    lx = 58
    for name in SCHEDULES:
        s.append(f'<rect x="{lx}" y="332" width="14" height="4" fill="{COLORS[name]}"/>')
        s.append(f'<text x="{lx+20}" y="338" font-size="11" fill="{COLORS[name]}">{name}</text>')
        lx += 175
    s.append(f'<text x="{x0+pw/2:.0f}" y="356" font-size="12" text-anchor="middle" fill="#52636b">time (arbitrary units)</text>')
    s.append('</svg>')
    path.with_suffix(".svg").write_text("".join(s))


def _heat_color(val: float, vmax: float) -> str:
    """Blue if burst wins (positive), red if fighting wins (negative)."""
    if vmax <= 0:
        return "#f4f6f7"
    t = max(-1.0, min(1.0, val / vmax))
    if t >= 0:
        r, g, b = (int(244 - 120 * t), int(246 - 80 * t), int(247 - 30 * t))
        r, g, b = (int(232 - 120 * t), int(240 - 40 * t), int(248 - 10 * t))
        # more clearly blue-green for positive
        r = int(238 - 170 * t)
        g = int(244 - 60 * t)
        b = int(248 - 80 * t)
    else:
        u = -t
        r = int(248 - 40 * u)
        g = int(236 - 130 * u)
        b = int(232 - 130 * u)
    return f"rgb({r},{g},{b})"


def fig_heatmap(grid: dict, path: Path, k_vals, d_vals) -> None:
    data = np.array([[grid[(kg, df)] for df in d_vals] for kg in k_vals], float)
    vmax = max(abs(float(data.min())), abs(float(data.max())), 1e-9)
    W, H = 640, 480
    x0, y0, cw, ch = 90, 70, 100, 70
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}">',
         '<rect width="100%" height="100%" fill="white"/>',
         '<text x="20" y="28" font-size="14" fill="#126e73">Y(Grace + Chosen Burst) − Y(Fighting Through)</text>',
         '<text x="20" y="46" font-size="12" fill="#52636b">Cool / positive = burst wins. Warm / negative = fighting wins.</text>',
         '<text x="320" y="470" font-size="12" text-anchor="middle" fill="#23313b">friction cost d_f (how hard f depletes P)</text>',
         '<text x="18" y="260" font-size="12" fill="#23313b" transform="rotate(-90 18 260)">grace-on-appraisal k_g (extra A suppression)</text>']
    for i, kg in enumerate(k_vals):
        for j, df in enumerate(d_vals):
            val = float(data[i, j])
            x = x0 + j * cw
            y = y0 + (len(k_vals) - 1 - i) * ch
            s.append(f'<rect x="{x}" y="{y}" width="{cw-6}" height="{ch-6}" fill="{_heat_color(val, vmax)}" stroke="#d8e1e3"/>')
            s.append(f'<text x="{x+(cw-6)/2:.1f}" y="{y+(ch-6)/2+4:.1f}" font-size="13" text-anchor="middle" fill="#23313b">{val:.1f}</text>')
        y = y0 + (len(k_vals) - 1 - i) * ch + (ch-6)/2 + 4
        s.append(f'<text x="{x0-10}" y="{y:.1f}" font-size="12" text-anchor="end" fill="#52636b">{kg:.2f}</text>')
    for j, df in enumerate(d_vals):
        x = x0 + j * cw + (cw-6)/2
        s.append(f'<text x="{x:.1f}" y="{y0 + len(k_vals)*ch + 8:.1f}" font-size="12" text-anchor="middle" fill="#52636b">{df:.2f}</text>')
    s.append('</svg>')
    path.with_suffix(".svg").write_text("".join(s))


# ---------------------------------------------------------------------------
# Sensitivity
# ---------------------------------------------------------------------------

def run_with_overrides(name: str, **overrides):
    """Temporarily patch module-level params, run one schedule, restore."""
    saved = {k: globals()[k] for k in overrides}
    try:
        for k, v in overrides.items():
            globals()[k] = v
        _rec, met = simulate(name, T=T_LONG, dt=DT)
        return met
    finally:
        for k, v in saved.items():
            globals()[k] = v


def sensitivity():
    k_vals = [0.00, 0.15, 0.30, 0.45]
    d_vals = [0.30, 0.55, 0.80, 1.05]
    grid = {}
    for kg in k_vals:
        for df in d_vals:
            y_g = run_with_overrides("Grace + Chosen Burst",
                                    K_G_GRACE=kg, D_F=df)["cumulative_output"]
            y_f = run_with_overrides("Fighting Through",
                                    K_G_GRACE=kg, D_F=df)["cumulative_output"]
            grid[(kg, df)] = y_g - y_f

    # one-at-a-time around the default point
    oat = []
    sweeps = {
        "K_G_GRACE": [0.00, 0.15, 0.30, 0.45],
        "D_F": [0.30, 0.55, 0.80, 1.05],
        "Y_EFFORT": [0.40, 0.70, 1.00],
        "T_BURST": [4.0, 8.0, 12.0],
        "TAU_Q": [30.0, 50.0, 80.0],
        "Q_DEG": [0.30, 0.55, 0.80],
    }
    for param, values in sweeps.items():
        for val in values:
            mets = {}
            for name in ["Fighting Through", "Zero-Debt Grace",
                         "Grace + Chosen Burst"]:
                mets[name] = run_with_overrides(name, **{param: val})
            oat.append({
                "param": param,
                "value": val,
                "Y_fight": mets["Fighting Through"]["cumulative_output"],
                "Y_grace": mets["Zero-Debt Grace"]["cumulative_output"],
                "Y_burst": mets["Grace + Chosen Burst"]["cumulative_output"],
                "Q_fight": mets["Fighting Through"]["final_capacity"],
                "Q_grace": mets["Zero-Debt Grace"]["final_capacity"],
                "Q_burst": mets["Grace + Chosen Burst"]["final_capacity"],
                "burst_minus_fight": (
                    mets["Grace + Chosen Burst"]["cumulative_output"]
                    - mets["Fighting Through"]["cumulative_output"]
                ),
            })
    return k_vals, d_vals, grid, oat


def timestep_check():
    """Max absolute difference in final (A,H,S,P,G,Q) when dt is halved."""
    out = {}
    for name in SCHEDULES:
        a, _ = simulate(name, T=T_SINGLE, dt=DT)
        b, _ = simulate(name, T=T_SINGLE, dt=DT / 2)
        # compare last recorded sample of the shared variables
        out[name] = float(np.max(np.abs(a[-1, 1:7] - b[-1, 1:7])))
    return out



# ---------------------------------------------------------------------------
# High-I experiment: identity fused with creating
# ---------------------------------------------------------------------------

HI_COLORS = {
    "Unassisted": "#677780",
    "Fighting Through": "#b34848",
    "Rest-only": "#536bb4",
    "Grace + Record": "#b8860b",
    "Grace + Identity Decoupling": "#6b4c9a",
    "Combined": "#2e7d4f",
}

HI_CONFIGS = [
    # display_name, base schedule name, M, decouple
    ("Unassisted", "Unassisted", M_LOW, False),
    ("Fighting Through", "Fighting Through", M_LOW, False),
    ("Rest-only", "Zero-Debt Grace", M_LOW, False),
    ("Grace + Record", "Zero-Debt Grace", M_HIGH, False),
    ("Grace + Identity Decoupling", "Zero-Debt Grace", M_LOW, True),
    ("Combined", "Zero-Debt Grace", M_HIGH, True),
]


def run_high_i(T: float = T_LONG, dt: float = DT, I0: float = None, k_i=None):
    saved_ki = K_I
    if k_i is not None:
        globals()["K_I"] = k_i
    try:
        i0 = I0_HIGH if I0 is None else I0
        runs, metrics = {}, []
        for display, base, M, dec in HI_CONFIGS:
            rec, met = simulate(base, T=T, dt=dt, I0=i0, M=M, decouple=dec,
                                display_name=display)
            runs[display] = rec
            metrics.append(met)
        return runs, metrics
    finally:
        globals()["K_I"] = saved_ki


def fig_hi_series(runs: dict, col: str, title: str, path: Path, ymax=1.0) -> None:
    names = [c[0] for c in HI_CONFIGS]
    W, H, x0, y0, pw, ph = 920, 380, 58, 48, 840, 250
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}">',
         '<rect width="100%" height="100%" fill="white"/>',
         f'<text x="20" y="24" font-size="14" fill="#126e73">{title}</text>']
    for k in range(int(T_LONG // CYCLE) + 1):
        xa = x0 + pw * (k * CYCLE + VOID_ON) / T_LONG
        xb = x0 + pw * min(T_LONG, k * CYCLE + VOID_OFF) / T_LONG
        s.append(f'<rect x="{xa:.1f}" y="{y0}" width="{max(0, xb-xa):.1f}" height="{ph}" fill="#f4e6e2"/>')
    ticks = np.linspace(0, ymax, 5)
    for yy in ticks:
        y = y0 + ph * (1 - yy / ymax)
        s.append(f'<path d="M{x0},{y:.1f}h{pw}" stroke="#eee"/>')
        lab = f"{yy:.2f}".rstrip("0").rstrip(".")
        s.append(f'<text x="{x0-8}" y="{y+4:.1f}" font-size="11" text-anchor="end" fill="#52636b">{lab}</text>')
    for xt in (0, 80, 160, 240, 300):
        x = x0 + pw * xt / T_LONG
        s.append(f'<text x="{x:.1f}" y="{y0+ph+16:.1f}" font-size="11" text-anchor="middle" fill="#52636b">{xt:g}</text>')
    s.append(f'<rect x="{x0}" y="{y0}" width="{pw}" height="{ph}" fill="none" stroke="#d8e1e3"/>')
    for name in names:
        rec = runs[name]
        pts = _polyline(rec[:, 0], rec[:, COLS.index(col)],
                        x0, y0, pw, ph, 0, T_LONG, 0, ymax)
        s.append(f'<polyline points="{pts}" fill="none" stroke="{HI_COLORS[name]}" stroke-width="2"/>')
    lx, ly = 20, 336
    for name in names:
        s.append(f'<rect x="{lx}" y="{ly}" width="12" height="4" fill="{HI_COLORS[name]}"/>')
        s.append(f'<text x="{lx+16}" y="{ly+6}" font-size="10" fill="{HI_COLORS[name]}">{name}</text>')
        lx += 150
        if lx > 850:
            lx = 20
            ly += 16
    s.append('</svg>')
    path.write_text("".join(s))


def fig_hi_ki(sweep: list, path: Path) -> None:
    """Grouped bars: Y vs K_I for Rest-only, Fighting Through, Combined."""
    ks = sorted({row["K_I"] for row in sweep})
    series = ["Rest-only", "Fighting Through", "Combined"]
    colors = {n: HI_COLORS[n] for n in series}
    vals = {(row["K_I"], row["schedule"]): row["cumulative_output"] for row in sweep}
    ymax = max(vals.values()) * 1.12
    W, H, x0, y0, pw, ph = 720, 360, 58, 40, 620, 240
    n_k, n_s = len(ks), len(series)
    group_w = pw / n_k
    bar_w = group_w * 0.22
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}">',
         '<rect width="100%" height="100%" fill="white"/>',
         '<text x="20" y="24" font-size="14" fill="#126e73">Sensitivity of cumulative Y to rest-as-void gain k_I (high-I person)</text>']
    ticks = np.linspace(0, ymax, 5)
    for yy in ticks:
        y = y0 + ph * (1 - yy / ymax)
        s.append(f'<path d="M{x0},{y:.1f}h{pw}" stroke="#eee"/>')
        s.append(f'<text x="{x0-8}" y="{y+4:.1f}" font-size="11" text-anchor="end" fill="#52636b">{yy:.0f}</text>')
    s.append(f'<rect x="{x0}" y="{y0}" width="{pw}" height="{ph}" fill="none" stroke="#d8e1e3"/>')
    for i, k in enumerate(ks):
        gx = x0 + i * group_w + group_w * 0.18
        for j, name in enumerate(series):
            v = vals[(k, name)]
            bh = ph * v / ymax
            x = gx + j * bar_w
            y = y0 + ph - bh
            s.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{bar_w-3:.1f}" height="{bh:.1f}" fill="{colors[name]}"/>')
        s.append(f'<text x="{x0 + (i+0.5)*group_w:.1f}" y="{y0+ph+16:.1f}" font-size="11" text-anchor="middle" fill="#52636b">k_I={k:g}</text>')
    lx = 58
    for name in series:
        s.append(f'<rect x="{lx}" y="330" width="14" height="4" fill="{colors[name]}"/>')
        s.append(f'<text x="{lx+20}" y="336" font-size="12" fill="{colors[name]}">{name}</text>')
        lx += 200
    s.append(f'<text x="{x0+pw/2:.0f}" y="354" font-size="12" text-anchor="middle" fill="#52636b">a priori default is k_I = 0.45</text>')
    s.append('</svg>')
    path.write_text("".join(s))


def ki_sensitivity():
    """Brief sweep of K_I; other identity params held at their a priori defaults."""
    out = []
    for ki in (0.00, 0.25, 0.45, 0.65):
        _runs, mets = run_high_i(k_i=ki)
        for met in mets:
            if met["schedule"] in ("Rest-only", "Fighting Through", "Combined",
                                   "Grace + Record", "Grace + Identity Decoupling"):
                out.append({
                    "K_I": ki,
                    "schedule": met["schedule"],
                    "cumulative_output": met["cumulative_output"],
                    "mean_load": met["mean_load"],
                    "mean_A": met["mean_A"],
                    "peak_A": met["peak_A"],
                    "mean_f_c": met["mean_f_c"],
                    "relapse_frac": met["relapse_frac"],
                    "final_I": met["final_I"],
                    "final_capacity": met["final_capacity"],
                })
    return out


def valence_summary(met):
    keys = ["schedule", "I0", "M", "decouple",
            "mean_load", "cumulative_output", "final_capacity",
            "mean_phi", "final_tau", "mean_x", "final_x", "min_x", "max_x",
            "mean_w", "min_w", "mean_rum", "mean_dep", "mean_B", "mean_drift",
            "frac_void", "frac_edge", "frac_out", "peak_A", "mean_f_c", "final_I"]
    return {k: met[k] for k in keys if k in met}


def fig_valence(runs, names, colors, title, path, col="x", ymin=-1.0, ymax=1.0):
    W, H, x0, y0, pw, ph = 920, 380, 58, 48, 840, 250
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}">',
         '<rect width="100%" height="100%" fill="white"/>',
         f'<text x="20" y="24" font-size="14" fill="#126e73">{title}</text>']
    for k in range(int(T_LONG // CYCLE) + 1):
        xa = x0 + pw * (k * CYCLE + VOID_ON) / T_LONG
        xb = x0 + pw * min(T_LONG, k * CYCLE + VOID_OFF) / T_LONG
        s.append(f'<rect x="{xa:.1f}" y="{y0}" width="{max(0, xb-xa):.1f}" height="{ph}" fill="#f4e6e2"/>')
    # zero line
    z = y0 + ph * (1 - (0 - ymin) / (ymax - ymin))
    s.append(f'<path d="M{x0},{z:.1f}h{pw}" stroke="#bbb" stroke-dasharray="4 4"/>')
    ticks = np.linspace(ymin, ymax, 5)
    for yy in ticks:
        y = y0 + ph * (1 - (yy - ymin) / (ymax - ymin))
        s.append(f'<path d="M{x0},{y:.1f}h{pw}" stroke="#eee"/>')
        s.append(f'<text x="{x0-8}" y="{y+4:.1f}" font-size="11" text-anchor="end" fill="#52636b">{yy:g}</text>')
    for xt in (0, 80, 160, 240, 300):
        x = x0 + pw * xt / T_LONG
        s.append(f'<text x="{x:.1f}" y="{y0+ph+16:.1f}" font-size="11" text-anchor="middle" fill="#52636b">{xt:g}</text>')
    s.append(f'<rect x="{x0}" y="{y0}" width="{pw}" height="{ph}" fill="none" stroke="#d8e1e3"/>')
    for name in names:
        rec = runs[name]
        pts = _polyline(rec[:, 0], rec[:, COLS.index(col)],
                        x0, y0, pw, ph, 0, T_LONG, ymin, ymax)
        s.append(f'<polyline points="{pts}" fill="none" stroke="{colors[name]}" stroke-width="2"/>')
    lx, ly = 20, 336
    for name in names:
        s.append(f'<rect x="{lx}" y="{ly}" width="12" height="4" fill="{colors[name]}"/>')
        s.append(f'<text x="{lx+16}" y="{ly+6}" font-size="10" fill="{colors[name]}">{name}</text>')
        lx += 175
        if lx > 860:
            lx = 20
            ly += 16
    s.append('</svg>')
    path.write_text("".join(s))


def run_valence():
    """I=0 and high-I readouts, plus a small a priori sensitivity."""
    i0_runs, i0_mets = {}, []
    for name in SCHEDULES:
        rec, met = simulate(name, T=T_LONG, dt=DT)
        i0_runs[name] = rec
        i0_mets.append(met)
    hi_runs, hi_mets = run_high_i()

    # Sensitivity: vary one clock/valence coefficient at a time on
    # Fighting Through vs Zero-Debt Grace vs Combined (high-I).
    sweep = []
    params = {
        "K_DEP_PHI": [0.00, 0.50, 1.00],
        "K_GRAND_PHI": [0.00, 0.55, 1.10],
        "K_STOP": [0.00, 1.20, 2.40],
        "K_WILL_PHI": [0.00, 0.40],
    }
    saved = {k: globals()[k] for k in params}
    try:
        for pname, values in params.items():
            for k, v in saved.items():
                globals()[k] = v
            for val in values:
                globals()[pname] = val
                fight = simulate("Fighting Through", T=T_LONG, dt=DT,
                                 will_steadiest=(val if pname == "K_WILL_PHI" else 0.0))[1]
                grace = simulate("Zero-Debt Grace", T=T_LONG, dt=DT)[1]
                comb = simulate("Zero-Debt Grace", T=T_LONG, dt=DT,
                                 I0=I0_HIGH, M=M_HIGH, decouple=True,
                                 display_name="Combined")[1]
                hi_fight = simulate("Fighting Through", T=T_LONG, dt=DT,
                                    I0=I0_HIGH, M=M_LOW, decouple=False,
                                    display_name="Fighting Through",
                                    will_steadiest=(val if pname == "K_WILL_PHI" else 0.0))[1]
                sweep.append({
                    "param": pname,
                    "value": val,
                    "I0_fight_final_x": fight["final_x"],
                    "I0_fight_mean_phi": fight["mean_phi"],
                    "I0_fight_frac_out": fight["frac_out"],
                    "I0_grace_final_x": grace["final_x"],
                    "I0_grace_mean_phi": grace["mean_phi"],
                    "I0_grace_frac_out": grace["frac_out"],
                    "hi_fight_final_x": hi_fight["final_x"],
                    "hi_fight_mean_phi": hi_fight["mean_phi"],
                    "hi_fight_frac_void": hi_fight["frac_void"],
                    "hi_comb_final_x": comb["final_x"],
                    "hi_comb_mean_phi": comb["mean_phi"],
                    "hi_comb_frac_out": comb["frac_out"],
                    "hi_comb_frac_void": comb["frac_void"],
                })
    finally:
        for k, v in saved.items():
            globals()[k] = v

    fig_valence(i0_runs, SCHEDULES, COLORS,
                "Valence x over four episodes (I = 0). Warm band = void. Dashed line = 0.",
                OUT / "fig_valence_x.svg", col="x")
    fig_valence(i0_runs, SCHEDULES, COLORS,
                "Felt-time rate phi (I = 0). Above 1 is faster than the home rate.",
                OUT / "fig_valence_phi.svg", col="phi", ymin=0.0, ymax=1.5)
    hi_names = [c[0] for c in HI_CONFIGS]
    fig_valence(hi_runs, hi_names, HI_COLORS,
                "High-I valence x. Combined should climb if grace, record, and decoupling work.",
                OUT / "fig_hi_x.svg", col="x")
    fig_valence(hi_runs, hi_names, HI_COLORS,
                "High-I felt-time rate phi. Grandiosity can raise phi without raising x.",
                OUT / "fig_hi_phi.svg", col="phi", ymin=0.0, ymax=1.5)

    payload = {
        "note": "Conceptual readout. phi, tau, and x do not feed back into A,H,S,P,G,Q,I,y.",
        "I0": [valence_summary(m) for m in i0_mets],
        "high_I": [valence_summary(m) for m in hi_mets],
        "sensitivity": sweep,
        "defaults": {
            "PHI0": PHI0, "PHI_HOME": PHI_HOME, "K_REST_PHI": K_REST_PHI,
            "K_GRAND_PHI": K_GRAND_PHI, "K_DEP_PHI": K_DEP_PHI,
            "K_WORD_PHI": K_WORD_PHI, "K_WILL_PHI": K_WILL_PHI,
            "TAU_X": TAU_X, "X0_X": X0_X, "K_STOP": K_STOP,
        },
    }
    (OUT / "valence_results.json").write_text(json.dumps(payload, indent=2))
    return payload




def main():
    runs = {}
    metrics = []
    for name in SCHEDULES:
        rec, met = simulate(name, T=T_LONG, dt=DT)
        runs[name] = rec
        metrics.append(met)
        save_csv(OUT / (name.replace(" ", "_").replace("+", "plus") + ".csv"), rec)
        print(json.dumps(met, indent=2))

    # bounds audit
    for met in metrics:
        assert 0.0 - 1e-12 <= met["min_state"] and met["max_state"] <= 1.0 + 1e-12, met
        assert 0.0 - 1e-12 <= met["min_L"] and met["max_L"] <= 1.0 + 1e-12, met

    conv = timestep_check()
    print("timestep check (dt vs dt/2, max |Δ| of final states):", conv)

    # Reuse the already-computed original sensitivity (I = 0 path is unchanged).
    # Re-run it only if results.json is missing that block.
    prev_path = OUT / "results.json"
    prev = json.loads(prev_path.read_text()) if prev_path.exists() else {}
    if prev.get("heatmap") and prev.get("one_at_a_time"):
        k_vals = prev["heatmap"]["k_g_values"]
        d_vals = prev["heatmap"]["d_f_values"]
        grid = {(row["k_g"], row["d_f"]): row["delta_Y"]
                for row in prev["heatmap"]["burst_minus_fight"]}
        oat = prev["one_at_a_time"]
        print("reused prior I=0 sensitivity from results.json")
    else:
        k_vals, d_vals, grid, oat = sensitivity()
    n_blue = sum(1 for v in grid.values() if v > 0)
    print(f"heatmap cells where Grace+Burst beats Fighting Through: "
          f"{n_blue}/{len(grid)}")

    fig_states(runs, OUT / "fig_states.svg")
    fig_load(runs, OUT / "fig_load.svg")
    fig_output(runs, OUT / "fig_output.svg")
    fig_heatmap(grid, OUT / "fig_heatmap.svg", k_vals, d_vals)

    payload = {
        "metrics": metrics,
        "timestep_check": conv,
        "heatmap": {
            "k_g_values": k_vals,
            "d_f_values": d_vals,
            "burst_minus_fight": [
                {"k_g": kg, "d_f": df, "delta_Y": grid[(kg, df)]}
                for kg in k_vals for df in d_vals
            ],
            "cells_burst_wins": n_blue,
            "cells_total": len(grid),
        },
        "one_at_a_time": oat,
        "assumptions": {
            "A_equation": "tau_A dA/dt = C(A0 + A_V v - K_P P - K_G_GRACE g_grace - u_A) - A",
            "P_equation": "tau_P dP/dt = K_R r (1-P) - D_F f P - D_S S P + REC (P_BASE - P)",
            "Q_equation": "tau_Q dQ/dt = Q_REC (1-L)(1-Q) - Q_DEG L Q",
            "y_equation": "y = Q P (Y_BASE + Y_EFFORT f) (1-G)",
            "C": "clip to [0,1]",
            "defaults": {
                "K_G_GRACE": K_G_GRACE, "D_F": D_F, "Y_EFFORT": Y_EFFORT,
                "T_BURST": T_BURST, "TAU_Q": TAU_Q, "Q_DEG": Q_DEG,
            },
        },
    }
    print("running high-I identity-fusion experiment...")
    hi_runs, hi_metrics = run_high_i()
    for met in hi_metrics:
        assert 0.0 - 1e-12 <= met["min_state"] and met["max_state"] <= 1.0 + 1e-12, met
        assert 0.0 - 1e-12 <= met["min_L"] and met["max_L"] <= 1.0 + 1e-12, met
        print(json.dumps(met, indent=2))
        fname = "hi_" + met["schedule"].replace(" ", "_").replace("+", "plus") + ".csv"
        save_csv(OUT / fname, hi_runs[met["schedule"]])

    fig_hi_series(hi_runs, "A", "High-I person: threat appraisal A (rest-as-void can spike A)",
                  OUT / "fig_hi_A.svg", ymax=1.0)
    fig_hi_series(hi_runs, "f_c", "High-I person: compulsive fight f_c (relapse to striving)",
                  OUT / "fig_hi_fc.svg", ymax=0.40)
    # cumulative output, reuse scale from data
    ymax_Y = max(float(hi_runs[n][-1, COLS.index("Y")]) for n in hi_runs) * 1.08
    fig_hi_series(hi_runs, "Y", "High-I person: cumulative output Y",
                  OUT / "fig_hi_Y.svg", ymax=ymax_Y)
    fig_hi_series(hi_runs, "I", "High-I person: identity fusion I (only decoupling schedules decline)",
                  OUT / "fig_hi_I.svg", ymax=1.0)

    print("running k_I sensitivity...")
    ki_sweep = ki_sensitivity()
    fig_hi_ki(ki_sweep, OUT / "fig_hi_ki.svg")

    payload["identity"] = {
        "metrics": hi_metrics,
        "k_I_sweep": ki_sweep,
        "assumptions": {
            "identity_gap": "gap = W_Y max(0, 1 - y_prev/Y_REF) + W_F (1 - f_prev)",
            "A_extra": "K_I * I * (1-M) * gap   added inside C(.) of the A drive",
            "f_c": "f_c = C(F_C_MAX * I * (1-M) * gap);  f = C(f_sched + f_c)",
            "I_decouple": "tau_I dI/dt = -K_DEC * I  during intervention if decouple else 0",
            "note": "I decreasing is a given-identity intervention (already a new creation), not an achieved one.",
            "defaults": {
                "I0_HIGH": I0_HIGH, "M_LOW": M_LOW, "M_HIGH": M_HIGH,
                "K_I": K_I, "F_C_MAX": F_C_MAX, "Y_REF": Y_REF,
                "W_Y": W_Y, "W_F": W_F, "TAU_I": TAU_I, "K_DEC": K_DEC,
            },
        },
    }
    (OUT / "results.json").write_text(json.dumps(payload, indent=2))
    print("wrote", OUT / "results.json")


if __name__ == "__main__":
    main()
