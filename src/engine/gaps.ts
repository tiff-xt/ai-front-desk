import { tokens } from './retrieve'

/**
 * Group questions the desk couldn't answer (or answered badly) into topics, so
 * an operator writes one answer for six parents instead of six replies.
 * Greedy single-link clustering on shared content words: tiny, explainable,
 * and good enough for a front desk's volume.
 */
export interface Cluster<T> {
  key: string
  terms: string[]
  items: T[]
}

const GENERIC = new Set(['child', 'kid', 'school', 'today', 'tomorrow', 'week', 'day', 'come', 'open', 'accept', 'take'])

export function clusterQuestions<T extends { question: string }>(items: T[]): Cluster<T>[] {
  const clusters: { terms: Map<string, number>; items: T[] }[] = []
  for (const item of items) {
    const words = tokens(item.question).filter((w) => !GENERIC.has(w))
    const best = clusters.map((c) => ({ c, overlap: words.filter((w) => c.terms.has(w)).length })).sort((a, b) => b.overlap - a.overlap)[0]
    if (best && best.overlap >= 1) {
      best.c.items.push(item)
      words.forEach((w) => best.c.terms.set(w, (best.c.terms.get(w) ?? 0) + 1))
    } else {
      clusters.push({ terms: new Map(words.map((w) => [w, 1])), items: [item] })
    }
  }
  return clusters
    .map((c) => {
      const terms = [...c.terms.entries()].sort((a, b) => b[1] - a[1]).map(([w]) => w)
      return {
        key: terms.slice(0, 2).join(' '),
        terms: terms.filter((w) => (c.terms.get(w) ?? 0) > 1 || c.items.length === 1).slice(0, 5),
        items: c.items,
      }
    })
    .sort((a, b) => b.items.length - a.items.length)
}
