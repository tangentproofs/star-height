---
id: EpisodeAlgebra.factor_remainder
title: Every word is blocks followed by a leftover
summary: "If the empty word is not in `E`, every word `w` can be written as a sequence of `E`-blocks followed by a word in `remainder E`."
review: draft
authors: [grok-bot]
caveats:
  - "Only `[] ∉ E` is assumed, not the full prefix-code property. Without a prefix code the cutting may not be unique. The lemma only claims one exists."
widgets:
  - type: factor
    title: "Factor a word"
    config: { E: "a, ba, bb", word: "babbab" }
quiz:
  - q: "Which hypothesis does the lemma need about `E`?"
    type: choice
    choices: ["`[] ∉ E`", "`PrefixCode E`", "`E` is finite", "`E` is regular"]
    answer: 0
    explain: "`(hnil : [] ∉ E)`. `recognized_height_three` supplies it as `hE.1`, the first half of `PrefixCode E`."
  - q: "Does the lemma claim the factorization is unique?"
    type: choice
    choices: ["yes", "no"]
    answer: 1
    explain: "It's an `∃ es r, …` with no uniqueness clause."
  - q: "Why is `[] ∉ E` needed?"
    type: choice
    choices: ["otherwise `remainder E` is empty, so no word could end in a remainder", "otherwise E would be infinite", "it isn't really needed"]
    answer: 0
    explain: "If `[] ∈ E`, every word starts with an E-word, so `remainder E = ∅` and the conclusion fails for every w. In the proof, `[] ∉ E` ensures each peeled block is non-empty, so the induction on length terminates."
  - q: "If no word of E is a prefix of w, what factorization does the proof produce?"
    type: choice
    choices: ["`es = []`, `r = w`", "`es = [w]`, `r = []`", "none exists"]
    answer: 0
    explain: "First case of the proof: `w ∈ remainder E`, so take no blocks and the whole word as the leftover."
---

## Plain English

Peel blocks off the front: if some word of `E` starts `w`, cut it off and repeat on what's left. Because blocks are never empty, the word gets shorter each time, so this stops. When no block fits, what's left is in `remainder E`. So

> w = e₁ ++ e₂ ++ … ++ e_k ++ r, with every eᵢ ∈ E and r ∈ remainder E.

In Lean: `w = es.flatten ++ r` with `AllIn E es`.
