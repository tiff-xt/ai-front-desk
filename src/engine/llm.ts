import { guard } from './guard'
import type { Answer, AnyTopic, GuardResult } from './types'

/**
 * Optional LLM layer, reached through a Cloudflare Worker that holds the API
 * key. Two narrow jobs only:
 *   1. classify a question the rules couldn't place, and
 *   2. rephrase a grounded draft warmly, in the parent's language.
 * Facts never come from here. Every rephrase passes through the grounding
 * guard, and safety messages (urgent, handoff) are never rewritten.
 */

export const API_URL: string = (import.meta.env?.VITE_FRONT_DESK_API as string | undefined)?.replace(/\/$/, '') ?? ''
export const llmEnabled = () => API_URL.length > 0

async function post<T>(path: string, body: unknown, timeoutMs = 7000): Promise<T | null> {
  if (!llmEnabled()) return null
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

const CLASSIFIABLE: AnyTopic[] = [
  'hours',
  'tuition',
  'illness',
  'lunch',
  'tours',
  'policies',
  'billing',
  'incidents',
  'custody',
  'medical',
  'unknown',
]

export async function classify(question: string): Promise<AnyTopic | null> {
  const r = await post<{ topic?: string }>('/classify', { question, topics: CLASSIFIABLE })
  const t = r?.topic as AnyTopic | undefined
  return t && CLASSIFIABLE.includes(t) ? t : null
}

export interface PhraseResult {
  text: string
  guard: GuardResult
  used: boolean
}

/** Language + faithful English translation of a non-English question. */
export async function understandLanguage(question: string): Promise<{ lang: string; english: string } | null> {
  const r = await post<{ lang?: string; english?: string }>('/understand', { question })
  if (!r?.lang || !r.english) return null
  return { lang: r.lang.slice(0, 2), english: r.english }
}

/**
 * Translate a grounded answer into the parent's language: faithfully and
 * completely, never summarized. English answers keep their exact template
 * wording (an early test had a "rephrase" drop a child's allergy), and urgent
 * answers use pre-written translations, so neither comes here.
 */
export async function phrase(answer: Answer, lang: string): Promise<PhraseResult | null> {
  if (answer.status === 'urgent' || lang === 'en') return null
  return translateGuarded(lang, answer.text, answer.trace.facts)
}

/** Translate a staff-written message for a parent. Guarded against the English original. */
export async function translateFor(lang: string, text: string): Promise<PhraseResult | null> {
  if (lang === 'en') return null
  return translateGuarded(lang, text, [text])
}

/**
 * The question is deliberately not sent: given it, models "helpfully" trim the
 * answer to what was asked (dropping, say, the infant ratio), and the guard
 * rejects the omission. One retry, because a second sample usually passes.
 */
async function translateGuarded(lang: string, draft: string, facts: string[]): Promise<PhraseResult | null> {
  let last: PhraseResult | null = null
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await post<{ text?: string }>('/phrase', { question: '', draft, lang, mode: 'translate' })
    const text = r?.text?.trim()
    if (!text) return last
    const g = guard(text, facts, draft)
    last = { text, guard: g, used: g.passed }
    if (g.passed) return last
  }
  return last
}
