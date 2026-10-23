import { CalendarPlus } from 'lucide-react'
import type { Knowledge } from '@/data/types'
import type { Card } from '@/engine/types'
import { downloadIcs } from '@/lib/ics'
import { formatDay, formatTime, relativeDay, type Clock } from '@/lib/time'
import { fmt, useT } from '@/lib/i18n'
import { DateTile } from './DateTile'

export function DayCard({ card, k, now }: { card: Extract<Card, { kind: 'day' }>; k: Knowledge; now: Clock }) {
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
  const relative = relativeDay(card.date, now.date)
  return (
    <div className="flex items-center gap-3">
      <DateTile date={card.date} tone={head.tone} />
      <div className="min-w-0 flex-1">
        <div className="text-xs text-ink-subtle">
          {fmt.dayLong(card.date, lang)}
          {/* "today", "tomorrow", "this Wednesday": only when it adds something beyond the date. */}
          {lang === 'en' && relative !== formatDay(card.date) && ` · ${relative}`}
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
