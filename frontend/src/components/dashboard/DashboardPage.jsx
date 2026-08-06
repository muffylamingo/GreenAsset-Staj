import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { exportUrl } from '../../api/stats'
import { useSummary, useTimeseries } from '../../hooks/useStats'
import { grafikRenkleri, STATUS_KEYS } from '../../theme/statusColors'
import Button from '../ui/Button'
import Icon from '../ui/Icon'
import { ErrorState } from '../ui/States'
import { ChartCard, ChartTooltip, StatTile } from './ChartParts'

/**
 * Gösterge paneli — ödevin 5. aşaması.
 *
 * Grafik formu seçimleri (dataviz rehberine göre):
 *  - KPI'lar     → grafik DEĞİL, sayı kartı. Tek bir değer için bar çizilmez.
 *  - Tipe göre   → yatay bar, TEK renk. Nominal kategori; bar uzunluğu zaten
 *                  büyüklüğü gösteriyor, renge ikinci bir iş yüklemiyoruz.
 *  - Duruma göre → yığılmış tek bar (parça-bütün). Burada renk gerçekten anlam
 *                  taşıyor (iyi/bakım/arızalı) → durum paleti + etiket.
 *  - İlçeye göre → yatay bar, tek renk (büyüklük karşılaştırması).
 *  - Zaman       → alan grafiği, tek seri → gösterge kutusu yok, başlık yeterli.
 */

const ARALIKLAR = [
  { ay: 12, anahtar: 'range12' },
  { ay: 6, anahtar: 'range6' },
  { ay: 3, anahtar: 'range3' },
]

export default function DashboardPage({ koyu }) {
  const { t, i18n } = useTranslation()
  const [aylar, setAylar] = useState(12)

  const { data: ozet, isLoading, isError, error, refetch } = useSummary(8)
  const { data: seri } = useTimeseries(aylar)

  const renk = grafikRenkleri(koyu)

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    )
  }

  if (isLoading || !ozet) {
    return (
      <div className="grid animate-pulse gap-gutter p-margin-page md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-surface-container-high" />
        ))}
        <div className="h-72 rounded-xl bg-surface-container-high md:col-span-2" />
        <div className="h-72 rounded-xl bg-surface-container-high md:col-span-2" />
      </div>
    )
  }

  /* --- Veri hazırlığı --- */

  const tipVerisi = ozet.by_type.map((o) => ({
    ad: t(`assetType.${o.key}`),
    adet: o.count,
  }))

  const ilceVerisi = ozet.by_district.map((o) => ({ ad: o.key, adet: o.count }))

  // Yığılmış tek bar: her durum ayrı bir "seri" olmalı, o yüzden tek satırlık dizi
  const durumSatiri = [
    Object.fromEntries([
      ['ad', t('dashboard.byStatus')],
      ...STATUS_KEYS.map((d) => [
        d,
        ozet.by_status.find((o) => o.key === d)?.count ?? 0,
      ]),
    ]),
  ]

  const zamanVerisi =
    seri?.points.map((p) => ({
      donem: p.period.slice(2), // "2026-08" → "26-08", eksende yer kazanır
      adet: p.count,
    })) ?? []

  const indir = (format) => {
    const a = document.createElement('a')
    a.href = exportUrl(format)
    a.download = ''
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-gutter p-margin-page">
        {/* --- Başlık + dışa aktarma --- */}
        <header className="flex flex-wrap items-start justify-between gap-gutter">
          <div>
            <h1 className="text-headline-lg text-on-surface">{t('dashboard.title')}</h1>
            <p className="text-body-sm text-on-surface-variant">
              {t('dashboard.subtitle')}
            </p>
          </div>

          <div className="flex gap-stack-gap">
            <Button variant="outlined" icon="download" onClick={() => indir('csv')}>
              {t('dashboard.exportCsv')}
            </Button>
            <Button variant="outlined" icon="download" onClick={() => indir('geojson')}>
              {t('dashboard.exportGeojson')}
            </Button>
          </div>
        </header>

        {/* --- KPI satırı --- */}
        <div className="grid gap-gutter sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            icon="inventory_2"
            label={t('dashboard.kpiTotal')}
            value={ozet.total}
            trend={ozet.total_trend}
          />
          <StatTile
            icon="edit"
            tone="warning"
            label={t('dashboard.kpiMaintenance')}
            value={ozet.needs_maintenance}
            trend={ozet.maintenance_trend}
          />
          <StatTile
            icon="warning"
            tone="critical"
            label={t('dashboard.kpiBroken')}
            value={ozet.broken}
          />
          <StatTile
            icon="add"
            tone="good"
            label={t('dashboard.kpiThisMonth')}
            value={ozet.added_this_month}
          />
        </div>

        {/* --- Tipe göre + durum --- */}
        <div className="grid gap-gutter lg:grid-cols-2">
          <ChartCard
            title={t('dashboard.byType')}
            tableHeaders={[t('table.type'), t('dashboard.assetsUnit')]}
            tableRows={tipVerisi.map((d) => [d.ad, d.adet])}
          >
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={tipVerisi}
                layout="vertical"
                margin={{ left: 0, right: 40, top: 4, bottom: 4 }}
              >
                <CartesianGrid horizontal={false} stroke={renk.grid} strokeDasharray="2 4" />
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="ad"
                  width={130}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: renk.axis, fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: renk.grid, fillOpacity: 0.4 }}
                  content={<ChartTooltip birim={t('dashboard.assetsUnit')} />}
                />
                {/* radius: veri ucu yuvarlak, taban köşeli — bar tabana çakılı durur */}
                {/* radius: veri ucu yuvarlak, taban köşeli — bar tabana çakılı durur */}
                <Bar
                  dataKey="adet"
                  fill={renk.bar}
                  radius={[0, 4, 4, 0]}
                  barSize={18}
                  isAnimationActive={false}
                >
                  <LabelList dataKey="adet" position="right" fill={renk.axis} fontSize={12} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title={t('dashboard.byStatus')}
            tableHeaders={[t('table.status'), t('dashboard.assetsUnit')]}
            tableRows={STATUS_KEYS.map((d) => [
              t(`status.${d}`),
              ozet.by_status.find((o) => o.key === d)?.count ?? 0,
            ])}
          >
            <ResponsiveContainer width="100%" height={120}>
              <BarChart
                data={durumSatiri}
                layout="vertical"
                margin={{ left: 0, right: 0, top: 24, bottom: 0 }}
              >
                {/* hide yerine görsel gizleme: Recharts 3'te `hide` verilen
                    eksen ölçek üretmiyor, o zaman barın genişliği
                    hesaplanamıyor ve hiçbir şey çizilmiyor. */}
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="ad" hide />
                <Tooltip content={<ChartTooltip birim={t('dashboard.assetsUnit')} />} />
                {STATUS_KEYS.map((durum, i) => (
                  <Bar
                    key={durum}
                    dataKey={durum}
                    name={t(`status.${durum}`)}
                    stackId="durum"
                    fill={renk.status[durum]}
                    barSize={44}
                    isAnimationActive={false}
                    // Segmentler arası 2px boşluk: bitişik renkler birbirine
                    // karışmasın (renk körlüğünde ayırt ediciliği artırır)
                    stroke="var(--color-surface-container-lowest)"
                    strokeWidth={2}
                    radius={
                      i === 0
                        ? [4, 0, 0, 4]
                        : i === STATUS_KEYS.length - 1
                          ? [0, 4, 4, 0]
                          : 0
                    }
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>

            {/* Gösterge: renk tek başına bilgi taşımamalı — her zaman metinle */}
            <ul className="mt-3 flex flex-wrap gap-x-gutter gap-y-1">
              {STATUS_KEYS.map((durum) => {
                const adet = ozet.by_status.find((o) => o.key === durum)?.count ?? 0
                const yuzde = ozet.total ? Math.round((adet / ozet.total) * 100) : 0
                return (
                  <li
                    key={durum}
                    className="flex items-center gap-1.5 text-body-sm text-on-surface-variant"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: renk.status[durum] }}
                    />
                    {t(`status.${durum}`)}
                    <span className="nums font-semibold text-on-surface">
                      {adet} (%{yuzde})
                    </span>
                  </li>
                )
              })}
            </ul>
          </ChartCard>
        </div>

        {/* --- İlçeler --- */}
        <ChartCard
          title={t('dashboard.byDistrict')}
          tableHeaders={[t('table.district'), t('dashboard.assetsUnit')]}
          tableRows={ilceVerisi.map((d) => [d.ad, d.adet])}
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={ilceVerisi}
              layout="vertical"
              margin={{ left: 0, right: 40, top: 4, bottom: 4 }}
            >
              <CartesianGrid horizontal={false} stroke={renk.grid} strokeDasharray="2 4" />
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="ad"
                width={110}
                tickLine={false}
                axisLine={false}
                tick={{ fill: renk.axis, fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: renk.grid, fillOpacity: 0.4 }}
                content={<ChartTooltip birim={t('dashboard.assetsUnit')} />}
              />
              <Bar dataKey="adet" fill={renk.bar} radius={[0, 4, 4, 0]} barSize={16}>
                <LabelList dataKey="adet" position="right" fill={renk.axis} fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* --- Zaman serisi --- */}
        <ChartCard
          title={t('dashboard.overTime')}
          tableHeaders={[t('table.createdAt'), t('dashboard.assetsUnit')]}
          tableRows={zamanVerisi.map((d) => [d.donem, d.adet])}
        >
          <div className="mb-3 flex gap-1">
            {ARALIKLAR.map(({ ay, anahtar }) => (
              <button
                key={ay}
                onClick={() => setAylar(ay)}
                aria-pressed={aylar === ay}
                className={`rounded-full px-3 py-1 text-label-md transition-colors ${
                  aylar === ay
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {t(`dashboard.${anahtar}`)}
              </button>
            ))}
          </div>

          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={zamanVerisi} margin={{ left: -20, right: 8, top: 4, bottom: 4 }}>
              <defs>
                <linearGradient id="alanDolgusu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={renk.area} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={renk.area} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={renk.grid} strokeDasharray="2 4" />
              <XAxis
                dataKey="donem"
                tickLine={false}
                axisLine={false}
                tick={{ fill: renk.axis, fontSize: 11 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={48}
                tick={{ fill: renk.axis, fontSize: 11 }}
              />
              <Tooltip content={<ChartTooltip birim={t('dashboard.assetsUnit')} />} />
              <Area
                type="monotone"
                dataKey="adet"
                name={t('dashboard.assetsUnit')}
                stroke={renk.area}
                strokeWidth={2}
                fill="url(#alanDolgusu)"
                // Nokta yalnız üzerine gelince belirsin — her noktaya işaret
                // koymak 12 aylık seride gürültü yapar
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2 }}
                // Animasyon kapalı: Recharts büyüme animasyonunu
                // requestAnimationFrame ile yapıyor. Uygulama arka plan
                // sekmesinde açılırsa rAF durur ve grafik BOŞ görünür.
                // Dashboard'da veri anında görünmeli, animasyon şart değil.
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <p className="flex items-center gap-1.5 pb-4 text-body-sm text-on-surface-variant">
          <Icon name="language" className="text-[14px]" />
          {i18n.language === 'tr'
            ? 'İlçe sınırları © OpenStreetMap katkıda bulunanları (ODbL)'
            : 'District boundaries © OpenStreetMap contributors (ODbL)'}
        </p>
      </div>
    </div>
  )
}
