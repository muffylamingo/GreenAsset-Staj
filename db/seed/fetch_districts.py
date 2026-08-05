"""İstanbul ilçe sınırlarını OpenStreetMap'ten indirir.

Veriyi elle indirip repoya atmak yerine bu script'i kullanıyoruz:
kaynak belgeli, sonuç tekrar üretilebilir.

Kaynak:  OpenStreetMap  (lisans: ODbL — https://www.openstreetmap.org/copyright)
Yöntem:
  1) Overpass API   → İstanbul içindeki admin_level=6 (ilçe) ilişkilerinin id'leri
  2) Nominatim lookup → o id'lerin sınır poligonları (GeoJSON)

Çalıştırma:
    python db/seed/fetch_districts.py

Çıktı:
    db/seed/istanbul_districts.geojson
"""

from __future__ import annotations

import json
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

# Ana sunucu sık sık meşgul olur (504) — yedekleri sırayla deneriz
OVERPASS_MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]
NOMINATIM_URL = "https://nominatim.openstreetmap.org/lookup"

# Nominatim kullanım politikası gereği kendimizi tanıtmak ZORUNLU
USER_AGENT = "GreenAsset-Staj/0.1 (https://github.com/muffylamingo/GreenAsset-Staj)"

OUT_PATH = Path(__file__).parent / "istanbul_districts.geojson"

# Overpass'ın alan sorgusu sınır komşusu ilçeleri de yakalayabiliyor.
# "Saray" Tekirdağ'ın ilçesi — İstanbul'un 39 ilçesine dahil değil.
EXCLUDED_NAMES = {"Saray"}

# 3600223474 = OSM'de İstanbul ilinin alan kimliği (relation 223474 + 3600000000).
# İsimle arama yapmak yerine doğrudan id kullanmak sorguyu çok hızlandırır.
OVERPASS_QUERY = """
[out:json][timeout:120];
area(3600223474)->.ist;
relation(area.ist)["admin_level"="6"]["boundary"="administrative"];
out tags;
"""


def _get(url: str, data: bytes | None = None) -> dict:
    req = urllib.request.Request(url, data=data, headers={"User-Agent": USER_AGENT})
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(req, timeout=180, context=ctx) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_relation_ids() -> list[tuple[int, str]]:
    """Overpass'tan ilçe ilişki id'lerini ve adlarını çeker.

    Sunucular sık sık aşırı yüklenir; yedekleri sırayla deneriz.
    """
    payload = urllib.parse.urlencode({"data": OVERPASS_QUERY}).encode("utf-8")

    result = None
    last_error: Exception | None = None
    for mirror in OVERPASS_MIRRORS:
        host = urllib.parse.urlparse(mirror).netloc
        print(f"→ Overpass: {host} deneniyor...")
        try:
            result = _get(mirror, data=payload)
            break
        except Exception as exc:  # noqa: BLE001 — sıradaki sunucuyu denemek istiyoruz
            print(f"  başarısız ({exc.__class__.__name__}), sıradaki sunucuya geçiliyor")
            last_error = exc
            time.sleep(2)

    if result is None:
        raise RuntimeError(f"Tüm Overpass sunucuları başarısız: {last_error}")

    districts: list[tuple[int, str]] = []
    for element in result.get("elements", []):
        name = element.get("tags", {}).get("name")
        if name and name not in EXCLUDED_NAMES:
            districts.append((element["id"], name))

    districts.sort(key=lambda x: x[1])
    print(f"  {len(districts)} ilçe bulundu.")
    return districts


def fetch_polygons(relations: list[tuple[int, str]]) -> list[dict]:
    """Nominatim'den sınır poligonlarını çeker (tek istekte en fazla 50 id)."""
    features: list[dict] = []

    for start in range(0, len(relations), 50):
        batch = relations[start : start + 50]
        osm_ids = ",".join(f"R{rel_id}" for rel_id, _ in batch)
        name_by_id = {rel_id: name for rel_id, name in batch}

        params = urllib.parse.urlencode(
            {"osm_ids": osm_ids, "format": "json", "polygon_geojson": "1"}
        )
        print(f"→ Nominatim: {len(batch)} ilçenin sınırları indiriliyor...")
        result = _get(f"{NOMINATIM_URL}?{params}")

        for item in result:
            geometry = item.get("geojson")
            if not geometry:
                continue
            # Tek parça ilçeleri de MultiPolygon'a çeviriyoruz —
            # veritabanı kolonu MULTIPOLYGON olarak tanımlı.
            if geometry["type"] == "Polygon":
                geometry = {
                    "type": "MultiPolygon",
                    "coordinates": [geometry["coordinates"]],
                }
            if geometry["type"] != "MultiPolygon":
                continue

            osm_id = int(item["osm_id"])
            features.append(
                {
                    "type": "Feature",
                    "geometry": geometry,
                    "properties": {
                        "name": name_by_id.get(osm_id, item.get("display_name", "")),
                        "osm_id": osm_id,
                    },
                }
            )

        # Nominatim politikası: saniyede en fazla 1 istek
        time.sleep(1.5)

    return features


def main() -> int:
    try:
        relations = fetch_relation_ids()
        if not relations:
            print("HATA: Overpass hiç ilçe döndürmedi.", file=sys.stderr)
            return 1

        features = fetch_polygons(relations)
        if not features:
            print("HATA: Hiç poligon indirilemedi.", file=sys.stderr)
            return 1

        collection = {
            "type": "FeatureCollection",
            "attribution": "© OpenStreetMap katkıda bulunanları (ODbL)",
            "features": sorted(features, key=lambda f: f["properties"]["name"]),
        }
        OUT_PATH.write_text(
            json.dumps(collection, ensure_ascii=False), encoding="utf-8"
        )

        size_mb = OUT_PATH.stat().st_size / 1_048_576
        print(f"\n✅ {len(features)} ilçe yazıldı → {OUT_PATH} ({size_mb:.1f} MB)")
        return 0

    except (urllib.error.URLError, RuntimeError) as exc:
        print(f"HATA: İnternet/servis erişimi başarısız — {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
