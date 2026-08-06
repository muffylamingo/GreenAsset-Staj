/**
 * Harita altlıkları ve katman tanımları.
 *
 * Altlık olarak Carto'nun ücretsiz vektör stilleri kullanılıyor — API anahtarı
 * gerektirmiyor. Veri (varlıklar) kendi backend'imizden geliyor.
 */

import { STATUS_HEX, STATUS_HEX_DARK } from '../../theme/statusColors'

export const ALTLIKLAR = {
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
}

export const KAYNAK_ID = 'assets'
export const CIZIM_KAYNAK_ID = 'draw'

export const KATMAN = {
  kumeler: 'assets-clusters',
  kumeSayisi: 'assets-cluster-count',
  noktalar: 'assets-points',
  tipIkonu: 'assets-type-icons',
  secili: 'assets-selected',
  // Alan çizme aracının katmanları
  cizimDolgu: 'draw-fill',
  cizimCizgi: 'draw-line',
  cizimKose: 'draw-vertices',
}

/** Çizim aracının rengi — varlık renkleriyle karışmasın diye teal. */
export const CIZIM_RENGI = (koyu) => (koyu ? '#6bd8cb' : '#006a61')

/**
 * Tip ikonlarının görünmeye başladığı zoom seviyesi.
 *
 * Neden bu ayrım var? Haritada iki bilgi var: DURUM (renk) ve TİP (ikon).
 * Şehir ölçeğinde (zoom 11) 1475 nokta ekranda; oraya ikon koyarsan hepsi
 * üst üste biner. Zaten o ölçekte sorulan soru "sorunlar nerede yoğunlaşıyor",
 * cevabı renk veriyor. Sokak ölçeğine inince soru değişiyor: "bu şey ne?" —
 * o zaman ikon anlam kazanıyor.
 */
export const IKON_MIN_ZOOM = 15

/** Harita ikonlarının kayıt adı — çakışmasın diye önek kullanıyoruz. */
export const ikonAdi = (tip) => `varlik-${tip}`

/**
 * Duruma göre nokta rengi — MapLibre "match" ifadesi.
 *
 * Bu ifade veriye bakarak rengi belirler; her nokta için ayrı katman
 * açmaya gerek kalmaz. Renkler statusColors.js'ten geliyor ki tablo
 * rozetleriyle asla ayrışmasın.
 */
export function durumRengiIfadesi(koyu) {
  const p = koyu ? STATUS_HEX_DARK : STATUS_HEX
  return [
    'match',
    ['get', 'status'],
    'GOOD', p.GOOD,
    'NEEDS_MAINTENANCE', p.NEEDS_MAINTENANCE,
    'BROKEN', p.BROKEN,
    p.GOOD,
  ]
}

/** Kümedeki nokta sayısına göre balon büyüsün. */
export const KUME_YARICAPI = [
  'step',
  ['get', 'point_count'],
  16, // < 25 nokta
  25,
  22, // 25-99
  100,
  30, // 100+
]

export const KUME_RENGI = (koyu) => (koyu ? '#79db8d' : '#15803d')
