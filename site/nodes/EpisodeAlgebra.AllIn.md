---
id: EpisodeAlgebra.AllIn
title: "All blocks belong to D"
summary: "`AllIn D es` says every word in the list `es` belongs to the language `D`."
review: draft
authors: [grok-bot]
widgets:
  - type: blocks
    title: "Assemble a block list and check AllIn D es"
    config: { D: "a, ba, bb", es: ["a", "bb"], k: 3 }
quiz:
  - q: "Is `AllIn D []` (the empty list of blocks) true?"
    type: choice
    choices: ["always true", "true only if `[] ∈ D`", "always false"]
    answer: 0
    explain: "`∀ e ∈ [], e ∈ D` holds vacuously. The empty *list of blocks* is different from the empty *word*. This is why `[] ∈ graph D G x x` always holds."
  - q: "With D = {a, ba}, is `AllIn D [a, ba, a]` true?"
    type: choice
    choices: ["yes", "no"]
    answer: 0
    explain: "Each of the three blocks `a`, `ba`, `a` is in D."
  - q: "With D = {a, ba}, is `AllIn D [ab, a]` true?"
    type: choice
    choices: ["yes", "no"]
    answer: 1
    explain: "`ab ∉ D`. It doesn't matter that `ab` could be re-cut differently: AllIn checks the given list as it is."
---

## Plain English

`es` is a **list of words** (a list of blocks). `AllIn D es` checks that every block is a member of `D`.

It's a helper: "`w` can be cut into D-blocks" becomes "there is a list `es` with `AllIn D es` and `es.flatten = w`", where `flatten` glues the blocks back together.
