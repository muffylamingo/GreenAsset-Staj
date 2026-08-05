# ============================================================
#  GreenAsset Backend — FastAPI
#  Python 3.12 kullanıyoruz (3.14'te bazı GIS kütüphaneleri
#  henüz hazır "wheel" sunmuyor, derleme hatası çıkabiliyor)
# ============================================================
FROM python:3.12-slim

# Python davranış ayarları:
#  PYTHONDONTWRITEBYTECODE → .pyc dosyaları üretme (image küçük kalsın)
#  PYTHONUNBUFFERED        → logları anında yaz (docker logs'ta görelim)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# GeoAlchemy2/psycopg ve pg_isready için gerekli sistem paketleri
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq-dev \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Önce SADECE requirements kopyalanır → kod değişince pip tekrar çalışmaz
# (Docker katman önbelleği: build süresini dakikalardan saniyelere indirir)
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# Sonra uygulama kodu
COPY . .

EXPOSE 8000

# Varsayılan komut — docker-compose.yml içinde --reload ile ezilir
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
