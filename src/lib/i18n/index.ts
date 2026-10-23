import { useStore } from '@/store/store'
import { UI_LANGS, type UiLang } from '../lang'
import { en } from './en'
import { es } from './es'
import type { Locale } from './types'
import { vi } from './vi'
import { zh } from './zh'

/**
 * Parent-app interface languages. Answers are translated per question into any
 * language; these files are the chrome around them, so a parent never reads
 * half an app in English. Center data (menu items, policy names) stays as the
 * operator wrote it.
 *
 * Adding a language: copy en.ts, translate it, add it here and to UiLang.
 */
export const LOCALES: Record<UiLang, Locale> = { en, es, zh, vi }
export { UI_LANGS }

export const fmt = {
  day: (iso: string, l: UiLang) => LOCALES[l].dates.day(iso),
  dayLong: (iso: string, l: UiLang) => LOCALES[l].dates.dayLong(iso),
  short: (iso: string, l: UiLang) => LOCALES[l].dates.short(iso),
  month: (iso: string, l: UiLang) => LOCALES[l].dates.month(iso),
}

/** Allergen names as shown to parents ("dairy" / "lácteos" / "乳制品"). */
export const allergenLabel = (a: string, l: UiLang) => LOCALES[l].allergens[a] ?? a

/** A home-screen question in the parent's language (the engine still receives the English). */
export const rowQuestion = (english: string, l: UiLang) => LOCALES[l].rowQuestions[english] ?? english

/** English meaning of every translated suggestion, so a tapped one never needs the translator. */
export const STARTER_ENGLISH: Record<string, string> = Object.fromEntries(
  UI_LANGS.filter((l) => l !== 'en').flatMap((l) => LOCALES[l].t.starters.map((s, i) => [s, en.t.starters[i]])),
)

export function useT() {
  const lang = useStore((s) => s.lang)
  const locale = LOCALES[lang] ?? en
  return { t: locale.t, lang: locale.code as UiLang, locale }
}
