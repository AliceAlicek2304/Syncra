import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/Syncra/',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5260',
        changeOrigin: true,
      },
    },
  },
})
