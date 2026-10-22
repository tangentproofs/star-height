// Prefix codes, remainders, block lists and path languages, mirroring
// OAI.GeneralizedStarHeight.EpisodeAlgebra
// (Episodes.lean for AllIn / updateWord / graph, PeriodicSplicing.lean for remainder /
// factor_remainder).
//
// Words are JavaScript strings; a "block" is a word, and `es` is a list of blocks.
// Languages here are finite explicit lists of words — the Lean definitions take arbitrary
// languages, so every demo built on this is an instance, never the general statement.

// List.IsPrefix: e <+: f.
export const isPrefix = (e, f) => f.startsWith(e);

// PrefixCode E := [] ∉ E ∧ ∀ e ∈ E, ∀ f ∈ E, e <+: f → e = f.
export function prefixCode(E) {
  const hasNil = E.includes("");
  const clashes = [];
  for (const e of E) for (const f of E) if (e !== f && isPrefix(e, f)) clashes.push([e, f]);
  return { hasNil, clashes, ok: !hasNil && clashes.length === 0 };
}

// remainder E := { w | ∀ e ∈ E, ¬ e <+: w }.
export const inRemainder = (E, w) => E.every((e) => !isPrefix(e, w));

// AllIn D es := ∀ e ∈ es, e ∈ D. Note `AllIn D []` is vacuously true.
export const allIn = (D, es) => es.every((e) => D.includes(e));

export const flatten = (es) => es.join("");

// updateWord G x es = es.foldl (fun z e => G e z) x.
export function updateWord(G, x, es) {
  let z = x;
  for (const e of es) z = G(e, z);
  return z;
}

// The states visited, for a stepper: [x, after e₁, after e₁e₂, …].
export function updateTrace(G, x, es) {
  const out = [x];
  let z = x;
  for (const e of es) { z = G(e, z); out.push(z); }
  return out;
}

// One step of factor_remainder's induction: which blocks of E are a prefix of `rest`?
// The Lean proof `obtain`s *some* such block; with a prefix code there is at most one.
export const candidates = (E, rest) => E.filter((e) => e !== "" && isPrefix(e, rest)).sort((a, b) => a.length - b.length || (a < b ? -1 : 1));

// Run factor_remainder to completion, recording each peel.
// `pick(cands, rest)` chooses a block when several fit; default: the shortest.
// Returns { es, r, steps }, so that es.flatten ++ r = w and r ∈ remainder E.
export function factor(E, w, pick = (c) => c[0]) {
  const es = [], steps = [];
  let rest = w;
  for (let guard = 0; guard <= w.length; guard++) {
    const cands = candidates(E, rest);
    if (!cands.length) break;
    const chosen = pick(cands, rest);
    steps.push({ rest, cands, chosen, at: w.length - rest.length });
    es.push(chosen);
    rest = rest.slice(chosen.length);
  }
  return { es, r: rest, steps };
}

// graph D G x y = { w | ∃ es, AllIn D es ∧ es.flatten = w ∧ updateWord G x es = y }.
// Enumerates the words of length ≤ n, each with one witness block list.
// `eq` compares states (default ===), so states may be arrays.
export function graphWords(D, G, x, y, n, eq = (a, b) => a === b) {
  const blocks = [...new Set(D)].filter((e) => e !== "");
  const found = new Map();
  const walk = (w, s, es) => {
    if (eq(s, y) && !found.has(w)) found.set(w, es);
    for (const e of blocks) if (w.length + e.length <= n) walk(w + e, G(e, s), [...es, e]);
  };
  walk("", x, []);
  return [...found.entries()]
    .sort((p, q) => p[0].length - q[0].length || (p[0] < q[0] ? -1 : 1))
    .map(([w, es]) => ({ w, es }));
}
