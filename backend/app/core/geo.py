"""Geometri yardımcıları.

lat/lon sırasının karışması bu tür projelerdeki 1 numaralı hata kaynağıdır.
Bu yüzden koordinat dönüşümleri TEK BİR YERDE toplanıyor: burada.
Kodun başka hiçbir yerinde elle "POINT(...)" string'i kurulmayacak.

Hatırlatma:
    WKT / GeoJSON  →  (longitude, latitude)   yani (boylam, enlem)
    Günlük konuşma →  (latitude, longitude)   yani (enlem, boylam)
"""

from __future__ import annotations

from geoalchemy2.shape import to_shape


def point_ewkt(latitude: float, longitude: float) -> str:
    """Enlem/boylamdan PostGIS'in anladığı EWKT metnini üretir.

    EWKT = WKT + SRID öneki. SRID'yi yazmazsak PostGIS geometrinin hangi
    koordinat sisteminde olduğunu bilemez.

    >>> point_ewkt(41.1050, 29.0270)
    'SRID=4326;POINT(29.027 41.105)'
    """
    return f"SRID=4326;POINT({longitude} {latitude})"


def to_lat_lon(geometry) -> tuple[float, float]:
    """PostGIS geometrisinden (enlem, boylam) ikilisini çıkarır.

    to_shape → geoalchemy2 geometrisini shapely nesnesine çevirir.
    shapely'de x = boylam, y = enlem'dir.
    """
    point = to_shape(geometry)
    return point.y, point.x


def to_lon_lat(geometry) -> tuple[float, float]:
    """GeoJSON için (boylam, enlem) ikilisi — coordinates alanının beklediği sıra."""
    point = to_shape(geometry)
    return point.x, point.y
