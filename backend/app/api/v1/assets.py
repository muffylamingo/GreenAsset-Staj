"""Varlık uçları (endpoints) — ödevin 2. aşaması.

  POST   /assets              yeni varlık ekle
  GET    /assets              listele (GeoJSON veya düz JSON) + filtreler
  GET    /assets/{id}         tek kayıt
  PUT    /assets/{id}         güncelle
  DELETE /assets/{id}         sil
  PATCH  /assets/bulk/status  toplu durum değiştir
  POST   /assets/bulk/delete  toplu sil
"""

from __future__ import annotations

import uuid
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.converters import asset_to_feature, asset_to_out
from app.core.database import get_db
from app.core.deps import CurrentUser, require_admin
from app.crud import asset as crud
from app.crud.audit import denetim_yaz
from app.models.asset import AssetStatus, AssetType
from app.models.audit import AuditAction
from app.schemas.asset import (
    AssetCreate,
    AssetFeatureCollection,
    AssetOut,
    AssetUpdate,
)

router = APIRouter(prefix="/assets", tags=["Varlıklar"])

DbSession = Annotated[Session, Depends(get_db)]


def _parse_bbox(bbox: str | None) -> tuple[float, float, float, float] | None:
    """'minLon,minLat,maxLon,maxLat' metnini dört sayıya çevirir."""
    if not bbox:
        return None
    parcalar = bbox.split(",")
    if len(parcalar) != 4:
        raise HTTPException(
            status_code=422,
            detail="bbox formatı: minLon,minLat,maxLon,maxLat (4 sayı)",
        )
    try:
        min_lon, min_lat, max_lon, max_lat = (float(p) for p in parcalar)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="bbox değerleri sayı olmalı") from exc

    if min_lon > max_lon or min_lat > max_lat:
        raise HTTPException(
            status_code=422, detail="bbox'ta minimum değerler maksimumdan büyük olamaz"
        )
    return min_lon, min_lat, max_lon, max_lat


# ---------------------------------------------------------------------------
# Oluşturma
# ---------------------------------------------------------------------------
@router.post(
    "",
    response_model=AssetOut,
    status_code=status.HTTP_201_CREATED,
    summary="Yeni varlık ekle",
    description=(
        "Koordinatı enlem/boylam olarak alır, PostGIS noktasına çevirir ve "
        "noktanın hangi ilçeye düştüğünü `ST_Within` ile otomatik belirler."
    ),
)
def create_asset(
    payload: AssetCreate, db: DbSession, kullanici: CurrentUser, request: Request
) -> AssetOut:
    asset = crud.create_asset(db, payload)
    denetim_yaz(
        db,
        kullanici=kullanici,
        action=AuditAction.CREATE,
        entity_type="asset",
        entity_id=asset.id,
        summary=asset.name,
        request=request,
    )
    db.commit()
    return asset_to_out(asset)


# ---------------------------------------------------------------------------
# Listeleme
# ---------------------------------------------------------------------------
@router.get(
    "",
    response_model=None,
    summary="Varlıkları listele (GeoJSON)",
    description=(
        "Varsayılan çıktı **GeoJSON FeatureCollection**'dır — MapLibre'nin "
        "doğrudan tüketebildiği format. Tablo için `format=json` kullan.\n\n"
        "Tüm filtreler birlikte kullanılabilir."
    ),
)
def list_assets(
    db: DbSession,
    response: Response,
    type: Annotated[
        list[AssetType] | None, Query(description="Tipe göre filtrele (birden çok olabilir)")
    ] = None,
    status_filter: Annotated[
        list[AssetStatus] | None,
        Query(alias="status", description="Duruma göre filtrele (birden çok olabilir)"),
    ] = None,
    district_id: Annotated[int | None, Query(description="İlçeye göre filtrele")] = None,
    q: Annotated[str | None, Query(description="İsim/not içinde ara (Türkçe uyumlu)")] = None,
    bbox: Annotated[
        str | None,
        Query(
            description="Harita görüş alanı: minLon,minLat,maxLon,maxLat",
            examples=["28.95,41.02,29.15,41.20"],
        ),
    ] = None,
    limit: Annotated[int, Query(ge=1, le=5000)] = 500,
    offset: Annotated[int, Query(ge=0)] = 0,
    sort_by: Annotated[
        Literal["name", "type", "status", "created_at", "updated_at"], Query()
    ] = "created_at",
    sort_dir: Annotated[Literal["asc", "desc"], Query()] = "desc",
    format: Annotated[  # noqa: A002 — API sözleşmesinde 'format' adı bekleniyor
        Literal["geojson", "json"], Query(description="Çıktı biçimi")
    ] = "geojson",
):
    filters = crud.AssetFilters(
        types=type,
        statuses=status_filter,
        district_id=district_id,
        q=q,
        bbox=_parse_bbox(bbox),
        limit=limit,
        offset=offset,
        sort_by=sort_by,
        sort_dir=sort_dir,
    )

    toplam = crud.count_assets(db, filters)
    kayitlar = crud.list_assets(db, filters)

    # Sayfalama yapan istemciler için standart başlık
    response.headers["X-Total-Count"] = str(toplam)

    if format == "json":
        return [asset_to_out(a) for a in kayitlar]

    return AssetFeatureCollection(
        features=[asset_to_feature(a) for a in kayitlar],
        totalCount=toplam,
    )


# ---------------------------------------------------------------------------
# Toplu işlemler
# (Dikkat: bu yollar /{asset_id}'den ÖNCE tanımlanmalı ki "bulk" kelimesi
#  UUID sanılmasın.)
# ---------------------------------------------------------------------------
class BulkStatusPayload(BaseModel):
    ids: list[uuid.UUID] = Field(min_length=1, description="Güncellenecek varlık id'leri")
    status: AssetStatus


class BulkIdsPayload(BaseModel):
    ids: list[uuid.UUID] = Field(min_length=1, description="Silinecek varlık id'leri")


class BulkResult(BaseModel):
    affected: int = Field(description="Etkilenen kayıt sayısı")


@router.patch("/bulk/status", response_model=BulkResult, summary="Toplu durum değiştir")
def bulk_status(
    payload: BulkStatusPayload, db: DbSession, kullanici: CurrentUser, request: Request
) -> BulkResult:
    sayi = crud.bulk_update_status(db, payload.ids, payload.status)
    denetim_yaz(
        db,
        kullanici=kullanici,
        action=AuditAction.BULK_UPDATE,
        entity_type="asset",
        summary=f"{sayi} varlık → {payload.status.value}",
        request=request,
    )
    db.commit()
    return BulkResult(affected=sayi)


@router.post(
    "/bulk/delete",
    response_model=BulkResult,
    summary="Toplu sil",
    description="⚠️ Yalnızca **yönetici**. Saha ekibi 403 alır.",
    dependencies=[Depends(require_admin)],
)
def bulk_delete(
    payload: BulkIdsPayload, db: DbSession, kullanici: CurrentUser, request: Request
) -> BulkResult:
    sayi = crud.bulk_delete(db, payload.ids)
    denetim_yaz(
        db,
        kullanici=kullanici,
        action=AuditAction.BULK_DELETE,
        entity_type="asset",
        summary=f"{sayi} varlık silindi",
        request=request,
    )
    db.commit()
    return BulkResult(affected=sayi)


# ---------------------------------------------------------------------------
# Tekil kayıt işlemleri
# ---------------------------------------------------------------------------
def _get_or_404(db: Session, asset_id: uuid.UUID):  # noqa: ANN202
    asset = crud.get_asset(db, asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail="Varlık bulunamadı")
    return asset


@router.get("/{asset_id}", response_model=AssetOut, summary="Tek varlık getir")
def get_asset(asset_id: uuid.UUID, db: DbSession) -> AssetOut:
    return asset_to_out(_get_or_404(db, asset_id))


@router.put(
    "/{asset_id}",
    response_model=AssetOut,
    summary="Varlık güncelle",
    description=(
        "Sadece gönderilen alanlar değişir. Koordinat değişirse ilçe bilgisi "
        "`ST_Within` ile yeniden hesaplanır."
    ),
)
def update_asset(
    asset_id: uuid.UUID,
    payload: AssetUpdate,
    db: DbSession,
    kullanici: CurrentUser,
    request: Request,
) -> AssetOut:
    asset = _get_or_404(db, asset_id)
    # Hangi alanların değiştiğini kaydediyoruz. Sadece "güncellendi" demek,
    # denetim kaydını okuyan kişiye hiçbir şey anlatmaz.
    degisenler = ", ".join(payload.model_dump(exclude_unset=True).keys()) or "—"
    guncel = crud.update_asset(db, asset, payload)
    denetim_yaz(
        db,
        kullanici=kullanici,
        action=AuditAction.UPDATE,
        entity_type="asset",
        entity_id=guncel.id,
        summary=f"{guncel.name} · değişen alanlar: {degisenler}",
        request=request,
    )
    db.commit()
    return asset_to_out(guncel)


@router.delete(
    "/{asset_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Varlık sil",
    description=(
        "⚠️ Yalnızca **yönetici**. Saha ekibi 403 alır.\n\n"
        "Silme geri alınamaz ve varlığın bakım geçmişi de birlikte gider "
        "(ON DELETE CASCADE) — bu yüzden yetkisi ayrılmıştır."
    ),
    dependencies=[Depends(require_admin)],
)
def delete_asset(
    asset_id: uuid.UUID, db: DbSession, kullanici: CurrentUser, request: Request
) -> None:
    asset = _get_or_404(db, asset_id)
    # Adı ŞİMDİ okuyoruz: silindikten sonra bu bilgi artık hiçbir yerde yok
    # ve denetim kaydında yalnız bir kimlik numarası kalırdı.
    ozet = f"{asset.name} ({asset.type.value})"
    crud.delete_asset(db, asset)
    denetim_yaz(
        db,
        kullanici=kullanici,
        action=AuditAction.DELETE,
        entity_type="asset",
        entity_id=asset_id,
        summary=ozet,
        request=request,
    )
    db.commit()
