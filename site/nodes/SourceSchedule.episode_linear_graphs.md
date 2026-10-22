---
id: SourceSchedule.episode_linear_graphs
title: "The engine: a prefix code with simple leftovers and height-3 linear paths"
summary: "For any homomorphism `T` into a finite monoid and any way `ρ` of attaching a linear map on a finite vector space to each monoid element, there is a prefix code `E` whose leftovers (sorted by value) have height ≤ 1 and whose linear path languages all have height ≤ 3."
review: draft
authors: [grok-bot]
caveats:
  - "`ρ : M → (V →ₗ[K] V)` is ANY function. The statement does not require ρ to respect multiplication. (In the use from `recognized_height_three`, ρ = `RightRegular.action`, which happens to satisfy `action (d * e) = (action e).comp (action d)`, but the lemma never uses that.)"
  - "The order of quantifiers is `∃ E, …∀ d… ∧ ∀ x y, …`. One prefix code `E` works for every monoid value d and every pair of states x, y at once. E may depend on T and ρ."
  - "This explainer covers only the **statement**. The proof is the bulk of the development (996 of the 1,009 declarations `main` depends on, about 9,000 of their ~9,200 lines: clocks, markers, shift tables, splicing…), and none of it is explained here yet. Signing off here means you understand what is claimed, not why it is true."
  - "`E` is not claimed to be finite or regular."
widgets:
  - type: outline
    title: "What the lemma hands back"
    config:
      steps:
        - { text: "Input: finite non-empty alphabet, T : words →* M (M finite), finite field K, finite K-vector space V, ρ : M → linear maps V → V" }
        - { text: "Output 1: a prefix code E", link: "EpisodeAlgebra.PrefixCode" }
        - { text: "Output 2: for each d ∈ M, {w ∈ remainder E | T w = d} has height ≤ 1", link: "EpisodeAlgebra.remainder" }
        - { text: "Output 3: for all x, y ∈ V, graph E (block ↦ ρ (T block)) x y has height ≤ 3", link: "EpisodeAlgebra.graph", hard: true }
quiz:
  - q: "Must `ρ` be a monoid homomorphism (ρ(d·e) related to ρ(d) and ρ(e))?"
    type: choice
    choices: ["yes", "no, any function M → (V →ₗ[K] V) is allowed"]
    answer: 1
    explain: "The hypotheses are only `(T : FreeMonoid Alphabet →* M) (ρ : M → (V →ₗ[K] V))`. T is a homomorphism, ρ is arbitrary."
  - q: "Can the code `E` depend on the states `x`, `y`?"
    type: choice
    choices: ["yes", "no, E is chosen first and then works for all x and y"]
    answer: 1
    explain: "`∃ E, PrefixCode E ∧ (∀ d, …) ∧ ∀ x y : V, …`. The ∃ E comes before ∀ x y."
  - q: "What height bound is given for the remainder languages `{w ∈ remainder E | T w = d}`?"
    type: number
    answer: 1
    explain: "`HasHeightAtMost … 1`. The path languages get 3."
  - q: "What does each block `w` do to a state in the path language?"
    type: choice
    choices: ["applies `ρ (T w)`, the linear map attached to the block's monoid value", "applies ρ letter by letter", "adds w to the state"]
    answer: 0
    explain: "`graph E (fun w => ρ (T (FreeMonoid.ofList w))) x y`."
  - q: "Which of these is NOT a hypothesis of the lemma?"
    type: choice
    choices: ["`[Nonempty Alphabet]`", "`[Fintype K]`", "`[Fintype V]`", "`ρ` is injective"]
    answer: 3
    explain: "The type-class hypotheses are Finite/Nonempty alphabet, Monoid/Fintype M, Field/Fintype K, AddCommGroup/Module/Fintype V. Nothing about ρ."
---

## Plain English

This is where nearly all the real work lives: 996 of the 1,009 declarations `main` depends on sit underneath this lemma. The statement, piece by piece:

**Given**
- a finite, non-empty alphabet,
- a homomorphism `T` from words to a finite monoid `M` ("the value of a word"),
- a finite field `K` and a finite vector space `V` over it,
- a function `ρ` assigning a linear map `V → V` to each monoid element.

**There is** a set of words `E` (the **episodes**) such that

1. `E` is a [prefix code](#/node/EpisodeAlgebra.PrefixCode), so words cut into episodes unambiguously;
2. for each `d ∈ M`, the leftovers (words in [remainder E](#/node/EpisodeAlgebra.remainder)) with value `d` form a language of height **≤ 1**;
3. for any start and end vectors `x, y ∈ V`, the words that cut into episodes and move `x` to `y`, with each episode `e` acting by `ρ (T e)`, form a language of height **≤ 3** (see [graph](#/node/EpisodeAlgebra.graph)).

[recognized_height_three](#/node/FiniteRecognition.recognized_height_three) uses it with `K = ZMod 2`, `V = M → ZMod 2` and `ρ = action`. Point 3 then bounds "episode words with value d", and point 2 bounds the leftovers.

*Why* such an `E` exists (clocks, markers, splicing) is not yet explained on this site. Those nodes are stubs in the graph, waiting for explainers.
