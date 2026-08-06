/**
 * Material Symbols ikonları — sadece KULLANDIKLARIMIZ.
 *
 * Neden font değil de tek tek SVG?
 * `material-symbols` npm paketinin variable fontu 7792 ikon içeriyor ve
 * 3.96 MB. Biz 30 küskür ikon kullanıyoruz. Tek tek SVG olarak alınca
 * toplam ~8 KB'a düşüyor — yani 500 kat küçük.
 *
 * Yeni bir ikon lazım olursa: node_modules/@material-symbols/svg-400/outlined/
 * içinden adını bul, aşağıya import et ve ICONS'a ekle.
 */

import add from '@material-symbols/svg-400/outlined/add.svg?raw'
import analytics from '@material-symbols/svg-400/outlined/analytics.svg?raw'
import arrowDownward from '@material-symbols/svg-400/outlined/arrow_downward.svg?raw'
import arrowUpward from '@material-symbols/svg-400/outlined/arrow_upward.svg?raw'
import chair from '@material-symbols/svg-400/outlined/chair.svg?raw'
import check from '@material-symbols/svg-400/outlined/check.svg?raw'
import chevronLeft from '@material-symbols/svg-400/outlined/chevron_left.svg?raw'
import chevronRight from '@material-symbols/svg-400/outlined/chevron_right.svg?raw'
import close from '@material-symbols/svg-400/outlined/close.svg?raw'
import darkMode from '@material-symbols/svg-400/outlined/dark_mode.svg?raw'
import dashboard from '@material-symbols/svg-400/outlined/dashboard.svg?raw'
import deleteIcon from '@material-symbols/svg-400/outlined/delete.svg?raw'
import download from '@material-symbols/svg-400/outlined/download.svg?raw'
import draw from '@material-symbols/svg-400/outlined/draw.svg?raw'
import eco from '@material-symbols/svg-400/outlined/eco.svg?raw'
import edit from '@material-symbols/svg-400/outlined/edit.svg?raw'
import filterList from '@material-symbols/svg-400/outlined/filter_list.svg?raw'
import inventory from '@material-symbols/svg-400/outlined/inventory_2.svg?raw'
import language from '@material-symbols/svg-400/outlined/language.svg?raw'
import layers from '@material-symbols/svg-400/outlined/layers.svg?raw'
import light from '@material-symbols/svg-400/outlined/light.svg?raw'
import lightMode from '@material-symbols/svg-400/outlined/light_mode.svg?raw'
import locationOn from '@material-symbols/svg-400/outlined/location_on.svg?raw'
import map from '@material-symbols/svg-400/outlined/map.svg?raw'
import moreVert from '@material-symbols/svg-400/outlined/more_vert.svg?raw'
import myLocation from '@material-symbols/svg-400/outlined/my_location.svg?raw'
import park from '@material-symbols/svg-400/outlined/park.svg?raw'
import refresh from '@material-symbols/svg-400/outlined/refresh.svg?raw'
import remove from '@material-symbols/svg-400/outlined/remove.svg?raw'
import save from '@material-symbols/svg-400/outlined/save.svg?raw'
import search from '@material-symbols/svg-400/outlined/search.svg?raw'
import settings from '@material-symbols/svg-400/outlined/settings.svg?raw'
import tableRows from '@material-symbols/svg-400/outlined/table_rows.svg?raw'
import touchApp from '@material-symbols/svg-400/outlined/touch_app.svg?raw'
import toys from '@material-symbols/svg-400/outlined/toys.svg?raw'
import tune from '@material-symbols/svg-400/outlined/tune.svg?raw'
import warning from '@material-symbols/svg-400/outlined/warning.svg?raw'

const ICONS = {
  add,
  analytics,
  arrow_downward: arrowDownward,
  arrow_upward: arrowUpward,
  chair,
  check,
  chevron_left: chevronLeft,
  chevron_right: chevronRight,
  close,
  dark_mode: darkMode,
  dashboard,
  delete: deleteIcon,
  download,
  draw,
  eco,
  edit,
  filter_list: filterList,
  inventory_2: inventory,
  language,
  layers,
  light,
  light_mode: lightMode,
  location_on: locationOn,
  map,
  more_vert: moreVert,
  my_location: myLocation,
  park,
  refresh,
  remove,
  save,
  search,
  settings,
  table_rows: tableRows,
  touch_app: touchApp,
  toys,
  tune,
  warning,
}

/**
 * Ham SVG'yi renk ve boyut alabilir hale getirir.
 *
 * Material Symbols SVG'lerinde fill niteliği yok → varsayılan siyah olur.
 * currentColor ekleyerek CSS'teki metin rengini almasını sağlıyoruz;
 * width/height'i kaldırıp em'e çevirerek font boyutuyla ölçeklenmesini.
 */
function prepare(rawSvg) {
  return rawSvg
    .replace(/width="\d+"/, 'width="1em"')
    .replace(/height="\d+"/, 'height="1em"')
    .replace('<svg ', '<svg fill="currentColor" aria-hidden="true" focusable="false" ')
}

const CACHE = {}

/**
 * Ham SVG metnini verir — haritada kullanmak için.
 *
 * MapLibre ikonları React bileşeni olarak alamaz; piksel verisi ister.
 * Bu yüzden SVG'yi dışarı açıyoruz, MapView onu tuvale çizip haritaya ekliyor.
 */
export function ikonSvgAl(name, { boyut = 24, renk = '#ffffff' } = {}) {
  const raw = ICONS[name]
  if (!raw) return null
  return raw
    .replace(/width="\d+"/, `width="${boyut}"`)
    .replace(/height="\d+"/, `height="${boyut}"`)
    .replace('<svg ', `<svg fill="${renk}" `)
}

export default function Icon({ name, className = '', filled = false, ...rest }) {
  const raw = ICONS[name]

  if (!raw) {
    // Sessizce kaybolmasın — geliştirirken hatayı hemen görelim
    if (import.meta.env.DEV) {
      console.warn(`Icon: "${name}" tanımlı değil. src/components/ui/Icon.jsx'e ekle.`)
    }
    return null
  }

  if (!CACHE[name]) CACHE[name] = prepare(raw)

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center leading-none ${className}`}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
      dangerouslySetInnerHTML={{ __html: CACHE[name] }}
      {...rest}
    />
  )
}
