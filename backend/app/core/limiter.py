"""İstek hızı sınırı (rate limit).

Neden gerekli?
    Kimlik doğrulama tek başına parola denemesini engellemez. Sınır olmadan
    saldırgan saniyede yüzlerce parola deneyebilir ve zayıf bir parolayı er
    geç bulur. Buna kaba kuvvet (brute force) saldırısı denir ve OWASP
    Top 10'da "Identification and Authentication Failures" başlığı altındadır.

    Bu projede iki katman var:
      - Genel sınır  : her IP için dakikada 300 istek (otomatik taramayı yavaşlatır)
      - Giriş sınırı : /auth/login için dakikada 10 deneme (asıl koruma)

    Sınır aşılınca 429 "Too Many Requests" döner.
"""

from __future__ import annotations

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address


def istemci_adresi(request: Request) -> str:
    """İsteği gerçekten atan istemcinin IP'sini bulur.

    TUZAK: Uygulama Nginx'in arkasında çalışıyor. Doğrudan bakarsak her
    isteğin kaynağı Nginx'in IP'si görünür — yani BÜTÜN kullanıcılar tek bir
    sayaçta toplanır. O zaman bir kişi sınırı doldurunca herkes kilitlenir,
    saldırgan da tek başına kimseyi engellemeden devam eder. Yani sınır hem
    işe yaramaz hem de zarar verir.

    Nginx `X-Forwarded-For` başlığını şöyle kurar:
        <istemcinin gönderdiği değer>, <Nginx'in gerçekten gördüğü IP>

    Baştaki kısım istemciden geldiği için TAKLİT EDİLEBİLİR; saldırgan
    oraya rastgele IP yazıp her istekte yeni bir kimlikmiş gibi görünebilir.
    Güvenilir olan tek parça, Nginx'in kendi eklediği SONUNCU değerdir.
    """
    iletilen = request.headers.get("X-Forwarded-For")
    if iletilen:
        return iletilen.split(",")[-1].strip()
    return get_remote_address(request)


limiter = Limiter(
    key_func=istemci_adresi,
    default_limits=["300/minute"],
    # Sayaç bellekte tutuluyor. Tek kopya (single instance) için yeterli;
    # birden fazla kopya çalıştırılacaksa Redis'e taşınmalı, yoksa her kopya
    # kendi sayacını tutar ve gerçek sınır kopya sayısıyla çarpılır.
    storage_uri="memory://",
)
