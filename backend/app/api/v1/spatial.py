"""Mekansal sorgu uçları — ödevin 5. aşamasının "akıllı" kısmı.

  POST /assets/within   Çizilen poligonun içine düşen varlıklar (ST_Within)
  GET  /assets/nearby   Bir noktanın X metre çevresindeki varlıklar (ST_DWithin)

Bu iki uç, PostGIS'in normal bir veritabanından farkını en net gösteren yer.
Standart PostgreSQL'de "şu poligonun içindeki noktalar" sorgusu yazılamaz.
"""

from __future__ import annotations

import json
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.asset import AssetStatus, AssetType

router = APIRouter(prefix="/assets", tags=["Mekansal Sorgular"])

DbSession = Annotated[Session, Depends(get_db)]


class PolygonSorgusu(BaseModel):
    """Haritada çizilen alan + isteğe bağlı filtreler."""

    polygon: dict[str, Any] = Field(
        description="GeoJSON Polygon veya MultiPolygon geometrisi",
        examples=[
            {
                "type": "Polygon",
                "coordinates": [
                    [
                        [28.95, 41.05],
                        [29.10, 41.05],
                        [29.10, 41.15],
                        [28.95, 41.15],
                        [28.95, 41.05],
                    ]
                ],
            }
        ],
    )
    types: list[AssetType] | None = None
    statuses: list[AssetStatus] | None = None


class MekansalSonuc(BaseModel):
    """Sorgu sonucu + özet sayımlar.

    Özet sayımları birlikte dönüyoruz ki arayüz "bu alanda 37 varlık,
    12'si bakım bekliyor" diyebilsin — ikinci bir istek gerekmesin.
    """

    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: list[dict[str, Any]]
    totalCount: int  # noqa: N815 — GeoJSON tarafında camelCase yaygın
    countsByStatus: dict[str, int]  # noqa: N815
    countsByType: dict[str, int]  # noqa: N815


def _geometriyi_dogrula(geojson: dict[str, Any]) -> str:
    """GeoJSON geometrisini doğrular ve metne çevirir."""
    tip = geojson.get("type")
    if tip not in {"Polygon", "MultiPolygon"}:
        raise HTTPException(
            status_code=422,
            detail=f"Geometri tipi Polygon veya MultiPolygon olmalı, '{tip}' geldi",
        )
    if not geojson.get("coordinates"):
        raise HTTPException(status_code=422, detail="Geometride koordinat yok")
    return json.dumps(geojson)


@router.post(
    "/within",
    response_model=MekansalSonuc,
    summary="Poligon içindeki varlıklar (ST_Within)",
    description=(
        "Haritada çizilen alanın **içine tamamen düşen** varlıkları döner.\n\n"
        "`ST_Within(nokta, poligon)` kullanır. `assets.geometry` üzerindeki GIST "
        "index sayesinde önce kaba bir sınırlayıcı kutu elemesi yapılır, sonra "
        "tam geometri kontrolü — bu yüzden milyonlarca kayıtta bile hızlıdır.\n\n"
        "`ST_MakeValid`: kullanıcının elle çizdiği poligon kendisiyle kesişebilir "
        "(kelebek şekli); bu fonksiyon onu geçerli bir geometriye düzeltir, "
        "aksi halde PostGIS hata verir."
    ),
)
def within(payload: PolygonSorgusu, db: DbSession) -> MekansalSonuc:
    geom_json = _geometriyi_dogrula(payload.polygon)

    kosullar = ["ST_Within(a.geometry, alan.g)"]
    parametreler: dict[str, Any] = {"geom": geom_json}

    if payload.types:
        kosullar.append("a.type = ANY(:tipler)")
        parametreler["tipler"] = [t.value for t in payload.types]
    if payload.statuses:
        kosullar.append("a.status = ANY(:durumlar)")
        parametreler["durumlar"] = [s.value for s in payload.statuses]

    sorgu = text(
        f"""
        WITH alan AS (
            SELECT ST_MakeValid(
                ST_SetSRID(ST_GeomFromGeoJSON(:geom), 4326)
            ) AS g
        )
        SELECT
            a.id, a.name, a.type, a.status, a.created_at,
            ST_X(a.geometry) AS lon,
            ST_Y(a.geometry) AS lat,
            d.name AS district_name
        FROM assets a
        CROSS JOIN alan
        LEFT JOIN districts d ON d.id = a.district_id
        WHERE {" AND ".join(kosullar)}
        ORDER BY a.created_at DESC
        """  # noqa: S608 — koşullar sabit metinlerden kuruluyor, kullanıcı girdisi
        # parametre olarak bağlanıyor; SQL enjeksiyonu riski yok
    )

    satirlar = db.execute(sorgu, parametreler).all()

    duruma_gore: dict[str, int] = {}
    tipe_gore: dict[str, int] = {}
    ozellikler = []

    for s in satirlar:
        duruma_gore[s.status] = duruma_gore.get(s.status, 0) + 1
        tipe_gore[s.type] = tipe_gore.get(s.type, 0) + 1
        ozellikler.append(
            {
                "type": "Feature",
                "id": str(s.id),
                "geometry": {"type": "Point", "coordinates": [s.lon, s.lat]},
                "properties": {
                    "id": str(s.id),
                    "name": s.name,
                    "type": s.type,
                    "status": s.status,
                    "district_name": s.district_name,
                    "created_at": s.created_at.isoformat(),
                },
            }
        )

    return MekansalSonuc(
        features=ozellikler,
        totalCount=len(ozellikler),
        countsByStatus=duruma_gore,
        countsByType=tipe_gore,
    )


@router.get(
    "/nearby",
    response_model=MekansalSonuc,
    summary="Yakındaki varlıklar (ST_DWithin)",
    description=(
        "Verilen konumun belirtilen **metre** yarıçapındaki varlıkları, "
        "yakından uzağa sıralı döner.\n\n"
        "⚠️ Kritik detay: `geometry` SRID 4326'dır ve birimi **derecedir**. "
        "Metre cinsinden mesafe için `::geography` cast'i yapılır — bu cast "
        "olmadan 500 sayısı '500 derece' anlamına gelir ve tüm dünya döner.\n\n"
        "`ST_DWithin` tercih edilir çünkü GIST index kullanabilir; "
        "`ST_Distance(...) < 500` yazsaydık her satır tek tek hesaplanırdı."
    ),
)
def nearby(
    db: DbSession,
    lat: Annotated[float, Query(ge=-90, le=90, description="Enlem")],
    lon: Annotated[float, Query(ge=-180, le=180, description="Boylam")],
    radius: Annotated[int, Query(ge=1, le=50000, description="Yarıçap (metre)")] = 500,
    status: Annotated[list[AssetStatus] | None, Query(description="Durum filtresi")] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
) -> MekansalSonuc:
    kosullar = [
        "ST_DWithin(a.geometry::geography, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography, :radius)"
    ]
    parametreler: dict[str, Any] = {"lat": lat, "lon": lon, "radius": radius, "limit": limit}

    if status:
        kosullar.append("a.status = ANY(:durumlar)")
        parametreler["durumlar"] = [s.value for s in status]

    satirlar = db.execute(
        text(
            f"""
            SELECT
                a.id, a.name, a.type, a.status, a.created_at,
                ST_X(a.geometry) AS lon,
                ST_Y(a.geometry) AS lat,
                d.name AS district_name,
                ROUND(
                    ST_Distance(
                        a.geometry::geography,
                        ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography
                    )::numeric
                ) AS mesafe_m
            FROM assets a
            LEFT JOIN districts d ON d.id = a.district_id
            WHERE {" AND ".join(kosullar)}
            ORDER BY mesafe_m
            LIMIT :limit
            """  # noqa: S608 — bkz. within() içindeki not
        ),
        parametreler,
    ).all()

    duruma_gore: dict[str, int] = {}
    tipe_gore: dict[str, int] = {}
    ozellikler = []

    for s in satirlar:
        duruma_gore[s.status] = duruma_gore.get(s.status, 0) + 1
        tipe_gore[s.type] = tipe_gore.get(s.type, 0) + 1
        ozellikler.append(
            {
                "type": "Feature",
                "id": str(s.id),
                "geometry": {"type": "Point", "coordinates": [s.lon, s.lat]},
                "properties": {
                    "id": str(s.id),
                    "name": s.name,
                    "type": s.type,
                    "status": s.status,
                    "district_name": s.district_name,
                    "created_at": s.created_at.isoformat(),
                    # Mobil tasarımdaki "45 m uzakta" bilgisi buradan geliyor
                    "distance_m": int(s.mesafe_m),
                },
            }
        )

    return MekansalSonuc(
        features=ozellikler,
        totalCount=len(ozellikler),
        countsByStatus=duruma_gore,
        countsByType=tipe_gore,
    )
