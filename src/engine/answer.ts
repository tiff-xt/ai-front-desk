import type { Child, Family, Knowledge } from '@/data/types'
import { roomNames } from '@/data/seed'
import { addDays, formatDay, formatDayLong, formatTime, relativeDay, usd, type Clock } from '@/lib/time'
import {
  bandFor,
  dayStatus,
  earliestReturn,
  familyTuition,
  lunchPlan,
  nextSchoolDay,
  replyExpectation,
  skippedClosures,
  thisMorning,
  tourSlots,
} from './policy'
import { searchHandbook } from './retrieve'
import type { Answer, AnyTopic, Autonomy, Card, Citation, Status, Topic } from './types'
import { normalize } from '@/lib/text'
import { understand, type Understanding } from './understand'

export interface EngineInput {
  question: string
  knowledge: Knowledge
  family: Family
  now: Clock
  childId: string
  autonomy: Record<Topic, Autonomy>
  bookedTours: string[]
}

interface Draft {
  status: Status
  text: string
  card?: Card
  sources: Citation[]
  facts?: string[]
  steps?: string[]
  followUps?: string[]
  /** Ask staff to look even though the parent got an answer (missing data, after cutoff…). */
  notifyStaff?: boolean
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const pronoun = (c: Child) => c.pronoun

// ─── Citations: the exact words a parent can tap to verify ──────────────────

export function illnessPolicyText(k: Knowledge) {
  const i = k.illness
  return [
    `Fever: a temperature of ${i.feverF}°F or higher. Children must be fever-free for ${i.feverFreeHours} hours without fever-reducing medicine before returning.`,
    `Vomiting or diarrhea: ${i.giEpisodes} or more episodes in a day means staying home until ${i.giFreeHours} hours symptom-free.`,
    `Pink eye with discharge: may return ${i.pinkEyeTreatmentHours} hours after starting prescribed treatment, or with a doctor's note.`,
    `Rash with fever: requires a doctor's note to return.`,
    `Head lice: may return after the first treatment.`,
    `Mild cold symptoms without fever (runny nose, light cough) are fine if your child can join normal activities.`,
  ].join(' ')
}

const cite = {
  calendar: (k: Knowledge, excerpt: string): Citation => ({ ...k.calendar.meta, excerpt }),
  tuition: (k: Knowledge): Citation => ({
    ...k.tuition.meta,
    excerpt:
      k.tuition.bands.map((b) => `${b.label} (${b.ages}): ${usd(b.fullTime)}/mo full-time, ${usd(b.partTime)}/mo part-time.`).join(' ') +
      ` Registration ${usd(k.tuition.registrationFee)}/yr. Sibling discount ${k.tuition.siblingDiscountPct}% off the older child's tuition.`,
  }),
  illness: (k: Knowledge): Citation => ({ ...k.illness.meta, excerpt: illnessPolicyText(k) }),
  lunch: (k: Knowledge): Citation => ({
    ...k.lunch.meta,
    excerpt: `Forgot lunch? We can provide a backup hot lunch for ${usd(k.lunch.backupPrice)}, charged to your account. Requests must be in by ${formatTime(k.lunch.cutoff)} so the kitchen can plan. Children with allergies on file automatically receive the allergen-free alternate. Infants eat food from home.`,
  }),
  tours: (k: Knowledge): Citation => ({
    ...k.tours.meta,
    excerpt: `Tours are ${k.tours.durationMin} minutes with ${k.center.directorShort}, on ${k.tours.days.map((d) => ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'][d]).join(' and ')} at ${k.tours.times.map(formatTime).join(' and ')}.`,
  }),
  section: (k: Knowledge, id: string): Citation | null => {
    const s = k.handbook.find((h) => h.id === id)
    return s ? { id: s.id, title: s.title, updatedAt: s.updatedAt, updatedBy: s.updatedBy, excerpt: s.body } : null
  },
}

// ─── Resolvers ──────────────────────────────────────────────────────────────

function hours(k: Knowledge, u: Understanding, now: Clock, family: Family): Draft {
  const hoursLine = `Regular hours are Monday–Friday, ${formatTime(k.center.open)}–${formatTime(k.center.close)}.`
  const date = u.date ?? now.date
  const s = dayStatus(k, date)
  const rel = relativeDay(date, now.date)
  // "Veterans Day" is worth repeating back; "Wednesday" or "today" is not.
  const named = u.dateLabel && !/^\d|^(today|tomorrow)$|^(mon|tues|wednes|thurs|fri|satur|sun)day$/i.test(u.dateLabel) ? u.dateLabel : null
  const md = formatDay(date).split(', ')[1]
  const when = named
    ? `on ${named} (${formatDay(date)})`
    : rel === formatDay(date)
      ? `on ${rel}`
      : rel.startsWith('this ')
        ? `${rel}, ${md}`
        : `${rel} (${formatDay(date)})`
  const next = nextSchoolDay(k, date)
  const closure = k.calendar.closures.find((c) => c.date === date)

  let text: string
  let status: Status = 'answered'
  let notifyStaff = false
  let card: Card
  if (s.state === 'open') {
    text = `Yes, we're open ${when}, regular hours ${formatTime(s.open)}–${formatTime(s.close)}.`
    card = { kind: 'day', date, state: 'open', open: s.open, close: s.close }
  } else if (s.state === 'early') {
    text = `We're open ${when}, but closing early at ${formatTime(s.close)} for ${s.name}. Please plan pick-up by then.`
    card = { kind: 'day', date, state: 'early', name: s.name, open: s.open, close: s.close }
  } else if (s.state === 'closed') {
    text = `No, we're closed ${when}${named === s.name ? '' : ` for ${s.name}`}.${next ? ` We reopen ${formatDayLong(next)} at ${formatTime(k.center.open)}.` : ''}`
    card = { kind: 'day', date, state: 'closed', name: s.name, nextOpen: next ?? undefined }
  } else if (s.state === 'weekend') {
    text = `We're closed on weekends.${next ? ` Next open ${formatDay(next)} at ${formatTime(k.center.open)}.` : ''}`
    card = { kind: 'day', date, state: 'weekend', nextOpen: next ?? undefined }
  } else {
    status = 'caveat'
    notifyStaff = true
    text = `${formatDay(date)} is past our published calendar (through ${formatDay(k.calendar.publishedThrough)}), so I don't want to guess. I've asked ${k.center.directorShort} to confirm. ${hoursLine}`
    card = { kind: 'day', date, state: 'unpublished' }
  }
  if (!u.date)
    text = `${hoursLine} ${text.replace(/^Yes, we're open today, regular hours [^.]+\./, `We're open today until ${formatTime(k.center.close)}.`)}`

  // Personal context: anything happening in this family's classrooms that day.
  const events = k.calendar.events.filter((e) => e.date === date && family.children.some((c) => c.room === e.room))
  for (const e of events) {
    const child = family.children.find((c) => c.room === e.room)!
    text += ` Heads up: ${child.name}'s class has a ${e.title.toLowerCase()} that day. ${e.note}`
  }

  const excerpt = closure
    ? `${formatDay(closure.date)}: ${closure.name} — ${closure.kind === 'closed' ? 'closed' : `closes at ${formatTime(closure.closeAt!)}`}. ${hoursLine}`
    : `${hoursLine} No closures are scheduled for ${formatDay(date)}. Calendar published through ${formatDay(k.calendar.publishedThrough)}.`
  const skipped = next ? skippedClosures(k, addDays(date, 1), next) : []
  return {
    status,
    text,
    card,
    notifyStaff,
    sources: [cite.calendar(k, excerpt)],
    facts: skipped.map((c) => `${formatDay(c.date)} ${c.name}`),
    steps: [`Resolved date: ${formatDay(date)} (${u.dateLabel ?? 'default: today'})`, `Calendar state: ${s.state}`],
    followUps: s.state === 'closed' ? ['What about the next closure?'] : undefined,
  }
}

function tuition(k: Knowledge, u: Understanding, family: Family): Draft {
  const fees = `There's a ${usd(k.tuition.registrationFee)} annual registration fee, and siblings get ${k.tuition.siblingDiscountPct}% off the older child's tuition.`
  if (u.band) {
    const b = bandFor(k, u.band)!
    return {
      status: 'answered',
      text: `${b.label} tuition (${b.ages}) is ${usd(b.fullTime)}/month full-time (5 days) or ${usd(b.partTime)}/month part-time (3 days). Our ${b.label.toLowerCase()} ratio is ${b.ratio}. ${fees}`,
      card: { kind: 'tuition', highlight: [b.id] },
      sources: [cite.tuition(k)],
      steps: [`Age band from question: ${b.label}`],
    }
  }
  const { lines, total } = familyTuition(k, family.children)
  const parts = lines.map(
    (l) =>
      `${l.child.name} (${l.band.label}, ${l.child.schedule === 'full' ? 'full-time' : 'part-time'}) is ${usd(l.base)}${l.discount ? ` minus the ${k.tuition.siblingDiscountPct}% sibling discount, so ${usd(l.total)}` : ''}`,
  )
  return {
    status: 'answered',
    text: `Your monthly tuition is ${usd(total)}: ${parts.join(', and ')}. ${fees}`,
    card: { kind: 'tuition', highlight: family.children.map((c) => c.band) },
    sources: [cite.tuition(k)],
    facts: lines.map((l) => `${l.child.name} ${usd(l.base)} ${usd(l.discount)} ${usd(l.total)}`),
    steps: [
      'No age band in question → used this family’s enrollment',
      `Sibling discount applied to ${lines.find((l) => l.discount)?.child.name ?? 'nobody'}`,
    ],
  }
}

function illness(k: Knowledge, u: Understanding, child: Child, now: Clock): Draft {
  const i = k.illness
  const symptom = u.symptom ?? 'unsure'
  const he = pronoun(child)
  const card: Card = { kind: 'illness', childId: child.id, symptom, temp: u.temp }
  const base = { card, sources: [cite.illness(k)] }

  const ret = (hours: number) => {
    const r = earliestReturn(k, { lastSymptom: thisMorning(now), hours })
    if (!r.earliest) return ''
    const skip = r.skipped.length ? ` (${r.skipped.map((c) => `${formatDay(c.date)} is ${c.name}`).join(', ')})` : ''
    return ` If ${he} had symptoms this morning, the earliest return is ${formatDay(r.earliest.date)} at ${formatTime(r.earliest.minutes)}${skip}. Use the checker below to get the exact time.`
  }

  switch (symptom) {
    case 'fever':
      if (u.temp !== undefined && u.temp < i.feverF) {
        return {
          ...base,
          status: 'caveat',
          text: `${u.temp}°F is under our ${i.feverF}°F fever line, so ${child.name} can come in if ${he}'s acting like ${he === 'she' ? 'herself' : 'himself'}. Please don't give fever reducer before drop-off. It can hide a rising fever, and teachers will call you if ${he} reaches ${i.feverF}°F.`,
          steps: [`Temperature ${u.temp}°F < threshold ${i.feverF}°F`],
        }
      }
      return {
        ...base,
        status: 'answered',
        text: `${u.temp !== undefined ? `At ${u.temp}°F, ` : ''}${child.name} should stay home today. With a fever of ${i.feverF}°F or higher, children need to be fever-free for ${i.feverFreeHours} hours without fever-reducing medicine before coming back.${ret(i.feverFreeHours)}`,
        steps: [
          u.temp !== undefined
            ? `Temperature ${u.temp}°F ≥ ${i.feverF}°F`
            : 'Fever mentioned, no temperature given → assume at/over threshold',
        ],
      }
    case 'gi':
      return {
        ...base,
        status: 'answered',
        text: `With ${i.giEpisodes} or more episodes of vomiting or diarrhea, ${child.name} should stay home until ${he}'s been symptom-free for ${i.giFreeHours} hours.${ret(i.giFreeHours)} A single episode with no other symptoms is okay, but tell the teacher at drop-off.`,
      }
    case 'pinkeye':
      return {
        ...base,
        status: 'answered',
        text: `For pink eye with discharge, ${child.name} can return ${i.pinkEyeTreatmentHours} hours after starting prescribed eye drops, or sooner with a doctor's note saying ${he}'s not contagious.`,
      }
    case 'rash':
      return {
        ...base,
        status: 'caveat',
        notifyStaff: true,
        text: `If the rash comes with a fever, ${child.name} needs a doctor's note before returning. Without a fever, rashes vary a lot, so I've asked ${k.center.directorShort} to take a look. You can reply here with a photo.`,
      }
    case 'cold':
      return {
        ...base,
        status: 'answered',
        text: `A runny nose or light cough without a fever is fine, so ${child.name} can come in if ${he} can join normal activities. Keep ${he === 'she' ? 'her' : 'him'} home if a fever of ${i.feverF}°F or higher shows up.`,
      }
    case 'lice':
      return {
        ...base,
        status: 'answered',
        text: `${child.name} can come back after the first lice treatment. Please let the teacher know so we can check the classroom.`,
      }
    default:
      return {
        ...base,
        status: 'answered',
        text: `I'm sorry ${child.name} isn't feeling well. Tell me the symptom below and I'll check it against our illness policy and work out when ${he} can come back.`,
      }
  }
}

function lunch(k: Knowledge, u: Understanding, child: Child, now: Clock): Draft {
  const date = u.date ?? now.date
  const plan = lunchPlan(k, child, date, now)
  const rel = relativeDay(date, now.date)
  const card: Card = { kind: 'lunch', date, childId: child.id }
  const sources = [cite.lunch(k)]
  const steps = [`Date: ${formatDay(date)}`, `${child.name}'s allergies on file: ${child.allergies.join(', ') || 'none'}`]

  if (plan.reason === 'closed') return { status: 'answered', text: `We're closed ${rel}, so there's no lunch service.`, sources, steps }
  if (plan.reason === 'no-menu' || !plan.menu)
    return {
      status: 'caveat',
      notifyStaff: true,
      text: `The kitchen hasn't posted the menu for ${formatDay(date)} yet, so I don't want to guess. I've asked ${k.center.directorShort}.`,
      sources,
      steps: [...steps, `Menu planned through ${formatDay(k.lunch.plannedThrough)}`],
    }

  const m = plan.menu
  let text = `${cap(rel)}'s lunch is ${m.lunch.toLowerCase()}, with ${m.snack.toLowerCase()} for snack.`
  if (plan.servesAlternate) {
    text += ` Because ${child.name}'s profile lists a ${plan.conflicts.join(' and ')} allergy, the kitchen will serve ${m.alternate.toLowerCase()} instead.`
    steps.push(`Allergen conflict: ${plan.conflicts.join(', ')} → alternate`)
  }
  let status: Status = 'answered'
  let notifyStaff = false
  if (u.wantsBackupLunch) {
    if (plan.canRequest) {
      text += ` Yes, we can provide a backup lunch for ${usd(k.lunch.backupPrice)}, added to your account. Tap below to add ${child.name} before the kitchen count closes at ${formatTime(k.lunch.cutoff)}.`
    } else if (plan.reason === 'after-cutoff') {
      status = 'caveat'
      notifyStaff = true
      text += ` The kitchen count closed at ${formatTime(k.lunch.cutoff)}, so I can't add ${child.name} automatically. I've flagged it for ${k.center.directorShort}. The kitchen usually has a few extra portions, and nobody goes hungry.`
    } else if (plan.reason === 'infant') {
      status = 'caveat'
      text = `${child.name} is in ${roomNames[child.room]}, and infants eat food and bottles from home, so we can't substitute a kitchen lunch. If you can drop food off at the front desk, we'll label it and get it to the room.`
    }
  }
  return { status, text, card, sources, steps, notifyStaff }
}

function tours(k: Knowledge, now: Clock, booked: string[]): Draft {
  const slots = tourSlots(k, now, booked).slice(0, 2)
  const next = slots.map((s) => `${formatDay(s.date)} at ${formatTime(s.minutes)}`).join(' or ')
  return {
    status: 'answered',
    text: `We'd love to show you around. Tours are ${k.tours.durationMin} minutes with ${k.center.directorShort}.${next ? ` The next openings are ${next}. Pick a time below and it's booked.` : ''}`,
    card: { kind: 'tours' },
    sources: [cite.tours(k)],
  }
}

function policies(k: Knowledge, question: string): Draft | null {
  const hits = searchHandbook(k, question).sort(
    (a, b) => b.score - a.score || (b.section.origin === 'operator-answer' ? 1 : 0) - (a.section.origin === 'operator-answer' ? 1 : 0),
  )
  if (!hits.length) return null
  const top = hits[0]
  return {
    status: 'answered',
    text: top.section.body,
    sources: [cite.section(k, top.section.id)!],
    steps: hits.slice(0, 3).map((h) => `Handbook match “${h.section.title}” score ${h.score}`),
  }
}

/** The reply-time expectation lives on the handoff card, so these texts don't repeat it. */
function handoffText(k: Knowledge, topic: AnyTopic, child: Child) {
  switch (topic) {
    case 'incidents':
      return `I'm sorry, that sounds upsetting. This deserves a real conversation, not an automated answer, so I've sent it to ${k.center.directorShort} as a priority. If ${child.name} needs medical care, call 911 or your pediatrician first.`
    case 'custody':
      return `Thank you for telling us. Custody and pick-up restrictions are handled directly by ${k.center.directorShort} so nothing gets missed. I've sent this to her. Until any court documents are on file, we release children only to adults on your authorized pick-up list.`
    case 'privacy':
      return `I can't share information about other children. We protect every family's privacy, including yours. If something happened, ${k.center.directorShort} can talk it through with you directly, and I've let her know.`
    case 'billing':
      return `Thanks for flagging this. Billing questions about your account go straight to ${k.center.directorShort} so a person can look at the actual charges.`
    case 'medical':
      return `Medication and allergy questions are confirmed by a person. I've sent this to ${k.center.directorShort}.`
    default:
      return `I don't have a confirmed answer for that yet, and I'd rather not guess. I've sent your question to ${k.center.directorShort}.`
  }
}

function staffDraftFor(k: Knowledge, family: Family, topic: AnyTopic, child: Child, question: string) {
  const first = family.parentName.split(' ')[0]
  switch (topic) {
    case 'incidents':
      return `Hi ${first}, thank you for reaching out about ${child.name}. I'd like to call you today to talk through what happened and what we're doing about it. What's a good number and time?\n\n${k.center.directorShort}`
    case 'custody':
      return `Hi ${first}, thank you for letting us know. Could you upload the court order (or bring a copy) so we can add the restriction to ${child.name}'s file? Until then, we only release ${child.name} to adults on your authorized list.\n\n${k.center.directorShort}`
    case 'privacy':
      return `Hi ${first}, I understand you're concerned. I can't share details about other children, but I can tell you what happened from ${child.name}'s side and what we've done about it. Can we talk at pick-up?\n\n${k.center.directorShort}`
    default:
      return `Hi ${first}, thanks for your question: "${question}". `
  }
}

// ─── The pipeline ───────────────────────────────────────────────────────────

const LOCKED: AnyTopic[] = ['emergency', 'privacy', 'unknown']

export function pickChild(question: string, family: Family, fallback: string) {
  const q = normalize(question)
  return (
    family.children.find((c) => new RegExp(`\\b${c.name.toLowerCase()}\\b`).test(q)) ??
    family.children.find((c) => c.id === fallback) ??
    family.children[0]
  )
}

export function answerQuestion(input: EngineInput, override?: Understanding): Answer {
  const { knowledge: k, family, now, question } = input
  const child = pickChild(question, family, input.childId)
  let u = override ?? understand(question, k, now.date)
  const steps: string[] = [
    `Asked about: ${child.name} (${child.id === input.childId ? 'selected child' : 'named in question'})`,
    `Understood as “${u.topic}” via ${u.matched}`,
  ]

  let draft: Draft | null = null
  switch (u.topic) {
    case 'hours':
      draft = hours(k, u, now, family)
      break
    case 'tuition':
      draft = tuition(k, u, family)
      break
    case 'illness':
      draft = illness(k, u, child, now)
      break
    case 'lunch':
      draft = lunch(k, u, child, now)
      break
    case 'tours':
      draft = tours(k, now, input.bookedTours)
      break
    case 'medical': {
      // Grounded policy as the staff draft; autonomy decides whether it goes out.
      draft = policies(k, question) ?? {
        status: 'answered',
        text: cite.section(k, 'handbook.medication')!.excerpt,
        sources: [cite.section(k, 'handbook.medication')!],
      }
      break
    }
    case 'policies':
    case 'unknown': {
      draft = policies(k, question)
      if (draft) u = { ...u, topic: 'policies' }
      else steps.push('No handbook section scored above threshold')
      break
    }
  }

  if (u.topic === 'emergency') {
    const text = `If this is an emergency, call 911 now. Then call us at ${k.center.phone} and we'll pick up right away.`
    return {
      topic: 'emergency',
      status: 'urgent',
      text,
      card: { kind: 'urgent' },
      sources: [],
      childId: child.id,
      trace: {
        classifier: 'rules',
        matched: u.matched,
        facts: [text],
        autonomy: 'locked',
        steps: [...steps, 'Safety screen: emergency → never answered by AI'],
        writer: 'template',
      },
    }
  }

  const level: Autonomy | 'locked' = LOCKED.includes(u.topic) ? 'locked' : input.autonomy[u.topic as Topic]
  steps.push(`Autonomy for “${u.topic}”: ${level}`)

  // Sensitive topics and anything the operator marked "always a person".
  if (!draft || level === 'human' || u.topic === 'privacy') {
    const helpful =
      u.topic === 'medical' ? cite.section(k, 'handbook.medication') : u.topic === 'custody' ? cite.section(k, 'handbook.pickup') : null
    const policyDraft = draft
    const text =
      draft && level === 'human' && !['incidents', 'custody', 'billing', 'medical'].includes(u.topic)
        ? `I've sent this to ${k.center.directorShort}, who answers these personally.`
        : handoffText(k, u.topic, child)
    const sources = [...(policyDraft?.sources ?? []), ...(helpful ? [helpful] : [])]
    return {
      topic: u.topic,
      status: 'handoff',
      text,
      card: { kind: 'handoff', reason: u.topic },
      sources,
      childId: child.id,
      staffDraft: policyDraft?.text
        ? `Hi ${family.parentName.split(' ')[0]}, ${policyDraft.text}\n\n${k.center.directorShort}`
        : staffDraftFor(k, family, u.topic, child, question),
      trace: {
        classifier: 'rules',
        matched: u.matched,
        facts: [text, ...sources.map((s) => s.excerpt)],
        autonomy: level,
        steps: [...steps, u.topic === 'unknown' ? 'No grounded answer → hand off instead of guessing' : 'Routed to a person'],
        writer: 'template',
      },
    }
  }

  if (level === 'review') {
    const text = `I've drafted an answer and ${k.center.directorShort} is double-checking it before it's sent. ${replyExpectation(k, now)}`
    return {
      topic: u.topic,
      status: 'review',
      text,
      sources: draft.sources,
      childId: child.id,
      staffDraft: draft.text,
      trace: {
        classifier: 'rules',
        matched: u.matched,
        facts: [draft.text, ...draft.sources.map((s) => s.excerpt)],
        autonomy: level,
        steps: [...steps, ...(draft.steps ?? []), 'Held for staff review'],
        writer: 'template',
      },
    }
  }

  return {
    topic: u.topic,
    status: draft.status,
    text: draft.text,
    card: draft.card,
    sources: draft.sources,
    childId: child.id,
    followUps: draft.followUps,
    staffDraft: draft.notifyStaff ? draft.text : undefined,
    trace: {
      classifier: 'rules',
      matched: u.matched,
      facts: [draft.text, ...(draft.facts ?? []), ...draft.sources.map((s) => s.excerpt)],
      autonomy: level,
      steps: [...steps, ...(draft.steps ?? [])],
      writer: 'template',
    },
  }
}

/** Whether staff should see this in their inbox. */
export const needsStaff = (a: Answer) =>
  a.status === 'handoff' || a.status === 'review' || a.status === 'urgent' || (a.status === 'caveat' && !!a.staffDraft)
