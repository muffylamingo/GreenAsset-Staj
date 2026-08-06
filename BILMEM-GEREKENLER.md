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
| **PyJWT** | Oturum bileti üretme/doğrulama | `jwt.encode()`, `jwt.decode()` |
| **bcrypt** | Parola özetleme | `hashpw()`, `checkpw()` |
| **python-multipart** | Form verisi okuma | Sadece Swagger'ın Authorize formu için gerekli |
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

### 3.5 İlişkili tablolar (1-N) ve `column_property`

`assets` ile `maintenance_logs` arasında **bire-çok** ilişki var: bir varlığın
birden çok bakım kaydı olabilir.

```python
# maintenance.py — "çok" tarafı, yabancı anahtarı O tutar
asset_id: Mapped[uuid.UUID] = mapped_column(
    ForeignKey("assets.id", ondelete="CASCADE")
)
```

**`ON DELETE CASCADE`:** varlık silinince kayıtları da silinir. Bunu
veritabanı yapar, uygulama kodu değil — daha güvenilir, çünkü hangi yoldan
silinirse silinsin çalışır.

**N+1 problemi ve çözümü.** 25 varlık listelerken her biri için "son bakım
tarihi" ayrı sorguyla çekilseydi 1 + 25 = 26 sorgu atılırdı. Çözüm:

```python
# models/__init__.py
Asset.last_maintenance_at = column_property(
    select(func.max(MaintenanceLog.performed_at))
    .where(MaintenanceLog.asset_id == Asset.id)
    .correlate_except(MaintenanceLog)
    .scalar_subquery()
)
```

Artık her varlık satırıyla birlikte tek sorguda geliyor.

> ⚠️ Bu tanım neden `asset.py`'de değil `models/__init__.py`'de?
> `asset.py`, `maintenance.py`'yi import etseydi, `maintenance.py` de
> `asset.py`'yi import ettiği için **döngüsel import** olurdu. İki model de
> yüklendikten sonra bağlıyoruz.

**İlişki yönleri:**

| Terim | Anlamı |
|---|---|
| `relationship()` | Python tarafındaki bağlantı (SQL'de karşılığı yok) |
| `back_populates` | İki yönlü bağlantı: `asset.maintenance_logs` ↔ `log.asset` |
| `cascade="all, delete-orphan"` | Python tarafında silme davranışı |
| `ondelete="CASCADE"` | **Veritabanı** tarafında silme davranışı |
| `lazy="joined"` | İlişkiyi JOIN ile birlikte çek (ayrı sorgu atma) |

---

### 3.6 Kimlik Doğrulama ve Yetkilendirme

İki farklı kavram, sık karıştırılır:

| | Soru | HTTP kodu |
|---|---|---|
| **Authentication** (kimlik doğrulama) | "Sen kimsin?" | 401 Unauthorized |
| **Authorization** (yetkilendirme) | "Bunu yapabilir misin?" | 403 Forbidden |

401 = "seni tanımıyorum, giriş yap". 403 = "seni tanıyorum ama bu iş sana kapalı".

#### Parola nasıl saklanır?

**Asla düz metin olarak saklanmaz.** bcrypt kullanıyoruz:

```python
ozet = bcrypt.hashpw(parola.encode(), bcrypt.gensalt())
dogru_mu = bcrypt.checkpw(parola.encode(), ozet)
```

- **Tek yönlü:** özetten parolaya dönülemez
- **Tuz (salt):** her özet rastgele bir tuz içerir → aynı parola iki kullanıcıda
  farklı özet üretir → hazır özet tabloları (rainbow table) işe yaramaz
- **Yavaş olması özellik:** bcrypt bilerek yavaştır, kaba kuvvet saldırısını zorlaştırır

#### JWT (JSON Web Token) nedir?

Giriş yaptıktan sonra verilen "bilet". Üç parçadan oluşur, noktayla ayrılır:

```
eyJhbGciOiJIUzI1NiJ9 . eyJzdWIiOiIxMjMiLCJyb2xlIjoiQURNSU4ifQ . SflKxwRJSMeKKF2QT4f
└──── header ────┘   └────────── payload ──────────┘   └──── signature ────┘
     algoritma              içerik (kim, rol, süre)          imza
```

🚨 **En kritik nokta: payload ŞİFRELİ DEĞİL, sadece İMZALI.**
Herkes base64 çözüp içindekini okuyabilir; kimse **değiştiremez** (imza tutmaz).
Bu yüzden token'a gizli bilgi konmaz — kullanıcı adı ve rol yazmakta sakınca yok.

**Sunucu oturum saklamaz.** Token'ın kendisi kanıttır; sunucu sadece imzayı
doğrular. Buna *stateless* denir.

#### FastAPI'de nasıl kuruluyor?

```python
# Bağımlılık (dependency): token'ı çöz, kullanıcıyı bul
def get_current_user(token = Depends(oauth2_scheme), db = Depends(get_db)) -> User:
    icerik = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    return db.get(User, uuid.UUID(icerik["sub"]))

# Bir ucu korumak tek satır:
@router.delete("/{id}", dependencies=[Depends(require_admin)])
```

Bu projede koruma **tek tek uçlara değil router'a** bağlı:

```python
app.include_router(assets.router, dependencies=[Depends(get_current_user)])
```

Böylece yeni bir uç eklendiğinde korumayı yazmayı unutmak mümkün değil —
varsayılan kapalı, açmak için bilinçli çaba gerekir.

#### Bilmen gereken 4 güvenlik kuralı

1. **"Kullanıcı yok" ile "parola yanlış" AYNI mesajı dönmeli.** Farklı olursa
   saldırgan hangi kullanıcı adlarının var olduğunu tek tek deneyerek öğrenir
   (*user enumeration*).
2. **Yetkiyi token'daki role değil veritabanına sorarak kontrol et.** Token
   12 saat geçerli; o sürede kullanıcı pasifleştirilmiş olabilir.
3. **Arayüzde buton gizlemek güvenlik değildir.** Kullanıcı deneyimidir.
   Asıl koruma sunucuda olmalı — istemci kodu değiştirilebilir.
4. **`SECRET_KEY` gizli kalmalı.** Anahtarı bilen herkes geçerli token
   üretebilir. Üretimde `.env`'den gelmeli, koda yazılmamalı.

#### Frontend tarafı

```js
// Her isteğe bileti ekle
client.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${token}`
  return config
})

// 401 gelirse oturumu kapat
if (error.response.status === 401) oturumuSonlandir()
```

> **Token nerede saklanır?** Bu projede `localStorage` (sayfa yenilenince
> oturum kaybolmasın diye). ⚠️ `localStorage` XSS'e karşı korumasızdır —
> sayfaya kötü script enjekte edilirse token okunabilir. Daha güvenli yol
> **HttpOnly cookie**'dir; JavaScript onu okuyamaz. Bu projede basitlik için
> `localStorage` seçildi ve bu bilinçli bir ödün.

---

## 3.7 Swagger (`/docs`) — Kullanım Rehberi

**http://localhost:8000/docs**

Bu sayfayı FastAPI **otomatik** üretir; tek satır kod yazmadık. Kodda ne varsa
sayfada o görünür — yeni bir uç eklersen anında burada belirir.

> 💡 Sunumda/teslimde bu sayfayı açıp göstermek tek başına etkileyicidir:
> "API dokümantasyonu da yazdım" demek yerine çalışan halini gösterirsin.

### Sayfayı okumak

Uçlar **etiketlere (tag)** göre gruplanmıştır — bizde: Sistem · Varlıklar ·
Mekansal Sorgular · Dışa Aktarma · İlçeler · İstatistikler.

Her satırdaki renkli kutu HTTP metodudur:

| Renk | Metot | Anlamı |
|---|---|---|
| 🟦 Mavi | GET | Veri oku |
| 🟩 Yeşil | POST | Yeni kayıt oluştur |
| 🟧 Turuncu | PUT | Güncelle |
| 🟨 Sarı | PATCH | Kısmi güncelle |
| 🟥 Kırmızı | DELETE | Sil |

### Bir ucu deneme — 5 adım

1. Uca tıkla, açılsın
2. Sağ üstteki **`Try it out`** butonuna bas (alanlar düzenlenebilir hale gelir)
3. Parametreleri doldur
4. Mavi **`Execute`** butonuna bas
5. Aşağıda **Response** bölümünde sonucu gör

Sonuç bölümünde üç şey vardır:
- **Code** → HTTP durum kodu (200 tamam, 201 oluşturuldu, 422 doğrulama hatası...)
- **Response body** → dönen JSON
- **Curl** → aynı isteğin terminal komutu (kopyalayıp başka yerde çalıştırabilirsin)

### Bu projede denemeye değer 6 senaryo

**1. Sistemin ayakta mı?**
`GET /health` → `Try it out` → `Execute`
Beklenen: `{"status":"ok","database":true,"postgis":"3.4 ..."}`

**2. GeoJSON çıktısını gör (ödevin kritik şartı)**
`GET /api/v1/assets` → `limit` alanına `2` yaz → `Execute`
Dönen yapıya dikkat et: `type: "FeatureCollection"`, içinde `features` dizisi.
Her feature'da `geometry.coordinates` var — **sırası `[boylam, enlem]`**.

**3. Filtreleri birleştir**
Aynı uçta `type` = `TREE`, `status` = `BROKEN` seç → `Execute`
`totalCount` alanına bak: sadece arızalı ağaçların sayısı.

**4. Yeni varlık ekle**
`POST /api/v1/assets` → `Try it out` → gövdeyi şununla değiştir:

```json
{
  "name": "Deneme Çınarı",
  "type": "TREE",
  "status": "GOOD",
  "latitude": 41.105,
  "longitude": 29.027,
  "notes": "Swagger'dan eklendi"
}
```

`Execute` → **201** dönmeli. Yanıttaki `district_name` alanına bak:
**"Sarıyer"** yazıyor. Biz ilçeyi göndermedik — PostGIS `ST_Within` ile
koordinattan kendisi buldu.

> Dönen `id` değerini kopyala, sonraki adımlarda lazım olacak.

**5. Doğrulamayı test et (bilerek hata yap)**
Aynı uçta `name` alanını `""` yap, `latitude`'ü `999` yap → `Execute`
**422** dönecek. `detail` içinde hangi alanın neden reddedildiği yazar:

```json
{"detail":[{"loc":["body","name"],"msg":"İsim boş olamaz"}, ...]}
```

Bu, "validation backend'de de var" demenin kanıtıdır.

**6. Mekansal sorgu — projenin en GIS'li kısmı**
`POST /api/v1/assets/within` → `Try it out` → gövde:

```json
{
  "polygon": {
    "type": "Polygon",
    "coordinates": [[[29.00,41.08],[29.10,41.08],[29.10,41.20],[29.00,41.20],[29.00,41.08]]]
  }
}
```

`Execute` → o dikdörtgenin içine düşen varlıklar + `countsByStatus` özeti.
Bu sorgu normal PostgreSQL'de **yazılamaz**; PostGIS'in farkı tam olarak budur.

**Bonus:** `GET /api/v1/assets/nearby` → `lat=41.105`, `lon=29.027`,
`radius=50` dene, sonra `radius=5000` dene. Yarıçapı metre olarak işlediğini
görürsün (`::geography` cast'i sayesinde).

### Şema (Schemas) bölümü

Sayfanın en altındaki **Schemas** kısmı, API'nin kullandığı tüm veri
yapılarını listeler: `AssetCreate`, `AssetOut`, `StatsSummary`...
Her alanın tipi, zorunlu olup olmadığı ve kısıtları (min/max) burada yazar.
Bu bölüm Pydantic şemalarından otomatik üretilir.

### Sık karşılaşılan durumlar

| Durum | Sebep | Çözüm |
|---|---|---|
| Sayfa açılmıyor | Backend çalışmıyor | `docker compose up -d` |
| `422 Unprocessable Entity` | Gönderdiğin veri şemaya uymuyor | Yanıttaki `detail` → `loc` alanı hangi alanın sorunlu olduğunu söyler |
| `404 Varlık bulunamadı` | Yanlış/silinmiş UUID | Önce `GET /assets` ile geçerli bir id al |
| `500 Internal Server Error` | Backend'de beklenmeyen hata | `docker compose logs backend --tail 50` ile logu oku |
| Türkçe karakterler bozuk | Sadece görüntü sorunu olabilir | Swagger UTF-8 gösterir; bozuksa gerçekten sorun var demektir |
| Dışa aktarma ucu dosya indirmiyor | Swagger büyük dosyaları göstermez | `Download file` bağlantısını kullan ya da adresi tarayıcıda aç |

### `/redoc` farkı

**http://localhost:8000/redoc** aynı bilgiyi daha okunaklı, **ama denemesiz**
gösterir. Swagger "deneme tahtası", ReDoc "referans kitabı" gibidir.
Dokümantasyonu birine göstereceksen ReDoc daha derli toplu görünür.

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
| **recharts** v2 | Grafik | `BarChart`, `AreaChart`, `ResponsiveContainer`, `isAnimationActive` |
| **react-i18next** | Çoklu dil | `useTranslation()`, `t('anahtar')`, `changeLanguage()` |
| **@fontsource/\*** | Self-host font | CDN'e bağımlı kalmamak için |
| **react-hot-toast** | Bildirim | `toast.success('Eklendi')` |

> İkon için `lucide-react` yerine **Material Symbols SVG'leri** tek tek inline
> ediliyor (`src/components/ui/Icon.jsx`). Sebep: variable font 7792 ikon
> içeriyor ve **3.96 MB**; biz 35 tanesini kullanıyoruz → ~8 KB.

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

### Bu projede gerçekten karşılaştıklarımız

Aşağıdakiler teorik değil — hepsi bu projede başımıza geldi ve saatler yedi.

| Hata | Sebep | Çözüm |
|---|---|---|
| `bg-${degisken}` rengi hiç çıkmıyor | Tailwind sınıf adlarını kaynak kodda **metin olarak** arar; dinamik isimler hiç üretilmez | Sınıfları tam metin olarak yaz, nesnede sakla |
| Tablo kaydırılmıyor, satırlar kırpılıyor | Flexbox: `flex-1` olan öğe varsayılan `min-height:auto` ile içeriğinden küçülemez | Kaydırılacak kutuya **`min-h-0`** ekle |
| Recharts barları hiç çizilmiyor | Büyüme animasyonu `requestAnimationFrame` ile; sekme arka plandaysa rAF durur, bar sıfır genişlikte kalır | `isAnimationActive={false}` |
| MapLibre `does not provide an export named 'default'` | v6 varsayılan export'u kaldırdı | Kararlı **v5** kullan (tüm dokümantasyon da onu anlatıyor) |
| Harita katmanları hiç eklenmiyor | Tema `useEffect`'i ilk render'da da `setStyle()` çağırıp yükleme zincirini bozuyor; `styledata` olayında `isStyleLoaded()` hep `false` | İlk render'ı atla + **`style.load`** olayını kullan |
| `GET /assets/nearby` → 422 | `GET /assets/{id}` daha önce kayıtlı; "nearby" kelimesi UUID sanılıyor | Özel yolları `/{id}`'den **ÖNCE** kaydet |
| Nominatim detaylı adresi bulamıyor | Serbest metni bütün olarak eşleştiriyor; karşılığı olmayan tek kelime sonucu sıfırlıyor | Sonuç boşsa sondan bir kelime atıp tekrar dene |
| Excel'de `Ã‡Ä±nar` görünüyor | CSV'de UTF-8 BOM yok | Dosyanın başına BOM ekle, ayraç olarak `;` kullan |
| PowerShell'le düzenlenen dosyada Türkçe bozuluyor | PS 5.1 `Get-Content` varsayılan ANSI okur | Kaynak dosyaları PowerShell ile düzenleme |
| Alembic `type "asset_status" already exists` | Enum başka migration'da oluşturulmuş | `postgresql.ENUM(..., create_type=False)` |

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
| FastAPI güvenlik / OAuth2 | https://fastapi.tiangolo.com/tutorial/security/ |
| JWT nasıl çalışır (kurcala) | https://jwt.io |
| bcrypt neden yavaş olmalı | https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html |
| SQLAlchemy ilişkiler | https://docs.sqlalchemy.org/en/20/orm/relationships.html |
| Nominatim kullanım politikası | https://operations.osmfoundation.org/policies/nominatim/ |
| Recharts örnekler | https://recharts.org/en-US/examples |

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

**"JWT nasıl çalışıyor, oturumu nerede saklıyorsun?"**
> Hiçbir yerde — *stateless*. Token'ın kendisi kanıt: içinde kullanıcı kimliği
> ve rol yazıyor, sunucunun gizli anahtarıyla imzalı. Sunucu her istekte imzayı
> doğruluyor. İçerik şifreli değil, sadece imzalı; herkes okuyabilir ama kimse
> değiştiremez. Bu yüzden token'a gizli bilgi koymuyorum. Yetki kontrolünde
> token'daki role değil veritabanına bakıyorum, çünkü token 12 saat geçerli ve
> o sürede kullanıcının rolü değişmiş olabilir.

**"Parolaları nasıl saklıyorsun?"**
> Saklamıyorum — bcrypt özetini saklıyorum. Tek yönlü, geri döndürülemez.
> Her özet rastgele bir tuz içeriyor, o yüzden aynı parolaya sahip iki kullanıcının
> özeti farklı; hazır özet tabloları işe yaramıyor. bcrypt'in yavaş olması da
> kasıtlı, kaba kuvvet saldırısını zorlaştırıyor.

**"Arayüzde silme butonunu gizledin, bu yeterli mi?"**
> Hayır, o sadece kullanıcı deneyimi — saha ekibi basıp hata almasın diye.
> Asıl koruma sunucuda: `require_admin` bağımlılığı. Test ettim, saha rolüyle
> DELETE isteği 403 dönüyor. İstemci kodu değiştirilebilir, sunucu değiştirilemez.

**"N+1 problemi nedir, karşılaştın mı?"**
> Evet. 25 varlık listelerken her biri için "son bakım tarihi" ayrı sorguyla
> çekilseydi 26 sorgu atılırdı. `column_property` + `scalar_subquery` ile
> alt sorguyu ana sorguya gömdüm; tek sorguda geliyor.

**"Renk seçimlerini neye göre yaptın?"**
> Durum renklerini renk körlüğü doğrulayıcısından geçirdim. Koyu tema paleti
> **reddedildi**: protanopi altında yeşil ile amber arasındaki fark ΔE 7.3'tü,
> eşik 8. Yani kırmızı-yeşil renk körü biri "İyi" ile "Bakım Lazım"ı ayırt
> edemeyecekti. Yeşili koyulaştırıp amberi açarak ΔE 17.5'e çıkardım.
> Ayrıca renk hiçbir yerde tek başına bilgi taşımıyor, her zaman metinle birlikte.
