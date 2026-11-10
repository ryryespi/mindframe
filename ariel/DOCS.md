# Using Project Ariel

Project Ariel is an offline canvas for looking at a thought as geometry. The shapes are the source of truth. Words, fields, and prompts only describe them.

This is conceptual, not validated science. It is not therapy and not a diagnosis. In crisis in the U.S., call or text **988**. In an emergency, call **911**.

Related papers from this week are listed in the [research index](../research/).

All credit and glory to God. I owe my knowledge to my Lord Jesus Christ.

## Quick start

1. Layer 1 is the **Nonsense Layer**. It is locked. It is the origin: input and output anchors, patience \(P_t\), momentum, entropy, and the stages of the thought model. Every other layer is read against it.
2. Draw on any other layer. Point, line, and circle are in the Draw group. Drag a point, an end, or a line's middle to move it.
3. Name that layer and choose a field (physics, theology, music, psychology, math, or custom). The field changes the words you see. It does not change the shapes.
4. The command line at the bottom takes `LINE`, `CIRCLE`, `ERASE`, `UNDO`, `REDO`, `LAYER`, and a one-line math sentence.
5. Open **Text** for notation, plain English, bag of words, and Math. **Export** builds a prompt you can paste somewhere else. Nothing is sent on its own.

On a phone the ribbon scrolls sideways. **Layers** opens the layer panel.

## The Nonsense Layer and freeform layers

The Nonsense Layer stays named, locked, and human. You can look at it. You cannot draw on it, delete it, or turn it into an AI layer. Its domain is the paper's model of a human thought.

Every other layer is freeform. You name it and set its field. Draw whatever that field needs. Presets only seed suggestion words in the sidebar (force, grace, melody, and so on). They never place a shape for you.

**Advanced** shows the lexicon, the momentum dial, and the word sidebar. The AI partner still never edits a human layer, including the Nonsense Layer.

## Tools and commands

| Command | What it does |
|---|---|
| `POINT` `LINE` `CIRCLE` | Choose that tool |
| `MOVE` `SELECT` | Drag a shape, or select one |
| `ERASE` or Delete | Remove the selection. Undo brings it back |
| `UNDO` `REDO` | Ctrl/Cmd+Z and Ctrl/Cmd+Y do the same |
| `LAYER n` | Select layer n (1 is the Nonsense Layer) |
| `SNAP` | Euclid snaps: points, right angles, parallels |
| `ORTHO` | A new line stays horizontal or vertical |
| `MERGE` | Fold the selected layer and those below into a new AI layer. Sources stay |
| `CLARIFY` | Suggest exact parallels, right angles, and touching ends. Nothing changes until you accept |
| `LOCK` | Lock or unlock a freeform layer. The Nonsense Layer stays locked |
| `EXPORT` | Open the prompt panel |
| `HELP` | This guide, inside the app |
| `MATH …` | Apply one math line to the active layer |

The status bar shows snap, ortho, Euclid, momentum \(M\) and damping \(\gamma\), patience \(P_t\), the layer name, and the field's word for a line.

Doubt (◌) is a resistance circle: its radius is \(\rho\), and inside it the damping is \(\gamma+\rho\). A smaller circle is less resistance. Drag the rim to change \(\rho\). The shapes inside stay, and the edit undoes like any other.

## Vision

Ariel helps the student walk a tightrope by framing the pursuit of knowledge not as an attempt to master God, but as a way to uncover His legacy through the mechanics of the world. The student learns math, geometry, and art not to build a Tower of Babel to reach heaven, but to appreciate the architecture already placed before them. The quest for knowledge doesn't end because God is the ultimate answer; it becomes joyful, peaceful, and endless precisely because that answer is so vast.

The [suite](suite/) opens on five tabs: Discover, Create, Learn, Rest, and Record. Discover is a listening journal. Create is this canvas; More tools reveals snap, the command line, layers, and the signal. **Tell me a story** turns the drawing into a seed. The same marks always tell the same short story. A different drawing tells a different one. Keep this story saves it on this device, with the date and a small picture of the marks. If many stories arrive within a few minutes, Ariel offers rest and still lets you ask for one more. In Listening mode the story stays hidden. If the drawing is fast and tangled and the words are a fight to prove someone else wrong, Ariel does not argue. It offers unearned grace and rest. **Why this works:** there is no confrontation and no verdict. Ariel names the exhaustion under the effort. Unearned grace is meant to lower the threat so regulation can recover. This is conceptual, not validated science. If the words turn toward harm, the script stops and the 988 / 911 note stays on screen. Advanced shows the seed and how many pieces differ from recent stories. Learn suggests two to four fundamentals and one kindred mind, and it does not assign exercises. Rest is for the voids: a pause, "You can let yourself off the hook for this.", the dream you wrote quoted back, a check-in of one question at a time, and a reality check that shows what is true beside where the dream can still hold. The check-in is not graded. A note is saved only if you keep one. **I'm afraid to stop** is for when rest feels like disappearing: you are not what you make, and rest comes in small doses (10 seconds, then 30, then one minute), each ending with "Your work is still here." **Slow the spiral** offers one step at a time, and you pick. Nothing starts by itself. Kindness you add on the Record can be shown back as proof the world has been kind before. Harm language still stops the script for the 988 / 911 note. **Six gifts** is the first welcome: grace, belonging, rest, truth, kindness, and novelty, one at a time. Receiving one is optional. **Reach out** is for fighting for connection: one step at a time, and never toward someone who is unsafe or who asked for space. Ariel does not send the message. **What we've made** shows one saved kindness, story, or courage at a time when the void begins, at most once a session unless you ask, and Not now is always there. In crisis, call or text **988**. In an emergency, call **911**. "This is enough" logs a settled idea. Under Advanced, the gate and the charts are still there: doubt ρ raises threat v and lowers control r, the I→O span sets bridge y, and gate g = clamp(0.05 + 0.95·(0.2+0.8·r)·(1−0.3·v)) scales transfer and the signal gain Kᵢ. Classic URL stays [../index.html](index.html).

**Accomplishment Record** (the Record tab) is a factual timeline of what you did: a saved journal note, a layer or drawing on the canvas, an I→O line, a closed loop, a finished session, and a kindred mind or knowledge-path step when the canvas reports one. You can add, edit, or delete entries. Remember shows one past entry. Counts are simple totals, not grades. It is stored on this device (`ariel-record`), and the tab can export or import that file.

**Signal** (the Signal button) is a scalar field on a grid. A user submitted `S_out = K_i ∫[Ψ − α u] dτ + β dp/dt + γ ∇²M`. That mixed a vector with scalars and diffused an undefined `M`. The corrected step is `Sₙ₊₁ = Sₙ + Δt·[Kᵢ·I + β(v·n̂) + γ∇²S − ρ·χ_doubt·S]`, with `e = Ψ − α·u` and `I = clamp(∫ e dτ)`. Ψ is a soft peak at O. u is your slider. The tracer walks from I to O and only its speed along that line is added. Diffusion acts on S. A doubt circle reduces S inside it. Play, pause, and reset sit on the panel, with a small plot of S at O. The step stays stable (`γΔt/h² ≤ 0.25`). It is conceptual, not validated. The same idea can be read as a robotics controller, HVAC across a floor, an image filter, game motion, or a spread model.

**Collapse** is the purpose of the screen. One button projects every visible layer onto the straight line from I to O. Points keep their order, doubt shows up as thicker, costlier stretches, and the readout is one line: `From I to O: hope → patience → peace, with resistance at doubt`. Nothing is deleted. Expand, or undo, restores the map. After the collapse, each pair of layers is compared: parallel and overlapping lines both count as parallel (∥). Overlap means offset 0 and can be marked ≡, and it is the strongest agreement. The side view draws those aligned I→O lines in one color. Plain English says, for example, "Your physics layer runs parallel to the Nonsense Layer."

## Undo and delete

Every edit is one step: a stroke, an accepted suggestion, a merge, a math line, an erase. Undo returns the previous whole state. Redo walks forward again until you draw something new. The AI's continuous motion is not a step. Accepting a suggestion is.

## Math line

The Math tab shows the active layer as one line of Unicode, for example:

`I(0.140,0.420) → O(0.800,0.420); A(0.200,0.500), B(0.800,0.500); AB̅; ∠ABC = 90°; AB ∥ CD; AB ⊥ EF; ⊙O(0.500,0.500,r=0.200); P ∈ AB; X = AB ∩ CD; ⊙O ⊂ ⊙P; h ∈ [0.200, 0.800]`

| Mark | Meaning |
|---|---|
| `A(x,y)` | Point |
| `AB̅` | Segment |
| `AB↔` | Line |
| `∠ABC = 90°` | Angle at B |
| `AB ∥ CD` | Parallel |
| `AB ⊥ CD` | Perpendicular |
| `⊙O(r=0.2)` | Circle, radius as a fraction of the short side |
| `P ∈ AB` | Point on a line |
| `X = AB ∩ CD` | Intersection |
| `⊙O ⊂ ⊙P` | One circle inside another |
| `h ∈ [0.2, 0.8]` | A range |
| `I(x,y) → O(x,y)` | Anchor flow |

**Copy** copies the line. **LaTeX** copies and downloads the same sentence with `\overleftrightarrow`, `\overline`, `\angle`, `\parallel`, `\perp`, `\odot`, `\in`, `\cap`, `\subset`, and `\to`.

Type that line in the command line, or edit it in the Math tab. Where it can be read, it creates or moves shapes. That edit is undoable. The Nonsense Layer refuses it.

Under the Math and plain-English tabs, a glossary says what those marks are called in the active field. The marks themselves do not change.

## Fields and your own words

A field is a vocabulary, not a constraint.

| Field | A line | A circle | An intersection | Parallel |
|---|---|---|---|---|
| Physics | vector/trajectory | field/range | interaction | parallel trajectories |
| Music | melodic line | key/tonal center | cadence | parallel motion |
| Psychology | thought path | belief boundary | conflict | same pattern |
| Theology | path of faith | covenant boundary | meeting | walking together |
| Math | line | circle | intersection | parallel |

Plain English, the glossary, the help list, and the prompt use those words, plus names you gave shapes and words you inserted. **Terms** switches back to the canonical words (line, circle, parallel). In Help, on a freeform layer, you can type your own word for each mark. That map stays on this device.

The geometry and the notation stay the source of truth. Relabeling never moves a shape.

## How a layer sits against the Nonsense Layer

Matching still draws gold where directions and crossings agree. The plain-English tab, the Math glossary, and the prompt each say how many parallels and right angles the active layer shares with the Nonsense Layer, in that field's words.

## Prompt export

**Export** builds a markdown prompt in one of three styles: explain my thinking, find a matching idea, or ground this in reality. The body is the notation, the plain English, the bag of words, the math line, the glossary, the alignment with the Nonsense Layer, and what you did, in order. Copy it or download the `.md`. Copy LaTeX from the same panel. The app does not send it.

## Self on the Nonsense Layer

On the Nonsense Layer, **Establish self** marks a self-point and a few anchors (values or beliefs). They can be wrong. Only you can do this. The AI has no write path to that record. The screen says **Self established** with the date and what was fixed. The wording is establish, not prove. The prompt and the frame export include it.

## Who holds the environment

Each layer remembers who made the first move and the last move.

* A blank layer, or a layer where you have neither the first nor the last move, is **AI dominant**. The meter leans to the AI. Suggestions may frame that layer.
* If you make the first move or the last move, **you hold the environment**. The AI only adapts.
* **Show environment model** runs the same comparison every time: a blank layer, AI moves on a blank layer, your first move, your last move. The label says this is a model inside the app, not empirical proof.

If your layer's math line differs from the AI layer, a note says **Differs from**. The AI keeps its own layer. It does not overwrite yours and it does not silently agree.

## The paper

[Download the paper (PDF)](Project-Ariel-Paper.pdf).

## Symbols on the canvas

Gold thread: same direction across layers. Gold ring: equal circle ratio. Gold wedges: the same crossing angle anywhere. Teal and rose discs: input and output. The warm point is patience; hold it to breathe (4 seconds in, 6 out). Hollow letters are variables without a definition. Entropy is the area of the soft discs. The AI never edits a human layer.
