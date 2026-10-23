import { useState } from 'react'
import { BookOpen, ChevronDown, Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react'
import { Mark } from '@/components/Mark'
import { cx } from '@/lib/cx'
import { StatusPill, StaffAvatar } from '@/components/ui'
import type { Answer, Citation } from '@/engine/types'
import { fmt, useT } from '@/lib/i18n'
import { giveFeedback, useStore, type LogEntry, type Message } from '@/store/store'
import { AnswerCard } from './cards'

/** Conversation rendering. A desk answer = status + text + interactive card + sources + "why this answer" trace. */
export function Bubble({ m, entry }: { m: Message; entry?: LogEntry }) {
  const { t } = useT()
  const [orig, setOrig] = useState(false)
  if (m.role === 'parent')
    return (
      <div className="flex animate-rise-in justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-willow px-3.5 py-2 text-[15px] text-white dark:text-bg">{m.text}</div>
      </div>
    )
  if (m.role === 'system' && m.note === 'sentToStaff')
    return (
      <div className="flex animate-fade-in justify-end pr-1 text-2xs text-ink-subtle">
        <span className="inline-flex items-center gap-1">
          <StaffAvatar size="sm" className="!h-4 !w-4 !text-[8px]" /> {t.sentToStaff}
        </span>
      </div>
    )
  if (m.role === 'system' && m.note)
    return (
      <div className="flex animate-rise-in justify-center">
        <div className="max-w-[90%] rounded-2xl bg-surface-2 px-3 py-1.5 text-center text-xs text-ink-muted">
          {m.note === 'resolved' ? t.resolvedNote : t.leftThread}
        </div>
      </div>
    )
  if (m.role === 'system')
    return (
      <div className="flex animate-rise-in justify-center">
        <div className="max-w-[90%] rounded-full bg-willow-soft px-3 py-1 text-center text-xs font-medium text-willow-text">✓ {m.text}</div>
      </div>
    )
  if (m.role === 'staff')
    return (
      <div className="flex animate-rise-in gap-2">
        <StaffAvatar />
        <div className="max-w-[85%]">
          <div className="mb-0.5 text-2xs font-semibold text-dusk-text">Ms. Rivera · {t.director}</div>
          <div className="whitespace-pre-line rounded-2xl rounded-tl-md border border-dusk/20 bg-dusk-soft px-3.5 py-2 text-[15px]">
            {m.text}
          </div>
          {m.original && (
            <div className="mt-1 pl-1 text-2xs text-ink-subtle">
              {t.translatedFrom} ·{' '}
              <button className="underline-offset-2 hover:underline" onClick={() => setOrig(!orig)}>
                {orig ? t.hideOriginal : t.showOriginal}
              </button>
              {orig && <p className="mt-1 whitespace-pre-line text-xs text-ink-muted">{m.original}</p>}
            </div>
          )}
        </div>
      </div>
    )
  if (!entry) return null
  return <DeskAnswer entry={entry} />
}

export function DeskAnswer({ entry }: { entry: LogEntry }) {
  const k = useStore((s) => s.knowledge)
  const now = useStore((s) => s.now)
  const a = entry.answer
  const [why, setWhy] = useState(false)
  const { t } = useT()
  return (
    <div className="flex animate-rise-in gap-2">
      <div className="mt-0.5 shrink-0">
        <Mark size={26} />
      </div>
      <div className="min-w-0 max-w-[92%] flex-1">
        <div className={cx('card overflow-hidden shadow-card', a.status === 'urgent' && 'border-rose/40')}>
          <div className="px-3.5 pb-2.5 pt-3">
            <StatusPill status={a.status} label={t.status[a.status]} />
            <p className="mt-1.5 whitespace-pre-line text-[15px] leading-relaxed">{a.text}</p>
          </div>
          {a.card && (
            <div className="border-t border-line bg-surface-2/60 px-3.5 py-3">
              <AnswerCard card={a.card} k={k} now={now} logId={entry.id} />
            </div>
          )}
          {a.sources.length > 0 && (
            <div className="space-y-1 border-t border-line px-3.5 py-2">
              {a.sources.map((s) => (
                <SourceChip key={s.id} s={s} />
              ))}
            </div>
          )}
        </div>
        <div className="mt-1 flex items-center gap-0.5 pl-1">
          <button onClick={() => setWhy(!why)} className="btn-ghost !gap-1 !px-2 !py-1 text-xs" aria-expanded={why}>
            <Sparkles size={13} /> {t.why}
            <ChevronDown size={13} className={cx('transition', why && 'rotate-180')} />
          </button>
          <span className="flex-1" />
          {entry.feedback ? (
            <span className="px-2 text-xs text-ink-subtle">{entry.feedback === 'up' ? t.thanks : t.thanksDown}</span>
          ) : (
            <>
              <button aria-label={t.helpful} onClick={() => giveFeedback(entry.id, 'up')} className="btn-ghost !p-1.5">
                <ThumbsUp size={14} />
              </button>
              <button aria-label={t.notHelpful} onClick={() => giveFeedback(entry.id, 'down')} className="btn-ghost !p-1.5">
                <ThumbsDown size={14} />
              </button>
            </>
          )}
        </div>
        {why && <Why a={a} />}
      </div>
    </div>
  )
}

export function SourceChip({ s }: { s: Citation }) {
  const [open, setOpen] = useState(false)
  const operator = s.id.startsWith('faq.')
  const { t, lang } = useT()
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 text-left text-xs text-ink-muted hover:text-ink"
      >
        <BookOpen size={13} className="shrink-0 text-wren" />
        <span className="truncate">
          <span className="font-medium text-ink">{s.title}</span> · {operator ? t.answered : t.updated}{' '}
          {fmt.day(s.updatedAt, lang).split(', ')[1]} {t.by} {s.updatedBy}
        </span>
        <ChevronDown size={13} className={cx('ml-auto shrink-0 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <blockquote className="mt-1.5 animate-fade-in border-l-2 border-wren/40 pl-2.5 text-xs leading-relaxed text-ink-muted">
          {s.excerpt}
        </blockquote>
      )}
    </div>
  )
}

export function Why({ a }: { a: Answer }) {
  const t = a.trace
  return (
    <div className="mt-1 animate-fade-in rounded-xl border border-dashed border-line-strong bg-surface-2 p-3 text-xs text-ink-muted">
      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <span className="text-ink-subtle">Understood by</span>
        <span>{t.classifier === 'rules' ? 'Rules (deterministic)' : 'LLM classifier, then rules'}</span>
        <span className="text-ink-subtle">Facts from</span>
        <span>{a.sources.length ? a.sources.map((s) => s.title).join(', ') : 'Safety script'}</span>
        <span className="text-ink-subtle">Written by</span>
        <span>{t.writer === 'llm' ? 'LLM, verified by grounding guard' : 'Template (exact policy wording)'}</span>
        <span className="text-ink-subtle">Autonomy</span>
        <span>{t.autonomy === 'locked' ? 'Locked guardrail' : t.autonomy}</span>
        {t.guard && (
          <>
            <span className="text-ink-subtle">Guard</span>
            <span className={t.guard.passed ? 'text-willow-text' : 'text-rose-text'}>
              {t.guard.passed
                ? `Passed · ${t.guard.checked.length} claims checked both ways`
                : `Blocked: ${[...t.guard.unsupported.map((x) => `added ${x}`), ...(t.guard.missing ?? []).map((x) => `dropped ${x}`)].join(', ')}`}
            </span>
          </>
        )}
      </div>
      <ol className="mt-2 list-decimal space-y-0.5 border-t border-line pl-4 pt-2">
        {t.steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
    </div>
  )
}

export function Thinking() {
  const { t } = useT()
  return (
    <div className="flex items-center gap-2 pl-0.5">
      <Mark size={26} />
      <div className="flex items-center gap-1 rounded-full bg-surface-2 px-3 py-2" aria-label={t.checking}>
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-1.5 w-1.5 animate-dot rounded-full bg-ink-subtle" style={{ animationDelay: `${i * 160}ms` }} />
        ))}
        <span className="ml-1.5 text-xs text-ink-subtle">{t.checking}</span>
      </div>
    </div>
  )
}
