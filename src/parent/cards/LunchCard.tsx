import { useState } from 'react'
import { Check, UtensilsCrossed } from 'lucide-react'
import { demoFamily } from '@/data/seed'
import type { Knowledge } from '@/data/types'
import { lunchPlan } from '@/engine/policy'
import type { Card } from '@/engine/types'
import { usd, type Clock } from '@/lib/time'
import { createRequest } from '@/store/store'
import { cx } from '@/lib/cx'
import { allergenLabel, fmt, useT } from '@/lib/i18n'

export function LunchCard({ card, k, now }: { card: Extract<Card, { kind: 'lunch' }>; k: Knowledge; now: Clock }) {
  const child = demoFamily.children.find((c) => c.id === card.childId)!
  const plan = lunchPlan(k, child, card.date, now)
  const [added, setAdded] = useState(false)
  const { t, lang } = useT()
  const allergen = (a: string) => allergenLabel(a, lang)
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
