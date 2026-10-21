import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      // Foto kegiatan terverifikasi (object storage, disajikan backend lewat /media/verified/...)
      '/media': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      // URL foto format lama — dialihkan backend ke /media/verified/...
      '^/database(%20| )foto': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
