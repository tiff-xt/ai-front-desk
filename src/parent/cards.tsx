import { useMemo, useState } from 'react'
import { CalendarPlus, Check, Phone, Siren, Thermometer, UtensilsCrossed } from 'lucide-react'
import { demoFamily } from '@/data/seed'
import type { Knowledge } from '@/data/types'
import { earliestReturn, firstOpenAtOrAfter, isOfficeOpen, lunchPlan, thisMorning, tourSlots } from '@/engine/policy'
import type { Card, Symptom } from '@/engine/types'
import { downloadIcs } from '@/lib/ics'
import { addDays, formatDay, formatTime, relativeDay, usd, type Clock } from '@/lib/time'
import { bookTour, createRequest, useStore } from '@/store/store'
import { cx } from '@/components/ui'
import { ALLERGENS_ES, fmt, useT } from '@/lib/i18n'

function DateTile({ date, tone }: { date: string; tone: 'willow' | 'honey' | 'rose' | 'muted' }) {
  const { lang } = useT()
  const tones = {
    willow: 'bg-willow-soft text-willow-text',
    honey: 'bg-honey-soft text-honey-text',
    rose: 'bg-rose-soft text-rose-text',
    muted: 'bg-surface-3 text-ink-muted',
  }
  return (
    <div className={cx('flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl', tones[tone])}>
      <span className="text-2xs font-semibold tracking-wider">{fmt.month(date, lang)}</span>
      <span className="font-serif text-2xl font-semibold leading-none">{+date.slice(8, 10)}</span>
    </div>
  )
}

function DayCard({ card, k, now }: { card: Extract<Card, { kind: 'day' }>; k: Knowledge; now: Clock }) {
  const { t, lang } = useT()
  const head = {
    open: { title: t.open, tone: 'willow' as const, sub: `${formatTime(card.open!)} – ${formatTime(card.close!)}` },
    early: { title: t.earlyCloseTitle(card.name!), tone: 'honey' as const, sub: `${formatTime(card.open!)} – ${formatTime(card.close!)}` },
    closed: {
      title: t.closedTitle(card.name!),
      tone: 'rose' as const,
      sub: card.nextOpen ? t.reopens(fmt.day(card.nextOpen, lang), formatTime(k.center.open)) : '',
    },
    weekend: { title: t.weekendTitle, tone: 'muted' as const, sub: card.nextOpen ? t.nextOpen(fmt.day(card.nextOpen, lang)) : '' },
    unpublished: {
      title: t.unpublishedTitle,
      tone: 'muted' as const,
      sub: t.publishedThrough(fmt.day(k.calendar.publishedThrough, lang)),
    },
  }[card.state]
  return (
    <div className="flex items-center gap-3">
      <DateTile date={card.date} tone={head.tone} />
      <div className="min-w-0 flex-1">
        <div className="text-xs text-ink-subtle">
          {fmt.dayLong(card.date, lang)}
          {lang === 'en' && ` · ${relativeDay(card.date, now.date)}`}
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
          aria-label={t.addToCalendar}
          title={t.addToCalendar}
        >
          <CalendarPlus size={16} />
        </button>
      )}
    </div>
  )
}

function TuitionCard({ card, k }: { card: Extract<Card, { kind: 'tuition' }>; k: Knowledge }) {
  const { t } = useT()
  return (
    <div>
      <table className="w-full text-sm tabular">
        <thead>
          <tr className="text-left text-2xs uppercase tracking-wider text-ink-subtle">
            <th className="pb-1.5 font-semibold">{t.program}</th>
            <th className="pb-1.5 text-right font-semibold">{t.days5}</th>
            <th className="pb-1.5 text-right font-semibold">{t.days3}</th>
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
                    {b.ages} · {t.ratio} {b.ratio}
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
      <p className="mt-2 text-2xs text-ink-subtle">{t.perMonth(usd(k.tuition.registrationFee), k.tuition.siblingDiscountPct)}</p>
    </div>
  )
}

const SYMPTOMS: Symptom[] = ['fever', 'gi', 'pinkeye', 'rash', 'cold', 'lice']
const SYMPTOM_EN: Record<string, string> = {
  fever: 'Fever',
  gi: 'Vomiting / diarrhea',
  pinkeye: 'Pink eye',
  rash: 'Rash',
  cold: 'Cold / cough',
  lice: 'Lice',
}

function IllnessCard({ card, k, now }: { card: Extract<Card, { kind: 'illness' }>; k: Knowledge; now: Clock }) {
  const child = demoFamily.children.find((c) => c.id === card.childId)!
  const [symptom, setSymptom] = useState<Symptom>(card.symptom === 'unsure' ? 'fever' : card.symptom)
  const [when, setWhen] = useState<'now' | 'morning' | 'night'>('morning')
  const [reducer, setReducer] = useState<'none' | 'morning' | 'night'>('none')
  const [reported, setReported] = useState(false)
  const { t, lang } = useT()

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
  const whenLabel = symptom === 'fever' ? t.lastFever(k.illness.feverF) : symptom === 'gi' ? t.lastEpisode : t.dropsStarted

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Thermometer size={16} className="text-wren" /> {t.checker(child.name)}
      </div>
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
        {SYMPTOMS.map((s) => (
          <button
            key={s}
            onClick={() => setSymptom(s)}
            aria-pressed={symptom === s}
            className={cx(
              'shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition',
              symptom === s ? 'border-willow bg-willow text-white dark:text-bg' : 'border-line bg-surface text-ink-muted hover:text-ink',
            )}
          >
            {t.symptoms[s]}
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
              ['night', t.lastNight],
              ['morning', t.thisMorning],
              ['now', t.justNow],
            ]}
          />
          {symptom === 'fever' && (
            <Choice
              label={t.reducer}
              value={reducer}
              onChange={setReducer}
              options={[
                ['none', t.none],
                ['night', t.lastNight],
                ['morning', t.thisMorning],
              ]}
            />
          )}
        </div>
      )}
      <div className="rounded-xl bg-surface-2 p-3">
        {result?.earliest ? (
          <>
            <div className="label">{t.earliestReturn}</div>
            <div className="mt-0.5 font-serif text-lg font-semibold">
              {fmt.dayLong(result.earliest.date, lang)}, {formatTime(result.earliest.minutes)}
            </div>
            <div className="mt-0.5 text-xs text-ink-muted">
              {t.clearRule(hours, symptom === 'fever' ? 'fever' : symptom === 'gi' ? 'gi' : 'other')} → {t.clear}{' '}
              {fmt.day(result.clearAt.date, lang)} {formatTime(result.clearAt.minutes)}
              {result.skipped.length > 0 && `; ${result.skipped.map((c) => t.isClosure(fmt.day(c.date, lang), c.name)).join(', ')}`}
            </div>
          </>
        ) : (
          <div className="text-sm">
            {symptom === 'cold' && t.coldOk(child.name, child.pronoun)}
            {symptom === 'rash' && t.rashNote(k.center.directorShort)}
            {symptom === 'lice' && t.liceOk(child.name)}
          </div>
        )}
      </div>
      {(timed || symptom === 'rash') && (
        <button
          className={cx(reported ? 'btn-quiet' : 'btn-primary', 'w-full')}
          disabled={reported}
          onClick={() => {
            setReported(true)
            const e = result?.earliest
            const until = e ? ` until ${formatDay(e.date)} ${formatTime(e.minutes)}` : ''
            // Staff read English; the parent's confirmation is in their language.
            createRequest(
              'absence',
              `Absence: ${child.name}`,
              `${SYMPTOM_EN[symptom]}${until}. Reported by parent via Front Desk.`,
              t.absenceNote(child.name, e ? t.until(`${fmt.day(e.date, lang)} ${formatTime(e.minutes)}`) : ''),
            )
          }}
        >
          {reported ? (
            <>
              <Check size={16} /> {t.absenceReported}
            </>
          ) : (
            t.reportAbsent(child.name)
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
  const { t, lang } = useT()
  const allergen = (a: string) => (lang === 'es' ? (ALLERGENS_ES[a] ?? a) : a)
  if (!plan.menu) return null
  const left = k.lunch.cutoff - now.minutes
  return (
    <div className="space-y-2.5">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-wren-soft text-wren-text">
          <UtensilsCrossed size={18} />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-ink-subtle">{fmt.dayLong(card.date, lang)}</div>
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
                {allergen(a)}
              </span>
            ))}
          </div>
        </div>
      </div>
      {plan.servesAlternate && (
        <div className="rounded-xl bg-willow-soft px-3 py-2 text-sm text-willow-text">
          <span className="font-semibold">{t.gets(child.name)}</span> {plan.menu.alternate}{' '}
          <span className="text-2xs">({t.free(plan.conflicts.map(allergen).join(', '))})</span>
        </div>
      )}
      <div className="text-xs text-ink-muted">
        {t.snack}: {plan.menu.snack}
      </div>
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
              t.lunchNote(
                child.name,
                plan.servesAlternate ? t.withAlt(plan.conflicts.map(allergen).join('/')) : '',
                usd(k.lunch.backupPrice),
              ),
            )
          }}
        >
          {added ? (
            <>
              <Check size={16} /> {t.addedLunch}
            </>
          ) : (
            t.addLunch(child.name, usd(k.lunch.backupPrice))
          )}
        </button>
      )}
      {plan.canRequest && card.date === now.date && !added && (
        <div className="text-center text-2xs text-ink-subtle">{t.countCloses(Math.floor(left / 60), left % 60)}</div>
      )}
    </div>
  )
}

function ToursCard({ k, now }: { k: Knowledge; now: Clock }) {
  const booked = useStore((s) => s.bookedTours)
  const slots = tourSlots(k, now, booked).slice(0, 6)
  const [pick, setPick] = useState<Clock | null>(null)
  const [done, setDone] = useState<Clock | null>(null)
  const { t, lang } = useT()
  if (done)
    return (
      <div className="flex items-center gap-3">
        <DateTile date={done.date} tone="willow" />
        <div className="flex-1">
          <div className="font-medium">{t.tourBooked}</div>
          <div className="text-sm text-ink-muted">
            {fmt.dayLong(done.date, lang)}, {formatTime(done.minutes)} · {t.tourWith(k.center.directorShort)}
          </div>
        </div>
        <button
          className="btn-quiet !px-2.5"
          aria-label={t.addToCalendar}
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
              <div className="text-xs text-ink-subtle">{fmt.day(s.date, lang)}</div>
              <div className="text-sm font-medium">{formatTime(s.minutes)}</div>
            </button>
          )
        })}
      </div>
      <button
        className="btn-primary w-full"
        disabled={!pick}
        onClick={() => {
          bookTour(pick!, t.tourNote(fmt.day(pick!.date, lang), formatTime(pick!.minutes), k.center.directorShort))
          setDone(pick)
        }}
      >
        {pick ? t.book(fmt.day(pick.date, lang), formatTime(pick.minutes)) : t.chooseTime}
      </button>
    </div>
  )
}

function HandoffCard({ k, now, logId }: { k: Knowledge; now: Clock; logId?: string }) {
  const item = useStore((s) => s.inbox.find((i) => i.logId === logId))
  const replied = item?.status === 'done'
  const { t, lang } = useT()
  const next = firstOpenAtOrAfter(k, now)
  const expectation = isOfficeOpen(k, now)
    ? t.replyIn(k.center.officeReplyHours)
    : next
      ? t.firstInLine(next.date === now.date ? formatTime(next.minutes) : t.at(fmt.day(next.date, lang), formatTime(next.minutes)))
      : ''
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
          {k.center.director} <span className="font-normal text-ink-subtle">· {t.director}</span>
        </div>
        <div className="text-xs text-ink-muted">{replied ? t.replied : expectation}</div>
      </div>
    </div>
  )
}

function UrgentCard({ k }: { k: Knowledge }) {
  const { t } = useT()
  return (
    <div className="grid grid-cols-2 gap-2">
      <a href="tel:911" className="btn flex-col gap-0.5 rounded-xl bg-rose py-3 text-white dark:text-bg">
        <Siren size={18} />
        {t.call911}
      </a>
      <a href={`tel:${k.center.phone.replace(/\D/g, '')}`} className="btn-quiet flex-col gap-0.5 rounded-xl py-3">
        <Phone size={18} />
        {t.callCenter}
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
