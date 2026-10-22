// Interactive demos. Each widget is mount(el, config) and is self-contained.
// The hands-on ones live in widgets-interactive.js; the pure logic they share lives in
// regex.js / automata.js / episodes.js / vectors.js (tested by tools/test_widgets.mjs).
import { parse, height, toLean, wordsUpTo, tree, show, maxN } from "./regex.js";
import { DFAS, imageMonoid } from "./automata.js";
import { prefixCode, allIn, flatten, factor, graphWords, updateTrace } from "./episodes.js";
import { MONOIDS, basis, applyAction } from "./vectors.js";
import { h, esc, wordSpan, field, parseAlphabet, parseList } from "./dom.js";
import { INTERACTIVE } from "./widgets-interactive.js";

// ---------------------------------------------------------------- regex
function regexWidget(el, cfg = {}) {
  const expr = h("input", { type: "text", value: cfg.expr ?? "(a+b)*", spellcheck: "false", class: "mono" });
  const alpha = h("input", { type: "text", value: cfg.alphabet ?? "ab", size: 6, class: "mono" });
  const n = h("input", { type: "number", value: cfg.n ?? 4, min: 0, max: 14, style: "width:4.5em" });
  const test = h("input", { type: "text", placeholder: "test a word, e.g. abab", class: "mono", style: "max-width:14rem" });
  const out = h("div");
  const presets = cfg.presets ? h("div", { class: "row" }, h("label", {}, "try:"),
    cfg.presets.map((p) => h("button", { onclick: () => { expr.value = p; run(); } }, p))) : null;
  el.append(h("div", { class: "row" }, field("expression", expr)),
    h("div", { class: "row" }, field("alphabet Σ =", alpha), field("words up to length", n), test), presets, out);
  function run() {
    const A = parseAlphabet(alpha.value);
    out.innerHTML = "";
    if (!A.length) { out.innerHTML = `<p class="err">alphabet needs at least one letter a–z</p>`; return; }
    let e;
    try { e = parse(expr.value, A); } catch (err) { out.innerHTML = `<p class="err">${esc(err.message)}</p>`; return; }
    const cap = maxN(A);
    const N = Math.min(+n.value || 0, cap);
    const words = wordsUpTo(e, A, N);
    const t = test.value.trim();
    let testHtml = "";
    if (t) {
      if ([...t].some((c) => !A.includes(c))) testHtml = `<p class="err">“${esc(t)}” uses letters outside Σ</p>`;
      else {
        const inL = wordsUpTo(e, A, t.length).includes(t);
        testHtml = `<p>${wordSpan(t)} ${inL ? '<b class="ok" style="color:var(--green)">∈</b>' : '<b style="color:var(--pink)">∉</b>'} language</p>`;
      }
    }
    const rows = tree(e).map((r) => `${"  ".repeat(r.depth)}${r.label.padEnd(10)} <span class="h">height ${r.h}</span>   ${esc(r.text)}`).join("\n");
    out.innerHTML = `
      <p><b>height = <span style="color:var(--purple)">${height(e)}</span></b> &nbsp; <span class="muted small">normalized: <code>${esc(show(e))}</code></span></p>
      <p class="small muted">Lean term: <code>${esc(toLean(e))}</code></p>
      <details><summary class="small">subterm heights</summary><div class="tree">${rows}</div></details>
      ${testHtml}
      <p class="small muted">${words.length} word(s) of length ≤ ${N}${N < +n.value ? ` (capped at ${N} for this alphabet)` : ""}:</p>
      <div class="words">${words.map((w) => wordSpan(w)).join("") || '<span class="muted">none</span>'}</div>`;
  }
  for (const i of [expr, alpha, n, test]) i.addEventListener("input", run);
  run();
}

// ---------------------------------------------------------------- compare
function compareWidget(el, cfg = {}) {
  const e1 = h("input", { type: "text", value: cfg.left ?? "(ab)*", class: "mono" });
  const e2 = h("input", { type: "text", value: cfg.right ?? "~(b~0 + ~0a + ~0(aa+bb)~0)", class: "mono" });
  const alpha = h("input", { type: "text", value: cfg.alphabet ?? "ab", size: 6, class: "mono" });
  const n = h("input", { type: "number", value: cfg.n ?? 8, min: 0, max: 14, style: "width:4.5em" });
  const out = h("div");
  el.append(h("div", { class: "row" }, field("P =", e1)), h("div", { class: "row" }, field("Q =", e2)),
    h("div", { class: "row" }, field("Σ =", alpha), field("compare words up to length", n)), out);
  function run() {
    const A = parseAlphabet(alpha.value);
    let p, q;
    try { p = parse(e1.value, A); q = parse(e2.value, A); } catch (err) { out.innerHTML = `<p class="err">${esc(err.message)}</p>`; return; }
    const N = Math.min(+n.value || 0, maxN(A));
    const a = wordsUpTo(p, A, N), b = wordsUpTo(q, A, N);
    const sa = new Set(a), sb = new Set(b);
    const onlyA = a.filter((w) => !sb.has(w)), onlyB = b.filter((w) => !sa.has(w));
    const same = !onlyA.length && !onlyB.length;
    out.innerHTML = `
      <p>height(P) = <b style="color:var(--purple)">${height(p)}</b>, height(Q) = <b style="color:var(--purple)">${height(q)}</b></p>
      <p>${same ? `<b style="color:var(--green)">Same ${a.length} words up to length ${N}.</b> <span class="muted small">(Evidence, not proof: languages could still differ on longer words.)</span>`
        : `<b style="color:var(--pink)">Different.</b> Only in P: <span class="words">${onlyA.slice(0, 30).map((w) => wordSpan(w, "diff")).join("") || "–"}</span> Only in Q: <span class="words">${onlyB.slice(0, 30).map((w) => wordSpan(w, "diff")).join("") || "–"}</span>`}</p>`;
  }
  for (const i of [e1, e2, alpha, n]) i.addEventListener("input", run);
  run();
}

// ---------------------------------------------------------------- dfa-monoid
function dfaMonoidWidget(el, cfg = {}) {
  const sel = h("select", {}, Object.keys(DFAS).map((k) => h("option", { value: k }, k)));
  sel.value = cfg.dfa ?? "contains ab";
  const w = h("input", { type: "text", value: cfg.word ?? "bab", class: "mono", style: "max-width:12rem" });
  const out = h("div");
  el.append(h("div", { class: "row" }, field("DFA (L)", sel), field("word w", w)), out);
  function run() {
    const D = DFAS[sel.value];
    const M = imageMonoid(D);
    const word = [...w.value.trim()].filter((c) => D.A.includes(c)).join("");
    const t = M.evalWord(word);
    const acc = (i) => M.inF(i);
    const head = D.Q.map((q) => `<th>${esc(q)}↦</th>`).join("");
    const rows = M.elems.map((m, i) => `<tr><td class="${i === t ? "hit" : ""}">m${i}</td><td>${wordSpan(m.w)}</td>${m.f.map((q) => `<td>${esc(D.Q[q])}</td>`).join("")}<td class="${acc(i) ? "acc" : ""}">${acc(i) ? "∈ F" : ""}</td></tr>`).join("");
    const mul = M.elems.length <= 9 ? `<details><summary class="small">multiplication table of M (row · column = read row's word, then column's)</summary><table class="t"><tr><th>·</th>${M.elems.map((_, j) => `<th>m${j}</th>`).join("")}</tr>${M.elems.map((_, i) => `<tr><th>m${i}</th>${M.elems.map((_, j) => `<td>m${M.mul(i, j)}</td>`).join("")}</tr>`).join("")}</table></details>` : "";
    out.innerHTML = `
      <p class="small muted">States ${D.Q.map(esc).join(", ")}; start ${esc(D.Q[D.start])}; accepting {${D.accept.map((i) => esc(D.Q[i])).join(", ")}}.
      Each element of the finite monoid <code>M</code> is “what a word does to every state at once”. There are <b>${M.elems.length}</b>, no matter how long the words get.</p>
      <table class="t"><tr><th>m</th><th>shortest word</th>${head}<th>F?</th></tr>${rows}</table>
      <p>T(${wordSpan(word)}) = <b>m${t}</b>, so ${wordSpan(word)} ${acc(t) ? "<b style='color:var(--green)'>∈ L</b>" : "<b style='color:var(--pink)'>∉ L</b>"} &nbsp;<span class="small muted">(F = elements that send the start state to an accepting state)</span></p>
      ${mul}`;
  }
  sel.addEventListener("change", run); w.addEventListener("input", run);
  run();
}

// ---------------------------------------------------------------- factor
function factorWidget(el, cfg = {}) {
  const E = h("input", { type: "text", value: cfg.E ?? "ab, b", class: "mono" });
  const w = h("input", { type: "text", value: cfg.word ?? "babbaa", class: "mono", style: "max-width:14rem" });
  const out = h("div");
  el.append(h("div", { class: "row" }, field("E (comma-separated; ε = empty word)", E)), h("div", { class: "row" }, field("word w", w)), out);
  function run() {
    const es = [...new Set(parseList(E.value))];
    const word = w.value.trim();
    const pc = prefixCode(es);
    const hasNil = pc.hasNil, prefixClash = pc.clashes, isPC = pc.ok;
    const { es: blocks, r: rest, steps } = hasNil ? { es: [], r: word, steps: [] } : factor(es, word);
    const choice = steps.some((st) => st.cands.length > 1);
    out.innerHTML = `
      <p><code>[] ∉ E</code>: ${hasNil ? "<b style='color:var(--pink)'>no</b> — then every word starts with an E-word (the empty one), so <code>remainder E</code> is empty and the factoring lemma does not apply." : "<b style='color:var(--green)'>yes</b>"}
      &nbsp; <code>PrefixCode E</code>: ${isPC ? "<b style='color:var(--green)'>yes</b>" : `<b style='color:var(--pink)'>no</b>${prefixClash.length ? ` (${prefixClash.slice(0, 3).map(([e, f]) => `${wordSpan(e)} is a prefix of ${wordSpan(f)}`).join(", ")})` : ""}`}</p>
      ${hasNil ? "" : `<p>w = ${blocks.map((b) => `<span class="words" style="display:inline-flex"><span style="background:#2c4a5a">${esc(b)}</span></span>`).join(" · ")}${blocks.length ? " · " : ""}<span class="words" style="display:inline-flex"><span style="background:#5a4a20">${rest === "" ? "ε" : esc(rest)}</span></span></p>
      <p class="small muted">blue = <code>es</code> (each block ∈ E), gold = <code>r</code> (no word of E is a prefix of r, i.e. <code>r ∈ remainder E</code>), and <code>w = es.flatten ++ r</code>.
      ${choice ? "<br><b style='color:var(--orange)'>Note:</b> at some step more than one E-word fit (E is not a prefix code); this demo took the shortest. The lemma only claims <i>some</i> factorization exists." : isPC ? "<br>Because E is a prefix code, there was never a choice: this factorization is the only one." : ""}</p>`}`;
  }
  E.addEventListener("input", run); w.addEventListener("input", run);
  run();
}

// ---------------------------------------------------------------- graph-walk
function graphWalkWidget(el, cfg = {}) {
  const E = h("input", { type: "text", value: cfg.E ?? "a, ba, bb", class: "mono" });
  const k = h("input", { type: "number", value: cfg.k ?? 3, min: 1, max: 9, style: "width:4em" });
  const x = h("input", { type: "number", value: cfg.x ?? 0, min: 0, style: "width:4em" });
  const y = h("input", { type: "number", value: cfg.y ?? 1, min: 0, style: "width:4em" });
  const n = h("input", { type: "number", value: cfg.n ?? 5, min: 0, max: 10, style: "width:4em" });
  const out = h("div");
  el.append(h("div", { class: "row" }, field("blocks D =", E)),
    h("div", { class: "row" }, field("states S = ℤ/", k), field("x =", x), field("y =", y), field("max length", n)),
    h("p", { class: "small muted" }, "Update rule G e s = s + (number of a's in e) mod k. A word is in graph D G x y when it can be cut into D-blocks so that, starting from x and applying G block by block, you end at y."),
    out);
  function run() {
    const D = [...new Set(parseList(E.value))].filter((e) => e !== "");
    const K = Math.max(1, +k.value || 1), X = ((+x.value % K) + K) % K, Y = ((+y.value % K) + K) % K, N = Math.min(+n.value || 0, 10);
    const G = (e, s) => (s + [...e].filter((c) => c === "a").length) % K;
    const found = new Map(graphWords(D, G, X, Y, N).map(({ w, es }) => [w, es]));
    const words = [...found.keys()];
    out.innerHTML = `<p>${words.length} word(s) of length ≤ ${N} in <code>graph D G ${X} ${Y}</code>:</p>
      <table class="t"><tr><th>w</th><th>blocks es</th><th>states visited</th></tr>${words.slice(0, 40).map((w) => {
        const es = found.get(w); let s = X; const trace = [s]; for (const e of es) { s = G(e, s); trace.push(s); }
        return `<tr><td>${wordSpan(w)}</td><td>${es.map(esc).join(" · ") || "(none)"}</td><td>${trace.join(" → ")}</td></tr>`;
      }).join("")}</table>${words.length > 40 ? `<p class="small muted">…and ${words.length - 40} more</p>` : ""}`;
  }
  for (const i of [E, k, x, y, n]) i.addEventListener("input", run);
  run();
}

// ---------------------------------------------------------------- right-regular
function rightRegularWidget(el, cfg = {}) {
  const sel = h("select", {}, Object.keys(MONOIDS).map((k) => h("option", { value: k }, k)));
  sel.value = cfg.monoid ?? "{1, a, b} with xa = a, xb = b";
  const dSel = h("select");
  const vec = h("div", { class: "row" });
  const out = h("div");
  el.append(h("div", { class: "row" }, field("monoid M", sel), field("d =", dSel)), h("p", { class: "small muted" }, "A vector v ∈ V M = M → ZMod 2 is a 0/1 label on each element of M. Tick to set v:"), vec, out);
  let v = [];
  function setup() {
    const M = MONOIDS[sel.value];
    dSel.innerHTML = M.names.map((nm, i) => `<option value="${i}">${nm}</option>`).join("");
    dSel.value = String(M.names.length - 1);
    v = basis(M.names.length, 0);
    vec.innerHTML = "";
    M.names.forEach((nm, i) => {
      const cb = h("input", { type: "checkbox" }); cb.checked = !!v[i];
      cb.addEventListener("change", () => { v[i] = cb.checked ? 1 : 0; run(); });
      vec.append(h("label", {}, cb, ` v(${nm})`));
    });
    run();
  }
  function run() {
    const M = MONOIDS[sel.value], d = +dSel.value, nm = M.names;
    const img = applyAction(M, d, v);
    out.innerHTML = `
      <p><code>action M d</code> sends basis vector <code>basis m</code> to <code>basis (m * d)</code>:</p>
      <table class="t"><tr>${nm.map((x) => `<th>basis ${x}</th>`).join("")}</tr><tr>${nm.map((_, m) => `<td>↦ basis ${nm[M.mul(m, d)]}</td>`).join("")}</tr></table>
      <p>v = (${nm.map((x, i) => `${x}:${v[i]}`).join(", ")}) &nbsp;⟼&nbsp; action ${nm[d]} v = (${nm.map((x, i) => `${x}:<b>${img[i]}</b>`).join(", ")})</p>
      <p class="small muted">Starting from <code>basis 1</code> (only the identity ticked), the result is <code>basis d</code>; that is <code>value_recovery</code>. Linear extension adds mod 2, so two elements landing on the same spot cancel.</p>`;
  }
  sel.addEventListener("change", setup); dSel.addEventListener("change", run);
  setup();
}

// ---------------------------------------------------------------- outline
function outlineWidget(el, cfg = {}) {
  el.append(h("div", { class: "flow", html: (cfg.steps || []).map((s, i) =>
    `${i ? '<div class="arrow">↓</div>' : ""}<div class="step${s.hard ? " hard" : ""}">${s.link ? `<a href="#/node/${encodeURIComponent(s.link)}">${esc(s.text)}</a>` : esc(s.text)}${s.note ? `<div class="small muted">${esc(s.note)}</div>` : ""}</div>`).join("") }));
}

const REGISTRY = { regex: regexWidget, compare: compareWidget, "dfa-monoid": dfaMonoidWidget, factor: factorWidget,
  "graph-walk": graphWalkWidget, "right-regular": rightRegularWidget, outline: outlineWidget, ...INTERACTIVE };

export function mountWidget(container, spec) {
  const box = h("div", { class: "widget" });
  if (spec.title) box.append(h("h3", {}, spec.title));
  container.append(box);
  const f = REGISTRY[spec.type];
  if (!f) { box.append(h("p", { class: "err" }, `unknown widget ${spec.type}`)); return; }
  try { f(box, spec.config || {}); } catch (e) { box.append(h("p", { class: "err" }, e.message)); }
}
