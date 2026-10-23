import { useState } from 'react'
import {
  CalendarCheck,
  CheckCheck,
  ChevronLeft,
  Flag,
  Inbox as InboxIcon,
  Send,
  ShieldAlert,
  Stethoscope,
  UtensilsCrossed,
} from 'lucide-react'
import { cx } from '@/lib/cx'
import { Empty, LangBadge, StaffAvatar } from '@/components/ui'
import { languageName } from '@/lib/lang'
import { formatDay, formatTime } from '@/lib/time'
import { replyToParent, resolveItem, useStore, type InboxItem, type InboxKind, type InboxStatus } from '@/store/store'

const KIND: Record<InboxKind, { label: string; Icon: typeof Flag; cls: string }> = {
  handoff: { label: 'Needs a person', Icon: ShieldAlert, cls: 'bg-dusk-soft text-dusk-text' },
  review: { label: 'Approve draft', Icon: CheckCheck, cls: 'bg-dusk-soft text-dusk-text' },
  flag: { label: 'Flagged', Icon: Flag, cls: 'bg-honey-soft text-honey-text' },
  lunch: { label: 'Lunch request', Icon: UtensilsCrossed, cls: 'bg-wren-soft text-wren-text' },
  tour: { label: 'Tour booked', Icon: CalendarCheck, cls: 'bg-willow-soft text-willow-text' },
  absence: { label: 'Absence', Icon: Stethoscope, cls: 'bg-wren-soft text-wren-text' },
}

const STATUS_LABEL: Record<InboxStatus, string> = { open: 'Needs reply', replied: 'Waiting on parent', done: 'Resolved' }
const ORDER: InboxStatus[] = ['open', 'replied', 'done']

/** Conversations are things staff can reply to; requests (lunch, tours, absences) are just acknowledged. */
const isConversation = (i: InboxItem) => i.kind === 'handoff' || i.kind === 'review' || i.kind === 'flag'

export function Inbox() {
  const inbox = useStore((s) => s.inbox)
  const [sel, setSel] = useState<string | null>(null)
  const sorted = ORDER.flatMap((st) => inbox.filter((i) => i.status === st))
  const current = inbox.find((i) => i.id === sel) ?? sorted[0]

  if (!inbox.length)
    return (
      <Empty icon={<InboxIcon size={18} />} title="Inbox zero" body="Escalations, drafts to approve and parent requests will land here." />
    )

  return (
    // Phones: list, then tap into one item (with a way back). Desktop: list and detail side by side.
    <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_1fr]">
      <div className={cx('space-y-4 self-start', sel && 'hidden lg:block')}>
        {ORDER.map((st) => {
          const items = sorted.filter((i) => i.status === st)
          if (!items.length) return null
          return (
            <section key={st}>
              <h3 className="label mb-1.5 px-1">
                {STATUS_LABEL[st]} · {items.length}
              </h3>
              <ul className="card divide-y divide-line overflow-hidden">
                {items.map((i) => (
                  <ListItem key={i.id} item={i} selected={current?.id === i.id} onSelect={() => setSel(i.id)} />
                ))}
              </ul>
            </section>
          )
        })}
      </div>
      {current && (
        <div className={cx('min-w-0', !sel && 'hidden lg:block')}>
          <button className="btn-ghost mb-2 !px-2 lg:hidden" onClick={() => setSel(null)}>
            <ChevronLeft size={16} /> All messages
          </button>
          <Detail key={current.id} item={current} />
        </div>
      )}
    </div>
  )
}

function ListItem({ item: i, selected, onSelect }: { item: InboxItem; selected: boolean; onSelect: () => void }) {
  const k = KIND[i.kind]
  const last = i.thread[i.thread.length - 1]
  return (
    <li>
      <button
        onClick={onSelect}
        className={cx(
          'flex w-full gap-3 px-3.5 py-3 text-left transition',
          selected ? 'bg-surface-2' : 'hover:bg-surface-2/60',
          i.status === 'done' && 'opacity-55',
        )}
      >
        <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-full', k.cls)}>
          <k.Icon size={15} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className={cx('truncate text-sm', i.status === 'open' ? 'font-semibold' : 'font-medium')}>{i.title}</span>
            {i.live && i.status === 'open' && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-willow" aria-label="new" />}
            <span className="ml-auto shrink-0 text-2xs text-ink-subtle">{formatDay(i.at.date).split(', ')[0]}</span>
          </span>
          <span className="block truncate text-xs text-ink-muted">
            {last?.role === 'staff' ? 'You: ' : `${i.who} · `}
            {last?.text ?? i.detail}
            <LangBadge lang={i.lang} original={i.original} />
          </span>
        </span>
      </button>
    </li>
  )
}

function Detail({ item }: { item: InboxItem }) {
  const k = KIND[item.kind]
  const hasStaffReply = item.thread.some((m) => m.role === 'staff')
  // The AI draft only makes sense as a first reply; after that, staff write their own.
  const [draft, setDraft] = useState(hasStaffReply ? '' : (item.draft ?? ''))
  const conversation = isConversation(item)

  return (
    <div className="card self-start p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-semibold', k.cls)}>
          <k.Icon size={12} /> {k.label}
        </span>
        <span
          className={cx(
            'rounded-full px-2 py-0.5 text-2xs font-semibold',
            item.status === 'open'
              ? 'bg-honey-soft text-honey-text'
              : item.status === 'replied'
                ? 'bg-surface-3 text-ink-muted'
                : 'bg-willow-soft text-willow-text',
          )}
        >
          {STATUS_LABEL[item.status]}
        </span>
        <span className="text-xs text-ink-subtle">
          {item.who} · {formatDay(item.at.date)}, {formatTime(item.at.minutes)}
        </span>
      </div>
      <h3 className="mt-2 font-serif text-xl font-semibold">{item.title}</h3>

      {item.thread.length ? (
        <Thread item={item} />
      ) : (
        <blockquote className="mt-2 rounded-xl bg-surface-2 px-3.5 py-2.5 text-[15px]">“{item.detail}”</blockquote>
      )}

      {conversation && item.status !== 'done' && (
        <div className="mt-4 border-t border-line pt-4">
          <label htmlFor="draft" className="label">
            {hasStaffReply
              ? 'Reply'
              : item.kind === 'review'
                ? 'Drafted from your handbook · edit or approve'
                : 'Your reply · AI drafted it from the policy, you decide'}
          </label>
          <textarea
            id="draft"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={hasStaffReply ? 3 : 6}
            placeholder={`Write to ${item.who.split(' ')[0]}…`}
            className="input mt-1.5 resize-y leading-relaxed"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              className="btn-primary"
              disabled={!draft.trim()}
              onClick={() => {
                void replyToParent(item.id, draft)
                setDraft('')
              }}
            >
              <Send size={14} /> {item.kind === 'review' && !hasStaffReply ? 'Approve & send' : 'Send reply'}
            </button>
            <button className="btn-quiet" onClick={() => resolveItem(item.id)}>
              <CheckCheck size={14} /> Mark resolved
            </button>
          </div>
          <p className="mt-2 text-xs text-ink-subtle">
            Replying keeps the conversation open, so the parent can answer you directly. Mark it resolved when it’s settled.
            {item.lang &&
              item.lang !== 'en' &&
              item.live &&
              ` Write in English; it’s translated to ${languageName(item.lang)} and fact-checked.`}
            {!item.live && ' Demo note: only questions you ask in the phone get replies in-thread.'}
          </p>
        </div>
      )}
      {!conversation && item.status !== 'done' && (
        <div className="mt-4 flex items-center gap-2">
          <button className="btn-primary" onClick={() => resolveItem(item.id)}>
            <CheckCheck size={14} /> Mark done
          </button>
          <span className="text-xs text-ink-subtle">Already confirmed to the parent automatically.</span>
        </div>
      )}
      {item.status === 'done' && <p className="mt-4 text-sm text-willow-text">✓ Resolved</p>}
    </div>
  )
}

/** The conversation, oldest first. Parent messages in their own words when translated, with the English beneath. */
function Thread({ item }: { item: InboxItem }) {
  return (
    <ol className="mt-3 space-y-2.5">
      {item.thread.map((m) =>
        m.role === 'parent' ? (
          <li key={m.id} className="max-w-[90%]">
            <div className="mb-0.5 text-2xs text-ink-subtle">
              {item.who} · {formatTime(m.at.minutes)}
            </div>
            <div className="rounded-2xl rounded-tl-md bg-surface-2 px-3.5 py-2.5 text-[15px]">
              {m.original ?? m.text}
              {m.original && (
                <div className="mt-1.5 border-t border-dashed border-line-strong pt-1.5 text-xs text-ink-muted">
                  <span className="font-semibold">English ({languageName(item.lang ?? '')}):</span> {m.text}
                </div>
              )}
            </div>
          </li>
        ) : (
          <li key={m.id} className="ml-auto flex max-w-[90%] flex-row-reverse items-end gap-2">
            <StaffAvatar size="sm" />
            <div>
              <div className="mb-0.5 text-right text-2xs text-ink-subtle">You · {formatTime(m.at.minutes)}</div>
              <div className="whitespace-pre-line rounded-2xl rounded-br-md border border-dusk/20 bg-dusk-soft px-3.5 py-2.5 text-[15px]">
                {m.text}
              </div>
            </div>
          </li>
        ),
      )}
    </ol>
  )
}
