/** Everything the front desk is allowed to say comes from a Knowledge object. Operators edit it; the engine only reads it. */

export type ISODate = string // YYYY-MM-DD, center-local
export type Minutes = number // minutes after midnight, center-local

export interface SourceMeta {
  /** Stable id used for citations, e.g. "calendar" or "handbook.illness". */
  id: string
  title: string
  updatedAt: ISODate
  updatedBy: string
}

export interface Closure {
  date: ISODate
  name: string
  /** Closed all day, or open with an early close time. */
  kind: 'closed' | 'early'
  closeAt?: Minutes
}

export interface ClassEvent {
  date: ISODate
  room: RoomId
  title: string
  note: string
}

export type AgeBandId = 'infant' | 'toddler' | 'preschool' | 'prek'
export type RoomId = 'sprouts' | 'saplings' | 'sunflowers' | 'oaks'

export interface AgeBand {
  id: AgeBandId
  label: string
  ages: string
  minMonths: number
  maxMonths: number
  room: RoomId
  fullTime: number
  partTime: number
  ratio: string
}

export interface MenuDay {
  lunch: string
  allergens: Allergen[]
  /** Served to children whose profile excludes an allergen in `lunch`. */
  alternate: string
  snack: string
}

export type Allergen = 'dairy' | 'egg' | 'wheat' | 'soy' | 'fish' | 'sesame'

export interface HandbookSection {
  id: string
  title: string
  body: string
  keywords: string[]
  updatedAt: ISODate
  updatedBy: string
  /** Answers operators wrote from the Gaps view are flagged so we can show the loop closing. */
  origin?: 'handbook' | 'operator-answer'
}

export interface Knowledge {
  center: {
    name: string
    director: string
    directorShort: string
    phone: string
    email: string
    address: string
    open: Minutes
    close: Minutes
    officeReplyHours: number
  }
  calendar: {
    meta: SourceMeta
    closures: Closure[]
    events: ClassEvent[]
    /** Dates after this are not decided yet; the desk must not guess. */ publishedThrough: ISODate
  }
  tuition: {
    meta: SourceMeta
    bands: AgeBand[]
    registrationFee: number
    siblingDiscountPct: number
    lateFeePerMinute: number
    lateGraceMinutes: number
  }
  illness: {
    meta: SourceMeta
    feverF: number
    feverFreeHours: number
    giEpisodes: number
    giFreeHours: number
    pinkEyeTreatmentHours: number
  }
  lunch: {
    meta: SourceMeta
    cutoff: Minutes
    backupPrice: number
    /** Four-week rotation, Monday–Friday. weeks[w][d], d = 0 (Mon) … 4 (Fri). */
    weeks: MenuDay[][]
    rotationStart: ISODate
    /** The last date the kitchen has confirmed the rotation through. Drives the staleness warning. */
    plannedThrough: ISODate
  }
  tours: { meta: SourceMeta; days: number[]; times: Minutes[]; durationMin: number }
  handbook: HandbookSection[]
}

export interface Child {
  id: string
  name: string
  birthDate: ISODate
  room: RoomId
  band: AgeBandId
  allergies: Allergen[]
  schedule: 'full' | 'part'
  pronoun: 'she' | 'he'
}

export interface Family {
  parentName: string
  children: Child[]
}
