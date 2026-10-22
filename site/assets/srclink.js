// Links into the browsable source pages (src/<file>.html, built by tools/build_source.mjs).
// Shared by the app, the build and tools/test_source.mjs, so every "File.lean lines a–b" on the
// site points at the same rendered anchor: src/<path>.lean.html#L<a>-L<b> highlights those lines.
export const REPO = "tangentproofs/star-height";
export const GITHUB_BLOB = `https://github.com/${REPO}/blob/main`;

const frag = (line, endLine) => (line ? `#L${line}` + (endLine && endLine !== line ? `-L${endLine}` : "") : "");

/** On-site rendered source, relative to the site root (prefix with `root` from deeper pages). */
export const srcHref = (file, line, endLine, root = "") => `${root}src/${file}.html${frag(line, endLine)}`;
/** The same lines on GitHub (secondary link). */
export const githubHref = (file, line, endLine) => `${GITHUB_BLOB}/${file}${frag(line, endLine)}`;
/** "Main.lean lines 9–28" (or "line 9"). With `full`, the whole repo path. */
export function srcLabel(file, line, endLine, full = false) {
  const name = full ? file : file.split("/").pop();
  if (!line) return name;
  return endLine && endLine !== line ? `${name} lines ${line}–${endLine}` : `${name} line ${line}`;
}
