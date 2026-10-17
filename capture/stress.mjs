// Cursor stress test for page clips (dev server: it exposes window.__clips).
//   node capture/stress.mjs [url] [spread] [side L|R]
// Plays the clip on one page, then: a steady hover, fast scribbling across the page, and rapid
// on/off flicks. For each phase: frame-time spikes, and how evenly the video's frames were presented.
import { chromium } from 'playwright'

const url = process.argv[2] ?? 'http://localhost:5173/'
const spread = Number(process.argv[3] ?? 3)
const side = process.argv[4] ?? 'R'
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
await page.goto(url)
await page.waitForSelector('.loader:not(.show)', { state: 'attached', timeout: 120000 })
await page.waitForTimeout(1500)
await page.mouse.click(800, 520)
await page.waitForTimeout(3000)
for (let s = 1; s < spread; s++) {
  await page.mouse.click(1150, 480)
  await page.waitForTimeout(2500)
}
await page.waitForTimeout(8000) // let the clip queue fetch this spread's clips
const P = side === 'R' ? { x: 1150, y: 480 } : { x: 450, y: 480 }

// recorder: every animation frame's duration, and every presented frame of each playing clip
await page.evaluate(() => {
  const w = window
  w.__rec = { raf: [], vf: {} }
  const loop = (t) => {
    const r = w.__rec
    if (r.last) r.raf.push(t - r.last)
    r.last = t
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
  for (const [src, v] of w.__clips.entries()) {
    const name = src.split('/').pop()
    const cb = (now, meta) => {
      if (!v.paused) (w.__rec.vf[name] ??= []).push([now, meta.mediaTime, meta.presentedFrames])
      v.requestVideoFrameCallback(cb)
    }
    v.requestVideoFrameCallback(cb)
  }
})
const take = () =>
  page.evaluate(() => {
    const r = window.__rec
    const raf = r.raf.splice(0)
    const sorted = [...raf].sort((a, b) => a - b)
    const clips = {}
    for (const [name, list] of Object.entries(r.vf)) {
      const vf = list.splice(0)
      if (vf.length < 2) continue
      // wall-clock gaps between presented frames (a 60 fps clip should be ~16.7 ms), and frames the
      // compositor skipped (presentedFrames jumping by more than 1)
      const wall = vf.slice(1).map((f, i) => f[0] - vf[i][0])
      const skipped = vf.slice(1).reduce((a, f, i) => a + Math.max(0, f[2] - vf[i][2] - 1), 0)
      clips[name] = {
        presented: vf.length,
        stallsOver50ms: wall.filter((d) => d > 50).length,
        worstStallMs: Math.round(Math.max(...wall)),
        skipped,
      }
    }
    return {
      pageFrames: raf.length,
      p50ms: +sorted[Math.floor(sorted.length / 2)]?.toFixed(1),
      worstMs: +sorted.at(-1)?.toFixed(1),
      pageOver50ms: raf.filter((d) => d > 50).length,
      clips,
    }
  })

const results = {}
await page.mouse.move(P.x, P.y)
await page.waitForTimeout(1500)
await take()
await page.waitForTimeout(3000)
results.steady = await take()
for (let i = 0; i < 120; i++) {
  await page.mouse.move(P.x + Math.sin(i * 0.7) * 220, P.y + Math.cos(i * 1.3) * 110)
  await page.waitForTimeout(25)
}
results.scribble = await take()
for (let i = 0; i < 12; i++) {
  await page.mouse.move(P.x, P.y)
  await page.waitForTimeout(150 + (i % 3) * 120)
  await page.mouse.move(800, 860)
  await page.waitForTimeout(120 + (i % 2) * 200)
}
await page.mouse.move(P.x, P.y)
await page.waitForTimeout(2500)
results.flicks = await take()
console.log(JSON.stringify({ spread, side, ...results }))
await browser.close()
