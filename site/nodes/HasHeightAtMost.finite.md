---
id: HasHeightAtMost.finite
title: Finite languages have every height bound
summary: "If a language has only finitely many words, then `HasHeightAtMost L n` holds for every `n`, even `n = 0`."
review: draft
authors: [grok-bot]
widgets:
  - type: regex
    title: "A finite language as a union of words (height 0)"
    config: { expr: "1 + ab + ba + bab", alphabet: "ab", n: 4 }
quiz:
  - q: "For which `n` does this lemma give `HasHeightAtMost L n` (for a finite `L`)?"
    type: choice
    choices: ["only n ≥ 1", "only n = 0", "every natural number n"]
    answer: 2
    explain: "`n` is a free argument. The expression built has height 0, which is ≤ every n."
  - q: "The hypothesis `(L : Set (List Alphabet)).Finite` says what?"
    type: choice
    choices: ["the alphabet is finite", "L contains finitely many words", "every word in L is short", "L is regular"]
    answer: 1
    explain: "It's finiteness of `L` viewed as a set of words. Finiteness of the alphabet is neither assumed nor needed here."
  - q: "Where does `main` use this lemma?"
    type: choice
    choices: ["when the alphabet is empty", "when L is empty", "for the remainder languages", "it does not"]
    answer: 0
    explain: "With no letters, the only word is `[]`, so `L ⊆ {[]}` is finite. `main` calls `HasHeightAtMost.finite L _ 3`."
---

## Plain English

A finite language is just a list of words. Write each word as letters glued together with `concat` (the empty word is `1`), then join them all with `+`. No stars are needed, so the height is 0, and 0 ≤ n for any n.

That's how the Lean proof goes: `singleton` handles one word by induction, and `iSup` takes the finite union.
