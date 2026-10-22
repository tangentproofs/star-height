---
id: RightRegular.V
title: "The vector space V M = M → ZMod 2"
summary: "`V M` is the set of functions from the monoid `M` to the two-element field `ZMod 2`: a 0/1 label on each element of `M`, added coordinatewise mod 2."
review: draft
authors: [grok-bot]
caveats:
  - "`abbrev` means Lean unfolds `V M` to `M → ZMod 2` automatically. The vector-space structure is Mathlib's pointwise one (`Pi.Function.module`)."
quiz:
  - q: "If `M` has 5 elements, how many vectors are in `V M`?"
    type: number
    answer: 32
    explain: "A vector picks 0 or 1 for each of the 5 elements: 2⁵ = 32."
  - q: "What is `(v + w) m` for `v w : V M`?"
    type: choice
    choices: ["`v m + w m` computed mod 2 (so 1 + 1 = 0)", "`max (v m) (w m)`", "`v m * w m`"]
    answer: 0
    explain: "Pointwise addition in `ZMod 2`, where 1 + 1 = 0. It's an XOR."
  - q: "Why does the proof want `V M` to be finite?"
    type: choice
    choices: ["`episode_linear_graphs` requires `[Fintype V]` (and `[Fintype K]`)", "Lean can't handle infinite types", "it doesn't matter"]
    answer: 0
    explain: "The engine lemma works with linear maps on a *finite* vector space over a *finite* field. With M finite, `M → ZMod 2` is finite."
---

## Plain English

`V M` turns the monoid into a vector space: one coordinate per element of `M`, each coordinate 0 or 1, addition mod 2.

It's the standard "regular representation" trick. Monoid elements become basis vectors (see [basis](#/node/RightRegular.basis)), and multiplying by a monoid element becomes a linear map (see [action](#/node/RightRegular.action)). That lets the monoid problem be fed into a lemma about linear maps.
