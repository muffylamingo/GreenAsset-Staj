"""Bakım geçmişi uçları.

  GET    /assets/{asset_id}/logs   varlığın bakım kayıtları (yeniden eskiye)
  POST   /assets/{asset_id}/logs   yeni kayıt ekle
  DELETE /maintenance/{log_id}     kayıt sil

Bir varlığın birden çok bakım kaydı olabilir (1-N ilişki). Varlık silinince
kayıtları da silinir; bunu veritabanı hallediyor (ON DELETE CASCADE).
"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_admin
from app.models.asset import Asset
from app.models.maintenance import MaintenanceLog
from app.schemas.maintenance import MaintenanceLogCreate, MaintenanceLogOut

router = APIRouter(tags=["Bakım Geçmişi"])

DbSession = Annotated[Session, Depends(get_db)]


def _varligi_bul(db: Session, asset_id: uuid.UUID) -> Asset:
    asset = db.get(Asset, asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail="Varlık bulunamadı")
    return asset


@router.get(
    "/assets/{asset_id}/logs",
    response_model=list[MaintenanceLogOut],
    summary="Varlığın bakım geçmişi",
    description="Kayıtlar yeniden eskiye sıralı döner.",
)
def list_logs(
    asset_id: uuid.UUID,
    db: DbSession,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> list[MaintenanceLogOut]:
    _varligi_bul(db, asset_id)

    kayitlar = db.scalars(
        select(MaintenanceLog)
        .where(MaintenanceLog.asset_id == asset_id)
        .order_by(MaintenanceLog.performed_at.desc())
        .limit(limit)
    ).all()

    return [MaintenanceLogOut.model_validate(k) for k in kayitlar]


@router.post(
    "/assets/{asset_id}/logs",
    response_model=MaintenanceLogOut,
    status_code=status.HTTP_201_CREATED,
    summary="Bakım kaydı ekle",
    description=(
        "`status_after` doldurulursa varlığın durumu da güncellenir — "
        "bakım yapıldıysa 'Bakım Lazım'dan 'İyi'ye çekmek tek işlemde olur.\n\n"
        "İkisi tek transaction içinde yapılıyor: kayıt eklenip durum "
        "güncellenemezse ikisi de geri alınır, veri tutarsız kalmaz."
    ),
)
def create_log(
    asset_id: uuid.UUID, payload: MaintenanceLogCreate, db: DbSession
) -> MaintenanceLogOut:
    asset = _varligi_bul(db, asset_id)

    kayit = MaintenanceLog(
        asset_id=asset_id,
        note=payload.note,
        performed_by=payload.performed_by,
        status_after=payload.status_after,
    )
    # performed_at boşsa veritabanının now() varsayılanı devreye girsin
    if payload.performed_at is not None:
        kayit.performed_at = payload.performed_at

    db.add(kayit)

    # Bakım sonrası durum verildiyse varlığı da güncelle
    if payload.status_after is not None:
        asset.status = payload.status_after

    db.commit()
    db.refresh(kayit)

    return MaintenanceLogOut.model_validate(kayit)


@router.delete(
    "/maintenance/{log_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Bakım kaydı sil",
    description=(
        "⚠️ Yalnızca **yönetici**.\n\n"
        "Kaydı siler. Varlığın durumunu GERİ ALMAZ — bakım gerçekten "
        "yapıldıysa durum doğru; kayıt yanlış girildiyse durumu elle düzeltmek "
        "kullanıcının kararı olmalı."
    ),
    dependencies=[Depends(require_admin)],
)
def delete_log(log_id: uuid.UUID, db: DbSession) -> None:
    kayit = db.get(MaintenanceLog, log_id)
    if kayit is None:
        raise HTTPException(status_code=404, detail="Bakım kaydı bulunamadı")
    db.delete(kayit)
    db.commit()
