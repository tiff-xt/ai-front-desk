import { useSyncExternalStore } from 'react'
import { demoFamily, seedKnowledge } from '@/data/seed'
import type { HandbookSection, Knowledge } from '@/data/types'
import { answerQuestion, needsStaff } from '@/engine/answer'
import { DEFAULT_AUTONOMY, DEMO_NOW, TOPIC_LABELS } from '@/engine/defaults'
import { llmEnabled, understandLanguage } from '@/engine/llm'
import { localizeForParent, respond } from '@/engine/respond'
import { isEmergency } from '@/engine/understand'
import type { Answer, Autonomy, Topic } from '@/engine/types'
import { detectLang, isUiLang, type UiLang } from '@/lib/lang'
import { storage } from '@/lib/storage'
import { formatDay, formatTime, type Clock } from '@/lib/time'
import { SEED_HISTORY } from './seedHistory'
import { SEED_LOG } from './seedLog'

/**
 * One small store for both perspectives. The parent phone and the operator
 * console read the same state, so a staff reply or a knowledge edit shows up
 * on the other side immediately (and across browser tabs via BroadcastChannel).
 *
 * Parent side: a list of conversations, each owning its messages.
 * Staff side: inbox items, each linked to the conversation it came from, so a
 * reply always lands in the right conversation, even weeks later.
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
  /** For the demo parent's questions: the conversation they were asked in. */
  conversationId?: string
}

export type InboxKind = 'handoff' | 'review' | 'flag' | 'lunch' | 'tour' | 'absence'

/** One message in a staff ↔ parent conversation. `text` is English (what staff read); `original` is the parent's own words. */
export interface ThreadMessage {
  id: string
  role: 'parent' | 'staff'
  text: string
  original?: string
  at: Clock
}

/**
 * open    – needs staff (a new item, or the parent wrote back)
 * replied – staff answered; waiting on the parent
 * done    – resolved by staff; the conversation is closed
 */
export type InboxStatus = 'open' | 'replied' | 'done'

export interface InboxItem {
  id: string
  at: Clock
  kind: InboxKind
  title: string
  who: string
  detail: string
  draft?: string
  logId?: string
  status: InboxStatus
  live?: boolean
  original?: string
  lang?: string
  /** The conversation so far. Starts with the parent's question. */
  thread: ThreadMessage[]
  /** The parent conversation this belongs to (demo parent only). */
  conversationId?: string
  /** The parent chose "Back to the front desk"; a new staff reply re-attaches them. */
  detached?: boolean
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
  /** Small status lines in the parent thread, rendered in the parent's language. */
  note?: 'sentToStaff' | 'resolved' | 'leftThread'
  /** Bookmarked by the parent ("Saved" in History). */
  saved?: boolean
}

export interface Conversation {
  id: string
  startedAt: Clock
  childId: string
  messages: Message[]
}

export interface Notice {
  id: string
  at: Clock
  kind: 'reply' | 'answer'
  conversationId?: string
}

export interface State {
  knowledge: Knowledge
  autonomy: Record<Topic, Autonomy>
  now: Clock
  childId: string
  /** The parent's conversations, oldest first. */
  conversations: Conversation[]
  /** The conversation on screen; null = a fresh start (home screen, nothing asked yet). */
  currentId: string | null
  log: LogEntry[]
  inbox: InboxItem[]
  notices: Notice[]
  bookedTours: string[]
  thinking: boolean
  /** Language of the parent app's interface. Answers follow the language of each question regardless. */
  lang: UiLang
  /** Which control-center tab is open; in the store so the guided tour can take you there. */
  opTab: OpTab
}

export type OpTab = 'overview' | 'inbox' | 'gaps' | 'knowledge' | 'autonomy' | 'tests'

// Bump when State changes shape; older saves are merged over fresh defaults either way.
const KEY = 'ww-state-v7'
const uid = () => Math.random().toString(36).slice(2, 10)
const PARENT = demoFamily.parentName
const EMPTY: Message[] = []

// ─── Selectors ──────────────────────────────────────────────────────────────

export const currentConversation = (s: State) => s.conversations.find((c) => s.currentId !== null && c.id === s.currentId)
export const currentMessages = (s: State) => currentConversation(s)?.messages ?? EMPTY

/**
 * The person the parent is talking to right now: the newest unresolved handoff in the
 * conversation on screen, unless the parent stepped back to the front desk. While there is
 * one, what the parent types goes to staff instead of the AI (emergencies excepted).
 */
export const activeThread = (s: State) =>
  s.inbox.find((i) => i.kind === 'handoff' && i.status !== 'done' && !i.detached && !!i.conversationId && i.conversationId === s.currentId)

// ─── Initial state (seeded week for staff, seeded school year for the parent) ─

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
    .map((s, i) => ({
      id: `seed-${i}`,
      at: s.at,
      question: s.q,
      original: s.original,
      lang: s.lang ?? 'en',
      childId: s.family?.children[0].id ?? 'maya',
      who: s.who,
      answer: answerQuestion({
        ...base,
        question: s.q,
        family: s.family ?? demoFamily,
        now: s.at,
        childId: s.family?.children[0].id ?? 'maya',
      }),
      feedback: s.feedback,
    }))
  const inbox: InboxItem[] = log
    .filter((l) => needsStaff(l.answer) && l.answer.topic !== 'unknown')
    .slice(-3)
    .map(toInbox)

  // Priya's history: each seeded question answered by the engine as of its own date.
  const conversations: Conversation[] = []
  for (const [n, h] of SEED_HISTORY.entries()) {
    const convId = `hist-${n}`
    const answer = answerQuestion({ ...base, question: h.question, family: demoFamily, now: h.at, childId: h.childId })
    const entry: LogEntry = {
      id: `hist-log-${n}`,
      at: h.at,
      question: h.question,
      childId: h.childId,
      who: PARENT,
      answer,
      // The past, not something the reviewer just did (keeps the tour and "just now" badges honest).
      live: false,
      conversationId: convId,
    }
    log.unshift(entry)
    const messages: Message[] = [
      { id: uid(), role: 'parent', text: h.question, at: h.at },
      { id: uid(), role: 'desk', text: answer.text, at: h.at, logId: entry.id, saved: h.saved },
    ]
    if (h.staff) {
      const item: InboxItem = { ...toInbox(entry), status: 'done', conversationId: convId }
      h.staff.replies.forEach((reply, i) => {
        const t = { date: h.at.date, minutes: h.at.minutes + 40 + i * 25 }
        item.thread.push({ id: uid(), role: 'staff', text: reply, at: t })
        messages.push({ id: uid(), role: 'staff', text: reply, at: t })
        const back = h.staff!.parent[i]
        if (back) {
          const tb = { date: h.at.date, minutes: t.minutes + 10 }
          item.thread.push({ id: uid(), role: 'parent', text: back, at: tb })
          messages.push(
            { id: uid(), role: 'parent', text: back, at: tb },
            { id: uid(), role: 'system', text: '', at: tb, note: 'sentToStaff' },
          )
        }
      })
      messages.push({ id: uid(), role: 'system', text: '', at: item.thread[item.thread.length - 1].at, note: 'resolved' })
      inbox.push(item)
    }
    conversations.push({ id: convId, startedAt: h.at, childId: h.childId, messages })
  }
  log.sort((a, b) => a.at.date.localeCompare(b.at.date) || a.at.minutes - b.at.minutes)

  return { ...base, conversations, currentId: null, log, inbox, notices: [], thinking: false, lang: 'en', opTab: 'overview' }
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
    thread: [{ id: uid(), role: 'parent', text: l.question, original: l.original, at: l.at }],
    conversationId: l.conversationId,
  }
}

// ─── Persistence and subscription ───────────────────────────────────────────

const INBOX_KINDS: InboxKind[] = ['handoff', 'review', 'flag', 'lunch', 'tour', 'absence']
const INBOX_STATUSES: InboxStatus[] = ['open', 'replied', 'done']
const OP_TABS: OpTab[] = ['overview', 'inbox', 'gaps', 'knowledge', 'autonomy', 'tests']

/** A cheap structural check on saved data: enough to guarantee every view can render it. */
function isSane(s: State) {
  return (
    Array.isArray(s.log) &&
    s.log.every((l) => l?.answer?.status && l.at?.date && typeof l.question === 'string') &&
    Array.isArray(s.inbox) &&
    s.inbox.every((i) => INBOX_KINDS.includes(i?.kind) && INBOX_STATUSES.includes(i.status) && Array.isArray(i.thread)) &&
    Array.isArray(s.conversations) &&
    s.conversations.every((c) => c?.id && c.startedAt?.date && Array.isArray(c.messages)) &&
    (s.currentId === null || typeof s.currentId === 'string') &&
    OP_TABS.includes(s.opTab) &&
    typeof s.now?.date === 'string' &&
    !!s.knowledge?.center &&
    Array.isArray(s.knowledge.handbook)
  )
}

function load(): State {
  const fresh = initial()
  const raw = storage.get(KEY)
  if (!raw) return fresh
  try {
    // Merge over defaults so a save from an older version can't leave a field undefined,
    // and discard anything malformed rather than render it.
    const saved = { ...fresh, ...(JSON.parse(raw) as Partial<State>), thinking: false }
    return isSane(saved) ? saved : fresh
  } catch {
    return fresh // corrupted: start fresh
  }
}

let state: State = typeof window === 'undefined' ? initial() : load()
const listeners = new Set<() => void>()
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('ww-front-desk') : null

const persist = () => storage.set(KEY, JSON.stringify(state))

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

const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export const getState = () => state
export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state))
}

// ─── Conversation helpers ───────────────────────────────────────────────────

/** Append messages to one conversation (immutably). */
const append = (s: State, conversationId: string | undefined, ...msgs: Message[]): Partial<State> =>
  conversationId
    ? { conversations: s.conversations.map((c) => (c.id === conversationId ? { ...c, messages: [...c.messages, ...msgs] } : c)) }
    : {}

/**
 * The conversation a new question belongs to: the one on screen, unless it's from an earlier
 * day and nobody is mid-conversation in it, in which case a new one starts (one per day, like a
 * support chat, so History stays easy to scan by date).
 */
function conversationFor(at: Clock): string {
  const cur = currentConversation(state)
  const last = cur?.messages[cur.messages.length - 1]
  if (cur && (!last || last.at.date === at.date || activeThread(state))) return cur.id
  const conv: Conversation = { id: uid(), startedAt: at, childId: state.childId, messages: [] }
  setState((s) => ({ conversations: [...s.conversations, conv], currentId: conv.id }))
  return conv.id
}

/** Start fresh: the home screen with an empty conversation-to-be. */
export function newConversation() {
  setState(() => ({ currentId: null }))
}

/** Open a past conversation (from History or a notification). */
export function openConversation(id: string) {
  setState(() => ({ currentId: id }))
}

export function toggleSaved(conversationId: string, messageId: string) {
  setState((s) => ({
    conversations: s.conversations.map((c) =>
      c.id === conversationId ? { ...c, messages: c.messages.map((m) => (m.id === messageId ? { ...m, saved: !m.saved } : m)) } : c,
    ),
  }))
}

// ─── Parent actions ─────────────────────────────────────────────────────────

/** `englishHint` is for tapped suggestions shown in another language: we already know what they mean. */
export async function ask(question: string, englishHint?: string) {
  const q = question.trim()
  if (!q || state.thinking) return
  const at = state.now
  const convId = conversationFor(at)
  setState((s) => ({ ...append(s, convId, { id: uid(), role: 'parent', text: q, at }), thinking: true }))
  const started = performance.now()

  // In a conversation with a person, typed messages go to that person. (A tapped suggestion is
  // an explicit question for the desk, so it still gets an instant answer.)
  if (!englishHint && (await continueThread(q, at, convId))) return

  const { answer, lang, english, unverified } = await respond({
    question: q,
    englishHint,
    uiLang: state.lang,
    engine: {
      knowledge: state.knowledge,
      family: demoFamily,
      now: at,
      childId: state.childId,
      autonomy: state.autonomy,
      bookedTours: state.bookedTours,
    },
  })

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
    conversationId: convId,
  }
  setState((s) => ({
    thinking: false,
    // A parent who writes in a language the interface supports gets that interface, without asking.
    lang: isUiLang(lang) ? lang : s.lang,
    log: [...s.log, entry],
    ...append(s, convId, { id: uid(), role: 'desk', text: answer.text, at, logId: entry.id, unverified }),
    ...(needsStaff(answer) ? { inbox: [toInbox(entry), ...s.inbox] } : {}),
  }))
}

/**
 * If the parent is talking to a person, add their message to that conversation and return true.
 * Emergencies always fall through to the desk, which answers with 911 instructions immediately.
 */
async function continueThread(q: string, at: Clock, convId: string): Promise<boolean> {
  const item = activeThread(state)
  if (!item) return false
  let english = q
  if (detectLang(q) !== 'en' && llmEnabled()) english = (await understandLanguage(q))?.english ?? q
  if (isEmergency(english) || isEmergency(q)) return false

  const msg: ThreadMessage = { id: uid(), role: 'parent', text: english, original: english !== q ? q : undefined, at }
  setState((s) => {
    const msgs = s.conversations.find((c) => c.id === convId)?.messages ?? []
    const before = msgs[msgs.length - 2] // the message before the one just added
    return {
      thinking: false,
      inbox: s.inbox.map((i) => (i.id === item.id ? { ...i, status: 'open', at, thread: [...i.thread, msg] } : i)),
      // One "sent to Ms. Rivera" line per run of messages is enough.
      ...(before?.note === 'sentToStaff' ? {} : append(s, convId, { id: uid(), role: 'system', text: '', at, note: 'sentToStaff' })),
    }
  })
  return true
}

/** The parent steps back to instant answers. Staff keep the conversation; a new reply re-attaches it. */
export function leaveThread() {
  const item = activeThread(state)
  if (!item) return
  setState((s) => ({
    inbox: s.inbox.map((i) => (i.id === item.id ? { ...i, detached: true } : i)),
    ...append(s, s.currentId ?? undefined, { id: uid(), role: 'system', text: '', at: s.now, note: 'leftThread' }),
  }))
}

export function giveFeedback(logId: string, feedback: 'up' | 'down') {
  setState((s) => ({ log: s.log.map((l) => (l.id === logId ? { ...l, feedback } : l)) }))
}

export function createRequest(kind: InboxKind, title: string, detail: string, parentNote: string) {
  const at = state.now
  const convId = state.currentId ?? undefined
  setState((s) => ({
    inbox: [
      { id: uid(), at, kind, title, who: PARENT, detail, status: 'open', live: true, thread: [], conversationId: convId },
      ...s.inbox,
    ],
    ...append(s, convId, { id: uid(), role: 'system', text: parentNote, at }),
  }))
}

export function bookTour(slot: Clock, parentNote: string) {
  setState((s) => ({ bookedTours: [...s.bookedTours, `${slot.date}@${slot.minutes}`] }))
  createRequest('tour', 'Tour booked', `${formatDay(slot.date)} at ${formatTime(slot.minutes)}`, parentNote)
}

export function dismissNotice(id: string) {
  setState((s) => ({ notices: s.notices.filter((n) => n.id !== id) }))
}

// ─── Staff actions ──────────────────────────────────────────────────────────

/**
 * Staff replies (or approves a draft). The conversation stays open, waiting on the parent:
 * replying is not resolving. The reply lands in the parent conversation it belongs to, in the
 * parent's language, and further messages there come back to this person.
 */
export async function replyToParent(id: string, reply: string) {
  const item = state.inbox.find((i) => i.id === id)
  if (!item || !reply.trim()) return
  const at = state.now
  const staffMsg: ThreadMessage = { id: uid(), role: 'staff', text: reply, at }
  setState((s) => ({
    inbox: s.inbox.map((i) => (i.id === id ? { ...i, status: 'replied', detached: false, thread: [...i.thread, staffMsg] } : i)),
  }))
  if (!item.live || !item.conversationId) return
  const msg = await localizeForParent(reply, item.lang ?? 'en')
  setState((s) => ({
    ...append(s, item.conversationId, { id: uid(), role: 'staff', at, ...msg }),
    notices: [{ id: uid(), at, kind: 'reply', conversationId: item.conversationId }, ...s.notices],
  }))
}

/** Staff close the item. A parent in that conversation is told, and goes back to the front desk. */
export function resolveItem(id: string) {
  const item = state.inbox.find((i) => i.id === id)
  if (!item) return
  const tellParent = item.kind === 'handoff' && item.live && !item.detached && item.status !== 'done'
  setState((s) => ({
    inbox: s.inbox.map((i) => (i.id === id ? { ...i, status: 'done' } : i)),
    ...(tellParent ? append(s, item.conversationId, { id: uid(), role: 'system', text: '', at: s.now, note: 'resolved' }) : {}),
  }))
}

export function updateKnowledge(fn: (k: Knowledge) => Knowledge) {
  setState((s) => ({ knowledge: fn(structuredClone(s.knowledge)) }))
}

export function setAutonomy(topic: Topic, level: Autonomy) {
  setState((s) => ({ autonomy: { ...s.autonomy, [topic]: level } }))
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
  const at = state.now
  const liveFixed = log.find((l) => fixed.includes(l.id) && l.live && l.conversationId)
  if (liveFixed) {
    void localizeForParent(`Update on “${liveFixed.original ?? liveFixed.question}”: ${section.body}`, liveFixed.lang ?? 'en').then((msg) =>
      setState((s) => ({
        ...append(s, liveFixed.conversationId, { id: uid(), role: 'staff', at, ...msg }),
        notices: [{ id: uid(), at, kind: 'answer', conversationId: liveFixed.conversationId }, ...s.notices],
      })),
    )
  }
  setState((s) => ({
    knowledge,
    log,
    inbox: s.inbox.map((i) => (i.logId && fixed.includes(i.logId) ? { ...i, status: 'done' } : i)),
  }))
  return { id, fixed }
}

// ─── Demo controls ──────────────────────────────────────────────────────────

export function setNow(now: Clock) {
  setState(() => ({ now }))
}

export function setOpTab(opTab: OpTab) {
  setState(() => ({ opTab }))
}

export function setLang(lang: UiLang) {
  setState(() => ({ lang }))
}

export function setChild(childId: string) {
  setState(() => ({ childId }))
}

export function resetDemo() {
  state = initial()
  persist()
  listeners.forEach((l) => l())
  channel?.postMessage('sync')
}

/** Demo menu: drop this session's conversations (the seeded history stays) and go home. */
export function clearThread() {
  setState((s) => ({ conversations: s.conversations.filter((c) => c.id.startsWith('hist-')), currentId: null, notices: [] }))
}
