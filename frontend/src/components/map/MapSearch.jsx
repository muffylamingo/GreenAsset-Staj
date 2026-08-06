import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { adresAra } from '../../api/geocode'
import Icon from '../ui/Icon'

/**
 * Harita üstündeki arama kutusu — iki işi birden yapar.
 *
 * Yazılan metin hem varlık adlarında aranır (üst bileşene iletilir, backend'e
 * `q` parametresi olarak gider) hem de adres olarak Nominatim'e sorulur.
 * Adres sonuçları açılır listede çıkar; birine tıklayınca harita oraya uçar.
 *
 * Debounce neden şart? Nominatim saniyede 1 istek istiyor. Her tuşta istek
 * atarsak hem kuralı çiğneriz hem engelleniriz.
 */
export default function MapSearch({ deger, onDegisim, onKonumSec }) {
  const { t } = useTranslation()
  const [sonuclar, setSonuclar] = useState([])
  const [aciik, setAcik] = useState(false)
  const [araniyor, setAraniyor] = useState(false)
  const kapsayici = useRef(null)

  useEffect(() => {
    const temiz = deger.trim()
    if (temiz.length < 3) {
      setSonuclar([])
      return
    }

    // AbortController: kullanıcı yazmaya devam ederse önceki isteği iptal et.
    // Yoksa yavaş dönen eski bir yanıt, yeni sonucun üstüne yazabilir.
    const kontrolcu = new AbortController()
    const zamanlayici = setTimeout(async () => {
      setAraniyor(true)
      try {
        const bulunan = await adresAra(temiz, { signal: kontrolcu.signal })
        setSonuclar(bulunan)
        setAcik(bulunan.length > 0)
      } catch (hata) {
        if (hata.name !== 'AbortError') setSonuclar([])
      } finally {
        setAraniyor(false)
      }
    }, 500)

    return () => {
      clearTimeout(zamanlayici)
      kontrolcu.abort()
    }
  }, [deger])

  // Dışarı tıklanınca listeyi kapat
  useEffect(() => {
    const disariTikla = (e) => {
      if (!kapsayici.current?.contains(e.target)) setAcik(false)
    }
    document.addEventListener('mousedown', disariTikla)
    return () => document.removeEventListener('mousedown', disariTikla)
  }, [])

  const sec = (sonuc) => {
    onKonumSec({ lat: sonuc.lat, lon: sonuc.lon })
    setAcik(false)
  }

  return (
    <div ref={kapsayici} className="pointer-events-auto relative w-full max-w-md">
      <div className="flex items-center rounded-xl border border-outline-variant/40 bg-surface/95 px-3 py-2 shadow-lg backdrop-blur-md">
        <Icon name="search" className="mr-2 shrink-0 text-[20px] text-on-surface-variant" />
        <input
          type="search"
          value={deger}
          onChange={(e) => onDegisim(e.target.value)}
          onFocus={() => sonuclar.length > 0 && setAcik(true)}
          placeholder={t('map.search')}
          className="flex-1 bg-transparent text-body-md text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none"
        />
        {araniyor && (
          <Icon name="refresh" className="animate-spin text-[16px] text-on-surface-variant" />
        )}
      </div>

      {aciik && (
        <ul className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container-lowest shadow-2xl">
          <li className="border-b border-outline-variant px-3 py-1.5 text-label-md uppercase tracking-wider text-on-surface-variant">
            {t('map.addressResults')}
          </li>
          {sonuclar.map((s, i) => (
            <li key={`${s.lat}-${s.lon}-${i}`}>
              <button
                onClick={() => sec(s)}
                className="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-surface-container"
              >
                <Icon
                  name="location_on"
                  className="mt-0.5 shrink-0 text-[16px] text-primary"
                />
                <span className="min-w-0">
                  <span className="block truncate text-body-md text-on-surface">
                    {s.kisaAd}
                  </span>
                  <span className="block truncate text-body-sm text-on-surface-variant">
                    {s.ad}
                  </span>
                </span>
              </button>
            </li>
          ))}
          {/* Nominatim kullanım şartı: veri kaynağı belirtilmeli */}
          <li className="border-t border-outline-variant px-3 py-1.5 text-body-sm text-on-surface-variant">
            {t('map.attribution')}
          </li>
        </ul>
      )}
    </div>
  )
}
