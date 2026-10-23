import { useMemo, useRef, useState, useEffect } from 'react'
import { Bookmark, ChevronLeft, MessageCircle, Search, SquarePen, X } from 'lucide-react'
import { StaffAvatar } from '@/components/ui'
import { demoFamily } from '@/data/seed'
import { cx } from '@/lib/cx'
import { fmt, LOCALES, useT } from '@/lib/i18n'
import { formatTime } from '@/lib/time'
import { applyFilter, search, summarize, type ConversationSummary, type HistoryFilter } from '@/store/history'
import { useStore } from '@/store/store'

const monthKey = (iso: string) => iso.slice(0, 7)

/**
 * Every conversation this school year: grouped by month, searchable by keyword or date
 * (in any language the parent reads), filterable by child, staff involvement or saved
 * answers. Opening a search result jumps to the matching message.
 */
export function History({
  onOpen,
  onClose,
  onNew,
}: {
  onOpen: (id: string, messageId?: string) => void
  onClose: () => void
  onNew: () => void
}) {
  const conversations = useStore((s) => s.conversations)
  const inbox = useStore((s) => s.inbox)
  const { t, lang, locale } = useT()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<HistoryFilter>('all')
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    input.current?.focus({ preventScroll: true })
  }, [])

  const monthName = useMemo(() => {
    const f = (tag: string) => new Intl.DateTimeFormat(tag, { month: 'long', year: 'numeric', timeZone: 'UTC' })
    return { local: f(locale.speech), en: f('en-US') }
  }, [locale.speech])

  const all = useMemo(() => summarize(conversations, inbox), [conversations, inbox])
  const shown = useMemo(() => {
    // Dates are searchable in words: "october", "oct 14", "miércoles", in English and the parent's language.
    const dateWords = (c: ConversationSummary) => {
      const d = new Date(c.startedAt.date + 'T00:00:00Z')
      return [
        fmt.dayLong(c.startedAt.date, lang),
        fmt.dayLong(c.startedAt.date, 'en'),
        fmt.day(c.startedAt.date, 'en'),
        monthName.local.format(d),
        monthName.en.format(d),
      ].join(' ')
    }
    return search(applyFilter(all, filter), conversations, query, dateWords)
  }, [all, filter, query, conversations, lang, monthName])

  const groups = useMemo(() => {
    const m = new Map<string, ConversationSummary[]>()
    for (const c of shown) m.set(monthKey(c.lastAt.date), [...(m.get(monthKey(c.lastAt.date)) ?? []), c])
    return [...m.entries()]
  }, [shown])

  const filters: { id: HistoryFilter; label: string }[] = [
    { id: 'all', label: t.filterAll },
    { id: 'withStaff', label: t.filterStaff },
    { id: 'saved', label: t.filterSaved },
    ...demoFamily.children.map((c) => ({ id: `child:${c.id}` as HistoryFilter, label: c.name })),
  ]

  return (
    <div className="flex min-h-0 flex-1 animate-fade-in flex-col bg-bg">
      <div className="space-y-2.5 border-b border-line bg-surface/60 px-3 pb-3 pt-2.5">
        <div className="flex items-center gap-1">
          <button onClick={onClose} className="btn-ghost !gap-0.5 !px-1.5 !py-1 text-sm" aria-label={t.back}>
            <ChevronLeft size={18} /> {t.back}
          </button>
          <h2 className="flex-1 text-center font-serif text-[17px] font-semibold">{t.historyTitle}</h2>
          <button onClick={onNew} className="btn-ghost !p-1.5" aria-label={t.newConversation} title={t.newConversation}>
            <SquarePen size={18} />
          </button>
        </div>
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
          <input
            ref={input}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchHistory}
            aria-label={t.searchHistory}
            className="input !rounded-full !py-2 pl-9 pr-9 !text-base sm:!text-sm"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label={t.clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-subtle hover:bg-surface-3"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3" role="radiogroup" aria-label="Filter">
          {filters.map((f) => (
            <button
              key={f.id}
              role="radio"
              aria-checked={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cx(
                'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition',
                filter === f.id
                  ? 'border-willow bg-willow text-white dark:text-bg'
                  : 'border-line bg-surface text-ink-muted hover:text-ink',
              )}
            >
              {f.id === 'saved' && <Bookmark size={11} className="-mt-px mr-1 inline" />}
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-3 pb-6">
        {(query || filter !== 'all') && shown.length > 0 && <p className="px-1 pt-3 text-xs text-ink-subtle">{t.results(shown.length)}</p>}
        {groups.map(([month, items]) => (
          <section key={month}>
            <h3 className="label sticky top-0 z-[1] -mx-3 bg-bg/95 px-4 pb-1.5 pt-4 backdrop-blur">
              {monthName.local.format(new Date(month + '-01T00:00:00Z'))}
            </h3>
            <ul className="card divide-y divide-line overflow-hidden">
              {items.map((c) => (
                <Row key={c.id} c={c} onOpen={onOpen} />
              ))}
            </ul>
          </section>
        ))}
        {shown.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-surface-3 text-ink-muted">
              <MessageCircle size={18} />
            </span>
            <p className="text-sm text-ink-muted">
              {query ? t.noResults(query) : all.length ? t.noResults(filters.find((f) => f.id === filter)!.label) : t.noHistory}
            </p>
            {query && (
              <button className="btn-quiet mt-1" onClick={() => setQuery('')}>
                {t.clearSearch}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/** One conversation in the list: date tile, title, matched snippet or preview, and status chips. */
function Row({ c, onOpen }: { c: ConversationSummary; onOpen: (id: string, messageId?: string) => void }) {
  const { t, lang } = useT()
  const child = demoFamily.children.find((k) => k.id === c.childId)
  const tone =
    c.status === 'withStaff'
      ? 'bg-dusk-soft text-dusk-text'
      : c.status === 'resolved'
        ? 'bg-willow-soft text-willow-text'
        : 'bg-surface-3 text-ink-muted'
  return (
    <li>
      <button
        onClick={() => onOpen(c.id, c.match?.messageId ?? c.saved[0]?.id)}
        className="flex w-full gap-3 px-3 py-3 text-left transition hover:bg-surface-2"
      >
        <span className="flex w-11 shrink-0 flex-col items-center rounded-lg bg-surface-2 py-1.5 leading-none">
          <span className="text-2xs font-semibold text-ink-subtle">{fmt.month(c.lastAt.date, lang)}</span>
          <span className="mt-0.5 font-serif text-lg font-semibold">{+c.lastAt.date.slice(8, 10)}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-start gap-2">
            <span className="line-clamp-2 flex-1 text-sm font-medium leading-snug">{c.title}</span>
            <span className="shrink-0 pt-px text-2xs tabular text-ink-subtle">{formatTime(c.lastAt.minutes)}</span>
          </span>
          <span className="mt-0.5 block text-xs leading-snug text-ink-muted">
            {c.match ? (
              <>
                {c.match.before}
                <mark className="rounded-sm bg-honey-soft text-honey-text">{c.match.hit}</mark>
                {c.match.after}
              </>
            ) : (
              <span className="line-clamp-2">{c.preview}</span>
            )}
          </span>
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className={cx('inline-flex items-center gap-1 rounded-full px-1.5 py-px text-2xs font-semibold', tone)}>
              {c.withStaff && <StaffAvatar size="sm" className="!h-3.5 !w-3.5 !text-[7px]" />}
              {t.convStatus[c.status]}
            </span>
            {child && <span className="rounded-full bg-surface-3 px-1.5 py-px text-2xs font-medium text-ink-muted">{child.name}</span>}
            {c.saved.length > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-wren-soft px-1.5 py-px text-2xs font-semibold text-wren-text">
                <Bookmark size={10} /> {LOCALES[lang].t.savedLabel}
              </span>
            )}
          </span>
        </span>
      </button>
    </li>
  )
}
