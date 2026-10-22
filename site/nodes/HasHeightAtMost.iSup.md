---
id: HasHeightAtMost.iSup
title: Finite unions keep the height bound
summary: "If finitely many languages each have height at most `n`, so does their union."
review: draft
authors: [grok-bot]
caveats:
  - "`n` is a section variable (`variable {n k : ℕ}` in `Height.lean`), shown under the statement. It is the same `n` for every `L i`."
  - "The widget's remark that `⨆ n, {aⁿbⁿ}` is not regular is standard background, not something this Lean development states. What the Lean does say is just that `iSup` needs `[Finite ι]`."
widgets:
  - type: union-lab
    title: "Add summands and watch the height stay at the maximum"
    config: { items: ["a*", "~(b~0)", "(a*b)*"], alphabet: "ab", n: 4 }
quiz:
  - q: "What does `⨆ i, L i` mean for languages?"
    type: choice
    choices: ["the union of all the L i", "the intersection of all the L i", "the concatenation L 0 L 1 L 2 …", "the largest L i"]
    answer: 0
    explain: "`⨆` (supremum) in the lattice of sets of words is union. A word is in `⨆ i, L i` iff it is in some `L i` (`Language.mem_iSup`)."
  - q: "Why does the lemma need `[Finite ι]`?"
    type: choice
    choices: ["it doesn't really; it's only for convenience", "an infinite union of height-0 languages can be any language at all, even a non-regular one", "Lean cannot form infinite unions"]
    answer: 1
    explain: "Every single word is a height-0 language. Taking an infinite union of singletons gives *every* language, including non-regular ones that have no expression at all. An expression can only contain finitely many `+`s."
  - q: "If each `L i` has height ≤ 2, the lemma gives the union height ≤ …?"
    type: number
    answer: 2
    explain: "Union costs no height: `height (.union P Q) = max P.height Q.height`, and the lemma folds that over a finite index set."
---

## Plain English

Union is free: `P + Q` has the larger of the two heights. Repeating that finitely many times, a union of finitely many height-≤ n languages is still height ≤ n.

`recognized_height_three` uses this to glue together one piece for each pair of monoid elements (finitely many, because the monoid is finite).
