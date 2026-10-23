import { useMemo, useState } from 'react'
import { CalendarPlus, Check, Phone, Siren, Thermometer, UtensilsCrossed } from 'lucide-react'
import { demoFamily, roomNames } from '@/data/seed'
import type { Knowledge } from '@/data/types'
import { earliestReturn, thisMorning, lunchPlan, replyExpectation, tourSlots } from '@/engine/policy'
import type { Card, Symptom } from '@/engine/types'
import { downloadIcs } from '@/lib/ics'
import { addDays, formatDay, formatDayLong, formatTime, relativeDay, usd, type Clock } from '@/lib/time'
import { bookTour, createRequest, useStore } from '@/store/store'
import { cx } from '@/components/ui'

const MONTH = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

function DateTile({ date, tone }: { date: string; tone: 'willow' | 'honey' | 'rose' | 'muted' }) {
  const tones = {
    willow: 'bg-willow-soft text-willow-text',
    honey: 'bg-honey-soft text-honey-text',
    rose: 'bg-rose-soft text-rose-text',
    muted: 'bg-surface-3 text-ink-muted',
  }
  return (
    <div className={cx('flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl', tones[tone])}>
      <span className="text-2xs font-semibold tracking-wider">{MONTH[+date.slice(5, 7) - 1]}</span>
      <span className="font-serif text-2xl font-semibold leading-none">{+date.slice(8, 10)}</span>
    </div>
  )
}

function DayCard({ card, k, now }: { card: Extract<Card, { kind: 'day' }>; k: Knowledge; now: Clock }) {
  const head = {
    open: { title: 'Open', tone: 'willow' as const, sub: `${formatTime(card.open!)} – ${formatTime(card.close!)}` },
    early: { title: `Early close · ${card.name}`, tone: 'honey' as const, sub: `${formatTime(card.open!)} – ${formatTime(card.close!)}` },
    closed: {
      title: `Closed · ${card.name}`,
      tone: 'rose' as const,
      sub: card.nextOpen ? `Reopens ${formatDay(card.nextOpen)}, ${formatTime(k.center.open)}` : '',
    },
    weekend: { title: 'Closed · weekend', tone: 'muted' as const, sub: card.nextOpen ? `Next open ${formatDay(card.nextOpen)}` : '' },
    unpublished: {
      title: 'Not on the calendar yet',
      tone: 'muted' as const,
      sub: `Published through ${formatDay(k.calendar.publishedThrough)}`,
    },
  }[card.state]
  return (
    <div className="flex items-center gap-3">
      <DateTile date={card.date} tone={head.tone} />
      <div className="min-w-0 flex-1">
        <div className="text-xs text-ink-subtle">
          {formatDayLong(card.date)} · {relativeDay(card.date, now.date)}
        </div>
        <div className="font-medium leading-snug">{head.title}</div>
        <div className="text-sm text-ink-muted">{head.sub}</div>
      </div>
      {(card.state === 'closed' || card.state === 'early') && (
        <button
          className="btn-quiet shrink-0 !px-2.5"
          onClick={() =>
            downloadIcs(
              `Willow & Wren ${card.state === 'closed' ? 'closed' : `closes ${formatTime(card.close!)}`}: ${card.name}`,
              card.date,
            )
          }
          aria-label="Add to calendar"
          title="Add to calendar"
        >
          <CalendarPlus size={16} />
        </button>
      )}
    </div>
  )
}

function TuitionCard({ card, k }: { card: Extract<Card, { kind: 'tuition' }>; k: Knowledge }) {
  return (
    <div>
      <table className="w-full text-sm tabular">
        <thead>
          <tr className="text-left text-2xs uppercase tracking-wider text-ink-subtle">
            <th className="pb-1.5 font-semibold">Program</th>
            <th className="pb-1.5 text-right font-semibold">5 days</th>
            <th className="pb-1.5 text-right font-semibold">3 days</th>
          </tr>
        </thead>
        <tbody>
          {k.tuition.bands.map((b) => {
            const on = card.highlight.includes(b.id)
            const kid = demoFamily.children.find((c) => c.band === b.id)
            return (
              <tr key={b.id} className={cx('border-t border-line', on && 'bg-willow-soft/60')}>
                <td className="py-1.5 pl-1">
                  <div className={cx('font-medium', on && 'text-willow-text')}>
                    {b.label}
                    {kid && card.highlight.length > 1 && (
                      <span className="ml-1.5 text-2xs font-semibold text-willow-text">· {kid.name}</span>
                    )}
                  </div>
                  <div className="text-2xs text-ink-subtle">
                    {b.ages} · ratio {b.ratio}
                  </div>
                </td>
                <td
                  className={cx(
                    'py-1.5 text-right',
                    kid?.schedule === 'full' && card.highlight.length > 1 && 'font-semibold text-willow-text',
                  )}
                >
                  {usd(b.fullTime)}
                </td>
                <td
                  className={cx(
                    'py-1.5 pr-1 text-right',
                    kid?.schedule === 'part' && card.highlight.length > 1 && 'font-semibold text-willow-text',
                  )}
                >
                  {usd(b.partTime)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="mt-2 text-2xs text-ink-subtle">
        Per month · {usd(k.tuition.registrationFee)} annual registration · {k.tuition.siblingDiscountPct}% sibling discount on the older
        child
      </p>
    </div>
  )
}

const SYMPTOMS: { id: Symptom; label: string }[] = [
  { id: 'fever', label: 'Fever' },
  { id: 'gi', label: 'Vomiting / diarrhea' },
  { id: 'pinkeye', label: 'Pink eye' },
  { id: 'rash', label: 'Rash' },
  { id: 'cold', label: 'Cold / cough' },
  { id: 'lice', label: 'Lice' },
]

function IllnessCard({ card, k, now }: { card: Extract<Card, { kind: 'illness' }>; k: Knowledge; now: Clock }) {
  const child = demoFamily.children.find((c) => c.id === card.childId)!
  const [symptom, setSymptom] = useState<Symptom>(card.symptom === 'unsure' ? 'fever' : card.symptom)
  const [when, setWhen] = useState<'now' | 'morning' | 'night'>('morning')
  const [reducer, setReducer] = useState<'none' | 'morning' | 'night'>('none')
  const [reported, setReported] = useState(false)

  const at = (w: 'now' | 'morning' | 'night'): Clock =>
    w === 'now' ? now : w === 'morning' ? thisMorning(now) : { date: addDays(now.date, -1), minutes: 21 * 60 }
  const hours =
    symptom === 'fever'
      ? k.illness.feverFreeHours
      : symptom === 'gi'
        ? k.illness.giFreeHours
        : symptom === 'pinkeye'
          ? k.illness.pinkEyeTreatmentHours
          : 0
  const timed = symptom === 'fever' || symptom === 'gi' || symptom === 'pinkeye'
  const result = useMemo(
    () =>
      timed
        ? earliestReturn(k, {
            lastSymptom: at(when),
            lastFeverReducer: symptom === 'fever' && reducer !== 'none' ? at(reducer) : undefined,
            hours,
          })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [k, symptom, when, reducer, hours, now.date, now.minutes],
  )
  const whenLabel =
    symptom === 'fever' ? 'Last temperature at or over ' + k.illness.feverF + '°F' : symptom === 'gi' ? 'Last episode' : 'Drops started'

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Thermometer size={16} className="text-wren" /> Return-to-care checker · {child.name}
      </div>
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
        {SYMPTOMS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSymptom(s.id)}
            aria-pressed={symptom === s.id}
            className={cx(
              'shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition',
              symptom === s.id ? 'border-willow bg-willow text-white dark:text-bg' : 'border-line bg-surface text-ink-muted hover:text-ink',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
      {timed && (
        <div className="space-y-2">
          <Choice
            label={whenLabel}
            value={when}
            onChange={setWhen}
            options={[
              ['night', 'Last night'],
              ['morning', 'This morning'],
              ['now', 'Just now'],
            ]}
          />
          {symptom === 'fever' && (
            <Choice
              label="Fever reducer (Tylenol, Motrin)"
              value={reducer}
              onChange={setReducer}
              options={[
                ['none', 'None'],
                ['night', 'Last night'],
                ['morning', 'This morning'],
              ]}
            />
          )}
        </div>
      )}
      <div className="rounded-xl bg-surface-2 p-3">
        {result?.earliest ? (
          <>
            <div className="label">Earliest return</div>
            <div className="mt-0.5 font-serif text-lg font-semibold">
              {formatDayLong(result.earliest.date)}, {formatTime(result.earliest.minutes)}
            </div>
            <div className="mt-0.5 text-xs text-ink-muted">
              {hours} hours{' '}
              {symptom === 'fever' ? 'fever-free without medicine' : symptom === 'gi' ? 'symptom-free' : 'after starting treatment'} → clear{' '}
              {formatDay(result.clearAt.date)} {formatTime(result.clearAt.minutes)}
              {result.skipped.length > 0 && `; ${result.skipped.map((c) => `${formatDay(c.date)} is ${c.name}`).join(', ')}`}
            </div>
          </>
        ) : (
          <div className="text-sm">
            {symptom === 'cold' && `No fever? ${child.name} can come in if ${child.pronoun} can join normal activities.`}
            {symptom === 'rash' && `With a fever, a doctor’s note is needed. Without one, ${k.center.directorShort} will take a look.`}
            {symptom === 'lice' && `${child.name} can return after the first treatment.`}
          </div>
        )}
      </div>
      {(timed || symptom === 'rash') && (
        <button
          className={cx(reported ? 'btn-quiet' : 'btn-primary', 'w-full')}
          disabled={reported}
          onClick={() => {
            setReported(true)
            const until = result?.earliest ? ` until ${formatDay(result.earliest.date)} ${formatTime(result.earliest.minutes)}` : ''
            createRequest(
              'absence',
              `Absence: ${child.name}`,
              `${SYMPTOMS.find((s) => s.id === symptom)!.label}${until}. Reported by parent via Front Desk.`,
              `${child.name} is marked absent${until}. ${roomNames[child.room].split(' ')[0]} teachers have been told. Feel better, ${child.name}!`,
            )
          }}
        >
          {reported ? (
            <>
              <Check size={16} /> Absence reported
            </>
          ) : (
            `Report ${child.name} absent`
          )}
        </button>
      )}
    </div>
  )
}

function Choice<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T
  onChange: (v: T) => void
  options: [T, string][]
}) {
  return (
    <div>
      <div className="mb-1 text-xs text-ink-muted">{label}</div>
      <div className="flex gap-1.5">
        {options.map(([v, l]) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            aria-pressed={value === v}
            className={cx(
              'flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition',
              value === v ? 'border-willow bg-willow-soft text-willow-text' : 'border-line text-ink-muted hover:text-ink',
            )}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  )
}

function LunchCard({ card, k, now }: { card: Extract<Card, { kind: 'lunch' }>; k: Knowledge; now: Clock }) {
  const child = demoFamily.children.find((c) => c.id === card.childId)!
  const plan = lunchPlan(k, child, card.date, now)
  const [added, setAdded] = useState(false)
  if (!plan.menu) return null
  const left = k.lunch.cutoff - now.minutes
  return (
    <div className="space-y-2.5">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-wren-soft text-wren-text">
          <UtensilsCrossed size={18} />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-ink-subtle">{formatDayLong(card.date)}</div>
          <div className={cx('font-medium', plan.servesAlternate && 'text-ink-subtle line-through decoration-1')}>{plan.menu.lunch}</div>
          <div className="mt-0.5 flex flex-wrap gap-1">
            {plan.menu.allergens.map((a) => (
              <span
                key={a}
                className={cx(
                  'rounded-full px-1.5 py-px text-2xs font-semibold',
                  child.allergies.includes(a) ? 'bg-rose-soft text-rose-text' : 'bg-surface-3 text-ink-muted',
                )}
              >
                {a}
              </span>
            ))}
          </div>
        </div>
      </div>
      {plan.servesAlternate && (
        <div className="rounded-xl bg-willow-soft px-3 py-2 text-sm text-willow-text">
          <span className="font-semibold">{child.name} gets:</span> {plan.menu.alternate}{' '}
          <span className="text-2xs">({plan.conflicts.join(', ')}-free)</span>
        </div>
      )}
      <div className="text-xs text-ink-muted">Snack: {plan.menu.snack}</div>
      {plan.canRequest && card.date === now.date && (
        <button
          className={cx(added ? 'btn-quiet' : 'btn-primary', 'w-full')}
          disabled={added}
          onClick={() => {
            setAdded(true)
            createRequest(
              'lunch',
              `Backup lunch: ${child.name}`,
              `${plan.servesAlternate ? plan.menu!.alternate + ' (allergy alternate)' : plan.menu!.lunch} · ${usd(k.lunch.backupPrice)} to account`,
              `${child.name} is on today’s lunch count${plan.servesAlternate ? ` with the ${plan.conflicts.join('/')}-free alternate` : ''}. ${usd(k.lunch.backupPrice)} will be added to your account.`,
            )
          }}
        >
          {added ? (
            <>
              <Check size={16} /> Added to today’s count
            </>
          ) : (
            <>
              Add {child.name} to lunch · {usd(k.lunch.backupPrice)}
            </>
          )}
        </button>
      )}
      {plan.canRequest && card.date === now.date && !added && (
        <div className="text-center text-2xs text-ink-subtle">
          Kitchen count closes in {Math.floor(left / 60) > 0 && `${Math.floor(left / 60)}h `}
          {left % 60}m
        </div>
      )}
    </div>
  )
}

function ToursCard({ k, now }: { k: Knowledge; now: Clock }) {
  const booked = useStore((s) => s.bookedTours)
  const slots = tourSlots(k, now, booked).slice(0, 6)
  const [pick, setPick] = useState<Clock | null>(null)
  const [done, setDone] = useState<Clock | null>(null)
  if (done)
    return (
      <div className="flex items-center gap-3">
        <DateTile date={done.date} tone="willow" />
        <div className="flex-1">
          <div className="font-medium">Tour booked</div>
          <div className="text-sm text-ink-muted">
            {formatDayLong(done.date)}, {formatTime(done.minutes)} · with {k.center.directorShort}
          </div>
        </div>
        <button
          className="btn-quiet !px-2.5"
          aria-label="Add to calendar"
          onClick={() => downloadIcs('Tour at Willow & Wren', done.date, done.minutes, k.tours.durationMin, k.center.address)}
        >
          <CalendarPlus size={16} />
        </button>
      </div>
    )
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-1.5">
        {slots.map((s) => {
          const on = pick && pick.date === s.date && pick.minutes === s.minutes
          return (
            <button
              key={`${s.date}${s.minutes}`}
              onClick={() => setPick(s)}
              aria-pressed={!!on}
              className={cx(
                'rounded-xl border px-2.5 py-2 text-left transition',
                on ? 'border-willow bg-willow-soft' : 'border-line hover:border-line-strong',
              )}
            >
              <div className="text-xs text-ink-subtle">{formatDay(s.date)}</div>
              <div className="text-sm font-medium">{formatTime(s.minutes)}</div>
            </button>
          )
        })}
      </div>
      <button
        className="btn-primary w-full"
        disabled={!pick}
        onClick={() => {
          bookTour(pick!)
          setDone(pick)
        }}
      >
        {pick ? `Book ${formatDay(pick.date)} · ${formatTime(pick.minutes)}` : 'Choose a time'}
      </button>
    </div>
  )
}

function HandoffCard({ k, now, logId }: { k: Knowledge; now: Clock; logId?: string }) {
  const item = useStore((s) => s.inbox.find((i) => i.logId === logId))
  const replied = item?.status === 'done'
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-dusk-soft font-serif text-sm font-semibold text-dusk-text">
          ER
        </div>
        <span
          className={cx('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface', replied ? 'bg-willow' : 'bg-honey')}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">
          {k.center.director} <span className="font-normal text-ink-subtle">· Director</span>
        </div>
        <div className="text-xs text-ink-muted">{replied ? 'Replied, see below' : replyExpectation(k, now)}</div>
      </div>
    </div>
  )
}

function UrgentCard({ k }: { k: Knowledge }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <a href="tel:911" className="btn flex-col gap-0.5 rounded-xl bg-rose py-3 text-white dark:text-bg">
        <Siren size={18} />
        Call 911
      </a>
      <a href={`tel:${k.center.phone.replace(/\D/g, '')}`} className="btn-quiet flex-col gap-0.5 rounded-xl py-3">
        <Phone size={18} />
        Call center
      </a>
    </div>
  )
}

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
