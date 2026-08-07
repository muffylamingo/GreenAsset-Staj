"""Model paketi.

Alembic'in autogenerate özelliğinin tabloları görebilmesi için
tüm modeller burada import edilmelidir.
"""

from sqlalchemy import func, select
from sqlalchemy.orm import column_property

from app.models.asset import Asset, AssetStatus, AssetType
from app.models.audit import AuditAction, AuditLog
from app.models.district import District
from app.models.maintenance import MaintenanceLog
from app.models.user import User, UserRole

# ---------------------------------------------------------------------------
# Asset.last_maintenance_at — hesaplanan kolon
#
# Neden burada, asset.py'de değil? asset.py, maintenance.py'yi import etseydi
# maintenance.py de asset.py'yi import ettiği için DÖNGÜSEL import olurdu.
# İki model de yüklendikten sonra, burada bağlıyoruz.
#
# column_property + scalar_subquery: her varlık satırıyla birlikte
# "bu varlığın en son bakım tarihi" de gelir. Alternatifi her varlık için
# ayrı sorgu atmaktı (N+1 problemi) — 25 satırlık bir tabloda 26 sorgu.
#
# ix_maintenance_asset_performed index'i sayesinde alt sorgu ucuz.
# ---------------------------------------------------------------------------
Asset.last_maintenance_at = column_property(
    select(func.max(MaintenanceLog.performed_at))
    .where(MaintenanceLog.asset_id == Asset.id)
    .correlate_except(MaintenanceLog)
    .scalar_subquery()
)

__all__ = [
    "Asset",
    "AssetStatus",
    "AssetType",
    "AuditAction",
    "AuditLog",
    "District",
    "MaintenanceLog",
    "User",
    "UserRole",
]
