"""Varlık (asset) veritabanı işlemleri.

Katmanlı mimari kuralı: API katmanı SQL yazmaz, buradaki fonksiyonları çağırır.
Böylece aynı iş mantığı hem HTTP ucundan hem seed script'inden kullanılabilir.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from sqlalchemy import Select, func, or_, select, text
from sqlalchemy.orm import Session, joinedload

from app.core.geo import point_ewkt
from app.models.asset import Asset, AssetStatus, AssetType
from app.models.district import District
from app.schemas.asset import AssetCreate, AssetUpdate


@dataclass(slots=True)
class AssetFilters:
    """GET /assets sorgusunun tüm filtre seçenekleri."""

    types: list[AssetType] | None = None
    statuses: list[AssetStatus] | None = None
    district_id: int | None = None
    q: str | None = None
    # bbox = haritanın görünen alanı: (min_lon, min_lat, max_lon, max_lat)
    bbox: tuple[float, float, float, float] | None = None
    limit: int = 500
    offset: int = 0
    sort_by: str = "created_at"
    sort_dir: str = "desc"


SORTABLE_COLUMNS = {
    "name": Asset.name,
    "type": Asset.type,
    "status": Asset.status,
    "created_at": Asset.created_at,
    "updated_at": Asset.updated_at,
}


# ---------------------------------------------------------------------------
# İlçe çözümleme — projenin en "GIS" fonksiyonu
# ---------------------------------------------------------------------------
def resolve_district_id(db: Session, latitude: float, longitude: float) -> int | None:
    """Verilen koordinatın hangi ilçe sınırına düştüğünü bulur.

    Kullanıcı ilçeyi FORMDAN SEÇMEZ — nokta konulduğu anda PostGIS hesaplar.
    Nokta hiçbir ilçeye düşmezse (deniz, il dışı) None döner.

    ST_Within(A, B) = "A geometrisi tamamen B'nin içinde mi?"
    districts tablosundaki GIST index sayesinde bu sorgu milisaniyeler sürer.
    """
    return db.scalar(
        select(District.id)
        .where(
            func.ST_Within(
                func.ST_SetSRID(func.ST_MakePoint(longitude, latitude), 4326),
                District.geometry,
            )
        )
        .limit(1)
    )


# ---------------------------------------------------------------------------
# Okuma
# ---------------------------------------------------------------------------
def get_asset(db: Session, asset_id: uuid.UUID) -> Asset | None:
    return db.scalar(
        select(Asset).options(joinedload(Asset.district)).where(Asset.id == asset_id)
    )


def _apply_filters(stmt: Select, filters: AssetFilters) -> Select:
    """Filtreleri sorguya ekler. Sayma ve listeleme aynı filtreleri kullansın diye ayrı."""
    if filters.types:
        stmt = stmt.where(Asset.type.in_(filters.types))

    if filters.statuses:
        stmt = stmt.where(Asset.status.in_(filters.statuses))

    if filters.district_id is not None:
        stmt = stmt.where(Asset.district_id == filters.district_id)

    if filters.q:
        # unaccent: "cinar" yazınca "Çınar" da bulunsun (Türkçe arama)
        desen = f"%{filters.q.strip()}%"
        stmt = stmt.where(
            or_(
                func.unaccent(Asset.name).ilike(func.unaccent(desen)),
                func.unaccent(func.coalesce(Asset.notes, "")).ilike(
                    func.unaccent(desen)
                ),
            )
        )

    if filters.bbox:
        min_lon, min_lat, max_lon, max_lat = filters.bbox
        # ST_MakeEnvelope: dört köşeden dikdörtgen geometri üretir.
        # ST_Intersects + GIST index → haritayı kaydırdıkça hızlı sorgu.
        stmt = stmt.where(
            func.ST_Intersects(
                Asset.geometry,
                func.ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326),
            )
        )

    return stmt


def count_assets(db: Session, filters: AssetFilters) -> int:
    """Filtreye uyan toplam kayıt sayısı (sayfalamadan bağımsız)."""
    stmt = _apply_filters(select(func.count()).select_from(Asset), filters)
    return db.scalar(stmt) or 0


def list_assets(db: Session, filters: AssetFilters) -> list[Asset]:
    stmt = _apply_filters(select(Asset).options(joinedload(Asset.district)), filters)

    column = SORTABLE_COLUMNS.get(filters.sort_by, Asset.created_at)
    stmt = stmt.order_by(column.desc() if filters.sort_dir == "desc" else column.asc())

    stmt = stmt.limit(filters.limit).offset(filters.offset)
    return list(db.scalars(stmt).unique())


# ---------------------------------------------------------------------------
# Yazma
# ---------------------------------------------------------------------------
def create_asset(db: Session, data: AssetCreate) -> Asset:
    asset = Asset(
        name=data.name,
        type=data.type,
        status=data.status,
        notes=data.notes,
        geometry=point_ewkt(data.latitude, data.longitude),
        district_id=resolve_district_id(db, data.latitude, data.longitude),
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


def update_asset(db: Session, asset: Asset, data: AssetUpdate) -> Asset:
    """Kısmi güncelleme — sadece gönderilen alanlar değişir."""
    payload = data.model_dump(exclude_unset=True)

    # Koordinat değiştiyse geometriyi VE ilçeyi yeniden hesapla
    yeni_lat = payload.pop("latitude", None)
    yeni_lon = payload.pop("longitude", None)
    if yeni_lat is not None or yeni_lon is not None:
        mevcut_lat, mevcut_lon = _current_lat_lon(db, asset)
        lat = yeni_lat if yeni_lat is not None else mevcut_lat
        lon = yeni_lon if yeni_lon is not None else mevcut_lon
        asset.geometry = point_ewkt(lat, lon)
        asset.district_id = resolve_district_id(db, lat, lon)

    for alan, deger in payload.items():
        setattr(asset, alan, deger)

    db.commit()
    db.refresh(asset)
    return asset


def delete_asset(db: Session, asset: Asset) -> None:
    db.delete(asset)
    db.commit()


def _current_lat_lon(db: Session, asset: Asset) -> tuple[float, float]:
    """Kaydın mevcut koordinatını veritabanından okur.

    Kısmi güncellemede sadece enlem gönderildiyse boylamı korumak için gerekli.
    """
    row = db.execute(
        text("SELECT ST_Y(geometry) AS lat, ST_X(geometry) AS lon FROM assets WHERE id = :id"),
        {"id": asset.id},
    ).one()
    return row.lat, row.lon


# ---------------------------------------------------------------------------
# Toplu işlemler (tasarımdaki alt aksiyon çubuğu için)
# ---------------------------------------------------------------------------
def bulk_update_status(
    db: Session, asset_ids: list[uuid.UUID], status: AssetStatus
) -> int:
    """Seçili varlıkların durumunu topluca değiştirir. Etkilenen satır sayısını döner."""
    if not asset_ids:
        return 0
    result = db.execute(
        Asset.__table__.update()
        .where(Asset.id.in_(asset_ids))
        .values(status=status)
    )
    db.commit()
    return result.rowcount


def bulk_delete(db: Session, asset_ids: list[uuid.UUID]) -> int:
    if not asset_ids:
        return 0
    result = db.execute(Asset.__table__.delete().where(Asset.id.in_(asset_ids)))
    db.commit()
    return result.rowcount
