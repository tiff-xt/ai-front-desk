import { CalendarDays, ChevronRight, MapPin, ShieldCheck, Sparkles, Thermometer, UtensilsCrossed, Wallet } from 'lucide-react'
import { cx } from '@/lib/cx'
import { demoFamily } from '@/data/seed'
import { dayStatus, lunchPlan, nextSchoolDay } from '@/engine/policy'
import { allergenLabel, fmt, LOCALES, rowQuestion, STARTER_ENGLISH, useT } from '@/lib/i18n'
import { addDays, formatTime } from '@/lib/time'
import { ask, useStore } from '@/store/store'

/** The answer to the question a parent hasn't asked yet: today, at a glance, for their child. */
export function Today() {
  const k = useStore((s) => s.knowledge)
  const now = useStore((s) => s.now)
  const childId = useStore((s) => s.childId)
  const child = demoFamily.children.find((c) => c.id === childId)!
  const s = dayStatus(k, now.date)
  const { t, lang } = useT()
  const first = demoFamily.parentName.split(' ')[0]
  const greeting = t.greeting(now.minutes / 60)
  const allergen = (a: string) => allergenLabel(a, lang)
  const plan = lunchPlan(k, child, now.date, now)
  const upcoming = k.calendar.closures.filter((c) => c.date > now.date && c.date <= addDays(now.date, 10))
  const events = k.calendar.events.filter((e) => e.room === child.room && e.date >= now.date && e.date <= addDays(now.date, 7))
  const next = nextSchoolDay(k, now.date)

  // Each row asks its question in English: the engine's language, and no translator round-trip.
  const rows: { label: string; value: string; q: string; tone?: 'rose' | 'honey' }[] = []
  rows.push(
    s.state === 'open'
      ? { label: t.today, value: t.openUntil(formatTime(s.close)), q: 'What are your hours today?' }
      : s.state === 'early'
        ? { label: t.today, value: t.earlyClose(formatTime(s.close), s.name), q: 'What time do you close today?', tone: 'honey' }
        : {
            label: t.today,
            value: t.closedToday('name' in s ? s.name : '', next ? fmt.day(next, lang) : ''),
            q: 'Are you open today?',
            tone: 'rose',
          },
  )
  if (plan.menu && (s.state === 'open' || s.state === 'early'))
    rows.push({
      label: t.lunch,
      value:
        child.band === 'infant'
          ? t.eatsFromHome(child.name)
          : plan.servesAlternate
            ? t.allergyFree(plan.menu.alternate, plan.conflicts.map(allergen).join('/'), child.name)
            : plan.menu.lunch,
      q: "What's for lunch today?",
    })
  for (const c of upcoming.slice(0, 2))
    rows.push({
      label: fmt.short(c.date, lang),
      value: c.kind === 'closed' ? t.closedNamed(c.name) : t.closesAt(formatTime(c.closeAt!), c.name),
      q: `Are you open on ${fmt.day(c.date, 'en')}?`,
      tone: c.kind === 'closed' ? 'rose' : 'honey',
    })
  for (const e of events.slice(0, 1))
    rows.push({ label: fmt.short(e.date, lang), value: `${e.title}: ${e.note}`, q: `Are you open ${fmt.day(e.date, 'en')}?` })

  return (
    <div className="animate-fade-in pb-2 pt-3">
      <h1 className="font-serif text-[28px] font-semibold leading-tight tracking-tight">
        {greeting}, {first}.
      </h1>
      <p className="mt-0.5 text-[15px] text-ink-muted">{t.intro(child.name)}</p>

      <div className="card mt-4 divide-y divide-line overflow-hidden shadow-card">
        {rows.map((r, i) => (
          <button
            key={i}
            onClick={() =>
              ask(lang === 'en' ? r.q : r.q in LOCALES[lang].rowQuestions ? rowQuestion(r.q, lang) : `${r.label} · ${r.value}`, r.q)
            }
            className="group flex w-full items-center gap-3 px-3.5 py-3 text-left transition hover:bg-surface-2"
          >
            <span
              className={cx('h-2 w-2 shrink-0 rounded-full', r.tone === 'rose' ? 'bg-rose' : r.tone === 'honey' ? 'bg-honey' : 'bg-willow')}
              aria-hidden
            />
            <span className="w-14 shrink-0 text-2xs font-semibold uppercase tracking-wider text-ink-subtle">{r.label}</span>
            <span
              className={cx('flex-1 text-sm leading-snug', r.tone === 'rose' && 'text-rose-text', r.tone === 'honey' && 'text-honey-text')}
            >
              {r.value}
            </span>
            <ChevronRight size={15} className="shrink-0 text-ink-subtle transition group-hover:translate-x-0.5" aria-hidden />
          </button>
        ))}
      </div>

      <h2 className="mt-6 font-serif text-lg font-semibold">{t.askAnything}</h2>
      <p className="text-xs text-ink-muted">{t.askHint}</p>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        {t.starters.map((q, i) => {
          const Icon = STARTER_ICONS[i % STARTER_ICONS.length]
          return (
            <button
              key={q}
              onClick={() => ask(q, STARTER_ENGLISH[q])}
              className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-3 text-left text-[13px] leading-snug shadow-card transition hover:-translate-y-px hover:border-willow/40 hover:shadow-lift"
            >
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-willow-soft text-willow-text">
                <Icon size={15} />
              </span>
              {q}
            </button>
          )
        })}
      </div>

      <p className="mt-5 flex items-start gap-2 px-1 text-xs leading-relaxed text-ink-subtle">
        <ShieldCheck size={14} className="mt-px shrink-0 text-willow" aria-hidden />
        {t.trust}
      </p>
    </div>
  )
}

const STARTER_ICONS = [CalendarDays, UtensilsCrossed, Thermometer, Wallet, MapPin, Sparkles]
