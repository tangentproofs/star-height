---
id: EpisodeAlgebra.updateWord
title: Run a state through a list of blocks
summary: "`updateWord G x es` starts in state `x` and applies `G e` for each block `e` of `es`, from left to right."
review: draft
authors: [grok-bot]
quiz:
  - q: "What is `updateWord G x [e₁, e₂]`?"
    type: choice
    choices: ["`G e₂ (G e₁ x)`", "`G e₁ (G e₂ x)`", "`G (e₁ ++ e₂) x`", "`x`"]
    answer: 0
    explain: "`foldl (fun z e => G e z) x [e₁, e₂]` = `G e₂ (G e₁ x)`: apply e₁ first, then e₂."
  - q: "What is `updateWord G x []`?"
    type: choice
    choices: ["`x`", "`G [] x`", "undefined"]
    answer: 0
    explain: "Folding over the empty list returns the start value (`updateWord_nil`)."
  - q: "Does `updateWord` look at single letters or at whole blocks?"
    type: choice
    choices: ["single letters", "whole blocks: G receives each block `e` as a word"]
    answer: 1
    explain: "`G : List Alphabet → S → S` takes a whole word. `G [a, b]` need not equal `G [b] ∘ G [a]`."
---

## Plain English

Think of `S` as a set of states and `G e` as "what block `e` does to a state". `updateWord G x es` runs the machine: start at `x`, apply the first block's effect, then the second's, and so on.

`G` acts on whole blocks, not letters. In the proof, a block's effect is the linear map `ρ (T e)`, computed from the block's monoid value.
