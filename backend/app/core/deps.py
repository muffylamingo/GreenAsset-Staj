"""FastAPI bağımlılıkları (dependencies) — kimlik ve yetki kontrolü.

Bir ucun korunması için tek satır yeterli:

    @router.delete("/{id}", dependencies=[Depends(require_admin)])

Bu sayede yetki kontrolü iş mantığının içine karışmıyor; hangi ucun kime
açık olduğu route tanımına bakınca görülüyor.
"""

from __future__ import annotations

import uuid
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import token_coz
from app.models.user import User, UserRole

# tokenUrl: Swagger'daki "Authorize" düğmesinin hangi uca istek atacağı.
# Sadece dokümantasyon içindir, doğrulamayı biz yapıyoruz.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

YETKISIZ = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Geçersiz veya süresi dolmuş oturum",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    """Token'dan kullanıcıyı çözer.

    Neden token'daki bilgiyle yetinmiyoruz da veritabanına bakıyoruz?
    Çünkü token 12 saat geçerli; o sürede kullanıcı pasifleştirilmiş veya
    rolü değiştirilmiş olabilir. Token'daki rol eski kalabilir, veritabanı
    her zaman günceldir.
    """
    try:
        icerik = token_coz(token)
        kullanici_id = uuid.UUID(icerik["sub"])
    except (jwt.PyJWTError, KeyError, ValueError) as exc:
        raise YETKISIZ from exc

    kullanici = db.get(User, kullanici_id)
    if kullanici is None or not kullanici.is_active:
        raise YETKISIZ

    return kullanici


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_admin(kullanici: CurrentUser) -> User:
    """Sadece yöneticilere açık uçlar için.

    403 döner, 401 değil: kullanıcı KİM olduğunu kanıtladı ama bu işleme
    yetkisi yok. 401 "kimsin?" demek, 403 "seni tanıyorum ama olmaz" demek.
    """
    if kullanici.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu işlem için yönetici yetkisi gerekiyor",
        )
    return kullanici


AdminUser = Annotated[User, Depends(require_admin)]
