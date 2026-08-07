"""Bakım geçmişi testleri — 1-N ilişki ve türetilen alanlar."""


def test_bakim_kaydi_ekleme(client, saha_headers, ornek_varlik):
    yanit = client.post(
        f"/api/v1/assets/{ornek_varlik.id}/logs",
        headers=saha_headers,
        json={"note": "Budama yapıldı", "performed_by": "Saha Ekibi 3"},
    )
    assert yanit.status_code == 201
    assert yanit.json()["note"] == "Budama yapıldı"


def test_status_after_varligin_durumunu_gunceller(
    client, admin_headers, ornek_varlik
):
    """Tek işlemde hem kayıt açılıyor hem durum değişiyor."""
    client.post(
        f"/api/v1/assets/{ornek_varlik.id}/logs",
        headers=admin_headers,
        json={
            "note": "Ampul değiştirildi",
            "performed_by": "Elektrik Ekibi",
            "status_after": "BROKEN",
        },
    )

    varlik = client.get(
        f"/api/v1/assets/{ornek_varlik.id}", headers=admin_headers
    ).json()
    assert varlik["status"] == "BROKEN"


def test_status_after_verilmezse_durum_degismez(client, admin_headers, ornek_varlik):
    client.post(
        f"/api/v1/assets/{ornek_varlik.id}/logs",
        headers=admin_headers,
        json={"note": "Kontrol edildi, sorun yok", "performed_by": "Saha"},
    )

    varlik = client.get(
        f"/api/v1/assets/{ornek_varlik.id}", headers=admin_headers
    ).json()
    assert varlik["status"] == "GOOD"  # başlangıç durumu korundu


def test_gecmis_yeniden_eskiye_sirali(client, admin_headers, ornek_varlik):
    for not_metni in ["Birinci", "İkinci", "Üçüncü"]:
        client.post(
            f"/api/v1/assets/{ornek_varlik.id}/logs",
            headers=admin_headers,
            json={"note": not_metni, "performed_by": "Test"},
        )

    kayitlar = client.get(
        f"/api/v1/assets/{ornek_varlik.id}/logs", headers=admin_headers
    ).json()

    assert len(kayitlar) == 3
    tarihler = [k["performed_at"] for k in kayitlar]
    assert tarihler == sorted(tarihler, reverse=True)


def test_hic_bakim_yoksa_null_doner(client, admin_headers, ornek_varlik):
    """"0 gün" DEĞİL null — "0 gün" "bugün bakıldı" gibi okunurdu."""
    varlik = client.get(
        f"/api/v1/assets/{ornek_varlik.id}", headers=admin_headers
    ).json()

    assert varlik["last_maintenance_at"] is None
    assert varlik["days_since_maintenance"] is None


def test_bakim_sonrasi_gun_sayisi_hesaplanir(client, admin_headers, ornek_varlik):
    client.post(
        f"/api/v1/assets/{ornek_varlik.id}/logs",
        headers=admin_headers,
        json={"note": "Bugün yapıldı", "performed_by": "Test"},
    )

    varlik = client.get(
        f"/api/v1/assets/{ornek_varlik.id}", headers=admin_headers
    ).json()

    assert varlik["last_maintenance_at"] is not None
    assert varlik["days_since_maintenance"] == 0


def test_varlik_silinince_kayitlari_da_silinir(
    client, admin_headers, ornek_varlik, db
):
    """ON DELETE CASCADE — veritabanı seviyesinde."""
    from sqlalchemy import text

    client.post(
        f"/api/v1/assets/{ornek_varlik.id}/logs",
        headers=admin_headers,
        json={"note": "Silinecek", "performed_by": "Test"},
    )

    once = db.execute(
        text("SELECT COUNT(*) FROM maintenance_logs WHERE asset_id = :id"),
        {"id": ornek_varlik.id},
    ).scalar()
    assert once == 1

    client.delete(f"/api/v1/assets/{ornek_varlik.id}", headers=admin_headers)

    sonra = db.execute(
        text("SELECT COUNT(*) FROM maintenance_logs WHERE asset_id = :id"),
        {"id": ornek_varlik.id},
    ).scalar()
    assert sonra == 0


def test_saha_bakim_kaydi_silemez_403(client, saha_headers, admin_headers, ornek_varlik):
    kayit = client.post(
        f"/api/v1/assets/{ornek_varlik.id}/logs",
        headers=saha_headers,
        json={"note": "Silinemeyecek", "performed_by": "Saha"},
    ).json()

    saha_denemesi = client.delete(
        f"/api/v1/maintenance/{kayit['id']}", headers=saha_headers
    )
    assert saha_denemesi.status_code == 403

    admin_denemesi = client.delete(
        f"/api/v1/maintenance/{kayit['id']}", headers=admin_headers
    )
    assert admin_denemesi.status_code == 204


def test_bos_not_422(client, admin_headers, ornek_varlik):
    yanit = client.post(
        f"/api/v1/assets/{ornek_varlik.id}/logs",
        headers=admin_headers,
        json={"note": "   ", "performed_by": "Test"},
    )
    assert yanit.status_code == 422


def test_olmayan_varliga_kayit_404(client, admin_headers):
    yanit = client.post(
        "/api/v1/assets/00000000-0000-0000-0000-000000000000/logs",
        headers=admin_headers,
        json={"note": "Test", "performed_by": "Test"},
    )
    assert yanit.status_code == 404
