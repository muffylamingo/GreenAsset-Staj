"""users tablosu — sisteme giriş yapan kişiler.

İki rol var:
  ADMIN → her şeyi yapabilir, silme dahil
  FIELD → saha ekibi; varlık ekler, günceller, bakım kaydı girer ama SİLEMEZ

Silme yetkisini ayırmanın sebebi: saha ekibi yanlışlıkla bir varlığı silerse
o kaydın geçmişi (bakım kayıtları dahil) tamamen kaybolur. Ekleme ve
güncelleme geri alınabilir, silme alınamaz.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, String, func, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"  # Yönetici
    FIELD = "FIELD"  # Saha ekibi


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )

    username: Mapped[str] = mapped_column(
        String(60), nullable=False, unique=True, index=True
    )

    full_name: Mapped[str] = mapped_column(String(120), nullable=False)

    # DİKKAT: parolanın kendisi ASLA saklanmaz, sadece bcrypt özeti.
    # Veritabanı sızsa bile parolalar geri döndürülemez.
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", values_callable=lambda e: [i.value for i in e]),
        nullable=False,
        default=UserRole.FIELD,
    )

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    def __repr__(self) -> str:
        return f"<User {self.username} ({self.role.value})>"
