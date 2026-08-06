import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Arayüz fontu: Plus Jakarta Sans — geometrik, modern, küçük boyutta okunaklı.
// Hepsi npm paketinden self-host ediliyor, Google Fonts CDN'e bağımlı değiliz.
import '@fontsource/plus-jakarta-sans/400.css'
import '@fontsource/plus-jakarta-sans/500.css'
import '@fontsource/plus-jakarta-sans/600.css'
import '@fontsource/plus-jakarta-sans/700.css'
import '@fontsource/plus-jakarta-sans/800.css'

// Veri fontu: JetBrains Mono — koordinat ve sayılar için, rakamlar hizalı çıkar
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'

import './index.css'
import './i18n'
import App from './App.jsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Aynı veriyi 30 saniye boyunca tekrar istemez
      staleTime: 30_000,
      // Sekmeye geri dönünce otomatik yenileme — geliştirirken gürültü yapıyor
      refetchOnWindowFocus: false,
      // Ağ hatasında 1 kez daha dene; 4xx hatalarında denemenin anlamı yok
      retry: (deneme, hata) => {
        const durum = hata?.response?.status
        if (durum >= 400 && durum < 500) return false
        return deneme < 1
      },
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
