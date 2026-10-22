// DFAs and their transition monoids, mirroring
// OAI.GeneralizedStarHeight.FiniteRecognition.transition / of_regular
// (OAI/Computability/StarHeight/PeriodicLanguages.lean).
//
// A DFA is { A: letters, Q: state names, start: index, accept: [indices], d: { letter: [target per state] } }.
//
// Lean takes M = (Function.End Q)ᵐᵒᵖ and T w = op (fun q => A.evalFrom q w). We represent an
// element of M as an array f with f[q] = evalFrom q w. Multiplication in the opposite monoid is
//   (f * g)[q] = g[f[q]]
// which is exactly T(u ++ v) = T u * T v: run u, then v. F = { f | f[start] ∈ accept }.

export const DFAS = {
  "even number of a's": { A: ["a", "b"], Q: ["even", "odd"], start: 0, accept: [0], d: { a: [1, 0], b: [0, 1] } },
  "contains ab": { A: ["a", "b"], Q: ["0", "1", "2"], start: 0, accept: [2], d: { a: [1, 1, 2], b: [0, 2, 2] } },
  "ends with b": { A: ["a", "b"], Q: ["0", "1"], start: 0, accept: [1], d: { a: [0, 0], b: [1, 1] } },
  "(ab)*": { A: ["a", "b"], Q: ["0", "1", "dead"], start: 0, accept: [0], d: { a: [1, 2, 2], b: [2, 0, 2] } },
  "#a ≡ 0 mod 3": { A: ["a", "b"], Q: ["0", "1", "2"], start: 0, accept: [0], d: { a: [1, 2, 0], b: [0, 1, 2] } },
};

export const cloneDFA = (D) => ({ A: [...D.A], Q: [...D.Q], start: D.start, accept: [...D.accept], d: Object.fromEntries(D.A.map((a) => [a, [...D.d[a]]])) });

// DFA.evalFrom: run `w` from state `q`, one letter at a time.
export function evalFrom(D, q, w) {
  for (const a of w) q = D.d[a][q];
  return q;
}

// The whole run, for a stepper: [start, after 1st letter, …].
export function trace(D, q, w) {
  const out = [q];
  for (const a of w) { q = D.d[a][q]; out.push(q); }
  return out;
}

export const accepts = (D, w) => D.accept.includes(evalFrom(D, D.start, w));

// T w, as the array q ↦ evalFrom q w.
export const endo = (D, w) => D.Q.map((_, q) => evalFrom(D, q, w));

// (f * g)[q] = g[f[q]] — multiplication of (Function.End Q)ᵐᵒᵖ.
export const mulEndo = (f, g) => f.map((q) => g[q]);

// |M| = |Q|^|Q|: the monoid Lean actually uses is *all* maps Q → Q, not just the reachable ones.
export const fullMonoidSize = (D) => D.Q.length ** D.Q.length;

// The image T(Σ*) — a submonoid of M — found by breadth-first search from T([]) = id.
// Returns elements in shortest-word order, each with a shortest word that realizes it.
export function imageMonoid(D) {
  const id = D.Q.map((_, i) => i);
  const key = (f) => f.join(",");
  const elems = [{ f: id, w: "", len: 0 }];
  const seen = new Map([[key(id), 0]]);
  for (let k = 0; k < elems.length; k++)
    for (const a of D.A) {
      const g = mulEndo(elems[k].f, endo(D, a));
      if (!seen.has(key(g))) { seen.set(key(g), elems.length); elems.push({ f: g, w: elems[k].w + a, len: elems[k].w.length + 1 }); }
    }
  const index = (f) => seen.get(key(f));
  return {
    elems,
    index,
    evalWord: (w) => index(endo(D, w)),
    mul: (i, j) => index(mulEndo(elems[i].f, elems[j].f)),
    // Is this element in F = { f | f[start] ∈ accept }?
    inF: (i) => D.accept.includes(elems[i].f[D.start]),
    // How many elements are realized by words of length ≤ k: the monoid "building up".
    countUpTo: (k) => elems.filter((m) => m.len <= k).length,
    // Longest shortest-word, i.e. the point past which nothing new appears.
    saturation: elems.reduce((m, e) => Math.max(m, e.len), 0),
  };
}
