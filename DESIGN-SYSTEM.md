# 🎨 GreenAsset Tasarım Sistemi

Kaynak: Google Stitch kod export'u — [`docs/design/01-harita-ekrani.html`](docs/design/01-harita-ekrani.html)
Onay tarihi: 2026-08-05

Stitch **Material Design 3** token mimarisi üretti. Bu, "renk listesi"nden daha
güçlü bir sistem: her rengin bir de "üzerine ne yazılacağı" (`on-*`) eşi var.
Böylece kontrast hataları baştan engellenir.

> `primary` = butonun rengi · `on-primary` = o butonun ÜZERİNDEKİ yazının rengi

---

## Renk Token'ları

### Ana renkler

| Token | Hex | Kullanım |
|---|---|---|
| `primary` | `#00652C` | Ana vurgu, aktif menü, linkler |
| `on-primary` | `#FFFFFF` | Primary üzerindeki yazı |
| `primary-container` | `#15803D` | Ana buton zemini ("Save Asset") |
| `on-primary-container` | `#D3FFD5` | O butonun yazısı |
| `secondary` | `#006A61` | İkincil aksiyonlar |
| `on-secondary` | `#FFFFFF` | |
| `secondary-container` | `#86F2E4` | Aktif filtre chip'i |
| `on-secondary-container` | `#006F66` | |
| `tertiary` | `#4A586D` | Nötr vurgular |
| `error` | `#BA1A1A` | Hata, "Arızalı" durumu |
| `on-error` | `#FFFFFF` | |
| `error-container` | `#FFDAD6` | Hata arka planı |
| `on-error-container` | `#93000A` | |

### Yüzeyler — export'tan SAPMA (kullanıcı geri bildirimi)

Stitch'in orijinal rampasında basamaklar kanal başına **~5-6 birimdi**; göz bunu
ayırt edemiyor, kartlar zeminden kopmuyordu. Basamakları **~7-11 birime** açtık ve
zemini biraz koyulaştırdık ki beyaz kartlar öne çıksın.

| Token | Açık tema | Koyu tema |
|---|---|---|
| `surface-container-lowest` | `#FFFFFF` | `#080B07` |
| `surface-container-low` | `#F8FBF5` | `#161B15` |
| **`background` / `surface`** | **`#EFF4EA`** | **`#0E120D`** |
| `surface-container` | `#E8EEE2` | `#1F251D` |
| `surface-container-high` | `#DEE6D7` | `#2A3128` |
| `surface-container-highest` | `#D3DCCB` | `#363E33` |
| `surface-bright` | `#FDFFFA` | `#414A3E` |
| `surface-dim` | `#CBD5C3` | `#080B07` |
| `on-surface` | `#161B15` | `#E3E8DF` |
| `on-surface-variant` | `#3D473C` | `#C3CBBE` |
| `outline` | `#6B766A` | `#8D968A` |
| `outline-variant` | `#B4C2B0` | `#4A5347` |

Basamak farkları — açık: `7 · 9 · 7 · 10 · 11` · koyu: `6 · 8 · 9 · 11 · 12`

> Koyu tema `class` stratejisiyle: `<html class="dark">`.
> Token **adları** iki temada aynı, sadece değerleri değişiyor — bu yüzden
> bileşen kodunda tek bir `dark:` yazmaya gerek kalmıyor.

---

## ⚠️ Durum Renkleri — export'tan SAPMA (bilinçli karar)

Stitch'in legend'ında "Needs Maintenance" **teal** (`#006A61`) idi; ekran
görüntülerindeki tablo rozetlerinde ve dashboard grafiğinde ise **amber** görünüyordu.
Çelişkiyi **amber lehine** çözdük:

| Durum | Kod | Hex | Token |
|---|---|---|---|
| İyi | `GOOD` | `#15803D` | `status-good` |
| Bakım Lazım | `NEEDS_MAINTENANCE` | `#F59E0B` | `status-maintenance` |
| Arızalı | `BROKEN` | `#BA1A1A` | `status-broken` (= `error`) |

**Gerekçe:** Haritada 1500 nokta arasında yeşil ile teal ayırt edilemiyor —
özellikle küçük dairelerde ve kırmızı-yeşil renk körlüğünde. Trafik ışığı
metaforu (yeşil-sarı-kırmızı) evrensel olarak okunuyor.

> 🔒 Bu üç renk **tek bir dosyada** tanımlanacak: `src/theme/statusColors.js`
> Hem Tailwind sınıfları hem MapLibre `paint` ifadeleri oradan beslenecek.
> Aksi halde harita ile tablo zamanla birbirinden ayrılır.

---

## Tipografi

İki font kullanılıyor — ikisi de `@fontsource` ile self-host (CDN bağımlılığı yok):

| Rol | Font | Ağırlıklar | Neden |
|---|---|---|---|
| **Arayüz** | **Plus Jakarta Sans** | 400/500/600/700/800 | Geometrik ve canlı; Inter'den daha karakterli ama 12px'te bile okunaklı |
| **Veri** | **JetBrains Mono** | 400/500 | Koordinat ve sayılar; sabit genişlik sayesinde tablo sütunlarında rakamlar alt alta hizalanır |

> Export'ta font Inter'di; kullanıcı "biraz daha canlı" istediği için değiştirildi.
> Monospace veri fontu zaten tasarımda isteniyordu (koordinatlar için).

| Token | Boyut | Satır | Ağırlık | Font | Nerede |
|---|---|---|---|---|---|
| `display` | 32px | 1.2 | 700 | sans | KPI sayıları |
| `headline-lg` | 24px | 1.25 | 600 | sans | Sayfa başlığı |
| `headline-md` | 20px | 1.25 | 600 | sans | Panel başlığı |
| `body-lg` | 16px | 1.4 | 400 | sans | |
| `body-md` | 14px | 1.4 | 400 | sans | Varsayılan gövde |
| `body-sm` | 12px | 1.3 | 400 | sans | Yardım metni |
| `label-md` | 12px | 1.0 | **700** | sans | Etiket, buton (`ls .02em`) |
| `data-tabular` | 13px | 1.2 | 500 | **mono** | Koordinat, sayı, tablo hücresi |

Yardımcı sınıflar: `.tabular` (mono + tabular-nums) · `.nums` (sadece tabular-nums,
sans fontla KPI sayıları için)

---

## Ölçüler

| Token | Değer |
|---|---|
| `nav-rail-width` | 72px |
| `panel-width` | **400px** |
| `margin-page` | 24px |
| `gutter` | 16px |
| `component-padding` | 12px |
| `stack-gap` | 8px |

### Köşe yarıçapı
`DEFAULT` 4px · `lg` 8px · `xl` **12px** (kart, panel, input, buton) · `full` 9999px

### Gölge
- Yüzen kart: `0 4px 12px rgba(0,0,0,.08)`
- Panel: `shadow-2xl` + `backdrop-blur-xl`
- Cam efekti: `bg-surface/85 backdrop-blur-md`

---

## İkonlar — Material Symbols Outlined

npm paketi olarak self-host edilecek (Google CDN bağımlılığı yok → Docker'da
internetsiz de çalışır).

| Kullanım | İkon adı |
|---|---|
| Logo | `eco` |
| Menü: Dashboard / Harita / Varlıklar / Raporlar / Ayarlar | `dashboard` · `map` · `inventory_2` · `assessment` · `settings` |
| Ağaç | `park` |
| Bank | `chair` |
| Aydınlatma direği | `light` |
| Çöp kutusu | `delete` |
| Oyun grubu | `toys` |
| Harita araçları | `add` · `remove` · `draw` · `layers` |
| Form | `my_location` · `touch_app` · `save` · `close` |
| Arama / filtre | `search` · `tune` |

Dolu (filled) varyant için: `style="font-variation-settings: 'FILL' 1"`

---

## Ekran 1 Yerleşimi (harita ekranı)

```
┌──┬────────────────────────────────────────┬──────────────┐
│  │        [arama kutusu + filtre chip]    │  Add New     │
│72│                                        │  Asset       │
│px│              HARİTA                    │  paneli      │
│  │                          [zoom/araçlar]│  400px       │
│  │  ┌─────────┐                           │  cam efekti  │
│  │  │ Legend  │        [342 assets ▸]     │              │
└──┴──┴─────────┴───────────────────────────┴──────────────┘
```

Kritik detay: arama kutusu ve alt köşe rozetleri `right-[424px]` ile
konumlanıyor — yani **panel genişliği + sayfa kenar boşluğu** (400 + 24).
Panel kapanınca bu değerin de sıfırlanması gerekiyor.

---

## Tasarımdan Gelen Özellik Listesi

- [ ] Koordinat alanının yanında **"Use Current"** — tarayıcı geolocation
- [ ] **"Click on the map to auto-fill"** ipucu metni (ödevin 4. aşama şartı)
- [ ] Legend kartı — hem durum renkleri hem tip ikonları
- [ ] **"342 assets in view"** — bbox'a bağlı canlı sayaç (nabız animasyonlu nokta)
- [ ] Kümeleme balonları (24, 112) — `backdrop-blur` ile
- [ ] Harita araç çubuğu: zoom +/−, **polygon çiz**, **heatmap katmanı**
- [ ] Filtre chip'leri: Tümü / Ağaçlar / Banklar / Direkler
- [ ] Tip seçimi: 3'lü (bizde 5'li) ikonlu segment kontrolü
- [ ] Durum seçimi: renkli noktalı radio kartları
- [ ] Panel gövdesi kaydırılabilir + ince özel scrollbar

---

## Bekleyen Ekranlar

- [x] Ekran 1 — Harita (kod alındı)
- [ ] Ekran 2 — Dashboard
- [ ] Ekran 3 — Varlık tablosu
- [ ] Ekran 4 — Mobil (opsiyonel)
