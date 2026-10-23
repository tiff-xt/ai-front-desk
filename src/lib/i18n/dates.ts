/** Date pieces shared by the locale files. All dates are ISO strings in center-local time. */
export const weekdayIndex = (iso: string) => new Date(iso + 'T00:00:00Z').getUTCDay()
export const dayOfMonth = (iso: string) => +iso.slice(8, 10)
export const monthNumber = (iso: string) => +iso.slice(5, 7)
export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
