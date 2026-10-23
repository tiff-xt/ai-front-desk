import type { ISODate, Minutes } from '@/data/types'

/**
 * All center time is "wall clock" time. We keep it timezone-free on purpose:
 * a date is an ISO string and a time is minutes after midnight, so a demo clock
 * can't drift with the viewer's timezone.
 */

export interface Clock {
  date: ISODate
  minutes: Minutes
}

const DAY_MS = 86_400_000
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const toUTC = (iso: ISODate) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))
const fromUTC = (ms: number): ISODate => new Date(ms).toISOString().slice(0, 10)

export const addDays = (iso: ISODate, n: number) => fromUTC(toUTC(iso) + n * DAY_MS)
export const daysBetween = (a: ISODate, b: ISODate) => Math.round((toUTC(b) - toUTC(a)) / DAY_MS)
export const weekday = (iso: ISODate) => new Date(toUTC(iso)).getUTCDay()
export const isWeekend = (iso: ISODate) => weekday(iso) === 0 || weekday(iso) === 6
export const weekdayName = (iso: ISODate) => WEEKDAYS[weekday(iso)]

/** "Wed, Nov 11" */
export const formatDay = (iso: ISODate) => `${WEEKDAYS[weekday(iso)].slice(0, 3)}, ${MONTHS[+iso.slice(5, 7) - 1]} ${+iso.slice(8, 10)}`
/** "Wednesday, November 11" style is too long on a phone; this is "Wednesday, Nov 11". */
export const formatDayLong = (iso: ISODate) => `${weekdayName(iso)}, ${MONTHS[+iso.slice(5, 7) - 1]} ${+iso.slice(8, 10)}`

/** 420 → "7:00am", 1110 → "6:30pm" */
export function formatTime(m: Minutes) {
  const h = Math.floor(m / 60) % 24
  const mm = m % 60
  const suffix = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(mm).padStart(2, '0')}${suffix}`
}

/** "today", "tomorrow", "this Wednesday", "next Monday" or "Wed, Nov 11". */
export function relativeDay(target: ISODate, today: ISODate) {
  const d = daysBetween(today, target)
  if (d === 0) return 'today'
  if (d === 1) return 'tomorrow'
  if (d === -1) return 'yesterday'
  const sameWeek = d > 0 && d < 7 && weekday(target) > weekday(today)
  if (sameWeek) return `this ${weekdayName(target)}`
  return formatDay(target)
}

export const clockToMs = (c: Clock) => toUTC(c.date) + c.minutes * 60_000
export const msToClock = (ms: number): Clock => ({ date: fromUTC(ms - (ms % DAY_MS)), minutes: Math.floor((ms % DAY_MS) / 60_000) })
export const addHours = (c: Clock, h: number) => msToClock(clockToMs(c) + h * 3_600_000)
export const compareClock = (a: Clock, b: Clock) => clockToMs(a) - clockToMs(b)

export const formatClock = (c: Clock) => `${formatDay(c.date)}, ${formatTime(c.minutes)}`

export const monthIndex = (name: string) => {
  const i = MONTHS.findIndex((m) => name.toLowerCase().startsWith(m.toLowerCase()))
  return i === -1 ? null : i
}

export const WEEKDAY_NAMES = WEEKDAYS

export const usd = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
