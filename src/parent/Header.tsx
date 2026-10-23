import { ChevronDown, Globe } from 'lucide-react'
import { Mark } from '@/components/Mark'
import { cx } from '@/lib/cx'
import { demoFamily, roomNames } from '@/data/seed'
import { dayStatus, isOfficeOpen } from '@/engine/policy'
import { LOCALES, UI_LANGS, useT } from '@/lib/i18n'
import type { UiLang } from '@/lib/lang'
import { formatTime } from '@/lib/time'
import { setChild, setLang, useStore } from '@/store/store'

/** Center name, office status, language switch and the child selector. Answers are personal to the selected child. */
export function Header() {
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
        {/* A native select: on a phone it opens the system picker, which parents already know how to use. */}
        <label className="relative flex shrink-0 items-center rounded-full border border-line py-1 pl-2 pr-6 text-xs font-medium text-ink-muted transition focus-within:border-willow hover:text-ink">
          <Globe size={13} className="mr-1" aria-hidden />
          {/* Compact face ("EN"); the invisible select on top still lists every language by its own name. */}
          <span aria-hidden>{lang.toUpperCase()}</span>
          <select
            aria-label="Language"
            value={lang}
            onChange={(e) => setLang(e.target.value as UiLang)}
            className="absolute inset-0 cursor-pointer appearance-none opacity-0"
          >
            {UI_LANGS.map((l) => (
              <option key={l} value={l}>
                {LOCALES[l].name}
              </option>
            ))}
          </select>
          <ChevronDown size={12} className="pointer-events-none absolute right-2" aria-hidden />
        </label>
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
