import { useMemo, useState, type ReactNode } from 'react'
import { AlertTriangle, Check, Clock4, Plus, Search, Trash2 } from 'lucide-react'
import { cx, StatusPill } from '@/components/ui'
import { demoFamily } from '@/data/seed'
import type { Closure, Knowledge } from '@/data/types'
import { answerQuestion } from '@/engine/answer'
import { healthCheck } from '@/engine/health'
import { formatDay, formatTime } from '@/lib/time'
import { updateKnowledge, useStore } from '@/store/store'

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

function HealthPanel({ issues }: { issues: ReturnType<typeof healthCheck> }) {
  if (!issues.length)
    return (
      <div className="card flex items-center gap-2 p-3 text-sm text-willow-text">
        <Check size={16} /> No conflicts or stale sections.
      </div>
    )
  return (
    <div className="card divide-y divide-line">
      <div className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium">
        <AlertTriangle size={15} className="text-honey" /> Health check · {issues.length} to review
      </div>
      {issues.map((i) => (
        <div key={i.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
          <span
            className={cx(
              'mt-0.5 rounded-full px-2 py-0.5 text-2xs font-semibold',
              i.kind === 'conflict'
                ? 'bg-rose-soft text-rose-text'
                : i.kind === 'expiring'
                  ? 'bg-honey-soft text-honey-text'
                  : 'bg-surface-3 text-ink-muted',
            )}
          >
            {i.kind === 'conflict' ? 'Conflict' : i.kind === 'expiring' ? 'Expiring' : 'Stale'}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">{i.title}</div>
            <div className="text-xs text-ink-muted">{i.detail}</div>
          </div>
          {i.fix && (
            <button className="btn-quiet shrink-0 !py-1 text-xs" onClick={() => updateKnowledge(i.fix!.apply)}>
              {i.fix.label}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

function Panel({ title, meta, children }: { title: string; meta: { updatedAt: string; updatedBy: string }; children: ReactNode }) {
  return (
    <section className="card space-y-4 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-medium">{title}</h3>
        <span className="flex items-center gap-1 text-2xs text-ink-subtle">
          <Clock4 size={11} /> Updated {formatDay(meta.updatedAt)} {meta.updatedAt.slice(0, 4)} by {meta.updatedBy}
        </span>
      </div>
      {children}
    </section>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

function NumberInput({ value, onChange, step = 1 }: { value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <input
      type="number"
      step={step}
      className="input w-28 tabular"
      value={value}
      onChange={(e) => e.target.value !== '' && onChange(+e.target.value)}
    />
  )
}

function Money({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="relative w-28">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-subtle">$</span>
      <input
        type="number"
        className="input pl-6 tabular"
        value={value}
        onChange={(e) => e.target.value !== '' && onChange(+e.target.value)}
      />
    </div>
  )
}

function Closures({ k, onChange, today }: { k: Knowledge; onChange: (c: Closure[]) => void; today: string }) {
  const [date, setDate] = useState('')
  const [name, setName] = useState('')
  const [kind, setKind] = useState<'closed' | 'early'>('closed')
  const upcoming = k.calendar.closures.filter((c) => c.date >= today)
  return (
    <div>
      <div className="label mb-1.5">Upcoming closures</div>
      <ul className="divide-y divide-line rounded-xl border border-line">
        {upcoming.map((c) => (
          <li key={c.date + c.name} className="flex items-center gap-3 px-3 py-2 text-sm">
            <span className="w-24 shrink-0 tabular text-ink-muted">{formatDay(c.date)}</span>
            <span className="flex-1">{c.name}</span>
            <span
              className={cx(
                'rounded-full px-2 py-0.5 text-2xs font-semibold',
                c.kind === 'closed' ? 'bg-rose-soft text-rose-text' : 'bg-honey-soft text-honey-text',
              )}
            >
              {c.kind === 'closed' ? 'Closed' : `Closes ${formatTime(c.closeAt!)}`}
            </span>
            <button
              aria-label={`Remove ${c.name}`}
              className="btn-ghost !p-1"
              onClick={() => onChange(k.calendar.closures.filter((x) => x !== c))}
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-2 flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!date || !name) return
          onChange(
            [...k.calendar.closures, { date, name, kind, closeAt: kind === 'early' ? 15 * 60 : undefined }].sort((a, b) =>
              a.date.localeCompare(b.date),
            ),
          )
          setDate('')
          setName('')
        }}
      >
        <input type="date" aria-label="Date" className="input w-40" value={date} onChange={(e) => setDate(e.target.value)} />
        <input
          aria-label="Name"
          placeholder="e.g. Snow day"
          className="input w-44 flex-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select aria-label="Type" className="input w-36" value={kind} onChange={(e) => setKind(e.target.value as 'closed' | 'early')}>
          <option value="closed">Closed all day</option>
          <option value="early">Early close 3pm</option>
        </select>
        <button className="btn-primary" disabled={!date || !name}>
          <Plus size={14} /> Add
        </button>
      </form>
    </div>
  )
}

function Handbook({ k }: { k: Knowledge }) {
  const [sel, setSel] = useState(k.handbook[0]?.id)
  const s = k.handbook.find((h) => h.id === sel) ?? k.handbook[0]
  const now = useStore((st) => st.now)
  const patch = (p: Partial<typeof s>) =>
    updateKnowledge((kk) => ({
      ...kk,
      handbook: kk.handbook.map((h) => (h.id === s.id ? { ...h, ...p, updatedAt: now.date, updatedBy: 'Ms. Rivera' } : h)),
    }))
  return (
    <section className="card grid min-h-[22rem] overflow-hidden md:grid-cols-[13rem_1fr]">
      <ul className="border-b border-line md:border-b-0 md:border-r">
        {k.handbook.map((h) => (
          <li key={h.id}>
            <button
              onClick={() => setSel(h.id)}
              className={cx(
                'w-full px-3.5 py-2 text-left text-sm transition',
                s.id === h.id ? 'bg-surface-2 font-medium' : 'text-ink-muted hover:bg-surface-2/60',
              )}
            >
              {h.title}
              {h.origin === 'operator-answer' && (
                <span className="ml-1.5 rounded-full bg-willow-soft px-1.5 text-2xs font-semibold text-willow-text">from Gaps</span>
              )}
            </button>
          </li>
        ))}
      </ul>
      <div className="space-y-3 p-4">
        <input
          aria-label="Section title"
          className="input font-medium"
          value={s.title}
          onChange={(e) => patch({ title: e.target.value })}
        />
        <textarea
          aria-label="Section text"
          rows={7}
          className="input resize-y leading-relaxed"
          value={s.body}
          onChange={(e) => patch({ body: e.target.value })}
        />
        <div>
          <div className="label">Keywords that route questions here</div>
          <input
            className="input mt-1 text-xs"
            value={s.keywords.join(', ')}
            onChange={(e) =>
              patch({
                keywords: e.target.value
                  .split(',')
                  .map((x) => x.trim())
                  .filter(Boolean),
              })
            }
          />
        </div>
        <div className="text-2xs text-ink-subtle">
          Updated {formatDay(s.updatedAt)} {s.updatedAt.slice(0, 4)} by {s.updatedBy}
        </div>
      </div>
    </section>
  )
}

/** Ask the desk as a parent would, against the knowledge as it is right now, before any parent does. */
function TryIt() {
  const state = useStore((s) => s)
  const [q, setQ] = useState('Are you open on Veterans Day?')
  const a = q.trim()
    ? answerQuestion({
        question: q,
        knowledge: state.knowledge,
        family: demoFamily,
        now: state.now,
        childId: state.childId,
        autonomy: state.autonomy,
        bookedTours: state.bookedTours,
      })
    : null
  return (
    <aside className="card h-fit p-4 xl:sticky xl:top-0">
      <div className="label">Preview an answer</div>
      <div className="relative mt-2">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
        <input className="input pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a parent question" />
      </div>
      {a && (
        <div className="mt-3 animate-fade-in">
          <StatusPill status={a.status} />
          <p className="mt-1.5 text-sm leading-relaxed">{a.text}</p>
          {a.staffDraft && a.status === 'review' && (
            <p className="mt-2 rounded-lg bg-surface-2 p-2 text-xs text-ink-muted">Draft held for review: {a.staffDraft}</p>
          )}
          <div className="mt-2 text-2xs text-ink-subtle">Source: {a.sources.map((s) => s.title).join(', ') || 'none'}</div>
        </div>
      )}
      <p className="mt-3 border-t border-line pt-3 text-2xs text-ink-subtle">Updates live as you edit. Nothing is sent to parents.</p>
    </aside>
  )
}
