import { Phone, Siren } from 'lucide-react'
import type { Knowledge } from '@/data/types'
import { useT } from '@/lib/i18n'

export function UrgentCard({ k }: { k: Knowledge }) {
  const { t } = useT()
  return (
    <div className="grid grid-cols-2 gap-2">
      <a href="tel:911" className="btn flex-col gap-0.5 rounded-xl bg-rose py-3 text-white dark:text-bg">
        <Siren size={18} />
        {t.call911}
      </a>
      <a href={`tel:${k.center.phone.replace(/\D/g, '')}`} className="btn-quiet flex-col gap-0.5 rounded-xl py-3">
        <Phone size={18} />
        {t.callCenter}
      </a>
    </div>
  )
}
