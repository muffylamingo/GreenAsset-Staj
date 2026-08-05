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

/** Koyu temada haritanın kullanacağı, daha parlak varyantlar. */
export const STATUS_HEX_DARK = {
  GOOD: '#4ade80',
  NEEDS_MAINTENANCE: '#fbbf24',
  BROKEN: '#ff6b6b',
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
