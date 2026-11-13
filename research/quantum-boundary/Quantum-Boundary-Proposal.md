# Dynamic Boundary Control and Vacuum-Referenced Stabilization of Qubits
### A conceptual research proposal for Project Ariel (unified framework), revised version

**Prepared for:** Ryan Espinosa · **Date:** November 12, 2026 · **AI assistant:** Grok Bot

> **CONCEPTUAL FRAMEWORK. This is not validated quantum theory.** It is an analogy-driven mapping from a personal control framework onto laboratory observables. It is offered as a **research agenda, not a claim of new physics.** Every equation below that carries a physical claim is either a standard textbook result (labelled *standard result*) or a clearly marked engineering optimization built from standard results. Nothing here has been tested experimentally by the author.

---

## 1. Background and motivation

Project Ariel's master equations use a few control ideas: a **gate** (B_gate) that opens or closes a boundary, a **freeze-to-baseline** term (I_smart / ((T→0)·Λ_quantum)) that drives a system toward its quietest state, and a **stopping / core** pair (S_stop, E_core) that absorbs high-energy disturbances and keeps quantities finite. The earlier draft mapped these onto three quantum-mechanics use cases (tunneling, ground-state cooling, UV regularization) and joined them into one "final research equation" for qubit fidelity.

The instinct behind that draft is sound. Quantum engineering really does come down to three things: **coherent control of barriers**, **removing thermal excitations**, and **isolating the system from uncontrolled environments**. Those are exactly the levers that set qubit fidelity today. The draft also overreached in four specific ways, and this revision fixes them:

1. **"Zero-point energy suppression."** Cooling removes *thermal occupation*. It never removes the zero-point energy ½ℏω of a mode. Ground-state-cooling experiments are notable precisely because they leave zero-point motion *visible* (Diedrich et al. 1989; Safavi-Naeini et al. 2012).
2. **Division by (T→0).** The expression I_smart / ((T→0)·Λ) diverges. Physical quantities that behave well as T→0 depend on the ratio ℏω/k_BT through the Bose–Einstein occupation, and that ratio goes to zero cleanly.
3. **Equating QED UV regularization with stopping power.** Regularization is a *calculational* step inside perturbative quantum field theory, with no physical material behind it (Peskin & Schroeder 1995). Stopping power dE/dx is an *empirical* energy-loss rate of charged particles in matter (Bethe 1930). They are different things. Only the second one has a real, and recently important, role in qubit physics: ionizing radiation causing correlated errors.
4. **Treating B_gate (a psychological / metaphorical gate) as identical to a gate voltage.** In this proposal B_gate is a *label* for a measurable control parameter (flux, voltage, or drive angle). The analogy motivates the choice; it does not justify it.

## 2. Scope: three layers that must stay separate

The original draft merged its three use cases into one product. Physically they act through different mechanisms, and merging them hides which lever is responsible for an improvement. The revision keeps them as separate layers that enter one optimization **additively, through error rates**:

| Layer | What it does | Physical mechanism | Ariel label (analogy only) |
|---|---|---|---|
| **A. Coherent boundary control** | Shapes tunneling / avoided crossings to realize a target unitary | Hamiltonian engineering: E_J(Φ), V_g, drive angle θ(t) | B_gate |
| **B. Thermal-vacuum referencing** | Drives the *mode* toward n̄→0; zero-point stays intact | Bose–Einstein statistics, cooling, reset | "freeze-to-baseline" |
| **C. Bath decoupling** | Suppresses uncontrolled coupling: EM noise, Purcell loss, radiation | Filtering, shielding, dynamical decoupling, underground operation | S_stop, E_core |

## 3. Revised postulates (one per use case)

Each use case lists (i) the revised postulate, (ii) the lab observable and how it is measured, (iii) what the original symbol claimed wrongly, (iv) the corrected equation fragment, and (v) references.

### 3.1 Use case 1: B_gate → tunable barrier and avoided-crossing control (Layer A)

**(i) Revised postulate.** A qubit's effective barrier can be steered in real time by an external control parameter θ (flux Φ_ext, gate charge n_g, or a microwave drive angle). The fidelity of a gate is set by how well the trajectory θ(t) keeps the system adiabatic or controllably diabatic across avoided crossings.

**(ii) Observables.** Josephson energy E_J and charging energy E_C, taken from spectroscopy. Qubit frequency ω_q(Φ_ext), from flux-dependent spectroscopy. Landau–Zener transition probability P_LZ, measured by sweeping Φ_ext through an anticrossing at a set rate and reading the final state. Macroscopic quantum tunneling (MQT) escape rate Γ_esc, from switching-current histograms of a current-biased junction (Devoret, Martinis & Clarke 1985). STM tunneling current vs. tip–sample gap (Binnig et al. 1982).

**(iii) What the original claimed wrongly.** B_gate was treated as one universal "gate" with the same meaning in psychology and in hardware. In the lab, the gate is a specific circuit parameter with units and a calibration curve. The draft also implied that gate voltage sets STM tunneling. In STM the dominant control is the tip–sample *distance*, with an exponential sensitivity of current to gap.

**(iv) Corrected equation fragment** (all *standard results*):

```
EQUATIONS (Layer A)
  Transmon / Cooper-pair box:   H = 4 E_C (n − n_g)² − E_J(Φ_ext) cos φ
  Flux-tunable SQUID:           E_J(Φ_ext) = E_J,max · |cos(π Φ_ext / Φ_0)|
  Transmon frequency (E_J≫E_C): ℏω_q ≈ √(8 E_J E_C) − E_C
  Landau–Zener (H = ½[α t σ_z + Δ σ_x]):
                                P_LZ = exp( − π Δ² / (2 ℏ α) )
  MQT escape (weak damping):    Γ_esc ≈ a_q (ω_p / 2π) · exp( − 7.2 ΔU / ℏω_p )

PARAMS
  θ ≡ control parameter (Φ_ext, n_g, or drive phase/angle)   — the measurable "B_gate"
  Δ = minimum gap at anticrossing;  α = sweep rate of the diabatic splitting
  ΔU = barrier height;  ω_p = small-oscillation (plasma) frequency
```

**(v) References.** Caldeira & Leggett (1981); Devoret, Martinis & Clarke (1985); Zener (1932); Shevchenko, Ashhab & Nori (2010); Koch et al. (2007).

### 3.2 Use case 2: "freeze-to-baseline" → thermal occupation n̄→0, zero-point intact (Layer B)

**(i) Revised postulate.** Lowering the effective temperature of a mode, by refrigeration, sideband cooling, laser cooling, or active reset, drives its *thermal occupation* n̄ toward zero and its ground-state probability P_0 toward one. The zero-point energy ½ℏω stays unchanged and still observable.

**(ii) Observables.** Mixing-chamber base temperature T_MXC. Residual excited-state population P_1, measured by single-shot readout or Rabi-population thermometry, which gives an effective qubit temperature T_eff (Jin et al. 2015). Motional sideband asymmetry in trapped ions or optomechanics, which directly shows n̄ and the persistent zero-point contribution. BEC condensate fraction from time-of-flight imaging (Anderson et al. 1995; Davis et al. 1995).

**(iii) What the original claimed wrongly.** (a) Dividing by (T→0) is singular. (b) "Zero-point energy suppression" is false: the mode energy goes to ½ℏω, not to zero. (c) Λ_quantum was presented as a "vacuum baseline" constant. The only well-defined lab quantity it can stand for is the zero-point energy of the specific mode, ½ℏω_q. It is **not** the cosmological constant. (d) BEC is not "random static vanishing". It is a macroscopic occupation of one single-particle state below a critical temperature, set by density and quantum statistics.

**(iv) Corrected equation fragment** (*standard results*). The singular 1/(T→0) is replaced by the well-behaved freeze parameter x = ℏω/k_BT:

```
EQUATIONS (Layer B)
  Freeze parameter:          x = ℏω / (k_B T)           (x → ∞ as T → 0; nothing diverges in observables)
  Thermal occupation:        n̄(ω,T) = 1 / (e^x − 1)      → 0
  Mode energy:               ⟨E⟩ = ℏω (n̄ + ½)           → ½ℏω   (zero-point is NOT removed)
  Two-level thermal pop.:    P_1 = 1 / (1 + e^x)  ≈ n̄  for n̄ ≪ 1
  Bath-limited relaxation:   Γ_↓ = Γ_1⁰ (n̄+1),  Γ_↑ = Γ_1⁰ n̄,   so 1/T_1 = Γ_1⁰ (2n̄ + 1)

PARAMS
  Λ_quantum  ↦  E_zp = ½ ℏω_q        (mode-specific; fixed; not a tunable target)
  I_smart    ↦  dropped as a physical symbol; its role is now the optimizer itself (Sec. 4)
```

**(v) References.** Diedrich, Bergquist, Itano & Wineland (1989); Safavi-Naeini et al. (2012); Chu (1998); Cohen-Tannoudji (1998); Phillips (1998); Anderson et al. (1995); Davis et al. (1995).

### 3.3 Use case 3: S_stop, E_core → bath decoupling and radiation hardening (Layer C)

**(i) Revised postulate.** Qubit coherence is limited by coupling to uncontrolled baths: the electromagnetic environment, the readout channel (Purcell decay), two-level defects, and ionizing radiation that breaks Cooper pairs. Each channel can be suppressed by engineering its spectral density J(ω) at the qubit frequency, using filtering, Purcell filters, shielding, underground operation, and dynamical decoupling.

**(ii) Observables.** T_1, T_2 (Hahn echo), T_2* (Ramsey). Purcell-limited T_1 vs. qubit–resonator detuning (Houck et al. 2008). T_1 vs. filter cutoff and IR-shielding configuration (Córcoles et al. 2011). Quasiparticle density and correlated multi-qubit error bursts vs. radiation dose or shielding (Vepsäläinen et al. 2020; McEwen et al. 2022; Cardani et al. 2021). Noise spectra reconstructed from dynamical-decoupling sequences.

**(iii) What the original claimed wrongly.** (a) QED regularization cutoffs are not physical absorbers. They are mathematical steps that disappear from physical predictions after renormalization. No material "implements" them. (b) Stopping power is real and measurable, but it describes energy loss of *charged particles in matter*. It is relevant here **only** for one channel: cosmic-ray muons and environmental gamma rays depositing energy in the chip substrate. That energy creates phonons, which break Cooper pairs and cause correlated errors. Using dE/dx as a general metaphor for EMI filtering is an *analogy* only. (c) "Invariant core mass" E_core has no lab counterpart in qubit physics. Its best honest reinterpretation is the **superconducting gap Δ_SC**: excitations below 2Δ_SC cannot break Cooper pairs, so the gap acts as a material "core threshold".

**(iv) Corrected equation fragment:**

```
EQUATIONS (Layer C)
  Golden-rule relaxation (schematic, standard):   Γ_1,env ∝ J(ω_q) · coth(ℏω_q / 2k_BT)
  Filtered environment:                            J_eff(ω) = |H_filter(ω)|² · J(ω)
  Purcell decay (dispersive limit, standard):      Γ_P ≈ κ (g / Δ_qr)²
  Dephasing under a pulse sequence (filter-function form):
                                                   χ(t) ∝ ∫ S(ω) · F(ωt) / ω² dω
  Quasiparticle relaxation (scaling):              Γ_qp ∝ x_qp      (x_qp = normalized quasiparticle density)

PARAMS
  S_stop  ↦  shielding/attenuation stack {H_filter(ω), IR shields, Pb/underground}; dE/dx used ONLY for ionizing-radiation budget
  E_core  ↦  Δ_SC (superconducting gap); pair-breaking threshold 2Δ_SC
  κ = resonator linewidth;  g = coupling;  Δ_qr = qubit–resonator detuning
```

**(v) References.** Blais et al. (2004); Houck et al. (2008); Viola, Knill & Lloyd (1999); Vepsäläinen et al. (2020); McEwen et al. (2022). For the contrast between regularization and stopping power: Peskin & Schroeder (1995); Bethe (1930).

## 4. Measurable model: the revised master equation

**What I_smart becomes.** In the original, I_smart was the "intelligence" term in the numerator. In the revision it is the **optimizer**: the choice of control trajectory θ(t), operating temperature, and decoupling stack that maximizes fidelity. That is the honest place for "smart control" in physics.

**Coherence-limited fidelity** (*standard result*). For a qubit under amplitude damping and pure dephasing over a gate of duration t_g, the identity-channel average fidelity is F̄ = (3 + e^{−t_g/T_1} + 2e^{−t_g/T_2}) / 6. With 1/T_2 = 1/(2T_1) + Γ_φ and t_g ≪ T_1, T_2, this gives F̄ ≈ 1 − (t_g/3)(Γ_1 + Γ_φ).

**Revised master optimization (single equation):**

```
  max over { θ(·), T, 𝓢 }   F̄ ≈ 1 − (t_g/3)·[ Γ_1 + Γ_φ ] − ε_ctrl[θ(·)]

  with   Γ_1 = Γ_1⁰(𝓢)·(2 n̄(ω_q,T) + 1) + Γ_P(𝓢) + Γ_qp(𝓢)       (Layers B + C)
         Γ_φ = Γ_φ(θ, 𝓢)                                          (flux/charge noise at the bias point, filtered)
         ε_ctrl = leakage + LZ/non-adiabatic error of θ(t) w.r.t. target unitary U*   (Layer A)

  subject to   n̄(ω_q, T) ≤ n_max
               Γ_env(θ, 𝓢) ≡ Γ_1 + Γ_φ ≤ Γ_max
               U[θ(·)] = U*  (to within ε_target),   |dθ/dt| ≤ θ̇_max
```

Here 𝓢 is the decoupling/shielding stack (filters, Purcell filter, IR shielding, radiation shielding, DD sequence). The three layers now **add as rates** instead of multiplying as undefined symbols. Each term can be measured separately and switched off separately, which is what makes the model testable. An equivalent secondary figure of merit is C = min(T_1, T_2), maximized under the same constraints.

**Mapping summary (original → revised):**

| Original symbol | Revised, measurable quantity | Status |
|---|---|---|
| B_gate | θ ∈ {Φ_ext, n_g, drive phase}; E_J(Φ), P_LZ | Kept, as analogy-motivated label |
| T → 0 (in denominator) | x = ℏω/k_BT, n̄(ω,T) | Rewritten (singularity removed) |
| Λ_quantum | E_zp = ½ℏω_q (irreducible) | Rewritten; not cosmological Λ |
| I_smart | The optimizer over {θ(·), T, 𝓢} | Reinterpreted |
| S_stop | Filtering/shielding stack 𝓢; dE/dx only for ionizing radiation | Narrowed |
| E_core | Superconducting gap Δ_SC | Reinterpreted (speculative mapping) |
| "UV regularization" | — | Dropped from the physical model |

## 5. Experimental program: falsifiability and next experiments

The revised model makes predictions that can fail. These three tests are feasible on existing superconducting-qubit testbeds. Trapped-ion and neutral-atom analogues are noted.

**Test 1: Coherence vs. temperature (Layer B).** Sweep T_MXC from base temperature up to a few hundred mK. Measure P_1 and T_1 at each point.
*Prediction:* P_1 tracks 1/(1+e^{ℏω_q/k_BT}) above a saturation floor, and 1/T_1 rises as (2n̄+1).
*Kills the claim if:* the fitted residual population at base temperature stays far above the thermal value, which would point to non-thermal (e.g. quasiparticle or radiation) heating rather than the "freeze" lever. Cooling is also expected to **never** remove the zero-point signature. In an optomechanical or trapped-ion sideband-asymmetry measurement, the asymmetry must persist as n̄→0. If it vanished, that would contradict standard QM, not support Ariel.

**Test 2: Coherence vs. filter cutoff and shielding (Layer C).** Vary the line-filter cutoff, add or remove IR-absorbing shields, and compare T_1, T_2 and correlated-error rates above ground vs. with lead shielding or underground.
*Prediction:* improvements scale with the reduction in J_eff(ω_q) and in radiation flux, separately.
*Kills the claim if:* changes in shielding produce no measurable change in coherence or burst rate when other channels are known to dominate. In that case Layer C is not the bottleneck for that device, and the optimizer should down-weight it.

**Test 3: Landau–Zener sweep fidelity vs. barrier control (Layer A).** Sweep Φ_ext through an anticrossing at rates spanning the adiabatic-to-diabatic regime. Compare linear sweeps with optimized (e.g. shaped, bounded-slew) θ(t).
*Prediction:* the final-state probability follows P_LZ = exp(−πΔ²/2ℏα) for linear sweeps, and shaped trajectories reach target transfer with lower error at equal duration.
*Kills the claim if:* shaped trajectories show no advantage beyond what decoherence-limited fidelity predicts. That would mean "smart gating" adds nothing over standard pulse design.

*Atomic-physics analogues:* resolved-sideband cooling of a trapped ion to n̄ ≪ 1 (Layer B), and Landau–Zener or adiabatic rapid passage in neutral-atom tweezer arrays (Layer A).

## 6. What this is not

- **Not a theory of everything.** It is an engineering-level optimization of known physics for qubits.
- **Not a claim that psychological or personal-framework equations are quantum mechanics.** The Ariel symbols are *labels* that motivated which variables to optimize. The physics comes entirely from standard results.
- **Not zero-point energy harvesting or suppression.** ½ℏω is irreducible, and the proposal relies on that fact.
- **Not a modification of the cosmological constant Λ.** Λ_quantum here means only ½ℏω_q of a specific laboratory mode.
- **Not a new renormalization scheme.** UV regularization is a calculational tool in QFT and is left out of the physical model.

## 7. Limitations

- The fidelity expression is a first-order, Markovian, single-qubit estimate. Non-Markovian noise (1/f flux noise, TLS defects), leakage in multi-level transmons, and two-qubit crosstalk need fuller models such as Lindblad or filter-function treatments and randomized benchmarking.
- The layers are not perfectly independent. Changing θ moves ω_q, which changes n̄, J(ω_q) and Γ_P together. The optimizer has to handle these couplings explicitly.
- E_core → Δ_SC and S_stop → shielding stack are interpretive choices. Other mappings may be equally defensible.
- The novelty is mainly *organizational*. Each ingredient is established. The contribution, if any, is a disciplined, layered optimization template inspired by the Ariel framework. It should be judged by whether it helps design experiments, not by whether it is new physics.

## 8. References

1. A. O. Caldeira and A. J. Leggett, "Influence of dissipation on quantum tunneling in macroscopic systems," *Phys. Rev. Lett.* **46**, 211 (1981).
2. M. H. Devoret, J. M. Martinis, and J. Clarke, "Measurements of macroscopic quantum tunneling out of the zero-voltage state of a current-biased Josephson junction," *Phys. Rev. Lett.* **55**, 1908 (1985).
3. C. Zener, "Non-adiabatic crossing of energy levels," *Proc. R. Soc. Lond. A* **137**, 696 (1932). (Also L. D. Landau, 1932; standard result.)
4. S. N. Shevchenko, S. Ashhab, and F. Nori, "Landau–Zener–Stückelberg interferometry," *Phys. Rep.* **492**, 1 (2010).
5. G. Binnig, H. Rohrer, Ch. Gerber, and E. Weibel, "Tunneling through a controllable vacuum gap," *Appl. Phys. Lett.* **40**, 178 (1982).
6. J. Koch et al., "Charge-insensitive qubit design derived from the Cooper pair box," *Phys. Rev. A* **76**, 042319 (2007).
7. F. Diedrich, J. C. Bergquist, W. M. Itano, and D. J. Wineland, "Laser cooling to the zero-point energy of motion," *Phys. Rev. Lett.* **62**, 403 (1989).
8. A. H. Safavi-Naeini et al., "Observation of quantum motion of a nanomechanical resonator," *Phys. Rev. Lett.* **108**, 033602 (2012).
9. S. Chu, "Nobel Lecture: The manipulation of neutral particles," *Rev. Mod. Phys.* **70**, 685 (1998).
10. C. N. Cohen-Tannoudji, "Nobel Lecture: Manipulating atoms with photons," *Rev. Mod. Phys.* **70**, 707 (1998).
11. W. D. Phillips, "Nobel Lecture: Laser cooling and trapping of neutral atoms," *Rev. Mod. Phys.* **70**, 721 (1998).
12. M. H. Anderson, J. R. Ensher, M. R. Matthews, C. E. Wieman, and E. A. Cornell, "Observation of Bose–Einstein condensation in a dilute atomic vapor," *Science* **269**, 198 (1995).
13. K. B. Davis et al. (incl. W. Ketterle), "Bose–Einstein condensation in a gas of sodium atoms," *Phys. Rev. Lett.* **75**, 3969 (1995).
14. X. Y. Jin et al., "Thermal and residual excited-state population in a 3D transmon qubit," *Phys. Rev. Lett.* **114**, 240501 (2015).
15. A. Blais, R.-S. Huang, A. Wallraff, S. M. Girvin, and R. J. Schoelkopf, "Cavity quantum electrodynamics for superconducting electrical circuits," *Phys. Rev. A* **69**, 062320 (2004).
16. A. Blais, A. L. Grimsmo, S. M. Girvin, and A. Wallraff, "Circuit quantum electrodynamics," *Rev. Mod. Phys.* **93**, 025005 (2021).
17. A. A. Houck et al., "Controlling the spontaneous emission of a superconducting transmon qubit," *Phys. Rev. Lett.* **101**, 080502 (2008).
18. A. D. Córcoles et al., "Protecting superconducting qubits from radiation," *Appl. Phys. Lett.* **99**, 181906 (2011).
19. L. Viola, E. Knill, and S. Lloyd, "Dynamical decoupling of open quantum systems," *Phys. Rev. Lett.* **82**, 2417 (1999).
20. A. P. Vepsäläinen et al., "Impact of ionizing radiation on superconducting qubit coherence," *Nature* **584**, 551 (2020).
21. M. McEwen et al., "Resolving catastrophic error bursts from cosmic rays in large arrays of superconducting qubits," *Nat. Phys.* **18**, 107 (2022).
22. L. Cardani et al., "Reducing the impact of radioactivity on quantum circuits in a deep-underground facility," *Nat. Commun.* **12**, 2733 (2021).
23. P. Krantz et al., "A quantum engineer's guide to superconducting qubits," *Appl. Phys. Rev.* **6**, 021318 (2019).
24. M. E. Peskin and D. V. Schroeder, *An Introduction to Quantum Field Theory* (Addison-Wesley, 1995). Regularization and renormalization as calculational procedures.
25. H. Bethe, "Zur Theorie des Durchgangs schneller Korpuskularstrahlen durch Materie," *Ann. Phys. (Leipzig)* **397**, 325 (1930). See also the Particle Data Group review "Passage of particles through matter" (standard result).

---

<p class="dedication"><em>All credit and glory to God. I owe my knowledge to my Lord Jesus Christ.</em> AI assistant: Grok Bot.</p>
