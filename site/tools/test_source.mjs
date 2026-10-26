#!/usr/bin/env node
// Checks the browsable source pages in dist/src (run after `npm run build`):
//  1. every declaration's on-site source link (the one node pages, the start page and the node list
//     use, assets/source.js) resolves to an existing rendered anchor, and the range contains the
//     declaration's name;
//  2. every declaration's line has a badge back to its node page (two-way);
//  3. every src/ link in the node content (text, quiz, widget titles, walkthrough steps) resolves,
//     and a walkthrough step's range contains its Lean; so does every proof-view step (data/proofs.json);
//  4. every identifier link inside the rendered pages that points at another page resolves, and the
//     target range contains the name it was linked from;
//  5. data/xref.json is fresh (its hashes match the .lean sources) and its references line up with
//     the source text;
//  6. the srcrefs linkifier and the snippet locator behave on small cases.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { sourceUrl } from "../assets/source.js";
import { linkSourceRefs } from "./srcrefs.mjs";
import { locateSnippet, sourceFiles } from "./build_source.mjs";

const SITE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const REPO = path.dirname(SITE);
const DIST = path.join(SITE, "dist");
const decls = JSON.parse(fs.readFileSync(path.join(SITE, "data/decls.json"), "utf8"));
const nodes = JSON.parse(fs.readFileSync(path.join(DIST, "data/nodes.json"), "utf8"));
let fails = 0, checks = 0;
const fail = (m) => { fails++; if (fails <= 40) console.error("FAIL:", m); };

// ---- unit checks
{
  const files = ["OAI/X/Main.lean", "OAI/X/Height.lean", "Check.lean"];
  const lines = () => Array(30).fill("x");
  assert.equal(linkSourceRefs("see <code>Height.lean</code>.", files),
    'see <a class="srcref" href="src/OAI/X/Height.lean.html" title="OAI/X/Height.lean (rendered source)"><code>Height.lean</code></a>.');
  assert.match(linkSourceRefs("Proof outline (Main.lean, lines 10-28)", files, lines), /href="src\/OAI\/X\/Main\.lean\.html#L10-L28"/);
  assert.match(linkSourceRefs("Main.lean lines 9–28", files, lines), /#L9-L28"/);
  assert.equal(linkSourceRefs('<a href="x">Main.lean</a>', files), '<a href="x">Main.lean</a>');
  assert.equal(linkSourceRefs("Other.lean", files), "Other.lean");
  let e = null; linkSourceRefs("Main.lean lines 10-99", files, lines, (m) => (e = m)); assert.ok(e, "out-of-range is an error");
  const src = ["theorem t :", "    P := by", "  classical", "  · let : X := h", "    apply foo", "    exact bar"];
  assert.deepEqual(locateSnippet(src, "classical\nlet : X := h"), { line: 3, endLine: 4 });
  assert.deepEqual(locateSnippet(src, "classical apply foo exact bar"), { line: 3, endLine: 6 }); // skips a line, YAML-folded
  assert.deepEqual(locateSnippet(src, "apply foo"), { line: 5, endLine: 5 });
  assert.equal(locateSnippet(src, "nothing like it"), null);
  checks += 10;
}

// ---- load rendered pages
const files = sourceFiles(REPO);
const pages = new Map(); // file -> { html, ids:Set, lineText: Map(n -> text) }
const strip = (h) => h.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
function page(file) {
  if (pages.has(file)) return pages.get(file);
  const p = path.join(DIST, "src", file + ".html");
  if (!fs.existsSync(p)) { pages.set(file, null); return null; }
  const html = fs.readFileSync(p, "utf8");
  const lineText = new Map();
  for (const m of html.matchAll(/<div class="sl" id="L(\d+)">([\s\S]*?)<\/div>/g)) {
    lineText.set(+m[1], strip(m[2].replace(/<a class="nb[\s\S]*?<\/a>/g, "")));
  }
  const pg = { html, lineText };
  pages.set(file, pg);
  return pg;
}
assert.ok(fs.existsSync(path.join(DIST, "src/index.html")), "dist/src/index.html exists (run npm run build first)");
for (const f of files) if (!page(f)) fail(`no rendered page for ${f}`);

/** Resolve "src/<file>.html#La-Lb" (relative to the site root) to {file, a, b}; checks the anchors. */
function resolve(href, where) {
  checks++;
  const m = href.match(/^src\/(.+?\.lean)\.html(?:#L(\d+)(?:-L(\d+))?)?$/);
  if (!m) { fail(`${where}: not a source link: ${href}`); return null; }
  const [, file, a, b] = m;
  const pg = page(file);
  if (!pg) { fail(`${where}: ${href}: no such rendered file`); return null; }
  if (!a) return { file, pg };
  const lo = +a, hi = b ? +b : lo;
  if (!pg.lineText.has(lo) || !pg.lineText.has(hi)) { fail(`${where}: ${href}: anchor L${lo}/L${hi} missing (file has ${pg.lineText.size} lines)`); return null; }
  let text = "";
  for (let k = lo; k <= hi; k++) text += pg.lineText.get(k) + "\n";
  return { file, pg, lo, hi, text };
}

// 1 + 2: every declaration
for (const d of decls) {
  const r = resolve(sourceUrl(d.file, d.line, d.endLine), `decl ${d.id}`);
  if (!r) continue;
  const last = d.name.split(".").pop();
  // Lean-generated names (parent projections from `extends`, `deriving` instances, `@[ext]` lemmas)
  // live on the declaration that generates them; accept that.
  const ok = r.text.includes(last) || (d.kind === "instance" && /\b(instance|deriving)\b/.test(r.text))
    || (/^to[A-Z]/.test(last) && /\bextends\b/.test(r.text)) || (last.endsWith("_iff") && r.text.includes(last.slice(0, -4)) && /@\[ext\]/.test(r.text));
  checks++;
  if (!ok) fail(`decl ${d.id}: ${d.file} lines ${d.line}-${d.endLine} do not contain '${last}'`);
  const lineHtml = r.pg.html.match(new RegExp(`<div class="sl" id="L${d.line}">[\\s\\S]*?</div>`))?.[0] || "";
  checks++;
  if (!lineHtml.includes(`href="${"../".repeat(d.file.split("/").length)}index.html#/node/${encodeURIComponent(d.id)}"`))
    fail(`decl ${d.id}: no node badge on ${d.file} line ${d.line}`);
}

// 3: links in node content
let contentLinks = 0;
for (const [id, n] of Object.entries(nodes)) {
  const blobs = [n.summaryHtml, n.bodyHtml, ...n.caveatsHtml, ...n.quiz.flatMap((q) => [q.qHtml, q.explainHtml, ...(q.choicesHtml || [])]),
    ...(n.widgets || []).map((w) => w.titleHtml || "")];
  for (const b of blobs) for (const m of (b || "").matchAll(/href="(src\/[^"]+)"/g)) { contentLinks++; resolve(m[1], `node ${id}`); }
  for (const w of n.widgets || []) for (const [k, st] of (w.config?.steps || []).entries()) {
    if (!st.src) continue;
    contentLinks++;
    const r = resolve(sourceUrl(st.src.file, st.src.line, st.src.endLine), `node ${id} walkthrough step ${k + 1}`);
    if (!r || st.src.approx) continue;
    const norm = (x) => x.replace(/[·\s]+/g, "");
    checks++;
    const L = norm(st.lean), T = norm(r.text); // the step may leave out a line or two in the middle
    if (!(T.includes(L) || (T.startsWith(L.slice(0, 15)) && T.endsWith(L.slice(-10))))) fail(`node ${id} step ${k + 1}: lines ${r.lo}-${r.hi} do not contain its Lean`);
  }
}

// 3b: proof-view steps (data/proofs.json): each step's line link and the whole-proof link resolve on-site,
// and the rendered lines contain the step's verbatim Lean.
let proofLinks = 0;
const proofs = JSON.parse(fs.readFileSync(path.join(DIST, "data/proofs.json"), "utf8"));
for (const [id, p] of Object.entries(proofs)) {
  proofLinks++; resolve(sourceUrl(p.file, p.from, p.to), `proof ${id}`);
  for (const [k, sg] of p.segments.entries()) {
    proofLinks++;
    const r = resolve(sourceUrl(p.file, sg.from, sg.to), `proof ${id} step ${k + 1}`);
    if (!r) continue;
    const norm = (x) => x.replace(/\s+/g, "");
    checks++;
    if (!norm(r.text).includes(norm(sg.lean))) fail(`proof ${id} step ${k + 1}: rendered lines ${r.lo}-${r.hi} do not contain its Lean`);
  }
}

// 4: identifier links between rendered pages
let idLinks = 0;
for (const f of files) {
  const pg = page(f);
  if (!pg) continue;
  const depth = f.split("/").length;
  for (const m of pg.html.matchAll(/<a class="ref" href="([^"]+)" title="([^"]+?) \(/g)) {
    idLinks++;
    let href = m[1];
    const nm = m[2].split(".").pop();
    if (href.startsWith("#")) href = `src/${f}.html${href}`;
    else if (href.startsWith("../".repeat(depth))) href = href.slice(3 * depth);
    else { fail(`${f}: unexpected identifier href ${href}`); continue; }
    const r = resolve(href, `${f} identifier ${m[2]}`);
    if (r && r.text != null) { checks++; if (!r.text.includes(nm)) fail(`${f}: link for ${m[2]} -> ${href} does not contain '${nm}'`); }
  }
}

// 5: xref freshness and alignment
const xref = JSON.parse(fs.readFileSync(path.join(SITE, "data/xref.json"), "utf8"));
let aligned = 0, total = 0;
for (const [f, fx] of Object.entries(xref.files)) {
  const buf = fs.readFileSync(path.join(REPO, f));
  checks++;
  if (crypto.createHash("sha256").update(buf).digest("hex") !== fx.sha256) { fail(`data/xref.json is stale for ${f}: run 'lake build && python3 site/tools/build_xref.py'`); continue; }
  const lines = buf.toString("utf8").split("\n");
  for (const [l0, c0, c1, ni] of fx.refs) {
    // Notation (ℕ, `.1`, ⟨…⟩) also resolves to constants; check the identifier-shaped ranges.
    const t = lines[l0].slice(c0, c1);
    if (!/^[A-Za-z_][A-Za-z0-9_'.]*$/.test(t)) continue;
    total++;
    if (t.includes(xref.names[ni].split(".").pop())) aligned++;
  }
}
for (const f of files) if (!f.startsWith("Check") && !xref.files[f]) fail(`data/xref.json has no entry for ${f}`);
checks++;
if (aligned / total < 0.99) fail(`only ${aligned}/${total} xref ranges line up with the source text`);

console.log(`test_source: ${checks} checks, ${decls.length} declarations, ${contentLinks} links in node content, ${proofLinks} proof-view links, ${idLinks} project identifier links, xref ${aligned}/${total} aligned`);
if (fails) { console.error(`${fails} failure(s)`); process.exit(1); }
console.log("ok");
