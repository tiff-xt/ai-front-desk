import type { Strings } from './en'

/**
 * Everything one interface language needs. To add a language, copy en.ts,
 * translate it, and register it in index.ts.
 */
export interface Locale {
  code: string
  /** Shown in the language picker, in the language itself. */
  name: string
  /** BCP 47 tag for voice input. */
  speech: string
  dates: {
    /** "Wed, Nov 11" */
    day: (iso: string) => string
    /** "Wednesday, Nov 11" */
    dayLong: (iso: string) => string
    /** "Wed 11", for compact labels */
    short: (iso: string) => string
    /** "NOV", for the date tile */
    month: (iso: string) => string
  }
  allergens: Record<string, string>
  /** The home screen's quick questions, keyed by the English the engine receives. */
  rowQuestions: Record<string, string>
  t: Strings
}
