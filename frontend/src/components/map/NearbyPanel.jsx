import { useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

import { useNearbyQuery } from '../../hooks/useStats'
import { ASSET_TYPES, STATUS_HEX } from '../../theme/statusColors'
import Button from '../ui/Button'
import Icon from '../ui/Icon'

const YARICAPLAR = [250, 500, 1000, 2000]

/**
 * "Yakınımdakiler" — saha ekibi senaryosunun arayüz karşılığı.
 *
 * Tarayıcıdan konum alır, backend'in ST_DWithin ucuna sorar ve sonuçları
 * yakından uzağa listeler. Bir sonuca tıklayınca harita oraya uçar.
 *
 * Varsayılan olarak SADECE bakım bekleyen ve arızalı varlıklar aranıyor:
 * saha ekibi zaten "iyi durumdakilerin" nerede olduğunu merak etmiyor.
 */
export default function NearbyPanel({ onKonumSec }) {
  const { t } = useTranslation()
  const [yaricap, setYaricap] = useState(500)
  const [sadeceSorunlu, setSadeceSorunlu] = useState(true)
  const [konumAliniyor, setKonumAliniyor] = useState(false)

  const sorgu = useNearbyQuery()
  const sonuc = sorgu.data

  const ara = () => {
    if (!navigator.geolocation) {
      toast.error(t('errors.geolocationUnsupported'))
      return
    }

    setKonumAliniyor(true)
    navigator.geolocation.getCurrentPosition(
      (konum) => {
        setKonumAliniyor(false)
        sorgu.mutate({
          lat: konum.coords.latitude,
          lon: konum.coords.longitude,
          radius: yaricap,
          statuses: sadeceSorunlu ? ['NEEDS_MAINTENANCE', 'BROKEN'] : undefined,
        })
      },
      () => {
        setKonumAliniyor(false)
        toast.error(t('errors.geolocationDenied'))
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const calisiyor = konumAliniyor || sorgu.isPending

  return (
    <div className="rounded-xl border border-outline-variant/40 bg-surface/95 p-3 shadow-lg backdrop-blur-md">
      <h3 className="mb-2 flex items-center gap-1.5 text-label-md uppercase tracking-wider text-on-surface-variant">
        <Icon name="my_location" className="text-[14px]" />
        {t('nearby.title')}
      </h3>

      {/* Yarıçap seçimi */}
      <div className="mb-2 flex gap-1">
        {YARICAPLAR.map((m) => (
          <button
            key={m}
            onClick={() => setYaricap(m)}
            aria-pressed={yaricap === m}
            className={`nums flex-1 rounded-lg px-1 py-1 text-body-sm transition-colors ${
              yaricap === m
                ? 'bg-secondary-container text-on-secondary-container'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            {m < 1000 ? `${m}m` : `${m / 1000}km`}
          </button>
        ))}
      </div>

      <label className="mb-2 flex cursor-pointer items-center gap-2 text-body-sm text-on-surface-variant">
        <input
          type="checkbox"
          checked={sadeceSorunlu}
          onChange={(e) => setSadeceSorunlu(e.target.checked)}
          className="h-3.5 w-3.5 accent-primary"
        />
        {t('nearby.onlyProblems')}
      </label>

      <Button size="sm" icon="my_location" fullWidth loading={calisiyor} onClick={ara}>
        {t('nearby.search')}
      </Button>

      {/* Sonuçlar */}
      {sonuc && !calisiyor && (
        <div className="mt-2">
          {sonuc.totalCount === 0 ? (
            <p className="text-body-sm text-on-surface-variant">{t('nearby.noResult')}</p>
          ) : (
            <>
              <p className="nums mb-1 text-body-sm text-on-surface-variant">
                {t('nearby.found', { count: sonuc.totalCount })}
              </p>
              <ul className="scrollbar-thin max-h-48 space-y-1 overflow-y-auto">
                {sonuc.features.map((f) => {
                  const p = f.properties
                  return (
                    <li key={p.id}>
                      <button
                        onClick={() =>
                          onKonumSec({
                            lat: f.geometry.coordinates[1],
                            lon: f.geometry.coordinates[0],
                          })
                        }
                        className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-surface-container"
                      >
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: STATUS_HEX[p.status] }}
                        />
                        <Icon
                          name={ASSET_TYPES[p.type]?.icon ?? 'park'}
                          className="shrink-0 text-[14px] text-on-surface-variant"
                        />
                        <span className="min-w-0 flex-1 truncate text-body-sm text-on-surface">
                          {p.name}
                        </span>
                        {/* Mobil tasarımdaki "45 m uzakta" bilgisi */}
                        <span className="nums shrink-0 text-body-sm text-on-surface-variant">
                          {p.distance_m} m
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}
