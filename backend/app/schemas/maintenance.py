"""Bakım kaydı şemaları."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.asset import AssetStatus


class MaintenanceLogCreate(BaseModel):
    """POST /assets/{id}/logs gövdesi."""

    note: str = Field(
        min_length=1,
        max_length=2000,
        description="Yapılan işlem",
        examples=["Kırık ampul değiştirildi"],
    )
    performed_by: str = Field(
        min_length=1,
        max_length=120,
        description="İşlemi yapan kişi/ekip",
        examples=["Saha Ekibi 3"],
    )
    performed_at: datetime | None = Field(
        default=None,
        description="İşlem tarihi. Boş bırakılırsa şu an kabul edilir.",
    )
    status_after: AssetStatus | None = Field(
        default=None,
        description=(
            "Bakım sonrası varlığın durumu. Doldurulursa varlığın durumu da "
            "güncellenir. Boş bırakılırsa varlığın durumu değişmez."
        ),
    )

    @field_validator("note", "performed_by")
    @classmethod
    def bosluk_olamaz(cls, value: str) -> str:
        temiz = value.strip()
        if not temiz:
            raise ValueError("Bu alan boş olamaz")
        return temiz


class MaintenanceLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    asset_id: uuid.UUID
    note: str
    performed_by: str
    performed_at: datetime
    status_after: AssetStatus | None = None
    created_at: datetime
