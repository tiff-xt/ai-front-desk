import { useMemo } from 'react'
import { ArrowRight, ThumbsDown } from 'lucide-react'
import { cx, StatusPill } from '@/components/ui'
import { TOPIC_LABELS } from '@/engine/defaults'
import { formatDay, formatTime } from '@/lib/time'
import { gapItems, resolvedByDesk } from '@/store/selectors'
import { useStore } from '@/store/store'
import type { Tab } from './Operator'

/** Minutes a front-desk person spends on a typical phone/text answer, including the context switch. */
const MIN_PER_ANSWER = 4

export function Overview({ go }: { go: (t: Tab) => void }) {
  const log = useStore((s) => s.log)
  const inbox = useStore((s) => s.inbox)
  const stats = useMemo(() => {
    const resolved = log.filter(resolvedByDesk).length
    const topics = new Map<string, { total: number; resolved: number }>()
    for (const l of log) {
      const t = topics.get(l.answer.topic) ?? { total: 0, resolved: 0 }
      t.total++
      if (resolvedByDesk(l)) t.resolved++
      topics.set(l.answer.topic, t)
    }
    const afterHours = log.filter((l) => l.at.minutes < 7 * 60 || l.at.minutes >= 18 * 60).length
    return { total: log.length, resolved, afterHours, topics: [...topics.entries()].sort((a, b) => b[1].total - a[1].total) }
  }, [log])
  const gaps = useMemo(() => gapItems(log), [log])
  const open = inbox.filter((i) => i.status === 'open').length
  const pct = Math.round((stats.resolved / Math.max(1, stats.total)) * 100)
  const max = Math.max(...stats.topics.map(([, t]) => t.total))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-semibold tracking-tight">This week at the front desk</h2>
        <p className="text-sm text-ink-muted">Every question parents asked, what the desk handled and where it needed you.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Questions" value={String(stats.total)} sub={`${stats.afterHours} outside office hours`} />
        <Stat label="Handled by the desk" value={`${pct}%`} sub={`${stats.resolved} of ${stats.total}, with sources`} tone="willow" />
        <Stat
          label="Staff time saved"
          value={`${((stats.resolved * MIN_PER_ANSWER) / 60).toFixed(1)}h`}
          sub={`at ~${MIN_PER_ANSWER} min per answer`}
          tone="willow"
        />
        <Stat
          label="Needs you"
          value={String(open)}
          sub={`${gaps.length} unanswered in Gaps`}
          tone={open ? 'dusk' : undefined}
          onClick={() => go('inbox')}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <section className="card p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="font-medium">What parents ask about</h3>
            <span className="flex items-center gap-3 text-2xs text-ink-subtle">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm bg-willow" /> handled
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm bg-dusk/50" /> needed staff
              </span>
            </span>
          </div>
          <ul className="space-y-2">
            {stats.topics.map(([topic, t]) => (
              <li key={topic} className="grid grid-cols-[8.5rem_1fr_1.5rem] items-center gap-2 text-sm">
                <span className="truncate text-ink-muted">{TOPIC_LABELS[topic]}</span>
                <span className="flex h-2.5 overflow-hidden rounded-full bg-surface-3" style={{ width: `${(t.total / max) * 100}%` }}>
                  <span className="bg-willow" style={{ width: `${(t.resolved / t.total) * 100}%` }} />
                  <span className="flex-1 bg-dusk/50" />
                </span>
                <span className="text-right text-xs tabular text-ink-subtle">{t.total}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-4">
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="font-medium">Where the desk struggled</h3>
            <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => go('gaps')}>
              Fix in Gaps <ArrowRight size={13} />
            </button>
          </div>
          <ul className="divide-y divide-line">
            {gaps.slice(0, 6).map((l) => (
              <li key={l.id} className="flex items-start gap-2 py-2 text-sm">
                {l.feedback === 'down' ? (
                  <ThumbsDown size={14} className="mt-1 shrink-0 text-rose-text" />
                ) : (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-honey" />
                )}
                <span className="flex-1">{l.question}</span>
                <span className="shrink-0 text-2xs text-ink-subtle">{l.feedback === 'down' ? 'Thumbs down' : 'No answer'}</span>
              </li>
            ))}
            {gaps.length === 0 && <li className="py-6 text-center text-sm text-ink-muted">Nothing unanswered. Nice.</li>}
          </ul>
        </section>
      </div>

      <section className="card overflow-hidden">
        <h3 className="border-b border-line px-4 py-3 font-medium">Live feed</h3>
        <ul className="max-h-80 divide-y divide-line overflow-y-auto">
          {[...log]
            .reverse()
            .slice(0, 30)
            .map((l) => (
              <li key={l.id} className={cx('flex items-center gap-3 px-4 py-2.5 text-sm', l.live && 'animate-flash')}>
                <span className="w-24 shrink-0 text-xs tabular text-ink-subtle">
                  {formatDay(l.at.date).split(', ')[1]} · {formatTime(l.at.minutes)}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {l.question}
                  <span className="ml-2 text-xs text-ink-subtle">{l.who}</span>
                  {l.live && (
                    <span className="ml-2 rounded-full bg-willow-soft px-1.5 text-2xs font-semibold text-willow-text">you, just now</span>
                  )}
                </span>
                <span className="hidden text-xs text-ink-subtle sm:inline">{TOPIC_LABELS[l.answer.topic]}</span>
                <StatusPill status={l.answer.status} short />
              </li>
            ))}
        </ul>
      </section>
    </div>
  )
}

function Stat({
  label,
  value,
  sub,
  tone,
  onClick,
}: {
  label: string
  value: string
  sub: string
  tone?: 'willow' | 'dusk'
  onClick?: () => void
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick} className={cx('card p-4 text-left', onClick && 'transition hover:border-line-strong')}>
      <div className="label">{label}</div>
      <div
        className={cx(
          'mt-1 font-serif text-3xl font-semibold tabular tracking-tight',
          tone === 'willow' && 'text-willow-text',
          tone === 'dusk' && 'text-dusk-text',
        )}
      >
        {value}
      </div>
      <div className="mt-0.5 text-xs text-ink-muted">{sub}</div>
    </Tag>
  )
}
