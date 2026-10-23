import type { Family } from '@/data/types'
import type { Clock } from '@/lib/time'

/**
 * A week of realistic front-desk traffic, so the control center opens on real
 * patterns instead of an empty state. Each question is run through the same
 * engine at its own timestamp when the demo starts; nothing here is hand-labeled.
 * The gaps (Thanksgiving feast, child care assistance, summer camp) are the
 * kind of question a handbook rarely covers.
 */

const fam = (
  parentName: string,
  name: string,
  room: Family['children'][0]['room'],
  band: Family['children'][0]['band'],
  pronoun: 'she' | 'he' = 'she',
): Family => ({
  parentName,
  children: [{ id: name.toLowerCase(), name, birthDate: '2023-01-01', room, band, allergies: [], schedule: 'full', pronoun }],
})

const lee = fam('Marcus Lee', 'Ava', 'oaks', 'prek')
const ortiz = fam('Dana Ortiz', 'Theo', 'saplings', 'toddler', 'he')
const nguyen = fam('Linh Nguyen', 'Rosie', 'sunflowers', 'preschool')
const brooks = fam('Jamal Brooks', 'Nia', 'oaks', 'prek')
const prospect = fam('Prospective family', 'Baby', 'sprouts', 'infant', 'he')

const at = (date: string, h: number, m = 0): Clock => ({ date, minutes: h * 60 + m })

export const SEED_LOG: { q: string; at: Clock; who: string; family?: Family; feedback?: 'up' | 'down' }[] = [
  { q: 'Are you open on Veterans Day?', at: at('2026-11-02', 7, 12), who: 'Marcus Lee', family: lee, feedback: 'up' },
  { q: 'What is the tuition for infants?', at: at('2026-11-02', 12, 40), who: 'Sofia Ramirez (prospective)', family: prospect },
  {
    q: 'Can I schedule a tour this week?',
    at: at('2026-11-02', 12, 44),
    who: 'Sofia Ramirez (prospective)',
    family: prospect,
    feedback: 'up',
  },
  { q: 'Do we bring a dish for the Thanksgiving feast?', at: at('2026-11-02', 17, 55), who: 'Linh Nguyen', family: nguyen },
  {
    q: 'Theo threw up twice last night, can he come today?',
    at: at('2026-11-03', 6, 48),
    who: 'Dana Ortiz',
    family: ortiz,
    feedback: 'up',
  },
  { q: 'Is there school on Election Day?', at: at('2026-11-03', 6, 55), who: 'Jamal Brooks', family: brooks },
  { q: 'Do you accept child care assistance from the state?', at: at('2026-11-03', 13, 5), who: 'Ben Kim (prospective)', family: prospect },
  { q: "What's for lunch today?", at: at('2026-11-03', 8, 2), who: 'Linh Nguyen', family: nguyen },
  { q: 'Is the Thanksgiving feast potluck? What should we bring?', at: at('2026-11-04', 8, 30), who: 'Marcus Lee', family: lee },
  { q: 'Ava got scratched on the face at school today', at: at('2026-11-04', 17, 20), who: 'Marcus Lee', family: lee },
  { q: 'Can my nanny pick up Nia on Thursday?', at: at('2026-11-04', 11, 10), who: 'Jamal Brooks', family: brooks, feedback: 'up' },
  { q: 'Do you take CYFD child care assistance?', at: at('2026-11-05', 9, 15), who: 'Aisha Patel (prospective)', family: prospect },
  { q: 'Do you run a summer camp?', at: at('2026-11-05', 20, 40), who: 'Jamal Brooks', family: brooks },
  {
    q: 'Rosie has a runny nose but no fever, ok to come?',
    at: at('2026-11-05', 6, 50),
    who: 'Linh Nguyen',
    family: nguyen,
    feedback: 'up',
  },
  { q: 'What time do you close the day before Thanksgiving?', at: at('2026-11-06', 10, 5), who: 'Dana Ortiz', family: ortiz },
  { q: 'I think we were charged twice for November', at: at('2026-11-06', 14, 30), who: 'Dana Ortiz', family: ortiz },
  {
    q: 'Thanksgiving feast: are parents invited? Should we bring something?',
    at: at('2026-11-06', 18, 10),
    who: 'Jamal Brooks',
    family: brooks,
  },
  {
    q: 'Is summer camp open to kids who aren’t enrolled?',
    at: at('2026-11-07', 9, 0),
    who: 'Ben Kim (prospective)',
    family: prospect,
    feedback: 'down',
  },
  { q: 'What happens if it snows?', at: at('2026-11-07', 21, 15), who: 'Linh Nguyen', family: nguyen, feedback: 'down' },
  { q: 'Do you accept assistance / subsidy payments?', at: at('2026-11-08', 15, 20), who: 'Grace Liu (prospective)', family: prospect },
  { q: 'Are you open Friday? Ava has a doctor appointment', at: at('2026-11-08', 19, 45), who: 'Marcus Lee', family: lee },
  { q: 'How much is pre-k per month?', at: at('2026-11-09', 6, 30), who: 'Jamal Brooks', family: brooks },
  { q: 'Can I give Theo his inhaler before nap?', at: at('2026-11-09', 7, 5), who: 'Dana Ortiz', family: ortiz },
  { q: 'Are you open tomorrow?', at: at('2026-11-02', 20, 15), who: 'Linh Nguyen', family: nguyen },
  { q: 'What time do you close today?', at: at('2026-11-03', 15, 40), who: 'Jamal Brooks', family: brooks },
  { q: 'Theo has a fever of 100.9, can he come?', at: at('2026-11-04', 6, 35), who: 'Dana Ortiz', family: ortiz, feedback: 'up' },
  { q: "What's for lunch tomorrow?", at: at('2026-11-04', 21, 0), who: 'Marcus Lee', family: lee },
  { q: 'Are you closed for Thanksgiving?', at: at('2026-11-05', 12, 10), who: 'Linh Nguyen', family: nguyen },
  { q: 'How much is toddler tuition?', at: at('2026-11-05', 13, 30), who: 'Ben Kim (prospective)', family: prospect },
  { q: 'Pink eye — when can Nia come back?', at: at('2026-11-06', 7, 20), who: 'Jamal Brooks', family: brooks, feedback: 'up' },
  { q: 'What should Rosie bring for nap?', at: at('2026-11-06', 19, 5), who: 'Linh Nguyen', family: nguyen },
  { q: 'Are you open on Veterans Day?', at: at('2026-11-07', 8, 40), who: 'Dana Ortiz', family: ortiz },
  { q: 'Is there school Wednesday?', at: at('2026-11-08', 18, 20), who: 'Linh Nguyen', family: nguyen },
  { q: 'Can I book a tour on Thursday?', at: at('2026-11-08', 20, 30), who: 'Grace Liu (prospective)', family: prospect },
  { q: 'Ava threw up once last night but seems fine now', at: at('2026-11-09', 6, 10), who: 'Marcus Lee', family: lee },
  { q: 'Do you do potty training?', at: at('2026-11-09', 6, 58), who: 'Dana Ortiz', family: ortiz },
]
