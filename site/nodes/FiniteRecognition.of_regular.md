---
id: FiniteRecognition.of_regular
title: Regular languages are recognized by finite monoids
summary: "If `L` is regular, there is a finite monoid `M`, a multiplicative map `T` from words to `M`, and a set `F ⊆ M` such that a word is in `L` exactly when `T` sends it into `F`."
review: draft
authors: [grok-bot]
caveats:
  - "The statement itself does not assume the alphabet is finite. Mathlib's `IsRegular` already supplies a finite DFA."
  - "The proof takes M = (Function.End Q)ᵐᵒᵖ, the transition maps of the DFA in the *opposite* order. The ᵐᵒᵖ makes 'read u then v' line up with `T u * T v`. That is proof detail, not part of the statement."
  - "`M : Type` (universe 0) is fine because Mathlib's DFA state types live in `Type`."
  - "The widget's editable DFA is faithful to the Lean in a way worth noticing: `M` really is *all* |Q|^|Q| maps Q → Q (as `(Function.End Q)ᵐᵒᵖ`), and the table lists only the ones of the form `T w`. The unreachable elements are harmless — the lemma only needs `M` finite."
widgets:
  - type: dfa-lab
    title: "Edit a DFA, run a word through it, and watch the monoid build up"
    config: { dfa: "contains ab", word: "bab" }
quiz:
  - q: "What is special about `T : FreeMonoid Alphabet →* M`?"
    type: choice
    choices: ["it is injective", "it is a monoid homomorphism: T(uv) = T(u)·T(v) and T([]) = 1", "it is surjective", "it is the identity"]
    answer: 1
    explain: "`→*` is Mathlib's notation for monoid homomorphisms. In the free monoid, multiplication is concatenation of words."
  - q: "Given `M`, `T` and `F`, how do you decide whether `w ∈ L`?"
    type: choice
    choices: ["check whether T(w) ∈ F", "check whether w ∈ F", "check whether T(w) = 1", "check whether F is non-empty"]
    answer: 0
    explain: "`∀ w, w ∈ L ↔ T (FreeMonoid.ofList w) ∈ F`. (`FreeMonoid.ofList` just converts the list `w` into a free-monoid element.)"
  - q: "The proof takes `M = (Function.End Q)ᵐᵒᵖ`, every map Q → Q. For the widget's 3-state DFA 'contains ab', how many elements does that `M` have?"
    type: number
    answer: 27
    explain: "3³ = 27 maps from 3 states to 3 states, which is what the widget reports as |Q|^|Q|. The lemma only needs `M` to be finite, so taking all of them is fine."
  - q: "For that same DFA, how many of those 27 are of the form `T w` for an actual word `w`? (Drag the widget's length slider.)"
    type: number
    answer: 5
    explain: "The words `ε`, `a`, `b`, `ab`, `ba` already produce all 5 distinct maps that occur, and every longer word acts like one of them. The other 22 elements of `M` are never hit; the statement says nothing about `T` being surjective."
  - q: "Does the lemma say `M` is a group?"
    type: choice
    choices: ["yes", "no, only a finite monoid"]
    answer: 1
    explain: "Only `Monoid M` and `Fintype M`. Elements need not have inverses: in the widget, `m(ab)` sends every state to the accepting sink, and nothing undoes that."
---

## Plain English

A DFA reads a word one letter at a time. Instead of tracking one run, record **what the word does to every state at once**: a map "if you start in state q, you end in state q′". There are only finitely many such maps, and reading `u` then `v` composes their maps. These maps form a finite **monoid** `M`, and `T(w)` is the map of `w`.

Whether `w` is accepted depends only on `T(w)`: apply the map to the start state and check whether it lands in an accepting state. Let `F` be the set of maps that do. Then

> `w ∈ L` ⟺ `T(w) ∈ F`.

This changes the question from "automata" to "finite monoids". The rest of the proof works with the monoid.
