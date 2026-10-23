import type { Clock } from '@/lib/time'

/**
 * Priya's earlier conversations this school year, so History and search have
 * something real to work with. Questions are answered by the same engine at
 * their own timestamps when the demo starts; only staff replies are scripted.
 */
export interface SeedConversation {
  at: Clock
  childId: string
  question: string
  /** A staff conversation that followed, alternating staff → parent → staff…, ending resolved. */
  staff?: { replies: string[]; parent: string[] }
  /** Saved (bookmarked) by the parent. */
  saved?: boolean
}

const at = (date: string, h: number, m = 0): Clock => ({ date, minutes: h * 60 + m })

export const SEED_HISTORY: SeedConversation[] = [
  { at: at('2026-09-02', 7, 48), childId: 'maya', question: 'What should Maya bring for nap time?' },
  { at: at('2026-09-21', 6, 35), childId: 'leo', question: 'Leo has a fever of 101, can he come in?' },
  {
    at: at('2026-10-14', 13, 20),
    childId: 'maya',
    question: 'I think autopay charged me twice in October',
    staff: {
      replies: [
        'Hi Priya, you’re right: a duplicate charge of $1,242 went through on October 1. I’ve refunded it, and you’ll see it in 3–5 business days. Sorry about that!',
        'You’re welcome. I’ve also added a note to your account so autopay can’t run twice in one month.',
      ],
      parent: ['Thank you so much! Will this happen again?'],
    },
  },
  { at: at('2026-10-21', 8, 5), childId: 'maya', question: "What's for lunch today?" },
  { at: at('2026-10-26', 18, 30), childId: 'maya', question: 'Are you open on Halloween?' },
  { at: at('2026-10-28', 7, 15), childId: 'maya', question: 'What time do you close on Friday?' },
  { at: at('2026-11-04', 12, 5), childId: 'maya', question: 'How much do I pay each month?', saved: true },
]
