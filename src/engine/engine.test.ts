import { describe, expect, it } from 'vitest'
import { demoFamily, seedKnowledge } from '@/data/seed'
import { answerQuestion } from './answer'
import { DEFAULT_AUTONOMY, DEMO_NOW } from './defaults'
import { EVALS } from './evals'
import { guard } from './guard'
import { earliestReturn } from './policy'

describe('golden questions', () => {
  for (const c of EVALS) {
    it(`${c.id}: ${c.question}`, () => {
      const a = answerQuestion({
        question: c.question,
        knowledge: seedKnowledge,
        family: demoFamily,
        now: c.now ?? DEMO_NOW,
        childId: c.child ?? 'maya',
        autonomy: DEFAULT_AUTONOMY,
        bookedTours: [],
      })
      const visible = a.text
      if (c.expect.topic) expect(a.topic).toBe(c.expect.topic)
      expect([c.expect.status].flat()).toContain(a.status)
      for (const s of c.expect.includes ?? []) expect(visible.toLowerCase()).toContain(s.toLowerCase())
      for (const s of c.expect.excludes ?? []) expect(visible.toLowerCase()).not.toContain(s.toLowerCase())
    })
  }
})

describe('policy', () => {
  it('fever clock restarts from the last fever reducer dose', () => {
    const r = earliestReturn(seedKnowledge, {
      lastSymptom: { date: '2026-11-09', minutes: 6 * 60 },
      lastFeverReducer: { date: '2026-11-09', minutes: 12 * 60 },
      hours: 24,
    })
    // Tue 12:00pm, a normal school day
    expect(r.earliest).toEqual({ date: '2026-11-10', minutes: 12 * 60 })
  })
  it('clear time after hours rolls to next open, skipping closures', () => {
    const r = earliestReturn(seedKnowledge, { lastSymptom: { date: '2026-11-10', minutes: 19 * 60 }, hours: 24 })
    expect(r.earliest).toEqual({ date: '2026-11-12', minutes: 7 * 60 })
    expect(r.skipped.map((c) => c.name)).toEqual(['Veterans Day'])
  })
})

describe('grounding guard', () => {
  const facts = ['Infant tuition is $1,890/month full-time. We are closed Wed, Nov 11 for Veterans Day and reopen at 7:00am.']
  it('passes a faithful paraphrase', () => {
    expect(guard('Infants are $1,890 a month. Closed Wednesday Nov 11, back at 7am.', facts).passed).toBe(true)
  })
  it('catches an invented number', () => {
    expect(guard('Infants are $1,790 a month.', facts).unsupported).toContain('1790')
  })
  it('catches an invented weekday', () => {
    expect(guard('We reopen Friday.', facts).unsupported).toContain('friday')
  })
})

describe('grounding guard across languages', () => {
  const facts = [
    "No, we're closed on Veterans Day (Wed, Nov 11). We reopen Thursday, Nov 12 at 7:00am. Infant tuition is $1,890/month. Fever line 100.4°F.",
  ]
  it('passes faithful Spanish', () => {
    const g = guard(
      'No, cerramos el Día de los Veteranos (miércoles 11 de noviembre). Abrimos el jueves 12 de noviembre a las 7:00 a. m. La cuota es $1.890 al mes; fiebre desde 100,4 °F.',
      facts,
    )
    expect(g.unsupported).toEqual([])
  })
  it('catches a wrong Spanish weekday', () => {
    expect(guard('Abrimos el viernes 12 de noviembre.', facts).unsupported).toContain('friday')
  })
  it('catches a Celsius conversion the facts never stated', () => {
    expect(guard('La fiebre empieza en 38 °C.', facts).unsupported).toContain('38')
  })
  it('passes faithful Chinese and catches a wrong weekday', () => {
    expect(guard('11月11日（星期三）退伍军人节我们不开门，11月12日星期四早上7:00重新开放。', facts).passed).toBe(true)
    expect(guard('我们星期五重新开放。', facts).unsupported).toContain('friday')
  })
  it('passes faithful Vietnamese', () => {
    expect(guard('Chúng tôi đóng cửa vào thứ Tư, 11/11 và mở lại vào thứ Năm 12/11 lúc 7:00 sáng.', facts).passed).toBe(true)
  })
})

describe('guard catches omissions', () => {
  const draft =
    "Today's lunch is mac & cheese. Because Maya's profile lists a dairy allergy, the kitchen will serve rice & black beans. We can provide a backup lunch for $6 before the kitchen count closes at 9:30am."
  it('passes a complete translation', () => {
    const es =
      'El almuerzo de hoy es macarrones con queso. Como Maya tiene alergia a los lácteos, le servirán arroz con frijoles. Podemos darle un almuerzo de respaldo por $6 antes de las 9:30 a. m.'
    expect(guard(es, [draft], draft).passed).toBe(true)
  })
  it('rejects a translation that drops the cutoff time', () => {
    const g = guard('Podemos darle un almuerzo de respaldo por $6.', [draft], draft)
    expect(g.passed).toBe(false)
    expect(g.missing).toContain('9:30')
  })
  it('checks abbreviated Spanish weekdays', () => {
    const d = "We're closed Wed, Nov 11. We reopen Thursday, Nov 12 at 7:00am."
    expect(guard('Cerramos el mié., 11 de nov. Reabrimos el jueves 12 de nov a las 7:00 am.', [d], d).passed).toBe(true)
    expect(guard('Cerramos el vie., 11 de nov. Reabrimos el jueves 12 de nov a las 7:00 am.', [d], d).unsupported).toContain('friday')
  })
})
