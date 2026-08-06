"""Test altyapısı.

Testler AYRI bir veritabanında çalışır (`greenasset_test`). Gerçek veriyi
kullansaydık testler onu bozar, üstelik "kaç varlık var" gibi sayımlar
her çalıştırmada farklı sonuç verirdi.

Her test kendi işlemini (transaction) açar ve sonunda GERİ ALIR. Böylece
testler birbirini etkilemez, sıraları önemli olmaz.
"""

from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.database import Base, get_db
from app.core.security import parola_ozetle
from app.main import app
from app.models import Asset, AssetStatus, AssetType, District, User, UserRole

TEST_DB = "greenasset_test"


def _test_url() -> str:
    """Ana bağlantı adresinden test veritabanının adresini üretir."""
    taban, _, _ = settings.DATABASE_URL.rpartition("/")
    return f"{taban}/{TEST_DB}"


@pytest.fixture(scope="session")
def engine():
    """Test veritabanını oluşturur, şemayı kurar, sonunda siler."""
    # Veritabanı oluşturmak için "postgres" bakım veritabanına bağlanıyoruz —
    # bir veritabanı kendi kendini CREATE edemez.
    taban, _, _ = settings.DATABASE_URL.rpartition("/")
    yonetim = create_engine(f"{taban}/postgres", isolation_level="AUTOCOMMIT")

    with yonetim.connect() as conn:
        conn.execute(text(f"DROP DATABASE IF EXISTS {TEST_DB}"))
        conn.execute(text(f"CREATE DATABASE {TEST_DB}"))
    yonetim.dispose()

    test_engine = create_engine(_test_url())

    # PostGIS eklentileri — geometry tipi bunlar olmadan yok
    with test_engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto"))
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS unaccent"))
        conn.commit()

    Base.metadata.create_all(test_engine)

    yield test_engine

    test_engine.dispose()
    yonetim = create_engine(f"{taban}/postgres", isolation_level="AUTOCOMMIT")
    with yonetim.connect() as conn:
        conn.execute(text(f"DROP DATABASE IF EXISTS {TEST_DB}"))
    yonetim.dispose()


@pytest.fixture
def db(engine):
    """Her test için bir oturum. Test bitince her şey geri alınır.

    Dış işlem (transaction) açıp sonunda rollback yapıyoruz; testin içinde
    commit çağrılsa bile o commit dış işlemin içinde kalır ve geri alınır.
    """
    baglanti = engine.connect()
    islem = baglanti.begin()
    Session = sessionmaker(bind=baglanti)
    oturum = Session()

    yield oturum

    oturum.close()
    islem.rollback()
    baglanti.close()


@pytest.fixture
def client(db):
    """Uygulamayı test veritabanına bağlayan HTTP istemcisi."""

    def test_db():
        yield db

    app.dependency_overrides[get_db] = test_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Veri fikstürleri
# ---------------------------------------------------------------------------
@pytest.fixture
def sariyer(db) -> District:
    """Test için basit bir kare ilçe — İTÜ Ayazağa'yı içine alıyor."""
    db.execute(
        text(
            """
            INSERT INTO districts (name, geometry)
            VALUES ('Sarıyer', ST_Multi(ST_SetSRID(ST_MakeEnvelope(
                28.95, 41.05, 29.15, 41.25
            ), 4326)))
            """
        )
    )
    db.commit()
    return db.query(District).filter_by(name="Sarıyer").one()


@pytest.fixture
def admin(db) -> User:
    kullanici = User(
        username="test_admin",
        full_name="Test Yönetici",
        password_hash=parola_ozetle("admin123"),
        role=UserRole.ADMIN,
    )
    db.add(kullanici)
    db.commit()
    return kullanici


@pytest.fixture
def saha(db) -> User:
    kullanici = User(
        username="test_saha",
        full_name="Test Saha",
        password_hash=parola_ozetle("saha123"),
        role=UserRole.FIELD,
    )
    db.add(kullanici)
    db.commit()
    return kullanici


def _token_al(client, kullanici_adi: str, parola: str) -> str:
    yanit = client.post(
        "/api/v1/auth/login", data={"username": kullanici_adi, "password": parola}
    )
    assert yanit.status_code == 200, yanit.text
    return yanit.json()["access_token"]


@pytest.fixture
def admin_headers(client, admin) -> dict:
    return {"Authorization": f"Bearer {_token_al(client, 'test_admin', 'admin123')}"}


@pytest.fixture
def saha_headers(client, saha) -> dict:
    return {"Authorization": f"Bearer {_token_al(client, 'test_saha', 'saha123')}"}


@pytest.fixture
def ornek_varlik(db, sariyer) -> Asset:
    """İTÜ Ayazağa koordinatında bir ağaç."""
    varlik = Asset(
        name="Test Çınarı",
        type=AssetType.TREE,
        status=AssetStatus.GOOD,
        geometry="SRID=4326;POINT(29.027 41.105)",
        district_id=sariyer.id,
    )
    db.add(varlik)
    db.commit()
    db.refresh(varlik)
    return varlik
