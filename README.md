# MindFrame

A calm, local-only practice tool for looking at a thought. One page, one input box, and an **Update** button: nothing is read or shown until you tap Update (or press Ctrl/Cmd + Enter). No account and no API key. **The app composes its own replies from the equation and makes no network calls**; a public AI is optional, through one button that shows you the exact prompt first.

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

## The master function

Every feature calls one function, `MF.Master.master(text, state)` in `js/core/master.js`. That covers the live card, the story, the path game, checkpoints, accepting a step, recovery, the baseline, import and restore. Nothing else steps e.

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
P      = 1/(1 + (d/d0)²) · (1 − γ·C_max) · (1 − δ·g)     inner peace, in [0, 1]
```

The last three are computed in the same master pass (`js/core/reality.js`) and returned as `grand`, `conflicts[]` and `positives[]`. No new movers or variables.

* e is the 9-vector in [0, 1]. Hard and process movers rest at 0. Grounding movers rest at 0.5 ("unknown").
* Home h has calm, connection and hope at 0.8, everything else at 0.
* Defaults (all but a_cap and b_U adjustable in the Scientist panel): a0 = 0.20, k = 0.05, a_max = 0.25, a_cap = 0.12, b = 0.10, b_U = 0.15.
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
P_g = 1 − δ·g                g = the grandiosity signal; δ = 0.3
```

d0, γ and δ are adjustable in Ada's panel. P = 1 exactly at home and is lower everywhere else (each factor is at most 1). P_d is smooth and strictly decreasing, so there is always a direction to move.

**Solving for inner peace:**

* **Steady state e\*.** Proof sketch for the exact map, with hard/process homes at 0 (always true in the app):
  * grounding movers: next − h = (1 − a)(e − h);
  * hard and process movers: s ≤ 0 and h = 0, so 0 ≤ next ≤ (1 − a)·e.
  * Hence ‖next − h‖ ≤ (1 − a)‖e − h‖ with a ≥ min(a0, a_max, a_cap) ≥ 0.05. The master map is a **contraction** toward h for any b ≥ 0 and any W: d_t ≤ 0.95^t·d_0. Its unique fixed point is e\* = h, where P = 1.
  * Because the app rounds every step to 0.01, the computed iteration stops at a lattice point within 0.005/a of h per mover (≤ 0.03 with the defaults), where P ≥ 0.95. Tests check the contraction inequality on the exact map (three settings, 180 random starts) and the rounded fixed point (80 random starts).
* **n\*:** the number of master steps until P ≥ 0.8 (the peace threshold), counted from the current reading. Tests match it against a direct simulation.
* **The most helpful lever:** the mover whose move toward home by 0.05 raises P most (a finite difference; Ada also shows the central-difference gradient ∂P/∂e_i). The One step is the lever's technique, composed as before.

On the card, under "Room for": "Inner peace: a little / growing / close / steady" (P < 0.4, < 0.6, < 0.8, ≥ 0.8), "Path to peace: about five gentle steps; the biggest help right now is easing the anger", and how much the hidden pull and the grand thought take away. With Include faith on, one more line: "May the peace of God, which surpasses all understanding, guard your heart and mind (from Philippians)." Hazel shows inner peace across your saved days in words. The comfort prompt includes P, its band, n\* and the lever. Crisis wording shows no peace score, only 988/911.

Conceptual basis (nothing is measured):

* **Equanimity:** an even-minded state toward all experience (Desbordes et al., 2015; Kabat-Zinn, 2003). Here: near home with nothing pulling hard.
* **Peace of mind** as internal peacefulness and harmony (Lee, Lin, Huang & Fredrickson, 2013). Inner conflict lowers it (P_c).
* **Emotion regulation** (Gross, 1998). The lever is the one place where a small regulation step helps most, and the reality check is the cognitive-change point (P_g).

## Hidden conflicts

Two pulls that are both active at once, derived from the nine movers (no new movers): fear + hope, anger + wanting to stay close (connection ≥ 0.6), shame + a need for connection (connection ≤ 0.4), rumination + wanting calm, avoidance + hope. Hard/process sides need e ≥ 0.3. Strength c = √(x·y). Clashes in the words themselves ("I want … but", "I should … but", "I love … but", "part of me", "torn", "mixed feelings") count with c = 0.5. The card says, for example, "A hidden pull: part of you is very afraid of what could go wrong, while part of you is really hoping it goes well." and adds a gentle line about holding both. Ambivalence is a normal part of change (Miller & Rollnick, *Motivational Interviewing*, 2013).

## Reality check: grand vs. true-sized

`js/core/reality.js` looks for grand or absolute wording ("only I can", "I'm destined", "everyone will see", "I'm better than everyone", "I never fail", "nothing can stop me"), certain-worst wording ("I'll never be happy", "everything is ruined", "everyone hates me"), all-or-nothing ("a total failure") and absolutist words (always, never, completely, everyone, nothing…). It is negation-aware ("I'm not better than anyone" is ignored). The signal g feeds rumination and avoidance/fusion. When g ≥ 0.25 the card shows, without labels or shaming: "Reality check: part of this thought sounds very sure that it all depends on you, or that you can't fall short." then "You matter, and you are also human; one good step is enough." Grounding: Beck's cognitive distortions (magnification, all-or-nothing; Beck, 1976), Burns (1980), and Al-Mosaiwi & Johnstone (2018), who found absolutist words more common in anxiety, depression and suicidal-ideation forums. This is a word signal, not a diagnosis.

## Comfort story from a public AI (optional)

In Fern the Fox's panel, **Comfort story from a public AI** builds a prompt from the analysis only and shows it in an editable box with "Only this text will be shared. Your journal stays on your phone." The prompt contains the card in plain words plus a compact numbers summary (movers with bands, step direction d → d_next and the biggest move, conflicts with c, the grandiosity signal g, positive emotions) and asks for a ~200-word gentle, grounded comfort story with a friendly animal, three affirmations written from that analysis, no medical advice, and a hopeful ending. It never contains the text you typed (every line is composed from numbers, and a second guard drops any line repeating four of your words in a row). **Open in Grok** (`https://grok.com/?q=<encoded>`) and **Open in ChatGPT** (`https://chatgpt.com/?q=<encoded>`) open a new tab and also copy the prompt in case the site doesn't fill it in; Grok may send it as soon as it opens. **Copy prompt** copies only. The button is disabled during a crisis. The app itself makes no network calls.

## Six friends

Below the card, six friendly animals sit in a little meadow. Each opens one panel; only one is open at a time. Pictures are original SVGs in `img/`, cached for offline use. Six is the cap: the patience and mindfulness practices live with Grace rather than in a seventh helper.

| Friend | Role | Personality | Panel |
|---|---|---|---|
| **Fern the Fox** (pencil) | Writer | Keeps your journal and spins gentle stories. | A creature story driven by the master step (feeling words, ends with an affirmation and a question), accept the step, the path game, the optional public-AI comfort prompt, and the journal (the only place your words are kept, and only when you tap Save). |
| **Hazel the Owl** (glasses, book) | Historian | Remembers your days and how far you've come. | Each day in words, inner peace across your saved days, Save checkpoint (numbers only), restore a checkpoint. |
| **Remy the Raccoon** (magnifying glass) | Analyzer | Turns over each feeling to see how it fits. | Every hidden pull and any grand wording with its true-sized version, then all nine movers in words: how present each is, what it feeds, what softens it. |
| **Toby the Tortoise** (quill) | Scribe | Slow and careful; copies your numbers safely. | Export / import `.mf` code, download, Start over. |
| **Ada the Otter** (goggles, flask) | Scientist | Loves equations and lets you tinker. | The math (vector, equation, λ, baseline, recovery, g, conflict strengths c, positive-emotion scores, inner peace P with ∂P/∂e, the lever, n*, e* and the convergence proof sketch, the forgiveness scores F_self and F_other with the path, ΔP_F and the Grace recommendation, and the practice pick), adjust each mover, and the variables a0, k, a_max, b, decay, d0, γ, δ, home and the main W links, with Reset. |
| **Grace the Dove** (olive branch) | Peacemaker | Lets go gently, of my own mistakes and others'. | Three tabs: **Forgive myself** (the four Rs), **Forgive someone** (REACH), and **Breathe & be patient** (ten practices and the breathing circle). Optional note boxes stay on the page unless you save them to the journal. |

Changing a number in a panel does not redraw the card; it says "Tap Update to see the new reading." Buttons that are themselves an action (Write a story, Accept step, Save checkpoint, Restore) run Update for you.

## Grace the Dove: forgiveness, patience and mindfulness

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
Grace   = a path is suggested AND the inner-peace lever is one of that path's movers
          (self: shame, rumination; other: anger, rumination, connection)
```

Without a cue, a path needs e_shame (or e_anger) ≥ 0.875. Rumination is in both release vectors because rumination predicts lower forgiveness through anger (McCullough, Bono & Root, 2007).

**On the card**, words only, a forgiveness tile appears when a path is suggested. For example: "Forgiving someone: there's a deep hurt here that still stings. Forgiveness can come slowly, as a gift you choose, for your own peace." The tile for others always says "Forgiving is not excusing what happened, making up, or staying anywhere unsafe." When Grace is recommended, the peace lines add "Grace the Dove can help here: forgiving someone is a gentle way to ease the anger." Faith wording appears only with Include faith on: the Lord's Prayer ("forgive us our debts, as we also forgive our debtors"), Colossians 3:13, and, in Grace's panel, Luke 23:34.

**Grace's guided paths.** Each step is short and has an optional note box. The notes are kept only in the page; they are saved only through "Save these notes to the journal". Crisis wording in a note shows the 988/911 box and clears the notes.

* **Forgive myself:** the four Rs of self-forgiveness: Responsibility, Remorse, Restoration, Renewal (Cornish & Wade, 2015). Renewal uses Neff's self-compassion: mindfulness, common humanity, self-kindness (Neff, 2003). The request named "Worthington's four Rs"; the published four-R model is Cornish & Wade's, so it is credited to them.
* **Forgive someone:** REACH (Recall, Empathize, Altruistic gift, Commit, Hold on; Worthington, 2006). Forgiveness interventions are supported by a meta-analysis (Wade, Hoyt, Kidwell & Worthington, 2014). The intro follows Enright's process model (uncovering, decision, work, deepening; Enright & Fitzgibbons, 2015). It says plainly that forgiving is not excusing, reconciling, or staying unsafe, and to reach out for help first if you are not safe.

**Patience and mindfulness practices** (the "Breathe & be patient" tab):

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

Patience is treated as a trainable strength linked to well-being (Schnitker, 2012). A waiting/impatience hook ("taking forever", "can't wait", "impatient", "stuck in traffic") gives c_wait = 1 − e^(−0.7k) and nudges anger +0.2 and calm −0.2.

**Which practice becomes the One step.** Let n be the inner-peace lever, or master's mover if there is no lever:

* rumination → labeling if another hard mover is ≥ 0.3, else STOP;
* anger → reframe the wait if c_wait ≥ 0.3, else pause and longer exhale;
* fear → reframe the wait if c_wait ≥ 0.3, else the breathing space;
* avoidance → urge surfing;
* shame → self-compassion break;
* sadness → gratitude if hope is ≥ 0.3, else the earlier small-action step;
* calm → reframe the wait if c_wait ≥ 0.3, else five senses if d ≥ 0.5, else the body scan;
* hope → gratitude;
* connection → the earlier message step.

The card reads "<practice>: <instruction with dose words>, so <mover> can <ease>." A "Try it with Grace" button opens that practice.

**The breathing circle** is optional: in for four seconds, out for six (a longer exhale, six breaths a minute). The number of breaths follows the dose (three, four or five). It makes no sound. With reduced motion, the circle stays still and only the words and a soft color change.

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

## Code (`mf 2`)

```
mf 2
home calm=0.80 connection=0.80 hope=0.80
e sadness=0.67 anger=0.86 calm=0.50 connection=0.50 hope=0.28 rumination=0.10 avoidance=0.45
vars aBase=0.30                 # only non-defaults
w calm>fear=-0.70               # only changed links
day 2026-10-16 …
cp 1 2026-10-16T08:30 label=step-1 … lambda=-0.30
ideal a=0.25 b=0.10
eq step = act(clip01(e + 0.25*(h - e) + 0.10*s(e)))   # readable; ignored on import
```

* Numbers and labels only, never your words.
* mf 2 round-trips exactly.
* mf 1 codes import on a best-effort basis through the mapping above. Old variables and frameworks are dropped, with a note.

## Structure

Code is grouped by feature. Every file starts with a header comment; every function has a JSDoc. Files share one namespace, `MF` (`window.MF` in the browser, `global.MF` in Node tests).

```
index.html            the one page: scene, input, Update, card tiles, six friends, six panels
style.css             calm styles, dark mode, reduced motion; large tap targets
sw.js                 offline cache (v17)
tools.html            redirects old shortcuts to the one page
img/                  fox, owl, raccoon, tortoise, otter, dove (original SVGs)
js/
  app.js              page shell: state, Update, the card, opening panels
  core/               the model; no page code
    signals.js        word patterns (thinking traps, needs)
    grounding.js      crisis wording and pattern reading
    movers.js         MF.Movers: the nine movers, W, variables, lexicon, fromText
    reality.js        MF.Reality: grandiosity g, hidden conflicts, positive emotions
    peace.js          MF.Peace: inner peace P, the lever, the gradient, the bands
    master.js         MF.Master: the master function, recovery, baseline
    words.js          MF.Words: the composer (every card sentence built from the numbers)
  features/
    writer/           Fern the Fox
      writer.js       MF.Writer: story, path game, journal, panel
      stories.js      creature stories
      games.js        the path game
      comfort.js      MF.Comfort: the optional public-AI prompt and links
    historian.js      Hazel the Owl: days, checkpoints, restore, history
    analyzer.js       Remy the Raccoon: the nine movers in words
    scribe.js         Toby the Tortoise: mf 2 / mf 1 export and import
    scientist.js      Ada the Otter: the math, sliders and variables
    relationship.js   the Four Horsemen pattern helper
    forgiveness.js    Grace the Dove: forgiveness cues, master pass, card words, guided paths
    practices.js      MF.Practices: patience & mindfulness library, the step pick, the breathing circle
tests/                node tests (tests/mf.js loads every module)
```

Load order in `index.html`: core (signals, grounding, movers, reality, peace, master, words), then features (relationship, forgiveness, practices, stories, games, historian, writer, comfort, analyzer, scribe, scientist), then `app.js`.

Tests: `for f in tests/*.test.js; do node "$f"; done`.

## Papers

[MindFrame: A Master-Function Model for Grounded Reflection, Inner Peace, and Forgiveness](paper/MindFrame-Grace-Peace-Paper.pdf) is the research paper on the master-function model, inner peace, and forgiveness. The source is `paper/MindFrame-Grace-Peace-Paper.tex`; figures are in `paper/grace-peace-fig/`.

Also in `paper/`:

* [MindFrame: An Inner Language for Self-Talk, an Integrated Low-Overload Framework, and the Ψ Daily Reflection Index](paper/MindFrame_Combined_Paper.pdf) combines MindFrame with the Psi daily reflection index.
* [MindFrame: Toward an Inner Language and an Integrated, Low-Overload Framework for Self-Talk Support](paper/MindFrame_Paper.pdf) is the original concept paper.

## Model, not validated science

MindFrame is a model built from design assumptions and informed by the research cited here. It is not validated science, not a measurement of you, and not a diagnosis. The thresholds (0.3, 0.6, 0.25, the peace threshold 0.8, the forgiveness threshold θ_F = 0.35, c_wait ≥ 0.3) and weights (including d0, γ, δ, the hook nudges and the release vectors) are design choices.

## References

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
* Gillanders, D. T., et al. (2014). The development and initial validation of the Cognitive Fusion Questionnaire. *Behavior Therapy, 45*(1), 83–101.
* Holt-Lunstad, J., Smith, T. B., & Layton, J. B. (2010). Social relationships and mortality risk: A meta-analytic review. *PLoS Medicine, 7*(7), e1000316.
* Kabat-Zinn, J. (1990). *Full catastrophe living.* New York: Delacorte.
* Kabat-Zinn, J. (2003). Mindfulness-based interventions in context: Past, present, and future. *Clinical Psychology: Science and Practice, 10*(2), 144–156. doi:10.1093/clipsy/bpg016
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
* Wade, N. G., Hoyt, W. T., Kidwell, J. E. M., & Worthington, E. L., Jr. (2014). Efficacy of psychotherapeutic interventions to promote forgiveness: A meta-analysis. *Journal of Consulting and Clinical Psychology, 82*(1), 154–170. doi:10.1037/a0035268
* Worthington, E. L., Jr. (2006). *Forgiveness and reconciliation: Theory and application.* New York: Routledge.
* Zaccaro, A., et al. (2018). How breath-control can change your life: A systematic review on psycho-physiological correlates of slow breathing. *Frontiers in Human Neuroscience, 12*, 353. doi:10.3389/fnhum.2018.00353

## Privacy

* Everything stays in this browser's localStorage: the .mf numbers, the faith toggle, and the journal (explicit saves only). Grace's note boxes are never stored unless you tap "Save these notes to the journal".
* Start over clears the numbers. Clear journal clears the journal.
