/**
 * Durum ve tip renkleri — TEK KAYNAK.
 *
 * Neden ayrı bir dosya?
 * Harita (MapLibre) renkleri Tailwind sınıfı olarak kullanamaz; JavaScript
 * içinde hex değeri ister. Tablo rozetleri ise Tailwind sınıfı kullanır.
 * İki yerde ayrı ayrı yazarsak zamanla birbirinden ayrılırlar — haritada
 * yeşil, tabloda başka bir yeşil görünür.
 *
 * Bu yüzden hex değerleri burada tanımlı, Tailwind sınıfları da buradan
 * türetiliyor. Rengi değiştirmek istersen SADECE burayı değiştir.
 */

/** MapLibre paint ifadeleri için ham hex değerleri (açık tema). */
export const STATUS_HEX = {
  GOOD: '#15803d',
  NEEDS_MAINTENANCE: '#f59e0b',
  BROKEN: '#ba1a1a',
}

/**
 * Koyu tema varyantları.
 *
 * İlk denemede üçünü birden açmıştık (#4ade80 / #fbbf24 / #ff6b6b). Renk körlüğü
 * doğrulayıcısı bunu REDDETTİ: protanopi altında yeşil ile amber arasındaki fark
 * ΔE 7.3'e düşüyordu (eşik 8) — yani kırmızı-yeşil renk körü biri "iyi" ile
 * "bakım lazım"ı ayırt edemeyecekti.
 *
 * Sebep: açık temada ayrım yeşilin KOYU, amberin AÇIK olmasından geliyordu.
 * Koyu temada yeşili açınca o aydınlık farkı kapandı. Yeşili koyulaştırıp
 * amberi açarak farkı geri kazandık: ΔE 17.5.
 *
 * Doğrulandığı yüzeyler: #080B07 (kart), #0E120D (sayfa), #26282B (koyu harita
 * altlığı) — üçünde de kontrast ≥ 3:1.
 */
export const STATUS_HEX_DARK = {
  GOOD: '#178a48',
  NEEDS_MAINTENANCE: '#ffc94d',
  BROKEN: '#f76b6b',
}

/**
 * Grafik renkleri.
 *
 * Tipe ve ilçeye göre barlar NOMİNAL kategoriler — sıralarını değiştirmek anlamı
 * değiştirmiyor. Bu yüzden her bara ayrı renk vermiyoruz: bar UZUNLUĞU zaten
 * büyüklüğü gösteriyor, renge ayrı bir iş yüklemek gereksiz. Hepsi tek hue.
 *
 * (Durum grafiği ayrı: orada renk gerçekten anlam taşıyor — STATUS_HEX kullanılır.)
 */
export const CHART_HEX = {
  bar: '#15803d',
  barDark: '#79db8d',
  area: '#00652c',
  areaDark: '#79db8d',
  grid: '#e2e8e0',
  gridDark: '#2a3128',
  axis: '#6b766a',
  axisDark: '#8d968a',
}

export function grafikRenkleri(koyu) {
  return {
    bar: koyu ? CHART_HEX.barDark : CHART_HEX.bar,
    area: koyu ? CHART_HEX.areaDark : CHART_HEX.area,
    grid: koyu ? CHART_HEX.gridDark : CHART_HEX.grid,
    axis: koyu ? CHART_HEX.axisDark : CHART_HEX.axis,
    status: koyu ? STATUS_HEX_DARK : STATUS_HEX,
  }
}

/** Tablo/rozet için Tailwind sınıfları. */
export const STATUS_CLASSES = {
  GOOD: 'bg-status-good/12 text-status-good',
  NEEDS_MAINTENANCE: 'bg-status-maintenance/15 text-status-maintenance',
  BROKEN: 'bg-status-broken/12 text-status-broken',
}

/** Çeviri anahtarları — metinler i18n dosyalarından gelir. */
export const STATUS_KEYS = ['GOOD', 'NEEDS_MAINTENANCE', 'BROKEN']

/** Varlık tipleri ve Material Symbols ikon adları. */
export const ASSET_TYPES = {
  TREE: { icon: 'park' },
  BENCH: { icon: 'chair' },
  POLE: { icon: 'light' },
  TRASH_BIN: { icon: 'delete' },
  PLAYGROUND: { icon: 'toys' },
}

export const ASSET_TYPE_KEYS = Object.keys(ASSET_TYPES)

/**
 * MapLibre "match" ifadesi üretir: duruma göre nokta rengi.
 * Harita katmanında böyle kullanılır:
 *   paint: { 'circle-color': statusMatchExpression() }
 */
export function statusMatchExpression(isDark = false) {
  const palette = isDark ? STATUS_HEX_DARK : STATUS_HEX
  return [
    'match',
    ['get', 'status'],
    'GOOD', palette.GOOD,
    'NEEDS_MAINTENANCE', palette.NEEDS_MAINTENANCE,
    'BROKEN', palette.BROKEN,
    palette.GOOD, // varsayılan
  ]
}
