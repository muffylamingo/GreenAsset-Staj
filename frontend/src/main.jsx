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
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
