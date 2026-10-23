import type { Knowledge } from '@/data/types'
import type { Card } from '@/engine/types'
import { type Clock } from '@/lib/time'
import { DayCard } from './DayCard'
import { TuitionCard } from './TuitionCard'
import { IllnessCard } from './IllnessCard'
import { LunchCard } from './LunchCard'
import { ToursCard } from './ToursCard'
import { HandoffCard } from './HandoffCard'
import { UrgentCard } from './UrgentCard'

/** Maps an Answer's card to its interactive component. Cards compute from live knowledge, so edits show up immediately. */
export function AnswerCard({ card, k, now, logId }: { card: Card; k: Knowledge; now: Clock; logId?: string }) {
  switch (card.kind) {
    case 'day':
      return <DayCard card={card} k={k} now={now} />
    case 'tuition':
      return <TuitionCard card={card} k={k} />
    case 'illness':
      return <IllnessCard card={card} k={k} now={now} />
    case 'lunch':
      return <LunchCard card={card} k={k} now={now} />
    case 'tours':
      return <ToursCard k={k} now={now} />
    case 'handoff':
      return <HandoffCard k={k} now={now} logId={logId} />
    case 'urgent':
      return <UrgentCard k={k} />
    default:
      return null
  }
}
