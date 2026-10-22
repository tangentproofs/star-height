---
id: HasHeightAtMost
title: "A language has height at most n"
summary: "`HasHeightAtMost L n` says there is at least one expression whose language is exactly `L` and whose height is at most `n`."
review: draft
authors: [grok-bot]
caveats:
  - "The usual notation is h(L) ≤ n, where h(L) is the minimum height over all expressions for L. `HasHeightAtMost L n` is equivalent to h(L) ≤ n, but Lean never defines h(L). It doesn't need to."
  - "The claim that (ab)* has generalized star height 0 (shown in the widget) is standard. The widget only *checks* the two expressions agree on short words. It is not a proof, and it is not part of this Lean development."
widgets:
  - type: compare
    title: "A height-1 expression and a height-0 expression for the same language"
    config: { left: "(ab)*", right: "~(b~0 + ~0a + ~0(aa+bb)~0)", alphabet: "ab", n: 10 }
quiz:
  - q: "`HasHeightAtMost L 3` holds. Which statement follows?"
    type: choice
    choices: ["every expression for L has height ≤ 3", "some expression for L has height ≤ 3", "some expression for L has height exactly 3", "L needs height 3, no less"]
    answer: 1
    explain: "It's an existential: `∃ P, P.language = L ∧ P.height ≤ n`. It says nothing about other expressions for L, and nothing about a lower bound."
  - q: "If `HasHeightAtMost L 2` holds, does `HasHeightAtMost L 5` hold?"
    type: choice
    choices: ["yes, always", "no, never", "only if L is finite"]
    answer: 0
    explain: "The same witness P works, since `P.height ≤ 2 ≤ 5`. This is the lemma `HasHeightAtMost.mono` in `Height.lean`."
  - q: "In `P.language = L`, what kind of equality is it?"
    type: choice
    choices: ["the two sets of words are equal", "L contains P.language", "they agree on words up to some length", "they have the same number of words"]
    answer: 0
    explain: "Equality of languages, meaning equality of sets of words: exactly the same words, of every length. A finite check like the widget's is only evidence."
  - q: "`HasHeightAtMost (0 : Language Alphabet) n` (the empty language): for which n is it true?"
    type: choice
    choices: ["only n = 0", "every n", "no n"]
    answer: 1
    explain: "The witness `Expression.zero` has height 0 ≤ n. This is `HasHeightAtMost.zero n`."
---

## Plain English

`HasHeightAtMost L n` means: **you can write `L` down with at most `n` levels of nested stars.** Formally, there is *some* `Expression` `P` such that

1. `P.language = L`: P describes exactly the words of L, no more and no fewer, and
2. `P.height ≤ n`.

It's a statement about the **language**, so the cleverest expression wins. The widget shows the classic example. `(ab)*` uses a star, but over the alphabet {a, b} the same language is "words that don't start with `b`, don't end with `a`, and never repeat a letter twice in a row". That can be said with complements alone, at height 0.

The main theorem says `HasHeightAtMost L 3` for every regular `L`.
