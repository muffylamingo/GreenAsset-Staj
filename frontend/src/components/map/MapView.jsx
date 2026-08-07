// MapLibre v5 kullanıyoruz (v6 değil): v6 yeni ve haritayı hiç çizdiremedik,
// ayrıca varsayılan export'u kaldırdığı için tüm dokümantasyon/örneklerden
// ayrışıyor. v5 kararlı sürüm ve her öğretici onu anlatıyor.
// MapLibre'nin "csp" sürümü + worker'ı AYRI dosya olarak.
//
// Neden normal 'maplibre-gl' değil? Normal sürüm, arka plan işçisini
// (web worker) kendi kodunun içine gömülü bir metinden üretiyor. Vite 8'in
// paketleyicisi (Rolldown) modülleri birleştirirken bu metnin dışarıya olan
// bağlarını koparıyordu: worker "ar is not defined" hatası verip GeoJSON
// kaynağını hiç işleyemiyor, haritada tek bir varlık görünmüyordu.
// Geliştirme sunucusunda paketleme olmadığı için sorun sadece Docker/üretim
// derlemesinde ortaya çıktı.
//
// "csp" sürümü worker kodunu içine gömmez, dışarıdan bir adresten yükler.
// Vite'ın '?url' eki de dosyayı paketlemeye hiç sokmadan olduğu gibi
// kopyalayıp adresini veriyor. Böylece worker, paketleyicinin modül
// birleştirmesine hiç girmiyor ve bozulmuyor.
import maplibregl from 'maplibre-gl/dist/maplibre-gl-csp'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-csp-worker.js?url'

maplibregl.setWorkerUrl(workerUrl)
import { useCallback, useEffect, useRef } from 'react'

import { ASSET_TYPES } from '../../theme/statusColors'
import { ikonSvgAl } from '../ui/Icon'
import {
  ALTLIKLAR,
  CIZIM_KAYNAK_ID,
  CIZIM_RENGI,
  durumRengiIfadesi,
  IKON_MIN_ZOOM,
  ikonAdi,
  KATMAN,
  KAYNAK_ID,
  KUME_RENGI,
  KUME_YARICAPI,
} from './mapStyles'

/** Boş bir GeoJSON — kaynaklar veri gelmeden önce bununla kuruluyor. */
const BOS_KOLEKSIYON = { type: 'FeatureCollection', features: [] }

/**
 * SVG metnini haritanın kullanabileceği piksel verisine çevirir.
 *
 * MapLibre ikonları React bileşeni veya SVG olarak alamaz — ham piksel ister.
 * SVG'yi bir <img>'e yükleyip tuvale çiziyor, oradan ImageData alıyoruz.
 *
 * pixelRatio 2: retina ekranlarda bulanık görünmesin diye 2 kat çözünürlükte
 * çizip haritaya "bu görsel 2x" diyoruz.
 */
function svgdenGorsel(svgMetni, boyut = 22, oran = 2) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const tuval = document.createElement('canvas')
      tuval.width = boyut * oran
      tuval.height = boyut * oran
      const ctx = tuval.getContext('2d')
      ctx.drawImage(img, 0, 0, tuval.width, tuval.height)
      resolve(ctx.getImageData(0, 0, tuval.width, tuval.height))
    }
    img.onerror = reject
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMetni)}`
  })
}

/** Çizilen köşelerden görüntülenecek GeoJSON'u üretir. */
function cizimGeoJSON(koseler) {
  const ozellikler = koseler.map((k, i) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: k },
    properties: { ilk: i === 0 },
  }))

  if (koseler.length >= 2) {
    ozellikler.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: koseler },
      properties: {},
    })
  }

  // Poligon en az 3 köşeyle anlamlı; ilk köşeyi sona ekleyerek halkayı kapatıyoruz
  if (koseler.length >= 3) {
    ozellikler.push({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[...koseler, koseler[0]]] },
      properties: {},
    })
  }

  return { type: 'FeatureCollection', features: ozellikler }
}

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
  ucZoom = 17,
  cizimModu = false,
  onPolygonComplete,
  onKoseSayisiChange,
  // Bu sayı her arttığında çizim temizlenir. Fonksiyon prop'u yerine sayaç
  // kullanmak, üst bileşenin ref tutmasına gerek bırakmıyor.
  temizleSayaci = 0,
}) {
  const kapsayici = useRef(null)
  const harita = useRef(null)
  const popup = useRef(null)
  // Katmanlar eklendi mi? Tema değişiminde tekrar eklemek için gerekli.
  const veriRef = useRef(geojson)
  veriRef.current = geojson

  // Çizim durumu ref'te tutuluyor, state'te değil: harita olay dinleyicileri
  // bir kez bağlanıyor ve state'in güncel değerini göremez (stale closure).
  const koselerRef = useRef([])
  const cizimModuRef = useRef(cizimModu)
  cizimModuRef.current = cizimModu

  /**
   * Tip ikonlarını haritaya kaydeder.
   *
   * Tema değişiminde stil sıfırlanıp ikonlar da silindiği için her
   * style.load'da yeniden ekleniyor. Asenkron olması sorun değil: ikon
   * gelene kadar MapLibre o sembolü çizmiyor, geldiğinde kendiliğinden çiziyor.
   */
  const ikonlariYukle = useCallback(async (map) => {
    await Promise.all(
      Object.entries(ASSET_TYPES).map(async ([tip, { icon }]) => {
        const ad = ikonAdi(tip)
        if (map.hasImage(ad)) return
        const svg = ikonSvgAl(icon, { boyut: 22, renk: '#ffffff' })
        if (!svg) return
        try {
          const gorsel = await svgdenGorsel(svg)
          // Ara sürede tema değişip harita sıfırlanmış olabilir
          if (!map.getStyle() || map.hasImage(ad)) return
          map.addImage(ad, gorsel, { pixelRatio: 2 })
        } catch {
          /* ikon yüklenemezse sembol çizilmez, harita çalışmaya devam eder */
        }
      }),
    )
  }, [])

  /** Kaynak ve katmanları ekler. Hem ilk yüklemede hem tema değişiminde çağrılır. */
  const katmanlariEkle = useCallback(
    (map) => {
      if (map.getSource(KAYNAK_ID)) return
      ikonlariYukle(map)

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
      // Yarıçap zoom'la büyüyor: sokak ölçeğinde içine tip ikonu sığması gerek
      map.addLayer({
        id: KATMAN.noktalar,
        type: 'circle',
        source: KAYNAK_ID,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': durumRengiIfadesi(koyu),
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 4,
            15, 9,
            18, 13,
          ],
          'circle-stroke-width': 1.5,
          'circle-stroke-color': koyu ? '#0e120d' : '#ffffff',
        },
      })

      // --- Tip ikonları (sadece yakın zoom'da) ---
      // Renk durumu, ikon tipi anlatıyor. İkonlar beyaz: üç durum renginin
      // (yeşil/amber/kırmızı) üçünde de okunuyor.
      map.addLayer({
        id: KATMAN.tipIkonu,
        type: 'symbol',
        source: KAYNAK_ID,
        filter: ['!', ['has', 'point_count']],
        minzoom: IKON_MIN_ZOOM,
        layout: {
          'icon-image': ['concat', 'varlik-', ['get', 'type']],
          'icon-size': 0.5,
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
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

      // Tip ikonu katmanı en üstte kalsın (seçim halkasının da üstünde)
      if (map.getLayer(KATMAN.tipIkonu)) map.moveLayer(KATMAN.tipIkonu)

      // --- Alan çizme aracı ---
      // Ayrı bir kaynak: varlık noktalarıyla karışmasın, kümelenmesin.
      map.addSource(CIZIM_KAYNAK_ID, {
        type: 'geojson',
        data: cizimGeoJSON(koselerRef.current),
      })

      map.addLayer({
        id: KATMAN.cizimDolgu,
        type: 'fill',
        source: CIZIM_KAYNAK_ID,
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: { 'fill-color': CIZIM_RENGI(koyu), 'fill-opacity': 0.15 },
      })

      map.addLayer({
        id: KATMAN.cizimCizgi,
        type: 'line',
        source: CIZIM_KAYNAK_ID,
        filter: ['in', ['geometry-type'], ['literal', ['LineString', 'Polygon']]],
        paint: {
          'line-color': CIZIM_RENGI(koyu),
          'line-width': 2,
          'line-dasharray': [2, 1],
        },
      })

      map.addLayer({
        id: KATMAN.cizimKose,
        type: 'circle',
        source: CIZIM_KAYNAK_ID,
        filter: ['==', ['geometry-type'], 'Point'],
        paint: {
          // İlk köşe daha büyük: kullanıcı nereye tıklayıp kapatacağını görsün
          'circle-radius': ['case', ['get', 'ilk'], 8, 5],
          'circle-color': koyu ? '#0e120d' : '#ffffff',
          'circle-stroke-width': 2.5,
          'circle-stroke-color': CIZIM_RENGI(koyu),
        },
      })
    },
    [koyu, ikonlariYukle],
  )

  /** Çizim katmanını günceller. */
  const cizimiCiz = useCallback(() => {
    const kaynak = harita.current?.getSource(CIZIM_KAYNAK_ID)
    kaynak?.setData(cizimGeoJSON(koselerRef.current))
    onKoseSayisiChange?.(koselerRef.current.length)
  }, [onKoseSayisiChange])

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

    // Tarayıcı konsolundan haritayı incelemek için (window.__harita).
    // Üretim derlemesinde de açık: harita çizim sorunları ancak canlı
    // ortamda görülüyor ve bu referans olmadan teşhis edilemiyor.
    // Harita nesnesi hassas veri tutmuyor, dışarı bir şey açmıyor.
    window.__harita = map

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
      // Üretimde de yazılıyor. Önceden sadece geliştirmede yazıyordu; Docker
      // sürümünde harita boş görününce konsolda hiçbir iz kalmadığı için
      // sorunun nereden geldiği anlaşılamadı. Altlık/font/ikon hataları
      // sessizce yutulmamalı.
      console.warn('[MapLibre]', e.error?.message ?? e)
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
      if (cizimModuRef.current) return // çizim sırasında zoom yapma
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
      if (cizimModuRef.current) return // çizim sırasında varlık paneli açma
      const ozellik = e.features?.[0]
      if (!ozellik) return
      // Haritanın genel tıklamasını tetiklemesin (forma koordinat yazmasın)
      e.originalEvent.stopPropagation()
      onFeatureClick?.(ozellik.properties, ozellik.geometry.coordinates)
    }

    /**
     * Çizim modunda tıklama: köşe ekler, ilk köşeye tıklanınca alanı kapatır.
     *
     * Kapatma toleransı ekranda 14 piksel — koordinat karşılaştırması yapmak
     * yerine ekran mesafesine bakıyoruz, çünkü zoom seviyesine göre aynı
     * koordinat farkı çok farklı piksel mesafesine denk geliyor.
     */
    const cizimeTikla = (e) => {
      const koseler = koselerRef.current
      const yeni = [e.lngLat.lng, e.lngLat.lat]

      if (koseler.length >= 3) {
        const ilkNokta = map.project(koseler[0])
        const mesafe = Math.hypot(ilkNokta.x - e.point.x, ilkNokta.y - e.point.y)
        if (mesafe < 14) {
          onPolygonComplete?.({
            type: 'Polygon',
            coordinates: [[...koseler, koseler[0]]],
          })
          return
        }
      }

      koselerRef.current = [...koseler, yeni]
      cizimiCiz()
    }

    const bosalanaTikla = (e) => {
      if (cizimModuRef.current) {
        cizimeTikla(e)
        return
      }
      // Nokta veya küme üzerinde miyiz?
      const ustundekiler = map.queryRenderedFeatures(e.point, {
        layers: [KATMAN.noktalar, KATMAN.kumeler],
      })
      if (ustundekiler.length === 0) {
        onMapClick?.({ lat: e.lngLat.lat, lon: e.lngLat.lng })
      }
    }

    /** Çift tıklama: en az 3 köşe varsa alanı tamamlar. */
    const cizimiBitir = (e) => {
      if (!cizimModuRef.current) return
      e.preventDefault()
      const koseler = koselerRef.current
      if (koseler.length >= 3) {
        onPolygonComplete?.({
          type: 'Polygon',
          coordinates: [[...koseler, koseler[0]]],
        })
      }
    }

    const imlecEl = () => (map.getCanvas().style.cursor = 'pointer')
    const imlecNormal = () => (map.getCanvas().style.cursor = '')

    map.on('click', KATMAN.kumeler, kumeyeTikla)
    map.on('click', KATMAN.noktalar, noktayaTikla)
    map.on('click', bosalanaTikla)
    map.on('dblclick', cizimiBitir)
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
      map.off('dblclick', cizimiBitir)
    }
  }, [onMapClick, onFeatureClick, onPolygonComplete, cizimiCiz])

  /* --- Çizim modu açılıp kapanınca --- */
  useEffect(() => {
    const map = harita.current
    if (!map) return

    // Çizim modunda artı imleci + çift tıkla zoom kapalı olmalı,
    // yoksa alanı bitirmek isterken harita yakınlaşır.
    map.getCanvas().style.cursor = cizimModu ? 'crosshair' : ''
    if (cizimModu) map.doubleClickZoom.disable()
    else map.doubleClickZoom.enable()

    if (cizimModu) {
      koselerRef.current = []
      cizimiCiz()
    }
  }, [cizimModu, cizimiCiz])

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

  /* --- Çizimi temizle --- */
  const ilkTemizle = useRef(true)
  useEffect(() => {
    if (ilkTemizle.current) {
      ilkTemizle.current = false
      return
    }
    koselerRef.current = []
    cizimiCiz()
  }, [temizleSayaci, cizimiCiz])

  /* --- Bir konuma uç (tablodan "haritada göster" veya adres araması) --- */
  useEffect(() => {
    if (!ucKoordinat || !harita.current) return
    harita.current.flyTo({
      center: [ucKoordinat.lon, ucKoordinat.lat],
      // Varlık için 17 (tek nokta görünsün), adres için 15 (mahalle görünsün)
      zoom: ucZoom,
      duration: 1500,
    })
  }, [ucKoordinat, ucZoom])

  return <div ref={kapsayici} className="h-full w-full" />
}
