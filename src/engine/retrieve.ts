import type { HandbookSection, Knowledge } from '@/data/types'
import { normalize } from '@/lib/text'

const STOP = new Set(
  'a an the is are am be to of for in on at by with my our your you we i it can could would should do does did what when where how why who which there this that these those and or if me us they them will just about any have has get got need want please hi hello thanks thank'.split(
    ' ',
  ),
)

export const tokens = (q: string) =>
  normalize(q)
    .split(' ')
    .map((w) => w.replace(/[^a-z0-9]/g, ''))
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map((w) => w.replace(/(ies)$/, 'y').replace(/([^s])s$/, '$1'))

export interface Hit {
  section: HandbookSection
  score: number
}

/**
 * Keyword retrieval over handbook sections. Deliberately simple and
 * inspectable: operators can see exactly why a section matched and fix it by
 * adding a keyword. Score = keyword phrase hits (weighted) + token overlap.
 */
export function searchHandbook(k: Knowledge, question: string): Hit[] {
  const q = normalize(question)
  const qt = new Set(tokens(question))
  return k.handbook
    .map((section) => {
      let score = 0
      for (const kw of section.keywords) if (new RegExp(`\\b${kw.toLowerCase()}`).test(q)) score += kw.includes(' ') ? 3 : 2
      for (const w of tokens(section.title)) if (qt.has(w)) score += 1
      return { section, score }
    })
    .filter((h) => h.score >= 2)
    .sort((a, b) => b.score - a.score)
}
