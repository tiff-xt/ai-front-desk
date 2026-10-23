import { demoFamily } from '@/data/seed'
import type { Knowledge } from '@/data/types'
import type { Card } from '@/engine/types'
import { usd } from '@/lib/time'
import { cx } from '@/lib/cx'
import { useT } from '@/lib/i18n'

export function TuitionCard({ card, k }: { card: Extract<Card, { kind: 'tuition' }>; k: Knowledge }) {
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
