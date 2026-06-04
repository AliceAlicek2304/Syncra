import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  base: '/Syncra/',
  server: {
    proxy: {
      '/Syncra/api': {
        target: 'http://localhost:5260',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/Syncra\/api/, '/api'),
        ws: true,
      }
    }
  }
})

