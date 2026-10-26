#!/usr/bin/env python3
"""Extract identifier cross-references for the browsable source pages from Lean's .ilean files.

    lake build                       # once, at the repo root (any build that produced .lake/build/lib/lean)
    python3 site/tools/build_xref.py # writes site/data/xref.json (committed)

Lean writes one .ilean per module: every constant each module *uses* (with its exact source range and
the module that defines it) plus the range of every declaration it *defines*. That is exact name
resolution (no guessing through `open` / namespaces / dot notation), and lets CI render the source
pages without building Lean, the same way data/decls.raw.json lets it build the node pages.

Output (positions are 0-based line, column in UTF-16 code units, as in the .ilean / LSP):
    { "version": 1,
      "names": ["Mathlib…", …],                  # interned constant names
      "mods":  ["Mathlib.Data.Set.Finite.Basic", …],
      "files": { "OAI/…/Main.lean": {
          "sha256": "…",                         # of the .lean source the .ilean was built from
          "decls": [[nameIx, line0, endLine0], …],   # declarations defined in the file
          "refs":  [[line0, col, endCol, nameIx, modIx], …] } } }
Local variables (fvars) are dropped. Only single-line references are kept (all of them, in practice).
"""
import hashlib, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LIB = os.path.join(ROOT, ".lake/build/lib/lean")
OUT = os.path.join(ROOT, "site/data/xref.json")


def main():
    if not os.path.isdir(LIB):
        sys.exit(f"error: {LIB} not found; run `lake build` at the repo root first")
    names, mods, ni, mi = [], [], {}, {}
    def nix(n):
        if n not in ni: ni[n] = len(names); names.append(n)
        return ni[n]
    def mix(m):
        if m not in mi: mi[m] = len(mods); mods.append(m)
        return mi[m]
    files = {}
    for dp, _, fs in os.walk(LIB):
        for f in sorted(fs):
            if not f.endswith(".ilean"): continue
            il = json.load(open(os.path.join(dp, f), encoding="utf-8"))
            rel = il["module"].replace(".", "/") + ".lean"
            src = os.path.join(ROOT, rel)
            if not os.path.exists(src):
                continue  # a dependency, not this repo's source
            refs = []
            for key, info in il["references"].items():
                k = json.loads(key)
                if "c" not in k: continue
                c = k["c"]
                for u in info.get("usages") or []:
                    if u[0] != u[2]: continue
                    refs.append([u[0], u[1], u[3], nix(c["n"]), mix(c["m"])])
            refs.sort()
            decls = sorted([nix(n), r[0], r[2]] for n, r in il.get("decls", {}).items())
            decls.sort(key=lambda d: (d[1], d[0]))
            files[rel] = {
                "sha256": hashlib.sha256(open(src, "rb").read()).hexdigest(),
                "decls": decls, "refs": refs,
            }
    out = {"version": 1, "names": names, "mods": mods, "files": dict(sorted(files.items()))}
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(out, fh, separators=(",", ":"), ensure_ascii=False)
        fh.write("\n")
    nrefs = sum(len(v["refs"]) for v in files.values())
    print(f"wrote {OUT}: {len(files)} files, {nrefs} references, {len(names)} names "
          f"({os.path.getsize(OUT) // 1024} KiB)")


if __name__ == "__main__":
    main()
