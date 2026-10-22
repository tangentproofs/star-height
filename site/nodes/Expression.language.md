---
id: Expression.language
title: The language of an expression
summary: "`P.language` is the set of words an expression describes, defined clause by clause using Mathlib's operations on languages."
review: draft
authors: [grok-bot]
caveats:
  - "Complement (`ᶜ`) is taken inside *all* finite words over `Alphabet` (Mathlib's `Language Alphabet` is `Set (List Alphabet)`). So the meaning of `.compl P` depends on the alphabet: over {a, b}, `~a` contains `b` and `bb`; over {a} it does not."
  - "`0` and `1` here are Mathlib's language constants: `0` is the empty language ∅ and `1` is `{[]}`, the language whose only word is the empty word. They are not numbers."
widgets:
  - type: regex
    title: "List the words of an expression"
    config: { expr: "(ab)*", alphabet: "ab", n: 6, presets: ["0", "1", "0*", "~0", "~1", "a*b", "(ab)*", "~(a+b)"] }
quiz:
  - q: "Over the alphabet {a, b}, what is the language of `.compl .zero` (written `~0`)?"
    type: choice
    choices: ["the empty language", "only the empty word", "every word over {a, b}, including the empty word", "every non-empty word"]
    answer: 2
    explain: "`.zero` means the empty language, and its complement within all words is everything. So `~0` describes Σ* with height 0. Writing `(a+b)*` for the same language would cost a star."
  - q: "What is the language of `.star .zero` (written `0*`)?"
    type: choice
    choices: ["the empty language", "`{[]}`, only the empty word", "every word", "it is undefined"]
    answer: 1
    explain: "A star always contains the empty word (zero repetitions). With nothing to repeat, that is all it contains: `0∗ = 1 = {[]}`. Try `0*` in the widget."
  - q: "`.union P Q` is mapped to `P.language + Q.language`. What does `+` mean for languages?"
    type: choice
    choices: ["union", "concatenation", "symmetric difference", "intersection"]
    answer: 0
    explain: "In Mathlib, `+` on `Language` is set union (`Language.add_def`), and `*` is concatenation (`Language.mul_def`)."
  - q: "Over the alphabet {a, b}, how many words of length exactly 2 are in the language of `~(a+b)`?"
    type: number
    answer: 4
    explain: "`a+b` contains only the two one-letter words. Its complement contains every other word: the empty word, and all 4 words of length 2 (`aa`, `ab`, `ba`, `bb`), and so on."
---

## Plain English

`language` turns a formula into the set of words it stands for. It works clause by clause, one line per constructor:

- `.zero` ↦ `0`: **no words**.
- `.one` ↦ `1`: **just the empty word** `[]`.
- `.letter a` ↦ `{[a]}`: just the one-letter word `a`.
- `.union P Q` ↦ `P.language + Q.language`: words in either one.
- `.concat P Q` ↦ `P.language * Q.language`: every word you get by gluing a P-word to the front of a Q-word.
- `.compl P` ↦ `P.languageᶜ`: every word over the alphabet **not** in P's language.
- `.star P` ↦ `P.language∗`: every word you get by gluing together any finite number of P-words, **including none**, which gives the empty word.

A "word" is a `List Alphabet`, a finite sequence of letters. A "language" is any set of words, possibly infinite.

Every operation on the right-hand side comes from Mathlib's `Language` library, so this definition agrees exactly with standard formal-language theory. Nothing is redefined here.
