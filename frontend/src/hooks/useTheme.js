import { useEffect, useState } from 'react'

const DEPOLAMA_ANAHTARI = 'greenasset-tema'

/**
 * Açık/koyu tema yönetimi.
 *
 * Tema `<html>` etiketine `dark` sınıfı eklenerek değişir; tüm renk token'ları
 * CSS'te ona göre yeniden tanımlı (index.css). Bu yüzden bileşenlerde tek bir
 * `dark:` yazmaya gerek kalmıyor.
 */
export function useTheme() {
  const [koyu, setKoyu] = useState(() => {
    const kayitli = localStorage.getItem(DEPOLAMA_ANAHTARI)
    if (kayitli) return kayitli === 'dark'
    // Tercih yoksa işletim sisteminin ayarına uy
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', koyu)
    localStorage.setItem(DEPOLAMA_ANAHTARI, koyu ? 'dark' : 'light')
  }, [koyu])

  return { koyu, temaDegistir: () => setKoyu((o) => !o) }
}
