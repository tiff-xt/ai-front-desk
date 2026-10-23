import { describe, expect, it } from 'vitest'
import { getState } from './store'

describe('seeded week', () => {
  it('routes each seeded question the way the demo story expects', () => {
    const rows = getState()
      .log.filter((l) => l.id.startsWith('seed-'))
      .map((l) => `${l.answer.topic.padEnd(10)} ${l.answer.status.padEnd(8)} ${l.question}`)
    expect(rows).toMatchSnapshot()
  })
})

describe('seeded parent history', () => {
  it('gives Priya a school year of conversations, answered as of their own dates', () => {
    const s = getState()
    const hist = s.conversations.filter((c) => c.id.startsWith('hist-'))
    expect(hist.length).toBeGreaterThanOrEqual(6)
    // Halloween 2026 is a Saturday: the engine answered it as a weekend, from the calendar.
    const halloween = hist.find((c) => c.messages[0].text.includes('Halloween'))!
    expect(halloween.messages[1].text).toMatch(/weekends/)
    // The billing conversation went to Ms. Rivera and was resolved.
    const billing = s.inbox.find((i) => i.conversationId && i.title.startsWith('Billing'))!
    expect(billing.status).toBe('done')
    expect(billing.thread.map((m) => m.role)).toEqual(['parent', 'staff', 'parent', 'staff'])
  })
})
