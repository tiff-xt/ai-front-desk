import { useEffect, useState } from 'react'
import { storage } from '@/lib/storage'
import { cx } from '@/lib/cx'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Operator } from '@/operator/Operator'
import { ParentApp } from '@/parent/ParentApp'
import { useMedia } from './shell/hooks'
import { TopBar } from './shell/TopBar'
import { linked, mirrorViewInUrl, type View, WIDE } from './shell/view'
import { setLang, setOpTab } from '@/store/store'

/**
 * The app shell: a top bar, then one of three views. "Side by side" (wide
 * screens only) shows the parent's phone next to the staff console so a
 * reviewer can watch both halves of every interaction at once.
 */
export function App() {
  const wide = useMedia(WIDE)
  const phoneSized = useMedia('(max-width: 639px)')
  const [view, setView] = useState<View>(() => {
    const v = linked.view()
    const fits = window.matchMedia(WIDE).matches
    return v && (v !== 'both' || fits) ? v : fits ? 'both' : 'parent'
  })

  // Deep links (?tab=, ?lang=) apply once on load; the view is kept in the URL from then on.
  useEffect(() => {
    const tab = linked.tab()
    const lang = linked.lang()
    if (tab) setOpTab(tab)
    if (lang) setLang(lang)
  }, [])
  useEffect(() => mirrorViewInUrl(view), [view])
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') ?? 'light')

  // Side by side needs room; if the window shrinks, fall back to the parent view.
  useEffect(() => {
    if (!wide && view === 'both') setView('parent')
  }, [wide, view])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#121714' : '#FBF8F2')
    storage.set('ww-theme', theme)
  }, [theme])

  return (
    <div className="flex h-[100dvh] flex-col">
      <TopBar view={view} setView={setView} wide={wide} theme={theme} setTheme={setTheme} />
      {/*
        Layout note: every level from here down is a flex container sized with
        flex-1/min-h-0, never height:100%. Safari collapses percentage heights
        inside flex items to zero, which made whole views vanish.
      */}
      <main className="flex min-h-0 flex-1 flex-col">
        {view === 'both' && (
          <div className="grid min-h-0 flex-1 grid-cols-[minmax(400px,440px)_1fr]">
            <PhoneStage className="border-r border-line" />
            <div className="flex min-h-0 flex-col bg-bg">
              <ErrorBoundary area="the staff console">
                <Operator />
              </ErrorBoundary>
            </div>
          </div>
        )}
        {/* On a real phone the parent app is the screen itself: no device frame. */}
        {view === 'parent' &&
          (phoneSized ? (
            <ErrorBoundary area="the parent app">
              <ParentApp />
            </ErrorBoundary>
          ) : (
            <PhoneStage className="flex-1" />
          ))}
        {view === 'operator' && (
          <ErrorBoundary key="operator" area="the staff console">
            <Operator />
          </ErrorBoundary>
        )}
      </main>
    </div>
  )
}

/** The parent app shown inside a device frame, with a caption saying whose phone it is. */
export function PhoneStage({ className }: { className?: string }) {
  return (
    <div className={cx('flex min-h-0 flex-col items-center gap-3 bg-surface-2/60 px-6 pb-6 pt-4', className)}>
      <div className="label shrink-0">Parent’s phone · Priya Shah</div>
      <div className="relative flex min-h-0 w-full max-w-[390px] flex-1 flex-col overflow-hidden rounded-[2.6rem] border-[10px] border-[#1f2a24] bg-bg pt-5 shadow-phone [max-height:820px] dark:border-[#0b0f0d]">
        <div className="absolute left-1/2 top-1.5 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-[#1f2a24] dark:bg-[#0b0f0d]" aria-hidden />
        <ErrorBoundary area="the parent app">
          <ParentApp />
        </ErrorBoundary>
      </div>
    </div>
  )
}
