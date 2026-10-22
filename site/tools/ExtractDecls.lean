/-
  Dump every declaration of the OAI.Computability.StarHeight.* modules as JSON:
  name, kind, module, source range, and the project-local constants used by its
  type (statement) and by its value (proof / body).

  Usage (from the repo root, after `lake build`):
    lake env lean site/tools/ExtractDecls.lean   # writes site/data/decls.raw.json
-/
import OAI.Computability.StarHeight.Main
open Lean Meta

def projPrefix : Name := `OAI.Computability.StarHeight

def isProjModule (env : Environment) (n : Name) : Option Name := do
  let idx ← env.getModuleIdxFor? n
  let m := env.header.moduleNames[idx.toNat]!
  if projPrefix.isPrefixOf m then some m else none

def kindOf : ConstantInfo → String
  | .axiomInfo _ => "axiom" | .defnInfo _ => "def" | .thmInfo _ => "theorem"
  | .opaqueInfo _ => "opaque" | .quotInfo _ => "quot" | .inductInfo _ => "inductive"
  | .ctorInfo _ => "constructor" | .recInfo _ => "recursor"

/-- Generated helper constants we fold into their parent. -/
def isGenerated (env : Environment) (n : Name) : Bool :=
  n.isInternalDetail || isAuxRecursor env n || isNoConfusion env n ||
  (match n with
   | .str _ s => s.startsWith "match_" || s.startsWith "proof_" || s.startsWith "eq_" ||
       s == "eq_def" || s == "injEq" || s == "inj" || s == "sizeOf_spec" || s == "ctorIdx" ||
       s == "noConfusionType" || s.startsWith "_" || s == "rec" || s == "ext_iff" ||
       s.startsWith "ctorElim" || s == "elim"
   | _ => false) ||
  (env.find? n |>.map (fun c => c matches .recInfo _ | .ctorInfo _) |>.getD false)

/-- Map a generated constant to the user-facing declaration it belongs to. -/
partial def canon (env : Environment) (n : Name) : Name :=
  if !isGenerated env n then n
  else match env.find? n with
    | some (.ctorInfo c) => c.induct
    | some (.recInfo _) => canon env n.getPrefix
    | _ => if n.getPrefix.isAnonymous then n else canon env n.getPrefix

def jsonStrs (xs : Array Name) : Json := Json.arr (xs.map (fun n => Json.str n.toString))

def extract : CoreM Json := do
  let env ← getEnv
  let mut rows : Array Json := #[]
  for (n, ci) in env.constants.toList do
    let some m := isProjModule env n | continue
    if isGenerated env n then continue
    let some rng ← findDeclarationRanges? n | continue
    let collect (e : Expr) : Array Name := Id.run do
      let mut acc : Std.HashSet Name := {}
      for c in e.getUsedConstants do
        let c' := canon env c
        if c' != n && (isProjModule env c').isSome then acc := acc.insert c'
      return acc.toArray.qsort (·.toString < ·.toString)
    let ext (e : Expr) : Array Name := Id.run do
      let mut acc : Std.HashSet Name := {}
      for c in e.getUsedConstants do
        let c' := canon env c
        if (isProjModule env c').isNone && !c'.isInternalDetail then acc := acc.insert c'
      return acc.toArray.qsort (·.toString < ·.toString)
    let tyDeps := collect ci.type
    let valDeps := match ci.value? (allowOpaque := true) with
      | some v => collect v | none => #[]
    let ctorDeps : Array Name := match ci with
      | .inductInfo i => i.ctors.foldl (fun acc c =>
          match env.find? c with | some cc => acc ++ collect cc.type | none => acc) #[]
      | _ => #[]
    let isInst := (Meta.instanceExtension.getState env).instanceNames.contains n
    rows := rows.push <| Json.mkObj [
      ("name", Json.str n.toString),
      ("kind", Json.str (if isInst then "instance" else kindOf ci)),
      ("module", Json.str m.toString),
      ("line", Json.num rng.range.pos.line),
      ("endLine", Json.num rng.range.endPos.line),
      ("typeDeps", jsonStrs ((tyDeps ++ ctorDeps).toList.eraseDups.toArray.filter (· != n))),
      ("valueDeps", jsonStrs valDeps),
      ("mathlib", jsonStrs (ext ci.type))]
  return Json.arr rows

#eval show CoreM Unit from do
  let out ← extract
  IO.FS.writeFile "site/data/decls.raw.json" out.compress
