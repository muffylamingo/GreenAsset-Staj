import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useAuth } from '../../auth/AuthContext'
import { dilDegistir } from '../../i18n'
import Button from '../ui/Button'
import Icon from '../ui/Icon'

/** Giriş ekranı. Oturum yokken uygulamanın tamamı yerine bu görünür. */
export default function LoginPage() {
  const { t, i18n } = useTranslation()
  const { girisYap } = useAuth()

  const [kullaniciAdi, setKullaniciAdi] = useState('')
  const [parola, setParola] = useState('')
  const [hata, setHata] = useState(null)
  const [gonderiliyor, setGonderiliyor] = useState(false)

  const gonder = async (e) => {
    e.preventDefault()
    setHata(null)
    setGonderiliyor(true)
    try {
      await girisYap(kullaniciAdi.trim(), parola)
    } catch (h) {
      setHata(
        h.kullaniciMesaji === 'NETWORK'
          ? t('errors.networkError')
          : (h.kullaniciMesaji ?? t('auth.failed')),
      )
    } finally {
      setGonderiliyor(false)
    }
  }

  /** Demo hesabını forma doldurur — sunumda elle yazmakla vakit kaybedilmesin. */
  const demoDoldur = (ad, sifre) => {
    setKullaniciAdi(ad)
    setParola(sifre)
    setHata(null)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        {/* Marka */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container">
            <Icon name="eco" className="text-[30px]" />
          </div>
          <h1 className="text-headline-lg text-on-surface">{t('app.name')}</h1>
          <p className="text-body-sm text-on-surface-variant">{t('app.tagline')}</p>
        </div>

        <form
          onSubmit={gonder}
          className="space-y-4 rounded-xl bg-surface-container-lowest p-gutter shadow-sm"
        >
          <div>
            <label
              htmlFor="kullaniciAdi"
              className="mb-1 block text-label-md text-on-surface-variant"
            >
              {t('auth.username')}
            </label>
            <input
              id="kullaniciAdi"
              type="text"
              autoComplete="username"
              value={kullaniciAdi}
              onChange={(e) => setKullaniciAdi(e.target.value)}
              className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-body-md text-on-surface focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label
              htmlFor="parola"
              className="mb-1 block text-label-md text-on-surface-variant"
            >
              {t('auth.password')}
            </label>
            <input
              id="parola"
              type="password"
              autoComplete="current-password"
              value={parola}
              onChange={(e) => setParola(e.target.value)}
              className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-body-md text-on-surface focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {hata && (
            <p
              role="alert"
              className="flex items-center gap-1.5 rounded-lg bg-error-container px-3 py-2 text-body-sm text-on-error-container"
            >
              <Icon name="warning" className="shrink-0 text-[16px]" />
              {hata}
            </p>
          )}

          <Button
            type="submit"
            fullWidth
            loading={gonderiliyor}
            disabled={!kullaniciAdi.trim() || !parola}
          >
            {t('auth.login')}
          </Button>
        </form>

        {/* Demo hesapları — staj projesi olduğu için bilerek görünür.
            Gerçek bir kurulumda bu bölüm OLMAZ. */}
        <div className="mt-4 rounded-xl border border-outline-variant bg-surface-container p-3">
          <p className="mb-2 text-label-md uppercase tracking-wider text-on-surface-variant">
            {t('auth.demoAccounts')}
          </p>
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => demoDoldur('admin', 'admin123')}
              className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-container-high"
            >
              <span className="text-body-sm text-on-surface">
                <span className="tabular">admin / admin123</span>
              </span>
              <span className="text-body-sm text-on-surface-variant">
                {t('auth.roleAdmin')}
              </span>
            </button>
            <button
              type="button"
              onClick={() => demoDoldur('saha', 'saha123')}
              className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-container-high"
            >
              <span className="text-body-sm text-on-surface">
                <span className="tabular">saha / saha123</span>
              </span>
              <span className="text-body-sm text-on-surface-variant">
                {t('auth.roleField')}
              </span>
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => dilDegistir(i18n.language === 'tr' ? 'en' : 'tr')}
          className="mx-auto mt-4 flex items-center gap-1 text-body-sm text-on-surface-variant hover:underline"
        >
          <Icon name="language" className="text-[14px]" />
          {i18n.language === 'tr' ? 'English' : 'Türkçe'}
        </button>
      </div>
    </div>
  )
}
