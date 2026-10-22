// Proof-outline (walkthrough widget) markup, kept pure so tools/test_widgets.mjs can check it.
// All steps are always shown; clicking one selects it and shows its detail (note, Lean, nodes used).
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const nodeHref = (id) => `#/node/${encodeURIComponent(id)}`;

/** The outline: every step, the selected one (index `sel`) marked "on". */
export function outlineHtml(steps, sel = 0) {
  return steps.map((s, j) => `${j ? '<div class="arrow">↓</div>' : ""}<div class="step${s.hard ? " hard" : ""}${j === sel ? " on" : ""}" data-j="${j}">${s.link ? `<a href="${nodeHref(s.link)}">${esc(s.text)}</a>` : esc(s.text)}</div>`).join("");
}

/** Detail for one step: its note, its Lean, and the nodes it uses (deduplicated, link last). */
export function stepDetailHtml(s = {}) {
  const uses = [...(s.uses || []), ...(s.link ? [s.link] : [])].filter((v, k, a) => a.indexOf(v) === k);
  return `
      ${s.note ? `<p>${esc(s.note)}</p>` : ""}
      ${s.lean ? `<pre class="lean"><span class="var">${esc(s.lean)}</span></pre>` : ""}
      ${uses.length ? `<div class="small"><b>Nodes used here:</b> <span class="deps">${uses.map((u) => `<a href="${nodeHref(u)}">${esc(u)}</a>`).join("")}</span></div>` : ""}`;
}
