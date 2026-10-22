---
id: EpisodeAlgebra.remainder
title: "Leftovers: remainder E"
summary: "`remainder E` is the set of words that do not start with any word of `E`."
review: draft
authors: [grok-bot]
caveats:
  - "The file also proves `remainder_eq : remainder E = (E * ⊤)ᶜ`, the complement of 'words that start with an E-word'. So remainder languages are naturally expressed with a complement."
widgets:
  - type: factor
    title: "Cut a word into E-blocks plus a leftover"
    config: { E: "ab, b", word: "babbaa" }
quiz:
  - q: "Over {a, b} with E = {a}, which words are in `remainder E`?"
    type: choice
    choices: ["the empty word and all words starting with b", "all words starting with a", "only the empty word", "no words"]
    answer: 0
    explain: "A word is in the remainder if `a` is not a prefix of it: the empty word, or any word whose first letter is b."
  - q: "If `[] ∈ E`, what is `remainder E`?"
    type: choice
    choices: ["empty", "all words", "{[]}"]
    answer: 0
    explain: "The empty word is a prefix of every word, so every word starts with a word of E, and nothing is left over."
  - q: "If `E` is empty, what is `remainder E`?"
    type: choice
    choices: ["empty", "all words", "{[]}"]
    answer: 1
    explain: "`∀ e ∈ ∅, …` is vacuously true, so every word is a remainder."
---

## Plain English

`r ∈ remainder E` means **no word of `E` is a prefix of `r`**: you can't even start the next block.

When the proof cuts a word into episodes, `remainder E` is the tail where no full episode starts. A key part of [episode_linear_graphs](#/node/SourceSchedule.episode_linear_graphs) is that these tails, sorted by monoid value, are simple (height ≤ 1).
