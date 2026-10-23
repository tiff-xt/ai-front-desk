import { useMemo, useState } from 'react'
import { BookMarked, FlaskConical, Inbox as InboxIcon, LayoutDashboard, Lightbulb, SlidersHorizontal } from 'lucide-react'
import { cx } from '@/components/ui'
import { healthCheck } from '@/engine/health'
import { useStore } from '@/store/store'
import { Overview } from './Overview'
import { Inbox } from './Inbox'
import { gapItems } from '@/store/selectors'
import { Gaps } from './Gaps'
import { KnowledgeView } from './Knowledge'
import { AutonomyView } from './Autonomy'
import { Tests } from './Tests'

export type Tab = 'overview' | 'inbox' | 'gaps' | 'knowledge' | 'autonomy' | 'tests'

export function Operator() {
  const [tab, setTab] = useState<Tab>('overview')
  const inbox = useStore((s) => s.inbox)
  const log = useStore((s) => s.log)
  const k = useStore((s) => s.knowledge)
  const now = useStore((s) => s.now)
  const open = inbox.filter((i) => i.status === 'open').length
  const gaps = useMemo(() => gapItems(log).length, [log])
  const issues = useMemo(() => healthCheck(k, now).filter((i) => i.kind !== 'stale').length, [k, now])

  const tabs: { id: Tab; label: string; Icon: typeof InboxIcon; count?: number; tone?: string }[] = [
    { id: 'overview', label: 'Overview', Icon: LayoutDashboard },
    { id: 'inbox', label: 'Inbox', Icon: InboxIcon, count: open, tone: 'bg-dusk text-white dark:text-bg' },
    { id: 'gaps', label: 'Gaps', Icon: Lightbulb, count: gaps, tone: 'bg-honey text-ink' },
    { id: 'knowledge', label: 'Knowledge', Icon: BookMarked, count: issues, tone: 'bg-rose-soft text-rose-text' },
    { id: 'autonomy', label: 'Autonomy', Icon: SlidersHorizontal },
    { id: 'tests', label: 'Tests', Icon: FlaskConical },
  ]

  return (
    <div className="flex h-full min-h-0 flex-col">
      <nav className="no-scrollbar flex shrink-0 gap-1 overflow-x-auto border-b border-line px-4 sm:px-6" aria-label="Control center">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? 'page' : undefined}
            className={cx(
              '-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 py-3 text-sm font-medium transition',
              tab === t.id ? 'border-willow text-ink' : 'border-transparent text-ink-muted hover:text-ink',
            )}
          >
            <t.Icon size={15} />
            {t.label}
            {!!t.count && <span className={cx('rounded-full px-1.5 text-2xs font-semibold tabular', t.tone)}>{t.count}</span>}
          </button>
        ))}
      </nav>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
        <div key={tab} className="animate-fade-in px-4 py-5 sm:px-6">
          {tab === 'overview' && <Overview go={setTab} />}
          {tab === 'inbox' && <Inbox />}
          {tab === 'gaps' && <Gaps />}
          {tab === 'knowledge' && <KnowledgeView />}
          {tab === 'autonomy' && <AutonomyView />}
          {tab === 'tests' && <Tests />}
        </div>
      </div>
    </div>
  )
}
