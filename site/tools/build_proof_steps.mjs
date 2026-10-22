#!/usr/bin/env node
// Proof view data: site/proofs/<id>.yml (hand-written segmentation + English) → data/proofs.json.
// The Lean text of every segment is copied VERBATIM from the source file; nothing in the YAML
// repeats it. Checks (any failure exits non-zero):
//   - the segments tile the proof body exactly: first segment starts on the line after the one that
//     ends the statement with `:= by`, each next one starts right after the previous, the last ends
//     at the declaration's last line (data/decls.json) — no gaps, overlaps or stray lines;
//   - `src` is explainer | draft | comment, titles are non-empty, `uses` are real declarations;
//   - with --check: data/proofs.json is exactly what the sources produce now (no drift).
//   node tools/build_proof_steps.mjs          # regenerate data/proofs.json
//   node tools/build_proof_steps.mjs --check  # verify only (npm test / CI)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

export const SRC_KINDS = ["explainer", "draft", "comment"];

/** Pure: segment one proof. `fileLines` = the Lean file split on "\n"; `decl` from decls.json;
 *  `spec` the parsed YAML; `known(id)` says whether an id is a declaration. → { proof, errors }. */
export function segmentProof(fileLines, decl, spec, known = () => true) {
  const errors = [];
  const e = (m) => errors.push(`${spec.id}: ${m}`);
  let stmtEnd = -1;
  for (let l = decl.line; l <= decl.endLine; l++) if (/:=\s*by\s*$/.test(fileLines[l - 1] ?? "")) { stmtEnd = l; break; }
  if (stmtEnd < 0) { e(`no line ending in ':= by' between lines ${decl.line} and ${decl.endLine} (tactic proofs only)`); return { proof: null, errors }; }
  const from = stmtEnd + 1, to = decl.endLine;
  let next = from;
  const segments = (spec.segments || []).map((s, k) => {
    const where = `segment ${k + 1}`;
    const [a, b] = Array.isArray(s.lines) ? s.lines : [];
    if (!Number.isInteger(a) || !Number.isInteger(b) || b < a) e(`${where}: lines must be [first, last] with first ≤ last`);
    else if (a !== next) e(`${where}: starts at line ${a}, expected ${next} (${a > next ? "gap" : "overlap"})`);
    if (Number.isInteger(b)) next = b + 1;
    if (!SRC_KINDS.includes(s.src)) e(`${where}: src must be one of ${SRC_KINDS.join(", ")}`);
    if (!s.title || !String(s.title).trim()) e(`${where}: empty title`);
    for (const u of s.uses || []) if (!known(u)) e(`${where}: uses '${u}', which is not a declaration`);
    const seg = { from: a, to: b, title: s.title, src: s.src, lean: fileLines.slice(a - 1, b).join("\n") };
    if (s.note) seg.note = s.note;
    if (s.uses?.length) seg.uses = s.uses;
    if (s.hard) seg.hard = true;
    return seg;
  });
  if (!segments.length) e("no segments");
  else if (next !== to + 1) e(`segments end at line ${next - 1}, the proof ends at line ${to}`);
  return { proof: { id: spec.id, file: decl.file, from, to, segments }, errors };
}

/** Build every proof from site/proofs/*.yml. → { proofs, errors } */
export function buildAll(site) {
  const repo = path.dirname(site);
  const decls = JSON.parse(fs.readFileSync(path.join(site, "data/decls.json"), "utf8"));
  const byId = new Map(decls.map((d) => [d.id, d]));
  const proofs = {}, errors = [];
  const dir = path.join(site, "proofs");
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".yml")).sort() : []) {
    const spec = yaml.load(fs.readFileSync(path.join(dir, f), "utf8"));
    if (`${spec?.id}.yml` !== f) { errors.push(`${f}: id must match the file name`); continue; }
    const decl = byId.get(spec.id);
    if (!decl) { errors.push(`${f}: '${spec.id}' is not a declaration`); continue; }
    const lines = fs.readFileSync(path.join(repo, decl.file), "utf8").split("\n");
    const r = segmentProof(lines, decl, spec, (id) => byId.has(id));
    errors.push(...r.errors);
    if (r.proof) proofs[spec.id] = r.proof;
  }
  return { proofs, errors };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const SITE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  const OUT = path.join(SITE, "data/proofs.json");
  const { proofs, errors } = buildAll(SITE);
  if (errors.length) { console.error(errors.map((x) => "error: " + x).join("\n")); process.exit(1); }
  const text = JSON.stringify(proofs, null, 1) + "\n";
  if (process.argv.includes("--check")) {
    if (!fs.existsSync(OUT) || fs.readFileSync(OUT, "utf8") !== text) {
      console.error("error: data/proofs.json is out of date with site/proofs/*.yml or the Lean sources; run node site/tools/build_proof_steps.mjs");
      process.exit(1);
    }
  } else fs.writeFileSync(OUT, text);
  console.log(`ok: ${Object.keys(proofs).length} proofs, ${Object.values(proofs).reduce((n, p) => n + p.segments.length, 0)} segments`);
}
