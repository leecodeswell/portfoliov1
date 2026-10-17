// Spread-by-spread check of a build: node capture/tour.mjs [url] [outDir]
// Opens the book, visits every spread, and on each one screenshots it and hovers both pages to see
// whether their clips play: s<n><L|R>-a/-b.png are two frames of the hovered page a second apart.
import { chromium } from 'playwright'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const url = process.argv[2] ?? 'http://localhost:4174/'
const out = process.argv[3] ?? path.join(os.tmpdir(), 'ares-tour')
fs.mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
await page.goto(url)
await page.waitForSelector('.loader:not(.show)', { state: 'attached', timeout: 120000 })
await page.waitForTimeout(1500)
await page.mouse.click(800, 520) // open
await page.waitForTimeout(3000)

const L = { x: 450, y: 480 }
const R = { x: 1150, y: 480 }
// region of a page, for comparing frames
const box = (p) => ({ x: p.x - 250, y: p.y - 120, width: 500, height: 240 })
// two frames of a hovered page a second apart, saved for comparison (the camera sways gently, so
// compare how much they differ against a page with no clip, rather than whether they differ)
async function frames(p, name) {
  await page.mouse.move(p.x, p.y)
  await page.waitForTimeout(2500)
  await page.screenshot({ clip: box(p), path: path.join(out, `${name}-a.png`) })
  await page.waitForTimeout(1000)
  await page.screenshot({ clip: box(p), path: path.join(out, `${name}-b.png`) })
}

for (let spread = 1; spread <= 5; spread++) {
  await page.mouse.move(800, 860) // off the book
  await page.waitForTimeout(1200)
  await page.screenshot({ path: path.join(out, `spread${spread}.png`) })
  await frames(L, `s${spread}L`)
  await frames(R, `s${spread}R`)
  await page.mouse.click(R.x, R.y) // next spread
  await page.waitForTimeout(2500)
}
console.log('screenshots in', out)
await browser.close()
