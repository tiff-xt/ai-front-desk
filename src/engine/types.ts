import type { ISODate, Minutes } from '@/data/types'
import type { Clock } from '@/lib/time'

/** Topics an operator can set autonomy for. Emergency and privacy are guardrails, not settings. */
export type Topic = 'hours' | 'tuition' | 'illness' | 'lunch' | 'tours' | 'policies' | 'billing' | 'incidents' | 'custody' | 'medical'
export type GuardrailTopic = 'emergency' | 'privacy' | 'unknown'
export type AnyTopic = Topic | GuardrailTopic

export type Autonomy = 'auto' | 'review' | 'human'

/**
 * answered – grounded in a source, sent as is
 * caveat   – grounded, but with a stated limit (data missing, judgment call)
 * review   – drafted; waits for staff approval before the parent sees it
 * handoff  – a person takes it from here
 * urgent   – safety first; we tell the parent what to do right now
 */
export type Status = 'answered' | 'caveat' | 'review' | 'handoff' | 'urgent'

export interface Citation {
  id: string
  title: string
  updatedAt: ISODate
  updatedBy: string
  excerpt: string
}

export type Card =
  | {
      kind: 'day'
      date: ISODate
      state: 'open' | 'closed' | 'early' | 'weekend' | 'unpublished'
      name?: string
      open?: Minutes
      close?: Minutes
      nextOpen?: ISODate
    }
  | { kind: 'tuition'; highlight: string[] }
  | { kind: 'illness'; childId: string; symptom: Symptom; temp?: number }
  | { kind: 'lunch'; date: ISODate; childId: string }
  | { kind: 'tours' }
  | { kind: 'handoff'; reason: string }
  | { kind: 'urgent' }

export type Symptom = 'fever' | 'gi' | 'pinkeye' | 'rash' | 'cold' | 'lice' | 'unsure'

export interface Trace {
  classifier: 'rules' | 'llm'
  matched: string
  facts: string[]
  autonomy: Autonomy | 'locked'
  steps: string[]
  guard?: GuardResult
  writer: 'template' | 'llm'
}

export interface GuardResult {
  passed: boolean
  checked: string[]
  /** Claims in the output that the facts don't support (invented). */
  unsupported: string[]
  /** Numbers in the source draft that the output dropped (omitted). */
  missing?: string[]
}

export interface Answer {
  topic: AnyTopic
  status: Status
  text: string
  card?: Card
  sources: Citation[]
  trace: Trace
  childId?: string
  /** The draft a staff member would send, shown in the operator inbox for review/handoff. */
  staffDraft?: string
  followUps?: string[]
}

export interface AskContext {
  now: Clock
  childId: string
}
