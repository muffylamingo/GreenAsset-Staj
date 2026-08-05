import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true, // Docker içinden de erişilebilsin
    proxy: {
      // Geliştirmede /api istekleri backend'e yönlendirilir.
      // Böylece tarayıcı her şeyi aynı origin'den görür → CORS derdi yaşamayız.
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
