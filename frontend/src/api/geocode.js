/**
 * Adres arama (geocoding) — OpenStreetMap Nominatim.
 *
 * Neden kendi backend'imizden geçmiyor? Nominatim halka açık ve ücretsiz;
 * araya kendi sunucumuzu koymak gereksiz gecikme ekler. Ama iki kural var:
 *
 *  1) Saniyede en fazla 1 istek — bu yüzden arayüzde 500 ms debounce var
 *  2) Kendimizi tanıtmak zorunlu — tarayıcıdan User-Agent değiştiremediğimiz
 *     için Nominatim'in kabul ettiği `email` parametresini kullanıyoruz
 *
 * Kaynak: https://operations.osmfoundation.org/policies/nominatim/
 */

const NOMINATIM = 'https://nominatim.openstreetmap.org/search'

// Aramayı İstanbul'a sınırlayan kabaca sınırlayıcı kutu.
// viewbox + bounded=1 ile "Beşiktaş" araması Şili'deki bir yeri getirmiyor.
const ISTANBUL_KUTUSU = '28.0,40.7,29.95,41.65'

/**
 * Adres arar.
 * @returns {Promise<Array<{ad: string, lat: number, lon: number, tur: string}>>}
 */
export async function adresAra(sorgu, { signal } = {}) {
  const temiz = sorgu.trim()
  if (temiz.length < 3) return []

  const params = new URLSearchParams({
    q: temiz,
    format: 'jsonv2',
    limit: '5',
    addressdetails: '0',
    viewbox: ISTANBUL_KUTUSU,
    bounded: '1',
    'accept-language': 'tr',
  })

  const yanit = await fetch(`${NOMINATIM}?${params}`, { signal })
  if (!yanit.ok) throw new Error(`Nominatim ${yanit.status}`)

  const sonuclar = await yanit.json()
  return sonuclar.map((s) => ({
    ad: s.display_name,
    kisaAd: s.name || s.display_name.split(',')[0],
    lat: Number(s.lat),
    lon: Number(s.lon),
    tur: s.type,
  }))
}
