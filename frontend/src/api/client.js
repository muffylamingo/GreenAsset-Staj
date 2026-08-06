/**
 * Merkezi HTTP istemcisi.
 *
 * Kodun hiçbir yerinde doğrudan fetch/axios çağrılmaz — hepsi buradan geçer.
 * Böylece taban adres, zaman aşımı ve hata mesajları tek yerden yönetilir.
 */

import axios from 'axios'

import { oturumuSonlandir, tokenAl } from '../auth/token'

// Geliştirmede Vite proxy'si /api'yi backend'e yönlendiriyor (vite.config.js),
// bu yüzden tam adres yazmaya gerek yok. Üretimde .env ile değiştirilebilir.
const TABAN_ADRES = import.meta.env.VITE_API_URL || '/api/v1'

const client = axios.create({
  baseURL: TABAN_ADRES,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
})

/**
 * Giden her isteğe oturum biletini ekler.
 *
 * "Bearer" OAuth2 standardının belirlediği önek — backend'deki
 * OAuth2PasswordBearer tam olarak bu biçimi bekliyor.
 */
client.interceptors.request.use((config) => {
  const token = tokenAl()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/**
 * Hata yakalayıcı: backend'in döndüğü hatayı okunabilir bir mesaja çevirir.
 *
 * FastAPI doğrulama hataları şöyle gelir:
 *   { detail: [{ loc: ["body","name"], msg: "...", type: "..." }] }
 * Düz hatalar ise:
 *   { detail: "Varlık bulunamadı" }
 */
client.interceptors.response.use(
  (response) => response,
  (error) => {
    // Sunucuya hiç ulaşılamadı (backend kapalı, ağ yok)
    if (!error.response) {
      error.kullaniciMesaji = 'NETWORK'
      return Promise.reject(error)
    }

    // 401: token yok, geçersiz ya da süresi dolmuş → oturumu kapat.
    // Kullanıcı "neden hiçbir şey yüklenmiyor" diye bakmasın, giriş
    // ekranına dönsün.
    //
    // Giriş isteğinin kendisi hariç: orada 401 "parola yanlış" demek,
    // oturumun bitmesi anlamına gelmiyor.
    const girisIstegi = error.config?.url?.includes('/auth/login')
    if (error.response.status === 401 && !girisIstegi) {
      oturumuSonlandir()
    }

    const detay = error.response.data?.detail

    if (Array.isArray(detay)) {
      // Doğrulama hataları — alan adlarıyla birlikte topla
      error.kullaniciMesaji = detay
        .map((h) => {
          const alan = Array.isArray(h.loc) ? h.loc[h.loc.length - 1] : ''
          return alan ? `${alan}: ${h.msg}` : h.msg
        })
        .join(' · ')
    } else if (typeof detay === 'string') {
      error.kullaniciMesaji = detay
    } else {
      error.kullaniciMesaji = `HTTP ${error.response.status}`
    }

    return Promise.reject(error)
  },
)

export default client
