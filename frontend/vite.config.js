import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true, // port doluysa sessizce 5174'e kaçma, hata ver
    // '0.0.0.0': hem 127.0.0.1 hem localhost çalışsın.
    // `host: true` Windows'ta bazen sadece IPv6'ya (::1) bağlanıyor ve
    // 127.0.0.1 yazan tarayıcı sunucuyu bulamıyor.
    host: '0.0.0.0',
    proxy: {
      // Geliştirmede /api istekleri backend'e yönlendirilir.
      // Böylece tarayıcı her şeyi aynı origin'den görür → CORS derdi yaşamayız.
      // 127.0.0.1 yazıyoruz çünkü Node 'localhost'u ::1'e çözüp
      // IPv4 dinleyen backend'e ulaşamayabiliyor.
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
