import { isUiLang, type UiLang } from '@/lib/lang'
import type { OpTab } from '@/store/store'

export type View = 'both' | 'parent' | 'operator'

export const WIDE = '(min-width: 1100px)'

/**
 * Deep links, so a write-up or message can open the exact screen:
 *   ?view=parent|staff|both   ?tab=gaps|inbox|knowledge|autonomy|tests|overview
 *   ?lang=es|zh|vi            ?tour=1 (open the guided tour)
 * The current view is mirrored back into the URL, so copying the address bar shares what you see.
 */
const params = () => new URLSearchParams(window.location.search)
const VIEW_PARAM: Record<string, View> = { parent: 'parent', staff: 'operator', operator: 'operator', both: 'both' }
const TABS: OpTab[] = ['overview', 'inbox', 'gaps', 'knowledge', 'autonomy', 'tests']

export const linked = {
  view: (): View | null => VIEW_PARAM[params().get('view') ?? ''] ?? null,
  tab: (): OpTab | null => TABS.find((t) => t === params().get('tab')) ?? null,
  lang: (): UiLang | null => {
    const l = params().get('lang') ?? ''
    return isUiLang(l) ? l : null
  },
  tour: () => params().has('tour'),
}

export function mirrorViewInUrl(view: View) {
  const p = params()
  p.set('view', view === 'operator' ? 'staff' : view)
  window.history.replaceState(null, '', `${window.location.pathname}?${p}${window.location.hash}`)
}
