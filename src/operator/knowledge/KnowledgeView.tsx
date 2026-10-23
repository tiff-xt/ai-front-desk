import { useMemo, useState } from 'react'
import { cx } from '@/lib/cx'
import type { Knowledge } from '@/data/types'
import { healthCheck } from '@/engine/health'
import { updateKnowledge, useStore } from '@/store/store'
import { HealthPanel } from './HealthPanel'
import { Panel, Field, NumberInput, Money } from './fields'
import { Closures } from './Closures'
import { Handbook } from './Handbook'
import { TryIt } from './TryIt'

type Section = 'calendar' | 'tuition' | 'health' | 'lunch' | 'handbook'

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'calendar', label: 'Hours & calendar' },
  { id: 'tuition', label: 'Tuition & fees' },
  { id: 'health', label: 'Illness policy' },
  { id: 'lunch', label: 'Lunch program' },
  { id: 'handbook', label: 'Handbook' },
]

const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

const fromTime = (v: string) => +v.slice(0, 2) * 60 + +v.slice(3, 5)

const edit = updateKnowledge

/** Staff → Knowledge: the editable source of truth, its health check, and a live answer preview. */
export function KnowledgeView() {
  const k = useStore((s) => s.knowledge)
  const now = useStore((s) => s.now)
  const [section, setSection] = useState<Section>('calendar')
  const issues = useMemo(() => healthCheck(k, now), [k, now])
  /** Every edit is stamped, so citations always say who changed what and when. */
  const stamp = (k2: Knowledge, key: 'calendar' | 'tuition' | 'illness' | 'lunch'): Knowledge => ({
    ...k2,
    [key]: { ...k2[key], meta: { ...k2[key].meta, updatedAt: now.date, updatedBy: 'Ms. Rivera' } },
  })

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-serif text-2xl font-semibold tracking-tight">Source of truth</h2>
        <p className="max-w-2xl text-sm text-ink-muted">
          The desk only says what’s written here. Edits take effect on the next question, and every answer cites the section and who last
          updated it.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-4">
          <HealthPanel issues={issues} />
          <div className="no-scrollbar flex gap-1 overflow-x-auto">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={cx(
                  'shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition',
                  section === s.id ? 'bg-ink text-bg' : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
                )}
              >
                {s.label}
              </button>
            ))}
          </div>

          {section === 'calendar' && (
            <Panel title="Hours & calendar" meta={k.calendar.meta}>
              <div className="flex flex-wrap gap-4">
                <Field label="Opens">
                  <input
                    type="time"
                    className="input w-32"
                    value={toTime(k.center.open)}
                    onChange={(e) => edit((kk) => ({ ...kk, center: { ...kk.center, open: fromTime(e.target.value) } }))}
                  />
                </Field>
                <Field label="Closes">
                  <input
                    type="time"
                    className="input w-32"
                    value={toTime(k.center.close)}
                    onChange={(e) => edit((kk) => ({ ...kk, center: { ...kk.center, close: fromTime(e.target.value) } }))}
                  />
                </Field>
                <Field label="Calendar published through">
                  <input
                    type="date"
                    className="input w-40"
                    value={k.calendar.publishedThrough}
                    onChange={(e) =>
                      edit((kk) => stamp({ ...kk, calendar: { ...kk.calendar, publishedThrough: e.target.value } }, 'calendar'))
                    }
                  />
                </Field>
              </div>
              <Closures
                k={k}
                onChange={(closures) => edit((kk) => stamp({ ...kk, calendar: { ...kk.calendar, closures } }, 'calendar'))}
                today={now.date}
              />
            </Panel>
          )}

          {section === 'tuition' && (
            <Panel title="Tuition & fees" meta={k.tuition.meta}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="label pb-2">Program</th>
                    <th className="label pb-2">5 days / mo</th>
                    <th className="label pb-2">3 days / mo</th>
                  </tr>
                </thead>
                <tbody>
                  {k.tuition.bands.map((b, i) => (
                    <tr key={b.id} className="border-t border-line">
                      <td className="py-2 pr-2">
                        <div className="font-medium">{b.label}</div>
                        <div className="text-2xs text-ink-subtle">{b.ages}</div>
                      </td>
                      {(['fullTime', 'partTime'] as const).map((f) => (
                        <td key={f} className="py-2 pr-2">
                          <Money
                            value={b[f]}
                            onChange={(v) =>
                              edit((kk) =>
                                stamp(
                                  {
                                    ...kk,
                                    tuition: { ...kk.tuition, bands: kk.tuition.bands.map((x, j) => (j === i ? { ...x, [f]: v } : x)) },
                                  },
                                  'tuition',
                                ),
                              )
                            }
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex flex-wrap gap-4">
                <Field label="Registration fee">
                  <Money
                    value={k.tuition.registrationFee}
                    onChange={(v) => edit((kk) => stamp({ ...kk, tuition: { ...kk.tuition, registrationFee: v } }, 'tuition'))}
                  />
                </Field>
                <Field label="Sibling discount %">
                  <NumberInput
                    value={k.tuition.siblingDiscountPct}
                    onChange={(v) => edit((kk) => stamp({ ...kk, tuition: { ...kk.tuition, siblingDiscountPct: v } }, 'tuition'))}
                  />
                </Field>
              </div>
            </Panel>
          )}

          {section === 'health' && (
            <Panel title="Illness policy" meta={k.illness.meta}>
              <p className="text-sm text-ink-muted">
                These numbers drive the return-to-care checker. Change them and every answer and calculation follows.
              </p>
              <div className="flex flex-wrap gap-4">
                <Field label="Fever threshold °F">
                  <NumberInput
                    step={0.1}
                    value={k.illness.feverF}
                    onChange={(v) => edit((kk) => stamp({ ...kk, illness: { ...kk.illness, feverF: v } }, 'illness'))}
                  />
                </Field>
                <Field label="Fever-free hours">
                  <NumberInput
                    value={k.illness.feverFreeHours}
                    onChange={(v) => edit((kk) => stamp({ ...kk, illness: { ...kk.illness, feverFreeHours: v } }, 'illness'))}
                  />
                </Field>
                <Field label="Vomiting / diarrhea free hours">
                  <NumberInput
                    value={k.illness.giFreeHours}
                    onChange={(v) => edit((kk) => stamp({ ...kk, illness: { ...kk.illness, giFreeHours: v } }, 'illness'))}
                  />
                </Field>
                <Field label="Pink eye treatment hours">
                  <NumberInput
                    value={k.illness.pinkEyeTreatmentHours}
                    onChange={(v) => edit((kk) => stamp({ ...kk, illness: { ...kk.illness, pinkEyeTreatmentHours: v } }, 'illness'))}
                  />
                </Field>
              </div>
            </Panel>
          )}

          {section === 'lunch' && (
            <Panel title="Lunch program" meta={k.lunch.meta}>
              <div className="flex flex-wrap gap-4">
                <Field label="Kitchen count closes">
                  <input
                    type="time"
                    className="input w-32"
                    value={toTime(k.lunch.cutoff)}
                    onChange={(e) => edit((kk) => stamp({ ...kk, lunch: { ...kk.lunch, cutoff: fromTime(e.target.value) } }, 'lunch'))}
                  />
                </Field>
                <Field label="Backup lunch price">
                  <Money
                    value={k.lunch.backupPrice}
                    onChange={(v) => edit((kk) => stamp({ ...kk, lunch: { ...kk.lunch, backupPrice: v } }, 'lunch'))}
                  />
                </Field>
                <Field label="Menu planned through">
                  <input
                    type="date"
                    className="input w-40"
                    value={k.lunch.plannedThrough}
                    onChange={(e) => edit((kk) => stamp({ ...kk, lunch: { ...kk.lunch, plannedThrough: e.target.value } }, 'lunch'))}
                  />
                </Field>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[34rem] text-xs">
                  <thead>
                    <tr className="text-left">
                      <th className="label pb-1.5">Week</th>
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((d) => (
                        <th key={d} className="label pb-1.5">
                          {d}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {k.lunch.weeks.map((w, i) => (
                      <tr key={i} className="border-t border-line align-top">
                        <td className="py-1.5 pr-2 text-ink-subtle">{i + 1}</td>
                        {w.map((d, j) => (
                          <td key={j} className="py-1.5 pr-2">
                            {d.lunch}
                            <div className="text-2xs text-ink-subtle">{d.allergens.join(', ')}</div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          {section === 'handbook' && <Handbook k={k} />}
        </div>

        <TryIt />
      </div>
    </div>
  )
}
