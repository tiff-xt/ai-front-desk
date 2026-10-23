import { useState } from 'react'
import { CalendarPlus } from 'lucide-react'
import type { Knowledge } from '@/data/types'
import { tourSlots } from '@/engine/policy'
import { downloadIcs } from '@/lib/ics'
import { formatTime, type Clock } from '@/lib/time'
import { bookTour, useStore } from '@/store/store'
import { cx } from '@/lib/cx'
import { fmt, useT } from '@/lib/i18n'
import { DateTile } from './DateTile'

export function ToursCard({ k, now }: { k: Knowledge; now: Clock }) {
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
