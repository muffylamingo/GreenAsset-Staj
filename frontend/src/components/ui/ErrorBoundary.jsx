import { Component } from 'react'

import i18n from '../../i18n'

/**
 * Hata sınırı (Error Boundary).
 *
 * React'te bir bileşen render sırasında hata fırlatırsa, React BÜTÜN ağacı
 * söker — ekran bembeyaz kalır. Kullanıcı ne olduğunu anlamaz, konsolu
 * açmayı da bilmez; "site çöktü" der ve kapatır.
 *
 * Bu bileşen o hatayı yakalayıp anlaşılır bir ekran gösterir.
 *
 * Neden sınıf bileşeni? Hata yakalama için gereken `getDerivedStateFromError`
 * ve `componentDidCatch` kancalarının hook karşılığı YOK. React'te sınıf
 * bileşeni gerektiren neredeyse tek yer burasıdır.
 *
 * DİKKAT: Olay işleyicilerindeki (onClick vb.) ve asenkron kodlardaki
 * hataları yakalamaz — onlar render sırasında oluşmadığı için React'in
 * görüş alanına girmez. Onlar için try/catch gerekir.
 */
export default class ErrorBoundary extends Component {
  state = { hata: null }

  static getDerivedStateFromError(hata) {
    return { hata }
  }

  componentDidCatch(hata, bilgi) {
    // Gerçek bir kurulumda burası Sentry gibi bir hata izleme servisine
    // gönderilir. O olmadan kullanıcıda oluşan hatalardan asla haberin olmaz:
    // kimse hata bildirmez, sadece uygulamayı kullanmayı bırakır.
    console.error('[ErrorBoundary]', hata, bilgi?.componentStack)
  }

  render() {
    if (!this.state.hata) return this.props.children

    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-surface p-8 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-error-container">
          <span className="text-2xl">⚠️</span>
        </div>

        {/* `useTranslation` yerine doğrudan i18n:
            bu bir sınıf bileşeni (hook kullanamaz) ve sağlayıcıların da
            dışında duruyor — zaten amacı, içeride bir şey patladığında
            ayakta kalabilmek. */}
        <h1 className="text-xl font-semibold text-on-surface">
          {i18n.t('errorBoundary.title')}
        </h1>

        <p className="max-w-md text-sm text-on-surface-variant">
          {i18n.t('errorBoundary.description')}
        </p>

        {/* Hatanın kendisi de gösteriliyor: kullanıcı ekran görüntüsü
            aldığında bize doğrudan işe yarar bilgi ulaşsın. */}
        <code className="max-w-md overflow-x-auto rounded-lg bg-surface-container px-3 py-2 text-xs text-error">
          {String(this.state.hata?.message ?? this.state.hata)}
        </code>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-on-primary hover:opacity-90"
        >
          {i18n.t('errorBoundary.reload')}
        </button>
      </div>
    )
  }
}
