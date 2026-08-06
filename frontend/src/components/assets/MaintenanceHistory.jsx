import { useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

import { useAuth } from '../../auth/AuthContext'
import {
  useCreateLog,
  useDeleteLog,
  useMaintenanceLogs,
} from '../../hooks/useMaintenance'
import { STATUS_HEX, STATUS_KEYS } from '../../theme/statusColors'
import Button from '../ui/Button'
import Icon from '../ui/Icon'
import Modal from '../ui/Modal'
import StatusBadge from '../ui/StatusBadge'

/**
 * Bir varlığın bakım geçmişi — düzenleme panelinin alt bölümü.
 *
 * Sadece kayıtlı varlıklarda görünür; yeni varlık eklerken henüz bir id yok,
 * dolayısıyla kayıt bağlanacak bir şey de yok.
 */
export default function MaintenanceHistory({ assetId }) {
  const { t, i18n } = useTranslation()
  const { yonetici, kullanici } = useAuth()
  const [formAcik, setFormAcik] = useState(false)
  const [silinecek, setSilinecek] = useState(null)

  const [not, setNot] = useState('')
  const [yapan, setYapan] = useState('')
  const [durumSonrasi, setDurumSonrasi] = useState('')

  const { data: kayitlar = [], isLoading } = useMaintenanceLogs(assetId)
  const ekle = useCreateLog(assetId)
  const sil = useDeleteLog(assetId)

  const formuSifirla = () => {
    setNot('')
    setYapan('')
    setDurumSonrasi('')
    setFormAcik(false)
  }

  /** Form açılınca "yapan kişi" alanını giriş yapan kullanıcıyla doldur. */
  const formuAc = () => {
    if (!yapan) setYapan(kullanici?.full_name ?? '')
    setFormAcik(true)
  }

  const gonder = async (e) => {
    e.preventDefault()
    if (!not.trim() || !yapan.trim()) return

    try {
      await ekle.mutateAsync({
        note: not.trim(),
        performed_by: yapan.trim(),
        // Boş string gönderirsek backend enum doğrulaması patlar; null olmalı
        status_after: durumSonrasi || null,
      })
      toast.success(t('maintenance.added'))
      formuSifirla()
    } catch (hata) {
      toast.error(hata.kullaniciMesaji ?? t('errors.saveFailed'))
    }
  }

  const silmeyiOnayla = async () => {
    try {
      await sil.mutateAsync(silinecek.id)
      toast.success(t('maintenance.deleted'))
      setSilinecek(null)
    } catch (hata) {
      toast.error(hata.kullaniciMesaji ?? t('errors.deleteFailed'))
    }
  }

  const tarihBicimle = (iso) =>
    new Date(iso).toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : 'en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })

  return (
    <div className="border-t border-outline-variant pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-label-md uppercase tracking-wider text-on-surface-variant">
          <Icon name="edit" className="text-[14px]" />
          {t('maintenance.title')}
        </h3>
        {!formAcik && (
          <button
            type="button"
            onClick={formuAc}
            className="flex items-center gap-1 text-body-sm text-primary hover:underline"
          >
            <Icon name="add" className="text-[14px]" />
            {t('maintenance.add')}
          </button>
        )}
      </div>

      {/* --- Kayıt ekleme formu --- */}
      {/* DİKKAT: <form> değil <div>. Bu bileşen AssetForm'un İÇİNDE duruyor;
          iç içe form HTML'de geçersiz ve dıştaki formu bozar. Bu yüzden
          gönderimi butonun onClick'iyle yapıyoruz. */}
      {formAcik && (
        <div className="mb-3 space-y-2 rounded-xl bg-surface-container p-3">
          <div>
            <label className="mb-1 block text-body-sm text-on-surface-variant">
              {t('maintenance.note')}
            </label>
            <textarea
              value={not}
              onChange={(e) => setNot(e.target.value)}
              rows={2}
              placeholder={t('maintenance.notePlaceholder')}
              className="w-full resize-none rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-body-sm text-on-surface-variant">
              {t('maintenance.performedBy')}
            </label>
            <input
              type="text"
              value={yapan}
              onChange={(e) => setYapan(e.target.value)}
              placeholder={t('maintenance.performedByPlaceholder')}
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-body-sm text-on-surface-variant">
              {t('maintenance.statusAfter')}
            </label>
            <select
              value={durumSonrasi}
              onChange={(e) => setDurumSonrasi(e.target.value)}
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">{t('maintenance.statusUnchanged')}</option>
              {STATUS_KEYS.map((d) => (
                <option key={d} value={d}>
                  {t(`status.${d}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              icon="save"
              onClick={gonder}
              loading={ekle.isPending}
              disabled={!not.trim() || !yapan.trim()}
            >
              {t('maintenance.save')}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={formuSifirla}>
              {t('maintenance.cancel')}
            </Button>
          </div>
        </div>
      )}

      {/* --- Geçmiş listesi --- */}
      {isLoading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-container" />
          ))}
        </div>
      ) : kayitlar.length === 0 ? (
        <p className="py-2 text-body-sm text-on-surface-variant">
          {t('maintenance.empty')}
        </p>
      ) : (
        <ol className="space-y-2">
          {kayitlar.map((kayit) => (
            <li
              key={kayit.id}
              className="rounded-lg bg-surface-container-low p-3 text-body-sm"
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <span className="nums text-on-surface-variant">
                  {tarihBicimle(kayit.performed_at)}
                </span>
                {/* Bakım kaydı silme de yöneticiye ait — backend 403 döner */}
                {yonetici && (
                  <button
                    type="button"
                    onClick={() => setSilinecek(kayit)}
                    aria-label={t('maintenance.delete')}
                    title={t('maintenance.delete')}
                    className="shrink-0 rounded p-0.5 text-on-surface-variant transition-colors hover:bg-error-container hover:text-on-error-container"
                  >
                    <Icon name="delete" className="text-[16px]" />
                  </button>
                )}
              </div>

              <p className="mb-1 text-on-surface">{kayit.note}</p>

              <div className="flex flex-wrap items-center gap-2 text-on-surface-variant">
                <span>{kayit.performed_by}</span>
                {kayit.status_after && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Icon name="arrow_downward" className="rotate-[-90deg] text-[12px]" />
                      <StatusBadge status={kayit.status_after} size="sm" />
                    </span>
                  </>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      <Modal
        open={Boolean(silinecek)}
        onClose={() => setSilinecek(null)}
        onConfirm={silmeyiOnayla}
        loading={sil.isPending}
        title={t('maintenance.confirmDeleteTitle')}
        message={t('maintenance.confirmDeleteMessage')}
      />
    </div>
  )
}

/**
 * "X gündür bakılmadı" rozeti — tabloda ve panelde kullanılır.
 *
 * Hiç bakım yoksa "0 gün" YAZMIYORUZ; bu, "bugün bakıldı" gibi okunur.
 * Ayrı bir metin gösteriyoruz.
 */
export function BakimRozeti({ gun, className = '' }) {
  const { t } = useTranslation()

  if (gun == null) {
    return (
      <span className={`text-body-sm text-on-surface-variant ${className}`}>
        {t('maintenance.neverMaintained')}
      </span>
    )
  }

  if (gun === 0) {
    return (
      <span className={`text-body-sm text-status-good ${className}`}>
        {t('maintenance.today')}
      </span>
    )
  }

  // 90 günden fazlaysa dikkat çeksin — bakım aralığı için makul bir eşik
  const gecikmis = gun > 90

  return (
    <span
      className={`inline-flex items-center gap-1 text-body-sm ${
        gecikmis ? 'text-status-maintenance' : 'text-on-surface-variant'
      } ${className}`}
    >
      {gecikmis && (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: STATUS_HEX.NEEDS_MAINTENANCE }}
        />
      )}
      {t('maintenance.daysAgo', { count: gun })}
    </span>
  )
}
