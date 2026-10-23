import { describe, expect, it } from 'vitest'
import { en } from './en'
import { LOCALES, STARTER_ENGLISH } from './index'

describe('interface languages', () => {
  const keys = (o: object) => Object.keys(o).sort()
  for (const [code, locale] of Object.entries(LOCALES)) {
    it(`${code} has every string English has`, () => {
      expect(keys(locale.t)).toEqual(keys(en.t))
      expect(keys(locale.t.status)).toEqual(keys(en.t.status))
      expect(keys(locale.t.symptoms)).toEqual(keys(en.t.symptoms))
    })
    it(`${code} suggestions map back to English`, () => {
      expect(locale.t.starters).toHaveLength(en.t.starters.length)
      if (code !== 'en') for (const s of locale.t.starters) expect(en.t.starters).toContain(STARTER_ENGLISH[s])
    })
    it(`${code} formats dates`, () => {
      expect(locale.dates.day('2026-11-11')).toMatch(/11/)
    })
  }
})
