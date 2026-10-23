import type { Knowledge } from '@/data/types'
import { firstOpenAtOrAfter, isOfficeOpen } from '@/engine/policy'
import { formatTime, type Clock } from '@/lib/time'
import { useStore } from '@/store/store'
import { cx } from '@/lib/cx'
import { StaffAvatar } from '@/components/ui'
import { fmt, useT } from '@/lib/i18n'

export function HandoffCard({ k, now, logId }: { k: Knowledge; now: Clock; logId?: string }) {
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
        <StaffAvatar size="lg" />
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
