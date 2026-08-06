"""Dashboard istatistik şemaları."""

from __future__ import annotations

from pydantic import BaseModel, Field


class SayimOgesi(BaseModel):
    """Gruplanmış sayım — tipe/duruma/ilçeye göre dağılımlarda kullanılır."""

    key: str = Field(description="Grup anahtarı (TREE, GOOD, Sarıyer...)")
    count: int


class TrendOgesi(BaseModel):
    """Bir metriğin bu dönem / geçen dönem karşılaştırması."""

    current: int = Field(description="Bu ayki değer")
    previous: int = Field(description="Geçen ayki değer")
    change_pct: float | None = Field(
        default=None,
        description="Yüzde değişim. Geçen ay 0 ise oran tanımsızdır, null döner.",
    )


class StatsSummary(BaseModel):
    """Dashboard'un dört KPI kartı ve üç grafiği için tek çağrılık veri."""

    total: int
    needs_maintenance: int
    broken: int
    added_this_month: int

    by_type: list[SayimOgesi]
    by_status: list[SayimOgesi]
    by_district: list[SayimOgesi] = Field(
        description="En çok varlığa sahip ilçeler (azalan sırada)"
    )

    total_trend: TrendOgesi
    maintenance_trend: TrendOgesi


class TimeseriesPoint(BaseModel):
    period: str = Field(description="YYYY-MM biçiminde ay")
    count: int = Field(description="O ay eklenen varlık sayısı")
    cumulative: int = Field(description="O ayın sonundaki toplam varlık sayısı")


class Timeseries(BaseModel):
    points: list[TimeseriesPoint]
