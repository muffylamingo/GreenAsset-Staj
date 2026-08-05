# 🌿 GreenAsset — Akıllı Şehir Varlık Yönetimi | Proje Planı

> Staj Proje Ödevi 2 — ODAKENT Çevre & Bilişim A.Ş.
> Plan tarihi: 2026-08-05

---

## 1. Proje Özeti

Bir belediyenin şehirdeki **ağaçlarını, park mobilyalarını ve aydınlatma direklerini**
harita üzerinde takip ettiği, konum tabanlı (GIS) bir varlık yönetim sistemi.

**Tek cümlelik hedef:** Veritabanındaki bir koordinatın, haritada tıklanabilir bir noktaya
dönüşme yolculuğunu baştan sona kodlamak.

---

## 2. Teknik Yığın (Kesinleşen)

| Katman | Teknoloji | Neden |
|---|---|---|
| Frontend | React 19 + Vite | Ödevde isteniyor, hızlı dev server |
| Stil | Tailwind CSS v4 | Ödevde isteniyor, hızlı prototipleme |
| Harita | MapLibre GL JS v5 | Ödevde isteniyor, açık kaynak (Mapbox'ın ücretsiz forku) |
| Form | React Hook Form + Zod | Ödevde isteniyor + Zod ile tip güvenli validation |
| Veri çekme | TanStack Query (React Query) | Cache, loading/error state'leri bedava gelir |
| Grafik | Recharts | Ödevde isteniyor, React'e en uygun |
| Dil | react-i18next (TR/EN) | Karar: arayüz iki dilli olacak |
| Backend | Python 3.12 + **FastAPI** | Otomatik Swagger dokümantasyonu → mülakatta/sunumda büyük artı |
| ORM | SQLAlchemy 2.0 + GeoAlchemy2 | PostGIS tiplerini Python'da kullanabilmek için |
| Migration | Alembic | DB şema versiyonlama (profesyonellik göstergesi) |
| Veritabanı | PostgreSQL 16 + PostGIS 3.4 | Ödevde isteniyor |
| Admin | pgAdmin 4 | Ödevde isteniyor |
| Servis | Docker + Docker Compose | Ödevde isteniyor, "tek komutla ayağa kalksın" |
| Versiyon | Git + GitHub (PR ile teslim) | Ödevin ipucu kısmında öneriliyor |

> ⚠️ **Neden Flask değil FastAPI?** Ödev "FastAPI **veya** Flask" diyor. FastAPI seçiyoruz çünkü:
> otomatik `/docs` (Swagger) sayfası, Pydantic ile hazır validation, async destek ve modern.
> Teslimde `/docs` sayfasını açıp göstermek tek başına etkileyici.

---

## 3. Klasör Mimarisi (Hedef)

```
stajproje2/
├─ docker-compose.yml          # postgis + pgadmin + backend + frontend
├─ .env.example                # şifreler burada örneklenir, .env git'e girmez
├─ README.md                   # kurulum + ekran görüntüleri
├─ PLAN.md                     # bu dosya
├─ BILMEM-GEREKENLER.md        # öğrenme rehberi
├─ EKSTRA-OZELLIKLER.md        # ödev dışı eklenecekler tablosu
├─ STITCH-PROMPT.md            # frontend tasarım promptu
│
├─ backend/
│  ├─ Dockerfile
│  ├─ requirements.txt
│  ├─ alembic.ini
│  ├─ alembic/versions/        # migration dosyaları
│  ├─ tests/                   # pytest
│  └─ app/
│     ├─ main.py               # FastAPI uygulaması + CORS
│     ├─ core/
│     │  ├─ config.py          # ayarlar (.env okur)
│     │  └─ database.py        # SQLAlchemy engine + session
│     ├─ models/asset.py       # SQLAlchemy tablo tanımı (Geometry kolonu)
│     ├─ schemas/asset.py      # Pydantic giriş/çıkış şemaları
│     ├─ crud/asset.py         # DB işlemleri (iş mantığı)
│     ├─ api/v1/
│     │  ├─ assets.py          # CRUD endpointleri
│     │  ├─ spatial.py         # ST_Within, ST_DWithin sorguları
│     │  └─ stats.py           # dashboard istatistikleri
│     └─ seed.py               # sahte veri üretici
│
└─ frontend/
   ├─ Dockerfile
   ├─ package.json
   └─ src/
      ├─ main.jsx / App.jsx
      ├─ api/                  # axios client + endpoint fonksiyonları
      ├─ components/
      │  ├─ map/               # MapView, DrawControl, Popup
      │  ├─ assets/            # AssetForm, AssetTable, AssetFilters
      │  └─ ui/                # Button, Modal, Toast, Badge
      ├─ hooks/                # useAssets, useStats (React Query)
      └─ pages/                # Dashboard, MapPage, AssetsPage
```

**Katmanlı mimari kuralı:** `api → crud → models` yönünde akar. API katmanı asla direkt
SQL yazmaz, `crud` katmanını çağırır. Ödevdeki "Temiz Kod / katmanlı mimari" kazanımı bu.

---

## 4. Veri Modeli

### `assets` tablosu (ödevde istenen)

| Kolon | Tip | Not |
|---|---|---|
| `id` | UUID (PK) | `gen_random_uuid()` default |
| `name` | VARCHAR(120) NOT NULL | Boş olamaz (validation) |
| `type` | ENUM | `TREE` (Ağaç), `BENCH` (Bank), `POLE` (Direk) |
| `status` | ENUM | `GOOD` (İyi), `NEEDS_MAINTENANCE` (Bakım Lazım), `BROKEN` (Arızalı) |
| `geometry` | `GEOMETRY(Point, 4326)` | PostGIS tipi, WGS84 |
| `created_at` | TIMESTAMPTZ | `now()` default |
| `updated_at` | TIMESTAMPTZ | güncellemede otomatik |

> `geometry` kolonuna **GIST index** eklenecek — mekansal sorguların hızlı olmasının sırrı.

### `maintenance_logs` tablosu (ekstra özellik — seçilirse)

| Kolon | Tip |
|---|---|
| `id` | UUID (PK) |
| `asset_id` | UUID (FK → assets.id, ON DELETE CASCADE) |
| `note` | TEXT |
| `performed_by` | VARCHAR |
| `performed_at` | TIMESTAMPTZ |

---

## 5. API Sözleşmesi (Endpoint Listesi)

| # | Method | Yol | Açıklama | Ödev |
|---|---|---|---|---|
| 1 | POST | `/api/v1/assets` | Yeni varlık ekle (lat/lon ile) | ✅ Endpoint 1 |
| 2 | GET | `/api/v1/assets` | Tümünü listele — **GeoJSON FeatureCollection** | ✅ Endpoint 2 |
| 3 | GET | `/api/v1/assets/{id}` | Tek kayıt detayı | — |
| 4 | PUT | `/api/v1/assets/{id}` | Güncelle | ✅ Endpoint 3 |
| 5 | DELETE | `/api/v1/assets/{id}` | Sil | ✅ Endpoint 3 |
| 6 | GET | `/api/v1/assets?type=&status=&bbox=` | Tip / durum / bölge filtresi | ✅ Endpoint 4 |
| 7 | POST | `/api/v1/assets/within` | Polygon içindekiler (`ST_Within`) | ✅ 5. Aşama |
| 8 | GET | `/api/v1/assets/nearby?lat=&lon=&radius=` | Yarıçap içindekiler (`ST_DWithin`) | ⭐ Ekstra |
| 9 | GET | `/api/v1/stats/summary` | Toplam / tipe göre / duruma göre sayılar | ✅ Dashboard |
| 10 | GET | `/api/v1/assets/export?format=csv\|geojson` | Dışa aktarım | ✅ 5. Aşama |

### Kritik: GET `/assets` çıktı formatı

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [28.9784, 41.0082] },
      "properties": {
        "id": "9f1c...", "name": "Çınar #12", "type": "TREE",
        "status": "NEEDS_MAINTENANCE", "created_at": "2026-08-05T10:00:00Z"
      }
    }
  ]
}
```

> ⚠️ **En sık yapılan hata:** GeoJSON koordinat sırası **[boylam, enlem]** yani `[lon, lat]`'tir.
> Google Maps'te alıştığımız `lat, lon` sırasının TERSİ. Karıştırırsan noktaların hepsi
> Somali açıklarında görünür (klasik GIS şakası).

---

## 6. Yol Haritası (Roadmap)

### ⚡ Kararlaştırılan tempo: **7 gün, yoğun** (günde ~6 saat)

| Gün | Aşama | Ne yapılacak | Gün sonu çıktısı |
|---|---|---|---|
| **1** | 0 + 1 | Git repo, klasör iskeleti, `docker-compose.yml`, PostGIS + pgAdmin, Alembic ilk migration | `docker compose up` → DB ayakta, `assets` tablosu var |
| **2** | 2a | FastAPI iskeleti, CORS, model + şema, CRUD katmanı, POST + GET | `/docs`'tan varlık ekleyip listeleyebiliyoruz |
| **3** | 2b | PUT/DELETE, filtreler (type/status/bbox), GeoJSON çıktısı, seed script | 500 sahte varlık DB'de, GeoJSON dönüyor |
| **4** | 3 | Vite + Tailwind + i18n kurulumu, React Query, `AssetForm`, `AssetTable` | Haritasız CRUD arayüzü çalışıyor |
| **5** | 4 | MapLibre, GeoJSON katmanı, renkler, popup, **tıkla→form doldur** | Harita + form + tablo senkron |
| **6** | 5 | Dashboard KPI + Recharts, polygon çizim + `ST_Within`, CSV/GeoJSON export | Analiz modülü tamam |
| **7** | 6 | README + ekran görüntüleri, cila, frontend Docker, final PR | Teslime hazır |

> **Karar:** Ekstra özellikler ödev bitince seçilecek — 7. gün sonunda sana
> `EKSTRA-OZELLIKLER.md` tablosunu tekrar açıp hangilerini ekleyeceğini soracağım.
> **İstisna:** Seed script (A1) ve Alembic (C1) ödevin içinde kalıyor — biri olmadan
> test edilecek veri yok, diğeri olmadan tabloyu her seferinde elle kurmak gerekir.

> **Karar:** Arayüz **iki dilli (TR/EN)**, harita **İstanbul**'da açılacak
> (İTÜ Ayazağa / Sarıyer merkezli, sahte veriler oraya dağıtılacak).

> **Karar:** Renk paleti Aşama 3'e kadar geçici (nötr gri + yeşil). Sen Stitch
> çıktısını gösterince tema kesinleşecek — tüm renkler tek bir CSS değişken
> dosyasından geleceği için sonradan değiştirmek 10 dakikalık iş olacak.

---

### Detaylı aşama kırılımı

Aşağıdaki süreler rahat tempo (10–12 gün) içindir; yoğun planda yukarıdaki tabloya bak.

### 🟦 Aşama 0 — Hazırlık (0.5 gün)
- [ ] Docker Desktop'ı çalıştır, `docker run hello-world` ile doğrula
- [ ] `git init` + GitHub'da private repo aç + `.gitignore`
- [ ] Klasör iskeletini oluştur
- [ ] `feature/*` branch stratejisini belirle (her aşama = 1 PR)

**Bitti sayılır:** GitHub'da boş ama yapılandırılmış repo var.

---

### 🟩 Aşama 1 — Veritabanı & Docker (1.5 gün) — *Ödev Aşama 1*
- [ ] `docker-compose.yml`: `postgis/postgis:16-3.4` + `dpage/pgadmin4`
- [ ] Named volume ile veri kalıcılığı (`postgres_data`)
- [ ] `healthcheck` ekle (backend, DB hazır olmadan başlamasın)
- [ ] `.env.example` + `.env`
- [ ] pgAdmin'den bağlan, `SELECT PostGIS_Version();` çalıştır
- [ ] Alembic kur, ilk migration ile `assets` tablosu + GIST index

**Bitti sayılır:** `docker compose up -d` → pgAdmin `localhost:5050`'de açılıyor, tablo görünüyor.

---

### 🟨 Aşama 2 — Backend API (2.5 gün) — *Ödev Aşama 2*
- [ ] FastAPI iskeleti + CORS + `/health`
- [ ] SQLAlchemy model + Pydantic şemalar
- [ ] CRUD katmanı (POST / GET / GET-by-id / PUT / DELETE)
- [ ] GeoJSON dönüştürücü (`ST_AsGeoJSON` veya `shapely`)
- [ ] Filtreler: `type`, `status`, `bbox`, `q` (isim arama)
- [ ] Sayfalama (`limit`/`offset`)
- [ ] `seed.py` — İstanbul sınırları içinde 500 sahte varlık
- [ ] Swagger `/docs` üzerinden manuel test

**Bitti sayılır:** `/docs` sayfasından tüm endpointler tıklanarak çalıştırılabiliyor.

---

### 🟧 Aşama 3 — Frontend Temel Arayüz (2 gün) — *Ödev Aşama 3*
- [ ] Vite + React + Tailwind kurulum
- [ ] react-i18next kurulumu, `tr.json` / `en.json`, dil değiştirme anahtarı
- [ ] Axios client + React Query provider
- [ ] `AssetForm` — React Hook Form + Zod validation
      (isim boş olamaz, lat −90..90, lon −180..180, tip/durum zorunlu)
- [ ] `AssetTable` — sıralama, arama, düzenle/sil butonları
- [ ] Silmede onay modalı + toast bildirimleri
- [ ] Loading skeleton + boş durum (empty state) ekranları

**Bitti sayılır:** Haritasız da olsa CRUD tarayıcıdan tam çalışıyor.

---

### 🟥 Aşama 4 — Harita Entegrasyonu (2 gün) — *Ödev Aşama 4*
- [ ] MapLibre + ücretsiz raster altlık (OpenStreetMap / Carto)
- [ ] Backend GeoJSON'ı `source` olarak bağla
- [ ] `circle-layer` + duruma göre renk (yeşil / sarı / kırmızı)
- [ ] Noktaya tıkla → popup (isim, tip, durum, düzenle butonu)
- [ ] **Haritaya tıkla → form koordinatları otomatik dolsun**
- [ ] Tablo satırına hover → haritadaki nokta vurgulansın (çift yönlü bağlantı)
- [ ] Katman aç/kapa kontrolü (tipe göre filtreleme)

**Bitti sayılır:** Harita ↔ form ↔ tablo üçlüsü senkron çalışıyor.

---

### 🟪 Aşama 5 — Analiz & Raporlama (2 gün) — *Ödev Aşama 5*
- [ ] Dashboard: 4 KPI kartı (toplam / bakım bekleyen / arızalı / bu ay eklenen)
- [ ] Recharts: tipe göre pasta + duruma göre bar + zamana göre çizgi
- [ ] Harita üzerinde **polygon çizme** aracı
- [ ] Çizilen alanı backend'e gönder → `ST_Within` sonucu tabloda göster
- [ ] CSV + GeoJSON dışa aktarım butonları

**Bitti sayılır:** Alan çiz → "Bu alanda 37 varlık, 12'si bakım bekliyor" görünüyor.

---

### ⬛ Aşama 6 — Cila & Teslim (1.5 gün)
- [ ] Seçilen ekstra özellikleri ekle (bkz. `EKSTRA-OZELLIKLER.md`)
- [ ] README: kurulum adımları, ekran görüntüleri, mimari diyagram
- [ ] Backend için birkaç pytest testi
- [ ] Frontend'i de Docker'a al → **tek komutla tüm sistem**
- [ ] Kodları temizle, yorum satırları, `.env` sızıntısı kontrolü
- [ ] Final Pull Request + açıklayıcı PR metni

**Bitti sayılır:** Boş bir bilgisayarda `docker compose up` → sistem çalışıyor.

---

## 7. Git Stratejisi

```
main                    ← sadece çalışan kod
 └─ develop             ← entegrasyon dalı
     ├─ feature/01-docker-db
     ├─ feature/02-backend-api
     ├─ feature/03-frontend-forms
     ├─ feature/04-map-integration
     └─ feature/05-analytics
```

Commit mesajı formatı (Conventional Commits):
```
feat(api): varlık ekleme endpointi
fix(map): koordinat sırası lon/lat olarak düzeltildi
docs(readme): kurulum adımları eklendi
```

---

## 8. Riskler ve Önlemler

| Risk | Önlem |
|---|---|
| Docker Desktop çalışmıyor | Aşama 0'da mutlaka doğrula, WSL2 backend'i açık olsun |
| Python 3.14 kütüphane uyumsuzluğu | Backend'i Docker içinde Python 3.12 ile çalıştır |
| lat/lon sırası karışması | Tek bir yardımcı fonksiyondan geçir, teste bağla |
| CORS hatası | FastAPI'de `CORSMiddleware` en baştan ekle |
| MapLibre altlık için API key isteme | Ücretsiz OSM raster tile kullan (key gerekmez) |
| Son güne yığılma | Her aşama bitince PR aç, geri bildirim al |

---

## 9. Teslim Kontrol Listesi

- [ ] `docker compose up` tek komutla her şey ayağa kalkıyor
- [ ] `/docs` Swagger sayfası tüm endpointleri gösteriyor
- [ ] Harita üzerinde en az 500 varlık akıcı görünüyor
- [ ] Polygon sorgusu çalışıyor (`ST_Within`)
- [ ] Dashboard grafikleri gerçek veriden besleniyor
- [ ] CSV/GeoJSON indirme çalışıyor
- [ ] README ekran görüntüleriyle dolu
- [ ] `.env` git'e girmemiş
- [ ] GitHub'da düzgün bir Pull Request açılmış

---

## 10. Sıradaki Adım

**Senin yapacakların:**
1. 🐳 **Docker Desktop'ı aç** (sistem tepsisindeki balina yeşile dönene kadar bekle)
2. 🎨 `STITCH-PROMPT.md`'deki promptları Stitch'te çalıştır, çıktıları bana at
   *(acele yok — Gün 4'e kadar vaktin var)*

**Benim yapacaklarım:** Aşama 0 + 1 — klasör iskeleti, git, docker-compose, DB şeması.
