"""Alembic ortam yapılandırması.

Buradaki iki püf nokta çok önemli:
  1) Bağlantı adresi alembic.ini'den DEĞİL, uygulamanın ayarlarından okunur.
  2) PostGIS'in kendi sistem tabloları (spatial_ref_sys vb.) autogenerate
     sırasında GÖRMEZDEN GELİNİR. Aksi halde Alembic "bu tabloları sil"
     diye migration üretir ve veritabanını bozar.
"""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.core.config import settings
from app.core.database import Base

# Tüm modeller import edilmeli ki Base.metadata dolsun
import app.models  # noqa: F401

config = context.config
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# PostGIS eklentisinin kendi tabloları — bize ait değiller, dokunmayacağız
POSTGIS_TABLES = {
    "spatial_ref_sys",
    "geography_columns",
    "geometry_columns",
    "raster_columns",
    "raster_overviews",
    "topology",
    "layer",
}


def include_object(object, name, type_, reflected, compare_to):  # noqa: A002, ANN001
    """Autogenerate'in hangi nesneleri dikkate alacağını belirler."""
    if type_ == "table" and name in POSTGIS_TABLES:
        return False
    # GeoAlchemy2'nin otomatik ürettiği mekansal index'ler — biz elle tanımlıyoruz
    if type_ == "index" and name is not None and name.startswith("idx_") and reflected:
        return name in {idx.name for t in target_metadata.tables.values() for idx in t.indexes}
    return True


def run_migrations_offline() -> None:
    """SQL dosyası üretme modu (veritabanına bağlanmadan)."""
    context.configure(
        url=settings.DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        include_object=include_object,
        compare_type=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Normal mod: veritabanına bağlanıp migration'ları uygular."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
