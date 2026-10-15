import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { CSS3DObject, CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js'
import { book, W } from './bookState'
import type { Face, SheetFaces } from '../content/paint'
import type { LiveSite } from '../content/projects'

/** The embedded site's viewport: same aspect as a page and as the captured stills. */
const VW = 1920
const VH = 1135
/** How long a spread must sit still before its sites go live. */
const SETTLE_MS = 450
/** Live pages rest just above the top sheet of each stack. */
const LIFT = 0.0012

/**
 * Real, interactive project sites placed on the open spread with CSS 3D transforms. They track
 * the paper exactly as the camera sways or inspects, and hand back to the WebGL stills whenever a
 * page moves (CSS can't curl). Only the open spread is live, so at most two sites run at once.
 */
export function LivePages({ faces, restHeight }: { faces: SheetFaces[]; restHeight: (i: number, side: 'L' | 'R') => number }) {
  const { camera, gl, size } = useThree()
  const anchors = useRef<{ L: THREE.Object3D | null; R: THREE.Object3D | null }>({ L: null, R: null })
  const renderer = useMemo(() => {
    const r = new CSS3DRenderer()
    r.domElement.className = 'live-layer'
    return r
  }, [])
  const scene = useMemo(() => new THREE.Scene(), [])
  const state = useRef({ spread: -1, candidate: -1, since: 0, pages: [] as LivePage[] })

  useEffect(() => {
    gl.domElement.parentElement!.appendChild(renderer.domElement)
    return () => {
      state.current.pages.forEach((p) => p.dispose())
      renderer.domElement.remove()
    }
  }, [gl, renderer])
  useEffect(() => renderer.setSize(size.width, size.height), [renderer, size])

  useFrame(() => {
    const s = state.current
    const k = book.turned
    const resting =
      book.phase === 'open' &&
      !book.busy &&
      book.cam.t > 0.999 &&
      book.sheets[k - 1]?.p === 1 &&
      (book.sheets[k]?.p ?? 0) === 0
    const want = resting ? k : -1
    const now = performance.now()
    if (want !== s.candidate) {
      s.candidate = want
      s.since = now
    }
    // go dark immediately when anything moves; go live once the spread has settled
    if (s.spread !== -1 && want !== s.spread) {
      s.pages.forEach((p) => p.dispose())
      s.pages = []
      s.spread = -1
    }
    if (s.spread === -1 && want !== -1 && now - s.since > SETTLE_MS) {
      s.spread = want
      const left: Face | undefined = faces[want - 1]?.back
      const right: Face | undefined = faces[want]?.front
      if (left?.live) s.pages.push(new LivePage(left.live, 'L', scene))
      if (right?.live) s.pages.push(new LivePage(right.live, 'R', scene))
    }
    for (const p of s.pages) {
      const a = anchors.current[p.side]
      if (!a) continue
      a.position.set(p.side === 'L' ? -W / 2 : W / 2, restHeight(p.side === 'L' ? s.spread - 1 : s.spread, p.side) + LIFT, 0)
      a.updateWorldMatrix(true, false)
      a.matrixWorld.decompose(p.obj.position, p.obj.quaternion, p.obj.scale)
    }
    renderer.render(scene, camera)
  })

  return (
    <>
      <object3D ref={(o) => (anchors.current.L = o)} rotation-x={-Math.PI / 2} scale={W / VW} />
      <object3D ref={(o) => (anchors.current.R = o)} rotation-x={-Math.PI / 2} scale={W / VW} />
    </>
  )
}

class LivePage {
  obj: CSS3DObject
  private root: HTMLDivElement
  private frame: HTMLIFrameElement
  private dead = false
  private win: (Window & typeof globalThis) | null = null
  private hovered = false
  private dir = 1
  private manualUntil = 0
  private lastY = 0
  private stuckSince = 0
  private timer = 0
  private native = false // site ignores synthetic wheels: scroll it directly

  constructor(
    site: LiveSite,
    public side: 'L' | 'R',
    private scene: THREE.Scene,
  ) {
    const root = document.createElement('div')
    root.className = `live-page live-${side}`
    root.style.width = `${VW}px`
    root.style.height = `${VH}px`

    const frame = document.createElement('iframe')
    frame.src = site.src
    frame.width = String(VW)
    frame.height = String(VH)
    frame.allow = 'autoplay; fullscreen; accelerometer; gyroscope'
    frame.title = 'Live project'
    frame.addEventListener('load', () => this.prepare(site))

    // paper cues layered over the site: gutter fold, a soft sheen, edge shading
    const shade = document.createElement('div')
    shade.className = 'live-shade'

    // the outer edge stays a page edge: hover to lift, click to turn
    const edge = document.createElement('button')
    edge.className = 'live-edge'
    edge.setAttribute('aria-label', side === 'R' ? 'Next page' : 'Previous page')
    edge.innerHTML = `<span>${side === 'R' ? '›' : '‹'}</span>`
    edge.addEventListener('click', () => (side === 'R' ? book.next() : book.prev()))

    // hovering a page tours the site: scroll to the bottom, then back up, until the pointer leaves
    root.addEventListener('pointerenter', () => (this.hovered = true))
    root.addEventListener('pointerleave', () => (this.hovered = false))

    root.append(frame, shade, edge)
    this.root = root
    this.frame = frame
    this.obj = new CSS3DObject(root)
    scene.add(this.obj)
  }

  /** Same-origin sites: hide scrollbars and open at this page's section, then fade in. */
  private async prepare(site: LiveSite) {
    let win: Window | null = null
    try {
      win = this.frame.contentWindow
      const doc = win?.document
      if (doc) {
        const style = doc.createElement('style')
        style.textContent = 'html{scrollbar-width:none}::-webkit-scrollbar{display:none}'
        doc.head.append(style)
      }
    } catch {
      win = null // cross-origin: show it as it opens
    }
    await wait(site.scroll ? 900 : 300) // let the site boot its smooth scroller / intro
    if (win && site.scroll) await seedScroll(win, site.scroll)
    if (this.dead) return
    this.root.classList.add('ready')
    if (win) {
      this.win = win as Window & typeof globalThis
      // a real wheel from the visitor takes over; the tour resumes a few seconds after they stop
      this.win.addEventListener('wheel', (e) => e.isTrusted && (this.manualUntil = performance.now() + 3500), { passive: true })
      this.timer = window.setInterval(() => this.tour(), 50)
    }
  }

  private tour() {
    const w = this.win
    const now = performance.now()
    if (!w || !this.hovered || now < this.manualUntil) {
      this.stuckSince = now
      return
    }
    const y = w.scrollY
    if (Math.abs(y - this.lastY) > 0.5) this.stuckSince = now
    this.lastY = y
    // reached an end (or the page stopped moving): turn around
    const max = w.document.documentElement.scrollHeight - w.innerHeight
    const atEnd = (this.dir > 0 && y >= max - 2) || (this.dir < 0 && y <= 2)
    if (!atEnd && now - this.stuckSince > 700 && !this.native) {
      this.native = true
      this.stuckSince = now
    } else if (atEnd || now - this.stuckSince > 700) {
      this.dir *= -1
      this.stuckSince = now
    }
    if (this.native) w.scrollBy(0, this.dir * 14)
    else w.document.documentElement.dispatchEvent(new w.WheelEvent('wheel', { deltaY: this.dir * 45, bubbles: true, cancelable: true }))
  }

  dispose() {
    this.dead = true
    clearInterval(this.timer)
    this.scene.remove(this.obj)
    this.frame.src = 'about:blank' // stop the site's render loop right away
    this.root.remove()
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Scroll a same-origin site with real wheel events so smooth-scroll libraries animate to the section. */
async function seedScroll(win: Window, target: number) {
  const W_ = win as Window & typeof globalThis
  const start = performance.now()
  let last = W_.scrollY
  let stuckSince = performance.now()
  while (performance.now() - start < 6000) {
    const y = W_.scrollY
    const left = target - y
    if (Math.abs(left) < 20) return
    W_.document.documentElement.dispatchEvent(
      new W_.WheelEvent('wheel', { deltaY: Math.sign(left) * Math.min(400, Math.abs(left)), bubbles: true, cancelable: true }),
    )
    if (Math.abs(y - last) > 1) stuckSince = performance.now()
    last = y
    if (performance.now() - stuckSince > 500) {
      W_.scrollTo(0, target) // no wheel-driven scroller: jump natively
      return
    }
    await wait(40)
  }
}
