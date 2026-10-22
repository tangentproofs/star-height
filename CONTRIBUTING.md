# Contributing explainers

The site in `site/` informalizes the Lean proof: for each declaration it shows the
formal statement, a plain-English explanation, an optional interactive demo, and a
quiz with an answer key. A reader can sign off on a node only after passing its quiz.
A node counts as understood once the reader has also understood every project
declaration its statement mentions.

**The Lean is the ground truth.** An explainer is correct only if it matches the
statement exactly as written in `OAI/Computability/StarHeight/*.lean`: its hypotheses,
the order of its quantifiers, which side is complemented, what is `∃` and what is `∀`.
Don't import claims from the paper that the Lean doesn't make. If you aren't sure,
say so under `caveats`.

Humans and AI agents follow the same process, described below.

## What to work on

- `site/dist/data/needs-explainer.json` (published as `data/needs-explainer.json` on the site)
  lists every declaration used by `main` that has no explainer yet, closest to `main` first,
  with its *meaning dependencies*.
- Prefer nodes whose `meaningDeps` are already explained. A reader can't mark a node
  understood until everything it mentions is explained and understood.
- Each stub page on the site has a ready-to-paste **agent prompt** with the statement,
  the source link, and the dependencies.

## Add or patch a node

One file per declaration: `site/nodes/<id>.md`, where `<id>` is the declaration name
without the `OAI.GeneralizedStarHeight.` prefix (for example `EpisodeAlgebra.graph.md`
or `main.md`). Look up ids in `site/data/decls.json`.

```markdown
---
id: EpisodeAlgebra.remainder          # = file name, must exist in data/decls.json
title: "Leftovers: remainder E"        # ≤ 80 chars
summary: "One sentence. Markdown allowed; Lean in `backticks`."
review: draft                         # 'human-reviewed' only after a person checked it against the Lean
authors: [your-handle]                # agents: name the agent and the human who asked, e.g. "claude (for @alice)"
caveats:                              # optional, but use it whenever English is looser than the Lean
  - "Where the explanation simplifies, or what you're unsure of."
widgets:                              # optional; see the list below
  - type: factor
    title: "Cut a word into E-blocks plus a leftover"
    config: { E: "ab, b", word: "babbaa" }
quiz:                                 # 3–6 questions; ALL must be answered correctly to pass
  - q: "If `[] ∈ E`, what is `remainder E`?"
    type: choice                      # choice | number | text
    choices: ["empty", "all words", "{[]}"]
    answer: 0                         # choice: 0-based index · number: a number · text: list of accepted strings
    explain: "Why, pointing at the Lean. Shown after the reader answers."
---

## Plain English

The explanation. Markdown, tables and inline HTML are fine. Link to other nodes as
[graph](#/node/EpisodeAlgebra.graph).
```

The schema is `site/schema/node.schema.json`. `site/tools/build_site.mjs` also checks:

- the `id` matches the file name and is a real declaration;
- every `choice` answer is a valid index, `number` answers are numbers, and `text` answers are lists;
- the body has a `## Plain English` heading;
- it warns when one of the node's meaning dependencies has no explainer yet.

### Writing good quiz questions

A quiz exists to show that the reader understands the **formal statement**, not the
surrounding story. Good questions:

- test the hypotheses (what is assumed? which hypothesis does the proof actually need?);
- test quantifier order (can `E` depend on `x`?);
- test edge cases the definition decides (the empty word, the empty alphabet, `[] ∈ E`);
- compute a small instance (the height of a given expression, the size of a monoid in a demo);
- use true/false for common misreadings ("∃ an expression" vs "every expression").

Every `explain` should point at the Lean that makes the answer right.

### Widgets

| type | what it shows | config keys |
|---|---|---|
| `regex` | parse a generalized regex; height, Lean term, subterm heights, words up to length n | `expr`, `alphabet`, `n`, `presets` |
| `compare` | two expressions: heights, and where their languages differ up to length n | `left`, `right`, `alphabet`, `n` |
| `dfa-monoid` | a preset DFA's transition monoid, and `T(w)` for a word | `dfa` (`"even number of a's"`, `"contains ab"`, `"ends with b"`, `"(ab)*"`), `word` |
| `factor` | prefix-code check and the cut `w = es.flatten ++ r` | `E`, `word` |
| `graph-walk` | words in `graph D G x y` for G = "add #a mod k" | `E`, `k`, `x`, `y`, `n` |
| `right-regular` | `basis` and `action` on `V M = M → ZMod 2` for small monoids | `monoid` |
| `outline` | a vertical proof outline with links | `steps: [{text, link?, note?, hard?}]` |

New widget types go in `site/assets/widgets.js` (register them in `REGISTRY`) and the
`enum` in the schema. The playground engine (`site/assets/regex.js`) has tests in
`site/tools/test_regex.mjs`.

## Check locally

```sh
cd site
npm ci
npm test              # schema + cross-checks + playground engine tests
npm run serve         # builds site/dist and serves it on http://localhost:8765
```

CI runs the same checks on every PR that touches `site/`, and deploys to GitHub Pages
on every push to `main`.

## Regenerating the declaration graph

`site/data/decls.json` comes from the compiled Lean, so it only needs regenerating if
the Lean changes:

```sh
lake exe cache get && lake build
lake env lean site/tools/ExtractDecls.lean     # writes site/data/decls.raw.json (several GB of RAM; takes minutes)
python3 site/tools/build_decls.py              # writes site/data/decls.json
```

`ExtractDecls.lean` records, for each declaration, the project constants used in its
**type** and in its **value**. `build_decls.py` turns those into:

- `meaningDeps`: what you must understand to understand the declaration. For a theorem
  that's the constants in its statement. For a definition it's the statement plus the
  body, because the body is what it means.
- `proofDeps`: the extra constants a theorem's proof uses.

Generated helpers (recursors, `match_` / `proof_` auxiliaries, equation lemmas) are
folded into the declaration they belong to.

## Discussion

Each node page has a comment thread (giscus, backed by GitHub Discussions in this
repo, one discussion per node titled `node: <id>`). Use it for questions and
disagreements. Use PRs for changes to the text or the quiz key.
