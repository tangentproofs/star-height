// The right-regular representation over ZMod 2, mirroring
// OAI.GeneralizedStarHeight.RightRegular (OAI/Computability/StarHeight/Actions.lean):
//   V M      := M → ZMod 2
//   basis M m := the indicator of m  (Pi.basisFun)
//   action M d := the linear map determined by basis m ↦ basis (m * d)
//
// A monoid is { names, mul }, with the identity at index 0. A vector of V M is an array of
// 0/1 of length |M|; addition is coordinatewise in ZMod 2, i.e. XOR.

export const MONOIDS = {
  "ℤ/3 = {1, g, g²}": { names: ["1", "g", "g²"], mul: (i, j) => (i + j) % 3 },
  "ℤ/2 = {1, g}": { names: ["1", "g"], mul: (i, j) => (i + j) % 2 },
  "{1, 0} under ×": { names: ["1", "0"], mul: (i, j) => (i === 1 || j === 1 ? 1 : 0) },
  "{1, a, b} with xa = a, xb = b": { names: ["1", "a", "b"], mul: (i, j) => (j === 0 ? i : j) },
  "{1, s, s²=0}": { names: ["1", "s", "0"], mul: (i, j) => (i === 0 ? j : j === 0 ? i : 2) },
};

export const basis = (n, m) => Array.from({ length: n }, (_, i) => (i === m ? 1 : 0));
export const zeroVec = (n) => Array(n).fill(0);
export const addVec = (v, w) => v.map((x, i) => x ^ w[i]);
export const eqVec = (v, w) => v.length === w.length && v.every((x, i) => x === w[i]);

// Column m of the matrix of `action M d` is the image of basis m, namely basis (m * d).
// matrix[row][col] = 1 iff col * d = row.
export function actionMatrix(M, d) {
  const n = M.names.length;
  const rows = Array.from({ length: n }, () => Array(n).fill(0));
  for (let m = 0; m < n; m++) rows[M.mul(m, d)][m] = 1;
  return rows;
}

// action M d applied to a vector: the linear extension, so coordinate m′ is the mod-2 sum of
// v m over every m with m * d = m′. Two elements landing on the same spot cancel.
export function applyAction(M, d, v) {
  const out = zeroVec(M.names.length);
  v.forEach((bit, m) => { if (bit) out[M.mul(m, d)] ^= 1; });
  return out;
}

// value_recovery: action M d (basis M 1) = basis M e ↔ d = e.
export const valueRecovery = (M, d) => eqVec(applyAction(M, d, basis(M.names.length, 0)), basis(M.names.length, d));

// updateWord_product: running the blocks' actions from `x` equals the action of the product.
// `ds` is a list of monoid elements (one per block). Returns the trace of vectors.
export function trackTrace(M, ds, x = basis(M.names.length, 0)) {
  const out = [{ v: x, prod: 0 }];
  let v = x, prod = 0;
  for (const d of ds) { v = applyAction(M, d, v); prod = M.mul(prod, d); out.push({ v, prod, d }); }
  return out;
}

// Sanity check used by the tests: identity at 0, associative, closed.
export function checkMonoid(M) {
  const n = M.names.length;
  for (let i = 0; i < n; i++) {
    if (M.mul(0, i) !== i || M.mul(i, 0) !== i) return `identity fails at ${i}`;
    for (let j = 0; j < n; j++) {
      if (M.mul(i, j) < 0 || M.mul(i, j) >= n) return `not closed at ${i},${j}`;
      for (let k = 0; k < n; k++)
        if (M.mul(M.mul(i, j), k) !== M.mul(i, M.mul(j, k))) return `associativity fails at ${i},${j},${k}`;
    }
  }
  return null;
}
