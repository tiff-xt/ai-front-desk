import type { GuardResult } from './types'

/**
 * The grounding guard. An LLM may rephrase or translate an answer, but every
 * checkable claim in its output — numbers, prices, times, temperatures,
 * weekdays, months — must already appear in the facts we computed. If
 * anything doesn't, we discard the LLM text and fall back to the template.
 *
 * It works across languages: "$1.890" (Spanish thousands), "100,4" (decimal
 * comma), "jueves", "星期四" and "thứ năm" all normalize to the same canonical
 * claims as the English facts they must match.
 *
 * It's intentionally strict: a false alarm costs some warmth; a false pass
 * could tell a parent the wrong closing time.
 */

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']

/** Weekday names in the languages we support, Monday first. Matched as whole words. */
const WEEKDAY_WORDS: Record<string, string[]> = {
  en: WEEKDAYS.map((d) => `${d.slice(0, 3)}(?:${d.slice(3)})?`),
  es: [
    'lun(?:es|\\.)',
    'mar(?:tes|\\.)',
    'mi[ée](?:rcoles|\\.)',
    'jue(?:ves|\\.)',
    'vie(?:rnes|\\.)',
    's[áa]b(?:ado|\\.)',
    'dom(?:ingo|\\.)',
  ],
  fr: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'],
  pt: ['segunda(?:-feira)?', 'ter[çc]a(?:-feira)?', 'quarta(?:-feira)?', 'quinta(?:-feira)?', 'sexta(?:-feira)?', 's[áa]bado', 'domingo'],
  vi: ['th[ứu] hai', 'th[ứu] ba', 'th[ứu] t[ưu]', 'th[ứu] n[ăa]m', 'th[ứu] s[áa]u', 'th[ứu] b[ảa]y', 'ch[ủu] nh[ậa]t'],
}
/** Chinese weekdays aren't space-delimited, so they're matched without word boundaries. */
const ZH_WEEKDAYS = [
  '(?:星期|周|週|礼拜)一',
  '(?:星期|周|週|礼拜)二',
  '(?:星期|周|週|礼拜)三',
  '(?:星期|周|週|礼拜)四',
  '(?:星期|周|週|礼拜)五',
  '(?:星期|周|週|礼拜)六',
  '(?:星期|周|週|礼拜)[日天]',
]

const MONTH_WORDS: Record<string, string[]> = {
  en: MONTHS.map((m) => (m === 'may' ? 'may(?!\\s+(?:i|we|you|be|need|come|also)\\b)' : `${m.slice(0, 3)}(?:${m.slice(3)})?`)),
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  fr: ['janvier', 'f[ée]vrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'ao[ûu]t', 'septembre', 'octobre', 'novembre', 'd[ée]cembre'],
  pt: ['janeiro', 'fevereiro', 'mar[çc]o', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
}

/** Canonical number strings. Thousands separators are dropped, decimal commas become dots. */
function numbers(text: string): string[] {
  const out: string[] = []
  for (const m of text.matchAll(/\d(?:[\d.,:]*\d)?/g)) {
    let raw = m[0]
    if (/^\d{1,3}([.,]\d{3})+$/.test(raw))
      raw = raw.replace(/[.,]/g, '') // 1,890 · 1.890
    else raw = raw.replace(/,(\d{1,2})$/, '.$1').replace(/,/g, '') // 100,4 → 100.4
    out.push(raw)
    // "7:00" also licenses a bare "7" ("7am", "7 h"); "100.4" stays exact.
    if (raw.includes(':')) {
      out.push(raw.split(':')[0])
      if (raw.endsWith(':00')) out.push(raw.slice(0, -3))
    }
    // "7h30" / "7h" (French style) → 7:30 / 7
  }
  for (const m of text.matchAll(/\b(\d{1,2})h(\d{2})?\b/g)) out.push(m[2] ? `${m[1]}:${m[2]}` : m[1])
  return out
}

function words(text: string): string[] {
  const t = text.toLowerCase()
  const found = new Set<string>()
  for (const list of Object.values(WEEKDAY_WORDS))
    list.forEach((re, i) => {
      if (new RegExp(`(?<![\\p{L}])${re}(?![\\p{L}])`, 'u').test(t)) found.add(WEEKDAYS[i])
    })
  ZH_WEEKDAYS.forEach((re, i) => {
    if (new RegExp(re).test(t)) found.add(WEEKDAYS[i])
  })
  for (const list of Object.values(MONTH_WORDS))
    list.forEach((re, i) => {
      if (new RegExp(`(?<![\\p{L}])${re}(?![\\p{L}])`, 'u').test(t)) found.add(MONTHS[i])
    })
  // 11月 (Chinese/Japanese month)
  for (const m of t.matchAll(/(\d{1,2})\s?月/g)) found.add(MONTHS[+m[1] - 1] ?? '')
  found.delete('')
  return [...found]
}

/**
 * @param draft When given, the check runs both ways: every number in the draft
 *   must survive into the candidate. A translation that drops "dairy allergy,
 *   $6, 9:30am" down to "$6" is as wrong as one that invents a price.
 */
export function guard(candidate: string, grounding: string[], draft?: string): GuardResult {
  const allowed = grounding.join('\n')
  const allowedNums = new Set(numbers(allowed))
  const allowedWords = new Set(words(allowed))
  // A month written as a number in the answer ("11月", "11/11") is licensed by its name in the facts.
  MONTHS.forEach((m, i) => allowedWords.has(m) && allowedNums.add(String(i + 1)))

  const claimsNums = [...new Set(numbers(candidate))]
  const claimsWords = words(candidate)
  const unsupported = [...claimsNums.filter((n) => !allowedNums.has(n)), ...claimsWords.filter((w) => !allowedWords.has(w))]

  const present = new Set(claimsNums)
  const missing = draft
    ? [...new Set([...draft.matchAll(/\d(?:[\d.,:]*\d)?/g)].map((m) => numbers(m[0])[0]))].filter(
        (n) => !present.has(n) && !(n.endsWith(':00') && present.has(n.slice(0, -3))),
      )
    : []

  return { passed: unsupported.length === 0 && missing.length === 0, checked: [...claimsNums, ...claimsWords], unsupported, missing }
}
