import { useMemo, useState } from 'react'
import { Check, Thermometer } from 'lucide-react'
import { demoFamily } from '@/data/seed'
import type { Knowledge } from '@/data/types'
import { earliestReturn, thisMorning } from '@/engine/policy'
import type { Card, Symptom } from '@/engine/types'
import { addDays, formatDay, formatTime, type Clock } from '@/lib/time'
import { createRequest } from '@/store/store'
import { cx } from '@/lib/cx'
import { fmt, useT } from '@/lib/i18n'

const SYMPTOMS: Symptom[] = ['fever', 'gi', 'pinkeye', 'rash', 'cold', 'lice']

const SYMPTOM_EN: Record<string, string> = {
  fever: 'Fever',
  gi: 'Vomiting / diarrhea',
  pinkeye: 'Pink eye',
  rash: 'Rash',
  cold: 'Cold / cough',
  lice: 'Lice',
}

export function IllnessCard({ card, k, now }: { card: Extract<Card, { kind: 'illness' }>; k: Knowledge; now: Clock }) {
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
