import { useEffect, useState } from 'react'
import { CalendarCheck, CheckCheck, Flag, Inbox as InboxIcon, Send, ShieldAlert, Stethoscope, UtensilsCrossed } from 'lucide-react'
import { cx, Empty, LangBadge } from '@/components/ui'
import { languageName } from '@/lib/lang'
import { formatDay, formatTime } from '@/lib/time'
import { resolveInbox, useStore, type InboxItem, type InboxKind } from '@/store/store'

const KIND: Record<InboxKind, { label: string; Icon: typeof Flag; cls: string }> = {
  handoff: { label: 'Needs a person', Icon: ShieldAlert, cls: 'bg-dusk-soft text-dusk-text' },
  review: { label: 'Approve draft', Icon: CheckCheck, cls: 'bg-dusk-soft text-dusk-text' },
  flag: { label: 'Flagged', Icon: Flag, cls: 'bg-honey-soft text-honey-text' },
  lunch: { label: 'Lunch request', Icon: UtensilsCrossed, cls: 'bg-wren-soft text-wren-text' },
  tour: { label: 'Tour booked', Icon: CalendarCheck, cls: 'bg-willow-soft text-willow-text' },
  absence: { label: 'Absence', Icon: Stethoscope, cls: 'bg-wren-soft text-wren-text' },
}

export function Inbox() {
  const inbox = useStore((s) => s.inbox)
  const [sel, setSel] = useState<string | null>(null)
  const open = inbox.filter((i) => i.status === 'open')
  const done = inbox.filter((i) => i.status === 'done')
  const current = inbox.find((i) => i.id === sel) ?? open[0]

  if (!inbox.length)
    return (
      <Empty icon={<InboxIcon size={18} />} title="Inbox zero" body="Escalations, drafts to approve and parent requests will land here." />
    )

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_1fr]">
      <ul className="card divide-y divide-line self-start overflow-hidden">
        {[...open, ...done].map((i) => {
          const k = KIND[i.kind]
          return (
            <li key={i.id}>
              <button
                onClick={() => setSel(i.id)}
                className={cx(
                  'flex w-full gap-3 px-3.5 py-3 text-left transition',
                  current?.id === i.id ? 'bg-surface-2' : 'hover:bg-surface-2/60',
                  i.status === 'done' && 'opacity-55',
                )}
              >
                <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-full', k.cls)}>
                  <k.Icon size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="truncate text-sm font-medium">{i.title}</span>
                    {i.live && i.status === 'open' && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-willow" aria-label="new" />}
                    <span className="ml-auto shrink-0 text-2xs text-ink-subtle">
                      {i.status === 'done' ? 'Done' : formatDay(i.at.date).split(', ')[0]}
                    </span>
                  </span>
                  <span className="block truncate text-xs text-ink-muted">
                    {i.who} · {i.detail}
                    <LangBadge lang={i.lang} original={i.original} />
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {current && <Detail key={current.id} item={current} />}
    </div>
  )
}

function Detail({ item }: { item: InboxItem }) {
  const k = KIND[item.kind]
  const [draft, setDraft] = useState(item.draft ?? '')
  useEffect(() => setDraft(item.draft ?? ''), [item.draft])
  const canReply = item.kind === 'handoff' || item.kind === 'review' || item.kind === 'flag'
  return (
    <div className="card self-start p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-semibold', k.cls)}>
          <k.Icon size={12} /> {k.label}
        </span>
        <span className="text-xs text-ink-subtle">
          {item.who} · {formatDay(item.at.date)}, {formatTime(item.at.minutes)}
        </span>
      </div>
      <h3 className="mt-2 font-serif text-xl font-semibold">{item.title}</h3>
      {item.original ? (
        <div className="mt-2 space-y-1.5">
          <blockquote className="rounded-xl bg-surface-2 px-3.5 py-2.5 text-[15px]">
            <div className="label mb-0.5">Parent wrote · {languageName(item.lang ?? '')}</div>“{item.original}”
          </blockquote>
          <blockquote className="rounded-xl border border-dashed border-line-strong px-3.5 py-2.5 text-sm text-ink-muted">
            <div className="label mb-0.5">English translation</div>“{item.detail}”
          </blockquote>
        </div>
      ) : (
        <blockquote className="mt-2 rounded-xl bg-surface-2 px-3.5 py-2.5 text-[15px]">“{item.detail}”</blockquote>
      )}

      {canReply && item.status === 'open' && (
        <div className="mt-4">
          <label htmlFor="draft" className="label">
            {item.kind === 'review'
              ? 'Drafted from your handbook · edit or approve'
              : 'Your reply · AI drafted it from the policy, you decide'}
          </label>
          <textarea
            id="draft"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={6}
            className="input mt-1.5 resize-y leading-relaxed"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button className="btn-primary" disabled={!draft.trim()} onClick={() => resolveInbox(item.id, draft)}>
              <Send size={14} /> {item.kind === 'review' ? 'Approve & send' : 'Send reply'}
            </button>
            <button className="btn-ghost" onClick={() => resolveInbox(item.id)}>
              Handled elsewhere
            </button>
            {item.lang && item.lang !== 'en' && item.live && (
              <span className="text-xs text-dusk-text">
                Write in English; it’s translated to {languageName(item.lang)} and fact-checked before sending.
              </span>
            )}
            {!item.live && (
              <span className="text-xs text-ink-subtle">Demo note: only questions you ask in the phone get the reply in-thread.</span>
            )}
          </div>
        </div>
      )}
      {!canReply && item.status === 'open' && (
        <div className="mt-4 flex items-center gap-2">
          <button className="btn-primary" onClick={() => resolveInbox(item.id)}>
            <CheckCheck size={14} /> Mark done
          </button>
          <span className="text-xs text-ink-subtle">Already confirmed to the parent automatically.</span>
        </div>
      )}
      {item.status === 'done' && <p className="mt-4 text-sm text-willow-text">✓ Resolved</p>}
    </div>
  )
}
