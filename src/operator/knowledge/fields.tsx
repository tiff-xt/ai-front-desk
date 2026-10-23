import { type ReactNode } from 'react'
import { Clock4 } from 'lucide-react'
import { formatDay } from '@/lib/time'

/** Form building blocks shared by the knowledge editors. */
export function Panel({ title, meta, children }: { title: string; meta: { updatedAt: string; updatedBy: string }; children: ReactNode }) {
  return (
    <section className="card space-y-4 p-4">
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
        <h3 className="font-medium">{title}</h3>
        <span className="flex items-center gap-1 text-2xs text-ink-subtle">
          <Clock4 size={11} /> Updated {formatDay(meta.updatedAt)} {meta.updatedAt.slice(0, 4)} by {meta.updatedBy}
        </span>
      </div>
      {children}
    </section>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

export function NumberInput({ value, onChange, step = 1 }: { value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <input
      type="number"
      step={step}
      className="input w-28 tabular"
      value={value}
      onChange={(e) => e.target.value !== '' && onChange(+e.target.value)}
    />
  )
}

export function Money({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="relative w-28">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-subtle">$</span>
      <input
        type="number"
        className="input pl-6 tabular"
        value={value}
        onChange={(e) => e.target.value !== '' && onChange(+e.target.value)}
      />
    </div>
  )
}
