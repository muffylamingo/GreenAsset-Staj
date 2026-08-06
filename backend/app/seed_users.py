"""Demo kullanıcılarını oluşturur.

Çalıştırma:
    docker compose exec backend python -m app.seed_users

⚠️ Buradaki parolalar SADECE geliştirme/demo içindir. Gerçek bir kurulumda
kullanıcılar bu script'le değil, bir yönetici arayüzünden oluşturulmalı ve
parolalar kullanıcı tarafından belirlenmelidir.
"""

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import parola_ozetle
from app.models.user import User, UserRole

DEMO_KULLANICILAR = [
    {
        "username": "admin",
        "full_name": "Sistem Yöneticisi",
        "password": "admin123",
        "role": UserRole.ADMIN,
    },
    {
        "username": "saha",
        "full_name": "Saha Ekibi 3",
        "password": "saha123",
        "role": UserRole.FIELD,
    },
]


def main() -> None:
    with SessionLocal() as db:
        for veri in DEMO_KULLANICILAR:
            mevcut = db.scalar(select(User).where(User.username == veri["username"]))
            if mevcut:
                # Parolayı tazele — demo sırasında değiştirilmiş olabilir
                mevcut.password_hash = parola_ozetle(veri["password"])
                mevcut.role = veri["role"]
                mevcut.is_active = True
                print(f"  {veri['username']:<8} güncellendi ({veri['role'].value})")
                continue

            db.add(
                User(
                    username=veri["username"],
                    full_name=veri["full_name"],
                    password_hash=parola_ozetle(veri["password"]),
                    role=veri["role"],
                )
            )
            print(f"  {veri['username']:<8} oluşturuldu ({veri['role'].value})")

        db.commit()

    print("\n✅ Demo hesapları hazır:")
    print("   admin / admin123  → yönetici (silebilir)")
    print("   saha  / saha123   → saha ekibi (silemez)")


if __name__ == "__main__":
    main()
