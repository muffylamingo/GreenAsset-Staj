import { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

import AssetForm from './components/assets/AssetForm'
import AssetTable from './components/assets/AssetTable'
import Icon from './components/ui/Icon'
import { useTheme } from './hooks/useTheme'
import { dilDegistir } from './i18n'

/**
 * Uygulama iskeleti.
 *
 * Yerleşim tasarımdan geliyor (docs/design/01-harita-ekrani.html):
 *   sol ikon rayı (72px) + ana içerik + sağdan açılan panel (400px)
 *
 * Aşama 4'te "Harita" sekmesi eklenecek ve panel haritanın üzerine binecek.
 */

const MENU = [
  { anahtar: 'dashboard', icon: 'dashboard', hazir: false },
  { anahtar: 'map', icon: 'map', hazir: false },
  { anahtar: 'assets', icon: 'inventory_2', hazir: true },
  { anahtar: 'reports', icon: 'analytics', hazir: false },
]

export default function App() {
  const { t, i18n } = useTranslation()
  const { koyu, temaDegistir } = useTheme()

  const [aktifSayfa, setAktifSayfa] = useState('assets')
  const [panelAcik, setPanelAcik] = useState(false)
  const [duzenlenen, setDuzenlenen] = useState(null)

  const panelAc = (asset = null) => {
    setDuzenlenen(asset)
    setPanelAcik(true)
  }

  const panelKapat = () => {
    setPanelAcik(false)
    setDuzenlenen(null)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-on-background">
      {/* ---------- Sol ikon rayı ---------- */}
      <nav className="flex w-nav-rail shrink-0 flex-col items-center border-r border-outline-variant bg-surface py-6">
        <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
          <Icon name="eco" className="text-[24px]" />
        </div>

        <div className="flex w-full flex-col">
          {MENU.map(({ anahtar, icon, hazir }) => {
            const aktif = aktifSayfa === anahtar
            return (
              <button
                key={anahtar}
                onClick={() => hazir && setAktifSayfa(anahtar)}
                disabled={!hazir}
                title={hazir ? t(`nav.${anahtar}`) : `${t(`nav.${anahtar}`)} — yakında`}
                aria-current={aktif ? 'page' : undefined}
                className={`relative flex w-full justify-center py-4 transition-colors ${
                  aktif
                    ? "text-primary before:absolute before:left-0 before:h-8 before:w-1 before:rounded-r-full before:bg-primary before:content-['']"
                    : hazir
                      ? 'text-on-surface-variant hover:bg-surface-container-high'
                      : 'text-on-surface-variant/30'
                }`}
              >
                <Icon name={icon} filled={aktif} className="text-[24px]" />
              </button>
            )
          })}
        </div>

        <div className="mt-auto flex w-full flex-col">
          <button
            onClick={() => dilDegistir(i18n.language === 'tr' ? 'en' : 'tr')}
            title={t('nav.toggleLanguage')}
            className="flex w-full flex-col items-center gap-0.5 py-3 text-on-surface-variant transition-colors hover:bg-surface-container-high"
          >
            <Icon name="language" className="text-[22px]" />
            <span className="text-[10px] font-bold uppercase">{i18n.language}</span>
          </button>

          <button
            onClick={temaDegistir}
            title={t('nav.toggleTheme')}
            className="flex w-full justify-center py-4 text-on-surface-variant transition-colors hover:bg-surface-container-high"
          >
            <Icon name={koyu ? 'light_mode' : 'dark_mode'} className="text-[22px]" />
          </button>
        </div>
      </nav>

      {/* ---------- Ana içerik ---------- */}
      {/* overflow-hidden: kaydırmayı sayfa değil, tablonun kendi gövdesi yapsın.
          Böylece sütun başlıkları ve sayfalama hep ekranda kalır. */}
      <main className="flex-1 overflow-hidden">
        {aktifSayfa === 'assets' && (
          <AssetTable onAdd={() => panelAc()} onEdit={(asset) => panelAc(asset)} />
        )}
      </main>

      {/* ---------- Sağ panel ---------- */}
      {/* Mobilde arka planı karartan katman */}
      {panelAcik && (
        <div
          className="fixed inset-0 z-40 bg-inverse-surface/30 backdrop-blur-sm md:hidden"
          onClick={panelKapat}
          role="presentation"
        />
      )}

      <aside
        className={`fixed right-0 top-0 z-50 h-full w-panel max-w-full border-l border-outline-variant bg-surface-container-lowest shadow-2xl transition-transform duration-300 ${
          panelAcik ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!panelAcik}
      >
        {panelAcik && (
          <AssetForm
            asset={duzenlenen}
            onSuccess={panelKapat}
            onCancel={panelKapat}
          />
        )}
      </aside>

      {/* ---------- Bildirimler ---------- */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: 'var(--color-inverse-surface)',
            color: 'var(--color-inverse-on-surface)',
            fontSize: '14px',
            borderRadius: '12px',
          },
        }}
      />
    </div>
  )
}
