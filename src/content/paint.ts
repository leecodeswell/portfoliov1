import * as THREE from 'three'
import { projects, studio, type PageMedia } from './projects'

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

// ------------------------------------------------------------------ painted pages

function contentsPage(): HTMLCanvasElement {
  const { c, g } = canvas(PAPER)
  text(g, 'ares', 90, 92, 30, INK, { weight: 600 })
  text(g, 'Contents', 120, 330, 96, INK, { weight: 500, spacing: -2 })
  wrap(g, 'Selected websites and real-time 3D. Click a title to jump straight to it; hover a page to see it in motion.', 120, 420, 460, 28, '#555')
  projects.forEach((p, i) => {
    const y = CONTENTS_TOP + i * CONTENTS_ROW
    text(g, String(i + 1).padStart(2, '0'), 760, y, 34, '#888', { weight: 500 })
    text(g, p.name, 860, y, 56, INK, { weight: 500, spacing: -1 })
    text(g, p.subtitle, 860, y + 50, 28, '#777', { font: SERIF, italic: true, weight: 400 })
    text(g, p.discipline, 1400, y, 28, '#777', { weight: 400 })
    text(g, String(4 + i * 2).padStart(2, '0'), PX_W - 140, y, 30, '#888', { weight: 400, align: 'right' })
    g.fillStyle = '#d6d4cf'
    g.fillRect(760, y + 82, PX_W - 900, 2)
  })
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
  text(g, '2025—2026', 110, 800, 40, '#ffffffaa', { weight: 400 })
  wrap(g, "ares is Lee Thompson's studio for cinematic websites and real-time 3D. Turn the page.", PX_W - 760, PX_H - 260, 620, 30, '#ffffffcc')
  grain(g, 14, 5)
  return c
}

function contactPage(): HTMLCanvasElement {
  const { c, g } = canvas(INK)
  text(g, 'ares', 90, 92, 30, '#fff', { weight: 600 })
  text(g, "Let's make", 110, 420, 170, '#fff', { weight: 600, spacing: -6 })
  text(g, 'something real.', 110, 600, 170, '#fff', { font: SERIF, italic: true, weight: 400 })
  text(g, studio.contact, 110, 760, 46, '#7d9bff', { weight: 500 })
  wrap(g, 'Available for websites, product launches and interactive 3D.', 110, 860, 820, 32, '#ffffffaa')
  grain(g, 12, 77)
  return c
}

function endPaper(): HTMLCanvasElement {
  const { c, g } = canvas('#f2f1ee')
  text(g, '● ares', PX_W / 2, PX_H / 2 + 20, 64, INK, { weight: 600, align: 'center' })
  text(g, 'Websites by Lee Thompson', PX_W / 2, PX_H / 2 + 90, 26, '#888', { weight: 400, align: 'center' })
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

// ------------------------------------------------------------------ textures

/** Mirror a texture horizontally: the back of a sheet is seen from the other side once turned. */
function mirror(t: THREE.Texture) {
  t.wrapS = THREE.RepeatWrapping
  t.repeat.x = -1
  t.offset.x = 1
  return t
}

function tex(c: HTMLCanvasElement, flipU = false) {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 16
  return flipU ? mirror(t) : t
}

/** Full-resolution still (2x site capture), decoded off the main thread. */
async function photo(url: string): Promise<THREE.Texture | null> {
  try {
    // dev servers answer missing files with index.html, so check we really have an image
    const head = await fetch(url, { method: 'HEAD' })
    if (!head.ok || !head.headers.get('content-type')?.startsWith('image/')) return null
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

export interface Face {
  map: THREE.Texture
  video?: string // motion loop played while hovered
}

export interface SheetFaces {
  front: Face // visible while the sheet lies on the right
  back: Face // visible once turned onto the left (mirrored)
}

type Source = HTMLCanvasElement | PageMedia

async function face(src: Source, mirrored: boolean): Promise<Face> {
  if (src instanceof HTMLCanvasElement) return { map: tex(src, mirrored) }
  const t = await photo(src.still)
  if (!t) return { map: tex(canvas('#111').c, mirrored) }
  return { map: mirrored ? mirror(t) : t, video: src.video }
}

/** Sheets: [front cover, intro + project pages…, contact, back cover]. Spread k: left = sheet[k-1].back, right = sheet[k].front. */
export async function paintBook(): Promise<SheetFaces[]> {
  await Promise.all([
    document.fonts.load(`600 100px "Inter Tight"`),
    document.fonts.load(`400 100px "Inter Tight"`),
    document.fonts.load(`italic 400 100px "Instrument Serif"`),
  ]).catch(() => undefined)

  // Faces in reading order. Spread 1: contents | intro. Each project: its two pages. Last: contact | endpaper.
  const lefts: Source[] = [contentsPage()]
  const rights: Source[] = [introPage()]
  for (const p of projects) {
    lefts.push(p.pages[0])
    rights.push(p.pages[1])
  }
  lefts.push(contactPage())
  rights.push(endPaper())

  const n = rights.length + 1 // sheets incl. both covers
  return Promise.all(
    Array.from({ length: n }, async (_, i) => ({
      front: await face(i === 0 ? coverOutside() : rights[i - 1], false),
      back: await face(i === n - 1 ? coverOutside(true) : lefts[i], true),
    })),
  )
}

const CONTENTS_TOP = 520
const CONTENTS_ROW = 150

/** Contents hit-test: page-space uv -> spread index, or null. Project i lives on spread i + 2. */
export function contentsHit(u: number, v: number): number | null {
  const y = (1 - v) * PX_H
  const x = u * PX_W
  if (x < 740) return null
  const row = Math.floor((y - CONTENTS_TOP + 70) / CONTENTS_ROW)
  if (row < 0 || row >= projects.length) return null
  return row + 2
}
