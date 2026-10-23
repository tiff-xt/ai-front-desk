import { useEffect, useMemo, useRef } from 'react'
import { Bell, X } from 'lucide-react'
import { useT } from '@/lib/i18n'
import { dismissNotice, useStore } from '@/store/store'
import { Header } from './Header'
import { Today } from './Today'
import { Bubble, Thinking } from './Thread'
import { Composer } from './Composer'

/** The parent front desk: header, notices, then either the home screen (Today) or the conversation, with the composer pinned below. */
export function ParentApp() {
  const messages = useStore((s) => s.messages)
  const thinking = useStore((s) => s.thinking)
  const notices = useStore((s) => s.notices)
  const log = useStore((s) => s.log)
  const scroller = useRef<HTMLDivElement>(null)
  const { t } = useT()

  useEffect(() => {
    // Follow the conversation; an empty thread starts at the top (the greeting).
    // A new answer is shown from its first line, so a long one is read top-down.
    const el = scroller.current
    if (!el) return
    // Never `return el.scrollTo(...)`: newer Chrome returns a Promise from scrollTo, and React would
    // call whatever an effect returns as its cleanup ("T is not a function" on the next update/unmount).
    if (!messages.length) {
      el.scrollTo({ top: 0 })
      return
    }
    const last = messages[messages.length - 1]
    const node = el.querySelector<HTMLElement>('[data-bubble]:last-of-type')
    const top = last.role === 'parent' || thinking || !node ? el.scrollHeight : node.offsetTop - 12
    el.scrollTo({ top, behavior: 'smooth' })
  }, [messages, thinking])

  const byId = useMemo(() => new Map(log.map((l) => [l.id, l])), [log])
  const last = [...messages].reverse().find((m) => m.role === 'desk')
  const followUps = last?.logId ? byId.get(last.logId)?.answer.followUps : undefined

  // Screen readers hear each new reply (with its status) without losing their place.
  const latest = [...messages].reverse().find((m) => m.role !== 'parent')
  const latestStatus = latest?.logId ? byId.get(latest.logId)?.answer.status : undefined
  const announcement = thinking ? t.checking : latest ? `${latestStatus ? `${t.status[latestStatus]}. ` : ''}${latest.text}` : ''

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg">
      <Header />
      {notices[0] && (
        <button
          onClick={() => {
            dismissNotice(notices[0].id)
            scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })
          }}
          className="mx-3 mt-2 flex animate-rise-in items-center gap-2 rounded-xl bg-dusk px-3 py-2 text-left text-sm text-white shadow-lift dark:text-bg"
        >
          <Bell size={15} className="shrink-0" />
          <span className="flex-1">{notices[0].kind === 'reply' ? t.noticeReply : t.noticeAnswer}</span>
          <X size={14} className="opacity-70" />
        </button>
      )}
      <div ref={scroller} className="scrollbar-thin relative min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-2">
        {messages.length === 0 ? <Today /> : <div className="h-2" />}
        <div className="space-y-3">
          {messages.map((m) => (
            <div key={m.id} data-bubble>
              <Bubble m={m} entry={m.logId ? byId.get(m.logId) : undefined} />
            </div>
          ))}
          {thinking && <Thinking />}
        </div>
      </div>
      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>
      <Composer suggestions={messages.length === 0 ? undefined : followUps} />
    </div>
  )
}
