import type { LogEntry } from './store'

/** Answered by the desk with no staff involvement, and the parent didn't say it missed. */
export const resolvedByDesk = (l: LogEntry) =>
  (l.answer.status === 'answered' || (l.answer.status === 'caveat' && !l.answer.staffDraft)) && l.feedback !== 'down'

/** Questions the desk couldn't answer, or answered and a parent said it didn't help. */
export const gapItems = (log: LogEntry[]) => log.filter((l) => !l.fixedBy && (l.answer.topic === 'unknown' || l.feedback === 'down'))
