"""Veritabanı bağlantısı ve oturum (session) yönetimi.

SQLAlchemy'nin üç temel parçası:
  engine   → veritabanına açılan bağlantı havuzu (uygulama başına 1 tane)
  Session  → tek bir istek boyunca süren "çalışma alanı"
  Base     → tüm tablo sınıflarımızın miras alacağı taban sınıf
"""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings

# pool_pre_ping: bağlantı kopmuşsa sessizce yenisini açar
# (Docker'da DB yeniden başlayınca yaşanan "server closed the connection" hatasını önler)
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=False,  # True yaparsan çalışan tüm SQL'leri logda görürsün — öğrenirken faydalı
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


class Base(DeclarativeBase):
    """Tüm model sınıflarının taban sınıfı.

    Alembic, migration üretirken tabloları bu sınıfın metadata'sından okur.
    """


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency: her istek için bir DB oturumu açar, sonunda kapatır.

    Kullanımı:
        @router.get("/assets")
        def list_assets(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
