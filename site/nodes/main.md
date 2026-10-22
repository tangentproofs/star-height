---
id: main
title: "Main theorem: every regular language has generalized star height ≤ 3"
summary: "For any finite alphabet and any regular language `L` over it, some generalized regular expression of height at most 3 describes exactly `L`."
review: draft
authors: [grok-bot]
caveats:
  - "`L.IsRegular` is Mathlib's definition: some DFA with a finite state type (`σ : Type`, `Fintype σ`) accepts exactly `L`. Nothing in this project redefines it."
  - "This is an upper bound only. The Lean says nothing about whether 3 is ever needed. Outside context, not in the Lean: whether *any* regular language has generalized star height ≥ 2 is a famous open question (the generalized star-height problem), and this theorem does not settle it."
  - "The proof is classical (it uses `Classical.choice`). The theorem asserts that an expression exists but provides no algorithm for finding it. The axiom check (`Check.lean`) shows only `propext`, `Classical.choice` and `Quot.sound`."
  - "The history in the plain-English text (Eggan, Dejean–Schützenberger, the generalized star-height problem) is background from the literature. It is not stated in the Lean and should be checked by a human reviewer."
  - "The empty alphabet is allowed: `Finite Alphabet` holds for an empty type, and the proof treats that case separately."
widgets:
  - type: decompose
    title: "The last step, made concrete: pick a DFA and a word"
    config: { dfa: "even number of a's", E: "aa, ab, b", word: "abba" }
quiz:
  - q: "Which assumption about the alphabet does `main` make?"
    type: choice
    choices: ["it is finite and non-empty", "it is finite (possibly empty)", "it has exactly two letters", "none"]
    answer: 1
    explain: "Only `[Finite Alphabet]`. An empty alphabet is allowed. The proof's first case (`isEmpty_or_nonempty`) handles it with `HasHeightAtMost.finite`."
  - q: "What does `main` conclude about `L`?"
    type: choice
    choices: ["every expression for L has height ≤ 3", "some expression for L has height ≤ 3", "L has height exactly 3", "L is regular"]
    answer: 1
    explain: "`HasHeightAtMost L 3` unfolds to `∃ P : Expression Alphabet, P.language = L ∧ P.height ≤ 3`."
  - q: "What does `hL : L.IsRegular` mean, in Mathlib's definition?"
    type: choice
    choices: ["L is described by an ordinary regular expression of height ≤ 3", "some deterministic finite automaton with finitely many states accepts exactly L", "L is finite", "L is closed under complement"]
    answer: 1
    explain: "Mathlib: `∃ σ : Type, ∃ _ : Fintype σ, ∃ M : DFA T σ, M.accepts = L`. (Ordinary regular expressions describe the same class, by Kleene's theorem, but that is not how Mathlib defines it.)"
  - q: "True or false: `main` shows that some regular language needs height 3."
    type: choice
    choices: ["True", "False"]
    answer: 1
    explain: "False. It is an upper bound only. No lower bound is stated or proved."
  - q: "The proof splits into two cases. What is the case split on?"
    type: choice
    choices: ["whether L is finite", "whether the alphabet is empty", "whether L contains the empty word", "whether the DFA has one state"]
    answer: 1
    explain: "`rcases isEmpty_or_nonempty Alphabet`. The non-empty case needs `[Nonempty Alphabet]` to call `recognized_height_three`."
---

## Plain English

**Theorem.** Take any finite alphabet and any regular language `L` over it. Then `L` can be written as a generalized regular expression with stars nested **at most three deep**.

Reading the Lean line by line:

- `{Alphabet : Type u} [Finite Alphabet]`: the letters form a finite set (possibly empty) of any kind.
- `(L : Language Alphabet)`: `L` is a set of words over that alphabet.
- `(hL : L.IsRegular)`: some finite automaton (a DFA) accepts exactly the words of `L`.
- `HasHeightAtMost L 3`: there is an [Expression](#/node/Expression) `P` with `P.language = L` and `P.height ≤ 3`.

Why is this interesting? Without complement, regular languages can need arbitrarily deep star nesting (Eggan's star-height question, answered by Dejean and Schützenberger). With complement allowed, how much nesting is ever needed is the long-standing *generalized star-height problem*. This theorem gives a uniform answer from above: never more than three.

The proof in `Main.lean` itself is short (see "The proof, step by step" below). The difficulty sits in [recognized_height_three](#/node/FiniteRecognition.recognized_height_three) and, beneath it, [episode_linear_graphs](#/node/SourceSchedule.episode_linear_graphs).
