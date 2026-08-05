# ⭐ Ekstra Özellikler — "Etkilemek İçin"

Ödevde **istenmeyen** ama eklediğinde staj değerlendirmende fark yaratacak özellikler.
Hepsini eklemene gerek yok — **A ve B grubunu** yapman bile yeterince öne çıkarır.

Kolonlar:
- **Zorluk:** ⭐ kolay (1-2 saat) · ⭐⭐ orta (yarım gün) · ⭐⭐⭐ zor (1+ gün)
- **Etki:** Değerlendirenin gözünde ne kadar "vay be" dedirtir

---

## 🅰️ Grup A — Az emek, çok etki (kesinlikle öneriyorum)

| # | Özellik | Ne Yapar | Neden Etkiler | Zorluk | Etki | Katman |
|---|---|---|---|---|---|---|
| A1 | **Sahte veri üreteci (seed)** | Faker ile İstanbul içinde 500–2000 rastgele varlık üretir | Boş ekran yerine dolu bir şehir haritası açılır; demo anında inandırıcı olur | ⭐ | 🔥🔥🔥 | Backend |
| A2 | **Duruma göre renk kodlama + legend** | Yeşil=İyi, Sarı=Bakım Lazım, Kırmızı=Arızalı + harita köşesinde açıklama kutusu | Haritaya bakan kişi 1 saniyede durumu anlar; UX bilinci gösterir | ⭐ | 🔥🔥🔥 | Frontend |
| A3 | **Swagger'ı özelleştirme** | `/docs` sayfasına proje adı, açıklama, örnek istek/yanıtlar | Backend'i açıklamana gerek kalmaz, sayfa kendini anlatır | ⭐ | 🔥🔥 | Backend |
| A4 | **Toast + onay modalı + skeleton** | Silmeden önce onay, işlem sonrası bildirim, yükleme iskeletleri | "Kod çalışıyor" ile "ürün gibi duruyor" arasındaki fark | ⭐ | 🔥🔥 | Frontend |
| A5 | **Tablo ↔ harita çift yönlü seçim** | Tablo satırına gelince haritadaki nokta zıplar; noktaya tıklayınca tablo satırı seçilir | Detaya inen mühendislik hissi verir | ⭐⭐ | 🔥🔥🔥 | Frontend |
| A6 | **Dark mode** | Tailwind `dark:` ile tema anahtarı, harita altlığı da değişir | Sunumda tek tıkla "hoop" efekti | ⭐ | 🔥🔥 | Frontend |

---

## 🅱️ Grup B — GIS derinliği (asıl teknik farkı burada gösterirsin)

| # | Özellik | Ne Yapar | Neden Etkiler | Zorluk | Etki | Katman |
|---|---|---|---|---|---|---|
| B1 | **En yakın varlık sorgusu** | `ST_DWithin` + KNN (`<->`) ile "konumuma 500m'deki bakım bekleyenler" | Saha ekibi senaryosunu çözer; PostGIS'i gerçekten anladığını kanıtlar | ⭐⭐ | 🔥🔥🔥 | Backend+FE |
| B2 | **Nokta kümeleme (clustering)** | MapLibre `cluster: true` — 2000 nokta yerine sayı balonları | Performans bilinci; büyük veriyle çalışabildiğini gösterir | ⭐⭐ | 🔥🔥🔥 | Frontend |
| B3 | **Isı haritası (heatmap) katmanı** | Yoğunluk katmanı aç/kapa | Görsel olarak en çarpıcı ekran; ekran görüntüsü olarak README'ye gider | ⭐⭐ | 🔥🔥 | Frontend |
| B4 | **Adres arama (geocoding)** | Nominatim API ile "Beşiktaş" yaz → harita oraya uçsun | Küçük ama çok "kullanılabilir ürün" hissi verir | ⭐⭐ | 🔥🔥 | Frontend |
| B5 | **Bakım geçmişi tablosu** | `maintenance_logs` — her varlığın bakım kaydı, "X gündür bakılmadı" rozeti | İlişkisel veri modeli (1-N) + JOIN bildiğini gösterir | ⭐⭐ | 🔥🔥🔥 | Full |
| B6 | **Vector tile endpoint (`ST_AsMVT`)** | Backend'den hazır harita karosu üretimi | Ciddi GIS bilgisi. ODAGIS+ vizyonuna en yakın madde | ⭐⭐⭐ | 🔥🔥🔥 | Backend |
| B7 | **Zaman çizelgesi (timeline slider)** | Slider'ı kaydır → sadece o tarihe kadar eklenen varlıklar görünsün | Veriye zaman boyutu katar, sunumda çok hoş durur | ⭐⭐ | 🔥🔥 | Frontend |

---

## 🅲 Grup C — Mühendislik disiplini (kod kalitesi puanı)

| # | Özellik | Ne Yapar | Neden Etkiler | Zorluk | Etki | Katman |
|---|---|---|---|---|---|---|
| C1 | **Alembic migration** | DB şeması kod ile versiyonlanır | "SQL'i elle yazdım" değil "migration yazdım" demek profesyonellik | ⭐⭐ | 🔥🔥🔥 | Backend |
| C2 | **Pytest testleri** | Endpoint testleri + test veritabanı | Test yazan stajyer azınlıktadır | ⭐⭐ | 🔥🔥🔥 | Backend |
| C3 | **GitHub Actions CI** | Her push'ta lint + test otomatik çalışır | PR'da yeşil tik görünür, DevOps farkındalığı | ⭐⭐ | 🔥🔥 | DevOps |
| C4 | **Ruff + ESLint + Prettier** | Otomatik format ve lint | Kod tutarlılığı | ⭐ | 🔥 | Full |
| C5 | **Frontend'i de Docker'a alma + Nginx** | `docker compose up` ile SADECE tek komut, hiç npm gerekmez | Değerlendiren kişi 30 saniyede projeyi çalıştırır — en büyük artı | ⭐⭐ | 🔥🔥🔥 | DevOps |
| C6 | **Structured logging + request ID** | Her isteğe takip numarası, JSON log | Üretim düşünen mühendis izlenimi | ⭐⭐ | 🔥 | Backend |

---

## 🅳 Grup D — İddialı (vaktin kalırsa)

| # | Özellik | Ne Yapar | Neden Etkiler | Zorluk | Etki | Katman |
|---|---|---|---|---|---|---|
| D1 | **JWT ile rol bazlı yetki** | `admin` (silebilir) / `saha` (sadece ekler) | Gerçek uygulama mantığı; güvenlik farkındalığı | ⭐⭐⭐ | 🔥🔥 | Full |
| D2 | **Fotoğraf yükleme** | Varlığa saha fotoğrafı ekle (MinIO veya statik klasör) | Popup'ta fotoğraf görünmesi çok etkileyici | ⭐⭐⭐ | 🔥🔥 | Full |
| D3 | **PWA / offline mod** | Saha ekibi internetsiz veri girsin, sonra senkronize olsun | Ürün düşüncesi, ama zaman yer | ⭐⭐⭐ | 🔥🔥 | Frontend |
| D4 | **WebSocket canlı güncelleme** | Biri varlık eklerse diğer ekranda anında görünsün | Demoda iki sekme açıp göstermek etkileyici | ⭐⭐⭐ | 🔥🔥 | Full |
| D5 | **PDF rapor çıktısı** | Dashboard'u logolu PDF olarak indir | Belediye senaryosuna çok uygun | ⭐⭐ | 🔥 | Frontend |
| D6 | **Türkçe/İngilizce dil desteği (i18n)** | Dil değiştirme anahtarı | Kurumsal projelerde standarttır | ⭐⭐ | 🔥 | Frontend |

---

## 📌 Benim Önerim (denge paketi)

Ödevin tamamı **+ şu 8 ekstra** = hem bitirilebilir hem çok etkileyici:

```
A1  Seed veri            ← demoyu kurtaran şey
A2  Renk kodlama+legend
A5  Tablo ↔ harita senkron
B1  ST_DWithin yakınlık
B2  Clustering
B5  Bakım geçmişi
C1  Alembic
C5  Frontend Docker (tek komut)
```

Toplam ek yük: yaklaşık **2–2.5 gün**.

---

## ✍️ Seçimin

Aşağıya seçtiklerini işaretle, ona göre planı güncelleyeceğim:

- [ ] Önerdiğin denge paketini uygula
- [ ] Ben tek tek seçeceğim: `____________________`
- [ ] Önce sadece ödevi bitirelim, ekstraları sonra konuşalım
