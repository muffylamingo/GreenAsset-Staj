import { useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

import {
  useAssets,
  useBulkDelete,
  useBulkUpdateStatus,
  useDeleteAsset,
  useDistricts,
} from '../../hooks/useAssets'
import { ASSET_TYPES, ASSET_TYPE_KEYS, STATUS_KEYS } from '../../theme/statusColors'
import Button from '../ui/Button'
import Icon from '../ui/Icon'
import Modal from '../ui/Modal'
import { EmptyState, ErrorState, TableSkeleton } from '../ui/States'
import StatusBadge from '../ui/StatusBadge'

const SUTUNLAR = [
  { anahtar: 'name', siralanabilir: true },
  { anahtar: 'type', siralanabilir: true },
  { anahtar: 'status', siralanabilir: true },
  { anahtar: 'coordinates', siralanabilir: false },
  { anahtar: 'district', siralanabilir: false },
  { anahtar: 'createdAt', siralanabilir: true, alan: 'created_at' },
]

const SAYFA_BOYUTLARI = [10, 25, 50, 100]

export default function AssetTable({ onEdit, onAdd, onShowOnMap }) {
  const { t, i18n } = useTranslation()

  // --- Filtre ve sayfalama durumu ---
  const [arama, setArama] = useState('')
  const [tipler, setTipler] = useState([])
  const [durumlar, setDurumlar] = useState([])
  const [ilceId, setIlceId] = useState('')
  const [sayfa, setSayfa] = useState(0)
  const [sayfaBoyutu, setSayfaBoyutu] = useState(25)
  const [siralama, setSiralama] = useState({ alan: 'created_at', yon: 'desc' })

  // --- Seçim ve silme durumu ---
  const [secili, setSecili] = useState(new Set())
  const [silinecek, setSilinecek] = useState(null)
  const [topluSilOnayi, setTopluSilOnayi] = useState(false)

  const filtreler = {
    q: arama,
    types: tipler.length ? tipler : undefined,
    statuses: durumlar.length ? durumlar : undefined,
    districtId: ilceId || undefined,
    limit: sayfaBoyutu,
    offset: sayfa * sayfaBoyutu,
    sortBy: siralama.alan,
    sortDir: siralama.yon,
  }

  const { data, isLoading, isError, error, refetch, isFetching } = useAssets(filtreler)
  const { data: ilceler = [] } = useDistricts()
  const sil = useDeleteAsset()
  const topluDurum = useBulkUpdateStatus()
  const topluSil = useBulkDelete()

  const kayitlar = data?.items ?? []
  const toplam = data?.total ?? 0
  const sonSayfa = Math.max(0, Math.ceil(toplam / sayfaBoyutu) - 1)
  const filtreVarMi = Boolean(arama || tipler.length || durumlar.length || ilceId)

  /* --- Yardımcılar --- */

  // Filtre değişince ilk sayfaya dön — yoksa "5. sayfadasınız ama 2 kayıt var"
  // durumu oluşur ve ekran boş görünür.
  const filtreDegistir = (guncelleyici) => {
    guncelleyici()
    setSayfa(0)
    setSecili(new Set())
  }

  const tipDegistir = (tip) =>
    filtreDegistir(() =>
      setTipler((o) => (o.includes(tip) ? o.filter((x) => x !== tip) : [...o, tip])),
    )

  const durumDegistir = (durum) =>
    filtreDegistir(() =>
      setDurumlar((o) =>
        o.includes(durum) ? o.filter((x) => x !== durum) : [...o, durum],
      ),
    )

  const filtreleriTemizle = () =>
    filtreDegistir(() => {
      setArama('')
      setTipler([])
      setDurumlar([])
      setIlceId('')
    })

  const sirala = (alan) => {
    setSiralama((o) =>
      o.alan === alan
        ? { alan, yon: o.yon === 'asc' ? 'desc' : 'asc' }
        : { alan, yon: 'asc' },
    )
    setSayfa(0)
  }

  const secimDegistir = (id) =>
    setSecili((o) => {
      const yeni = new Set(o)
      if (yeni.has(id)) yeni.delete(id)
      else yeni.add(id)
      return yeni
    })

  const tumunuSec = () =>
    setSecili((o) =>
      o.size === kayitlar.length ? new Set() : new Set(kayitlar.map((k) => k.id)),
    )

  /* --- İşlemler --- */

  const silmeyiOnayla = async () => {
    try {
      await sil.mutateAsync(silinecek.id)
      toast.success(t('toast.deleted', { name: silinecek.name }))
      setSilinecek(null)
    } catch (hata) {
      toast.error(hata.kullaniciMesaji ?? t('errors.deleteFailed'))
    }
  }

  const topluSilmeyiOnayla = async () => {
    try {
      const sonuc = await topluSil.mutateAsync([...secili])
      toast.success(t('toast.bulkDeleted', { count: sonuc.affected }))
      setSecili(new Set())
      setTopluSilOnayi(false)
    } catch (hata) {
      toast.error(hata.kullaniciMesaji ?? t('errors.deleteFailed'))
    }
  }

  const topluDurumDegistir = async (durum) => {
    try {
      const sonuc = await topluDurum.mutateAsync({ ids: [...secili], status: durum })
      toast.success(t('toast.bulkStatusChanged', { count: sonuc.affected }))
      setSecili(new Set())
    } catch (hata) {
      toast.error(hata.kullaniciMesaji ?? t('errors.saveFailed'))
    }
  }

  const tarihBicimle = (iso) =>
    new Date(iso).toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : 'en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })

  /* --- Görünüm --- */

  return (
    <div className="flex h-full flex-col">
      {/* Başlık */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-gutter px-margin-page pt-margin-page">
        <div>
          <h1 className="text-headline-lg text-on-surface">{t('table.title')}</h1>
          <p className="nums text-body-sm text-on-surface-variant">
            {t('table.recordCount', { count: toplam })}
          </p>
        </div>

        <div className="flex items-center gap-stack-gap">
          <div className="relative">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant"
            />
            <input
              type="search"
              value={arama}
              onChange={(e) => filtreDegistir(() => setArama(e.target.value))}
              placeholder={t('table.search')}
              className="h-10 w-64 rounded-xl border border-outline-variant bg-surface-container-lowest pl-10 pr-3 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <Button icon="add" onClick={onAdd}>
            {t('table.addAsset')}
          </Button>
        </div>
      </div>

      {/* Filtre şeridi */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 px-margin-page py-gutter">
        {ASSET_TYPE_KEYS.map((tip) => (
          <Chip
            key={tip}
            aktif={tipler.includes(tip)}
            onClick={() => tipDegistir(tip)}
            icon={ASSET_TYPES[tip].icon}
          >
            {t(`assetType.${tip}`)}
          </Chip>
        ))}

        <span className="mx-1 h-5 w-px bg-outline-variant" />

        {STATUS_KEYS.map((durum) => (
          <Chip
            key={durum}
            aktif={durumlar.includes(durum)}
            onClick={() => durumDegistir(durum)}
          >
            {t(`status.${durum}`)}
          </Chip>
        ))}

        <span className="mx-1 h-5 w-px bg-outline-variant" />

        <select
          value={ilceId}
          onChange={(e) => filtreDegistir(() => setIlceId(e.target.value))}
          className="h-8 rounded-full border border-outline-variant bg-surface-container-lowest px-3 text-label-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">{t('filters.allDistricts')}</option>
          {ilceler.map((ilce) => (
            <option key={ilce.id} value={ilce.id}>
              {ilce.name} ({ilce.asset_count})
            </option>
          ))}
        </select>

        {filtreVarMi && (
          <button
            onClick={filtreleriTemizle}
            className="ml-1 text-body-sm text-primary hover:underline"
          >
            {t('table.clearAll')}
          </button>
        )}

        {isFetching && !isLoading && (
          <Icon name="refresh" className="animate-spin text-[16px] text-on-surface-variant" />
        )}
      </div>

      {/* Tablo
          min-h-0: flexbox tuzağı. Bir flex öğesi varsayılan olarak
          içeriğinden küçülemez (min-height: auto); bu satır olmadan kart
          taşar, overflow devreye girmez ve alt satırlar kırpılır. */}
      <div className="mx-margin-page mb-margin-page flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-surface-container-lowest">
        {isError ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : isLoading ? (
          <TableSkeleton rows={8} cols={SUTUNLAR.length + 1} />
        ) : kayitlar.length === 0 ? (
          <EmptyState
            filtered={filtreVarMi}
            onClear={filtreleriTemizle}
            onAdd={onAdd}
          />
        ) : (
          <div className="scrollbar-thin min-h-0 flex-1 overflow-auto">
            <table className="w-full border-collapse">
              {/* sticky: sayfa kaydıkça sütun başlıkları üstte kalsın.
                  Zemin rengi şart — yoksa satırlar başlığın altından geçer. */}
              <thead className="sticky top-0 z-10 bg-surface-container-lowest">
                <tr className="border-b border-outline-variant">
                  <th className="w-10 px-gutter py-3">
                    <input
                      type="checkbox"
                      checked={secili.size === kayitlar.length && kayitlar.length > 0}
                      onChange={tumunuSec}
                      aria-label={t('table.selected', { count: secili.size })}
                      className="h-4 w-4 accent-primary"
                    />
                  </th>

                  {SUTUNLAR.map(({ anahtar, siralanabilir, alan }) => {
                    const alanAdi = alan ?? anahtar
                    const aktif = siralama.alan === alanAdi
                    return (
                      <th
                        key={anahtar}
                        className="px-3 py-3 text-left text-label-md text-on-surface-variant"
                      >
                        {siralanabilir ? (
                          <button
                            onClick={() => sirala(alanAdi)}
                            className="inline-flex items-center gap-1 transition-colors hover:text-on-surface"
                          >
                            {t(`table.${anahtar}`)}
                            <Icon
                              name={
                                aktif && siralama.yon === 'asc'
                                  ? 'arrow_upward'
                                  : 'arrow_downward'
                              }
                              className={`text-[14px] ${aktif ? 'text-primary' : 'opacity-30'}`}
                            />
                          </button>
                        ) : (
                          t(`table.${anahtar}`)
                        )}
                      </th>
                    )
                  })}

                  <th className="w-28 px-3 py-3 text-right text-label-md text-on-surface-variant">
                    {t('table.actions')}
                  </th>
                </tr>
              </thead>

              <tbody>
                {kayitlar.map((kayit) => (
                  <tr
                    key={kayit.id}
                    className={`border-b border-outline-variant/50 transition-colors hover:bg-surface-container-low ${
                      secili.has(kayit.id) ? 'bg-primary/5' : ''
                    }`}
                    style={{ height: 52 }}
                  >
                    <td className="px-gutter">
                      <input
                        type="checkbox"
                        checked={secili.has(kayit.id)}
                        onChange={() => secimDegistir(kayit.id)}
                        aria-label={kayit.name}
                        className="h-4 w-4 accent-primary"
                      />
                    </td>

                    <td className="px-3 text-body-md text-on-surface">{kayit.name}</td>

                    <td className="px-3">
                      <span className="inline-flex items-center gap-1.5 text-body-md text-on-surface-variant">
                        <Icon
                          name={ASSET_TYPES[kayit.type]?.icon ?? 'park'}
                          className="text-[18px]"
                        />
                        {t(`assetType.${kayit.type}`)}
                      </span>
                    </td>

                    <td className="px-3">
                      <StatusBadge status={kayit.status} size="sm" />
                    </td>

                    <td className="tabular px-3 text-data-tabular text-on-surface-variant">
                      {kayit.latitude.toFixed(5)}, {kayit.longitude.toFixed(5)}
                    </td>

                    <td className="px-3 text-body-md text-on-surface-variant">
                      {kayit.district_name ?? t('table.noDistrict')}
                    </td>

                    <td className="nums px-3 text-body-sm text-on-surface-variant">
                      {tarihBicimle(kayit.created_at)}
                    </td>

                    <td className="px-3">
                      <div className="flex items-center justify-end gap-1">
                        {onShowOnMap && (
                          <SatirButonu
                            icon="location_on"
                            label={t('table.showOnMap')}
                            onClick={() => onShowOnMap(kayit)}
                          />
                        )}
                        <SatirButonu
                          icon="edit"
                          label={t('table.edit')}
                          onClick={() => onEdit(kayit)}
                        />
                        <SatirButonu
                          icon="delete"
                          label={t('table.delete')}
                          tehlike
                          onClick={() => setSilinecek(kayit)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Sayfalama */}
        {kayitlar.length > 0 && (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-gutter border-t border-outline-variant px-gutter py-3">
            <div className="flex items-center gap-2">
              <span className="text-body-sm text-on-surface-variant">
                {t('table.rowsPerPage')}
              </span>
              <select
                value={sayfaBoyutu}
                onChange={(e) => {
                  setSayfaBoyutu(Number(e.target.value))
                  setSayfa(0)
                }}
                className="h-8 rounded-lg border border-outline-variant bg-surface-container-lowest px-2 text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {SAYFA_BOYUTLARI.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="nums text-body-sm text-on-surface-variant">
                {t('table.showing', {
                  from: sayfa * sayfaBoyutu + 1,
                  to: Math.min((sayfa + 1) * sayfaBoyutu, toplam),
                  total: toplam,
                })}
              </span>
              <SatirButonu
                icon="chevron_left"
                label="←"
                disabled={sayfa === 0}
                onClick={() => setSayfa((s) => s - 1)}
              />
              <SatirButonu
                icon="chevron_right"
                label="→"
                disabled={sayfa >= sonSayfa}
                onClick={() => setSayfa((s) => s + 1)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Toplu işlem çubuğu — tasarımdaki yüzen alt bar */}
      {secili.size > 0 && (
        <div className="fixed bottom-margin-page left-1/2 z-50 flex -translate-x-1/2 items-center gap-gutter rounded-full bg-inverse-surface px-5 py-3 text-inverse-on-surface shadow-2xl">
          <span className="nums text-label-md">
            {t('table.selected', { count: secili.size })}
          </span>

          <span className="h-5 w-px bg-inverse-on-surface/25" />

          <select
            onChange={(e) => {
              if (e.target.value) {
                topluDurumDegistir(e.target.value)
                e.target.value = ''
              }
            }}
            defaultValue=""
            className="rounded-lg bg-transparent text-label-md text-inverse-on-surface focus:outline-none"
          >
            <option value="" disabled className="text-on-surface">
              {t('table.changeStatus')}
            </option>
            {STATUS_KEYS.map((durum) => (
              <option key={durum} value={durum} className="text-on-surface">
                {t(`status.${durum}`)}
              </option>
            ))}
          </select>

          <button
            onClick={() => setTopluSilOnayi(true)}
            className="flex items-center gap-1 text-label-md text-error-container transition-opacity hover:opacity-80"
          >
            <Icon name="delete" className="text-[16px]" />
            {t('table.delete')}
          </button>

          <button
            onClick={() => setSecili(new Set())}
            aria-label={t('common.close')}
            className="opacity-70 transition-opacity hover:opacity-100"
          >
            <Icon name="close" className="text-[18px]" />
          </button>
        </div>
      )}

      {/* Onay modalları */}
      <Modal
        open={Boolean(silinecek)}
        onClose={() => setSilinecek(null)}
        onConfirm={silmeyiOnayla}
        loading={sil.isPending}
        title={t('confirm.deleteTitle')}
        message={t('confirm.deleteMessage', { name: silinecek?.name ?? '' })}
      />

      <Modal
        open={topluSilOnayi}
        onClose={() => setTopluSilOnayi(false)}
        onConfirm={topluSilmeyiOnayla}
        loading={topluSil.isPending}
        title={t('confirm.bulkDeleteTitle')}
        message={t('confirm.bulkDeleteMessage', { count: secili.size })}
      />
    </div>
  )
}

/* --- Küçük yardımcı bileşenler --- */

function Chip({ aktif, onClick, icon, children }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={aktif}
      className={`inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-label-md transition-all ${
        aktif
          ? 'bg-secondary-container text-on-secondary-container'
          : 'border border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container'
      }`}
    >
      {icon && <Icon name={icon} className="text-[14px]" />}
      {children}
    </button>
  )
}

function SatirButonu({ icon, label, onClick, disabled, tehlike }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`rounded-lg p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        tehlike
          ? 'text-on-surface-variant hover:bg-error-container hover:text-on-error-container'
          : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
      }`}
    >
      <Icon name={icon} className="text-[18px]" />
    </button>
  )
}
