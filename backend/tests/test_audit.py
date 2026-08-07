"""Denetim kaydı testleri.

Denetim izinin tek işi, işler ters gittiğinde "kim yaptı?" sorusuna cevap
vermektir. Bu yüzden testler de tam olarak o soruyu kovalıyor.
"""

from __future__ import annotations

from app.models.audit import AuditAction, AuditLog


def _varlik_olustur(client, headers, ad="Denetim Çınarı"):
    yanit = client.post(
        "/api/v1/assets",
        headers=headers,
        json={
            "name": ad,
            "type": "TREE",
            "status": "GOOD",
            "latitude": 41.105,
            "longitude": 29.027,
        },
    )
    assert yanit.status_code == 201, yanit.text
    return yanit.json()["id"]


def test_silinen_varligin_izi_kalir(client, db, admin_headers, sariyer):
    """Varlık silinse bile denetim kaydı durmalı.

    Neyi koruyor: bu projedeki asıl soru buydu — "1475 varlık silindi, kim
    sildi?". `entity_id` bir ForeignKey'e çevrilirse veritabanı bu kaydı da
    siler ve soru cevapsız kalır. Bu test o değişikliği yakalar.
    """
    asset_id = _varlik_olustur(client, admin_headers)

    silme = client.delete(f"/api/v1/assets/{asset_id}", headers=admin_headers)
    assert silme.status_code == 204

    # Varlık gerçekten gitti
    assert client.get(f"/api/v1/assets/{asset_id}", headers=admin_headers).status_code == 404

    # Ama izi duruyor
    izler = client.get(f"/api/v1/audit/asset/{asset_id}", headers=admin_headers).json()
    eylemler = [i["action"] for i in izler]
    assert "DELETE" in eylemler
    assert "CREATE" in eylemler


def test_silme_kaydinda_varligin_adi_yaziyor(client, db, admin_headers, sariyer):
    """Denetim kaydı, kaydın adını da saklamalı.

    Neyi koruyor: sadece kimlik numarası saklasaydık, kayıt silindikten sonra
    denetim satırı "bir şey silindi" demekten öteye geçmezdi — okunamaz bir iz
    hiç iz tutmamakla neredeyse aynı şeydir.
    """
    asset_id = _varlik_olustur(client, admin_headers, ad="Kayıp Ihlamur")
    client.delete(f"/api/v1/assets/{asset_id}", headers=admin_headers)

    kayit = db.query(AuditLog).filter_by(
        entity_id=str(asset_id), action=AuditAction.DELETE
    ).one()
    assert "Kayıp Ihlamur" in kayit.summary


def test_kullanici_adi_kayda_kopyalanir(client, db, admin_headers, sariyer):
    """username, ilişkiye değil kaydın kendisine yazılmalı.

    Neyi koruyor: sadece user_id tutsaydık, hesap silindiğinde (SET NULL)
    denetim kaydı "bilinmeyen biri" hâline gelirdi.
    """
    asset_id = _varlik_olustur(client, admin_headers)
    kayit = db.query(AuditLog).filter_by(entity_id=str(asset_id)).first()
    assert kayit.username == "test_admin"
    assert kayit.user_id is not None


def test_saha_denetim_kayitlarini_goremez(client, saha_headers):
    """Denetim kayıtları yalnızca yöneticiye açık.

    Neyi koruyor: kayıtlarda IP adresi var — bu kişisel veridir (KVKK).
    Ayrıca denetim izini görebilen biri, denetimden nasıl kaçacağını da görür.
    """
    assert client.get("/api/v1/audit", headers=saha_headers).status_code == 403


def test_toplu_silme_tek_satirda_ozetlenir(client, db, admin_headers, sariyer):
    """Toplu işlemler de kaydedilmeli.

    Neyi koruyor: en büyük veri kaybı riski toplu işlemlerde. Tek tek silmeyi
    kaydedip toplu silmeyi atlamak, tam da en tehlikeli yolu izsiz bırakırdı.
    """
    idler = [_varlik_olustur(client, admin_headers, ad=f"Toplu {i}") for i in range(3)]

    yanit = client.post(
        "/api/v1/assets/bulk/delete", headers=admin_headers, json={"ids": idler}
    )
    assert yanit.status_code == 200
    assert yanit.json()["affected"] == 3

    kayit = (
        db.query(AuditLog)
        .filter_by(action=AuditAction.BULK_DELETE)
        .order_by(AuditLog.id.desc())
        .first()
    )
    assert kayit is not None
    assert "3" in kayit.summary
