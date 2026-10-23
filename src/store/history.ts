import type { Clock } from '@/lib/time'
import type { Conversation, InboxItem, Message } from './store'

/**
 * The parent's conversation history: one summary per conversation, plus
 * search and filters. Pure functions over store data, so they're tested
 * directly and the History screen only renders.
 */

export type ConversationStatus = 'answered' | 'withStaff' | 'resolved'
export type HistoryFilter = 'all' | 'withStaff' | 'saved' | `child:${string}`

export interface Match {
  messageId: string
  /** Snippet around the first hit, split so the UI can highlight it. */
  before: string
  hit: string
  after: string
}

export interface ConversationSummary {
  id: string
  startedAt: Clock
  lastAt: Clock
  childId: string
  /** The parent's first question, in their own words. */
  title: string
  /** The latest message, as a one-line preview. */
  preview: string
  status: ConversationStatus
  /** A person took part at some point. */
  withStaff: boolean
  saved: Message[]
  match?: Match
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)

/** Lowercase and strip accents, so "dia" finds "Día" and "lunes" finds "Lunes". */
export const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

export function summarize(conversations: Conversation[], inbox: InboxItem[]): ConversationSummary[] {
  return conversations
    .filter((c) => c.messages.length > 0)
    .map((c) => {
      const items = inbox.filter((i) => i.conversationId === c.id && i.kind === 'handoff')
      const open = items.some((i) => i.status !== 'done')
      const withStaff = items.length > 0 || c.messages.some((m) => m.role === 'staff')
      const first = c.messages.find((m) => m.role === 'parent')
      const last = [...c.messages].reverse().find((m) => m.role !== 'system') ?? c.messages[c.messages.length - 1]
      return {
        id: c.id,
        startedAt: c.startedAt,
        lastAt: last.at,
        childId: c.childId,
        title: clip(first?.text ?? '…', 80),
        preview: clip(last.text.replace(/\s+/g, ' '), 110),
        status: open ? 'withStaff' : items.length ? 'resolved' : 'answered',
        withStaff,
        saved: c.messages.filter((m) => m.saved),
      } satisfies ConversationSummary
    })
    .sort((a, b) => b.lastAt.date.localeCompare(a.lastAt.date) || b.lastAt.minutes - a.lastAt.minutes)
}

export function applyFilter(list: ConversationSummary[], filter: HistoryFilter) {
  if (filter === 'withStaff') return list.filter((c) => c.withStaff)
  if (filter === 'saved') return list.filter((c) => c.saved.length > 0)
  if (filter.startsWith('child:')) return list.filter((c) => c.childId === filter.slice(6))
  return list
}

/**
 * Keyword search across every message (and the parent's original wording when translated),
 * plus the conversation's date in words, so "october", "oct 14" or "martes" all work.
 * Every term must appear somewhere in the conversation; the snippet shows the first hit.
 */
export function search(
  list: ConversationSummary[],
  conversations: Conversation[],
  query: string,
  dateWords: (c: ConversationSummary) => string,
): ConversationSummary[] {
  const terms = fold(query).split(/\s+/).filter(Boolean)
  if (!terms.length) return list
  const byId = new Map(conversations.map((c) => [c.id, c]))
  const out: ConversationSummary[] = []
  for (const sum of list) {
    const conv = byId.get(sum.id)!
    const texts = conv.messages.map((m) => ({ m, text: [m.text, m.original].filter(Boolean).join(' ') }))
    const haystack = fold(texts.map((t) => t.text).join(' ') + ' ' + dateWords(sum))
    if (!terms.every((t) => haystack.includes(t))) continue
    // Snippet: the first message containing the longest term (the most specific one).
    const key = [...terms].sort((a, b) => b.length - a.length)[0]
    const hit = texts.find((t) => fold(t.text).includes(key))
    if (!hit) {
      out.push(sum) // matched on the date
      continue
    }
    const i = fold(hit.text).indexOf(key)
    const start = Math.max(0, i - 40)
    out.push({
      ...sum,
      match: {
        messageId: hit.m.id,
        before: (start > 0 ? '…' : '') + hit.text.slice(start, i),
        hit: hit.text.slice(i, i + key.length),
        after: clip(hit.text.slice(i + key.length), 70),
      },
    })
  }
  return out
}
