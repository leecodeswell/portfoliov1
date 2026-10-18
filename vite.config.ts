import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Content Security Policy for the published site (GitHub Pages can't send headers, so it rides in a
 * meta tag). Scripts only from this site; styles and fonts also from Google Fonts; nothing else
 * external. Added to production builds only: the dev server relies on inline scripts.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'", // wasm: the glTF loader's mesh decoder (not JS eval)
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // React sets inline styles
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:", // textures embedded in the glTF load as blobs
  "media-src 'self' blob:",
  "connect-src 'self' blob: data:",
  "worker-src 'self' blob:",
  "frame-src 'self'", // the live cologne page
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'", // the contact form only opens the visitor's mail app
].join('; ')

const securityMeta = (): Plugin => ({
  name: 'security-meta',
  apply: 'build',
  transformIndexHtml: () => [
    { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' },
    { tag: 'meta', attrs: { name: 'referrer', content: 'strict-origin-when-cross-origin' }, injectTo: 'head-prepend' },
  ],
})

export default defineConfig(({ command }) => ({
  // Builds are served at ares-web.com/desk/ (the domain's root is the hub page in hub/, see scripts/deploy.mjs).
  // The dev server stays at the root.
  base: command === 'build' ? '/desk/' : '/',
  plugins: [react(), securityMeta()],
  server: { port: 5173 },
  preview: { port: 5173 },
}))
