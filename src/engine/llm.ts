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
 * Rewrite (English) or rewrite-and-translate a grounded answer. Handoffs and
 * drafts held for review are only ever translated faithfully, never rewritten.
 * Urgent answers never come here; they use pre-written translations.
 */
export async function phrase(question: string, answer: Answer, lang = 'en'): Promise<PhraseResult | null> {
  if (answer.status === 'urgent') return null
  const faithful = answer.status === 'handoff' || answer.status === 'review'
  if (faithful && lang === 'en') return null
  const r = await post<{ text?: string }>('/phrase', { question, draft: answer.text, lang, mode: faithful ? 'translate' : 'rewrite' })
  const text = r?.text?.trim()
  if (!text) return null
  const g = guard(text, answer.trace.facts)
  return { text, guard: g, used: g.passed }
}

/** Translate a staff-written message for a parent. Guarded against the English original. */
export async function translateFor(lang: string, text: string): Promise<PhraseResult | null> {
  if (lang === 'en') return null
  const r = await post<{ text?: string }>('/phrase', { question: '', draft: text, lang, mode: 'translate' })
  const out = r?.text?.trim()
  if (!out) return null
  const g = guard(out, [text])
  return { text: out, guard: g, used: g.passed }
}
