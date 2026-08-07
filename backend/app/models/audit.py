"""audit_logs — kim, ne zaman, neyi değiştirdi?

Neden ayrı bir tablo?
    İlk akla gelen çözüm, assets tablosuna `created_by` / `updated_by`
    kolonları eklemektir. Ama bu, asıl korkulan soruyu cevaplamaz:

        "1475 varlık silindi — kim sildi?"

    Kayıt silindiğinde üzerindeki kolonlar da gider. Denetim izi, izlediği
    kaydın ömründen BAĞIMSIZ yaşamalıdır. Bu yüzden ayrı bir tablo.

Neden entity_id bir ForeignKey DEĞİL?
    FK koysaydık veritabanı "işaret ettiğin kayıt yok" diyerek ya kaydı
    silmemize izin vermez ya da CASCADE ile denetim izini de silerdi.
    İkisi de istediğimizin tam tersi. Bu yüzden entity_id sadece bir
    kimlik metni olarak tutuluyor.

Neden hem user_id hem username?
    user_id ilişkiyi kurar, username ise kullanıcı hesabı silinse bile
    "bunu Ayşe yapmıştı" bilgisini korur. Denetim kaydında geçmişin
    dondurulması esastır — sonradan değişen bir isim izi bozar.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AuditAction(str, enum.Enum):
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    BULK_UPDATE = "BULK_UPDATE"
    BULK_DELETE = "BULK_DELETE"


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)

    at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    # Kullanıcı silinirse ilişki kopar ama kayıt durur (SET NULL).
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    # Kullanıcı adının o anki hâli — sonradan değişse/silinse de iz bozulmaz.
    username: Mapped[str] = mapped_column(String(60), nullable=False)

    action: Mapped[AuditAction] = mapped_column(
        Enum(AuditAction, name="audit_action", values_callable=lambda e: [i.value for i in e]),
        nullable=False,
        index=True,
    )

    entity_type: Mapped[str] = mapped_column(String(40), nullable=False)
    # Bilerek FK değil (yukarıdaki açıklamaya bakın). Toplu işlemlerde NULL.
    entity_id: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # İnsan okunur özet: "Çınar #0006" veya "12 varlık silindi".
    # Kayıt silindikten sonra entity_id tek başına hiçbir şey ifade etmiyor;
    # bu alan olmadan denetim kaydı okunamaz hâle gelir.
    summary: Mapped[str | None] = mapped_column(String(255), nullable=True)

    ip: Mapped[str | None] = mapped_column(String(45), nullable=True)  # IPv6 sığsın

    __table_args__ = (
        # "Bu varlığa ne oldu?" sorgusu için
        Index("idx_audit_entity", "entity_type", "entity_id"),
        # "Bu kullanıcı ne yaptı?" sorgusu için
        Index("idx_audit_user_at", "user_id", "at"),
    )

    def __repr__(self) -> str:
        return f"<AuditLog {self.username} {self.action.value} {self.entity_type}>"
