import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useAssetsGeoJSON } from '../../hooks/useAssets'
import { useWithinQuery } from '../../hooks/useStats'
import {
  ASSET_TYPES,
  ASSET_TYPE_KEYS,
  STATUS_HEX,
  STATUS_KEYS,
} from '../../theme/statusColors'
import Button from '../ui/Button'
import Icon from '../ui/Icon'
import { ErrorState } from '../ui/States'
import MapLegend from './MapLegend'
import MapSearch from './MapSearch'
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

  // --- Alan çizme durumu ---
  // Adres aramasından seçilen konum — haritayı oraya uçurur
  const [adresKonumu, setAdresKonumu] = useState(null)

  const [cizimModu, setCizimModu] = useState(false)
  const [koseSayisi, setKoseSayisi] = useState(0)
  const [temizleSayaci, setTemizleSayaci] = useState(0)
  const alanSorgusu = useWithinQuery()

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

  /* --- Alan sorgusu --- */

  const cizimBaslat = () => {
    alanSorgusu.reset()
    setKoseSayisi(0)
    setCizimModu(true)
  }

  const cizimIptal = () => {
    setCizimModu(false)
    setKoseSayisi(0)
    setTemizleSayaci((s) => s + 1)
  }

  const alaniTemizle = () => {
    alanSorgusu.reset()
    setTemizleSayaci((s) => s + 1)
  }

  // useCallback: MapView bunu olay dinleyicisi bağımlılığı olarak kullanıyor
  const poligonTamamlandi = useCallback(
    (polygon) => {
      setCizimModu(false)
      alanSorgusu.mutate({
        polygon,
        filtreler: {
          types: tipler.length ? tipler : undefined,
          statuses: durumlar.length ? durumlar : undefined,
        },
      })
    },
    // alanSorgusu her render'da yeni nesne; mutate kararlı olduğu için
    // sadece onu bağımlılığa alıyoruz
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tipler, durumlar, alanSorgusu.mutate],
  )

  const alanSonucu = alanSorgusu.data

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
        // Tablodan gelen "haritada göster" veya adres aramasından seçilen konum
        ucKoordinat={adresKonumu ?? ucKoordinat}
        ucZoom={adresKonumu ? 15 : 17}
        cizimModu={cizimModu}
        onPolygonComplete={poligonTamamlandi}
        onKoseSayisiChange={setKoseSayisi}
        temizleSayaci={temizleSayaci}
      />

      {/* --- Üst orta: arama + filtre chip'leri --- */}
      <div className="pointer-events-none absolute left-1/2 top-margin-page z-20 flex w-full max-w-2xl -translate-x-1/2 flex-col items-center gap-2 px-4">
        <MapSearch deger={arama} onDegisim={setArama} onKonumSec={setAdresKonumu} />

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

      {/* --- Sol üst: ipucu + alan sorgusu aracı --- */}
      <div className="absolute left-margin-page top-margin-page z-20 w-72 space-y-2">
        <div className="flex items-center gap-2 rounded-xl border border-outline-variant/40 bg-surface/90 px-3 py-2 shadow-lg backdrop-blur-md">
          <Icon
            name={cizimModu ? 'draw' : 'touch_app'}
            className="shrink-0 text-[16px] text-primary"
          />
          <span className="text-body-sm text-on-surface-variant">
            {cizimModu ? t('spatial.drawing') : t('map.clickHint')}
          </span>
        </div>

        {/* Alan sorgusu kartı — ödevin ST_Within şartının arayüz tarafı */}
        <div className="rounded-xl border border-outline-variant/40 bg-surface/95 p-3 shadow-lg backdrop-blur-md">
          <h3 className="mb-1 flex items-center gap-1.5 text-label-md uppercase tracking-wider text-on-surface-variant">
            <Icon name="draw" className="text-[14px]" />
            {t('spatial.drawTitle')}
          </h3>

          {!cizimModu && !alanSonucu && (
            <>
              <p className="mb-2 text-body-sm text-on-surface-variant">
                {t('spatial.drawHint')}
              </p>
              <Button size="sm" icon="draw" fullWidth onClick={cizimBaslat}>
                {t('spatial.drawStart')}
              </Button>
            </>
          )}

          {cizimModu && (
            <>
              <p className="nums mb-2 text-body-sm text-on-surface-variant">
                {koseSayisi} / 3+
              </p>
              <Button size="sm" variant="outlined" icon="close" fullWidth onClick={cizimIptal}>
                {t('spatial.drawCancel')}
              </Button>
            </>
          )}

          {!cizimModu && alanSonucu && (
            <>
              {alanSorgusu.isPending ? (
                <p className="text-body-sm text-on-surface-variant">{t('common.loading')}</p>
              ) : alanSonucu.totalCount === 0 ? (
                <p className="mb-2 text-body-sm text-on-surface-variant">
                  {t('spatial.noResult')}
                </p>
              ) : (
                <>
                  <p className="mb-1 text-body-sm text-on-surface-variant">
                    {t('spatial.resultTitle')}
                  </p>
                  <p className="nums mb-2 text-headline-md text-on-surface">
                    {t('spatial.resultCount', { count: alanSonucu.totalCount })}
                  </p>

                  {/* Durum kırılımı — renk tek başına bilgi taşımasın diye
                      her satırda renk + metin + sayı birlikte */}
                  <ul className="mb-3 space-y-1">
                    {STATUS_KEYS.filter((d) => alanSonucu.countsByStatus[d]).map((durum) => (
                      <li
                        key={durum}
                        className="flex items-center gap-1.5 text-body-sm text-on-surface-variant"
                      >
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: STATUS_HEX[durum] }}
                        />
                        {t(`status.${durum}`)}
                        <span className="nums ml-auto font-semibold text-on-surface">
                          {alanSonucu.countsByStatus[durum]}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <div className="flex gap-1.5">
                <Button size="sm" variant="outlined" icon="close" onClick={alaniTemizle}>
                  {t('spatial.clearArea')}
                </Button>
                <Button size="sm" variant="ghost" icon="draw" onClick={cizimBaslat}>
                  {t('spatial.drawStart')}
                </Button>
              </div>
            </>
          )}
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
