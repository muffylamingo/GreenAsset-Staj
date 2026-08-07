"""İstek hızı sınırı testleri.

Bu dosya, conftest'in kapattığı sınırı BİLEREK geri açar; amacı zaten
sınırın çalıştığını doğrulamak.
"""

from __future__ import annotations

import pytest

from app.core.limiter import istemci_adresi, limiter


@pytest.fixture
def hiz_siniri_acik():
    """Sınırı bu test için açar ve sayaçları sıfırlar.

    Sayaçları sıfırlamak şart: başka testler zaten giriş yapmış olabilir ve
    o denemeler bu testin bütçesinden yerdi.
    """
    limiter.enabled = True
    limiter.reset()
    yield
    limiter.reset()
    limiter.enabled = False


def test_login_kaba_kuvvete_kapali(client, admin, hiz_siniri_acik):
    """Dakikada 10 denemeden sonrası 429 dönmeli.

    Neyi koruyor: sınır kalkarsa saldırgan saniyede yüzlerce parola
    deneyebilir. Bu, "parolamız güçlü" varsayımına dayanmayan tek savunmadır.
    """
    kodlar = [
        client.post(
            "/api/v1/auth/login",
            data={"username": "test_admin", "password": "YANLIS"},
        ).status_code
        for _ in range(12)
    ]

    assert kodlar[:10] == [401] * 10, f"ilk 10 deneme 401 olmalıydı: {kodlar}"
    assert 429 in kodlar[10:], f"11. denemeden sonra 429 beklenirdi: {kodlar}"


def test_dogru_parola_da_sinira_tabi(client, admin, hiz_siniri_acik):
    """Sayaç başarılı/başarısız ayrımı yapmaz.

    Neyi koruyor: sadece başarısız denemeleri saysaydık, saldırgan
    denemelerin arasına bildiği bir hesapla doğru giriş serpiştirerek
    sayacı sıfırlatabilirdi.
    """
    for _ in range(10):
        client.post(
            "/api/v1/auth/login",
            data={"username": "test_admin", "password": "admin123"},
        )

    yanit = client.post(
        "/api/v1/auth/login", data={"username": "test_admin", "password": "admin123"}
    )
    assert yanit.status_code == 429


def test_proxy_arkasinda_gercek_ip_kullanilir():
    """X-Forwarded-For'un SON parçası alınmalı.

    Neyi koruyor: baştaki parçayı alsaydık saldırgan başlığa sahte IP yazıp
    her istekte yeni kimlikmiş gibi görünür, sınırı tamamen atlardı.
    Nginx kendi gördüğü gerçek IP'yi listenin sonuna ekler.
    """

    class SahteIstek:
        def __init__(self, xff):
            self.headers = {"X-Forwarded-For": xff} if xff else {}

    # Saldırgan başa "1.2.3.4" yazmış; Nginx sona gerçek IP'yi eklemiş.
    assert istemci_adresi(SahteIstek("1.2.3.4, 203.0.113.9")) == "203.0.113.9"
    assert istemci_adresi(SahteIstek("203.0.113.9")) == "203.0.113.9"
