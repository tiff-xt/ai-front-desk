import type { Status } from '@/engine/types'
import { useStore } from '@/store/store'
import type { UiLang } from './lang'

/**
 * Parent-app interface strings in English and Spanish. Answers themselves are
 * translated per question (any language); this is the chrome around them, so
 * a Spanish-speaking parent never reads half an app in English.
 * Center data (menu items, policy names) stays as the operator wrote it.
 */

const DAYS = { en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], es: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'] }
const DAYS_LONG = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  es: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
}
const MONTHS = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
}

const wd = (iso: string) => new Date(iso + 'T00:00:00Z').getUTCDay()
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export const fmt = {
  /** "Wed, Nov 11" / "mié, 11 nov" */
  day: (iso: string, l: UiLang) =>
    l === 'es'
      ? `${DAYS.es[wd(iso)]}, ${+iso.slice(8, 10)} ${MONTHS.es[+iso.slice(5, 7) - 1]}`
      : `${DAYS.en[wd(iso)]}, ${MONTHS.en[+iso.slice(5, 7) - 1]} ${+iso.slice(8, 10)}`,
  /** "Wednesday, Nov 11" / "Miércoles, 11 nov" */
  dayLong: (iso: string, l: UiLang) =>
    l === 'es'
      ? `${cap(DAYS_LONG.es[wd(iso)])}, ${+iso.slice(8, 10)} ${MONTHS.es[+iso.slice(5, 7) - 1]}`
      : `${DAYS_LONG.en[wd(iso)]}, ${MONTHS.en[+iso.slice(5, 7) - 1]} ${+iso.slice(8, 10)}`,
  /** "WED 11" style short label */
  short: (iso: string, l: UiLang) => `${DAYS[l][wd(iso)]} ${+iso.slice(8, 10)}`,
  month: (iso: string, l: UiLang) => MONTHS[l][+iso.slice(5, 7) - 1].toUpperCase(),
}

const en = {
  officeOpen: (t: string) => `Front desk · office open until ${t}`,
  officeClosed: 'Front desk · answers 24/7, office closed',
  whichChild: 'Which child',
  greeting: (h: number): string => (h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'),
  intro: (child: string) =>
    `Ask anything about ${child}’s day, our policies or your account, in any language. Answers come from Willow & Wren’s own handbook, and a person steps in when it matters.`,
  today: 'Today',
  lunch: 'Lunch',
  openUntil: (t: string) => `Open until ${t}`,
  earlyClose: (t: string, n: string) => `Early close at ${t} · ${n}`,
  closedToday: (n: string, back: string) => `Closed${n ? ` · ${n}` : ''}${back ? `. Back ${back}` : ''}`,
  eatsFromHome: (c: string) => `${c} eats from home`,
  allergyFree: (alt: string, a: string, c: string) => `${alt} (${a}-free for ${c})`,
  closedNamed: (n: string) => `Closed · ${n}`,
  closesAt: (t: string, n: string) => `Closes ${t} · ${n}`,
  status: {
    answered: 'Answered',
    caveat: 'Answered, with a caveat',
    review: 'Staff is reviewing',
    handoff: 'With a person',
    urgent: 'Urgent',
  } as Record<Status, string>,
  why: 'Why this answer',
  thanks: 'Thanks!',
  thanksDown: 'Thanks. Staff will review this one.',
  helpful: 'Helpful',
  notHelpful: 'Not helpful',
  answered: 'answered',
  updated: 'updated',
  by: 'by',
  director: 'Director',
  checking: 'Checking the handbook…',
  ask: 'Ask the front desk…',
  listening: 'Listening…',
  askVoice: 'Ask by voice',
  send: 'Send',
  translatedFrom: 'Translated from English',
  showOriginal: 'Show original',
  hideOriginal: 'Hide original',
  noticeReply: 'Ms. Rivera replied to your question',
  noticeAnswer: 'Ms. Rivera answered a question you asked earlier',
  // cards
  addToCalendar: 'Add to calendar',
  open: 'Open',
  earlyCloseTitle: (n: string) => `Early close · ${n}`,
  closedTitle: (n: string) => `Closed · ${n}`,
  weekendTitle: 'Closed · weekend',
  unpublishedTitle: 'Not on the calendar yet',
  reopens: (d: string, t: string) => `Reopens ${d}, ${t}`,
  nextOpen: (d: string) => `Next open ${d}`,
  publishedThrough: (d: string) => `Published through ${d}`,
  program: 'Program',
  days5: '5 days',
  days3: '3 days',
  perMonth: (reg: string, pct: number) => `Per month · ${reg} annual registration · ${pct}% sibling discount on the older child`,
  ratio: 'ratio',
  checker: (c: string) => `Return-to-care checker · ${c}`,
  symptoms: { fever: 'Fever', gi: 'Vomiting / diarrhea', pinkeye: 'Pink eye', rash: 'Rash', cold: 'Cold / cough', lice: 'Lice' } as Record<
    string,
    string
  >,
  lastFever: (f: number) => `Last temperature at or over ${f}°F`,
  lastEpisode: 'Last episode',
  dropsStarted: 'Drops started',
  reducer: 'Fever reducer (Tylenol, Motrin)',
  none: 'None',
  lastNight: 'Last night',
  thisMorning: 'This morning',
  justNow: 'Just now',
  earliestReturn: 'Earliest return',
  clearRule: (h: number, kind: 'fever' | 'gi' | 'other') =>
    `${h} hours ${kind === 'fever' ? 'fever-free without medicine' : kind === 'gi' ? 'symptom-free' : 'after starting treatment'}`,
  clear: 'clear',
  isClosure: (d: string, n: string) => `${d} is ${n}`,
  coldOk: (c: string, p: string) => `No fever? ${c} can come in if ${p} can join normal activities.`,
  rashNote: (d: string) => `With a fever, a doctor’s note is needed. Without one, ${d} will take a look.`,
  liceOk: (c: string) => `${c} can return after the first treatment.`,
  reportAbsent: (c: string) => `Report ${c} absent`,
  absenceReported: 'Absence reported',
  absenceNote: (c: string, until: string) => `${c} is marked absent${until}. Teachers have been told. Feel better, ${c}!`,
  until: (d: string) => ` until ${d}`,
  gets: (c: string) => `${c} gets:`,
  free: (a: string) => `${a}-free`,
  snack: 'Snack',
  addLunch: (c: string, p: string) => `Add ${c} to lunch · ${p}`,
  addedLunch: 'Added to today’s count',
  lunchNote: (c: string, alt: string, p: string) => `${c} is on today’s lunch count${alt}. ${p} will be added to your account.`,
  withAlt: (a: string) => ` with the ${a}-free alternate`,
  countCloses: (h: number, m: number) => `Kitchen count closes in ${h > 0 ? `${h}h ` : ''}${m}m`,
  tourBooked: 'Tour booked',
  tourWith: (d: string) => `with ${d}`,
  chooseTime: 'Choose a time',
  book: (d: string, t: string) => `Book ${d} · ${t}`,
  tourNote: (d: string, t: string, who: string) => `Tour booked for ${d} at ${t}. ${who} will meet you at the front door.`,
  replied: 'Replied, see below',
  replyIn: (h: number) => `Expect a reply within about ${h} hours.`,
  firstInLine: (when: string) => `The office is closed now. You're first in line when it opens ${when}.`,
  at: (d: string, t: string) => `${d} at ${t}`,
  call911: 'Call 911',
  callCenter: 'Call center',
  starters: [
    'Are you open on Veterans Day?',
    'I forgot to pack lunch. Can you provide one today?',
    'Maya has a fever, can she come in?',
    'What is the tuition for infants?',
    'How can I schedule a tour?',
    'Do kids need anything for the Thanksgiving feast?',
  ],
}

type Dict = typeof en

const es: Dict = {
  officeOpen: (t) => `Recepción · abierto hasta las ${t}`,
  officeClosed: 'Recepción · respuestas 24/7, oficina cerrada',
  whichChild: 'Qué niño',
  greeting: (h) => (h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'),
  intro: (child) =>
    `Pregunte lo que quiera sobre el día de ${child}, nuestras políticas o su cuenta. Las respuestas vienen del manual de Willow & Wren, y una persona interviene cuando importa.`,
  today: 'Hoy',
  lunch: 'Almuerzo',
  openUntil: (t) => `Abierto hasta las ${t}`,
  earlyClose: (t, n) => `Cierre temprano a las ${t} · ${n}`,
  closedToday: (n, back) => `Cerrado${n ? ` · ${n}` : ''}${back ? `. Volvemos el ${back}` : ''}`,
  eatsFromHome: (c) => `${c} come comida de casa`,
  allergyFree: (alt, a, c) => `${alt} (sin ${a} para ${c})`,
  closedNamed: (n) => `Cerrado · ${n}`,
  closesAt: (t, n) => `Cierra a las ${t} · ${n}`,
  status: {
    answered: 'Respondido',
    caveat: 'Respondido, con una nota',
    review: 'El personal lo revisa',
    handoff: 'Con una persona',
    urgent: 'Urgente',
  },
  why: 'Por qué esta respuesta',
  thanks: '¡Gracias!',
  thanksDown: 'Gracias. El personal revisará esta respuesta.',
  helpful: 'Útil',
  notHelpful: 'No fue útil',
  answered: 'respondido',
  updated: 'actualizado',
  by: 'por',
  director: 'Directora',
  checking: 'Revisando el manual…',
  ask: 'Pregunte a la recepción…',
  listening: 'Escuchando…',
  askVoice: 'Preguntar por voz',
  send: 'Enviar',
  translatedFrom: 'Traducido del inglés',
  showOriginal: 'Ver original',
  hideOriginal: 'Ocultar original',
  noticeReply: 'Ms. Rivera respondió su pregunta',
  noticeAnswer: 'Ms. Rivera respondió una pregunta que hizo antes',
  addToCalendar: 'Agregar al calendario',
  open: 'Abierto',
  earlyCloseTitle: (n) => `Cierre temprano · ${n}`,
  closedTitle: (n) => `Cerrado · ${n}`,
  weekendTitle: 'Cerrado · fin de semana',
  unpublishedTitle: 'Aún no está en el calendario',
  reopens: (d, t) => `Reabre el ${d}, ${t}`,
  nextOpen: (d) => `Próxima apertura: ${d}`,
  publishedThrough: (d) => `Publicado hasta el ${d}`,
  program: 'Programa',
  days5: '5 días',
  days3: '3 días',
  perMonth: (reg, pct) => `Por mes · inscripción anual ${reg} · ${pct}% de descuento por hermanos en el mayor`,
  ratio: 'proporción',
  checker: (c) => `¿Cuándo puede volver? · ${c}`,
  symptoms: {
    fever: 'Fiebre',
    gi: 'Vómito / diarrea',
    pinkeye: 'Conjuntivitis',
    rash: 'Sarpullido',
    cold: 'Resfriado / tos',
    lice: 'Piojos',
  },
  lastFever: (f) => `Última temperatura de ${f}°F o más`,
  lastEpisode: 'Último episodio',
  dropsStarted: 'Inicio de las gotas',
  reducer: 'Medicina para la fiebre (Tylenol, Motrin)',
  none: 'Ninguna',
  lastNight: 'Anoche',
  thisMorning: 'Esta mañana',
  justNow: 'Ahora',
  earliestReturn: 'Puede volver desde',
  clearRule: (h, kind) =>
    `${h} horas ${kind === 'fever' ? 'sin fiebre y sin medicina' : kind === 'gi' ? 'sin síntomas' : 'después de iniciar tratamiento'}`,
  clear: 'libre',
  isClosure: (d, n) => `${d} es ${n}`,
  coldOk: (c) => `¿Sin fiebre? ${c} puede venir si puede participar en las actividades normales.`,
  rashNote: (d) => `Con fiebre, se necesita una nota del médico. Sin fiebre, ${d} lo revisará.`,
  liceOk: (c) => `${c} puede volver después del primer tratamiento.`,
  reportAbsent: (c) => `Reportar ausencia de ${c}`,
  absenceReported: 'Ausencia reportada',
  absenceNote: (c, until) => `${c} está marcada como ausente${until}. Ya avisamos a las maestras. ¡Que se mejore, ${c}!`,
  until: (d) => ` hasta el ${d}`,
  gets: (c) => `${c} recibe:`,
  free: (a) => `sin ${a}`,
  snack: 'Merienda',
  addLunch: (c, p) => `Agregar a ${c} al almuerzo · ${p}`,
  addedLunch: 'Agregada a la lista de hoy',
  lunchNote: (c, alt, p) => `${c} está en la lista de almuerzo de hoy${alt}. Se agregarán ${p} a su cuenta.`,
  withAlt: (a) => ` con la alternativa sin ${a}`,
  countCloses: (h, m) => `La cocina cierra la lista en ${h > 0 ? `${h} h ` : ''}${m} min`,
  tourBooked: 'Visita reservada',
  tourWith: (d) => `con ${d}`,
  chooseTime: 'Elija un horario',
  book: (d, t) => `Reservar ${d} · ${t}`,
  tourNote: (d, t, who) => `Visita reservada para el ${d} a las ${t}. ${who} le recibirá en la entrada.`,
  replied: 'Respondió, vea abajo',
  replyIn: (h) => `Espere una respuesta en unas ${h} horas.`,
  firstInLine: (when) => `La oficina está cerrada. Usted será la primera en la fila cuando abra ${when}.`,
  at: (d, t) => `el ${d} a las ${t}`,
  call911: 'Llamar al 911',
  callCenter: 'Llamar al centro',
  starters: [
    '¿Están abiertos el Día de los Veteranos?',
    'Olvidé empacar el almuerzo. ¿Pueden darle uno hoy?',
    'Maya tiene fiebre, ¿puede ir?',
    '¿Cuánto cuesta la colegiatura para bebés?',
    '¿Cómo programo una visita?',
  ],
}

/** English equivalents of the Spanish starters, so a tapped chip never depends on a translator. */
export const STARTER_ENGLISH: Record<string, string> = Object.fromEntries(es.starters.map((s, i) => [s, en.starters[i]]))

/** Spanish wording for the Today rows' questions (keyed by the English the engine receives). */
export const ROW_QUESTION_ES: Record<string, string> = {
  'What are your hours today?': '¿Cuál es su horario hoy?',
  'What time do you close today?': '¿A qué hora cierran hoy?',
  'Are you open today?': '¿Están abiertos hoy?',
  "What's for lunch today?": '¿Qué hay de almuerzo hoy?',
}

/** Allergen and room names as shown to parents. */
export const ALLERGENS_ES: Record<string, string> = {
  dairy: 'lácteos',
  egg: 'huevo',
  wheat: 'trigo',
  soy: 'soya',
  fish: 'pescado',
  sesame: 'sésamo',
}

const DICTS: Record<UiLang, Dict> = { en, es }

export function useT() {
  const lang = useStore((s) => s.lang)
  return { t: DICTS[lang], lang }
}
