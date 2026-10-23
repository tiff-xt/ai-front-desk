import { type ReactNode } from 'react'
import { Check, ChevronDown, Clock, Moon, RotateCcw, Sun, Trash2 } from 'lucide-react'
import { cx } from '@/lib/cx'
import { DEMO_NOW } from '@/engine/defaults'
import { llmEnabled } from '@/engine/llm'
import { formatClock, type Clock as ClockT } from '@/lib/time'
import { clearThread, resetDemo, setNow, useStore } from '@/store/store'
import { usePopover } from './hooks'

const SCENARIOS: { label: string; hint: string; now: ClockT }[] = [
  { label: 'Mon 7:42am', hint: 'Morning drop-off, holiday this week', now: DEMO_NOW },
  { label: 'Mon 10:15am', hint: 'Past the 9:30 lunch cutoff', now: { date: '2026-11-09', minutes: 615 } },
  { label: 'Tue 9:05pm', hint: 'After hours: handoffs wait for morning', now: { date: '2026-11-10', minutes: 1265 } },
  { label: 'Wed 8:00am', hint: 'Veterans Day: center closed', now: { date: '2026-11-11', minutes: 480 } },
]

/** Demo-only controls: the clock (answers depend on time), AI status, theme and reset. */
export function DemoMenu({ theme, setTheme }: { theme: string; setTheme: (t: string) => void }) {
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
