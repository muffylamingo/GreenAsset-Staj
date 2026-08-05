# 📊 GreenAsset — İlerleme Takibi

> Son güncelleme: 2026-08-05
> Bu dosya her aşama bittiğinde güncellenir.

---

## Genel Durum

```
████████████████████████████░░░░░░░░░░░░  70%
```

| # | Aşama | Ağırlık | Durum | Tamamlanma |
|---|---|---|---|---|
| 0 | Hazırlık & Git | 5% | ✅ Bitti | `██████████` 100% |
| 1 | Veritabanı & Docker | 15% | ✅ Bitti | `██████████` 100% |
| 2 | Backend REST API | 25% | ✅ Bitti | `██████████` 100% |
| 3 | Frontend — form & tablo | 20% | ✅ Bitti | `██████████` 100% |
| 4 | Harita entegrasyonu | 15% | ⚪ Başlanmadı | `░░░░░░░░░░` 0% |
| 5 | Analiz & raporlama | 15% | ⚪ Başlanmadı | `░░░░░░░░░░` 0% |
| 6 | Cila & teslim | 5% | ⚪ Başlanmadı | `░░░░░░░░░░` 0% |

**Hesap:** 5 + 15 + 25 + 20 = **70%**

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

## Aşama 4 — Harita entegrasyonu ⚪ 0%

- [ ] MapLibre kurulumu + `useRef` ile harita nesnesi (sonsuz render tuzağı)
- [ ] Ücretsiz altlık (Carto Positron açık / Dark Matter koyu)
- [ ] Harita İstanbul'da açılsın (İTÜ Ayazağa merkezli)
- [ ] Backend GeoJSON'ı `source` olarak bağla
- [ ] `circle-layer` + duruma göre renk (`statusMatchExpression`)
- [ ] Noktaya tıkla → popup (ad, tip, durum, düzenle)
- [ ] **Haritaya tıkla → form koordinatları otomatik dolsun** (ödev şartı)
- [ ] Legend kartı (durum renkleri + tip ikonları)
- [ ] Filtre chip şeridi (Tümü / Ağaç / Bank / Direk / Çöp / Oyun)
- [ ] "N varlık görünüyor" rozeti — bbox'a bağlı canlı sayaç
- [ ] Tablo ↔ harita çift yönlü seçim
- [ ] Tema değişince harita altlığı da değişsin

---

## Aşama 5 — Analiz & raporlama ⚪ 0%

### Backend (yeni uçlar gerekiyor)
- [ ] `GET /stats/summary` — toplam, tipe göre, duruma göre, ilçeye göre
- [ ] `GET /stats/timeseries` — `date_trunc` ile aylık ekleme grafiği
- [ ] Trend hesabı — "geçen aya göre %12" için önceki dönem karşılaştırması
- [ ] `POST /assets/within` — **polygon içi sorgu (`ST_Within`)** ← ödevin şartı
- [ ] `GET /assets/export?format=csv|geojson`

### Frontend
- [ ] Dashboard — 4 KPI kartı + trend göstergeleri
- [ ] Recharts: tipe göre donut
- [ ] Recharts: ilçeye göre yığılmış bar
- [ ] Recharts: zamana göre alan grafiği (12M/6M/30D)
- [ ] Harita üzerinde polygon çizme aracı
- [ ] Çizilen alan → `ST_Within` → sonuç tabloda
- [ ] CSV / GeoJSON indirme butonları

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
| 1 | `gh` CLI token'ı geçersiz | PR'ları ben açamıyorum, sen açıyorsun | `gh auth login` çalıştırınca çözülür |
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
