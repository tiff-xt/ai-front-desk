import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUp, Bell, X } from 'lucide-react'
import { fmt, useT } from '@/lib/i18n'
import { currentConversation, currentMessages, dismissNotice, newConversation, openConversation, useStore } from '@/store/store'
import { History } from './History'
import { Header } from './Header'
import { Today } from './Today'
import { Bubble, Thinking } from './Thread'
import { Composer } from './Composer'

/** The parent front desk: header, notices, then either the home screen (Today) or the conversation, with the composer pinned below. */
export function ParentApp() {
  const messages = useStore(currentMessages)
  const conversation = useStore(currentConversation)
  const now = useStore((s) => s.now)
  const [panel, setPanel] = useState<'chat' | 'history'>('chat')
  const [focusId, setFocusId] = useState<string | null>(null)
  // An earlier day's conversation shows its date instead of today's overview.
  const isPast = !!conversation && conversation.startedAt.date !== now.date
  const thinking = useStore((s) => s.thinking)
  const notices = useStore((s) => s.notices)
  const log = useStore((s) => s.log)
  const scroller = useRef<HTMLDivElement>(null)
  const todayRef = useRef<HTMLDivElement>(null)
  const [awayFromToday, setAwayFromToday] = useState(false)
  const { t, lang } = useT()

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

  // Opened from History: bring the matching message into view and flash it.
  useEffect(() => {
    if (!focusId || panel !== 'chat') return
    const node = scroller.current?.querySelector<HTMLElement>(`[data-msg-id="${focusId}"]`)
    if (!node) return
    scroller.current?.scrollTo({ top: node.offsetTop - 16, behavior: 'smooth' })
    node.classList.add('animate-flash', 'rounded-2xl')
    const done = setTimeout(() => {
      node.classList.remove('animate-flash')
      setFocusId(null)
    }, 1800)
    return () => clearTimeout(done)
  }, [focusId, panel, messages])

  const byId = useMemo(() => new Map(log.map((l) => [l.id, l])), [log])
  const last = [...messages].reverse().find((m) => m.role === 'desk')
  const followUps = last?.logId ? byId.get(last.logId)?.answer.followUps : undefined

  // Screen readers hear each new reply (with its status) without losing their place.
  const latest = [...messages].reverse().find((m) => m.role !== 'parent')
  const latestStatus = latest?.logId ? byId.get(latest.logId)?.answer.status : undefined
  const announcement = thinking ? t.checking : latest ? `${latestStatus ? `${t.status[latestStatus]}. ` : ''}${latest.text}` : ''

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg">
      <Header
        onHistory={() => setPanel('history')}
        onNew={() => {
          newConversation()
          setPanel('chat')
        }}
      />
      {notices[0] && (
        <button
          onClick={() => {
            // Take the parent to the conversation the reply belongs to, even if it's an older one.
            const n = notices[0]
            dismissNotice(n.id)
            if (n.conversationId) openConversation(n.conversationId)
            setPanel('chat')
            setTimeout(() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' }), 50)
          }}
          className="mx-3 mt-2 flex animate-rise-in items-center gap-2 rounded-xl bg-dusk px-3 py-2 text-left text-sm text-white shadow-lift dark:text-bg"
        >
          <Bell size={15} className="shrink-0" />
          <span className="flex-1">{notices[0].kind === 'reply' ? t.noticeReply : t.noticeAnswer}</span>
          <X size={14} className="opacity-70" />
        </button>
      )}
      {panel === 'history' ? (
        <History
          onClose={() => setPanel('chat')}
          onNew={() => {
            newConversation()
            setPanel('chat')
          }}
          onOpen={(id, messageId) => {
            openConversation(id)
            setFocusId(messageId ?? null)
            setPanel('chat')
          }}
        />
      ) : (
        <>
          <div
            ref={scroller}
            onScroll={(e) => setAwayFromToday(e.currentTarget.scrollTop > (todayRef.current?.offsetHeight ?? 400) - 80)}
            className="scrollbar-thin relative min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-2"
          >
            {/* Today's overview stays at the top of today's thread: the conversation continues beneath it, never replaces it. */}
            {isPast ? (
              <div className="flex items-center justify-between gap-2 px-1 pb-1 pt-2">
                <span className="label">{t.pastConversation(fmt.dayLong(conversation.startedAt.date, lang))}</span>
                <button
                  onClick={() => newConversation()}
                  className="shrink-0 text-xs font-medium text-willow-text underline-offset-2 hover:underline"
                >
                  {t.startNew}
                </button>
              </div>
            ) : (
              <div ref={todayRef}>
                <Today />
              </div>
            )}
            {!isPast && awayFromToday && messages.length > 0 && (
              <button
                onClick={() => scroller.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                className="sticky top-1 z-10 -mb-8 ml-auto mr-1 flex animate-fade-in items-center gap-1 rounded-full border border-line bg-surface/95 px-3 py-1.5 text-xs font-medium text-ink shadow-lift backdrop-blur"
              >
                <ArrowUp size={13} /> {t.backToToday}
              </button>
            )}
            {messages.length > 0 && !isPast && (
              <div className="my-4 flex items-center gap-3 text-2xs font-semibold uppercase tracking-wider text-ink-subtle" aria-hidden>
                <span className="h-px flex-1 bg-line" />
                {t.conversation}
                <span className="h-px flex-1 bg-line" />
              </div>
            )}
            <div className="space-y-3">
              {messages.map((m) => (
                <div key={m.id} data-bubble data-msg-id={m.id}>
                  <Bubble m={m} entry={m.logId ? byId.get(m.logId) : undefined} conversationId={conversation?.id} />
                </div>
              ))}
              {thinking && <Thinking />}
            </div>
          </div>
          <div className="sr-only" role="status" aria-live="polite">
            {announcement}
          </div>
          <Composer suggestions={messages.length === 0 ? undefined : followUps} />
        </>
      )}
    </div>
  )
}
