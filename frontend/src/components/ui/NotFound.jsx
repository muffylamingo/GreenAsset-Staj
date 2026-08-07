import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'

import Icon from './Icon'

/**
 * Bilinmeyen adres sayfası.
 *
 * Neden gerekli: Nginx bulamadığı her yolu index.html'e devrediyor, yani
 * `/olmayan-sayfa` de uygulamayı açıyor. Karşılığı olan bir rota yoksa
 * kullanıcı bomboş bir ekran görür ve uygulamanın bozulduğunu sanar.
 */
export default function NotFound() {
  const { t } = useTranslation()
  const { pathname } = useLocation()

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant">
        <Icon name="search" className="text-[28px]" />
      </div>

      <h1 className="text-headline-sm text-on-surface">{t('notFound.title')}</h1>

      <p className="max-w-md text-body-md text-on-surface-variant">
        {t('notFound.description')}
      </p>

      {/* Hangi adresin bulunamadığını göstermek, kullanıcının yazım
          hatasını kendi görmesini sağlar. */}
      <code className="rounded-lg bg-surface-container px-3 py-1.5 font-mono text-body-sm text-on-surface-variant">
        {pathname}
      </code>

      <Link
        to="/map"
        className="rounded-full bg-primary px-6 py-2.5 text-label-lg text-on-primary transition-opacity hover:opacity-90"
      >
        {t('notFound.backToMap')}
      </Link>
    </div>
  )
}
