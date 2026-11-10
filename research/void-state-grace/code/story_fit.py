#!/usr/bin/env python3
"""
Narrative fit: match a story's (a, p, b) to the state (A, P, w·y).

Conceptual, not validated science. Downstream overlay on the existing
Void-State Euler step. When no story policy is applied the original
trajectory is recovered.

Notation matches /workspace/arielwords/STORY_RESEARCH_MAP.md
and GameParams (PathLowW = 0.33, PathHighW = 0.40).

Reproduce:
    python3 story_fit.py
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np

import sim

OUT = Path(__file__).resolve().parent

# ---------------------------------------------------------------------------
# PARAMS (a priori; not fitted to a desired ranking)
# ---------------------------------------------------------------------------

LAMBDA_A, LAMBDA_P, LAMBDA_B = 0.30, 0.30, 0.40
MARGIN = 0.08
PENALTY = 0.85
ALPHA = 0.40
Y_SCALE = 0.25
WORD_MATCH = 0.50          # no word-bag in this toy; fit does the ranking
K_BEN = 0.10               # valence pulse proportional to fit
K_HARM = 0.07              # small rise in A when b exceeds Ỹ + margin
PATH_LOW_W = 0.33          # GameParams.PathLowW
PATH_HIGH_W = 0.40         # GameParams.PathHighW
Y_SLICE = 0.18             # 2D figure: representative transfer (near Y_REF)

# Three telling-times per 80-unit cycle: early void, late void, after void
# but still in the intervention window.
STORY_RELS = (18.0, 38.0, 52.0)

# Story library. b is on the same [0, 1] scale as Ỹ.
# sustain-always is relentless positivity that asks a large next step.
STORIES = [
    {"id": "endure-stay", "path": "endure", "a": 0.80, "p": 0.22, "b": 0.10},
    {"id": "endure-name", "path": "endure", "a": 0.70, "p": 0.28, "b": 0.16},
    {"id": "out-step", "path": "out", "a": 0.48, "p": 0.52, "b": 0.36},
    {"id": "out-skill", "path": "out", "a": 0.42, "p": 0.58, "b": 0.44},
    {"id": "sustain-enough", "path": "sustain", "a": 0.18, "p": 0.62, "b": 0.40},
    {"id": "sustain-always", "path": "sustain", "a": 0.12, "p": 0.88, "b": 0.85},
]


def C(x: float) -> float:
    return sim.C(x)


def gate_width(P: float, A: float) -> float:
    return C(P * (1.0 - 0.6 * A))


def y_tilde(w: float, y: float) -> float:
    return C((w * y) / max(Y_SCALE, 1e-9))


def path_from_state(A: float, P: float, y: float = Y_SLICE) -> str:
    """Endure / out / sustain from the state triple. Labeled regions."""
    w = gate_width(P, A)
    if w < PATH_LOW_W or A >= 0.60:
        return "endure"
    if A <= 0.30 and P >= 0.60 and w >= PATH_HIGH_W:
        return "sustain"
    return "out"


def score_story(A, P, y, story, word_match=WORD_MATCH):
    w = gate_width(P, A)
    yt = y_tilde(w, y)
    dist = np.sqrt(
        LAMBDA_A * (A - story["a"]) ** 2
        + LAMBDA_P * (P - story["p"]) ** 2
        + LAMBDA_B * (yt - story["b"]) ** 2
    )
    over = max(0.0, story["b"] - (yt + MARGIN))
    fit = C(1.0 - float(dist) - (PENALTY if over > 0.0 else 0.0))
    final = ALPHA * word_match + (1.0 - ALPHA) * fit
    return {
        "dist": float(dist),
        "over": float(over),
        "fit": float(fit),
        "final": float(final),
        "w": float(w),
        "yt": float(yt),
        "overshoot": over > 0.0,
    }


def pick_story(A, P, y, policy: str, rng: np.random.Generator):
    if policy == "none":
        return None, None
    if policy == "sustain":
        story = next(s for s in STORIES if s["id"] == "sustain-always")
        return story, score_story(A, P, y, story)
    if policy == "random":
        story = STORIES[int(rng.integers(0, len(STORIES)))]
        return story, score_story(A, P, y, story)
    if policy == "matched":
        best, best_sc = None, None
        for story in STORIES:
            sc = score_story(A, P, y, story)
            if best_sc is None or sc["final"] > best_sc["final"]:
                best, best_sc = story, sc
        return best, best_sc
    raise ValueError(policy)


def story_times(T: float):
    times = []
    k = 0
    while True:
        base = k * sim.CYCLE
        if base >= T:
            break
        for rel in STORY_RELS:
            t = base + rel
            if t <= T:
                times.append(t)
        k += 1
    return times


def run_with_stories(name: str, policy: str, T: float = sim.T_LONG,
                     dt: float = sim.DT, I0: float = 0.0, M: float = 0.0,
                     decouple: bool = False, seed: int = 0,
                     display_name: str | None = None):
    """Forward Euler copied from sim.simulate, plus discrete story pulses.

    Story pulses are the only difference. policy='none' recovers the
    original trajectory (checked in main).
    """
    A, H, S, P, G, Q = (sim.X0["A"], sim.X0["H"], sim.X0["S"],
                        sim.X0["P"], sim.X0["G"], sim.X0["Q"])
    I = float(I0)
    ctl = sim.BurstController()
    n_steps = int(round(T / dt))
    rec_every = max(1, int(round(sim.SAMPLE / dt)))
    rng = np.random.default_rng(seed)
    events = story_times(T)
    ev_i = 0
    ev_eps = dt * 0.51

    x_pos = sim.X0_X
    tau = 0.0
    y_prev = sim.output(P, Q, 0.0, G)
    f_prev = 0.0
    Y = 0.0
    sum_L = peak_L = sum_A = peak_A = 0.0
    sum_x = 0.0
    n_void = n_edge = n_out = 0
    picks = []
    n_over = 0
    sum_fit = 0.0

    for n in range(n_steps + 1):
        t = n * dt
        v, r, f_sched, g_grace, uA, uH, uS, uG = sim.schedule_inputs(
            name, t, P, Q, ctl)
        gap = sim.identity_gap(y_prev, f_prev)
        id_drive = sim.K_I * I * (1.0 - M) * gap
        f_c = C(sim.F_C_MAX * I * (1.0 - M) * gap)
        f = C(f_sched + f_c)
        dA, dH, dS, dP, dG, dQ, L = sim.derivatives(
            A, H, S, P, G, Q, v, r, f, g_grace, uA, uH, uS, uG,
            identity_drive=id_drive,
        )
        rel = sim.cycle_rel(t)
        active = sim.in_window(rel, sim.INT_ON, sim.INT_OFF)
        dI = -(sim.K_DEC * I) / sim.TAU_I if (decouple and active) else 0.0
        y = sim.output(P, Q, f, G)
        word, connect, skill = sim.schedule_guides(
            name, r, g_grace, uA, uH, uS, uG)
        cv = sim.clock_and_valence(
            A, P, G, I, f, f_c, f_sched, r, g_grace, M, gap, y,
            word, connect, skill, will_steadiest=0.0,
        )
        w = gate_width(P, A)
        zone = sim.classify_zone(x_pos, cv["rum"], cv["iso"], w)

        # Discrete story pulse at scheduled times (after the readout, so
        # the pick sees the current state).
        while ev_i < len(events) and t + ev_eps >= events[ev_i]:
            story, sc = pick_story(A, P, y, policy, rng)
            if story is not None:
                x_pos = float(np.clip(x_pos + K_BEN * sc["fit"], -1.0, 1.0))
                if sc["overshoot"]:
                    A = C(A + K_HARM)
                    n_over += 1
                sum_fit += sc["fit"]
                picks.append({
                    "t": float(events[ev_i]),
                    "id": story["id"],
                    "path": story["path"],
                    "fit": sc["fit"],
                    "final": sc["final"],
                    "overshoot": sc["overshoot"],
                    "A": float(A), "P": float(P), "y": float(y),
                    "yt": sc["yt"], "w": sc["w"],
                })
            ev_i += 1

        sum_L += L
        peak_L = max(peak_L, L)
        sum_A += A
        peak_A = max(peak_A, A)
        sum_x += x_pos
        if zone == "void":
            n_void += 1
        elif zone == "out":
            n_out += 1
        else:
            n_edge += 1
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
        x_pos = float(np.clip(
            x_pos + dt * cv["phi"] * cv["drift"] / sim.TAU_X, -1.0, 1.0))
        y_prev = y
        f_prev = f

    n_int = n_steps + 1
    n_pick = max(len(picks), 1)
    path_counts = {"endure": 0, "out": 0, "sustain": 0}
    for pk in picks:
        path_counts[pk["path"]] = path_counts.get(pk["path"], 0) + 1
    return {
        "schedule": display_name or name,
        "base_schedule": name,
        "policy": policy,
        "seed": seed,
        "I0": float(I0),
        "M": float(M),
        "decouple": bool(decouple),
        "mean_load": float(sum_L / n_int),
        "peak_load": float(peak_L),
        "cumulative_output": float(Y),
        "mean_A": float(sum_A / n_int),
        "peak_A": float(peak_A),
        "mean_x": float(sum_x / n_int),
        "final_x": float(x_pos),
        "frac_void": float(n_void / n_int),
        "frac_edge": float(n_edge / n_int),
        "frac_out": float(n_out / n_int),
        "n_stories": len(picks),
        "n_overshoot": n_over,
        "frac_overshoot": float(n_over / n_pick) if picks else 0.0,
        "mean_fit": float(sum_fit / n_pick) if picks else 0.0,
        "path_counts": path_counts,
        "picks": picks,
    }


def fig_path_slice(path: Path) -> None:
    """2D slice: A vs P, colored by path, with Ỹ contours at fixed y."""
    n = 160
    As = np.linspace(0.0, 1.0, n)
    Ps = np.linspace(0.0, 1.0, n)
    colors = {"endure": (196, 90, 72), "out": (83, 107, 180),
              "sustain": (46, 125, 79)}
    W, H = 640, 560
    x0, y0, pw, ph = 70, 48, 460, 460
    # pixel grid as PPM-like RGB then write via SVG rectangles in strips
    # (full 160^2 rects is heavy; draw row strips of run-length cells)
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}">',
         '<rect width="100%" height="100%" fill="white"/>',
         '<text x="20" y="28" font-size="14" fill="#126e73">'
         "Path regions in (A, P) at y = 0.18. Contours are the unit-interval "
         "effective bridge Ỹ = C(w·y / 0.25).</text>"]
    dx = pw / (n - 1)
    dy = ph / (n - 1)
    # Draw as horizontal runs
    for j, Pv in enumerate(Ps):
        i0 = 0
        prev = path_from_state(As[0], Pv, Y_SLICE)
        for i in range(1, n + 1):
            cur = path_from_state(As[i], Pv, Y_SLICE) if i < n else None
            if cur != prev:
                x = x0 + i0 * dx
                y = y0 + (1.0 - Pv) * ph - dy * 0.55
                ww = (i - i0) * dx + 0.4
                r, g, b = colors[prev]
                s.append(
                    f'<rect x="{x:.2f}" y="{y:.2f}" width="{ww:.2f}" '
                    f'height="{dy+0.5:.2f}" fill="rgb({r},{g},{b})" '
                    f'fill-opacity="0.72"/>')
                i0 = i
                prev = cur
    # Ỹ contours
    levels = (0.15, 0.30, 0.45, 0.60)
    for lev in levels:
        xs, ys = [], []
        for Pv in Ps:
            # Ỹ = C(P(1-0.6A) * y / Y_SCALE) = lev
            # P (1-0.6A) = lev * Y_SCALE / y
            target = lev * Y_SCALE / Y_SLICE
            if Pv <= 1e-9:
                continue
            inner = target / Pv
            # 1 - 0.6 A = inner  => A = (1 - inner) / 0.6
            A_c = (1.0 - inner) / 0.6
            if 0.0 <= A_c <= 1.0:
                xs.append(x0 + A_c * pw)
                ys.append(y0 + (1.0 - Pv) * ph)
        if len(xs) >= 2:
            pts = " ".join(f"{x:.1f},{y:.1f}" for x, y in zip(xs, ys))
            s.append(f'<polyline points="{pts}" fill="none" stroke="#23313b" '
                     f'stroke-width="1.2" stroke-dasharray="5 3"/>')
            s.append(f'<text x="{xs[-1]+6:.1f}" y="{ys[-1]+4:.1f}" '
                     f'font-size="11" fill="#23313b">Ỹ={lev:g}</text>')
    s.append(f'<rect x="{x0}" y="{y0}" width="{pw}" height="{ph}" '
             f'fill="none" stroke="#d8e1e3"/>')
    for tick in (0, 0.25, 0.5, 0.75, 1):
        x = x0 + tick * pw
        y = y0 + (1 - tick) * ph
        s.append(f'<text x="{x:.1f}" y="{y0+ph+16:.1f}" font-size="11" '
                 f'text-anchor="middle" fill="#52636b">{tick:g}</text>')
        s.append(f'<text x="{x0-8:.1f}" y="{y+4:.1f}" font-size="11" '
                 f'text-anchor="end" fill="#52636b">{tick:g}</text>')
    s.append(f'<text x="{x0+pw/2:.0f}" y="{y0+ph+34:.0f}" font-size="12" '
             f'text-anchor="middle" fill="#52636b">threat A</text>')
    s.append(f'<text x="18" y="{y0+ph/2:.0f}" font-size="12" fill="#52636b" '
             f'transform="rotate(-90 18,{y0+ph/2:.0f})">control P</text>')
    lx, ly = 545, 80
    for name, col in (("endure", colors["endure"]),
                      ("out", colors["out"]),
                      ("sustain", colors["sustain"])):
        s.append(f'<rect x="{lx}" y="{ly}" width="14" height="14" '
                 f'fill="rgb({col[0]},{col[1]},{col[2]})" fill-opacity="0.72"/>')
        s.append(f'<text x="{lx+22}" y="{ly+12}" font-size="12" '
                 f'fill="#23313b">{name}</text>')
        ly += 24
    s.append(f'<text x="{lx}" y="{ly+16}" font-size="11" fill="#52636b">'
             f'dashed = Ỹ</text>')
    s.append('</svg>')
    path.write_text("".join(s))


def summarize(rows):
    """Mean across random seeds; single-seed policies pass through."""
    keys = ["mean_load", "peak_load", "cumulative_output", "mean_A", "peak_A",
            "mean_x", "final_x", "frac_void", "frac_edge", "frac_out",
            "n_stories", "n_overshoot", "frac_overshoot", "mean_fit"]
    out = {k: float(np.mean([r[k] for r in rows])) for k in keys}
    out["n_seeds"] = len(rows)
    # path counts averaged
    pc = {"endure": 0.0, "out": 0.0, "sustain": 0.0}
    for r in rows:
        for k, v in r["path_counts"].items():
            pc[k] = pc.get(k, 0.0) + v
    n = len(rows)
    out["mean_path_counts"] = {k: v / n for k, v in pc.items()}
    return out


def main():
    # Recover original Unassisted load when policy is none.
    base = run_with_stories("Unassisted", "none")
    rec0, met0 = sim.simulate("Unassisted")
    assert abs(base["mean_load"] - met0["mean_load"]) < 1e-6, (
        base["mean_load"], met0["mean_load"])
    assert abs(base["cumulative_output"] - met0["cumulative_output"]) < 1e-4
    print("none-policy recovers Unassisted Table 1 load/Y:",
          round(base["mean_load"], 3), round(base["cumulative_output"], 2))

    configs = [
        ("Unassisted", "Unassisted", 0.0, 0.0, False),
        ("Zero-Debt Grace", "Zero-Debt Grace", 0.0, 0.0, False),
        ("High-I Unassisted", "Unassisted", sim.I0_HIGH, sim.M_LOW, False),
        ("High-I Combined", "Zero-Debt Grace", sim.I0_HIGH, sim.M_HIGH, True),
    ]
    policies = ("none", "matched", "random", "sustain")
    results = []
    for display, base_name, I0, M, dec in configs:
        for pol in policies:
            seeds = range(8) if pol == "random" else [0]
            rows = [run_with_stories(base_name, pol, I0=I0, M=M,
                                     decouple=dec, seed=s,
                                     display_name=display)
                    for s in seeds]
            summary = summarize(rows)
            summary.update({
                "label": display,
                "policy": pol,
                "I0": I0,
                "M": M,
                "decouple": dec,
            })
            # keep one pick log from the first seed for inspection
            summary["example_picks"] = [
                {k: pk[k] for k in ("t", "id", "path", "fit", "overshoot",
                                    "yt", "w") if k in pk}
                for pk in rows[0]["picks"]
            ]
            results.append(summary)
            print(f"{display:22} {pol:8} x={summary['mean_x']:+.3f} "
                  f"fin={summary['final_x']:+.3f} void={summary['frac_void']:.3f} "
                  f"out={summary['frac_out']:.3f} A={summary['mean_A']:.3f} "
                  f"pkA={summary['peak_A']:.3f} fit={summary['mean_fit']:.3f} "
                  f"over={summary['frac_overshoot']:.3f} "
                  f"paths={summary['mean_path_counts']}")

    fig_path_slice(OUT / "fig_story_paths.svg")
    payload = {
        "note": (
            "Conceptual. Story pulses change A and x only at scheduled times. "
            "policy=none recovers the original trajectory. Random is the mean "
            "of 8 seeds. Notation matches arielwords/STORY_RESEARCH_MAP.md."
        ),
        "defaults": {
            "LAMBDA_A": LAMBDA_A, "LAMBDA_P": LAMBDA_P, "LAMBDA_B": LAMBDA_B,
            "MARGIN": MARGIN, "PENALTY": PENALTY, "ALPHA": ALPHA,
            "Y_SCALE": Y_SCALE, "K_BEN": K_BEN, "K_HARM": K_HARM,
            "PATH_LOW_W": PATH_LOW_W, "PATH_HIGH_W": PATH_HIGH_W,
            "Y_SLICE": Y_SLICE, "STORY_RELS": STORY_RELS,
        },
        "stories": STORIES,
        "results": results,
    }
    (OUT / "story_fit_results.json").write_text(json.dumps(payload, indent=2))
    print("wrote", OUT / "story_fit_results.json")
    print("wrote", OUT / "fig_story_paths.svg")


if __name__ == "__main__":
    main()
