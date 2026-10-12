# MindFrame

MindFrame is a coping-skills practice tool. You write down a thought, and five bots look at it from different angles:

- **DBT Coach** — concrete skills such as STOP, Opposite Action, TIPP, and Check the Facts
- **Philosopher** — Stoic and existential reframes
- **Thought Equation** — a worksheet that spots cognitive distortions and estimates how believable the thought is
- **Compassion Coach** — self-compassion and thought defusion
- **CBT Coach** — names specific distortions (for example catastrophizing, mind reading, should statements) and suggests two or three matching exercises with steps: thought records, Socratic questioning, decatastrophizing, behavioral activation, and others from Beck, Burns, and related CBT sources

Technique text stays in the browser. A check of public APIs didn't find a reputable, CORS-friendly source of CBT technique descriptions that could be loaded without sending the thought to a server, so the list is local, in `js/cbt-techniques.js`.

A safety banner stays at the top of the page. If the text looks like a crisis (thoughts of suicide or self-harm), the app shows only a support box with **988** (Suicide & Crisis Lifeline, US) and **911**. The bots stay hidden, and the entry is not saved.

MindFrame is a practice tool, not a substitute for therapy.

## Run it

```bash
python3 serve.py
```

Then open [http://localhost:8000](http://localhost:8000).

## Research paper

[MindFrame: Toward an Inner Language and an Integrated, Low-Overload Framework for Self-Talk Support](paper/MindFrame_Paper.pdf) is a concept paper on MindFrame's framework.

## File structure

```
index.html        page markup
style.css         layout and styles
serve.py          static file server on port 8000
js/analyzer.js    keyword patterns, including cognitive distortions
js/cbt-techniques.js   local CBT exercises (name, steps, which signals they fit)
js/bots.js        the five bots
js/app.js         form, crisis check, and journal
screenshot.png    example of a normal reframe
crisis.png        example of the crisis support box
paper/MindFrame_Paper.pdf   concept paper
paper/MindFrame_Paper.tex   LaTeX source
```
