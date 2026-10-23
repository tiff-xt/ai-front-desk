import { useState } from 'react'
import { Search } from 'lucide-react'
import { StatusPill } from '@/components/ui'
import { demoFamily } from '@/data/seed'
import { answerQuestion } from '@/engine/answer'
import { useStore } from '@/store/store'

/** Ask the desk as a parent would, against the knowledge as it is right now, before any parent does. */
export function TryIt() {
  const state = useStore((s) => s)
  const [q, setQ] = useState('Are you open on Veterans Day?')
  const a = q.trim()
    ? answerQuestion({
        question: q,
        knowledge: state.knowledge,
        family: demoFamily,
        now: state.now,
        childId: state.childId,
        autonomy: state.autonomy,
        bookedTours: state.bookedTours,
      })
    : null
  return (
    <aside className="card h-fit p-4 xl:sticky xl:top-0">
      <div className="label">Preview an answer</div>
      <div className="relative mt-2">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
        <input className="input pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a parent question" />
      </div>
      {a && (
        <div className="mt-3 animate-fade-in">
          <StatusPill status={a.status} />
          <p className="mt-1.5 text-sm leading-relaxed">{a.text}</p>
          {a.staffDraft && a.status === 'review' && (
            <p className="mt-2 rounded-lg bg-surface-2 p-2 text-xs text-ink-muted">Draft held for review: {a.staffDraft}</p>
          )}
          <div className="mt-2 text-2xs text-ink-subtle">Source: {a.sources.map((s) => s.title).join(', ') || 'none'}</div>
        </div>
      )}
      <p className="mt-3 border-t border-line pt-3 text-2xs text-ink-subtle">Updates live as you edit. Nothing is sent to parents.</p>
    </aside>
  )
}
