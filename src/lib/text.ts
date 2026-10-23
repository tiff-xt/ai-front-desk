/** Lowercase, unify quotes, drop punctuation that carries no meaning for matching. */
export const normalize = (q: string) =>
  q
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9'.:/$° ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** Escape text for use inside a RegExp. Keywords are typed by staff, so "c++" or "(lunch)" must not break matching. */
export const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
