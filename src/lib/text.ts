/** Lowercase, unify quotes, drop punctuation that carries no meaning for matching. */
export const normalize = (q: string) =>
  q
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9'.:/$° ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
