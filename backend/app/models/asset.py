"""assets tablosunun SQLAlchemy tanımı.

Ödevdeki veri modeli:
  id (UUID), name (string), type (Ağaç/Bank/Direk),
  status (İyi/Bakım Lazım), geometry (Point - PostGIS), created_at (timestamp)
"""

import enum
import uuid
from datetime import datetime

from geoalchemy2 import Geometry
from sqlalchemy import DateTime, Enum, Index, String, func, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AssetType(str, enum.Enum):
    """Varlık tipi. Değerler veritabanında saklanır, etiketler frontend'de çevrilir."""

    TREE = "TREE"  # Ağaç
    BENCH = "BENCH"  # Bank / park mobilyası
    POLE = "POLE"  # Aydınlatma direği


class AssetStatus(str, enum.Enum):
    """Varlığın bakım durumu."""

    GOOD = "GOOD"  # İyi
    NEEDS_MAINTENANCE = "NEEDS_MAINTENANCE"  # Bakım Lazım
    BROKEN = "BROKEN"  # Arızalı


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),  # pgcrypto eklentisinden gelir
    )

    name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)

    type: Mapped[AssetType] = mapped_column(
        Enum(AssetType, name="asset_type", values_callable=lambda e: [i.value for i in e]),
        nullable=False,
        index=True,
    )

    status: Mapped[AssetStatus] = mapped_column(
        Enum(AssetStatus, name="asset_status", values_callable=lambda e: [i.value for i in e]),
        nullable=False,
        default=AssetStatus.GOOD,
        index=True,
    )

    # PostGIS nokta geometrisi.
    #   POINT  → tek bir konum
    #   4326   → WGS84 (GPS'in kullandığı koordinat sistemi, birimi derece)
    #   spatial_index=False → index'i aşağıda ELLE tanımlıyoruz ki Alembic
    #                          her migration'da "index'i sil/ekle" saçmalığı yapmasın
    geometry: Mapped[str] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326, spatial_index=False),
        nullable=False,
    )

    notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # GIST index: mekansal sorguların (ST_Within, ST_DWithin) hızlı çalışmasının sırrı.
    # Bu olmadan 100 bin kayıtta sorgular saniyelerce sürer.
    __table_args__ = (
        Index("idx_assets_geometry", "geometry", postgresql_using="gist"),
    )

    def __repr__(self) -> str:  # log ve debug kolaylığı
        return f"<Asset {self.name} ({self.type.value}/{self.status.value})>"
