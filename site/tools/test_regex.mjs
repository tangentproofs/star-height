// Sanity tests for the playground engine (run in CI).
import assert from "node:assert/strict";
import { parse, height, wordsUpTo, allWords, toLean } from "../assets/regex.js";
const A = ["a", "b"];
const L = (s, n = 6) => wordsUpTo(parse(s, A), A, n);
assert.deepEqual(L("0"), []);
assert.deepEqual(L("1"), [""]);
assert.deepEqual(L("~0"), allWords(A, 6));
assert.equal(height(parse("~0", A)), 0);
assert.equal(height(parse("(a+b)*", A)), 1);
assert.equal(height(parse("((ab)*a)*", A)), 2);
assert.equal(height(parse("~(a*)", A)), 1);
assert.equal(height(parse("(a*)* + b", A)), 2);
// (ab)* has generalized star height 0 over {a,b}:
assert.deepEqual(L("(ab)*", 8), L("~(b~0 + ~0a + ~0(aa+bb)~0)", 8));
// (a+b)* = ~0
assert.deepEqual(L("(a+b)*"), L("~0"));
// complement is relative to the alphabet
assert.deepEqual(wordsUpTo(parse("~0", ["a"]), ["a"], 3), ["", "a", "aa", "aaa"]);
assert.equal(toLean(parse("(a+b)*", A)), ".star (.union (.letter 'a') (.letter 'b'))");
assert.throws(() => parse("c", A));
assert.equal(height(parse("~a*", A)), 1); // ~ applies to a*
assert.deepEqual(L("~a*", 2), ["b", "ab", "ba", "bb"]);
console.log("regex engine: all tests passed");
