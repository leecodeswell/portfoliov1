// Usage: node capture/explore.mjs <name> <url> [steps] [stepPx]
import { chromium } from 'playwright'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
const [name, url, steps = '10', stepPx = '900'] = process.argv.slice(2)
const out = path.join(os.tmpdir(), 'pfref', 'explore', name)
fs.mkdirSync(out, { recursive: true })
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 1920, height: 1135 } })
p.on('console', (m) => m.type() === 'error' && console.log('console error:', m.text().slice(0, 160)))
await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
const info = await p.evaluate(() => ({ h: document.documentElement.scrollHeight, title: document.title, canvases: document.querySelectorAll('canvas').length }))
console.log(name, JSON.stringify(info))
for (let t = 0; t < 4; t++) { await p.waitForTimeout(1500); await p.screenshot({ path: `${out}/t${t}.jpg`, quality: 70 }) }
await p.mouse.move(960, 560)
for (let i = 0; i < +steps; i++) {
  for (let k = 0; k < 6; k++) { await p.mouse.wheel(0, +stepPx / 6); await p.waitForTimeout(60) }
  await p.waitForTimeout(1400)
  await p.screenshot({ path: `${out}/s${String(i).padStart(2, '0')}.jpg`, quality: 70 })
}
console.log('scrollY end', await p.evaluate(() => scrollY))
await b.close()
