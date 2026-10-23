import type { GuardResult } from './types'

/**
 * The grounding guard. An LLM may rephrase an answer, but every checkable
 * claim in its output — numbers, prices, times, temperatures, weekdays,
 * months — must already appear in the facts we computed. If anything doesn't,
 * we discard the LLM text and fall back to the deterministic template.
 *
 * It's intentionally strict: a false alarm costs some warmth; a false pass
 * could tell a parent the wrong closing time.
 */

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
const MONTH_ABBR = MONTHS.map((m) => m.slice(0, 3))

function numbers(text: string): string[] {
  const out: string[] = []
  for (const m of text.matchAll(/\d[\d,]*(?:[.:]\d+)?/g)) {
    const raw = m[0].replace(/,/g, '').replace(/[.:]$/, '')
    out.push(raw)
    // "7:00" also licenses a bare "7" ("7am"); "100.4" stays exact.
    if (raw.includes(':')) {
      out.push(raw.split(':')[0])
      if (raw.endsWith(':00')) out.push(raw.slice(0, -3))
    }
  }
  return out
}

function words(text: string): string[] {
  const t = text.toLowerCase()
  const found: string[] = []
  WEEKDAYS.forEach((d) => {
    if (new RegExp(`\\b${d.slice(0, 3)}(${d.slice(3)})?\\b`).test(t)) found.push(d)
  })
  MONTHS.forEach((m, i) => {
    if (new RegExp(`\\b${MONTH_ABBR[i]}(${m.slice(3)})?\\b`).test(t) && m !== 'may') found.push(m)
  })
  return found
}

export function guard(candidate: string, grounding: string[]): GuardResult {
  const allowed = grounding.join('\n')
  const allowedNums = new Set(numbers(allowed))
  const allowedWords = new Set(words(allowed))

  const claimsNums = [...new Set(numbers(candidate))]
  const claimsWords = [...new Set(words(candidate))]
  const unsupported = [...claimsNums.filter((n) => !allowedNums.has(n)), ...claimsWords.filter((w) => !allowedWords.has(w))]

  return { passed: unsupported.length === 0, checked: [...claimsNums, ...claimsWords], unsupported }
}
