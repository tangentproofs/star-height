# star-height

Lean 4 formalization of the **generalized star-height bound**:

> **Theorem 1.1.** For every finite alphabet Σ and every regular language L ⊆ Σ*, h_Σ(L) ≤ 3.

Generalized regular expressions use 0, 1, letters, union, concatenation, complement (in Σ*), and
Kleene star. Height counts only star nesting: ht(¬P) = ht(P), ht(P*) = 1 + ht(P).

## Credit

The result and the original Lean proof are by **OpenAI** (an internal OpenAI model), published in the
[openai/math](https://github.com/openai/math) collection, family 134:

- *Generalized Star Height at Most Three*, OpenAI, 25 Sep 2026:
  [article.pdf](https://github.com/openai/math/blob/main/preprints/Generalized-Star-Height-at-Most-Three-September-25-2026/article.pdf)
- Companions: *Generalized Star Height at Most Four* and *Finite Monoid Computations and a Uniform
  Generalized Star-Height Bound* (bound 13), same date.
- Scope notes: [lean/docs/134.md](https://github.com/openai/math/blob/main/lean/docs/134.md)

The files under `OAI/Computability/StarHeight/` and `ComparatorChallenges/` are vendored from
openai/math at `1581d4cbdd69a0faf34b2089614fe2a814316a6a` under the Apache License 2.0
(`LICENSE`). `NOTICE` lists what changed.

## Statement

`ComparatorChallenges/GeneralizedStarHeight.lean` is upstream's *challenge* file. It states the
theorem with `sorry` on purpose. The proof is `OAI.GeneralizedStarHeight.main` in
`OAI/Computability/StarHeight/Main.lean`:

```lean
theorem main {Alphabet : Type u} [Finite Alphabet] (L : Language Alphabet) (hL : L.IsRegular) :
    HasHeightAtMost L 3
```

`HasHeightAtMost L n := ∃ P : Expression Alphabet, P.language = L ∧ P.height ≤ n`, using Mathlib's
`Language` (`+` = union, `*` = concatenation, `∗` = Kleene star, `ᶜ` = complement in `List Alphabet`)
and Mathlib's `Language.IsRegular` (accepted by a finite DFA).

## Build

Lean `v4.35.0-rc1` and Mathlib `09a9e06` (upstream used v4.34.1 and Mathlib `d13f23b`).

```sh
lake exe cache get
lake build
lake env lean Check.lean   # #print axioms: propext, Classical.choice, Quot.sound
```

The development is about 12k lines in 37 files. It imports only Mathlib.
