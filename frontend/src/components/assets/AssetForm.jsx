import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

import { useCreateAsset, useUpdateAsset } from '../../hooks/useAssets'
import { ASSET_TYPES, STATUS_HEX, STATUS_KEYS } from '../../theme/statusColors'
import Button from '../ui/Button'
import Icon from '../ui/Icon'
import { assetSemasiOlustur, BOS_FORM } from './assetSchema'

/**
 * Varlık ekleme / düzenleme formu.
 *
 * Tasarımdaki sağ yüzen panelin içeriği (docs/design/01-harita-ekrani.html).
 * Aşama 4'te haritaya tıklanınca `koordinatDoldur` ile koordinatlar buraya akacak.
 */
export default function AssetForm({ asset, onSuccess, onCancel, koordinat }) {
  const { t } = useTranslation()
  const [konumAliniyor, setKonumAliniyor] = useState(false)

  const duzenlemeModu = Boolean(asset)
  const olustur = useCreateAsset()
  const guncelle = useUpdateAsset()
  const kaydediliyor = olustur.isPending || guncelle.isPending

  // Şema dile bağlı — dil değişince mesajlar da değişsin diye useMemo
  const sema = useMemo(() => assetSemasiOlustur(t), [t])

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(sema),
    defaultValues: BOS_FORM,
    // onBlur: kullanıcı alandan çıkınca doğrula. onChange her tuşta kızarır
    // (sinir bozucu), onSubmit ise hatayı çok geç gösterir.
    mode: 'onBlur',
  })

  // Düzenleme modunda mevcut değerleri forma yükle
  useEffect(() => {
    if (asset) {
      reset({
        name: asset.name,
        type: asset.type,
        status: asset.status,
        latitude: String(asset.latitude),
        longitude: String(asset.longitude),
        notes: asset.notes ?? '',
      })
    } else {
      reset(BOS_FORM)
    }
  }, [asset, reset])

  // Haritadan koordinat geldiğinde alanları doldur (Aşama 4)
  useEffect(() => {
    if (koordinat) {
      setValue('latitude', koordinat.lat.toFixed(6), { shouldValidate: true })
      setValue('longitude', koordinat.lon.toFixed(6), { shouldValidate: true })
    }
  }, [koordinat, setValue])

  /** Tarayıcının GPS konumunu al — tasarımdaki "Use Current" bağlantısı. */
  const konumumuKullan = () => {
    if (!navigator.geolocation) {
      toast.error(t('errors.geolocationUnsupported'))
      return
    }
    setKonumAliniyor(true)
    navigator.geolocation.getCurrentPosition(
      (konum) => {
        setValue('latitude', konum.coords.latitude.toFixed(6), { shouldValidate: true })
        setValue('longitude', konum.coords.longitude.toFixed(6), { shouldValidate: true })
        setKonumAliniyor(false)
      },
      () => {
        toast.error(t('errors.geolocationDenied'))
        setKonumAliniyor(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const gonder = async (veri) => {
    try {
      if (duzenlemeModu) {
        const sonuc = await guncelle.mutateAsync({ id: asset.id, payload: veri })
        toast.success(t('toast.updated', { name: sonuc.name }))
      } else {
        const sonuc = await olustur.mutateAsync(veri)
        toast.success(t('toast.created', { name: sonuc.name }))
        reset(BOS_FORM)
      }
      onSuccess?.()
    } catch (hata) {
      const mesaj =
        hata.kullaniciMesaji === 'NETWORK'
          ? t('errors.networkError')
          : (hata.kullaniciMesaji ?? t('errors.saveFailed'))
      toast.error(mesaj)
    }
  }

  return (
    <form onSubmit={handleSubmit(gonder)} className="flex h-full flex-col" noValidate>
      {/* Başlık */}
      <div className="flex items-center justify-between border-b border-outline-variant px-gutter py-4">
        <h2 className="text-headline-md text-on-surface">
          {t(duzenlemeModu ? 'form.editTitle' : 'form.addTitle')}
        </h2>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            aria-label={t('common.close')}
            className="rounded-lg p-1 text-on-surface-variant transition-colors hover:bg-surface-container"
          >
            <Icon name="close" className="text-[20px]" />
          </button>
        )}
      </div>

      {/* Gövde — kaydırılabilir */}
      <div className="scrollbar-thin flex-1 space-y-6 overflow-y-auto p-gutter">
        {/* Ad */}
        <Alan etiket={t('form.name')} hata={errors.name}>
          <input
            {...register('name')}
            type="text"
            placeholder={t('form.namePlaceholder')}
            aria-invalid={Boolean(errors.name)}
            className={girdiSinifi(errors.name)}
          />
        </Alan>

        {/* Tip — ikonlu segment kontrolü */}
        <Alan etiket={t('form.type')} hata={errors.type}>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <div className="grid grid-cols-5 gap-1 rounded-xl bg-surface-container p-1">
                {Object.entries(ASSET_TYPES).map(([tip, { icon }]) => {
                  const secili = field.value === tip
                  return (
                    <button
                      key={tip}
                      type="button"
                      onClick={() => field.onChange(tip)}
                      aria-pressed={secili}
                      title={t(`assetType.${tip}`)}
                      className={`flex flex-col items-center gap-1 rounded-lg py-2.5 transition-all ${
                        secili
                          ? 'bg-surface-container-lowest text-primary shadow-sm'
                          : 'text-on-surface-variant hover:bg-surface-container-lowest/50'
                      }`}
                    >
                      <Icon name={icon} filled={secili} className="text-[20px]" />
                      <span className="text-[10px] leading-tight">
                        {t(`assetType.${tip}`)}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          />
        </Alan>

        {/* Durum — renkli noktalı radio kartları */}
        <Alan etiket={t('form.status')} hata={errors.status}>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <div className="space-y-2">
                {STATUS_KEYS.map((durum) => {
                  const secili = field.value === durum
                  return (
                    <label
                      key={durum}
                      className={`flex cursor-pointer items-center rounded-xl border p-3 transition-all ${
                        secili
                          ? 'border-primary bg-primary/5'
                          : 'border-outline-variant bg-surface-container-lowest hover:bg-surface-container'
                      }`}
                    >
                      <input
                        type="radio"
                        name="status"
                        value={durum}
                        checked={secili}
                        onChange={() => field.onChange(durum)}
                        className="h-4 w-4 accent-primary"
                      />
                      <span className="ml-3 flex-1 text-body-md text-on-surface">
                        {t(`status.${durum}`)}
                      </span>
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: STATUS_HEX[durum] }}
                        aria-hidden="true"
                      />
                    </label>
                  )
                })}
              </div>
            )}
          />
        </Alan>

        {/* Koordinatlar */}
        <div className="space-y-2">
          <div className="flex items-end justify-between">
            <span className="text-label-md text-on-surface-variant">
              {t('form.coordinates')}
            </span>
            <button
              type="button"
              onClick={konumumuKullan}
              disabled={konumAliniyor}
              className="flex items-center gap-1 text-body-sm text-primary transition-opacity hover:underline disabled:opacity-50"
            >
              <Icon
                name={konumAliniyor ? 'refresh' : 'my_location'}
                className={`text-[14px] ${konumAliniyor ? 'animate-spin' : ''}`}
              />
              {t('form.useCurrent')}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <input
                {...register('latitude')}
                type="text"
                inputMode="decimal"
                placeholder={t('form.latitude')}
                aria-label={t('form.latitude')}
                aria-invalid={Boolean(errors.latitude)}
                className={`tabular ${girdiSinifi(errors.latitude)}`}
              />
              {errors.latitude && <HataMetni>{errors.latitude.message}</HataMetni>}
            </div>
            <div>
              <input
                {...register('longitude')}
                type="text"
                inputMode="decimal"
                placeholder={t('form.longitude')}
                aria-label={t('form.longitude')}
                aria-invalid={Boolean(errors.longitude)}
                className={`tabular ${girdiSinifi(errors.longitude)}`}
              />
              {errors.longitude && <HataMetni>{errors.longitude.message}</HataMetni>}
            </div>
          </div>

          <p className="flex items-center gap-1 text-body-sm text-on-surface-variant">
            <Icon name="touch_app" className="text-[14px]" />
            {t('form.mapHint')}
          </p>
        </div>

        {/* İlçe — salt okunur bilgi */}
        {duzenlemeModu && (
          <div className="rounded-xl bg-surface-container p-3">
            <p className="mb-0.5 text-label-md text-on-surface-variant">
              {t('form.district')}
            </p>
            <p className="text-body-md text-on-surface">
              {asset.district_name ?? t('table.noDistrict')}
            </p>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              {t('form.districtAuto')}
            </p>
          </div>
        )}

        {/* Notlar */}
        <Alan etiket={t('form.notes')} hata={errors.notes}>
          <textarea
            {...register('notes')}
            rows={3}
            placeholder={t('form.notesPlaceholder')}
            className={`resize-none ${girdiSinifi(errors.notes)}`}
          />
        </Alan>
      </div>

      {/* Alt aksiyonlar */}
      <div className="space-y-2 border-t border-outline-variant p-gutter">
        <Button
          type="submit"
          icon="save"
          fullWidth
          loading={kaydediliyor}
          disabled={duzenlemeModu && !isDirty}
        >
          {t(duzenlemeModu ? 'form.update' : 'form.save')}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" fullWidth onClick={onCancel}>
            {t('form.cancel')}
          </Button>
        )}
      </div>
    </form>
  )
}

/* --- Küçük yardımcı bileşenler --- */

function Alan({ etiket, hata, children }) {
  return (
    <div className="space-y-2">
      <label className="block text-label-md text-on-surface-variant">{etiket}</label>
      {children}
      {hata && <HataMetni>{hata.message}</HataMetni>}
    </div>
  )
}

function HataMetni({ children }) {
  return (
    <p role="alert" className="flex items-center gap-1 text-body-sm text-error">
      <Icon name="warning" className="text-[14px]" />
      {children}
    </p>
  )
}

function girdiSinifi(hata) {
  return [
    'w-full rounded-xl border bg-surface-container-lowest px-4 py-3 text-body-md text-on-surface',
    'placeholder:text-on-surface-variant/50',
    'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all',
    hata ? 'border-error' : 'border-outline-variant',
  ].join(' ')
}
