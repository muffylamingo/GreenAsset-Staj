"""Mekansal sorgu testleri — projenin PostGIS'e en çok yaslandığı kısım."""

import pytest

# İTÜ Ayazağa çevresini kapsayan dikdörtgen
KAPSAYAN_POLIGON = {
    "type": "Polygon",
    "coordinates": [
        [
            [29.00, 41.08],
            [29.10, 41.08],
            [29.10, 41.20],
            [29.00, 41.20],
            [29.00, 41.08],
        ]
    ],
}

# Başka bir yerde, hiçbir varlığı kapsamayan dikdörtgen
UZAK_POLIGON = {
    "type": "Polygon",
    "coordinates": [
        [
            [32.00, 39.00],
            [32.10, 39.00],
            [32.10, 39.10],
            [32.00, 39.10],
            [32.00, 39.00],
        ]
    ],
}


def test_ST_Within_icindeki_varligi_bulur(client, admin_headers, ornek_varlik):
    yanit = client.post(
        "/api/v1/assets/within", headers=admin_headers, json={"polygon": KAPSAYAN_POLIGON}
    )
    assert yanit.status_code == 200

    veri = yanit.json()
    assert veri["totalCount"] == 1
    assert veri["countsByStatus"]["GOOD"] == 1
    assert veri["countsByType"]["TREE"] == 1


def test_ST_Within_disaridakini_getirmez(client, admin_headers, ornek_varlik):
    yanit = client.post(
        "/api/v1/assets/within", headers=admin_headers, json={"polygon": UZAK_POLIGON}
    )
    assert yanit.json()["totalCount"] == 0


def test_ST_Within_filtreyle_birlikte(client, admin_headers, ornek_varlik):
    """Poligon içindeki varlıklar ayrıca duruma göre süzülebilmeli."""
    iyi = client.post(
        "/api/v1/assets/within",
        headers=admin_headers,
        json={"polygon": KAPSAYAN_POLIGON, "statuses": ["GOOD"]},
    ).json()
    arizali = client.post(
        "/api/v1/assets/within",
        headers=admin_headers,
        json={"polygon": KAPSAYAN_POLIGON, "statuses": ["BROKEN"]},
    ).json()

    assert iyi["totalCount"] == 1
    assert arizali["totalCount"] == 0


def test_gecersiz_geometri_tipi_422(client, admin_headers):
    yanit = client.post(
        "/api/v1/assets/within",
        headers=admin_headers,
        json={"polygon": {"type": "Point", "coordinates": [29.0, 41.1]}},
    )
    assert yanit.status_code == 422


# ---------------------------------------------------------------------------
# ST_DWithin — metre/derece tuzağının testi
# ---------------------------------------------------------------------------
def test_ST_DWithin_yarıcap_metre_cinsinden(client, admin_headers, ornek_varlik):
    """En kritik mekansal test.

    geometry SRID 4326 ve birimi DERECE. Backend `::geography` cast'i
    yapmasaydı radius=100 "100 derece" anlamına gelirdi ve tüm dünya dönerdi.

    Varlık (29.027, 41.105) noktasında. 100 m uzaktaki bir noktadan
    arayınca bulunmalı, 10 km uzaktan aranınca 100 m yarıçapta bulunmamalı.
    """
    # Varlığın tam üstünden, küçük yarıçap → bulunmalı
    yakin = client.get(
        "/api/v1/assets/nearby?lat=41.105&lon=29.027&radius=100", headers=admin_headers
    ).json()
    assert yakin["totalCount"] == 1

    # ~40 km uzaktan, 100 m yarıçap → bulunmamalı
    # (cast olmasaydı "100 derece" tüm dünyayı kapsar ve 1 dönerdi)
    uzak = client.get(
        "/api/v1/assets/nearby?lat=41.500&lon=29.027&radius=100", headers=admin_headers
    ).json()
    assert uzak["totalCount"] == 0


def test_ST_DWithin_mesafe_bilgisi_doner(client, admin_headers, ornek_varlik):
    yanit = client.get(
        "/api/v1/assets/nearby?lat=41.105&lon=29.027&radius=1000", headers=admin_headers
    ).json()

    ozellikler = yanit["features"][0]["properties"]
    assert "distance_m" in ozellikler
    # Aynı noktadan arıyoruz, mesafe sıfıra yakın olmalı
    assert ozellikler["distance_m"] < 5


@pytest.mark.parametrize(("lat", "lon"), [(91, 29), (-91, 29), (41, 181), (41, -181)])
def test_nearby_gecersiz_koordinat_422(client, admin_headers, lat, lon):
    yanit = client.get(
        f"/api/v1/assets/nearby?lat={lat}&lon={lon}&radius=500", headers=admin_headers
    )
    assert yanit.status_code == 422
