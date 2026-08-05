// MapLibre v5 kullanıyoruz (v6 değil): v6 yeni ve haritayı hiç çizdiremedik,
// ayrıca varsayılan export'u kaldırdığı için tüm dokümantasyon/örneklerden
// ayrışıyor. v5 kararlı sürüm ve her öğretici onu anlatıyor.
import maplibregl from 'maplibre-gl'
import { useCallback, useEffect, useRef } from 'react'

import {
  ALTLIKLAR,
  durumRengiIfadesi,
  KATMAN,
  KAYNAK_ID,
  KUME_RENGI,
  KUME_YARICAPI,
} from './mapStyles'

/**
 * MapLibre haritası.
 *
 * React + MapLibre'de iki klasik tuzak var, ikisi de burada çözülü:
 *
 *  1) Harita nesnesini useState'te tutmak → her render'da yeni harita, sonsuz
 *     döngü. Çözüm: useRef. Ref değişince React yeniden render ETMEZ.
 *
 *  2) map.addSource()'u map.on('load') beklemeden çağırmak →
 *     "Style is not done loading" hatası. Çözüm: her şeyi load içinde yap.
 *
 * Üçüncüsü tema değişimiyle geliyor: setStyle() altlığı değiştirirken BİZİM
 * katmanlarımızı da siler. Bu yüzden 'styledata' olayında yeniden ekliyoruz.
 */
export default function MapView({
  geojson,
  koyu,
  merkez = [29.027, 41.105], // İTÜ Ayazağa
  zoom = 11,
  onMapClick,
  onFeatureClick,
  onViewportChange,
  seciliId,
  ucKoordinat,
}) {
  const kapsayici = useRef(null)
  const harita = useRef(null)
  const popup = useRef(null)
  // Katmanlar eklendi mi? Tema değişiminde tekrar eklemek için gerekli.
  const veriRef = useRef(geojson)
  veriRef.current = geojson

  /** Kaynak ve katmanları ekler. Hem ilk yüklemede hem tema değişiminde çağrılır. */
  const katmanlariEkle = useCallback(
    (map) => {
      if (map.getSource(KAYNAK_ID)) return

      map.addSource(KAYNAK_ID, {
        type: 'geojson',
        data: veriRef.current ?? { type: 'FeatureCollection', features: [] },
        // Kümeleme: 1500 ayrı nokta yerine sayı balonları.
        // Hem performans hem okunabilirlik kazancı.
        cluster: true,
        clusterMaxZoom: 15, // bu zoom'dan sonra tek tek noktalar
        clusterRadius: 50,
      })

      // --- Küme balonları ---
      map.addLayer({
        id: KATMAN.kumeler,
        type: 'circle',
        source: KAYNAK_ID,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': KUME_RENGI(koyu),
          'circle-opacity': 0.25,
          'circle-radius': KUME_YARICAPI,
          'circle-stroke-width': 2,
          'circle-stroke-color': KUME_RENGI(koyu),
        },
      })

      map.addLayer({
        id: KATMAN.kumeSayisi,
        type: 'symbol',
        source: KAYNAK_ID,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          // Altlık stilinin sunduğu font — başka isim yazarsak katman hata verir
          'text-font': ['Open Sans Bold'],
          'text-size': 13,
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': koyu ? '#e3e8df' : '#00652c',
        },
      })

      // --- Tekil noktalar ---
      map.addLayer({
        id: KATMAN.noktalar,
        type: 'circle',
        source: KAYNAK_ID,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': durumRengiIfadesi(koyu),
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 4, 16, 8],
          'circle-stroke-width': 1.5,
          'circle-stroke-color': koyu ? '#0e120d' : '#ffffff',
        },
      })

      // --- Seçili nokta vurgusu (tablodan seçilince) ---
      map.addLayer({
        id: KATMAN.secili,
        type: 'circle',
        source: KAYNAK_ID,
        filter: ['==', ['get', 'id'], ''],
        paint: {
          'circle-color': 'transparent',
          'circle-radius': 14,
          'circle-stroke-width': 3,
          'circle-stroke-color': koyu ? '#79db8d' : '#00652c',
        },
      })
    },
    [koyu],
  )

  // Olay dinleyicileri sadece bir kez bağlanıyor ve ilk render'daki
  // katmanlariEkle'yi yakalıyor. Tema değişince o fonksiyon yenilenir ama
  // dinleyici eskisini çağırmaya devam eder → yanlış renkler.
  // Ref üzerinden çağırarak hep güncel sürümü kullanıyoruz.
  const katmanEkleRef = useRef(katmanlariEkle)
  katmanEkleRef.current = katmanlariEkle

  /* --- Haritayı bir kez oluştur --- */
  useEffect(() => {
    if (harita.current) return

    const map = new maplibregl.Map({
      container: kapsayici.current,
      style: ALTLIKLAR[koyu ? 'dark' : 'light'],
      center: merkez,
      zoom,
      attributionControl: { compact: true },
    })
    harita.current = map

    // Geliştirirken tarayıcı konsolundan haritayı incelemek için.
    // Üretim derlemesinde bu satır tamamen elenir (tree-shaking).
    if (import.meta.env.DEV) window.__harita = map

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    map.addControl(
      new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }),
      'bottom-left',
    )

    // 'style.load' hem ilk yüklemede hem setStyle() sonrasında tetiklenir.
    // Tema değişince altlık yeniden yüklenir ve BİZİM katmanlarımız da silinir;
    // bu olay sayesinde tek bir yerden yeniden ekleniyorlar.
    //
    // Not: 'styledata' + isStyleLoaded() kontrolü ile denendi, çalışmadı —
    // o olay stil hazır olmadan da tetikleniyor ve kontrol hep false dönüyordu.
    map.on('style.load', () => {
      katmanEkleRef.current(map)
      onViewportChange?.(map.getBounds().toArray().flat())
    })

    map.on('moveend', () => {
      // bbox: [minLon, minLat, maxLon, maxLat] — backend'in beklediği sıra
      onViewportChange?.(map.getBounds().toArray().flat())
    })

    map.on('error', (e) => {
      // Sessizce yutulmasın; altlık/font hatalarını geliştirirken görelim
      if (import.meta.env.DEV) console.warn('[MapLibre]', e.error?.message ?? e)
    })

    return () => {
      popup.current?.remove()
      map.remove()
      harita.current = null
    }
    // Sadece bir kez çalışmalı — bağımlılıklar bilerek boş.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* --- Tıklama olayları --- */
  useEffect(() => {
    const map = harita.current
    if (!map) return

    const kumeyeTikla = (e) => {
      const ozellik = e.features?.[0]
      if (!ozellik) return
      map
        .getSource(KAYNAK_ID)
        .getClusterExpansionZoom(ozellik.properties.cluster_id)
        .then((yeniZoom) => {
          map.easeTo({ center: ozellik.geometry.coordinates, zoom: yeniZoom })
        })
        .catch(() => {})
    }

    const noktayaTikla = (e) => {
      const ozellik = e.features?.[0]
      if (!ozellik) return
      // Haritanın genel tıklamasını tetiklemesin (forma koordinat yazmasın)
      e.originalEvent.stopPropagation()
      onFeatureClick?.(ozellik.properties, ozellik.geometry.coordinates)
    }

    const bosalanaTikla = (e) => {
      // Nokta veya küme üzerinde miyiz?
      const ustundekiler = map.queryRenderedFeatures(e.point, {
        layers: [KATMAN.noktalar, KATMAN.kumeler],
      })
      if (ustundekiler.length === 0) {
        onMapClick?.({ lat: e.lngLat.lat, lon: e.lngLat.lng })
      }
    }

    const imlecEl = () => (map.getCanvas().style.cursor = 'pointer')
    const imlecNormal = () => (map.getCanvas().style.cursor = '')

    map.on('click', KATMAN.kumeler, kumeyeTikla)
    map.on('click', KATMAN.noktalar, noktayaTikla)
    map.on('click', bosalanaTikla)
    map.on('mouseenter', KATMAN.kumeler, imlecEl)
    map.on('mouseleave', KATMAN.kumeler, imlecNormal)
    map.on('mouseenter', KATMAN.noktalar, imlecEl)
    map.on('mouseleave', KATMAN.noktalar, imlecNormal)

    return () => {
      map.off('click', KATMAN.kumeler, kumeyeTikla)
      map.off('click', KATMAN.noktalar, noktayaTikla)
      map.off('click', bosalanaTikla)
      map.off('mouseenter', KATMAN.kumeler, imlecEl)
      map.off('mouseleave', KATMAN.kumeler, imlecNormal)
      map.off('mouseenter', KATMAN.noktalar, imlecEl)
      map.off('mouseleave', KATMAN.noktalar, imlecNormal)
    }
  }, [onMapClick, onFeatureClick])

  /* --- Veri değişince kaynağı güncelle (haritayı yeniden kurmadan) --- */
  useEffect(() => {
    const map = harita.current
    const kaynak = map?.getSource(KAYNAK_ID)
    if (kaynak && geojson) kaynak.setData(geojson)
  }, [geojson])

  /* --- Tema değişince altlığı değiştir --- */
  const ilkTema = useRef(true)
  useEffect(() => {
    // İlk render'da atla: harita zaten doğru altlıkla oluşturuldu.
    // Burada setStyle çağırmak, harita daha yüklenirken stili sıfırlar ve
    // 'style.load' zincirini bozar — katmanlar hiç eklenmez.
    if (ilkTema.current) {
      ilkTema.current = false
      return
    }
    harita.current?.setStyle(ALTLIKLAR[koyu ? 'dark' : 'light'])
    // Katmanlar 'style.load' olayında yeniden eklenecek
  }, [koyu])

  /* --- Seçili nokta vurgusu --- */
  useEffect(() => {
    const map = harita.current
    if (!map?.getLayer(KATMAN.secili)) return
    map.setFilter(KATMAN.secili, ['==', ['get', 'id'], seciliId ?? ''])
  }, [seciliId])

  /* --- Tablodan "haritada göster" denince o noktaya uç --- */
  useEffect(() => {
    if (!ucKoordinat || !harita.current) return
    harita.current.flyTo({
      center: [ucKoordinat.lon, ucKoordinat.lat],
      zoom: 17, // kümelenmenin bittiği zoom'un üstü, tek nokta görünsün
      duration: 1500,
    })
  }, [ucKoordinat])

  return <div ref={kapsayici} className="h-full w-full" />
}
