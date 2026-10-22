---
id: Expression.height
title: Star height of an expression
summary: "`P.height` is the deepest nesting of stars in `P`; complement, union and concatenation are free."
review: draft
authors: [grok-bot]
caveats:
  - "Height is a property of the *expression*, not of the language. The height of a language (the least height of any expression for it) is never defined as a number in this development. It only appears through `HasHeightAtMost`."
widgets:
  - type: height-lab
    title: "Wrap a subterm: complement is free, star costs one"
    config: { expr: "ab", alphabet: "ab", n: 3 }
  - type: regex
    title: "See the height of every subterm"
    config: { expr: "((ab)*a)*", alphabet: "ab", n: 4, presets: ["a*b*", "(a*)*", "((ab)*a)*", "~(a*)", "~(~(a*)*)", "(a+b)*", "~0"] }
quiz:
  - q: "What is the height of `a*b*` (the concatenation of `a*` and `b*`)?"
    type: number
    answer: 1
    explain: "Concatenation takes the **max** of the two heights, not the sum: max(1, 1) = 1. Height measures how deep stars nest, not how many there are."
  - q: "What is the height of `.star (.compl (.star (.letter a)))`, written `(~(a*))*`?"
    type: number
    answer: 2
    explain: "From the inside out: `a` has height 0, `a*` has 1, `~(a*)` still has 1 because complement is free, and the outer star makes it 1 + 1 = 2."
  - q: "Which constructor raises the height?"
    type: choice
    choices: ["`compl`", "`concat`", "`star`", "`union`"]
    answer: 2
    explain: "Only `.star P => 1 + P.height` adds anything. `compl` keeps the height, and `union`/`concat` take the max."
  - q: "True or false: if two expressions describe the same language, they have the same height."
    type: choice
    choices: ["True", "False"]
    answer: 1
    explain: "False. `(a+b)*` has height 1 and `~0` has height 0, but over {a, b} they describe the same language. That's why the theorem is stated as ‘*there exists* an expression with height ≤ 3’."
---

## Plain English

The **height** of an expression measures how deeply stars are nested inside each other:

- `0`, `1` and single letters have height **0**.
- `P + Q` and `PQ` have the **larger** of the two heights.
- `~P` has the **same** height as `P`. Complement is free, and that's the "generalized" in *generalized star height*.
- `P*` has height **one more** than `P`.

So `a*b*` has height 1 (two stars side by side, neither inside the other), while `(a*b)*` has height 2.

Why care? Stars are the only way to describe unboundedly long patterns *directly*. Complement gets some of that for free: `~0` already means "all words". The theorem asks how much star-nesting you really need when complement is allowed. The answer it proves is never more than 3.
