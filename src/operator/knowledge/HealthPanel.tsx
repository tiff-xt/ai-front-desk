import { useState } from 'react'
import { AlertTriangle, Check } from 'lucide-react'
import { cx } from '@/lib/cx'
import { healthCheck } from '@/engine/health'
import { updateKnowledge } from '@/store/store'

export function HealthPanel({ issues }: { issues: ReturnType<typeof healthCheck> }) {
  // Conflicts and expiring data need action; "not reviewed in a year" is useful but shouldn't shout.
  const [showStale, setShowStale] = useState(false)
  const stale = issues.filter((i) => i.kind === 'stale').length
  if (!issues.length)
    return (
      <div className="card flex items-center gap-2 p-3 text-sm text-willow-text">
        <Check size={16} /> No conflicts or stale sections.
      </div>
    )
  return (
    <div className="card divide-y divide-line">
      <div className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium">
        <AlertTriangle size={15} className="text-honey" /> Health check · {issues.length - stale} to fix
      </div>
      {issues
        .filter((i) => i.kind !== 'stale' || showStale)
        .map((i) => (
          <div key={i.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:gap-3">
            <span
              className={cx(
                'w-fit shrink-0 rounded-full px-2 py-0.5 text-2xs font-semibold sm:mt-0.5',
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
              <button className="btn-quiet w-fit shrink-0 !py-1 text-xs" onClick={() => updateKnowledge(i.fix!.apply)}>
                {i.fix.label}
              </button>
            )}
          </div>
        ))}
      {stale > 0 && (
        <button
          onClick={() => setShowStale(!showStale)}
          className="w-full px-4 py-2.5 text-left text-xs font-medium text-ink-muted hover:text-ink"
        >
          {showStale ? 'Hide' : 'Show'} {stale} {stale === 1 ? 'section' : 'sections'} not reviewed in over a year
        </button>
      )}
    </div>
  )
}
