/**
 * localStorage that never throws. It can be unavailable (private mode, blocked
 * site data) or full; the demo then simply runs in memory.
 */
export const storage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value)
    } catch {
      /* unavailable or full: keep going in memory */
    }
  },
}
