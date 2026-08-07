"""audit_logs tablosu — kim, ne zaman, neyi değiştirdi

Revision ID: 0005_audit_logs
Revises: 0004_users

Not: `alembic revision --autogenerate` bu tablonun yanında districts/users
üzerinde de değişiklik önerdi (unique kısıtını index'e çevirme gibi). Bunlar
gerçek bir fark değil, aynı kuralın iki farklı yazımı. Otomatik üretilen
migration'lar HER ZAMAN elden geçirilmeli — o satırlar buraya alınmadı.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005_audit_logs"
down_revision: str | None = "0004_users"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column(
            "at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        # Kullanıcı silinirse ilişki kopar, kayıt durur.
        sa.Column("user_id", sa.UUID(), nullable=True),
        # Kullanıcı adının o anki kopyası: hesap silinse bile iz okunur kalsın.
        sa.Column("username", sa.String(length=60), nullable=False),
        sa.Column(
            "action",
            sa.Enum(
                "CREATE",
                "UPDATE",
                "DELETE",
                "BULK_UPDATE",
                "BULK_DELETE",
                name="audit_action",
            ),
            nullable=False,
        ),
        sa.Column("entity_type", sa.String(length=40), nullable=False),
        # BİLEREK ForeignKey DEĞİL: FK olsaydı varlık silinince denetim izi de
        # silinir (ya da silme hiç mümkün olmazdı). İz, izlediği kayıttan
        # bağımsız yaşamalı.
        sa.Column("entity_id", sa.String(length=64), nullable=True),
        sa.Column("summary", sa.String(length=255), nullable=True),
        sa.Column("ip", sa.String(length=45), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_audit_entity", "audit_logs", ["entity_type", "entity_id"])
    op.create_index("idx_audit_user_at", "audit_logs", ["user_id", "at"])
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"])
    op.create_index("ix_audit_logs_at", "audit_logs", ["at"])


def downgrade() -> None:
    op.drop_index("ix_audit_logs_at", table_name="audit_logs")
    op.drop_index("ix_audit_logs_action", table_name="audit_logs")
    op.drop_index("idx_audit_user_at", table_name="audit_logs")
    op.drop_index("idx_audit_entity", table_name="audit_logs")
    op.drop_table("audit_logs")
    # Tabloyu düşürmek enum tipini SİLMEZ; elle düşürülmezse downgrade sonrası
    # tekrar upgrade "type already exists" hatası verir.
    sa.Enum(name="audit_action").drop(op.get_bind(), checkfirst=True)
