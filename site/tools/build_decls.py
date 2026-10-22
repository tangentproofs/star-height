#!/usr/bin/env python3
"""Post-process site/data/decls.raw.json (from ExtractDecls.lean) into site/data/decls.json.

Adds: short id, source file path, verbatim statement text sliced from the Lean source,
filtered Mathlib mentions, reverse edges. Pure Python; no Lean needed.
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
NS = "OAI.GeneralizedStarHeight."
RAW = os.path.join(ROOT, "site/data/decls.raw.json")
OUT = os.path.join(ROOT, "site/data/decls.json")

OPEN, CLOSE = "([{⟨⦃", ")]}⟩⦄"

def short(name):
    return name[len(NS):] if name.startswith(NS) else name

def cut_statement(text, kind):
    """Return the declaration header up to its top-level ':=' / 'where' / first '|' arm
    (theorems), or the full text for short defs/inductives."""
    if kind in ("inductive", "def", "instance") and text.count("\n") < 30:
        return text.rstrip(), False
    depth = 0
    i = 0
    n = len(text)
    while i < n:
        c = text[i]
        if c in OPEN: depth += 1
        elif c in CLOSE: depth = max(0, depth - 1)
        elif depth == 0:
            if text.startswith(":=", i):
                return text[:i].rstrip(), True
            if re.match(r"\swhere\b", text[i-1:i+6] if i else "") and kind != "theorem":
                return text[:i].rstrip(), True
            if c == "\n" and re.match(r"\n\s*\|", text[i:i+40]) and kind == "theorem":
                return text[:i].rstrip(), True
        i += 1
    return text.rstrip(), False

BORING = re.compile(r"(^DFunLike|^Equiv$|^EquivLike|^Set\.ofPred$|^RingHom\.id$|^H[A-Z]|^inst|\.inst|\.to[A-Z]|OfNat|^Eq$|^Iff$|^And$|^Or$|^Not$|^Exists$|^True$|^False$|"
                    r"^Membership\.mem$|^LE\.le$|^LT\.lt$|^Nat$|^Int$|^Bool$|^Prop$|^Decidable|^Classical|^id$|"
                    r"^Prod$|^Prod\.(fst|snd|mk)$|^List$|^Sigma|^Subtype$|^Function\.comp|^Set\.instMembership|"
                    r"^outParam|^setOf$|^Unit$|^PUnit|^Fin$|^Fin\.val$|^ite$|^dite$|^Ne$)")

def scoped_variables(lines, upto):
    """`variable` lines in scope at line `upto` (1-based), tracking namespace/section/end."""
    stack = [[]]
    for raw in lines[:upto - 1]:
        t = raw.strip()
        if re.match(r"(namespace|section)\b", t):
            stack.append([])
        elif re.match(r"end\b", t) and len(stack) > 1:
            stack.pop()
        elif t.startswith("variable"):
            stack[-1].append(t)
        elif t.startswith("omit ") and stack[-1]:
            pass
    return [v for frame in stack for v in frame]

def main():
    raw = json.load(open(RAW))
    names = {d["name"] for d in raw}
    src_cache = {}
    out = []
    for d in sorted(raw, key=lambda d: (d["module"], d["line"])):
        path = d["module"].replace(".", "/") + ".lean"
        if path not in src_cache:
            src_cache[path] = open(os.path.join(ROOT, path)).read().split("\n")
        lines = src_cache[path]
        text = "\n".join(lines[d["line"] - 1:d["endLine"]])
        stmt, truncated = cut_statement(text, d["kind"])
        out.append({
            "id": short(d["name"]),
            "name": d["name"],
            "kind": d["kind"],
            "file": path,
            "module": d["module"].split(".")[-1],
            "line": d["line"],
            "endLine": d["endLine"],
            "statement": stmt,
            "variables": scoped_variables(lines, d["line"]),
            "truncated": truncated,
            "typeDeps": sorted({short(x) for x in d["typeDeps"] if x in names}),
            "valueDeps": sorted({short(x) for x in d["valueDeps"] if x in names} -
                                {short(x) for x in d["typeDeps"]}),
            "mathlib": [m for m in d["mathlib"] if not BORING.search(m)],
        })
    by = {d["id"]: d for d in out}
    # What you must understand to understand a declaration's *meaning*:
    # theorems: only the constants in the statement (proofs are irrelevant to meaning);
    # defs / inductives / instances: the type AND the body (the body is the meaning).
    for d in out:
        if d["kind"] == "theorem":
            d["meaningDeps"], d["proofDeps"] = d["typeDeps"], d["valueDeps"]
        else:
            d["meaningDeps"], d["proofDeps"] = sorted(set(d["typeDeps"]) | set(d["valueDeps"])), []
        del d["typeDeps"], d["valueDeps"]
    for d in out:
        d["usedBy"] = []
    for d in out:
        for x in d["meaningDeps"] + d["proofDeps"]:
            by[x]["usedBy"].append(d["id"])
    for d in out:
        d["usedBy"].sort()
    # depth from main (shortest dependency distance), for layout / filtering
    from collections import deque
    dist = {"main": 0}
    q = deque(["main"])
    while q:
        n = q.popleft()
        for x in by[n]["meaningDeps"] + by[n]["proofDeps"]:
            if x not in dist:
                dist[x] = dist[n] + 1
                q.append(x)
    for d in out:
        d["depth"] = dist.get(d["id"])
    json.dump(out, open(OUT, "w"), ensure_ascii=False, separators=(",", ":"))
    print(f"wrote {OUT}: {len(out)} decls, {sum(1 for d in out if d['depth'] is not None)} reachable from main",
          file=sys.stderr)

if __name__ == "__main__":
    main()
