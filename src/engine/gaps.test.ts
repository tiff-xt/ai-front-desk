import { expect, it } from 'vitest'
import { clusterQuestions } from './gaps'

it('groups the same need asked different ways', () => {
  const c = clusterQuestions(
    [
      'Do we bring a dish for the Thanksgiving feast?',
      'Is the Thanksgiving feast potluck? What should we bring?',
      'Do you accept child care assistance from the state?',
      'Do you take CYFD child care assistance?',
      'Do you run a summer camp?',
    ].map((question) => ({ question })),
  )
  expect(c.map((x) => x.items.length)).toEqual([2, 2, 1])
  expect(c[0].terms).toContain('thanksgiving')
})
