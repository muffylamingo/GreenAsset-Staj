"""Dışa aktarma ucu — ödevin 5. aşaması.

  GET /assets/export?format=csv|geojson

Tablodaki veriyi (aynı filtrelerle) indirilebilir dosya olarak döner.
"""

from __future__ import annotations

import csv
import io
import json
from datetime import UTC, datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.converters import asset_to_feature, asset_to_out
from app.core.database import get_db
from app.crud import asset as crud
from app.models.asset import AssetStatus, AssetType

router = APIRouter(prefix="/assets", tags=["Dışa Aktarma"])

DbSession = Annotated[Session, Depends(get_db)]

CSV_BASLIKLARI = [
    "id",
    "name",
    "type",
    "status",
    "latitude",
    "longitude",
    "district",
    "notes",
    "created_at",
    "updated_at",
]


def _parse_bbox(bbox: str | None):  # noqa: ANN202
    if not bbox:
        return None
    parcalar = bbox.split(",")
    if len(parcalar) != 4:
        raise HTTPException(status_code=422, detail="bbox formatı: minLon,minLat,maxLon,maxLat")
    try:
        return tuple(float(p) for p in parcalar)  # type: ignore[return-value]
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="bbox değerleri sayı olmalı") from exc


@router.get(
    "/export",
    summary="Varlıkları dışa aktar (CSV / GeoJSON)",
    description=(
        "Listeleme ucuyla **aynı filtreleri** kabul eder; ekranda ne görüyorsan "
        "onu indirirsin.\n\n"
        "CSV, Excel'in Türkçe karakterleri doğru açması için **UTF-8 BOM** ile "
        "üretilir — bu olmadan Excel 'Çınar' yerine 'Ã‡Ä±nar' gösterir."
    ),
    responses={
        200: {
            "content": {"text/csv": {}, "application/geo+json": {}},
            "description": "İndirilebilir dosya",
        }
    },
)
def export_assets(
    db: DbSession,
    format: Annotated[  # noqa: A002 — API sözleşmesinde bu ad bekleniyor
        Literal["csv", "geojson"], Query(description="Dosya biçimi")
    ] = "csv",
    type: Annotated[list[AssetType] | None, Query()] = None,  # noqa: A002
    status_filter: Annotated[list[AssetStatus] | None, Query(alias="status")] = None,
    district_id: Annotated[int | None, Query()] = None,
    q: Annotated[str | None, Query()] = None,
    bbox: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=50000)] = 50000,
):
    filtreler = crud.AssetFilters(
        types=type,
        statuses=status_filter,
        district_id=district_id,
        q=q,
        bbox=_parse_bbox(bbox),
        limit=limit,
        offset=0,
        sort_by="created_at",
        sort_dir="desc",
    )
    kayitlar = crud.list_assets(db, filtreler)

    damga = datetime.now(UTC).strftime("%Y%m%d-%H%M")

    if format == "geojson":
        icerik = json.dumps(
            {
                "type": "FeatureCollection",
                "features": [
                    asset_to_feature(a).model_dump(mode="json") for a in kayitlar
                ],
            },
            ensure_ascii=False,
            indent=2,
        )
        return StreamingResponse(
            io.BytesIO(icerik.encode("utf-8")),
            media_type="application/geo+json",
            headers={
                "Content-Disposition": f'attachment; filename="greenasset-{damga}.geojson"'
            },
        )

    # --- CSV ---
    tampon = io.StringIO()
    yazici = csv.writer(tampon, delimiter=";", quoting=csv.QUOTE_MINIMAL)
    # Noktalı virgül: Excel'in Türkçe yerel ayarında varsayılan ayraç budur.
    # Virgül kullanırsak tüm satır tek hücreye sıkışır.
    yazici.writerow(CSV_BASLIKLARI)

    for kayit in kayitlar:
        cikti = asset_to_out(kayit)
        yazici.writerow(
            [
                cikti.id,
                cikti.name,
                cikti.type.value,
                cikti.status.value,
                f"{cikti.latitude:.6f}",
                f"{cikti.longitude:.6f}",
                cikti.district_name or "",
                cikti.notes or "",
                cikti.created_at.isoformat(),
                cikti.updated_at.isoformat(),
            ]
        )

    # BOM (﻿): Excel'e "bu dosya UTF-8" demenin tek güvenilir yolu
    veri = ("﻿" + tampon.getvalue()).encode("utf-8")

    return StreamingResponse(
        io.BytesIO(veri),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="greenasset-{damga}.csv"'},
    )
