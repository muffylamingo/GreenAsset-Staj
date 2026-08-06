import { useCallback, useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

import { getAsset } from './api/assets'
import { useAuth } from './auth/AuthContext'
import AssetForm from './components/assets/AssetForm'
import LoginPage from './components/auth/LoginPage'
import AssetTable from './components/assets/AssetTable'
import DashboardPage from './components/dashboard/DashboardPage'
import MapPage from './components/map/MapPage'
import Icon from './components/ui/Icon'
import { useTheme } from './hooks/useTheme'
import { dilDegistir } from './i18n'

/**
 * Uygulama iskeleti.
 *
 * Yerleşim tasarımdan geliyor (docs/design/01-harita-ekrani.html):
 *   sol ikon rayı (72px) + ana içerik + sağdan açılan panel (400px)
 */

const MENU = [
  { anahtar: 'dashboard', icon: 'dashboard', hazir: true },
  { anahtar: 'map', icon: 'map', hazir: true },
  { anahtar: 'assets', icon: 'inventory_2', hazir: true },
  { anahtar: 'reports', icon: 'analytics', hazir: false },
]

export default function App() {
  const { t, i18n } = useTranslation()
  const { koyu, temaDegistir } = useTheme()
  const { kullanici, yukleniyor, cikisYap, yonetici } = useAuth()

  const [aktifSayfa, setAktifSayfa] = useState('map')
  const [panelAcik, setPanelAcik] = useState(false)
  const [duzenlenen, setDuzenlenen] = useState(null)
  // Haritadan gelen koordinat — forma aktarılacak
  const [koordinat, setKoordinat] = useState(null)
  const [seciliId, setSeciliId] = useState(null)
  // Tablodan "haritada göster" denince haritanın uçacağı nokta
  const [ucKoordinat, setUcKoordinat] = useState(null)

  const panelAc = (asset = null) => {
    setDuzenlenen(asset)
    setPanelAcik(true)
  }

  const panelKapat = () => {
    setPanelAcik(false)
    setDuzenlenen(null)
    setKoordinat(null)
    setSeciliId(null)
  }

  /**
   * Haritada boş bir yere tıklandı → ekleme formunu aç ve koordinatları doldur.
   * Ödevin 4. aşama şartı: "Harita üzerinde bir noktaya tıklandığında, o noktanın
   * koordinatlarını Ekleme Formu'na otomatik doldur."
   *
   * useCallback şart: MapView bu fonksiyonu bağımlılık olarak kullanıyor,
   * her render'da yenisi üretilirse olay dinleyicileri sürekli sökülüp takılır.
   */
  const haritayaTiklandi = useCallback((konum) => {
    setDuzenlenen(null)
    setKoordinat(konum)
    setSeciliId(null)
    setPanelAcik(true)
  }, [])

  /**
   * Haritada bir varlığa tıklandı → düzenleme formunu aç.
   *
   * DİKKAT: Harita GeoJSON'ının properties'inde sadece özet alanlar var
   * (1500 nokta × gereksiz alan = şişmiş yanıt). `notes` orada YOK.
   * Eksik veriyle formu açsak, kaydedildiğinde mevcut not silinirdi.
   * Bu yüzden tam kaydı API'den çekiyoruz.
   */
  const varligaTiklandi = useCallback(async (ozellikler) => {
    setKoordinat(null)
    setSeciliId(ozellikler.id)
    setPanelAcik(true)
    try {
      setDuzenlenen(await getAsset(ozellikler.id))
    } catch {
      toast.error(t('errors.loadFailed'))
      setPanelAcik(false)
    }
  }, [t])

  // Oturum doğrulanana kadar bekle — yoksa geçerli token'ı olan kullanıcı
  // bir an giriş ekranını görüp kaybolur, göz tırmalayan bir titreme olur
  if (yukleniyor) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="flex items-center gap-2 text-body-md text-on-surface-variant">
          <Icon name="refresh" className="animate-spin text-[20px]" />
          {t('auth.checking')}
        </p>
      </div>
    )
  }

  if (!kullanici) return <LoginPage />

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

          {/* Oturum: kim giriş yapmış + çıkış */}
          <button
            onClick={cikisYap}
            title={`${kullanici.full_name} (${t(yonetici ? 'auth.roleAdmin' : 'auth.roleField')}) — ${t('auth.logout')}`}
            className="flex w-full flex-col items-center gap-1 border-t border-outline-variant py-3 text-on-surface-variant transition-colors hover:bg-surface-container-high"
          >
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-label-md ${
                yonetici
                  ? 'bg-primary-container text-on-primary-container'
                  : 'bg-secondary-container text-on-secondary-container'
              }`}
            >
              {kullanici.username.slice(0, 2).toUpperCase()}
            </span>
            <span className="text-[10px] leading-none">{t('auth.logout')}</span>
          </button>
        </div>
      </nav>

      {/* ---------- Ana içerik ---------- */}
      {/* overflow-hidden: kaydırmayı sayfa değil, içerik kendi yapsın */}
      <main className="flex-1 overflow-hidden">
        {aktifSayfa === 'dashboard' && <DashboardPage koyu={koyu} />}

        {aktifSayfa === 'map' && (
          <MapPage
            koyu={koyu}
            onMapClick={haritayaTiklandi}
            onFeatureClick={varligaTiklandi}
            seciliId={seciliId}
            ucKoordinat={ucKoordinat}
          />
        )}

        {aktifSayfa === 'assets' && (
          <AssetTable
            onAdd={() => panelAc()}
            onEdit={(asset) => panelAc(asset)}
            onShowOnMap={(asset) => {
              setSeciliId(asset.id)
              setUcKoordinat({ lat: asset.latitude, lon: asset.longitude })
              setAktifSayfa('map')
            }}
          />
        )}
      </main>

      {/* ---------- Sağ panel ---------- */}
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
            koordinat={koordinat}
            onSuccess={panelKapat}
            onCancel={panelKapat}
          />
        )}
      </aside>

      {/* ---------- Bildirimler ---------- */}
      <Toaster
        position="bottom-center"
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
