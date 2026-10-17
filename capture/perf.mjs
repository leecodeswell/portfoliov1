// Load-and-frame-rate check for a build: node capture/perf.mjs [url] [screenshot.png]
// Reports when the loader lifts, what downloaded by then, and the frame rate on the desk and with the book open.
import { chromium } from 'playwright'

const url = process.argv[2] ?? 'http://localhost:4174/'
const shot = process.argv[3]
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 })
const t0 = Date.now()
await page.goto(url)
await page.waitForSelector('.loader:not(.show)', { state: 'attached', timeout: 120000 })
const lifted = (Date.now() - t0) / 1000
const fps = () =>
  page.evaluate(
    () =>
      new Promise((r) => {
        let n = 0
        const t = performance.now()
        const f = () => (++n, performance.now() - t < 2000 ? requestAnimationFrame(f) : r(n / 2))
        requestAnimationFrame(f)
      }),
  )
const deskFps = await fps()
const mb = await page.evaluate(() => Math.round(performance.getEntriesByType('resource').reduce((a, e) => a + (e.transferSize || e.encodedBodySize), 0) / 1e5) / 10)
await page.mouse.click(800, 520) // open the book
await page.waitForTimeout(2500)
await page.mouse.click(1150, 450) // to the cologne spread
await page.waitForTimeout(3000)
const openFps = await fps()
if (shot) await page.screenshot({ path: shot })
const clips = await page.evaluate(() => performance.getEntriesByType('resource').filter((e) => e.name.endsWith('.mp4')).map((e) => e.name.split('/').pop()))
console.log(JSON.stringify({ loaderLiftedS: lifted, downloadedMB: mb, deskFps, openFps, clipsFetched: clips }))
await browser.close()
