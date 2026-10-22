---
id: RightRegular.basis
title: The standard basis of V M
summary: "`basis M m` is the vector that is 1 at `m` and 0 everywhere else, one basis vector per monoid element."
review: draft
authors: [grok-bot]
caveats:
  - "`noncomputable` is Lean bookkeeping (Mathlib's `Basis` API is classical). It doesn't change what the vectors are."
widgets:
  - type: right-regular
    title: "Basis vectors and the action"
    config: { monoid: "ℤ/3 = {1, g, g²}" }
quiz:
  - q: "What is `basis M m` evaluated at `m'`?"
    type: choice
    choices: ["1 if m' = m, else 0", "1 for every m'", "m · m'"]
    answer: 0
    explain: "`Pi.basisFun` is the standard basis of a function space: indicator functions of single points."
  - q: "Can two different monoid elements have the same basis vector?"
    type: choice
    choices: ["no, `basis M` is injective", "yes, if they act the same way"]
    answer: 0
    explain: "`basis_injective` in `Actions.lean`. Different elements give indicators of different points. That's why the vector `basis M d` 'remembers' the monoid element d."
  - q: "How many basis vectors are there?"
    type: choice
    choices: ["one per element of M", "2 to the power |M|", "one per letter of the alphabet"]
    answer: 0
    explain: "A basis indexed by M: `Module.Basis M (ZMod 2) (V M)`."
---

## Plain English

For each monoid element `m`, `basis M m` is the vector with a single 1, in slot `m`.

In the proof, the vector `basis M d` stands for "the monoid element d". Since different elements give different vectors, nothing is lost.
