# 📚 Bilmem Gerekenler — GreenAsset Öğrenme Rehberi

Bu dosya "bu projeyi yaparken hangi bilgiye ihtiyacım var?" sorusunun cevabı.
Aşama aşama okuyabilirsin — her aşamanın başında ilgili bölümü aç.

**Okuma sırası önerisi:** 1 → 2 → 4 → 3 → 5 → 6 → 7

---

## 0. Ön Bilgi Seviyesi Kontrolü

Aşağıdakileri işaretle, bilmediklerin için ekstra zaman ayıralım:

| Konu | Biliyorum | Duydum | Hiç bilmiyorum |
|---|---|---|---|
| JavaScript temelleri (fonksiyon, array metotları) | ☐ | ☐ | ☐ |
| React (component, props, useState, useEffect) | ☐ | ☐ | ☐ |
| Python temelleri | ☐ | ☐ | ☐ |
| SQL (SELECT, JOIN, WHERE) | ☐ | ☐ | ☐ |
| Git (commit, branch, push) | ☐ | ☐ | ☐ |
| Docker | ☐ | ☐ | ☐ |
| REST API kavramı | ☐ | ☐ | ☐ |
| Harita / GIS / koordinat sistemleri | ☐ | ☐ | ☐ |

---

## 1. Temel Kavramlar (Her şeyden önce)

### 1.1 REST API nedir?
İki program arasında HTTP üzerinden konuşma kuralları.

| Method | Anlamı | Örnek |
|---|---|---|
| GET | Veri **oku** | `GET /assets` → tüm varlıklar |
| POST | Yeni kayıt **oluştur** | `POST /assets` + JSON gövde |
| PUT / PATCH | **Güncelle** (PUT: tamamı, PATCH: kısmi) | `PUT /assets/5` |
| DELETE | **Sil** | `DELETE /assets/5` |

**HTTP durum kodları (ezberle):**
`200` Tamam · `201` Oluşturuldu · `204` Tamam, içerik yok ·
`400` Hatalı istek · `401` Giriş yapılmamış · `403` Yetkin yok ·
`404` Bulunamadı · `422` Doğrulama hatası (FastAPI'nin favorisi) · `500` Sunucu patladı

### 1.2 Katmanlı mimari
```
Tarayıcı (React)  →  HTTP/JSON  →  API (FastAPI)  →  SQL  →  PostgreSQL/PostGIS
   sunum katmanı                     iş mantığı              veri katmanı
```
**Altın kural:** Her katman sadece bir alt katmanı tanır. React asla SQL bilmez;
API katmanı asla "hangi buton" bilmez.

### 1.3 CORS
Tarayıcı, `localhost:5173`'teki React'in `localhost:8000`'deki API'ye istek atmasını
varsayılan olarak **engeller** (farklı port = farklı origin). FastAPI'de `CORSMiddleware`
ekleyerek izin veririz. Bunu bilmezsen ilk gün 2 saat kaybedersin.

---

## 2. Veritabanı: PostgreSQL + PostGIS

### 2.1 Bilmen gereken SQL
```sql
SELECT name, status FROM assets WHERE type = 'TREE' ORDER BY created_at DESC LIMIT 10;
INSERT INTO assets (name, type) VALUES ('Çınar #1', 'TREE');
UPDATE assets SET status = 'GOOD' WHERE id = '...';
DELETE FROM assets WHERE id = '...';
SELECT type, COUNT(*) FROM assets GROUP BY type;      -- dashboard'un temeli
```

### 2.2 PostGIS nedir, farkı ne?
Normal PostgreSQL "İstanbul'daki ağaçlar" diye soramaz — sadece sayı/metin bilir.
PostGIS, PostgreSQL'e **geometri veri tipi** ve **mekansal fonksiyonlar** ekler.
Ödevin "GIS Farkındalığı" kazanımı tam olarak bu.

```sql
CREATE EXTENSION postgis;   -- eklentiyi aç
SELECT PostGIS_Version();   -- kontrol
```

### 2.3 Mutlaka bilmen gereken PostGIS fonksiyonları

| Fonksiyon | Ne yapar | Projede nerede |
|---|---|---|
| `ST_MakePoint(lon, lat)` | Koordinattan nokta üretir | Varlık eklerken |
| `ST_SetSRID(geom, 4326)` | Geometriye koordinat sistemi atar | Her nokta üretiminde |
| `ST_AsGeoJSON(geom)` | Geometriyi GeoJSON'a çevirir | GET /assets |
| `ST_Within(a, b)` | a, b'nin **içinde mi?** | ⭐ Polygon sorgusu (ödev) |
| `ST_Intersects(a, b)` | Kesişiyor mu? | bbox filtresi |
| `ST_DWithin(a, b, m)` | X metre yakınında mı? (**index kullanır**) | Yakındakiler |
| `ST_Distance(a, b)` | İki geometri arası mesafe | Sıralama |
| `ST_MakeEnvelope(...)` | bbox'tan dikdörtgen üretir | Harita görüş alanı filtresi |
| `geom <-> point` | KNN operatörü, en yakın N kayıt | "En yakın 5 varlık" |

### 2.4 SRID / EPSG (koordinat sistemi)

| Kod | Adı | Birim | Ne zaman |
|---|---|---|---|
| **4326** | WGS84 | derece | GPS, GeoJSON, standart depolama ✅ bizim seçimimiz |
| **3857** | Web Mercator | metre | Harita çizimi (MapLibre içeride kullanır) |
| **5254 / 5256** | TUREF / ITRF TM30 | metre | Türkiye resmi projeksiyonları |

⚠️ **Kritik tuzak:** 4326'da mesafe hesabı **derece** cinsindendir, metre değil.
Metre istiyorsan `geography` tipine cast et: `geom::geography` → `ST_DWithin(a::geography, b::geography, 500)`.

### 2.5 Mekansal index
```sql
CREATE INDEX idx_assets_geom ON assets USING GIST (geometry);
```
Bu satır olmadan 100 bin kayıtta sorgular saniyeler sürer. GIST = mekansal index tipi.

### 2.6 GeoJSON formatı
```json
{ "type": "Point", "coordinates": [28.9784, 41.0082] }
```
🚨 **Koordinat sırası `[longitude, latitude]`** — yani `[boylam, enlem]`.
Google Maps'in `41.0082, 28.9784` gösteriminin TERSİ. Projedeki 1 numaralı hata kaynağı.

Geometri tipleri: `Point`, `LineString`, `Polygon`, `MultiPoint`, `MultiPolygon`
Sarmalayıcılar: `Feature` (geometri + properties), `FeatureCollection` (feature listesi)

---

## 3. Backend: Python + FastAPI

### 3.1 Bilmen gereken Python
- Type hints: `def get(id: UUID) -> Asset | None:`
- Decorator: `@app.get("/assets")`
- `async def` / `await` (temel seviye yeter)
- Sanal ortam: `python -m venv .venv`
- Bağımlılık: `pip install -r requirements.txt`

### 3.2 Kütüphaneler

| Kütüphane | Ne için | Öğrenmen gereken |
|---|---|---|
| **fastapi** | Web framework | Router, path/query param, dependency injection |
| **uvicorn** | ASGI sunucusu | `uvicorn app.main:app --reload` |
| **pydantic** v2 | Veri doğrulama + serileştirme | `BaseModel`, `Field`, `field_validator`, `model_config` |
| **sqlalchemy** 2.0 | ORM | `Session`, `select()`, `Mapped[]`, ilişkiler |
| **geoalchemy2** | SQLAlchemy'ye PostGIS tipi ekler | `Geometry('POINT', srid=4326)`, `func.ST_*` |
| **psycopg** (v3) | PostgreSQL sürücüsü | Sadece bağlantı stringi |
| **alembic** | Migration | `revision --autogenerate`, `upgrade head` |
| **shapely** | Geometri işlemleri (Python tarafı) | `mapping()`, `shape()` — GeoJSON dönüşümü |
| **python-dotenv** | `.env` okuma | — |
| **faker** | Sahte veri | `faker.latitude()`, seed script |
| **pytest** + **httpx** | Test | `TestClient`, fixture |
| **ruff** | Lint + format | `ruff check --fix` |

### 3.3 FastAPI'de bilmen gereken 6 şey
1. `@app.get("/x")` / `@app.post("/x")` — route tanımı
2. `def f(id: UUID)` → path param, `def f(q: str = None)` → query param
3. `def f(body: AssetCreate)` → gövdeyi Pydantic ile doğrular
4. `Depends(get_db)` → dependency injection (DB session'ı buradan gelir)
5. `response_model=AssetOut` → çıktının şeklini garanti eder
6. `HTTPException(status_code=404, detail="Bulunamadı")` → hata döndürme

Ve bedava gelen: **`/docs`** (Swagger UI) ve **`/redoc`**.

### 3.4 Pydantic ile validation örneği
```python
class AssetCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    type: AssetType
    status: AssetStatus = AssetStatus.GOOD
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
```
Bu 6 satır, ödevdeki "isim boş olamaz, koordinat sayı olmalı" şartını backend'de karşılar.
**Validation her iki tarafta da yapılır** — frontend kullanıcı deneyimi için, backend güvenlik için.

---

## 4. Frontend: React + Vite + Tailwind

### 4.1 Bilmen gereken React
| Konu | Neden |
|---|---|
| JSX | Her şeyin temeli |
| Component + props | Parçalara bölmek |
| `useState` | Form, seçili satır, modal açık/kapalı |
| `useEffect` | Harita kurulumu, temizlik (cleanup!) |
| `useRef` | MapLibre nesnesini tutmak (**çok kritik**) |
| Koşullu render (`&&`, `? :`) | Loading / empty state |
| `.map()` ile liste render + `key` | Tablo satırları |
| Custom hook | `useAssets()` gibi tekrar kullanım |

### 4.2 Kütüphaneler

| Kütüphane | Ne için | Öğrenmen gereken |
|---|---|---|
| **vite** | Derleme + dev server | `npm run dev`, `vite.config.js` proxy ayarı |
| **tailwindcss** v4 | Stil | Utility sınıfları: `flex gap-4 p-4 rounded-lg`, `dark:`, `md:` |
| **maplibre-gl** | Harita | `new Map()`, `addSource`, `addLayer`, `on('click')`, `popup` |
| **react-hook-form** | Form | `useForm`, `register`, `handleSubmit`, `setValue`, `formState.errors` |
| **zod** + `@hookform/resolvers` | Şema doğrulama | `z.object({...})`, `zodResolver` |
| **@tanstack/react-query** | Sunucu verisi | `useQuery`, `useMutation`, `invalidateQueries` |
| **axios** | HTTP | `axios.create({ baseURL })`, interceptor |
| **recharts** | Grafik | `PieChart`, `BarChart`, `ResponsiveContainer` |
| **lucide-react** | İkon | `<TreePine />`, `<Lightbulb />` |
| **react-hot-toast** | Bildirim | `toast.success('Eklendi')` |

### 4.3 MapLibre'de bilmen gereken kavramlar

| Kavram | Açıklama |
|---|---|
| **Style** | Haritanın görünüm tarifi (JSON). Altlık + katmanlar |
| **Source** | Veri kaynağı — bizde `type: 'geojson'` |
| **Layer** | Kaynağı nasıl çizeceğin — `circle`, `symbol`, `heatmap`, `fill` |
| **Paint / Layout** | Renk, boyut, opaklık ayarları |
| **Expression** | Veriye göre dinamik stil: `['match', ['get','status'], 'GOOD','#22c55e', ...]` |
| **Popup / Marker** | Tıklanınca açılan balon / DOM tabanlı işaretçi |
| **fitBounds / flyTo** | Haritayı bir alana/noktaya götürme |
| **Cluster** | `cluster: true` ile otomatik nokta kümeleme |

⚠️ **React + MapLibre tuzağı:** Harita nesnesini `useState` içinde tutma → sonsuz render.
`useRef` kullan, `useEffect` içinde bir kez oluştur, cleanup'ta `map.remove()` çağır.

⚠️ **İkinci tuzak:** `map.addSource()` çağırmadan önce `map.on('load')` bekle,
yoksa "style is not done loading" hatası alırsın.

### 4.4 Ücretsiz harita altlıkları (API key gerekmez)
- OpenStreetMap raster: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`
- Carto Positron (açık/sade): `https://basemaps.cartocdn.com/gl/positron-gl-style/style.json`
- Carto Dark Matter (koyu tema): `.../dark-matter-gl-style/style.json`

---

## 5. Docker

### 5.1 Kavramlar
| Terim | Anlamı |
|---|---|
| **Image** | Kurulu programların dondurulmuş kalıbı |
| **Container** | Image'in çalışan hali |
| **Volume** | Kalıcı depolama — container silinse de veri kalır |
| **Port mapping** | `5432:5432` = dışarıdaki port : içerideki port |
| **Network** | Container'lar birbirini **servis adıyla** bulur (`db`, `backend`) |
| **healthcheck** | "Hazır mı?" kontrolü — backend, DB hazır olmadan başlamasın |
| **depends_on** | Başlatma sırası |

### 5.2 Komutlar
```bash
docker compose up -d          # arka planda başlat
docker compose logs -f backend # log izle
docker compose down           # durdur
docker compose down -v        # ⚠️ volume'leri de sil (veri gider!)
docker compose exec db psql -U postgres -d greenasset
docker compose build --no-cache
```

### 5.3 Bizim kullanacağımız image'ler
- `postgis/postgis:16-3.4` — PostgreSQL 16 + PostGIS 3.4 hazır
- `dpage/pgadmin4:latest` — web tabanlı DB yönetimi
- `python:3.12-slim` — backend tabanı
- `node:22-alpine` + `nginx:alpine` — frontend build + servis (multi-stage)

⚠️ **Windows notu:** Docker Desktop açık olmalı ve WSL2 backend kullanmalı.
Sistem tepsisindeki balina ikonu yeşilse hazırsın.

---

## 6. Git & GitHub

```bash
git init
git checkout -b feature/01-docker-db
git add . && git commit -m "feat(db): docker compose ve postgis kurulumu"
git push -u origin feature/01-docker-db
# GitHub'da Pull Request aç → açıklama yaz → merge
```

`.gitignore` içinde **mutlaka** olmalı:
```
.env
node_modules/
__pycache__/
.venv/
dist/
*.pyc
```

---

## 7. Sık Karşılaşacağın Hatalar ve Çözümleri

| Hata | Sebep | Çözüm |
|---|---|---|
| `CORS policy: No 'Access-Control-Allow-Origin'` | FastAPI'de CORS yok | `CORSMiddleware` ekle, `allow_origins=["http://localhost:5173"]` |
| Noktalar Afrika açıklarında (0,0) | lon/lat ters veya null | GeoJSON `[lon, lat]` sırasını kontrol et |
| `type "geometry" does not exist` | PostGIS eklentisi açılmamış | `CREATE EXTENSION IF NOT EXISTS postgis;` |
| `connection refused` (backend→db) | `localhost` yazmışsın | Docker içinde host adı **servis adıdır**: `db` |
| `Style is not done loading` | `map.on('load')` beklenmemiş | Katman ekleme kodunu load event içine al |
| Harita gri/boş | Container'ın yüksekliği 0 | `.map { height: 100% }` — parent'a da yükseklik ver |
| `422 Unprocessable Entity` | Pydantic doğrulaması patladı | Yanıt gövdesindeki `detail` alanını oku, alan adlarını karşılaştır |
| `psycopg` derleme hatası (Windows) | Yanlış paket | `psycopg[binary]` kur, ya da Docker kullan |
| Alembic geometri kolonunu her seferinde siliyor | GeoAlchemy2 uyumsuzluğu | `alembic/env.py` içinde `include_object` ile `spatial_ref_sys` tablosunu hariç tut |

---

## 8. Kaynaklar

| Konu | Bağlantı |
|---|---|
| FastAPI resmi öğretici | https://fastapi.tiangolo.com/tutorial/ |
| SQLAlchemy 2.0 ORM | https://docs.sqlalchemy.org/en/20/orm/quickstart.html |
| PostGIS fonksiyon referansı | https://postgis.net/docs/reference.html |
| PostGIS pratik atölye | https://postgis.net/workshops/postgis-intro/ |
| MapLibre GL JS API | https://maplibre.org/maplibre-gl-js/docs/API/ |
| MapLibre örnekler (kopyala-yapıştır) | https://maplibre.org/maplibre-gl-js/docs/examples/ |
| React Hook Form | https://react-hook-form.com/get-started |
| TanStack Query | https://tanstack.com/query/latest/docs/framework/react/overview |
| Tailwind v4 | https://tailwindcss.com/docs |
| Recharts | https://recharts.org/en-US/examples |
| GeoJSON spesifikasyonu (RFC 7946) | https://datatracker.ietf.org/doc/html/rfc7946 |
| Conventional Commits | https://www.conventionalcommits.org/tr/ |

---

## 9. Mülakat/Sunum İçin Hazır Cevaplar

**"PostGIS'in normal PostgreSQL'den farkı ne?"**
> PostgreSQL'e geometri veri tipi ve mekansal fonksiyonlar ekleyen bir eklenti.
> Normal veritabanında "şu poligonun içindeki noktalar" sorgusunu yazamazsın; PostGIS'te
> `ST_Within` ile tek satırda yazarsın ve GIST index sayesinde milyonlarca kayıtta bile hızlıdır.

**"Neden GeoJSON döndürdün?"**
> Çünkü RFC 7946 ile standartlaşmış bir format ve MapLibre/Leaflet/QGIS gibi tüm harita
> araçları doğrudan tüketebiliyor. Kendi özel formatımı yapsaydım frontend'de dönüştürme
> katmanı yazmam gerekirdi.

**"SRID 4326 ne demek?"**
> WGS84 coğrafi koordinat sistemi — GPS'in kullandığı sistem, birimi derece.
> Depolamada 4326 kullanıyorum; metre cinsinden mesafe gerektiğinde `geography` tipine
> cast ediyorum, harita çizimini ise MapLibre 3857'ye kendisi çeviriyor.

**"Katmanlı mimariden ne anlıyorsun?"**
> API katmanı HTTP'yi bilir, CRUD katmanı veritabanını bilir, model katmanı tabloyu tanımlar.
> Bu sayede yarın FastAPI'yi bırakıp başka framework'e geçsem CRUD katmanım aynen kalır.
