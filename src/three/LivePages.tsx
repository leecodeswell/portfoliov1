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
const LIFT = 0.0003 // close to the paper: any gap shows the still underneath as a sliver along the edge

/**
 * Real, interactive project sites placed on the open spread with CSS 3D transforms. They track
 * the paper exactly as the camera sways or inspects, and hand back to the WebGL stills whenever a
 * page moves (CSS can't curl). Only pages flagged `live` use this — currently the cologne relief.
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
  const state = useRef({ spread: -1, candidate: -1, since: 0, pages: [] as LivePage[], cache: new Map<string, LivePage>() })

  useEffect(() => {
    gl.domElement.parentElement!.appendChild(renderer.domElement)
    return () => {
      state.current.cache.forEach((p) => p.dispose())
      renderer.domElement.remove()
    }
  }, [gl, renderer])
  useEffect(() => renderer.setSize(size.width, size.height), [renderer, size])

  useFrame(() => {
    const s = state.current
    const k = book.turned
    const resting =
      !book.shelved &&
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
      s.pages.forEach((p) => p.hide())
      s.pages = []
      s.spread = -1
    }
    if (s.spread === -1 && want !== -1 && now - s.since > SETTLE_MS) {
      s.spread = want
      const left: Face | undefined = faces[want - 1]?.back
      const right: Face | undefined = faces[want]?.front
      for (const [face, side] of [[left, 'L'], [right, 'R']] as const) {
        if (!face?.live) continue
        const key = `${want}${side}`
        let page = s.cache.get(key)
        if (!page) s.cache.set(key, (page = new LivePage(face.live, side, scene)))
        page.show()
        s.pages.push(page)
      }
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
    frame.allow = 'autoplay; fullscreen'
    frame.title = 'Live project'
    frame.addEventListener('load', () => this.prepare(site))

    // paper cues layered over the site: gutter fold, a soft sheen
    const shade = document.createElement('div')
    shade.className = 'live-shade'

    // the outer edge stays a page edge: hover to lift, click to turn
    const edge = document.createElement('button')
    edge.className = 'live-edge'
    edge.setAttribute('aria-label', side === 'R' ? 'Next page' : 'Previous page')
    edge.innerHTML = `<span>${side === 'R' ? '›' : '‹'}</span>`
    edge.addEventListener('click', () => (side === 'R' ? book.next() : book.prev()))

    root.append(frame, shade, edge)
    this.root = root
    this.frame = frame
    this.obj = new CSS3DObject(root)
    this.obj.visible = false
  }

  /** Same-origin: hide scrollbars and (optionally) pin the site to its first screen, then fade in. */
  private async prepare(site: LiveSite) {
    try {
      const win = this.frame.contentWindow as (Window & typeof globalThis) | null
      const doc = win?.document
      if (win && doc) {
        const style = doc.createElement('style')
        style.textContent =
          'html{scrollbar-width:none}::-webkit-scrollbar{display:none}' + (site.hide ? `${site.hide}{display:none!important}` : '')
        doc.head.append(style)
        if (site.lockScroll) {
          // swallow scrolling before the site's smooth-scroller sees it; the cursor still drives the relief
          const stop = (e: Event) => {
            e.preventDefault()
            e.stopImmediatePropagation()
          }
          win.addEventListener('wheel', stop, { capture: true, passive: false })
          win.addEventListener('touchmove', stop, { capture: true, passive: false })
          win.addEventListener(
            'keydown',
            (e) => [' ', 'PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key) && stop(e),
            { capture: true },
          )
          win.scrollTo(0, 0)
        }
      }
    } catch {
      // cross-origin: shown as it opens
    }
    await new Promise((r) => setTimeout(r, 400)) // let it paint its first frame
    this.root.classList.add('ready')
  }

  show() {
    if (!this.obj.parent) this.scene.add(this.obj)
    this.obj.visible = true
    this.root.style.display = ''
  }

  /** Hidden, not destroyed: a display:none iframe stops rendering but keeps its state for an instant return. */
  hide() {
    this.obj.visible = false
    this.root.style.display = 'none'
  }

  dispose() {
    this.scene.remove(this.obj)
    this.frame.src = 'about:blank'
    this.root.remove()
  }
}
