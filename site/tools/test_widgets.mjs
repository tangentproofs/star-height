// Tests for the widget logic modules, each assertion keyed to the Lean definition it mirrors.
// Run by `npm test`.
import assert from "node:assert/strict";
import { parse, height, show, toLean, subterms, atPath, replaceAt, singletonExpr, unionExpr, wordsUpTo } from "../assets/regex.js";
import { DFAS, cloneDFA, evalFrom, trace, accepts, endo, mulEndo, imageMonoid, fullMonoidSize } from "../assets/automata.js";
import { isPrefix, prefixCode, inRemainder, allIn, flatten, updateWord, updateTrace, candidates, factor, graphWords } from "../assets/episodes.js";
import { MONOIDS, basis, zeroVec, addVec, eqVec, actionMatrix, applyAction, valueRecovery, trackTrace, checkMonoid } from "../assets/vectors.js";
import { stepper, clampStep } from "../assets/dom.js";
import { outlineHtml, stepDetailHtml } from "../assets/walkthrough.js";   // uses `document` only inside its functions

const A = ["a", "b"];
let n = 0;
const t = (name, f) => { f(); n++; };

// ---------------------------------------------------------------- regex: subterms & builders
t("subterms is preorder and atPath round-trips", () => {
  const e = parse("~(a*)b", A);
  assert.deepEqual(subterms(e).map((s) => show(s.e)), ["~a*b", "~a*", "a*", "a", "b"]);
  assert.equal(show(parse(show(e), A)), show(e));   // `show` round-trips through `parse`
  for (const { path, e: sub } of subterms(e)) assert.equal(show(atPath(e, path)), show(sub));
});

t("replaceAt is pure and rebuilds the spine", () => {
  const e = parse("ab", A);
  const e2 = replaceAt(e, ["l"], (s) => ({ t: "star", e: s }));
  assert.equal(show(e), "ab");          // untouched
  assert.equal(show(e2), "a*b");
  assert.equal(height(e2), 1);
  // compl is free, star costs exactly one, at any depth (Expression.height)
  const deep = parse("(a*b)*", A);
  assert.equal(height(replaceAt(deep, ["e", "l"], (s) => ({ t: "compl", e: s }))), height(deep));
  assert.equal(height(replaceAt(deep, ["e", "l"], (s) => ({ t: "star", e: s }))), height(deep) + 1);
});

t("singletonExpr mirrors HasHeightAtMost.singleton", () => {
  assert.equal(toLean(singletonExpr("")), ".one");
  assert.equal(toLean(singletonExpr("ab")), ".concat (.letter 'a') (.concat (.letter 'b') .one)");
  assert.equal(height(singletonExpr("abba")), 0);
  assert.deepEqual(wordsUpTo(singletonExpr("ab"), A, 4), ["ab"]);
  assert.deepEqual(wordsUpTo(singletonExpr(""), A, 2), [""]);
});

t("unionExpr mirrors the finset_iSup fold and keeps height 0 on finite languages", () => {
  assert.equal(toLean(unionExpr([])), ".zero");
  assert.deepEqual(wordsUpTo(unionExpr([]), A, 3), []);
  const fin = unionExpr(["", "ab", "ba", "bab"].map(singletonExpr));
  assert.equal(height(fin), 0);                                   // HasHeightAtMost.finite: height 0
  assert.deepEqual(wordsUpTo(fin, A, 4), ["", "ab", "ba", "bab"]);
  // union takes the max, never the sum (Expression.height)
  assert.equal(height(unionExpr([parse("a*", A), parse("(a*b)*", A), parse("~0", A)])), 2);
});

// ---------------------------------------------------------------- automata
t("evalFrom / accepts agree with the languages the presets are named after", () => {
  const even = DFAS["even number of a's"];
  for (const w of ["", "b", "aa", "abab", "aab"]) assert.equal(accepts(even, w), [...w].filter((c) => c === "a").length % 2 === 0, w);
  const has = DFAS["contains ab"];
  for (const w of ["", "a", "b", "ab", "ba", "bab", "aab", "bba"]) assert.equal(accepts(has, w), w.includes("ab"), w);
  const ends = DFAS["ends with b"];
  for (const w of ["", "a", "b", "ab", "ba"]) assert.equal(accepts(ends, w), w.endsWith("b"), w);
  const abs = DFAS["(ab)*"];
  for (const w of ["", "ab", "abab", "a", "aba", "ba", "abb"]) assert.equal(accepts(abs, w), /^(ab)*$/.test(w), w);
  const mod3 = DFAS["#a ≡ 0 mod 3"];
  for (const w of ["", "a", "aa", "aaa", "ababa", "aaabbb"]) assert.equal(accepts(mod3, w), [...w].filter((c) => c === "a").length % 3 === 0, w);
});

t("trace records every state of the run", () => {
  const D = DFAS["contains ab"];
  const tr = trace(D, D.start, "bab");
  assert.equal(tr.length, 4);
  assert.equal(tr[0], D.start);
  assert.equal(tr[3], evalFrom(D, D.start, "bab"));
  tr.slice(1).forEach((q, i) => assert.equal(q, D.d["bab"[i]][tr[i]]));
});

t("T is a monoid homomorphism into (Function.End Q)ᵐᵒᵖ", () => {
  for (const D of Object.values(DFAS)) {
    assert.deepEqual(endo(D, ""), D.Q.map((_, i) => i));                    // T 1 = 1
    for (const u of ["", "a", "b", "ab", "bba"]) for (const v of ["", "a", "ba", "abb"])
      assert.deepEqual(endo(D, u + v), mulEndo(endo(D, u), endo(D, v)));    // map_mul
  }
});

t("imageMonoid: closed, associative, F matches acceptance", () => {
  for (const [name, D] of Object.entries(DFAS)) {
    const M = imageMonoid(D);
    assert.ok(M.elems.length <= fullMonoidSize(D), name);
    assert.equal(M.index(M.elems[0].f), 0);                                 // identity first
    for (let i = 0; i < M.elems.length; i++) {
      assert.equal(M.mul(0, i), i, name);
      assert.equal(M.mul(i, 0), i, name);
      for (let j = 0; j < M.elems.length; j++) {
        assert.ok(M.mul(i, j) >= 0, `${name}: not closed`);
        for (let k = 0; k < M.elems.length; k++)
          assert.equal(M.mul(M.mul(i, j), k), M.mul(i, M.mul(j, k)), name);
      }
    }
    // w ∈ L ↔ T w ∈ F, the conclusion of of_regular
    for (const w of ["", "a", "b", "ab", "ba", "aba", "bab", "abab", "bbaa"])
      assert.equal(M.inF(M.evalWord(w)), accepts(D, w), `${name} / ${w}`);
    // each element's shortest word realizes it
    for (const m of M.elems) assert.deepEqual(endo(D, m.w), m.f, name);
    // the build-up saturates: nothing new past `saturation`
    assert.equal(M.countUpTo(M.saturation), M.elems.length, name);
    assert.ok(M.countUpTo(0) === 1, name);
  }
});

t("contains ab has 5 reachable maps out of 27 (quizzed on the of_regular node)", () => {
  const M = imageMonoid(DFAS["contains ab"]);
  assert.equal(M.elems.length, 5);
  assert.equal(fullMonoidSize(DFAS["contains ab"]), 27);
  assert.deepEqual(M.elems.map((m) => m.w), ["", "a", "b", "ab", "ba"]);
});

t("cloneDFA does not alias the original", () => {
  const c = cloneDFA(DFAS["ends with b"]);
  c.d.a[0] = 1; c.accept.push(0); c.Q.push("x");
  assert.equal(DFAS["ends with b"].d.a[0], 0);
  assert.deepEqual(DFAS["ends with b"].accept, [1]);
  assert.equal(DFAS["ends with b"].Q.length, 2);
});

// ---------------------------------------------------------------- episodes
t("PrefixCode matches the two conjuncts of the Lean definition", () => {
  assert.equal(prefixCode(["a", "ba", "bb"]).ok, true);
  assert.equal(prefixCode(["a", "ab"]).ok, false);                 // a <+: ab
  assert.deepEqual(prefixCode(["a", "ab"]).clashes, [["a", "ab"]]);
  assert.equal(prefixCode([""]).ok, false);                        // [] ∈ E
  assert.equal(prefixCode([""]).hasNil, true);
  assert.equal(prefixCode([]).ok, true);                           // vacuous
  assert.equal(prefixCode(["b", "ab", "aab", "aaab"]).ok, true);   // infinite-style aⁿb code
  // every word is a prefix of itself, so the clause concludes e = f rather than False
  assert.ok(isPrefix("ab", "ab"));
  assert.equal(prefixCode(["ab"]).ok, true);
});

t("remainder E = { w | ∀ e ∈ E, ¬ e <+: w }", () => {
  assert.equal(inRemainder(["a"], ""), true);
  assert.equal(inRemainder(["a"], "b"), true);
  assert.equal(inRemainder(["a"], "ba"), true);                    // prefix, not substring
  assert.equal(inRemainder(["a"], "ab"), false);
  assert.equal(inRemainder([], "anything"), true);                 // E = ∅ ⇒ remainder = everything
  for (const w of ["", "a", "ab", "zz"]) assert.equal(inRemainder([""], w), false); // [] ∈ E ⇒ remainder = ∅
});

t("AllIn is vacuous on the empty block list, and checks blocks as given", () => {
  assert.equal(allIn(["a", "ba"], []), true);
  assert.equal(allIn(["a", "ba"], ["a", "ba", "a"]), true);
  assert.equal(allIn(["a", "ba"], ["ab", "a"]), false);            // ab ∉ D even though a·b is
  assert.equal(flatten([]), "");
  assert.equal(flatten(["ba", "", "a"]), "baa");
});

t("updateWord is a left fold over whole blocks", () => {
  const G = (e, s) => s + e.length;
  assert.equal(updateWord(G, 0, []), 0);                           // updateWord_nil
  assert.equal(updateWord(G, 0, ["ab", "b"]), 3);
  const H = (e, s) => s + "/" + e;
  assert.equal(updateWord(H, "x", ["e1", "e2"]), "x/e1/e2");       // e₁ first, then e₂
  // updateWord_append
  const es = ["a", "bb"], fs = ["b", "a"];
  assert.equal(updateWord(H, "x", [...es, ...fs]), updateWord(H, updateWord(H, "x", es), fs));
  assert.deepEqual(updateTrace(G, 0, ["ab", "b"]), [0, 2, 3]);
});

t("factor_remainder: w = es.flatten ++ r with AllIn E es and r ∈ remainder E", () => {
  const cases = [[["a", "ba", "bb"], "abbaab"], [["a", "ba", "bb"], "babbab"], [["ab", "b"], "babbaa"],
    [["a"], ""], [["a"], "bbb"], [[], "ab"], [["aa", "ab", "b"], "abba"]];
  for (const [E, w] of cases) {
    const { es, r } = factor(E, w);
    assert.equal(flatten(es) + r, w, `${E}/${w}`);
    assert.ok(allIn(E, es), `${E}/${w}`);
    assert.ok(inRemainder(E, r), `${E}/${w}`);
  }
  // the quizzed example: {a, ba, bb} cuts abbaab as a · bb · a · a, leaving b
  assert.deepEqual(factor(["a", "ba", "bb"], "abbaab").es, ["a", "bb", "a", "a"]);
  assert.equal(factor(["a", "ba", "bb"], "abbaab").r, "b");
  // no block fits ⇒ es = [], r = w (the first case of the Lean proof)
  assert.deepEqual(factor(["a"], "bbb"), { es: [], r: "bbb", steps: [] });
});

t("a prefix code never offers a choice; a non-prefix code can", () => {
  const E = ["a", "ba", "bb"];
  for (const st of factor(E, "abbaab").steps) assert.equal(st.cands.length, 1);
  const bad = ["a", "ab"];
  assert.ok(factor(bad, "abb").steps.some((st) => st.cands.length > 1));
  // both choices still satisfy the conclusion, which is all the lemma claims
  const first = factor(bad, "abb", (c) => c[0]), last = factor(bad, "abb", (c) => c[c.length - 1]);
  assert.notDeepEqual(first.es, last.es);
  for (const f of [first, last]) {
    assert.equal(flatten(f.es) + f.r, "abb");
    assert.ok(allIn(bad, f.es) && inRemainder(bad, f.r));
  }
  // candidates never offers the empty block (it would not make progress)
  assert.deepEqual(candidates(["", "a"], "ab"), ["a"]);
});

t("graph D G x y: witnesses are valid, and graph_nil holds", () => {
  const k = 3, G = (e, s) => (s + [...e].filter((c) => c === "a").length) % k;
  const D = ["a", "ba", "bb"];
  for (const y of [0, 1, 2]) {
    for (const { w, es } of graphWords(D, G, 0, y, 5)) {
      assert.ok(allIn(D, es));
      assert.equal(flatten(es), w);
      assert.equal(updateWord(G, 0, es), y);
    }
  }
  // ε ∈ graph D G x x via es = [] (graph_nil), and only there
  assert.ok(graphWords(D, G, 1, 1, 3).some(({ w, es }) => w === "" && es.length === 0));
  assert.ok(!graphWords(D, G, 1, 2, 3).some(({ w }) => w === ""));
  // the three fibers partition the D-cuttable words of each length
  const all = [0, 1, 2].flatMap((y) => graphWords(D, G, 0, y, 4).map((r) => r.w));
  assert.equal(new Set(all).size, all.length, "a word reaches exactly one state when D is a prefix code");
  // a word of D∗ landing elsewhere is not in the fiber
  assert.ok(!graphWords(D, G, 0, 1, 4).some(({ w }) => w === "bb"));
  assert.ok(graphWords(D, G, 0, 0, 4).some(({ w }) => w === "bb"));
});

// ---------------------------------------------------------------- vectors
t("the monoid presets really are monoids", () => {
  for (const [name, M] of Object.entries(MONOIDS)) assert.equal(checkMonoid(M), null, `${name}: ${checkMonoid(M)}`);
});

t("V M = M → ZMod 2: XOR addition, 2^|M| vectors", () => {
  const M = MONOIDS["ℤ/3 = {1, g, g²}"], n3 = M.names.length;
  assert.deepEqual(basis(n3, 1), [0, 1, 0]);
  assert.deepEqual(addVec(basis(n3, 1), basis(n3, 1)), zeroVec(n3));         // 1 + 1 = 0
  assert.deepEqual(addVec(basis(n3, 0), basis(n3, 2)), [1, 0, 1]);
  assert.ok(eqVec(addVec(addVec(basis(n3, 0), basis(n3, 1)), basis(n3, 1)), basis(n3, 0)));
});

t("action M d sends basis m to basis (m * d) and is linear", () => {
  for (const [name, M] of Object.entries(MONOIDS)) {
    const n2 = M.names.length;
    for (let d = 0; d < n2; d++) {
      for (let m = 0; m < n2; m++)
        assert.ok(eqVec(applyAction(M, d, basis(n2, m)), basis(n2, M.mul(m, d))), `${name} d=${d} m=${m}`);
      // column m of the matrix is the image of basis m
      const mat = actionMatrix(M, d);
      for (let m = 0; m < n2; m++) assert.deepEqual(mat.map((rw) => rw[m]), basis(n2, M.mul(m, d)));
      // additivity
      for (let i = 0; i < n2; i++) for (let j = 0; j < n2; j++) {
        const v = addVec(basis(n2, i), basis(n2, j));
        assert.ok(eqVec(applyAction(M, d, v), addVec(applyAction(M, d, basis(n2, i)), applyAction(M, d, basis(n2, j)))), name);
      }
      // action_mul: action (d * e) = action e ∘ action d
      for (let e = 0; e < n2; e++) for (let m = 0; m < n2; m++)
        assert.ok(eqVec(applyAction(M, M.mul(d, e), basis(n2, m)), applyAction(M, e, applyAction(M, d, basis(n2, m)))), name);
    }
    // action_one is the identity
    for (let m = 0; m < n2; m++) assert.ok(eqVec(applyAction(M, 0, basis(n2, m)), basis(n2, m)), name);
    // value_recovery
    for (let d = 0; d < n2; d++) {
      assert.ok(valueRecovery(M, d), name);
      for (let e = 0; e < n2; e++)
        assert.equal(eqVec(applyAction(M, d, basis(n2, 0)), basis(n2, e)), d === e, name);
    }
  }
});

t("action can be non-injective, so cancellation really happens", () => {
  const M = MONOIDS["{1, a, b} with xa = a, xb = b"], n4 = 3;
  const v = addVec(basis(n4, 0), basis(n4, 2));               // basis 1 + basis b
  assert.deepEqual(applyAction(M, 1, v), zeroVec(n4));         // both land on basis a and cancel
});

t("updateWord_product: the vector tracks the running product", () => {
  for (const [name, M] of Object.entries(MONOIDS)) {
    const n5 = M.names.length;
    const seqs = [[], [1], [1, 1], [1, 1, 1], [0, 1, 0], [n5 - 1, 1, n5 - 1]];
    for (const ds of seqs) {
      const tr = trackTrace(M, ds);
      assert.equal(tr.length, ds.length + 1);
      assert.ok(eqVec(tr[0].v, basis(n5, 0)), name);
      for (const st of tr) assert.ok(eqVec(st.v, basis(n5, st.prod)), `${name} ${ds}`);
      assert.equal(tr[tr.length - 1].prod, ds.reduce((p, d) => M.mul(p, d), 0), name);
    }
  }
});


// ---------------------------------------------------------------- dom: the stepper contract
// Several widgets re-render themselves from the stepper's callback, so the stepper must not
// fire it while being constructed — that recursed forever in an earlier revision.
t("stepper clamps, and does not fire onset on construction", () => {
  const mk = () => ({ children: [], className: "", textContent: "", nodeType: 1,
    setAttribute() {}, addEventListener() {}, append(...k) { this.children.push(...k); } });
  globalThis.document = { createElement: mk, createTextNode: (s) => ({ nodeType: 3, textContent: String(s) }) };
  assert.equal(clampStep(-3, 5), 0);
  assert.equal(clampStep(9, 5), 5);
  assert.equal(clampStep(2, 5), 2);
  const calls = [];
  const st = stepper(3, (i) => calls.push(i), 7);
  assert.deepEqual(calls, [], "onset must not fire during construction");
  assert.equal(st.index, 3, "i0 is clamped to total");
  st.go(1); st.go(-5); st.go(99);
  assert.deepEqual(calls, [1, 0, 3]);
  delete globalThis.document;
});

// ---------------------------------------------------------------- walkthrough: plain outline
// No step-through mode: every step is shown normally (nothing dimmed); one is selected for detail.
t("walkthrough shows every step, none dimmed, one selected", () => {
  const steps = [{ text: "a" }, { text: "b <c>", hard: true, link: "main", uses: ["X", "main"], note: "n", lean: "x := y" }, { text: "d" }];
  const html = outlineHtml(steps);
  assert.equal((html.match(/class="step/g) || []).length, 3);
  assert.ok(!/\boff\b/.test(html), "no dimmed steps");
  assert.equal((html.match(/ on"/g) || []).length, 1); assert.ok(/class="step on" data-j="0"/.test(html), "first step selected by default");
  assert.ok(/class="step hard on" data-j="1"/.test(outlineHtml(steps, 1)));
  assert.ok(html.includes("b &lt;c&gt;"), "escaped");
  const det = stepDetailHtml(steps[1]);
  assert.ok(det.includes("<p>n</p>") && det.includes("x := y"));
  assert.deepEqual([...det.matchAll(/href="#\/node\/([^"]+)"/g)].map((m) => m[1]), ["X", "main"], "uses deduplicated");
  assert.equal(stepDetailHtml(undefined).trim(), "");
});

console.log(`widget logic: all ${n} test groups passed`);
