// The single place that turns a Lean source location into a URL. Everything that links to the
// source (node pages, the proof view) goes through `sourceUrl`, so switching to the on-site rendered
// source pages (proof-sites CONVENTIONS §7: `src/<file>.html#L<a>-L<b>`) is a one-line change here:
// set SOURCE_BASE to "src/" once dist/src/ is built. The agent prompt keeps the GitHub URL on purpose
// (agents work from the repo), via githubSourceUrl.
export const REPO = "tangentproofs/star-height";
export const BRANCH = "main";
export const BLOB = `https://github.com/${REPO}/blob/${BRANCH}`;
/** Site-relative directory of the rendered source pages, or null while there are none. */
export const SOURCE_BASE = null;

const anchor = (from, to) => (from ? `#L${from}${to && to !== from ? `-L${to}` : ""}` : "");

/** GitHub URL for lines `from`–`to` (inclusive; both optional) of `file` (repo-relative path). */
export const githubSourceUrl = (file, from, to) => `${BLOB}/${file}${anchor(from, to)}`;

/** URL for that location given a rendered-source base (null → GitHub). Pure, for tests. */
export const sourceUrlFor = (base, file, from, to) => (base ? `${base}${file}.html${anchor(from, to)}` : githubSourceUrl(file, from, to));

/** URL a reader should follow for that source location. */
export const sourceUrl = (file, from, to) => sourceUrlFor(SOURCE_BASE, file, from, to);
