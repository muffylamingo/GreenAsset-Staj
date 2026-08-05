/**
 * Varlık formu doğrulama şeması (Zod).
 *
 * Ödevin şartı: "İsim boş olamaz, koordinatlar sayı olmalı gibi kontroller ekle."
 *
 * Şema neden fonksiyon? Hata mesajları çeviriden geliyor; dil değişince
 * mesajların da değişmesi için şemayı t() ile birlikte üretiyoruz.
 *
 * NOT: Bu doğrulama KULLANICI DENEYİMİ içindir. Güvenlik için backend'de de
 * aynı kontroller var (Pydantic). İkisi de gerekli — tarayıcı doğrulaması
 * atlanabilir, backend atlanamaz.
 */

import { z } from 'zod'

import { ASSET_TYPE_KEYS, STATUS_KEYS } from '../../theme/statusColors'

/**
 * Metin girdisini sayıya çeviren ve aralığını kontrol eden yardımcı.
 *
 * Neden bu kadar uğraş? Çünkü koordinat alanı bir metin kutusu:
 *   ""        → boş bırakılmış
 *   "abc"     → sayı değil
 *   "41,105"  → Türkçe klavyede virgüllü ondalık (çok yaygın!)
 *   "999"     → sayı ama geçersiz aralık
 * Dördünü de ayrı mesajla yakalamak gerekiyor.
 */
function koordinatAlani(min, max, gerekliAnahtar, aralikAnahtari, t) {
  return z.preprocess(
    (deger) => {
      if (deger === null || deger === undefined) return ''
      // Virgüllü ondalığı noktaya çevir: "41,105" → "41.105"
      return String(deger).trim().replace(',', '.')
    },
    z
      .string()
      .min(1, t(gerekliAnahtar))
      .refine((v) => !Number.isNaN(Number(v)), t('validation.mustBeNumber'))
      .refine((v) => {
        const sayi = Number(v)
        return sayi >= min && sayi <= max
      }, t(aralikAnahtari))
      .transform(Number),
  )
}

export function assetSemasiOlustur(t) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, t('validation.nameRequired'))
      .max(120, t('validation.nameTooLong')),

    type: z.enum(ASSET_TYPE_KEYS, { message: t('validation.typeRequired') }),

    status: z.enum(STATUS_KEYS, { message: t('validation.statusRequired') }),

    latitude: koordinatAlani(-90, 90, 'validation.latRequired', 'validation.latRange', t),
    longitude: koordinatAlani(
      -180,
      180,
      'validation.lonRequired',
      'validation.lonRange',
      t,
    ),

    notes: z
      .string()
      .max(1000, t('validation.notesTooLong'))
      .optional()
      .transform((v) => (v?.trim() ? v.trim() : null)),
  })
}

/** Form ilk açıldığındaki değerler. */
export const BOS_FORM = {
  name: '',
  type: 'TREE',
  status: 'GOOD',
  latitude: '',
  longitude: '',
  notes: '',
}
