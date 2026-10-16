/**
 * Capture book pages from live sites: a sharp 2x still plus a motion loop per shot.
 *
 *   node capture/capture.mjs [shotName ...]     (no names = every shot in capture/shots.mjs)
 *
 * Writes public/pages/<name>.jpg (3840x2270) and public/pages/<name>.mp4 (1920x1134, H.264).
 * The viewport matches the book's page aspect (0.44 : 0.26), so captures fill a page exactly.
 * Rendering runs in headless Chrome on the GPU. Two recording modes:
 *  - `rec`: real-time DevTools screencast (for idle motion like swaying ivy), re-timed by ffmpeg.
 *  - `frames`: deterministic frame-by-frame — set the scroll, let the page settle, screenshot, repeat.
 *    Nothing can stutter, drop or overshoot, whatever the page costs to render; output is 60 fps.
 */
import { chromium } from 'playwright'
import ffmpeg from 'ffmpeg-static'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { shots } from './shots.mjs'

const OUT = path.resolve('public/pages')
const VIEW = { width: 1920, height: 1135 }
fs.mkdirSync(OUT, { recursive: true })

const wanted = process.argv.slice(2)
const todo = wanted.length ? shots.filter((s) => wanted.includes(s.name)) : shots

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--hide-scrollbars'],
})

async function act(page, steps = []) {
  for (const s of steps) {
    if (s.wait) await page.waitForTimeout(s.wait)
    if (s.wheel) {
      // spread the scroll over `ms` in small ticks so smooth-scroll libraries glide
      const ticks = Math.max(1, Math.round((s.ms ?? 1000) / 50))
      for (let i = 0; i < ticks; i++) {
        await page.mouse.wheel(0, s.wheel / ticks)
        await page.waitForTimeout(50)
      }
    }
    if (s.scroll !== undefined) {
      // wheel until the page actually reaches scrollY = s.scroll (smooth-scroll libs rescale wheel deltas)
      const y0 = await page.evaluate(() => scrollY)
      const ticks = Math.max(1, Math.round((s.ms ?? 1000) / 50))
      const per = (s.scroll - y0) / ticks
      const deadline = Date.now() + (s.ms ?? 1000) * 3
      while (Date.now() < deadline) {
        const y = await page.evaluate(() => scrollY)
        const left = s.scroll - y
        if (Math.abs(left) < 15) break
        await page.mouse.wheel(0, Math.sign(left) * Math.min(Math.abs(per) * 1.6, Math.abs(left) * 1.6))
        await page.waitForTimeout(50)
      }
    }
    if (s.mouse) {
      const [[x0, y0], [x1, y1]] = s.mouse
      const n = Math.max(2, Math.round((s.ms ?? 1000) / 33))
      for (let i = 0; i <= n; i++) {
        const t = i / n
        const e = t * t * (3 - 2 * t)
        await page.mouse.move(x0 + (x1 - x0) * e, y0 + (y1 - y0) * e)
        await page.waitForTimeout(33)
      }
    }
  }
}

/** Frames -> H.264. `speed` bakes a playback speed-up into the file; `boomerang` plays forward then back. */
function encode(shot, input, fps) {
  const base = `scale=1920:1134:flags=lanczos,setpts=PTS/${shot.speed ?? 1},fps=${fps}`
  const filter = shot.boomerang
    ? ['-filter_complex', `[0]${base},split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1`]
    : ['-vf', base]
  execFileSync(ffmpeg, [
    '-y', '-loglevel', 'error', ...input, ...filter,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-maxrate', '12M', '-bufsize', '24M',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', `${OUT}/${shot.name}.mp4`,
  ])
}

for (const shot of todo) {
  // `dpr: 1` for very heavy WebGL sites that slow down (and degrade themselves) at 2x
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: shot.dpr ?? 2 })
  const page = await ctx.newPage()
  await page.goto(shot.url, { waitUntil: 'networkidle', timeout: 90000 })
  // `cursor: false` leaves the mouse untouched (some sites react to any pointer movement)
  if (shot.cursor !== false) await page.mouse.move(...(shot.cursor ?? [VIEW.width / 2, VIEW.height / 2]))
  await page.waitForTimeout(shot.settle ?? 2500)
  await act(page, shot.pre)

  if (shot.still === 'before' && !shot.frames) await page.screenshot({ path: `${OUT}/${shot.name}.jpg`, quality: 90, type: 'jpeg' })

  if (shot.frames) {
    const { to, count, settle = 60, method = 'scrollTo', step = 24 } = shot.frames
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `cap-${shot.name}-`))
    const y0 = await page.evaluate(() => scrollY)
    const t0 = Date.now()
    let n = 0
    for (let i = 0; i < count; i++) {
      if (method === 'scrollTo') {
        // ease in and out like a hand on a wheel, but exactly on rails
        const t = i / (count - 1)
        const e = t * t * (3 - 2 * t)
        await page.evaluate((y) => window.scrollTo(0, y), y0 + (to - y0) * e)
      } else {
        // sites that animate scroll themselves: small, even, forward-only wheel steps
        if ((await page.evaluate(() => scrollY)) >= to) break
        await page.mouse.wheel(0, step)
      }
      await page.waitForTimeout(settle)
      await page.screenshot({ path: path.join(dir, `f${String(n++).padStart(5, '0')}.jpg`), quality: 92, type: 'jpeg' })
    }
    // the page's still is exactly the clip's first frame (some sites only light up on the first scroll)
    if (shot.still === 'before') fs.copyFileSync(path.join(dir, 'f00000.jpg'), `${OUT}/${shot.name}.jpg`)
    console.log(`${shot.name}: ${n} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s -> ${(n / 60).toFixed(1)}s at 60 fps`)
    encode(shot, ['-framerate', '60', '-i', path.join(dir, 'f%05d.jpg')], 60)
    fs.rmSync(dir, { recursive: true, force: true })
  }

  if (shot.rec?.length) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `cap-${shot.name}-`))
    const cdp = await ctx.newCDPSession(page)
    const frames = []
    cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
      const file = path.join(dir, `f${String(frames.length).padStart(5, '0')}.jpg`)
      frames.push({ file, t: metadata.timestamp })
      fs.writeFileSync(file, Buffer.from(data, 'base64'))
      await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
    })
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 95, maxWidth: 1920, maxHeight: 1135, everyNthFrame: 1 })
    await act(page, shot.rec)
    await cdp.send('Page.stopScreencast')
    await page.waitForTimeout(300)

    // concat list with real frame durations -> constant 30 fps
    const lines = []
    frames.forEach((f, i) => {
      lines.push(`file '${f.file.replace(/\\/g, '/')}'`)
      const next = frames[i + 1]
      lines.push(`duration ${next ? Math.max(0.001, next.t - f.t).toFixed(4) : '0.0333'}`)
    })
    lines.push(`file '${frames.at(-1).file.replace(/\\/g, '/')}'`)
    fs.writeFileSync(path.join(dir, 'list.txt'), lines.join('\n'))
    const span = frames.at(-1).t - frames[0].t
    console.log(`${shot.name}: ${frames.length} frames over ${span.toFixed(1)}s (${(frames.length / span).toFixed(1)} fps captured)`)
    encode(shot, ['-f', 'concat', '-safe', '0', '-i', path.join(dir, 'list.txt')], 60)
    fs.rmSync(dir, { recursive: true, force: true })
  }

  if (shot.still !== 'before') await page.screenshot({ path: `${OUT}/${shot.name}.jpg`, quality: 90, type: 'jpeg' })
  console.log(`${shot.name}: done`)
  await ctx.close()
}
await browser.close()
