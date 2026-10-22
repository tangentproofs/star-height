---
id: EpisodeAlgebra.graph
title: "Path languages: graph D G x y"
summary: "`graph D G x y` is the set of words that can be cut into blocks from `D` so that running the blocks' effects from state `x` ends at state `y`."
review: draft
authors: [grok-bot]
caveats:
  - "The `∃ es` means one good cutting is enough. If `D` is not a prefix code, a word may have several cuttings that end at different states, and the word is in `graph D G x y` for each of those end states `y`."
  - "The widget enumerates only words of length ≤ n, and only over non-empty blocks — with `[] ∈ D` there are infinitely many block lists for the same word, so it would not terminate. Prefix codes, which is what the proof uses, exclude `[] ∈ D` anyway."
  - "The widget's states are ℤ/k and `G` adds each block's a-count. That is a legitimate instance of `graph D G x y`, not the one the proof builds."
widgets:
  - type: graph-lab
    title: "Walk a block list from x to y, and list every word that gets there"
    config: { D: "a, ba, bb", k: 3, x: 0, y: 1, n: 5, G: "count a's mod k" }
quiz:
  - q: "Is the empty word in `graph D G x x`?"
    type: choice
    choices: ["always", "only if `[] ∈ D`", "never"]
    answer: 0
    explain: "Take `es = []`: `AllIn D []` holds vacuously, `[].flatten = []`, and `updateWord G x [] = x`. This is `graph_nil`."
  - q: "If `x ≠ y`, can the empty word be in `graph D G x y`?"
    type: choice
    choices: ["yes, if `[] ∈ D` and applying `G []` some number of times sends x to y", "never"]
    answer: 0
    explain: "If `[] ∈ D`, the list `[[]]` flattens to the empty word and moves x to `G [] x`. Prefix codes rule this out. That's one reason the proof insists on `[] ∉ E`."
  - q: "Every word in `graph D G x y` belongs to which language?"
    type: choice
    choices: ["`D∗` (the star of D)", "`D`", "`remainder D`", "all words"]
    answer: 0
    explain: "A word in the graph is a concatenation of finitely many D-words, which is exactly membership in `D∗` (Mathlib's `kstar_def`)."
  - q: "In the widget (D = {a, ba, bb}, update = add the number of a's mod 3), why is `bb` in `graph D G 0 0` but not in `graph D G 0 1`?"
    type: choice
    choices: ["bb is one block with no a's, so the state stays 0", "bb is not in D", "graphs never contain words starting with b"]
    answer: 0
    explain: "`bb ∈ D`, and G bb adds 0, so it goes 0 → 0."
---

## Plain English

Picture a machine with states `S`. Each block `e ∈ D` moves the machine along an arrow from state `s` to state `G e s`. Then

> `w ∈ graph D G x y` ⟺ you can cut `w` into D-blocks `e₁ e₂ … e_k` whose arrows take you from `x` to `y`.

That's why it's called a graph: these words are the **labels of paths from x to y**, where every edge is labeled by a whole block.

The key bound of the proof, [episode_linear_graphs](#/node/SourceSchedule.episode_linear_graphs), says that for the right `D` these path languages have height ≤ 3.
