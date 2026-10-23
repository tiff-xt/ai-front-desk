import { beforeEach, describe, expect, it } from 'vitest'
import { activeThread, ask, getState, leaveThread, replyToParent, resetDemo, resolveItem } from './store'

const activeId = () => activeThread(getState())?.id ?? null

/** The exact sequence from user testing: a billing handoff, a staff reply, then a follow-up that mentions lunch. */
describe('conversations with staff', () => {
  beforeEach(() => resetDemo())

  const itemFor = (id: string | null) => getState().inbox.find((i) => i.id === id)!

  it('keeps the conversation with the person instead of letting the AI answer follow-ups', async () => {
    await ask('I have a billing issue')
    const id = activeId()
    expect(itemFor(id).kind).toBe('handoff')

    await replyToParent(id!, 'Happy to help. What happened?')
    expect(itemFor(id).status).toBe('replied') // replying is not resolving

    const answered = getState().log.length
    await ask('I was charged for school lunch for Maya that she did not purchase')
    expect(getState().log.length).toBe(answered) // the AI did not answer (no lunch menu)
    expect(itemFor(id).status).toBe('open') // back in the staff inbox
    expect(itemFor(id).thread.map((m) => m.role)).toEqual(['parent', 'staff', 'parent'])
  }, 10_000)

  it('still answers tapped suggestions and emergencies instantly', async () => {
    await ask('I have a billing issue')
    const id = activeId()

    await ask('What is the tuition for infants?', 'What is the tuition for infants?')
    expect(getState().log.at(-1)!.answer.topic).toBe('tuition')

    await ask('Maya is not breathing')
    expect(getState().log.at(-1)!.answer.status).toBe('urgent')
    // The emergency becomes its own staff conversation and takes priority over billing.
    const urgent = itemFor(activeId())
    expect(urgent.thread[0].text).toBe('Maya is not breathing')
    expect(itemFor(id).status).toBe('open') // the billing conversation is still in the inbox
  }, 10_000)

  it('returns to the front desk when staff resolve it or the parent leaves', async () => {
    await ask('I have a billing issue')
    resolveItem(activeId()!)
    expect(activeId()).toBeNull()
    await ask('Are you open Friday?')
    expect(getState().log.at(-1)!.answer.topic).toBe('hours')

    await ask('I was charged twice')
    expect(activeId()).not.toBeNull()
    leaveThread()
    await ask('How much is toddler tuition?')
    expect(getState().log.at(-1)!.answer.topic).toBe('tuition')
  }, 15_000)
})
