# MindFrame

MindFrame is a coping-skills practice tool. You write down a thought, and four bots look at it from different angles:

- **DBT Coach** — concrete skills such as STOP, Opposite Action, TIPP, and Check the Facts
- **Philosopher** — Stoic and existential reframes
- **Thought Equation** — a worksheet that spots cognitive distortions and estimates how believable the thought is
- **Compassion Coach** — self-compassion and thought defusion

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
js/analyzer.js    keyword patterns that turn text into signals
js/bots.js        the four bots
js/app.js         form, crisis check, and journal
screenshot.png    example of a normal reframe
crisis.png        example of the crisis support box
paper/MindFrame_Paper.pdf   concept paper
paper/MindFrame_Paper.tex   LaTeX source
```
