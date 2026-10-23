import type { AgeBand, Child, Closure, ISODate, Knowledge, MenuDay, Minutes } from '@/data/types'
import { addDays, addHours, compareClock, daysBetween, formatDay, formatTime, isWeekend, weekday, type Clock } from '@/lib/time'

/**
 * Policy logic. Pure functions over Knowledge, so the same rules drive the
 * parent's answer, the operator's preview and the test suite. The LLM never
 * computes any of this; it only gets to phrase the results.
 */

export type DayState =
  | { state: 'open'; open: Minutes; close: Minutes }
  | { state: 'early'; open: Minutes; close: Minutes; name: string }
  | { state: 'closed'; name: string }
  | { state: 'weekend' }
  | { state: 'unpublished' }

export function dayStatus(k: Knowledge, date: ISODate): DayState {
  if (isWeekend(date)) return { state: 'weekend' }
  const c: Closure | undefined = k.calendar.closures.find((x) => x.date === date)
  if (c?.kind === 'closed') return { state: 'closed', name: c.name }
  if (c?.kind === 'early') return { state: 'early', open: k.center.open, close: c.closeAt ?? k.center.close, name: c.name }
  if (date > k.calendar.publishedThrough) return { state: 'unpublished' }
  return { state: 'open', open: k.center.open, close: k.center.close }
}

export const isSchoolDay = (k: Knowledge, date: ISODate) => {
  const s = dayStatus(k, date).state
  return s === 'open' || s === 'early'
}

export function nextSchoolDay(k: Knowledge, after: ISODate): ISODate | null {
  for (let i = 1; i <= 21; i++) {
    const d = addDays(after, i)
    if (isSchoolDay(k, d)) return d
  }
  return null
}

/** The first moment the center is open at or after `at`. */
export function firstOpenAtOrAfter(k: Knowledge, at: Clock): Clock | null {
  const s = dayStatus(k, at.date)
  if ((s.state === 'open' || s.state === 'early') && at.minutes < s.close) {
    return { date: at.date, minutes: Math.max(at.minutes, s.open) }
  }
  const next = nextSchoolDay(k, at.date)
  return next ? { date: next, minutes: k.center.open } : null
}

/** Closures from `from` (inclusive) up to `to` (exclusive), so we can explain "Wed is Veterans Day". */
export function skippedClosures(k: Knowledge, from: ISODate, to: ISODate) {
  return k.calendar.closures.filter((c) => c.kind === 'closed' && c.date >= from && c.date < to)
}

export const isOfficeOpen = (k: Knowledge, now: Clock) => {
  const s = dayStatus(k, now.date)
  return (s.state === 'open' || s.state === 'early') && now.minutes >= s.open && now.minutes < s.close
}

/** Plain-language expectation for when a person will reply. Never promise faster than the operator can deliver. */
export function replyExpectation(k: Knowledge, now: Clock) {
  if (isOfficeOpen(k, now)) return `Expect a reply within about ${k.center.officeReplyHours} hours.`
  const next = firstOpenAtOrAfter(k, now)
  if (!next) return 'You’ll hear back when the office reopens.'
  const when = next.date === now.date ? `at ${formatTime(next.minutes)}` : `${formatDay(next.date)} at ${formatTime(next.minutes)}`
  return `The office is closed now. You're first in line when it opens ${when}.`
}

// ─── Illness ────────────────────────────────────────────────────────────────

export interface ReturnInput {
  /** When the last symptom happened (last fever reading at or over threshold, last vomiting episode…). */
  lastSymptom: Clock
  /** Last dose of a fever reducer, if any. The clock restarts from it. */
  lastFeverReducer?: Clock
  hours: number
}

export interface ReturnResult {
  earliest: Clock | null
  clearAt: Clock
  skipped: Closure[]
}

/** "This morning" means 6:00am unless it's earlier than that; the text and the checker share it so they agree. */
export const thisMorning = (now: Clock): Clock => ({ date: now.date, minutes: Math.min(now.minutes, 6 * 60) })

export function earliestReturn(k: Knowledge, input: ReturnInput): ReturnResult {
  const start =
    input.lastFeverReducer && compareClock(input.lastFeverReducer, input.lastSymptom) > 0 ? input.lastFeverReducer : input.lastSymptom
  const clearAt = addHours(start, input.hours)
  const earliest = firstOpenAtOrAfter(k, clearAt)
  return { earliest, clearAt, skipped: earliest ? skippedClosures(k, clearAt.date, earliest.date) : [] }
}

// ─── Lunch ──────────────────────────────────────────────────────────────────

export function menuFor(k: Knowledge, date: ISODate): MenuDay | null {
  if (isWeekend(date) || date < k.lunch.rotationStart || date > k.lunch.plannedThrough) return null
  const days = daysBetween(k.lunch.rotationStart, date)
  const week = Math.floor(days / 7) % k.lunch.weeks.length
  return k.lunch.weeks[week][weekday(date) - 1] ?? null
}

export interface LunchPlan {
  menu: MenuDay | null
  servesAlternate: boolean
  conflicts: string[]
  /** Whether a backup lunch can still be added for this date. */
  canRequest: boolean
  reason?: 'after-cutoff' | 'closed' | 'infant' | 'no-menu'
}

export function lunchPlan(k: Knowledge, child: Child, date: ISODate, now: Clock): LunchPlan {
  const menu = menuFor(k, date)
  const conflicts = menu ? menu.allergens.filter((a) => child.allergies.includes(a)) : []
  const base = { menu, servesAlternate: conflicts.length > 0, conflicts }
  if (!isSchoolDay(k, date)) return { ...base, canRequest: false, reason: 'closed' }
  if (child.band === 'infant') return { ...base, canRequest: false, reason: 'infant' }
  if (!menu) return { ...base, canRequest: false, reason: 'no-menu' }
  if (date < now.date || (date === now.date && now.minutes >= k.lunch.cutoff)) return { ...base, canRequest: false, reason: 'after-cutoff' }
  return { ...base, canRequest: true }
}

// ─── Tours ──────────────────────────────────────────────────────────────────

export function tourSlots(k: Knowledge, now: Clock, booked: string[], days = 14): Clock[] {
  const out: Clock[] = []
  for (let i = 0; i <= days; i++) {
    const date = addDays(now.date, i)
    if (!k.tours.days.includes(weekday(date)) || !isSchoolDay(k, date)) continue
    for (const minutes of k.tours.times) {
      const slot = { date, minutes }
      // At least two hours' notice so staff can actually prepare.
      if (compareClock(slot, addHours(now, 2)) < 0) continue
      if (booked.includes(`${date}@${minutes}`)) continue
      out.push(slot)
    }
  }
  return out
}

// ─── Tuition ────────────────────────────────────────────────────────────────

export const bandFor = (k: Knowledge, id: string): AgeBand | undefined => k.tuition.bands.find((b) => b.id === id)

export interface FamilyTuitionLine {
  child: Child
  band: AgeBand
  base: number
  discount: number
  total: number
}

/** Sibling discount applies to the oldest child's tuition, the usual convention (and the cheaper tier). */
export function familyTuition(k: Knowledge, children: Child[]): { lines: FamilyTuitionLine[]; total: number } {
  const sorted = [...children].sort((a, b) => a.birthDate.localeCompare(b.birthDate))
  const lines = sorted.map((child, i) => {
    const band = bandFor(k, child.band)!
    const base = child.schedule === 'full' ? band.fullTime : band.partTime
    const discount = children.length > 1 && i === 0 ? Math.round((base * k.tuition.siblingDiscountPct) / 100) : 0
    return { child, band, base, discount, total: base - discount }
  })
  return { lines, total: lines.reduce((s, l) => s + l.total, 0) }
}

export const describeDay = (s: DayState) =>
  s.state === 'open'
    ? `open ${formatTime(s.open)}–${formatTime(s.close)}`
    : s.state === 'early'
      ? `open ${formatTime(s.open)}–${formatTime(s.close)} (early close for ${s.name})`
      : s.state === 'closed'
        ? `closed for ${s.name}`
        : s.state === 'weekend'
          ? 'closed (weekend)'
          : 'not on the published calendar yet'
