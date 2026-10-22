---
id: Expression
title: Generalized regular expressions
summary: "An `Expression Alphabet` is a formula built from seven pieces: nothing (`zero`), the empty word (`one`), single letters, union, concatenation, complement, and star."
review: draft
authors: [grok-bot]
caveats:
  - "This is pure syntax. What a formula *means* (its set of words) is given separately by `Expression.language`, and its star depth by `Expression.height`."
  - "The type puts no condition on `Alphabet` (it can be infinite or empty). The finiteness assumption first appears in `main`."
widgets:
  - type: build
    title: "Build an Expression by pressing constructors"
    config: { alphabet: "ab", n: 4 }
  - type: regex
    title: "Or type one, and read it back as a Lean term"
    config: { expr: "(a+b)*~(ab)", alphabet: "ab", n: 3, presets: ["0", "1", "a", "a+b", "ab", "~a", "a*", "(a+b)*~(ab)"] }
quiz:
  - q: "How many ways are there to build an `Expression Alphabet`, i.e. how many constructors does the inductive type have?"
    type: number
    answer: 7
    explain: "`zero`, `one`, `letter`, `union`, `concat`, `compl`, `star`: seven constructors."
  - q: "Which of these operations is **not** a constructor of `Expression`?"
    type: choice
    choices: ["complement (`compl`)", "intersection", "Kleene star (`star`)", "concatenation (`concat`)"]
    answer: 1
    explain: "There's no intersection constructor. You can still express intersection: complement the union of the two complements (De Morgan). `HasHeightAtMost.inter` in `Height.lean` does exactly that, and it costs no height."
  - q: "`.letter` takes one argument. What is it?"
    type: choice
    choices: ["a word (a `List Alphabet`)", "a single element of `Alphabet`", "another `Expression`", "a natural number"]
    answer: 1
    explain: "`letter : Alphabet → Expression Alphabet`. A longer word like `ab` has to be built with `concat`."
  - q: "True or false: two different `Expression` values can never describe the same set of words."
    type: choice
    choices: ["True", "False"]
    answer: 1
    explain: "False. `Expression` is syntax, so `(a+b)*` and `~0` are different terms with the same language over the alphabet {a, b}. That's the whole point of the theorem: for any regular language there is *some* expression of height ≤ 3, even if the obvious one has a higher height."
---

## Plain English

An `Expression` is a little formula, the same idea as a regular expression in programming, with one extra operation: **complement** ("everything except").

The seven building blocks:

| Lean constructor | written on this site | meaning (see [language](#/node/Expression.language)) |
|---|---|---|
| `.zero` | `0` | no words at all |
| `.one` | `1` or `ε` | only the empty word |
| `.letter a` | `a` | only the one-letter word `a` |
| `.union P Q` | `P + Q` | words of P or of Q |
| `.concat P Q` | `PQ` | a word of P followed by a word of Q |
| `.compl P` | `~P` | every word *not* in P |
| `.star P` | `P*` | any number (including zero) of P-words in a row |

Every expression is a finite tree of these. For example `(a+b)*` is the Lean term `.star (.union (.letter a) (.letter b))`.

The word **generalized** refers to complement. Ordinary regular expressions don't have it. Adding it doesn't change which languages can be described, but it can drastically reduce how many *nested stars* you need. That number is what the theorem bounds.
