/**
 * Çoklu dil desteği (i18n).
 *
 * Kural: arayüzde HİÇBİR metin doğrudan yazılmaz, hepsi t('anahtar') ile gelir.
 * Böylece dil eklemek yeni bir JSON dosyası yazmaktan ibaret olur.
 */

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './en.json'
import tr from './tr.json'

const DEPOLAMA_ANAHTARI = 'greenasset-dil'

/** Kayıtlı tercih varsa onu, yoksa tarayıcı dilini, o da yoksa Türkçe kullan. */
function baslangicDili() {
  const kayitli = localStorage.getItem(DEPOLAMA_ANAHTARI)
  if (kayitli === 'tr' || kayitli === 'en') return kayitli
  return navigator.language?.startsWith('en') ? 'en' : 'tr'
}

i18n.use(initReactI18next).init({
  resources: {
    tr: { translation: tr },
    en: { translation: en },
  },
  lng: baslangicDili(),
  fallbackLng: 'tr',
  interpolation: {
    // React zaten XSS'e karşı kaçış yapıyor, i18next'in tekrar yapması gereksiz
    escapeValue: false,
  },
})

/** Dili değiştirir ve tercihi kalıcı hale getirir. */
export function dilDegistir(dil) {
  i18n.changeLanguage(dil)
  localStorage.setItem(DEPOLAMA_ANAHTARI, dil)
  document.documentElement.lang = dil
}

document.documentElement.lang = i18n.language

export default i18n
