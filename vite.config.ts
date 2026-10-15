import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * The portfolio pages embed the live project sites. In production everything is served from
 * leecodeswell.github.io, so the sites share the portfolio's origin; in dev the same paths are
 * proxied there, which keeps them same-origin (scriptable: seeded scroll, scrollbars hidden).
 */
const SITES = ['/cologne', '/3Dexample', '/LuxuryCar']
const proxy = {
  ...Object.fromEntries(SITES.map((p) => [p, { target: 'https://leecodeswell.github.io', changeOrigin: true, secure: true }])),
  // Ares lives on its own domain (always cross-origin in production; proxied here for parity)
  '/ares-web': { target: 'https://ares-web.com', changeOrigin: true, secure: true, rewrite: (p: string) => p.replace(/^\/ares-web/, '') },
}

export default defineConfig({ plugins: [react()], server: { proxy } })
