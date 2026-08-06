"""Uygulama ayarları.

Ortam değişkenlerini (.env / docker-compose environment) tek bir yerden okur.
Kodun hiçbir yerinde os.getenv("...") aramayacağız — hepsi buradan gelir.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Uygulama kimliği (Swagger sayfasında görünür)
    PROJECT_NAME: str = "GreenAsset API"
    VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api/v1"

    # Veritabanı bağlantısı
    # Örnek: postgresql+psycopg://kullanici:sifre@db:5432/greenasset
    DATABASE_URL: str = (
        "postgresql+psycopg://greenasset:greenasset_dev_2026@db:5432/greenasset"
    )

    # Tarayıcının API'ye istek atabilmesi için izin verilen adresler (CORS)
    # Virgülle ayrılmış tek string olarak gelir, listeye çeviriyoruz.
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # --- Kimlik doğrulama ---
    # ⚠️ Üretimde bu değer MUTLAKA .env'den gelmeli ve gizli olmalı.
    # Buradaki varsayılan sadece geliştirme kolaylığı için; bu anahtarla
    # üretilmiş token'ları anahtarı bilen herkes taklit edebilir.
    SECRET_KEY: str = "gelistirme-icin-gizli-anahtar-uretimde-degistir"
    JWT_ALGORITHM: str = "HS256"
    # 12 saat: bir vardiya boyunca tekrar giriş gerekmesin
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 12

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


# Tek bir örnek üretip her yerde bunu import ediyoruz
settings = Settings()
