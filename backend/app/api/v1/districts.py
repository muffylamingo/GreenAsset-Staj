"""İlçe uçları.

  GET /districts          filtre açılır listesi için hafif liste (+ varlık sayısı)
  GET /districts/geojson  haritada sınır çizmek için geometriler
"""

from __future__ import annotations

import json
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.asset import Asset
from app.models.district import District
from app.schemas.district import (
    DistrictFeature,
    DistrictFeatureCollection,
    DistrictOut,
)

router = APIRouter(prefix="/districts", tags=["İlçeler"])

DbSession = Annotated[Session, Depends(get_db)]


@router.get(
    "",
    response_model=list[DistrictOut],
    summary="İlçeleri listele",
    description="Geometri İÇERMEZ — filtre açılır listesi için hafif çıktı.",
)
def list_districts(db: DbSession) -> list[DistrictOut]:
    # LEFT JOIN + GROUP BY: varlığı olmayan ilçeler de 0 ile listede kalsın
    rows = db.execute(
        select(District.id, District.name, func.count(Asset.id))
        .outerjoin(Asset, Asset.district_id == District.id)
        .group_by(District.id, District.name)
        .order_by(District.name)
    ).all()

    return [
        DistrictOut(id=row[0], name=row[1], asset_count=row[2]) for row in rows
    ]


@router.get(
    "/geojson",
    response_model=DistrictFeatureCollection,
    summary="İlçe sınırları (GeoJSON)",
    description=(
        "Haritada ilçe sınırlarını çizmek için. Geometriler varsayılan olarak "
        "sadeleştirilir (`ST_SimplifyPreserveTopology`) — ham sınırlar ~1 MB, "
        "sadeleştirilmiş hali ~50 KB ve harita çok daha akıcı çalışır."
    ),
)
def districts_geojson(
    db: DbSession,
    tolerance: Annotated[
        float,
        Query(
            ge=0,
            le=0.01,
            description="Sadeleştirme toleransı (derece). 0 = ham geometri.",
        ),
    ] = 0.0005,
) -> DistrictFeatureCollection:
    geometry_expr = (
        District.geometry
        if tolerance == 0
        else func.ST_SimplifyPreserveTopology(District.geometry, tolerance)
    )

    rows = db.execute(
        select(
            District.id,
            District.name,
            func.ST_AsGeoJSON(geometry_expr),
            func.count(Asset.id),
        )
        .outerjoin(Asset, Asset.district_id == District.id)
        .group_by(District.id, District.name, District.geometry)
        .order_by(District.name)
    ).all()

    return DistrictFeatureCollection(
        features=[
            DistrictFeature(
                id=row[0],
                geometry=json.loads(row[2]),
                properties={"id": row[0], "name": row[1], "asset_count": row[3]},
            )
            for row in rows
        ]
    )
