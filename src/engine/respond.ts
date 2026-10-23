import { detectLang, UNVERIFIED_NOTE, URGENT, type UiLang } from '@/lib/lang'
import { answerQuestion, type EngineInput } from './answer'
import { classify, llmEnabled, phrase, translateFor, understandLanguage } from './llm'
import type { Answer } from './types'
import { understand } from './understand'

/**
 * The full path of one parent question, start to finish:
 *
 *   1. Language   English goes straight through; anything else is translated
 *                 to English (the engine only reasons in English).
 *   2. Answer     answerQuestion(): safety screens → intent → policy logic →
 *                 autonomy → a cited Answer. Deterministic; no LLM.
 *   3. Classify   Only if the rules found nothing, the LLM may suggest a topic;
 *                 the rules then answer it (the LLM never supplies facts).
 *   4. Localize   Urgent text uses pre-written translations. Everything else is
 *                 translated faithfully and checked by the guard both ways.
 *
 * Without an LLM configured, steps 1/3/4 are skipped and every answer still works.
 */

export interface RespondInput {
  question: string
  /** For tapped suggestions: the English meaning is already known, so no translation round-trip. */
  englishHint?: string
  uiLang: UiLang
  engine: Omit<EngineInput, 'question'>
}

export interface Response {
  answer: Answer
  /** ISO 639-1 code of the parent's language. */
  lang: string
  /** The English the engine reasoned over (equal to the question for English speakers). */
  english: string
  /** True when a translation failed the guard and the parent got the verified English instead. */
  unverified: boolean
}

export async function respond({ question, englishHint, uiLang, engine }: RespondInput): Promise<Response> {
  const steps: string[] = []

  // 1. Language
  let lang = 'en'
  let english = question
  if (englishHint) {
    lang = question === englishHint ? 'en' : uiLang
    english = englishHint
  } else {
    const guess = detectLang(question)
    if (guess !== 'en') {
      const u = llmEnabled() ? await understandLanguage(question) : null
      if (u) {
        lang = u.lang
        english = u.english
        if (lang !== 'en') steps.push(`Detected ${lang.toUpperCase()}; engine reasoned over the English translation: “${english}”`)
      } else if (guess === 'es') {
        lang = 'es'
        steps.push('Detected Spanish; no translator configured, so the engine saw the original text')
      }
    }
  }

  // 2. Answer
  const input = { ...engine, question: english }
  let answer = answerQuestion(input)

  // 3. Classify (only when the rules found nothing)
  if (llmEnabled() && answer.topic === 'unknown') {
    const topic = await classify(english)
    if (topic && topic !== 'unknown') {
      const retry = answerQuestion(input, {
        ...understand(english, engine.knowledge, engine.now.date),
        topic,
        matched: `LLM classifier → ${topic}`,
      })
      if (retry.topic !== 'unknown') answer = { ...retry, trace: { ...retry.trace, classifier: 'llm' } }
    }
  }

  // 4. Localize
  let unverified = false
  if (lang !== 'en' && answer.status === 'urgent' && URGENT[lang]) {
    answer = { ...answer, text: URGENT[lang](engine.knowledge.center.phone) }
    steps.push(`Emergency text: pre-written ${lang.toUpperCase()} translation (never machine-translated)`)
  } else if (lang !== 'en' && llmEnabled()) {
    const p = await phrase(english, answer, lang)
    if (p) {
      steps.push(
        p.used
          ? `Translation (${lang.toUpperCase()}) passed the grounding guard`
          : `Translation rejected (${describeGuardFailure(p.guard)}) → verified English used`,
      )
      unverified = !p.used
      answer = {
        ...answer,
        text: p.used ? p.text : answer.text,
        trace: { ...answer.trace, guard: p.guard, writer: p.used ? 'llm' : 'template' },
      }
    }
  }
  if (unverified && UNVERIFIED_NOTE[lang]) answer = { ...answer, text: `${UNVERIFIED_NOTE[lang]}\n\n${answer.text}` }

  answer = { ...answer, trace: { ...answer.trace, steps: [...answer.trace.steps, ...steps] } }
  return { answer, lang, english, unverified }
}

/** A staff-written message, translated for the parent and checked; falls back to the verified English. */
export async function localizeForParent(text: string, lang: string): Promise<{ text: string; original?: string; unverified?: boolean }> {
  if (lang === 'en' || !llmEnabled()) return { text }
  const t = await translateFor(lang, text)
  if (t?.used) return { text: t.text, original: text }
  return { text: UNVERIFIED_NOTE[lang] ? `${UNVERIFIED_NOTE[lang]}\n\n${text}` : text, unverified: true }
}

export const describeGuardFailure = (g: { unsupported: string[]; missing?: string[] }) =>
  [...g.unsupported.map((x) => `added ${x}`), ...(g.missing ?? []).map((x) => `dropped ${x}`)].join(', ')
