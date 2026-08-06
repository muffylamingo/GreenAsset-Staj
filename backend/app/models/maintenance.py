"""maintenance_logs tablosu — bir varlığın bakım geçmişi.

Bu tablo projeye ilişkisel derinlik katıyor: assets ile 1-N ilişki.
Bir varlığın birden çok bakım kaydı olabilir; kayıt silinince varlık silinmez,
ama varlık silinince kayıtları da gider (ON DELETE CASCADE).

Neden ayrı tablo? assets'e "son_bakim_tarihi" diye tek kolon koysaydık
geçmişi kaybederdik — kim, ne zaman, ne yaptı bilgisi kalmazdı.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String, Text, func, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.asset import AssetStatus


class MaintenanceLog(Base):
    __tablename__ = "maintenance_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )

    asset_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("assets.id", ondelete="CASCADE"),
        nullable=False,
    )

    note: Mapped[str] = mapped_column(Text, nullable=False)

    performed_by: Mapped[str] = mapped_column(String(120), nullable=False)

    performed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Bakım sonrası varlığın durumu. Boş bırakılabilir: her bakım kaydı
    # durumu değiştirmek zorunda değil (ör. "kontrol edildi, sorun yok").
    status_after: Mapped[AssetStatus | None] = mapped_column(
        Enum(AssetStatus, name="asset_status", create_type=False),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    asset = relationship("Asset", back_populates="maintenance_logs")

    __table_args__ = (
        # Bir varlığın kayıtlarını tarihe göre çekmek en sık yapılan sorgu
        Index("ix_maintenance_asset_performed", "asset_id", "performed_at"),
    )

    def __repr__(self) -> str:
        return f"<MaintenanceLog {self.asset_id} @ {self.performed_at:%Y-%m-%d}>"
