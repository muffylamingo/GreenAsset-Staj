import { createContext, use, useCallback, useEffect, useState } from 'react'

import client from '../api/client'
import { oturumBittiDinle, tokenAl, tokenKaydet } from './token'

const AuthContext = createContext(null)

/** Oturum bilgisine erişim: const { kullanici, yonetici, girisYap, cikisYap } = useAuth() */
export function useAuth() {
  const deger = use(AuthContext)
  if (!deger) throw new Error('useAuth, AuthProvider içinde kullanılmalı')
  return deger
}

export function AuthProvider({ children }) {
  const [kullanici, setKullanici] = useState(null)
  // Sayfa ilk açıldığında token'ı doğrulayana kadar "yükleniyor" durumundayız.
  // Bu olmadan, geçerli oturumu olan kullanıcı bir an giriş ekranını görürdü.
  const [yukleniyor, setYukleniyor] = useState(Boolean(tokenAl()))

  const cikisYap = useCallback(() => {
    tokenKaydet(null)
    setKullanici(null)
  }, [])

  // 401 gelirse axios interceptor bunu tetikliyor
  useEffect(() => {
    oturumBittiDinle(() => setKullanici(null))
  }, [])

  // Sayfa yenilendiğinde: token varsa hâlâ geçerli mi diye sor
  useEffect(() => {
    if (!tokenAl()) return

    let iptal = false
    client
      .get('/auth/me')
      .then(({ data }) => {
        if (!iptal) setKullanici(data)
      })
      .catch(() => {
        // Token süresi dolmuş veya geçersiz — sessizce temizle
        tokenKaydet(null)
      })
      .finally(() => {
        if (!iptal) setYukleniyor(false)
      })

    return () => {
      iptal = true
    }
  }, [])

  const girisYap = useCallback(async (kullaniciAdi, parola) => {
    // Backend OAuth2PasswordRequestForm bekliyor: JSON değil form verisi
    const form = new URLSearchParams()
    form.append('username', kullaniciAdi)
    form.append('password', parola)

    const { data } = await client.post('/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })

    tokenKaydet(data.access_token)
    setKullanici(data.user)
    return data.user
  }, [])

  const deger = {
    kullanici,
    yukleniyor,
    girisYap,
    cikisYap,
    /** Silme gibi yıkıcı işlemler için kısayol. */
    yonetici: kullanici?.role === 'ADMIN',
  }

  return <AuthContext value={deger}>{children}</AuthContext>
}
