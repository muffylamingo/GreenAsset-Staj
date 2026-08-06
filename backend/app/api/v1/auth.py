"""Kimlik doğrulama uçları.

  POST /auth/login  kullanıcı adı + parola → JWT
  GET  /auth/me     token sahibinin bilgileri
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import CurrentUser
from app.core.security import parola_dogrula, token_uret
from app.models.user import User
from app.schemas.user import Token, UserOut

router = APIRouter(prefix="/auth", tags=["Kimlik Doğrulama"])

DbSession = Annotated[Session, Depends(get_db)]


@router.post(
    "/login",
    response_model=Token,
    summary="Giriş yap",
    description=(
        "Kullanıcı adı ve parola ile giriş yapar, JWT döner.\n\n"
        "**Swagger'da denemek için:** sağ üstteki 🔓 **Authorize** düğmesine bas, "
        "kullanıcı adı ve parolayı gir. Sonrasında korumalı uçları buradan "
        "deneyebilirsin.\n\n"
        "Demo hesapları:\n"
        "- `admin` / `admin123` — yönetici (silebilir)\n"
        "- `saha` / `saha123` — saha ekibi (silemez)"
    ),
)
def login(form: Annotated[OAuth2PasswordRequestForm, Depends()], db: DbSession) -> Token:
    kullanici = db.scalar(select(User).where(User.username == form.username))

    # DİKKAT: "kullanıcı yok" ile "parola yanlış" AYNI mesajı döner.
    # Farklı mesaj verseydik saldırgan hangi kullanıcı adlarının var olduğunu
    # tek tek deneyerek öğrenebilirdi (kullanıcı sayımı / user enumeration).
    if kullanici is None or not parola_dogrula(form.password, kullanici.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kullanıcı adı veya parola hatalı",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not kullanici.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Hesap pasif durumda"
        )

    return Token(
        access_token=token_uret(kullanici.id, kullanici.username, kullanici.role.value),
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserOut.model_validate(kullanici),
    )


@router.get(
    "/me",
    response_model=UserOut,
    summary="Oturumdaki kullanıcı",
    description=(
        "Token'ın hâlâ geçerli olup olmadığını kontrol etmek için de kullanılır. "
        "Frontend sayfa yenilendiğinde bunu çağırıp oturumu doğruluyor."
    ),
)
def me(kullanici: CurrentUser) -> UserOut:
    return UserOut.model_validate(kullanici)
