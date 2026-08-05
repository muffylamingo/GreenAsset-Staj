"""Pydantic şemaları — API'nin giriş/çıkış sözleşmesi.

Model (SQLAlchemy) ile şema (Pydantic) neden ayrı?
  Model  → veritabanında NASIL saklandığı  (geometry kolonu)
  Şema   → dışarıya NASIL göründüğü        (latitude / longitude alanları)

Bu ayrım sayesinde veritabanı yapısını değiştirsek bile API sözleşmesi bozulmaz.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.asset import AssetStatus, AssetType


# ---------------------------------------------------------------------------
# Giriş şemaları
# ---------------------------------------------------------------------------
class AssetBase(BaseModel):
    """Ekleme ve güncellemede ortak alanlar."""

    name: str = Field(
        min_length=1,
        max_length=120,
        description="Varlık adı. Boş olamaz.",
        examples=["Çınar #0042"],
    )
    type: AssetType = Field(description="Varlık tipi")
    status: AssetStatus = Field(
        default=AssetStatus.GOOD, description="Bakım durumu"
    )
    notes: str | None = Field(
        default=None, max_length=1000, description="Serbest not"
    )

    @field_validator("name")
    @classmethod
    def name_bos_olamaz(cls, value: str) -> str:
        """Sadece boşluktan oluşan isimleri de reddet.

        min_length=1 tek başına "   " girdisini geçirir — bu yüzden gerekli.
        """
        temizlenmis = value.strip()
        if not temizlenmis:
            raise ValueError("İsim boş olamaz")
        return temizlenmis


class AssetCreate(AssetBase):
    """POST /assets gövdesi.

    Koordinatı geometri olarak değil, iki ayrı sayı olarak alıyoruz —
    formdan gelen veriyle birebir uyuşsun diye.
    """

    latitude: float = Field(
        ge=-90, le=90, description="Enlem (WGS84)", examples=[41.1050]
    )
    longitude: float = Field(
        ge=-180, le=180, description="Boylam (WGS84)", examples=[29.0270]
    )


class AssetUpdate(BaseModel):
    """PUT /assets/{id} gövdesi — tüm alanlar isteğe bağlı (kısmi güncelleme)."""

    name: str | None = Field(default=None, min_length=1, max_length=120)
    type: AssetType | None = None
    status: AssetStatus | None = None
    notes: str | None = Field(default=None, max_length=1000)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)

    @field_validator("name")
    @classmethod
    def name_bos_olamaz(cls, value: str | None) -> str | None:
        if value is None:
            return None
        temizlenmis = value.strip()
        if not temizlenmis:
            raise ValueError("İsim boş olamaz")
        return temizlenmis


# ---------------------------------------------------------------------------
# Çıkış şemaları — düz JSON
# ---------------------------------------------------------------------------
class AssetOut(BaseModel):
    """Tek bir varlığın düz (tablo dostu) gösterimi."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    type: AssetType
    status: AssetStatus
    latitude: float
    longitude: float
    district_id: int | None = None
    district_name: str | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Çıkış şemaları — GeoJSON (RFC 7946)
# ---------------------------------------------------------------------------
class PointGeometry(BaseModel):
    """GeoJSON nokta geometrisi.

    ⚠️ coordinates sırası [boylam, enlem] — yani [longitude, latitude].
    Google Maps'te alıştığımız sıranın TERSİ. Standart böyle diyor.
    """

    type: Literal["Point"] = "Point"
    coordinates: tuple[float, float] = Field(
        description="[longitude, latitude]", examples=[(29.0270, 41.1050)]
    )


class AssetFeature(BaseModel):
    """GeoJSON Feature — geometri + öznitelikler."""

    type: Literal["Feature"] = "Feature"
    id: uuid.UUID
    geometry: PointGeometry
    properties: dict[str, Any]


class AssetFeatureCollection(BaseModel):
    """GeoJSON FeatureCollection — haritanın doğrudan tüketebildiği format.

    `totalCount` alanı RFC 7946'nın izin verdiği "foreign member";
    sayfalama yaparken toplam kaç kayıt olduğunu bilmek için ekliyoruz.
    """

    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: list[AssetFeature]
    totalCount: int = Field(  # noqa: N815 — GeoJSON tarafında camelCase yaygın
        description="Filtreye uyan toplam kayıt sayısı (sayfalamadan bağımsız)"
    )
