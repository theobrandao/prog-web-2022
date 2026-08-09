/**
 * Blocklist matching (§5.2 check 9). Normalize to lowercase, strip accents,
 * collapse whitespace, then substring-match each term against the title.
 */

export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining accents
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Parse a comma- or newline-separated blocklist string into normalized terms. */
export function parseBlocklist(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((t) => normalize(t))
    .filter((t) => t.length > 0);
}

/** Returns the first matched term, or null if the title is clean. */
export function matchedBlocklistTerm(title: string, raw: string): string | null {
  const normTitle = normalize(title);
  for (const term of parseBlocklist(raw)) {
    if (normTitle.includes(term)) return term;
  }
  return null;
}
