import type { Clock } from '@/lib/time'
import type { Autonomy, Topic } from './types'

/** The demo opens on a Monday morning before a holiday week: the moment the front desk phone rings most. */
export const DEMO_NOW: Clock = { date: '2026-11-09', minutes: 7 * 60 + 42 }

export const DEFAULT_AUTONOMY: Record<Topic, Autonomy> = {
  hours: 'auto',
  tuition: 'auto',
  illness: 'auto',
  lunch: 'auto',
  tours: 'auto',
  policies: 'auto',
  medical: 'review',
  billing: 'human',
  incidents: 'human',
  custody: 'human',
}

export const TOPIC_LABELS: Record<string, string> = {
  hours: 'Hours & closures',
  tuition: 'Tuition & fees',
  illness: 'Illness & return',
  lunch: 'Lunch & menu',
  tours: 'Tours',
  policies: 'Handbook policies',
  medical: 'Medication & allergies',
  billing: 'Billing & account',
  incidents: 'Injuries & incidents',
  custody: 'Custody & pick-up restrictions',
  emergency: 'Emergencies',
  privacy: 'Other families’ information',
  unknown: 'Not covered yet',
}
