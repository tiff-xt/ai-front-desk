import { describe, expect, it } from 'vitest'
import { applyFilter, search, summarize } from './history'
import { getState } from './store'
import type { Conversation } from './store'

const dateWords = (c: { startedAt: { date: string } }) =>
  new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(c.startedAt.date + 'T00:00:00Z'))

describe('parent history', () => {
  const { conversations, inbox } = getState()
  const list = summarize(conversations, inbox)

  it('lists conversations newest first with a status', () => {
    expect(list[0].lastAt.date >= list[list.length - 1].lastAt.date).toBe(true)
    expect(list.find((c) => c.title.includes('autopay'))!.status).toBe('resolved')
  })

  it('finds a keyword inside any message and points at it', () => {
    const r = search(list, conversations, 'refunded', dateWords)
    expect(r).toHaveLength(1)
    expect(r[0].match!.hit.toLowerCase()).toBe('refunded')
    const msg = conversations.flatMap((c) => c.messages).find((m) => m.id === r[0].match!.messageId)!
    expect(msg.role).toBe('staff')
  })

  it('finds conversations by date in words', () => {
    const r = search(list, conversations, 'october', dateWords)
    expect(r.length).toBeGreaterThanOrEqual(3)
    expect(r.every((c) => c.startedAt.date.startsWith('2026-10'))).toBe(true)
  })

  it('needs every word, ignores case and accents', () => {
    expect(search(list, conversations, 'AUTOPAY twice', dateWords)).toHaveLength(1)
    expect(search(list, conversations, 'autopay halloween', dateWords)).toHaveLength(0)
    const es: Conversation = {
      id: 'x',
      startedAt: { date: '2026-11-09', minutes: 0 },
      childId: 'maya',
      messages: [{ id: 'm', role: 'parent', text: '¿Están abiertos el Día de los Veteranos?', at: { date: '2026-11-09', minutes: 0 } }],
    }
    expect(search(summarize([es], []), [es], 'dia veteranos', dateWords)).toHaveLength(1)
  })

  it('filters by staff involvement, saved answers and child', () => {
    expect(applyFilter(list, 'withStaff').every((c) => c.withStaff)).toBe(true)
    expect(applyFilter(list, 'saved').map((c) => c.title)).toEqual(['How much do I pay each month?'])
    expect(applyFilter(list, 'child:leo').every((c) => c.childId === 'leo')).toBe(true)
  })
})
