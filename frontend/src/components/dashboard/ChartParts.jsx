import { useTranslation } from 'react-i18next'

import Icon from '../ui/Icon'

/**
 * Dashboard'un tekrar eden parçaları.
 *
 * Grafik tasarım kuralları (dataviz rehberi):
 *  - İnce çizgiler, veri ucu 4px yuvarlatılmış, çizgi kalınlığı 2px
 *  - Izgara ve eksenler geri planda (soluk)
 *  - Değerler seçici olarak doğrudan etiketlenir, her noktaya sayı yazılmaz
 *  - Metin her zaman metin renginde — seri rengiyle yazı yazılmaz
 *  - Her grafiğin tablo karşılığı olmalı (renk göremeyenler için)
 */

/** KPI kartı — tek bir sayı + trend. Bu bir grafik değil, bilerek. */
export function StatTile({ icon, label, value, trend, tone = 'neutral' }) {
  const { t } = useTranslation()

  const tonlar = {
    neutral: 'bg-surface-container-high text-on-surface-variant',
    warning: 'bg-status-maintenance/15 text-status-maintenance',
    critical: 'bg-status-broken/12 text-status-broken',
    good: 'bg-status-good/12 text-status-good',
  }

  const artiyor = trend?.change_pct != null && trend.change_pct > 0
  const azaliyor = trend?.change_pct != null && trend.change_pct < 0

  return (
    <div className="rounded-xl bg-surface-container-lowest p-gutter">
      <div className="mb-3 flex items-start justify-between">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tonlar[tone]}`}>
          <Icon name={icon} className="text-[20px]" />
        </span>

        {trend && (
          <span className="text-body-sm text-on-surface-variant">
            {trend.change_pct == null ? (
              t('dashboard.noPrevious')
            ) : (
              <span className="inline-flex items-center gap-0.5">
                <Icon
                  name={artiyor ? 'arrow_upward' : azaliyor ? 'arrow_downward' : 'check'}
                  className="text-[14px]"
                />
                <span className="nums">{Math.abs(trend.change_pct)}%</span>
              </span>
            )}
          </span>
        )}
      </div>

      <p className="nums text-display text-on-surface">{value.toLocaleString('tr-TR')}</p>
      <p className="text-body-sm text-on-surface-variant">{label}</p>
      {trend?.change_pct != null && (
        <p className="mt-0.5 text-body-sm text-on-surface-variant">
          {t('dashboard.vsLastMonth')}
        </p>
      )}
    </div>
  )
}

/** Grafik kartı — başlık + tablo görünümü anahtarı + içerik. */
export function ChartCard({ title, subtitle, children, tableRows, tableHeaders }) {
  const { t } = useTranslation()

  return (
    <section className="flex flex-col rounded-xl bg-surface-container-lowest p-gutter">
      <header className="mb-4">
        <h2 className="text-headline-md text-on-surface">{title}</h2>
        {subtitle && <p className="text-body-sm text-on-surface-variant">{subtitle}</p>}
      </header>

      <div className="flex-1">{children}</div>

      {/* Tablo görünümü: renk ayırt edemeyenler ve ekran okuyucular için.
          <details> kullanmak JavaScript'siz açılıp kapanmasını sağlıyor. */}
      {tableRows?.length > 0 && (
        <details className="mt-4 border-t border-outline-variant pt-3">
          <summary className="cursor-pointer text-body-sm text-primary hover:underline">
            {t('dashboard.showTable')}
          </summary>
          <table className="mt-2 w-full">
            <thead>
              <tr>
                {tableHeaders.map((h) => (
                  <th
                    key={h}
                    className="pb-1 text-left text-label-md text-on-surface-variant"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((satir, i) => (
                <tr key={i} className="border-t border-outline-variant/50">
                  {satir.map((hucre, j) => (
                    <td
                      key={j}
                      className={`py-1 text-body-sm text-on-surface ${j > 0 ? 'nums text-right' : ''}`}
                    >
                      {hucre}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </section>
  )
}

/**
 * Grafik ipucu (tooltip) — Recharts'ın varsayılanı tema token'larını bilmiyor.
 *
 * Metin rengi bilerek seri rengi DEĞİL: renkli bir nokta kimliği taşır,
 * yazı her zaman okunabilir metin renginde kalır.
 */
export function ChartTooltip({ active, payload, label, birim }) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 shadow-lg">
      {label != null && (
        <p className="mb-1 text-label-md text-on-surface-variant">{label}</p>
      )}
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-body-sm text-on-surface">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: p.color ?? p.fill }}
          />
          <span>{p.name}</span>
          <span className="nums ml-auto font-semibold">
            {p.value.toLocaleString('tr-TR')} {birim}
          </span>
        </p>
      ))}
    </div>
  )
}
