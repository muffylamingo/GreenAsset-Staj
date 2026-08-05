import { useTranslation } from 'react-i18next'

import Button from './Button'
import Icon from './Icon'

/**
 * Durum ekranları: yükleniyor / boş / hata.
 *
 * Bir arayüzün "çalışıyor" ile "bitmiş" arasındaki farkı çoğunlukla bu üç
 * ekrandır. Veri gelene kadar boş beyaz ekran göstermek en yaygın acemi hatası.
 */

/** Yükleniyor — tablo satırı iskeletleri. */
export function TableSkeleton({ rows = 8, cols = 7 }) {
  return (
    <div className="animate-pulse" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, satir) => (
        <div
          key={satir}
          className="flex items-center gap-gutter border-b border-outline-variant px-gutter"
          style={{ height: 52 }}
        >
          {Array.from({ length: cols }).map((_, sutun) => (
            <div
              key={sutun}
              className="h-3 rounded bg-surface-container-high"
              style={{ width: sutun === 0 ? '22%' : `${10 + ((satir + sutun) % 4) * 3}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Boş durum — hiç kayıt yok ya da filtreye uyan yok. */
export function EmptyState({ filtered = false, onClear, onAdd }) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center px-gutter py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant">
        <Icon name={filtered ? 'search' : 'eco'} className="text-[32px]" />
      </div>

      <p className="mb-1 text-headline-md text-on-surface">
        {t(filtered ? 'empty.noResults' : 'empty.noAssets')}
      </p>
      <p className="mb-6 max-w-sm text-body-md text-on-surface-variant">
        {t(filtered ? 'empty.noResultsHint' : 'empty.noAssetsHint')}
      </p>

      {filtered && onClear && (
        <Button variant="outlined" icon="close" onClick={onClear}>
          {t('filters.clear')}
        </Button>
      )}
      {!filtered && onAdd && (
        <Button icon="add" onClick={onAdd}>
          {t('table.addAsset')}
        </Button>
      )}
    </div>
  )
}

/** Hata durumu — ağ hatası ile diğerlerini ayırıyoruz. */
export function ErrorState({ error, onRetry }) {
  const { t } = useTranslation()

  const agHatasi = error?.kullaniciMesaji === 'NETWORK'
  const mesaj = agHatasi
    ? t('errors.networkError')
    : (error?.kullaniciMesaji ?? t('errors.loadFailed'))

  return (
    <div className="flex flex-col items-center justify-center px-gutter py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-error-container text-on-error-container">
        <Icon name="warning" className="text-[32px]" />
      </div>

      <p className="mb-1 text-headline-md text-on-surface">{t('errors.loadFailed')}</p>
      <p className="mb-6 max-w-sm text-body-md text-on-surface-variant">{mesaj}</p>

      {onRetry && (
        <Button variant="outlined" icon="refresh" onClick={onRetry}>
          {t('errors.retry')}
        </Button>
      )}
    </div>
  )
}
