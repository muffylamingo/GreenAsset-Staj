"""Model paketi.

Alembic'in autogenerate özelliğinin tabloları görebilmesi için
tüm modeller burada import edilmelidir.
"""

from app.models.asset import Asset, AssetStatus, AssetType
from app.models.district import District

__all__ = ["Asset", "AssetStatus", "AssetType", "District"]
