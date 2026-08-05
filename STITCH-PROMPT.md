# 🎨 Frontend Tasarım — Google Stitch Promptları

## Nasıl kullanacaksın?

1. https://stitch.withgoogle.com adresine git (Google hesabınla giriş)
2. **Mode: Standard** (hızlı) veya **Experimental** (daha iyi ama yavaş) seç
3. Aşağıdaki promptlardan birini **olduğu gibi** yapıştır (İngilizce bırak — Stitch İngilizce'de çok daha iyi sonuç verir)
4. Çıkan tasarımın ekran görüntüsünü bana at
5. Ben de o tasarıma göre Tailwind kodunu yazayım

> Alternatifler: v0.dev, Lovable, Figma AI, UX Pilot — aynı promptlar oralarda da çalışır.

---

## 🖥️ PROMPT 1 — Ana Harita Ekranı (en önemlisi)

```
Design a desktop web application screen for a municipal GIS asset management
system called "GreenAsset". It tracks city trees, park benches, and street lamps
on a map.

Layout — three zones:
- A slim left icon rail (72px) with vertical navigation: Dashboard, Map,
  Assets table, Reports, Settings. The active item is highlighted.
- A large interactive map fills the center and right, edge to edge.
- A floating glassmorphic panel (380px wide) docked to the right side over the
  map, with rounded corners and a soft shadow.

Map area:
- Show scattered circular markers in three colors: emerald green (Good),
  amber (Needs Maintenance), red (Broken).
- Some markers grouped into cluster bubbles showing counts like "24", "112".
- Bottom-left: a small legend card explaining the three colors and three asset
  type icons (tree, bench, lamp post).
- Top-center: a floating rounded search bar with placeholder
  "Search asset or address..." plus filter chips next to it:
  "All", "Trees", "Benches", "Lamps".
- Top-right of the map: small square tool buttons for zoom in, zoom out,
  draw polygon, and heatmap toggle.
- Bottom-right: a small "342 assets in view" pill badge.

Right floating panel — "Add Asset" form:
- Title "Add New Asset" with a close X button.
- Text input: Asset Name.
- Segmented control with icons for Type: Tree / Bench / Lamp.
- Status selector as three colored pill buttons: Good, Needs Maintenance, Broken.
- Two small side-by-side number inputs: Latitude and Longitude, with a hint
  underneath: "Click on the map to auto-fill coordinates".
- A textarea for Notes.
- A full-width primary "Save Asset" button and a ghost "Cancel" button.

Visual style:
- Clean, modern, professional municipal software. Not playful.
- Light theme with a very light gray page background (#F7F8FA) and white cards.
- Primary accent: deep forest green (#15803D). Secondary accent: teal.
- Typography: Inter, clear hierarchy, 14px body.
- Generous whitespace, 12px border radius, subtle 1px borders, soft shadows.
- Lucide-style thin line icons.
- Dense but breathable — this is a professional tool, not a marketing site.
```

---

## 📊 PROMPT 2 — Dashboard / Analiz Ekranı

```
Design a desktop analytics dashboard screen for "GreenAsset", a municipal urban
asset management system that tracks trees, benches, and street lamps.

Layout:
- Same slim left icon rail (72px) as the rest of the app.
- Top header bar: page title "Dashboard", a date range picker on the right,
  and an "Export" button with a dropdown (CSV / GeoJSON / PDF).

Content:
- A row of 4 KPI stat cards: "Total Assets 2,847", "Needs Maintenance 312",
  "Broken 47", "Added This Month 128". Each card has a small line icon, the big
  number, a label, and a small green or red trend indicator like "+12% vs last month".
- Below, a 2-column grid:
  - Left: a donut chart "Assets by Type" with a legend (Trees, Benches, Lamps).
  - Right: a horizontal stacked bar chart "Status Distribution by District".
- Full width below: an area chart "Assets Added Over Time" for the last 12 months.
- Bottom: a compact data table "Assets Needing Attention" with columns
  Name, Type (icon + label), Status (colored pill badge), District,
  Last Maintenance, and a row action menu. Include pagination and a
  "View on map" link on each row.

Visual style:
- Clean professional dashboard, light theme, page background #F7F8FA, white cards
  with 12px radius and very subtle shadows.
- Primary accent deep forest green (#15803D); chart palette of green, teal, amber, red.
- Inter font, clear typographic hierarchy, plenty of whitespace.
- Thin line icons, muted gray gridlines on charts.
```

---

## 📋 PROMPT 3 — Varlık Listesi / Tablo Ekranı

```
Design a desktop data table screen for "GreenAsset", a municipal asset management
system for city trees, benches and street lamps.

Layout:
- Slim left icon rail (72px), consistent with the rest of the app.
- Header: page title "Assets", a count subtitle "2,847 records", a search input,
  and a primary "+ Add Asset" button on the right.
- A filter toolbar below: dropdowns for Type, Status, and District, a date range
  filter, active filter chips with X buttons, and a "Clear all" text link.

Table:
- Columns: checkbox, Name, Type (small icon + text), Status (colored pill badge:
  green Good / amber Needs Maintenance / red Broken), Coordinates (monospace,
  small gray), Created date, and a row actions column with edit, locate-on-map,
  and delete icon buttons.
- Sortable column headers with sort arrows.
- Zebra-free rows with 1px light dividers and a subtle hover highlight.
- When rows are selected, show a floating bottom action bar:
  "12 selected — Change status, Export, Delete".
- Footer: rows-per-page selector and pagination controls.
- Also show one variant of an empty state illustration with the message
  "No assets match your filters".

Visual style:
- Clean professional light theme, #F7F8FA background, white table surface,
  12px radius, subtle borders.
- Primary accent deep forest green (#15803D).
- Inter font, 14px body, 13px table cells, comfortable row height (52px).
- Thin line icons, no heavy shadows.
```

---

## 📱 PROMPT 4 — Mobil (opsiyonel, ekstra puan)

```
Design a mobile app screen (390x844) for "GreenAsset", a field app for municipal
workers inspecting city trees, benches and street lamps.

- Full-screen map with colored circular markers (green/amber/red) and cluster bubbles.
- Floating rounded search bar at the top with a filter icon.
- A draggable bottom sheet, shown at half height, listing nearby assets as cards:
  each card has a type icon, name, a colored status pill, and a distance like "120 m".
- A floating action button (bottom right, above the sheet) with a plus icon
  to add an asset at the current GPS location.
- Bottom tab bar: Map, List, Dashboard, Profile.
- Light theme, deep forest green accent (#15803D), Inter font, thin line icons,
  large touch targets.
```

---

## 🤔 Bana Vermen Gereken Geri Bildirim

Tasarımları ürettikten sonra şunları söyle:

### 1. Genel yön
- [ ] Beğendim, aynen böyle yapalım
- [ ] Beğendim ama şurası değişsin: `____________`
- [ ] Hiç olmadı, şu tarzı istiyorum: `____________`

### 2. Renk paleti
| Seçenek | Ana renk | His |
|---|---|---|
| **A) Orman yeşili** `#15803D` | Yeşil + teal | Doğa/çevre, ODAKENT'in işine uygun |
| **B) Kurumsal lacivert** `#1E3A8A` | Lacivert + turkuaz | Ciddi, belediye/kamu havası |
| **C) Modern slate** `#0F172A` | Koyu gri + yeşil vurgu | Teknik, "developer tool" havası |
| **D) Kendi paletim** | `______` | |

### 3. Tema
- [ ] Sadece açık tema
- [ ] Sadece koyu tema (haritada koyu altlık çok şık durur)
- [ ] İkisi de + değiştirme anahtarı ⭐ *önerim*

### 4. Ana ekran ne olsun? (uygulama açılınca ilk gelen)
- [ ] Harita (saha odaklı) ⭐ *önerim — projenin yıldızı harita*
- [ ] Dashboard (yönetici odaklı)
- [ ] Varlık listesi (veri odaklı)

### 5. Form nerede dursun?
- [ ] Haritanın üzerinde yüzen panelde ⭐ *önerim — tıkla-doldur akışı en doğal*
- [ ] Ayrı sayfada
- [ ] Modal (açılır pencere) içinde

### 6. Dil
- [ ] Arayüz Türkçe
- [ ] Arayüz İngilizce
- [ ] İkisi de (i18n)

---

## 💡 Küçük Not

Stitch'in çıktısı **birebir kod olarak kullanılmayacak** — Tailwind'i ben elle,
temiz ve component'lere bölünmüş şekilde yazacağım. Stitch bize **görsel yön**
verecek: yerleşim, renk, boşluk, hiyerarşi. Yani "şuna benzesin" referansı.
