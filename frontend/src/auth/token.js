/**
 * Token deposu.
 *
 * Neden React context değil de düz bir modül? Çünkü axios interceptor'ının
 * (api/client.js) token'a erişmesi gerekiyor ve o bir React bileşeni değil —
 * hook kullanamaz. Modül seviyesinde tutup her iki taraftan da okuyoruz.
 *
 * localStorage tercihi: sayfa yenilenince oturum kaybolmasın.
 * ⚠️ localStorage XSS'e karşı korumasızdır — sayfaya kötü niyetli script
 * enjekte edilirse token okunabilir. Daha güvenli yol HttpOnly cookie'dir;
 * bu projede basitlik için localStorage seçildi.
 */

const ANAHTAR = 'greenasset-token'

let bellektekiToken = localStorage.getItem(ANAHTAR)

export function tokenAl() {
  return bellektekiToken
}

export function tokenKaydet(token) {
  bellektekiToken = token
  if (token) localStorage.setItem(ANAHTAR, token)
  else localStorage.removeItem(ANAHTAR)
}

/** Oturum sonlandığında çağrılacak fonksiyon (AuthProvider tarafından atanır). */
let oturumBittiCallback = null

export function oturumBittiDinle(fn) {
  oturumBittiCallback = fn
}

export function oturumuSonlandir() {
  tokenKaydet(null)
  oturumBittiCallback?.()
}
