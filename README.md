# MindFrame

A calm, local-only practice tool for looking at a thought. One page, one input box: type and the card updates as you go. No network, no account, no API.

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

## The model

* e is the 9-vector in [0, 1]. Hard and process movers rest at 0. Grounding movers rest at 0.5 ("unknown"). Home h has calm, connection and hope at 0.8, everything else at 0.
* Words: e = 1 − (1 − base)(1 − w) for hard and process movers. For grounding movers, e = base + pos·(1 − base) − neg·base.
* Dynamics: e ← clamp[0,1]( e + dt·( Wᵀ(e − rest) − d·(e − rest) ) ), with dt = 0.15 and decay d = 0.3.
  * W is small and documented in `js/model.js`. Positive links include sadness ↔ rumination 0.4 and fear → avoidance 0.4.
  * Grounding movers damp the hard ones, for example calm → fear −0.5 and connection → shame −0.5.
* λ = ρ(W on the active hard/process block) − d. λ > 0 means small changes grow, so the step stays small.
* Distance: d = ‖e − h‖.
* Ideal step: e′ = e + a·(h − e) + b·s(e).
  * a adapts with λ, and is capped at 0.12 when λ > 0.
  * s(e) is the pull from grounding movers on the strongest hard mover.
  * A mover never passes home.
* Hidden rise: an 8-step projection shows a quiet mover that would climb (for example sadness via shame).
* Recovery estimate: the number of ideal steps until d < 0.3, converted to days at your own pace of accepted steps.
* These are design choices informed by the research above, not validated values.

## The card

1. Movers: only the non-trivial ones, as bars and numbers.
2. A plain reading: the strongest loop, any hidden rise, and whether the active movers settle.
3. One reframe and one test question.
4. One next skill.
5. The ideal step and the recovery estimate.

Below the card:

* **Story:** a creature story driven by the ideal step. Accept the step, or play the choose-a-path game.
* **Save checkpoint** (numbers only).
* **Journal:** the only place your words are kept, and only when you tap it.
* **Export / Import.**
* **History** (collapsed): a 7-day baseline line plus checkpoints.
* **Variables:** home targets, aBase, aMax, b, d, and the main W links, with Reset.

**Include faith** changes wording only, never the numbers:

| Mover | Faith wording |
|---|---|
| anger | patience |
| shame | mercy |
| fear | trust |
| sadness | hope |
| rumination | humility / letting go |

## Code (`mf 2`)

```
mf 2
home calm=0.80 connection=0.80 hope=0.80
e sadness=0.67 anger=0.86 calm=0.50 connection=0.50 hope=0.28 rumination=0.10 avoidance=0.45
vars aBase=0.30                 # only non-defaults
w calm>fear=-0.70               # only changed links
day 2026-10-16 …
cp 1 2026-10-16T08:30 label=step-1 … lambda=-0.30
ideal a=0.20 b=0.10
eq e' = e + 0.20*(h - e) + 0.10*s(e)   # readable; ignored on import
```

* Numbers and labels only, never your words.
* mf 2 round-trips exactly.
* mf 1 codes import on a best-effort basis through the mapping above. Old variables and frameworks are dropped, with a note.

## Files

* `index.html`, `style.css`, `js/ui.js`: the one page.
* `js/model.js`: the nine movers, lexicon, dynamics, card and code.
* `js/grounding.js`, `js/analyzer.js`: pattern reading and crisis wording.
* `js/stories.js`, `js/games.js`: stories and the path game.
* `tools.html` only redirects old shortcuts to the one page.
* `sw.js` caches the shell for offline use (cache v11).

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
* Zaccaro, A., et al. (2018). How breath-control can change your life: A systematic review on psycho-physiological correlates of slow breathing. *Frontiers in Human Neuroscience, 12*, 353.

## Privacy

* Everything stays in this browser's localStorage: the .mf numbers, the faith toggle, and the journal (explicit saves only).
* Start over clears the numbers. Clear journal clears the journal.
