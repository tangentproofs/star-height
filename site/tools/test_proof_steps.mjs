// Tests for the proof view: the segment generator's checks (tools/build_proof_steps.mjs), the
// committed data/proofs.json against the Lean sources, and the pure helpers of assets/proofview.js
// and assets/source.js.  node tools/test_proof_steps.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import yaml from "js-yaml";
import { segmentProof, buildAll } from "./build_proof_steps.mjs";
import { pickMode, foldLean } from "../assets/proofview.js";
import { sourceUrl, githubSourceUrl, sourceUrlFor, sourceLabel } from "../assets/source.js";

const SITE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
let n = 0;
const t = (name, f) => { try { f(); n++; } catch (e) { console.error(`FAIL ${name}\n`, e); process.exit(1); } };

// A synthetic 8-line file: statement on lines 2-3, body 4-7, line 8 after the declaration.
const FILE = ["-- header", "theorem foo (x : Nat) :", "    x = x := by", "  have h : True := trivial", "  clear h", "  -- done", "  rfl", ""];
const DECL = { id: "foo", file: "F.lean", line: 2, endLine: 7 };
const seg = (a, b, extra = {}) => ({ lines: [a, b], src: "draft", title: "t", ...extra });
const run = (segments, known) => segmentProof(FILE, DECL, { id: "foo", segments }, known);

t("a tiling is accepted and the Lean is copied verbatim", () => {
  const r = run([seg(4, 5), seg(6, 7, { src: "explainer", uses: ["bar"], hard: true })]);
  assert.deepEqual(r.errors, []);
  assert.equal(r.proof.from, 4); assert.equal(r.proof.to, 7);
  assert.equal(r.proof.segments[0].lean, "  have h : True := trivial\n  clear h");
  assert.equal(r.proof.segments[1].lean, "  -- done\n  rfl");
  assert.equal(r.proof.segments[1].hard, true);
});
t("gap is an error", () => assert.match(run([seg(4, 4), seg(6, 7)]).errors.join(), /starts at line 6, expected 5 \(gap\)/));
t("overlap is an error", () => assert.match(run([seg(4, 5), seg(5, 7)]).errors.join(), /expected 6 \(overlap\)/));
t("a body line before the first segment is an error", () => assert.match(run([seg(5, 7)]).errors.join(), /gap/));
t("statement lines are not part of the body", () => assert.match(run([seg(3, 7)]).errors.join(), /overlap/));
t("stopping short of the end is an error", () => assert.match(run([seg(4, 6)]).errors.join(), /end at line 6, the proof ends at line 7/));
t("running past the declaration is an error", () => assert.match(run([seg(4, 8)]).errors.join(), /end at line 8/));
t("reversed range is an error", () => assert.match(run([seg(5, 4)]).errors.join(), /first ≤ last/));
t("unknown src kind is an error", () => assert.match(run([seg(4, 7, { src: "reviewed" })]).errors.join(), /src must be/));
t("unknown uses id is an error", () => assert.match(run([seg(4, 7, { uses: ["nope"] })], (id) => id === "bar").errors.join(), /uses 'nope'/));
t("empty title is an error", () => assert.match(run([seg(4, 7, { title: " " })]).errors.join(), /empty title/));
t("term-mode proofs are rejected", () => assert.match(segmentProof(["theorem x : True :=", "  trivial"], { id: "x", line: 1, endLine: 2 }, { id: "x", segments: [] }).errors.join(), /:= by/));

// ---- the real data
const { proofs, errors } = buildAll(SITE);
const decls = JSON.parse(fs.readFileSync(path.join(SITE, "data/decls.json"), "utf8"));
const byId = new Map(decls.map((d) => [d.id, d]));
t("all site/proofs/*.yml pass the checks", () => assert.deepEqual(errors, []));
t("committed data/proofs.json matches the sources (no drift)", () =>
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(SITE, "data/proofs.json"), "utf8")), JSON.parse(JSON.stringify(proofs))));
t("every segment is the source text of its lines", () => {
  for (const p of Object.values(proofs)) {
    const lines = fs.readFileSync(path.join(SITE, "..", p.file), "utf8").split("\n");
    for (const s of p.segments) assert.equal(s.lean, lines.slice(s.from - 1, s.to).join("\n"), `${p.id} L${s.from}`);
    assert.equal(p.to, byId.get(p.id).endLine);
  }
});
t("main and recognized_height_three have proof views", () => {
  for (const id of ["main", "FiniteRecognition.recognized_height_three"]) assert.ok(proofs[id], id);
});
t("recognized_height_three uses the source text (explicit Pi.Function.module, not a paraphrase)", () =>
  assert.match(proofs["FiniteRecognition.recognized_height_three"].segments[0].lean, /@SourceSchedule\.episode_linear_graphs[\s\S]*Pi\.Function\.module/));
t("a node with a proof view has no proof-outline walkthrough (the proof view replaces it)", () => {
  for (const id of Object.keys(proofs)) {
    const f = path.join(SITE, "nodes", `${id}.md`);
    if (!fs.existsSync(f)) continue;
    const fm = yaml.load(fs.readFileSync(f, "utf8").split(/^---$/m)[1]);
    for (const w of fm.widgets || []) assert.ok(!(w.type === "walkthrough" && /proof outline/i.test(w.title || "")), id);
  }
});
t("no node keeps a proof-outline walkthrough without a proof view", () => {
  for (const f of fs.readdirSync(path.join(SITE, "nodes")).filter((f) => f.endsWith(".md"))) {
    const fm = yaml.load(fs.readFileSync(path.join(SITE, "nodes", f), "utf8").split(/^---$/m)[1]);
    for (const w of fm.widgets || []) if (w.type === "walkthrough" && /proof outline/i.test(w.title || "")) assert.ok(proofs[fm.id], `${fm.id} has a proof-outline walkthrough; add site/proofs/${fm.id}.yml`);
  }
});
t("generator --check passes", () => execFileSync(process.execPath, [path.join(SITE, "tools/build_proof_steps.mjs"), "--check"], { stdio: "pipe" }));

// ---- proofview.js / source.js helpers
t("default mode: panes on wide screens, outline on narrow", () => {
  assert.equal(pickMode(null, false), "panes");
  assert.equal(pickMode({}, true), "outline");
});
t("stored mode is remembered per screen class; junk is ignored", () => {
  assert.equal(pickMode({ wide: "outline" }, false), "outline");
  assert.equal(pickMode({ wide: "panes" }, true), "outline"); // narrow keeps its own default
  assert.equal(pickMode({ narrow: "panes" }, true), "panes");
  assert.equal(pickMode({ wide: "bogus" }, false), "panes");
  assert.equal(pickMode("panes", false), "panes");
});
t("foldLean keeps the first line and counts the rest", () => {
  assert.deepEqual(foldLean("a\nb\nc"), { first: "a", more: 2 });
  assert.deepEqual(foldLean("a"), { first: "a", more: 0 });
});
t("sourceUrl is the single source-line URL helper", () => {
  assert.equal(githubSourceUrl("A/B.lean", 3, 9), "https://github.com/tangentproofs/star-height/blob/main/A/B.lean#L3-L9");
  assert.equal(githubSourceUrl("A/B.lean", 4, 4), "https://github.com/tangentproofs/star-height/blob/main/A/B.lean#L4");
  // Reader-facing links go on-site (CONVENTIONS §7); GitHub stays the secondary link.
  assert.equal(sourceUrl("A/B.lean", 3, 9), "src/A/B.lean.html#L3-L9");
  assert.equal(sourceUrl("A/B.lean", 4, 4), "src/A/B.lean.html#L4");
  assert.equal(sourceUrl("A/B.lean"), "src/A/B.lean.html");
  assert.equal(sourceUrl("A/B.lean", 3, 9, "../../"), "../../src/A/B.lean.html#L3-L9");
  assert.equal(sourceUrlFor(null, "A/B.lean", 3, 9), "https://github.com/tangentproofs/star-height/blob/main/A/B.lean#L3-L9");
  assert.equal(sourceLabel("A/B.lean", 9, 28), "B.lean lines 9–28");
  assert.equal(sourceLabel("A/B.lean", 9, 9), "B.lean line 9");
  // No hand-built source URLs anywhere else: every link goes through assets/source.js.
  const files = ["assets/app.js", "assets/proofview.js", "assets/walkthrough.js", "assets/widgets.js", "assets/lean.js", "tools/srcrefs.mjs", "tools/build_source.mjs"];
  for (const f of files) {
    const code = fs.readFileSync(path.join(SITE, f), "utf8");
    assert.ok(!/BLOB|blob\/main\/[^"`]*\.lean|#L\$\{|src\/\$\{/.test(code), `${f}: build source-line links with assets/source.js, not by hand`);
  }
  assert.ok(!fs.existsSync(path.join(SITE, "assets/srclink.js")), "one source-link helper: assets/source.js");
});
console.log(`ok: ${n} proof-view tests`);
