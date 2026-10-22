# Contributing explainers

The site in `site/` informalizes the Lean proof: for each declaration it shows the
formal statement, a plain-English explanation, an optional interactive demo, and a
quiz with an answer key. A reader can tick "I understand" on a node at any time;
the quiz is optional. The node shows one of three greens: lightest for "I understand" only, middle for
quiz passed only, darkest for both (the shared logic is `assets/progress.js`, identical in every
tangentproofs informalization site). A node counts as understood once the reader has also understood every project
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

On wide screens the body sits to the left of the formal statement, so open it with a sentence or
two that reads the statement itself: the reader compares that opening directly against the Lean
beside it. Widgets sit in the same column, right under the text; the "I think I understand this"
box and the quiz stars are in a bar at the top of the page, and the quiz is an optional bonus below.

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

Widgets are the main way a reader gets hands-on with a definition. Prefer one of the
interactive types; they all run entirely in the browser with no dependencies.

| type | what it shows | config keys |
|---|---|---|
| `build` | build an `Expression` by pressing one button per constructor (a stack: atoms push, `compl`/`star` pop one, `union`/`concat` pop two); annotated subterm tree, Lean term, words up to n | `alphabet`, `n`, `start` |
| `lang-tree` | `Expression.language` clause by clause: one row per subterm with its clause and word set; click a word to trace which subterms contain it | `expr`, `alphabet`, `n` |
| `height-lab` | pick a subterm and wrap it in `compl` (height unchanged) or `star` (+1), with a running tally | `expr`, `alphabet`, `n` |
| `union-lab` | a finite union and its height (the max); `words: true` builds what `HasHeightAtMost.finite`/`singleton` build | `items`, `words`, `alphabet`, `n` |
| `dfa-lab` | editable DFA (cycle transitions, toggle accepting, move the start) with an SVG diagram, a per-letter run stepper, and the transition monoid building up by word length — including `\|M\| = \|Q\|^\|Q\|` vs the elements actually realized as `T w` | `dfa`, `word` |
| `factor-lab` | `factor_remainder` one peel at a time on a word strip; when `E` is not a prefix code the reader picks the block | `E`, `word` |
| `blocks` | assemble a block list: `AllIn D es`, `es.flatten`, and the `updateWord` fold step by step | `D`, `es`, `G`, `k`, `x` |
| `graph-lab` | `graph D G x y` as a graph: click the endpoints, step a block list along the edges, and list every word of length ≤ n that gets there with a witness | `D`, `k`, `x`, `y`, `n`, `G` |
| `vector-lab` | `RightRegular`: clickable `V M` bit vectors, `basis`, the 0/1 matrix of `action M d`, and the running-product track (`updateWord_product`, `value_recovery`) | `monoid`, `show` (any of `vectors`, `basis`, `action`, `track`) |
| `decompose` | the `recognized_height_three` set identity computed end to end: factor a word, read off d and f, check d·f ∈ F against the DFA, and count the qualifying pairs | `dfa`, `E`, `word` |
| `walkthrough` | an outline of steps; click a step for its Lean, a note, and links to the nodes it uses. For a *proof*, use a proof view (below) instead: it shows the real Lean, so it cannot drift | `steps: [{text, lean?, note?, link?, uses?, hard?}]` |

Simpler one-shot variants, kept for compact use (the playground uses the first two):

| type | what it shows | config keys |
|---|---|---|
| `regex` | parse a generalized regex; height, Lean term, subterm heights, words up to length n | `expr`, `alphabet`, `n`, `presets` |
| `compare` | two expressions: heights, and where their languages differ up to length n | `left`, `right`, `alphabet`, `n` |
| `dfa-monoid` | a preset DFA's transition monoid, and `T(w)` for a word | `dfa`, `word` |
| `factor` | prefix-code check and the cut `w = es.flatten ++ r` | `E`, `word` |
| `graph-walk` | words in `graph D G x y` for G = "add #a mod k" | `E`, `k`, `x`, `y`, `n` |
| `right-regular` | `basis` and `action` on `V M = M → ZMod 2` for small monoids | `monoid` |
| `outline` | a vertical proof outline with links | `steps: [{text, link?, note?, hard?}]` |

### Proof view: the proof step by step

A theorem's node page can show its tactic proof as English steps beside the Lean that does each
step, in two layouts the reader toggles between (linked panes, or an outline with a minimap). Write
`site/proofs/<id>.yml`:

```yaml
id: FiniteRecognition.recognized_height_three
segments:
  - lines: [58, 62]          # absolute lines in the .lean file, inclusive
    src: explainer           # explainer | draft | comment
    title: "Feed the engine lemma the right vector space"
    note: "Optional second sentence or two."
    uses: [SourceSchedule.episode_linear_graphs]   # declarations this step relies on (checked)
    hard: true               # optional: where the real work is
```

The segments must cover the proof body exactly: the first starts on the line after the one ending
`:= by`, each starts right after the previous one, the last ends on the declaration's last line.
The Lean text is **not** written in the YAML; `node site/tools/build_proof_steps.mjs` copies it from
the source into `site/data/proofs.json` (commit that file). `npm test` fails on a gap, an overlap,
an unknown `uses` id, or a `proofs.json` that no longer matches the sources, so when the Lean
changes, fix the line ranges and regenerate.

Badges are shown to readers, so be honest: `explainer` only for English taken from the node's
reviewed explainer, `comment` for a comment in the Lean source, `draft` for anything else (including
a new step you wrote for a reviewed node). Links from the proof view to source lines go through
`site/assets/source.js` (`sourceUrl`), the one place to change when source pages move.

**A demo must match the Lean.** Where it can only check finitely much (words up to length
n, one hand-picked `E`, a toy monoid), say so under `caveats` and call it evidence.

New widget types go in `site/assets/widgets-interactive.js` (export them from
`INTERACTIVE`, which `widgets.js` merges into `REGISTRY`) and the `enum` in the schema.

Put the logic a widget shows in one of the modules that mirror the Lean, not in the
widget itself, and test it:

| module | mirrors |
|---|---|
| `site/assets/regex.js` | `Expression`, `language`, `height`, plus the `singleton`/`iSup` builders |
| `site/assets/automata.js` | `FiniteRecognition.transition` / `of_regular` |
| `site/assets/episodes.js` | `EpisodeAlgebra`: `PrefixCode`, `remainder`, `AllIn`, `updateWord`, `graph`, `factor_remainder` |
| `site/assets/vectors.js` | `RightRegular`: `V`, `basis`, `action`, `value_recovery` |
| `site/assets/dom.js` | shared element helpers and the stepper control |

Tests live in `site/tools/test_regex.mjs` and `site/tools/test_widgets.mjs`; both run
under `npm test`. Assert against the Lean statement, not against the widget's output
(for example: that `T` is a monoid homomorphism, that every `graph` witness satisfies
`AllIn`/`flatten`/`updateWord`, that `action (d * e) = action e ∘ action d`).

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
