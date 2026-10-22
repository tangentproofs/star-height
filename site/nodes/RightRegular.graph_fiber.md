---
id: RightRegular.graph_fiber
title: Tracking the monoid value with vectors
summary: "For the right-multiplication action, the path language from `basis 1` to `basis d` is exactly the set of words in `E∗` whose monoid value is `d`."
review: draft
authors: [grok-bot]
caveats:
  - "No hypothesis on `E` is needed here: it holds for any language `E`, prefix code or not."
  - "The update for a block `w` is `action M (T w)`, which uses the block's own monoid value. Because T is a homomorphism and action composes in reading order, running through blocks e₁…e_k from basis 1 gives basis T(e₁⋯e_k) (`updateWord_product`)."
widgets:
  - type: graph-walk
    title: "Same idea with M = ℤ/3 and T(w) = number of a's mod 3"
    config: { E: "a, ba, bb", k: 3, x: 0, y: 2, n: 5 }
quiz:
  - q: "Which words appear on the right-hand side?"
    type: choice
    choices: ["words that can be cut into E-blocks and have monoid value d", "all words with value d", "words in E with value d", "words in remainder E with value d"]
    answer: 0
    explain: "`{w | w ∈ E∗ ∧ T w = d}`: in the star of E (cuttable into E-blocks) AND with value d."
  - q: "Why start at `basis M 1`?"
    type: choice
    choices: ["1 is the value of the empty word, so before any blocks the running product is 1", "any start vector would work", "basis 1 is the zero vector"]
    answer: 0
    explain: "The vector tracks the running product. Before reading anything, the product is 1."
  - q: "Does this lemma need `PrefixCode E`?"
    type: choice
    choices: ["yes", "no"]
    answer: 1
    explain: "Its only arguments are `T`, `E`, `d`. Every cutting of the same word gives the same end vector (the word's value), so uniqueness doesn't matter."
  - q: "How does `recognized_height_three` use this lemma?"
    type: choice
    choices: ["it rewrites `{w ∈ E∗ | T w = d}` as a graph language, then applies the height-3 bound for graphs", "it proves E is a prefix code", "it bounds the remainder languages"]
    answer: 0
    explain: "`rw [← RightRegular.graph_fiber T E d]; exact hG (basis M 1) (basis M d)`."
---

## Plain English

[episode_linear_graphs](#/node/SourceSchedule.episode_linear_graphs) bounds path languages `graph E G x y` where `G` is linear. But `recognized_height_three` needs to know the **monoid value** of the episode part of a word. This lemma converts one into the other:

> cut w into E-blocks and run `action (T e)` block by block, starting from `basis 1`. You end at `basis d` **exactly when** `T(w) = d`.

So "words in `E∗` with value `d`" *is* a graph language for the linear system `V M`. The widget shows the same mechanism with a counter: the states are ℤ/3, each block adds its number of a's, and the words reaching state 2 from 0 are the E-cuttable words whose a-count is 2 mod 3.
