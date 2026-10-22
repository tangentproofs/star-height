---
id: FiniteRecognition.recognized_height_three
title: Monoid-recognized languages have height ≤ 3
summary: "Over a finite non-empty alphabet, for any homomorphism `T` into a finite monoid and any set `F`, the language of words `w` with `T(w) ∈ F` has height at most 3."
review: draft
authors: [grok-bot]
caveats:
  - "This needs `[Nonempty Alphabet]` because `episode_linear_graphs` does. `main` handles the empty alphabet separately."
  - "`F : Set M` is any subset. No decidability or other structure is needed."
  - "The widget computes the **set identity** `{w | T w ∈ F} = ⨆ p : I, A p.1 * B p.2` for a hand-picked prefix code, which needs only `[] ∉ E`. The **height** bounds (≤ 3 for `A d`, ≤ 1 for `B f`) hold for the specific `E` that `episode_linear_graphs` constructs, and that `E` is not the one in the widget."
  - "The widget's index set ranges over the elements actually realized as `T w`; Lean's `I` ranges over all of `M × M`. The extra pairs contribute empty languages."
widgets:
  - type: decompose
    title: "The set identity, computed end to end on a concrete DFA"
    config: { dfa: "contains ab", E: "aa, ab, b", word: "abba" }
  - type: walkthrough
    title: "Proof outline (Recognition.lean, lines 55-97)"
    config:
      steps:
        - text: "Feed the engine lemma the right vector space"
          lean: "obtain ⟨E,hE,hB,hG⟩ := SourceSchedule.episode_linear_graphs
  (Alphabet := Alphabet) (M := M) (V := RightRegular.V M) (K := ZMod 2)
  T (RightRegular.action M)"
          note: "K = ZMod 2, V = M → ZMod 2, and ρ = right multiplication. That choice is the whole bridge from monoids to linear algebra."
          uses: [SourceSchedule.episode_linear_graphs, RightRegular.V, RightRegular.action]
          hard: true
        - text: "Name the two families of pieces"
          lean: "let A : M → Language Alphabet := fun d => {w | w∈E∗ ∧ T (FreeMonoid.ofList w)=d}
let B : M → Language Alphabet := fun f => {w | w∈remainder E ∧ T (FreeMonoid.ofList w)=f}"
          note: "A d: words made of episodes, with value d. B f: leftovers, with value f."
          uses: [EpisodeAlgebra.remainder]
        - text: "A d has height ≤ 3, because it IS a path language"
          lean: "rw [←RightRegular.graph_fiber T E d]
exact hG (RightRegular.basis M 1) (RightRegular.basis M d)"
          note: "graph_fiber turns 'in E∗ with value d' into 'moves basis 1 to basis d', which is what hG bounds."
          uses: [RightRegular.graph_fiber, RightRegular.basis]
        - text: "B f has height ≤ 1 from the engine; mono raises it to 3"
          lean: "(hB p.1.2).mono (by decide)"
          note: "1 ≤ 3, so the same witness expression works. HasHeightAtMost.mono."
        - text: "Index the union by the pairs whose product is accepted"
          lean: "let I := {p : M × M // p.1*p.2∈F}
have hU : HasHeightAtMost (⨆ p : I, A p.1.1 * B p.1.2) 3 :=
  HasHeightAtMost.iSup _ (fun p => (hA p.1.1).concat ((hB p.1.2).mono (by decide)))"
          note: "I is a subtype of M × M, so it is finite — which is exactly what iSup needs."
          uses: [HasHeightAtMost.iSup]
        - text: "⊆: factor w, and its two values multiply to T w"
          lean: "obtain ⟨es,r,hes,hr,hwr⟩ := factor_remainder hE.1 w
let d := T (FreeMonoid.ofList es.flatten)
let f := T (FreeMonoid.ofList r)
have hdf : d*f∈F := by rw [←map_mul]; rw [←hwr]; exact hw"
          note: "Only hE.1 ([] ∉ E) is used here, not the full prefix-code property."
          uses: [EpisodeAlgebra.factor_remainder, EpisodeAlgebra.PrefixCode]
        - text: "⊇: a word in any piece has value d·f, which is in F by construction"
          lean: "obtain ⟨a,ha,b,hb,rfl⟩ := Language.mem_mul.mp hp
rw [map_mul,ha.2,hb.2]
exact p.2"
        - text: "Rewrite the language as that union and hand back hU"
          lean: "exact heq.symm ▸ hU"
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
