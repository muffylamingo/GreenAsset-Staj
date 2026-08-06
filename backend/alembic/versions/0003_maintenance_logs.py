"""maintenance_logs tablosu — varlık bakım geçmişi

Revision ID: 0003_maintenance_logs
Revises: 0002_districts_and_new_types
Create Date: 2026-08-06
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003_maintenance_logs"
down_revision: str | None = "0002_districts_and_new_types"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "maintenance_logs",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("asset_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("note", sa.Text(), nullable=False),
        sa.Column("performed_by", sa.String(length=120), nullable=False),
        sa.Column(
            "performed_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        # create_type=False: asset_status tipi 0001'de zaten oluşturuldu,
        # tekrar CREATE TYPE denemesi "already exists" hatası verir
        sa.Column(
            "status_after",
            postgresql.ENUM(
                "GOOD", "NEEDS_MAINTENANCE", "BROKEN",
                name="asset_status",
                create_type=False,
            ),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["asset_id"], ["assets.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # En sık sorgu: "bu varlığın kayıtlarını tarihe göre getir"
    op.create_index(
        "ix_maintenance_asset_performed",
        "maintenance_logs",
        ["asset_id", "performed_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_maintenance_asset_performed", table_name="maintenance_logs")
    op.drop_table("maintenance_logs")
