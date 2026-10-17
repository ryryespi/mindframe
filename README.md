# MindFrame

A calm, local-only practice tool for looking at a thought. One page, one input box, and an **Update** button: nothing is read or shown until you tap Update (or press Ctrl/Cmd + Enter). No network, no account, no API.

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
```

* e is the 9-vector in [0, 1]. Hard and process movers rest at 0. Grounding movers rest at 0.5 ("unknown").
* Home h has calm, connection and hope at 0.8, everything else at 0.
* Defaults (all but a_cap and b_U adjustable in the Scientist panel): a0 = 0.20, k = 0.05, a_max = 0.25, a_cap = 0.12, b = 0.10, b_U = 0.15.
* act() turns the stepped vector into one small action, for the mover that moves most toward home.
* λ = ρ(W on the active hard/process movers) − decay. λ > 0 means the feelings are feeding each other.
* Hidden rise: a left-alone projection using the small W in `js/core/movers.js`. For example sadness ↔ rumination 0.4, and connection → shame −0.5.
* These are design choices informed by the research above, not validated values.

## The card: words, not numbers

The card appears only after Update and shows no numbers. The Scientist panel (Ada the Otter) shows the vector, the master equation with its values, λ, the baseline and the recovery count.

1. **What you may be feeling:** the one to three strongest movers in feeling words.
   * Hard and process movers use their value. Grounding movers use how far they sit below neutral.
   * Intensity words: under 0.3 "a little", 0.3 to 0.6 "quite", over 0.6 "strongly".
2. **How they connect:**
   * The strongest W link from the top mover, plus its stabilizer. For example: "When shame grows, it pulls you away from people; connection is what softens it."
   * λ: if unstable, "These feelings are feeding each other right now, so go gently."; if settling, "These feelings tend to ease on their own."
   * Hidden rise: "If this stays unspoken, sadness may creep in."
3. **Affirmations:** two from the mover that moves most toward home in the master step, plus one from the stabilizer. The choice is deterministic by seed. Include faith adds exactly one more.
4. **One step:** the act() action.
5. **Progress in words:** today compared with the baseline (for example "a little closer to steady than your recent days"), plus the recovery count in words.

| Mover | Example affirmations (4 per mover) | Faith affirmation (1 of 2) |
|---|---|---|
| anger | My anger shows what matters; I choose how to act. / I can pause before I answer. | patience: God can give me patience for the next moment. |
| shame | I made mistakes; I am not a mistake. / A hard moment does not decide who I am. | mercy: I am held by mercy, not measured by this moment. |
| fear | I can feel afraid and still take one safe step. / A worry is a guess, not a fact. | trust: I can trust God with the next hour. |
| sadness | It's okay to feel this; I'm not alone in it. / This heaviness is real, and it can change. | hope: My hope rests in God, even when I feel low. |
| rumination | I can set this thought down for now. / Going over it again isn't the same as solving it. | letting go: I can leave this in God's hands for now. |
| avoidance | I can let this feeling be here without obeying it. / I can take one small step before I feel ready. | courage: God can give me courage for one small step. |
| calm | I can slow down; this moment will pass. / My breath is something I can steady. | peace: God's peace can meet me in this breath. |
| connection | I am worth reaching out to. / I can let one person in a little. | I am known and loved by God, and I can reach out to others. |
| hope | Small steps still count. / I can plan one small thing for tomorrow. | God is not finished with my story. |

The affirmations are true, grounded statements, not promises.

6. **A pattern to notice** (only when one is found): see the Four Horsemen section below.

## Five friends

Below the card is a row of friendly animals. Each opens one panel; only one is open at a time. Pictures are original SVGs in `img/`, cached for offline use.

| Friend | Role | Personality | Panel |
|---|---|---|---|
| **Fern the Fox** (pencil) | Writer | Keeps your journal and spins gentle stories. | A creature story driven by the master step (feeling words, ends with an affirmation and a question), accept the step, the path game, and the journal (the only place your words are kept, and only when you tap Save). |
| **Hazel the Owl** (glasses, book) | Historian | Remembers your days and how far you've come. | Each day in words, Save checkpoint (numbers only), restore a checkpoint. |
| **Remy the Raccoon** (magnifying glass) | Analyzer | Turns over each feeling to see how it fits. | All nine movers in words: how present each is, what it feeds, what softens it. |
| **Toby the Tortoise** (quill) | Scribe | Slow and careful; copies your numbers safely. | Export / import `.mf` code, download, Start over. |
| **Ada the Otter** (goggles, flask) | Scientist | Loves equations and lets you tinker. | The math (vector, equation, λ, baseline, recovery), adjust each mover, and the variables a0, k, a_max, b, decay, home and the main W links, with Reset. |

Changing a number in a panel does not redraw the card; it says "Tap Update to see the new reading." Buttons that are themselves an action (Write a story, Accept step, Save checkpoint, Restore) run Update for you.

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
index.html            the one page: input, Update, card, five friends, five panels
style.css             calm, muted styles; large tap targets
sw.js                 offline cache (v14)
tools.html            redirects old shortcuts to the one page
img/                  fox, owl, raccoon, tortoise, otter (original SVGs)
js/
  app.js              page shell: state, Update, the card, opening panels
  core/               the model; no page code
    signals.js        word patterns (thinking traps, needs)
    grounding.js      crisis wording and pattern reading
    movers.js         MF.Movers: the nine movers, W, variables, lexicon, fromText
    master.js         MF.Master: the master function, recovery, baseline
    words.js          MF.Words: the words-first card
  features/
    writer/           Fern the Fox
      writer.js       MF.Writer: story, path game, journal, panel
      stories.js      creature stories
      games.js        the path game
    historian.js      Hazel the Owl: days, checkpoints, restore, history
    analyzer.js       Remy the Raccoon: the nine movers in words
    scribe.js         Toby the Tortoise: mf 2 / mf 1 export and import
    scientist.js      Ada the Otter: the math, sliders and variables
    relationship.js   the Four Horsemen pattern helper
tests/                node tests (tests/mf.js loads every module)
```

Load order in `index.html`: core (signals, grounding, movers, master, words), then features (relationship, stories, games, historian, writer, analyzer, scribe, scientist), then `app.js`.

Tests: `for f in tests/*.test.js; do node "$f"; done`.

## References

* Aldao, A., Nolen-Hoeksema, S., & Schweizer, S. (2010). Emotion-regulation strategies across psychopathology: A meta-analytic review. *Clinical Psychology Review, 30*(2), 217–237.
* Barlow, D. H., Allen, L. B., & Choate, M. L. (2004). Toward a unified treatment for emotional disorders. *Behavior Therapy, 35*(2), 205–230. doi:10.1016/S0005-7894(04)80036-4
* Beck, A. T., Steer, R. A., Kovacs, M., & Garrison, B. (1985). Hopelessness and eventual suicide: A 10-year prospective study of patients hospitalized with suicidal ideation. *American Journal of Psychiatry, 142*, 559–563.
* Bond, F. W., et al. (2011). Preliminary psychometric properties of the Acceptance and Action Questionnaire–II. *Behavior Therapy, 42*(4), 676–688.
* Gillanders, D. T., et al. (2014). The development and initial validation of the Cognitive Fusion Questionnaire. *Behavior Therapy, 45*(1), 83–101.
* Holt-Lunstad, J., Smith, T. B., & Layton, J. B. (2010). Social relationships and mortality risk: A meta-analytic review. *PLoS Medicine, 7*(7), e1000316.
* Kim, S., Thibodeau, R., & Jorgensen, R. S. (2011). Shame, guilt, and depressive symptoms: A meta-analytic review. *Psychological Bulletin, 137*(1), 68–96. doi:10.1037/a0021466
* Nolen-Hoeksema, S., Wisco, B. E., & Lyubomirsky, S. (2008). Rethinking rumination. *Perspectives on Psychological Science, 3*(5), 400–424.
* Snyder, C. R. (2002). Hope theory: Rainbows in the mind. *Psychological Inquiry, 13*(4), 249–275.
* Gottman, J. M. (1994). *What predicts divorce? The relationship between marital processes and marital outcomes.* Hillsdale, NJ: Erlbaum.
* Gottman, J. M., & Levenson, R. W. (1992). Marital processes predictive of later dissolution: Behavior, physiology, and health. *Journal of Personality and Social Psychology, 63*(2), 221–233. doi:10.1037/0022-3514.63.2.221
* Gottman, J. M., & Levenson, R. W. (2000). The timing of divorce: Predicting when a couple will divorce over a 14-year period. *Journal of Marriage and Family, 62*(3), 737–745.
* Heyman, R. E., & Slep, A. M. S. (2001). The hazards of predicting divorce without crossvalidation. *Journal of Marriage and Family, 63*(2), 473–479. doi:10.1111/j.1741-3737.2001.00473.x
* Zaccaro, A., et al. (2018). How breath-control can change your life: A systematic review on psycho-physiological correlates of slow breathing. *Frontiers in Human Neuroscience, 12*, 353.

## Privacy

* Everything stays in this browser's localStorage: the .mf numbers, the faith toggle, and the journal (explicit saves only).
* Start over clears the numbers. Clear journal clears the journal.
