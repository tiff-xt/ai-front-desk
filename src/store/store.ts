import { useSyncExternalStore } from 'react'
import { demoFamily, seedKnowledge } from '@/data/seed'
import type { HandbookSection, Knowledge } from '@/data/types'
import { answerQuestion, needsStaff } from '@/engine/answer'
import { DEFAULT_AUTONOMY, DEMO_NOW, TOPIC_LABELS } from '@/engine/defaults'
import { classify, llmEnabled, phrase, translateFor, understandLanguage } from '@/engine/llm'
import type { Answer, Autonomy, Topic } from '@/engine/types'
import { understand } from '@/engine/understand'
import { formatDay, formatTime, type Clock } from '@/lib/time'
import { SEED_LOG } from './seedLog'
import { detectLang, UNVERIFIED_NOTE, URGENT, type UiLang } from '@/lib/lang'

/**
 * One small store for both perspectives. The parent phone and the operator
 * console read the same state, so a staff reply or a knowledge edit shows up
 * on the other side immediately (and across browser tabs via BroadcastChannel).
 */

export interface LogEntry {
  id: string
  at: Clock
  question: string
  childId: string
  who: string
  answer: Answer
  feedback?: 'up' | 'down'
  /** Set when an operator answer later covered this question. */
  fixedBy?: string
  live?: boolean
  /** The parent's own words when they wrote in another language; `question` holds the English the engine used. */
  original?: string
  lang?: string
}

export type InboxKind = 'handoff' | 'review' | 'flag' | 'lunch' | 'tour' | 'absence'

export interface InboxItem {
  id: string
  at: Clock
  kind: InboxKind
  title: string
  who: string
  detail: string
  draft?: string
  logId?: string
  status: 'open' | 'done'
  live?: boolean
  original?: string
  lang?: string
}

export interface Message {
  id: string
  role: 'parent' | 'desk' | 'staff' | 'system'
  text: string
  at: Clock
  logId?: string
  /** For translated staff messages: the English the operator actually wrote. */
  original?: string
  /** True when a translation failed the guard and we showed the verified English instead. */
  unverified?: boolean
}

export interface Notice {
  id: string
  at: Clock
  kind: 'reply' | 'answer'
}

export interface State {
  knowledge: Knowledge
  autonomy: Record<Topic, Autonomy>
  now: Clock
  childId: string
  messages: Message[]
  log: LogEntry[]
  inbox: InboxItem[]
  notices: Notice[]
  bookedTours: string[]
  thinking: boolean
  /** Language of the parent app's interface. Answers follow the language of each question regardless. */
  lang: UiLang
  /** Ids of log entries an operator just fixed, for the "Fixed ✓" moment. */
  justFixed: string[]
}

const KEY = 'ww-state-v4'
const uid = () => Math.random().toString(36).slice(2, 10)

function initial(): State {
  const base = {
    knowledge: structuredClone(seedKnowledge),
    autonomy: { ...DEFAULT_AUTONOMY },
    now: DEMO_NOW,
    childId: 'maya',
    bookedTours: ['2026-11-10@570'],
  }
  const log: LogEntry[] = [...SEED_LOG]
    .sort((a, b) => a.at.date.localeCompare(b.at.date) || a.at.minutes - b.at.minutes)
    .map((s, i) => {
      const answer = answerQuestion({
        ...base,
        question: s.q,
        family: s.family ?? demoFamily,
        now: s.at,
        childId: s.family?.children[0].id ?? 'maya',
      })
      return {
        id: `seed-${i}`,
        at: s.at,
        question: s.q,
        original: s.original,
        lang: s.lang ?? 'en',
        childId: s.family?.children[0].id ?? 'maya',
        who: s.who,
        answer,
        feedback: s.feedback,
      }
    })
  const inbox: InboxItem[] = log
    .filter((l) => needsStaff(l.answer) && l.answer.topic !== 'unknown')
    .slice(-3)
    .map(toInbox)
  return {
    ...base,
    messages: [],
    log,
    inbox,
    notices: [],
    thinking: false,
    lang: 'en',
    justFixed: [],
  }
}

function toInbox(l: LogEntry): InboxItem {
  const a = l.answer
  const kind: InboxKind = a.status === 'review' ? 'review' : a.status === 'caveat' ? 'flag' : 'handoff'
  return {
    id: uid(),
    at: l.at,
    kind,
    title: TOPIC_LABELS[a.topic] ?? a.topic,
    who: l.who,
    detail: l.question,
    draft: a.staffDraft,
    logId: l.id,
    status: 'open',
    live: l.live,
    original: l.original,
    lang: l.lang,
  }
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...(JSON.parse(raw) as State), thinking: false, justFixed: [] }
  } catch {
    /* private mode or corrupted: start fresh */
  }
  return initial()
}

let state: State = typeof window === 'undefined' ? initial() : load()
const listeners = new Set<() => void>()
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('ww-front-desk') : null

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* storage full or blocked: the demo still works in memory */
  }
}

export function setState(fn: (s: State) => Partial<State>, broadcast = true) {
  state = { ...state, ...fn(state) }
  persist()
  listeners.forEach((l) => l())
  if (broadcast) channel?.postMessage('sync')
}

channel?.addEventListener('message', () => {
  state = load()
  listeners.forEach((l) => l())
})

export const getState = () => state
export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => selector(state),
  )
}

// ─── Actions ────────────────────────────────────────────────────────────────

const PARENT = demoFamily.parentName

/** `englishHint` is for tapped suggestions shown in Spanish: we already know what they mean. */
export async function ask(question: string, englishHint?: string) {
  const q = question.trim()
  if (!q || state.thinking) return
  const at = state.now
  setState((s) => ({ messages: [...s.messages, { id: uid(), role: 'parent', text: q, at }], thinking: true }))
  const started = performance.now()
  const steps: string[] = []

  // 1. Language. English skips the round-trip; anything else is translated to English for the engine.
  let lang = 'en'
  let english = q
  const guess = englishHint ? 'en' : detectLang(q)
  if (englishHint) {
    // A tapped suggestion: we know its meaning; its language is whatever it was written in.
    lang = q === englishHint ? 'en' : detectLang(q) === 'es' ? 'es' : state.lang
    english = englishHint
  } else if (guess !== 'en') {
    const u = llmEnabled() ? await understandLanguage(q) : null
    if (u) {
      lang = u.lang
      english = u.english
      if (lang !== 'en') steps.push(`Detected ${lang.toUpperCase()}; engine reasoned over the English translation: “${english}”`)
    } else if (guess === 'es') {
      lang = 'es'
      steps.push('Detected Spanish; no translator configured, so the engine saw the original text')
    }
  }
  // A Spanish-speaking parent gets a Spanish interface, once, without asking.
  if (lang === 'es' && state.lang !== 'es') setState(() => ({ lang: 'es' }))

  const input = {
    question: english,
    knowledge: state.knowledge,
    family: demoFamily,
    now: at,
    childId: state.childId,
    autonomy: state.autonomy,
    bookedTours: state.bookedTours,
  }
  let answer = answerQuestion(input)
  let unverified = false

  if (llmEnabled()) {
    // 2. Rules first; the LLM only classifies when the rules found nothing.
    if (answer.topic === 'unknown') {
      const topic = await classify(english)
      if (topic && topic !== 'unknown') {
        const u = { ...understand(english, state.knowledge, at.date), topic, matched: `LLM classifier → ${topic}` }
        const retry = answerQuestion(input, u)
        if (retry.topic !== 'unknown') answer = { ...retry, trace: { ...retry.trace, classifier: 'llm' } }
      }
    }
  }

  // 3. Wording. Urgent text is pre-written per language; everything else may be rephrased/translated behind the guard.
  if (answer.status === 'urgent') {
    const urgent = URGENT[lang]
    if (urgent && lang !== 'en') {
      answer = { ...answer, text: urgent(state.knowledge.center.phone) }
      steps.push(`Emergency text: pre-written ${lang.toUpperCase()} translation (never machine-translated)`)
    }
  } else if (llmEnabled()) {
    const p = await phrase(english, answer, lang)
    if (p) {
      steps.push(
        p.used
          ? `LLM ${lang === 'en' ? 'rephrase' : `translation (${lang.toUpperCase()})`} passed the grounding guard`
          : `LLM output rejected: unsupported ${p.guard.unsupported.join(', ')} → verified template used`,
      )
      if (!p.used && lang !== 'en') unverified = true
      answer = {
        ...answer,
        text: p.used ? p.text : answer.text,
        trace: { ...answer.trace, guard: p.guard, writer: p.used ? 'llm' : 'template' },
      }
    }
  }
  answer = { ...answer, trace: { ...answer.trace, steps: [...answer.trace.steps, ...steps] } }
  if (unverified && UNVERIFIED_NOTE[lang]) answer = { ...answer, text: `${UNVERIFIED_NOTE[lang]}\n\n${answer.text}` }

  // A short, honest pause reads as "checking", not lag; never longer than needed.
  const elapsed = performance.now() - started
  if (elapsed < 650) await new Promise((r) => setTimeout(r, 650 - elapsed))

  const entry: LogEntry = {
    id: uid(),
    at,
    question: english,
    original: english !== q ? q : undefined,
    lang,
    childId: answer.childId ?? state.childId,
    who: PARENT,
    answer,
    live: true,
  }
  setState((s) => ({
    thinking: false,
    log: [...s.log, entry],
    messages: [...s.messages, { id: uid(), role: 'desk', text: answer.text, at, logId: entry.id, unverified }],
    inbox: needsStaff(answer) ? [toInbox(entry), ...s.inbox] : s.inbox,
  }))
}

/** Translate a staff message into the parent's language, guarded; falls back to the English original. */
async function toParent(text: string, lang: string): Promise<Pick<Message, 'text' | 'original' | 'unverified'>> {
  if (lang === 'en' || !llmEnabled()) return { text }
  const t = await translateFor(lang, text)
  if (t?.used) return { text: t.text, original: text }
  return { text: UNVERIFIED_NOTE[lang] ? `${UNVERIFIED_NOTE[lang]}\n\n${text}` : text, unverified: true }
}

export function giveFeedback(logId: string, feedback: 'up' | 'down') {
  setState((s) => ({ log: s.log.map((l) => (l.id === logId ? { ...l, feedback } : l)) }))
}

export function createRequest(kind: InboxKind, title: string, detail: string, parentNote: string) {
  const at = state.now
  setState((s) => ({
    inbox: [{ id: uid(), at, kind, title, who: PARENT, detail, status: 'open', live: true }, ...s.inbox],
    messages: [...s.messages, { id: uid(), role: 'system', text: parentNote, at }],
  }))
}

export function bookTour(slot: Clock, parentNote: string) {
  setState((s) => ({ bookedTours: [...s.bookedTours, `${slot.date}@${slot.minutes}`] }))
  createRequest('tour', 'Tour booked', `${formatDay(slot.date)} at ${formatTime(slot.minutes)}`, parentNote)
}

/** Staff sends a reply (or approves a draft). If the asker is the demo parent, it lands in their thread, in their language. */
export async function resolveInbox(id: string, reply?: string) {
  const item = state.inbox.find((i) => i.id === id)
  if (!item) return
  const at = state.now
  setState((s) => ({ inbox: s.inbox.map((i) => (i.id === id ? { ...i, status: 'done' } : i)) }))
  if (!reply || !item.live) return
  const msg = await toParent(reply, item.lang ?? 'en')
  setState((s) => ({
    messages: [...s.messages, { id: uid(), role: 'staff', at, ...msg }],
    notices: [{ id: uid(), at, kind: 'reply' }, ...s.notices],
  }))
}

export function dismissNotice(id: string) {
  setState((s) => ({ notices: s.notices.filter((n) => n.id !== id) }))
}

export function updateKnowledge(fn: (k: Knowledge) => Knowledge) {
  setState((s) => ({ knowledge: fn(structuredClone(s.knowledge)) }))
}

export function setAutonomy(topic: Topic, level: Autonomy) {
  setState((s) => ({ autonomy: { ...s.autonomy, [topic]: level } }))
}

export function setNow(now: Clock) {
  setState(() => ({ now }))
}

export function setLang(lang: UiLang) {
  setState(() => ({ lang }))
}

export function setChild(childId: string) {
  setState(() => ({ childId }))
}

/**
 * Close the loop on a gap: add the operator's answer to the handbook, re-run
 * every question in the cluster against the new knowledge, and notify the
 * families whose questions are now answered.
 */
export function publishAnswer(section: Omit<HandbookSection, 'id' | 'updatedAt' | 'updatedBy' | 'origin'>, logIds: string[]) {
  const id = `faq.${uid()}`
  const newSection: HandbookSection = {
    ...section,
    id,
    updatedAt: state.now.date,
    updatedBy: state.knowledge.center.directorShort,
    origin: 'operator-answer',
  }
  const knowledge = { ...state.knowledge, handbook: [...state.knowledge.handbook, newSection] }
  const fixed: string[] = []
  const log = state.log.map((l) => {
    if (!logIds.includes(l.id)) return l
    const rerun = answerQuestion({
      question: l.question,
      knowledge,
      family: demoFamily,
      now: state.now,
      childId: l.childId,
      autonomy: state.autonomy,
      bookedTours: state.bookedTours,
    })
    if (rerun.sources.some((s) => s.id === id)) {
      fixed.push(l.id)
      return { ...l, fixedBy: id }
    }
    return l
  })
  const liveFixed = log.filter((l) => fixed.includes(l.id) && l.live)
  const at = state.now
  if (liveFixed.length) {
    const first = liveFixed[0]
    void toParent(`Update on “${first.original ?? first.question}”: ${section.body}`, first.lang ?? 'en').then((msg) =>
      setState((s) => ({
        messages: [...s.messages, { id: uid(), role: 'staff', at, ...msg }],
        notices: [{ id: uid(), at, kind: 'answer' }, ...s.notices],
      })),
    )
  }
  setState((s) => ({
    knowledge,
    log,
    justFixed: fixed,
    inbox: s.inbox.map((i) => (i.logId && fixed.includes(i.logId) ? { ...i, status: 'done' } : i)),
  }))
  return { id, fixed }
}

export function resetDemo() {
  state = initial()
  persist()
  listeners.forEach((l) => l())
  channel?.postMessage('sync')
}

export function clearThread() {
  setState(() => ({ messages: [], notices: [] }))
}
