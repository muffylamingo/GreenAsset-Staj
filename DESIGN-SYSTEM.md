# 🎨 GreenAsset Tasarım Sistemi

Kaynak: Google Stitch çıktısı (onaylandı — 2026-08-05).
Bu değerler Aşama 3'te doğrudan Tailwind yapılandırmasına ve CSS değişkenlerine dönüşecek.

---

## Renk Paleti

### Marka renkleri

| Rol | Hex | Kullanım |
|---|---|---|
| **Primary** | `#15803D` | Ana butonlar, aktif menü, vurgu |
| **Secondary** | `#0D9488` | İkincil aksiyonlar, grafik ikinci serisi |
| **Tertiary** | `#334155` | Koyu yüzeyler, başlıklar, inverted buton |
| **Neutral** | `#737971` | İkincil metin, kenarlıklar, pasif durumlar |

### Durum renkleri (harita + rozet + grafik — hepsinde AYNI)

| Durum | Kod | Hex | Nerede |
|---|---|---|---|
| İyi | `GOOD` | `#16A34A` | Harita noktası, tablo rozeti, legend |
| Bakım Lazım | `NEEDS_MAINTENANCE` | `#F59E0B` | " |
| Arızalı | `BROKEN` | `#EF4444` | " |

> ⚠️ Bu üç renk **tek bir yerde** tanımlanacak (`src/theme/colors.js`) ve hem
> Tailwind sınıfları hem MapLibre paint ifadeleri oradan beslenecek.
> Aksi halde harita ile tablo zamanla birbirinden ayrılır.

### Yüzeyler

| Rol | Açık tema | Koyu tema |
|---|---|---|
| Sayfa arkaplanı | `#F1F5F0` | `#0F172A` |
| Kart / panel | `#FFFFFF` | `#1E293B` |
| Kenarlık | `#E2E8E0` | `#334155` |
| Ana metin | `#1A1D1A` | `#F1F5F9` |
| İkincil metin | `#737971` | `#94A3B8` |

---

## Tipografi

**Font ailesi:** Inter (tüm seviyeler)

| Seviye | Boyut / satır | Ağırlık |
|---|---|---|
| Headline | 24–32px | 600 |
| Başlık (kart) | 18px | 600 |
| Body | 14px / 20px | 400 |
| Label | 13px | 500 |
| Tablo hücresi | 13px | 400 |
| Koordinat | 12px **monospace** | 400 |

---

## Bileşen Kuralları

| Öğe | Değer |
|---|---|
| Köşe yarıçapı | 12px (kart/panel), 8px (buton/input) |
| Kenarlık | 1px |
| Gölge | çok yumuşak — `0 1px 3px rgba(0,0,0,.06)` |
| Tablo satır yüksekliği | 52px |
| Sol ikon rayı genişliği | 72px |
| Sağ yüzen panel | 380px |
| Boşluk ölçeği | 4 / 8 / 12 / 16 / 24 / 32 |

### Buton varyantları (Stitch'ten)
`Primary` (dolu yeşil) · `Secondary` (açık zemin) · `Inverted` (koyu) · `Outlined` (çerçeveli)

---

## Tasarımdan Gelen Özellik Notları

Stitch çıktısında olup ödevde olmayan, uygulanacak detaylar:

- [ ] Koordinat alanının yanında **"Use Current"** — tarayıcı geolocation ile GPS konumu
- [ ] Harita altında **legend kartı** — hem durum renkleri hem tip ikonları
- [ ] **"342 assets in view"** rozeti — bbox filtresine bağlı canlı sayaç
- [ ] KPI kartlarında **"+12% vs geçen ay"** trend göstergesi
- [ ] Zaman grafiğinde **12M / 6M / 30D** aralık seçici
- [ ] Tabloda **toplu seçim** + alt aksiyon çubuğu (durum değiştir / dışa aktar / sil)
- [ ] Filtre **chip'leri** + "Tümünü temizle"
- [ ] Mobilde **"45m uzakta"** — ST_DWithin mesafe hesabı
- [ ] Boş durum ekranı: "Filtrelerine uyan varlık yok"

---

## İkonlar

Lucide (ince çizgi). Varlık tipi eşlemesi:

| Tip | İkon |
|---|---|
| Ağaç | `TreePine` |
| Bank | `Armchair` |
| Aydınlatma Direği | `Lamp` |
| Çöp Kutusu | `Trash2` |
| Oyun Grubu | `ToyBrick` |
