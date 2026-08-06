import { useTranslation } from 'react-i18next'

import { ASSET_TYPES, ASSET_TYPE_KEYS, STATUS_HEX, STATUS_KEYS } from '../../theme/statusColors'
import Icon from '../ui/Icon'

/**
 * Harita açıklama kartı (legend).
 *
 * Tasarımda sol altta duruyor. Hem durum renklerini hem varlık tiplerini
 * gösteriyor — renk tek başına bilgi taşımamalı, metinle desteklenmeli.
 */
export default function MapLegend() {
  const { t } = useTranslation()

  return (
    <div className="shrink-0 rounded-xl border border-outline-variant/40 bg-surface/90 p-3 shadow-lg backdrop-blur-md">
      <h3 className="mb-2 text-label-md uppercase tracking-wider text-on-surface-variant">
        {t('map.legend')}
      </h3>

      <div className="space-y-1.5">
        {STATUS_KEYS.map((durum) => (
          <div key={durum} className="flex items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: STATUS_HEX[durum] }}
            />
            <span className="text-body-sm text-on-surface">{t(`status.${durum}`)}</span>
          </div>
        ))}
      </div>

      <div className="my-2 h-px w-full bg-outline-variant/40" />

      <div className="space-y-1.5">
        {ASSET_TYPE_KEYS.map((tip) => (
          <div key={tip} className="flex items-center gap-2 text-on-surface-variant">
            <Icon name={ASSET_TYPES[tip].icon} className="shrink-0 text-[16px]" />
            <span className="text-body-sm">{t(`assetType.${tip}`)}</span>
          </div>
        ))}
      </div>

      <p className="mt-2 border-t border-outline-variant/40 pt-2 text-body-sm italic text-on-surface-variant">
        {t('map.iconHint')}
      </p>
    </div>
  )
}
