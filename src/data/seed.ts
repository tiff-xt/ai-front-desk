import type { Family, Knowledge, MenuDay } from './types'

/** Willow & Wren is fictional. Every person, phone number and policy below is invented. */

const t = (h: number, m = 0) => h * 60 + m

const menu = (lunch: string, allergens: MenuDay['allergens'], alternate: string, snack: string): MenuDay => ({
  lunch,
  allergens,
  alternate,
  snack,
})

export const seedKnowledge: Knowledge = {
  center: {
    name: 'Willow & Wren Early Learning',
    director: 'Elena Rivera',
    directorShort: 'Ms. Rivera',
    phone: '(505) 555-0142',
    email: 'hello@willowandwren.example',
    address: '418 Cottonwood Lane, Albuquerque, NM',
    open: t(7),
    close: t(18),
    officeReplyHours: 2,
  },

  calendar: {
    meta: { id: 'calendar', title: 'Family Calendar 2026–27', updatedAt: '2026-09-02', updatedBy: 'Ms. Rivera' },
    publishedThrough: '2027-05-31',
    closures: [
      { date: '2026-09-07', name: 'Labor Day', kind: 'closed' },
      { date: '2026-10-12', name: 'Staff Development Day', kind: 'closed' },
      { date: '2026-10-30', name: 'Fall Festival', kind: 'early', closeAt: t(15) },
      { date: '2026-11-11', name: 'Veterans Day', kind: 'closed' },
      { date: '2026-11-25', name: 'Thanksgiving Eve', kind: 'early', closeAt: t(15) },
      { date: '2026-11-26', name: 'Thanksgiving', kind: 'closed' },
      { date: '2026-11-27', name: 'Day after Thanksgiving', kind: 'closed' },
      { date: '2026-12-23', name: 'Winter Break Eve', kind: 'early', closeAt: t(15) },
      { date: '2026-12-24', name: 'Winter Break', kind: 'closed' },
      { date: '2026-12-25', name: 'Winter Break (Christmas Day)', kind: 'closed' },
      { date: '2026-12-28', name: 'Winter Break', kind: 'closed' },
      { date: '2026-12-29', name: 'Winter Break', kind: 'closed' },
      { date: '2026-12-30', name: 'Winter Break', kind: 'closed' },
      { date: '2026-12-31', name: 'Winter Break', kind: 'closed' },
      { date: '2027-01-01', name: "New Year's Day", kind: 'closed' },
      { date: '2027-01-18', name: 'Martin Luther King Jr. Day', kind: 'closed' },
      { date: '2027-02-15', name: "Presidents' Day", kind: 'closed' },
      { date: '2027-03-26', name: 'Staff Development Day', kind: 'closed' },
      { date: '2027-05-31', name: 'Memorial Day', kind: 'closed' },
    ],
    events: [
      { date: '2026-11-13', room: 'sunflowers', title: 'Pumpkin patch walk', note: 'Pack rain boots and a warm layer.' },
      { date: '2026-11-10', room: 'sprouts', title: 'Infant photo day', note: 'Photos start at 9:30am.' },
      { date: '2026-11-12', room: 'oaks', title: 'Library visit', note: 'Return borrowed books by Thursday.' },
    ],
  },

  tuition: {
    meta: { id: 'tuition', title: 'Tuition & Fees 2026–27', updatedAt: '2026-06-15', updatedBy: 'Ms. Rivera' },
    bands: [
      {
        id: 'infant',
        label: 'Infant',
        ages: '6 weeks – 17 months',
        minMonths: 1.5,
        maxMonths: 18,
        room: 'sprouts',
        fullTime: 1890,
        partTime: 1320,
        ratio: '1:4',
      },
      {
        id: 'toddler',
        label: 'Toddler',
        ages: '18 – 35 months',
        minMonths: 18,
        maxMonths: 36,
        room: 'saplings',
        fullTime: 1640,
        partTime: 1150,
        ratio: '1:6',
      },
      {
        id: 'preschool',
        label: 'Preschool',
        ages: '3 years',
        minMonths: 36,
        maxMonths: 48,
        room: 'sunflowers',
        fullTime: 1380,
        partTime: 970,
        ratio: '1:10',
      },
      {
        id: 'prek',
        label: 'Pre-K',
        ages: '4 – 5 years',
        minMonths: 48,
        maxMonths: 72,
        room: 'oaks',
        fullTime: 1290,
        partTime: 900,
        ratio: '1:12',
      },
    ],
    registrationFee: 150,
    siblingDiscountPct: 10,
    lateFeePerMinute: 1,
    lateGraceMinutes: 5,
  },

  illness: {
    meta: { id: 'illness', title: 'Health & Illness Policy (Handbook §6)', updatedAt: '2025-08-20', updatedBy: 'Ms. Rivera' },
    feverF: 100.4,
    feverFreeHours: 24,
    giEpisodes: 2,
    giFreeHours: 24,
    pinkEyeTreatmentHours: 24,
  },

  lunch: {
    meta: { id: 'lunch', title: 'Lunch Program & Menu', updatedAt: '2026-10-19', updatedBy: 'Chef Dana' },
    cutoff: t(9, 30),
    backupPrice: 6,
    rotationStart: '2026-10-19',
    plannedThrough: '2026-11-13',
    weeks: [
      [
        menu('Chicken & veggie rice bowl', ['soy'], 'Chicken rice bowl with tamari-free sauce', 'Apple slices & sunflower butter'),
        menu('Mac & cheese with peas', ['dairy', 'wheat'], 'Rice & black beans with peas', 'Cucumber & hummus'),
        menu('Turkey & cheese wraps', ['dairy', 'wheat'], 'Turkey & avocado rice bowl', 'Banana & oat bites'),
        menu('Lentil soup with cornbread', ['egg', 'dairy'], 'Lentil soup with rice crackers', 'Pears & yogurt'),
        menu('Bean & cheese quesadillas', ['dairy', 'wheat'], 'Bean & rice burrito bowl', 'Orange slices'),
      ],
      [
        menu('Turkey meatballs & pasta', ['wheat', 'egg'], 'Turkey meatballs with rice', 'Carrots & ranch'),
        menu('Baked fish sticks & potatoes', ['fish', 'wheat'], 'Chicken strips & potatoes', 'Grapes (halved)'),
        menu('Veggie fried rice with egg', ['egg', 'soy'], 'Veggie rice with chicken', 'Cheese & crackers'),
        menu('Chicken noodle soup', ['wheat'], 'Chicken & rice soup', 'Applesauce'),
        menu('Pizza bagels & salad', ['dairy', 'wheat'], 'Rice & black beans with salad', 'Melon'),
      ],
      [
        menu('Chicken & veggie rice bowl', ['soy'], 'Chicken rice bowl with tamari-free sauce', 'Snap peas & hummus'),
        menu('Butternut squash mac & cheese', ['dairy', 'wheat'], 'Butternut squash risotto (dairy-free)', 'Apple slices'),
        menu('Black bean tacos', ['dairy'], 'Black bean tacos, no cheese', 'Mango'),
        menu('Turkey chili & cornbread', ['egg', 'dairy'], 'Turkey chili & rice', 'Yogurt & berries'),
        menu('Egg & cheese breakfast-for-lunch', ['egg', 'dairy', 'wheat'], 'Chicken sausage & potatoes', 'Banana'),
      ],
      [
        menu('Mac & cheese with broccoli', ['dairy', 'wheat'], 'Rice & black beans with broccoli', 'Cucumber & hummus'),
        menu('Spaghetti with meat sauce', ['wheat'], 'Meat sauce over rice', 'Pear slices'),
        menu('Grilled cheese & tomato soup', ['dairy', 'wheat'], 'Turkey & avocado rice bowl with tomato soup', 'Grapes (halved)'),
        menu('Salmon cakes & green beans', ['fish', 'egg', 'wheat'], 'Chicken & green beans', 'Cheese & crackers'),
        menu('Bean & cheese quesadillas', ['dairy', 'wheat'], 'Bean & rice burrito bowl', 'Orange slices'),
      ],
    ],
  },

  tours: {
    meta: { id: 'tours', title: 'Tours', updatedAt: '2026-09-02', updatedBy: 'Ms. Rivera' },
    days: [2, 4], // Tuesday, Thursday
    times: [t(9, 30), t(16, 30)],
    durationMin: 30,
  },

  handbook: [
    {
      id: 'handbook.hours',
      title: 'Hours & Arrival',
      body: 'We are open Monday through Friday, 7:00am to 6:30pm. Please arrive by 9:00am so your child can join morning circle. Families must sign in and out every day.',
      keywords: ['hours', 'open', 'close', 'drop off', 'arrival', 'sign in'],
      updatedAt: '2024-07-10',
      updatedBy: 'Ms. Rivera',
    },
    {
      id: 'handbook.pickup',
      title: 'Pick-up & Authorized Adults',
      body: 'Children are released only to adults listed on the authorized pick-up list in the app. Anyone new must be added by a parent before pick-up and show photo ID at the door. Late pick-up after 6:05pm is $1 per minute.',
      keywords: ['pick up', 'pickup', 'grandma', 'grandpa', 'nanny', 'authorized', 'someone else', 'id', 'late'],
      updatedAt: '2026-08-14',
      updatedBy: 'Ms. Rivera',
    },
    {
      id: 'handbook.medication',
      title: 'Medication',
      body: 'Staff can give medication only with a signed Medication Authorization form for each medicine. Medicine must be in its original container labeled with your child’s name. Over-the-counter fever reducers are not given to mask a fever.',
      keywords: ['medicine', 'medication', 'tylenol', 'motrin', 'inhaler', 'antibiotic', 'give'],
      updatedAt: '2026-08-14',
      updatedBy: 'Ms. Rivera',
    },
    {
      id: 'handbook.packing',
      title: 'What to Pack',
      body: 'Please send two full changes of clothes labeled with your child’s name, a crib sheet and small blanket for nap (preschool and up), and weather-appropriate outdoor gear. We go outside twice a day unless it is below 25°F or raining heavily. Diapers and wipes are supplied by families.',
      keywords: ['pack', 'clothes', 'diapers', 'wipes', 'nap', 'blanket', 'outside', 'jacket', 'weather'],
      updatedAt: '2026-08-14',
      updatedBy: 'Ms. Rivera',
    },
    {
      id: 'handbook.potty',
      title: 'Potty Training',
      body: 'Teachers partner with families on potty training once a child shows readiness, usually between 2 and 3 years. Please send pull-ups and extra clothes during training. Children do not need to be potty trained to move to the Sunflowers room.',
      keywords: ['potty', 'toilet', 'pull ups', 'diaper', 'training'],
      updatedAt: '2026-08-14',
      updatedBy: 'Ms. Rivera',
    },
    {
      id: 'handbook.enrollment',
      title: 'Enrollment & Waitlist',
      body: 'Enrollment begins with a tour. After touring, families can join the waitlist with a $150 registration fee, which is credited toward the first month. Infant spots are limited and typically have a 3–5 month wait. Siblings of enrolled children get priority.',
      keywords: ['enroll', 'enrollment', 'waitlist', 'wait list', 'spot', 'opening', 'register', 'apply', 'start'],
      updatedAt: '2026-06-15',
      updatedBy: 'Ms. Rivera',
    },
    {
      id: 'handbook.weather',
      title: 'Weather Closures',
      body: 'If Albuquerque Public Schools close or delay for snow, we open at 9:00am and families receive a message by 6:00am. Full closures are rare and are announced in the app and by text.',
      keywords: ['snow', 'weather', 'ice', 'delay', 'storm'],
      updatedAt: '2026-10-01',
      updatedBy: 'Ms. Rivera',
    },
    {
      id: 'handbook.absence',
      title: 'Absences & Vacation',
      body: 'Please report absences in the app by 9:00am. Tuition is not reduced for sick days, holidays or vacation, but each family receives one tuition-free week per year with two weeks’ notice.',
      keywords: ['absent', 'absence', 'vacation', 'sick day', 'miss', 'away', 'credit', 'refund'],
      updatedAt: '2026-08-14',
      updatedBy: 'Ms. Rivera',
    },
  ],
}

export const demoFamily: Family = {
  parentName: 'Priya Shah',
  children: [
    {
      id: 'maya',
      name: 'Maya',
      birthDate: '2023-07-14',
      room: 'sunflowers',
      band: 'preschool',
      allergies: ['dairy'],
      schedule: 'full',
      pronoun: 'she',
    },
    { id: 'leo', name: 'Leo', birthDate: '2025-09-02', room: 'sprouts', band: 'infant', allergies: [], schedule: 'part', pronoun: 'he' },
  ],
}

export const roomNames: Record<string, string> = {
  sprouts: 'Sprouts (infants)',
  saplings: 'Saplings (toddlers)',
  sunflowers: 'Sunflowers (preschool)',
  oaks: 'Oaks (Pre-K)',
}
