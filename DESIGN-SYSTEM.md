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

### Yüzeyler (açık tema)

| Token | Hex |
|---|---|
| `background` / `surface` / `surface-bright` | `#F6FBF2` |
| `surface-container-lowest` | `#FFFFFF` |
| `surface-container-low` | `#F0F5EC` |
| `surface-container` | `#EAEFE6` |
| `surface-container-high` | `#E4EAE1` |
| `surface-container-highest` / `surface-variant` | `#DFE4DB` |
| `surface-dim` | `#D6DCD3` |
| `on-surface` / `on-background` | `#181D17` |
| `on-surface-variant` | `#3F493F` |
| `outline` | `#6F7A6E` |
| `outline-variant` | `#BECABC` |
| `inverse-surface` | `#2C322C` |
| `inverse-on-surface` | `#EDF2E9` |
| `inverse-primary` / `primary-fixed-dim` | `#79DB8D` |

> Koyu tema `class` stratejisiyle çalışacak (`darkMode: "class"`).
> Koyu yüzeyler için `inverse-surface` ailesi ve `primary-fixed-dim` kullanılıyor.

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

**Font:** Inter (400 / 500 / 600 / 700 / 900)

| Token | Boyut | Satır | Ağırlık | Nerede |
|---|---|---|---|---|
| `display` | 32px | 1.2 | 700 | KPI sayıları |
| `headline-lg` | 24px | 1.25 | 600 | Sayfa başlığı |
| `headline-md` | 20px | 1.25 | 600 | Panel başlığı |
| `body-lg` | 16px | 1.4 | 400 | |
| `body-md` | 14px | 1.4 | 400 | Varsayılan gövde |
| `body-sm` | 12px | 1.3 | 400 | Yardım metni |
| `label-md` | 12px | 1.0 | 600 | Etiket, buton (`letter-spacing: .02em`) |
| `data-tabular` | 13px | 1.2 | 500 | Koordinat, sayı, tablo hücresi |

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
