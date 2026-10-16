import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(() => ({
  // GitHub Pages serves the site at the root of its custom domain, ares-web.com (public/CNAME)
  base: '/',
  plugins: [react()],
  server: { port: 5173 },
  preview: { port: 5173 },
}))
