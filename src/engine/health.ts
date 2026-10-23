import type { Knowledge } from '@/data/types'
import { daysBetween, formatDay, formatTime, type Clock } from '@/lib/time'

/**
 * Health checks on the source of truth. Handbooks drift: the hours setting
 * changes but the paragraph parents read doesn't. The desk answers from
 * structured settings, so a stale paragraph only misleads people reading the
 * handbook directly, but it's still a contradiction worth fixing.
 */

export interface Issue {
  id: string
  kind: 'conflict' | 'stale' | 'expiring'
  title: string
  detail: string
  fix?: { label: string; apply: (k: Knowledge) => Knowledge }
}

const timeRe = /(\d{1,2}):(\d{2})\s?(am|pm)/gi
const toMin = (h: string, m: string, ap: string) => ((+h % 12) + (ap.toLowerCase() === 'pm' ? 12 : 0)) * 60 + +m

export function healthCheck(k: Knowledge, now: Clock): Issue[] {
  const issues: Issue[] = []

  const hours = k.handbook.find((h) => h.id === 'handbook.hours')
  if (hours) {
    const times = [...hours.body.matchAll(timeRe)].map((m) => ({ text: m[0], min: toMin(m[1], m[2], m[3]) }))
    const close = times[1]
    if (close && close.min !== k.center.close) {
      issues.push({
        id: 'conflict.hours',
        kind: 'conflict',
        title: 'Closing time disagrees',
        detail: `“${hours.title}” says ${close.text}, but your hours setting is ${formatTime(k.center.close)}. Parents reading the handbook see a different time than the desk tells them.`,
        fix: {
          label: `Update handbook to ${formatTime(k.center.close)}`,
          apply: (kk) => ({
            ...kk,
            handbook: kk.handbook.map((h) =>
              h.id === hours.id
                ? { ...h, body: h.body.replace(close.text, formatTime(kk.center.close)), updatedAt: now.date, updatedBy: 'Ms. Rivera' }
                : h,
            ),
          }),
        },
      })
    }
  }

  const pickup = k.handbook.find((h) => h.id === 'handbook.pickup')
  const fee = pickup?.body.match(/\$(\d+) per minute/)
  if (pickup && fee && +fee[1] !== k.tuition.lateFeePerMinute) {
    issues.push({
      id: 'conflict.latefee',
      kind: 'conflict',
      title: 'Late fee disagrees',
      detail: `“${pickup.title}” says $${fee[1]}/minute; Tuition & Fees says $${k.tuition.lateFeePerMinute}/minute.`,
    })
  }
  const enroll = k.handbook.find((h) => h.id === 'handbook.enrollment')
  const reg = enroll?.body.match(/\$(\d+) registration fee/)
  if (enroll && reg && +reg[1] !== k.tuition.registrationFee) {
    issues.push({
      id: 'conflict.reg',
      kind: 'conflict',
      title: 'Registration fee disagrees',
      detail: `“${enroll.title}” says $${reg[1]}; Tuition & Fees says $${k.tuition.registrationFee}.`,
    })
  }

  const left = daysBetween(now.date, k.lunch.plannedThrough)
  if (left <= 7)
    issues.push({
      id: 'expiring.menu',
      kind: 'expiring',
      title: left < 0 ? 'Lunch menu has run out' : `Lunch menu ends ${formatDay(k.lunch.plannedThrough)}`,
      detail: 'After that, lunch questions are escalated to you instead of answered. Extend the rotation to keep them automatic.',
      fix: {
        label: 'Extend rotation 4 weeks',
        apply: (kk) => ({
          ...kk,
          lunch: { ...kk.lunch, plannedThrough: addWeeks(kk.lunch.plannedThrough, 4), meta: { ...kk.lunch.meta, updatedAt: now.date } },
        }),
      },
    })

  const policies = [
    ...k.handbook.map((h) => ({ title: h.title, updatedAt: h.updatedAt })),
    { title: k.illness.meta.title, updatedAt: k.illness.meta.updatedAt },
  ]
  for (const p of policies) {
    const age = daysBetween(p.updatedAt, now.date)
    if (age > 365)
      issues.push({
        id: `stale.${p.title}`,
        kind: 'stale',
        title: `${p.title} not reviewed in ${Math.floor(age / 30)} months`,
        detail: `Last updated ${formatDay(p.updatedAt)} ${p.updatedAt.slice(0, 4)}. A quick review keeps answers trustworthy.`,
      })
  }
  return issues
}

function addWeeks(iso: string, n: number) {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n * 7)
  return d.toISOString().slice(0, 10)
}
