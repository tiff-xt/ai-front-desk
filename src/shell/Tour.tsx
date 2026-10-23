import { useEffect } from 'react'
import { Check, Compass, X } from 'lucide-react'
import { storage } from '@/lib/storage'
import { cx } from '@/lib/cx'
import { DEMO_NOW } from '@/engine/defaults'
import { ask, setNow, setOpTab, useStore, type State } from '@/store/store'
import { usePopover } from './hooks'
import { type View } from './view'

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

export function Tour({ setView, wide }: { setView: (v: View) => void; wide: boolean }) {
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
