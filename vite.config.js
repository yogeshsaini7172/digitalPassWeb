import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/digitalPassWeb/',
  server: {
    proxy: {
      '/api': {
        target: 'https://digitalpassbackend-dmwz.onrender.com',
        // target: 'http://10.222.29.1:5000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
