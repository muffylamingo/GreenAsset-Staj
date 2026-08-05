"""İlçe şemaları.

İlçe sınırları büyük geometrilerdir (bir ilçe ~50 KB GeoJSON).
Bu yüzden iki ayrı çıktı şemamız var:
  DistrictOut         → sadece id + ad  (filtre açılır listesi için, hafif)
  DistrictFeature...  → geometriyle birlikte (haritada sınır çizmek için, ağır)
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class DistrictOut(BaseModel):
    """Hafif gösterim — geometri YOK."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    asset_count: int | None = Field(
        default=None, description="Bu ilçedeki varlık sayısı"
    )


class DistrictFeature(BaseModel):
    type: Literal["Feature"] = "Feature"
    id: int
    geometry: dict[str, Any]
    properties: dict[str, Any]


class DistrictFeatureCollection(BaseModel):
    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: list[DistrictFeature]
