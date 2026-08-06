"""Veritabanını demo verisiyle doldurur.

Çalıştırma:
    docker compose exec backend python -m app.seed
    docker compose exec backend python -m app.seed --assets 2000 --reset

İki adım yapar:
  1) İlçe sınırlarını GeoJSON'dan yükler (ST_GeomFromGeoJSON)
  2) Her ilçenin İÇİNE rastgele varlık noktaları üretir (ST_GeneratePoints)

ST_GeneratePoints püf noktası: Rastgele lat/lon üretip "poligonun içinde mi?"
diye tek tek kontrol etmek yerine, PostGIS'e "bu poligonun içine N nokta at"
diyoruz. Hem çok daha hızlı hem de nokta denize/başka ilçeye düşmüyor.
"""

from __future__ import annotations

import argparse
import json
import random
from datetime import UTC, datetime, timedelta
from pathlib import Path

from sqlalchemy import func, select, text

from app.core.database import SessionLocal
from app.models import Asset, AssetStatus, AssetType, District

GEOJSON_PATH = Path("/app/seed_data/istanbul_districts.geojson")

# Varlık tipine göre isim üretim şablonları
NAME_TEMPLATES: dict[AssetType, list[str]] = {
    AssetType.TREE: ["Çınar", "Ihlamur", "Akasya", "Sedir", "Köknar", "Zeytin", "Dişbudak"],
    AssetType.BENCH: ["Park Bankı", "Ahşap Bank", "Metal Bank", "Meydan Bankı"],
    AssetType.POLE: ["Aydınlatma Direği", "Sokak Lambası", "Park Aydınlatması"],
    AssetType.TRASH_BIN: ["Çöp Kutusu", "Geri Dönüşüm Kutusu", "Atık Konteyneri"],
    AssetType.PLAYGROUND: ["Oyun Grubu", "Kaydırak", "Salıncak Grubu", "Tırmanma Ünitesi"],
}

# Gerçekçi dağılım: ağaç çok, oyun grubu az
TYPE_WEIGHTS: dict[AssetType, float] = {
    AssetType.TREE: 0.45,
    AssetType.BENCH: 0.20,
    AssetType.POLE: 0.20,
    AssetType.TRASH_BIN: 0.10,
    AssetType.PLAYGROUND: 0.05,
}

# Varlıkların çoğu iyi durumda olmalı — aksi halde dashboard anlamsız görünür
STATUS_WEIGHTS: dict[AssetStatus, float] = {
    AssetStatus.GOOD: 0.72,
    AssetStatus.NEEDS_MAINTENANCE: 0.21,
    AssetStatus.BROKEN: 0.07,
}

# Belediye varlıkları ilçenin YÜZÖLÇÜMÜYLE değil, kentsel yoğunluğuyla orantılıdır.
# (Çatalca, İstanbul'un en büyük ilçesidir ama park mobilyası sayısı Şişli'den azdır.)
# Bu yüzden alan yerine sabit taban ağırlık + pilot bölge çarpanı kullanıyoruz.
PILOT_DISTRICTS = {
    "Sarıyer",
    "Şişli",
    "Beşiktaş",
    "Kâğıthane",
    "Beyoğlu",
    "Üsküdar",
    "Kadıköy",
}
PILOT_WEIGHT = 3.0
BASE_WEIGHT = 1.0


def load_districts(db) -> int:  # noqa: ANN001
    """İlçe sınırlarını GeoJSON dosyasından veritabanına yükler."""
    if not GEOJSON_PATH.exists():
        raise FileNotFoundError(
            f"{GEOJSON_PATH} bulunamadı.\n"
            "Önce sınır verisini indir:  python db/seed/fetch_districts.py"
        )

    existing = db.scalar(select(func.count()).select_from(District))
    if existing:
        print(f"  {existing} ilçe zaten yüklü, atlanıyor.")
        return existing

    data = json.loads(GEOJSON_PATH.read_text(encoding="utf-8"))
    inserted = 0

    for feature in data["features"]:
        name = feature["properties"]["name"]
        geometry_json = json.dumps(feature["geometry"])

        # ST_GeomFromGeoJSON: GeoJSON metnini PostGIS geometrisine çevirir.
        # ST_Multi: tek parça poligonları da MultiPolygon'a sarar (kolon tipi öyle).
        db.execute(
            text(
                """
                INSERT INTO districts (name, geometry)
                VALUES (
                    :name,
                    ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(:geom), 4326))
                )
                ON CONFLICT (name) DO NOTHING
                """
            ),
            {"name": name, "geom": geometry_json},
        )
        inserted += 1

    db.commit()
    print(f"  {inserted} ilçe yüklendi.")
    return inserted


def generate_assets(db, total: int) -> int:  # noqa: ANN001
    """Her ilçenin içine rastgele varlık üretir.

    Dağılım kentsel yoğunluğa göre: pilot bölgeler 3 kat daha yoğun.
    """
    districts = db.execute(select(District.id, District.name)).all()

    if not districts:
        raise RuntimeError("Hiç ilçe yok — önce ilçeleri yükle.")

    weights = {
        name: (PILOT_WEIGHT if name in PILOT_DISTRICTS else BASE_WEIGHT)
        for _, name in districts
    }
    total_weight = sum(weights.values()) or 1.0
    created = 0

    for district_id, district_name in districts:
        # Ağırlıklı pay + %±25 rastgelelik (hepsi aynı sayıda olmasın)
        share = weights[district_name] / total_weight
        count = max(5, round(total * share * random.uniform(0.75, 1.25)))

        # ⭐ ST_GeneratePoints: poligonun İÇİNE n adet rastgele nokta üretir.
        # ST_Dump ile bu çoklu-noktayı tek tek noktalara açıyoruz.
        points = db.execute(
            text(
                """
                SELECT ST_X(geom) AS lon, ST_Y(geom) AS lat
                FROM (
                    SELECT (ST_Dump(ST_GeneratePoints(geometry, :n))).geom
                    FROM districts WHERE id = :did
                ) AS pts
                """
            ),
            {"n": count, "did": district_id},
        ).all()

        for index, point in enumerate(points, start=1):
            asset_type = random.choices(
                list(TYPE_WEIGHTS), weights=list(TYPE_WEIGHTS.values())
            )[0]
            status = random.choices(
                list(STATUS_WEIGHTS), weights=list(STATUS_WEIGHTS.values())
            )[0]
            label = random.choice(NAME_TEMPLATES[asset_type])

            db.add(
                Asset(
                    name=f"{label} #{index:04d}",
                    type=asset_type,
                    status=status,
                    geometry=f"SRID=4326;POINT({point.lon} {point.lat})",
                    district_id=district_id,
                    notes=f"{district_name} — demo verisi",
                )
            )
            created += 1

        db.commit()
        print(f"  {district_name:<20} {len(points):>4} varlık")

    return created


BAKIM_NOTLARI = [
    "Rutin kontrol yapıldı, sorun görülmedi",
    "Kırık ampul değiştirildi",
    "Budama yapıldı",
    "Boya yenilendi",
    "Gevşek cıvatalar sıkıldı",
    "Sulama sistemi kontrol edildi",
    "Kırılan tahta değiştirildi",
    "Temizlik yapıldı",
    "Vandalizm hasarı onarıldı",
]

BAKIM_EKIPLERI = ["Saha Ekibi 1", "Saha Ekibi 2", "Saha Ekibi 3", "Park Bakım", "Elektrik Ekibi"]


def generate_maintenance_logs(db, oran: float = 0.35) -> int:  # noqa: ANN001
    """Varlıkların bir kısmına geçmiş bakım kayıtları üretir.

    Neden hepsine değil? Gerçek hayatta da her varlığın bakım kaydı yoktur;
    "hiç bakım yapılmamış" durumu arayüzde ayrı gösteriliyor ve demo'da o
    halin de görünmesi gerekiyor.

    Tarihler 5-400 gün arasına dağıtılıyor ki "90 günden eski" uyarısı da
    tetiklensin.
    """
    from app.models import MaintenanceLog

    varliklar = db.execute(select(Asset.id, Asset.status)).all()
    secilenler = random.sample(varliklar, k=int(len(varliklar) * oran))
    uretilen = 0

    for asset_id, durum in secilenler:
        for _ in range(random.randint(1, 3)):
            gun_once = random.randint(5, 400)
            db.add(
                MaintenanceLog(
                    asset_id=asset_id,
                    note=random.choice(BAKIM_NOTLARI),
                    performed_by=random.choice(BAKIM_EKIPLERI),
                    performed_at=datetime.now(UTC) - timedelta(days=gun_once),
                    # Kayıtların bir kısmı durumu değiştirmiş olsun
                    status_after=durum if random.random() < 0.4 else None,
                )
            )
            uretilen += 1

    db.commit()
    return uretilen


def reset(db) -> None:  # noqa: ANN001
    """Tüm demo verisini siler."""
    # maintenance_logs, assets'e CASCADE bağlı — TRUNCATE ... CASCADE onu da temizler
    db.execute(text("TRUNCATE TABLE maintenance_logs"))
    db.execute(text("TRUNCATE TABLE assets CASCADE"))
    db.execute(text("TRUNCATE TABLE districts CASCADE"))
    db.commit()
    print("  Mevcut veriler temizlendi.")


def main() -> None:
    parser = argparse.ArgumentParser(description="GreenAsset demo verisi üretici")
    parser.add_argument(
        "--assets", type=int, default=1500, help="Üretilecek toplam varlık sayısı"
    )
    parser.add_argument(
        "--reset", action="store_true", help="Önce mevcut tüm veriyi sil"
    )
    parser.add_argument("--seed", type=int, default=42, help="Rastgelelik tohumu")
    args = parser.parse_args()

    random.seed(args.seed)

    with SessionLocal() as db:
        if args.reset:
            print("● Temizlik")
            reset(db)

        print("● İlçe sınırları")
        load_districts(db)

        print(f"● Varlık üretimi (hedef ~{args.assets})")
        created = generate_assets(db, args.assets)

        print("● Bakım geçmişi")
        loglar = generate_maintenance_logs(db)
        print(f"  {loglar} bakım kaydı üretildi")

        print(f"\n✅ Toplam {created} varlık, {loglar} bakım kaydı.")


if __name__ == "__main__":
    main()
