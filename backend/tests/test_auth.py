"""Kimlik doğrulama ve yetkilendirme testleri.

Bu dosya projedeki en kritik testleri içeriyor: "saha ekibi silemez" kuralı
bozulursa veri kaybı yaşanır ve bunu elle fark etmek zordur.
"""

import pytest


def test_giris_basarili(client, admin):
    yanit = client.post(
        "/api/v1/auth/login", data={"username": "test_admin", "password": "admin123"}
    )
    assert yanit.status_code == 200

    veri = yanit.json()
    assert veri["token_type"] == "bearer"
    assert veri["user"]["role"] == "ADMIN"
    assert veri["access_token"]
    # Parola özeti yanıtta ASLA olmamalı
    assert "password_hash" not in veri["user"]


def test_yanlis_parola_401(client, admin):
    yanit = client.post(
        "/api/v1/auth/login", data={"username": "test_admin", "password": "yanlis"}
    )
    assert yanit.status_code == 401


def test_olmayan_kullanici_ayni_mesaji_doner(client, admin):
    """Kullanıcı sayımını (user enumeration) engelleyen davranış.

    "Kullanıcı yok" ile "parola yanlış" farklı mesaj dönseydi, saldırgan
    hangi kullanıcı adlarının var olduğunu tek tek deneyerek öğrenebilirdi.
    """
    yok = client.post(
        "/api/v1/auth/login", data={"username": "olmayan", "password": "x"}
    )
    yanlis = client.post(
        "/api/v1/auth/login", data={"username": "test_admin", "password": "yanlis"}
    )

    assert yok.status_code == yanlis.status_code == 401
    assert yok.json()["detail"] == yanlis.json()["detail"]


def test_tokensiz_istek_401(client):
    assert client.get("/api/v1/assets").status_code == 401


def test_bozuk_token_401(client):
    yanit = client.get(
        "/api/v1/assets", headers={"Authorization": "Bearer uydurma.token.degeri"}
    )
    assert yanit.status_code == 401


def test_me_kullaniciyi_doner(client, saha_headers):
    yanit = client.get("/api/v1/auth/me", headers=saha_headers)
    assert yanit.status_code == 200
    assert yanit.json()["username"] == "test_saha"
    assert yanit.json()["role"] == "FIELD"


# ---------------------------------------------------------------------------
# Yetkilendirme — projenin en kritik kuralları
# ---------------------------------------------------------------------------
def test_saha_varlik_ekleyebilir(client, saha_headers, sariyer):
    yanit = client.post(
        "/api/v1/assets",
        headers=saha_headers,
        json={
            "name": "Saha ekibi ekledi",
            "type": "TREE",
            "latitude": 41.105,
            "longitude": 29.027,
        },
    )
    assert yanit.status_code == 201


def test_saha_SILEMEZ_403(client, saha_headers, ornek_varlik):
    """Saha ekibi silme yetkisi olmadığını sunucudan öğrenmeli.

    Arayüzde butonu gizlemek yeterli değil — istemci kodu değiştirilebilir.
    """
    yanit = client.delete(
        f"/api/v1/assets/{ornek_varlik.id}", headers=saha_headers
    )
    assert yanit.status_code == 403


def test_saha_toplu_silemez_403(client, saha_headers, ornek_varlik):
    yanit = client.post(
        "/api/v1/assets/bulk/delete",
        headers=saha_headers,
        json={"ids": [str(ornek_varlik.id)]},
    )
    assert yanit.status_code == 403


def test_admin_silebilir(client, admin_headers, ornek_varlik):
    yanit = client.delete(
        f"/api/v1/assets/{ornek_varlik.id}", headers=admin_headers
    )
    assert yanit.status_code == 204

    # Gerçekten silindi mi?
    kontrol = client.get(f"/api/v1/assets/{ornek_varlik.id}", headers=admin_headers)
    assert kontrol.status_code == 404


@pytest.mark.parametrize(
    "yol",
    ["/api/v1/assets", "/api/v1/districts", "/api/v1/stats/summary"],
)
def test_korumali_uclar_token_istiyor(client, yol):
    """Yeni bir uç eklenip koruması unutulursa bu test yakalar."""
    assert client.get(yol).status_code == 401
