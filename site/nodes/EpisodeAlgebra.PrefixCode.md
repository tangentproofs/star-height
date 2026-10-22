---
id: EpisodeAlgebra.PrefixCode
title: Prefix codes
summary: "`PrefixCode E` says the empty word is not in `E`, and no word of `E` is a prefix of a different word of `E`."
review: draft
authors: [grok-bot]
caveats:
  - "`e <+: f` is Lean's `List.IsPrefix`: `f` starts with `e`, i.e. `∃ t, e ++ t = f`. Every word is a prefix of itself, which is why the clause concludes `e = f` instead of being false."
  - "`E` may be infinite."
widgets:
  - type: factor
    title: "Is it a prefix code? How does a word split?"
    config: { E: "a, ba, bb", word: "abbaab" }
quiz:
  - q: "Is `{a, ab}` a prefix code?"
    type: choice
    choices: ["yes", "no"]
    answer: 1
    explain: "`a` is a prefix of `ab`, and they are different words."
  - q: "Is `{b, ab, aab, aaab, …}` (all words aⁿb) a prefix code?"
    type: choice
    choices: ["yes", "no"]
    answer: 0
    explain: "Each word ends at its first `b`, so none can be a proper prefix of another. Prefix codes can be infinite."
  - q: "Why is `{[]}`, the set containing only the empty word, not a prefix code?"
    type: choice
    choices: ["the definition explicitly requires `[] ∉ E`", "it has only one element", "the empty word is a prefix of itself"]
    answer: 0
    explain: "The first conjunct `[] ∉ E`. (The second conjunct alone would hold for `{[]}`.)"
  - q: "If `E` is a prefix code and a word can be cut into E-blocks, how many ways are there to cut it?"
    type: choice
    choices: ["exactly one", "possibly several", "none"]
    answer: 0
    explain: "Reading from the left, at most one block of E can fit at each position. This is the lemma `flatten_injective` in `Episodes.lean` (used by `AffineRecovery.recovery`)."
---

## Plain English

A **prefix code** is a set of words `E` where you can always tell where a block ends. Reading left to right, as soon as you've read a word of `E`, no longer word of `E` could still be in progress.

Formally, `PrefixCode E` means:

1. `[] ∉ E`: no empty block, so cutting always makes progress, and
2. if `e` and `f` are both in `E` and `f` starts with `e`, then `e = f`.

Example: `{a, ba, bb}` is a prefix code, so `abbaab` cuts in exactly one way: `a · bb · a · a`, with the final `b` left over because no block fits there. Try it in the widget.

The proof uses prefix codes to cut words into **episodes**.
