// Map a site's scroll positions: node capture/map.mjs <name> <url> <y1,y2,...>
import { chromium } from 'playwright'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
const [name, url, ys] = process.argv.slice(2)
const out = path.join(os.tmpdir(), 'pfref', 'map', name)
fs.mkdirSync(out, { recursive: true })
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 1920, height: 1135 } })
await p.goto(url, { waitUntil: 'networkidle' })
await p.waitForTimeout(2500)
await p.mouse.move(960, 560)
for (const y of ys.split(',').map(Number)) {
  for (let i = 0; i < 200; i++) {
    const cur = await p.evaluate(() => scrollY)
    if (Math.abs(y - cur) < 15) break
    await p.mouse.wheel(0, Math.sign(y - cur) * Math.min(300, Math.abs(y - cur) * 1.6))
    await p.waitForTimeout(40)
  }
  await p.waitForTimeout(2500)
  await p.screenshot({ path: `${out}/y${String(y).padStart(5, '0')}.jpg`, quality: 60 })
}
await b.close()
