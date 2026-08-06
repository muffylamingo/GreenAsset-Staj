"""GreenAsset API — uygulama giriş noktası.

Çalıştırma:  docker compose up -d
Swagger:     http://localhost:8000/docs
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.v1 import assets, districts, export, spatial, stats
from app.core.config import settings
from app.core.database import engine

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "Belediye varlık yönetimi için harita tabanlı REST API.\n\n"
        "Ağaç, park mobilyası ve aydınlatma direği kayıtlarını "
        "PostGIS üzerinde konumlarıyla birlikte yönetir. "
        "Listeleme uçları **GeoJSON FeatureCollection** döner."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
)

# --- CORS ---
# Tarayıcı, farklı porttaki (5173) React uygulamasının bu API'ye (8000)
# istek atmasını varsayılan olarak ENGELLER. Bu middleware izin verir.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Sistem"], summary="Karşılama")
def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
    }


@app.get("/health", tags=["Sistem"], summary="Sağlık kontrolü")
def health():
    """Uygulama ve veritabanı bağlantısının durumunu döner.

    Docker healthcheck ve 'çalışıyor mu?' kontrolü için.
    """
    db_ok = False
    postgis_version = None
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            postgis_version = conn.execute(text("SELECT PostGIS_Version()")).scalar()
            db_ok = True
    except Exception as exc:  # noqa: BLE001 — health ucu asla patlamamalı
        postgis_version = f"hata: {exc.__class__.__name__}"

    return {
        "status": "ok" if db_ok else "degraded",
        "database": db_ok,
        "postgis": postgis_version,
    }


# --- API router'ları ---
#
# ⚠️ SIRA ÖNEMLİ: spatial ve export router'ları assets'ten ÖNCE gelmeli.
# assets router'ında `GET /assets/{asset_id}` var; FastAPI yolları kayıt
# sırasına göre eşleştirir. Önce assets'i eklersek `/assets/nearby` isteği
# "nearby" kelimesini UUID sanıp 422 döner.
app.include_router(spatial.router, prefix=settings.API_V1_PREFIX)
app.include_router(export.router, prefix=settings.API_V1_PREFIX)
app.include_router(assets.router, prefix=settings.API_V1_PREFIX)
app.include_router(districts.router, prefix=settings.API_V1_PREFIX)
app.include_router(stats.router, prefix=settings.API_V1_PREFIX)
