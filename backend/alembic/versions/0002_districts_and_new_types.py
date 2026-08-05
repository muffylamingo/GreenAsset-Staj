"""districts tablosu + iki yeni varlık tipi

Neden ayrı bir migration?
Şema değişikliklerinin her biri kendi adımıdır — böylece geri alınabilir
ve değişikliğin ne zaman/neden yapıldığı git geçmişinden okunabilir.

Revision ID: 0002_districts_and_new_types
Revises: 0001_initial_assets
Create Date: 2026-08-05
"""

from collections.abc import Sequence

import geoalchemy2
import sqlalchemy as sa
from alembic import op

revision: str = "0002_districts_and_new_types"
down_revision: str | None = "0001_initial_assets"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # --- 1) asset_type enum'una iki yeni değer -------------------------
    # PostgreSQL'de enum'a değer eklemek ALTER TYPE ile yapılır.
    # IF NOT EXISTS sayesinde migration tekrar çalışsa da patlamaz.
    op.execute("ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'TRASH_BIN'")
    op.execute("ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'PLAYGROUND'")

    # --- 2) districts tablosu ------------------------------------------
    op.create_table(
        "districts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column(
            "geometry",
            geoalchemy2.types.Geometry(
                geometry_type="MULTIPOLYGON", srid=4326, spatial_index=False
            ),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name", name="uq_districts_name"),
    )
    op.create_index("ix_districts_name", "districts", ["name"])
    # İlçe sınırları içinde nokta aramanın (ST_Within) hızlı olması için
    op.create_index(
        "idx_districts_geometry", "districts", ["geometry"], postgresql_using="gist"
    )

    # --- 3) assets.district_id ------------------------------------------
    op.add_column("assets", sa.Column("district_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_assets_district_id",
        source_table="assets",
        referent_table="districts",
        local_cols=["district_id"],
        remote_cols=["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_assets_district_id", "assets", ["district_id"])


def downgrade() -> None:
    op.drop_index("ix_assets_district_id", table_name="assets")
    op.drop_constraint("fk_assets_district_id", "assets", type_="foreignkey")
    op.drop_column("assets", "district_id")

    op.drop_index("idx_districts_geometry", table_name="districts")
    op.drop_index("ix_districts_name", table_name="districts")
    op.drop_table("districts")

    # NOT: PostgreSQL enum'dan değer SİLMEYİ desteklemez.
    # Geri almak için tipi yeniden oluşturmak gerekir — bu migration'da
    # bilerek yapmıyoruz (veri kaybı riski). Enum değerlerinin fazladan
    # kalması zararsızdır.
