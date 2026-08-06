# 🌿 GreenAsset — Akıllı Şehir Varlık Yönetimi

Belediyelerin şehirdeki **ağaçları, park mobilyalarını ve aydınlatma direklerini**
harita üzerinde takip ettiği, konum tabanlı (GIS) varlık yönetim sistemi.

> ODAKENT Çevre & Bilişim A.Ş. — Staj Proje Ödevi 2

---

## 🧱 Teknoloji

| Katman | Teknoloji |
|---|---|
| Frontend | React (Vite) · Tailwind CSS · MapLibre GL JS · React Hook Form · Recharts |
| Backend | Python 3.12 · FastAPI · SQLAlchemy 2 · GeoAlchemy2 · Alembic |
| Veritabanı | PostgreSQL 16 + PostGIS 3.4 |
| Servis | Docker Compose · pgAdmin 4 |

---

## 🚀 Kurulum

### Ön koşullar
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (çalışır durumda)
- Node.js 20+ (frontend geliştirme için)
- Git

### 1) Ortam dosyasını oluştur

```bash
cp .env.example .env
```

Windows PowerShell'de:

```bash
Copy-Item .env.example .env
```

### 2) Servisleri başlat

```bash
docker compose up -d
```

### 3) Veritabanı şemasını kur

```bash
docker compose exec backend alembic upgrade head
```

### 4) Demo verisini yükle

İlçe sınırlarını OpenStreetMap'ten indir (bir kez yeterli):

```bash
python db/seed/fetch_districts.py
```

Veritabanını 1500 varlıkla doldur:

```bash
docker compose exec backend python -m app.seed --assets 1500 --reset
```

### 5) Kontrol et

| Servis | Adres | Not |
|---|---|---|
| API (Swagger) | http://localhost:8000/docs | Tüm endpoint'ler burada denenebilir |
| API sağlık | http://localhost:8000/health | `{"status":"ok"}` dönmeli |
| pgAdmin | http://localhost:5050 | `.env` içindeki e-posta/şifre ile gir |
| Frontend | http://localhost:5173 | *(Aşama 3'te eklenecek)* |

---

## 🛠️ Sık kullanılan komutlar

Logları izle:

```bash
docker compose logs -f backend
```

Veritabanına psql ile bağlan:

```bash
docker compose exec db psql -U greenasset -d greenasset
```

PostGIS sürümünü doğrula:

```bash
docker compose exec db psql -U greenasset -d greenasset -c "SELECT PostGIS_Version();"
```

Yeni migration üret (model değiştirdikten sonra):

```bash
docker compose exec backend alembic revision --autogenerate -m "aciklama"
```

Her şeyi durdur:

```bash
docker compose down
```

⚠️ Veritabanını da sıfırla (tüm veri silinir):

```bash
docker compose down -v
```

---

## 📂 Proje Dokümanları

| Dosya | İçerik |
|---|---|
| [PROGRESS.md](PROGRESS.md) | **İlerleme durumu (% ile), kalan işler, ek paket kararı** |
| [PLAN.md](PLAN.md) | Yol haritası, mimari, API sözleşmesi |
| [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) | Tasarım token'ları (Stitch export'undan) |
| [BILMEM-GEREKENLER.md](BILMEM-GEREKENLER.md) | Öğrenme rehberi, PostGIS/React notları, sık hatalar |
| [EKSTRA-OZELLIKLER.md](EKSTRA-OZELLIKLER.md) | Ödev dışı geliştirme fikirleri |
| [STITCH-PROMPT.md](STITCH-PROMPT.md) | Arayüz tasarım promptları |

---

## 📍 Geliştirme Durumu

- [x] Aşama 0 — Proje iskeleti, Git, .gitignore
- [x] Aşama 1 — Docker Compose, PostGIS, pgAdmin, Alembic migration
- [x] Aşama 2 — REST API (CRUD + GeoJSON + filtreler + ilçe/ST_Within)
- [ ] Aşama 3 — Frontend form ve tablo
- [ ] Aşama 4 — MapLibre harita entegrasyonu
- [ ] Aşama 5 — Dashboard, mekansal sorgu, dışa aktarım
- [ ] Aşama 6 — Cila ve teslim
