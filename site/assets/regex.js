// Generalized regular expressions, mirroring OAI.GeneralizedStarHeight.Expression.
//
// Syntax (precedence high → low):
//   atoms     0 (empty language)   1 or ε (the empty word)   a letter of the alphabet   ( e )
//   postfix   e*  (star)           eᶜ or e'  (complement in Σ*)
//   prefix    ~e or ¬e  (complement; applies to the following atom with its postfixes)
//   concat    e f   or  e·f  or  e.f
//   union     e + f  or  e | f
// Shorthand: ⊤ or Σ* is NOT built in; write ~0 (complement of the empty language = all words).

export function parse(src, alphabet) {
  const s = src.replace(/\s+/g, "");
  let i = 0;
  const fail = (msg) => { throw new Error(`${msg} at position ${i + 1} in "${s}"`); };
  const peek = () => s[i];
  function union() {
    let l = concat();
    while (peek() === "+" || peek() === "|") { i++; l = { t: "union", l, r: concat() }; }
    return l;
  }
  const startsFactor = (c) => c !== undefined && !"+|)*'ᶜ".includes(c);
  function concat() {
    let l = factor();
    while (peek() === "·" || peek() === "." || startsFactor(peek())) {
      if (peek() === "·" || peek() === ".") i++;
      l = { t: "concat", l, r: factor() };
    }
    return l;
  }
  function factor() {
    if (peek() === "~" || peek() === "¬") { i++; return { t: "compl", e: factor() }; }
    let e = atom();
    for (;;) {
      if (peek() === "*") { i++; e = { t: "star", e }; }
      else if (peek() === "'" || peek() === "ᶜ") { i++; e = { t: "compl", e }; }
      else return e;
    }
  }
  function atom() {
    const c = peek();
    if (c === undefined) fail("unexpected end");
    if (c === "(") { i++; const e = union(); if (peek() !== ")") fail("expected )"); i++; return e; }
    if (c === "0" || c === "∅") { i++; return { t: "zero" }; }
    if (c === "1" || c === "ε") { i++; return { t: "one" }; }
    if (alphabet.includes(c)) { i++; return { t: "letter", a: c }; }
    if (/[a-z]/i.test(c)) fail(`letter '${c}' is not in the alphabet {${[...alphabet].join(",")}}`);
    fail(`unexpected '${c}'`);
  }
  if (!s) throw new Error("empty expression");
  const e = union();
  if (i < s.length) fail(`unexpected '${s[i]}'`);
  return e;
}

// Expression.height, clause by clause.
export function height(e) {
  switch (e.t) {
    case "zero": case "one": case "letter": return 0;
    case "union": case "concat": return Math.max(height(e.l), height(e.r));
    case "compl": return height(e.e);
    case "star": return 1 + height(e.e);
  }
}

// Lean constructor form, e.g. .star (.union (.letter 'a') (.letter 'b')).
export function toLean(e) {
  const p = (x) => (["zero", "one"].includes(x.t) ? toLean(x) : `(${toLean(x)})`);
  switch (e.t) {
    case "zero": return ".zero";
    case "one": return ".one";
    case "letter": return `.letter '${e.a}'`;
    case "union": return `.union ${p(e.l)} ${p(e.r)}`;
    case "concat": return `.concat ${p(e.l)} ${p(e.r)}`;
    case "compl": return `.compl ${p(e.e)}`;
    case "star": return `.star ${p(e.e)}`;
  }
}

export function show(e) {
  const prec = { union: 1, concat: 2, compl: 3, star: 4, zero: 5, one: 5, letter: 5 };
  const w = (x, p) => (prec[x.t] < p ? `(${show(x)})` : show(x));
  switch (e.t) {
    case "zero": return "0";
    case "one": return "1";
    case "letter": return e.a;
    case "union": return `${w(e.l, 1)} + ${w(e.r, 1)}`;
    case "concat": return `${w(e.l, 2)}${w(e.r, 3)}`;
    case "compl": return `~${w(e.e, 4)}`;
    case "star": return `${w(e.e, 5)}*`;
  }
}

// All words over `alphabet` of length ≤ n, in shortlex order.
export function allWords(alphabet, n) {
  const out = [""];
  let layer = [""];
  for (let k = 1; k <= n; k++) {
    const next = [];
    for (const w of layer) for (const a of alphabet) next.push(w + a);
    out.push(...next);
    layer = next;
  }
  return out;
}

export const shortlex = (a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0);

// language(e) ∩ {words of length ≤ n}. Exact: every operation commutes with this
// truncation (a word of length ≤ n in L·M splits into two words of length ≤ n, etc.).
export function wordsUpTo(e, alphabet, n) {
  const universe = allWords(alphabet, n);
  const go = (e) => {
    switch (e.t) {
      case "zero": return new Set();
      case "one": return new Set([""]);
      case "letter": return n >= 1 ? new Set([e.a]) : new Set();
      case "union": { const a = go(e.l); for (const w of go(e.r)) a.add(w); return a; }
      case "concat": {
        const A = [...go(e.l)], B = [...go(e.r)], out = new Set();
        for (const x of A) for (const y of B) if (x.length + y.length <= n) out.add(x + y);
        return out;
      }
      case "compl": { const A = go(e.e); return new Set(universe.filter((w) => !A.has(w))); }
      case "star": {
        const A = [...go(e.e)].filter((w) => w.length > 0);
        const out = new Set([""]);
        let frontier = [""];
        while (frontier.length) {
          const next = [];
          for (const x of frontier) for (const y of A) {
            const z = x + y;
            if (z.length <= n && !out.has(z)) { out.add(z); next.push(z); }
          }
          frontier = next;
        }
        return out;
      }
    }
  };
  return [...go(e)].sort(shortlex);
}

// Subterms with their heights, for an annotated tree view.
export function tree(e, depth = 0, out = []) {
  out.push({ depth, label: e.t === "letter" ? `letter '${e.a}'` : e.t, text: show(e), h: height(e) });
  if (e.l) { tree(e.l, depth + 1, out); tree(e.r, depth + 1, out); }
  if (e.e) tree(e.e, depth + 1, out);
  return out;
}

export function maxN(alphabet, cap = 6000) {
  let n = 0, total = 1, layer = 1;
  while (true) { layer *= alphabet.length; if (total + layer > cap || n >= 14) return n; total += layer; n++; }
}

// ---------------------------------------------------------------- subterm addressing
// A path is a list of "l" / "r" / "e" steps, matching the field names used above.
// Preorder, the same order `tree` emits.
export function subterms(e, path = [], out = []) {
  out.push({ path, e });
  if (e.l) { subterms(e.l, [...path, "l"], out); subterms(e.r, [...path, "r"], out); }
  if (e.e) subterms(e.e, [...path, "e"], out);
  return out;
}

export function atPath(e, path) {
  let cur = e;
  for (const step of path) cur = cur[step];
  return cur;
}

// Rebuild `e` with the subterm at `path` replaced by `f(subterm)`. Pure; `e` is untouched.
export function replaceAt(e, path, f) {
  if (!path.length) return f(e);
  const [step, ...rest] = path;
  return { ...e, [step]: replaceAt(e[step], rest, f) };
}

// ---------------------------------------------------------------- building expressions
// Mirrors HasHeightAtMost.singleton (Height.lean): [] ↦ .one, a :: w ↦ .concat (.letter a) (singleton w).
export function singletonExpr(w) {
  let out = { t: "one" };
  for (const a of [...w].reverse()) out = { t: "concat", l: { t: "letter", a }, r: out };
  return out;
}

// Mirrors the fold in HasHeightAtMost.finset_iSup: ∅ ↦ .zero, insert i s ↦ .union (L i) (⨆ s).
export function unionExpr(list) {
  let out = { t: "zero" };
  for (const e of [...list].reverse()) out = { t: "union", l: e, r: out };
  return out;
}
