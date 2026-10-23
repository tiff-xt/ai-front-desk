import { useMemo, useState } from 'react'
import { BellRing, Check, Lightbulb, Plus, ThumbsDown, Wand2, X } from 'lucide-react'
import { cx, Empty } from '@/components/ui'
import { clusterQuestions, type Cluster } from '@/engine/gaps'
import { formatDay, formatTime } from '@/lib/time'
import { gapItems } from '@/store/selectors'
import { publishAnswer, useStore, type LogEntry } from '@/store/store'

/** Demo convenience: realistic answers for the seeded gaps, so a reviewer can close the loop in one click. */
const SAMPLES: [RegExp, string, string][] = [
  [
    /thanksgiving|feast/,
    'Thanksgiving Feast',
    'Our Thanksgiving Feast is Tuesday, November 24 at 11:30am, and families are welcome to join. No need to bring a dish: the kitchen cooks the meal. Each classroom posts a sign-up sheet for fruit or napkins if you would like to help.',
  ],
  [
    /assistance|subsidy|cyfd/,
    'Child Care Assistance',
    'Yes. We accept New Mexico Child Care Assistance (CYFD). Bring your approval letter to the office, and we bill the state directly; you pay only your assigned copay.',
  ],
  [
    /summer|camp/,
    'Summer Camp',
    'Summer Camp runs June through August for children ages 3–6. Enrolled families get first priority, then sign-up opens to the public on March 1.',
  ],
]

export function Gaps() {
  const log = useStore((s) => s.log)
  const clusters = useMemo(() => clusterQuestions(gapItems(log)), [log])
  const [success, setSuccess] = useState<{ title: string; fixed: LogEntry[]; missed: LogEntry[] } | null>(null)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-serif text-2xl font-semibold tracking-tight">Gaps</h2>
        <p className="max-w-2xl text-sm text-ink-muted">
          Questions the desk couldn’t answer, grouped by topic. Write one answer and it joins the handbook. Every question in the group is
          re-checked against it, and families who asked are told the answer.
        </p>
      </div>

      {success && (
        <div className="card animate-rise-in border-willow/40 p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-willow text-white dark:text-bg">
              <Check size={16} />
            </span>
            <div className="flex-1">
              <div className="font-medium">“{success.title}” is live</div>
              <div className="text-sm text-ink-muted">
                {success.fixed.length} of {success.fixed.length + success.missed.length} questions now answered.{' '}
                <span className="inline-flex items-center gap-1 text-willow-text">
                  <BellRing size={13} /> {new Set(success.fixed.map((l) => l.who)).size}{' '}
                  {new Set(success.fixed.map((l) => l.who)).size === 1 ? 'family' : 'families'} notified
                </span>
              </div>
              <ul className="mt-2 space-y-1">
                {success.fixed.map((l, i) => (
                  <li key={l.id} className="flex animate-rise-in items-center gap-2 text-sm" style={{ animationDelay: `${i * 120}ms` }}>
                    <Check size={14} className="text-willow" /> <span className="flex-1">{l.question}</span>{' '}
                    <span className="text-2xs font-semibold text-willow-text">Fixed</span>
                  </li>
                ))}
                {success.missed.map((l) => (
                  <li key={l.id} className="flex items-center gap-2 text-sm text-ink-muted">
                    <X size={14} className="text-rose-text" /> <span className="flex-1">{l.question}</span>{' '}
                    <span className="text-2xs">Still not matched. Add a keyword</span>
                  </li>
                ))}
              </ul>
            </div>
            <button aria-label="Dismiss" className="btn-ghost !p-1" onClick={() => setSuccess(null)}>
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {clusters.length === 0 && !success && (
        <Empty
          icon={<Lightbulb size={18} />}
          title="No gaps right now"
          body="When parents ask something the handbook doesn’t cover, it shows up here."
        />
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {clusters.map((c) => (
          <ClusterCard key={c.items.map((i) => i.id).join()} c={c} onDone={setSuccess} />
        ))}
      </div>
    </div>
  )
}

function ClusterCard({
  c,
  onDone,
}: {
  c: Cluster<LogEntry>
  onDone: (s: { title: string; fixed: LogEntry[]; missed: LogEntry[] }) => void
}) {
  const [open, setOpen] = useState(false)
  const sample = SAMPLES.find(([re]) =>
    re.test(
      c.terms.join(' ') +
        ' ' +
        c.items
          .map((i) => i.question)
          .join(' ')
          .toLowerCase(),
    ),
  )
  const [title, setTitle] = useState(
    sample?.[1] ??
      c.terms
        .slice(0, 2)
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(' '),
  )
  const [body, setBody] = useState('')
  const [keywords, setKeywords] = useState<string[]>(c.terms.slice(0, 4))
  const [kw, setKw] = useState('')
  const families = new Set(c.items.map((i) => i.who)).size

  const publish = () => {
    const ids = c.items.map((i) => i.id)
    const { fixed } = publishAnswer({ title, body, keywords }, ids)
    onDone({ title, fixed: c.items.filter((i) => fixed.includes(i.id)), missed: c.items.filter((i) => !fixed.includes(i.id)) })
  }

  return (
    <section className="card p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-1">
            {c.terms.slice(0, 4).map((t) => (
              <span key={t} className="rounded-full bg-honey-soft px-2 py-0.5 text-2xs font-semibold text-honey-text">
                {t}
              </span>
            ))}
          </div>
          <div className="mt-1.5 text-sm text-ink-muted">
            Asked {c.items.length}× by {families} {families === 1 ? 'family' : 'families'}
          </div>
        </div>
        {!open && (
          <button className="btn-primary shrink-0" onClick={() => setOpen(true)}>
            <Plus size={14} /> Answer once
          </button>
        )}
      </div>
      <ul className="mt-3 space-y-1.5">
        {c.items.map((l) => (
          <li key={l.id} className="flex items-start gap-2 text-sm">
            {l.feedback === 'down' ? (
              <ThumbsDown size={13} className="mt-1 shrink-0 text-rose-text" />
            ) : (
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-honey" />
            )}
            <span className="flex-1">“{l.question}”</span>
            <span className="shrink-0 text-2xs text-ink-subtle">
              {formatDay(l.at.date).split(', ')[0]} {formatTime(l.at.minutes)}
            </span>
          </li>
        ))}
      </ul>
      {open && (
        <div className="mt-4 animate-fade-in space-y-3 border-t border-line pt-4">
          <div>
            <label className="label" htmlFor={`t-${c.key}`}>
              Title
            </label>
            <input id={`t-${c.key}`} className="input mt-1" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <label className="label" htmlFor={`b-${c.key}`}>
                Answer
              </label>
              {sample && !body && (
                <button className="flex items-center gap-1 text-xs text-willow-text hover:underline" onClick={() => setBody(sample[2])}>
                  <Wand2 size={12} /> Fill sample answer
                </button>
              )}
            </div>
            <textarea
              id={`b-${c.key}`}
              rows={4}
              className="input mt-1 resize-y leading-relaxed"
              placeholder="Write it the way you'd text a parent. The desk will quote it exactly."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <div>
            <div className="label">Matches questions with</div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {keywords.map((k) => (
                <span
                  key={k}
                  className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 py-0.5 pl-2 pr-1 text-xs"
                >
                  {k}
                  <button
                    aria-label={`Remove ${k}`}
                    onClick={() => setKeywords(keywords.filter((x) => x !== k))}
                    className="rounded-full p-0.5 text-ink-subtle hover:bg-surface-3 hover:text-ink"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (kw.trim()) setKeywords([...keywords, kw.trim().toLowerCase()])
                  setKw('')
                }}
              >
                <input
                  value={kw}
                  onChange={(e) => setKw(e.target.value)}
                  placeholder="+ keyword"
                  className="w-24 rounded-full border border-dashed border-line-strong bg-transparent px-2 py-0.5 text-xs focus:outline-none"
                />
              </form>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className={cx('btn-primary')} disabled={!body.trim() || !title.trim() || !keywords.length} onClick={publish}>
              Publish & notify {families} {families === 1 ? 'family' : 'families'}
            </button>
            <button className="btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
