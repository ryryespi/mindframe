# MindFrame

MindFrame is a coping-skills practice tool. You write down a thought on your phone and look at it one step at a time.

A safety line stays at the top of every screen. If the text looks like a crisis (thoughts of suicide or self-harm), the only response is a support box with **988** (Suicide & Crisis Lifeline, US) and **911**. There is no breathing pause, no coaches, and nothing is saved.

MindFrame is practice, not a substitute for therapy.

## Reflect

Bottom tabs are **Reflect**, **Journal**, and **Insights**.

On Reflect, one primary action is on screen at a time:

1. Write a thought.
2. An optional breath, about 10 seconds. Skip is there if you want to move on.
3. Four short lines: Notice, Name, Stance, Act.
4. One coach, chosen from what the analyzer noticed. **See other angles** opens the other four (DBT Coach, Philosopher, Thought Equation, Compassion Coach, CBT Coach).
5. A hopeful picture, with a slow light and one line for what you see.

The Thought Equation asks for evidence for and evidence against as separate list entries. Believability uses those counts, then lowers the result a little for each thinking trap: evidence for, divided by all the evidence you listed, times (1 minus 0.15 times the number of traps).

If the wording sounds like a very big ambition ("I will change the world", "greatest", "destined", "everyone will"), a **One small step** card offers a value and one realistic action. The tone stays respectful. If ideas feel racing or overwhelming, it suggests talking with someone you trust.

Technique text stays in the browser, in `js/cbt-techniques.js`. Sources are noted in that file (Beck, Burns' *Feeling Good*, and related CBT work).

## Journal and Insights

Journal keeps what you chose to save, on this phone only. Insights draws a simple bar chart of the most frequent thinking traps and categories for each week. Nothing is sent to a server.

## Install

MindFrame is a small offline-capable app. `manifest.json` uses a relative `scope` and `start_url` (`./`), and the service worker caches the app shell with relative paths. The same files work at `http://localhost:8000` and on GitHub Pages under `/mindframe/`. An **Install** button appears when the browser offers to install it.

## Run it

```bash
python3 serve.py
```

Then open [http://localhost:8000](http://localhost:8000).

## Research paper

- [MindFrame: An Inner Language for Self-Talk, an Integrated Low-Overload Framework, and the Ψ Daily Reflection Index](paper/MindFrame_Combined_Paper.pdf) combines MindFrame with the Psi daily reflection index, and names the next project, MindFrame Psi-Lab.
- [MindFrame: Toward an Inner Language and an Integrated, Low-Overload Framework for Self-Talk Support](paper/MindFrame_Paper.pdf) is the original concept paper on MindFrame's framework.

## File structure

```
index.html              page
style.css               calm phone layout
manifest.json           install metadata, relative scope
sw.js                   offline cache
serve.py                static server on port 8000
icons/                  home-screen icons
js/analyzer.js          keyword patterns, traps, crisis, big-ambition language
js/cbt-techniques.js    local CBT exercises
js/bots.js              five coaches, believability, which coach goes first
js/app.js               screens, journal, chart, install
screenshot.png          earlier example of a reframe
crisis.png              earlier example of the crisis box
paper/MindFrame_Combined_Paper.pdf   combined paper (MindFrame, Psi index, Psi-Lab)
paper/MindFrame_Combined_Paper.tex   LaTeX source for the combined paper
paper/MindFrame_Paper.pdf   original concept paper
paper/MindFrame_Paper.tex   LaTeX source for the original paper
```
