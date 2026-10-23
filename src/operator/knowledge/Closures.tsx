import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { cx } from '@/lib/cx'
import type { Closure, Knowledge } from '@/data/types'
import { formatDay, formatTime } from '@/lib/time'

export function Closures({ k, onChange, today }: { k: Knowledge; onChange: (c: Closure[]) => void; today: string }) {
  const [date, setDate] = useState('')
  const [name, setName] = useState('')
  const [kind, setKind] = useState<'closed' | 'early'>('closed')
  const upcoming = k.calendar.closures.filter((c) => c.date >= today)
  return (
    <div>
      <div className="label mb-1.5">Upcoming closures</div>
      <ul className="divide-y divide-line rounded-xl border border-line">
        {upcoming.map((c) => (
          <li key={c.date + c.name} className="flex items-center gap-3 px-3 py-2 text-sm">
            <span className="w-24 shrink-0 tabular text-ink-muted">{formatDay(c.date)}</span>
            <span className="flex-1">{c.name}</span>
            <span
              className={cx(
                'rounded-full px-2 py-0.5 text-2xs font-semibold',
                c.kind === 'closed' ? 'bg-rose-soft text-rose-text' : 'bg-honey-soft text-honey-text',
              )}
            >
              {c.kind === 'closed' ? 'Closed' : `Closes ${formatTime(c.closeAt!)}`}
            </span>
            <button
              aria-label={`Remove ${c.name}`}
              className="btn-ghost !p-1"
              onClick={() => onChange(k.calendar.closures.filter((x) => x !== c))}
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-2 flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!date || !name) return
          onChange(
            [...k.calendar.closures, { date, name, kind, closeAt: kind === 'early' ? 15 * 60 : undefined }].sort((a, b) =>
              a.date.localeCompare(b.date),
            ),
          )
          setDate('')
          setName('')
        }}
      >
        <input type="date" aria-label="Date" className="input w-40" value={date} onChange={(e) => setDate(e.target.value)} />
        <input
          aria-label="Name"
          placeholder="e.g. Snow day"
          className="input w-44 flex-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select aria-label="Type" className="input w-36" value={kind} onChange={(e) => setKind(e.target.value as 'closed' | 'early')}>
          <option value="closed">Closed all day</option>
          <option value="early">Early close 3pm</option>
        </select>
        <button className="btn-primary" disabled={!date || !name}>
          <Plus size={14} /> Add
        </button>
      </form>
    </div>
  )
}
