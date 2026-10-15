import * as THREE from 'three'
import { projects, studio, type Art, type Project } from './projects'

/** Page canvas size, matching the page aspect W:D = 0.44:0.26. */
export const PX_W = 2048
export const PX_H = Math.round((2048 * 0.26) / 0.44)

const SANS = '"Inter Tight", "Helvetica Neue", Arial, sans-serif'
const SERIF = '"Instrument Serif", Georgia, serif'
const INK = '#0b0b0d'
const PAPER = '#efeeea'

type Ctx = CanvasRenderingContext2D

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

function canvas(bg: string) {
  const c = document.createElement('canvas')
  c.width = PX_W
  c.height = PX_H
  const g = c.getContext('2d')!
  g.fillStyle = bg
  g.fillRect(0, 0, PX_W, PX_H)
  return { c, g }
}

/** Paper grain: a small noise tile laid over the page with overlay blending (fast, no per-pixel pass). */
const grainTiles = new Map<number, HTMLCanvasElement>()
function grain(g: Ctx, amount: number, seed = 1) {
  let tile = grainTiles.get(seed)
  if (!tile) {
    tile = document.createElement('canvas')
    tile.width = tile.height = 256
    const t = tile.getContext('2d')!
    const img = t.createImageData(256, 256)
    const r = rng(seed)
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 128 + (r() - 0.5) * 255
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v
      img.data[i + 3] = 255
    }
    t.putImageData(img, 0, 0)
    grainTiles.set(seed, tile)
  }
  g.save()
  g.globalCompositeOperation = 'overlay'
  g.globalAlpha = Math.min(1, amount / 40)
  g.fillStyle = g.createPattern(tile, 'repeat')!
  g.fillRect(0, 0, PX_W, PX_H)
  g.restore()
}

function text(g: Ctx, s: string, x: number, y: number, size: number, color: string, opts: Partial<{ font: string; weight: number; italic: boolean; align: CanvasTextAlign; spacing: number }> = {}) {
  g.font = `${opts.italic ? 'italic ' : ''}${opts.weight ?? 500} ${size}px ${opts.font ?? SANS}`
  g.fillStyle = color
  g.textAlign = opts.align ?? 'left'
  g.textBaseline = 'alphabetic'
  ;(g as Ctx & { letterSpacing?: string }).letterSpacing = `${opts.spacing ?? 0}px`
  g.fillText(s, x, y)
}

function wrap(g: Ctx, s: string, x: number, y: number, maxW: number, size: number, color: string, lh = 1.4) {
  g.font = `400 ${size}px ${SANS}`
  g.fillStyle = color
  g.textAlign = 'left'
  let line = ''
  for (const w of s.split(' ')) {
    const t = line ? line + ' ' + w : w
    if (g.measureText(t).width > maxW && line) {
      g.fillText(line, x, y)
      y += size * lh
      line = w
    } else line = t
  }
  g.fillText(line, x, y)
}

/** Thin site-style header strip that every case-study page carries (they read as web pages in print). */
function chrome(g: Ctx, p: Project, fg: string, right = false) {
  text(g, right ? p.name : 'ares', 90, 92, 30, fg, { weight: 600 })
  const items = ['Work', 'Process', 'Studio', 'Contact']
  items.forEach((s, i) => text(g, s, PX_W - 520 + i * 125, 92, 24, fg + 'aa', { weight: 400 }))
}

// ------------------------------------------------------------------ illustrations

function art(g: Ctx, kind: Art, x: number, y: number, w: number, h: number, accent: string, seed: number) {
  const r = rng(seed)
  g.save()
  g.beginPath()
  g.rect(x, y, w, h)
  g.clip()
  if (kind === 'particles') {
    const grd = g.createRadialGradient(x + w * 0.5, y + h * 0.6, 10, x + w * 0.5, y + h * 0.6, w * 0.7)
    grd.addColorStop(0, '#0d1a4a')
    grd.addColorStop(1, '#030308')
    g.fillStyle = grd
    g.fillRect(x, y, w, h)
    for (let i = 0; i < 9000; i++) {
      const px = x + r() * w
      const t = r()
      const py = y + h * (0.35 + 0.65 * Math.pow(t, 0.6)) + Math.sin(px * 0.01) * 30
      const s = r() * 2.6 + 0.4
      g.fillStyle = `rgba(${90 + r() * 80},${140 + r() * 80},255,${0.25 + r() * 0.7})`
      g.fillRect(px, py, s, s)
    }
    // HUD ring
    const cx = x + w * 0.62, cy = y + h * 0.42
    g.strokeStyle = accent
    g.lineWidth = 3
    g.beginPath(); g.arc(cx, cy, 120, 0, Math.PI * 2); g.stroke()
    g.lineWidth = 1.5
    g.setLineDash([6, 10])
    g.beginPath(); g.arc(cx, cy, 165, 0, Math.PI * 2); g.stroke()
    g.setLineDash([])
    for (let a = 0; a < 4; a++) {
      const ang = (a * Math.PI) / 2
      g.beginPath(); g.moveTo(cx + Math.cos(ang) * 140, cy + Math.sin(ang) * 140); g.lineTo(cx + Math.cos(ang) * 200, cy + Math.sin(ang) * 200); g.stroke()
    }
    const iris = g.createRadialGradient(cx, cy, 5, cx, cy, 100)
    iris.addColorStop(0, '#000'); iris.addColorStop(0.35, '#0a1640'); iris.addColorStop(0.7, accent); iris.addColorStop(1, 'rgba(63,109,255,0)')
    g.fillStyle = iris
    g.beginPath(); g.arc(cx, cy, 100, 0, Math.PI * 2); g.fill()
  } else if (kind === 'exploded') {
    g.fillStyle = '#0c0c0e'
    g.fillRect(x, y, w, h)
    const cx = x + w * 0.45
    for (let i = 0; i < 6; i++) {
      const cy = y + h * 0.25 + i * h * 0.1
      const sx = w * (0.28 - i * 0.012)
      const grad = g.createLinearGradient(cx - sx, cy, cx + sx, cy)
      const metal = i % 2 ? ['#3a3a3f', '#8e8e96', '#2a2a2e'] : ['#5b4528', accent, '#3b2c18']
      grad.addColorStop(0, metal[0]); grad.addColorStop(0.5, metal[1]); grad.addColorStop(1, metal[2])
      g.fillStyle = grad
      g.beginPath()
      g.moveTo(cx - sx, cy); g.lineTo(cx, cy - sx * 0.35); g.lineTo(cx + sx, cy); g.lineTo(cx, cy + sx * 0.35)
      g.closePath(); g.fill()
      g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 1.5; g.stroke()
    }
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1.5
    g.beginPath(); g.moveTo(cx + w * 0.2, y + h * 0.36); g.lineTo(cx + w * 0.33, y + h * 0.36); g.stroke()
    g.fillStyle = '#fff'; g.beginPath(); g.arc(cx + w * 0.2, y + h * 0.36, 6, 0, Math.PI * 2); g.fill()
    text(g, 'Micro-milled alloy frame', cx + w * 0.34, y + h * 0.36 + 9, 26, '#ddd', { weight: 400 })
  } else if (kind === 'keypad') {
    const grd = g.createRadialGradient(x + w / 2, y + h / 2, 10, x + w / 2, y + h / 2, w * 0.6)
    grd.addColorStop(0, '#0a1a55'); grd.addColorStop(1, '#030309')
    g.fillStyle = grd; g.fillRect(x, y, w, h)
    const n = 4, ks = Math.min(w, h) * 0.13, gap = ks * 0.28
    const ox = x + w / 2 - (n * ks + (n - 1) * gap) / 2, oy = y + h / 2 - (n * ks + (n - 1) * gap) / 2
    g.shadowColor = accent; g.shadowBlur = 60
    g.fillStyle = '#0b1230'
    g.beginPath(); g.roundRect(ox - gap, oy - gap, n * ks + (n + 1) * gap, n * ks + (n + 1) * gap, 40); g.fill()
    g.shadowBlur = 0
    g.strokeStyle = accent; g.lineWidth = 4; g.stroke()
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const lit = r() > 0.75
      g.fillStyle = lit ? accent : '#151c3a'
      g.shadowColor = accent; g.shadowBlur = lit ? 40 : 0
      g.beginPath(); g.roundRect(ox + i * (ks + gap), oy + j * (ks + gap), ks, ks, 16); g.fill()
    }
    g.shadowBlur = 0
  } else if (kind === 'clouds') {
    const grd = g.createLinearGradient(x, y, x, y + h)
    grd.addColorStop(0, '#2f63ff'); grd.addColorStop(1, '#9fc0ff')
    g.fillStyle = grd; g.fillRect(x, y, w, h)
    for (let i = 0; i < 40; i++) {
      const cx = x + r() * w, cy = y + h * (0.4 + r() * 0.6), rad = 80 + r() * 220
      const c = g.createRadialGradient(cx, cy, 0, cx, cy, rad)
      c.addColorStop(0, 'rgba(255,255,255,0.85)'); c.addColorStop(1, 'rgba(255,255,255,0)')
      g.fillStyle = c; g.beginPath(); g.arc(cx, cy, rad, 0, Math.PI * 2); g.fill()
    }
  } else if (kind === 'dunes') {
    const sky = g.createLinearGradient(x, y, x, y + h)
    sky.addColorStop(0, '#3b5fa8'); sky.addColorStop(0.55, '#f0b37a'); sky.addColorStop(1, '#7a3a20')
    g.fillStyle = sky; g.fillRect(x, y, w, h)
    const cols = ['#c9783c', '#a85a2c', '#8a4422', '#5e2c18', '#3a1a10']
    cols.forEach((col, i) => {
      const base = y + h * (0.45 + i * 0.11)
      g.fillStyle = col
      g.beginPath(); g.moveTo(x, y + h)
      for (let px = 0; px <= w; px += 8) g.lineTo(x + px, base + Math.sin(px * 0.004 + i * 1.7) * 40 + Math.sin(px * 0.013 + i) * 14)
      g.lineTo(x + w, y + h); g.closePath(); g.fill()
    })
  } else if (kind === 'planet') {
    const grd = g.createLinearGradient(x, y, x + w, y + h)
    grd.addColorStop(0, '#1a0a08'); grd.addColorStop(1, '#5a2010')
    g.fillStyle = grd; g.fillRect(x, y, w, h)
    for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.7})`; g.fillRect(x + r() * w, y + r() * h, 2, 2) }
    const cx = x + w * 0.55, cy = y + h * 0.58, rad = Math.min(w, h) * 0.34
    const atm = g.createRadialGradient(cx, cy, rad * 0.9, cx, cy, rad * 1.25)
    atm.addColorStop(0, 'rgba(120,170,255,0.6)'); atm.addColorStop(1, 'rgba(120,170,255,0)')
    g.fillStyle = atm; g.beginPath(); g.arc(cx, cy, rad * 1.25, 0, Math.PI * 2); g.fill()
    const body = g.createRadialGradient(cx - rad * 0.4, cy - rad * 0.4, rad * 0.1, cx, cy, rad)
    body.addColorStop(0, '#9cc4ff'); body.addColorStop(0.5, '#2a5bb0'); body.addColorStop(1, '#050b1c')
    g.fillStyle = body; g.beginPath(); g.arc(cx, cy, rad, 0, Math.PI * 2); g.fill()
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2
    g.beginPath(); g.ellipse(cx, cy, rad * 1.6, rad * 0.35, -0.3, 0, Math.PI * 2); g.stroke()
  }
  g.restore()
}

// ------------------------------------------------------------------ page types

function contentsPage(): HTMLCanvasElement {
  const { c, g } = canvas(PAPER)
  text(g, 'ares', 90, 92, 30, INK, { weight: 600 })
  text(g, 'Contents', 120, 330, 96, INK, { weight: 500, spacing: -2 })
  projects.forEach((p, i) => {
    const y = 470 + i * 92
    text(g, String(i + 1).padStart(2, '0'), 760, y, 30, '#888', { weight: 500 })
    text(g, p.name, 860, y, 40, INK, { weight: 500 })
    text(g, p.discipline, 1300, y, 28, '#777', { weight: 400 })
    text(g, String(5 + i * 2).padStart(2, '0'), PX_W - 140, y, 28, '#888', { weight: 400, align: 'right' })
    g.fillStyle = '#d6d4cf'; g.fillRect(760, y + 30, PX_W - 900, 2)
  })
  wrap(g, 'A selection of digital products, brands and real-time experiences. Click a title to jump straight to it.', 120, 420, 460, 28, '#555')
  grain(g, 10, 3)
  return c
}

function introPage(): HTMLCanvasElement {
  const { c, g } = canvas('#09090b')
  const grd = g.createRadialGradient(PX_W * 0.7, PX_H * 0.8, 20, PX_W * 0.7, PX_H * 0.8, PX_W * 0.8)
  grd.addColorStop(0, '#3a1fff'); grd.addColorStop(0.45, '#5d1a8a'); grd.addColorStop(1, '#09090b')
  g.fillStyle = grd; g.fillRect(0, 0, PX_W, PX_H)
  text(g, 'ares', 90, 92, 30, '#fff', { weight: 600 })
  text(g, 'SELECTED', 110, 470, 190, '#fff', { weight: 700, spacing: -6 })
  text(g, 'work,', 110, 690, 230, '#fff', { font: SERIF, italic: true, weight: 400 })
  text(g, '2024—2026', 110, 800, 40, '#ffffffaa', { weight: 400 })
  wrap(g, 'ares is an independent studio designing interactive websites, brands and real-time 3D. Turn the page.', PX_W - 760, PX_H - 260, 620, 30, '#ffffffcc')
  grain(g, 14, 5)
  return c
}

function projectLeft(p: Project, i: number): HTMLCanvasElement {
  const bg = p.light ? PAPER : INK
  const fg = p.light ? INK : '#ffffff'
  const { c, g } = canvas(bg)
  chrome(g, p, fg)
  text(g, p.headline[0], 110, 360, 150, fg, { weight: 600, spacing: -5 })
  text(g, p.headline[1], 110, 520, 170, p.light ? p.accent : fg, { font: SERIF, italic: true, weight: 400 })
  wrap(g, p.blurb, 110, 640, 760, 32, fg + 'bb')
  art(g, p.art, 1000, 560, PX_W - 1080, PX_H - 640, p.accent, 11 + i)
  text(g, `${String(i + 1).padStart(2, '0')} — ${p.discipline}`, 110, PX_H - 90, 26, fg + '88', { weight: 400 })
  grain(g, 12, 7 + i)
  return c
}

function projectRight(p: Project, i: number): HTMLCanvasElement {
  const { c, g } = canvas(p.light ? '#0d1530' : '#050507')
  art(g, p.art, 0, 0, PX_W, PX_H, p.accent, 101 + i)
  const shade = g.createLinearGradient(0, 0, 0, PX_H)
  shade.addColorStop(0, 'rgba(0,0,0,0.55)'); shade.addColorStop(0.3, 'rgba(0,0,0,0)'); shade.addColorStop(0.75, 'rgba(0,0,0,0)'); shade.addColorStop(1, 'rgba(0,0,0,0.6)')
  g.fillStyle = shade; g.fillRect(0, 0, PX_W, PX_H)
  chrome(g, p, '#ffffff', true)
  text(g, p.name, 110, PX_H - 150, 120, '#fff', { weight: 600, spacing: -4 })
  text(g, `${p.discipline}  ·  ${p.year}`, 110, PX_H - 85, 30, '#ffffffbb', { weight: 400 })
  g.strokeStyle = '#fff'; g.lineWidth = 2
  g.beginPath(); g.roundRect(PX_W - 380, PX_H - 140, 270, 70, 35); g.stroke()
  text(g, 'View case →', PX_W - 245, PX_H - 94, 28, '#fff', { weight: 500, align: 'center' })
  grain(g, 10, 31 + i)
  return c
}

function contactPage(): HTMLCanvasElement {
  const { c, g } = canvas(INK)
  text(g, 'ares', 90, 92, 30, '#fff', { weight: 600 })
  text(g, "Let's make", 110, 420, 170, '#fff', { weight: 600, spacing: -6 })
  text(g, 'something real.', 110, 600, 170, '#fff', { font: SERIF, italic: true, weight: 400 })
  text(g, studio.contact, 110, 760, 46, '#7d9bff', { weight: 500 })
  wrap(g, 'Available for websites, product launches and interactive 3D from early 2027.', 110, 860, 820, 32, '#ffffffaa')
  grain(g, 12, 77)
  return c
}

function endPaper(): HTMLCanvasElement {
  const { c, g } = canvas('#f2f1ee')
  text(g, '● ares', PX_W / 2, PX_H / 2 + 20, 64, INK, { weight: 600, align: 'center' })
  text(g, 'Interactive design studio', PX_W / 2, PX_H / 2 + 90, 26, '#888', { weight: 400, align: 'center' })
  grain(g, 8, 99)
  return c
}

function coverOutside(back = false): HTMLCanvasElement {
  const { c, g } = canvas('#0c0c0d')
  if (!back) text(g, 'ares', PX_W / 2, PX_H / 2 + 45, 150, '#cfcfcf', { weight: 600, align: 'center', spacing: 8 })
  else { g.fillStyle = '#bdbdbd'; g.beginPath(); g.arc(PX_W / 2, PX_H / 2, 16, 0, Math.PI * 2); g.fill() }
  grain(g, 18, back ? 4 : 2)
  return c
}

function tex(c: HTMLCanvasElement, flipU = false) {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  if (flipU) {
    t.wrapS = THREE.RepeatWrapping
    t.repeat.x = -1
    t.offset.x = 1
  }
  return t
}

/** Full-resolution photo for a page (a CC0 8K photo from Poly Haven here). Three downsizes it if the GPU's texture limit is lower. */
async function photo(url: string): Promise<THREE.Texture | null> {
  try {
    // dev servers answer missing files with index.html, so check we really have an image
    const head = await fetch(url, { method: 'HEAD' })
    if (!head.ok || !head.headers.get('content-type')?.startsWith('image/')) return null
    // decode off the main thread: an 8K JPEG would otherwise stall a frame for hundreds of ms
    const loader = new THREE.ImageBitmapLoader().setOptions({ imageOrientation: 'flipY' })
    const bitmap = await loader.loadAsync(url)
    const t = new THREE.Texture(bitmap as unknown as HTMLImageElement)
    t.flipY = false
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 16
    t.needsUpdate = true
    return t
  } catch {
    return null
  }
}

/** First right-hand page: a full-bleed 8K-class photo (6932×4096), proving out print-sharp imagery inside the book. */
export const HERO_PHOTO = '/images/city_8k.jpg'

export interface SheetFaces {
  front: THREE.Texture // visible while the sheet lies on the right
  back: THREE.Texture // visible once turned onto the left (mirrored for the back face)
}

/** Build every sheet's textures. Sheets: [front cover, intro, project pages…, contact, back cover]. */
export async function paintBook(): Promise<SheetFaces[]> {
  await Promise.all([
    document.fonts.load(`600 100px "Inter Tight"`),
    document.fonts.load(`400 100px "Inter Tight"`),
    document.fonts.load(`italic 400 100px "Instrument Serif"`),
  ]).catch(() => undefined)

  // Faces in reading order: right page of spread 1 .. left page of the last spread.
  const lefts: HTMLCanvasElement[] = [contentsPage()]
  const rights: HTMLCanvasElement[] = [introPage()]
  projects.forEach((p, i) => {
    lefts.push(projectLeft(p, i))
    rights.push(projectRight(p, i))
  })
  lefts.push(contactPage())
  rights.push(endPaper())

  // Spread k: left = sheet[k-1].back, right = sheet[k].front.
  const n = rights.length + 1 // sheets incl. both covers
  const hero = await photo(HERO_PHOTO)
  const sheets: SheetFaces[] = []
  for (let i = 0; i < n; i++) {
    const front = i === 0 ? tex(coverOutside()) : i === 1 && hero ? hero : tex(rights[i - 1])
    const back = i === n - 1 ? coverOutside(true) : lefts[i]
    sheets.push({ front, back: tex(back, true) })
  }
  return sheets
}

/** Contents hit-test: page-space uv -> spread index, or null. */
export function contentsHit(u: number, v: number): number | null {
  const y = (1 - v) * PX_H
  const x = u * PX_W
  if (x < 740) return null
  const row = Math.floor((y - 470 + 70) / 92)
  if (row < 0 || row >= projects.length) return null
  return row + 2 // project i lives on spread i + 2
}
