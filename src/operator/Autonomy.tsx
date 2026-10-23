import { useMemo } from 'react'
import { Lock } from 'lucide-react'
import { Segmented } from '@/components/ui'
import { TOPIC_LABELS } from '@/engine/defaults'
import type { Autonomy, Topic } from '@/engine/types'
import { setAutonomy, useStore } from '@/store/store'

const ROWS: { topic: Topic; example: string }[] = [
  { topic: 'hours', example: 'Are you open on Veterans Day?' },
  { topic: 'tuition', example: 'What is tuition for infants?' },
  { topic: 'illness', example: 'Can she come in with a fever?' },
  { topic: 'lunch', example: 'I forgot lunch, what is it today?' },
  { topic: 'tours', example: 'How do I schedule a tour?' },
  { topic: 'policies', example: 'Can grandma pick up Friday?' },
  { topic: 'medical', example: 'Can you give her antibiotic at lunch?' },
  { topic: 'billing', example: 'I was charged twice.' },
  { topic: 'incidents', example: 'He came home with a bump on his head.' },
  { topic: 'custody', example: 'My ex isn’t allowed to pick up.' },
]

const LOCKED: { label: string; why: string }[] = [
  { label: 'Emergencies', why: 'Always “call 911 first”, with the center’s number. Never a generated answer.' },
  { label: 'Other families’ information', why: 'Never shared, whatever the wording. Routed to you.' },
  { label: 'Questions not in your handbook', why: 'The desk never guesses. They go to you and show up in Gaps.' },
]

const OPTIONS: { value: Autonomy; label: string; title: string }[] = [
  { value: 'auto', label: 'Answer', title: 'Answer automatically, with sources' },
  { value: 'review', label: 'Draft for me', title: 'Draft an answer; you approve before it’s sent' },
  { value: 'human', label: 'Always me', title: 'Never answered by the desk; goes straight to you' },
]

export function AutonomyView() {
  const autonomy = useStore((s) => s.autonomy)
  const log = useStore((s) => s.log)
  const counts = useMemo(() => {
    const m = new Map<string, number>()
    log.forEach((l) => m.set(l.answer.topic, (m.get(l.answer.topic) ?? 0) + 1))
    return m
  }, [log])

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-serif text-2xl font-semibold tracking-tight">How much the desk can say</h2>
        <p className="max-w-2xl text-sm text-ink-muted">
          You decide, topic by topic. Start cautious and loosen as you see it answer well. Changes apply to the next question. Try setting
          Illness to “Draft for me” and ask about a fever.
        </p>
      </div>
      <div className="card divide-y divide-line">
        {ROWS.map((r) => (
          <div key={r.topic} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-[12rem] flex-1">
              <div className="text-sm font-medium">{TOPIC_LABELS[r.topic]}</div>
              <div className="text-xs text-ink-subtle">
                “{r.example}” · {counts.get(r.topic) ?? 0} this week
              </div>
            </div>
            <Segmented
              size="sm"
              label={TOPIC_LABELS[r.topic]}
              value={autonomy[r.topic]}
              options={OPTIONS}
              onChange={(v) => setAutonomy(r.topic, v)}
            />
          </div>
        ))}
      </div>
      <div>
        <div className="label mb-2">Guardrails · always on</div>
        <div className="card divide-y divide-line">
          {LOCKED.map((l) => (
            <div key={l.label} className="flex items-start gap-3 px-4 py-3">
              <Lock size={15} className="mt-0.5 shrink-0 text-ink-subtle" />
              <div>
                <div className="text-sm font-medium">{l.label}</div>
                <div className="text-xs text-ink-muted">{l.why}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
