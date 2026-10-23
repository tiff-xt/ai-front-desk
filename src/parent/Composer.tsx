import { useState } from 'react'
import { ArrowUp, Mic } from 'lucide-react'
import { cx } from '@/lib/cx'
import { STARTER_ENGLISH, useT } from '@/lib/i18n'
import { ask, useStore } from '@/store/store'

export type SpeechCtor = new () => {
  lang: string
  interimResults: boolean
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void
  onend: () => void
  start: () => void
  stop: () => void
}

/** Text and voice input, plus follow-up suggestions. */
export function Composer({ suggestions }: { suggestions?: string[] }) {
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const thinking = useStore((s) => s.thinking)
  const { t, locale } = useT()
  const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor }
  const Speech = w.SpeechRecognition ?? w.webkitSpeechRecognition

  const submit = (q: string) => {
    if (!q.trim()) return
    ask(q, STARTER_ENGLISH[q])
    setText('')
  }

  const listen = () => {
    if (!Speech) return
    const r = new Speech()
    r.lang = locale.speech
    r.interimResults = true
    r.onresult = (e) =>
      setText(
        Array.from(e.results)
          .map((x) => x[0].transcript)
          .join(''),
      )
    r.onend = () => setListening(false)
    setListening(true)
    r.start()
  }

  return (
    <div className="border-t border-line bg-surface/90 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
      {suggestions && suggestions.length > 0 && (
        <div className="no-scrollbar -mx-3 mb-2 flex gap-1.5 overflow-x-auto px-3">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => submit(s)}
              disabled={thinking}
              className="shrink-0 rounded-full border border-line bg-surface px-3 py-1 text-xs text-ink-muted transition hover:border-willow hover:text-willow-text"
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit(text)
        }}
        className="flex items-end gap-1.5 rounded-2xl border border-line bg-surface p-1.5 focus-within:border-willow focus-within:ring-2 focus-within:ring-willow/15"
      >
        <label htmlFor="ask" className="sr-only">
          {t.ask}
        </label>
        <input
          id="ask"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={listening ? t.listening : t.ask}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-base placeholder:text-ink-subtle focus:outline-none"
        />
        {Speech && (
          <button
            type="button"
            onClick={listen}
            aria-label={t.askVoice}
            className={cx(
              'grid h-8 w-8 place-items-center rounded-full transition',
              listening ? 'animate-pulse bg-rose-soft text-rose-text' : 'text-ink-muted hover:bg-surface-2',
            )}
          >
            <Mic size={17} />
          </button>
        )}
        <button
          type="submit"
          aria-label={t.send}
          disabled={!text.trim() || thinking}
          className="grid h-8 w-8 place-items-center rounded-full bg-willow text-white transition disabled:opacity-30 dark:text-bg"
        >
          <ArrowUp size={17} strokeWidth={2.4} />
        </button>
      </form>
    </div>
  )
}
