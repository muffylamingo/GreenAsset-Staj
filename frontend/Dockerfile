# ============================================================
#  GreenAsset Frontend — çok aşamalı (multi-stage) derleme
#
#  1. aşama: Node ile derle (React → statik HTML/CSS/JS)
#  2. aşama: Nginx ile servis et
#
#  Neden iki aşama? Node imajı ~400 MB, içinde derleyici ve tüm
#  node_modules var. Ama üretimde bunların hiçbiri gerekmiyor —
#  sadece derlenmiş dosyalar lazım. Nginx imajı ~50 MB.
#  Sonuç: 8 kat küçük imaj ve saldırı yüzeyi.
# ============================================================

# ---------- 1. AŞAMA: derleme ----------
FROM node:22-alpine AS build

WORKDIR /app

# Önce SADECE bağımlılık dosyaları kopyalanır.
# Kaynak kod değişince npm ci tekrar çalışmaz (Docker katman önbelleği).
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- 2. AŞAMA: servis ----------
FROM nginx:alpine

# Sadece derlenmiş çıktı taşınıyor — kaynak kod, node_modules, hiçbiri yok
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY security-headers.conf /etc/nginx/security-headers.conf
COPY security-headers-docs.conf /etc/nginx/security-headers-docs.conf

EXPOSE 80

# Nginx'in kendi sağlık kontrolü yok; basit bir istekle kontrol ediyoruz.
# Adres 127.0.0.1 — "localhost" yazarsak isim çözümlemesine bağımlı oluruz.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -q --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
