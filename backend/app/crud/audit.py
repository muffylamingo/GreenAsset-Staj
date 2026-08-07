"""Denetim kaydı yazma.

Kullanım kuralı: burada `commit` YOK. Kayıt, kendisini doğuran işlemin
işlemine (transaction) katılır. Böylece varlık silme başarısız olursa
"silindi" diyen bir denetim kaydı ortada kalmaz — ikisi ya birlikte olur
ya hiç olmaz.
"""

from __future__ import annotations

import uuid

from fastapi import Request
from sqlalchemy.orm import Session

from app.core.limiter import istemci_adresi
from app.models.audit import AuditAction, AuditLog
from app.models.user import User


def denetim_yaz(
    db: Session,
    *,
    kullanici: User,
    action: AuditAction,
    entity_type: str,
    entity_id: uuid.UUID | str | None = None,
    summary: str | None = None,
    request: Request | None = None,
) -> AuditLog:
    kayit = AuditLog(
        user_id=kullanici.id,
        # Kullanıcı adı METİN olarak kopyalanıyor: hesap sonradan silinse
        # veya adı değişse bile denetim kaydı o günkü gerçeği göstersin.
        username=kullanici.username,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        summary=summary,
        ip=istemci_adresi(request) if request is not None else None,
    )
    db.add(kayit)
    return kayit
