import { cx } from '@/lib/cx'
import { fmt, useT } from '@/lib/i18n'

export function DateTile({ date, tone }: { date: string; tone: 'willow' | 'honey' | 'rose' | 'muted' }) {
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
