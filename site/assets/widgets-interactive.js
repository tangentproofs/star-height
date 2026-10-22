// Hands-on widgets. Each is mount(el, config); the logic they show lives in
// regex.js / automata.js / episodes.js / vectors.js, which mirror the Lean definitions
// and are covered by tools/test_widgets.mjs.
import { parse, height, toLean, show, wordsUpTo, maxN, subterms, atPath, replaceAt, singletonExpr, unionExpr } from "./regex.js";
import { DFAS, cloneDFA, trace, accepts, endo, imageMonoid, fullMonoidSize } from "./automata.js";
import { prefixCode, inRemainder, allIn, flatten, updateTrace, factor, graphWords, candidates } from "./episodes.js";
import { MONOIDS, basis, addVec, eqVec, actionMatrix, applyAction, trackTrace } from "./vectors.js";
import { h, svg, esc, W, wordSpan, field, row, btn, yes, parseAlphabet, parseList, stepper } from "./dom.js";
import { outlineHtml, stepDetailHtml } from "./walkthrough.js";

const CLAUSE = {
  zero: ".zero ↦ 0", one: ".one ↦ 1", letter: ".letter a ↦ {[a]}",
  union: ".union P Q ↦ P.language + Q.language", concat: ".concat P Q ↦ P.language * Q.language",
  compl: ".compl P ↦ P.languageᶜ", star: ".star P ↦ P.language∗",
};
const HCLAUSE = { zero: "0", one: "0", letter: "0", union: "max", concat: "max", compl: "same as P", star: "1 + P.height" };
const label = (e) => (e.t === "letter" ? `.letter '${e.a}'` : "." + e.t);
// A point on a quadratic Bézier; edge labels sit off the midpoint so that two edges
// bending through the middle of the picture do not print on top of each other.
const bezierAt = (t, x0, y0, cx, cy, x1, y1) => {
  const u = 1 - t;
  return [u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1];
};

// An annotated tree of subterms. `onpick` makes rows clickable; `extra(node)` adds a cell.
function treeView(e, { onpick, selected, extra } = {}) {
  const box = h("div", { class: "subtree" });
  const render = (node, path, into) => {
    const key = path.join("");
    const r = h("div", { class: "tnrow" + (selected === key ? " sel" : "") + (onpick ? " pick" : ""), title: onpick ? "click to select this subterm" : null },
      h("span", { class: "hbadge", title: `height = ${height(node)}` }, "h ", String(height(node))),
      h("code", {}, show(node)),
      h("span", { class: "small muted tnlab" }, label(node)),
      extra ? extra(node, path) : null);
    if (onpick) r.addEventListener("click", () => onpick(path));
    into.append(r);
    const kids = node.l ? [["l", node.l], ["r", node.r]] : node.e ? [["e", node.e]] : [];
    if (kids.length) {
      const sub = h("div", { class: "tkids" });
      for (const [step, k] of kids) render(k, [...path, step], sub);
      into.append(sub);
    }
  };
  render(e, [], box);
  return box;
}

const wordsBlock = (words, n, cap) =>
  `<p class="small muted">${words.length} word(s) of length ≤ ${n}${cap ? ` (capped at ${n} for this alphabet)` : ""}:</p>
   <div class="words">${words.map((w) => wordSpan(w)).join("") || '<span class="muted">none</span>'}</div>`;

// ---------------------------------------------------------------- build
// Build an Expression by pressing one button per constructor. The stack makes the
// inductive type literal: `union` and `concat` take two expressions off it, `compl`
// and `star` take one, and the atoms push.
function buildWidget(el, cfg = {}) {
  const A = parseAlphabet(cfg.alphabet ?? "ab");
  let stack = [];
  const nIn = h("input", { type: "number", value: cfg.n ?? 4, min: 0, max: 12, style: "width:4.5em" });
  const pad = h("div", { class: "row pad" });
  const stackBox = h("div", { class: "stackbox" });
  const out = h("div");
  el.append(h("p", { class: "small muted" }, `Press a constructor. Atoms push an expression; \`compl\`/\`star\` consume the top one; \`union\`/\`concat\` consume the top two (left operand first). Alphabet Σ = {${A.join(", ")}}.`),
    pad, stackBox, row(field("words up to length", nIn)), out);

  const push = (e) => { stack.push(e); run(); };
  const un = (t) => { const e = stack.pop(); stack.push(t === "star" ? { t: "star", e } : { t: "compl", e }); run(); };
  const bin = (t) => { const r = stack.pop(), l = stack.pop(); stack.push({ t, l, r }); run(); };

  function run() {
    pad.innerHTML = "";
    pad.append(
      btn(".zero  (0)", () => push({ t: "zero" })),
      btn(".one  (1)", () => push({ t: "one" })),
      ...A.map((a) => btn(`.letter '${a}'`, () => push({ t: "letter", a }))),
      btn(".compl  (~P)", () => un("compl"), { disabled: stack.length < 1 ? "" : null }),
      btn(".star  (P*)", () => un("star"), { disabled: stack.length < 1 ? "" : null }),
      btn(".union  (P+Q)", () => bin("union"), { disabled: stack.length < 2 ? "" : null }),
      btn(".concat  (PQ)", () => bin("concat"), { disabled: stack.length < 2 ? "" : null }),
      btn("undo", () => { stack.pop(); run(); }, { disabled: stack.length ? null : "" }),
      btn("clear", () => { stack = []; run(); }));
    stackBox.innerHTML = "";
    if (!stack.length) { stackBox.append(h("p", { class: "muted small" }, "stack: empty — press an atom to start")); }
    else stackBox.append(h("div", { class: "row" }, h("span", { class: "small muted" }, "stack:"),
      ...stack.map((e, i) => h("span", { class: "chip" + (i === stack.length - 1 ? " top" : "") }, `${show(e)}  (h ${height(e)})`))));
    out.innerHTML = "";
    if (stack.length !== 1) {
      out.append(h("p", { class: "small muted" }, stack.length ? `${stack.length} expressions on the stack — combine them with union or concat to finish.` : ""));
      return;
    }
    const e = stack[0];
    const cap = maxN(A), n = Math.min(+nIn.value || 0, cap);
    const words = wordsUpTo(e, A, n);
    out.append(h("p", { html: `<b>height = <span class="hbig">${height(e)}</span></b> &nbsp; <span class="small muted">Lean term: <code>${esc(toLean(e))}</code></span>` }));
    out.append(treeView(e));
    out.insertAdjacentHTML("beforeend", wordsBlock(words, n, n < +nIn.value));
  }
  for (const p of cfg.start || []) {
    try { stack.push(parse(p, A)); } catch { /* ignore a bad preset */ }
  }
  nIn.addEventListener("input", run);
  run();
}

// ---------------------------------------------------------------- lang-tree
// Expression.language is defined clause by clause; this shows the clause and the resulting
// word set at every subterm. Clicking a word traces which subterms contain it.
function langTreeWidget(el, cfg = {}) {
  const expr = h("input", { type: "text", value: cfg.expr ?? "~(a*)b", class: "mono" });
  const alpha = h("input", { type: "text", value: cfg.alphabet ?? "ab", size: 6, class: "mono" });
  const nIn = h("input", { type: "number", value: cfg.n ?? 3, min: 0, max: 8, style: "width:4.5em" });
  const out = h("div");
  let traced = null;
  el.append(row(field("expression", expr)), row(field("Σ =", alpha), field("words up to length", nIn)),
    h("p", { class: "small muted" }, "One row per subterm: the clause of `Expression.language` that applies, and the words it contributes (truncated to length ≤ n). Click any word to see which subterms contain it."), out);
  function run() {
    const A = parseAlphabet(alpha.value);
    out.innerHTML = "";
    if (!A.length) { out.innerHTML = `<p class="err">alphabet needs at least one letter a–z</p>`; return; }
    let e;
    try { e = parse(expr.value, A); } catch (err) { out.innerHTML = `<p class="err">${esc(err.message)}</p>`; return; }
    const n = Math.min(+nIn.value || 0, maxN(A));
    const box = h("div", { class: "subtree" });
    const render = (node, path, into) => {
      const ws = wordsUpTo(node, A, n);
      const has = traced != null && ws.includes(traced);
      const r = h("div", { class: "tnrow lt" + (traced != null ? (has ? " yesw" : " now") : "") },
        h("span", { class: "hbadge" }, "h ", String(height(node))),
        h("code", {}, show(node)),
        h("span", { class: "small muted tnlab" }, CLAUSE[node.t]),
        h("div", { class: "words inline", html: ws.map((w) => `<span class="w" data-w="${esc(w)}">${W(w)}</span>`).join("") || '<span class="muted">∅</span>' }));
      r.querySelectorAll(".w").forEach((s) => s.addEventListener("click", () => { traced = traced === s.dataset.w ? null : s.dataset.w; run(); }));
      into.append(r);
      const kids = node.l ? [node.l, node.r] : node.e ? [node.e] : [];
      if (kids.length) { const sub = h("div", { class: "tkids" }); for (const [i, k] of kids.entries()) render(k, [...path, i], sub); into.append(sub); }
    };
    render(e, [], box);
    out.append(box);
    if (traced != null) out.append(h("p", { class: "small", html: `tracing ${wordSpan(traced)}: green rows are the subterms whose language contains it. <a href="#" id="clr">clear</a>` }));
    const c = out.querySelector("#clr");
    if (c) c.addEventListener("click", (ev) => { ev.preventDefault(); traced = null; run(); });
    out.insertAdjacentHTML("beforeend", `<p class="small muted">Complement is taken inside Σ* — change Σ and the <code>.compl</code> rows change with it.</p>`);
  }
  for (const i of [expr, alpha, nIn]) i.addEventListener("input", () => { traced = null; run(); });
  run();
}

// ---------------------------------------------------------------- height-lab
// Wrap any subterm in `compl` (free) or `star` (+1) and watch the height move.
function heightLabWidget(el, cfg = {}) {
  const A = parseAlphabet(cfg.alphabet ?? "ab");
  const n = Math.min(cfg.n ?? 3, maxN(A));
  const start = parse(cfg.expr ?? "ab", A);
  let e = start, sel = "", log = [];
  const info = h("div"), tree = h("div"), pad = h("div", { class: "row" }), out = h("div");
  el.append(h("p", { class: "small muted" }, "Pick a subterm, then wrap it. `.compl` changes the language but not the height; `.star` costs exactly 1. That asymmetry is the whole of `Expression.height`, and the reason the theorem says “generalized”."),
    pad, info, tree, out);
  const wrap = (t) => { e = replaceAt(e, sel.split("").filter(Boolean), (s) => (t === "star" ? { t: "star", e: s } : { t: "compl", e: s })); log.push(t); run(); };
  function run() {
    const paths = subterms(e).map((s) => s.path.join(""));
    if (!paths.includes(sel)) sel = "";
    const before = height(e);
    const sub = atPath(e, sel.split("").filter(Boolean));
    const afterC = height(replaceAt(e, sel.split("").filter(Boolean), (s) => ({ t: "compl", e: s })));
    const afterS = height(replaceAt(e, sel.split("").filter(Boolean), (s) => ({ t: "star", e: s })));
    pad.innerHTML = "";
    pad.append(
      btn(`wrap in ~  →  height ${afterC}`, () => wrap("compl"), { class: afterC === before ? "primary" : "" }),
      btn(`wrap in *  →  height ${afterS}`, () => wrap("star")),
      btn("reset", () => { e = start; sel = ""; log = []; run(); }));
    info.innerHTML = `<p>selected subterm <code>${esc(show(sub))}</code> (height ${height(sub)}) of <code>${esc(show(e))}</code>
      &nbsp;·&nbsp; whole expression: <b>height = <span class="hbig">${before}</span></b></p>
      <p class="small muted">applied so far: ${log.length ? log.map((t) => `<code>${t}</code>`).join(" → ") : "nothing"} — stars used: <b>${log.filter((t) => t === "star").length}</b>, complements used: <b>${log.filter((t) => t === "compl").length}</b>, height ${before}.</p>`;
    tree.innerHTML = "";
    tree.append(treeView(e, { selected: sel, onpick: (p) => { sel = p.join(""); run(); },
      extra: (node) => h("span", { class: "small muted hcl" }, `height = ${HCLAUSE[node.t]}`) }));
    const words = wordsUpTo(e, A, n);
    out.innerHTML = wordsBlock(words, n, false) +
      `<p class="small muted">Lean term: <code>${esc(toLean(e))}</code></p>`;
  }
  run();
}

// ---------------------------------------------------------------- union-lab
// Finite unions: union is free, so the union's height is the max. In `words` mode it builds
// the expression that HasHeightAtMost.finite builds (singletons joined by union, height 0).
function unionLabWidget(el, cfg = {}) {
  const A = parseAlphabet(cfg.alphabet ?? "ab");
  const wordsMode = !!cfg.words;
  let items = [...(cfg.items ?? (wordsMode ? ["", "ab", "ba", "bab"] : ["a*", "~(b~0)", "(ab)*b"]))];
  const n = Math.min(cfg.n ?? 4, maxN(A));
  const list = h("div"), out = h("div");
  const add = h("input", { type: "text", class: "mono", placeholder: wordsMode ? "a word, e.g. abb (blank = ε)" : "an expression, e.g. (ab)*", style: "max-width:14rem" });
  el.append(h("p", { class: "small muted" }, wordsMode
    ? "Each word is one `singleton` (letters glued with `.concat`, ending in `.one`); the list is folded with `.union` ending in `.zero`, exactly as `HasHeightAtMost.finite` does it. No stars appear, so the height is 0."
    : "Each row is one `L i`. The union `⨆ i, L i` is folded with `.union`, whose height is the max — so a finite union never costs height."),
    list, row(add, btn("add", () => { items.push(add.value.trim()); add.value = ""; run(); })), out);
  function exprOf(s) {
    if (!wordsMode) return parse(s, A);
    const w = s === "ε" ? "" : s;
    const bad = [...w].find((c) => !A.includes(c));
    if (bad) throw new Error(`'${bad}' is not in Σ`);
    return singletonExpr(w);
  }
  function run() {
    list.innerHTML = "";
    const parsed = [];
    items.forEach((s, i) => {
      let e = null, err = null;
      try { e = exprOf(s); } catch (ex) { err = ex.message; }
      parsed.push(e);
      list.append(row(h("span", { class: "small muted" }, `L ${i} =`),
        h("code", {}, wordsMode ? W(s) : s),
        h("span", { class: "hbadge" }, "h ", e ? String(height(e)) : "?"),
        h("span", { class: "small muted" }, err ? "" : `${wordsUpTo(e, A, n).length} word(s) ≤ ${n}`),
        err ? h("span", { class: "err small" }, err) : null,
        btn("×", () => { items.splice(i, 1); run(); }, { title: "remove" })));
    });
    const good = parsed.filter(Boolean);
    const u = unionExpr(good);
    const words = wordsUpTo(u, A, n);
    const maxh = good.length ? Math.max(...good.map(height)) : 0;
    out.innerHTML = `
      <p>⨆ i, L i has <b>height = <span class="hbig">${height(u)}</span></b> = max of (${good.map(height).join(", ") || "—"}) = ${maxh}
        &nbsp;<span class="small muted">(${good.length} summand(s); an empty union is <code>.zero</code>)</span></p>
      <p class="small muted">Lean term: <code>${esc(toLean(u))}</code></p>
      ${wordsBlock(words, n, false)}
      <p class="small muted"><b>Why <code>[Finite ι]</code>?</b> Every single word is a height-0 language, so an <i>infinite</i> union of
      height-0 languages is an arbitrary language — e.g. ⨆ n, {aⁿbⁿ} = ${[0, 1, 2, 3].map((p) => wordSpan("a".repeat(p) + "b".repeat(p))).join(" ")} … which is not even regular
      and has no expression at all. An expression holds only finitely many <code>+</code>s.</p>`;
  }
  run();
}

// ---------------------------------------------------------------- dfa-lab
// Edit a DFA, run words through it, and watch the transition monoid build up.
function dfaLabWidget(el, cfg = {}) {
  let D = cloneDFA(DFAS[cfg.dfa ?? "contains ab"] ?? DFAS["contains ab"]);
  let word = cfg.word ?? "bab";
  let upto = null;
  const sel = h("select", {}, ...Object.keys(DFAS).map((k) => h("option", { value: k }, k)));
  sel.value = cfg.dfa ?? "contains ab";
  const wIn = h("input", { type: "text", value: word, class: "mono", style: "max-width:10rem" });
  const diag = h("div", { class: "diagram" }), table = h("div"), runBox = h("div"), monoid = h("div");
  let step = null;
  el.append(row(field("start from", sel), btn("+ state", () => { if (D.Q.length < 5) { D.Q.push(String(D.Q.length)); for (const a of D.A) D.d[a].push(D.Q.length - 1); run(); } }),
    btn("− state", () => { if (D.Q.length > 1) { D.Q.pop(); const k = D.Q.length; D.accept = D.accept.filter((i) => i < k); if (D.start >= k) D.start = 0; for (const a of D.A) { D.d[a].pop(); D.d[a] = D.d[a].map((q) => (q >= k ? 0 : q)); } run(); } })),
    table, diag, row(field("word w", wIn)), runBox, monoid);
  sel.addEventListener("change", () => { D = cloneDFA(DFAS[sel.value]); upto = null; run(); });
  const radioName = "dfastart" + Math.random().toString(36).slice(2, 8);
  wIn.addEventListener("input", () => { word = [...wIn.value].filter((c) => D.A.includes(c)).join(""); step = null; run(); });

  function diagram(cur, usedEdge) {
    const n = D.Q.length, R = 18, cx = 160, cy = 88, rad = n === 1 ? 0 : Math.min(48, 18 + 11 * n);
    const pos = D.Q.map((_, i) => { const t = -Math.PI / 2 + (2 * Math.PI * i) / n; return [cx + rad * Math.cos(t), cy + rad * Math.sin(t)]; });
    const span = rad + 52;   // nodes sit at `rad` from the centre; self-loops and labels add ~48
    const g = svg("svg", { viewBox: `${cx - span} ${cy - span} ${2 * span} ${2 * span}`, class: "dfa" });
    g.append(svg("defs", {}, svg("marker", { id: "ah", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 5, markerHeight: 5, orient: "auto-start-reverse" },
      svg("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "#a59f85" }))));
    const grouped = new Map();
    for (const a of D.A) D.d[a].forEach((q, p) => {
      const k = p + ">" + q;
      grouped.set(k, { p, q, ls: [...(grouped.get(k)?.ls || []), a] });
    });
    for (const { p, q, ls } of grouped.values()) {
      const used = usedEdge && usedEdge.p === p && usedEdge.q === q && ls.includes(usedEdge.a);
      const col = used ? "#fd971f" : "#5c5b4f";
      if (p === q) {
        const [x, y] = pos[p], ox = x - cx || 0.001, oy = y - cy || -1;
        const m = Math.hypot(ox, oy), ux = rad ? ox / m : 0, uy = rad ? oy / m : -1;
        const sx = x + ux * R * 0.4 - uy * R * 0.8, sy = y + uy * R * 0.4 + ux * R * 0.8;
        const ex = x + ux * R * 0.4 + uy * R * 0.8, ey = y + uy * R * 0.4 - ux * R * 0.8;
        g.append(svg("path", { d: `M ${sx} ${sy} C ${x + ux * 40 - uy * 17} ${y + uy * 40 + ux * 17}, ${x + ux * 40 + uy * 17} ${y + uy * 40 - ux * 17}, ${ex} ${ey}`, fill: "none", stroke: col, "stroke-width": used ? 2.4 : 1.2, "marker-end": "url(#ah)" }));
        g.append(svg("text", { x: x + ux * 36, y: y + uy * 36 + 4, class: "elab", fill: col }, document.createTextNode(ls.join(","))));
      } else {
        const [x1, y1] = pos[p], [x2, y2] = pos[q];
        const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
        const nx = -dy / L, ny = dx / L, bend = 24;
        const mx = (x1 + x2) / 2 + nx * bend, my = (y1 + y2) / 2 + ny * bend;
        const sx = x1 + (dx / L) * R + nx * 4, sy = y1 + (dy / L) * R + ny * 4;
        const ex = x2 - (dx / L) * R + nx * 4, ey = y2 - (dy / L) * R + ny * 4;
        g.append(svg("path", { d: `M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`, fill: "none", stroke: col, "stroke-width": used ? 2.4 : 1.2, "marker-end": "url(#ah)" }));
        // On the arc, nudged outward: three edges bending through the middle would
        // otherwise print their labels on top of each other.
        const [lx, ly] = bezierAt(0.5, sx, sy, mx, my, ex, ey);
        g.append(svg("text", { x: lx - nx * 15, y: ly - ny * 15 + 4, class: "elab", fill: col }, document.createTextNode(ls.join(","))));
      }
    }
    D.Q.forEach((nm, i) => {
      const [x, y] = pos[i];
      g.append(svg("circle", { cx: x, cy: y, r: R, fill: i === cur ? "#3a4a20" : "#2f302a", stroke: i === cur ? "#a6e22e" : "#75715e", "stroke-width": i === cur ? 2.5 : 1.4 }));
      if (D.accept.includes(i)) g.append(svg("circle", { cx: x, cy: y, r: R - 4, fill: "none", stroke: "#66d9ef", "stroke-width": 1.2 }));
      g.append(svg("text", { x, y: y + 4, class: "slab" }, document.createTextNode(nm)));
      if (i === D.start) g.append(svg("path", { d: `M ${x - R - 16} ${y} L ${x - R - 2} ${y}`, stroke: "#f92672", "stroke-width": 1.8, "marker-end": "url(#ah)" }));
    });
    return g;
  }

  function run() {
    wIn.value = word;
    // editable transition table
    table.innerHTML = "";
    const t = h("table", { class: "t edit" });
    t.append(h("tr", {}, h("th", {}, "δ"), ...D.A.map((a) => h("th", {}, a)), h("th", {}, "accept?"), h("th", {}, "start?")));
    D.Q.forEach((nm, q) => {
      const tr = h("tr", {}, h("th", {}, nm));
      for (const a of D.A) {
        const cell = btn(D.Q[D.d[a][q]], () => { D.d[a][q] = (D.d[a][q] + 1) % D.Q.length; upto = null; run(); }, { class: "cyc", title: "click to cycle the target state" });
        tr.append(h("td", {}, cell));
      }
      const cb = h("input", { type: "checkbox" }); cb.checked = D.accept.includes(q);
      cb.addEventListener("change", () => { D.accept = cb.checked ? [...D.accept, q] : D.accept.filter((i) => i !== q); run(); });
      const rb = h("input", { type: "radio", name: radioName }); rb.checked = D.start === q;
      rb.addEventListener("change", () => { D.start = q; run(); });
      tr.append(h("td", {}, cb), h("td", {}, rb));
      t.append(tr);
    });
    table.append(t);

    const M = imageMonoid(D);
    const tr0 = trace(D, D.start, word);
    const k = step == null ? word.length : Math.min(step, word.length);

    diag.innerHTML = "";
    diag.append(diagram(tr0[k], k > 0 ? { p: tr0[k - 1], q: tr0[k], a: word[k - 1] } : null));

    runBox.innerHTML = "";
    const runOut = h("div");
    const st = stepper(word.length, (i) => { step = i; redrawRun(); }, k);
    runBox.append(st.bar, runOut);
    function redrawRun() {
      const i = Math.min(step ?? word.length, word.length);
      diag.innerHTML = ""; diag.append(diagram(tr0[i], i > 0 ? { p: tr0[i - 1], q: tr0[i], a: word[i - 1] } : null));
      runOut.innerHTML = `
        <p>${word.length ? `${[...word].map((c, j) => `<span class="cell${j < i ? " done" : ""}${j === i - 1 ? " now" : ""}">${esc(c)}</span>`).join("")}` : wordSpan("")}
         &nbsp;→&nbsp; state <b>${esc(D.Q[tr0[i]])}</b>${i === word.length ? ` &nbsp; ${accepts(D, word) ? '<b style="color:var(--green)">accepted</b>' : '<b style="color:var(--pink)">rejected</b>'}` : ""}</p>
        <p class="small muted">path: ${tr0.slice(0, i + 1).map((q) => esc(D.Q[q])).join(" → ")}</p>`;
    }
    redrawRun();

    // the monoid
    const sat = M.saturation, lim = upto == null ? sat : upto;
    const shown = M.elems.filter((m) => m.len <= lim);
    const tw = endo(D, word), tIdx = M.index(tw);
    monoid.innerHTML = `
      <h4>The transition monoid</h4>
      <p class="small muted">Lean takes <code>M = (Function.End Q)ᵐᵒᵖ</code>: <b>all</b> ${fullMonoidSize(D)} maps ${D.Q.length} → ${D.Q.length} states
      (|Q|<sup>|Q|</sup>), with <code>T w = fun q ↦ evalFrom q w</code> and <code>F = {f | f start ∈ accept}</code>.
      Only <b>${M.elems.length}</b> of them are of the form <code>T w</code>; the rest sit in M unused, which costs nothing because M just has to be finite.</p>
      <div class="row"><label>words up to length <input type="range" id="upto" min="0" max="${sat}" value="${lim}"> <b>${lim}</b></label>
      <span class="small muted">→ <b>${M.countUpTo(lim)}</b> distinct maps discovered (saturates at length ${sat})</span></div>
      <div class="scroll"><table class="t"><tr><th>T w</th><th>shortest w</th>${D.Q.map((q) => `<th>${esc(q)} ↦</th>`).join("")}<th>∈ F?</th></tr>
      ${shown.map((m, i) => `<tr><td class="${M.index(m.f) === tIdx ? "hit" : ""}">m${M.index(m.f)}</td><td>${wordSpan(m.w)}</td>${m.f.map((q) => `<td>${esc(D.Q[q])}</td>`).join("")}<td class="${M.inF(M.index(m.f)) ? "acc" : ""}">${M.inF(M.index(m.f)) ? "∈ F" : "∉ F"}</td></tr>`).join("")}</table></div>
      <p>T(${wordSpan(word)}) = <b>m${tIdx}</b> ${M.inF(tIdx) ? '<b style="color:var(--green)">∈ F</b>' : '<b style="color:var(--pink)">∉ F</b>'},
       and the run above ${accepts(D, word) ? "accepts" : "rejects"} — <code>w ∈ L ↔ T w ∈ F</code>.</p>
      ${M.elems.length <= 9 ? `<details><summary class="small">multiplication table (row · column = run the row's word, then the column's)</summary><div class="scroll"><table class="t"><tr><th>·</th>${M.elems.map((_, j) => `<th>m${j}</th>`).join("")}</tr>${M.elems.map((_, i) => `<tr><th>m${i}</th>${M.elems.map((_, j) => `<td>m${M.mul(i, j)}</td>`).join("")}</tr>`).join("")}</table></div></details>` : ""}`;
    const sl = monoid.querySelector("#upto");
    sl.addEventListener("input", () => { upto = +sl.value; run(); });
  }
  run();
}

// ---------------------------------------------------------------- factor-lab
// factor_remainder, one peel at a time, on a word strip.
function factorLabWidget(el, cfg = {}) {
  const Ein = h("input", { type: "text", value: cfg.E ?? "a, ba, bb", class: "mono" });
  const wIn = h("input", { type: "text", value: cfg.word ?? "abbaab", class: "mono", style: "max-width:12rem" });
  const head = h("div"), strip = h("div"), ctl = h("div"), out = h("div");
  let picks = [];
  el.append(row(field("E (comma-separated; ε = the empty word)", Ein)), row(field("word w", wIn)), head, strip, ctl, out);
  const reset = () => { picks = []; run(); };
  for (const i of [Ein, wIn]) i.addEventListener("input", reset);

  function run() {
    const E = [...new Set(parseList(Ein.value))];
    const w = wIn.value.trim();
    const pc = prefixCode(E);
    head.innerHTML = `<p><code>[] ∉ E</code>: ${yes(!pc.hasNil)} &nbsp;·&nbsp; <code>PrefixCode E</code>: ${yes(pc.ok)}${pc.clashes.length ? ` <span class="small muted">(${pc.clashes.slice(0, 3).map(([a, b]) => `${wordSpan(a)} <+: ${wordSpan(b)}`).join(", ")})</span>` : ""}</p>
      ${pc.hasNil ? `<p class="small">With <code>[] ∈ E</code> the empty block is a prefix of everything, so <code>remainder E = ∅</code> and <code>factor_remainder</code> does not apply — its one hypothesis is exactly <code>hnil : [] ∉ E</code>.</p>` : ""}`;
    if (pc.hasNil) { strip.innerHTML = ""; ctl.innerHTML = ""; out.innerHTML = ""; return; }

    // replay the peels the reader has chosen so far
    let rest = w, es = [], at = 0, cells = Array(w.length).fill(null);
    for (const p of picks) {
      const cands = candidates(E, rest);
      const e = cands.includes(p) ? p : cands[0];
      if (!e) break;
      for (let j = 0; j < e.length; j++) cells[at + j] = es.length;
      es.push(e); at += e.length; rest = rest.slice(e.length);
    }
    const cands = candidates(E, rest);
    const done = !cands.length;

    strip.innerHTML = `<div class="strip">${[...w].map((c, j) => `<span class="cell ${cells[j] == null ? "rem" : "blk b" + (cells[j] % 4)}">${esc(c)}</span>`).join("") || '<span class="muted small">(empty word)</span>'}</div>`;
    ctl.innerHTML = "";
    if (done) ctl.append(h("p", { class: "small", html: `No word of E is a prefix of ${wordSpan(rest)}, so <code>${W(rest)} ∈ remainder E</code> and the factoring is finished.` }));
    else {
      ctl.append(h("div", { class: "row" }, h("span", { class: "small muted" }, `peel a block off ${W(rest)}:`),
        ...cands.map((e) => btn(W(e), () => { picks.push(e); run(); }, { class: cands.length === 1 ? "primary" : "" })),
        btn("finish", () => { let r = rest; while (candidates(E, r).length) { const c = candidates(E, r)[0]; picks.push(c); r = r.slice(c.length); } run(); })));
      if (cands.length > 1) ctl.append(h("p", { class: "small", html: `<b style="color:var(--orange)">${cands.length} blocks fit here</b> — E is not a prefix code, so you choose. <code>factor_remainder</code> only claims that <i>some</i> factoring exists; <code>flatten_injective</code> (which needs <code>PrefixCode E</code>) is what makes it unique.` }));
    }
    ctl.append(h("div", { class: "row" }, btn("restart", reset), btn("undo", () => { picks.pop(); run(); }, { disabled: picks.length ? null : "" })));
    out.innerHTML = `
      <p><code>es</code> = [${es.map((e) => wordSpan(e)).join(", ")}] &nbsp;·&nbsp; <code>AllIn E es</code>: ${yes(allIn(E, es))}${es.length ? "" : ' <span class="small muted">(vacuously, for the empty list of blocks)</span>'}</p>
      <p><code>es.flatten</code> = ${wordSpan(flatten(es))} &nbsp; <code>r</code> = ${wordSpan(rest)} &nbsp;·&nbsp; <code>r ∈ remainder E</code>: ${yes(inRemainder(E, rest))}</p>
      <p><code>w = es.flatten ++ r</code>: ${yes(flatten(es) + rest === w)} &nbsp;<span class="small muted">${W(w)} = ${W(flatten(es))} ++ ${W(rest)}</span></p>`;
  }
  run();
}

// ---------------------------------------------------------------- blocks
// AllIn / flatten / updateWord: build a block list and fold a state through it.
const GS = {
  "count a's mod k": (k) => ({ G: (e, s) => (s + [...e].filter((c) => c === "a").length) % k, show: "G e s = s + (#a in e) mod k", states: (k) => [...Array(k).keys()] }),
  "length mod k": (k) => ({ G: (e, s) => (s + e.length) % k, show: "G e s = s + e.length mod k", states: (k) => [...Array(k).keys()] }),
  "last letter of e": () => ({ G: (e, s) => (e.length ? e[e.length - 1] : s), show: "G e s = last letter of e (or s if e is empty)", states: () => ["a", "b"] }),
};
function blocksWidget(el, cfg = {}) {
  const Din = h("input", { type: "text", value: cfg.D ?? "a, ba, bb", class: "mono" });
  const gSel = h("select", {}, ...Object.keys(GS).map((k) => h("option", { value: k }, k)));
  gSel.value = cfg.G ?? "count a's mod k";
  const kIn = h("input", { type: "number", value: cfg.k ?? 3, min: 1, max: 6, style: "width:4em" });
  const xIn = h("input", { type: "text", value: String(cfg.x ?? 0), class: "mono", style: "width:4em" });
  const free = h("input", { type: "text", class: "mono", placeholder: "or type any block", style: "max-width:9rem" });
  const pad = h("div", { class: "row" }), out = h("div");
  let es = [...(cfg.es ?? [])];
  el.append(row(field("D =", Din)), row(field("update G", gSel), field("k =", kIn), field("start state x =", xIn)),
    h("p", { class: "small muted", id: "gs" }), pad, out);
  function run() {
    const D = [...new Set(parseList(Din.value))];
    const k = Math.max(1, +kIn.value || 1);
    const spec = GS[gSel.value](k);
    el.querySelector("#gs").textContent = `${spec.show}. G takes a whole block, not a letter: G "ab" need not be G "b" ∘ G "a".`;
    const x = /^\d+$/.test(xIn.value.trim()) ? +xIn.value.trim() % k : xIn.value.trim();
    pad.innerHTML = "";
    pad.append(h("span", { class: "small muted" }, "append a block:"),
      ...D.map((e) => btn(W(e), () => { es.push(e); run(); })),
      free, btn("+", () => { if (free.value !== "") { es.push(free.value.trim()); free.value = ""; run(); } }),
      btn("drop last", () => { es.pop(); run(); }, { disabled: es.length ? null : "" }),
      btn("clear", () => { es = []; run(); }));
    const tr = updateTrace(spec.G, x, es);
    const bad = es.filter((e) => !D.includes(e));
    out.innerHTML = `
      <p><code>es</code> = [${es.map((e) => wordSpan(e)).join(", ")}]${es.length ? "" : ' <span class="muted small">(the empty list of blocks — not the empty word)</span>'}</p>
      <p><code>AllIn D es</code>: ${yes(allIn(D, es))} ${es.length === 0 ? '<span class="small muted">— vacuously true: <code>∀ e ∈ [], e ∈ D</code> has nothing to check, which is why <code>[] ∈ graph D G x x</code> always holds</span>' : bad.length ? `<span class="small muted">— ${bad.map((e) => wordSpan(e)).join(", ")} ∉ D</span>` : ""}</p>
      <p><code>es.flatten</code> = ${wordSpan(flatten(es))} <span class="small muted">(${es.length} block(s), ${flatten(es).length} letter(s))</span></p>
      <p><code>updateWord G x es</code> = <b>${esc(String(tr[tr.length - 1]))}</b></p>
      <div class="scroll"><table class="t"><tr><th>after</th><th>block e</th><th>state</th></tr>
        <tr><td>—</td><td class="muted">start</td><td class="hit">${esc(String(x))}</td></tr>
        ${es.map((e, i) => `<tr><td>${i + 1}</td><td>${wordSpan(e)}</td><td${i === es.length - 1 ? ' class="hit"' : ""}>${esc(String(tr[i + 1]))}</td></tr>`).join("")}</table></div>
      <p class="small muted"><code>foldl</code> goes left to right: <code>updateWord G x [e₁, e₂] = G e₂ (G e₁ x)</code>.</p>`;
  }
  for (const i of [Din, gSel, kIn, xIn]) i.addEventListener("input", run);
  gSel.addEventListener("change", run);
  run();
}

// ---------------------------------------------------------------- graph-lab
// graph D G x y as an actual graph: pick x and y on the picture, step a block list through it,
// and list the words that get from x to y.
function graphLabWidget(el, cfg = {}) {
  const Din = h("input", { type: "text", value: cfg.D ?? cfg.E ?? "a, ba, bb", class: "mono" });
  const kIn = h("input", { type: "number", value: cfg.k ?? 3, min: 1, max: 6, style: "width:4em" });
  const nIn = h("input", { type: "number", value: cfg.n ?? 5, min: 0, max: 9, style: "width:4em" });
  const gSel = h("select", {}, ...["count a's mod k", "length mod k"].map((k) => h("option", { value: k }, k)));
  gSel.value = cfg.G ?? "count a's mod k";
  let x = cfg.x ?? 0, y = cfg.y ?? 1, es = [], cur = 0, setting = "x";
  const diag = h("div", { class: "diagram" }), pad = h("div"), out = h("div");
  el.append(row(field("blocks D =", Din)), row(field("states S = ℤ/", kIn), field("update G", gSel), field("max word length", nIn)),
    h("p", { class: "small muted" }, "Each block e is one edge s → G e s, so a word of graph D G x y is the label of a path from x to y whose edges are whole blocks. Pick which endpoint a click moves, then click a state:"),
    h("div", { class: "row", id: "xysel" }), diag, pad, out);

  function draw(k, G, D) {
    const R = 17, cx = 160, cy = 88, rad = k === 1 ? 0 : Math.min(48, 18 + 11 * k);
    const pos = [...Array(k).keys()].map((i) => { const t = -Math.PI / 2 + (2 * Math.PI * i) / k; return [cx + rad * Math.cos(t), cy + rad * Math.sin(t)]; });
    const span = rad + 52;
    const g = svg("svg", { viewBox: `${cx - span} ${cy - span} ${2 * span} ${2 * span}`, class: "dfa" });
    g.append(svg("defs", {}, svg("marker", { id: "ah2", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 5, markerHeight: 5, orient: "auto-start-reverse" },
      svg("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "#a59f85" }))));
    const tr = updateTrace(G, x, es);
    const live = new Set(es.map((e, i) => `${tr[i]}>${tr[i + 1]}>${e}`).slice(0, cur));
    const grouped = new Map();
    for (const e of D) for (const s of pos.keys()) {
      const t = G(e, s), key = `${s}>${t}`;
      grouped.set(key, { s, t, ls: [...(grouped.get(key)?.ls || []), e] });
    }
    for (const { s, t, ls } of grouped.values()) {
      const used = ls.some((e) => live.has(`${s}>${t}>${e}`));
      const col = used ? "#fd971f" : "#5c5b4f";
      const [x1, y1] = pos[s], [x2, y2] = pos[t];
      if (s === t) {
        const ox = x1 - cx || 0.001, oy = y1 - cy || -1, m = Math.hypot(ox, oy);
        const ux = rad ? ox / m : 0, uy = rad ? oy / m : -1;
        g.append(svg("path", { d: `M ${x1 + ux * 7 - uy * 13} ${y1 + uy * 7 + ux * 13} C ${x1 + ux * 40 - uy * 16} ${y1 + uy * 40 + ux * 16}, ${x1 + ux * 40 + uy * 16} ${y1 + uy * 40 - ux * 16}, ${x1 + ux * 7 + uy * 13} ${y1 + uy * 7 - ux * 13}`, fill: "none", stroke: col, "stroke-width": used ? 2.4 : 1.2, "marker-end": "url(#ah2)" }));
        g.append(svg("text", { x: x1 + ux * 36, y: y1 + uy * 36 + 4, class: "elab", fill: col }, document.createTextNode(ls.join(","))));
      } else {
        const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
        const sx = x1 + (dx / L) * R + nx * 4, sy = y1 + (dy / L) * R + ny * 4;
        const ex = x2 - (dx / L) * R + nx * 4, ey = y2 - (dy / L) * R + ny * 4;
        const mx = (x1 + x2) / 2 + nx * 24, my = (y1 + y2) / 2 + ny * 24;
        g.append(svg("path", { d: `M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`, fill: "none", stroke: col, "stroke-width": used ? 2.4 : 1.2, "marker-end": "url(#ah2)" }));
        // On the arc, nudged outward: three edges bending through the middle would
        // otherwise print their labels on top of each other.
        const [lx, ly] = bezierAt(0.5, sx, sy, mx, my, ex, ey);
        g.append(svg("text", { x: lx - nx * 15, y: ly - ny * 15 + 4, class: "elab", fill: col }, document.createTextNode(ls.join(","))));
      }
    }
    const here = tr[Math.min(cur, es.length)];
    pos.forEach(([px, py], i) => {
      const c = svg("circle", { cx: px, cy: py, r: R, fill: i === here ? "#3a4a20" : "#2f302a", stroke: i === y ? "#66d9ef" : i === x ? "#f92672" : "#75715e", "stroke-width": i === x || i === y ? 2.4 : 1.4, class: "statedot" });
      c.addEventListener("click", (ev) => { if (ev.shiftKey || setting === "y") y = i; else x = i; cur = 0; run(); });
      c.addEventListener("contextmenu", (ev) => { ev.preventDefault(); y = i; run(); });
      g.append(c);
      g.append(svg("text", { x: px, y: py + 4, class: "slab" }, document.createTextNode(String(i))));

    });
    return g;
  }

  function run() {
    const D = [...new Set(parseList(Din.value))].filter((e) => e !== "");
    const k = Math.max(1, +kIn.value || 1);
    x %= k; y %= k;
    const spec = GS[gSel.value](k), G = spec.G;
    const n = Math.min(+nIn.value || 0, 9);
    const xy = el.querySelector("#xysel");
    xy.innerHTML = "";
    xy.append(h("span", { class: "small muted" }, "a click sets:"),
      btn(`start x (now ${x})`, () => { setting = "x"; run(); }, { class: setting === "x" ? "primary" : "" }),
      btn(`target y (now ${y})`, () => { setting = "y"; run(); }, { class: setting === "y" ? "primary" : "" }));
    diag.innerHTML = ""; diag.append(draw(k, G, D));
    diag.append(h("p", { class: "small muted", style: "text-align:center", html: `<span class="ring x"></span> start x = ${x} &nbsp; <span class="ring y"></span> target y = ${y}` }));
    const tr = updateTrace(G, x, es);
    pad.innerHTML = "";
    pad.append(h("div", { class: "row" }, h("span", { class: "small muted" }, "append a block:"),
      ...D.map((e) => btn(W(e), () => { es.push(e); cur = es.length; run(); })),
      btn("drop", () => { es.pop(); cur = Math.min(cur, es.length); run(); }, { disabled: es.length ? null : "" }),
      btn("clear", () => { es = []; cur = 0; run(); })));
    if (es.length) {
      const st = stepper(es.length, (i) => { cur = i; diag.innerHTML = ""; diag.append(draw(k, G, D)); const o = pad.querySelector("#trc"); if (o) o.innerHTML = traceHtml(); }, cur);
      pad.append(st.bar, h("div", { id: "trc", html: traceHtml() }));
    }
    function traceHtml() {
      const i = Math.min(cur, es.length);
      return `<p>${es.map((e, j) => `<span class="cell${j < i ? " done" : ""}${j === i - 1 ? " now" : ""}">${W(e)}</span>`).join("")}
        &nbsp;·&nbsp; <code>updateWord G ${x} es</code> so far = <b>${tr[i]}</b> &nbsp; path ${tr.slice(0, i + 1).join(" → ")}</p>
        ${i === es.length ? `<p class="small">${wordSpan(flatten(es))} ${tr[es.length] === y ? `<b style="color:var(--green)">∈ graph D G ${x} ${y}</b> (this block list is the witness <code>es</code>)` : `reaches ${tr[es.length]}, not y = ${y}`}, and <code>AllIn D es</code>: ${yes(allIn(D, es))}</p>` : ""}`;
    }
    const found = D.length ? graphWords(D, G, x, y, n) : [];
    out.innerHTML = `
      <p>${found.length} word(s) of length ≤ ${n} in <code>graph D G ${x} ${y}</code>${x === y ? " (including ε, by <code>graph_nil</code>)" : ""}:</p>
      <div class="scroll"><table class="t"><tr><th>w</th><th>witness es</th><th>states</th></tr>
      ${found.slice(0, 40).map(({ w, es: ws }) => `<tr><td>${wordSpan(w)}</td><td>${ws.map((e) => W(e)).join(" · ") || "(none)"}</td><td>${updateTrace(G, x, ws).join(" → ")}</td></tr>`).join("")}</table></div>
      ${found.length > 40 ? `<p class="small muted">…and ${found.length - 40} more</p>` : ""}
      <p class="small muted">Every word listed is also in <code>D∗</code>: it is a concatenation of blocks of D. The converse fails — a D∗ word
      whose path ends somewhere else is not in <code>graph D G ${x} ${y}</code>.</p>`;
  }
  for (const i of [Din, kIn, nIn]) i.addEventListener("input", () => { es = []; cur = 0; run(); });
  gSel.addEventListener("change", () => { es = []; cur = 0; run(); });
  run();
}

// ---------------------------------------------------------------- vector-lab
// V M, basis and action as clickable bit rows and a 0/1 matrix; plus the running-product
// track that graph_fiber uses.
function vectorLabWidget(el, cfg = {}) {
  const sections = cfg.show ?? ["vectors", "basis", "action", "track"];
  const sel = h("select", {}, ...Object.keys(MONOIDS).map((k) => h("option", { value: k }, k)));
  sel.value = cfg.monoid && MONOIDS[cfg.monoid] ? cfg.monoid : "ℤ/3 = {1, g, g²}";
  const dSel = h("select");
  const body = h("div");
  let v = null, w2 = null, ds = [], cur = 0;
  el.append(row(field("monoid M", sel), sections.includes("action") || sections.includes("track") ? field("d =", dSel) : null), body);
  function setup() {
    const M = MONOIDS[sel.value], n = M.names.length;
    dSel.innerHTML = M.names.map((nm, i) => `<option value="${i}">${nm}</option>`).join("");
    dSel.value = String(Math.min(1, n - 1));
    v = basis(n, 0); w2 = basis(n, n - 1); ds = []; cur = 0;
    run();
  }
  const bits = (M, vec, onflip) => {
    const t = h("table", { class: "t vec" });
    t.append(h("tr", {}, h("th", {}, "m"), ...M.names.map((nm) => h("th", {}, nm))));
    const r = h("tr", {}, h("th", {}, "v m"));
    vec.forEach((b, i) => {
      const td = h("td", { class: "bit" + (b ? " one" : "") + (onflip ? " pick" : "") }, String(b));
      if (onflip) td.addEventListener("click", () => onflip(i));
      r.append(td);
    });
    t.append(r);
    return t;
  };
  function run() {
    const M = MONOIDS[sel.value], n = M.names.length, d = +dSel.value;
    body.innerHTML = "";
    const SECT = {};
    SECT.vectors = () => {
      const box = h("div", { class: "sect" });
      box.append(h("h4", {}, `V M = M → ZMod 2`),
        h("p", { class: "small muted", html: `A vector is one bit per monoid element — click to flip. |M| = ${n}, so <code>V M</code> has 2<sup>${n}</sup> = <b>${2 ** n}</b> vectors.` }),
        h("div", { class: "row" }, h("span", { class: "small muted" }, "v ="), bits(M, v, (i) => { v = v.map((b, j) => (j === i ? b ^ 1 : b)); run(); })),
        h("div", { class: "row" }, h("span", { class: "small muted" }, "w ="), bits(M, w2, (i) => { w2 = w2.map((b, j) => (j === i ? b ^ 1 : b)); run(); })),
        h("div", { class: "row" }, h("span", { class: "small muted" }, "v + w ="), bits(M, addVec(v, w2))),
        h("p", { class: "small muted" }, "Addition is coordinatewise in ZMod 2, so 1 + 1 = 0: it is XOR, and every vector is its own negative."));
      body.append(box);
    };
    SECT.basis = () => {
      const box = h("div", { class: "sect" });
      box.append(h("h4", {}, "basis M m"),
        h("p", { class: "small muted", html: "<code>Pi.basisFun</code>: <code>basis M m</code> is 1 at m and 0 elsewhere. Pick an m:" }),
        h("div", { class: "row" }, ...M.names.map((nm, i) => btn(`basis ${nm}`, () => { v = basis(n, i); run(); }, { class: eqVec(v, basis(n, i)) ? "primary" : "" }))),
        h("div", { class: "row" }, h("span", { class: "small muted" }, "current v ="), bits(M, v)),
        h("p", { class: "small muted", html: `v ${M.names.map((_, i) => i).some((i) => eqVec(v, basis(n, i))) ? `= <code>basis ${M.names[v.indexOf(1)]}</code>` : "is not a basis vector (it has " + v.filter(Boolean).length + " ones)"} — distinct m give distinct vectors (<code>basis_injective</code>), so a basis vector <i>remembers</i> its monoid element.` }));
      body.append(box);
    };
    SECT.action = () => {
      const mat = actionMatrix(M, d), img = applyAction(M, d, v);
      const box = h("div", { class: "sect" });
      const t = h("table", { class: "t mat" });
      t.append(h("tr", {}, h("th", {}, `action ${M.names[d]}`), ...M.names.map((nm) => h("th", {}, `basis ${nm}`))));
      mat.forEach((rw, i) => t.append(h("tr", {}, h("th", {}, `↦ basis ${M.names[i]}`),
        ...rw.map((b) => h("td", { class: "bit" + (b ? " one" : "") }, String(b))))));
      box.append(h("h4", {}, `action M d : V M →ₗ[ZMod 2] V M`),
        h("p", { class: "small muted", html: `Column <code>basis m</code> is its image <code>basis (m · ${M.names[d]})</code> — that is the definition (<code>Basis.constr</code>), and linearity fixes everything else.` }),
        h("div", { class: "scroll" }, t),
        h("div", { class: "row" }, h("span", { class: "small muted" }, "v ="), bits(M, v, (i) => { v = v.map((b, j) => (j === i ? b ^ 1 : b)); run(); })),
        h("div", { class: "row" }, h("span", { class: "small muted" }, `action ${M.names[d]} v =`), bits(M, img)),
        h("p", { class: "small muted", html: `Coordinate m′ of the image is the mod-2 sum of v m over all m with m·${M.names[d]} = m′, so columns that collide <b>cancel</b>: ${(() => {
          const hits = M.names.map((_, m) => M.mul(m, d));
          const dup = hits.some((t, i) => hits.indexOf(t) !== i);
          return dup ? `here two basis vectors share an image, so <code>action ${M.names[d]}</code> is not injective and some non-zero v maps to 0.` : `here the columns are all distinct, so <code>action ${M.names[d]}</code> is injective.`;
        })()}` }),
        h("p", { class: "small muted", html: `<code>value_recovery</code>: <code>action d (basis 1) = basis d</code> — ${(() => { const r = applyAction(M, d, basis(n, 0)); return eqVec(r, basis(n, d)) ? `checks here (${M.names[d]} = 1 · ${M.names[d]})` : "fails?!"; })()}.` }));
      body.append(box);
    };
    SECT.track = () => {
      const box = h("div", { class: "sect" });
      const tr = trackTrace(M, ds);
      const i = Math.min(cur, ds.length);
      box.append(h("h4", {}, "The vector tracks the running product"),
        h("p", { class: "small muted", html: `Start at <code>basis 1</code> and apply <code>action dᵢ</code> for each block in turn. <code>updateWord_product</code> says the result is <code>action (d₁⋯d_k) (basis 1)</code>, which by <code>value_recovery</code> is <code>basis (d₁⋯d_k)</code> — so reading off the vector recovers the product exactly.` }),
        h("div", { class: "row" }, h("span", { class: "small muted" }, "append a block with value"),
          ...M.names.map((nm, j) => btn(nm, () => { ds.push(j); cur = ds.length; run(); })),
          btn("drop", () => { ds.pop(); cur = Math.min(cur, ds.length); run(); }, { disabled: ds.length ? null : "" }),
          btn("clear", () => { ds = []; cur = 0; run(); })));
      if (ds.length) {
        const st = stepper(ds.length, (k) => { cur = k; run(); }, i);
        box.append(st.bar);
      }
      box.append(h("div", { class: "row" }, h("span", { class: "small muted" }, "vector ="), bits(M, tr[i].v)),
        h("p", { html: `running product = <b>${esc(M.names[tr[i].prod])}</b> &nbsp;·&nbsp; vector = <code>basis ${esc(M.names[tr[i].prod])}</code>: ${yes(eqVec(tr[i].v, basis(n, tr[i].prod)))}` }),
        h("p", { class: "small muted" }, `blocks applied: ${ds.slice(0, i).map((j) => M.names[j]).join(" · ") || "none"}`));
      body.append(box);
    };
    for (const name of sections) SECT[name]?.();   // in the order the config asked for
  }
  sel.addEventListener("change", setup);
  dSel.addEventListener("change", run);
  setup();
}

// ---------------------------------------------------------------- decompose
// The set identity inside recognized_height_three, on a concrete DFA and a concrete prefix code.
function decomposeWidget(el, cfg = {}) {
  const sel = h("select", {}, ...Object.keys(DFAS).map((k) => h("option", { value: k }, k)));
  sel.value = cfg.dfa ?? "contains ab";
  const Ein = h("input", { type: "text", value: cfg.E ?? "aa, ab, b", class: "mono", style: "max-width:11rem" });
  const wIn = h("input", { type: "text", value: cfg.word ?? "abba", class: "mono", style: "max-width:9rem" });
  const out = h("div");
  el.append(row(field("L recognized by", sel), field("prefix code E =", Ein), field("word w", wIn)), out);
  function run() {
    const D = DFAS[sel.value], E = [...new Set(parseList(Ein.value))];
    const w = [...(wIn.value || "")].filter((c) => D.A.includes(c)).join("");
    const M = imageMonoid(D), pc = prefixCode(E);
    if (pc.hasNil) { out.innerHTML = `<p class="err">[] ∈ E — <code>factor_remainder</code> needs <code>[] ∉ E</code>.</p>`; return; }
    const { es, r } = factor(E, w);
    const dI = M.evalWord(flatten(es)), fI = M.evalWord(r), pI = M.mul(dI, fI);
    const pairs = [];
    for (let i = 0; i < M.elems.length; i++) for (let j = 0; j < M.elems.length; j++) if (M.inF(M.mul(i, j))) pairs.push([i, j]);
    out.innerHTML = `
      <p class="small muted"><code>PrefixCode E</code>: ${yes(pc.ok)}${pc.ok ? "" : ` <span class="small">(the identity below needs only <code>[] ∉ E</code>, which holds)</span>`}.
      The ${M.elems.length} monoid elements m0…m${M.elems.length - 1} are the distinct <code>T w</code> (see the DFA widget); F = {m | m start ∈ accept}.</p>
      <ol class="steps2">
        <li><b>Factor</b> (<code>factor_remainder</code>): ${wordSpan(w)} = ${es.map((e) => `<span class="cell blk b0">${W(e)}</span>`).join("")}${es.length ? " ++ " : ""}<span class="cell rem">${W(r)}</span>
          &nbsp;→&nbsp; <code>es.flatten</code> = ${wordSpan(flatten(es))}, <code>r</code> = ${wordSpan(r)} ∈ remainder E: ${yes(inRemainder(E, r))}</li>
        <li><b>Values</b>: d = T(es.flatten) = <b>m${dI}</b>, f = T(r) = <b>m${fI}</b>, and d·f = <b>m${pI}</b> (= T(w), because T is a homomorphism: ${yes(M.evalWord(w) === pI)})</li>
        <li><b>Membership</b>: d·f ∈ F: ${yes(M.inF(pI))} &nbsp;·&nbsp; the DFA ${accepts(D, w) ? "accepts" : "rejects"} ${wordSpan(w)} — the two always agree.</li>
        <li><b>Which piece</b>: ${wordSpan(w)} lies in <code>A m${dI} * B m${fI}</code>, where
          <code>A d = {u ∈ E∗ | T u = d}</code> (height ≤ 3 via <code>graph_fiber</code>) and
          <code>B f = {v ∈ remainder E | T v = f}</code> (height ≤ 1).</li>
        <li><b>The union</b>: <code>{w | T w ∈ F} = ⨆ p : I, A p.1 * B p.2</code> over
          I = {(d, f) | d·f ∈ F}. Among the ${M.elems.length}² = ${M.elems.length ** 2} pairs of realized elements, <b>${pairs.length}</b> qualify${pairs.length ? `: ${pairs.slice(0, 12).map(([i, j]) => `<code${i === dI && j === fI ? ' class="hit"' : ""}>(m${i},m${j})</code>`).join(" ")}${pairs.length > 12 ? ` and ${pairs.length - 12} more` : ""}` : ""}.
          Lean takes I over all of M × M (${fullMonoidSize(D)}² pairs); the extra ones give empty languages, which is harmless.</li>
      </ol>
      <p class="small muted">Everything above is computed, not asserted — but it only shows the <b>set identity</b>, which holds for any E with <code>[] ∉ E</code>.
      The <b>height</b> bounds (3 for A d, 1 for B f) need the specific prefix code that
      <a href="#/node/SourceSchedule.episode_linear_graphs">episode_linear_graphs</a> constructs, and this E is not it.</p>`;
  }
  for (const i of [Ein, wIn]) i.addEventListener("input", run);
  sel.addEventListener("change", run);
  run();
}

// ---------------------------------------------------------------- walkthrough
// A proof outline: every step shown at once. Click a step to show its note, Lean and the nodes it
// uses below the outline; the first step is selected to begin with. Markup in assets/walkthrough.js.
function walkthroughWidget(el, cfg = {}) {
  const steps = cfg.steps || [];
  const listBox = h("div", { class: "flow wt" }), detail = h("div", { class: "wtdetail" });
  let i = 0;
  el.append(listBox, detail);
  function run() {
    listBox.innerHTML = outlineHtml(steps, i);
    listBox.querySelectorAll(".step").forEach((d) => d.addEventListener("click", (ev) => { if (ev.target.tagName !== "A") { i = +d.dataset.j; run(); } }));
    detail.innerHTML = stepDetailHtml(steps[i]);
  }
  run();
}

export const INTERACTIVE = {
  build: buildWidget, "lang-tree": langTreeWidget, "height-lab": heightLabWidget, "union-lab": unionLabWidget,
  "dfa-lab": dfaLabWidget, "factor-lab": factorLabWidget, blocks: blocksWidget, "graph-lab": graphLabWidget,
  "vector-lab": vectorLabWidget, decompose: decomposeWidget, walkthrough: walkthroughWidget,
};
