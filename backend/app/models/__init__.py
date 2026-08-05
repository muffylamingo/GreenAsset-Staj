"""Model paketi.

Alembic'in autogenerate özelliğinin tabloları görebilmesi için
tüm modeller burada import edilmelidir.
"""

from app.models.asset import Asset, AssetStatus, AssetType

__all__ = ["Asset", "AssetStatus", "AssetType"]
