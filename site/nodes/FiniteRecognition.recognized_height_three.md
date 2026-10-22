---
id: FiniteRecognition.recognized_height_three
title: Monoid-recognized languages have height ≤ 3
summary: "Over a finite non-empty alphabet, for any homomorphism `T` into a finite monoid and any set `F`, the language of words `w` with `T(w) ∈ F` has height at most 3."
review: draft
authors: [grok-bot]
caveats:
  - "This needs `[Nonempty Alphabet]` because `episode_linear_graphs` does. `main` handles the empty alphabet separately."
  - "`F : Set M` is any subset. No decidability or other structure is needed."
widgets:
  - type: outline
    title: "Proof outline (Recognition.lean)"
    config:
      steps:
        - { text: "Apply episode_linear_graphs with V = M → ZMod 2, K = ZMod 2, ρ = action", link: "SourceSchedule.episode_linear_graphs", hard: true, note: "Gives a prefix code E with the two height bounds." }
        - { text: "A d := words in E∗ with T-value d. Height ≤ 3, by graph_fiber", link: "RightRegular.graph_fiber" }
        - { text: "B f := words in remainder E with T-value f. Height ≤ 1, then ≤ 3 by mono", link: "EpisodeAlgebra.remainder" }
        - { text: "Every word splits as (E-blocks) ++ (remainder)", link: "EpisodeAlgebra.factor_remainder" }
        - { text: "So {w | T w ∈ F} = ⋃ over (d, f) with d·f ∈ F of A d · B f", note: "T(uv) = T(u)·T(v)" }
        - { text: "Concatenation and finite union keep height ≤ 3", link: "HasHeightAtMost.iSup" }
quiz:
  - q: "Which hypotheses does this lemma have that `main` does not?"
    type: choice
    choices: ["`Nonempty Alphabet`", "`L.IsRegular`", "`Infinite M`", "none"]
    answer: 0
    explain: "`[Finite Alphabet] [Nonempty Alphabet] [Monoid M] [Fintype M]`. It also has no regularity hypothesis, because recognition by a finite monoid replaces it."
  - q: "In the proof, which language is shown to have height ≤ 1 rather than ≤ 3?"
    type: choice
    choices: ["the words in E∗ with value d", "the remainder words with value f", "the whole language", "E itself"]
    answer: 1
    explain: "`hB : ∀ f, HasHeightAtMost {w | w ∈ remainder E ∧ T w = f} 1` from `episode_linear_graphs`. It's raised to 3 with `mono` before concatenating."
  - q: "Why is the union `⨆ p : I, A p.1.1 * B p.1.2` finite?"
    type: choice
    choices: ["I is a subtype of M × M, and M is finite", "E is finite", "words have bounded length", "F is finite by assumption"]
    answer: 0
    explain: "`I := {p : M × M // p.1 * p.2 ∈ F}`, a subtype of a finite type. That's what `HasHeightAtMost.iSup` needs."
  - q: "A word w is split as `es.flatten ++ r`. Why is `T(w) ∈ F` equivalent to `T(es.flatten) · T(r) ∈ F`?"
    type: choice
    choices: ["because T is a monoid homomorphism, so T(u ++ v) = T(u)·T(v)", "because E is a prefix code", "because F is closed under multiplication"]
    answer: 0
    explain: "`map_mul` for `T`, with concatenation as multiplication in the free monoid."
---

## Plain English

This is `main` with the automaton already turned into a monoid (see [of_regular](#/node/FiniteRecognition.of_regular)).

The idea: cut each word into **episodes** (blocks from a cleverly chosen prefix code `E`) followed by a **leftover** that doesn't start with any episode:

> w = e₁ e₂ … e_k · r

Then

- the part `e₁…e_k` has some monoid value `d`, and the set of such words with value `d` has height ≤ 3;
- the leftover `r` has some value `f`, and the set of leftovers with value `f` has height ≤ 1;
- `w ∈ L` iff `d · f ∈ F`.

So `L` is a finite union, over pairs (d, f) with d·f ∈ F, of "(height ≤ 3) concatenated with (height ≤ 1)", and that has height ≤ 3.

Finding an `E` that makes both bounds true is [episode_linear_graphs](#/node/SourceSchedule.episode_linear_graphs), the hard part.
