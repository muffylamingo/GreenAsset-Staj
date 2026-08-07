"""Denetim kaydı uçları.

  GET /audit                 son işlemler (yalnızca yönetici)
  GET /audit/asset/{id}      belirli bir varlığın geçmişi

Neden yalnızca yönetici?
    Denetim kaydı "kim ne zaman neredeydi" bilgisidir; saha ekibinin
    birbirini izlemesi için değil, sorumluluk takibi içindir. Ayrıca IP
    adresleri kişisel veridir (KVKK) — erişimi dar tutmak gerekir.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_admin
from app.models.audit import AuditAction, AuditLog

router = APIRouter(
    prefix="/audit",
    tags=["Denetim"],
    dependencies=[Depends(require_admin)],
)

DbSession = Annotated[Session, Depends(get_db)]


class AuditOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    at: datetime
    username: str
    action: AuditAction
    entity_type: str
    entity_id: str | None
    summary: str | None
    ip: str | None


@router.get(
    "",
    response_model=list[AuditOut],
    summary="Son işlemler",
    description=(
        "Kim, ne zaman, neyi değiştirdi. En yeni kayıt başta gelir.\n\n"
        "Silinen varlıkların kaydı da burada durur — denetim izi, izlediği "
        "kaydın ömründen bağımsızdır."
    ),
)
def list_audit(
    db: DbSession,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    action: AuditAction | None = None,
    username: str | None = None,
) -> list[AuditOut]:
    stmt = select(AuditLog).order_by(AuditLog.at.desc())
    if action is not None:
        stmt = stmt.where(AuditLog.action == action)
    if username:
        stmt = stmt.where(AuditLog.username == username)
    kayitlar = db.scalars(stmt.offset(offset).limit(limit)).all()
    return [AuditOut.model_validate(k) for k in kayitlar]


@router.get(
    "/asset/{asset_id}",
    response_model=list[AuditOut],
    summary="Bir varlığın geçmişi",
    description="Varlık silinmiş olsa bile geçmişi görüntülenebilir.",
)
def asset_history(asset_id: uuid.UUID, db: DbSession) -> list[AuditOut]:
    kayitlar = db.scalars(
        select(AuditLog)
        .where(AuditLog.entity_type == "asset", AuditLog.entity_id == str(asset_id))
        .order_by(AuditLog.at.desc())
    ).all()
    return [AuditOut.model_validate(k) for k in kayitlar]
