"""Veritabanı modelini API çıktısına çeviren yardımcılar.

Bu dönüşümü router içinde tekrar tekrar yazmak yerine tek yerde topluyoruz.
"""

from __future__ import annotations

from app.core.geo import to_lat_lon, to_lon_lat
from app.models.asset import Asset
from app.schemas.asset import AssetFeature, AssetOut, PointGeometry


def asset_to_out(asset: Asset) -> AssetOut:
    """Düz JSON gösterimi — tablo için."""
    latitude, longitude = to_lat_lon(asset.geometry)
    return AssetOut(
        id=asset.id,
        name=asset.name,
        type=asset.type,
        status=asset.status,
        latitude=latitude,
        longitude=longitude,
        district_id=asset.district_id,
        district_name=asset.district.name if asset.district else None,
        notes=asset.notes,
        created_at=asset.created_at,
        updated_at=asset.updated_at,
    )


def asset_to_feature(asset: Asset) -> AssetFeature:
    """GeoJSON Feature gösterimi — harita için.

    properties içine sadece haritada lazım olan alanları koyuyoruz:
    1500 varlık × gereksiz alan = boşuna büyüyen yanıt.
    """
    longitude, latitude = to_lon_lat(asset.geometry)
    return AssetFeature(
        id=asset.id,
        geometry=PointGeometry(coordinates=(longitude, latitude)),
        properties={
            "id": str(asset.id),
            "name": asset.name,
            "type": asset.type.value,
            "status": asset.status.value,
            "district_id": asset.district_id,
            "district_name": asset.district.name if asset.district else None,
            "created_at": asset.created_at.isoformat(),
        },
    )
