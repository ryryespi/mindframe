# MindFrame

A calm, local-only practice tool for looking at a thought. One page, one input box (or **Pick feelings** chips), and an **Update** button: nothing is read or shown until you tap Update (or press Ctrl/Cmd + Enter). No account and no API key. **The app composes its own replies from the equation and works offline.** It makes one kind of network call, and only when you tap **Find more online** under Watch something: it sends film genre ids to Wikidata (never your words, feelings or names) and shows you what it will send first. A public AI is optional, through one button that shows you the exact prompt first.

**Not therapy, not a diagnosis.** In crisis, call or text **988** (US) or call **911**. Crisis wording shows only that support box; nothing is computed or saved.

## The nine movers

Only emotions and processes with strong evidence behind them as drivers of distress (or of recovery) are kept. Everything else from earlier versions is folded into these nine.

| Group | Mover | Why it is here (verified sources) |
|---|---|---|
| Hard | **fear/anxiety** | Core negative affect in the unified model of emotional disorders (Barlow, Allen & Choate, 2004). |
| Hard | **sadness** | Same unified model (Barlow et al., 2004); low hope with sadness is the strongest warning sign (Beck et al., 1985). |
| Hard | **anger** | Core negative affect (Barlow et al., 2004). |
| Hard | **shame** | Linked to depressive symptoms more strongly than guilt: r = .43 vs .28 across 108 studies (Kim, Thibodeau & Jorgensen, 2011). |
| Grounding | **calm** | Slow breathing raises calm and lowers arousal (Zaccaro et al., 2018). |
| Grounding | **connection** | Stronger social ties: about 50% higher odds of survival across 148 studies (Holt-Lunstad, Smith & Layton, 2010). |
| Grounding | **hope** | Hope theory (Snyder, 2002). Hopelessness of 10 or more on the Beck Hopelessness Scale identified 91% of eventual suicides (Beck et al., 1985). |
| Process | **rumination** | The emotion-regulation strategy with the strongest link to psychopathology (Aldao, Nolen-Hoeksema & Schweizer, 2010); see also Nolen-Hoeksema, Wisco & Lyubomirsky (2008). |
| Process | **avoidance/fusion** | Experiential avoidance (AAQ-II; Bond et al., 2011), cognitive fusion (CFQ; Gillanders et al., 2014), and avoidance across disorders (Aldao et al., 2010). |

### Mapping from earlier versions

| Old concept | Now |
|---|---|
| loneliness | low connection |
| guilt | shame |
| joy | hope and calm |
| ego grip g, self-focus, replaying | rumination |
| pride / defending | rumination + anger |
| wrath | anger |
| envy / jealousy | anger + shame |
| sloth / laziness | sadness + avoidance |
| desolation ("far from God") | sadness + lower hope |
| greed | fear |
| gluttony, lust | avoidance |
| believability B, avoidance R, mirage grip M | avoidance/fusion |
| presets, frameworks, Compare, Optimize | removed (one Variables panel instead) |
| Check-in form, Coach bots, Spot, Rebuild games | removed ("adjust numbers" sliders; the path game stays) |

## The whole model on one page

Everything built so far (the nine movers, the step map, the baseline, hidden conflicts C, grandiosity and true size G, inner peace P, the freeing mix, forgiveness F_self / F_other, the Kai shield S, the practices, and the companion's growth) is one step of four lines:

```
(1) e  = clip01(e₋ ⊕ n(text) + X·(1 − S)·w)                         the reading
(2) e' = clip01(e + a(e)·(h − e) + b·s(e))                           the step
(3) P  = P_d(e)·(1 − γ·C)·(1 − δ·G);  lever = argmax_i ΔP_i;  step = practice(lever)
(4) words = compose(e, e', P, lever, passes)
```

* **e₋** is where you were (the session's e, or the vector picked with the chips). **n(text)** is what the words add: the lexicon, the signals and the word hooks (relationship patterns, forgiveness cues, true size, patience, tension), each saturating as 1 − e^(−raw). **⊕** is the saturating add: hard and process movers 1 − (1 − e)(1 − n); grounding movers e + n⁺(1 − e) − n⁻e.
* **X(1 − S)·w** is the Kai term (below): outside hurt X, less the shield S, pushes anger, shame and fear (w = 0.8, 0.6, 0.4). For almost every text X = 0, and line (1) is just e₋ ⊕ n(text).
* **a(e), b, s(e)** are the step sizes and the grounding pressure from [the master function](#the-master-function); h is home.
* **P_d = 1/(1 + (d/d0)²)** with d = ‖e − h‖; **C** is the strongest hidden conflict; **G = max(g, u)** is the true-size signal (too big or too small).
* **ΔP_i** is the gain in P when e_i moves 0.05 toward h_i. The lever is the biggest gain, and **practice()** is the rule table in the practices section. Strictly, the step is the practice for the lever that maximizes ΔP; it is not a search over every practice.
* **passes** run in the same call and never move e: forgiveness (F_self, F_other and the path), the freeing mix (max J = P − μN), the Kai lines, and the companion, which grows only from caring actions (an Update, a step tried, a journal save, a practice finished), never from e.
* Values are rounded to 0.01 after (1) and after (2), as the code does. The baseline (B_t = 0.8·B_{t−1} + 0.2·e_t) and the recovery count (repeat (2) until d < 0.3) use the same map.
* **Checked against the code.** `tests/onepage.test.js` recomputes (1), (2) and (3) from these lines alone and checks that `master()` gives exactly the same e, e', P, lever and practice. The refactor changed nothing else: every earlier test still passes.
* **Faith.** With Include faith on, h is described as rest and peace in Christ ("Come to me, all you who labor and are heavily burdened, and I will give you rest", Matthew 11:28–30; "the peace of God, which surpasses all understanding", Philippians 4:7), and the virtues as fruits of the Spirit (Galatians 5:22–23): patience = forbearance, kindness = empathy, gentleness = the respect guard, self-control = no impulsive reaction. **Only the wording changes, not the math**; the numbers are identical with faith on or off (tested).

## Kai: steadiness under outside pressure

From Ryan's story: Kai faces a storm of criticism in the village square, anchors in self-awareness, applies forbearance and empathy, and his respect guard blocks the barbs without harming anyone, so impulsive reaction flickers and fails. In `js/core/kai.js`, merged into the master function, with no new movers:

```
X  = 1 − e^(−0.7k)              outside hurt received (k cues of criticism or judgment AT you)
A  = (1 − G)·[1 − (1 − c_A)(1 − ½σ_A)]                 self-awareness (feelings named, worth affirmed, true size low)
F  = 1 − (1 − c_F)(1 − ½σ_F)(1 − p_F)                  forbearance (holding back, a slow breath, the pause)
E  = 1 − (1 − c_E)(1 − ½σ_E)                           empathy (perspective taking: "they must be stressed")
R  = (1 − c_attack)·[1 − (1 − c_R)(1 − ½σ_R)]          respect guard (a boundary without attack)
S  = 1 − (1 − A)(1 − F)(1 − E)(1 − R)                  the shield, capped at 0.99
push: e_j ← clip01(e_j + X(1 − S)·w_j),  w = {anger 0.8, shame 0.6, fear 0.4}
I  = X(1 − S)·u,  u = max(e_anger, c_urge)             impulsive reaction; "flickers and fails" below 0.15
```

* **To you, not by you.** X counts hurt received: "they criticized me", "everyone judged me", "he called me …", "told me I'm useless", "rolled her eyes at me", "gave me the silent treatment", and "in front of everyone" as an extra weight. It is negation-aware ("nobody judged me" is 0). The Four Horsemen in your own words ("you always …", contempt) are by you: they never raise X, and they lower the respect guard through c_attack.
* **Cues and bounds.** Each c is 1 − e^(−0.7k) for k matching phrases (negation-aware). σ is 1 when a matching practice was finished this session: the pause, breathing and body practices count for F; labeling, STOP, the brain dump and the self-compassion break count for A; walking past REACH's Empathize step counts for E. Sessions are kept in memory only, never saved, and cleared by Start over. p_F = ½ comes from the picker chip "holding back from reacting"; the chip "criticized or judged" sets X = 0.75. Each virtue is capped at 0.95.
* **Card, words only, only when X > 0.** For example: "Your steadiness: self-awareness just starting, forbearance growing, empathy growing, respect guard just starting." Then the impulse line, and the weakest virtue as the lever with one step:
  * self-awareness: name it to yourself, "I feel hurt, and I am still worth respect."
  * forbearance: before you answer, breathe out slowly three times.
  * empathy: ask yourself once, "What might they be carrying today?"
  * respect guard: say, "I hear you. I see it differently, and I'm going to step away now."

  The bands are strong (0.6 and up), growing (0.3 to 0.6) and just starting. When X > 0 the steadiness tile is the card's insight.
* **Kai-style story.** In Write a story, when X > 0, a traveler (Kai) with your companion as his friend stands calm in a storm of words. Each virtue line follows your own level, and the weakest is shown growing. With faith on, it adds that Jesus, before his accusers, answered nothing, like a sheep that is silent before its shearers (Matthew 27:12–14; Isaiah 53:7); when he was cursed, he didn't curse back (1 Peter 2:23); and he prayed, "Father, forgive them" (Luke 23:34). Verse wording follows the World English Bible (public domain).
* **Ada's panel** shows X, A, F, E, R, S, the push, I and the lever.
* **Sources.** Self-awareness: affect labeling (Lieberman et al., 2007) and self-affirmation (Cohen & Sherman, 2014). Forbearance: patience (Schnitker, 2012). Empathy: perspective taking (Davis, 1983, the Interpersonal Reactivity Index). Respect guard: DEAR MAN (Linehan, 2015) and assertiveness training (Speed, Goldstein & Goldfried, 2018). **This is a model, not a validated measure.** The weights, the ½ terms and the product form of S are design choices.

## For this moment: grip, past to future, Scripture, a parable, and more

After Update, See more holds one tile, "For this moment", in stage order. Nothing shows before Update or in a crisis, and nothing goes online.

1. **Loosen the grip** (`js/features/grip.js`). This stage detects three pulls: fear (e_fear), a looping mind (e_rumination, plus repetition across your saved days and loop wording like "over and over"), and gentle vice cues (desire, envy, resentment and pride). The vice cues use negation-aware words and the existing signals: grandiosity → pride, and the forgiveness path "other" → resentment. It is not suppression, because pushing thoughts away tends to bring them back (Wegner et al., 1987). The tool depends on the strongest pull:
   * a vice → urge surfing (Bowen & Marlatt, 2009);
   * a repeating loop → a scheduled worry window (Borkovec et al., 1983; McGowan & Behar, 2013);
   * otherwise → notice, name, defuse (Masuda et al., 2004).

   A small value step (the lever's practice) always follows. In the model, the pulls ease as x' = x(1 − L), with L = 1 − (1 − L_tool)(1 − 0.15) and L_tool .25 / .30 / .20. The card shows this in words only ("may loosen from a lot toward some"), and it never says a thought will be removed. Faith on adds 2 Corinthians 10:5 and Philippians 4:8.
2. **Past to future** (`js/features/past.js`). The past focus is clamp(max(shame, rumination) + 0.3·cue(past wording)). The technique is picked by the highest score:
   * shame → self-compassion (Neff, 2003) with the four Rs of self-forgiveness (Cornish & Wade, 2015);
   * hurt by another → loving-kindness, moving from self to a loved one, a neutral person, a difficult person and all people (Hofmann et al., 2011);
   * replaying → ACT acceptance and defusion (Hayes et al., 2006).

   A future step always follows: Best Possible Self writing when hope is low (King, 2001; Peters et al., 2010), otherwise a note to your future self (Hershfield, 2011). In the model, shame and rumination ease by Lp (.20 / .15 / .20) and hope grows as h + (1 − h)·Lh (.20 / .15). Faith on adds Philippians 3:13–14, Isaiah 43:18–19, Lamentations 3:22–23 and Colossians 3:13.
3. **Scripture for this moment** (`js/features/scripture.js`, faith on only). 90 verses from the World English Bible (public domain), each copied exactly from ebible.org's `eng-web_vpl.txt`. The source lines are kept in `tests/fixtures/scripture-web.txt`, and the tests check every verse against them.
   * Themes: fear, sadness, anger, shame and forgiveness, calm and peace, connection and love, hope, renewing the mind, courage, patience, gentleness, self-control, and the past and a new beginning.
   * The theme comes from the Kai shield first (a strong urge → self-control; otherwise the weakest virtue), then the inner-peace lever, then the dominant hard mover.
   * The verse is FNV-1a(rounded e, e', P, S) mod the theme's list, so the same numbers give the same verse. **Another verse** moves the seed by one, and a new Update starts again.
   * Your companion keeps the verse in the sheet.
4. **Verses together** (faith on). Two or three verses: the dominant mover's theme, the lever's theme, and hope or calm (the past and a new beginning when Past to future shows). The synthesis is composed from the theme tags and the numbers: it names and validates the feeling, says the thread the verses share, gives a gentle reframe, says how the step moves P toward steady (over days, no instant fix), and offers one small daily habit. Verse text is shown exactly and separately, with references.
5. **A parable of peace** (`js/features/parable.js`). Five to eight sentences built from the feeling, the grip, past to future, the step and your companion. With faith on, it adds the verse themes and references. It moves from the past to the future and ends at rest; with faith off, it has no scripture.
6. **Continue your story.** Two films from the films list (same mood pick) and two or three songs from a built-in list of 45 (worship songs only with faith on). The picks use the same seed, and each has a one-line prompt. No lyrics are quoted.

7. **Cornerstone.** Every pick uses the seed mix(CORNERSTONE, numbers, text, counter), computed with FNV-1a 32-bit.
   * CORNERSTONE = FNV-1a("Ephesians 2:20") is a documented constant, mixed in first.
   * numbers is the hash of the rounded e, e', P and S. text is the hash of the words, kept in memory only. counter is the number of **Another verse** taps since Update; if a tap would land on the same verse, it moves on by one.
   * Randomness: the cornerstone is a constant, so it adds no entropy (H(seed) = H(numbers, text, counter)). What it does is anchor reproducibility: the same reading gives the same picks on every device and in every version that keeps it. The tests check that it neither adds nor removes distinct outcomes, and that index spread passes a chi-square check.
   * The tile opens with a small CSS and inline-SVG scene: seeds resting in water above a counter (the ledge shows the seed counter) on a cornerstone. The seeds glow, then settle, on a new reading. The scene is still with reduced motion and follows dark mode through the theme colors.
   * The parable opens with the same image. With faith on, it names Christ the chief cornerstone (1 Peter 2:6) and the tree planted by streams of water (Psalm 1:3), and their exact WEB text is shown under the parable.

The weights in stages 1 and 2 are modeling choices, not measured effects.

## The master function

Every feature calls one function, `MF.Master.master(text, state)` in `js/core/master.js`. It has a state-vector entry with the same path, `masterState(e, state, opts, words)`, and the feelings picker's entry `masterPick(pick, state)`. Text → score → `reading(e, …)` and picked → vector → `reading(e, …)` share one internal path, so `master(text, state)` equals `masterState(combine(state.e, fromText(text).w), state, {}, fromText(text))` exactly (tested). That covers the live card, the story, the path game, checkpoints, accepting a step, recovery, the baseline, import and restore. Nothing else steps e.

```
e      = score(text)                                   (the words, added to where you are)
step   = act(clip01(e + a(e)·(h − e) + b·s(e)))
a(e)   = min(a_max, a0 + k·‖e − h‖),  capped at a_cap when λ > 0 (b becomes b_U)
s_j    = e_j · Σ_grounding min(0, W_ij)·h_i            (grounding movers press on hard ones above home)
d      = ‖e − h‖
B_t    = 0.8·B_{t−1} + 0.2·e_t                         (baseline)
recovery = number of master steps until d < 0.3
g      = 1 − e^(−raw)   raw = 0.6·grand + 0.5·certain-worst + 0.25·all-or-nothing + 0.1·min(3, absolutist)
                        (adds 0.5·g to rumination and to avoidance/fusion, before saturation)
c(i,j) = √(x_i·y_j)     opposing pulls both active (hidden conflicts); 0.5 for clashes in the words
gain_j = |e_j − h_j| − |next_j − h_j|   → the positive emotions the step points toward
u      = 1 − e^(−0.7·k)  false-humility cues (putting yourself down); shame +0.2, hope −0.2
P      = 1/(1 + (d/d0)²) · (1 − γ·C_max) · (1 − δ·max(g, u))   inner peace, in [0, 1]
```

The last three are computed in the same master pass (`js/core/reality.js`) and returned as `grand`, `conflicts[]` and `positives[]`. No new movers or variables.

* e is the 9-vector in [0, 1]. Hard and process movers rest at 0. Grounding movers rest at 0.5 ("unknown").
* Home h has calm, connection and hope at 0.8, everything else at 0.
* Defaults (all but a_cap and b_U adjustable in Show the math): a0 = 0.20, k = 0.05, a_max = 0.25, a_cap = 0.12, b = 0.10, b_U = 0.15.
* act() turns the stepped vector into one small action, for the mover that moves most toward home.
* λ = ρ(W on the active hard/process movers) − decay. λ > 0 means the feelings are feeding each other.
* Hidden rise: a left-alone projection using the small W in `js/core/movers.js`. For example sadness ↔ rumination 0.4, and connection → shame −0.5.
* These are design choices informed by the research above, not validated values.

## The card: composed from the equation

The card appears only after Update and shows no numbers. **There are no fixed reply lists:** `js/core/words.js` (the composer) builds every sentence from small grammar parts, and the master function's numbers pick the parts:

| Part | Driven by |
|---|---|
| feeling word + degree | the mover and its band: under 0.3 "a little/slightly", 0.3 to 0.6 "quite/fairly", over 0.6 "strongly/deeply" |
| link verb | the sign and strength of the coupling W_ij: strong + "fuels/feeds", mid + "stirs up/adds to", weak + "nudges up"; toward a grounding mover "wears down/dims"; the stabilizer "softens/eases" or "takes the edge off" by \|W\| |
| direction | the step's gain toward home: which mover eases and whether "a little" (gain < 0.15) |
| dose of the step | the distance d: "two", "five" or "ten" minutes (d < 0.5, < 1, ≥ 1) |
| hidden pull | conflicts[] and their strength c (adverbs from each side's band; holding line by c ≥ 0.6) |
| reality check | grand.g (how sure the thought sounds) and its kinds |
| progress | Δ = d_prev − d (direction and "a little/noticeably") and the recovery count as words ("a few", "several") |

Choices between equal parts are made by a hash of the seed and the numbers, so the same state and seed always give the same card, and different numbers give different wording. The only fixed text kept on purpose is safety wording (the crisis box) and short, true, non-medical phrases such as the true-sized line. Example, anger alone at two intensities (everything else at home):

* anger 0.20: "What you may be feeling: slightly angry." / "When the anger is faint, it stirs up the replaying…" / "Pause: step away for two minutes, then name what matters to you here, so the anger can loosen its grip a little."
* anger 0.90: "What you may be feeling: strongly angry." / "When the anger is loud, it adds to the replaying…" / "A hidden pull: part of you is really angry, while part of you really wants to stay close." / "Pause: step away for five minutes…"

Card order:

1. **Room for:** the positive emotions the step points toward (calm, connection, hope, plus gratitude, courage, peace, joy as words, not variables), for example "Room for: courage, calm, and connection, as the fear settles."
2. **Inner peace** and **Path to peace** (see below).
3. **What you may be feeling:** the one to three strongest movers.
4. **How they connect:** the strongest W link and stabilizer, a loop, λ in words, a hidden rise.
5. **A hidden pull** (when there is one) and **Reality check** (when g ≥ 0.25).
6. **Affirmations:** (1) the mover that moves most: a stance by its band plus its action; (2) the top positive emotion; (3) the conflict ("I can hold both"), else the true-sized line, else the stabilizer's action. Include faith adds exactly one more.
7. **One step** (the inner-peace lever's technique, sized by d) and **progress in words.**

8. **A pattern to notice** (only when one is found): see the Four Horsemen section below.

## Inner peace: the score and the solve

**Model, not validated science.** Inner peace is a model quantity computed in the same master pass (`js/core/peace.js`), with no new movers:

```
P   = P_d · P_c · P_g
P_d = 1 / (1 + (d/d0)²)      d = ‖e − h‖; d0 = 0.6, so P_d = 0.8 at d = 0.3 ("close to steady")
P_c = 1 − γ·C_max            C_max = the strongest hidden conflict c; γ = 0.3
P_g = 1 − δ·max(g, u)        the true-size factor: g = grandiosity (too big), u = false humility (too small); δ = 0.3
```

d0, γ and δ are adjustable in Show the math. P = 1 exactly at home and is lower everywhere else (each factor is at most 1). P_d is smooth and strictly decreasing, so there is always a direction to move.

**Solving for inner peace:**

* **Steady state e\*.** Proof sketch for the exact map, with hard/process homes at 0 (always true in the app):
  * grounding movers: next − h = (1 − a)(e − h);
  * hard and process movers: s ≤ 0 and h = 0, so 0 ≤ next ≤ (1 − a)·e.
  * Hence ‖next − h‖ ≤ (1 − a)‖e − h‖ with a ≥ min(a0, a_max, a_cap) ≥ 0.05. The master map is a **contraction** toward h for any b ≥ 0 and any W: d_t ≤ 0.95^t·d_0. Its unique fixed point is e\* = h, where P = 1.
  * Because the app rounds every step to 0.01, the computed iteration stops at a lattice point within 0.005/a of h per mover (≤ 0.03 with the defaults), where P ≥ 0.95. Tests check the contraction inequality on the exact map (three settings, 180 random starts) and the rounded fixed point (80 random starts).
* **n\*:** the number of master steps until P ≥ 0.8 (the peace threshold), counted from the current reading. Tests match it against a direct simulation.
* **The most helpful lever:** the mover whose move toward home by 0.05 raises P most (a finite difference; Show the math also shows the central-difference gradient ∂P/∂e_i). The One step is the lever's technique, composed as before.

On the card, under "Room for": "Inner peace: a little / growing / close / steady" (P < 0.4, < 0.6, < 0.8, ≥ 0.8), "Path to peace: about five gentle steps; the biggest help right now is easing the anger", and how much the hidden pull and the grand thought take away. With Include faith on, one more line: "May the peace of God, which surpasses all understanding, guard your heart and mind (from Philippians)." My days shows inner peace across your saved days in words. The comfort prompt includes P, its band, n\* and the lever. Crisis wording shows no peace score, only 988/911.

Conceptual basis (nothing is measured):

* **Equanimity:** an even-minded state toward all experience (Desbordes et al., 2015; Kabat-Zinn, 2003). Here: near home with nothing pulling hard.
* **Peace of mind** as internal peacefulness and harmony (Lee, Lin, Huang & Fredrickson, 2013). Inner conflict lowers it (P_c).
* **Emotion regulation** (Gross, 1998). The lever is the one place where a small regulation step helps most, and the reality check is the cognitive-change point (P_g).

## Hidden conflicts

Two pulls that are both active at once, derived from the nine movers (no new movers): fear + hope, anger + wanting to stay close (connection ≥ 0.6), shame + a need for connection (connection ≤ 0.4), rumination + wanting calm, avoidance + hope. Hard/process sides need e ≥ 0.3. Strength c = √(x·y). Clashes in the words themselves ("I want … but", "I should … but", "I love … but", "part of me", "torn", "mixed feelings") count with c = 0.5. The card says, for example, "A hidden pull: part of you is very afraid of what could go wrong, while part of you is really hoping it goes well." and adds a gentle line about holding both. Ambivalence is a normal part of change (Miller & Rollnick, *Motivational Interviewing*, 2013).

## Reality check: grand vs. true-sized

`js/core/reality.js` looks for grand or absolute wording ("only I can", "I'm destined", "everyone will see", "I'm better than everyone", "I never fail", "nothing can stop me"), certain-worst wording ("I'll never be happy", "everything is ruined", "everyone hates me"), all-or-nothing ("a total failure") and absolutist words (always, never, completely, everyone, nothing…). It is negation-aware ("I'm not better than anyone" is ignored). The signal g feeds rumination and avoidance/fusion. When g ≥ 0.25 the card shows, without labels or shaming: "Reality check: part of this thought sounds very sure that it all depends on you, or that you can't fall short." then "You matter, and you are also human; one good step is enough." Grounding: Beck's cognitive distortions (magnification, all-or-nothing; Beck, 1976), Burns (1980), and Al-Mosaiwi & Johnstone (2018), who found absolutist words more common in anxiety, depression and suicidal-ideation forums. This is a word signal, not a diagnosis.

**The other side: putting yourself down.** The same true-size check (not bigger, not smaller) looks for false humility: self-deprecation and disqualifying the positive (Burns, 1980), negation-aware. Kinds: *worthless* ("I'm worthless", "I'm nothing", "I'm not worth it"), *undeserving* ("I don't deserve love / good things / it", "who am I to", "I'm not good enough"; "I don't deserve this" is left alone because it is often about being mistreated), *disqualify* ("it was just luck", "I only got lucky", "anyone could have done it", "they're just being nice"), and *compare* ("everyone is better than me", "I'm worse than everyone"). "I don't think I'm worthless" and "it wasn't just luck" are ignored. The signal u = 1 − e^(−0.7·k) (one cue 0.50, two 0.75) nudges shame +0.2 and hope −0.2 (existing movers only), and inner peace uses max(g, u), so too small costs peace the same way too big does. The card says, for example, "Reality check: part of this thought sounds very sure that what went well was only luck, and that everyone is better than you. That is smaller than true." then "Not bigger, not smaller: what went well counts too; you can name your part in it plainly." The "putting myself down" chip in the feelings picker counts as one cue. Grounding: true humility is an accurate view of oneself, not low self-regard (Tangney, 2000); disqualifying the positive (Burns, 1980); self-compassion (Neff, 2003); shame and self-criticism and compassion-focused therapy (Gilbert & Procter, 2006; Gilbert, 2009).

## Pick feelings

Above the text box, a small toggle: **Write** (the default) or **Pick feelings**. Pick feelings shows the nine movers as chips in plain words: afraid, sad, angry, ashamed, calm, connected, hopeful, replaying thoughts, avoiding. Each tap goes off → a little → quite → strongly → off. The values are the midpoints of the word bands the card uses (a little < 0.3 ≤ quite ≤ 0.6 < strongly):

| Level | off | a little | quite | strongly |
|---|---|---|---|---|
| Value | 0.00 | 0.15 | 0.45 | 0.80 |

Calm, connected and hopeful start at "quite" (close to their 0.5 rest), because "off" for them means "not at all calm"; the others start off. Two extra chips map onto existing movers as nudges (no new movers), exactly like the matching words: **blaming myself** is one self-blame cue (shame +0.2, replaying +0.2, c_self = 0.50 for the forgiveness pass) and **putting myself down** is one false-humility cue (shame +0.2, hope −0.2, u = 0.50). Update runs `masterPick()`, the same master path the text uses. The picker has no text, so there is no crisis path in it; crisis wording still in the text box shows the 988/911 box, and the 988 line stays at the top of the page as always. The picked levels are kept with the session (mf 3 `pick` and `extra` lines), so the chips come back as you left them.

## The freeing mix

**Model, not validated science.** `js/features/freeing.js` adds a master pass that solves, from the reading, for the combination of feelings that best frees you from shame, self-blame and false humility, while obeying the master function. No new movers or variables, and it never moves e.

```
J(e) = P(e) − μ·N(e)                     μ = 0.5
N(e) = e_shame + c_self·e_rumination + u·max(0, h_hope − e_hope)    (the nudge load)
moves:    each step, at most K = 3 movers move, each by exactly one band toward home
          on the ladder 0, 0.15, 0.45, 0.80 (clipped at h_j, never past it)
feasible: P(e') ≥ P(e) and e'_shame ≤ e_shame
step:     e ← argmax J over every feasible move set (130 subsets, exhaustive), until J
          rises by no more than 0.001, or after T = 3 steps
```

P is master's inner peace with the reading's text clashes and true-size signal held fixed. N is shame itself plus the movers the self-blame cue (replaying) and the put-down cue (hope) push on. Every move goes toward home, which is the master step's own direction: master's next_j always lies between e_j and h_j (the contraction proof above). So, by construction and tested over 160 random picks: P(target) ≥ P(now), shame never rises, J rises every step, no mover moves more than one band per step, every moved mover agrees in sign with master's next step, and each step equals an independent brute-force optimum.

For ashamed strongly + blaming myself + putting myself down (calm, connected, hopeful at quite):

* step 1: shame 0.87 → 0.45, calm 0.45 → 0.80, hope 0.37 → 0.80 (P 0.19 → 0.43)
* step 2: shame 0.45 → 0.15, connection 0.45 → 0.80, replaying 0.18 → 0 (P → 0.80)
* step 3: shame 0.15 → 0 (P → 0.85)

**On the card**, words only, a "Your freeing mix" tile appears when shame is at least 0.3, or self-blame or a put-down is present: "Your freeing mix: ease the shame and the replaying; grow calm, connection, and hope.", "Three gentle steps, one band at a time: inner peace could go from a little peace to steady, and shame only goes down.", "True humility sees you at your real size: not worse than others, not better; worthy of kindness and still learning.", and One step, the self-compassion break (Neff). With self-blame present, the tile routes to the **Forgive myself** path (button: "Forgive myself"). With Include faith on: "Think of yourself with sober judgment (from Romans). To be humble is to walk in truth (Teresa of Ávila), and your worth rests on God's love, not on your record: we love because he first loved us (from First John)." (Romans 12:3; Teresa of Ávila, *The Interior Castle*, Sixth Dwelling Places, ch. 10, §7, in the Kavanaugh & Rodriguez translation: "to be humble is to walk in truth"; 1 John 4:19.) Show the math shows the objective, the constraints, each step with its P and J, and P, N and J before and after.

**Export.** Save & share code shows the freeing mix as one compact readable line, with **Copy freeing mix**:

```
Now: ashamed strongly, replaying a little, calm quite, connected quite, hopeful quite, blaming myself, putting myself down → Freeing mix: ashamed off, replaying off, calm strongly, connected strongly, hopeful strongly
```

A hard or process feeling is listed when it isn't off on either side, and a grounding one when its level changes or isn't "quite". The same line, and the mix as numbers, are in the mf 4 code, and the comfort-AI prompt carries the line and the put-down signal (never your words).

## Comfort story from a public AI (optional)

In **Write a story**, **Comfort story from a public AI** builds a prompt from the analysis only and shows it in an editable box with "Only this text will be shared. Your journal stays on your phone." The prompt contains the card in plain words plus a compact numbers summary (movers with bands, step direction d → d_next and the biggest move, conflicts with c, the grandiosity signal g, positive emotions) and asks for a ~200-word gentle, grounded comfort story with a friendly animal, three affirmations written from that analysis, no medical advice, and a hopeful ending. It never contains the text you typed (every line is composed from numbers, and a second guard drops any line repeating four of your words in a row). **Open in Grok** (`https://grok.com/?q=<encoded>`) and **Open in ChatGPT** (`https://chatgpt.com/?q=<encoded>`) open a new tab and also copy the prompt in case the site doesn't fill it in; Grok may send it as soon as it opens. **Copy prompt** copies only. The button is disabled during a crisis. The app itself makes no network calls.

## Your companion

One gentle animal stands for you: **a little fawn**, an original inline SVG drawn by `js/features/companion.js` (no image files). On first use a small box offers to name it; the default is **Willow**, and you can skip. The name is stored on this device only (and in the mf 4 code if you export it). The fawn sits in the header sky (small but always visible), and after Update it appears beside the card with one short line. Tapping it opens **one bottom sheet**: its name, its stage, a growth bar, and six actions. It replaced the six helpers of earlier versions (push20 removed their six SVG files).

**Growth comes only from caring actions, never from how the feelings read.** Points only go up, and only through:

| Caring action | Points | Counts per day |
|---|---|---|
| An Update (a check-in) | 1 | 3 |
| A One step tried ("Try it together", the self-compassion break, or Accept step) | 2 | 2 |
| A journal save (the journal or the forgiveness notes) | 2 | 2 |
| A practice finished (the breathing circle, or a forgiveness path walked to its last step) | 2 | 2 |
| Coming back on a new day | 3 | 1 |

Five stages: **Newborn** (0, curled asleep in a leaf nest), **Little** (8, sitting, big-eyed), **Young** (25, standing on wobbly legs), **Grown** (55, a small flower by one ear), **Wise** (100, a crown of leaves with a little star). A hard reading never takes points away or changes the stage, and there are no streaks to lose: coming back after a gap just says "Welcome back. I'm glad you're here." A crisis awards nothing. **Reset growth** in the sheet starts again from a newborn (journal and readings stay).

**Mood follows the reading, gently.** After Update the pose comes from the strongest hard mover at 0.3 or more: resting curled up (sadness), ears down and close (fear), slow breaths (anger), tucked in with a small heart (shame), watching a leaf drift (replaying), peeking beside a sprout (avoiding). With no strong hard mover it glows softly when calm or hope is at least 0.6 or peace is close or steady. The aura color follows the inner-peace band (lavender, peach, mint, gold). Its eyes are always open and soft or closed and content, with a small smile: never a frown or a punished look. It speaks one first-person line composed from the numbers, like the card: an opener chosen by the pose and the inner-peace lever, for example "I'm here with you, breathing slowly. Let's ease the anger together." or "I'm curled up close to you. Let's ease the sadness together." A gentle idle breath plays only without `prefers-reduced-motion`. In a crisis the companion stays calm and quiet: no line, no sheet, no growth; only the 988/911 box shows.

**The six actions** open the earlier panels inside the same sheet, with a back arrow:

| Action | Was | View |
|---|---|---|
| **Write a story** | Fern the Fox | A creature story driven by the master step (feeling words, ends with an affirmation and a question), accept the step, the path game, the optional public-AI comfort prompt, and the journal (the only place your words are kept, and only when you tap Save). |
| **My days** | Hazel the Owl | The progress line, each day in words, inner peace across your saved days, Save checkpoint (numbers only), restore a checkpoint. |
| **Look closer** | Remy the Raccoon | Every insight and how they connect, every hidden pull and any grand wording with its true-sized version, then all nine movers in words. |
| **Save & share code** | Toby the Tortoise | The freeing mix as one readable line with Copy freeing mix, export / import `.mf` code (mf 4), download, Start over. |
| **Show the math** | Ada the Otter | The math (vector, equation, λ, baseline, recovery, g, conflict strengths c, positive-emotion scores, inner peace P with ∂P/∂e, the lever, n*, e* and the convergence proof sketch, the forgiveness scores F_self and F_other with the path, ΔP_F and the forgiveness recommendation, the practice pick, the false-humility signal u, and the freeing-mix optimization), adjust each mover, and the variables, with Reset. |
| **Forgive & breathe** | Grace the Dove | Three tabs: **Forgive myself** (the four Rs), **Forgive someone** (REACH), and **Breathe & be patient** (fourteen practices, the breathing circle and the brain-dump box). Optional note boxes stay on the page unless you save them to the journal. |

The sheet is a modal dialog (`role="dialog"`, `aria-modal`): focus moves to its title and stays inside (Tab wraps), Close, Esc or tapping the shade closes it, and focus goes back to what opened it.

Changing a number in a panel does not redraw the card; it says "Tap Update to see the new reading." Buttons that are themselves an action (Write a story, Accept step, Save checkpoint, Restore) run Update for you.

## Watch something

Willow's sheet has one more row above the six actions: **Watch something**, with Willow asking, for example, "Want to watch something gentle together?" It opens a view with three film suggestions at a time (title, year, one short reason in words, and a link to the film's English Wikipedia page), a **More** button, and **Find more online**. Under See more, the card can show one line: "Watch something: something gentle, like Paddington. Willow has more ideas." Watching is not a caring action: it never adds growth. In a crisis there are no films, only the 988/911 box.

**The film mood is picked from the reading** (`MF.Movies.pick`, a model):

| Reading (from the master function) | Film mood | Why it might help |
|---|---|---|
| sadness is the strongest hard mover | gentle and uplifting | a warm, gentle story can lift the mood a little |
| sadness with low connection (under 0.25), or connection is the lever to grow | friendship and family | films about friendship and family can feel like company |
| fear or avoiding | cozy and safe | a familiar, funny film with a safe ending helps you settle |
| anger | calming, with some perspective | slow nature films and quiet stories lower arousal and widen the view |
| shame, or self-blame (the Forgive myself path or the freeing mix) | second chances and self-worth | stories of second chances remind you that people grow and are worth kindness |
| replaying (rumination) | absorbing, a light adventure | an absorbing story gives the mind a rest from replaying |
| no hard mover at 0.3 or more, and calm or hope at 0.6 or more, or peace close or steady | inspiring | an inspiring story can build on a good mood |
| anything else | gentle and uplifting | |

The idea comes from **mood management theory** (Zillmann, 1988): people tend to choose media that ease a bad mood or keep a good one; calm, low-excitement content lowers arousal, and absorbing content interrupts rumination. This is a model and a suggestion, not a treatment, and the mapping itself has not been tested.

**Offline first.** The suggestions come from a small curated list in `js/features/movies.js`: 59 well-known films, mostly rated G or PG, each tagged with the moods it suits (14 gentle, 13 cozy, 7 calm, 20 second chances, 18 friendship, 13 absorbing, 13 inspiring; 7 marked faith-friendly). Every title, year (first release), Wikidata id and English Wikipedia link was checked against Wikidata and Wikipedia in October 2026. With **Include faith** on, faith-friendly picks (for example The Prince of Egypt, The Chronicles of Narnia: The Lion, the Witch and the Wardrobe, Chariots of Fire, The Nativity Story) come first.

**Find more online (optional).** This is the app's only network call. Tapping it first shows exactly what will be sent, for example: "Only this goes to query.wikidata.org: film genres (family film, animated film, comedy drama) and fixed filters (well known (25+ Wikipedia languages); rated G or PG, or a family, children's or nature film; not PG-13 or R; has an English Wikipedia page). Nothing you typed, no feelings and no names." Only **Send and look** fetches. The request is one fixed SPARQL query to the public Wikidata Query Service (`https://query.wikidata.org/sparql`), where only the genre ids change per mood (plus the religious-film and Christian-film genres with faith on). It is free, needs no key, allows browser requests from any site (CORS `Access-Control-Allow-Origin: *`), and its data is CC0. It sends no cookies and no referrer, with an `Api-User-Agent` naming the app as Wikimedia asks. Results stay in memory for the session only, and the service worker never caches other sites. Online results also leave out horror, thriller, war, crime, action and Western films (and, for cozy and calm, science fiction, post-apocalyptic and fantasy films), and the device drops a short list of well-known family-rated films built around a death, a suicide or heavy violence (for example Dead Poets Society, Bambi, Old Yeller, Bridge to Terabithia, Grave of the Fireflies). Online picks are less curated than the local list: each one says "A well-known … (from Wikidata)" instead of a hand-written reason. Offline, busy (HTTP 429 or 5xx, or a 20-second timeout) or any error shows a gentle line, and the local films keep working. Wikimedia warns the query service is not built for instant answers, so a lookup can take a few seconds.

Why Wikidata: TMDB and OMDb both need an API key. A key shipped in a static GitHub Pages site is public to anyone, and TMDB asks that keys be kept server-side and that apps credit TMDB. Wikidata needs no key and no backend.

**Your own TMDB key (optional, off by default).** Under "Use my own TMDB key", you can paste a TMDB v3 API key (32 letters and numbers) to get posters and ratings. It is stored only in this browser (localStorage `mindframe-tmdb-key`), is never in the mf code, the journal or the comfort prompt, and is sent only to `api.themoviedb.org` when you tap Find more online (shown masked in the preview). The request is TMDB's Discover with genre ids and fixed filters (US certification up to PG, 1000+ votes, no adult titles); posters load from `image.tmdb.org`. This product uses the TMDB API but is not endorsed or certified by TMDB. Remove key turns it off again.

## Forgive & breathe: forgiveness, patience and mindfulness

**Model and practice aid, not therapy.** Nothing here adds a mover or a variable. Forgiveness works through a word hook and a master pass (`js/features/forgiveness.js`). The practices pick the One step from master's numbers (`js/features/practices.js`).

**Forgiveness cues.** The cues are negation-aware, as with the Four Horsemen. *Self-blame* covers phrases like "my fault", "I blame myself", "I can't forgive myself", "I messed up", "I should have", "I let her down" and "I regret". *Resentment toward someone* covers "I can't forgive him", "resent", "grudge", "she betrayed me", "how could they" and "bitter". With k distinct cues, the cue strength is c = 1 − e^(−0.7k).

The hook nudges existing movers only:

* self: shame +0.2, rumination +0.2;
* other: anger +0.3, rumination +0.2, connection −0.2.

**The master pass** runs in the same `master()` call, after inner peace:

```
F_self  = e_shame · (0.4 + 0.6·c_self)
F_other = e_anger · (0.4 + 0.6·c_other)
path    = argmax(F_self, F_other) if it is ≥ θ_F = 0.35 (tie → self), else none
ΔP_F    = P(e + release) − P(e)
          release: self shame −0.10, rumination −0.05; other anger −0.10, rumination −0.05, connection +0.05 (toward home, capped by the gap)
recommend = a path is suggested AND the inner-peace lever is one of that path's movers
          (self: shame, rumination; other: anger, rumination, connection)
```

Without a cue, a path needs e_shame (or e_anger) ≥ 0.875. Rumination is in both release vectors because rumination predicts lower forgiveness through anger (McCullough, Bono & Root, 2007).

**On the card**, words only, a forgiveness tile appears when a path is suggested. For example: "Forgiving someone: there's a deep hurt here that still stings. Forgiveness can come slowly, as a gift you choose, for your own peace." The tile for others always says "Forgiving is not excusing what happened, making up, or staying anywhere unsafe." When the forgiveness path is recommended, the peace lines add "Forgive & breathe can help here: forgiving someone is a gentle way to ease the anger." Faith wording appears only with Include faith on: the Lord's Prayer ("forgive us our debts, as we also forgive our debtors"), Colossians 3:13, and, in Grace's panel, Luke 23:34.

**The guided paths.** Each step is short and has an optional note box. The notes are kept only in the page; they are saved only through "Save these notes to the journal". Crisis wording in a note shows the 988/911 box and clears the notes.

* **Forgive myself:** the four Rs of self-forgiveness: Responsibility, Remorse, Restoration, Renewal (Cornish & Wade, 2015). Renewal uses Neff's self-compassion: mindfulness, common humanity, self-kindness (Neff, 2003). The request named "Worthington's four Rs"; the published four-R model is Cornish & Wade's, so it is credited to them.
* **Forgive someone:** REACH (Recall, Empathize, Altruistic gift, Commit, Hold on; Worthington, 2006). Forgiveness interventions are supported by a meta-analysis (Wade, Hoyt, Kidwell & Worthington, 2014). The intro follows Enright's process model (uncovering, decision, work, deepening; Enright & Fitzgibbons, 2015). It says plainly that forgiving is not excusing, reconciling, or staying unsafe, and to reach out for help first if you are not safe.

**Patience, mindfulness and body practices** (the "Breathe & be patient" tab):

| Practice | Kind | Source |
|---|---|---|
| STOP | mindfulness | Stahl & Goldstein, 2010 (MBSR) |
| Three-minute breathing space | mindfulness | Segal, Williams & Teasdale, 2013 (MBCT) |
| 5-4-3-2-1 senses | mindfulness | a common grounding exercise (no single primary source) |
| Short body scan | mindfulness | Kabat-Zinn, 1990 |
| Name it to tame it (affect labeling) | mindfulness | Lieberman et al., 2007 |
| Self-compassion break | mindfulness | Neff, 2003 |
| Pause and breathe (longer exhale) | patience | Zaccaro et al., 2018 |
| Reframe the wait (reappraisal) | patience | Gross, 1998; Schnitker, 2012 |
| Urge surfing | patience | Bowen & Marlatt, 2009 |
| Gratitude for what's here | patience | Emmons & McCullough, 2003 |
| Brain dump (10 minutes of free writing, then keep or let go) | mindfulness | expressive writing: Pennebaker & Beall, 1986; Frattaroli, 2006 (small average effects) |
| Cold-water reset (cool or cold water on the face, or something cold to hold, 15–30 s, slow exhale) | body | DBT TIP skills, Temperature: Linehan, 2015 |
| Progressive muscle relaxation (3 minutes: tense ~5 s, release ~10 s; hands, shoulders, jaw, feet) | body | Jacobson, 1938; review: McCallie, Blum & Hood, 2006 |
| Short brisk walk (5–10 minutes) | body | Rebar et al., 2015; Ekkekakis et al., 2000 |

**Cautions are always shown with the practice** (on the card, in Copy, and in Grace's panel). The cold-water reset always says: "Skip this if you have a heart condition, low blood pressure, fainting, or an eating disorder; check with your doctor first." Progressive muscle relaxation says to tense gently, never to pain, and to skip injured areas; the walk says only where it's safe. Shaking it out is not included: we found no evidence base for it as a stand-alone practice.

**The brain dump box is never saved.** It is a plain text box with a 10-minute timer. It is not stored anywhere, not in the `.mf` export, and not in the comfort-story prompt (which names the practice only). It clears when you tap **Let it go** (with a gentle fade, or instantly with reduced motion), close the sheet, tap **Update**, tap Start over, or a crisis is shown. Crisis wording typed into it clears it at once and shows 988 / 911. Only **Save to journal** keeps it, in this browser's journal, if you choose.

Two word hooks feed the pick but never move a feeling: body tension ("tense", "tight shoulders", "clenched jaw", "can't relax", "wound up") gives c_tense, and low energy ("exhausted", "drained", "worn out", "no energy", "can't get out of bed") gives c_tired, each 1 − e^(−0.7k) and negation-aware.

Patience is treated as a trainable strength linked to well-being (Schnitker, 2012). A waiting/impatience hook ("taking forever", "can't wait", "impatient", "stuck in traffic") gives c_wait = 1 − e^(−0.7k) and nudges anger +0.2 and calm −0.2.

**Which practice becomes the One step.** Let n be the inner-peace lever, or master's mover if there is no lever:

"Very high" means n ≥ 0.75, the upper part of the card's "strongly" band (> 0.6): one plain feeling word reads about 0.63, so it takes an intensifier ("so angry"), several cues, or "strongly" in the picker. "Low peace" is the "a little" band (P < 0.4). The first matching rule wins:

* rumination → brain dump if rumination is very high, else labeling if another hard mover is ≥ 0.1, else STOP;
* anger → cold-water reset if anger is very high and peace is low, else reframe the wait if c_wait ≥ 0.3, else a short brisk walk if anger is strongly but peace is not low (a modeling choice: the walk sources cover mood and anxiety, not anger directly), else pause and longer exhale;
* fear → cold-water reset if fear is very high and peace is low, else reframe the wait if c_wait ≥ 0.3, else progressive muscle relaxation if c_tense ≥ 0.3, else the breathing space;
* avoidance → a short brisk walk if sadness ≥ 0.3 and c_tired ≥ 0.3, else progressive muscle relaxation if c_tense ≥ 0.3, else urge surfing;
* shame → self-compassion break;
* sadness → a short brisk walk if avoidance ≥ 0.3 and c_tired ≥ 0.3, else gratitude if hope is ≥ 0.3, else the earlier small-action step;
* calm → reframe the wait if c_wait ≥ 0.3, else progressive muscle relaxation if c_tense ≥ 0.3, else five senses if d ≥ 0.5, else the body scan;
* hope → gratitude;
* connection → the earlier message step.

The card reads "<practice>: <instruction with dose words>, so <mover> can <ease>." A "Try it together" button opens that practice.

**The breathing circle** is optional: in for four seconds, out for six (a longer exhale, six breaths a minute). The number of breaths follows the dose (three, four or five). It makes no sound. With reduced motion, the circle stays still and only the words and a soft color change.

## A short card, details in the companion's sheet

The card is kept short so it fits a phone screen. By default it shows at most four tiles:

1. **The headline**: the inner-peace band and "Room for …" in one line.
2. **What you may be feeling**: one or two sentences.
3. **One insight**: the strongest one, picked by the numbers (`MF.Words.insight`). The candidates are the freeing mix (max of e_shame, self-blame c_self and put-down u), forgiveness (max of F_self and F_other), the reality check (max of g and u), a relationship pattern (0.7 when found), and the hidden pull (C_max). Ties go in that order. The tile shows its first two lines and its button.
4. **One step**, with its "Try it" button and two affirmations.

A single **See more** button reveals the rest: the path to peace, "How they connect", the other insights, every affirmation, and the progress line. Every output is also in the companion's sheet: Look closer has all the insights and the connections, Forgive & breathe shows the forgiveness lines, and My days shows the progress line. Include faith and Copy sit in a slim row under the card. Copy still copies the full card.

**Input.** Write / Pick feelings is a segmented control. The picker is one grid of eleven compact chips, three per row: the nine movers, then the two extra chips. Each chip shows its level as dots (none, one, two or three); the word stays for screen readers. Clear is a small text link. Update is one big button.

**One bottom sheet.** Your companion's sheet (see above) holds every detail view; it is a modal dialog that opens over the page. A crisis closes it. The slide-up is off with `prefers-reduced-motion`.

**Chrome.** The sky header is shorter, and the privacy line is shown once in small text. The 988 banner is slimmer but still sticky at the top, above any sheet. The layout has no sideways scroll at 360 to 412 px, in light and dark (tested in the browser).

## The look: sky, meadow and tiles

The header is a small illustrated sky over a meadow (inline SVG, no external assets). After Update, its colors follow the inner-peace band (`body[data-peace]`): overcast lavender for "a little", dawn peach for "growing", morning blue for "close", and a clear sky for "steady". In dark mode (`prefers-color-scheme`) it is a night sky with a moon and stars. Card sections are soft tiles with small line icons. They fade in gently after Update, with no motion when `prefers-reduced-motion` is set. Text keeps WCAG AA contrast in both themes (this is tested), and buttons are at least 44 px tall.

## Four Horsemen (relationship patterns)

`js/features/relationship.js` looks for John Gottman's four conflict patterns in what you typed. It is **negation-aware**: "I'm not done talking" or "he didn't walk out" are ignored (a negator within four words, in the same clause).

| Pattern | Example wording | Nudge (existing movers only) | Antidote shown |
|---|---|---|---|
| Criticism | "you always…", "you never…" | anger | Gentle startup |
| Contempt | sarcasm ("yeah, right"), insults, "pathetic", eye-rolling | anger + shame | A culture of appreciation |
| Defensiveness | "it's not my fault", "yes, but", counterattack ("what about you") | shame + fear | Take responsibility for a small part |
| Stonewalling | "I'm done talking", "shut down", "silent treatment", "walked out" | avoidance, lower connection | Self-soothe with a structured break |

No new movers or variables are added; the nudges go through the same word reading, so master() stays the one computation. After Update the card shows, in words only, "A pattern to notice: Criticism", the antidote, and one example phrase. Crisis wording still shows only the 988/911 box.

Sources: Gottman & Levenson (1992), "Marital processes predictive of later dissolution: Behavior, physiology, and health," *J Pers Soc Psychol, 63*(2), 221–233; Gottman (1994), *What Predicts Divorce?* (Erlbaum); Gottman & Levenson (2000), "The timing of divorce: Predicting when a couple will divorce over a 14-year period," *J Marriage Fam, 62*(3), 737–745.

**Caveat:** the high predictive accuracies reported in this work (for example around 90%) come from small samples (dozens of couples) and are debated, notably because the models were not cross-validated (Heyman & Slep, 2001, "The hazards of predicting divorce without crossvalidation," *J Marriage Fam, 63*(2), 473–479). MindFrame uses the four patterns as a pattern helper for one message, not a predictor of any relationship.

## Code (`mf 4`)

```
mf 4
home calm=0.80 connection=0.80 hope=0.80
e sadness=0.67 anger=0.86 calm=0.50 connection=0.50 hope=0.28 rumination=0.10 avoidance=0.45
vars aBase=0.30                 # only non-defaults
w calm>fear=-0.70               # only changed links
day 2026-10-16 …
cp 1 2026-10-16T08:30 label=step-1 … lambda=-0.30
ideal a=0.25 b=0.10
eq step = act(clip01(e + 0.25*(h - e) + 0.10*s(e)))   # readable; ignored on import
pick shame=0.80 calm=0.45 connection=0.45 hope=0.45     # the picked feelings (Pick feelings only)
extra blame putdown                                     # the extra chips
mix calm=0.80 connection=0.80 hope=0.80                 # the freeing mix from the last Update
free Now: ashamed strongly, … → Freeing mix: …         # readable; rebuilt on save, ignored on import
pet points=31 days=6 name=Willow                        # your companion (the name URL-encoded)
```

* Numbers and labels only, never your words. The one chosen word is your companion's name; crisis wording in it is refused.
* mf 4 round-trips exactly. mf 3 is mf 4 without the pet line (importing it leaves your companion as it is). mf 2 is mf 3 without the pick, extra, mix and free lines. Both still import exactly.
* mf 1 codes import on a best-effort basis through the mapping above. Old variables and frameworks are dropped, with a note.

## Structure

Code is grouped by feature. Every file starts with a header comment; every function has a JSDoc. Files share one namespace, `MF` (`window.MF` in the browser, `global.MF` in Node tests).

```
index.html            the one page: scene with your companion, Write / Pick feelings, input, Update, the name box, the short card (+ See more), the companion sheet with Watch something and six views
style.css             calm styles, dark mode, reduced motion; large tap targets
sw.js                 offline cache (v25); other sites (the film APIs) are never cached
tools.html            redirects old shortcuts to the one page
js/
  app.js              page shell: state, Update, the card (insight slot, See more), the companion sheet (views, Back, focus trap, Esc)
  core/               the model; no page code
    signals.js        word patterns (thinking traps, needs)
    grounding.js      crisis wording and pattern reading
    movers.js         MF.Movers: the nine movers, W, variables, lexicon, fromText, the picker levels and fromPick
    reality.js        MF.Reality: grandiosity g, false humility u, hidden conflicts, positive emotions
    peace.js          MF.Peace: inner peace P, the lever, the gradient, the bands
    kai.js            MF.Kai: the Kai shield (outside hurt X, virtues A F E R, shield S, impulse I, card lines, story)
    master.js         MF.Master: the master function (text, state-vector and picker entries), the one-page form, recovery, baseline
    words.js          MF.Words: the composer (every card sentence built from the numbers)
  features/
    writer/           Write a story
      writer.js       MF.Writer: story, path game, journal, panel
      stories.js      creature stories
      games.js        the path game
      comfort.js      MF.Comfort: the optional public-AI prompt and links
    historian.js      My days: days, checkpoints, restore, history
    analyzer.js       Look closer: every insight and the nine movers in words
    scribe.js         Save & share code: mf 4 / mf 3 / mf 2 / mf 1 export and import
    scientist.js      Show the math: the math, sliders and variables
    companion.js      MF.Companion: your fawn (growth rules, stages, mood, its line, the SVG, the sheet home)
    movies.js         MF.Movies: Watch something (the film mood from the reading, the curated list, the optional Wikidata / TMDB lookup)
    scripture.js      MF.Scripture: 90 exact WEB verses, theme, seed, Another verse, Verses together
    grip.js           MF.Grip: Loosen the grip (fear, looping thoughts, gentle vice cues; never suppression)
    past.js           MF.Past: Past to future (self-compassion, four Rs, loving-kindness, acceptance, best possible self)
    parable.js        MF.Parable: the parable of peace, and Continue your story (films + 45 songs)
    relationship.js   the Four Horsemen pattern helper
    forgiveness.js    Forgive & breathe: forgiveness cues, master pass, card words, guided paths
    practices.js      MF.Practices: patience, mindfulness & body library, the step pick, the breathing circle, the never-saved brain dump
    freeing.js        MF.Freeing: the freeing mix (master pass, card words, the export line, Copy freeing mix)
    picker.js         MF.Picker: the Write / Pick feelings toggle and the feelings chips
tests/                node tests (tests/mf.js loads every module)
```

Load order in `index.html`: core (signals, grounding, movers, reality, peace, master, words), then features (relationship, forgiveness, practices, freeing, picker, stories, games, historian, writer, comfort, analyzer, scribe, scientist, companion, movies), then `app.js`.

Tests: `for f in tests/*.test.js; do node "$f"; done`.

## Papers

[MindFrame: The Whole Model as One Equation](paper/MindFrame-One-Equation.pdf) puts the one-page model, the Kai equation, the faith reading, and what is proven versus modeled in five short pages. The source is `paper/MindFrame-One-Equation.tex`.

[MindFrame: A Master-Function Model for Grounded Reflection, Inner Peace, and Forgiveness](paper/MindFrame-Grace-Peace-Paper.pdf) is the research paper on the master-function model, inner peace, and forgiveness. The source is `paper/MindFrame-Grace-Peace-Paper.tex`; figures are in `paper/grace-peace-fig/`.

Also in `paper/`:

* [MindFrame: An Inner Language for Self-Talk, an Integrated Low-Overload Framework, and the Ψ Daily Reflection Index](paper/MindFrame_Combined_Paper.pdf) combines MindFrame with the Psi daily reflection index.
* [MindFrame: Toward an Inner Language and an Integrated, Low-Overload Framework for Self-Talk Support](paper/MindFrame_Paper.pdf) is the original concept paper.

## Model, not validated science

MindFrame is a model built from design assumptions and informed by the research cited here. It is not validated science, not a measurement of you, and not a diagnosis. The thresholds (0.3, 0.6, 0.25, the peace threshold 0.8, the forgiveness threshold θ_F = 0.35, c_wait ≥ 0.3) and weights (including d0, γ, δ, the hook nudges and the release vectors) are design choices.

## Credits

With gratitude to every researcher, clinician, translator and writer whose careful work MindFrame stands on. All credit and glory to God.

Every source below was checked in October 2026. Journal articles were checked against Crossref (title, authors, year, volume, pages and DOI). Books were checked against Open Library or publisher and library catalogs. Reports, preprints, archives and web articles were checked at their own sites. **99 sources are verified and 2 are flagged.** The full citations, with DOIs, are in **References** below, in the app (open your companion, then **Credits**), and in the "Credits and References" section of both papers.

* **Emotion, cognition and CBT:** Beck, Rush, Shaw, Emery, Steer, Kovacs, Garrison, Burns, Gross, Aldao, Nolen-Hoeksema, Schweizer, Barlow, Allen, Choate, Wisco, Lyubomirsky, Al-Mosaiwi, Johnstone, Kim, Thibodeau, Jorgensen, Hofmann, Asnaani, Vonk, Sawyer, Fang, Lieberman, Eisenberger, Crockett, Tom, Pfeifer, Way, Snyder, Wolpe, Rachman, de Silva, Holmes, Mathews, Wegner, Schneider, Carter, White, Borkovec, Wilkinson, Folensbee, Lerman, McGowan, Behar, King, Peters, Flink, Boersma, Linton, Hershfield, Oettingen, American Psychiatric Association, Kroenke, Strine, Spitzer, Williams, Berry, Mokdad, Shiffman, Stone, Hufford, Dawes, Kravitz, Duan, the DEcIDE N-of-1 Guidance Panel, Fitzpatrick, Darcy, Vierhile, Cohen, Sherman.
* **DBT, ACT, mindfulness and compassion:** Linehan, Neacsiu, Rizvi, Vitaliano, Lynch, Hayes, Luoma, Bond, Masuda, Lillis, Strosahl, Wilson, Sackett, Twohig, Gillanders and colleagues, Kabat-Zinn, Segal, Williams, Teasdale, Stahl, Goldstein, Desbordes, Gard, Hoge, Hölzel, Kerr, Lazar, Olendzki, Vago, Neff, Gilbert, Procter, Hofmann, Grossman, Hinton, Bowen, Marlatt, Miller, Rollnick, Zaccaro and colleagues.
* **Forgiveness, virtue, gratitude and peace:** Cornish, Wade, Worthington, Hoyt, Kidwell, Enright, Fitzgibbons, McCullough, Bono, Root, Emmons, Schnitker, Tangney, Lee, Lin, Huang, Fredrickson, Davis, Speed, Goldstein, Goldfried.
* **Relationships and belonging:** Gottman, Levenson, Heyman, Slep, Holt-Lunstad, Smith, Layton, Baumeister, Leary, Meng, Chen, Wang, Yuan, Yu.
* **Body, writing and activity:** Jacobson, McCallie, Blum, Hood, Pennebaker, Beall, Frattaroli, Ekkekakis, Hall, VanLanduyt, Petruzzello, Rebar, Stanton, Geard, Short, Duncan, Vandelanotte.
* **Inner speech, language and design:** Alderson-Day, Fernyhough, Kross and colleagues, Vygotsky, Whorf, Boroditsky, Cowan, Miller, Sweller, Nielsen, Weizenbaum, Bommasani and colleagues.
* **Media:** Zillmann.
* **Mathematics:** Langlands, Gelbart, Wiles, Frenkel.
* **Philosophy and spiritual writers:** Frankl, Robertson, Epictetus, Marcus Aurelius, Teresa of Ávila.
* **Scripture and data:** World English Bible (eBible.org), Wikidata, TMDB.

**Flagged (kept, not fully verifiable):** Epictetus, *Enchiridion*, and Marcus Aurelius, *Meditations*, are cited as classical works with "various translations". The works are certain, but no specific edition or translator is named, so no full citation can be confirmed.

**Films and songs** are credited to their studios and filmmakers, and to their artists and songwriters. MindFrame only names them (film facts from Wikidata, CC0; the optional TMDB lookup follows TMDB's attribution terms) and quotes no lyrics.

## References

* Borkovec, T. D., Wilkinson, L., Folensbee, R., & Lerman, C. (1983). Stimulus control applications to the treatment of worry. *Behaviour Research and Therapy, 21*(3), 247–251. doi:10.1016/0005-7967(83)90206-1
* Hayes, S. C., Luoma, J. B., Bond, F. W., Masuda, A., & Lillis, J. (2006). Acceptance and commitment therapy: Model, processes and outcomes. *Behaviour Research and Therapy, 44*(1), 1–25. doi:10.1016/j.brat.2005.06.006
* Hershfield, H. E. (2011). Future self-continuity: How conceptions of the future self transform intertemporal choice. *Annals of the New York Academy of Sciences, 1235*, 30–43. doi:10.1111/j.1749-6632.2011.06201.x
* Hofmann, S. G., Grossman, P., & Hinton, D. E. (2011). Loving-kindness and compassion meditation: Potential for psychological interventions. *Clinical Psychology Review, 31*(7), 1126–1132. doi:10.1016/j.cpr.2011.07.003
* King, L. A. (2001). The health benefits of writing about life goals. *Personality and Social Psychology Bulletin, 27*(7), 798–807. doi:10.1177/0146167201277003
* Masuda, A., Hayes, S. C., Sackett, C. F., & Twohig, M. P. (2004). Cognitive defusion and self-relevant negative thoughts: Examining the impact of a ninety year old technique. *Behaviour Research and Therapy, 42*(4), 477–485. doi:10.1016/j.brat.2003.10.008
* McGowan, S. K., & Behar, E. (2013). A preliminary investigation of stimulus control training for worry: Effects on anxiety and insomnia. *Behavior Modification, 37*(1), 90–112. doi:10.1177/0145445512455661
* Peters, M. L., Flink, I. K., Boersma, K., & Linton, S. J. (2010). Manipulating optimism: Can imagining a best possible self be used to increase positive future expectancies? *The Journal of Positive Psychology, 5*(3), 204–211. doi:10.1080/17439761003790963
* Wegner, D. M., Schneider, D. J., Carter, S. R., & White, T. L. (1987). Paradoxical effects of thought suppression. *Journal of Personality and Social Psychology, 53*(1), 5–13. doi:10.1037/0022-3514.53.1.5
* *World English Bible* (public domain), ebible.org `eng-web_vpl.txt` (sha256 52b92dc6…cd8c4): the 90 verses in `js/features/scripture.js`, plus Ephesians 2:20, 1 Peter 2:6 and Psalm 1:3 for the cornerstone.
* Al-Mosaiwi, M., & Johnstone, T. (2018). In an absolute state: Elevated use of absolutist words is a marker specific to anxiety, depression, and suicidal ideation. *Clinical Psychological Science, 6*(4), 529–542. doi:10.1177/2167702617747074
* Aldao, A., Nolen-Hoeksema, S., & Schweizer, S. (2010). Emotion-regulation strategies across psychopathology: A meta-analytic review. *Clinical Psychology Review, 30*(2), 217–237.
* Barlow, D. H., Allen, L. B., & Choate, M. L. (2004). Toward a unified treatment for emotional disorders. *Behavior Therapy, 35*(2), 205–230. doi:10.1016/S0005-7894(04)80036-4
* Beck, A. T. (1976). *Cognitive therapy and the emotional disorders.* New York: International Universities Press.
* Beck, A. T., Steer, R. A., Kovacs, M., & Garrison, B. (1985). Hopelessness and eventual suicide: A 10-year prospective study of patients hospitalized with suicidal ideation. *American Journal of Psychiatry, 142*, 559–563.
* Bowen, S., & Marlatt, A. (2009). Surfing the urge: Brief mindfulness-based intervention for college student smokers. *Psychology of Addictive Behaviors, 23*(4), 666–671. doi:10.1037/a0017127
* Bond, F. W., et al. (2011). Preliminary psychometric properties of the Acceptance and Action Questionnaire–II. *Behavior Therapy, 42*(4), 676–688.
* Burns, D. D. (1980). *Feeling good: The new mood therapy.* New York: William Morrow.
* Cornish, M. A., & Wade, N. G. (2015). A therapeutic model of self-forgiveness with intervention strategies for counselors. *Journal of Counseling & Development, 93*(1), 96–104. doi:10.1002/j.1556-6676.2015.00185.x
* Desbordes, G., Gard, T., Hoge, E. A., Hölzel, B. K., Kerr, C., Lazar, S. W., Olendzki, A., & Vago, D. R. (2015). Moving beyond mindfulness: Defining equanimity as an outcome measure in meditation and contemplative research. *Mindfulness, 6*(2), 356–372. doi:10.1007/s12671-013-0269-8
* Emmons, R. A., & McCullough, M. E. (2003). Counting blessings versus burdens: An experimental investigation of gratitude and subjective well-being in daily life. *Journal of Personality and Social Psychology, 84*(2), 377–389.
* Enright, R. D., & Fitzgibbons, R. P. (2015). *Forgiveness therapy: An empirical guide for resolving anger and restoring hope.* Washington, DC: APA. doi:10.1037/14526-000
* Gilbert, P. (2009). Introducing compassion-focused therapy. *Advances in Psychiatric Treatment, 15*(3), 199–208. doi:10.1192/apt.bp.107.005264
* Gilbert, P., & Procter, S. (2006). Compassionate mind training for people with high shame and self-criticism: Overview and pilot study of a group therapy approach. *Clinical Psychology & Psychotherapy, 13*(6), 353–379. doi:10.1002/cpp.507
* Gillanders, D. T., et al. (2014). The development and initial validation of the Cognitive Fusion Questionnaire. *Behavior Therapy, 45*(1), 83–101.
* Holt-Lunstad, J., Smith, T. B., & Layton, J. B. (2010). Social relationships and mortality risk: A meta-analytic review. *PLoS Medicine, 7*(7), e1000316.
* Kabat-Zinn, J. (1990). *Full catastrophe living.* New York: Delacorte.
* Kabat-Zinn, J. (2003). Mindfulness-based interventions in context: Past, present, and future. *Clinical Psychology: Science and Practice, 10*(2), 144–156. doi:10.1093/clipsy.bpg016
* Kim, S., Thibodeau, R., & Jorgensen, R. S. (2011). Shame, guilt, and depressive symptoms: A meta-analytic review. *Psychological Bulletin, 137*(1), 68–96. doi:10.1037/a0021466
* Lieberman, M. D., Eisenberger, N. I., Crockett, M. J., Tom, S. M., Pfeifer, J. H., & Way, B. M. (2007). Putting feelings into words: Affect labeling disrupts amygdala activity in response to affective stimuli. *Psychological Science, 18*(5), 421–428.
* McCullough, M. E., Bono, G., & Root, L. M. (2007). Rumination, emotion, and forgiveness: Three longitudinal studies. *Journal of Personality and Social Psychology, 92*(3), 490–505. doi:10.1037/0022-3514.92.3.490
* Lee, Y.-C., Lin, Y.-C., Huang, C.-L., & Fredrickson, B. L. (2013). The construct and measurement of peace of mind. *Journal of Happiness Studies, 14*(2), 571–590. doi:10.1007/s10902-012-9343-5
* Miller, W. R., & Rollnick, S. (2013). *Motivational interviewing: Helping people change* (3rd ed.). New York: Guilford Press.
* Neff, K. D. (2003). Self-compassion: An alternative conceptualization of a healthy attitude toward oneself. *Self and Identity, 2*(2), 85–101.
* Nolen-Hoeksema, S., Wisco, B. E., & Lyubomirsky, S. (2008). Rethinking rumination. *Perspectives on Psychological Science, 3*(5), 400–424.
* Schnitker, S. A. (2012). An examination of patience and well-being. *The Journal of Positive Psychology, 7*(4), 263–280. doi:10.1080/17439760.2012.697185
* Segal, Z. V., Williams, J. M. G., & Teasdale, J. D. (2013). *Mindfulness-based cognitive therapy for depression* (2nd ed.). New York: Guilford Press.
* Snyder, C. R. (2002). Hope theory: Rainbows in the mind. *Psychological Inquiry, 13*(4), 249–275.
* Gross, J. J. (1998). The emerging field of emotion regulation: An integrative review. *Review of General Psychology, 2*(3), 271–299.
* Gottman, J. M. (1994). *What predicts divorce? The relationship between marital processes and marital outcomes.* Hillsdale, NJ: Erlbaum.
* Gottman, J. M., & Levenson, R. W. (1992). Marital processes predictive of later dissolution: Behavior, physiology, and health. *Journal of Personality and Social Psychology, 63*(2), 221–233. doi:10.1037/0022-3514.63.2.221
* Gottman, J. M., & Levenson, R. W. (2000). The timing of divorce: Predicting when a couple will divorce over a 14-year period. *Journal of Marriage and Family, 62*(3), 737–745.
* Heyman, R. E., & Slep, A. M. S. (2001). The hazards of predicting divorce without crossvalidation. *Journal of Marriage and Family, 63*(2), 473–479. doi:10.1111/j.1741-3737.2001.00473.x
* Stahl, B., & Goldstein, E. (2010). *A mindfulness-based stress reduction workbook.* Oakland, CA: New Harbinger.
* Tangney, J. P. (2000). Humility: Theoretical perspectives, empirical findings and directions for future research. *Journal of Social and Clinical Psychology, 19*(1), 70–82. doi:10.1521/jscp.2000.19.1.70
* Teresa of Ávila. *The interior castle* (VI.10.7). In K. Kavanaugh & O. Rodriguez (Trans.), *The collected works of St. Teresa of Avila* (Vol. 2). Washington, DC: ICS Publications, 1980. ("To be humble is to walk in truth.")
* Wade, N. G., Hoyt, W. T., Kidwell, J. E. M., & Worthington, E. L., Jr. (2014). Efficacy of psychotherapeutic interventions to promote forgiveness: A meta-analysis. *Journal of Consulting and Clinical Psychology, 82*(1), 154–170. doi:10.1037/a0035268
* Worthington, E. L., Jr. (2006). *Forgiveness and reconciliation: Theory and application.* New York: Routledge.
* Zillmann, D. (1988). Mood management through communication choices. *American Behavioral Scientist, 31*(3), 327–340. doi:10.1177/000276488031003005
* Zaccaro, A., et al. (2018). How breath-control can change your life: A systematic review on psycho-physiological correlates of slow breathing. *Frontiers in Human Neuroscience, 12*, 353. doi:10.3389/fnhum.2018.00353
* Ekkekakis, P., Hall, E. E., VanLanduyt, L. M., & Petruzzello, S. J. (2000). Walking in (affective) circles: Can short walks enhance affect? *Journal of Behavioral Medicine, 23*(3), 245–275. doi:10.1023/A:1005558025163
* Frattaroli, J. (2006). Experimental disclosure and its moderators: A meta-analysis. *Psychological Bulletin, 132*(6), 823–865. doi:10.1037/0033-2909.132.6.823 (146 studies; a small average effect, r ≈ .08)
* Jacobson, E. (1938). *Progressive relaxation* (2nd ed.). Chicago: University of Chicago Press.
* Linehan, M. M. (2015). *DBT skills training manual* (2nd ed.). New York: Guilford Press. (TIP skills: Temperature)
* McCallie, M. S., Blum, C. M., & Hood, C. J. (2006). Progressive muscle relaxation. *Journal of Human Behavior in the Social Environment, 13*(3), 51–66. doi:10.1300/J137v13n03_04
* Pennebaker, J. W., & Beall, S. K. (1986). Confronting a traumatic event: Toward an understanding of inhibition and disease. *Journal of Abnormal Psychology, 95*(3), 274–281. doi:10.1037/0021-843X.95.3.274
* Rebar, A. L., Stanton, R., Geard, D., Short, C., Duncan, M. J., & Vandelanotte, C. (2015). A meta-meta-analysis of the effect of physical activity on depression and anxiety in non-clinical adult populations. *Health Psychology Review, 9*(3), 366–378. doi:10.1080/17437199.2015.1022901
* Cohen, G. L., & Sherman, D. K. (2014). The psychology of change: Self-affirmation and social psychological intervention. *Annual Review of Psychology, 65*, 333–371. doi:10.1146/annurev-psych-010213-115137
* Davis, M. H. (1983). Measuring individual differences in empathy: Evidence for a multidimensional approach. *Journal of Personality and Social Psychology, 44*(1), 113–126. doi:10.1037/0022-3514.44.1.113
* Speed, B. C., Goldstein, B. L., & Goldfried, M. R. (2018). Assertiveness training: A forgotten evidence-based treatment. *Clinical Psychology: Science and Practice, 25*(1), e12216. doi:10.1111/cpsp.12216
* *World English Bible* (public domain), ebible.org: Isaiah 53:7; Matthew 11:28–30; Matthew 27:12–14; Luke 23:34; Galatians 5:22–23; Philippians 4:7; 1 Peter 2:23.

## Privacy

* Everything stays in this browser's localStorage: the .mf numbers, the faith toggle, your companion (name and growth points), and the journal (explicit saves only). The forgiveness note boxes are never stored unless you tap "Save these notes to the journal".
* Network: none, except **Find more online** under Watch something, after you see what it sends: film genre ids and fixed filters to query.wikidata.org (or, only if you saved your own TMDB key, to api.themoviedb.org with that key). Never your words, feelings, names or the mf code. Replies are kept in memory for the session only.
* An optional TMDB key stays in this browser only (Remove key deletes it).
* Start over clears the numbers. Clear journal clears the journal.
