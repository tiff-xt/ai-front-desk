import { useEffect, useState } from 'react'
import { Clock, Moon, RotateCcw, Smartphone, Sun, X } from 'lucide-react'
import { Mark } from '@/components/Mark'
import { cx, Segmented } from '@/components/ui'
import { llmEnabled } from '@/engine/llm'
import { formatClock, type Clock as ClockT } from '@/lib/time'
import { Operator } from '@/operator/Operator'
import { ParentApp } from '@/parent/ParentApp'
import { clearThread, resetDemo, setNow, useStore } from '@/store/store'

type View = 'both' | 'parent' | 'operator'

const SCENARIOS: { label: string; hint: string; now: ClockT }[] = [
  { label: 'Mon 7:42am', hint: 'Morning drop-off, holiday this week', now: { date: '2026-11-09', minutes: 462 } },
  { label: 'Mon 10:15am', hint: 'Past the 9:30 lunch cutoff', now: { date: '2026-11-09', minutes: 615 } },
  { label: 'Tue 9:05pm', hint: 'After hours: handoffs wait for morning', now: { date: '2026-11-10', minutes: 1265 } },
  { label: 'Wed 8:00am', hint: 'Veterans Day: center closed', now: { date: '2026-11-11', minutes: 480 } },
]

export function App() {
  const [view, setView] = useState<View>(() => (window.matchMedia('(min-width: 1100px)').matches ? 'both' : 'parent'))
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') ?? 'light')
  const [intro, setIntro] = useState(() => {
    try {
      return localStorage.getItem('ww-intro') !== 'dismissed'
    } catch {
      return true
    }
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem('ww-theme', theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  const closeIntro = () => {
    setIntro(false)
    try {
      localStorage.setItem('ww-intro', 'dismissed')
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex h-[100dvh] flex-col">
      <TopBar view={view} setView={setView} theme={theme} setTheme={setTheme} />
      {intro && <Intro onClose={closeIntro} />}
      <main className="min-h-0 flex-1">
        {view === 'both' && (
          <div className="grid h-full grid-cols-[minmax(380px,430px)_1fr]">
            <div className="flex h-full min-h-0 items-center justify-center border-r border-line bg-surface-2/60 p-6">
              <Phone>
                <ParentApp />
              </Phone>
            </div>
            <div className="min-h-0 bg-bg">
              <Operator />
            </div>
          </div>
        )}
        {view === 'parent' && (
          <div className="flex h-full justify-center sm:bg-surface-2/60 sm:p-6">
            <div className="h-full w-full sm:max-w-[400px]">
              <div className="h-full sm:hidden">
                <ParentApp />
              </div>
              <div className="hidden h-full sm:block">
                <Phone>
                  <ParentApp />
                </Phone>
              </div>
            </div>
          </div>
        )}
        {view === 'operator' && <Operator />}
      </main>
    </div>
  )
}

function Phone({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-full max-h-[820px] w-full max-w-[390px] overflow-hidden rounded-[2.6rem] border-[10px] border-[#1f2a24] bg-bg shadow-phone dark:border-[#0b0f0d]">
      <div className="absolute left-1/2 top-1.5 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-[#1f2a24] dark:bg-[#0b0f0d]" aria-hidden />
      <div className="h-full pt-5">{children}</div>
    </div>
  )
}

function TopBar({
  view,
  setView,
  theme,
  setTheme,
}: {
  view: View
  setView: (v: View) => void
  theme: string
  setTheme: (t: string) => void
}) {
  const now = useStore((s) => s.now)
  const [clockOpen, setClockOpen] = useState(false)
  return (
    <header className="relative z-20 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-surface px-4 py-2.5">
      <div className="flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-willow">
          <Mark size={26} reversed />
        </div>
        <div className="leading-tight">
          <div className="font-serif text-[15px] font-semibold">AI Front Desk</div>
          <div className="text-2xs text-ink-subtle">Willow &amp; Wren · prototype</div>
        </div>
      </div>

      <div className="order-last w-full sm:order-none sm:ml-4 sm:w-auto">
        <Segmented
          label="View"
          size="sm"
          value={view}
          onChange={setView}
          options={
            [
              { value: 'both', label: <span className="hidden lg:inline">Side by side</span> },
              { value: 'parent', label: 'Parent' },
              { value: 'operator', label: 'Operator' },
            ].filter((o) => o.value !== 'both' || window.matchMedia('(min-width: 1100px)').matches) as {
              value: View
              label: React.ReactNode
            }[]
          }
        />
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <span
          className={cx(
            'hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-2xs font-semibold md:inline-flex',
            llmEnabled() ? 'bg-willow-soft text-willow-text' : 'bg-surface-3 text-ink-muted',
          )}
          title={
            llmEnabled()
              ? 'LLM rephrases grounded answers; every claim is checked by the grounding guard'
              : 'No LLM configured: rules and templates only. Every answer still works.'
          }
        >
          <span className={cx('h-1.5 w-1.5 rounded-full', llmEnabled() ? 'bg-willow' : 'bg-ink-subtle')} />
          {llmEnabled() ? 'LLM + guard' : 'Rules mode'}
        </span>
        <div className="relative">
          <button className="btn-quiet !py-1 text-xs" onClick={() => setClockOpen(!clockOpen)} aria-expanded={clockOpen}>
            <Clock size={13} /> <span className="tabular">{formatClock(now)}</span>
          </button>
          {clockOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 animate-fade-in rounded-2xl border border-line bg-surface p-2 shadow-lift">
              <div className="px-2 pb-1.5 pt-1 text-xs text-ink-muted">Demo clock: answers depend on the time. Pick a moment:</div>
              {SCENARIOS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => {
                    setNow(s.now)
                    setClockOpen(false)
                  }}
                  className={cx(
                    'flex w-full flex-col rounded-xl px-2.5 py-2 text-left transition hover:bg-surface-2',
                    now.date === s.now.date && now.minutes === s.now.minutes && 'bg-willow-soft',
                  )}
                >
                  <span className="text-sm font-medium">{s.label}</span>
                  <span className="text-xs text-ink-muted">{s.hint}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="btn-ghost !p-1.5" aria-label="Toggle dark mode" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button className="btn-ghost !p-1.5" aria-label="Clear chat" title="Clear the parent chat" onClick={clearThread}>
          <Smartphone size={16} />
        </button>
        <button
          className="btn-ghost !p-1.5"
          aria-label="Reset demo"
          title="Reset everything to the starting state"
          onClick={() => {
            if (confirm('Reset the demo? Your edits, answers and chat will be cleared.')) resetDemo()
          }}
        >
          <RotateCcw size={16} />
        </button>
      </div>
    </header>
  )
}

function Intro({ onClose }: { onClose: () => void }) {
  const steps = [
    ['Ask as a parent', '“I forgot lunch, can you provide one?” The answer knows Maya is dairy-free.'],
    ['Ask something it doesn’t know', '“Do we bring anything to the Thanksgiving feast?” It hands off instead of guessing.'],
    ['Fix it once', 'Gaps → Answer once → Publish. Every parent who asked gets the answer.'],
    ['Change the clock', 'Try 10:15am and ask about lunch again, or set the clock to Veterans Day.'],
  ]
  return (
    <div className="relative hidden shrink-0 border-b border-line bg-willow-soft/50 px-4 py-3 sm:block">
      <div className="no-scrollbar flex gap-3 overflow-x-auto pr-8">
        {steps.map(([t, d], i) => (
          <div key={t} className="flex min-w-[15rem] max-w-[19rem] flex-1 gap-2.5">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-willow text-2xs font-semibold text-white dark:text-bg">
              {i + 1}
            </span>
            <div className="text-xs leading-snug">
              <div className="font-semibold text-ink">{t}</div>
              <div className="text-ink-muted">{d}</div>
            </div>
          </div>
        ))}
      </div>
      <button aria-label="Dismiss guide" onClick={onClose} className="btn-ghost absolute right-2 top-2 !p-1.5">
        <X size={14} />
      </button>
    </div>
  )
}
