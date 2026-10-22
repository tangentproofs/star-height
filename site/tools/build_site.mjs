#!/usr/bin/env node
// Validate site/nodes/*.md against schema + decls.json, then build site/dist/.
//   node tools/build_site.mjs          # validate + build
//   node tools/build_site.mjs --check  # validate only (CI on PRs)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { marked } from "marked";
import Ajv2020 from "ajv/dist/2020.js";

const SITE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const checkOnly = process.argv.includes("--check");
const decls = JSON.parse(fs.readFileSync(path.join(SITE, "data/decls.json"), "utf8"));
const byId = new Map(decls.map((d) => [d.id, d]));
const schema = JSON.parse(fs.readFileSync(path.join(SITE, "schema/node.schema.json"), "utf8"));
const validate = new Ajv2020({ allErrors: true, strict: false }).compile(schema);

const errors = [];
const err = (file, msg) => errors.push(`${file}: ${msg}`);
const nodes = {};

for (const f of fs.readdirSync(path.join(SITE, "nodes")).filter((f) => f.endsWith(".md")).sort()) {
  const src = fs.readFileSync(path.join(SITE, "nodes", f), "utf8");
  const m = src.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) { err(f, "missing YAML frontmatter delimited by '---' lines"); continue; }
  let fm;
  try { fm = yaml.load(m[1]); } catch (e) { err(f, "YAML: " + e.message); continue; }
  const body = m[2];
  if (!validate(fm)) {
    for (const e of validate.errors) err(f, `schema ${e.instancePath || "/"} ${e.message}`);
    continue;
  }
  if (fm.id + ".md" !== f) err(f, `id '${fm.id}' must match the file name`);
  if (!byId.has(fm.id)) err(f, `id '${fm.id}' is not a declaration in data/decls.json`);
  if (!/^## Plain English\s*$/m.test(body)) err(f, "body needs a '## Plain English' section");
  fm.quiz.forEach((q, i) => {
    const where = `quiz[${i}]`;
    if (q.type === "choice") {
      if (!Array.isArray(q.choices)) err(f, `${where}: choice question needs 'choices'`);
      else if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.choices.length)
        err(f, `${where}: answer must be a valid 0-based index into choices`);
    } else if (q.type === "number") {
      if (typeof q.answer !== "number") err(f, `${where}: number question needs a numeric answer`);
    } else if (q.type === "text") {
      if (!Array.isArray(q.answer)) err(f, `${where}: text question needs a list of accepted answers`);
    }
  });
  const md = (s) => marked.parse(s);
  const mdInline = (s) => marked.parseInline(s);
  nodes[fm.id] = {
    ...fm,
    summaryHtml: mdInline(fm.summary),
    bodyHtml: md(body),
    caveatsHtml: (fm.caveats || []).map(mdInline),
    quiz: fm.quiz.map((q) => ({
      ...q,
      qHtml: md(q.q),
      choicesHtml: q.choices ? q.choices.map(mdInline) : undefined,
      explainHtml: md(q.explain),
    })),
  };
}

// Every explained node's meaning-dependencies should be explained too, otherwise
// the reader can never mark it "understood". Warn (not fail) so stubs can land first.
const warnings = [];
for (const id of Object.keys(nodes)) {
  for (const dep of byId.get(id)?.meaningDeps || [])
    if (!nodes[dep]) warnings.push(`${id}.md: meaning-dependency '${dep}' has no explainer yet`);
}

for (const w of warnings) console.warn("warning:", w);
if (errors.length) {
  for (const e of errors) console.error("error:", e);
  console.error(`\n${errors.length} error(s). See CONTRIBUTING.md for the node format.`);
  process.exit(1);
}
console.log(`ok: ${Object.keys(nodes).length} explainer nodes, ${decls.length} declarations`);
if (checkOnly) process.exit(0);

// ---- build dist/ ----
const DIST = path.join(SITE, "dist");
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(path.join(DIST, "data"), { recursive: true });
fs.cpSync(path.join(SITE, "assets"), path.join(DIST, "assets"), { recursive: true });
fs.copyFileSync(path.join(SITE, "index.html"), path.join(DIST, "index.html"));
fs.copyFileSync(path.join(SITE, "data/decls.json"), path.join(DIST, "data/decls.json"));
fs.writeFileSync(path.join(DIST, "data/nodes.json"), JSON.stringify(nodes));
// Machine-readable work list for agents.
const reachable = decls.filter((d) => d.depth !== null);
const todo = reachable
  .filter((d) => !nodes[d.id])
  .map((d) => ({ id: d.id, kind: d.kind, depth: d.depth, file: d.file, line: d.line,
    meaningDeps: d.meaningDeps, explainedDeps: d.meaningDeps.filter((x) => nodes[x]).length }))
  .sort((a, b) => a.depth - b.depth || a.id.localeCompare(b.id));
fs.writeFileSync(path.join(DIST, "data/needs-explainer.json"), JSON.stringify(todo, null, 1));
fs.copyFileSync(path.join(SITE, "schema/node.schema.json"), path.join(DIST, "data/node.schema.json"));
fs.writeFileSync(path.join(DIST, ".nojekyll"), "");
console.log(`built ${DIST}`);
