# 📊 GreenAsset — İlerleme Takibi

> Son güncelleme: 2026-08-05
> Bu dosya her aşama bittiğinde güncellenir.

---

## Genel Durum

### Ödevin istediği 5 aşama: **BİTTİ** ✅

```
████████████████████████████████████████  100%
```

### Ek paket (7 madde): **4 bitti, 3 kaldı**

```
██████████████████████████░░░░░░░░░░░░░░  ~65%
```

| Kod | Özellik | Durum |
|---|---|---|
| **B4** | Adres arama (Nominatim) | ✅ Bitti |
| **B5** | Bakım geçmişi | ✅ Bitti |
| **D1** | JWT rol bazlı yetki | ✅ Bitti |
| — | Harita tip ikonları (zoom'a bağlı) | ✅ Bitti |
| **B1** | Yakındakiler arayüzü | ⏳ ~1 saat (backend hazır) |
| **C2** | Pytest testleri | ⏳ ~3-4 saat |
| **C5** | Frontend Docker + README + final PR | ⏳ ~3 saat |

**Kalan tahmini süre: ~7-8 saat (1 çalışma günü).**
Elinde 10 gün var, 3-4 günde bitirme hedefin rahatlıkla tutuyor.

---

## Aşama durumları (ödev)

| # | Aşama | Ağırlık | Durum | Tamamlanma |
|---|---|---|---|---|
| 0 | Hazırlık & Git | 5% | ✅ Bitti | `██████████` 100% |
| 1 | Veritabanı & Docker | 15% | ✅ Bitti | `██████████` 100% |
| 2 | Backend REST API | 25% | ✅ Bitti | `██████████` 100% |
| 3 | Frontend — form & tablo | 20% | ✅ Bitti | `██████████` 100% |
| 4 | Harita entegrasyonu | 15% | ✅ Bitti | `██████████` 100% |
| 5 | Analiz & raporlama | 15% | ✅ Bitti | `██████████` 100% |
| 6 | Cila & teslim | 5% | ⚪ Başlanmadı | `░░░░░░░░░░` 0% |

**Hesap:** 5 + 15 + 25 + 20 + 15 + 15 = **95%**

> Ödevin istediği **5 aşamanın tamamı bitti.** Kalan %5 teslim hazırlığı:
> Docker, README, testler ve ek paket seçimi.

---

## Aşama 0 — Hazırlık ✅ 100%

- [x] Docker Desktop çalışıyor
- [x] Git repo başlatıldı, `main` dalı
- [x] `.gitignore` (`.env` sızmıyor — doğrulandı)
- [x] GitHub repo bağlandı: `muffylamingo/GreenAsset-Staj`
- [x] Klasör mimarisi kuruldu
- [x] Dal stratejisi: her aşama bir `feature/*` dalı + PR

---

## Aşama 1 — Veritabanı & Docker ✅ 100%

- [x] `docker-compose.yml` — PostGIS 16-3.4 + pgAdmin 4 + FastAPI
- [x] Healthcheck (backend, DB hazır olmadan başlamıyor)
- [x] Named volume (`postgres_data`) — veri kalıcı
- [x] `.env.example` → `.env`
- [x] PostGIS eklentileri: `postgis`, `pgcrypto`, `unaccent`
- [x] Alembic kurulumu + `env.py`'de PostGIS sistem tabloları hariç tutuldu
- [x] Migration 0001 — `assets` tablosu, GIST index, `updated_at` trigger
- [x] Migration 0002 — `districts` tablosu, 5 varlık tipi, FK

**Doğrulandı:** `PostGIS 3.4 USE_GEOS=1 USE_PROJ=1`, 8 kolon, 4 index, 1 trigger.

---

## Aşama 2 — Backend REST API ✅ 100%

### Uçlar
- [x] `POST /api/v1/assets` — ilçe `ST_Within` ile otomatik atanıyor
- [x] `GET /api/v1/assets` — **GeoJSON FeatureCollection** (varsayılan)
- [x] `GET /api/v1/assets?format=json` — tablo için düz liste
- [x] `GET /api/v1/assets/{id}`
- [x] `PUT /api/v1/assets/{id}` — koordinat değişirse ilçe yeniden hesaplanıyor
- [x] `DELETE /api/v1/assets/{id}`
- [x] `PATCH /api/v1/assets/bulk/status` — toplu durum değiştirme
- [x] `POST /api/v1/assets/bulk/delete` — toplu silme
- [x] `GET /api/v1/districts` — varlık sayılarıyla
- [x] `GET /api/v1/districts/geojson` — `ST_SimplifyPreserveTopology` ile

### Filtreler
- [x] `type` (çoklu) · `status` (çoklu) · `district_id`
- [x] `q` — `unaccent` ile Türkçe arama ("cinar" → "Çınar")
- [x] `bbox` — `ST_MakeEnvelope` + `ST_Intersects`
- [x] `limit` / `offset` + `X-Total-Count` başlığı
- [x] `sort_by` / `sort_dir`

### Veri
- [x] `db/seed/fetch_districts.py` — OSM'den 39 İstanbul ilçesi (ODbL)
- [x] `app/seed.py` — `ST_GeneratePoints` ile 1475 varlık
- [x] Bütünlük doğrulandı: **0 varlık yanlış ilçede**

### Mimari
- [x] Katmanlar ayrı: `schemas` → `crud` → `api`
- [x] Koordinat dönüşümleri tek dosyada (`core/geo.py`)
- [x] Swagger `/docs` Türkçe açıklamalarla

---

## Aşama 3 — Frontend: form & tablo ✅ 100%

### Altyapı
- [x] Vite + React 19 kurulumu
- [x] Tailwind v4 + Material Design 3 token'ları (46 renk, 8 tipografi, 6 ölçü)
- [x] Açık + koyu tema (token adları sabit, değerler değişiyor)
- [x] Yüzey rampası açıldı (kullanıcı geri bildirimi)
- [x] Plus Jakarta Sans + JetBrains Mono, self-host
- [x] `statusColors.js` — durum renkleri TEK KAYNAK
- [x] `Icon.jsx` — 35 ikon inline SVG (3.96 MB font yerine ~8 KB)
- [x] Vite proxy `/api → :8000` (geliştirmede CORS yok)

### i18n
- [x] `react-i18next`, `tr.json` / `en.json` (~90 anahtar)
- [x] Dil anahtarı + localStorage'a kayıt + `<html lang>` güncellemesi

### Veri katmanı
- [x] Axios client + hata çevirici (FastAPI 422 → okunabilir mesaj)
- [x] `assets.js` / `districts.js` — API sözleşmesini bilen tek yer
- [x] React Query hook'ları + mutation sonrası otomatik tazeleme

### AssetForm (React Hook Form + Zod)
- [x] İsim boş olamaz — sadece boşluk girişi de reddediliyor
- [x] Enlem −90..90, boylam −180..180, "sayı olmalı" kontrolü
- [x] **Virgüllü ondalık desteği** — `41,105` → `41.105`
- [x] Tip seçimi (5 ikonlu segment kontrolü)
- [x] Durum seçimi (renkli noktalı radio kartları)
- [x] "Konumumu kullan" — tarayıcı geolocation
- [x] Not alanı, düzenleme modu, ilçe bilgisi gösterimi

### AssetTable
- [x] Sütunlar: ad, tip, durum rozeti, koordinat, ilçe, tarih, aksiyonlar
- [x] Sıralanabilir başlıklar (ad / tip / durum / tarih)
- [x] Arama + tip/durum chip'leri + ilçe seçici + "Tümünü temizle"
- [x] Toplu seçim + yüzen aksiyon çubuğu (durum değiştir / sil)
- [x] Sayfalama (10/25/50/100)
- [x] Silmeden önce onay modalı (Esc, odak yönetimi, aria-modal)

### UI bileşenleri ve durum ekranları
- [x] Button (5 varyant), StatusBadge, Modal
- [x] TableSkeleton / EmptyState / ErrorState
- [x] Toast bildirimleri

### Tarayıcıda doğrulandı
| Test | Sonuç |
|---|---|
| Boş form gönderimi | 3 alan hatası, doğru mesajlar |
| `"   "` isim | "İsim boş olamaz" |
| `"abc"` enlem | "Sayı olmalı" |
| `"999"` boylam | Aralık hatası |
| `41,105` / `29,027` kayıt | `41.105` olarak kaydedildi, ilçe **Sarıyer** |
| Kayıt sonrası | Sayaç 1475→1476, panel kapandı |
| Silme modalı | Odak "Sil"e geçti, `aria-modal="true"` |
| Silme sonrası | Boş durum ekranı, sayaç 1475 |
| Toplu durum değiştirme | Toast: "1 varlığın durumu değiştirildi" |
| Dil değiştirme | `lang="en"`, tüm metinler İngilizce, tercih kaydedildi |

---

## Aşama 4 — Harita entegrasyonu 🟡 85%

- [x] MapLibre kurulumu + `useRef` ile harita nesnesi (sonsuz render tuzağı)
- [x] Ücretsiz altlık (Carto Positron açık / Dark Matter koyu)
- [x] Harita İstanbul'da açılıyor (İTÜ Ayazağa merkezli, zoom 11)
- [x] Backend GeoJSON'ı `source` olarak bağlı
- [x] `circle-layer` + duruma göre renk
- [x] **Kümeleme (clustering)** — 1500 nokta yerine sayı balonları
- [x] **Haritaya tıkla → form koordinatları otomatik dolsun** (ödev şartı)
- [x] Noktaya tıkla → tam kayıt API'den çekilip düzenleme paneli açılıyor
- [x] Legend kartı (durum renkleri + tip ikonları)
- [x] Filtre chip şeridi + harita üstü arama
- [x] "N varlık görünüyor" rozeti — bbox'a bağlı canlı sayaç
- [x] Tablo → haritada göster (`flyTo` + seçili nokta vurgusu)
- [x] Tema değişince harita altlığı da değişiyor
- [ ] Noktaya tıklayınca **popup** (şu an doğrudan düzenleme paneli açılıyor)
- [ ] Harita → tablo yönünde seçim (çift yönlü bağlantının diğer yarısı)

### Çözülen üç hata
| Hata | Sebep |
|---|---|
| `does not provide an export named 'default'` | MapLibre v6 varsayılan export'u kaldırmış; `MapLibreMap` named import'a geçildi |
| Katmanlar hiç eklenmiyordu | Tema `useEffect`'i ilk render'da da `setStyle()` çağırıp yükleme zincirini bozuyordu + `styledata` olayında `isStyleLoaded()` hep `false` dönüyordu. `style.load` olayına geçildi |
| Sayaç 0'da takılıydı | bbox harita yüklenince geliyor, veri sonra; `useMemo` ile ikisine birden bağlandı |

> ⚠️ **Görsel doğrulama yapılamadı.** Browser paneli görünür olmadığı için sayfa
> kare üretmiyor; MapLibre karo işlemeyi çizim geçişine kadar erteliyor, bu yüzden
> `queryRenderedFeatures` 0 dönüyor ve ekran görüntüsü alınamıyor.
> **Noktaların gerçekten göründüğünü senin tarayıcında kontrol etmen gerekiyor.**
> Doğrulanabilenler: kaynak ve 4 katman eklendi, sayaç 819 varlık gösterdi,
> haritaya tıklayınca form `41.105000 / 29.027000` ile doldu.

---

## Aşama 5 — Analiz & raporlama ⚪ 0%

### Backend ✅ bitti
- [x] `GET /stats/summary` — KPI'lar + tip/durum/ilçe dağılımı + trendler
- [x] `GET /stats/timeseries` — `generate_series` ile boş aylar da 0 olarak geliyor
- [x] Trend hesabı — geçen ay 0 ise `null` (sıfıra bölme yok)
- [x] `POST /assets/within` — **polygon içi sorgu (`ST_Within`)** ← ödevin şartı
- [x] `GET /assets/nearby` — **`ST_DWithin`** + metre cinsinden mesafe
- [x] `GET /assets/export?format=csv|geojson`

**Doğrulama sonuçları:**

| Test | Sonuç |
|---|---|
| `/stats/summary` | 1475 toplam · 334 bakım · 93 arızalı · ilçe sıralaması doğru |
| `ST_Within` (Sarıyer poligonu) | 71 varlık, durum/tip dağılımıyla |
| Aynı poligon + durum filtresi | 14 (tutarlı) |
| `ST_DWithin` 800 m | 2 varlık, mesafeler 398 m / 766 m |
| **Metre/derece kontrolü** | 50 m → 0 · 5000 m → 143 (`::geography` cast'i çalışıyor) |
| `/stats/timeseries` | Boş aylar 0 ile listede, kümülatif doğru |
| CSV export | UTF-8 BOM ✓ · 93 kayıt (stats ile tutarlı) · Türkçe karakterler doğru |
| GeoJSON export | 67 özellik (stats ile tutarlı) |

### Frontend ✅ bitti
- [x] Dashboard — 4 KPI kartı + trend göstergeleri
- [x] Tipe göre: yatay bar, tek renk *(donut yerine — nominal kategori)*
- [x] Duruma göre: yığılmış bar + yüzdeler
- [x] İlçeye göre: yatay bar
- [x] Zamana göre alan grafiği (12 / 6 / 3 ay seçici)
- [x] Her grafiğin altında açılır **tablo görünümü** (erişilebilirlik)
- [x] Harita üzerinde **polygon çizme aracı** (ekstra kütüphane yok)
- [x] Çizilen alan → `ST_Within` → sonuç kartında durum kırılımı
- [x] CSV / GeoJSON indirme butonları

**Renk körlüğü doğrulaması:** koyu tema durum paleti reddedildi
(protanopide yeşil↔amber ΔE 7.3, eşik 8). Yeşil koyulaştırılıp amber
açılarak ΔE 17.5'e çıkarıldı → `#178a48 / #ffc94d / #f76b6b`

**Tarayıcıda doğrulandı:**

| Test | Sonuç |
|---|---|
| KPI kartları | 1.475 · 334 · 93 · 1.475 |
| Tipe göre bar | 685 / 291 / 285 / 147 / 67 (API ile birebir) |
| Yığılmış durum barı | 349 : 111 : 31 px = %71 / %22.6 / %6.3 |
| Alan çizimi (4 köşe + kapatma) | **"Seçilen alanda 71 varlık — İyi 57, Bakım Lazım 14"** |
| Aynı poligonun API sonucu | 71 / 57 / 14 — **birebir aynı** |
| Alanı temizle | Sonuç kartı sıfırlandı |

> ⚠️ Grafiklerde `isAnimationActive={false}`: Recharts büyüme animasyonunu
> `requestAnimationFrame` ile yapıyor. Uygulama arka plan sekmesinde açılırsa
> rAF durur ve **grafikler boş görünür**. Dashboard'da veri anında görünmeli.

---

## Aşama 6 — Cila & teslim ⚪ 0%

- [ ] **Ek paket seçimi** (aşağıya bak) — sana soracağım
- [ ] Frontend'i Docker'a al (multi-stage + Nginx) → tek komutla tüm sistem
- [ ] README: ekran görüntüleri + mimari diyagram
- [ ] Backend pytest testleri
- [ ] `.env` sızıntı kontrolü, kod temizliği
- [ ] Final Pull Request + açıklayıcı PR metni

---

## 🐛 Bilinen Sorunlar / Teknik Borç

| # | Sorun | Etki | Ne zaman |
|---|---|---|---|
| 1 | Demo hesap parolaları giriş ekranında görünüyor | Staj projesi olduğu için **bilerek**; gerçek kurulumda olmaz | Teslim notunda belirtilecek |
| 2 | Token `localStorage`'da tutuluyor | XSS'e karşı korumasız; HttpOnly cookie daha güvenli | Bilinçli ödün, kodda belgelendi |
| 3 | `SECRET_KEY` varsayılanı kodda | Üretimde `.env`'den gelmeli | `.env.example`'a eklenecek (C5) |
| 2 | GitHub varsayılan dalı `feature/01-docker-db` | PR'lar yanlış dala açılıyor | **Senin yapman lazım** — aşağıda |
| 3 | `feature/01-docker-db` ve `feature/02-backend-api` dalları uzakta duruyor | Karışıklık | Merge sonrası GitHub'dan silinebilir |
| 4 | Frontend henüz Docker'da değil | `npm run dev` ayrı çalıştırılıyor | Aşama 6 |
| 5 | Hiç otomatik test yok | — | Aşama 6 / ek paket C2 |

---

## 🔧 Senin Yapman Gerekenler

### 1. GitHub varsayılan dalını `main` yap (ÖNEMLİ)

Şu an varsayılan `feature/01-docker-db` — bu yüzden PR'ın yanlış dala merge oldu.
`main`'i düzelttim, iş kaybı yok, ama ayarı değiştirmek gerekiyor:

**Settings → General → Default branch → kalem ikonu → `main` seç → Update**

Sonra `feature/01-docker-db` ve `feature/02-backend-api` dallarını silebilirsin
(Branches sayfasından çöp kutusu ikonu).

### 2. İstersen `gh` girişi yap

```bash
gh auth login -h github.com
```

Bunu yaparsan sonraki PR'ları ben açarım.

---

## ▶️ Kaldığın Yerden Nasıl Devam Edilir

Yeni oturumda bana şunu söylemen yeterli: **"PROGRESS.md'ye bak, Aşama 3'ten devam et"**

Sistemi ayağa kaldırmak için:

```bash
docker compose up -d
```

Frontend'i başlatmak için:

```bash
npm --prefix frontend run dev
```

Veriyi sıfırlayıp yeniden üretmek için:

```bash
docker compose exec backend python -m app.seed --assets 1500 --reset
```

Aktif dal: `feature/03-frontend-setup`

---

# 🎁 EK PAKET — Aşama 6'da Sorulacak

> **Kararın:** "Ödev bitince seçeceğim, bana sor."
> Aşama 5 bitince bu bölümü açıp sana tek tek soracağım.
> Aşağıdaki tablo o an vereceğin kararın hazırlığıdır.

## Zaten yapılmış olanlar (bedava geldi)

Bunlar ek paket listesindeydi ama ödevi yaparken doğal olarak gerekti,
yani **hiç ek maliyet ödemeden** kazandın:

| Kod | Özellik | Nasıl geldi |
|---|---|---|
| **A1** | Seed veri üreteci | 1475 varlık olmadan API test edilemezdi |
| **C1** | Alembic migration | Tabloyu elle kurmak yerine |
| **A2** | Durum renk sistemi | `statusColors.js` — tek kaynak |
| — | **İlçe + `ST_Within`** | Listede yoktu, tasarımdaki "District" grafiğinden çıktı. Ödevin en GIS'li parçası |
| — | **İkon optimizasyonu** | 3.96 MB → 8 KB |
| — | **Toplu işlem uçları** | Tasarımdaki alt aksiyon çubuğu için |
| **D6** | i18n (TR/EN) | Kararın gereği — Aşama 3'te yapılacak |

## Aşama 6'da seçeceklerin

### 🅰️ Grup A — Az emek, çok etki

| Kod | Özellik | Süre | Not |
|---|---|---|---|
| A3 | Swagger özelleştirme | 1 sa | Kısmen yapıldı, örnekler eklenebilir |
| A4 | Toast + onay modalı + skeleton | 2 sa | Aşama 3'te zaten geliyor |
| A5 | Tablo ↔ harita çift yönlü seçim | 3 sa | Aşama 4'te planlı |
| A6 | Dark mode | ✅ | Altyapısı hazır, anahtar eklenecek |

### 🅱️ Grup B — GIS derinliği

| Kod | Özellik | Süre | Neden etkiler |
|---|---|---|---|
| **B1** | `ST_DWithin` yakınlık sorgusu | 3 sa | "Konumuma 500m'deki bakım bekleyenler". Saha ekibi senaryosu. Mobil tasarımdaki "45m uzakta" bunu gerektiriyor |
| **B2** | Nokta kümeleme (clustering) | 3 sa | 1475 nokta yerine sayı balonları. Tasarımda zaten var (24, 112). Performans bilinci gösterir |
| **B3** | Isı haritası katmanı | 3 sa | Görsel olarak en çarpıcı ekran. Tasarımda `layers` butonu duruyor |
| **B4** | Adres arama (Nominatim) | 3 sa | "Beşiktaş" yaz → harita uçsun |
| **B5** | Bakım geçmişi tablosu | 5 sa | `maintenance_logs` — 1-N ilişki + JOIN. "X gündür bakılmadı" rozeti |
| **B6** | Vector tile (`ST_AsMVT`) | 8 sa | Ciddi GIS bilgisi. ODAGIS+ vizyonuna en yakın madde |
| **B7** | Zaman çizelgesi slider | 3 sa | Veriye zaman boyutu |

### 🅲 Grup C — Mühendislik disiplini

| Kod | Özellik | Süre | Neden etkiler |
|---|---|---|---|
| **C2** | Pytest testleri | 4 sa | Test yazan stajyer azınlıktadır |
| **C3** | GitHub Actions CI | 3 sa | PR'da yeşil tik, DevOps farkındalığı |
| C4 | Ruff + ESLint + Prettier | 1 sa | Kod tutarlılığı |
| **C5** | Frontend Docker + Nginx | 3 sa | `docker compose up` → hiç npm gerekmez. Değerlendiren 30 saniyede çalıştırır. **En büyük artı** |
| C6 | Structured logging + request ID | 3 sa | Üretim düşünen mühendis izlenimi |

### 🅳 Grup D — İddialı

| Kod | Özellik | Süre | Not |
|---|---|---|---|
| D1 | JWT rol bazlı yetki | 8 sa | admin / saha ekibi |
| D2 | Fotoğraf yükleme | 8 sa | Popup'ta saha fotoğrafı |
| D3 | PWA / offline mod | 10 sa | Zaman yer |
| D4 | WebSocket canlı güncelleme | 8 sa | İki sekme açıp göstermek etkileyici |
| D5 | PDF rapor | 4 sa | Belediye senaryosuna uygun |
| D6 | i18n | ✅ | Aşama 3'te yapılıyor |

## Benim Aşama 6 tavsiyem (o gün tekrar soracağım)

Ödev bittiğinde kalan zamana göre üç senaryo:

**⏱️ Yarım gün kaldıysa** → `C5` (frontend Docker) + `C4` (lint)
> Tek komutla çalışan proje, değerlendirenin ilk izlenimini belirler.

**⏱️ Bir gün kaldıysa** → yukarıdakiler + `B2` (clustering) + `C2` (testler)
> Performans + test = "bu stajyer ürün düşünüyor" mesajı.

**⏱️ İki gün kaldıysa** → yukarıdakiler + `B1` (yakınlık) + `B5` (bakım geçmişi) + `C3` (CI)
> Bu paket projeyi "ödev"den "portfolyo projesi"ne taşır.

---

## 📋 Aşama 6'da sana soracağım tam soru

> "Ödev bitti. `PROGRESS.md`'deki ek paket tablosuna bak.
> Kaç gün/saatin kaldı? Ona göre hangi paketi uygulayalım —
> yarım günlük mü, bir günlük mü, iki günlük mü, yoksa kendin mi seçeceksin?"

Bu soruyu unutmayacağım; `PROGRESS.md` Aşama 6 maddesinin ilk satırında duruyor.
