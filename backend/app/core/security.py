"""Parola özetleme ve JWT işlemleri.

İki ayrı konu var, karıştırılmasın:

  1) PAROLA ÖZETİ (bcrypt) — kullanıcının parolasını veritabanında düz metin
     saklamıyoruz. bcrypt tek yönlüdür: özetten parolaya dönülemez.
     Her özet farklı bir "tuz" (salt) içerir, aynı parola iki kullanıcıda
     farklı özet üretir — böylece hazır özet tabloları (rainbow table) işe yaramaz.

  2) JWT (JSON Web Token) — giriş yapıldıktan sonra verilen "bilet".
     İçinde kullanıcı kimliği ve rolü yazar, sunucunun gizli anahtarıyla
     imzalanır. İstemci her istekte bu bileti gönderir; sunucu imzayı
     doğrular ve kimin konuştuğunu bilir. Sunucuda oturum saklamaya gerek yok.

⚠️ JWT'nin içeriği ŞİFRELİ DEĞİL, sadece İMZALI. Herkes içindekini okuyabilir
(base64 çözmek yeterli); kimse DEĞİŞTİREMEZ. Bu yüzden token'a gizli bilgi
konmaz — kullanıcı adı ve rol yazmakta sakınca yok.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

import bcrypt
import jwt

from app.core.config import settings


# ---------------------------------------------------------------------------
# Parola
# ---------------------------------------------------------------------------
def parola_ozetle(parola: str) -> str:
    """Düz parolayı bcrypt özetine çevirir."""
    return bcrypt.hashpw(parola.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def parola_dogrula(parola: str, ozet: str) -> bool:
    """Girilen parola, saklanan özete uyuyor mu?"""
    try:
        return bcrypt.checkpw(parola.encode("utf-8"), ozet.encode("utf-8"))
    except ValueError:
        # Bozuk/eski formatlı özet — doğrulama başarısız sayılır
        return False


# ---------------------------------------------------------------------------
# JWT
# ---------------------------------------------------------------------------
def token_uret(kullanici_id: uuid.UUID, kullanici_adi: str, rol: str) -> str:
    """Giriş başarılı olduğunda verilen erişim biletini üretir."""
    simdi = datetime.now(UTC)
    icerik = {
        "sub": str(kullanici_id),  # standart alan: token kime ait
        "username": kullanici_adi,
        "role": rol,
        "iat": simdi,  # ne zaman üretildi
        "exp": simdi + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(icerik, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def token_coz(token: str) -> dict:
    """Token'ı doğrular ve içeriğini döner.

    İmza geçersizse veya süresi dolmuşsa jwt.PyJWTError fırlatır —
    çağıran taraf bunu 401'e çevirir.
    """
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
