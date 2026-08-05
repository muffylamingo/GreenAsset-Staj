"""assets tablosu + enum tipleri + GIST index

Revision ID: 0001_initial_assets
Revises:
Create Date: 2026-08-05
"""

from collections.abc import Sequence

import geoalchemy2
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial_assets"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()

    # --- 1) PostGIS emniyet kemeri -------------------------------------
    # Normalde db/init/01-extensions.sql bunları zaten kurar.
    # Buraya da koyuyoruz ki migration tek başına da çalışabilsin.
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    # --- 2) ENUM tipleri ------------------------------------------------
    asset_type = postgresql.ENUM(
        "TREE", "BENCH", "POLE", name="asset_type", create_type=False
    )
    asset_status = postgresql.ENUM(
        "GOOD", "NEEDS_MAINTENANCE", "BROKEN", name="asset_status", create_type=False
    )
    asset_type.create(bind, checkfirst=True)
    asset_status.create(bind, checkfirst=True)

    # --- 3) assets tablosu ----------------------------------------------
    op.create_table(
        "assets",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("type", asset_type, nullable=False),
        sa.Column("status", asset_status, nullable=False, server_default="GOOD"),
        sa.Column(
            "geometry",
            geoalchemy2.types.Geometry(
                geometry_type="POINT", srid=4326, spatial_index=False
            ),
            nullable=False,
        ),
        sa.Column("notes", sa.String(length=1000), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # --- 4) Index'ler ----------------------------------------------------
    op.create_index("ix_assets_name", "assets", ["name"])
    op.create_index("ix_assets_type", "assets", ["type"])
    op.create_index("ix_assets_status", "assets", ["status"])
    # ⭐ Mekansal index — ST_Within / ST_DWithin sorgularının hızlı olmasını sağlar
    op.create_index(
        "idx_assets_geometry", "assets", ["geometry"], postgresql_using="gist"
    )

    # --- 5) updated_at otomatik güncelleme trigger'ı ---------------------
    # SQLAlchemy'nin onupdate'i sadece ORM üzerinden yapılan güncellemeleri yakalar.
    # Elle SQL yazıldığında da çalışsın diye veritabanı seviyesinde trigger kuruyoruz.
    op.execute(
        """
        CREATE OR REPLACE FUNCTION set_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
    )
    op.execute(
        """
        CREATE TRIGGER assets_set_updated_at
        BEFORE UPDATE ON assets
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        """
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS assets_set_updated_at ON assets")
    op.execute("DROP FUNCTION IF EXISTS set_updated_at()")
    op.drop_index("idx_assets_geometry", table_name="assets")
    op.drop_index("ix_assets_status", table_name="assets")
    op.drop_index("ix_assets_type", table_name="assets")
    op.drop_index("ix_assets_name", table_name="assets")
    op.drop_table("assets")
    op.execute("DROP TYPE IF EXISTS asset_status")
    op.execute("DROP TYPE IF EXISTS asset_type")
