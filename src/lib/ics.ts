import type { ISODate, Minutes } from '@/data/types'
import { addDays } from './time'

/** A tiny .ics so "Add to calendar" works with every calendar app, no accounts or APIs. */
export function downloadIcs(title: string, date: ISODate, start?: Minutes, durationMin = 30, location = '') {
  const d = date.replace(/-/g, '')
  const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}${String(m % 60).padStart(2, '0')}00`
  const timing =
    start === undefined
      ? [`DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${addDays(date, 1).replace(/-/g, '')}`]
      : [`DTSTART:${d}T${hhmm(start)}`, `DTEND:${d}T${hhmm(start + durationMin)}`]
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Willow & Wren//Front Desk//EN',
    'BEGIN:VEVENT',
    `UID:${d}-${Math.random().toString(36).slice(2)}@willowandwren.example`,
    `DTSTAMP:${d}T000000`,
    ...timing,
    `SUMMARY:${title}`,
    location && `LOCATION:${location}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n')
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics` })
  a.click()
  URL.revokeObjectURL(url)
}
