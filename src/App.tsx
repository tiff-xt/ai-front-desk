import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, ChevronDown, Clock, Compass, Moon, RotateCcw, Sun, Trash2, X } from 'lucide-react'
import { Mark } from '@/components/Mark'
import { cx, Segmented } from '@/components/ui'
import { DEMO_NOW } from '@/engine/defaults'
import { llmEnabled } from '@/engine/llm'
import { formatClock, type Clock as ClockT } from '@/lib/time'
import { Operator } from '@/operator/Operator'
import { ParentApp } from '@/parent/ParentApp'
import { ask, clearThread, resetDemo, setNow, setOpTab, useStore, type State } from '@/store/store'

type View = 'both' | 'parent' | 'operator'

const WIDE = '(min-width: 1100px)'

const SCENARIOS: { label: string; hint: string; now: ClockT }[] = [
  { label: 'Mon 7:42am', hint: 'Morning drop-off, holiday this week', now: DEMO_NOW },
  { label: 'Mon 10:15am', hint: 'Past the 9:30 lunch cutoff', now: { date: '2026-11-09', minutes: 615 } },
  { label: 'Tue 9:05pm', hint: 'After hours: handoffs wait for morning', now: { date: '2026-11-10', minutes: 1265 } },
  { label: 'Wed 8:00am', hint: 'Veterans Day: center closed', now: { date: '2026-11-11', minutes: 480 } },
]

const storage = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k)
    } catch {
      return null
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v)
    } catch {
      /* private mode: fine */
    }
  },
}

export function App() {
  const [wide, setWide] = useState(() => window.matchMedia(WIDE).matches)
  const [view, setView] = useState<View>(() => (window.matchMedia(WIDE).matches ? 'both' : 'parent'))
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') ?? 'light')
  const phoneSized = useMedia('(max-width: 639px)')

  useEffect(() => {
    const mq = window.matchMedia(WIDE)
    const on = () => {
      setWide(mq.matches)
      setView((v) => (v === 'both' && !mq.matches ? 'parent' : v))
    }
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#121714' : '#FBF8F2')
    storage.set('ww-theme', theme)
  }, [theme])

  return (
    <div className="flex h-[100dvh] flex-col">
      <TopBar view={view} setView={setView} wide={wide} theme={theme} setTheme={setTheme} />
      <main className="min-h-0 flex-1">
        {view === 'both' && (
          <div className="grid h-full grid-cols-[minmax(400px,440px)_1fr]">
            <div className="flex h-full min-h-0 flex-col items-center gap-3 border-r border-line bg-surface-2/60 px-6 pb-6 pt-4">
              <ViewCaption>Parent’s phone · Priya Shah</ViewCaption>
              <Phone>
                <ParentApp />
              </Phone>
            </div>
            <div className="min-h-0 bg-bg">
              <Operator />
            </div>
          </div>
        )}
        {view === 'parent' &&
          (phoneSized ? (
            // On a real phone, the app is the screen: no device frame.
            <ParentApp />
          ) : (
            <div className="flex h-full flex-col items-center gap-3 bg-surface-2/60 px-6 pb-6 pt-4">
              <ViewCaption>Parent’s phone · Priya Shah</ViewCaption>
              <Phone>
                <ParentApp />
              </Phone>
            </div>
          ))}
        {view === 'operator' && <Operator />}
      </main>
    </div>
  )
}

function ViewCaption({ children }: { children: ReactNode }) {
  return <div className="label shrink-0">{children}</div>
}

function Phone({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-0 w-full max-w-[390px] flex-1 overflow-hidden rounded-[2.6rem] border-[10px] border-[#1f2a24] bg-bg shadow-phone [max-height:820px] dark:border-[#0b0f0d]">
      <div className="absolute left-1/2 top-1.5 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-[#1f2a24] dark:bg-[#0b0f0d]" aria-hidden />
      <div className="h-full pt-5">{children}</div>
    </div>
  )
}

function useMedia(query: string) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setMatch(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return match
}

/** A popover that closes on outside click and Escape. */
function usePopover() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  return { open, setOpen, ref }
}

function TopBar({
  view,
  setView,
  wide,
  theme,
  setTheme,
}: {
  view: View
  setView: (v: View) => void
  wide: boolean
  theme: string
  setTheme: (t: string) => void
}) {
  const options: { value: View; label: ReactNode }[] = [
    ...(wide ? [{ value: 'both' as const, label: 'Side by side' }] : []),
    { value: 'parent', label: 'Parent' },
    { value: 'operator', label: 'Staff' },
  ]
  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface px-3 sm:gap-3 sm:px-4">
      <div className="flex items-center gap-2">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-willow">
          <Mark size={26} reversed />
        </div>
        <div className="hidden leading-tight md:block">
          <div className="font-serif text-[15px] font-semibold">AI Front Desk</div>
          <div className="text-2xs text-ink-subtle">Willow &amp; Wren · prototype</div>
        </div>
      </div>

      <div className="md:ml-3">
        <Segmented label="Whose view" size="sm" value={view} onChange={setView} options={options} />
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <Tour setView={setView} wide={wide} />
        <DemoMenu theme={theme} setTheme={setTheme} />
      </div>
    </header>
  )
}

function DemoMenu({ theme, setTheme }: { theme: string; setTheme: (t: string) => void }) {
  const now = useStore((s) => s.now)
  const { open, setOpen, ref } = usePopover()
  const ai = llmEnabled()
  return (
    <div className="relative" ref={ref}>
      <button className="btn-quiet !gap-1.5 !px-2.5 !py-1 text-xs" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu">
        <Clock size={14} />
        <span className="hidden tabular sm:inline">{formatClock(now)}</span>
        <span className="sm:hidden">Demo</span>
        <ChevronDown size={13} className={cx('transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="fixed inset-x-3 top-[3.75rem] animate-fade-in rounded-2xl border border-line bg-surface p-2 shadow-lift sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[19rem]">
          <div className="px-2 pb-1 pt-1.5">
            <div className="label">Demo clock</div>
            <p className="mt-0.5 text-xs text-ink-muted">Answers depend on the time. Pick a moment:</p>
          </div>
          {SCENARIOS.map((s) => {
            const on = now.date === s.now.date && now.minutes === s.now.minutes
            return (
              <button
                key={s.label}
                onClick={() => {
                  setNow(s.now)
                  setOpen(false)
                }}
                className={cx(
                  'flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition hover:bg-surface-2',
                  on && 'bg-willow-soft',
                )}
              >
                <span className="flex-1">
                  <span className="block text-sm font-medium">{s.label}</span>
                  <span className="block text-xs text-ink-muted">{s.hint}</span>
                </span>
                {on && <Check size={15} className="text-willow-text" />}
              </button>
            )
          })}
          <div className="my-2 border-t border-line" />
          <div className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-ink-muted">
            <span className={cx('h-2 w-2 rounded-full', ai ? 'bg-willow' : 'bg-ink-subtle')} />
            {ai
              ? 'AI on: understands any wording and language, every answer fact-checked'
              : 'Rules mode: no LLM configured, every answer still works'}
          </div>
          <MenuItem
            icon={theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </MenuItem>
          <MenuItem
            icon={<Trash2 size={15} />}
            onClick={() => {
              clearThread()
              setOpen(false)
            }}
          >
            Clear the parent chat
          </MenuItem>
          <MenuItem
            icon={<RotateCcw size={15} />}
            onClick={() => {
              if (confirm('Reset the demo? Your edits, answers and chat will be cleared.')) {
                resetDemo()
                setOpen(false)
              }
            }}
          >
            Reset everything
          </MenuItem>
        </div>
      )}
    </div>
  )
}

function MenuItem({ icon, onClick, children }: { icon: ReactNode; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition hover:bg-surface-2"
    >
      <span className="text-ink-muted">{icon}</span>
      {children}
    </button>
  )
}

/**
 * A four-step guided tour that ticks itself off as the reviewer actually does
 * each thing, so it guides without getting in the way. Each step also has a
 * "Show me" that does it for them.
 */
const STEPS: { title: string; body: string; done: (s: State) => boolean; run: (go: (v: View) => void) => void }[] = [
  {
    title: 'Ask as a parent',
    body: '“I forgot lunch.” The answer knows Maya is dairy-free.',
    done: (s) => s.log.some((l) => l.live && l.answer.topic === 'lunch'),
    run: (go) => {
      go('parent')
      ask('I forgot to pack lunch. Can you provide one today?')
    },
  },
  {
    title: 'Ask something it doesn’t know',
    body: 'It hands off to a person instead of guessing.',
    done: (s) => s.log.some((l) => l.live && l.answer.topic === 'unknown'),
    run: (go) => {
      go('parent')
      ask('Do kids need anything for the Thanksgiving feast?')
    },
  },
  {
    title: 'Fix it once, for everyone',
    body: 'Staff → Gaps → Answer once. Every parent who asked is told.',
    done: (s) => s.knowledge.handbook.some((h) => h.origin === 'operator-answer'),
    run: (go) => {
      go('operator')
      setOpTab('gaps')
    },
  },
  {
    title: 'Change the clock',
    body: 'At 10:15am the lunch answer changes: the kitchen count closed at 9:30.',
    done: (s) => s.now.date !== DEMO_NOW.date || s.now.minutes !== DEMO_NOW.minutes,
    run: (go) => {
      setNow({ date: '2026-11-09', minutes: 615 })
      go('parent')
      ask('I forgot lunch, can you give her one?')
    },
  },
]

function Tour({ setView, wide }: { setView: (v: View) => void; wide: boolean }) {
  const state = useStore((s) => s)
  const done = STEPS.map((s) => s.done(state))
  const count = done.filter(Boolean).length
  const { open, setOpen, ref } = usePopover()

  // Open once on a first visit, so nobody lands without a starting point.
  useEffect(() => {
    if (storage.get('ww-tour-seen')) return
    const t = setTimeout(() => {
      storage.set('ww-tour-seen', '1')
      setOpen(true)
    }, 500)
    return () => clearTimeout(t)
  }, [setOpen])

  // In side-by-side mode both views are already on screen.
  const go = (v: View) => setView(wide ? 'both' : v)

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={cx(
          'btn !gap-1.5 !px-2.5 !py-1 text-xs',
          count === STEPS.length ? 'bg-willow-soft text-willow-text' : 'bg-ink text-bg hover:bg-ink/90',
        )}
      >
        {count === STEPS.length ? <Check size={14} /> : <Compass size={14} />}
        <span className="hidden sm:inline">Tour</span>
        <span className="tabular">
          {count}/{STEPS.length}
        </span>
      </button>
      {open && (
        <div className="fixed inset-x-3 top-[3.75rem] animate-fade-in rounded-2xl border border-line bg-surface p-3 shadow-lift sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[21rem]">
          <div className="flex items-start gap-2 px-1">
            <div className="flex-1">
              <div className="font-serif text-lg font-semibold leading-tight">Try it in four steps</div>
              <p className="mt-0.5 text-xs text-ink-muted">Each step checks itself off when you do it.</p>
            </div>
            <button aria-label="Close tour" onClick={() => setOpen(false)} className="btn-ghost !p-1">
              <X size={14} />
            </button>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-willow transition-all duration-500"
              style={{ width: `${(count / STEPS.length) * 100}%` }}
            />
          </div>
          <ol className="mt-3 space-y-1">
            {STEPS.map((s, i) => (
              <li key={s.title} className={cx('flex gap-3 rounded-xl p-2', !done[i] && done.indexOf(false) === i && 'bg-surface-2')}>
                <span
                  className={cx(
                    'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-2xs font-semibold transition',
                    done[i] ? 'bg-willow text-white dark:text-bg' : 'border border-line-strong text-ink-muted',
                  )}
                >
                  {done[i] ? <Check size={12} strokeWidth={3} /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className={cx('text-sm font-medium', done[i] && 'text-ink-muted line-through decoration-ink-subtle/50')}>
                    {s.title}
                  </div>
                  <div className="text-xs text-ink-muted">{s.body}</div>
                </div>
                {!done[i] && (
                  <button
                    className="btn-quiet h-fit shrink-0 !px-2.5 !py-1 text-xs"
                    onClick={() => {
                      s.run(go)
                      setOpen(false)
                    }}
                  >
                    Show me
                  </button>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
