import gsap from 'gsap'

/** Book dimensions in metres (matches blender/scripts/build_scene.py). */
export const W = 0.44 // page width
export const D = 0.26 // page depth (top-to-bottom of a page)
export const PAGE_T = 0.0009 // visual thickness per paper sheet
export const COVER_T = 0.0028 // board thickness
export const CURL = 1.25 // radians of extra bend at a page's free edge mid-turn

/** Timings measured from the reference recording (24 fps). */
const TURN = 1.0 // single page turn: ~24 frames
const COVER_TURN = 1.15
const CASCADE_STAGGER = 0.13 // contents jump: sheets fan over ~3 frames apart

export type Phase = 'closed' | 'opening' | 'open' | 'closing' | 'end'

/**
 * Sheets, bottom-up when closed: [frontCover, page 1..N, backCover].
 * sheets[i].p: 0 = lying on the right stack, 1 = turned onto the left stack; dir = turn direction.
 * Spread k shows sheet[k-1].back on the left and sheet[k].front on the right.
 */
class BookController {
  pages = 0
  ready = false
  sheets: { p: number; dir: number }[] = []
  turned = 0
  phase: Phase = 'closed'
  /** Whole-book pose: x slides so the closed book / open spread stays centred. */
  pose = { x: -W / 2, lift: 0, tilt: 0, yaw: (4 * Math.PI) / 180 }
  /** Camera blend 0 = hero overview, 1 = reading close-up. */
  cam = { t: 0 }
  private queue = Promise.resolve()
  private listeners = new Set<() => void>()
  private animating = 0

  init(pageSheets: number) {
    this.pages = pageSheets
    const n = pageSheets + 2
    this.sheets = Array.from({ length: n }, () => ({ p: 0, dir: 1 }))
    this.ready = true
    this.emit()
  }

  get sheetCount() {
    return this.sheets.length
  }
  get lastSpread() {
    return this.sheetCount - 1 // spread showing the back cover's inside on the right
  }
  isCover(i: number) {
    return i === 0 || i === this.sheetCount - 1
  }
  get busy() {
    return this.animating > 0
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
  private emit() {
    this.listeners.forEach((f) => f())
  }
  private setPhase(p: Phase) {
    this.phase = p
    this.emit()
  }

  /** Serialise interactions so rapid clicks queue up like page flips do. */
  private run(fn: () => gsap.core.Timeline | null) {
    this.queue = this.queue.then(
      () =>
        new Promise<void>((resolve) => {
          const tl = fn()
          if (!tl) return resolve()
          this.animating++
          // .then() fires after the timeline's own onComplete (eventCallback would replace it)
          tl.then(() => {
            this.animating--
            resolve()
          })
        }),
    )
  }

  private turnTween(tl: gsap.core.Timeline, i: number, to: 0 | 1, at: number, fast = false) {
    this.sheets[i].dir = to === 1 ? 1 : -1
    const dur = this.isCover(i) ? COVER_TURN : fast ? TURN * 0.85 : TURN
    tl.to(this.sheets[i], { p: to, duration: dur, ease: this.isCover(i) ? 'power2.inOut' : 'power1.inOut' }, at)
  }

  open() {
    if (!this.ready || this.phase !== 'closed') return
    this.run(() => {
      this.setPhase('opening')
      const tl = gsap.timeline({
        onComplete: () => {
          this.turned = 1
          this.setPhase('open')
        },
      })
      // f17-f25: book lifts and tips toward the camera, squaring up
      tl.to(this.pose, { lift: 0.035, tilt: -0.16, yaw: 0, duration: 0.55, ease: 'power2.out' }, 0)
      // f17-f53: camera pushes in and lowers
      tl.to(this.cam, { t: 1, duration: 1.7, ease: 'power3.inOut' }, 0.15)
      // f25-f41: cover swings over the spine; spread slides to centre
      this.turnTween(tl, 0, 1, 0.35)
      tl.to(this.pose, { x: 0, duration: 1.25, ease: 'power2.inOut' }, 0.3)
      // f41-f49: settle back onto the desk
      tl.to(this.pose, { lift: 0, tilt: 0, duration: 0.7, ease: 'power2.inOut' }, 0.95)
      return tl
    })
  }

  /** Go to spread k (1..lastSpread). Multi-sheet jumps cascade like the reference contents links. */
  goTo(k: number) {
    this.run(() => {
      if (this.phase !== 'open') return null
      k = Math.max(1, Math.min(this.lastSpread, k))
      if (k === this.turned) return null
      const from = this.turned
      const tl = gsap.timeline({ onComplete: () => this.emit() })
      const count = Math.abs(k - from)
      if (k > from) {
        for (let i = from; i < k; i++) this.turnTween(tl, i, 1, (i - from) * CASCADE_STAGGER, count > 1)
      } else {
        for (let i = from - 1; i >= k; i--) this.turnTween(tl, i, 0, (from - 1 - i) * CASCADE_STAGGER, count > 1)
      }
      this.turned = k
      this.emit()
      return tl
    })
  }

  next() {
    if (this.phase === 'closed') return this.open()
    if (this.phase !== 'open') return
    if (this.turned >= this.lastSpread) return this.close()
    this.goTo(this.turned + 1)
  }
  prev() {
    if (this.phase === 'open' && this.turned > 1) this.goTo(this.turned - 1)
  }

  /** f1013-f1069: back cover swings over, camera pulls out, end card fades in. */
  close() {
    this.run(() => {
      if (this.phase !== 'open') return null
      this.setPhase('closing')
      const last = this.sheetCount - 1
      const tl = gsap.timeline({
        onComplete: () => {
          this.turned = this.sheetCount
          this.setPhase('end')
        },
      })
      this.turnTween(tl, last, 1, 0)
      tl.to(this.pose, { x: W / 2, duration: 1.3, ease: 'power2.inOut' }, 0.1)
      tl.to(this.cam, { t: 0, duration: 1.6, ease: 'power3.inOut' }, 0.45)
      return tl
    })
  }

  /** "Read again": riffle everything back to the front cover and return to the hero state. */
  restart() {
    this.run(() => {
      if (this.phase !== 'end') return null
      const tl = gsap.timeline({
        onComplete: () => {
          this.turned = 0
          this.setPhase('closed')
        },
      })
      for (let i = this.sheetCount - 1; i >= 0; i--) this.turnTween(tl, i, 0, (this.sheetCount - 1 - i) * 0.06, true)
      tl.to(this.pose, { x: -W / 2, yaw: (4 * Math.PI) / 180, duration: 1.4, ease: 'power2.inOut' }, 0)
      this.setPhase('closing')
      return tl
    })
  }
}

export const book = new BookController()
