"""Dashboard istatistik uçları — ödevin 5. aşaması.

  GET /stats/summary      KPI kartları + tip/durum/ilçe dağılımları + trendler
  GET /stats/timeseries   zamana göre eklenen varlık grafiği
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.asset import Asset, AssetStatus
from app.models.district import District
from app.schemas.stats import (
    SayimOgesi,
    StatsSummary,
    Timeseries,
    TimeseriesPoint,
    TrendOgesi,
)

router = APIRouter(prefix="/stats", tags=["İstatistikler"])

DbSession = Annotated[Session, Depends(get_db)]


def _trend(current: int, previous: int) -> TrendOgesi:
    """Yüzde değişim hesaplar.

    Geçen ay 0 ise oran matematiksel olarak tanımsızdır (sıfıra bölme).
    "%100 artış" yazmak yanıltıcı olurdu — null döndürüp arayüzde "—" gösteriyoruz.
    """
    if previous == 0:
        return TrendOgesi(current=current, previous=previous, change_pct=None)
    degisim = (current - previous) / previous * 100
    return TrendOgesi(current=current, previous=previous, change_pct=round(degisim, 1))


@router.get(
    "/summary",
    response_model=StatsSummary,
    summary="Dashboard özeti",
    description=(
        "Dashboard'un ihtiyacı olan her şeyi TEK çağrıda döner: KPI sayıları, "
        "tip/durum/ilçe dağılımları ve geçen aya göre trendler.\n\n"
        "Neden tek uç? Dört ayrı istek atmak yerine tek sorgu seti çalıştırmak "
        "hem daha hızlı hem de ekrandaki sayılar birbirleriyle tutarlı olur."
    ),
)
def summary(
    db: DbSession,
    district_limit: Annotated[int, Query(ge=1, le=39)] = 8,
) -> StatsSummary:
    # --- Toplam ve durum bazlı sayımlar ---
    toplam = db.scalar(select(func.count()).select_from(Asset)) or 0

    durum_satirlari = db.execute(
        select(Asset.status, func.count()).group_by(Asset.status)
    ).all()
    durum_sozlugu = {durum.value: sayi for durum, sayi in durum_satirlari}

    # --- Tip bazlı ---
    tip_satirlari = db.execute(
        select(Asset.type, func.count()).group_by(Asset.type).order_by(func.count().desc())
    ).all()

    # --- İlçe bazlı (en kalabalık N ilçe) ---
    ilce_satirlari = db.execute(
        select(District.name, func.count(Asset.id))
        .join(Asset, Asset.district_id == District.id)
        .group_by(District.name)
        .order_by(func.count(Asset.id).desc())
        .limit(district_limit)
    ).all()

    # --- Trendler: bu ay ve geçen ay eklenenler ---
    # date_trunc('month', now()) → ayın ilk günü. Böylece "son 30 gün" değil,
    # takvim ayı karşılaştırması yapıyoruz (dashboard'da beklenen budur).
    donem_satiri = db.execute(
        text(
            """
            SELECT
              COUNT(*) FILTER (
                WHERE created_at >= date_trunc('month', now())
              ) AS bu_ay,
              COUNT(*) FILTER (
                WHERE created_at >= date_trunc('month', now()) - interval '1 month'
                  AND created_at <  date_trunc('month', now())
              ) AS gecen_ay,
              COUNT(*) FILTER (
                WHERE status = 'NEEDS_MAINTENANCE'
                  AND created_at >= date_trunc('month', now())
              ) AS bakim_bu_ay,
              COUNT(*) FILTER (
                WHERE status = 'NEEDS_MAINTENANCE'
                  AND created_at >= date_trunc('month', now()) - interval '1 month'
                  AND created_at <  date_trunc('month', now())
              ) AS bakim_gecen_ay,
              COUNT(*) FILTER (
                WHERE created_at < date_trunc('month', now())
              ) AS gecen_ay_sonu_toplam
            FROM assets
            """
        )
    ).one()

    return StatsSummary(
        total=toplam,
        needs_maintenance=durum_sozlugu.get(AssetStatus.NEEDS_MAINTENANCE.value, 0),
        broken=durum_sozlugu.get(AssetStatus.BROKEN.value, 0),
        added_this_month=donem_satiri.bu_ay,
        by_type=[SayimOgesi(key=tip.value, count=sayi) for tip, sayi in tip_satirlari],
        by_status=[
            SayimOgesi(key=durum.value, count=sayi) for durum, sayi in durum_satirlari
        ],
        by_district=[SayimOgesi(key=ad, count=sayi) for ad, sayi in ilce_satirlari],
        # Toplam trendi: bu ayın sonu vs geçen ayın sonu
        total_trend=_trend(toplam, donem_satiri.gecen_ay_sonu_toplam),
        maintenance_trend=_trend(donem_satiri.bakim_bu_ay, donem_satiri.bakim_gecen_ay),
    )


@router.get(
    "/timeseries",
    response_model=Timeseries,
    summary="Zamana göre eklenen varlıklar",
    description=(
        "Son N ay için aylık ekleme sayıları ve kümülatif toplam.\n\n"
        "`generate_series` kullanıyoruz ki hiç varlık eklenmemiş aylar da "
        "0 değeriyle listede yer alsın — aksi halde grafik o ayları atlar "
        "ve zaman ekseni yanıltıcı görünür."
    ),
)
def timeseries(
    db: DbSession,
    months: Annotated[int, Query(ge=1, le=60, description="Kaç ay geriye gidilecek")] = 12,
) -> Timeseries:
    satirlar = db.execute(
        text(
            """
            WITH aylar AS (
                SELECT generate_series(
                    date_trunc('month', now()) - make_interval(months => :ay_sayisi - 1),
                    date_trunc('month', now()),
                    interval '1 month'
                ) AS ay
            ),
            aylik AS (
                SELECT date_trunc('month', created_at) AS ay, COUNT(*) AS adet
                FROM assets
                GROUP BY 1
            )
            SELECT
                to_char(a.ay, 'YYYY-MM') AS donem,
                COALESCE(k.adet, 0)      AS adet,
                (SELECT COUNT(*) FROM assets
                 WHERE created_at < a.ay + interval '1 month') AS kumulatif
            FROM aylar a
            LEFT JOIN aylik k ON k.ay = a.ay
            ORDER BY a.ay
            """
        ),
        {"ay_sayisi": months},
    ).all()

    return Timeseries(
        points=[
            TimeseriesPoint(period=s.donem, count=s.adet, cumulative=s.kumulatif)
            for s in satirlar
        ]
    )
