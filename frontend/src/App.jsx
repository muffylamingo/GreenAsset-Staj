import { useState } from 'react'
import Icon from './components/ui/Icon'
import { ASSET_TYPES, STATUS_CLASSES, STATUS_HEX } from './theme/statusColors'

/**
 * GEÇİCİ EKRAN — tasarım token'larının doğru yüklendiğini doğrulamak için.
 * Aşama 3'ün gerçek ekranları (form + tablo) bunun yerine gelecek.
 */

// DİKKAT: Tailwind sınıf adlarını kaynak koddan METİN OLARAK tarar.
// `bg-${degisken}` yazarsan o sınıf hiç üretilmez ve renk görünmez.
// Bu yüzden sınıflar burada tam metin olarak duruyor.
const SURFACES = [
  ['surface-container-lowest', 'bg-surface-container-lowest'],
  ['surface-container-low', 'bg-surface-container-low'],
  ['surface-container', 'bg-surface-container'],
  ['surface-container-high', 'bg-surface-container-high'],
  ['surface-container-highest', 'bg-surface-container-highest'],
]

const BRAND = [
  ['primary', 'bg-primary text-on-primary'],
  ['primary-container', 'bg-primary-container text-on-primary-container'],
  ['secondary', 'bg-secondary text-on-secondary'],
  ['secondary-container', 'bg-secondary-container text-on-secondary-container'],
  ['tertiary', 'bg-tertiary text-on-tertiary'],
  ['error', 'bg-error text-on-error'],
]

const NAV_ICONS = ['dashboard', 'map', 'inventory_2', 'analytics']

function App() {
  const [dark, setDark] = useState(false)

  const toggleTheme = () => {
    setDark((onceki) => {
      const yeni = !onceki
      document.documentElement.classList.toggle('dark', yeni)
      return yeni
    })
  }

  return (
    <div className="min-h-screen bg-background text-on-background">
      {/* Sol ikon rayı — tasarımdaki 72px */}
      <nav className="fixed left-0 top-0 z-50 flex h-full w-nav-rail flex-col items-center border-r border-outline-variant bg-surface py-6">
        <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
          <Icon name="eco" className="text-[24px]" />
        </div>

        {NAV_ICONS.map((icon, i) => (
          <a
            key={icon}
            href="#"
            className={`relative flex w-full justify-center py-4 transition-colors hover:bg-surface-container-high ${
              i === 1
                ? "text-primary before:absolute before:left-0 before:h-8 before:w-1 before:rounded-r-full before:bg-primary before:content-['']"
                : 'text-on-surface-variant'
            }`}
          >
            <Icon name={icon} className="text-[24px]" />
          </a>
        ))}

        <button
          onClick={toggleTheme}
          className="mt-auto flex w-full justify-center py-4 text-on-surface-variant transition-colors hover:bg-surface-container-high"
          title="Temayı değiştir"
        >
          <Icon name={dark ? 'light_mode' : 'dark_mode'} className="text-[24px]" />
        </button>
      </nav>

      <main className="ml-nav-rail p-margin-page">
        <header className="mb-8">
          <h1 className="text-display text-on-surface">GreenAsset</h1>
          <p className="text-body-md text-on-surface-variant">
            Tasarım sistemi doğrulama ekranı — token'lar Stitch export'undan alındı
          </p>
        </header>

        {/* Marka renkleri */}
        <section className="mb-8">
          <h2 className="mb-4 text-headline-md">Marka renkleri</h2>
          <div className="flex flex-wrap gap-gutter">
            {BRAND.map(([ad, siniflar]) => (
              <div
                key={ad}
                className={`flex h-24 w-52 flex-col justify-end rounded-xl p-component-padding ${siniflar}`}
              >
                <span className="text-label-md">{ad}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Yüzey katmanları */}
        <section className="mb-8">
          <h2 className="mb-4 text-headline-md">Yüzey katmanları</h2>
          <div className="flex flex-wrap gap-stack-gap">
            {SURFACES.map(([ad, sinif]) => (
              <div
                key={ad}
                className={`flex h-20 w-44 items-end rounded-lg border border-outline-variant p-component-padding ${sinif}`}
              >
                <span className="text-body-sm text-on-surface-variant">{ad}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Durum renkleri */}
        <section className="mb-8">
          <h2 className="mb-4 text-headline-md">Durum renkleri</h2>
          <div className="flex flex-wrap items-center gap-gutter">
            {Object.entries(STATUS_CLASSES).map(([durum, sinif]) => (
              <span
                key={durum}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-label-md ${sinif}`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: STATUS_HEX[durum] }}
                />
                {durum}
              </span>
            ))}
          </div>
        </section>

        {/* Varlık tipleri */}
        <section className="mb-8">
          <h2 className="mb-4 text-headline-md">Varlık tipleri</h2>
          <div className="flex flex-wrap gap-stack-gap">
            {Object.entries(ASSET_TYPES).map(([tip, { icon }]) => (
              <div
                key={tip}
                className="flex w-28 flex-col items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest py-4 text-on-surface-variant"
              >
                <Icon name={icon} className="text-[24px]" />
                <span className="text-body-sm">{tip}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Tipografi */}
        <section className="mb-8">
          <h2 className="mb-4 text-headline-md">Tipografi</h2>
          <div className="space-y-2 rounded-xl border border-outline-variant bg-surface-container-lowest p-gutter">
            <p className="text-display">display 32/700</p>
            <p className="text-headline-lg">headline-lg 24/600</p>
            <p className="text-headline-md">headline-md 20/600</p>
            <p className="text-body-lg">body-lg 16/400</p>
            <p className="text-body-md">body-md 14/400</p>
            <p className="text-body-sm text-on-surface-variant">body-sm 12/400</p>
            <p className="text-label-md">LABEL-MD 12/600</p>
            <p className="tabular text-data-tabular">
              data-tabular 13/500 — 41.10500, 29.02700
            </p>
          </div>
        </section>

        {/* Ölçüler */}
        <section className="mb-8">
          <h2 className="mb-4 text-headline-md">Ölçü token'ları</h2>
          <div className="space-y-2">
            <div className="h-6 w-nav-rail rounded bg-primary-container" />
            <p className="text-body-sm text-on-surface-variant">nav-rail 72px</p>
            <div className="h-6 w-panel rounded bg-secondary-container" />
            <p className="text-body-sm text-on-surface-variant">panel 400px</p>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
