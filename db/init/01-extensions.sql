-- ============================================================
--  Bu dosya veritabanı İLK KEZ oluşturulurken otomatik çalışır.
--  (docker-entrypoint-initdb.d klasörünün özelliği)
--
--  DİKKAT: Sadece postgres_data volume'ü boşken çalışır.
--  Tekrar çalıştırmak istersen:  docker compose down -v
-- ============================================================

-- PostGIS: PostgreSQL'e geometri tipi ve mekansal fonksiyonlar ekler.
-- Bu satır olmadan "geometry" diye bir veri tipi YOKTUR.
CREATE EXTENSION IF NOT EXISTS postgis;

-- Topology: ileri seviye mekansal işlemler (şu an kullanmıyoruz ama zararı yok)
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- pgcrypto: gen_random_uuid() fonksiyonunu sağlar (id kolonumuz için)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- unaccent: Türkçe arama için — "cinar" yazınca "çınar" bulunsun
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Kurulum doğrulaması (docker compose logs db ile görebilirsin)
DO $$
BEGIN
    RAISE NOTICE '✅ PostGIS sürümü: %', PostGIS_Version();
END $$;

-- NOT: assets tablosunu burada DEĞİL, Alembic migration ile oluşturuyoruz.
-- Sebep: şema değişikliklerinin kod ile versiyonlanması (bkz. BILMEM-GEREKENLER.md #C1)
