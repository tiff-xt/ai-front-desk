import type { ReactNode } from 'react'
import { AlertTriangle, CircleCheck, CircleDashed, Clock3, UserRound } from 'lucide-react'
import type { Status } from '@/engine/types'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

/** Status always pairs a label and an icon with its color, so it never relies on color alone. */
export const STATUS: Record<Status, { label: string; cls: string; Icon: typeof CircleCheck }> = {
  answered: { label: 'Answered', cls: 'bg-willow-soft text-willow-text', Icon: CircleCheck },
  caveat: { label: 'Answered, with a caveat', cls: 'bg-honey-soft text-honey-text', Icon: CircleDashed },
  review: { label: 'Staff is reviewing', cls: 'bg-dusk-soft text-dusk-text', Icon: Clock3 },
  handoff: { label: 'With a person', cls: 'bg-dusk-soft text-dusk-text', Icon: UserRound },
  urgent: { label: 'Urgent', cls: 'bg-rose-soft text-rose-text', Icon: AlertTriangle },
}

export function StatusPill({ status, short = false }: { status: Status; short?: boolean }) {
  const s = STATUS[status]
  return (
    <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-2xs font-semibold', s.cls)}>
      <s.Icon size={12} strokeWidth={2.4} aria-hidden />
      {short ? s.label.split(',')[0] : s.label}
    </span>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = 'md',
  label,
}: {
  value: T
  options: { value: T; label: ReactNode; title?: string }[]
  onChange: (v: T) => void
  size?: 'sm' | 'md'
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full border border-line bg-surface-2 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cx(
            'rounded-full font-medium transition duration-150',
            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm',
            value === o.value ? 'bg-surface text-ink shadow-card' : 'text-ink-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Empty({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <div className="grid h-10 w-10 place-items-center rounded-full bg-willow-soft text-willow-text">{icon}</div>
      <div className="font-medium">{title}</div>
      <p className="max-w-xs text-sm text-ink-muted">{body}</p>
    </div>
  )
}
