import { type ReactNode } from 'react'
import { Mark } from '@/components/Mark'
import { Segmented } from '@/components/ui'
import { DemoMenu } from './DemoMenu'
import { Tour } from './Tour'
import { type View } from './view'

/** App chrome: brand, the Parent / Staff / Side by side switch, the tour and the demo menu. */
export function TopBar({
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
