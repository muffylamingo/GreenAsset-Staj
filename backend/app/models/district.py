"""districts tablosu — ilçe sınırları (Polygon geometri).

Bu tablo projedeki en "GIS" parçalardan biri:
Bir varlığın hangi ilçede olduğunu ELLE girmiyoruz.
Noktanın koordinatını ilçe sınırlarıyla karşılaştırıp `ST_Within` ile
otomatik buluyoruz. Yani ilçe bilgisi bir veri girişi değil, bir SORGU sonucu.

    SELECT id FROM districts
    WHERE ST_Within(ST_SetSRID(ST_MakePoint(:lon, :lat), 4326), geometry)
"""

from geoalchemy2 import Geometry
from sqlalchemy import Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class District(Base):
    __tablename__ = "districts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    name: Mapped[str] = mapped_column(String(80), nullable=False, unique=True, index=True)

    # İlçe sınırları tek parça olmayabilir (adalar, kopuk bölgeler) →
    # POLYGON değil MULTIPOLYGON kullanıyoruz.
    geometry: Mapped[str] = mapped_column(
        Geometry(geometry_type="MULTIPOLYGON", srid=4326, spatial_index=False),
        nullable=False,
    )

    assets = relationship("Asset", back_populates="district")

    __table_args__ = (
        Index("idx_districts_geometry", "geometry", postgresql_using="gist"),
    )

    def __repr__(self) -> str:
        return f"<District {self.name}>"
