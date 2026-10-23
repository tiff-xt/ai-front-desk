import type { AgeBandId, ISODate, Knowledge } from '@/data/types'
import { addDays, monthIndex, weekday, WEEKDAY_NAMES } from '@/lib/time'
import { normalize } from '@/lib/text'
import { searchHandbook } from './retrieve'
import type { AnyTopic, Symptom } from './types'

export { normalize }

/**
 * Rule-based understanding. It's the first pass for every question and the
 * whole pipeline when no LLM is configured. Safety screens run first and can't
 * be overridden by anything later, including the LLM.
 */

const has = (q: string, patterns: (string | RegExp)[]) => patterns.some((p) => (typeof p === 'string' ? q.includes(p) : p.test(q)))

// Order matters: the first screen that matches wins.
const SCREENS: { topic: AnyTopic; patterns: (string | RegExp)[] }[] = [
  {
    topic: 'emergency',
    patterns: [
      /not breathing|can'?t breathe|trouble breathing|stopped breathing|turning blue|unconscious|unresponsive|seizure|choking|anaphyla|epi ?pen|overdose|poison/,
      /\b(911|emergency)\b/,
      /\b(missing|can'?t find)\b.*\b(child|kid|son|daughter)\b/,
    ],
  },
  {
    topic: 'privacy',
    patterns: [
      /who (bit|hit|hurt|pushed|scratched|kicked)/,
      /(other|another) (child|kid|family|parent)'?s?\b/,
      /\bwhich (child|kid)\b/,
      /(address|phone|number|last name) (of|for) /,
    ],
  },
  {
    topic: 'custody',
    patterns: [/custody|court order|restraining|protective order|not allowed to pick|ex[- ]?(husband|wife|partner)|my ex\b|divorce/],
  },
  {
    topic: 'incidents',
    patterns: [
      /\b(bit (him|her|my|me)|was bit|got bit|bitten|biting|bites|got hurt|was hurt|hurt (him|her)self|injur|bruise|bump on|bleed|scratched|fell|fall (down|off)|hit by|hit (his|her|their|my) head|bumped (his|her|their) head|head injury|pushed|stitches|concussion|came home with)/,
      /\b(abuse|neglect|mistreat|rough|yelled at|grabbed)\b/,
      /\b(complain|complaint|unhappy with|upset with)\b/,
    ],
  },
  {
    topic: 'medical',
    patterns: [/allergic reaction|hives|swelling|inhaler|asthma attack|medication|medicine|tylenol|motrin|ibuprofen|antibiotic|dose/],
  },
  {
    topic: 'billing',
    patterns: [
      /refund|overcharg|charged twice|double charg|dispute|wrong amount|billing (error|issue|question)|autopay|invoice|payment (failed|issue)|can'?t (afford|pay)/,
    ],
  },
]

const INTENTS: { topic: AnyTopic; patterns: (string | RegExp)[] }[] = [
  {
    topic: 'illness',
    patterns: [
      /fever|temperature|\btemp\b|\d{2,3}(\.\d)? ?(°|degrees|f\b)|\b(9[7-9]|10[0-5])\.\d\b|sick|\bill\b|vomit|throw(ing|n)? up|threw up|puk|diarrh|stomach bug|\brash|pink ?eye|conjunctivitis|lice|cough|runny nose|congest|\bcold\b|strep|flu\b|covid/,
    ],
  },
  { topic: 'lunch', patterns: [/lunch|menu|snack|food|\beat\b|meal|forgot.*(pack|bring)|hungry/] },
  { topic: 'tours', patterns: [/\btour|visit the (center|school)|come (see|look)|look around|see the (center|school|classroom)/] },
  {
    topic: 'tuition',
    patterns: [/tuition|how much|\bcosts?\b|price|\brates?\b|\bfees?\b|per month|monthly|sibling discount|afford|\$/],
  },
  {
    topic: 'hours',
    patterns: [
      /\bopen\b|closed?\b|closing|hours|holiday|\bbreak\b|day off|school (on|tomorrow|today|monday|tuesday|wednesday|thursday|friday)|is there (school|care)|calendar/,
    ],
  },
]

export interface Understanding {
  topic: AnyTopic
  matched: string
  date?: ISODate
  dateLabel?: string
  symptom?: Symptom
  temp?: number
  band?: AgeBandId
  wantsBackupLunch?: boolean
}

/** Well-known days that may or may not be center closures. Knowing them lets us say "yes, we're open" instead of guessing. */
const KNOWN_DAYS: [RegExp, ISODate, string][] = [
  [/halloween/, '2026-10-31', 'Halloween'],
  [/election day/, '2026-11-03', 'Election Day'],
  [/veteran/, '2026-11-11', 'Veterans Day'],
  [/thanksgiving eve|day before thanksgiving/, '2026-11-25', 'Thanksgiving Eve'],
  [/black friday|day after thanksgiving/, '2026-11-27', 'the day after Thanksgiving'],
  [/thanksgiving/, '2026-11-26', 'Thanksgiving'],
  [/christmas eve/, '2026-12-24', 'Christmas Eve'],
  [/christmas|xmas/, '2026-12-25', 'Christmas'],
  [/new year'?s eve/, '2026-12-31', "New Year's Eve"],
  [/new year/, '2027-01-01', "New Year's Day"],
  [/mlk|martin luther/, '2027-01-18', 'Martin Luther King Jr. Day'],
  [/valentine/, '2027-02-14', "Valentine's Day"],
  [/president/, '2027-02-15', "Presidents' Day"],
  [/good friday/, '2027-03-26', 'Good Friday'],
  [/memorial/, '2027-05-31', 'Memorial Day'],
  [/juneteenth/, '2027-06-18', 'Juneteenth (observed)'],
  [/(4th|fourth) of july|july (4|fourth)|independence day/, '2027-07-05', 'Independence Day (observed)'],
  [/labor day/, '2026-09-07', 'Labor Day'],
  [/indigenous|columbus/, '2026-10-12', "Indigenous Peoples' Day"],
  [/fall festival/, '2026-10-30', 'Fall Festival'],
  [/winter break/, '2026-12-24', 'Winter Break'],
]

export function extractDate(q: string, today: ISODate): { date: ISODate; label: string } | null {
  if (/\btoday\b|this morning|right now|tonight/.test(q)) return { date: today, label: 'today' }
  if (/\btomorrow\b/.test(q)) return { date: addDays(today, 1), label: 'tomorrow' }
  for (const [re, date, label] of KNOWN_DAYS) if (re.test(q)) return { date, label }

  const md = q.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.? (\d{1,2})(st|nd|rd|th)?\b/)
  const slash = q.match(/\b(\d{1,2})\/(\d{1,2})\b/)
  let month: number | null = null
  let day: number | null = null
  if (md) {
    month = monthIndex(md[1])
    day = +md[2]
  } else if (slash) {
    month = +slash[1] - 1
    day = +slash[2]
  }
  if (month !== null && day && month >= 0 && month < 12 && day <= 31) {
    // The school year spans two calendar years; choose the next occurrence.
    const year = +today.slice(0, 4)
    let iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (iso < addDays(today, -60)) iso = `${year + 1}${iso.slice(4)}`
    return { date: iso, label: iso }
  }

  const wd = WEEKDAY_NAMES.findIndex((n) => new RegExp(`\\b${n.toLowerCase()}`).test(q))
  if (wd !== -1) {
    let delta = (wd - weekday(today) + 7) % 7
    if (/\bnext\b/.test(q) && delta < 7) delta += delta === 0 ? 7 : 7
    if (delta === 0 && !/\btoday\b/.test(q)) delta = 7
    return { date: addDays(today, delta), label: WEEKDAY_NAMES[wd] }
  }
  return null
}

export function extractSymptom(q: string): { symptom: Symptom; temp?: number } {
  const t = q.match(/\b(9\d|10\d)(\.\d)?\b/)
  const temp = t ? parseFloat(t[0]) : undefined
  if (/vomit|throw(ing|n)? up|threw up|puk|diarrh|stomach bug/.test(q)) return { symptom: 'gi', temp }
  if (/pink ?eye|conjunctivitis|goopy|eye discharge/.test(q)) return { symptom: 'pinkeye', temp }
  if (/lice|nits/.test(q)) return { symptom: 'lice', temp }
  if (/rash|spots|hives/.test(q)) return { symptom: 'rash', temp }
  if (/fever|temperature|\btemp\b|hot to the touch/.test(q) || temp !== undefined) return { symptom: 'fever', temp }
  if (/cough|runny nose|congest|\bcold\b|sniffl/.test(q)) return { symptom: 'cold', temp }
  return { symptom: 'unsure', temp }
}

export function extractBand(q: string): AgeBandId | undefined {
  if (/infant|baby|babies|newborn|\b([1-9]|1[0-7]) ?(month|mo)/.test(q)) return 'infant'
  if (/toddler|\b(18|2[0-9]|3[0-5]) ?(month|mo)|\b(2|two) ?(year|yr)/.test(q)) return 'toddler'
  if (/pre-?k|prek|\b(4|5|four|five) ?(year|yr)/.test(q)) return 'prek'
  if (/preschool|\b(3|three) ?(year|yr)/.test(q)) return 'preschool'
  return undefined
}

export function understand(raw: string, k: Knowledge, today: ISODate): Understanding {
  const q = normalize(raw)
  const date = extractDate(q, today)
  const base = { date: date?.date, dateLabel: date?.label }

  for (const s of SCREENS) {
    const hit = s.patterns.find((p) => (typeof p === 'string' ? q.includes(p) : p.test(q)))
    if (!hit) continue
    // "Medicine" questions that are really about the illness policy stay with illness.
    if (s.topic === 'medical' && /fever|temperature/.test(q) && !/allergic|hives|swelling|inhaler|asthma/.test(q)) break
    return { ...base, topic: s.topic, matched: `guardrail: ${String(hit)}` }
  }

  // Answers an operator wrote from the Gaps view are the most specific knowledge we have; they win over generic intents.
  const faq = searchHandbook(k, raw).find((h) => h.section.origin === 'operator-answer' && h.score >= 4)
  if (faq) return { ...base, topic: 'policies', matched: `operator answer “${faq.section.title}”` }

  for (const i of INTENTS) {
    if (!has(q, i.patterns)) continue
    const out: Understanding = { ...base, topic: i.topic, matched: i.topic }
    if (i.topic === 'illness') Object.assign(out, extractSymptom(q))
    if (i.topic === 'tuition') out.band = extractBand(q)
    if (i.topic === 'lunch') out.wantsBackupLunch = /forgot|provide|buy|order|extra|backup|can you (make|give|feed)|didn'?t pack/.test(q)
    // A date with no other intent ("Are you open Nov 11?" already matched) still means hours.
    return out
  }

  // A handbook policy beats a bare date ("Can grandma pick up Friday?" is about pick-up, not hours).
  if (searchHandbook(k, raw).length) return { ...base, topic: 'policies', matched: 'handbook keywords' }

  // A bare date means hours only when there's little else in the question ("Thanksgiving?", "school Monday?").
  // "Do kids need costumes for Halloween?" mentions a date but isn't about hours, so it must not get one.
  const rest = q
    .replace(/\b(are|you|we|is|it|the|on|for|this|next|a|do|does|any)\b/g, '')
    .split(' ')
    .filter((w) => w.length > 2)
  if (date && (/\b(school|care|come in|drop ?off|there)\b/.test(q) || rest.length <= 2))
    return { ...base, topic: 'hours', matched: 'date mention' }

  return { ...base, topic: 'unknown', matched: 'no rule matched' }
}
