import { describe, expect, it } from 'vitest'
import { getState } from './store'

describe('seeded week', () => {
  it('routes each seeded question the way the demo story expects', () => {
    const rows = getState().log.map((l) => `${l.answer.topic.padEnd(10)} ${l.answer.status.padEnd(8)} ${l.question}`)
    expect(rows).toMatchSnapshot()
  })
})
