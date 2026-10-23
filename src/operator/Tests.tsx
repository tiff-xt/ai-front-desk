import { useMemo } from 'react'
import { Check, X } from 'lucide-react'
import { cx } from '@/lib/cx'
import { StatusPill } from '@/components/ui'
import { demoFamily } from '@/data/seed'
import { answerQuestion } from '@/engine/answer'
import { DEMO_NOW } from '@/engine/defaults'
import { EVALS } from '@/engine/evals'
import { useStore } from '@/store/store'

/**
 * The same golden questions CI runs, re-run live against the current
 * knowledge and autonomy settings. An edit that changes an expected answer
 * shows up here as a red row before a parent ever sees it.
 */
export function Tests() {
  const k = useStore((s) => s.knowledge)
  const autonomy = useStore((s) => s.autonomy)
  const results = useMemo(
    () =>
      EVALS.map((c) => {
        const a = answerQuestion({
          question: c.question,
          knowledge: k,
          family: demoFamily,
          now: c.now ?? DEMO_NOW,
          childId: c.child ?? 'maya',
          autonomy,
          bookedTours: [],
        })
        const text = a.text.toLowerCase()
        const fails: string[] = []
        if (c.expect.topic && a.topic !== c.expect.topic) fails.push(`topic ${a.topic}, expected ${c.expect.topic}`)
        if (![c.expect.status].flat().includes(a.status)) fails.push(`status ${a.status}, expected ${c.expect.status}`)
        for (const s of c.expect.includes ?? []) if (!text.includes(s.toLowerCase())) fails.push(`missing “${s}”`)
        for (const s of c.expect.excludes ?? []) if (text.includes(s.toLowerCase())) fails.push(`contains “${s}”`)
        return { c, a, fails }
      }),
    [k, autonomy],
  )
  const passed = results.filter((r) => !r.fails.length).length

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-semibold tracking-tight">Golden questions</h2>
          <p className="max-w-2xl text-sm text-ink-muted">
            {EVALS.length} questions that must always be answered correctly, including the tricky ones. They gate every deploy in CI and
            re-run here whenever you edit knowledge or autonomy.
          </p>
        </div>
        <div
          className={cx(
            'rounded-full px-3 py-1 text-sm font-semibold tabular',
            passed === results.length ? 'bg-willow-soft text-willow-text' : 'bg-rose-soft text-rose-text',
          )}
        >
          {passed}/{results.length} passing
        </div>
      </div>
      {passed < results.length && (
        <p className="rounded-xl bg-honey-soft px-4 py-2.5 text-sm text-honey-text">
          Some answers changed after your edits. If the change was intended, that’s fine. These tests encode the original policy. If not,
          you just caught it before a parent did.
        </p>
      )}
      <div className="card divide-y divide-line">
        {results.map(({ c, a, fails }) => (
          <details key={c.id} className="group">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-2.5">
              <span
                className={cx(
                  'grid h-5 w-5 shrink-0 place-items-center rounded-full',
                  fails.length ? 'bg-rose-soft text-rose-text' : 'bg-willow-soft text-willow-text',
                )}
              >
                {fails.length ? <X size={12} strokeWidth={3} /> : <Check size={12} strokeWidth={3} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{c.question}</span>
                <span className="block truncate text-xs text-ink-subtle">{fails.length ? fails.join(' · ') : c.why}</span>
              </span>
              <StatusPill status={a.status} short />
            </summary>
            <div className="bg-surface-2 px-4 py-3 pl-12 text-sm text-ink-muted">{a.text}</div>
          </details>
        ))}
      </div>
    </div>
  )
}
