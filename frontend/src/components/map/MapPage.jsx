import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useAssetsGeoJSON } from '../../hooks/useAssets'
import { ASSET_TYPES, ASSET_TYPE_KEYS, STATUS_KEYS } from '../../theme/statusColors'
import Icon from '../ui/Icon'
import { ErrorState } from '../ui/States'
import MapLegend from './MapLegend'
import MapView from './MapView'

/**
 * Harita sayfası — tasarımdaki ana ekran.
 *
 * Yerleşim: harita tüm alanı kaplar, kontroller üstünde yüzer.
 * Sağdaki form paneli App'te duruyor; buradan sadece koordinat gönderiyoruz.
 */
export default function MapPage({
  koyu,
  onMapClick,
  onFeatureClick,
  seciliId,
  ucKoordinat,
}) {
  const { t } = useTranslation()

  const [tipler, setTipler] = useState([])
  const [durumlar, setDurumlar] = useState([])
  const [arama, setArama] = useState('')
  // Haritanın görünen alanı [minLon, minLat, maxLon, maxLat]
  const [bbox, setBbox] = useState(null)

  // Haritada tüm noktaları istiyoruz; kümeleme performansı MapLibre hallediyor.
  // limit'i yüksek tutuyoruz ama sınırsız değil — 5000 backend'in üst sınırı.
  const filtreler = useMemo(
    () => ({
      types: tipler.length ? tipler : undefined,
      statuses: durumlar.length ? durumlar : undefined,
      q: arama || undefined,
      limit: 5000,
    }),
    [tipler, durumlar, arama],
  )

  const { data, isLoading, isError, error, refetch } = useAssetsGeoJSON(filtreler)

  // Harita hareket edince sadece sınırları kaydediyoruz.
  // useCallback şart: MapView bunu olay dinleyicisi olarak bağlıyor, her
  // render'da yeni fonksiyon üretilirse dinleyiciler sürekli sökülüp takılır.
  const gorunumDegisti = useCallback((yeniBbox) => setBbox(yeniBbox), [])

  /**
   * Görünen alandaki varlık sayısı.
   *
   * Backend'e her harita hareketinde yeni istek atmak yerine elimizdeki
   * GeoJSON'u sayıyoruz — anında sonuç, sıfır ağ trafiği.
   *
   * useMemo olarak yazılması önemli: hem harita hareket edince hem VERİ
   * geldiğinde yeniden hesaplanır. Sadece harita olayına bağlasaydık, ilk
   * yüklemede (veri henüz yokken bbox gelir) sayaç 0'da takılı kalırdı.
   */
  const gorunenSayi = useMemo(() => {
    if (!data?.features || !bbox) return null
    const [minLon, minLat, maxLon, maxLat] = bbox
    return data.features.filter(({ geometry }) => {
      const [lon, lat] = geometry.coordinates
      return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat
    }).length
  }, [data, bbox])

  const tipDegistir = (tip) =>
    setTipler((o) => (o.includes(tip) ? o.filter((x) => x !== tip) : [...o, tip]))

  const durumDegistir = (durum) =>
    setDurumlar((o) => (o.includes(durum) ? o.filter((x) => x !== durum) : [...o, durum]))

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    )
  }

  return (
    <div className="relative h-full w-full">
      <MapView
        geojson={data}
        koyu={koyu}
        onMapClick={onMapClick}
        onFeatureClick={onFeatureClick}
        onViewportChange={gorunumDegisti}
        seciliId={seciliId}
        ucKoordinat={ucKoordinat}
      />

      {/* --- Üst orta: arama + filtre chip'leri --- */}
      <div className="pointer-events-none absolute left-1/2 top-margin-page z-20 flex w-full max-w-2xl -translate-x-1/2 flex-col items-center gap-2 px-4">
        <div className="pointer-events-auto flex w-full max-w-md items-center rounded-xl border border-outline-variant/40 bg-surface/95 px-3 py-2 shadow-lg backdrop-blur-md">
          <Icon name="search" className="mr-2 text-[20px] text-on-surface-variant" />
          <input
            type="search"
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder={t('map.search')}
            className="flex-1 bg-transparent text-body-md text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none"
          />
        </div>

        <div className="scrollbar-hide pointer-events-auto flex max-w-full gap-2 overflow-x-auto pb-1">
          {ASSET_TYPE_KEYS.map((tip) => (
            <HaritaChip
              key={tip}
              aktif={tipler.includes(tip)}
              onClick={() => tipDegistir(tip)}
              icon={ASSET_TYPES[tip].icon}
            >
              {t(`assetType.${tip}`)}
            </HaritaChip>
          ))}
          <span className="mx-1 my-auto h-5 w-px shrink-0 bg-outline-variant" />
          {STATUS_KEYS.map((durum) => (
            <HaritaChip
              key={durum}
              aktif={durumlar.includes(durum)}
              onClick={() => durumDegistir(durum)}
            >
              {t(`status.${durum}`)}
            </HaritaChip>
          ))}
        </div>
      </div>

      {/* --- Sol alt: açıklama kartı --- */}
      <div className="pointer-events-none absolute bottom-14 left-margin-page z-20">
        <MapLegend />
      </div>

      {/* --- Sağ alt: görünen varlık sayacı --- */}
      <div className="absolute bottom-margin-page right-margin-page z-20">
        <div className="flex items-center gap-2 rounded-full border border-outline-variant/40 bg-surface/95 px-4 py-2 shadow-lg backdrop-blur-md">
          <span
            className={`h-2 w-2 rounded-full bg-primary ${isLoading ? 'animate-pulse' : ''}`}
          />
          <span className="nums text-data-tabular text-on-surface">
            {isLoading
              ? t('common.loading')
              : t('map.assetsInView', { count: gorunenSayi ?? 0 })}
          </span>
        </div>
      </div>

      {/* --- Sol üst: haritaya tıklama ipucu --- */}
      <div className="pointer-events-none absolute left-margin-page top-margin-page z-20">
        <div className="flex items-center gap-2 rounded-xl border border-outline-variant/40 bg-surface/90 px-3 py-2 shadow-lg backdrop-blur-md">
          <Icon name="touch_app" className="text-[16px] text-primary" />
          <span className="text-body-sm text-on-surface-variant">{t('map.clickHint')}</span>
        </div>
      </div>
    </div>
  )
}

function HaritaChip({ aktif, onClick, icon, children }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={aktif}
      className={`inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-label-md shadow-md backdrop-blur-md transition-all ${
        aktif
          ? 'bg-secondary-container text-on-secondary-container'
          : 'border border-outline-variant/40 bg-surface/95 text-on-surface-variant hover:bg-surface-container'
      }`}
    >
      {icon && <Icon name={icon} className="text-[14px]" />}
      {children}
    </button>
  )
}
