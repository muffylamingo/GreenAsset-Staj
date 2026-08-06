import { useTranslation } from 'react-i18next'

import { STATUS_CLASSES, STATUS_HEX } from '../../theme/statusColors'

/**
 * Durum rozeti — renkli nokta + çevrilmiş metin.
 *
 * Renk yalnız başına bilgi taşımaz (renk körlüğü); bu yüzden her zaman
 * metinle birlikte gösteriliyor. Erişilebilirlik açısından önemli.
 */
export default function StatusBadge({ status, size = 'md' }) {
  const { t } = useTranslation()

  const boyut = size === 'sm' ? 'px-2 py-0.5 text-body-sm' : 'px-2.5 py-1 text-label-md'

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full ${boyut} ${STATUS_CLASSES[status]}`}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: STATUS_HEX[status] }}
        aria-hidden="true"
      />
      {t(`status.${status}`)}
    </span>
  )
}
