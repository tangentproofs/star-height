import { highlight, linkMap } from "./lean.js";
import { mountWidget } from "./widgets.js";

const REPO = "tangentproofs/star-height";
const BLOB = `https://github.com/${REPO}/blob/main`;
const GISCUS = { repo: REPO, repoId: "R_kgDOVTDFdg", category: "Announcements", categoryId: "DIC_kwDOVTDFds4DJUY1" };
const MATHLIB_DOCS = (n) => `https://leanprover-community.github.io/mathlib4_docs/find/?pattern=${encodeURIComponent(n)}#doc`;
const app = document.getElementById("app");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const [decls, nodes] = await Promise.all([
  fetch("data/decls.json").then((r) => r.json()),
  fetch("data/nodes.json").then((r) => r.json()),
]);
const byId = new Map(decls.map((d) => [d.id, d]));
const reachable = decls.filter((d) => d.depth !== null);

// ------------------------------------------------------------------ progress
// localStorage schema v1: { v: 1, nodes: { [id]: { viewed?, quizPassed?, signedOff?, answers? } } }
const KEY = "star-height-progress-v1";
let P = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || { v: 1, nodes: {} }; } catch { return { v: 1, nodes: {} }; } })();
const save = () => localStorage.setItem(KEY, JSON.stringify(P));
const rec = (id) => (P.nodes[id] ??= {});

// signed: sign-off recorded AND the node's quiz passed (stubs have no quiz, so cannot be signed).
const signed = (id) => !!(nodes[id] && P.nodes[id]?.signedOff && P.nodes[id]?.quizPassed);
// understood: signed AND every meaning-dependency understood (Mathlib is taken as given).
const memo = new Map();
function understood(id, stack = new Set()) {
  if (memo.has(id)) return memo.get(id);
  if (stack.has(id)) return false;
  stack.add(id);
  const r = signed(id) && byId.get(id).meaningDeps.every((d) => understood(d, stack));
  stack.delete(id);
  memo.set(id, r);
  return r;
}
function status(id) {
  if (understood(id)) return "understood";
  if (signed(id)) return "signed";
  if (P.nodes[id]?.quizPassed) return "quiz";
  if (nodes[id]) return "explained";
  return "stub";
}
const STATUS_LABEL = { understood: "understood", signed: "signed off (deps pending)", quiz: "quiz passed", explained: "has explainer", stub: "needs explainer" };
const COLORS = { understood: "#a6e22e", signed: "#c3e88d", quiz: "#e6db74", explained: "#66d9ef", stub: "#75715e" };
function refresh() { memo.clear(); }

// The proof is understood when main is, and every declaration its proof uses is too.
function proofCoverage() {
  const n = reachable.filter((d) => understood(d.id)).length;
  return { n, total: reachable.length };
}

// ------------------------------------------------------------------ router
const routes = [
  [/^#?\/?$/, graphPage],
  [/^#\/node\/(.+)$/, (id) => nodePage(decodeURIComponent(id))],
  [/^#\/nodes(?:\?.*)?$/, () => listPage()],
  [/^#\/playground$/, playgroundPage],
  [/^#\/about$/, aboutPage],
];
function route() {
  refresh();
  const hsh = location.hash || "#/";
  app.className = "";
  document.querySelectorAll("header nav a").forEach((a) => a.classList.toggle("on", a.getAttribute("href") === hsh));
  for (const [re, f] of routes) { const m = hsh.match(re); if (m) { f(...m.slice(1)); window.scrollTo(0, 0); return; } }
  app.innerHTML = `<p>Not found. <a href="#/">Home</a></p>`;
}
addEventListener("hashchange", route);

// ------------------------------------------------------------------ graph page
let graphView = "spine";
function graphPage() {
  app.className = "wide";
  const cov = proofCoverage();
  const spine = Object.keys(nodes);
  const spineDone = spine.filter((id) => understood(id)).length;
  app.innerHTML = `
    <div class="graph-wrap">
      <div>
        <h1>Every regular language has generalized star height ≤ 3</h1>
        <p class="muted">The Lean proof (OpenAI, 2026) checks. The job here is different: <b>you</b> are the checker.
        A node turns green when you've signed off on its formal statement <i>and</i> on everything its statement mentions, just as Lean won't accept a statement whose ingredients it doesn't know.</p>
        <div class="toolbar">
          <button data-v="spine">Explained spine (${spine.length})</button>
          <button data-v="neighborhood">Spine + direct deps</button>
          <button data-v="files">Files (37)</button>
          <button data-v="all">All declarations (${decls.length})</button>
          <input id="find" type="text" placeholder="find a declaration…" style="max-width:16rem">
        </div>
        <div id="cy"></div>
        <p class="small muted">Click a node to open it. Solid edge = used in the statement/definition (needed to <i>understand</i> it); dashed = used only in the proof. Arrows point from a declaration to what it uses.</p>
      </div>
      <aside id="side">
        <div class="panel">
          <h3>Your progress</h3>
          <div>Spine: <b>${spineDone}</b> / ${spine.length} understood</div>
          <div class="progress-bar"><div style="width:${(100 * spineDone) / spine.length}%"></div></div>
          <div>Whole proof of <code>main</code>: <b>${cov.n}</b> / ${cov.total} declarations understood</div>
          <div class="progress-bar"><div style="width:${(100 * cov.n) / cov.total}%"></div></div>
          <p class="small muted">${understood("main") ? "You understand the <b>statement</b> of the main theorem." : `To understand the statement of <a href="#/node/main">main</a>, sign off on it and on everything it mentions.`}</p>
        </div>
        <div class="panel legend">
          <h3>Legend</h3>
          ${Object.entries(STATUS_LABEL).map(([k, v]) => `<div><span class="sw" style="background:${COLORS[k]}"></span>${v}</div>`).join("")}
          <div><span class="sw" style="background:transparent;border:2px solid #f92672"></span>main theorem</div>
        </div>
        <div class="panel small">
          <h3>Start here</h3>
          <ol>
            <li><a href="#/node/Expression">Expression</a> — what the formulas are</li>
            <li><a href="#/node/Expression.language">language</a> and <a href="#/node/Expression.height">height</a></li>
            <li><a href="#/node/HasHeightAtMost">HasHeightAtMost</a></li>
            <li><a href="#/node/main">main</a> — the theorem</li>
          </ol>
          <p><a href="#/playground">Play with expressions →</a></p>
        </div>
        <div class="panel small">
          <h3>Progress file</h3>
          <button id="export">Export</button> <button id="import">Import</button> <button id="reset">Reset</button>
          <p class="muted">Stored only in this browser (localStorage).</p>
        </div>
      </aside>
    </div>`;
  app.querySelectorAll("[data-v]").forEach((b) => {
    b.classList.toggle("on", b.dataset.v === graphView);
    b.onclick = () => { graphView = b.dataset.v; graphPage(); };
  });
  wireProgressButtons();
  drawGraph(graphView);
}

function wireProgressButtons() {
  document.getElementById("export").onclick = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(P, null, 1)], { type: "application/json" }));
    a.download = "star-height-progress.json"; a.click();
  };
  document.getElementById("import").onclick = () => {
    const i = document.createElement("input"); i.type = "file"; i.accept = ".json";
    i.onchange = async () => { try { P = JSON.parse(await i.files[0].text()); save(); route(); } catch (e) { alert("Could not read: " + e.message); } };
    i.click();
  };
  document.getElementById("reset").onclick = () => { if (confirm("Forget all sign-offs and quiz results in this browser?")) { P = { v: 1, nodes: {} }; save(); route(); } };
}

function drawGraph(view) {
  if (!window.cytoscape) { document.getElementById("cy").innerHTML = "<p class='err'>Graph library failed to load.</p>"; return; }
  if (window.cytoscapeDagre && !drawGraph.reg) { cytoscape.use(window.cytoscapeDagre); drawGraph.reg = true; }
  const els = [];
  let ids;
  if (view === "files") {
    const mods = [...new Set(decls.map((d) => d.module))];
    const modOf = new Map(decls.map((d) => [d.id, d.module]));
    const cnt = new Map(), expl = new Map(), und = new Map();
    for (const d of decls) {
      cnt.set(d.module, (cnt.get(d.module) || 0) + 1);
      if (nodes[d.id]) expl.set(d.module, (expl.get(d.module) || 0) + 1);
      if (understood(d.id)) und.set(d.module, (und.get(d.module) || 0) + 1);
    }
    for (const m of mods) {
      const u = und.get(m) || 0, c = cnt.get(m);
      const st = u === c ? "understood" : u ? "signed" : expl.get(m) ? "explained" : "stub";
      els.push({ data: { id: "m:" + m, label: `${m}\n${u}/${c}`, color: COLORS[st], size: 20 + Math.sqrt(c) * 6, file: m } });
    }
    const seen = new Set();
    for (const d of decls) for (const [deps, kind] of [[d.meaningDeps, "m"], [d.proofDeps, "p"]]) for (const x of deps) {
      const a = d.module, b = modOf.get(x);
      if (a !== b && !seen.has(a + ">" + b)) { seen.add(a + ">" + b); els.push({ data: { id: `e:${a}>${b}`, source: "m:" + a, target: "m:" + b, kind: "p" } }); }
    }
  } else {
    if (view === "spine") ids = new Set(Object.keys(nodes));
    else if (view === "neighborhood") {
      ids = new Set(Object.keys(nodes));
      for (const id of Object.keys(nodes)) for (const x of [...byId.get(id).meaningDeps, ...byId.get(id).proofDeps]) ids.add(x);
    } else ids = new Set(decls.map((d) => d.id));
    for (const id of ids) {
      const d = byId.get(id), st = status(id);
      els.push({ data: { id, label: id.split(".").pop(), color: COLORS[st], size: nodes[id] ? 26 : 12, main: id === "main" ? 1 : 0, explained: nodes[id] ? 1 : 0 } });
    }
    for (const id of ids) {
      const d = byId.get(id);
      for (const x of d.meaningDeps) if (ids.has(x)) els.push({ data: { id: `${id}>${x}`, source: id, target: x, kind: "m" } });
      for (const x of d.proofDeps) if (ids.has(x)) els.push({ data: { id: `${id}>>${x}`, source: id, target: x, kind: "p" } });
    }
  }
  const big = els.length > 1500;
  const cy = cytoscape({
    container: document.getElementById("cy"),
    elements: els,
    wheelSensitivity: 0.3,
    style: [
      { selector: "node", style: { "background-color": "data(color)", width: "data(size)", height: "data(size)", label: "data(label)", color: "#f8f8f2", "font-size": view === "all" ? 6 : 10, "text-wrap": "wrap", "text-valign": "bottom", "text-margin-y": 3, "text-outline-color": "#1e1f1c", "text-outline-width": 2 } },
      { selector: "node[explained = 0]", style: { "font-size": view === "all" ? 0 : 7, color: "#a59f85" } },
      { selector: "node[main = 1]", style: { "border-width": 3, "border-color": "#f92672", "font-weight": "bold" } },
      { selector: "edge", style: { width: 1.2, "line-color": "#5c5b4f", "target-arrow-color": "#5c5b4f", "target-arrow-shape": "triangle", "arrow-scale": 0.7, "curve-style": big ? "haystack" : "bezier", opacity: 0.8 } },
      { selector: "edge[kind = 'p']", style: { "line-style": "dashed", opacity: 0.45 } },
      { selector: ".hl", style: { "border-width": 4, "border-color": "#fd971f" } },
      { selector: ".faded", style: { opacity: 0.12 } },
    ],
    layout: view === "all" ? { name: "cose", animate: false, nodeRepulsion: 4000, idealEdgeLength: 30, numIter: 600 }
      : { name: window.cytoscapeDagre ? "dagre" : "breadthfirst", rankDir: "TB", nodeSep: 50, rankSep: 60, animate: false },
  });
  cy.on("tap", "node", (e) => {
    const id = e.target.id();
    if (id.startsWith("m:")) { location.hash = "#/nodes?file=" + id.slice(2); return; }
    location.hash = "#/node/" + encodeURIComponent(id);
  });
  cy.on("mouseover", "node", (e) => { const n = e.target; cy.elements().addClass("faded"); n.closedNeighborhood().removeClass("faded"); });
  cy.on("mouseout", "node", () => cy.elements().removeClass("faded"));
  const find = document.getElementById("find");
  find.oninput = () => {
    cy.nodes().removeClass("hl");
    const q = find.value.trim().toLowerCase();
    if (!q) return;
    const hits = cy.nodes().filter((n) => n.id().toLowerCase().includes(q));
    hits.addClass("hl");
    if (hits.length && hits.length < 30) cy.fit(hits, 60);
  };
  find.onkeydown = (e) => {
    if (e.key !== "Enter") return;
    const q = find.value.trim().toLowerCase();
    const d = decls.find((d) => d.id.toLowerCase() === q) || decls.find((d) => d.id.toLowerCase().includes(q));
    if (d) location.hash = "#/node/" + encodeURIComponent(d.id);
  };
}

// ------------------------------------------------------------------ node page
function depLinks(list) {
  if (!list.length) return `<span class="muted small">none in this project</span>`;
  return list.map((id) => `<a class="st-${status(id)}" href="#/node/${encodeURIComponent(id)}" title="${STATUS_LABEL[status(id)]}">${esc(id)}</a>`).join("");
}
function agentPrompt(d) {
  return `You are writing an informal explainer for one declaration of the Lean 4 proof in ${REPO}
(OpenAI's proof that every regular language has generalized star height ≤ 3).

Target: ${d.name}  (${d.kind})
Source: ${BLOB}/${d.file}#L${d.line}-L${d.endLine}
Section variables in scope: ${d.variables.join(" ") || "(none)"}
Formal statement:
${d.statement}

It mentions these project declarations (explain them by name, link to them): ${d.meaningDeps.join(", ") || "none"}
Its proof uses: ${d.proofDeps.join(", ") || "n/a"}

Write site/nodes/${d.id}.md following CONTRIBUTING.md and site/schema/node.schema.json:
YAML frontmatter (id, title, summary, review: draft, authors, caveats, quiz of 3–5 questions with answers and
explanations, optional widgets) and a Markdown body with a '## Plain English' section.
Be faithful to the Lean statement as written (hypotheses, quantifier order, which side is complemented, universes
if they matter). Do not import claims from the paper that the Lean does not state. List anything you are unsure
of under caveats. Run 'cd site && npm ci && npm run validate' before opening a PR.`;
}
function nodePage(id) {
  const d = byId.get(id);
  if (!d) { app.innerHTML = `<p>No declaration <code>${esc(id)}</code>. <a href="#/nodes">All nodes</a></p>`; return; }
  const n = nodes[id];
  const r = rec(id);
  if (!r.viewed) { r.viewed = Date.now(); save(); }
  const st = status(id);
  const links = linkMap([...d.meaningDeps, ...d.proofDeps, id]);
  const src = `${BLOB}/${d.file}#L${d.line}-L${d.endLine}`;
  const editUrl = n ? `https://github.com/${REPO}/edit/main/site/nodes/${encodeURIComponent(id)}.md`
    : `https://github.com/${REPO}/new/main/site/nodes?filename=${encodeURIComponent(id)}.md`;
  const pendingDeps = d.meaningDeps.filter((x) => !understood(x));
  app.innerHTML = `
    <div class="node-head">
      <p class="small"><a href="#/">← graph</a></p>
      <h1>${n ? esc(n.title) : esc(id)}</h1>
      <div><span class="pill kind-${d.kind}">${d.kind}</span><span class="pill st-${st}">${STATUS_LABEL[st]}</span>${n ? `<span class="pill ${n.review === "draft" ? "draft" : ""}">${n.review}</span>` : ""}
      <span class="name">${esc(d.name)}</span></div>
      ${n ? `<p class="eli5" style="margin:.6rem 0">${n.summaryHtml}</p>` : ""}
    </div>
    <h2>Formal statement</h2>
    <pre class="lean">${highlight(d.statement, links)}${d.truncated ? `<span class="cm"> := … (proof omitted)</span>` : ""}</pre>
    <p class="small muted"><a href="${src}" target="_blank" rel="noopener">${esc(d.file)} lines ${d.line}–${d.endLine}</a>
    ${d.variables.length ? ` · section variables in scope: <code>${esc(d.variables.join("  "))}</code>` : ""}</p>
    <div class="small">
      <div><b>Mentions</b> (understand these first): <div class="deps">${depLinks(d.meaningDeps)}</div></div>
      ${d.kind === "theorem" ? `<div><b>Proof uses</b>: <div class="deps">${depLinks(d.proofDeps)}</div></div>` : ""}
      <div><b>Used by</b>: <div class="deps">${depLinks(d.usedBy.slice(0, 40))}${d.usedBy.length > 40 ? `<span>+${d.usedBy.length - 40} more</span>` : ""}</div></div>
      ${d.mathlib.length ? `<div><b>From Mathlib</b> (taken as given): <div class="deps">${d.mathlib.map((m) => `<a href="${MATHLIB_DOCS(m)}" target="_blank" rel="noopener">${esc(m)}</a>`).join("")}</div></div>` : ""}
    </div>
    <div id="content"></div>`;
  const c = document.getElementById("content");
  if (!n) {
    c.innerHTML = `
      <div class="panel stub"><h3>Needs explainer</h3>
      <p>Nobody has written a plain-English explanation and quiz for this declaration yet, so it can't be signed off.
      <a href="${editUrl}" target="_blank" rel="noopener">Write one on GitHub</a> (see <a href="https://github.com/${REPO}/blob/main/CONTRIBUTING.md">CONTRIBUTING.md</a>).</p>
      <details><summary>Prompt for an AI agent</summary><textarea class="prompt" readonly>${esc(agentPrompt(d))}</textarea></details></div>`;
  } else {
    c.innerHTML = `
      <div class="eli5">${n.bodyHtml}</div>
      <div id="widgets"></div>
      ${n.caveatsHtml.length ? `<div class="panel caveats"><h3>Faithfulness notes</h3><ul>${n.caveatsHtml.map((x) => `<li>${x}</li>`).join("")}</ul></div>` : ""}
      <h2>Check your understanding</h2>
      <div class="panel quiz" id="quiz"></div>
      <div class="panel signoff" id="signoff"></div>
      <p class="small muted">Spotted an error or have a better explanation? <a href="${editUrl}" target="_blank" rel="noopener">Edit this node on GitHub</a>
      · <details style="display:inline"><summary>agent prompt</summary><textarea class="prompt" readonly>${esc(agentPrompt(d))}</textarea></details></p>`;
    const w = document.getElementById("widgets");
    for (const spec of n.widgets || []) mountWidget(w, spec);
    renderQuiz(id, n);
  }
  c.insertAdjacentHTML("beforeend", `<h2>Discussion</h2><div class="giscus-wrap" id="giscus"></div>`);
  mountGiscus(id);
  // pendingDeps is shown in the sign-off panel
  nodePage.pending = pendingDeps;
}

const norm = (s) => String(s).toLowerCase().replace(/\s+/g, "").replace(/[`'"]/g, "");
function renderQuiz(id, n) {
  const qz = document.getElementById("quiz");
  const r = rec(id);
  const answers = r.answers || {};
  qz.innerHTML = n.quiz.map((q, i) => {
    let input;
    if (q.type === "choice") input = q.choicesHtml.map((c, j) => `<label class="choice"><input type="radio" name="q${i}" value="${j}" ${answers[i] === j ? "checked" : ""}> ${c}</label>`).join("");
    else input = `<input type="text" name="q${i}" value="${answers[i] != null ? esc(answers[i]) : ""}" placeholder="${q.type === "number" ? "a number" : "your answer"}">`;
    return `<div class="q" data-i="${i}"><div><b>Q${i + 1}.</b> ${q.qHtml}</div>${input}<div class="verdict"></div><div class="explain">${q.explainHtml}</div></div>`;
  }).join("") + `<button class="primary" id="check">Check answers</button> <span id="qres"></span>`;
  const check = () => {
    let right = 0;
    const ans = {};
    n.quiz.forEach((q, i) => {
      const box = qz.querySelector(`.q[data-i="${i}"]`);
      let ok = false, given;
      if (q.type === "choice") { const s = box.querySelector("input:checked"); given = s ? +s.value : null; ok = given === q.answer; }
      else {
        given = box.querySelector("input").value;
        ok = q.type === "number" ? given.trim() !== "" && Number(given) === q.answer : q.answer.some((a) => norm(a) === norm(given));
      }
      ans[i] = given;
      if (given === null || given === "") { box.classList.remove("answered"); box.querySelector(".verdict").innerHTML = ""; return; }
      box.classList.add("answered");
      box.querySelector(".verdict").innerHTML = ok ? `<span class="ok">✓ correct</span>` : `<span class="bad">✗ not quite — read the explanation and try again</span>`;
      if (ok) right++;
    });
    r.answers = ans;
    const passed = right === n.quiz.length;
    if (passed && !r.quizPassed) r.quizPassed = Date.now();
    save();
    document.getElementById("qres").innerHTML = passed ? `<b class="ok" style="color:var(--green)">All ${right} correct. Quiz passed.</b>` : `${right} / ${n.quiz.length} correct`;
    renderSignoff(id);
  };
  document.getElementById("check").onclick = check;
  if (r.answers) check(); else renderSignoff(id);
}
function renderSignoff(id) {
  refresh();
  const box = document.getElementById("signoff");
  const r = rec(id), d = byId.get(id);
  const pending = d.meaningDeps.filter((x) => !understood(x));
  const can = !!r.quizPassed;
  box.classList.toggle("locked", !can);
  box.innerHTML = `
    <label><input type="checkbox" id="so" ${r.signedOff ? "checked" : ""} ${can ? "" : "disabled"}>
    <b>I understand the formal statement</b> — I could explain what the Lean above says, including its hypotheses, to someone else.</label>
    <p class="small muted">${can ? "" : "Pass the quiz above to unlock the sign-off. "}
    ${understood(id) ? `<span class="status-line" style="color:var(--green)">✓ Understood: you've signed off on this and on everything it mentions.</span>`
      : r.signedOff && can ? `Signed off. It becomes <b>understood</b> once these are understood too: ${pending.map((x) => `<a href="#/node/${encodeURIComponent(x)}">${esc(x)}</a>`).join(", ")}.`
      : pending.length ? `Mentions still to understand: ${pending.map((x) => `<a href="#/node/${encodeURIComponent(x)}">${esc(x)}</a>`).join(", ")}.` : ""}</p>`;
  const so = document.getElementById("so");
  if (so) so.onchange = () => { if (so.checked) r.signedOff = Date.now(); else delete r.signedOff; save(); renderSignoff(id); updateHeaderPill(id); };
  updateHeaderPill(id);
}
function updateHeaderPill(id) {
  refresh();
  const p = document.querySelector(".node-head .pill[class*='st-']");
  if (p) { const st = status(id); p.className = `pill st-${st}`; p.textContent = STATUS_LABEL[st]; }
}

function mountGiscus(id) {
  const el = document.getElementById("giscus");
  if (location.protocol === "file:") { el.innerHTML = `<p class="muted small">Comments load on the published site.</p>`; return; }
  const s = document.createElement("script");
  s.src = "https://giscus.app/client.js";
  Object.entries({
    "data-repo": GISCUS.repo, "data-repo-id": GISCUS.repoId, "data-category": GISCUS.category, "data-category-id": GISCUS.categoryId,
    "data-mapping": "specific", "data-term": `node: ${id}`, "data-strict": "1", "data-reactions-enabled": "1",
    "data-emit-metadata": "0", "data-input-position": "top", "data-theme": "dark", "data-lang": "en", "data-loading": "lazy",
  }).forEach(([k, v]) => s.setAttribute(k, v));
  s.crossOrigin = "anonymous"; s.async = true;
  el.append(s);
}

// ------------------------------------------------------------------ list page
function listPage(fileFilter) {
  const q = new URLSearchParams(location.hash.split("?")[1] || "");
  const file = fileFilter || q.get("file");
  const rows = decls.filter((d) => !file || d.module === file)
    .sort((a, b) => (!!nodes[b.id] - !!nodes[a.id]) || ((a.depth ?? 99) - (b.depth ?? 99)) || a.id.localeCompare(b.id));
  app.innerHTML = `<h1>${file ? `Declarations in ${esc(file)}.lean` : "All declarations"}</h1>
    <p class="muted">${Object.keys(nodes).length} with explainers, ${decls.length - Object.keys(nodes).length} awaiting one. ${file ? `<a href="#/nodes">show all</a>` : ""}
    Agents: the work list is <a href="data/needs-explainer.json">data/needs-explainer.json</a>.</p>
    <input type="text" id="flt" placeholder="filter…" style="max-width:20rem">
    <table class="node-list"><thead><tr><th>declaration</th><th>kind</th><th>status</th><th>distance from main</th><th>file</th></tr></thead>
    <tbody>${rows.map((d) => `<tr data-id="${esc(d.id.toLowerCase())}"><td><a href="#/node/${encodeURIComponent(d.id)}">${esc(d.id)}</a></td><td><span class="pill kind-${d.kind}">${d.kind}</span></td><td><span class="pill st-${status(d.id)}">${STATUS_LABEL[status(d.id)]}</span></td><td>${d.depth ?? "—"}</td><td class="small muted">${d.module}</td></tr>`).join("")}</tbody></table>`;
  document.getElementById("flt").oninput = (e) => {
    const v = e.target.value.toLowerCase();
    app.querySelectorAll("tbody tr").forEach((tr) => (tr.style.display = tr.dataset.id.includes(v) ? "" : "none"));
  };
}

// ------------------------------------------------------------------ playground
function playgroundPage() {
  app.innerHTML = `<h1>Generalized regular expression playground</h1>
    <p class="muted">Expressions are exactly the Lean type <a href="#/node/Expression">Expression</a>: <code>0</code> (no words), <code>1</code> or <code>ε</code> (just the empty word),
    letters, <code>+</code> (union), juxtaposition (concatenation), <code>*</code> (star), and complement written <code>~P</code> or <code>Pᶜ</code>.
    Complement is taken inside Σ*, so it depends on the alphabet. Height counts nested stars only, and complement is free.</p>
    <div id="pg1"></div>
    <h2>Same language, lower height?</h2>
    <p class="muted">Lowering height means finding a different expression for the same language. Complement is free, so it can replace stars: <code>~0</code> is “every word”, height 0.</p>
    <div id="pg2"></div>`;
  mountWidget(document.getElementById("pg1"), { type: "regex", title: "Evaluate", config: { expr: "(ab)*", alphabet: "ab", n: 6,
    presets: ["(a+b)*", "~0", "(ab)*", "~(b~0 + ~0a + ~0(aa+bb)~0)", "(aa)*", "~(~0aa~0)", "((ab)*a)*", "~(a*)b"] } });
  mountWidget(document.getElementById("pg2"), { type: "compare", title: "Compare two expressions", config: {} });
}

// ------------------------------------------------------------------ about
function aboutPage() {
  app.innerHTML = `<h1>About this site</h1>
  <div class="eli5">
  <p>Formalization usually goes from English to Lean: the job is done when Lean accepts the proof. This site goes the other way.
  The Lean proof of <b>generalized star height ≤ 3</b> is finished and checks (OpenAI, Sep 2026, ~12k lines, no <code>sorry</code>).
  The job here is done when a <b>reader</b> accepts it: when you can say what each formal statement means and back that up by passing a quiz.</p>
  <h2>How “understood” works</h2>
  <ul>
  <li>Each node is one Lean declaration, extracted automatically from the compiled proof (${decls.length} of them, ${reachable.length} used by <code>main</code>).</li>
  <li>A node with an explainer has the verbatim Lean, a plain-English reading, sometimes an interactive demo, and a quiz with an answer key.</li>
  <li>You can sign off on a node only after passing its quiz. It counts as <b>understood</b> once you've signed off on it <i>and</i> every project declaration its statement mentions is understood. For a definition, the body counts as part of the statement, because the body is what it means. For a theorem only the statement counts, because which proof you use doesn't change what's being claimed.</li>
  <li>Mathlib's definitions (<code>Language</code>, <code>Language.IsRegular</code>, …) are taken as given and linked to their documentation.</li>
  <li>Understanding the <i>proof</i> of <code>main</code> means understanding every declaration it uses. The progress bar on the graph page tracks that.</li>
  </ul>
  <h2>Contributing (humans and AI agents)</h2>
  <p>Every explainer is one Markdown file, <code>site/nodes/&lt;id&gt;.md</code>, with YAML frontmatter that holds the quiz key. See
  <a href="https://github.com/${REPO}/blob/main/CONTRIBUTING.md">CONTRIBUTING.md</a>. CI validates each file against a JSON schema and the extracted Lean declarations.
  Each stub page has a ready-made agent prompt, and <a href="data/needs-explainer.json">data/needs-explainer.json</a> lists the open work, nearest-to-<code>main</code> first.</p>
  <h2>Credit</h2>
  <p>Theorem and Lean proof: OpenAI, <a href="https://github.com/openai/math/blob/main/preprints/Generalized-Star-Height-at-Most-Three-September-25-2026/article.pdf">Generalized Star Height at Most Three</a> (Apache-2.0).
  Explanations on this site are a separate community effort and are not endorsed by OpenAI.</p>
  </div>`;
}

route();
