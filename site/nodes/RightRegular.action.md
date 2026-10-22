---
id: RightRegular.action
title: "Right multiplication as a linear map"
summary: "`action M d` is the linear map on `V M` that sends each basis vector `basis m` to `basis (m * d)`."
review: draft
authors: [grok-bot]
caveats:
  - "Defined with `Basis.constr`: a linear map is determined by where it sends basis vectors. On a general vector v, coordinate m′ of `action d v` is the mod-2 sum of v(m) over all m with m·d = m′."
  - "The order matters: `action_mul : action (d * e) = (action e).comp (action d)`, so `d` is applied first, then `e`. That matches reading a word left to right."
widgets:
  - type: vector-lab
    title: "The matrix of action M d, and what it does to a vector"
    config: { monoid: "{1, a, b} with xa = a, xb = b", show: ["action"] }
quiz:
  - q: "What is `action M d (basis M 1)`?"
    type: choice
    choices: ["`basis M d`", "`basis M 1`", "the zero vector"]
    answer: 0
    explain: "basis 1 ↦ basis (1 · d) = basis d. Together with injectivity of `basis`, this gives `value_recovery`: `action d (basis 1) = basis e ↔ d = e`."
  - q: "`action M (d * e)` equals which composite?"
    type: choice
    choices: ["first `action d`, then `action e`", "first `action e`, then `action d`", "`action d + action e`"]
    answer: 0
    explain: "basis m ↦ basis (m d) ↦ basis (m d e). In Lean: `(action M e).comp (action M d)`."
  - q: "In the monoid {1, a, b} with x·a = a and x·b = b (try it in the widget), is `action a` injective?"
    type: choice
    choices: ["yes", "no"]
    answer: 1
    explain: "Every basis vector goes to `basis a`. Then basis 1 + basis b ↦ basis a + basis a = 0, so a nonzero vector goes to 0. The action is linear but need not be invertible."
---

## Plain English

`action M d` is "multiply on the right by d", turned into a linear map. On basis vectors it's exactly that: `basis m ↦ basis (m·d)`. On any other vector it extends linearly, adding mod 2.

Starting from `basis 1` and applying the actions of `d₁, d₂, …, d_k` in order lands on `basis (d₁·d₂·…·d_k)`. So the vector **tracks the running product**, and the end vector tells you exactly what the product was. That is the content of [graph_fiber](#/node/RightRegular.graph_fiber).
