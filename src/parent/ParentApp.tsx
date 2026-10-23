import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUp,
  Bell,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  MapPin,
  Mic,
  ShieldCheck,
  Sparkles,
  Thermometer,
  ThumbsDown,
  ThumbsUp,
  UtensilsCrossed,
  Wallet,
  X,
} from 'lucide-react'
import { Mark } from '@/components/Mark'
import { cx, StatusPill } from '@/components/ui'
import { demoFamily, roomNames } from '@/data/seed'
import { dayStatus, isOfficeOpen, lunchPlan, nextSchoolDay } from '@/engine/policy'
import type { Answer, Citation } from '@/engine/types'
import { ALLERGENS_ES, fmt, ROW_QUESTION_ES, STARTER_ENGLISH, useT } from '@/lib/i18n'
import { addDays, formatTime } from '@/lib/time'
import { ask, dismissNotice, giveFeedback, setChild, setLang, useStore, type LogEntry, type Message } from '@/store/store'
import { AnswerCard } from './cards'

export function ParentApp() {
  const messages = useStore((s) => s.messages)
  const thinking = useStore((s) => s.thinking)
  const notices = useStore((s) => s.notices)
  const log = useStore((s) => s.log)
  const scroller = useRef<HTMLDivElement>(null)
  const { t } = useT()

  useEffect(() => {
    // Follow the conversation; an empty thread starts at the top (the greeting).
    // A new answer is shown from its first line, so a long one is read top-down.
    const el = scroller.current
    if (!el) return
    if (!messages.length) return el.scrollTo({ top: 0 })
    const last = messages[messages.length - 1]
    const node = el.querySelector<HTMLElement>('[data-bubble]:last-of-type')
    const top = last.role === 'parent' || thinking || !node ? el.scrollHeight : node.offsetTop - 12
    el.scrollTo({ top, behavior: 'smooth' })
  }, [messages.length, thinking])

  const byId = useMemo(() => new Map(log.map((l) => [l.id, l])), [log])
  const last = [...messages].reverse().find((m) => m.role === 'desk')
  const followUps = last?.logId ? byId.get(last.logId)?.answer.followUps : undefined

  return (
    <div className="flex h-full flex-col bg-bg">
      <Header />
      {notices[0] && (
        <button
          onClick={() => {
            dismissNotice(notices[0].id)
            scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })
          }}
          className="mx-3 mt-2 flex animate-rise-in items-center gap-2 rounded-xl bg-dusk px-3 py-2 text-left text-sm text-white shadow-lift dark:text-bg"
        >
          <Bell size={15} className="shrink-0" />
          <span className="flex-1">{notices[0].kind === 'reply' ? t.noticeReply : t.noticeAnswer}</span>
          <X size={14} className="opacity-70" />
        </button>
      )}
      <div ref={scroller} className="scrollbar-thin relative flex-1 overflow-y-auto px-3 pb-3 pt-2">
        {messages.length === 0 ? <Today /> : <div className="h-2" />}
        <div className="space-y-3">
          {messages.map((m) => (
            <div key={m.id} data-bubble>
              <Bubble m={m} entry={m.logId ? byId.get(m.logId) : undefined} />
            </div>
          ))}
          {thinking && <Thinking />}
        </div>
      </div>
      <Composer suggestions={messages.length === 0 ? undefined : followUps} />
    </div>
  )
}

function Header() {
  const k = useStore((s) => s.knowledge)
  const now = useStore((s) => s.now)
  const childId = useStore((s) => s.childId)
  const open = isOfficeOpen(k, now)
  const today = dayStatus(k, now.date)
  const { t, lang } = useT()
  return (
    <header className="border-b border-line bg-surface/80 px-3 pb-2.5 pt-3 backdrop-blur">
      <div className="flex items-center gap-2.5">
        <Mark size={34} />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="font-serif text-[17px] font-semibold tracking-tight">
            Willow <em className="font-normal text-wren">&amp;</em> Wren
          </div>
          <div className="flex items-center gap-1.5 text-xs text-ink-muted">
            <span className={cx('h-1.5 w-1.5 rounded-full', open ? 'bg-willow' : 'bg-ink-subtle')} />
            {open ? t.officeOpen(formatTime('close' in today ? today.close : k.center.close)) : t.officeClosed}
          </div>
        </div>
        <div role="radiogroup" aria-label="Language / Idioma" className="flex rounded-full border border-line p-0.5 text-2xs font-semibold">
          {(['en', 'es'] as const).map((l) => (
            <button
              key={l}
              role="radio"
              aria-checked={lang === l}
              onClick={() => setLang(l)}
              className={cx('rounded-full px-2 py-0.5 transition', lang === l ? 'bg-ink text-bg' : 'text-ink-muted hover:text-ink')}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2.5 flex gap-1.5" role="radiogroup" aria-label={t.whichChild}>
        {demoFamily.children.map((c) => (
          <button
            key={c.id}
            role="radio"
            aria-checked={childId === c.id}
            onClick={() => setChild(c.id)}
            className={cx(
              'flex items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-2.5 text-xs font-medium transition',
              childId === c.id ? 'border-willow bg-willow-soft text-willow-text' : 'border-line text-ink-muted hover:text-ink',
            )}
          >
            <span
              className={cx(
                'grid h-5 w-5 place-items-center rounded-full text-2xs font-semibold',
                c.id === 'maya' ? 'bg-wren-soft text-wren-text' : 'bg-honey-soft text-honey-text',
              )}
            >
              {c.name[0]}
            </span>
            {c.name} · {roomNames[c.room].split(' ')[0]}
          </button>
        ))}
      </div>
    </header>
  )
}

/** The answer to the question a parent hasn't asked yet: today, at a glance, for their child. */
function Today() {
  const k = useStore((s) => s.knowledge)
  const now = useStore((s) => s.now)
  const childId = useStore((s) => s.childId)
  const child = demoFamily.children.find((c) => c.id === childId)!
  const s = dayStatus(k, now.date)
  const { t, lang } = useT()
  const first = demoFamily.parentName.split(' ')[0]
  const greeting = t.greeting(now.minutes / 60)
  const allergen = (a: string) => (lang === 'es' ? (ALLERGENS_ES[a] ?? a) : a)
  const plan = lunchPlan(k, child, now.date, now)
  const upcoming = k.calendar.closures.filter((c) => c.date > now.date && c.date <= addDays(now.date, 10))
  const events = k.calendar.events.filter((e) => e.room === child.room && e.date >= now.date && e.date <= addDays(now.date, 7))
  const next = nextSchoolDay(k, now.date)

  // Each row asks its question in English: the engine's language, and no translator round-trip.
  const rows: { label: string; value: string; q: string; tone?: 'rose' | 'honey' }[] = []
  rows.push(
    s.state === 'open'
      ? { label: t.today, value: t.openUntil(formatTime(s.close)), q: 'What are your hours today?' }
      : s.state === 'early'
        ? { label: t.today, value: t.earlyClose(formatTime(s.close), s.name), q: 'What time do you close today?', tone: 'honey' }
        : {
            label: t.today,
            value: t.closedToday('name' in s ? s.name : '', next ? fmt.day(next, lang) : ''),
            q: 'Are you open today?',
            tone: 'rose',
          },
  )
  if (plan.menu && (s.state === 'open' || s.state === 'early'))
    rows.push({
      label: t.lunch,
      value:
        child.band === 'infant'
          ? t.eatsFromHome(child.name)
          : plan.servesAlternate
            ? t.allergyFree(plan.menu.alternate, plan.conflicts.map(allergen).join('/'), child.name)
            : plan.menu.lunch,
      q: "What's for lunch today?",
    })
  for (const c of upcoming.slice(0, 2))
    rows.push({
      label: fmt.short(c.date, lang),
      value: c.kind === 'closed' ? t.closedNamed(c.name) : t.closesAt(formatTime(c.closeAt!), c.name),
      q: `Are you open on ${fmt.day(c.date, 'en')}?`,
      tone: c.kind === 'closed' ? 'rose' : 'honey',
    })
  for (const e of events.slice(0, 1))
    rows.push({ label: fmt.short(e.date, lang), value: `${e.title}: ${e.note}`, q: `Are you open ${fmt.day(e.date, 'en')}?` })

  return (
    <div className="animate-fade-in pb-2 pt-3">
      <h1 className="font-serif text-[28px] font-semibold leading-tight tracking-tight">
        {greeting}, {first}.
      </h1>
      <p className="mt-0.5 text-[15px] text-ink-muted">{t.intro(child.name)}</p>

      <div className="card mt-4 divide-y divide-line overflow-hidden shadow-card">
        {rows.map((r, i) => (
          <button
            key={i}
            onClick={() => ask(lang === 'en' ? r.q : (ROW_QUESTION_ES[r.q] ?? `¿${r.label}: ${r.value}?`), r.q)}
            className="group flex w-full items-center gap-3 px-3.5 py-3 text-left transition hover:bg-surface-2"
          >
            <span
              className={cx('h-2 w-2 shrink-0 rounded-full', r.tone === 'rose' ? 'bg-rose' : r.tone === 'honey' ? 'bg-honey' : 'bg-willow')}
              aria-hidden
            />
            <span className="w-14 shrink-0 text-2xs font-semibold uppercase tracking-wider text-ink-subtle">{r.label}</span>
            <span
              className={cx('flex-1 text-sm leading-snug', r.tone === 'rose' && 'text-rose-text', r.tone === 'honey' && 'text-honey-text')}
            >
              {r.value}
            </span>
            <ChevronRight size={15} className="shrink-0 text-ink-subtle transition group-hover:translate-x-0.5" aria-hidden />
          </button>
        ))}
      </div>

      <h2 className="mt-6 font-serif text-lg font-semibold">{t.askAnything}</h2>
      <p className="text-xs text-ink-muted">{t.askHint}</p>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        {t.starters.map((q, i) => {
          const Icon = STARTER_ICONS[i % STARTER_ICONS.length]
          return (
            <button
              key={q}
              onClick={() => ask(q, STARTER_ENGLISH[q])}
              className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-3 text-left text-[13px] leading-snug shadow-card transition hover:-translate-y-px hover:border-willow/40 hover:shadow-lift"
            >
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-willow-soft text-willow-text">
                <Icon size={15} />
              </span>
              {q}
            </button>
          )
        })}
      </div>

      <p className="mt-5 flex items-start gap-2 px-1 text-xs leading-relaxed text-ink-subtle">
        <ShieldCheck size={14} className="mt-px shrink-0 text-willow" aria-hidden />
        {t.trust}
      </p>
    </div>
  )
}

const STARTER_ICONS = [CalendarDays, UtensilsCrossed, Thermometer, Wallet, MapPin, Sparkles]

function Bubble({ m, entry }: { m: Message; entry?: LogEntry }) {
  const { t } = useT()
  const [orig, setOrig] = useState(false)
  if (m.role === 'parent')
    return (
      <div className="flex animate-rise-in justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-willow px-3.5 py-2 text-[15px] text-white dark:text-bg">{m.text}</div>
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
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-dusk-soft font-serif text-2xs font-semibold text-dusk-text">
          ER
        </div>
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

function DeskAnswer({ entry }: { entry: LogEntry }) {
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

function SourceChip({ s }: { s: Citation }) {
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

function Why({ a }: { a: Answer }) {
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

function Thinking() {
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

type SpeechCtor = new () => {
  lang: string
  interimResults: boolean
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void
  onend: () => void
  start: () => void
  stop: () => void
}

function Composer({ suggestions }: { suggestions?: string[] }) {
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const thinking = useStore((s) => s.thinking)
  const { t, lang } = useT()
  const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor }
  const Speech = w.SpeechRecognition ?? w.webkitSpeechRecognition

  const submit = (q: string) => {
    if (!q.trim()) return
    ask(q, STARTER_ENGLISH[q])
    setText('')
  }

  const listen = () => {
    if (!Speech) return
    const r = new Speech()
    r.lang = lang === 'es' ? 'es-US' : 'en-US'
    r.interimResults = true
    r.onresult = (e) =>
      setText(
        Array.from(e.results)
          .map((x) => x[0].transcript)
          .join(''),
      )
    r.onend = () => setListening(false)
    setListening(true)
    r.start()
  }

  return (
    <div className="border-t border-line bg-surface/90 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
      {suggestions && suggestions.length > 0 && (
        <div className="no-scrollbar -mx-3 mb-2 flex gap-1.5 overflow-x-auto px-3">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => submit(s)}
              disabled={thinking}
              className="shrink-0 rounded-full border border-line bg-surface px-3 py-1 text-xs text-ink-muted transition hover:border-willow hover:text-willow-text"
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit(text)
        }}
        className="flex items-end gap-1.5 rounded-2xl border border-line bg-surface p-1.5 focus-within:border-willow focus-within:ring-2 focus-within:ring-willow/15"
      >
        <label htmlFor="ask" className="sr-only">
          {t.ask}
        </label>
        <input
          id="ask"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={listening ? t.listening : t.ask}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-base placeholder:text-ink-subtle focus:outline-none"
        />
        {Speech && (
          <button
            type="button"
            onClick={listen}
            aria-label={t.askVoice}
            className={cx(
              'grid h-8 w-8 place-items-center rounded-full transition',
              listening ? 'animate-pulse bg-rose-soft text-rose-text' : 'text-ink-muted hover:bg-surface-2',
            )}
          >
            <Mic size={17} />
          </button>
        )}
        <button
          type="submit"
          aria-label={t.send}
          disabled={!text.trim() || thinking}
          className="grid h-8 w-8 place-items-center rounded-full bg-willow text-white transition disabled:opacity-30 dark:text-bg"
        >
          <ArrowUp size={17} strokeWidth={2.4} />
        </button>
      </form>
    </div>
  )
}
