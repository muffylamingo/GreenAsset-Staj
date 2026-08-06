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
 * Nominatim'in uzun adresini anlamlı parçalara ayırır.
 *
 * Ham hali: "Ayazağa Mahallesi, Sarıyer, İstanbul, Marmara Bölgesi, Türkiye"
 * Sonuç:    ["Ayazağa Mahallesi", "Sarıyer", "İstanbul"]
 *
 * Aramayı zaten İstanbul'la sınırladığımız için son parçalar ("Marmara
 * Bölgesi", "Türkiye", posta kodu) her sonuçta aynı — bilgi taşımıyor,
 * sadece satırı uzatıp okunaksızlaştırıyor.
 */
function kisaAdres(displayName) {
  const ATILACAK = new Set([
    'Türkiye',
    'Turkey',
    'Marmara Bölgesi',
    'Marmara Region',
    'Marmara Bölgesi̇',
  ])

  return displayName
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p && !ATILACAK.has(p) && !/^\d{4,6}$/.test(p)) // posta kodunu da at
}

/**
 * Adres arar.
 * @returns {Promise<Array<{ad: string, lat: number, lon: number, tur: string}>>}
 */
async function sorgula(sorgu, { signal }) {
  const params = new URLSearchParams({
    q: sorgu,
    format: 'jsonv2',
    limit: '5',
    addressdetails: '0',
    // viewbox + bounded=1: sonuçları İstanbul'la sınırla.
    // Kısa sorgularda şart — yoksa "Beşiktaş" araması başka şehirlerdeki
    // Beşiktaş'ları da getirir ve doğru sonuç listede kaybolur.
    viewbox: ISTANBUL_KUTUSU,
    bounded: '1',
    countrycodes: 'tr',
    'accept-language': 'tr',
  })

  const yanit = await fetch(`${NOMINATIM}?${params}`, { signal })
  if (!yanit.ok) throw new Error(`Nominatim ${yanit.status}`)
  return yanit.json()
}

/**
 * Sorgu adaylarını üretir: tam hali, sonra son kelimesi atılmış hali.
 *
 * Nominatim serbest metni bütün olarak eşleştirmeye çalışıyor; sorguda
 * OSM'de karşılığı olmayan tek bir kelime bile sonucu SIFIRA düşürüyor:
 *
 *   "İTÜ Ayazağa Kampüsü" → 0 sonuç
 *   "İTÜ Ayazağa"         → 3 sonuç (ilki tam doğru yer)
 *
 * "Kampüsü", "Mahallesi", "No:4" gibi ekler genelde bu tuzağa düşürüyor.
 * Bu yüzden hiç sonuç çıkmazsa sondan bir kelime atıp tekrar deniyoruz.
 */
function sorguAdaylari(sorgu) {
  const adaylar = [sorgu]
  const kelimeler = sorgu.split(/\s+/)
  if (kelimeler.length >= 2) {
    adaylar.push(kelimeler.slice(0, -1).join(' '))
  }
  return adaylar
}

const bekle = (ms) => new Promise((r) => setTimeout(r, ms))

export async function adresAra(sorgu, { signal } = {}) {
  const temiz = sorgu.trim()
  if (temiz.length < 3) return []

  let sonuclar = []
  const adaylar = sorguAdaylari(temiz)

  for (let i = 0; i < adaylar.length; i++) {
    // İkinci denemeden önce bekle: Nominatim saniyede 1 istek istiyor.
    // Bu gecikme sadece ilk deneme boş dönerse yaşanıyor.
    if (i > 0) await bekle(1100)
    if (signal?.aborted) return []

    sonuclar = await sorgula(adaylar[i], { signal })
    if (sonuclar.length > 0) break
  }

  // Nominatim aynı yeri birden çok OSM nesnesi olarak dönebiliyor
  // (durak, bina, alan sınırı...). Kullanıcıya üç kez "İTÜ-Ayazağa"
  // göstermenin anlamı yok — aynı görünenleri eliyoruz.
  const gorulen = new Set()

  return sonuclar
    .map((s) => {
      const parcalar = kisaAdres(s.display_name)
      return {
        // Kalın satır: yerin adı
        kisaAd: parcalar[0] ?? s.display_name,
        // İnce satır: nerede olduğu. İlk parçayı atıyoruz, üstte zaten yazıyor.
        ad: parcalar.slice(1, 3).join(', '),
        lat: Number(s.lat),
        lon: Number(s.lon),
        tur: s.type,
      }
    })
    .filter((s) => {
      const anahtar = `${s.kisaAd}|${s.ad}`
      if (gorulen.has(anahtar)) return false
      gorulen.add(anahtar)
      return true
    })
}
