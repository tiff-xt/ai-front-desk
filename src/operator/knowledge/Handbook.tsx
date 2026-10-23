import { useState } from 'react'
import { cx } from '@/lib/cx'
import type { Knowledge } from '@/data/types'
import { formatDay } from '@/lib/time'
import { updateKnowledge, useStore } from '@/store/store'

export function Handbook({ k }: { k: Knowledge }) {
  const [sel, setSel] = useState(k.handbook[0]?.id)
  const s = k.handbook.find((h) => h.id === sel) ?? k.handbook[0]
  const now = useStore((st) => st.now)
  const patch = (p: Partial<typeof s>) =>
    updateKnowledge((kk) => ({
      ...kk,
      handbook: kk.handbook.map((h) => (h.id === s.id ? { ...h, ...p, updatedAt: now.date, updatedBy: 'Ms. Rivera' } : h)),
    }))
  return (
    <section className="card grid min-h-[22rem] overflow-hidden md:grid-cols-[13rem_1fr]">
      <ul className="border-b border-line md:border-b-0 md:border-r">
        {k.handbook.map((h) => (
          <li key={h.id}>
            <button
              onClick={() => setSel(h.id)}
              className={cx(
                'w-full px-3.5 py-2 text-left text-sm transition',
                s.id === h.id ? 'bg-surface-2 font-medium' : 'text-ink-muted hover:bg-surface-2/60',
              )}
            >
              {h.title}
              {h.origin === 'operator-answer' && (
                <span className="ml-1.5 rounded-full bg-willow-soft px-1.5 text-2xs font-semibold text-willow-text">from Gaps</span>
              )}
            </button>
          </li>
        ))}
      </ul>
      <div className="space-y-3 p-4">
        <input
          aria-label="Section title"
          className="input font-medium"
          value={s.title}
          onChange={(e) => patch({ title: e.target.value })}
        />
        <textarea
          aria-label="Section text"
          rows={7}
          className="input resize-y leading-relaxed"
          value={s.body}
          onChange={(e) => patch({ body: e.target.value })}
        />
        <div>
          <div className="label">Keywords that route questions here</div>
          <input
            className="input mt-1 text-xs"
            value={s.keywords.join(', ')}
            onChange={(e) =>
              patch({
                keywords: e.target.value
                  .split(',')
                  .map((x) => x.trim())
                  .filter(Boolean),
              })
            }
          />
        </div>
        <div className="text-2xs text-ink-subtle">
          Updated {formatDay(s.updatedAt)} {s.updatedAt.slice(0, 4)} by {s.updatedBy}
        </div>
      </div>
    </section>
  )
}
