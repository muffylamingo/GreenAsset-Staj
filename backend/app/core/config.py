"""Uygulama ayarları.

Ortam değişkenlerini (.env / docker-compose environment) tek bir yerden okur.
Kodun hiçbir yerinde os.getenv("...") aramayacağız — hepsi buradan gelir.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict

# Kodun içindeki geliştirme anahtarı. Üretimde bu değerin kullanılması
# YASAK — aşağıda açılışta kontrol ediliyor.
GELISTIRME_ANAHTARI = "gelistirme-icin-gizli-anahtar-uretimde-degistir"


class Settings(BaseSettings):
    # Çalışma ortamı: "development" veya "production".
    # Üretimde bazı güvenlik kontrolleri sertleşir (bkz. dosyanın sonu).
    ENVIRONMENT: str = "development"

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
    SECRET_KEY: str = GELISTIRME_ANAHTARI
    JWT_ALGORITHM: str = "HS256"
    # 12 saat: bir vardiya boyunca tekrar giriş gerekmesin
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 12

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def uretim_mi(self) -> bool:
        return self.ENVIRONMENT.strip().lower() == "production"


# Tek bir örnek üretip her yerde bunu import ediyoruz
settings = Settings()


# ---------------------------------------------------------------------------
# Üretim koruması
#
# Bir uyarı yorumu, unutulmaya karşı hiçbir koruma sağlamaz. Asıl tehlike
# şudur: geliştirme anahtarı herkese açık (bu depoda yazılı). O anahtarla
# imzalanmış bir token'ı isteyen herkes üretebilir — yani rolü "ADMIN" olan
# sahte bir token yazıp sisteme yönetici olarak girebilir. Parolayı bilmesine
# bile gerek kalmaz.
#
# Bu yüzden uyarıyı bir engele çeviriyoruz: üretim ortamında varsayılan
# anahtarla uygulama HİÇ AÇILMAZ. Erken ve gürültülü hata, sessiz açıktan
# her zaman iyidir.
# ---------------------------------------------------------------------------
if settings.uretim_mi and settings.SECRET_KEY == GELISTIRME_ANAHTARI:
    raise RuntimeError(
        "ENVIRONMENT=production iken varsayılan SECRET_KEY kullanılamaz. "
        "Rastgele bir anahtar üretip .env dosyasına yazın:\n"
        '  python -c "import secrets; print(secrets.token_urlsafe(48))"'
    )

