"""Varlık CRUD, doğrulama, filtre ve GeoJSON testleri."""

import pytest


# ---------------------------------------------------------------------------
# Oluşturma ve ilçe atama
# ---------------------------------------------------------------------------
def test_varlik_olusturma(client, admin_headers, sariyer):
    yanit = client.post(
        "/api/v1/assets",
        headers=admin_headers,
        json={
            "name": "Yeni Çınar",
            "type": "TREE",
            "status": "GOOD",
            "latitude": 41.105,
            "longitude": 29.027,
            "notes": "test",
        },
    )
    assert yanit.status_code == 201

    veri = yanit.json()
    assert veri["name"] == "Yeni Çınar"
    assert veri["latitude"] == pytest.approx(41.105)
    assert veri["longitude"] == pytest.approx(29.027)


def test_ilce_ST_Within_ile_otomatik_atanir(client, admin_headers, sariyer):
    """Kullanıcı ilçe göndermiyor — PostGIS koordinattan buluyor."""
    yanit = client.post(
        "/api/v1/assets",
        headers=admin_headers,
        json={
            "name": "İlçe testi",
            "type": "BENCH",
            "latitude": 41.105,  # kare ilçenin İÇİNDE
            "longitude": 29.027,
        },
    )
    assert yanit.json()["district_name"] == "Sarıyer"


def test_ilce_disindaki_nokta_ilcesiz_kalir(client, admin_headers, sariyer):
    """Hiçbir sınıra düşmeyen nokta null ilçeyle kaydedilir, hata vermez."""
    yanit = client.post(
        "/api/v1/assets",
        headers=admin_headers,
        json={
            "name": "Ankara'da bir ağaç",
            "type": "TREE",
            "latitude": 39.92,  # kare ilçenin DIŞINDA
            "longitude": 32.85,
        },
    )
    assert yanit.status_code == 201
    assert yanit.json()["district_name"] is None


def test_koordinat_degisince_ilce_yeniden_hesaplanir(
    client, admin_headers, ornek_varlik, sariyer
):
    yanit = client.put(
        f"/api/v1/assets/{ornek_varlik.id}",
        headers=admin_headers,
        json={"latitude": 39.92, "longitude": 32.85},  # ilçe dışına taşı
    )
    assert yanit.status_code == 200
    assert yanit.json()["district_name"] is None


# ---------------------------------------------------------------------------
# Doğrulama — ödevin açık şartı
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    ("alan", "deger"),
    [
        ("name", ""),  # boş isim
        ("name", "   "),  # sadece boşluk
        ("latitude", 999),  # aralık dışı
        ("latitude", -91),
        ("longitude", 181),
        ("longitude", -181),
    ],
)
def test_gecersiz_veri_422(client, admin_headers, alan, deger):
    govde = {
        "name": "Geçerli isim",
        "type": "TREE",
        "latitude": 41.105,
        "longitude": 29.027,
    }
    govde[alan] = deger

    yanit = client.post("/api/v1/assets", headers=admin_headers, json=govde)
    assert yanit.status_code == 422


def test_gecersiz_tip_422(client, admin_headers):
    yanit = client.post(
        "/api/v1/assets",
        headers=admin_headers,
        json={
            "name": "Test",
            "type": "UZAY_GEMISI",
            "latitude": 41.1,
            "longitude": 29.0,
        },
    )
    assert yanit.status_code == 422


def test_olmayan_varlik_404(client, admin_headers):
    yanit = client.get(
        "/api/v1/assets/00000000-0000-0000-0000-000000000000", headers=admin_headers
    )
    assert yanit.status_code == 404


# ---------------------------------------------------------------------------
# GeoJSON — ödev "kritik" demişti
# ---------------------------------------------------------------------------
def test_geojson_formati(client, admin_headers, ornek_varlik):
    yanit = client.get("/api/v1/assets", headers=admin_headers)
    assert yanit.status_code == 200

    veri = yanit.json()
    assert veri["type"] == "FeatureCollection"
    assert veri["totalCount"] >= 1

    ozellik = veri["features"][0]
    assert ozellik["type"] == "Feature"
    assert ozellik["geometry"]["type"] == "Point"


def test_geojson_koordinat_sirasi_lon_lat(client, admin_headers, ornek_varlik):
    """RFC 7946: coordinates = [boylam, enlem].

    Bu testin varlık sebebi: sıra karışırsa noktalar haritada Somali
    açıklarında görünür ve hatayı fark etmek zor olur.
    """
    yanit = client.get("/api/v1/assets", headers=admin_headers)
    lon, lat = yanit.json()["features"][0]["geometry"]["coordinates"]

    # İTÜ Ayazağa: enlem ~41, boylam ~29
    assert lon == pytest.approx(29.027, abs=0.01)
    assert lat == pytest.approx(41.105, abs=0.01)


def test_format_json_duz_liste_doner(client, admin_headers, ornek_varlik):
    yanit = client.get("/api/v1/assets?format=json", headers=admin_headers)
    veri = yanit.json()
    assert isinstance(veri, list)
    assert "latitude" in veri[0]
    # Sayfalama için toplam sayı başlıkta
    assert "x-total-count" in {k.lower() for k in yanit.headers}


# ---------------------------------------------------------------------------
# Filtreler
# ---------------------------------------------------------------------------
def test_tip_filtresi(client, admin_headers, ornek_varlik):
    agac = client.get("/api/v1/assets?type=TREE", headers=admin_headers).json()
    bank = client.get("/api/v1/assets?type=BENCH", headers=admin_headers).json()

    assert agac["totalCount"] == 1
    assert bank["totalCount"] == 0


def test_durum_filtresi(client, admin_headers, ornek_varlik):
    iyi = client.get("/api/v1/assets?status=GOOD", headers=admin_headers).json()
    arizali = client.get("/api/v1/assets?status=BROKEN", headers=admin_headers).json()

    assert iyi["totalCount"] == 1
    assert arizali["totalCount"] == 0


def test_bbox_filtresi(client, admin_headers, ornek_varlik):
    icinde = client.get(
        "/api/v1/assets?bbox=29.0,41.0,29.1,41.2", headers=admin_headers
    ).json()
    disinda = client.get(
        "/api/v1/assets?bbox=30.0,42.0,30.1,42.2", headers=admin_headers
    ).json()

    assert icinde["totalCount"] == 1
    assert disinda["totalCount"] == 0


def test_bozuk_bbox_422(client, admin_headers):
    yanit = client.get("/api/v1/assets?bbox=1,2,3", headers=admin_headers)
    assert yanit.status_code == 422


def test_turkce_arama_aksansiz_calisir(client, admin_headers, ornek_varlik):
    """unaccent sayesinde "cinar" yazınca "Çınar" bulunuyor."""
    yanit = client.get("/api/v1/assets?q=cinar", headers=admin_headers).json()
    assert yanit["totalCount"] == 1
