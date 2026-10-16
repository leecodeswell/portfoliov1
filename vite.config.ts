import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  // GitHub Pages serves the repo at /portfoliov1/ (npm run build:pages); dev and preview stay at /
  base: mode === 'pages' ? '/portfoliov1/' : '/',
  plugins: [react()],
  server: { port: 5173 },
  preview: { port: 5173 },
}))
