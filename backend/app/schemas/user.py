"""Kullanıcı ve oturum şemaları."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.user import UserRole


class UserOut(BaseModel):
    """Giriş yapan kullanıcının bilgileri.

    DİKKAT: password_hash burada YOK. Şemayı dar tutmak, yanlışlıkla
    hassas alan sızdırmanın önündeki en güvenilir engel.
    """

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime


class Token(BaseModel):
    """POST /auth/login yanıtı."""

    access_token: str
    # OAuth2 standardı bu alanı bekliyor; istemci "Bearer <token>" diye gönderir
    token_type: str = "bearer"
    expires_in: int = Field(description="Token'ın geçerlilik süresi (saniye)")
    user: UserOut
